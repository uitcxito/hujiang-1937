// Campus teaching, assembly and residential halls, in local coordinates traced from the map.
function scienceHall(s, g, base) {
  const { w, d, h } = s,
    rise = 4.45,
    slope = (2 * rise) / d;
  wing(g, w, d, h, rise);
  boxedSite(s, 0, 0, w, d, h + rise, base);
  for (const side of [-1, 1]) {
    const f = wallFace(g, d, side);
    // Two full-height end bays, with the attic windows in their gables.
    for (const end of [-1, 1]) {
      const endBay = frontGable(f, end * w * 0.395, 0.36, w * 0.202, 0, h + 0.6, 2.54, 4.5, true);
      for (let floor = 0; floor < 3; floor++)
        lights(endBay, 0, 0.84 + floor * 3.12, w * 0.122, 1.84, 3, true);
      lights(endBay, 0, h + 0.22, 1.27, 1.37, 2);
    }
    for (const x of [-w * 0.197, 0, w * 0.197]) {
      for (let floor = 0; floor < 3; floor++) {
        if (side === -1 && floor === 0 && x === 0) continue;
        const width = x === 0 ? w * 0.106 : w * 0.161;
        lights(f, x, 0.84 + floor * 3.12, width, floor === 2 ? 2.08 : 1.9, x === 0 ? 3 : 4, true);
      }
      for (const pos of [-1, 1]) {
        const px = x + pos * (x === 0 ? w * 0.065 : w * 0.092);
        box(f, px, h * 0.5, 0.06, 0.21, h - 0.3, 0.22, brick);
      }
      dormer(f, x, x === 0 ? 2.66 : 3.04, h, slope, 1.55, 1.06, 0.61, 2);
    }
    belt(f, w, 0.58, darkStone);
  }
  for (const side of [-1, 1]) {
    const f = endFace(g, w, d, side);
    gableEdge(f, d, h, rise);
    for (let level = 0; level < 3; level++) {
      const y = 0.84 + 3.12 * level;
      for (const end of [-1, 1]) lights(f, end * d * 0.338, y, 1.44, 1.89, 2, true);
      lights(f, 0, y, 2.86, 1.89, 4, true);
    }
    lights(f, 0, h + 0.38, 2.4, 1.66, 3, true);
    for (const x of [-d * 0.48, d * 0.48]) buttress(f, x, h - 0.22);
  }
  const front = wallFace(g, d, -1),
    pw = w * 0.174,
    pd = 1.92;
  box(front, 0, 0.1, pd / 2, w * 0.35, 0.2, pd + 0.54, darkStone).userData.step = true;
  const door = sub(front, 0, 0, pd);
  recessedEntry(door, pw, 3.64, pd, 2.08, 2.99, 2.05);
  for (const edge of [-1, 1]) {
    buttress(door, edge * (pw / 2 - 0.21), 3.5);
    box(door, edge * pw * 0.337, 3.37, 0.075, pw * 0.17, 0.34, 0.16, stone);
  }
  box(front, 0, 3.74, pd / 2, pw + 0.24, 0.26, pd + 0.26, stone);
  steps(door, 3.6);
  boxedSite(s, 0, -(d + pd) / 2, pw, pd, 3.9, base);
}
function eastHall(s, g) {
  const w = s.d,
    d = s.w,
    h = s.h,
    rise = 2.74;
  const b = sub(g, 0, 0, 0, Math.PI / 2);
  wing(b, w, d, h, rise);
  for (const side of [-1, 1]) {
    const f = wallFace(b, d, side);
    belt(f, w, 2.84);
    belt(f, w, h - 0.16);
    bays(7, w * 0.94).forEach((x, i) => {
      if (side === -1 && i === 1) timberDoor(f, x, 0.27, 0.98, 1.93);
      else lights(f, x, 0.65, 0.85, 1.46, 1);
      lights(f, x, 3.24, 0.9, 1.75, 1);
    });
    for (const x of bays(6, w * 0.96)) dormer(f, x, 1.34, h, (2 * rise) / d, 0.88, 0.61, 0.39);
  }
  for (const side of [-1, 1]) {
    const f = endFace(b, w, d, side);
    belt(f, d, 2.84);
    belt(f, d, h - 0.14);
    for (const x of [-0.25 * d, 0, 0.25 * d]) lights(f, x, 3.24, 0.9, 1.69, 1);
    for (const x of [-0.25 * d, 0.25 * d]) lights(f, x, 0.65, 0.9, 1.5, 1);
    lights(f, 0, h + 0.3, 0.69, 1.14, 1);
  }
}
function haskellGym(s, g, base) {
  const wide = s.w,
    narrow = 20.4 * SCALE,
    total = s.d,
    crossDepth = 18.5 * SCALE;
  const long = total - crossDepth,
    hallZ = -crossDepth / 2,
    crossZ = long / 2;
  const hall = sub(g, 0, 0, hallZ, Math.PI / 2),
    h = 6.85;
  wing(hall, long, narrow, h, 2.82);
  boxedSite(s, 0, hallZ, narrow, long, h + 2.82, base);
  for (const side of [-1, 1]) {
    const f = wallFace(hall, narrow, side);
    belt(f, long, 0.76);
    const span = long - 1.0;
    for (const x of bays(5, span)) {
      lights(f, x, 1.33, (span / 5) * 0.67, 1.45, 3, true);
      box(f, x, 3.49, 0.065, (span / 5) * 0.67, 1.03, 0.12, brick);
      for (const u of [-0.22, 0, 0.22]) {
        const tile = box(f, x + (u * span) / 5, 3.48, 0.15, 0.26, 0.26, 0.07, darkStone);
        tile.rotation.z = Math.PI / 4;
      }
      lights(f, x, 4.11, (span / 5) * 0.69, 2.15, 3, true);
    }
    for (let i = 0; i <= 5; i++) buttress(f, -span / 2 + (i * span) / 5, h - 0.16);
  }
  // The far gable adjoins East Hall across a gap. Its tall central light is visible in the museum drawing.
  const end = endFace(hall, long, narrow, 1);
  gableEdge(end, narrow, h, 2.82);
  for (const x of [-narrow * 0.34, narrow * 0.34]) {
    lights(end, x, 1.37, 1.55, 1.53, 2);
    lights(end, x, 4.12, 1.55, 1.86, 2);
  }
  lights(end, 0, 1.25, 1.78, 5.72, 2, true);
  const cross = sub(g, 0, 0, crossZ),
    ch = s.h,
    cr = 3.12;
  wing(cross, wide, crossDepth, ch, cr);
  boxedSite(s, 0, crossZ, wide, crossDepth, ch + cr, base);
  for (const side of [-1, 1]) {
    const f = endFace(cross, wide, crossDepth, side);
    gableEdge(f, crossDepth, ch, cr);
    for (let level = 0; level < 2; level++) {
      for (const x of [-crossDepth * 0.278, crossDepth * 0.278])
        lights(f, x, 1.05 + 3.54 * level, 2.05, 1.7, 3, true);
      lights(f, 0, 1.05 + 3.54 * level, 0.78, 1.7, 1);
    }
    lights(f, 0, ch + 0.23, 2.39, 1.36, 3);
  }
  const f = wallFace(cross, crossDepth, 1);
  for (const x of [-wide * 0.31, wide * 0.31])
    for (let level = 0; level < 2; level++) lights(f, x, 1.2 + level * 3.38, wide * 0.22, 1.85, 4, true);
  const entry = frontGable(f, 0, 0.73, 3.83, 3.45, ch + 0.18, 1.67, 2.75, true);
  recessedEntry(entry, 3.83, 3.45, 0.72, 2.12, 2.92, 2.32);
  lights(entry, 0, 4.54, 2.39, 1.88, 3, true);
  lights(entry, 0, ch + 0.22, 0.62, 0.74, 1);
  for (const x of [-wide / 2 + 0.22, -2.18, 2.18, wide / 2 - 0.22]) buttress(f, x, ch - 0.18);
  steps(entry, 3.9);
}
function library(s, g, base) {
  const { w, d } = s,
    h = 6.36,
    rise = 4.18;
  wing(g, w, d, h, rise);
  boxedSite(s, 0, 0, w, d, h + rise, base);
  for (const side of [-1, 1]) {
    const f = wallFace(g, d, side);
    const deep = side === -1 ? 1.56 : 3.36,
      width = w * 0.3;
    for (const x of [-w * 0.424, -w * 0.273, w * 0.273, w * 0.424]) {
      lights(f, x, 0.92, 2.1, 1.72, 2, true);
      lights(f, x, 3.68, 2.21, 2.15, 2, true);
      buttress(f, x - 1.41, h - 0.09);
    }
    for (const k of [-1, 1]) {
      const b = frontGable(f, k * w * 0.421, 0.21, 2.88, h - 0.12, h + 0.14, 1.91, 3.2, true);
      lights(b, 0, h + 0.18, 0.83, 0.98, 1);
    }
    const fh = side === -1 ? h + 1.32 : h - 0.24;
    box(f, 0, fh / 2, deep / 2, width, fh, deep, brick);
    const entry = sub(f, 0, 0, deep);
    if (side === -1) {
      arch(entry, 0, 0.38, 1.85, 2.6, true);
      lights(entry, 0, 3.6, 2.68, 2.28, 3, true);
      for (const k of [-1, 1]) buttress(entry, k * width * 0.39, fh + 0.12);
      box(f, 0, fh, deep / 2, width + 0.21, 0.2, deep + 0.16, stone);
      merlons(entry, width, fh + 0.2, 9);
      steps(entry, 3.25);
    } else {
      for (const k of [-1, 1])
        for (const level of [0.97, 3.7]) lights(entry, k * width * 0.25, level, 2.11, 1.72, 2);
      box(f, 0, fh + 0.1, deep / 2, width + 0.19, 0.24, deep + 0.15, darkStone);
    }
    boxedSite(s, 0, (side * (d + deep)) / 2, width, deep, fh, base);
  }
  for (const side of [-1, 1]) {
    const f = endFace(g, w, d, side);
    gableEdge(f, d, h, rise);
    for (const x of bays(4, d * 0.88)) {
      lights(f, x, 0.92, 1.53, 1.73, 2);
      lights(f, x, 3.58, 1.61, 2, 2, true);
      buttress(f, x - 0.99, h - 0.12);
    }
    for (const x of [-1.03, 1.03]) lights(f, x, h + 0.56, 1.35, 1.23, 2);
    pinacle(f, 0, h + rise, 0.67);
  }
}
function residentialEnds(b, w, d, h, rise, floors) {
  for (const side of [-1, 1]) {
    const f = endFace(b, w, d, side);
    gableEdge(f, d, h, rise);
    for (const x of [-d * 0.29, 0, d * 0.29]) {
      for (let k = 0; k < floors; k++)
        lights(f, x, 0.81 + (k * h) / floors, Math.min(1.45, d * 0.17), (h / floors) * 0.54, 2);
    }
    lights(f, 0, h + 0.25, 1.27, Math.min(1.36, rise * 0.47), 2);
  }
}
function breaker(s, g) {
  const { w, d } = s,
    h = 9.15,
    rise = 4.26;
  wing(g, w, d, h, rise);
  for (const side of [-1, 1]) {
    const f = wallFace(g, d, side);
    belt(f, w, 3.16);
    belt(f, w, 3.42, darkStone);
    belt(f, w, h - 0.18);
    for (const x of bays(9, w * 0.97)) {
      if (Math.abs(x) < 0.1) continue;
      lights(f, x, 0.87, 1.44, 1.72, 2);
      box(f, x, 6.2, 0.052, 1.65, 5.45, 0.13, darkStone);
      const inset = sub(f, x, 0, 0.102);
      arch(inset, 0, 3.88, 1.27, 1.95, false, false);
      arch(inset, 0, 6.53, 1.32, 2.02, false, false);
    }
    const center = frontGable(f, 0, 0.38, 3.58, 0, h + 0.4, 2.74, 4.72, true);
    for (const k of [-1, 1]) buttress(center, k * 1.63, h + 0.43);
    lights(center, 0, 4.03, 1.69, 1.72, 2);
    arch(center, 0, 6.52, 1.68, 2.11, false, false);
    lights(center, 0, h + 0.27, 0.83, 1.39, 1);
    for (const x of [-w * 0.31, w * 0.31]) dormer(f, x, 2.57, h, (rise * 2) / d, 1.27, 1.34, 0.3, 2);
    if (side === 1) {
      arch(center, 0, 0.38, 1.67, 2.63, true);
      portico(center, 6.03, 2.45, 3.1, [-2.59, -2.14, 2.14, 2.59]);
      for (const x of [-2.59, -2.14, 2.14, 2.59])
        rod(center, new V(x, 0.35, 0.41), new V(x, 3, 0.41), 0.19, 0.16, stone, 10);
      for (const x of bays(18, 5.73)) box(center, x, 3.71, 2.33, 0.1, 0.56, 0.13, stone);
      box(center, 0, 4.0, 2.33, 6.03, 0.11, 0.25, stone);
    } else lights(center, 0, 0.92, 1.5, 1.72, 2);
  }
  residentialEnds(g, w, d, h, rise, 3);
}
function oriel(f, x, width, sill, height, levels = 2) {
  const projection = 0.62;
  box(f, x, sill + height / 2, projection / 2, width, height, projection, stone);
  const face = sub(f, x, 0, projection);
  for (let i = 0; i < levels; i++)
    lights(face, 0, sill + (i * height) / levels + 0.32, width - 0.43, height / levels - 0.75, 3);
  box(f, x, sill - 0.1, projection * 0.39, width + 0.25, 0.2, projection * 1.18, darkStone);
  box(f, x, sill + height + 0.07, projection / 2, width + 0.22, 0.17, projection + 0.18, stone);
}
function evanston(s, g) {
  const { w, d } = s,
    h = 9.25,
    rise = 4.34;
  wing(g, w, d, h, rise);
  for (const side of [-1, 1]) {
    const f = wallFace(g, d, side);
    for (const x of bays(9, w * 0.96)) {
      if (Math.abs(x) < 0.1) continue;
      for (let k = 0; k < 3; k++) lights(f, x, 0.83 + k * 3.01, 1.93, 1.71, 3);
    }
    const entry = frontGable(f, 0, 0.29, 3.75, 0, h + 0.34, 2.7, 4.5, true);
    if (side === 1) {
      arch(entry, 0, 0.4, 1.84, 2.65, true);
      oriel(entry, 0, 2.98, 3.18, 5.67);
    } else for (let k = 0; k < 3; k++) lights(entry, 0, 0.84 + k * 3.01, 2.13, 1.72, 3);
    lights(entry, 0, h + 0.29, 1.52, 1.34, 2);
    for (const x of [-0.434, -0.32, -0.215, -0.12, 0.12, 0.215, 0.32, 0.434])
      dormer(f, x * w, Math.abs(x) > 0.4 ? 2.4 : 1.88, h, (rise * 2) / d, 1.46, 1.1, 0.29, 2);
    belt(f, w, 0.59);
  }
  residentialEnds(g, w, d, h, rise, 3);
  for (const x of [-0.18 * w, 0.19 * w]) ridgeStack(g, x, 0, h + rise + 0.81);
}
function treat(s, g, base) {
  const w = s.d,
    d = s.w - 0.98,
    h = s.h,
    rise = 4.25,
    b = sub(g, -0.45, 0, 0, Math.PI / 2);
  wing(b, w, d, h, rise);
  boxedSite(s, -0.45, 0, d, w, h + rise, base);
  for (const side of [-1, 1]) {
    const f = wallFace(b, d, side);
    for (const x of [-0.29, -0.16, 0.16, 0.29]) {
      for (let k = 0; k < 4; k++) lights(f, x * w, 0.78 + 3.12 * k, 2.04, 1.82, 3);
      dormer(f, x * w, 1.65, h, (2 * rise) / d, 1.24, 1.23, 0.32, 1);
    }
    for (const location of [-0.422, 0, 0.422]) {
      const fwd = frontGable(f, location * w, 0.91, w * 0.144, 0, h + 0.29, 2.96, 4.55, true);
      for (let k = 0; k < 4; k++) {
        if (k === 0 && location === 0) {
          arch(fwd, 0, 0.36, 1.78, 2.59, true);
          continue;
        }
        lights(fwd, 0, 0.78 + 3.12 * k, 2.18, 1.85, 3);
      }
      lights(fwd, 0, h + 0.35, 1.45, 1.49, 2);
      if (side === -1 && location !== 0) oriel(fwd, 0, 2.74, 3.43, 5.57);
    }
    if (side === 1) portico(f, w * 0.7, 2.15, 5.85, bays(6, w * 0.69));
    for (const x of [-w * 0.493, w * 0.493]) buttress(f, x, h - 0.09);
  }
  residentialEnds(b, w, d, h, rise, 4);
  for (const x of [-w * 0.21, w * 0.22]) ridgeStack(b, x, 0, h + rise + 0.82);
}
function academy(s, g) {
  const { w, d } = s,
    h = 11.68,
    rise = 3.71;
  wing(g, w, d, h, rise);
  for (const side of [-1, 1]) {
    const f = wallFace(g, d, side);
    for (const x of [-0.302, -0.163, 0.163, 0.302]) {
      for (let k = 0; k < 4; k++) lights(f, x * w, 0.78 + k * 2.9, 2.47, 1.72, 3);
    }
    for (const x of [-0.432 * w, 0, 0.432 * w]) {
      const bay = frontGable(
        f,
        x,
        0.42,
        x === 0 ? 4.4 : 3.55,
        0,
        h + 0.09,
        x === 0 ? 2.33 : 1.61,
        3.86,
        true,
      );
      if (x === 0 && side === 1) {
        arch(bay, 0, 0.35, 1.84, 2.25, true, false);
        oriel(bay, 0, 2.98, 2.95, 8.16, 3);
      } else for (let k = 0; k < 4; k++) lights(bay, 0, 0.78 + k * 2.9, 1.66, 1.72, 2);
      if (x === 0) lights(bay, 0, h + 0.22, 1.14, 1.18, 2);
    }
    belt(f, w, 0.56, darkStone);
  }
  residentialEnds(g, w, d, h, rise, 4);
  ridgeStack(g, -w * 0.23, 0, h + rise + 0.91);
}
function makeTower(s, g) {
  const { w, h } = s,
    shoulder = h * 0.685;
  box(g, 0, shoulder / 2, 0, w, shoulder, w, brick);
  box(g, 0, (h + shoulder) / 2, 0, w, h - shoulder, w, std(0xb9aa9a));
  box(g, 0, 0.25, 0, w + 0.38, 0.5, w + 0.38, stone);
  for (let i = 0; i < 4; i++) {
    const f = wallFace(sub(g, 0, 0, 0, (i * Math.PI) / 2), w, 1);
    for (const x of [-w * 0.47, w * 0.47]) box(f, x, h / 2, 0.04, 0.18, h, 0.18, darkStone);
    for (const y of [h * 0.17, h * 0.34, h * 0.51, shoulder]) belt(f, w, y, stone, 0.26);
    if (i === 0) timberDoor(f, 0, 0.33, 1.19, 2.3);
    for (const y of [h * 0.227, h * 0.397, h * 0.563]) lights(f, 0, y, 1.36, 1.3, 2);
    merlons(f, w, h + 0.14, 7);
  }
}

