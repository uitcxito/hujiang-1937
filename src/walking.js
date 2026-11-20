// Index the same footprints and trunks used by both manual movement and route searches.
function makeWalkSpace(solids, trunks, clearance) {
  const buckets = new Map(), cell = 8;
  const key = (x, z) => x + "," + z;
  function index(shape, rx, rz) {
    for (let i = Math.floor((shape.x - rx) / cell); i <= Math.floor((shape.x + rx) / cell); i++)
      for (let j = Math.floor((shape.z - rz) / cell); j <= Math.floor((shape.z + rz) / cell); j++) {
        const id = key(i, j);
        if (!buckets.has(id)) buckets.set(id, []);
        buckets.get(id).push(shape);
      }
  }
  for (const { x, z, w, d, angle } of solids) {
    const co = Math.cos(angle), si = Math.sin(angle), a = w / 2 + clearance, b = d / 2 + clearance;
    index({ x, z, a, b, co, si }, Math.abs(co) * a + Math.abs(si) * b, Math.abs(si) * a + Math.abs(co) * b);
  }
  for (const { x, z, r } of trunks) index({ x, z, radius: r + clearance }, r + clearance, r + clearance);
  return (x, z) => {
    if (!inPolygon(x / SCALE + 780, z / SCALE + 370, boundary) || shoreDistance(x, z) < 1.05) return false;
    for (const o of buckets.get(key(Math.floor(x / cell), Math.floor(z / cell))) || []) {
      const dx = x - o.x, dz = z - o.z;
      if (o.radius ? dx * dx + dz * dz < o.radius ** 2 :
          Math.abs(o.co * dx - o.si * dz) < o.a && Math.abs(o.si * dx + o.co * dz) < o.b) return false;
    }
    return true;
  };
}

function findDroneLanding(x, z, legal) {
  if (legal(x, z)) return { x, z };
  const limit = 15, spacing = 0.25, epsilon = 1e-10;
  let best = null, nearest = Infinity;
  // Track the first walkable point along a ray. Distances are horizontal metres.
  function edge(dx, dz, radius) {
    if (!legal(x + radius * dx, z + radius * dz)) return null;
    let blocked = 0, clear = radius;
    while (clear - blocked > 1e-12) {
      const middle = (blocked + clear) / 2;
      if (legal(x + middle * dx, z + middle * dz)) clear = middle;
      else blocked = middle;
    }
    const offset = { x: clear * dx, z: clear * dz };
    if (clear <= limit + epsilon && clear < nearest) {
      nearest = clear;
      best = { x: x + offset.x, z: z + offset.z };
    }
    return offset;
  }
  // One extra ring supplies directions when a sloping edge just touches the landing radius.
  for (let radius = spacing; radius <= limit + spacing; radius += spacing) {
    const samples = Math.max(32, 4 * Math.ceil(Math.PI * radius / (2 * spacing)));
    let previous = null;
    for (let i = 0; i <= samples; i++) {
      const angle = 2 * Math.PI * (i % samples) / samples;
      const next = edge(Math.cos(angle), Math.sin(angle), radius);
      if (previous && next) {
        // Project onto the segment between adjacent hits, then verify that direction against the actual ground.
        const dx = next.x - previous.x, dz = next.z - previous.z;
        const t = -(previous.x * dx + previous.z * dz) / (dx * dx + dz * dz);
        if (t > 0 && t < 1) {
          const px = previous.x + t * dx, pz = previous.z + t * dz;
          const length = Math.hypot(px, pz);
          edge(px / length, pz / length, Math.min(radius, limit + epsilon));
        }
      }
      previous = next;
    }
    if (best) return best;
  }
  return null;
}

async function findWalkRoute(start, goal, legal, signal) {
  function clear(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z;
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.14));
    for (let i = 1; i <= n; i++) if (!legal(a.x + dx * i / n, a.z + dz * i / n)) return false;
    return true;
  }
  if (!legal(goal.x, goal.z)) return [];
  if (clear(start, goal)) return [goal];

  // A* on a local metre grid. The exact endpoints connect to nearby visible nodes.
  const heap = [], best = new Map(), visited = new Set();
  function push(node) {
    let i = heap.length;
    heap.push(node);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (heap[parent].score <= node.score) break;
      heap[i] = heap[parent];
      i = parent;
    }
    heap[i] = node;
  }
  function pop() {
    const first = heap[0], tail = heap.pop();
    if (heap.length) {
      let i = 0;
      while (2 * i + 1 < heap.length) {
        let child = 2 * i + 1;
        if (child + 1 < heap.length && heap[child + 1].score < heap[child].score) child++;
        if (tail.score <= heap[child].score) break;
        heap[i] = heap[child];
        i = child;
      }
      heap[i] = tail;
    }
    return first;
  }
  function consider(x, z, parent) {
    const key = x + "," + z;
    const cost = parent.cost + Math.hypot(x - parent.x, z - parent.z);
    if (visited.has(key) || cost >= (best.get(key) ?? Infinity)) return;
    const next = { x, z, key, parent, cost, score: cost + Math.hypot(goal.x - x, goal.z - z) };
    if (!clear(parent, next)) return;
    best.set(key, cost);
    push(next);
  }
  const origin = { x: start.x, z: start.z, cost: 0 };
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++) consider(Math.round(start.x) + dx, Math.round(start.z) + dz, origin);
  let deadline = performance.now() + 6;
  while (heap.length && !signal.aborted) {
    if (performance.now() >= deadline) {
      await new Promise(requestAnimationFrame);
      if (signal.aborted) break;
      deadline = performance.now() + 6;
    }
    const node = pop();
    if (visited.has(node.key)) continue;
    visited.add(node.key);
    if (Math.hypot(goal.x - node.x, goal.z - node.z) <= 2 && clear(node, goal)) {
      const path = [];
      for (let p = node; p.parent; p = p.parent) path.push({ x: p.x, z: p.z });
      path.reverse().push(goal);
      // Merge straight runs while retaining checked, collision-free segments.
      const route = [];
      let anchor = start;
      for (let i = 0; i < path.length; i++) {
        if (i + 1 < path.length && clear(anchor, path[i + 1])) continue;
        route.push(path[i]);
        anchor = path[i];
      }
      return route;
    }
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) if (dx || dz) consider(node.x + dx, node.z + dz, node);
  }
  return [];
}
