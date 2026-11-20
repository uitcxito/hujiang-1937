const assert = require("node:assert/strict");

// Project a point on the actual building, then send input through the browser's hit testing.
async function pickBuilding(page, id, { height = 0.55, depth = 0 } = {}) {
  const point = await page.evaluate(({ id, height, depth }) => {
    const site = hujiang.sites.find((s) => s.id === id);
    const v = new THREE.Vector3(site.x, groundY(site.x, site.z) + site.h * height, site.z + site.d * depth);
    v.project(hujiang.camera);
    return {
      x: (1 + v.x) * innerWidth / 2, y: (1 - v.y) * innerHeight / 2,
      name: site.name, touch: navigator.maxTouchPoints > 0,
    };
  }, { id, height, depth });
  if (point.touch) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  assert(await page.locator("#placeCard").isVisible(), "Card missing after picking " + point.name);
  assert.equal(await page.textContent("#placeTitle"), point.name);
}

async function facePoint(page, { x, z }) {
  const drag = await page.evaluate(({ x, z }) => {
    const p = hujiang.camera.position, dir = hujiang.camera.getWorldDirection(new THREE.Vector3());
    const delta = Math.atan2(x - p.x, p.z - z) - Math.atan2(dir.x, -dir.z);
    return Math.atan2(Math.sin(delta), Math.cos(delta)) / 0.0021;
  }, { x, z });
  if (Math.abs(drag) < 3) return;
  const { width, height } = page.viewportSize();
  const steps = Math.ceil(Math.abs(drag) / (width / 4));
  for (let i = 0; i < steps; i++) {
    await page.mouse.move(width / 2, height / 2);
    await page.mouse.down();
    await page.mouse.move(width / 2 + drag / steps, height / 2);
    await page.mouse.up();
  }
}

module.exports = { pickBuilding, facePoint };
