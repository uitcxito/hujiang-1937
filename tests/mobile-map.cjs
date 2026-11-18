const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { pickBuilding } = require("./helpers/scene.cjs");

async function check() {
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
  try {
    const context = await browser.newContext({
      offline: true, hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
    });
    const page = await context.newPage(), errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => { if (/^https?:/.test(r.url())) errors.push(r.url()); });
    await page.goto(pathToFileURL(path.resolve(__dirname, "..", "hujiang.html")).href);
    await page.waitForFunction(() => window.hujiang, undefined, { timeout: 60000 });
    const pos = () => page.evaluate(() => hujiang.player.toArray());
    const pose = () => page.evaluate(() => hujiang.camera.position.toArray());
    const frame = () => page.evaluate(() => new Promise(requestAnimationFrame));
    const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
    assert.equal(await page.inputValue("#quality"), "0");
    assert(await page.locator("#stick").isVisible());

    // Verify full-map coordinates independently at three known sites.
    for (const id of [190, 180, 182]) {
      await page.evaluate((id) => {
        const s = hujiang.sites.find((site) => site.id === id);
        hujiang.setView(s.x, 0, s.z, 70, 0, 0.5);
      }, id);
      await page.tap("#mapToggle");
      await frame();
      assert(await page.evaluate((id) => {
        const c = document.querySelector("#campusMap"), site = hujiang.sites.find((s) => s.id === id);
        const k = Math.min(c.width / 1600, c.height / 800);
        const x = Math.round(c.width / 2 + (site.u - 800) * k);
        const y = Math.round(c.height / 2 + (site.v - 400) * k);
        return c.getContext("2d").getImageData(x, y, 1, 1).data.slice(0, 3).join() === "255,246,201";
      }, id));
      await page.tap("#mapClose");
    }
    await page.tap("#home");
    await frame();
    const start = await pos();
    // Tap visible ground ahead of the gate approach. The map pauses and preserves this route.
    await page.touchscreen.tap(195, 548);
    await page.waitForFunction(([x]) => Math.abs(hujiang.player.x - x) > 0.03, start);
    await pickBuilding(page, 190, { height: 0.7, depth: 0.32 });
    const reading = await pos();
    await page.waitForFunction(([x]) => hujiang.player.x > x + 0.15, reading);
    await page.tap("#mapToggle");
    assert.match(await page.textContent("#mapLegend"), /剩余路线/);
    const paused = await pos();
    await page.tap("#campusMap");
    await page.waitForTimeout(180);
    assert.deepEqual(await pos(), paused);
    await page.keyboard.press("Escape");
    await page.waitForFunction(([x]) => Math.abs(hujiang.player.x - x) > 0.03, paused);
    await page.keyboard.down("a");
    await page.keyboard.up("a");
    await page.tap("#mapToggle");
    assert.doesNotMatch(await page.textContent("#mapLegend"), /剩余路线/);
    await page.tap("#mapClose");

    // Send two independent physical touch contacts through Chromium's input pipeline.
    const cdp = await context.newCDPSession(page);
    const touch = (type, touchPoints) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
    const center = async (id) => {
      const b = await page.locator(id).boundingBox();
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
    };
    const stick = { ...await center("#stick"), id: 1 };
    const look = { x: 70, y: 535, id: 2 };
    const before = await pos();
    const heading = () => page.evaluate(() => hujiang.camera.getWorldDirection(new THREE.Vector3()).x);
    const facing = await heading();
    await touch("touchStart", [stick]);
    await touch("touchStart", [stick, look]);
    await touch("touchMove", [{ ...stick, y: stick.y - 28 }, { ...look, x: look.x + 235, y: look.y - 40 }]);
    await page.waitForTimeout(300);
    await touch("touchCancel", []);
    await frame();
    const stopped = await pos();
    assert(distance(before, stopped) > 0.12 && Math.abs(await heading() - facing) > 0.001);
    await page.waitForTimeout(220);
    assert.deepEqual(await pos(), stopped);
    const schoolHeading = await heading();
    await pickBuilding(page, 103);
    await frame();
    assert.deepEqual(await pos(), stopped);
    assert.equal(await heading(), schoolHeading);

    await page.tap("#drone");
    await frame();
    assert(await page.locator("#placeCard").isHidden());
    await pickBuilding(page, 103);
    const altitude = (await pose())[1];
    await touch("touchStart", [{ ...await center("#ascend"), id: 1 }]);
    await page.waitForFunction((y) => hujiang.camera.position.y > y + 0.4, altitude);
    await touch("touchEnd", []);
    const raised = (await pose())[1];
    await touch("touchStart", [{ ...await center("#descend"), id: 1 }]);
    await page.waitForFunction((y) => hujiang.camera.position.y < y - 0.25, raised);
    await touch("touchEnd", []);
    await page.tap("#walk");
    assert(await page.locator("#placeCard").isHidden());
    assert(await page.evaluate(() => hujiang.mode === "walk" && hujiang.legal(hujiang.player.x, hujiang.player.z)));

    await page.tap("#orbit");
    await page.evaluate(() => {
      const hall = hujiang.sites.find((s) => s.id === 104);
      hujiang.setView(hall.x, 0, hall.z, 80, 0, 0.3);
    });
    const a = { x: 110, y: 500, id: 1 }, b = { x: 260, y: 500, id: 2 };
    await frame();
    const aerial = await pose();
    await pickBuilding(page, 104);
    await pickBuilding(page, 105);
    await frame();
    assert.deepEqual(await pose(), aerial);
    await touch("touchStart", [a, b]);
    await touch("touchMove", [{ ...a, x: 65 }, { ...b, x: 305 }]);
    await frame();
    const zoomed = await pose();
    assert(zoomed[1] < aerial[1] * 0.75);
    await touch("touchMove", [{ ...a, x: 90 }, { ...b, x: 330 }]);
    await touch("touchEnd", []);
    await frame();
    assert(Math.abs((await pose())[0] - zoomed[0]) > 1);
    assert(await page.locator("#stick").isHidden());

    for (const [width, height] of [[320, 568], [844, 390], [768, 1024]]) {
      await page.setViewportSize({ width, height });
      await page.tap("#home");
      const map = await page.locator("#mapToggle").boundingBox();
      const joy = await page.locator("#stick").boundingBox();
      assert(map.y + map.height < joy.y);
      await page.tap("#guide");
      assert(await page.locator("#stick").isHidden());
      await page.fill("#placeQuery", "水塔");
      await page.tap("#placeList button");
      assert.match(await page.textContent("#placeTitle"), /水塔/);
      await page.tap("#mapToggle");
      await page.tap("#mapClose");
      assert(await page.locator("#placeCard").isVisible());
      await page.tap("#landHere");
      assert(await page.locator("#stick").isVisible());
    }
    await context.close();
    const desktop = await browser.newPage({ offline: true, viewport: { width: 1280, height: 800 } });
    desktop.on("pageerror", (e) => errors.push(e.message));
    await desktop.goto(pathToFileURL(path.resolve(__dirname, "..", "hujiang.html")).href);
    await desktop.waitForFunction(() => window.hujiang);
    assert(await desktop.locator("#stick").isHidden());
    await pickBuilding(desktop, 190, { height: 0.7, depth: 0.32 });
    const targets = await desktop.evaluate(() => {
      const p = hujiang.player;
      return [[7.3, 0.8], [4.5, -0.4]].map(([dx, dz]) => {
        const x = p.x + dx, z = p.z + dz;
        const v = new THREE.Vector3(x, groundY(x, z), z).project(hujiang.camera);
        return { x, z, screenX: (1 + v.x) * innerWidth / 2, screenY: (1 - v.y) * innerHeight / 2 };
      });
    });
    for (const target of targets) await desktop.mouse.click(target.screenX, target.screenY);
    await pickBuilding(desktop, 103);
    await desktop.waitForFunction(({ x, z }) =>
      Math.hypot(hujiang.player.x - x, hujiang.player.z - z) < 0.22 &&
      !hujiang.scene.getObjectByName("walkingDestination").visible, targets[1]);
    await desktop.click("#mapToggle");
    assert.doesNotMatch(await desktop.textContent("#mapLegend"), /剩余路线/);
    await desktop.keyboard.press("Escape");
    assert(await desktop.locator("#mapDialog").isHidden());
    assert.deepEqual(errors, []);
    console.log("Offline touch movement, two-finger orbit, flight, route interruption, map anchors and responsive controls passed.");
  } finally {
    await browser.close();
  }
}
check().catch((error) => { console.error(error); process.exitCode = 1; });
