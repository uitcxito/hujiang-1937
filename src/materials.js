const T = THREE,
  V = T.Vector3;
let rng = 193705;
function rand() {
  rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
  return rng / 4294967296;
}
function between(a, b) {
  return a + (b - a) * rand();
}
function canvas(n, h = n) {
  const c = document.createElement("canvas");
  c.width = n;
  c.height = h;
  return c;
}
function texture(c, colour = true) {
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = 8;
  if (colour) t.colorSpace = T.SRGBColorSpace;
  return t;
}
function std(color, props = {}) {
  return new T.MeshStandardMaterial({ color, roughness: 0.9, ...props });
}
function grain(ctx, amount) {
  const im = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  for (let i = 0; i < im.data.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    for (let k = 0; k < 3; k++) im.data[i + k] += n;
  }
  ctx.putImageData(im, 0, 0);
}
function masonry() {
  const c = canvas(768, 512),
    b = canvas(768, 512),
    g = c.getContext("2d"),
    h = b.getContext("2d");
  g.fillStyle = "#93877b";
  g.fillRect(0, 0, c.width, c.height);
  h.fillStyle = "#505050";
  h.fillRect(0, 0, b.width, b.height);
  for (let row = 0; row < 16; row++)
    for (let col = -1; col < 8; col++) {
      const x = col * 96 + (row % 2) * 48,
        y = row * 32;
      const light = between(34, 46),
        hue = between(7, 17);
      g.fillStyle = "hsl(" + hue + " 34% " + light + "%)";
      g.beginPath();
      g.roundRect(x + 1.4, y + 1.8, 93.5, 29.2, between(1, 3));
      g.fill();
      h.fillStyle = "rgb(197 197 197)";
      h.beginPath();
      h.roundRect(x + 1.4, y + 1.8, 93.5, 29.2, 2);
      h.fill();
      for (let i = 0; i < 65; i++) {
        g.fillStyle = i % 2 ? "#331b1515" : "#f8c7a01c";
        g.fillRect(x + between(2, 91), y + between(2, 29), between(0.7, 7), between(0.3, 1.8));
      }
    }
  grain(g, 18);
  grain(h, 10);
  return std(0xffffff, { map: texture(c), bumpMap: texture(b, false), bumpScale: 0.021 });
}
function roofMaterial() {
  const c = canvas(512),
    g = c.getContext("2d");
  g.fillStyle = "#70564a";
  g.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 8; y++)
    for (let x = -1; x < 8; x++) {
      const xx = x * 64 + (y % 2) * 32,
        yy = y * 64;
      const grad = g.createLinearGradient(xx, 0, xx + 64, 0);
      const l = between(28, 34);
      for (const [t, v] of [
        [0, -5],
        [0.14, 4],
        [0.38, 0],
        [0.8, -2],
        [1, -7],
      ])
        grad.addColorStop(t, "hsl(19 23% " + (l + v) + "%)");
      g.fillStyle = grad;
      g.fillRect(xx, yy, 63, 61);
      g.fillStyle = "#b88d713f";
      g.fillRect(xx, yy + 58, 63, 3);
    }
  grain(g, 15);
  const t = texture(c);
  return std(0xffffff, { map: t, bumpMap: t, bumpScale: 0.032, side: T.DoubleSide });
}
const brick = masonry(),
  roof = roofMaterial(),
  stone = std(0xcbc1af),
  darkStone = std(0x958e80),
  wood = std(0x594237),
  frame = std(0x6b6254),
  iron = std(0x303b37);
