const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { facePoint } = require("./helpers/scene.cjs");

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
    const player = () => page.evaluate(() => hujiang.player.toArray());
    const direction = () =>
      page.evaluate(() => hujiang.camera.getWorldDirection(new THREE.Vector3()).toArray());
    const distance = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
    const horizontal = ([x, , z]) => [x / Math.hypot(x, z), 0, z / Math.hypot(x, z)];
    async function hold(keys, ms) {
      for (const key of keys) await page.keyboard.down(key);
      await page.waitForTimeout(ms);
      for (const key of [...keys].reverse()) await page.keyboard.up(key);
      await frame();
      return position();
    }
    async function setAltitude(height) {
      const up = height > (await position())[1], key = up ? "e" : "q";
      await page.keyboard.down("Shift");
      await page.keyboard.down(key);
      try {
        await page.waitForFunction(({ height, up }) => up ? hujiang.camera.position.y >= height
          : hujiang.camera.position.y <= height, { height, up }, { timeout: 60000 });
      } finally {
        await page.keyboard.up(key);
        await page.keyboard.up("Shift");
      }
      await frame();
    }
    // Steer to each landmark through real controls, slowing for the final approach.
    async function flyTo(target) {
      const [x, , z] = await position();
      const dx = target.x - x, dz = target.z - z, length = Math.hypot(dx, dz);
      if (length <= 0.15) return;
      await facePoint(page, target);
      const approach = (remaining) => page.waitForFunction(({ target, ux, uz, remaining }) => {
        const p = hujiang.camera.position;
        return (target.x - p.x) * ux + (target.z - p.z) * uz <= remaining;
      }, { target, ux: dx / length, uz: dz / length, remaining }, { timeout: 60000 });
      await page.keyboard.down("w");
      try {
        if (length > 10) {
          await page.keyboard.down("Shift");
          await approach(6);
          await page.keyboard.up("Shift");
        }
        await approach(0.15);
      } finally {
        await page.keyboard.up("w");
        await page.keyboard.up("Shift");
      }
      await frame();
    }
    async function checkLanding(air, heading, direct) {
      await frame();
      assert.equal(await page.getAttribute("#walk", "aria-pressed"), "true");
      const landed = await position();
      assert.deepEqual(landed, await player());
      const ground = await page.evaluate(() => {
        const { x, z } = hujiang.player;
        const steps = stairTreads.filter((s) => Math.abs(x - s.x) < s.w / 2 && Math.abs(z - s.z) < s.d / 2);
        return { legal: hujiang.legal(x, z), y: Math.max(groundY(x, z), ...steps.map((s) => s.y)) };
      });
      assert(ground.legal && Math.abs(landed[1] - ground.y - 1.66) < 0.000001);
      const offset = Math.hypot(landed[0] - air[0], landed[2] - air[2]);
      if (direct) assert.equal(offset, 0);
      else assert(offset > 0 && offset <= 15);
      assert(distance(await direction(), horizontal(heading)) < 0.000001);
      return landed;
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
    await page.keyboard.down("v");
    await page.keyboard.down("v");
    await page.keyboard.up("v");
    assert.equal(await page.getAttribute("#orbit", "aria-pressed"), "true");
    await page.click("#walk");
    await frame();
    assert.deepEqual(await position(), walking);
    assert(distance(await direction(), walkingHeading) < 0.000001);

    await page.keyboard.press("f");
    await frame();
    const start = await position(), launchHeading = await direction();
    assert.equal(start[0], walking[0]);
    assert.equal(start[2], walking[2]);
    assert.match(await page.textContent("#locationLabel"), /飞行高度 18 米/);
    assert(distance(horizontal(launchHeading), horizontal(walkingHeading)) < 0.000001 && launchHeading[1] < 0);
    for (const entry of ["v", "f", "button"]) {
      await page.evaluate(() => {
        const bank = byId.get(182);
        hujiang.setView(bank.x, 0, bank.z, 280, -0.9, 0.5);
      });
      await frame();
      assert(distance(await position(), start) > 100);
      if (entry === "button") await page.getByRole("button", { name: "无人机", exact: true }).click();
      else await page.keyboard.press(entry);
      await frame();
      assert.equal(await page.getAttribute("#drone", "aria-pressed"), "true");
      assert.deepEqual(await position(), start);
      assert.deepEqual(await direction(), launchHeading);
      assert.deepEqual(await player(), walking);
    }
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
    const field = await page.evaluate(() => ({ x: byId.get(180).x, z: byId.get(180).z }));
    await setAltitude(45);
    await flyTo(field);
    const fieldFlight = await position(), fieldHeading = await direction();
    assert(Math.hypot(fieldFlight[0] - field.x, fieldFlight[2] - field.z) < 4);
    assert.deepEqual(await player(), walking);
    await page.keyboard.press("v");
    const fieldLanding = await checkLanding(fieldFlight, fieldHeading, true);
    await page.keyboard.press("f");
    await frame();
    const relaunched = await position();
    assert.equal(relaunched[0], fieldLanding[0]);
    assert.equal(relaunched[2], fieldLanding[2]);
    assert.match(await page.textContent("#locationLabel"), /飞行高度 18 米/);
    assert(distance(horizontal(await direction()), horizontal(fieldHeading)) < 0.000001);

    const tower = await page.evaluate(() => hujiang.sites.find((s) => s.id === 154));
    await page.evaluate(() => hujiang.focus(154));
    await page.click("#landHere");
    await page.click("#drone");
    await setAltitude(35);
    await flyTo({ x: tower.x, z: tower.z + 9 });
    await setAltitude(7);
    const beside = await position();
    await facePoint(page, tower);
    const wall = await hold(["Shift", "w"], 650);
    assert(wall[1] < tower.h && wall[2] < beside[2] - 1 && wall[2] > tower.z + tower.w / 2);
    await setAltitude(tower.h + 6);
    await flyTo(tower);
    const above = await position();
    const roof = await hold(["Shift", "q"], 650);
    assert(roof[1] >= tower.h && roof[1] < above[1] - 1);
    assert(distance(await hold(["q"], 220), roof) < 0.01);
    assert.equal(await page.evaluate(([x, , z]) => hujiang.legal(x, z), roof), false);
    const roofHeading = await direction();
    await page.keyboard.press("f");
    const nearby = await checkLanding(roof, roofHeading, false);
    assert(Math.hypot(nearby[0] - tower.x, nearby[2] - tower.z) < 8);
    await page.click("#drone");
    await frame();
    const [launchX, , launchZ] = await position();
    assert.equal(launchX, nearby[0]);
    assert.equal(launchZ, nearby[2]);

    const tree = await page.evaluate(() => {
      const p = hujiang.player;
      const byDistance = (t) => Math.hypot(t.x - p.x, t.z - p.z);
      return [...hujiang.treeTrunks].sort((a, b) => byDistance(a) - byDistance(b)).find((t) =>
        hujiang.legal(t.x - 2, t.z) &&
        hujiang.treeTrunks.every((u) => t === u || Math.hypot(t.x - u.x, t.z - u.z) > u.crownRadius + 2));
    });
    assert(tree);
    await setAltitude(40);
    await flyTo(tree);
    const canopy = await position();
    const treetop = await hold(["Shift", "q"], 2800);
    assert(treetop[1] >= tree.top && treetop[1] < canopy[1] - 1);

    const [riverX, riverZ] = await page.evaluate(() => point(riverU(375) + 100, 375));
    await setAltitude(40);
    await flyTo({ x: riverX, z: riverZ });
    const water = await hold(["Shift", "q"], 3200);
    assert(Math.abs(water[1] - (await page.evaluate(() => riverLevel + 1.5))) < 0.01);
    for (const entry of ["v", "f", "button"]) {
      if (entry === "button") await page.click("#walk");
      else await page.keyboard.press(entry);
      await frame();
      assert.equal(await page.evaluate(() => hujiang.mode), "drone");
      assert.equal(await page.textContent("#hint"), "请飞到可步行地面上方再降落");
      assert.deepEqual(await position(), water);
      assert.deepEqual(await player(), nearby);
    }
    await page.keyboard.press("m");
    assert.equal(await page.textContent("#mapPositionKind"), "无人机位置");
    await page.keyboard.press("m");
    await setAltitude(360);
    assert.equal((await hold(["e"], 160))[1], 360);
    await flyTo(field);
    const retry = await position(), retryHeading = await direction();
    await page.click("#walk");
    const afterRiver = await checkLanding(retry, retryHeading, true);
    await page.evaluate(() => hujiang.focus(154));
    await page.click("#walk");
    await frame();
    assert.deepEqual(await position(), afterRiver);

    await page.keyboard.press("f");
    await page.click("#home");
    await frame();
    assert(distance(await position(), gate) < 0.001);
    assert.deepEqual(errors, []);
    console.log(
      "Player-based launch from all views, gate-to-field landing, roof and canopy clearance, refused river landing and retry passed.",
    );
  } finally {
    await browser.close();
  }
}
check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
