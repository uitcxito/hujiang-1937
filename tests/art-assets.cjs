const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { facePoint } = require("./helpers/scene.cjs");
const root = path.resolve(__dirname, "..");

async function run() {
  const folder = await fs.mkdtemp(path.join(os.tmpdir(), "hujiang-art-"));
  const portable = path.join(folder, "hujiang.html");
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
  try {
    await fs.copyFile(path.join(root, "hujiang.html"), portable);
    for (const file of [path.join(root, "index.html"), portable]) {
      const page = await browser.newPage({ offline: true, viewport: { width: 1152, height: 768 } });
      const problems = [];
      page.on("pageerror", (e) => problems.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") problems.push(m.text());
      });
      page.on("request", (req) => {
        if (/^https?:/.test(req.url())) problems.push(req.url());
      });
      await page.goto(pathToFileURL(file).href);
      await page.waitForFunction(() => window.hujiang, null, { timeout: 90000 });
      await page.keyboard.press("Escape");
      const inventory = await page.evaluate(() => {
        const siteMeshes = [];
        hujiang.scene.traverse((o) => {
          if (o.isMesh && o.userData.siteId) siteMeshes.push(o);
        });
        return {
          ids: [...new Set(siteMeshes.map((m) => m.userData.siteId))].sort((a, b) => a - b),
          types: arborModels.map((t) => [
            t.species,
            t.form,
            t.radius,
            t.wood.geometry.attributes.position.count,
            t.leaves.geometry.attributes.position.count,
          ]),
          placements: [...new Set(hujiang.treeTrunks.map((t) => t.species + "-" + t.form))].length,
          independent: siteMeshes.every(
            (m) => !m.geometry.hasAttribute("siteId") && m.geometry.attributes.uv,
          ),
          interior: hujiang.legal(byId.get(121).x, byId.get(121).z + 7.5),
          yard: hujiang.legal(byId.get(121).x - 7, byId.get(121).z - 8),
        };
      });
      assert.deepEqual(inventory.ids, [121, 153, 190]);
      assert(inventory.independent);
      assert.equal(inventory.types.length, 9);
      assert.equal(inventory.placements, 9);
      for (const species of ["camphor", "zelkova", "maple"]) {
        const forms = inventory.types.filter((t) => t[0] === species);
        assert.deepEqual(
          forms.map((t) => t[1]),
          [0, 1, 2],
        );
        assert.equal(new Set(forms.map((t) => t[2])).size, 3);
        assert(forms.every((t) => t[3] > 400 && t[4] > 600));
      }
      assert(!inventory.interior && inventory.yard);
      // Actual screen-space clicks, including the open gate where aiming at site centre would miss.
      for (const [id, from, to] of [
        [121, [-22, 2.0, 6.3], [-15.17, 1.9, 6.3]],
        [121, [-24, 6, 7.6], [-15.45, 6.2, 7.5]],
        [153, [23, 10.8, 1.2], [13.27, 11.48, 0]],
        [190, [-7, 2.1, 5.3], [0, 2.2, 6.55]],
      ]) {
        const title = await page.evaluate(
          ({ id, from, to }) => {
            const s = byId.get(id),
              base = groundY(s.x, s.z);
            const direction = new THREE.Vector3(...from).sub(new THREE.Vector3(...to));
            hujiang.setView(
              s.x + to[0],
              base + to[1],
              s.z + to[2],
              direction.length(),
              Math.atan2(direction.x, direction.z),
              Math.acos(direction.y / direction.length()),
            );
            return s.name;
          },
          { id, from, to },
        );
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
        await page.mouse.click(576, 384);
        await page.waitForFunction(
          (title) =>
            !document.getElementById("placeCard").hidden &&
            document.getElementById("placeTitle").textContent === title,
          title,
        );
        await page.click("#landHere");
        assert(
          await page.evaluate(
            () => hujiang.mode === "walk" && hujiang.legal(hujiang.player.x, hujiang.player.z),
          ),
        );
      }
      // Place the fixture at the foot of the west steps using the normal relocation controller.
      const goal = await page.evaluate(() => {
        const s = byId.get(121),
          old = s.approach;
        s.approach = [(s.x - 18.65) / SCALE + 780, (s.z + 6.3) / SCALE + 370];
        hujiang.focus(121);
        document.getElementById("landHere").click();
        s.approach = old;
        return { x: s.x - 14.7, z: s.z + 6.3 };
      });
      await facePoint(page, goal);
      const before = await page.evaluate(() => hujiang.player.toArray());
      await page.keyboard.down("w");
      await page.waitForTimeout(2000);
      await page.keyboard.up("w");
      const standing = await page.evaluate(() => ({
        p: hujiang.player.toArray(),
        ok: hujiang.legal(hujiang.player.x, hujiang.player.z),
      }));
      assert(
        standing.ok &&
          standing.p[1] - before[1] > 0.45 &&
          standing.p[0] > before[0] + 2.3 &&
          standing.p[0] < goal.x,
        "Expected a traversable stair and a closed door at the threshold: " +
          JSON.stringify([before, standing, goal]),
      );
      assert.deepEqual(problems, []);
      console.log(
        path.basename(file) +
          ": nine tree forms, three GLB landmarks, four actual picks, relocation and exterior stairs passed offline.",
      );
      await page.close();
    }
  } finally {
    await browser.close();
    await fs.unlink(portable).catch(() => {});
    await fs.rmdir(folder);
  }
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
