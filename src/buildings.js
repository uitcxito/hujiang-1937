const obstacles = [];
function solid(s, x, z, w, d, h, base = 0, angle = 0) {
  obstacles.push({ id: s.id, x, z, w, d, h, base, angle });
}
function profile(points) {
  const s = new T.Shape();
  points.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)));
  s.closePath();
  return s;
}
function extrude(group, shape, depth, mat, z = 0) {
  const geom = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 10 });
  if (mat === brick) {
    const uv = geom.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 1.93, uv.getY(i) / 1.18);
  }
  return mesh(group, geom, mat, 0, 0, z);
}
function sub(g, x, y, z, turn = 0) {
  const p = new T.Group();
  p.position.set(x, y, z);
  p.rotation.y = turn;
  g.add(p);
  return p;
}
function pitchRoof(g, w, d, h, rise) {
  const sh = profile([
    [-d / 2, 0],
    [d / 2, 0],
    [0, rise],
  ]);
  const ends = sub(g, -w / 2, h, 0, Math.PI / 2);
  extrude(ends, sh, w, brick);
  const length = Math.hypot(d / 2, rise);
  for (const side of [-1, 1]) {
    const pitch = sub(g, 0, h + rise / 2, (side * d) / 4);
    pitch.rotation.x = side * Math.atan2(rise, d / 2);
    box(pitch, 0, 0, 0, w + 0.56, 0.19, length + 0.43, roof);
    box(g, 0, h - 0.05, side * (d / 2 + 0.12), w + 0.4, 0.18, 0.32, darkStone);
  }
  box(g, 0, h + rise + 0.12, 0, w + 0.6, 0.19, 0.28, roof);
}
function archPath(w, h, pointed) {
  const p = new T.Shape(),
    a = w / 2,
    spring = h - (pointed ? w * 0.62 : w * 0.22);
  p.moveTo(-a, 0);
  p.lineTo(a, 0);
  p.lineTo(a, spring);
  if (pointed) {
    p.quadraticCurveTo(a * 0.91, h - w * 0.28, 0, h);
    p.quadraticCurveTo(-a * 0.91, h - w * 0.28, -a, spring);
  } else p.bezierCurveTo(a, h + w * 0.08, -a, h + w * 0.08, -a, spring);
  p.closePath();
  return p;
}
function arch(g, x, y, w, h, door = false, pointed = true) {
  const a = sub(g, x, y, 0.03);
  const rim = door ? 0.34 : 0.19;
  const pane = (ww, hh, m, z, dy) => {
    const o = extrude(a, archPath(ww, hh, pointed), 0.055, m, z);
    o.position.y = dy;
    if (m === glass) {
      const uv = o.geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + ww / 2) / ww, uv.getY(i) / hh);
    }
  };
  pane(w + rim * 2, h + rim, stone, 0.01, 0);
  pane(w + 0.04, h + 0.04, darkStone, 0.08, 0);
  pane(w - 0.15, h - 0.12, door ? wood : glass, 0.14, 0.04);
  if (door) {
    box(a, 0, h * 0.39, 0.22, 0.07, h * 0.77, 0.13, iron);
    for (const k of [-1, 1]) {
      box(a, k * w * 0.25, h * 0.36, 0.22, w * 0.33, h * 0.52, 0.12, frame);
      box(a, k * w * 0.25, h * 0.37, 0.29, w * 0.23, h * 0.39, 0.05, wood);
      box(a, k * 0.14, h * 0.36, 0.31, 0.055, 0.28, 0.07, stone);
    }
  } else {
    for (const k of [-1, 1]) box(a, (k * w) / 6, h * 0.428, 0.23, 0.085, h * 0.85, 0.11, stone);
    for (const q of [0.32, 0.62]) box(a, 0, h * q, 0.24, w - 0.16, 0.082, 0.12, stone);
    if (w > 3.7) {
      for (const k of [-2, -1, 0, 1, 2]) {
        const xx = (k * w) / 6.3,
          top = h - w * 0.56 * Math.pow(Math.abs(xx) / (w * 0.5), 1.36);
        box(a, xx, top * 0.5, 0.26, 0.1, top - 0.14, 0.15, stone);
      }
      for (const k of [-1, 1]) {
        const tracery = sub(a, k * w * 0.2, h * 0.64, 0.25);
        for (const j of [-1, 1])
          rod(tracery, new V(j * w * 0.094, 0, 0), new V(0, w * 0.19, 0), 0.055, 0.06, stone, 6);
      }
    }
    box(a, 0, -0.06, 0.13, w + 0.52, 0.14, 0.5, stone);
  }
}
const stairTreads = [];
function steps(g, w) {
  for (let i = 0; i < 4; i++)
    box(
      g,
      0,
      0.08 * (i + 1),
      0.3 + (3 - i) * 0.31,
      w - i * 0.1,
      0.16 * (i + 1),
      0.82,
      darkStone,
    ).userData.step = true;
}
function collectTreads(root) {
  root.updateMatrixWorld(true);
  // Record low projections beyond the main footprints (columns, bays and buttresses).
  for (const group of root.children) {
    const s = group.userData.site;
    if (!s || s.style === "gate") continue;
    const footprint = obstacles.filter((o) => o.id === s.id);
    const angle = footprint[0]?.angle || 0;
    const align = new T.Matrix4()
      .makeTranslation(s.x, 0, s.z)
      .multiply(new T.Matrix4().makeRotationY(-angle))
      .multiply(new T.Matrix4().makeTranslation(-s.x, 0, -s.z));
    const fromAligned = align.clone().invert();
    group.traverse((o) => {
      if (!o.isMesh || o.userData.step) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const matrix = angle ? new T.Matrix4().multiplyMatrices(align, o.matrixWorld) : o.matrixWorld;
      const b = o.geometry.boundingBox.clone().applyMatrix4(matrix),
        ground = group.position.y;
      if (b.max.y < ground + 0.68 || b.min.y > ground + 1.65) return;
      if (
        footprint.some(
          (f) =>
            b.min.x >= f.x - f.w / 2 &&
            b.max.x <= f.x + f.w / 2 &&
            b.min.z >= f.z - f.d / 2 &&
            b.max.z <= f.z + f.d / 2,
        )
      )
        return;
      const c = b.getCenter(new V()).applyMatrix4(fromAligned),
        size = b.getSize(new V());
      solid(s, c.x, c.z, size.x, size.z, size.y, b.min.y, angle);
    });
  }
  root.traverse((o) => {
    if (!o.userData.step) return;
    const b = new T.Box3().setFromObject(o),
      c = b.getCenter(new V()),
      s = b.getSize(new V());
    stairTreads.push({ x: c.x, z: c.z, w: s.x, d: s.z, y: b.max.y });
  });
}
function endFace(g, w, d, side) {
  return sub(g, (side * w) / 2, 0, 0, (side * Math.PI) / 2);
}
function wallFace(g, d, side) {
  return sub(g, 0, 0, (side * d) / 2, side === 1 ? 0 : Math.PI);
}
function wing(g, w, d, h, rise) {
  box(g, 0, h / 2, 0, w, h, d, brick);
  box(g, 0, 0.32, 0, w + 0.18, 0.64, d + 0.18, darkStone);
  pitchRoof(g, w, d, h, rise);
}
function buttress(f, x, h) {
  box(f, x, h * 0.48, 0.28, 0.5, h * 0.96, 0.56, brick);
  box(f, x, h * 0.53, 0.29, 0.64, 0.15, 0.73, stone);
  box(f, x, h, 0.27, 0.62, 0.22, 0.74, stone);
  box(f, x, h * 0.2, 0.47, 0.72, h * 0.4, 0.69, brick);
  box(f, x, h * 0.4, 0.47, 0.8, 0.16, 0.78, stone);
}
function gableEdge(g, d, h, rise) {
  for (const sign of [-1, 1])
    rod(g, new V(sign * (d * 0.5 + 0.12), h, 0.1), new V(0, h + rise + 0.13, 0.1), 0.13, 0.13, stone, 4);
}
function makeGate(s, g, base) {
  const width = 6.6;
  const engraved = canvas(140, 512),
    ctx = engraved.getContext("2d");
  ctx.fillStyle = "#ada591";
  ctx.fillRect(0, 0, 140, 512);
  ctx.textAlign = "center";
  ctx.fillStyle = "#383a32";
  ctx.font = "93px SimSun,serif";
  [..."滬江大學"].forEach((c, i) => ctx.fillText(c, 70, 109 + i * 119));
  for (const side of [-1, 1]) {
    const z = side * width * 0.5;
    // The two inner posts carry the open leaves. The heavier rusticated gateposts flank the rails.
    box(g, 0, 1.32, z, 0.7, 2.64, 0.7, stone);
    for (const [y, w, h] of [
      [0.16, 0.94, 0.32],
      [2.43, 0.82, 0.14],
      [2.7, 0.95, 0.21],
    ])
      box(g, 0, y, z, w, h, w, stone);
    sphere(g, 0, 2.98, z, 0.19, darkStone);
    solid(s, s.x, s.z + z, 0.94, 0.94, 3.2, base);
    const outer = z + side * 3.3;
    for (let course = 0; course < 8; course++) {
      const w = course === 0 ? 1.6 : 1.19 + (course % 2) * 0.09;
      box(g, 0, 0.23 + course * 0.44, outer, w, 0.432, w, stone);
    }
    for (const [y, w, h] of [
      [3.5, 1.38, 0.2],
      [3.68, 1.55, 0.19],
      [3.88, 1.17, 0.25],
      [4.08, 0.88, 0.17],
    ])
      box(g, 0, y, outer, w, h, w, darkStone);
    sphere(g, 0, 4.32, outer, 0.25, stone);
    solid(s, s.x, s.z + outer, 1.6, 1.6, 4.6, base);
    if (side === 1) {
      const plaque = mesh(
        g,
        new T.PlaneGeometry(0.32, 1.41),
        std(0xffffff, { map: texture(engraved) }),
        -0.356,
        1.48,
        z,
      );
      plaque.rotation.y = -Math.PI / 2;
    }
    const gate = sub(g, 0.35, 0, z - side * 0.52, 0);
    for (let j = 0; j < 14; j++) {
      const x = 0.12 + j * 0.205,
        h = 1.73 + 0.43 * Math.sin((j / 13) * Math.PI);
      rod(gate, new V(x, 0.19, 0), new V(x, h, 0), 0.029, 0.029, iron);
      mesh(gate, new T.ConeGeometry(0.068, 0.2, 5), iron, x, h + 0.07, 0);
    }
    for (const y of [0.31, 1.35, 1.6]) box(gate, 1.45, y, 0, 2.95, 0.07, 0.07, iron);
    solid(s, s.x + 1.79, s.z + z - side * 0.52, 3, 0.16, 2.3, base);
    for (let j = 0; j < 11; j++) {
      const zz = z + side * (0.75 + j * 0.22);
      box(g, 0, 0.93, zz, 0.055, 1.8, 0.055, iron);
    }
    for (const y of [0.36, 1.45]) box(g, 0, y, z + side * 1.78, 0.08, 0.08, 2.5, iron);
    solid(s, s.x, s.z + z + side * 1.8, 0.16, 2.6, 1.9, base);
  }
}

