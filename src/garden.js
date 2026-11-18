function leafSpray(narrow) {
  const c = canvas(256),
    g = c.getContext("2d");
  function twig(x, y, len, angle, depth) {
    const dx = Math.sin(angle),
      dy = -Math.cos(angle),
      endX = x + dx * len,
      endY = y + dy * len;
    g.strokeStyle = depth > 1 ? "#635d3c" : "#626743";
    g.lineWidth = depth * 0.57 + 0.55;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + dx * len * 0.43 - 2, y + dy * len * 0.48, endX, endY);
    g.stroke();
    for (let i = 1; i <= 6; i++) {
      const t = (i + rand() * 0.35) / 7,
        s = i % 2 ? 1 : -1,
        xx = x + dx * len * t,
        yy = y + dy * len * t;
      if (depth > 0) twig(xx, yy, len * between(0.33, 0.57), angle + s * between(0.55, 0.99), depth - 1);
      else {
        g.save();
        g.translate(xx, yy);
        g.rotate(angle + s * between(0.43, 1.08));
        const h = between(8, 15),
          w = h * (narrow ? 0.2 : 0.36);
        g.fillStyle = "hsl(" + between(73, 99) + " " + between(22, 43) + "% " + between(32, 54) + "%)";
        g.beginPath();
        g.moveTo(0, 0);
        g.bezierCurveTo(-w, -h * 0.3, -w, -h * 0.67, 0, -h);
        g.bezierCurveTo(w, -h * 0.64, w, -h * 0.32, 0, 0);
        g.fill();
        g.restore();
      }
    }
  }
  twig(129, 252, 139, -0.19, 2);
  twig(125, 224, 128, 0.47, 2);
  twig(118, 210, 109, -0.74, 2);
  const tex = texture(c);
  tex.wrapS = tex.wrapT = T.ClampToEdgeWrapping;
  return tex;
}
function barkMaterial() {
  const c = canvas(256),
    g = c.getContext("2d");
  g.fillStyle = "#685f4f";
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 520; i++) {
    const x = rand() * 256,
      y = rand() * 256;
    g.strokeStyle = i % 4 ? "#463f344c" : "#b8ab8a7a";
    g.lineWidth = between(0.7, 3.2);
    g.beginPath();
    g.moveTo(x, y);
    g.bezierCurveTo(x + 4, y + 8, x - 4, y + 17, x + between(-2, 2), y + between(20, 60));
    g.stroke();
  }
  grain(g, 18);
  const tex = texture(c);
  tex.repeat.set(2, 3);
  return std(0xffffff, { map: tex, bumpMap: tex, bumpScale: 0.035 });
}
const bark = barkMaterial(),
  treeTrunks = [];
