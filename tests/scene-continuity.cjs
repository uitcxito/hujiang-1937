const assert = require("node:assert/strict");
const { before, after, test } = require("node:test");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { facePoint } = require("./helpers/scene.cjs");

let browser, page;
before(async () => {
  browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
  page = await browser.newPage({ offline: true, viewport: { width: 1000, height: 700 } });
  await page.goto(pathToFileURL(path.resolve(__dirname, "../hujiang.html")).href);
  await page.waitForFunction(() => window.hujiang, null, { timeout: 90000 });
  await page.keyboard.press("Escape");
});
after(async () => { await browser?.close(); });

// Read the actual drawn instances, including the transformation of both the wood and its leaf sprays.
function treeState({ x, z }) {
  const result = {}, matrix = new THREE.Matrix4();
  const planted = hujiang.treeTrunks.find(t => t.x === x && t.z === z);
  const authored = arborModels.find(t => t.species === planted.species && t.form === planted.form);
  hujiang.scene.traverseVisible(mesh => {
    const part = mesh.name === "Tree wood" ? "wood" : mesh.name === "Tree foliage" ? "leaves" : null;
    if (!part || !mesh.isInstancedMesh) return;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      if (Math.abs(matrix.elements[12] - x) > 0.002 || Math.abs(matrix.elements[14] - z) > 0.002) continue;
      const geo = mesh.geometry, pose = geo.getAttribute("branchPose");
      if (geo.getAttribute("position") !== authored[part].geometry.getAttribute("position") ||
          geo.index !== authored[part].geometry.index || result[part]) throw Error("Unexpected tree mesh");
      result[part] = [matrix.toArray(), pose.getX(i), pose.getY(i), mesh.material.uuid,
        mesh.castShadow, mesh.customDepthMaterial.uuid];
    }
  });
  return result;
}

test("walking up to a tree and backing away retains its full branches, foliage and shadow geometry", async () => {
  const trees = [{ x: 57.4, z: -43.3 }, { x: 47.4, z: -44.4 }, { x: 39.7, z: -48.8 }];
  const reference = [];
  for (const [i, tree] of trees.entries()) {
    for (const [distance, quality] of [[11, 2], [40, 2], [44, 2], [200, 2], [28, 1], [16, 0], [22, 0], [11, 2]]) {
      await page.evaluate(async ({ x, z, distance, quality }) => {
        const select = document.getElementById("quality");
        if (+select.value !== quality) {
          select.value = quality;
          select.dispatchEvent(new Event("change"));
        }
        hujiang.setView(x, groundY(x, z) + 4, distance, Math.PI / 2, distance > 100 ? 0.58 : 1.59);
        await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
      }, { ...tree, distance, quality });
      const state = await page.evaluate(treeState, tree);
      assert.deepEqual(Object.keys(state).sort(), ["leaves", "wood"], "Missing branches or leaves at " + distance + " m");
      if (!reference[i]) reference[i] = state;
      assert.deepEqual(state, reference[i], "Geometry or branch pose varied with camera/quality");
    }
  }
  const tree = trees[0];
  await page.evaluate(({x, z}) => {
    const site = byId.get(121), approach = site.approach;
    site.approach = [(x + 48) / SCALE + 780, z / SCALE + 370];
    hujiang.focus(121);
    document.getElementById("landHere").click();
    site.approach = approach;
  }, tree);
  assert.equal(await page.evaluate(() => hujiang.mode), "walk");
  await facePoint(page, tree);
  await page.keyboard.down("Shift");
  for (const [key, near] of [["w", true], ["s", false]]) {
    await page.keyboard.down(key);
    try {
      await page.waitForFunction(({ x, z, near }) => {
        const p = hujiang.player, range = Math.hypot(p.x - x, p.z - z);
        return near ? range < 40 : range > 47;
      }, { ...tree, near }, { timeout: 25000 });
    } finally {
      await page.keyboard.up(key);
    }
    assert.deepEqual(await page.evaluate(treeState, tree), reference[0]);
  }
  await page.keyboard.up("Shift");
});

test("auditorium window returns meet the glazing and both occupied wings have a floor", async () => {
  const report = await page.evaluate(() => {
    const site = byId.get(121), base = groundY(site.x, site.z), meshes = [];
    hujiang.scene.traverse(o => { if (o.isMesh && o.userData.siteId === 121) meshes.push(o); });
    const ray = new THREE.Raycaster(), leaks = [];
    // Window centre, outward normal, sill elevation, width and height in the authored metres.
    const windows = [
      ["west aisle", -15.5, 12.85, -1, 0, 1.20, 1.19, 1.55],
      ["west tracery", -15.5, 7.5, -1, 0, 4.45, 6.05, 5.30],
      ["south aisle", 0, 15, 0, 1, 1.08, 2.10, 1.58],
      ["east tracery", 15.5, 7.5, 1, 0, 4.25, 5.65, 5.76],
      ["chapel north", 13.43, -14.875, 0, -1, 1.13, 2.14, 1.40],
      ["chapel flank", 2.055, -7.35, -1, 0, 1.14, 1.87, 1.42],
    ];
    function probe(name, x, z, nx, nz, u, y, d, sideways, rise) {
      const target = new THREE.Vector3(site.x + x + u * nz + d * nx, base + y,
        site.z + z - u * nx + d * nz);
      const dir = new THREE.Vector3(-nx + sideways * nz, rise, -nz - sideways * nx).normalize();
      ray.set(target.addScaledVector(dir, -1.75), dir);
      // Stop within the wall thickness. The floor and the far wall cannot hide a gap.
      ray.far = 2.03;
      if (!ray.intersectObjects(meshes, false).length) leaks.push([name, u, y, d, sideways, rise]);
    }
    for (const [name, x, z, nx, nz, sill, width, height] of windows) {
      for (const u of [-0.37, 0.17, 0.40]) for (const d of [-0.17, -0.197, -0.233]) {
        for (const sideways of [-0.55, 0.55]) {
          probe(name, x, z, nx, nz, u * width, sill, d, sideways, -0.82);
        }
      }
      for (const side of [-1, 1]) {
        probe(name, x, z, nx, nz, side * width / 2, sill + 0.41 * height, -0.20, side * 0.75, 0.1);
        probe(name, x, z, nx, nz, side * 0.015, sill + height, -0.20, 0.09, 1.12);
      }
    }
    for (let i = 0; i < 8; i++) {
      const dx = Math.cos(i * Math.PI / 4), dy = Math.sin(i * Math.PI / 4);
      probe("south oculus", -12.6, 15, 0, 1, 0.6004 * dx, 7.44 + 0.6004 * dy,
        -0.213, 0.75 * dx, 0.75 * dy);
    }
    ray.far = 2.1;
    const floors = [[0, 7.5], [8.78, -7.35], [-7, -8]].map(([x, z]) => {
      ray.set(new THREE.Vector3(site.x + x, base + 2, site.z + z), new THREE.Vector3(0, -1, 0));
      const hit = ray.intersectObjects(meshes, false)[0];
      return hit ? +(hit.point.y - base).toFixed(2) : null;
    });
    return { leaks, floors };
  });
  assert.deepEqual(report.leaks, []);
  assert.deepEqual(report.floors, [0.58, 0.32, null], "Expected a floor in each wing and an open courtyard");
});