// Local façade coordinates look out of the building along +Z. Dimensions are in metres.
const casement = (() => {
  const c = canvas(96, 144),
    ctx = c.getContext("2d");
  ctx.drawImage(glass.map.image, 0, 0, c.width, c.height);
  ctx.strokeStyle = "#b8b3a6";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, 93, 141);
  ctx.fillStyle = "#b1aca1";
  ctx.fillRect(47, 0, 2, 144);
  for (const y of [35, 71, 107]) ctx.fillRect(0, y, 96, y === 71 ? 4 : 2);
  return std(0xffffff, { map: texture(c), metalness: 0.09, roughness: 0.38 });
})();
const casementPlanes = new Map();
function casementPlane(count) {
  if (!casementPlanes.has(count)) {
    const plane = new T.PlaneGeometry(1, 1),
      uv = plane.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * count);
    casementPlanes.set(count, plane);
  }
  return casementPlanes.get(count);
}
function lights(face, x, sill, width, height, count = 2, toothed = false) {
  const cy = sill + height / 2;
  box(face, x, cy, 0.031, width + 0.18, height + 0.17, 0.16, darkStone);
  mesh(face, casementPlane(count), casement, x, cy, 0.116).scale.set(width, height, 1);
  box(face, x, sill + height * 0.53, 0.133, width, 0.046, 0.054, frame);
  box(face, x, sill + height * 0.79, 0.131, width, 0.031, 0.048, frame);
  for (let k = 1; k < count; k++)
    box(face, x + width * (k / count - 0.5), cy, 0.135, 0.075, height + 0.045, 0.12, stone);
  box(face, x, sill - 0.055, 0.105, width + 0.34, 0.115, 0.34, stone);
  if (!toothed) return;
  box(face, x, sill + height + 0.065, 0.09, width + 0.32, 0.13, 0.24, stone);
  for (const sign of [-1, 1]) {
    box(face, x + sign * (width / 2 + 0.05), cy, 0.07, 0.1, height, 0.16, stone);
    for (const q of [0.12, 0.5, 0.88])
      box(face, x + sign * (width / 2 + 0.115), sill + q * height, 0.075, 0.2, 0.21, 0.19, stone);
  }
}
function timberDoor(face, x, y, w, h) {
  box(face, x, y + h / 2, 0.05, w + 0.22, h + 0.2, 0.22, darkStone);
  box(face, x, y + h / 2, 0.17, w, h, 0.055, wood);
  for (const side of [-1, 1]) {
    box(face, x + side * w * 0.23, y + h * 0.54, 0.205, w * 0.41, h * 0.63, 0.035, frame);
    box(face, x + side * w * 0.23, y + h * 0.54, 0.229, w * 0.32, h * 0.54, 0.025, wood);
  }
  box(face, x, y + h / 2, 0.24, 0.035, h, 0.04, iron);
}
function belt(face, w, y, material = stone, depth = 0.22) {
  return box(face, 0, y, 0.055, w + 0.12, 0.13, depth, material);
}
function oculus(face, x, y, r, spokes = 0) {
  const disk = mesh(face, new T.CircleGeometry(r, 28), glass, x, y, 0.12);
  mesh(face, new T.TorusGeometry(r, Math.max(0.06, r * 0.12), 7, 28), stone, x, y, 0.15);
  for (let i = 0; i < spokes; i++)
    box(face, x, y, disk.position.z + 0.06, 0.06, r * 1.94, 0.07, stone).rotation.z =
      (Math.PI * i) / spokes;
}
// The back of a cross-gable runs INTO the main roof; its front is a wall with real thickness.
function frontGable(face, x, front, w, bottom, eave, rise, depth, coping = false) {
  const f = sub(face, x, 0, front);
  const shape = profile([
    [-w / 2, bottom],
    [w / 2, bottom],
    [w / 2, eave],
    [0, eave + rise],
    [-w / 2, eave],
  ]);
  extrude(f, shape, depth, brick, -depth);
  const run = Math.hypot(w / 2, rise);
  for (const side of [-1, 1]) {
    const p = sub(f, (side * w) / 4, eave + rise / 2, -depth / 2);
    p.rotation.z = -side * Math.atan2(rise, w / 2);
    box(p, 0, 0.045, 0, run + 0.13, 0.12, depth + 0.16, roof);
  }
  if (coping) gableEdge(f, w, eave, rise);
  return f;
}
function dormer(face, x, w, eave, roofSlope, height, rise, inset = 0.45, count = 1) {
  const bottom = eave + inset * roofSlope - 0.22;
  const f = frontGable(
    face,
    x,
    -inset,
    w,
    bottom,
    bottom + height,
    rise,
    (height + rise) / roofSlope + 0.1,
  );
  lights(f, 0, bottom + 0.15, w * 0.59, height * 0.83, count);
}
function portico(face, width, depth, height, columns) {
  box(face, 0, height + 0.12, depth / 2, width, 0.29, depth, stone);
  box(face, 0, height + 0.34, depth / 2, width + 0.16, 0.13, depth + 0.15, darkStone);
  for (const x of columns) {
    box(face, x, 0.25, depth - 0.29, 0.56, 0.5, 0.56, stone);
    rod(
      face,
      new V(x, 0.37, depth - 0.29),
      new V(x, height - 0.2, depth - 0.29),
      0.195,
      0.155,
      stone,
      10,
    );
    box(face, x, height - 0.15, depth - 0.29, 0.48, 0.24, 0.48, stone);
  }
  steps(sub(face, 0, 0, depth - 0.21), width);
}
function merlons(face, width, top, count) {
  belt(face, width, top - 0.12);
  for (let j = 0; j < count; j++)
    box(
      face,
      ((j + 0.5 - count / 2) * width) / count,
      top + 0.15,
      0,
      width / (count * 2),
      0.31,
      0.31,
      brick,
    );
}
function ridgeStack(g, x, z, top) {
  box(g, x, top - 0.92, z, 0.63, 1.84, 0.77, brick);
  box(g, x, top - 0.1, z, 0.8, 0.18, 0.93, darkStone);
}
function pinacle(face, x, y, size = 1) {
  box(face, x, y + size * 0.3, 0.04, size * 0.34, size * 0.65, size * 0.36, brick);
  box(face, x, y + size * 0.58, 0.04, size * 0.43, size * 0.1, size * 0.45, stone);
  mesh(
    face,
    new T.ConeGeometry(size * 0.29, size * 0.59, 4),
    stone,
    x,
    y + size * 0.91,
    0.04,
  ).rotation.y = Math.PI / 4;
}
function bays(count, span) {
  return Array.from({ length: count }, (_, i) => ((i + 0.5 - count / 2) * span) / count);
}
function boxedSite(s, cx, cz, w, d, height, base) {
  solid(s, s.x + cx, s.z + cz, w, d, height, base);
}

