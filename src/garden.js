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
function inPolygon(x, z, poly) {
  let yes = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [a, b] = poly[i],
      [c, d] = poly[j];
    if (b > z !== d > z && x < ((c - a) * (z - b)) / (d - b) + a) yes = !yes;
  }
  return yes;
}
function grass(scene) {
  const hallWalls = obstacles.filter((wall) => wall.id === 121);
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
  const candidates = [110, 260, 460];
  const patch = new T.Group();
  patch.visible = false;
  scene.add(patch);
  const tiles = Array.from({ length: 25 }, () => {
    const mesh = new T.InstancedMesh(geom, material, candidates[2]);
    mesh.receiveShadow = true;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    mesh.boundingSphere = new T.Sphere();
    mesh.count = 0;
    patch.add(mesh);
    return { mesh, x: NaN, z: NaN, quality: -1 };
  });
  geom.computeBoundingSphere();
  // A clump can rotate and grow to 1.45 times its original size.
  const clumpReach = 1.45 * (geom.boundingSphere.center.length() + geom.boundingSphere.radius);
  const dummy = new T.Object3D();
  function fillTile(tile, ix, iz, q) {
    const mesh = tile.mesh;
    let count = 0, minY = Infinity, maxY = -Infinity;
    let seed = (Math.imul(ix, 92837111) ^ Math.imul(iz, 689287499)) >>> 0;
    const random = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
    for (let k = 0; k < candidates[q]; k++) {
      const x = (ix + random()) * 8, z = (iz + random()) * 8;
      const a = random() * 6.28, s = 0.7 + random() * 0.75;
      if (surf(x, z) > 0.14 || shoreDistance(x, z) < 2.5) continue;
      if (hallWalls.some((wall) => Math.abs(x - wall.x) < wall.w / 2 + 0.12 &&
          Math.abs(z - wall.z) < wall.d / 2 + 0.12)) continue;
      const y = groundY(x, z) - 0.012;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      dummy.position.set(x, y, z);
      dummy.rotation.y = a;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(count++, dummy.matrix);
    }
    mesh.count = count;
    mesh.visible = count > 0;
    if (count) {
      mesh.boundingSphere.center.set(ix * 8 + 4, (minY + maxY) * 0.5, iz * 8 + 4);
      mesh.boundingSphere.radius = Math.hypot(4, (maxY - minY) * 0.5, 4) + clumpReach;
      mesh.instanceMatrix.clearUpdateRanges();
      mesh.instanceMatrix.addUpdateRange(0, count * 16);
      mesh.instanceMatrix.needsUpdate = true;
    }
    tile.x = ix;
    tile.z = iz;
    tile.quality = q;
  }
  const slot = n => ((n % 5) + 5) % 5;
  let lastX = NaN, lastZ = NaN, lastQuality = -1;
  return (pos, q, walk) => {
    patch.visible = walk;
    if (!walk) return;
    const ix = Math.floor(pos.x / 8), iz = Math.floor(pos.z / 8);
    if (ix === lastX && iz === lastZ && q === lastQuality) return;
    // Every cell in a 5×5 window has a unique slot, including at negative coordinates.
    for (let x = ix - 2; x <= ix + 2; x++)
      for (let z = iz - 2; z <= iz + 2; z++) {
        const tile = tiles[slot(x) * 5 + slot(z)];
        if (tile.x !== x || tile.z !== z || tile.quality !== q) fillTile(tile, x, z, q);
      }
    lastX = ix;
    lastZ = iz;
    lastQuality = q;
  };
}

// Herbaceous planting at the river margin and in the mapped Biological Garden.
function riverGarden(scene) {
  const shrubPerches = [];
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
      shrubPerches.push({ x: x + len / 2, z });
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
    shrubPerches.push({ x, z });
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
  return shrubPerches;
}
