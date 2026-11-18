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
  scene.add(new T.HemisphereLight(0xe2efff, 0xb7a58b, 1.55));
  // Early summer morning, with the light coming across the avenue from the river.
  const sunDirection = new V(0.89, 0.43, 0.4).normalize();
  const sun = new T.DirectionalLight(0xffe4bc, 3.95);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  const shadowRight = new V().crossVectors(sun.up, sunDirection).normalize();
  const shadowUp = new V().crossVectors(sunDirection, shadowRight);
  const droneShadowFocus = new V();
  sky(scene, sunDirection);
  terrain(scene);
  riverGarden(scene);
  const architecture = new T.Group();
  for (const s of sites.filter((s) => s.style !== "landmark")) buildSite(s, architecture);
  collectTreads(architecture);
  bake(architecture, scene);
  const buildings = scene.children.filter((o) => o.geometry?.getAttribute("siteId"));
  const trees = vegetation(scene),
    flightSpace = makeFlightSpace(architecture, treeTrunks),
    blades = grass(scene);
  const gate = byId.get(190),
    player = new V(),
    drone = new V(),
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
  let viewLabel, groundLook;
  const ambience = makeWalkAmbience(treeTrunks, el("ambientVolume"), el("ambientValue"));
  const eye = 1.66,
    collisionRadius = 0.32;
  function legal(x, z) {
    if (!inPolygon(x / SCALE + 780, z / SCALE + 370, boundary) || shoreDistance(x, z) < 1.05)
      return false;
    for (const o of obstacles) {
      let dx = x - o.x,
        dz = z - o.z;
      if (o.angle) {
        const co = Math.cos(o.angle),
          si = Math.sin(o.angle);
        [dx, dz] = [co * dx - si * dz, si * dx + co * dz];
      }
      if (Math.abs(dx) < o.w / 2 + collisionRadius && Math.abs(dz) < o.d / 2 + collisionRadius)
        return false;
    }
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
    el("cross").hidden = !locked || mode === "orbit";
    if (mode === "drone") {
      let look = "拖动环顾";
      if (locked) look = "鼠标环顾 · Esc 释放";
      else if (!lookFallback) look += " · 点击空地锁定鼠标";
      el("hint").textContent = "WASD 飞行 · E 上升 / Q 下降 · Shift 加速 · " + look;
      return;
    }
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
    if (mode === "drone" && next === "orbit") {
      yaw = groundLook.yaw;
      pitch = groundLook.pitch;
    }
    mode = next;
    ambience.setWalking(mode === "walk");
    for (const id of ["walk", "orbit", "drone"]) el(id).setAttribute("aria-pressed", String(id === mode));
    el("locationLabel").textContent = "当前位置";
    lastArea = -Infinity;
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
  function droneMode() {
    if (mode === "drone") {
      screen.focus();
      return;
    }
    groundLook = { yaw, pitch };
    if (mode === "orbit") {
      aim();
      drone.copy(camera.position);
      flightSpace.constrain(drone);
      const dx = target.x - drone.x,
        dz = target.z - drone.z;
      yaw = Math.atan2(dx, -dz);
      pitch = Math.atan2(target.y - drone.y, Math.hypot(dx, dz));
    } else {
      drone.set(player.x, flightSurface(player.x, player.z) + 18, player.z);
      flightSpace.constrain(drone);
      pitch = -0.22;
    }
    selected = null;
    for (const id of ["placesPanel", "settingsPanel", "placeCard"]) el(id).hidden = true;
    setMode("drone");
    screen.focus();
  }
  function landDrone() {
    function land(x, z) {
      setWalk(x, z, x + Math.sin(yaw), z - Math.cos(yaw));
      el("placeCard").hidden = true;
      screen.focus();
    }
    if (legal(drone.x, drone.z)) return land(drone.x, drone.z);
    // Look outward from the aircraft, even over the river. The last walking position is a known safe fallback.
    const limit = Math.hypot(drone.x - player.x, drone.z - player.z);
    for (let r = 2; r < limit; r += Math.max(2, r * 0.12)) {
      for (let i = 0; i < 24; i++) {
        const a = yaw + i * (Math.PI / 12);
        const x = drone.x + r * Math.sin(a),
          z = drone.z - r * Math.cos(a);
        if (legal(x, z)) return land(x, z);
      }
    }
    land(player.x, player.z);
  }
  function relocate(s) {
    if (s.approach) {
      const [x, z] = point(...s.approach);
      if (legal(x, z)) {
        setWalk(x, z, s.x, s.z + (s.id === 121 ? 3 : 0));
        pitch = s.id === 154 ? 0.27 : 0.15;
        viewLabel = { name: s.name, x, z };
        el("location").textContent = s.name;
        return;
      }
    }
    const distance = s.style === "gate" ? 11 : Math.max(s.w, s.d) * 0.54 + 9;
    for (const scale of [1, 1.4, 1.9])
      for (const a of [
        Math.PI - (s.photoView?.azimuth ?? -0.64),
        2.52,
        -2.55,
        1.95,
        -1.7,
        0.5,
        -0.48,
        0,
        Math.PI,
      ]) {
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
    el("typeline").textContent = s.year ? s.year + " · 沪江校舍" : "沪江校园 · 1937";
    el("placeTitle").textContent = s.name;
    el("placeStory").textContent = s.story;
    const record = s.record;
    el("evidence").textContent = record.observed;
    el("inference").textContent = "复原推定 · " + record.inferred;
    const links = el("photoLinks");
    links.replaceChildren();
    for (const [label, url] of record.links || []) {
      const a = document.createElement("a");
      a.textContent = label + " ↗";
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      links.append(a);
    }
    el("sourceLink").href = record.source;
    el("sourceLink").hidden = record.source === ARCHIVE;
    el("mapSource").href = ARCHIVE;
    el("location").textContent = s.name;
    el("placeReading").scrollTop = 0;
    el("placeCard").querySelector(".close").focus({ preventScroll: true });
  }
  function focus(s) {
    const view = s.photoView;
    target.set(s.x, groundY(s.x, s.z) + (view?.height ?? Math.min(s.h * 0.44, 8)), s.z);
    radius = view?.distance ?? Math.max(s.w, s.d, s.h) * 1.62 + 10;
    // Increase distance on narrow windows so that the long façades still fit.
    radius *= Math.max(1, 1.48 / camera.aspect);
    theta = view?.azimuth ?? -0.64;
    tilt = view?.tilt ?? 1.12;
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
    if (mode === "drone") {
      landDrone();
    } else if (mode === "orbit" && selected) {
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
    sun.shadow.mapSize.setScalar(Math.min([1024, 2048, 3072][q], renderer.capabilities.maxTextureSize));
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
    dirty = true;
    shadowRange = 0;
  }
  function setupShadows() {
    const aerial = mode !== "walk";
    let anchor = player,
      range = 55;
    if (mode === "orbit") {
      anchor = target;
      range = T.MathUtils.clamp(radius * 0.78, 40, 390);
    } else if (mode === "drone") {
      const altitude = drone.y - flightSurface(drone.x, drone.z);
      range = T.MathUtils.clamp(55 + Math.ceil(altitude / 10) * 24, 55, 390);
      anchor = camera.getWorldDirection(droneShadowFocus).multiplyScalar(range * 0.4).add(drone);
    }
    if (
      Math.abs(range - shadowRange) < 0.1 &&
      Math.hypot(anchor.x - shadowX, anchor.z - shadowZ) < (aerial ? 4 : 5)
    )
      return;
    shadowRange = range;
    shadowX = anchor.x;
    shadowZ = anchor.z;
    sun.target.position.set(shadowX, 0, shadowZ);
    // Keep static edges on the same texels when the shadow camera follows the visitor.
    const texel = (2 * range) / sun.shadow.mapSize.x;
    for (const axis of [shadowRight, shadowUp]) {
      const offset = sun.target.position.dot(axis);
      sun.target.position.addScaledVector(axis, Math.round(offset / texel) * texel - offset);
    }
    // At a shallow sun angle, tall or distant casters can be well upstream of the receiver.
    const depth = (range + 40) / sunDirection.y;
    sun.position.copy(sun.target.position).addScaledVector(sunDirection, depth);
    Object.assign(sun.shadow.camera, {
      left: -range,
      right: range,
      top: range,
      bottom: -range,
      near: 0.5,
      far: 2 * depth,
    });
    sun.shadow.bias = -0.04 / (2 * depth);
    sun.shadow.normalBias = Math.max(0.022, texel * 0.35);
    sun.shadow.camera.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
  }
  function aim() {
    if (mode !== "orbit") {
      const position = mode === "drone" ? drone : player;
      camera.position.copy(position);
      camera.up.set(0, 1, 0);
      camera.lookAt(
        position.x + Math.sin(yaw) * Math.cos(pitch),
        position.y + Math.sin(pitch),
        position.z - Math.cos(yaw) * Math.cos(pitch),
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
    if (mode === "orbit" || !keys.size) return;
    const f = Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
      r = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
    const mag = Math.hypot(f, r);
    const lift = mode === "drone" ? Number(keys.has("KeyE")) - Number(keys.has("KeyQ")) : 0;
    if (!mag && !lift) return;
    const fast = keys.has("ShiftLeft") || keys.has("ShiftRight");
    const speed = mode === "drone" ? (fast ? 32 : 12) : (fast ? 3.95 : 2);
    const distance = (dt * speed) / Math.max(1, mag);
    const dx = (Math.sin(yaw) * f + Math.cos(yaw) * r) * distance,
      dz = (-Math.cos(yaw) * f + Math.sin(yaw) * r) * distance;
    dirty = true;
    if (mode === "drone") {
      flightSpace.move(drone, dx, lift * dt * (fast ? 16 : 7), dz);
      return;
    }
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.14));
    for (let i = 0; i < steps; i++) {
      if (legal(player.x + dx / steps, player.z)) player.x += dx / steps;
      if (legal(player.x, player.z + dz / steps)) player.z += dz / steps;
    }
    groundPlayer();
  }
  function rotate(dx, dy) {
    yaw += dx * 0.0021;
    const limit = mode === "drone" ? Math.PI / 2 - 0.005 : 1.32;
    pitch = T.MathUtils.clamp(pitch - dy * 0.0021, -limit, limit);
    dirty = true;
  }
  function pan(dx, dy) {
    const k = radius * 0.0016;
    target.x += (-dx * Math.cos(theta) + dy * Math.sin(theta)) * k;
    target.z += (dx * Math.sin(theta) + dy * Math.cos(theta)) * k;
    dirty = true;
  }
  screen.addEventListener("pointerdown", (e) => {
    ambience.unlock();
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
    if (mode !== "orbit" && locked) {
      rotate(e.movementX, e.movementY);
      return;
    }
    if (!drag) return;
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (Math.hypot(e.clientX - drag.ox, e.clientY - drag.oy) > 3) drag.moved = true;
    if (mode !== "orbit") rotate(dx, dy);
    else if (drag.pan) pan(dx, dy);
    else {
      theta -= dx * 0.005;
      tilt = T.MathUtils.clamp(tilt - dy * 0.005, 0.03, 1.51);
      dirty = true;
    }
  });
  screen.addEventListener("pointerup", (e) => {
    ambience.unlock();
    const clicked = !!drag && !drag.moved && e.button === 0;
    drag = null;
    if (!clicked) return;
    const x = locked ? 0 : (e.clientX / innerWidth) * 2 - 1,
      y = locked ? 0 : 1 - (e.clientY / innerHeight) * 2;
    if (choose(x, y)) return;
    el("placeCard").hidden = true;
    if (mode !== "orbit" && !locked) {
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
    if (locked) lookFallback = false;
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
    if (e.target.matches("input,select,textarea") || e.altKey || e.ctrlKey || e.metaKey) return;
    const liftKey = mode === "drone" && (e.code === "KeyQ" || e.code === "KeyE");
    if (liftKey || ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(e.code)) {
      e.preventDefault();
      keys.add(e.code);
      ambience.unlock();
    }
    if (e.code === "KeyV" && !e.repeat) mode === "orbit" ? walkMode() : fullView();
    if (e.code === "KeyF" && !e.repeat) mode === "drone" ? walkMode() : droneMode();
    if (e.code === "KeyV" || e.code === "KeyF") ambience.unlock();
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
  el("drone").onclick = droneMode;
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
      if (![s.name, ...(s.aliases || [])].some((name) => name.includes(q))) continue;
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
  for (const id of ["walk", "home", "landHere"]) el(id).addEventListener("click", ambience.unlock);
  quality();
  gateView();
  let last = performance.now();
  function render(now) {
    requestAnimationFrame(render);
    const dt = Math.min(0.12, (now - last) / 1000);
    last = now;
    advance(dt);
    ambience.update(player, yaw);
    if (!dirty) return;
    aim();
    updatePins();
    if (trees(camera.position, q)) renderer.shadowMap.needsUpdate = true;
    blades(camera.position, q, camera.position.y - groundY(camera.position.x, camera.position.z) < 8);
    setupShadows();
    if (mode === "drone") {
      const height = Math.round(drone.y - flightSurface(drone.x, drone.z));
      const label = "飞行高度 " + height + " 米";
      if (el("locationLabel").textContent !== label) el("locationLabel").textContent = label;
    }
    if (mode !== "orbit" && now - lastArea > 350 && el("placeCard").hidden) {
      const pos = mode === "drone" ? drone : player;
      const nearest = sites.reduce((a, s) =>
        Math.hypot(s.x - pos.x, s.z - pos.z) < Math.hypot(a.x - pos.x, a.z - pos.z) ? s : a,
      );
      if (mode === "drone") {
        let area = "校园上空";
        if (groundY(pos.x, pos.z) < riverLevel) area = "黄浦江上空";
        else if (Math.hypot(nearest.x - pos.x, nearest.z - pos.z) < 38) area = nearest.name + "上空";
        else if (!inPolygon(pos.x / SCALE + 780, pos.z / SCALE + 370, boundary)) area = "校园外围";
        el("location").textContent = area;
      } else {
        el("location").textContent = viewLabel && Math.hypot(pos.x - viewLabel.x, pos.z - viewLabel.z) < 8
          ? viewLabel.name
          : Math.hypot(nearest.x - pos.x, nearest.z - pos.z) < 27
            ? nearest.name
            : "校园道路与草地";
      }
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
