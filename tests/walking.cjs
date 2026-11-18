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
