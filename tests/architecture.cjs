// Run with Node and a local Playwright installation (PLAYWRIGHT_MODULE can point to it).
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

async function check() {
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
  try {
    const page = await browser.newPage({ offline: true, viewport: { width: 1280, height: 800 } });
    const errors = [],
      remote = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) remote.push(r.url());
    });
    await page.goto(pathToFileURL(path.join(__dirname, "..", "hujiang.html")).href);
    await page.waitForFunction(() => window.hujiang, undefined, { timeout: 60000 });
    await page.keyboard.press("Escape");
    const report = await page.evaluate(() => {
      const structures = hujiang.sites.filter((s) => s.style !== "landmark");
      const boxes = (id) => hujiang.obstacles.filter((o) => o.id === id);
      const incomplete = structures.filter(
        (s) => !boxes(s.id).length || !s.photoView || !s.record.observed || !s.record.inferred,
      );
      const [nave, cross] = boxes(161),
        [science, porch] = boxes(141);
      const openCornerX = nave.x + (nave.w + cross.w) / 4;
      const gymFloor = hujiang.legal(nave.x, nave.z);
      const east = structures.find((s) => s.id === 163),
        gym = structures.find((s) => s.id === 161);
      // Identify the six dormers on each of East Hall's long roof slopes independently of the roof builder.
      const structure = new THREE.Group(),
        len = hujiang.obstacles.length;
      buildSite(east, structure);
      const dormerCenters = [];
      structure.updateMatrixWorld(true);
      structure.traverse((o) => {
        if (o.material !== casement) return;
        const v = o.getWorldPosition(new THREE.Vector3());
        if (Math.abs(v.x - east.x) > east.w * 0.32 && v.y > groundY(east.x, east.z) + east.h) {
          dormerCenters.push([v.x - east.x, v.z - east.z]);
        }
      });
      hujiang.obstacles.length = len;
      return {
        count: structures.length,
        incomplete: incomplete.map((s) => s.name),
        duplicate: new Set(structures.map((s) => s.id)).size !== structures.length,
        nave: [nave.w, nave.d, nave.z],
        cross: [cross.w, cross.d, cross.z],
        gymFloor,
        openCorner: hujiang.legal(openCornerX, nave.z),
        eastGap: nave.z - nave.d / 2 - (east.z + east.d / 2),
        gymEastOrder: gym.z > east.z,
        northPorch: porch.z + porch.d / 2 <= science.z - science.d / 2 + 0.03,
        eastDormers: [-1, 1].map((k) => dormerCenters.filter(([x]) => x * k > 0).length),
      };
    });
    assert.equal(report.count, 57);
    assert.deepEqual(report.incomplete, []);
    assert(!report.duplicate);
    assert(
      report.nave[0] < report.cross[0] - 3 &&
        report.cross[1] < report.nave[1] &&
        report.cross[2] > report.nave[2],
    );
    assert(!report.gymFloor && report.openCorner && report.eastGap > 1 && report.gymEastOrder);
    assert(report.northPorch);
    assert.deepEqual(report.eastDormers, [6, 6]);
    for (const [query, title, links] of [
      ["科学楼", "科学馆", 2],
      ["东堂", "东堂", 2],
      ["北体育馆", "哈斯科体育馆", 3],
    ]) {
      await page.click("#guide");
      await page.fill("#placeQuery", query);
      await page.locator("#placeList button").first().click();
      assert.equal(await page.textContent("#placeTitle"), title);
      if (!(await page.locator("#placeCard details").evaluate((e) => e.open)))
        await page.click("#placeCard summary");
      assert((await page.locator("#photoLinks a").count()) >= links);
      assert(
        await page
          .locator("#photoLinks a")
          .first()
          .getAttribute("href")
          .then((u) => u.startsWith("https://buildings.usst.edu.cn/_upload/")),
      );
      await page.click("#landHere");
      assert(
        await page.evaluate(() => {
          const p = hujiang.player;
          return hujiang.mode === "walk" && hujiang.legal(p.x, p.z);
        }),
      );
    }
    assert.deepEqual(remote, []);
    assert.deepEqual(errors, []);
    console.log(
      "57 structures checked. Science Hall porch, East Hall dormers, Haskell T-plan and clearances, photo cards, searches, safe landings and offline loading passed.",
    );
  } finally {
    await browser.close();
  }
}
check().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
