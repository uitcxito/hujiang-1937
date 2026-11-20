const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const test = require("node:test");

const scope = { performance, requestAnimationFrame: (fn) => setImmediate(fn) };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/walking.js"), "utf8"), scope);
const start = { x: -6.6, z: 0.1 }, goal = { x: 6.2, z: 0.3 };
const within = (x, z) => Math.abs(x) < 9 && Math.abs(z) < 8;
const plan = (legal) => scope.findWalkRoute(start, goal, legal, new AbortController().signal);
test("land directly below the drone when its exact ground point is walkable", () => {
  const landing = scope.findDroneLanding(2.017, -4.256, (x, z) => x === 2.017 && z === -4.256);
  assert.equal(landing.x, 2.017);
  assert.equal(landing.z, -4.256);
});

test("choose the closer walkable edge when two exits are on the same search ring", () => {
  const legal = (x, z) => x >= 2.24 || z >= 2.07;
  const p = scope.findDroneLanding(0, 0, legal);
  assert(legal(p.x, p.z));
  assert(Math.hypot(p.x, p.z) < 2.073);
});

test("include the 15 metre landing limit and reject ground beyond it", () => {
  for (const distance of [14.99, 14.99999, 15]) {
    const legal = (x, z) => 0.6 * x + 0.8 * z >= distance;
    const p = scope.findDroneLanding(0, 0, legal);
    assert(p && legal(p.x, p.z));
    assert(Math.hypot(p.x - 0.6 * distance, p.z - 0.8 * distance) < 0.000001);
  }
  assert.equal(scope.findDroneLanding(0, 0, (x) => x >= 15).x, 15);
  assert.equal(scope.findDroneLanding(0, 0, (x, z) => 0.6 * x + 0.8 * z >= 15.00001), null);
});

test("walk directly to the exact ground point", async () => {
  const route = await plan(within);
  assert.equal(route.length, 1);
  assert.deepEqual(route[0], goal);
});
test("route around a footprint while keeping the whole segment walkable", async () => {
  const legal = (x, z) => within(x, z) && (Math.abs(x) > 2.4 || Math.abs(z) > 3.4);
  const route = await plan(legal);
  assert(route.length >= 3);
  let from = start;
  for (const to of route) {
    const steps = Math.ceil(Math.hypot(to.x - from.x, to.z - from.z) / 0.08);
    for (let i = 1; i <= steps; i++)
      assert(legal(from.x + (to.x - from.x) * i / steps, from.z + (to.z - from.z) * i / steps));
    from = to;
  }
  assert.deepEqual(from, goal);
});
test("reject an illegal or disconnected goal and abandon cancelled searches", async () => {
  assert.equal((await plan((x, z) => within(x, z) && x < 0)).length, 0);
  const divided = (x, z) => within(x, z) && Math.abs(x) > 1;
  assert.equal((await plan(divided)).length, 0);
  const cancel = new AbortController();
  cancel.abort();
  assert.equal((await scope.findWalkRoute(start, goal, divided, cancel.signal)).length, 0);
});
