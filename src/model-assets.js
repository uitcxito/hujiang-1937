// All binary buffers are local. Both entry points use the same classic scripts under file://.
const landmarkModels = new Map();
const arborModels = [];
const treeSpecies = ["camphor", "zelkova", "maple"];

async function prepareModels() {
  const loader = new T.GLTFLoader();
  const materials = new Map();
  const models = await Promise.all(
    Object.entries(campusModelBytes).map(async ([name, encoded]) => {
      try {
        const compressed = Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0));
        const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
        const model = await loader.parseAsync(await new Response(stream).arrayBuffer(), "");
        return model.scene;
      } catch (error) {
        throw new Error(name + ".glb 加载失败 · " + error.message);
      }
    }),
  );
  for (const root of models) {
    root.traverse((node) => {
      if (node.isMesh) {
        const m = node.material;
        if (materials.has(m.name)) node.material = materials.get(m.name);
        else {
          materials.set(m.name, m);
          if (m.map) m.map.anisotropy = 8;
          if (m.normalMap) m.normalMap.anisotropy = 8;
          m.envMapIntensity = m.name.startsWith("Glass") ? 1.25 : 0.33;
          if (m.name.endsWith(" leaves")) prepareLeafMaterial(m);
          if (m.name.endsWith(" bark")) m.onBeforeCompile = individualBranches;
        }
      }
      if (node.userData.campusSite) {
        landmarkModels.set(node.userData.campusSite, {
          root: node,
          proxies: JSON.parse(node.userData.campusProxies),
        });
      }
      if (node.userData.species) {
        const { species, form, trunkRadius } = node.userData;
        const speciesIndex = treeSpecies.indexOf(species);
        const index = speciesIndex * 3 + form;
        const wood = node.children.find((o) => o.isMesh && o.material.name.endsWith(" bark"));
        const leaves = node.children.find((o) => o.isMesh && o.material.name.endsWith(" leaves"));
        if (speciesIndex < 0 || !Number.isInteger(form) || form < 0 || form > 2 ||
            arborModels[index] || !wood || !leaves) {
          throw new Error("树种模型或枝架编号无效 " + node.name);
        }
        let radiusSq = 0, bottom = Infinity, top = -Infinity;
        for (const mesh of [wood, leaves]) {
          const pos = mesh.geometry.getAttribute("position");
          for (let i = 0; i < pos.count; i++) {
            radiusSq = Math.max(radiusSq, pos.getX(i) ** 2 + pos.getZ(i) ** 2);
            bottom = Math.min(bottom, pos.getY(i));
            top = Math.max(top, pos.getY(i));
          }
        }
        arborModels[index] = { species, form, wood, leaves, trunkRadius, radius: Math.sqrt(radiusSq), bottom, top };
      }
    });
  }
  if (landmarkModels.size !== 3 || arborModels.filter(Boolean).length !== 9)
    throw new Error("校园模型数量不完整");
}

function prepareLeafMaterial(material) {
  // A distant spray occupies a fraction of a pixel. Object-space alpha hashing preserves
  // its filtered coverage, including in the reflection and the single-sample shadow map.
  material.alphaTest = 1 / 255;
  material.alphaHash = true;
  material.roughness = 0.88;
  material.envMapIntensity = 0.18;
  material.onBeforeCompile = (shader) => {
    individualBranches(shader);
    // Broadleaf sprays share an outward/upward normal on either side. Allow some backlighting.
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_begin>",
      T.ShaderChunk.normal_fragment_begin.replace("normal *= faceDirection;", ""),
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <lights_fragment_end>",
      `#include <lights_fragment_end>
       #if NUM_DIR_LIGHTS > 0
       float throughLeaf = pow(clamp(dot(-geometryViewDir, directionalLights[0].direction), 0., 1.), 3.);
       reflectedLight.indirectDiffuse += diffuseColor.rgb * (vec3(.055,.075,.035) + vec3(.15,.21,.07)*throughLeaf);
       #endif`,
    );
  };
}

function placeLandmark(s, root) {
  const asset = landmarkModels.get(s.id),
    base = groundY(s.x, s.z);
  const group = asset.root.clone(true);
  group.position.set(s.x, base, s.z);
  group.userData.site = s;
  group.userData.roofs = asset.proxies.roofs;
  group.traverse((o) => {
    if (!o.isMesh) return;
    o.userData.siteId = s.id;
    o.castShadow = o.receiveShadow = true;
  });
  root.add(group);
  for (const [x, z, w, d, h] of asset.proxies.walls) solid(s, s.x + x, s.z + z, w, d, h, base);
  for (const [x, z, w, d, y] of asset.proxies.steps)
    stairTreads.push({ x: s.x + x, z: s.z + z, w, d, y: base + y });
  return group;
}

function morningReflections(renderer, scene, sun) {
  const width = 128,
    height = 64,
    data = new Float32Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const phi = ((y + 0.5) / height) * Math.PI - Math.PI / 2,
        az = ((x + 0.5) / width - 0.5) * Math.PI * 2;
      const up = Math.sin(phi),
        line = Math.cos(phi);
      const facing = Math.cos(az) * line * sun.x + up * sun.y + Math.sin(az) * line * sun.z;
      const haze = Math.pow(1 - Math.abs(up), 4),
        glow = Math.pow(Math.max(0, facing), 75);
      const sky =
        up >= 0
          ? [0.29 + 0.37 * haze, 0.48 + 0.3 * haze, 0.63 + 0.17 * haze]
          : [0.12 + 0.17 * haze, 0.14 + 0.17 * haze, 0.073 + 0.15 * haze];
      const i = 4 * (y * width + x);
      for (let k = 0; k < 3; k++) data[i + k] = sky[k] + glow * [2.8, 1.85, 0.9][k];
      data[i + 3] = 1;
    }
  const map = new T.DataTexture(data, width, height, T.RGBAFormat, T.FloatType);
  map.mapping = T.EquirectangularReflectionMapping;
  map.needsUpdate = true;
  const pmrem = new T.PMREMGenerator(renderer);
  scene.environment = pmrem.fromEquirectangular(map).texture;
  pmrem.dispose();
  map.dispose();
}

function reflectCampusWindows(renderer, scene, landmarks) {
  const hall = byId.get(121);
  const target = new T.WebGLCubeRenderTarget(128, { type: T.HalfFloatType });
  const probe = new T.CubeCamera(0.35, 700, target);
  probe.position.set(hall.x - 17.8, groundY(hall.x, hall.z) + 5.6, hall.z + 7.5);
  probe.update(renderer, scene);
  const filter = new T.PMREMGenerator(renderer);
  const reflection = filter.fromCubemap(target.texture).texture;
  landmarks.traverse((o) => {
    if (o.isMesh && o.material.name.startsWith("Glass")) {
      o.material.envMap = reflection;
      o.material.roughness = 0.14;
      o.material.metalness = 0.22;
      o.material.envMapIntensity = 1.35;
      o.material.needsUpdate = true;
    }
  });
  filter.dispose();
  target.dispose();
}