function musicHall(s, g) {
  const w = s.d,
    d = s.w,
    h = 6.1,
    rise = 4.35,
    b = sub(g, 0, 0, 0, Math.PI / 2);
  wing(b, w, d, h, rise);
  for (const side of [-1, 1]) {
    const f = wallFace(b, d, side);
    belt(f, w, 3.07);
    for (const x of bays(5, w * 0.95)) {
      if (side === -1 && Math.abs(x) < 0.1) continue;
      lights(f, x, 0.97, 2.05, 1.51, 3);
      lights(f, x, 3.77, 2.14, 1.54, 3);
    }
    if (side === -1) {
      const entry = frontGable(f, 0, 1.44, 5.02, 0, h + 0.45, 2.25, 4.3, true);
      arch(entry, 0, 0.38, 1.94, 2.35, true);
      arch(entry, 0, 3.58, 3.1, 3.45);
      for (const x of [-2.33, 2.33]) buttress(entry, x, 6.32);
      steps(entry, 3.46);
    }
  }
  for (const side of [-1, 1]) {
    const f = endFace(b, w, d, side);
    gableEdge(f, d, h, rise);
    lights(f, 0, 3.6, 4.09, 2.76, 4, true);
    if (side === -1) {
      for (const k of [-1, 1]) {
        const bx = k * d * 0.36;
        arch(f, bx, 3.03, 1.14, 1.89, true);
        box(f, bx, 2.85, 0.76, 1.63, 0.3, 1.52, stone).userData.step = true;
        // Two mirrored flights turn inwards below the end window.
        for (let i = 0; i < 16; i++) {
          const height = (16 - i) * 0.178;
          box(
            f,
            bx - k * (0.78 + i * 0.175),
            height / 2,
            0.82,
            0.19,
            height,
            1.16,
            darkStone,
          ).userData.step = true;
        }
      }
    } else for (const x of [-2.55, 0, 2.55]) lights(f, x, 0.94, 1.52, 1.55, 2);
  }
}
function edmands(s, g, base) {
  // The period footprint is cruciform. The short front break and the long rear projection differ in depth.
  const { w, d } = s,
    h = 6.5,
    bodyDepth = d * 0.5,
    cz = -d * 0.08;
  const core = sub(g, 0, 0, cz);
  wing(core, w, bodyDepth, h, 4.14);
  boxedSite(s, 0, cz, w, bodyDepth, h + 4.14, base);
  const front = wallFace(core, bodyDepth, -1),
    deep = d * 0.17,
    width = w * 0.29,
    top = h + 1.76;
  for (const x of [-0.42, -0.31, -0.195, 0.195, 0.31, 0.42]) {
    for (const y of [0.97, 3.86]) lights(front, x * w, y, 1.12, 1.81, 2, true);
  }
  for (const x of [-w * 0.436, w * 0.436]) {
    const bay = frontGable(front, x, 0.24, 2.83, h - 0.13, h + 0.15, 1.44, 2.85, true);
    lights(bay, 0, h + 0.17, 0.74, 0.77, 1);
  }
  box(front, 0, top / 2, deep / 2, width, top, deep, brick);
  const entry = sub(front, 0, 0, deep);
  arch(entry, 0, 0.38, 1.62, 2.64, true);
  for (const x of [-width * 0.33, width * 0.33]) lights(entry, x, 1.03, 0.78, 1.56, 1, true);
  lights(entry, 0, 3.7, 2.32, 1.97, 3, true);
  lights(entry, 0, h + 0.26, 1.63, 0.79, 3);
  merlons(entry, width, top, 9);
  for (const x of [-width * 0.47, width * 0.47]) {
    buttress(entry, x, top);
    pinacle(entry, x, top, 0.82);
  }
  steps(entry, 3.47);
  boxedSite(s, 0, cz - (bodyDepth + deep) / 2, width, deep, top, base);
  const rearD = d / 2 - (cz + bodyDepth / 2),
    rz = cz + bodyDepth / 2 + rearD / 2,
    rearW = w * 0.285;
  const tail = sub(g, 0, 0, rz, Math.PI / 2);
  wing(tail, rearD, rearW, h - 0.81, 2.5);
  boxedSite(s, 0, rz, rearW, rearD, h + 1.69, base);
  for (const side of [-1, 1])
    for (const x of bays(3, rearD))
      for (const y of [0.93, 3.53]) lights(wallFace(tail, rearW, side), x, y, 1.48, 1.36, 2);
  for (const side of [-1, 1]) {
    const f = endFace(core, w, bodyDepth, side);
    gableEdge(f, bodyDepth, h, 4.14);
    for (const x of bays(4, bodyDepth * 0.91))
      for (const y of [0.91, 3.75]) lights(f, x, y, 1.46, 1.77, 2, true);
    lights(f, 0, h + 0.37, 1.56, 1.38, 2);
  }
}
function diningHall(s, g) {
  const { w, d } = s,
    h = 5.87,
    rise = 2.81;
  wing(g, w, d, h, rise);
  for (const side of [-1, 1]) {
    const f = wallFace(g, d, side);
    box(f, 0, h - 0.49, 0.035, w, 0.66, 0.095, stone);
    belt(f, w, h - 0.84, darkStone);
    belt(f, w, 3.13);
    for (const x of bays(7, w * 0.96)) {
      if (Math.abs(x) < 0.1 && side === 1) {
        arch(f, 0, 0.38, 1.72, 2.55, true, false);
        steps(f, 2.93);
      } else lights(f, x, 1.0, 1.59, 1.5, 2);
      lights(f, x, 3.69, 1.63, 1.22, 2);
    }
  }
  residentialEnds(g, w, d, h, rise, 2);
}
