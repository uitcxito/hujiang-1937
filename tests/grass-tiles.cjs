const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const T = require("../vendor/three.min.js");

function fixture() {
  let probes = 0, seed = 193705;
  const rand = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
  const scope = {
    T, rand, between: (a, b) => a + (b - a) * rand(),
    obstacles: [{ id: 121, x: 1, z: -3, w: 5, d: 7 }, { id: 120, x: -7, z: -3, w: 8, d: 5 }],
    surf(x, z) {
      probes++;
      return Math.abs(x + 0.4 * z) < 1.4 ? 1 : 0;
    },
    shoreDistance: (x, z) => 14 - z,
    groundY: (x, z) => 0.08 * Math.sin(x) + 0.03 * Math.cos(z),
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/garden.js"), "utf8"), scope);
  const scene = new T.Scene(), update = scope.grass(scene);
  return {
    scene,
    move(x, z, q, walk = true) {
      probes = 0;
      update({ x, z }, q, walk);
      return probes;
    },
  };
}

function grassMatrices(scene) {
  const rows = [], matrix = new T.Matrix4(), clump = new T.Sphere();
  scene.traverseVisible(mesh => {
    if (!mesh.isInstancedMesh) return;
    assert(mesh.frustumCulled);
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      clump.copy(mesh.geometry.boundingSphere).applyMatrix4(matrix);
      assert(mesh.boundingSphere.distanceToPoint(clump.center) + clump.radius < 0.0001,
        "Clipping bound must include the complete clump");
      rows.push(mesh.instanceMatrix.array.subarray(i * 16, (i + 1) * 16));
    }
  });
  rows.sort((a, b) => a[12] - b[12] || a[14] - b[14]);
  const hash = createHash("sha256");
  for (const row of rows) hash.update(row);
  return [rows.length, hash.digest("hex").slice(0, 24)];
}

test("tile edges, teleports and quality changes preserve the original grass transforms and culling bounds", () => {
  const { scene, move } = fixture();
  // Digests of every sorted Float32 instance matrix produced by the original generator.
  for (const [x, z, q, count, hash] of [
    [-0.1, 0, 2, 7201, "625816a01e8feef6e12b427b"],
    [0, 0, 2, 7206, "ffad718f10405a1e2ed99f44"],
    [8, -8, 2, 9343, "346671cdf984c9d9cac4ca6c"],
    [-104, -48, 2, 11500, "4c6948c5fbec10295f8b9a09"],
    [-104, -48, 1, 6500, "540962aa2abf244162812ba6"],
    [-104, -48, 0, 2750, "0263e5db9d7958e245a49d45"],
    [8, 56, 2, 0, "e3b0c44298fc1c149afbf4c8"],
    [-0.1, 0, 2, 7201, "625816a01e8feef6e12b427b"],
  ]) {
    move(x, z, q);
    assert.deepEqual(grassMatrices(scene), [count, hash]);
  }
  assert.equal(move(0, 0, 2, false), 0);
  assert.equal(grassMatrices(scene)[0], 0);
  assert.equal(move(-0.1, 0, 2), 0);
  assert.equal(grassMatrices(scene)[0], 7201);
});

test("walking across one tile regenerates and uploads only the five entering cells", () => {
  const { scene, move } = fixture(), meshes = [];
  scene.traverse(o => { if (o.isInstancedMesh) meshes.push(o); });
  assert.equal(meshes.length, 25);
  assert.equal(move(-104, -48, 2), 25 * 460);
  const versions = meshes.map(o => o.instanceMatrix.version);
  assert.equal(move(-103, -47, 2), 0);
  assert.equal(move(-96, -48, 2), 5 * 460);
  const changed = meshes.filter((o, i) => o.instanceMatrix.version !== versions[i]);
  assert.equal(changed.length, 5);
  for (const o of changed) {
    assert.deepEqual(o.instanceMatrix.updateRanges, [{ start: 0, count: o.count * 16 }]);
  }
  assert.equal(move(-88, -40, 2), 9 * 460);
  assert.equal(move(-240, -240, 2), 25 * 460);
  const after = [];
  scene.traverse(o => { if (o.isInstancedMesh) after.push(o); });
  assert.deepEqual(after, meshes);
});
