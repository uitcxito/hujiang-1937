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

function distantCrown(index, form) {
  const geo = new T.PlaneGeometry(form.extent, form.extent);
  geo.translate(0, form.centerY, 0);
  geo.setAttribute(
    "crownFrame",
    new T.Float32BufferAttribute(Array.from({ length: 4 }, () => [form.centerY, index]).flat(), 2),
  );
  return geo;
}

// The view and shadow passes select their own orthographic portrait of the same tree.
function faceCrown(shader) {
  shader.vertexShader =
    "attribute vec2 crownFrame;\n" +
    shader.vertexShader
      .replace(
        "#include <uv_vertex>",
        `
    #include <uv_vertex>
    mat4 treeMatrix = modelMatrix * instanceMatrix;
    vec3 center = (treeMatrix * vec4(0., crownFrame.x, 0., 1.)).xyz;
    vec3 eye = -vec3(dot(viewMatrix[0].xyz,viewMatrix[3].xyz),dot(viewMatrix[1].xyz,viewMatrix[3].xyz),dot(viewMatrix[2].xyz,viewMatrix[3].xyz));
    vec3 backward = vec3(viewMatrix[0].z,viewMatrix[1].z,viewMatrix[2].z);
    vec3 sight = projectionMatrix[2].w == 0. ? backward : normalize(eye-center);
    vec3 localX=normalize(treeMatrix[0].xyz),localZ=normalize(treeMatrix[2].xyz);
    float facingX=dot(localX,sight),facingZ=dot(localZ,sight);
    bool side=abs(facingX)>abs(facingZ), topView=sight.y>.875;
    float frame=topView?4.:(side?1.:0.)+(sight.y>.34?2.:0.);
    float tile=crownFrame.y*5.+frame;
    vec2 tex=uv;
    if(!topView && (side?facingX:facingZ)<0.) tex.x=1.-tex.x;
    vMapUv=(vec2(mod(tile,8.),7.-floor(tile/8.))+mix(vec2(.003),vec2(.997),tex))/8.;
    vec3 right=topView?localX:normalize(cross(vec3(0.,1.,0.),sight));
    vec3 up=topView?-localZ:normalize(cross(sight,right));
    float widthScale=length(side?treeMatrix[2].xyz:treeMatrix[0].xyz);
    float heightScale=length(topView?treeMatrix[2].xyz:treeMatrix[1].xyz);
    vec3 surface=center+right*position.x*widthScale+up*(position.y-crownFrame.x)*heightScale;
  `,
      )
      .replace(
        "#include <project_vertex>",
        "vec4 mvPosition=viewMatrix*vec4(surface,1.);gl_Position=projectionMatrix*mvPosition;",
      );
}

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
  const individuals = arborModels.map(() => []);
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
    const form = arborModels[index],
      width = size * (0.84 + random() * 0.24),
      depth = size * (0.87 + random() * 0.21);
    dummy.position.set(x, groundY(x, z), z);
    dummy.rotation.set(0, random() * Math.PI * 2, 0);
    dummy.scale.set(width, size, depth);
    dummy.updateMatrix();
    // Individual lean applies equally to branches, foliage, roots and the matching distant silhouette.
    const lean = (random() - 0.5) * 0.063;
    const transform = dummy.matrix.clone().multiply(new T.Matrix4().makeShear(0, 0, lean, 0, 0, 0));
    const direction = random() * Math.PI * 2,
      spread = 0.1 + random() * 0.17;
    individuals[index].push({
      x,
      z,
      y: dummy.position.y + form.centerY * size,
      matrix: transform,
      bendX: Math.cos(direction) * spread,
      bendZ: Math.sin(direction) * spread,
      near: null,
    });
    treeTrunks.push({
      x,
      z,
      r: form.trunkRadius * Math.max(width, depth),
      crownRadius: (form.radius + Math.abs(lean) * form.top) * Math.max(width, depth),
      top: dummy.position.y + size * form.top,
      species: form.species,
      form: form.form,
    });
  }
  const impostor = new T.MeshBasicMaterial({
    map: crownAtlas,
    alphaTest: 0.32,
    alphaToCoverage: true,
    side: T.DoubleSide,
    toneMapped: false,
  });
  const depth = new T.MeshDepthMaterial({
    map: crownAtlas,
    alphaTest: 0.32,
    side: T.DoubleSide,
    depthPacking: T.RGBADepthPacking,
  });
  impostor.onBeforeCompile = depth.onBeforeCompile = faceCrown;
  const branchDepths = new Map();
  function batch(geom, mat, count, part) {
    const m = new T.InstancedMesh(geom, mat, count);
    m.name = part;
    m.castShadow = true;
    m.receiveShadow = part !== "Distant crown";
    if (part === "Distant crown") m.customDepthMaterial = depth;
    else {
      if (!branchDepths.has(mat)) {
        const caster = new T.MeshDepthMaterial({
          depthPacking: T.RGBADepthPacking,
          map: mat.alphaTest ? mat.map : null,
          alphaTest: mat.alphaTest,
          side: mat.side,
        });
        caster.onBeforeCompile = individualBranches;
        branchDepths.set(mat, caster);
      }
      m.customDepthMaterial = branchDepths.get(mat);
    }
    m.instanceMatrix.setUsage(T.DynamicDrawUsage);
    scene.add(m);
    return m;
  }
  const batches = individuals.map((list, i) => {
    const model = arborModels[i];
    const pose = new T.InstancedBufferAttribute(new Float32Array(list.length * 2), 2);
    pose.setUsage(T.DynamicDrawUsage);
    model.wood.geometry.setAttribute("branchPose", pose);
    model.leaves.geometry.setAttribute("branchPose", pose);
    return [
      batch(model.wood.geometry, model.wood.material, list.length, "Tree wood"),
      batch(model.leaves.geometry, model.leaves.material, list.length, "Tree foliage"),
      batch(distantCrown(i, model), impostor, list.length, "Distant crown"),
    ];
  });
  const last = new V(Infinity, Infinity, Infinity);
  let level = -1;
  return (position, quality) => {
    if (level === quality && last.distanceToSquared(position) < 2.25) return false;
    last.copy(position);
    level = quality;
    let any = false;
    for (const [i, list] of individuals.entries()) {
      let changed = false;
      for (const t of list) {
        const limit = [17, 27, 42][quality] + (t.near ? 3 : 0);
        const near =
          (t.x - position.x) ** 2 + (t.z - position.z) ** 2 + (t.y - position.y) ** 2 < limit * limit;
        if (t.near !== near) {
          changed = true;
          t.near = near;
        }
      }
      if (!changed) continue;
      any = true;
      const [wood, leaves, far] = batches[i];
      let n = 0,
        f = 0;
      for (const t of list) {
        if (t.near) {
          wood.geometry.attributes.branchPose.setXY(n, t.bendX, t.bendZ);
          wood.setMatrixAt(n, t.matrix);
          leaves.setMatrixAt(n++, t.matrix);
        } else far.setMatrixAt(f++, t.matrix);
      }
      wood.count = leaves.count = n;
      wood.geometry.attributes.branchPose.needsUpdate = true;
      far.count = f;
      for (const mesh of batches[i]) {
        mesh.visible = mesh.count > 0;
        mesh.instanceMatrix.needsUpdate = true;
        if (mesh.count) mesh.computeBoundingSphere();
      }
    }
    return any;
  };
}
