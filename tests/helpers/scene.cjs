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

module.exports = { pickBuilding };