function openingOutline(path, width, apex, spring) {
  const a = width / 2;
  path.lineTo(-a, spring);
  path.bezierCurveTo(-a, spring + (apex - spring) * 0.55, -a * 0.52, apex - 0.16, 0, apex);
  path.bezierCurveTo(a * 0.52, apex - 0.16, a, spring + (apex - spring) * 0.55, a, spring);
  path.lineTo(a, 0);
}
// A cut-through porch wall exposes the timber door set behind two stepped masonry reveals.
function recessedEntry(face, width, wallHeight, depth, doorWidth, apex, spring) {
  const block = new T.Shape(),
    outer = doorWidth + 0.46;
  block.moveTo(-width / 2, 0);
  block.lineTo(-outer / 2, 0);
  openingOutline(block, outer, apex + 0.25, spring);
  block.lineTo(width / 2, 0);
  block.lineTo(width / 2, wallHeight);
  block.lineTo(-width / 2, wallHeight);
  block.closePath();
  extrude(face, block, depth, brick, -depth);
  for (const [w, top, rim, z, mat] of [
    [outer, apex + 0.25, 0.14, 0.04, stone],
    [doorWidth + 0.19, apex + 0.11, 0.093, -0.11, darkStone],
  ]) {
    const outerEdge = new T.Shape();
    outerEdge.moveTo(-w / 2, 0);
    openingOutline(outerEdge, w, top, spring);
    outerEdge.lineTo(w / 2 - rim, 0);
    outerEdge.lineTo(w / 2 - rim, spring);
    outerEdge.bezierCurveTo(
      w / 2 - rim,
      spring + (top - spring) * 0.5,
      w * 0.23,
      top - rim - 0.16,
      0,
      top - rim,
    );
    outerEdge.bezierCurveTo(
      -w * 0.23,
      top - rim - 0.16,
      -w / 2 + rim,
      spring + (top - spring) * 0.5,
      -w / 2 + rim,
      spring,
    );
    outerEdge.lineTo(-w / 2 + rim, 0);
    outerEdge.closePath();
    extrude(face, outerEdge, 0.15, mat, z - 0.15);
  }
  const back = sub(face, 0, 0, -depth + 0.04);
  const door = new T.Shape();
  door.moveTo(-doorWidth / 2, 0);
  openingOutline(door, doorWidth, apex, spring);
  door.closePath();
  extrude(back, door, 0.07, wood);
  timberDoor(back, 0, 0.12, doorWidth - 0.09, spring - 0.14);
  lights(back, 0, spring + 0.01, doorWidth * 0.69, (apex - spring) * 0.37, 3);
}
function compoundLight(face, width, sill, height, round) {
  const f = sub(face, 0, sill, 0.05);
  extrude(f, archPath(width, height, !round), 0.11, stone);
  const span = width * 0.84,
    unit = span / 5;
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * unit,
      top = height * (0.91 - 0.072 * Math.abs(i - 2) - 0.021 * (i - 2) ** 2);
    const low = height * 0.255,
      mid = height * 0.35;
    const lower = sub(f, x, 0.22, 0.117);
    mesh(lower, casementPlane(1), casement, 0, low / 2, 0).scale.set(unit * 0.64, low, 1);
    const upper = sub(f, x, mid, 0.117);
    extrude(upper, archPath(unit * 0.68, top - mid, true), 0.04, glass);
    box(upper, 0, (top - mid) * 0.4, 0.057, unit * 0.65, 0.037, 0.05, frame);
    box(upper, 0, (top - mid) * 0.46, 0.056, 0.038, (top - mid) * 0.89, 0.05, frame);
  }
  belt(f, width, 0.07);
}
