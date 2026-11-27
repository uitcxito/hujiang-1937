// Preserve the old planting pattern. Position, not construction order, selects a reproducible individual.
const treeTrunks = [];
const samplePlanting = [
  [57.4, -43.3, 0.91, 5],
  [47.4, -44.4, 0.79, 6],
  [39.7, -48.8, 0.84, 1],
];
const studyTrees = new Map([
  ["64.67,-32.33", 0],
  ["64.8,-35.88", 7],
  ["42.47,-46.33", 4],
  ["24.3,-21.3", 7],
  ["18.23,0.43", 2],
  ["44.1,-2.15", 3],
  ["53.96,1.15", 6],
  ["18.19,-17.4", 1],
]);

function individualBranches(shader) {
  shader.vertexShader =
    `
    attribute vec2 branchPose;
    mat2 branchRotation(vec3 p) {
      vec2 axis=normalize(p.xz+vec2(.00001));
      vec2 sectors=vec2(axis.x*axis.x-axis.y*axis.y,2.*axis.x*axis.y);
      float angle=dot(sectors,branchPose)*smoothstep(2.4,9.,p.y)*smoothstep(.4,2.7,length(p.xz));
      vec2 turn=normalize(vec2(1.,angle));
      return mat2(turn.x,turn.y,-turn.y,turn.x);
    }
  ` +
    shader.vertexShader
      .replace(
        "#include <beginnormal_vertex>",
        "#include <beginnormal_vertex>\nobjectNormal.xz=branchRotation(position)*objectNormal.xz;\n#ifdef USE_TANGENT\nobjectTangent.xz=branchRotation(position)*objectTangent.xz;\n#endif",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.xz=branchRotation(position)*position.xz;",
      );
}

// A pass owns its compacted instance attributes. Keep existing slots when the visible order is stable.
function treeInstances(trees) {
  const matrices = new T.InstancedBufferAttribute(new Float32Array(trees.length * 16), 16).setUsage(T.DynamicDrawUsage);
  const poses = new T.InstancedBufferAttribute(new Float32Array(trees.length * 2), 2).setUsage(T.DynamicDrawUsage);
  const slots = new Int32Array(trees.length).fill(-1);
  return {
    matrices, poses, count: 0,
    select(frustum) {
      let count = 0, changed = false;
      for (let i = 0; i < trees.length; i++) {
        const tree = trees[i];
        if (!frustum.intersectsSphere(tree.bounds)) continue;
        if (slots[count] !== i) {
          slots[count] = i;
          tree.transform.toArray(matrices.array, count * 16);
          poses.setXY(count, tree.bendX, tree.bendZ);
          changed = true;
        }
        count++;
      }
      if (changed) {
        matrices.needsUpdate = true;
        poses.needsUpdate = true;
      }
      this.count = count;
    },
  };
}

function leafPassMaterials(original) {
  const color = original.clone();
  color.onBeforeCompile = (shader, renderer) => {
    original.onBeforeCompile(shader, renderer);
    shader.vertexShader = "invariant gl_Position;\n" + shader.vertexShader;
  };
  const depth = original.clone();
  depth.colorWrite = false;
  depth.onBeforeCompile = (shader, renderer) => {
    // Identical positions and alpha coverage in both passes, including at MSAA edges.
    color.onBeforeCompile(shader, renderer);
    const coverage = "#include <alphahash_fragment>";
    const end = shader.fragmentShader.indexOf(coverage);
    if (end < 0) throw Error("Leaf alpha coverage shader chunk is missing");
    shader.fragmentShader = shader.fragmentShader.slice(0, end + coverage.length) +
      "\n  gl_FragColor = vec4(0.);\n}";
  };
  return { color, depth };
}

