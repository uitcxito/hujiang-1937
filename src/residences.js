// Housing, gate services and the smaller structures on the period plan.
function greenhouse(s, g) {
  const { w, d } = s,
    h = 1.83,
    rise = 1.06;
  const gl = std(0x9baea4, { metalness: 0.1, roughness: 0.27, side: T.DoubleSide });
  box(g, 0, 0.23, 0, w, 0.46, d, brick);
  for (const side of [-1, 1]) {
    const f = wallFace(g, d, side);
    box(f, 0, (h + 0.46) / 2, 0, w, h - 0.46, 0.06, gl);
    for (const x of bays(10, w)) box(f, x, (h + 0.46) / 2, 0.06, 0.06, h - 0.45, 0.1, frame);
    for (const y of [0.48, 1.08, h]) box(f, 0, y, 0.04, w + 0.12, 0.07, 0.12, wood);
    const pitch = sub(g, 0, h + rise / 2, (side * d) / 4);
    pitch.rotation.x = side * Math.atan2(rise, d / 2);
    const length = Math.hypot(rise, d / 2);
    box(pitch, 0, 0, 0, w + 0.1, 0.07, length + 0.08, gl);
    for (const x of bays(10, w)) box(pitch, x, 0.064, 0, 0.057, 0.07, length + 0.12, frame);
    box(pitch, 0, 0.06, 0, w + 0.16, 0.06, 0.07, wood);
    const end = endFace(g, w, d, side);
    extrude(
      end,
      profile([
        [-d / 2, 0.45],
        [d / 2, 0.45],
        [d / 2, h],
        [0, h + rise],
        [-d / 2, h],
      ]),
      0.053,
      gl,
    );
    for (const x of bays(5, d)) {
      const top = h + rise * (1 - (2 * Math.abs(x)) / d);
      box(end, x, (top + 0.45) / 2, 0.07, 0.065, top - 0.45, 0.11, frame);
    }
    gableEdge(end, d, h, rise);
    if (side === 1) timberDoor(end, 0, 0.26, 0.85, 1.6);
  }
}
function playShelter(s, g, base) {
  const w = s.d,
    d = s.w,
    h = 3.15,
    b = sub(g, 0, 0, 0, Math.PI / 2);
  const rise = 1.95,
    len = Math.hypot(d / 2, rise);
  for (const side of [-1, 1]) {
    const roofSide = sub(b, 0, h + rise / 2, (side * d) / 4);
    roofSide.rotation.x = side * Math.atan2(rise, d / 2);
    box(roofSide, 0, 0, 0, w + 0.36, 0.14, len + 0.28, roof);
    box(b, 0, h - 0.14, side * (d / 2 - 0.14), w, 0.21, 0.17, wood);
  }
  for (const x of bays(6, w * 1.1)) {
    for (const side of [-1, 1]) {
      const z = side * (d / 2 - 0.26);
      box(b, x, h / 2, z, 0.21, h, 0.21, wood);
      boxedSite(s, z, -x, 0.27, 0.27, h, base);
      rod(b, new V(x, h - 0.09, z), new V(x, h + rise - 0.16, 0), 0.07, 0.07, wood);
    }
    box(b, x, h - 0.11, 0, 0.14, 0.16, d - 0.34, wood);
  }
}
function service(s, g) {
  const w = Math.max(s.w, s.d),
    d = Math.min(s.w, s.d);
  const b = s.d > s.w ? sub(g, 0, 0, 0, Math.PI / 2) : g;
  const floors = [104, 111, 152].includes(s.id) ? 2 : 1;
  const h = s.id === 152 ? 6.18 : s.id === 103 ? 3.79 : s.h;
  const rise = Math.min(2.6, d * (s.style === "shed" ? 0.23 : 0.35));
  wing(b, w, d, h, rise);
  const count = Math.max(1, Math.round(w / (s.id === 152 ? 3.25 : 4.3)));
  for (const side of [-1, 1]) {
    const f = wallFace(b, d, side);
    for (const [i, x] of bays(count, w * 0.97).entries()) {
      const frontDoor = side === 1 && i === Math.floor(count / 2);
      if (frontDoor)
        timberDoor(f, x, 0.27, Math.min(w * 0.48, s.id === 155 ? 2 : 1.21), Math.min(h - 0.36, 2.13));
      else
        lights(
          f,
          x,
          0.8,
          Math.min((w / count) * 0.49, 1.58),
          Math.min(1.58, h * 0.45),
          s.style === "shed" ? 1 : 2,
        );
      if (floors === 2) lights(f, x, h * 0.57, Math.min((w / count) * 0.51, 1.55), 1.47, 2);
    }
    if (floors === 2) belt(f, w, h / 2);
  }
  if (d > 3.8) {
    for (const side of [-1, 1]) {
      const f = endFace(b, w, d, side);
      for (const x of bays(d > 7 ? 2 : 1, d * 0.85)) lights(f, x, 0.83, 1.22, 1.36, 2);
      if (floors === 2) lights(f, 0, h * 0.58, 1.28, 1.38, 2);
    }
  }
}
function infirmary(s, g) {
  const { w, d } = s,
    h = 5.98,
    rise = 3.27;
  wing(g, w, d, h, rise);
  for (const side of [-1, 1]) {
    const f = wallFace(g, d, side);
    for (const [i, x] of bays(4, w * 0.94).entries()) {
      if (side === 1 && i === 2) timberDoor(f, x, 0.32, 1.28, 2.19);
      else lights(f, x, 0.73, 1.51, 1.71, 2);
      lights(f, x, 3.47, 1.43, 1.83, 2);
    }
    belt(f, w, 2.95);
    belt(f, w, 3.16, darkStone);
    for (const x of [-w * 0.24, w * 0.24]) dormer(f, x, 1.49, h, (2 * rise) / d, 1.14, 0.71, 0.71);
  }
  for (const side of [-1, 1]) {
    const f = endFace(g, w, d, side);
    belt(f, d, 2.95);
    belt(f, d, h - 0.18);
    for (const x of bays(3, d * 0.87)) for (const y of [0.75, 3.48]) lights(f, x, y, 1.59, 1.67, 2);
    for (const x of [-0.83, 0.83]) lights(f, x, h + 0.24, 1.16, 1.39, 2);
  }
}
function virginia(s, g) {
  const { w, d } = s,
    h = 5.28,
    rise = 2.92;
  wing(g, w, d, h, rise);
  const f = wallFace(g, d, 1);
  for (const [fraction, width, extra] of [
    [-0.135, w * 0.275, 0.37],
    [0.118, w * 0.18, -0.19],
  ]) {
    const bay = frontGable(f, w * fraction, 0.48, width, 0, h + extra, rise * 0.75, 3.3, true);
    lights(bay, 0, 0.69, width * 0.62, 1.64, 2);
    lights(bay, 0, 3.1, width * 0.66, 1.53, 3);
    lights(bay, 0, h + extra + 0.15, width * 0.28, 1.02, 1);
    if (fraction < 0) {
      box(bay, 0, 2.93, 0.44, width * 0.89, 0.18, 0.95, stone);
      for (const x of bays(10, width * 0.88)) box(bay, x, 3.21, 0.84, 0.08, 0.54, 0.1, stone);
      box(bay, 0, 3.51, 0.84, width * 0.9, 0.1, 0.16, stone);
    }
  }
  for (const x of [-w * 0.386, w * 0.37]) {
    lights(f, x, 3.09, 2.36, 1.63, 3);
    if (x < 0) timberDoor(f, x + 0.46, 0.31, 1.21, 1.98);
    else lights(f, x, 0.77, 2.27, 1.58, 3);
  }
  for (const x of bays(6, w * 0.95))
    for (const y of [0.74, 3.14]) lights(wallFace(g, d, -1), x, y, 1.48, 1.46, 2);
  residentialEnds(g, w, d, h, rise, 2);
  for (const x of [w * 0.03, w * 0.18]) ridgeStack(g, x, 0, h + rise + 0.52);
}
let greyMasonry;
function greyBrick() {
  if (greyMasonry) return greyMasonry;
  const original = brick.map.image,
    c = canvas(original.width, original.height),
    ctx = c.getContext("2d");
  ctx.drawImage(original, 0, 0);
  const pixels = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const y = pixels.data[i] * 0.32 + pixels.data[i + 1] * 0.5 + pixels.data[i + 2] * 0.18;
    pixels.data[i] = y * 0.91 + 5;
    pixels.data[i + 1] = y * 0.93 + 7;
    pixels.data[i + 2] = y * 0.93 + 7;
  }
  ctx.putImageData(pixels, 0, 0);
  greyMasonry = brick.clone();
  greyMasonry.map = texture(c);
  greyMasonry.map.repeat.copy(brick.map.repeat);
  return greyMasonry;
}
function presidentsHouse(s, g, base, parts) {
  const [south, north] = parts,
    w = s.d,
    depth = north.w,
    cx = s.w / 2 - depth / 2,
    h = 5.45,
    rise = 2.55;
  const core = sub(g, cx, 0, 0, Math.PI / 2);
  wing(core, w, depth, h, rise);
  boxedSite(s, cx, 0, depth, w, h + rise, base);
  const extra = south.w - depth,
    ex = cx - (depth + extra) / 2;
  const back = sub(g, ex, 0, south.z, Math.PI / 2);
  wing(back, south.d, extra, 3.14, 0.87);
  boxedSite(s, ex, south.z, extra, south.d, 4, base);
  const front = wallFace(core, depth, 1);
  for (const x of [-w * 0.324, w * 0.324]) {
    const bay = frontGable(front, x, 0.33, w * 0.33, 0, h + 0.1, 1.93, 3.13);
    for (const y of [0.72, 3.31]) lights(bay, 0, y, w * 0.255, 1.55, 4);
  }
  const entry = sub(front, 0, 0, 0.21);
  portico(entry, w * 0.28, 1.08, 2.46, [-w * 0.12, w * 0.12]);
  timberDoor(entry, 0, 0.31, 1.26, 1.98);
  for (const x of [-w * 0.105, w * 0.105]) lights(entry, x, 0.66, 0.64, 1.49, 1);
  lights(front, 0, 3.34, w * 0.21, 1.17, 4);
  for (const x of bays(5, w * 0.94))
    for (const y of [0.79, 3.31]) lights(wallFace(core, depth, -1), x, y, 1.59, 1.42, 2);
  residentialEnds(core, w, depth, h, rise, 2);
}
function cottagePorch(face, x) {
  const p = sub(face, x, 0, 0),
    eave = 2.34,
    width = 2.04,
    depth = 1.38;
  const roofFace = frontGable(p, 0, depth, width, eave - 0.14, eave, 0.62, depth + 0.12);
  for (const sign of [-1, 1]) box(roofFace, sign * 0.84, eave / 2, 0, 0.14, eave, 0.14, wood);
  timberDoor(p, 0, 0.31, 1.07, 1.87);
  steps(roofFace, width);
}
function cottage(s, g, base) {
  if (s.id === 220) {
    virginia(s, g);
    boxedSite(s, 0, 0, s.w, s.d, 8.2, base);
    return;
  }
  const doubleHouse = s.id === 218 || s.id === 219;
  const photoCottage = [209, 210, 211, 212, 217].includes(s.id);
  const parts = s.parts.map(([l, t, r, b]) => ({
    x: ((r + l) / 2 - s.u) * SCALE,
    z: ((t + b) / 2 - s.v) * SCALE,
    w: (r - l) * SCALE,
    d: (b - t) * SCALE,
  }));
  if (s.id === 208) return presidentsHouse(s, g, base, parts);
  const tilt = s.id === 202 ? 0.24 : s.id === 201 ? 0.047 : 0;
  for (const [i, p] of parts.entries()) {
    const longest = Math.max(p.w, p.d),
      depth = Math.min(p.w, p.d),
      turn = (p.d > p.w ? Math.PI / 2 : 0) + tilt;
    const body = sub(g, p.x, 0, p.z, turn);
    const full = i === 0 || (depth > 2.65 && longest > 4 && !doubleHouse && s.id !== 209);
    const h = full ? s.h : i === 1 && doubleHouse ? 4.45 : 2.61;
    const rise = Math.min(full ? 3.25 : 1.66, depth * (photoCottage ? 0.52 : 0.37));
    wing(body, longest, depth, h, rise);
    solid(s, s.x + p.x, s.z + p.z, p.w, p.d, h + rise, base, tilt);
    for (const side of [-1, 1]) {
      const f = wallFace(body, depth, side);
      const count = Math.max(1, Math.round(longest / 2.91));
      for (const [j, x] of bays(count, longest * 0.94).entries()) {
        const localX = p.x + Math.cos(turn) * x + Math.sin(turn) * side * (depth / 2 + 0.26);
        const localZ = p.z - Math.sin(turn) * x + Math.cos(turn) * side * (depth / 2 + 0.26);
        if (
          parts.some(
            (o, k) =>
              i !== k &&
              Math.abs(o.x - localX) < o.w / 2 + 0.04 &&
              Math.abs(o.z - localZ) < o.d / 2 + 0.04,
          )
        )
          continue;
        const door = side === 1 && i === 0 && j === Math.floor(count / 2);
        if (door) {
          if (!photoCottage) timberDoor(f, x, 0.31, 1.14, 1.99);
        } else
          lights(
            f,
            x,
            0.8,
            Math.min(1.68, (longest / count) * 0.6),
            Math.min(1.47, h * 0.42),
            full ? 2 : 1,
          );
        if (h > 4.3)
          lights(f, x, h * 0.57, Math.min(1.61, (longest / count) * 0.57), Math.min(1.51, h * 0.3), 2);
      }
      if (h > 4.4) {
        const course = belt(f, longest, h * 0.5, doubleHouse ? brick : darkStone);
        course.userData.redCourse = doubleHouse;
      }
      if (i !== 0) continue;
      if (photoCottage && side === 1) {
        const width = Math.min(3.25, longest * 0.44),
          x = longest * 0.19;
        const bay = frontGable(f, x, 0.36, width, 0, h + 0.12, 1.79, 3.22);
        for (const y of [0.79, h * 0.57]) lights(bay, 0, y, width * 0.67, 1.48, 2);
        lights(bay, 0, h + 0.15, 0.8, 0.94, 1);
        if (s.id === 210) {
          const chimneyX = -longest * 0.075,
            top = h + rise + 1.08;
          box(f, chimneyX, top / 2, 0.12, 0.84, top, 0.61, brick);
          box(f, chimneyX, top - 0.12, 0.12, 1.02, 0.22, 0.79, darkStone);
          dormer(f, -longest * 0.32, 1.61, h, (2 * rise) / depth, 1.02, 0.89, 0.22, 1);
        } else if (s.id === 209) {
          arch(f, -longest * 0.28, 0.36, 1.24, 2.12, true, false);
          dormer(f, -longest * 0.28, 1.48, h, (2 * rise) / depth, 0.87, 0.73, 0.31, 1);
        } else {
          for (const k of [-1, 1])
            rod(bay, new V(k * 0.91, h + 0.25, 0.085), new V(0, h + 1.57, 0.085), 0.054, 0.054, wood, 4);
          cottagePorch(f, -longest * 0.275);
        }
      } else if (doubleHouse && side === 1) {
        const width = longest * 0.7;
        portico(f, width, 1.46, 2.94, bays(4, width * 1.13));
        dormer(f, 0, 2.03, h, (2 * rise) / depth, 0.98, 0.82, 0.37, 2);
      }
    }
    for (const side of [-1, 1]) {
      const f = endFace(body, longest, depth, side);
      const wx = p.x + Math.cos(turn) * side * (longest / 2 + 0.26),
        wz = p.z - Math.sin(turn) * side * (longest / 2 + 0.26);
      if (
        parts.some(
          (o, k) => i !== k && Math.abs(o.x - wx) < o.w / 2 + 0.04 && Math.abs(o.z - wz) < o.d / 2 + 0.04,
        )
      )
        continue;
      for (const x of bays(depth > 4.4 ? 2 : 1, depth * 0.83)) {
        lights(f, x, 0.79, Math.min(depth * 0.32, 1.25), Math.min(1.44, h * 0.45), 2);
        if (h > 4.3) lights(f, x, h * 0.57, Math.min(depth * 0.3, 1.24), 1.32, 2);
      }
      if (rise > 1.52) lights(f, 0, h + 0.2, 0.78, 0.86, 1);
    }
    if (i === 0 && (photoCottage || doubleHouse)) ridgeStack(body, -longest * 0.23, 0, h + rise + 0.73);
  }
  if (doubleHouse) {
    const grey = greyBrick();
    g.traverse((o) => {
      if (o.material === brick && !o.userData.redCourse) o.material = grey;
    });
  }
}
function buildSite(s, root) {
  const base = groundY(s.x, s.z),
    g = sub(root, s.x, base, s.z);
  g.userData.site = s;
  // Compound and open buildings register their individual occupied parts.
  switch (s.style) {
    case "gate":
      return makeGate(s, g, base);
    case "auditorium":
      return hall(s, g, base);
    case "science":
      return scienceHall(s, g, base);
    case "library":
      return library(s, g, base);
    case "gym":
      return haskellGym(s, g, base);
    case "edmands":
      return edmands(s, g, base);
  }
  switch (s.id) {
    case 101:
      infirmary(s, g);
      break;
    case 105:
      return playShelter(s, g, base);
    case 112:
    case 113:
      academy(s, g);
      break;
    case 114:
      musicHall(s, g);
      break;
    case 131:
      return treat(s, g, base);
    case 133:
      greenhouse(s, g);
      break;
    case 153:
      yates(s, g);
      break;
    case 154:
      makeTower(s, g);
      break;
    case 163:
      eastHall(s, g);
      break;
    case 166:
      breaker(s, g);
      break;
    case 167:
      evanston(s, g);
      break;
    case 168:
      diningHall(s, g);
      break;
    case 162: {
      box(g, 0, 0.1, 0, s.w, 0.2, s.d, darkStone);
      box(g, 0, 0.21, 0, s.w - 0.75, 0.038, s.d - 0.75, std(0x597f7c, { roughness: 0.23 }));
      break;
    }
    default:
      if (s.parts) return cottage(s, g, base);
      service(s, g);
  }
  boxedSite(s, 0, 0, s.w, s.d, s.h + 1.9, base);
}
