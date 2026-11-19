const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

async function check() {
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
  try {
    const page = await browser.newPage({ offline: true, viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(__dirname, "..", "hujiang.html")).href);
    await page.waitForFunction(() => window.hujiang);
    await page.keyboard.press("Escape");
    const frame = () => page.evaluate(() => new Promise(requestAnimationFrame));
    const position = () => page.evaluate(() => hujiang.camera.position.toArray());
    const direction = () =>
      page.evaluate(() => hujiang.camera.getWorldDirection(new THREE.Vector3()).toArray());
    const distance = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
    async function hold(keys, ms) {
      for (const key of keys) await page.keyboard.down(key);
      await page.waitForTimeout(ms);
      for (const key of [...keys].reverse()) await page.keyboard.up(key);
      await frame();
      return position();
    }
    // Start from a reproducible orbit pose facing map -Z, then use the public mode button and real inputs.
    async function flyFrom(x, y, z) {
      await page.evaluate(([x, y, z]) => hujiang.setView(x, y, z - 8, 8, 0, Math.PI / 2), [x, y, z]);
      await page.click("#drone");
      await frame();
      return position();
    }

    const gate = await position();
    const walking = await hold(["w"], 450);
    assert(distance(walking, gate) > 0.25);
    await page.mouse.move(650, 340);
    await page.mouse.down();
    await page.mouse.move(700, 325);
    await page.mouse.up();
    await frame();
    const walkingHeading = await direction();
    async function checkWalkingPose() {
      await frame();
      assert.equal(await page.getAttribute("#walk", "aria-pressed"), "true");
      assert(await page.evaluate(() => hujiang.mode === "walk" && hujiang.legal(hujiang.player.x, hujiang.player.z)));
      assert.deepEqual(await position(), walking);
      assert.deepEqual(await page.evaluate(() => hujiang.player.toArray()), walking);
      assert(distance(await direction(), walkingHeading) < 0.000001);
    }
    await page.getByRole("button", { name: "无人机", exact: true }).click();
    await frame();
    const start = await position();
    assert(start[1] > walking[1] + 10 && start[0] === walking[0] && start[2] === walking[2]);
    assert.equal(await page.getAttribute("#drone", "aria-pressed"), "true");
    assert.match(await page.textContent("#locationLabel"), /飞行高度/);
    const up = await hold(["e"], 400);
    const down = await hold(["q"], 240);
    assert(up[1] > start[1] + 1 && down[1] < up[1] - 0.5 && down[0] === start[0] && down[2] === start[2]);
    const forward = await hold(["w"], 400);
    const fast = await hold(["Shift", "w"], 400);
    assert(distance(forward, down) > 1 && distance(fast, forward) > distance(forward, down) * 1.6);
    assert.equal(fast[1], down[1]);
    assert(distance(await hold(["a"], 240), fast) > 1);
    const hover = await position(),
      heading = await direction();
    await page.mouse.move(650, 340);
    await page.mouse.down();
    await page.mouse.move(750, 380, { steps: 4 });
    await page.mouse.up();
    await frame();
    assert(distance(await direction(), heading) > 0.1 && distance(await position(), hover) < 0.001);
    assert.deepEqual(await page.evaluate(() => hujiang.player.toArray()), walking);
    await page.keyboard.press("v");
    await checkWalkingPose();
    await page.keyboard.down("v");
    await page.keyboard.down("v");
    await page.keyboard.up("v");
    await frame();
    assert.equal(await page.getAttribute("#orbit", "aria-pressed"), "true");
    const orbit = await position(),
      orbitHeading = await direction();
    await page.keyboard.press("v");
    await frame();
    assert.equal(await page.getAttribute("#drone", "aria-pressed"), "true");
    assert(distance(await position(), orbit) < 0.001 && distance(await direction(), orbitHeading) < 0.001);

    const tower = await page.evaluate(() => hujiang.sites.find((s) => s.id === 154));
    const beside = await flyFrom(tower.x, 7, tower.z + 9);
    const wall = await hold(["Shift", "w"], 650);
    assert(wall[1] < tower.h && wall[2] < beside[2] - 1 && wall[2] > tower.z + tower.w / 2);
    const above = await flyFrom(tower.x, tower.h + 5, tower.z);
    const roof = await hold(["Shift", "q"], 650);
    assert(roof[1] >= tower.h && roof[1] < above[1] - 1);
    assert(distance(await hold(["q"], 220), roof) < 0.01);
    await page.keyboard.press("f");
    await checkWalkingPose();

    const tree = await page.evaluate(() =>
      hujiang.treeTrunks.find(
        (t) =>
          hujiang.legal(t.x - 2, t.z) &&
          hujiang.treeTrunks.every((u) => t === u || Math.hypot(t.x - u.x, t.z - u.z) > u.crownRadius + 2),
      ),
    );
    assert(tree);
    const canopy = await flyFrom(tree.x, tree.top + 5, tree.z);
    const treetop = await hold(["Shift", "q"], 650);
    assert(treetop[1] >= tree.top && treetop[1] < canopy[1] - 1);

    const river = await page.evaluate(() => point(riverU(375) + 100, 375));
    await flyFrom(river[0], 5, river[1]);
    const water = await hold(["Shift", "q"], 650);
    assert(Math.abs(water[1] - (await page.evaluate(() => riverLevel + 1.5))) < 0.01);
    await page.keyboard.press("m");
    assert.equal(await page.textContent("#mapPositionKind"), "无人机位置");
    await page.keyboard.press("m");
    await page.click("#walk");
    await checkWalkingPose();
    await page.evaluate(() => hujiang.focus(154));
    await page.click("#walk");
    await checkWalkingPose();

    await flyFrom(0, 900, 0);
    assert.equal((await hold(["e"], 160))[1], 360);
    await page.click("#home");
    await frame();
    assert(distance(await position(), gate) < 0.001);
    assert.deepEqual(errors, []);
    console.log(
      "Offline view cycling, flight controls, orbit handoff, obstacle clearance and walking pose restoration passed.",
    );
  } finally {
    await browser.close();
  }
}
check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