function vegetation(scene, sun, mainCamera) {
  const stands = arborModels.map(() => []);
  const dummy = new T.Object3D();
  const walkable = makeWalkSpace(obstacles, [], 0.38);
  const planting = campusTreeSites.concat(
    samplePlanting.filter(([x, z]) => walkable(x, z) && surf(x, z) < 0.1),
  );
  for (const [x, z, size, curated] of planting) {
    let seed = (Math.imul(Math.round(x * 100), 747796405) ^ Math.imul(Math.round(z * 100), 2891336453)) >>> 0;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const index = curated ?? studyTrees.get([x, z].join()) ?? Math.floor(random() * 9);
    const form = arborModels[index];
    const width = size * (0.84 + random() * 0.24), depth = size * (0.87 + random() * 0.21);
    dummy.position.set(x, groundY(x, z), z);
    dummy.rotation.set(0, random() * Math.PI * 2, 0);
    dummy.scale.set(width, size, depth);
    dummy.updateMatrix();
    const lean = (random() - 0.5) * 0.063;
    const transform = dummy.matrix.clone().multiply(new T.Matrix4().makeShear(0, 0, lean, 0, 0, 0));
    const direction = random() * Math.PI * 2, spread = 0.1 + random() * 0.17;
    // Branch rotation preserves the radial extent. Enclose the sheared, nonuniformly scaled crown.
    const halfHeight = (form.top - form.bottom) / 2;
    const bounds = new T.Sphere(
      new V(0, form.bottom + halfHeight, 0).applyMatrix4(transform),
      Math.hypot((form.radius + Math.abs(lean) * halfHeight) * Math.max(width, depth), halfHeight * size),
    );
    stands[index].push({ transform, bounds, bendX: Math.cos(direction) * spread, bendZ: Math.sin(direction) * spread });
    treeTrunks.push({
      x, z, r: form.trunkRadius * Math.max(width, depth),
      crownRadius: (form.radius + Math.abs(lean) * form.top) * Math.max(width, depth),
      top: dummy.position.y + size * form.top, species: form.species, form: form.form,
    });
  }

  const trunks = [], batches = [], depthMaterials = new Map();
  const leafMaterials = new Map(), leafPasses = [];
  for (const [index, trees] of stands.entries()) {
    const form = arborModels[index];
    const main = treeInstances(trees), shadow = treeInstances(trees), meshes = [];
    const batchBounds = new T.Sphere();
    for (const tree of trees) batchBounds.union(tree.bounds);
    // Picking uses the full original wood population, independently of the last camera or cube face.
    const pick = new T.InstancedMesh(form.wood.geometry, form.wood.material, trees.length);
    trees.forEach((tree, i) => pick.setMatrixAt(i, tree.transform));
    pick.boundingSphere = batchBounds;
    trunks.push(pick);
    for (const part of [form.wood, form.leaves]) {
      const geometry = new T.BufferGeometry();
      geometry.setIndex(part.geometry.index);
      Object.assign(geometry.attributes, part.geometry.attributes);
      geometry.setAttribute("branchPose", main.poses);
      geometry.setAttribute("treeShadowMatrix", shadow.matrices);
      geometry.setAttribute("treeShadowPose", shadow.poses);
      const mat = part.material;
      if (!depthMaterials.has(mat)) {
        const depth = new T.MeshDepthMaterial({
          depthPacking: T.RGBADepthPacking, map: mat.alphaTest ? mat.map : null,
          alphaTest: mat.alphaTest, alphaHash: mat.alphaHash, side: mat.side,
        });
        if (depth.alphaHash) depth.extensions = { derivatives: true };
        depth.onBeforeCompile = (shader) => {
          individualBranches(shader);
          shader.vertexShader = "attribute mat4 treeShadowMatrix;\n#define instanceMatrix treeShadowMatrix\n#define branchPose treeShadowPose\n" + shader.vertexShader;
        };
        depthMaterials.set(mat, depth);
      }
      const mesh = new T.InstancedMesh(geometry, mat, trees.length);
      mesh.name = part === form.wood ? "Tree wood" : "Tree foliage";
      mesh.boundingSphere = batchBounds;
      mesh.frustumCulled = false; // Per-instance culling is done for each camera before the uploads.
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.customDepthMaterial = depthMaterials.get(mat);
      mesh.instanceMatrix = main.matrices;
      mesh.onBeforeShadow = () => { mesh.count = shadow.count; };
      mesh.onAfterShadow = () => { mesh.count = main.count; };
      scene.add(mesh);
      meshes.push(mesh);
      if (part === form.leaves) {
        if (!leafMaterials.has(mat)) leafMaterials.set(mat, leafPassMaterials(mat));
        const { color, depth } = leafMaterials.get(mat);
        const coverage = new T.InstancedMesh(geometry, depth, trees.length);
        coverage.name = "Leaf coverage prepass";
        coverage.instanceMatrix = main.matrices;
        coverage.boundingSphere = batchBounds;
        coverage.frustumCulled = false;
        coverage.receiveShadow = true;
        coverage.visible = false;
        coverage.renderOrder = 1;
        scene.add(coverage);
        meshes.push(coverage);
        leafPasses.push({ coverage, mesh, color, original: mat });
      }
    }
    batches.push({ main, shadow, meshes });
  }

  const frustum = new T.Frustum(), viewProjection = new T.Matrix4();
  let highQuality = false, previousPass = "reflection";
  // Three calls this before collecting the render list, including once per reflection cube face.
  scene.onBeforeRender = (renderer, _scene, camera) => {
    const pass = camera !== mainCamera ? "reflection" : highQuality ? "prepass" : "single";
    if (pass !== previousPass) {
      const usePrepass = pass === "prepass";
      for (const { coverage, mesh, color, original } of leafPasses) {
        coverage.visible = usePrepass;
        color.depthFunc = usePrepass ? T.EqualDepth : original.depthFunc;
        color.depthWrite = usePrepass ? false : original.depthWrite;
        mesh.material = pass === "reflection" ? original : color;
        mesh.renderOrder = usePrepass ? 4 : 0;
      }
      previousPass = pass;
    }
    frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    const updateShadow = renderer.shadowMap.enabled && (renderer.shadowMap.autoUpdate || renderer.shadowMap.needsUpdate)
      && sun.castShadow && (sun.shadow.autoUpdate || sun.shadow.needsUpdate);
    if (updateShadow) sun.shadow.updateMatrices(sun);
    for (const { main, shadow, meshes } of batches) {
      main.select(frustum);
      if (updateShadow) shadow.select(sun.shadow.getFrustum());
      for (const mesh of meshes) mesh.count = main.count;
    }
  };
  return { trunks, setHighQuality(value) { highQuality = value; } };
}