function lightPlantCards(shader) {
  // Both sides share the crown or clump's normals. Sunlit leaves transmit some light towards the eye.
  const normals = T.ShaderChunk.normal_fragment_begin.replace("normal *= faceDirection;", "");
  const lighting = T.ShaderChunk.lights_lambert_pars_fragment.replace(
    "vec3 irradiance = dotNL * directLight.color;",
    `float backlight = pow(saturate(dot(-geometryViewDir, directLight.direction)), 5.0);
     vec3 irradiance = directLight.color * (dotNL + vec3(0.23, 0.30, 0.09) * backlight);`,
  );
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <normal_fragment_begin>", normals)
    .replace("#include <lights_lambert_pars_fragment>", lighting);
}
function makeTree(type) {
  const woody = new T.Group(),
    crowns = [],
    slender = type === 2,
    high = slender ? 12 : 9 + type * 0.55,
    spread = slender ? 2.65 : 3.85;
  const root = new V(0, -0.19, 0),
    bend = new V(between(-0.24, 0.24), high * 0.33, between(-0.18, 0.18)),
    fork = new V(between(-0.42, 0.42), high * 0.61, between(-0.41, 0.41));
  sphere(woody, bend.x, bend.y, bend.z, 0.248, bark);
  rod(woody, root, bend, 0.35, 0.25, bark, 9);
  rod(woody, bend, fork, 0.26, 0.145, bark, 8);
  for (let j = 0; j < 12; j++) {
    const a = j * 2.399 + rand() * 0.65,
      t = j / 12,
      origin = bend.clone().lerp(fork, t),
      r = spread * (0.94 - 0.5 * t) * between(0.72, 1.14);
    const elbow = origin
      .clone()
      .add(new V(Math.cos(a) * r * 0.67, 1.2 + t * 0.3, Math.sin(a) * r * 0.67));
    const tip = new V(Math.cos(a) * r, high * (0.61 + 0.36 * t) + between(-0.3, 0.4), Math.sin(a) * r);
    rod(woody, origin, elbow, (1 - t * 0.6) * 0.143, 0.082, bark);
    rod(woody, elbow, tip, 0.085, 0.034, bark, 5);
    for (const side of [-1, 1]) {
      const end = tip.clone().add(new V(Math.cos(a + side), between(0.2, 1.1), Math.sin(a + side)));
      rod(woody, elbow.clone().lerp(tip, 0.55), end, 0.049, 0.018, bark, 4);
      crowns.push(end);
    }
    crowns.push(tip);
  }
  crowns.push(new V(0, high + 0.25, 0));
  function sprays(far) {
    const pos = [],
      uv = [],
      norm = [],
      color = [];
    for (const c of crowns)
      for (let j = 0; j < (far ? 3 : 10); j++) {
        const a = between(0, Math.PI * 2),
          r = Math.sqrt(rand()) * (far ? 0.55 : 1.15);
        const pt = new V(c.x + Math.cos(a) * r, c.y + between(-0.65, 0.69), c.z + Math.sin(a) * r);
        const az = a + between(-0.8, 0.8),
          width = (far ? 2.9 : 1.75) * between(0.76, 1.28),
          height = width * between(0.85, 1.2);
        const lean = between(-0.63, 1.04),
          incline = type === 2 ? between(0.54, 0.86) : between(0.24, 0.91);
        const u = new V(Math.cos(az) * width, between(-0.25, 0.25) * width, Math.sin(az) * width),
          v = new V(-Math.sin(az) * height * lean, height * incline, Math.cos(az) * height * lean);
        const normal = new V(pt.x * 0.16, 0.75 + rand() * 0.6, pt.z * 0.16).normalize();
        const tone = new T.Color().setHSL(
          between(0.16, 0.215),
          between(0.12, 0.29),
          between(0.52, 0.86) * (0.82 + (0.2 * pt.y) / high),
        );
        for (const [s, t] of [
          [-0.5, -0.45],
          [0.5, -0.45],
          [0.5, 0.55],
          [-0.5, -0.45],
          [0.5, 0.55],
          [-0.5, 0.55],
        ]) {
          const vert = pt.clone().addScaledVector(u, s).addScaledVector(v, t);
          pos.push(vert.x, vert.y, vert.z);
          norm.push(normal.x, normal.y, normal.z);
          uv.push(s + 0.5, t + 0.45);
          color.push(tone.r, tone.g, tone.b);
        }
      }
    const g = new T.BufferGeometry();
    for (const [name, arr, len] of [
      ["position", pos, 3],
      ["normal", norm, 3],
      ["uv", uv, 2],
      ["color", color, 3],
    ])
      g.setAttribute(name, new T.Float32BufferAttribute(arr, len));
    return g;
  }
  const trunk = new T.Group();
  // Trees are already instanced by cell below. Keep the trunk and branches in one shadow draw per batch.
  bake(woody, trunk, false);
  const leaves = new T.MeshLambertMaterial({
    map: leafSpray(slender),
    alphaTest: 0.27,
    side: T.DoubleSide,
    vertexColors: true,
    emissive: 0x152009,
    emissiveIntensity: 0.27,
  });
  leaves.onBeforeCompile = lightPlantCards;
  const near = sprays(false),
    far = sprays(true);
  let crownRadius = 0,
    height = 0;
  for (const canopy of [near, far]) {
    const p = canopy.getAttribute("position");
    for (let i = 0; i < p.count; i++) {
      crownRadius = Math.max(crownRadius, Math.hypot(p.getX(i), p.getZ(i)));
      height = Math.max(height, p.getY(i));
    }
  }
  return { wood: trunk.children[0].geometry, near, far, leaves, crownRadius, height };
}
function inPolygon(x, z, poly) {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [a, b] = poly[i],
      [c, d] = poly[j];
    if (b > z !== d > z && x < ((c - a) * (z - b)) / (d - b) + a) yes = !yes;
  }
  return yes;
}
function vegetation(scene) {
  const models = Array.from({ length: 5 }, (_, i) => makeTree(i)),
    cells = new Map(),
    treeGrid = new Map();
  function tree(u, v, outside = false, forcedScale = 0) {
    const [x, z] = point(u, v);
    if (!outside && (!inPolygon(u, v, boundary) || surf(x, z) > 0.02 || inPolygon(u, v, track))) return;
    if (
      !outside &&
      sites.some(
        (s) =>
          s.style !== "landmark" &&
          Math.abs(x - s.x) < s.w * 0.5 + 2.6 &&
          Math.abs(z - s.z) < s.d * 0.5 + 2.6,
      )
    )
      return;
    if (!outside && Math.hypot(u - 838, v - 361) < 17) return;
    // The plan leaves the approach to Science Hall and the small adjoining lawn open.
    if (!outside && u > 923 && u < 1004 && v > 267 && v < 360) return;
    if (shoreDistance(x, z) < 3 && !outside) return;
    const ix = Math.floor(x / 4),
      iz = Math.floor(z / 4);
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++)
        for (const t of treeGrid.get([ix + i, iz + j].join()) || [])
          if (Math.hypot(t[0] - x, t[1] - z) < 3.3) return;
    const key = [ix, iz].join();
    if (!treeGrid.has(key)) treeGrid.set(key, []);
    treeGrid.get(key).push([x, z]);
    const size = forcedScale || between(0.65, 1.24),
      rot = rand() * 6.28,
      kind = Math.floor(rand() * 5),
      cx = Math.floor(x / 90),
      cz = Math.floor(z / 90);
    const name = [cx, cz, kind].join();
    if (!cells.has(name)) cells.set(name, { x: (cx + 0.5) * 90, z: (cz + 0.5) * 90, kind, matrices: [] });
    const dummy = new T.Object3D();
    dummy.position.set(x, groundY(x, z), z);
    dummy.rotation.y = rot;
    dummy.scale.set(size * between(0.84, 1.05), size, size);
    dummy.updateMatrix();
    cells.get(name).matrices.push(dummy.matrix);
    const model = models[kind];
    treeTrunks.push({
      x,
      z,
      r: 0.4 * size,
      crownRadius: model.crownRadius * Math.max(dummy.scale.x, size),
      top: dummy.position.y + size * model.height,
    });
  }
  for (const [u, v] of [
    [153, 326],
    [172, 333],
    [195, 339],
    [212, 344],
    [243, 345],
    [190, 367],
    [205, 366],
    [270, 346],
    [822, 368],
    [838, 366],
    [927, 338],
    [914, 303],
    [852, 285],
    [868, 274],
  ])
    tree(u, v, false, between(0.93, 1.16));
  for (let u = 180; u < 1235; u += between(10, 22)) {
    const v = 352 + (u - 155) * 0.044;
    tree(u, v - between(8, 23));
    if (u < 630 || u > 920) tree(u, v + between(9, 18));
  }
  for (let n = 0; n < 450; n++) {
    const u = between(150, 974),
      v = between(106, 366);
    if (v < 201 || u > 485 || v > 329 || u < 211) tree(u, v);
  }
  for (let n = 0; n < 74; n++) {
    const v = between(100, 687);
    tree(riverU(v) - between(6, 20), v);
  }
  // Tree symbols on the two edges of the quadrangle, including the gap opposite Breaker Hall.
  for (const [u, v] of [
    [1018, 262],
    [1038, 261],
    [1125, 259],
    [1148, 260],
    [1172, 259],
    [1194, 259],
    [1218, 258],
    [1243, 257],
    [1272, 257],
    [1302, 265],
    [1286, 292],
    [1271, 311],
    [1021, 334],
    [1040, 335],
    [1084, 334],
    [1109, 335],
    [1129, 334],
    [1155, 335],
    [1175, 335],
    [1197, 335],
    [1215, 335],
    [1249, 334],
  ])
    tree(u, v, false, between(0.7, 1.0));
  for (let n = 0; n < 37; n++) tree(between(1210, 1358), between(121, 244));
  for (let n = 0; n < 50; n++) tree(between(365, 589), between(432, 506));
  for (let n = 0; n < 110; n++) {
    const v = between(-680, 1160);
    tree(riverU(v) + between(610, 790), v, true, between(0.6, 1.1));
  }
  for (let n = 0; n < 65; n++) tree(between(-400, 1550), between(-150, -30), true, 0.9);
  const collection = [];
  for (const cell of cells.values()) {
    const m = models[cell.kind];
    function instances(geom, material) {
      const o = new T.InstancedMesh(geom, material, cell.matrices.length);
      cell.matrices.forEach((a, i) => o.setMatrixAt(i, a));
      scene.add(o);
      o.castShadow = o.receiveShadow = true;
      return o;
    }
    instances(m.wood, bark);
    const near = instances(m.near, m.leaves),
      far = instances(m.far, m.leaves);
    collection.push({ x: cell.x, z: cell.z, near, far });
  }
  return (position, quality) => {
    let castersChanged = false;
    for (const c of collection) {
      const dist = Math.hypot(position.x - c.x, position.z - c.z),
        near = dist < [55, 88, 135][quality];
      if (c.near.visible !== near) castersChanged = true;
      c.near.visible = near;
      c.far.visible = !near;
    }
    return castersChanged;
  };
}
function grass(scene) {
  const geom = new T.BufferGeometry(),
    p = [],
    col = [],
    normals = [];
  for (let j = 0; j < 16; j++) {
    const a = rand() * 6.28,
      x = between(-0.21, 0.21),
      z = between(-0.21, 0.21),
      w = between(0.004, 0.012),
      h = between(0.055, 0.14);
    const dx = Math.cos(a) * w,
      dz = Math.sin(a) * w;
    p.push(x - dx, 0, z - dz, x + dx, 0, z + dz, x + dz * 5.2, h, z - dx * 5.2);
    col.push(0.075, 0.13, 0.036, 0.096, 0.16, 0.05, 0.28, 0.32, 0.092);
    for (let i = 0; i < 3; i++) normals.push(0.3 * Math.sin(a), 1, -0.3 * Math.cos(a));
  }
  geom.setAttribute("position", new T.Float32BufferAttribute(p, 3));
  geom.setAttribute("color", new T.Float32BufferAttribute(col, 3));
  geom.setAttribute("normal", new T.Float32BufferAttribute(normals, 3));
  const material = new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide });
  material.onBeforeCompile = lightPlantCards;
  const o = new T.InstancedMesh(geom, material, 11500);
  scene.add(o);
  o.receiveShadow = true;
  o.frustumCulled = false;
  let previous = "";
  return (pos, q, walk) => {
    o.visible = walk;
    if (!walk) return;
    const ix = Math.floor(pos.x / 8),
      iz = Math.floor(pos.z / 8),
      key = [ix, iz, q].join();
    if (previous === key) return;
    previous = key;
    let count = 0;
    const dummy = new T.Object3D();
    for (let i = -2; i <= 2; i++)
      for (let j = -2; j <= 2; j++) {
        let seed = (Math.imul(ix + i, 92837111) ^ Math.imul(iz + j, 689287499)) >>> 0;
        const random = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
        for (let k = 0; k < [110, 260, 460][q]; k++) {
          const x = (ix + i + random()) * 8,
            z = (iz + j + random()) * 8,
            a = random() * 6.28,
            s = 0.7 + random() * 0.75;
          if (surf(x, z) > 0.14 || shoreDistance(x, z) < 2.5) continue;
          dummy.position.set(x, groundY(x, z) - 0.012, z);
          dummy.rotation.y = a;
          dummy.scale.setScalar(s);
          dummy.updateMatrix();
          o.setMatrixAt(count++, dummy.matrix);
        }
      }
    o.count = count;
    o.instanceMatrix.needsUpdate = true;
  };
}

