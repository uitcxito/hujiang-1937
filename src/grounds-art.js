function groundContact() {
  const c = canvas(1600, 800),
    ctx = c.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  for (const [x, z, size] of campusTreeSites.concat(samplePlanting)) {
    const u = x / SCALE + 780,
      v = z / SCALE + 370,
      r = (4.9 * size) / SCALE;
    const gradient = ctx.createRadialGradient(u, v, 0, u, v, r);
    gradient.addColorStop(0, "#343434");
    gradient.addColorStop(0.15, "#777");
    gradient.addColorStop(0.54, "#cdcdcd");
    gradient.addColorStop(1, "#fff0");
    ctx.fillStyle = gradient;
    ctx.fillRect(u - r, v - r, r * 2, r * 2);
  }
  // Soft grounding stays attached to each wing, including the recess in the auditorium plan.
  for (const [id, asset] of landmarkModels) {
    const site = byId.get(id);
    for (const [x, z, w, d] of asset.proxies.walls) {
      const left = (site.x + x - w / 2) / SCALE + 780,
        top = (site.z + z - d / 2) / SCALE + 370;
      for (const [margin, alpha] of [
        [1.1, 0.045],
        [0.65, 0.085],
        [0.29, 0.16],
      ]) {
        const m = margin / SCALE;
        ctx.fillStyle = "rgba(45,45,45," + alpha + ")";
        ctx.fillRect(left - m, top - m, w / SCALE + 2 * m, d / SCALE + 2 * m);
      }
    }
  }
  const t = new T.CanvasTexture(c);
  t.flipY = false;
  t.anisotropy = 8;
  return t;
}

function dressAuditoriumPaths(scene) {
  const lanes = [
    {
      width: 3.4,
      points: [
        [848, 337],
        [842, 340],
        [835, 354],
        [835, 381],
      ],
    },
    {
      width: 2.4,
      points: [
        [892, 293],
        [891, 282],
        [908, 264],
      ],
    },
  ];
  let seed = 1211937;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const pebble = new T.DodecahedronGeometry(1, 0),
    stoneMat = std(0xb0a28c);
  const stoneParts = [],
    herbParts = [],
    herbGeometry = new T.BufferGeometry();
  const verts = [],
    colors = [];
  for (let k = 0; k < 9; k++) {
    const a = k * 2.4,
      h = 0.09 + random() * 0.19,
      r = random() * 0.062,
      dx = Math.cos(a),
      dz = Math.sin(a);
    verts.push(
      r * dx - 0.017 * dz,
      0,
      r * dz + 0.017 * dx,
      r * dx + 0.017 * dz,
      0,
      r * dz - 0.017 * dx,
      (r + 0.072) * dx,
      h,
      (r + 0.072) * dz,
    );
    colors.push(0.049, 0.084, 0.027, 0.07, 0.119, 0.037, 0.23, 0.29, 0.092);
  }
  herbGeometry.setAttribute("position", new T.Float32BufferAttribute(verts, 3));
  herbGeometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  herbGeometry.computeVertexNormals();
  const dummy = new T.Object3D();
  for (const lane of lanes)
    for (let i = 1; i < lane.points.length; i++) {
      const [x0, z0] = point(...lane.points[i - 1]),
        [x1, z1] = point(...lane.points[i]);
      const dx = x1 - x0,
        dz = z1 - z0,
        len = Math.hypot(dx, dz);
      for (let k = 0; k < len * 19; k++) {
        const t = random(),
          side = random() < 0.5 ? -1 : 1,
          herb = k % 4 === 0;
        const off = side * (lane.width / 2 + (herb ? 0.25 : -0.19) + random() * (herb ? 0.93 : 0.59));
        const x = x0 + t * dx - (off * dz) / len,
          z = z0 + t * dz + (off * dx) / len;
        if (herb && surf(x, z) > 0.22) continue;
        dummy.position.set(x, groundY(x, z) + (herb ? -0.014 : 0.006), z);
        dummy.rotation.set(herb ? 0 : random() * 0.28, random() * 6.28, 0);
        const s = herb ? 0.47 + random() * 0.73 : 0.016 + random() * 0.041;
        dummy.scale.set(s, herb ? s : s * 0.31, s * (0.63 + random() * 0.49));
        dummy.updateMatrix();
        (herb ? herbParts : stoneParts).push(dummy.matrix.clone());
      }
    }
  for (const [geom, mat, poses] of [
    [pebble, stoneMat, stoneParts],
    [herbGeometry, new T.MeshLambertMaterial({ vertexColors: true, side: T.DoubleSide }), herbParts],
  ]) {
    const mesh = new T.InstancedMesh(geom, mat, poses.length);
    poses.forEach((p, i) => mesh.setMatrixAt(i, p));
    mesh.receiveShadow = true;
    scene.add(mesh);
  }
}
