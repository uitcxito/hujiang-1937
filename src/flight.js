// The drone can cross the river. Its flight area includes the campus and a strip of its surroundings.
function flightSurface(x, z) {
  return Math.max(groundY(x, z), riverLevel);
}
function makeFlightSpace(architecture, trees) {
  const bounds = new T.Box2().setFromPoints(boundary.map(([u, v]) => new T.Vector2(...point(u, v))));
  bounds.expandByScalar(110);
  bounds.min.floor();
  bounds.max.ceil();
  const width = bounds.max.x - bounds.min.x + 1;
  const heights = new Float32Array(width * (bounds.max.y - bounds.min.y + 1)).fill(-Infinity);
  const margin = 0.45;
  function mark(left, front, right, back, top) {
    const x0 = Math.max(bounds.min.x, Math.floor(left - margin));
    const x1 = Math.min(bounds.max.x, Math.floor(right + margin));
    const z0 = Math.max(bounds.min.y, Math.floor(front - margin));
    const z1 = Math.min(bounds.max.y, Math.floor(back + margin));
    for (let z = z0; z <= z1; z++) {
      const row = (z - bounds.min.y) * width - bounds.min.x;
      for (let x = x0; x <= x1; x++) heights[row + x] = Math.max(heights[row + x], top);
    }
  }
  // Use individual roof, chimney and wing bounds so gaps between buildings remain flyable.
  architecture.updateMatrixWorld(true);
  const box = new T.Box3();
  architecture.traverse((part) => {
    if (!part.isMesh) return;
    if (!part.geometry.boundingBox) part.geometry.computeBoundingBox();
    box.copy(part.geometry.boundingBox).applyMatrix4(part.matrixWorld);
    mark(box.min.x, box.min.z, box.max.x, box.max.z, box.max.y);
  });
  for (const tree of trees) {
    const r = tree.crownRadius;
    for (let dz = -Math.ceil(r); dz <= Math.ceil(r); dz++) {
      const offset = Math.max(0, Math.abs(dz) - 0.5);
      if (offset > r) continue;
      const half = Math.sqrt(r * r - offset * offset);
      mark(tree.x - half, tree.z + dz - 0.5, tree.x + half, tree.z + dz + 0.5, tree.top);
    }
  }
  function floor(x, z) {
    const i = (Math.floor(z) - bounds.min.y) * width + Math.floor(x) - bounds.min.x;
    return Math.max(flightSurface(x, z) + 1.5, heights[i] + 0.75);
  }
  const ceiling = 360;
  function constrain(p) {
    p.x = T.MathUtils.clamp(p.x, bounds.min.x, bounds.max.x);
    p.z = T.MathUtils.clamp(p.z, bounds.min.y, bounds.max.y);
    p.y = T.MathUtils.clamp(p.y, floor(p.x, p.z), ceiling);
  }
  function move(p, dx, dy, dz) {
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.5));
    for (let i = 0; i < steps; i++) {
      p.y = T.MathUtils.clamp(p.y + dy / steps, floor(p.x, p.z), ceiling);
      const x = T.MathUtils.clamp(p.x + dx / steps, bounds.min.x, bounds.max.x);
      const z = T.MathUtils.clamp(p.z + dz / steps, bounds.min.y, bounds.max.y);
      if (floor(x, p.z) <= p.y + 0.04) p.x = x;
      if (floor(p.x, z) <= p.y + 0.04) p.z = z;
      p.y = Math.max(p.y, floor(p.x, p.z));
    }
  }
  return { constrain, move };
}
