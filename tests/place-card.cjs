const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

async function openFromGuide(page, name) {
  await page.click("#guide");
  await page.fill("#placeQuery", name);
  await page.locator("#placeList button").first().click();
  assert.equal(await page.textContent("#placeTitle"), name);
}

// Hit-test the shield itself so a rectangular overlay or stretched caps fail the check.
function measureShield(card) {
  const box = card.getBoundingClientRect();
  const edgeDepth = (fraction, bottom) => {
    const x = box.left + box.width * fraction;
    for (let n = 0; n < box.height / 2; n++) {
      const y = bottom ? box.bottom - n - 0.5 : box.top + n + 0.5;
      if (card.contains(document.elementFromPoint(x, y))) return n;
    }
    return -1;
  };
  return {
    box: box.toJSON(),
    crown: [0.12, 0.32, 0.5].map((x) => edgeDepth(x, false)),
    tip: [0.12, 0.32, 0.5].map((x) => edgeDepth(x, true)),
  };
}

async function check() {
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
  try {
    const page = await browser.newPage({ offline: true, viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) errors.push(r.url());
    });
    await page.goto(pathToFileURL(path.join(__dirname, "..", "hujiang.html")).href);
    await page.waitForFunction(() => window.hujiang, undefined, { timeout: 60000 });
    const card = page.locator("#placeCard");
    const summary = card.locator("summary");
    const name = "思乔堂 · 幼稚园";
    await openFromGuide(page, name);
    const closed = await card.evaluate(measureShield);
    await summary.focus();
    await page.keyboard.press("Enter");
    const open = await card.evaluate(measureShield);
    assert(open.box.height > closed.box.height);
    assert.equal(open.box.width, 360);
    for (const edge of ["crown", "tip"]) {
      assert(open[edge][0] > open[edge][1] && open[edge][1] > open[edge][2]);
      assert(open[edge].every((depth, i) => Math.abs(depth - closed[edge][i]) <= 1));
    }
    await summary.press("Space");
    assert.equal(await card.locator("details").evaluate((d) => d.open), false);
    await card.locator(".close").click();
    await page.locator("#view canvas").click({ position: { x: 640, y: 400 } });
    assert(await card.isVisible());
    assert.equal(await page.textContent("#placeTitle"), name);
    await page.keyboard.press("Escape");
    assert(await card.isHidden());

    await page.click("#orbit");
    const pin = page.locator("#pins button:visible").first();
    const pinName = await pin.textContent();
    await pin.click();
    assert((await page.textContent("#placeTitle")).startsWith(pinName));
    await page.click("#landHere");
    assert(await card.isHidden());
    assert.equal(await page.evaluate(() => hujiang.mode), "walk");

    for (const [width, height, place] of [
      [390, 844, "哈斯科体育馆"],
      [844, 390, "门口学校 · 小学部"],
      [320, 568, name],
    ]) {
      await page.setViewportSize({ width, height });
      await openFromGuide(page, place);
      assert.equal(await page.locator("#placeReading").evaluate((e) => e.scrollTop), 0);
      if (!(await card.locator("details").evaluate((d) => d.open))) await summary.click();
      const box = await card.boundingBox();
      assert(box.x >= 12 && box.y >= 0 && box.y + box.height <= height);
      assert(Math.abs(box.x + box.width / 2 - width / 2) < 1);
      assert((await page.locator("#dock").boundingBox()).y > box.y + box.height);
      if (place === "哈斯科体育馆") assert.equal(await card.locator("#photoLinks a").count(), 4);
      if (place === "门口学校 · 小学部") {
        assert.equal(await page.textContent("#typeline"), "沪江校园 · 1937");
        assert(await page.locator("#sourceLink").isHidden());
      }
      await page.locator("#mapSource").click({ trial: true });
      await card.locator(".close").click({ trial: true });
      await page.click("#landHere");
      assert(await card.isHidden());
      assert(await page.evaluate(() => {
        const { x, z } = hujiang.player;
        return hujiang.mode === "walk" && hujiang.legal(x, z);
      }));
    }
    assert.deepEqual(errors, []);
    console.log("Shield shape, three entry points, keyboard disclosure, mobile scrolling and offline landings passed.");
  } finally {
    await browser.close();
  }
}

check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
