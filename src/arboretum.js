// Preserve the old planting pattern. Position, not construction order, selects a reproducible individual.
const treeTrunks = [];
const samplePlanting = [
  [57.4, -43.3, 0.91, 5],
  [47.4, -44.4, 0.79, 6],
  [39.7, -48.8, 0.84, 1],
];
const studyTrees = new Map([
  ["64.67,-32.33", 0],
  ["64.8,-35.88", 7],
  ["42.47,-46.33", 4],
  ["24.3,-21.3", 7],
  ["18.23,0.43", 2],
  ["44.1,-2.15", 3],
  ["53.96,1.15", 6],
  ["18.19,-17.4", 1],
]);

function individualBranches(shader) {
  shader.vertexShader =
    `
    attribute vec2 branchPose;
    mat2 branchRotation(vec3 p) {
      vec2 axis=normalize(p.xz+vec2(.00001));
      vec2 sectors=vec2(axis.x*axis.x-axis.y*axis.y,2.*axis.x*axis.y);
      float angle=dot(sectors,branchPose)*smoothstep(2.4,9.,p.y)*smoothstep(.4,2.7,length(p.xz));
      vec2 turn=normalize(vec2(1.,angle));
      return mat2(turn.x,turn.y,-turn.y,turn.x);
    }
  ` +
    shader.vertexShader
      .replace(
        "#include <beginnormal_vertex>",
        "#include <beginnormal_vertex>\nobjectNormal.xz=branchRotation(position)*objectNormal.xz;\n#ifdef USE_TANGENT\nobjectTangent.xz=branchRotation(position)*objectTangent.xz;\n#endif",
      )
      .replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\ntransformed.xz=branchRotation(position)*position.xz;",
      );
}

function vegetation(scene) {
  const stands = arborModels.map(() => new Map());
  const dummy = new T.Object3D();
  const walkable = makeWalkSpace(obstacles, [], 0.38);
  const planting = campusTreeSites.concat(
    samplePlanting.filter(([x, z]) => walkable(x, z) && surf(x, z) < 0.1),
  );
  for (const [x, z, size, curated] of planting) {
    let seed = (Math.imul(Math.round(x * 100), 747796405) ^ Math.imul(Math.round(z * 100), 2891336453)) >>> 0;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const index = curated ?? studyTrees.get([x, z].join()) ?? Math.floor(random() * 9);
    const form = arborModels[index];
    const width = size * (0.84 + random() * 0.24), depth = size * (0.87 + random() * 0.21);
    dummy.position.set(x, groundY(x, z), z);
    dummy.rotation.set(0, random() * Math.PI * 2, 0);
    dummy.scale.set(width, size, depth);
    dummy.updateMatrix();
    const lean = (random() - 0.5) * 0.063;
    const transform = dummy.matrix.clone().multiply(new T.Matrix4().makeShear(0, 0, lean, 0, 0, 0));
    const direction = random() * Math.PI * 2, spread = 0.1 + random() * 0.17;
    // A stand can leave the frustum as a unit. Its geometry, pose and material stay fixed.
    const cell = Math.floor(x / 64) + "," + Math.floor(z / 64);
    const stand = stands[index];
    if (!stand.has(cell)) stand.set(cell, []);
    stand.get(cell).push({ transform, bendX: Math.cos(direction) * spread, bendZ: Math.sin(direction) * spread });
    treeTrunks.push({
      x, z, r: form.trunkRadius * Math.max(width, depth),
      crownRadius: (form.radius + Math.abs(lean) * form.top) * Math.max(width, depth),
      top: dummy.position.y + size * form.top, species: form.species, form: form.form,
    });
  }

  const trunks = [], depthMaterials = new Map();
  for (const [index, stand] of stands.entries()) {
    const form = arborModels[index];
    const halfHeight = (form.top - form.bottom) / 2;
    // All branch poses rotate around the trunk axis, so one centred cylinder encloses every pose.
    const sphere = new T.Sphere(
      new V(0, form.bottom + halfHeight, 0), Math.hypot(form.radius, halfHeight),
    );
    for (const trees of stand.values()) {
      const pose = new T.InstancedBufferAttribute(new Float32Array(trees.length * 2), 2);
      trees.forEach((tree, i) => pose.setXY(i, tree.bendX, tree.bendZ));
      for (const part of [form.wood, form.leaves]) {
        // Each stand owns its instance attributes and shares the authored vertex/index buffers.
        const geometry = new T.BufferGeometry();
        geometry.setIndex(part.geometry.index);
        Object.assign(geometry.attributes, part.geometry.attributes);
        geometry.setAttribute("branchPose", pose);
        geometry.boundingSphere = sphere;
        const mat = part.material;
        if (!depthMaterials.has(mat)) {
          const depth = new T.MeshDepthMaterial({
            depthPacking: T.RGBADepthPacking, map: mat.alphaTest ? mat.map : null,
            alphaTest: mat.alphaTest, alphaHash: mat.alphaHash, side: mat.side,
          });
          // r160 enables derivatives for PBR materials; its WebGL 1 depth shader needs them explicitly.
          if (depth.alphaHash) depth.extensions = { derivatives: true };
          depth.onBeforeCompile = individualBranches;
          depthMaterials.set(mat, depth);
        }
        const mesh = new T.InstancedMesh(geometry, mat, trees.length);
        mesh.name = part === form.wood ? "Tree wood" : "Tree foliage";
        mesh.castShadow = mesh.receiveShadow = true;
        mesh.customDepthMaterial = depthMaterials.get(mat);
        trees.forEach((tree, i) => mesh.setMatrixAt(i, tree.transform));
        mesh.computeBoundingSphere();
        mesh.boundingSphere.radius *= 1.04; // Include the small shear used for trunk lean.
        scene.add(mesh);
        if (part === form.wood) trunks.push(mesh);
      }
    }
  }
  return trunks;
}
