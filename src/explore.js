const el = (id) => document.getElementById(id);
function explore() {
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(61, innerWidth / innerHeight, 0.07, 2500);
  scene.fog = new T.FogExp2(0xc6d6d5, 0.00113);
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  el("view").append(renderer.domElement);
  const screen = renderer.domElement;
  screen.tabIndex = 0;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  scene.add(new T.HemisphereLight(0xf0f6ff, 0xa89978, 1.5));
  const sun = new T.DirectionalLight(0xffedcd, 2.43);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  sun.shadow.bias = -0.00027;
  sun.shadow.normalBias = 0.026;
  sky(scene);
  terrain(scene);
  riverGarden(scene);
  const architecture = new T.Group();
  for (const s of sites.filter((s) => s.style !== "landmark")) buildSite(s, architecture);
  collectTreads(architecture);
  bake(architecture, scene);
  const buildings = scene.children.filter((o) => o.geometry?.getAttribute("siteId"));
  const trees = vegetation(scene),
    blades = grass(scene);
  const gate = byId.get(190),
    player = new V(),
    target = new V(),
    ray = new T.Raycaster(),
    keys = new Set();
  let mode = "walk",
    yaw = Math.PI / 2,
    pitch = 0.035,
    theta = 0.7,
    tilt = 0.91,
    radius = 465,
    selected = null,
    q = 1,
    dirty = true,
    drag = null,
    lookFallback = false,
    locked = false,
    shadowX = Infinity,
    shadowZ = Infinity,
    shadowRange = 0,
    lastArea = 0;
  let viewLabel;
  const eye = 1.66,
    collisionRadius = 0.32;
  function legal(x, z) {
    if (!inPolygon(x / SCALE + 780, z / SCALE + 370, boundary) || shoreDistance(x, z) < 1.05)
      return false;
    for (const o of obstacles)
      if (Math.abs(x - o.x) < o.w / 2 + collisionRadius && Math.abs(z - o.z) < o.d / 2 + collisionRadius)
        return false;
    for (const t of treeTrunks)
      if ((x - t.x) ** 2 + (z - t.z) ** 2 < (t.r + collisionRadius) ** 2) return false;
    return true;
  }
  function groundPlayer() {
    let level = groundY(player.x, player.z);
    for (const step of stairTreads)
      if (Math.abs(player.x - step.x) < step.w / 2 && Math.abs(player.z - step.z) < step.d / 2)
        level = Math.max(level, step.y);
    player.y = level + eye;
  }
  function setWalk(x, z, lookX, lookZ) {
    player.set(x, 0, z);
    groundPlayer();
    viewLabel = null;
    yaw = Math.atan2(lookX - x, -(lookZ - z));
    pitch = 0.018;
    setMode("walk");
  }
  function gateView() {
    const [x, z] = point(116, 356);
    selected = null;
    el("placeCard").hidden = true;
    setWalk(x, z, gate.x + 9, gate.z - 0.05);
    el("location").textContent = gate.name;
    el("placesPanel").hidden = true;
    el("settingsPanel").hidden = true;
  }
  function hint() {
    el("cross").hidden = !locked || mode !== "walk";
    el("hint").textContent =
      mode === "orbit"
        ? "拖动旋转 · 右键平移 · 滚轮缩放 · 点击建筑查看资料"
        : locked
          ? "WASD 行走 · Shift 加速 · 点击建筑查看资料 · Esc 释放鼠标"
          : lookFallback
            ? "拖动环顾 · WASD 行走 · 点击建筑查看资料"
            : "点击空地开始漫游 · WASD 行走 · 鼠标环顾";
  }
  function release() {
    if (document.pointerLockElement === screen) document.exitPointerLock();
    keys.clear();
    drag = null;
  }
  function setMode(next) {
    release();
    mode = next;
    el("walk").setAttribute("aria-pressed", String(mode === "walk"));
    el("orbit").setAttribute("aria-pressed", String(mode === "orbit"));
    dirty = true;
    shadowRange = 0;
    hint();
  }
  function fullView() {
    selected = null;
    el("placeCard").hidden = true;
    target.set(-22, 0, 3);
    radius = Math.max(338, 610 / Math.max(0.7, camera.aspect));
    theta = -0.075;
    tilt = 0.49;
    setMode("orbit");
    el("location").textContent = "全校园";
  }
  function relocate(s) {
    if (s.id === 121) {
      const [x, z] = point(825, 379);
      if (legal(x, z)) {
        setWalk(x, z, s.x, s.z + 3);
        pitch = 0.15;
        viewLabel = { name: s.name, x, z };
        return;
      }
    }
    const distance = s.style === "gate" ? 11 : Math.max(s.w, s.d) * 0.54 + 9;
    for (const scale of [1, 1.4, 1.9])
      for (const a of [2.52, -2.55, 1.95, -1.7, 0.5, -0.48, 0, Math.PI]) {
        const x = s.x + Math.sin(a) * distance * scale,
          z = s.z - Math.cos(a) * distance * scale;
        if (legal(x, z)) {
          setWalk(x, z, s.x, s.z);
          pitch = s.id === 154 ? 0.26 : 0.12;
          el("location").textContent = s.name;
          return;
        }
      }
    gateView();
  }
  function card(s) {
    selected = s;
    el("placeCard").hidden = false;
    el("placesPanel").hidden = true;
    el("settingsPanel").hidden = true;
    el("typeline").textContent = s.year ? s.year + "　·　沪江校舍" : "沪江校园　·　1937";
    el("placeTitle").textContent = s.name;
    el("placeStory").textContent = s.story;
    let notes =
      "史料可证：老图中的位置与用途。合理推定：按占地描取的尺寸、层高、门窗排列与色彩。环境补景：树木个体、草叶、路面颗粒及天气。";
    if (s.id === 121)
      notes =
        "史料可证：L形联体、思魏堂在北侧、双联扁拱和尖券长窗。合理推定：屋脊高度、窗格数量、砖色和背立面。环境补景：附近树木与地表细节。";
    if (s.id === 142)
      notes =
        "史料可证：1928年原馆位于科学馆东隅。战后才形成对称东翼和连接塔楼。合理推定：战前原馆的窗格、山墙和檐部细节。环境补景：草坪与树丛。";
    if (s.style === "landmark")
      notes =
        "史料可证：图中的区域名称和边界关系。合理推定：岸线宽度、路径宽度与地表材料。环境补景：植被个体、苗床细节与远方树线。";
    if (s.id === 190)
      notes =
        "史料可证：1916年启用，位于图中门房旁。合理推定：柱身、开启的铁门、题字位置及门洞净宽。环境补景：校门外接近道路的地面与植被。";
    el("evidence").textContent = notes;
    el("sourceLink").href = s.source;
    el("mapSource").href = ARCHIVE;
    el("location").textContent = s.name;
  }
  function focus(s) {
    target.set(s.x, Math.min(s.h * 0.44, 8), s.z);
    radius = Math.max(s.w, s.d, s.h) * 1.62 + 10;
    theta = -0.74;
    tilt = 1.12;
    setMode("orbit");
    card(s);
  }
  function choose(x, y) {
    camera.updateMatrixWorld();
    ray.setFromCamera(new T.Vector2(x, y), camera);
    const hit = ray.intersectObjects(buildings, false)[0];
    if (!hit || (mode === "walk" && hit.distance > 80)) return false;
    release();
    card(byId.get(hit.object.geometry.getAttribute("siteId").getX(hit.face.a)));
    return true;
  }
  function walkMode() {
    if (mode === "orbit" && selected) {
      relocate(selected);
      el("placeCard").hidden = true;
    } else if (mode === "orbit") {
      setMode("walk");
      groundPlayer();
      el("location").textContent = "地面步行";
    } else {
      release();
      screen.focus();
    }
  }
  function quality() {
    q = Number(el("quality").value);
    renderer.setPixelRatio(Math.min(devicePixelRatio, [0.8, 1.25, 1.75][q]));
    renderer.setSize(innerWidth, innerHeight);
    sun.shadow.mapSize.setScalar([1024, 2048, 3072][q]);
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
    dirty = true;
    shadowRange = 0;
  }
  function setupShadows() {
    const aerial = mode === "orbit",
      anchor = aerial ? target : player,
      range = aerial ? Math.min(390, Math.max(35, radius * 0.67)) : 43;
    if (
      Math.abs(range - shadowRange) < 0.1 &&
      Math.hypot(anchor.x - shadowX, anchor.z - shadowZ) < (aerial ? 4 : 5)
    )
      return;
    shadowRange = range;
    shadowX = anchor.x;
    shadowZ = anchor.z;
    sun.target.position.set(shadowX, 0, shadowZ);
    sun.position.set(shadowX - 180, 285, shadowZ + 115);
    Object.assign(sun.shadow.camera, {
      left: -range,
      right: range,
      top: range,
      bottom: -range,
      near: 0.5,
      far: 850,
    });
    sun.shadow.camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
  }
  function aim() {
    if (mode === "walk") {
      camera.position.copy(player);
      camera.up.set(0, 1, 0);
      camera.lookAt(
        player.x + Math.sin(yaw) * Math.cos(pitch),
        player.y + Math.sin(pitch),
        player.z - Math.cos(yaw) * Math.cos(pitch),
      );
    } else {
      camera.position.set(
        target.x + radius * Math.sin(tilt) * Math.sin(theta),
        target.y + radius * Math.cos(tilt),
        target.z + radius * Math.sin(tilt) * Math.cos(theta),
      );
      camera.lookAt(target);
    }
    camera.updateMatrixWorld();
  }
  function advance(dt) {
    if (mode !== "walk" || !keys.size) return;
    let f = Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
      r = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
    const mag = Math.hypot(f, r);
    if (!mag) return;
    const fast = keys.has("ShiftLeft") || keys.has("ShiftRight"),
      distance = (dt * (fast ? 3.95 : 2.0)) / mag;
    const dx = (Math.sin(yaw) * f + Math.cos(yaw) * r) * distance,
      dz = (-Math.cos(yaw) * f + Math.sin(yaw) * r) * distance,
      steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.14));
    for (let i = 0; i < steps; i++) {
      if (legal(player.x + dx / steps, player.z)) player.x += dx / steps;
      if (legal(player.x, player.z + dz / steps)) player.z += dz / steps;
    }
    groundPlayer();
    dirty = true;
  }
  function rotate(dx, dy) {
    yaw += dx * 0.0021;
    pitch = T.MathUtils.clamp(pitch - dy * 0.0021, -1.32, 1.32);
    dirty = true;
  }
  function pan(dx, dy) {
    const k = radius * 0.0016;
    target.x += (-dx * Math.cos(theta) + dy * Math.sin(theta)) * k;
    target.z += (dx * Math.sin(theta) + dy * Math.cos(theta)) * k;
    dirty = true;
  }
  screen.addEventListener("pointerdown", (e) => {
    screen.focus();
    drag = {
      x: e.clientX,
      y: e.clientY,
      ox: e.clientX,
      oy: e.clientY,
      pan: e.button === 2 || e.shiftKey,
      moved: false,
    };
    if (!locked) screen.setPointerCapture(e.pointerId);
  });
  document.addEventListener("pointermove", (e) => {
    if (mode === "walk" && locked) {
      rotate(e.movementX, e.movementY);
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (Math.hypot(e.clientX - drag.ox, e.clientY - drag.oy) > 3) drag.moved = true;
    if (mode === "walk") rotate(dx, dy);
    else if (drag.pan) pan(dx, dy);
    else {
      theta -= dx * 0.005;
      tilt = T.MathUtils.clamp(tilt - dy * 0.005, 0.03, 1.51);
      dirty = true;
    }
  });
  screen.addEventListener("pointerup", (e) => {
    const clicked = !!drag && !drag.moved && e.button === 0;
    drag = null;
    if (!clicked) return;
    const x = locked ? 0 : (e.clientX / innerWidth) * 2 - 1,
      y = locked ? 0 : 1 - (e.clientY / innerHeight) * 2;
    if (choose(x, y)) return;
    el("placeCard").hidden = true;
    if (mode === "walk" && !locked) {
      try {
        const result = screen.requestPointerLock();
        result?.catch(() => {
          lookFallback = true;
          hint();
        });
      } catch {
        lookFallback = true;
        hint();
      }
    }
  });
  screen.addEventListener("contextmenu", (e) => e.preventDefault());
  screen.addEventListener(
    "wheel",
    (e) => {
      if (mode !== "orbit") return;
      e.preventDefault();
      radius = T.MathUtils.clamp(radius * Math.exp(e.deltaY * 0.001), 9, 900);
      dirty = true;
    },
    { passive: false },
  );
  document.addEventListener("pointerlockchange", () => {
    locked = document.pointerLockElement === screen;
    drag = null;
    keys.clear();
    hint();
  });
  document.addEventListener("pointerlockerror", () => {
    lookFallback = true;
    hint();
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      release();
      for (const id of ["placesPanel", "settingsPanel", "placeCard"]) el(id).hidden = true;
      return;
    }
    if (e.target.matches("input,select,textarea")) return;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(e.code)) {
      e.preventDefault();
      keys.add(e.code);
    }
    if (e.code === "KeyV" && !e.repeat) {
      mode === "walk" ? fullView() : walkMode();
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => {
    keys.clear();
    drag = null;
  });
  document.addEventListener("visibilitychange", () => {
    keys.clear();
    dirty = true;
  });
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    quality();
  });
  el("walk").onclick = walkMode;
  el("orbit").onclick = fullView;
  el("home").onclick = gateView;
  el("quality").onchange = quality;
  for (const [button, panel] of [
    ["guide", "placesPanel"],
    ["settings", "settingsPanel"],
  ])
    el(button).onclick = () => {
      release();
      const was = el(panel).hidden;
      for (const id of ["placesPanel", "settingsPanel", "placeCard"]) el(id).hidden = true;
      el(panel).hidden = !was;
      if (panel === "placesPanel" && was) el("placeQuery").focus();
    };
  document
    .querySelectorAll(".close")
    .forEach((b) => (b.onclick = () => (b.closest("section").hidden = true)));
  const pinLayer = document.createElement("div");
  pinLayer.id = "pins";
  document.body.append(pinLayer);
  const pins = [121, 153, 154, 163, 141, 142, 112, 104, 180, 181, 190].map((id) => {
    const s = byId.get(id),
      b = document.createElement("button");
    b.textContent = s.name.split(" · ")[0];
    b.onclick = () => focus(s);
    pinLayer.append(b);
    return { s, b };
  });
  function updatePins() {
    pinLayer.hidden = mode !== "orbit" || !el("pinToggle").checked;
    if (pinLayer.hidden) return;
    const used = [];
    for (const { s, b } of pins) {
      const v = new V(s.x, s.h + 2.2, s.z).project(camera),
        x = ((v.x + 1) * innerWidth) / 2,
        y = ((1 - v.y) * innerHeight) / 2;
      const w = s.name.length * 11 + 18;
      const rect = [x - w / 2, y - 20, x + w / 2, y + 2];
      b.hidden =
        v.z < 0 ||
        v.z > 1 ||
        x < 40 ||
        x > innerWidth - 38 ||
        y < 95 ||
        y > innerHeight - 93 ||
        used.some(
          (a) => rect[0] < a[2] + 3 && rect[2] > a[0] - 3 && rect[1] < a[3] + 2 && rect[3] > a[1] - 2,
        );
      if (!b.hidden) {
        used.push(rect);
        b.style.left = x + "px";
        b.style.top = y + "px";
      }
    }
  }
  el("pinToggle").onchange = () => {
    dirty = true;
  };
  function list() {
    const q = el("placeQuery").value.trim();
    el("placeList").replaceChildren();
    for (const s of [gate, ...sites.filter((s) => s !== gate)]) {
      if (!s.name.includes(q)) continue;
      const b = document.createElement("button");
      b.textContent = s.name;
      const small = document.createElement("small");
      small.textContent = s.year || "定位 ↗";
      b.append(small);
      b.onclick = () => focus(s);
      el("placeList").append(b);
    }
  }
  el("placeQuery").oninput = list;
  list();
  el("landHere").onclick = () => {
    if (selected) relocate(selected);
    el("placeCard").hidden = true;
  };
  quality();
  gateView();
  let last = performance.now();
  function render(now) {
    requestAnimationFrame(render);
    const dt = Math.min(0.12, (now - last) / 1000);
    last = now;
    advance(dt);
    if (!dirty) return;
    aim();
    updatePins();
    trees(camera.position, q);
    blades(camera.position, q, camera.position.y - groundY(camera.position.x, camera.position.z) < 8);
    setupShadows();
    if (mode === "walk" && now - lastArea > 700 && el("placeCard").hidden) {
      const nearest = sites.reduce((a, s) =>
        Math.hypot(s.x - player.x, s.z - player.z) < Math.hypot(a.x - player.x, a.z - player.z) ? s : a,
      );
      el("location").textContent =
        viewLabel && Math.hypot(player.x - viewLabel.x, player.z - viewLabel.z) < 8
          ? viewLabel.name
          : Math.hypot(nearest.x - player.x, nearest.z - player.z) < 27
            ? nearest.name
            : "校园道路与草地";
      lastArea = now;
    }
    renderer.render(scene, camera);
    dirty = false;
  }
  render(performance.now());
  el("loading").hidden = true;
  window.hujiang = {
    sites,
    scene,
    camera,
    renderer,
    obstacles,
    treeTrunks,
    legal,
    gateView,
    fullView,
    focus: (id) => focus(byId.get(Number(id))),
    get mode() {
      return mode;
    },
    get player() {
      return player.clone();
    },
    setView: (x, y, z, r, t, p) => {
      setMode("orbit");
      target.set(x, y, z);
      radius = r;
      theta = t;
      tilt = p;
      el("location").textContent = "校园鸟瞰";
      dirty = true;
    },
  };
}
window.addEventListener("load", async () => {
  try {
    await prepareSurfaces();
    explore();
  } catch (error) {
    console.error(error);
    el("loading").textContent =
      "校园加载失败。请在开启硬件加速的 Edge 或 Chrome 中打开。 " + error.message;
  }
});