// Herbaceous planting at the river margin and in the mapped Biological Garden.
function riverGarden(scene) {
  const root = new T.Group(),
    soil = std(0x66583f),
    stems = [],
    leaves = [],
    reedColour = [],
    leafColour = [];
  const pt = (p, x, y, z) => p.push(x, y, z);
  function cluster(x, z, size, reed) {
    const y = groundY(x, z) - 0.035,
      positions = reed ? stems : leaves,
      colours = reed ? reedColour : leafColour;
    for (let i = 0; i < (reed ? 11 : 19); i++) {
      const a = rand() * 6.28,
        r = between(0.03, 0.37) * size,
        dx = Math.cos(a),
        dz = Math.sin(a),
        bx = x + dx * r,
        bz = z + dz * r;
      const height = size * between(0.34, 1.12),
        width = size * (reed ? 0.025 : 0.062),
        reach = height * between(0.23, 0.69);
      const p0 = [bx - dz * width, y, bz + dx * width],
        p1 = [bx + dz * width, y, bz - dx * width];
      const m0 = [
          bx + dx * reach * 0.36 - dz * width * 0.7,
          y + height * 0.72,
          bz + dz * reach * 0.36 + dx * width * 0.7,
        ],
        m1 = [
          bx + dx * reach * 0.36 + dz * width * 0.7,
          y + height * 0.72,
          bz + dz * reach * 0.36 - dx * width * 0.7,
        ],
        tip = [bx + dx * reach, y + height, bz + dz * reach];
      const light = between(0.8, 1.3);
      for (const [p, t] of [
        [p0, 0.62],
        [p1, 0.62],
        [m1, 0.94],
        [p0, 0.62],
        [m1, 0.94],
        [m0, 0.94],
        [m0, 0.94],
        [m1, 0.94],
        [tip, 1.24],
      ]) {
        pt(positions, ...p);
        colours.push(0.12 * t * light, 0.18 * t * light, 0.045 * t * light);
      }
    }
  }
  for (const v of [133, 165, 197, 230]) {
    const lo = 1260,
      hi = riverU(v) - 24;
    for (let u = lo; u < hi; u += 18) {
      const [x, z] = point(u, v);
      const len = Math.min(15, hi - u) * SCALE;
      box(root, x + len / 2, groundY(x, z) + 0.024, z, len, 0.08, 1.48, soil);
      for (let i = 0; i < len * 1.8; i++)
        cluster(x + between(0, len), z + between(-0.48, 0.48), between(0.27, 0.64), false);
    }
  }
  for (let i = 0; i < 1300; i++) {
    const v = between(87, 713),
      [x, z] = point(riverU(v) - between(-2, 5), v);
    cluster(x, z, between(0.4, 1.23), true);
  }
  for (let i = 0; i < 105; i++) {
    const u = between(150, 970),
      v = between(165, 354),
      [x, z] = point(u, v);
    if (
      surf(x, z) > 0.05 ||
      sites.some((s) => Math.abs(s.x - x) < s.w / 2 + 1.2 && Math.abs(s.z - z) < s.d / 2 + 1.2)
    )
      continue;
    for (let j = 0; j < 7; j++)
      cluster(x + between(-1.5, 1.5), z + between(-1, 1), between(0.35, 0.75), false);
  }
  bake(root, scene);
  for (const [p, c] of [
    [stems, reedColour],
    [leaves, leafColour],
  ]) {
    const g = new T.BufferGeometry();
    g.setAttribute("position", new T.Float32BufferAttribute(p, 3));
    g.setAttribute("color", new T.Float32BufferAttribute(c, 3));
    g.computeVertexNormals();
    const o = mesh(scene, g, new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }));
    o.receiveShadow = true;
  }
}
