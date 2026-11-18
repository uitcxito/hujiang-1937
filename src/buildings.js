const obstacles = [];
function solid(s, x, z, w, d, h, base = 0) {
  obstacles.push({ id: s.id, x, z, w, d, h, base });
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
function sash(g, x, y, w, h, trim = stone) {
  box(g, x, y + h / 2, 0.09, w + 0.23, h + 0.22, 0.2, trim);
  box(g, x, y + h / 2, 0.201, w, h, 0.04, frame);
  box(g, x, y + h / 2, 0.234, w - 0.15, h - 0.16, 0.04, glass);
  box(g, x, y + h / 2, 0.268, 0.065, h, 0.075, frame);
  for (const q of [0.36, 0.72]) box(g, x, y + h * q, 0.268, w, 0.055, 0.075, frame);
  box(g, x, y - 0.08, 0.19, w + 0.46, 0.12, 0.42, trim);
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
    group.traverse((o) => {
      if (!o.isMesh || o.userData.step) return;
      const b = new T.Box3().setFromObject(o),
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
      const c = b.getCenter(new V()),
        size = b.getSize(new V());
      solid(s, c.x, c.z, size.x, size.z, size.y, b.min.y);
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
function hall(s, g, base) {
  const make = (cx, cz, w, d, h, rise, rot, chapel) => {
    const block = sub(g, cx, 0, cz, rot);
    wing(block, w, d, h, rise);
    solid(s, s.x + cx, s.z + cz, rot ? d : w, rot ? w : d, h + rise, base);
    for (const side of [-1, 1]) {
      const f = wallFace(block, d, side);
      box(f, 0, 4, 0.12, w, 0.2, 0.4, stone);
      const count = Math.max(3, Math.round(w / 4.8)),
        step = w / count;
      for (let j = 0; j < count; j++) {
        const x = (j + 0.5) * step - w / 2;
        arch(f, x, 4.8, Math.min(2.1, step * 0.6), h - 5.3);
        sash(f, x, 1, 1.6, 2.15);
        buttress(f, x - step / 2 + 0.2, h - 0.1);
      }
    }
    for (const side of [-1, 1]) {
      const f = endFace(block, w, d, side);
      gableEdge(f, d, h, rise);
      box(f, 0, 4.04, 0.22, d + 0.4, 0.24, 0.54, stone);
      const mainW = d * 0.48;
      arch(f, 0, 4.8, mainW, h + rise - 6.9); // stone mullions within the tall gable light
      for (const k of [-1, 1]) {
        arch(f, k * d * 0.145, 0.46, d * 0.23, 2.95, true, false);
        buttress(f, k * (d / 2 - 0.3), h + 0.2);
      }
      box(f, 0, 3.72, 0.29, d * 0.67, 0.21, 0.73, stone);
      steps(f, d * 0.72);
      if (chapel) box(f, 0, h + rise - 1.2, 0.18, 0.22, 0.56, 0.12, stone);
    }
  };
  // The two rectangles follow the shaded L outline on the map, touching along a shared wall.
  make(0, 7.5, 31, 15, 10.8, 5.2, 0, false);
  make(8.78, -7.35, 15.05, 13.45, 10.9, 5.2, Math.PI / 2, true);
}
function yates(s, g) {
  const { w, d, h } = s;
  wing(g, w, d, h, 4.5);
  for (const sign of [-1, 1]) {
    const f = wallFace(g, d, sign);
    for (let i = -3; i <= 3; i++) {
      sash(f, (i * w) / 7.4, 1.1, 1.45, 2.4);
      arch(f, (i * w) / 7.4, 5, 1.7, 3.4);
      buttress(f, ((i + 0.35) * w) / 7.4, h * 0.83);
    }
    const porch = sub(f, 0, 0, 2.2);
    box(porch, 0, 4, 0, 8, 0.42, 4.5, stone);
    for (const x of [-3.25, -2.56, 2.56, 3.25])
      rod(porch, new V(x, 0.4, 1.55), new V(x, 3.85, 1.55), 0.23, 0.2, stone, 12);
    steps(porch, 8);
    arch(f, 0, 0.35, 2.35, 3.3, true, false);
  }
  for (const k of [-1, 1]) {
    const f = endFace(g, w, d, k);
    gableEdge(f, d, h, 4.5);
    for (const a of [-1, 1]) {
      arch(f, a * 2.15, 4.6, 2.3, 5.1);
      sash(f, a * 3.0, 1.0, 1.5, 2.25);
    }
    const o = mesh(f, new T.CylinderGeometry(1.18, 1.18, 0.2, 30), glass, 0, h + 0.45, 0.15);
    o.rotation.x = Math.PI / 2;
    mesh(f, new T.TorusGeometry(1.2, 0.13, 8, 30), stone, 0, h + 0.45, 0.32);
    for (let j = 0; j < 4; j++) {
      const bar = box(f, 0, h + 0.45, 0.34, 0.08, 2.3, 0.09, stone);
      bar.rotation.z = (j * Math.PI) / 4;
    }
  }
  const turret = sub(g, -w * 0.28, h + 2, 0);
  box(turret, 0, 1, 0, 2.3, 2, 2.3, brick);
  mesh(turret, new T.ConeGeometry(1.8, 5.4, 4), roof, 0, 4.65, 0).rotation.y = Math.PI / 4;
}
function eastHall(s, g) {
  const core = sub(g, 0, 0, 0, Math.PI / 2);
  regular(s, core, s.d, s.w, "dorm");
  const f = wallFace(core, s.w, 1);
  box(f, 0, s.h * 0.5, 0.4, 3.8, s.h + 0.6, 1.7, brick);
  arch(sub(f, 0, 0, 1.3), 0, 0.45, 1.8, 2.9, true);
  for (let k = -2; k <= 2; k++) box(f, k * 0.83, s.h + 0.8, 1.12, 0.49, 0.73, 0.42, stone);
}
function regular(s, g, w, d, kind) {
  const h = s.h,
    rise = Math.min(d * 0.38, kind === "chapel" ? 6 : 4.6);
  wing(g, w, d, h, rise);
  const small = ["house", "shed", "school", "dining"].includes(kind);
  const floors =
    kind === "science" ? 4 : kind === "library" ? 2 : Math.max(1, Math.round((h - 0.9) / 3.4));
  for (const side of [-1, 1]) {
    const f = wallFace(g, d, side),
      count = Math.max(2, Math.floor(w / (small ? 3.2 : 3.65))),
      space = w / count;
    for (let i = 0; i < count; i++) {
      const x = (i + 0.5) * space - w / 2;
      for (let k = 0; k < floors; k++) {
        if (k === 0 && Math.abs(x) < 2 && side === 1) continue;
        const yy = 0.92 + (k * (h - 0.51)) / floors;
        if (["chapel", "gym", "library"].includes(kind) && k === floors - 1)
          arch(f, x, yy, Math.min(space * 0.61, 1.8), Math.min(3.25, (h - yy) * 0.88));
        else
          sash(
            f,
            x,
            yy,
            Math.min(space * 0.56, 1.6),
            Math.min(1.93, ((h - 0.5) / floors) * 0.65),
            small ? darkStone : stone,
          );
      }
      if (kind === "science" || kind === "chapel") buttress(f, x - space / 2 + 0.16, h - 0.2);
    }
    if (side === 1) {
      arch(f, 0, 0.35, small ? 1.25 : 2.1, Math.min(2.95, h - 0.45), true, !small);
      steps(f, small ? 2.4 : 4.3);
    }
    if (["melrose", "richmond", "library"].includes(kind)) {
      box(f, 0, h - 0.25, 0.14, w, 0.15, 0.4, stone);
      const entry = sub(f, 0, 0, 0.5);
      for (const k of [-1, 1]) buttress(entry, k * 2.25, h * 0.76);
      if (kind !== "library") {
        box(entry, 0, h * 0.76, 0.12, 5, 0.25, 0.8, stone);
        gableEdge(sub(entry, 0, 0, 0.05), 4.6, h * 0.76, 1.35);
      }
    }
  }
  for (const side of [-1, 1]) {
    const f = endFace(g, w, d, side);
    gableEdge(f, d, h, rise);
    for (const a of [-1, 1])
      for (let k = 0; k < floors; k++)
        sash(
          f,
          a * d * 0.24,
          0.9 + (k * (h - 0.55)) / floors,
          Math.min(d * 0.17, 1.6),
          Math.min(1.82, ((h - 0.5) / floors) * 0.58),
        );
    if (kind === "chapel" || kind === "gym") arch(f, 0, h * 0.43, Math.min(d * 0.38, 3.45), h * 0.64);
    else if (rise > 1.75) arch(f, 0, h + 0.13, 0.8, 1.18);
  }
  if (kind === "house" || kind === "dorm") {
    box(g, w * 0.3, h + rise * 0.7, 0, 0.82, 2.8, 0.97, brick);
    box(g, w * 0.3, h + rise * 0.7 + 1.4, 0, 1, 0.15, 1.12, stone);
  }
}
function cottage(s, g) {
  const rot = s.d > s.w ? Math.PI / 2 : 0,
    b = sub(g, 0, 0, 0, rot),
    w = Math.max(s.w, s.d),
    d = Math.min(s.w, s.d);
  regular(s, b, w, d, "house");
  const variation = s.id % 4,
    front = wallFace(b, d, 1);
  if (variation === 0 || variation === 3) {
    const porch = sub(front, (variation === 3 ? -0.18 : 0) * w, 0, 1.06),
      pw = w * 0.48;
    box(porch, 0, 2.88, 0, pw, 0.26, 2.15, stone);
    for (const x of [-pw * 0.4, pw * 0.4]) {
      box(porch, x, 1.58, 0.82, 0.2, 2.7, 0.2, wood);
      box(porch, x, 0.28, 0.82, 0.46, 0.55, 0.46, brick);
    }
  } else {
    const dorm = sub(b, w * (variation === 1 ? 0.19 : -0.18), s.h + 0.39, d * 0.16);
    wing(dorm, 2.35, 2.45, 1.42, 1.01);
    sash(wallFace(dorm, 2.45, 1), 0, 0.19, 1.33, 0.96);
  }
  if (variation === 2) {
    const bay = sub(front, w * 0.26, 0, 0.36);
    box(bay, 0, 1.48, 0, 2.45, 2.9, 1, brick);
    box(bay, 0, 2.99, 0, 2.7, 0.22, 1.24, stone);
    sash(sub(bay, 0, 0, 0.51), 0, 0.82, 1.73, 1.46);
  }
}
function makeTower(s, g) {
  const w = s.w,
    h = s.h;
  box(g, 0, 0.28, 0, w + 0.5, 0.56, w + 0.5, stone);
  for (let k = 0; k < 5; k++) {
    const floor = sub(g, 0, (k * h) / 5, 0);
    box(floor, 0, h / 10, 0, w, h / 5, w, brick);
    for (let j = 0; j < 4; j++) {
      const f = sub(floor, 0, 0, 0, (j * Math.PI) / 2),
        face = sub(f, 0, 0, w / 2);
      sash(face, 0, 0.72, w * 0.26, 2.36);
      box(face, 0, 0.22, 0.08, w + 0.3, 0.25, 0.3, darkStone);
      for (const side of [-1, 1])
        box(face, side * (w * 0.5 - 0.21), h / 10, 0.07, 0.41, h / 5, 0.24, darkStone);
    }
  }
  box(g, 0, h, 0, w + 0.45, 0.36, w + 0.45, stone);
  box(g, 0, h + 0.48, 0, w, 0.66, w, brick);
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
    box(g, 0, 1.65, z, 1.05, 3.3, 1.05, stone);
    for (const [y, w, h] of [
      [0.2, 1.5, 0.4],
      [0.49, 1.28, 0.2],
      [2.98, 1.21, 0.14],
      [3.28, 1.44, 0.22],
      [3.52, 1.1, 0.2],
    ])
      box(g, 0, y, z, w, h, w, darkStone);
    sphere(g, 0, 3.88, z, 0.34, stone);
    if (side === 1) {
      const m = std(0xffffff, { map: texture(engraved) });
      const plaque = mesh(g, new T.PlaneGeometry(0.4, 1.65), m, -0.532, 1.83, z);
      plaque.rotation.y = -Math.PI / 2;
    }
    solid(s, s.x, s.z + z, 1.22, 1.22, 4.2, base);
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
function buildSite(s, root) {
  const base = groundY(s.x, s.z),
    g = sub(root, s.x, base, s.z);
  g.userData.site = s;
  if (s.style === "gate") {
    makeGate(s, g, base);
    return;
  }
  if (s.style === "auditorium") {
    hall(s, g, base);
    return;
  }
  if (s.style === "pool") {
    box(g, 0, 0.1, 0, s.w, 0.22, s.d, darkStone);
    box(g, 0, 0.23, 0, s.w - 0.8, 0.045, s.d - 0.8, std(0x537f7b));
  } else if (s.style === "tower") makeTower(s, g);
  else if (s.style === "yates") yates(s, g);
  else if (s.style === "east") eastHall(s, g);
  else if (s.style === "house" && s.id >= 200) cottage(s, g);
  else if (s.style === "science") {
    regular(s, g, s.w, s.d, "science");
    const f = sub(g, 0, 0, s.d / 2 + 0.45);
    box(f, 0, s.h * 0.5, 0, 5.8, s.h, 1.27, brick);
    for (const k of [-1, 1]) buttress(f, k * 2.65, s.h + 0.18);
    for (let k = 1; k <= 3; k++) {
      for (const xx of [-0.9, 0.9]) sash(sub(f, 0, 0, 0.58), xx, k * 3.17 + 0.73, 1.27, 2.12);
    }
    arch(sub(f, 0, 0, 0.62), 0, 0.35, 2.28, 3.16, true);
    gableEdge(sub(f, 0, 0, 0.47), 5.8, s.h, 1.48);
  } else if (s.style === "library") {
    regular(s, g, s.w, s.d, "library");
    const wingG = sub(g, 0, 0, 0, Math.PI / 2);
    wing(wingG, s.d + 3.8, 6.5, s.h - 0.2, 2.65);
    for (const side of [-1, 1]) {
      const f = endFace(wingG, s.d + 3.8, 6.5, side);
      gableEdge(f, 6.5, s.h - 0.2, 2.65);
      arch(f, 0, 0.52, 2.85, 2.98, true, false);
      arch(f, 0, 4.45, 3.25, 3.44);
      steps(f, 5);
    }
    solid(s, s.x, s.z, 6.8, s.d + 4.0, s.h + 2, base);
  } else if (s.style === "glasshouse") {
    const frameG = sub(g, 0, 0, 0);
    wing(frameG, s.w, s.d, 2.1, 1.1);
    for (let i = -2; i <= 2; i++)
      for (const k of [-1, 1]) sash(wallFace(frameG, s.d, k), (i * s.w) / 5, 0.3, s.w / 5 - 0.18, 1.55);
  } else if (s.style === "edmands") {
    regular(s, g, s.w, s.d * 0.55, "gym");
    const annex = sub(g, 0, 0, 0, Math.PI / 2);
    regular({ ...s, h: s.h * 0.84 }, annex, s.d, s.w * 0.38, "gym");
    solid(s, s.x, s.z, s.w, s.d * 0.55, s.h + 3, base);
    solid(s, s.x, s.z, s.w * 0.38, s.d, s.h + 3, base);
    return;
  } else {
    const rotate = s.d > s.w;
    const block = rotate ? sub(g, 0, 0, 0, Math.PI / 2) : g;
    regular(s, block, Math.max(s.w, s.d), Math.min(s.w, s.d), s.style);
  }
  solid(s, s.x, s.z, s.w + 0.75, s.d + 0.75, s.h + (s.style === "tower" ? 1 : 2.5), base);
}