function windowGlass() {
  const c = canvas(96, 192),
    g = c.getContext("2d"),
    gradient = g.createLinearGradient(0, 0, 0, 192);
  gradient.addColorStop(0, "#a9b9bc");
  gradient.addColorStop(0.37, "#74898b");
  gradient.addColorStop(0.53, "#80918a");
  gradient.addColorStop(0.68, "#50605a");
  gradient.addColorStop(1, "#34443e");
  g.fillStyle = gradient;
  g.fillRect(0, 0, 96, 192);
  for (let i = 0; i < 200; i++) {
    g.fillStyle = "#384e4130";
    g.beginPath();
    g.ellipse(rand() * 96, 112 + rand() * 63, rand() * 7 + 1, rand() * 8 + 1, rand(), 0, 7);
    g.fill();
  }
  return std(0xffffff, { map: texture(c), roughness: 0.29, metalness: 0.16 });
}
const glass = windowGlass(),
  boxGeom = new T.BoxGeometry(),
  roundGeom = new T.SphereGeometry(1, 20, 12);
function mesh(group, geo, material, x = 0, y = 0, z = 0) {
  const obj = new T.Mesh(geo, material);
  obj.position.set(x, y, z);
  group.add(obj);
  return obj;
}
function box(group, x, y, z, w, h, d, material) {
  let geo = boxGeom;
  if (material === brick || material === roof) {
    geo = boxGeom.clone();
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const f = Math.floor(i / 4);
      uv.setXY(
        i,
        (uv.getX(i) * (f < 2 ? d : w)) / 1.93,
        (uv.getY(i) * (f === 2 || f === 3 ? d : h)) / 1.18,
      );
    }
  }
  const o = mesh(group, geo, material, x, y, z);
  o.scale.set(w, h, d);
  return o;
}
function sphere(g, x, y, z, r, m) {
  const o = mesh(g, roundGeom, m, x, y, z);
  o.scale.setScalar(r);
  return o;
}
function rod(g, a, b, r1, r2, mat, segments = 7) {
  const delta = new V().subVectors(b, a),
    o = mesh(g, new T.CylinderGeometry(r2, r1, delta.length(), segments), mat);
  o.position.copy(a).add(b).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new V(0, 1, 0), delta.normalize());
  return o;
}
// Combine fixed geometry by material and 65 m cell. Picking uses the matching footprint solids.
function bake(root, dest) {
  root.updateMatrixWorld(true);
  const batches = new Map();
  root.traverse((o) => {
    if (!o.isMesh) return;
    const center = new V().setFromMatrixPosition(o.matrixWorld);
    const key = [Math.floor(center.x / 65), Math.floor(center.z / 65), o.material.uuid].join("/");
    if (!batches.has(key)) batches.set(key, { mat: o.material, p: [], n: [], uv: [], ids: [] });
    const out = batches.get(key);
    let ancestor = o;
    while (ancestor && !ancestor.userData.site) ancestor = ancestor.parent;
    const id = ancestor?.userData.site?.id;
    const geo = o.geometry,
      idx = geo.index,
      pos = geo.attributes.position,
      nor = geo.attributes.normal,
      uv = geo.attributes.uv,
      v = new V(),
      normal = new T.Matrix3().getNormalMatrix(o.matrixWorld);
    for (let i = 0; i < (idx ? idx.count : pos.count); i++) {
      const k = idx ? idx.getX(i) : i;
      if (id) out.ids.push(id);
      v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld);
      out.p.push(v.x, v.y, v.z);
      v.fromBufferAttribute(nor, k).applyMatrix3(normal).normalize();
      out.n.push(v.x, v.y, v.z);
      out.uv.push(uv?.getX(k) || 0, uv?.getY(k) || 0);
    }
  });
  for (const v of batches.values()) {
    const g = new T.BufferGeometry();
    for (const [name, arr, size] of [
      ["position", v.p, 3],
      ["normal", v.n, 3],
      ["uv", v.uv, 2],
    ])
      g.setAttribute(name, new T.Float32BufferAttribute(arr, size));
    if (v.ids.length) g.setAttribute("siteId", new T.Uint16BufferAttribute(v.ids, 1));
    const o = mesh(dest, g, v.mat);
    o.castShadow = o.receiveShadow = true;
  }
}
