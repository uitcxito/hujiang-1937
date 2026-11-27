const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");
const T = require("../vendor/three.min.js");

test("nine tree batches per part preserve shadow-only casters, cube-face visibility and picking", () => {
  const makePart = () => new T.Mesh(new T.BoxGeometry(1, 4, 1).translate(0, 2, 0), new T.MeshStandardMaterial());
  const arborModels = Array.from({ length: 9 }, (_, form) => ({
    wood: makePart(), leaves: makePart(), form, bottom: 0, top: 4, radius: 2, trunkRadius: 0.5,
  }));
  for (const { leaves } of arborModels) {
    leaves.material.map = new T.Texture();
    leaves.material.alphaTest = 1 / 255;
    leaves.material.alphaHash = true;
    leaves.material.side = T.DoubleSide;
  }
  const sites = arborModels.flatMap(({ form }) => [45, -45].map(x => [x, form - 4, 1, form]));
  sites.push([-39, 0, 1, 1], [-40, -2, 1, 1], [30, 31, 1, 0]);
  const source = fs.readFileSync(path.join(__dirname, "../src/arboretum.js"), "utf8");
  const vegetation = vm.runInNewContext(source + "\nvegetation", {
    T, V: T.Vector3, arborModels, campusTreeSites: sites, obstacles: [],
    makeWalkSpace: () => () => true, groundY: () => 0, surf: () => 1,
  });
  const scene = new T.Scene(), sun = new T.DirectionalLight();
  sun.castShadow = true;
  sun.position.set(-45, 30, 0);
  sun.target.position.set(-45, 0, 0);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 100 });
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun, sun.target);
  const eye = new T.PerspectiveCamera(90, 1, 0.1, 75);
  const { trunks: pickables, setHighQuality } = vegetation(scene, sun, eye);
  const woods = scene.children.filter(mesh => mesh.name === "Tree wood");
  const foliage = scene.children.filter(mesh => mesh.name === "Tree foliage");
  const coverage = scene.children.filter(mesh => mesh.name === "Leaf coverage prepass");
  assert.equal(woods.length, 9);
  assert.equal(foliage.length, 9);
  assert.equal(coverage.length, 9);
  eye.position.y = 2;
  eye.lookAt(45, 2, 0);
  eye.updateMatrixWorld();
  const renderer = { shadowMap: { enabled: true, autoUpdate: false, needsUpdate: true } };
  scene.updateMatrixWorld();
  setHighQuality(true);
  scene.onBeforeRender(renderer, scene, eye);
  const colors = foliage.map(o => o.material);
  const xs = (buffer, count) => Array.from({ length: count }, (_, i) => buffer.array[16 * i + 12]);
  for (const [i, mesh] of woods.entries()) {
    // The last tree is centred outside the eye frustum but its crown overlaps the edge.
    const drawn = i === 0 ? [45, 30] : [45];
    assert.deepEqual(xs(mesh.instanceMatrix, mesh.count), drawn);
    assert.equal(mesh.count, foliage[i].count);
    assert.equal(mesh.instanceMatrix, foliage[i].instanceMatrix);
    assert.equal(mesh.geometry.getAttribute("branchPose"), foliage[i].geometry.getAttribute("branchPose"));
    const depth = coverage[i], leaf = foliage[i];
    assert(depth.visible && !depth.castShadow && depth.material.depthWrite && !depth.material.colorWrite);
    assert.equal(depth.renderOrder, 1);
    assert.equal(leaf.renderOrder, 4);
    assert.equal(leaf.material.depthFunc, T.EqualDepth);
    assert(!leaf.material.depthWrite);
    assert.equal(depth.count, leaf.count);
    assert.equal(depth.geometry, leaf.geometry);
    assert.equal(depth.instanceMatrix, leaf.instanceMatrix);
    for (const field of ["map", "alphaHash", "alphaTest", "side"]) {
      assert.equal(depth.material[field], arborModels[i].leaves.material[field]);
      assert.equal(leaf.material[field], depth.material[field]);
    }
    mesh.onBeforeShadow();
    assert.deepEqual(xs(mesh.geometry.getAttribute("treeShadowMatrix"), mesh.count), i === 1 ? [-45, -39, -40] : [-45]);
    leaf.onBeforeShadow();
    assert.equal(leaf.count, mesh.count);
    assert.equal(depth.count, drawn.length, "Only the color mesh draws the original shadow caster batch");
    assert(leaf.customDepthMaterial.isMeshDepthMaterial);
    leaf.onAfterShadow();
    assert.equal(leaf.count, drawn.length);
    mesh.onAfterShadow();
    assert.equal(mesh.count, drawn.length);
  }
  const version = woods[0].instanceMatrix.version;
  scene.onBeforeRender(renderer, scene, eye);
  assert.equal(woods[0].instanceMatrix.version, version, "Identical visibility should reuse the uploaded attributes");
  setHighQuality(false);
  scene.onBeforeRender(renderer, scene, eye);
  for (const [i, leaf] of foliage.entries()) {
    assert(!coverage[i].visible);
    assert.equal(leaf.material, colors[i], "All main-view quality levels keep the same material");
    assert.equal(leaf.material.depthFunc, T.LessEqualDepth);
    assert(leaf.material.depthWrite);
    assert.equal(leaf.renderOrder, 0);
  }
  setHighQuality(true);
  const ray = new T.Raycaster(eye.position, new T.Vector3(-1, 0, 0), 0, 70);
  assert(ray.intersectObjects(pickables, false).length > 0, "A tree behind the last camera still blocks a pick");

  const cube = new T.CubeCamera(0.1, 75, new T.WebGLCubeRenderTarget(16));
  cube.position.copy(eye.position);
  const faces = [];
  renderer.shadowMap.needsUpdate = false;
  Object.assign(renderer, {
    coordinateSystem: T.WebGLCoordinateSystem, xr: { enabled: false },
    getRenderTarget: () => null, getActiveCubeFace: () => 0, getActiveMipmapLevel: () => 0,
    setRenderTarget() {},
    render(scene, face) {
      scene.onBeforeRender(this, scene, face);
      faces.push(xs(woods[1].instanceMatrix, woods[1].count));
      for (const [i, leaf] of foliage.entries()) {
        assert(!coverage[i].visible);
        assert.equal(leaf.material, arborModels[i].leaves.material);
        assert.equal(leaf.renderOrder, 0);
      }
    },
  });
  cube.update(renderer, scene);
  assert.deepEqual(faces, [[45], [-45, -39, -40], [], [], [], []]);
  scene.onBeforeRender(renderer, scene, eye);
  for (const [i, leaf] of foliage.entries()) {
    assert(coverage[i].visible);
    assert.equal(coverage[i].count, leaf.count);
    assert.equal(leaf.material, colors[i], "Returning to the main camera reuses its original color-pass material");
    assert.equal(leaf.material.depthFunc, T.EqualDepth);
  }
});
