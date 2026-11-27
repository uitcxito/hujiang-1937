const el = (id) => document.getElementById(id);
function explore() {
  const scene = new T.Scene(),
    camera = new T.PerspectiveCamera(61, innerWidth / innerHeight, 0.07, 2500);
  scene.fog = new T.FogExp2(0xc6d6d5, 0.00113);
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  el("view").append(renderer.domElement);
  const screen = renderer.domElement;
  const gl = renderer.getContext(), pendingFrames = [];
  function clearPendingFrames() {
    for (const fence of pendingFrames) gl.deleteSync(fence);
    pendingFrames.length = 0;
  }
  // Poll without waiting. Input and movement keep advancing until the GPU can accept a fresh view.
  function frameQueueFull() {
    while (pendingFrames.length) {
      const fence = pendingFrames[0];
      if (gl.clientWaitSync(fence, 0, 0) === gl.TIMEOUT_EXPIRED) break;
      gl.deleteSync(pendingFrames.shift());
    }
    return pendingFrames.length >= 2;
  }
  screen.addEventListener("webglcontextlost", () => { pendingFrames.length = 0; });
  screen.addEventListener("webglcontextrestored", () => quality());
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
  morningReflections(renderer, scene, sunDirection);
  const sun = new T.DirectionalLight(0xffe4bc, 3.95);
  sun.position.copy(sunDirection).multiplyScalar(90);
  scene.add(sun, sun.target);
  sun.castShadow = true;
  const shadowRight = new V().crossVectors(sun.up, sunDirection).normalize();
  const shadowUp = new V().crossVectors(sunDirection, shadowRight);
  const droneShadowFocus = new V();
  const skyDome = sky(scene, sunDirection);
  const { soil, river } = terrain(scene);
  const shrubPerches = riverGarden(scene);
  const architecture = new T.Group(), landmarks = new T.Group();
  for (const s of sites.filter((s) => s.style !== "landmark"))
    buildSite(s, landmarkModels.has(s.id) ? landmarks : architecture);
  collectTreads(architecture);
  bake(architecture, scene);
  const buildings = scene.children.filter((o) => o.geometry?.getAttribute("siteId"));
  scene.add(landmarks);
  landmarks.traverse(o => { if(o.isMesh) buildings.push(o); });
  dressAuditoriumPaths(scene);
  const trees = vegetation(scene, sun, camera),
    flightSpace = makeFlightSpace(architecture, treeTrunks, landmarks),
    blades = grass(scene);
  reflectCampusWindows(renderer,scene,landmarks);
  const gate = byId.get(190),
    player = new V(),
    drone = new V(),
    target = new V(),
    ray = new T.Raycaster(),
    keys = new Set();
  const walkLook = { yaw: Math.PI / 2, pitch: 0.035 };
  const droneLook = { yaw: 0, pitch: 0 };
  const views = { walk: walkMode, orbit: fullView, drone: droneMode };
  const viewOrder = Object.keys(views);
  // Bird's-eye is an observation camera. A flight stays in progress while looking around.
  let airborne = false;
  let mode = "walk",
    look = walkLook,
    theta = 0.7,
    tilt = 0.91,
    radius = 465,
    selected = null,
    q = 1,
    dirty = true,
    route = [],
    routeSearch = null,
    hintTimer = 0,
    shadowX = Infinity,
    shadowZ = Infinity,
    shadowRange = 0,
    lastArea = 0;
  let viewLabel;
  const ambience = makeWalkAmbience(treeTrunks, el("ambientVolume"), el("ambientValue"), shrubPerches);
  const eye = 1.66;
  const walkSpeed = 2.4;
  const fastWalkSpeed = 4.8;
  const legal = makeWalkSpace(obstacles, treeTrunks, 0.32);
  const drawNearbyMap = makeNearbyMap();
  const touch = matchMedia("(any-pointer: coarse)");
  const mapDialog = el("mapDialog");
  const helpDialog = el("helpDialog");
  const placeCard = el("placeCard");
  const drawWatercolor = makeWatercolorMap((site) => {
    closePanels();
    card(site, true);
    el("landHere").focus({ preventScroll: true });
  }, updateMap);
  const menus = [[el("guide"), el("placesPanel")], [el("settings"), el("settingsPanel")]];
  function sceneInputBlocked() {
    return mapDialog.open || helpDialog.open || menus.some(([, panel]) => !panel.hidden);
  }
  function closePanels() {
    if (placeCard.contains(document.activeElement)) screen.focus({ preventScroll: true });
    placeCard.hidden = true;
    for (const [button, panel] of menus) {
      if (panel.contains(document.activeElement)) button.focus({ preventScroll: true });
      panel.hidden = true;
    }
    dirty = true;
  }
  const marker = new T.Mesh(new T.RingGeometry(0.25, 0.35, 32),
    new T.MeshBasicMaterial({ color: 0xffdc80, polygonOffset: true, polygonOffsetFactor: -2 }));
  marker.name = "walkingDestination";
  marker.rotation.x = -Math.PI / 2;
  marker.visible = false;
  scene.add(marker);
  function clearRoute() {
    routeSearch?.abort();
    routeSearch = null;
    route = [];
    marker.visible = false;
    dirty = true;
  }
  function groundPlayer() {
    let level = groundY(player.x, player.z);
    for (const step of stairTreads)
      if (Math.abs(player.x - step.x) < step.w / 2 && Math.abs(player.z - step.z) < step.d / 2)
        level = Math.max(level, step.y);
    player.y = level + eye;
  }
  function placePlayer(x, z) {
    player.set(x, 0, z);
    groundPlayer();
  }
  function setWalk(x, z, site, { lookX = site.x, lookZ = site.z, pitch = 0.018 } = {}) {
    placePlayer(x, z);
    viewLabel = { name: site.name, x, z };
    walkLook.yaw = Math.atan2(lookX - x, -(lookZ - z));
    walkLook.pitch = pitch;
    setMode("walk");
    el("location").textContent = site.name;
  }
  function gateView() {
    const [x, z] = point(116, 356);
    selected = null;
    setWalk(x, z, gate, { lookX: gate.x + 9, lookZ: gate.z - 0.05 });
  }
  function hint() {
    clearTimeout(hintTimer);
    const mobile = touch.matches;
    el("hint").textContent = mode === "walk"
      ? (mobile ? "点地行走 · 摇杆移动 · 按住疾跑 · 拖动环顾" : "点地行走 · 拖动环顾 · WASD 移动 · Shift 加速")
      : mode === "drone"
        ? (mobile ? "摇杆飞行 · 箭头升降 · 拖动环顾 · 点「步行」降落" : "WASD 飞行 · E / Q 升降 · Shift 加速 · 拖动环顾 · F 降落")
        : (mobile ? "单指旋转 · 双指缩放或平移 · 点建筑看资料" : "拖动旋转 · 右键平移 · 滚轮缩放 · 点建筑看资料");
  }
  function showMovementError(message = "这里无法步行到达，请选择其他地面") {
    clearTimeout(hintTimer);
    el("hint").textContent = message;
    hintTimer = setTimeout(hint, 2400);
  }
  function release(cancelRoute = true) {
    keys.clear();
    controls.reset();
    if (cancelRoute) clearRoute();
  }
  function setMode(next) {
    clearPendingFrames();
    release();
    closePanels();
    mode = next;
    if (next !== "orbit") airborne = next === "drone";
    look = mode === "drone" ? droneLook : walkLook;
    document.body.dataset.mode = mode;
    ambience.setWalking(mode === "walk");
    for (const id of viewOrder) el(id).setAttribute("aria-pressed", String(id === mode));
    el("locationLabel").textContent = "当前位置";
    lastArea = -Infinity;
    dirty = true;
    shadowRange = 0;
    hint();
  }
  function fullView() {
    selected = null;
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
    if (!airborne) {
      drone.set(player.x, flightSurface(player.x, player.z) + 18, player.z);
      flightSpace.constrain(drone);
      droneLook.yaw = walkLook.yaw;
      droneLook.pitch = -0.22;
    }
    selected = null;
    setMode("drone");
    screen.focus();
  }
  function relocate(s) {
    if (s.approach) {
      const [x, z] = point(...s.approach);
      if (legal(x, z)) {
        setWalk(x, z, s, { lookZ: s.z + (s.id === 121 ? 3 : 0), pitch: s.id === 154 ? 0.27 : 0.15 });
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
          setWalk(x, z, s, { pitch: s.id === 154 ? 0.26 : 0.12 });
          return;
        }
      }
    closePanels();
    showMovementError("建筑附近没有可步行的落点，请选择其他地点");
  }
  function showIntroduction(open) {
    el("placeIntro").hidden = !open;
    el("readPlace").setAttribute("aria-expanded", String(open));
    el("readPlace").textContent = open ? "收起介绍" : "建筑介绍";
  }
  el("readPlace").onclick = () => {
    const opening = el("placeIntro").hidden;
    showIntroduction(opening);
    if (opening) el("placeStory").scrollIntoView({ block: "nearest" });
  };
  function card(s, fromMap = false) {
    selected = s;
    placeCard.hidden = false;
    const actions = placeCard.querySelector(".place-actions");
    const intro = el("placeIntro");
    if (fromMap) intro.before(actions);
    else intro.after(actions);
    el("readPlace").hidden = !fromMap;
    showIntroduction(!fromMap);
    if (fromMap) placeCard.querySelector("details").open = false;
    el("typeline").textContent = s.year ? s.year + " · 沪江校舍" : "沪江校园 · 1937";
    el("placeTitle").textContent = s.name;
    el("placeStory").textContent = s.story;
    const anecdote = el("placeAnecdote");
    anecdote.textContent = s.anecdote;
    anecdote.hidden = !s.anecdote;
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
    el("placeReading").scrollTop = 0;
    dirty = true;
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
    el("location").textContent = s.name;
    placeCard.querySelector(".close").focus({ preventScroll: true });
  }
  async function tapScene(x, y) {
    if (sceneInputBlocked()) return;
    camera.updateMatrixWorld();
    ray.setFromCamera(new T.Vector2(x, y), camera);
    const ground = ray.intersectObject(soil, false)[0];
    const water = ray.intersectObject(river, false)[0];
    const surfaceDistance = Math.min(ground?.distance ?? Infinity, water?.distance ?? Infinity);
    const hit = ray.intersectObjects(buildings, false)[0];
    if (mode === "walk") {
      // Grass is traversable. A visible tree in front of a target blocks the pick.
      ray.far = Math.min(surfaceDistance, hit?.distance ?? Infinity);
      const blocked = ray.intersectObjects(trees.trunks, false).length > 0;
      ray.far = Infinity;
      if (blocked) return;
    }
    if (hit && hit.distance < surfaceDistance) {
      if (mode !== "walk" || hit.distance <= 80)
        card(byId.get(hit.object.userData.siteId ?? hit.object.geometry.getAttribute("siteId").getX(hit.face.a)));
      return;
    }
    if (mode !== "walk" || !Number.isFinite(surfaceDistance)) return;
    if (controls.axes.forward || controls.axes.right || ["KeyW", "KeyA", "KeyS", "KeyD"].some((k) => keys.has(k))) return;
    clearRoute();
    hint();
    if (!ground || ground.distance > surfaceDistance) return showMovementError();
    const search = new AbortController();
    routeSearch = search;
    const goal = { x: ground.point.x, z: ground.point.z };
    const result = await findWalkRoute(player.clone(), goal, legal, search.signal);
    if (search.signal.aborted) return;
    routeSearch = null;
    if (!result.length) return showMovementError();
    route = result;
    marker.position.set(goal.x, groundY(goal.x, goal.z) + 0.055, goal.z);
    marker.visible = true;
    dirty = true;
  }
  function walkMode() {
    screen.focus({ preventScroll: true });
    if (airborne) {
      const landing = findDroneLanding(drone.x, drone.z, legal);
      if (!landing) {
        if (mode === "orbit") droneMode();
        else closePanels();
        showMovementError("请飞到可步行地面上方再降落");
        return;
      }
      placePlayer(landing.x, landing.z);
      walkLook.yaw = droneLook.yaw;
      walkLook.pitch = 0;
    }
    setMode("walk");
  }
  function quality() {
    clearPendingFrames();
    q = Number(el("quality").value);
    trees.setHighQuality(q === 2);
    // In high quality the leaf depth pass also masks expensive ground, water and sky pixels.
    soil.renderOrder = q === 2 ? 2 : 0;
    river.renderOrder = q === 2 ? 3 : 0;
    skyDome.renderOrder = q === 2 ? 5 : -100;
    renderer.setPixelRatio(Math.min(devicePixelRatio, [0.8, 1.25, 1.75][q]));
    renderer.setSize(innerWidth, innerHeight);
    const resolution = Math.min([1024, 2048, 3072][q], renderer.capabilities.maxTextureSize);
    if (sun.shadow.mapSize.x !== resolution) {
      sun.shadow.mapSize.setScalar(resolution);
      sun.shadow.map?.dispose();
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
      const { yaw, pitch } = look;
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
    if (mode === "orbit" || sceneInputBlocked()) return;
    const axes = controls.axes;
    const fast = axes.sprint || keys.has("ShiftLeft") || keys.has("ShiftRight");
    const speed = mode === "drone" ? (fast ? 32 : 12) : (fast ? fastWalkSpeed : walkSpeed);
    if (route.length) {
      let remaining = dt * speed;
      while (route.length && remaining > 0) {
        const next = route[0], dx = next.x - player.x, dz = next.z - player.z;
        const distance = Math.hypot(dx, dz);
        if (distance < 0.001) {
          route.shift();
          continue;
        }
        const step = Math.min(remaining, distance, 0.14);
        const x = player.x + step * dx / distance, z = player.z + step * dz / distance;
        if (!legal(x, z)) {
          clearRoute();
          showMovementError();
          break;
        }
        player.x = x;
        player.z = z;
        remaining -= step;
        if (step === distance) route.shift();
      }
      if (!route.length) marker.visible = false;
      groundPlayer();
      dirty = true;
      return;
    }
    const f = axes.forward + Number(keys.has("KeyW")) - Number(keys.has("KeyS")),
      r = axes.right + Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
    const mag = Math.hypot(f, r);
    const lift = mode === "drone" ? Math.sign(axes.lift + Number(keys.has("KeyE")) - Number(keys.has("KeyQ"))) : 0;
    if (!mag && !lift) return;
    const distance = (dt * speed) / Math.max(1, mag);
    const { yaw } = look;
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
    look.yaw += dx * 0.0021;
    const limit = mode === "drone" ? Math.PI / 2 - 0.005 : 1.32;
    look.pitch = T.MathUtils.clamp(look.pitch - dy * 0.0021, -limit, limit);
    dirty = true;
  }
  function pan(dx, dy) {
    const k = radius * 0.0016;
    target.x += (-dx * Math.cos(theta) + dy * Math.sin(theta)) * k;
    target.z += (dx * Math.sin(theta) + dy * Math.cos(theta)) * k;
    dirty = true;
  }
  const controls = bindCampusControls(screen, {
    mode: () => mode,
    enabled: () => !sceneInputBlocked(),
    tap: tapScene,
    unlock: () => ambience.unlock(),
    manual() { clearRoute(); ambience.unlock(); },
    pan,
    zoom(factor) { radius = T.MathUtils.clamp(radius * factor, 9, 900); dirty = true; },
    rotate(dx, dy) {
      if (mode !== "orbit") return rotate(dx, dy);
      theta -= dx * 0.005;
      tilt = T.MathUtils.clamp(tilt - dy * 0.005, 0.03, 1.51);
      dirty = true;
    },
  });
  function locationName(pos) {
    if (mode === "walk" && viewLabel && Math.hypot(pos.x - viewLabel.x, pos.z - viewLabel.z) < 8) return viewLabel.name;
    const nearest = sites.reduce((a, s) =>
      Math.hypot(s.x - pos.x, s.z - pos.z) < Math.hypot(a.x - pos.x, a.z - pos.z) ? s : a,
    );
    const distance = Math.hypot(nearest.x - pos.x, nearest.z - pos.z);
    if (mode === "walk") return distance < 27 ? nearest.name : "校园道路与草地";
    const air = mode === "drone" ? "上空" : "";
    if (groundY(pos.x, pos.z) < riverLevel) return "黄浦江" + air;
    if (distance < 38) return nearest.name + air;
    if (!inPolygon(pos.x / SCALE + 780, pos.z / SCALE + 370, boundary)) return "校园外围";
    return "校园" + air;
  }
  function updateMap() {
    const pos = mode === "orbit" ? target : mode === "walk" ? player : drone;
    if (mapDialog.open) drawWatercolor(pos, look.yaw, mode, route, locationName(pos));
    else drawNearbyMap(pos, look.yaw, mode, route);
  }
  function toggleMap() {
    if (mapDialog.open) {
      mapDialog.close();
      return;
    }
    release(false);
    mapDialog.showModal();
    updateMap();
    el("mapToggle").setAttribute("aria-expanded", "true");
    dirty = true;
  }
  el("mapToggle").onclick = toggleMap;
  el("mapClose").onclick = () => mapDialog.close();
  mapDialog.addEventListener("close", () => {
    el("mapToggle").setAttribute("aria-expanded", String(mapDialog.open));
    dirty = true;
  });
  function showHelp() {
    release(false);
    helpDialog.showModal();
  }
  el("showHelp").onclick = showHelp;
  function showInitialHelp() {
    const seen = "hujiang.controlsSeen";
    try {
      if (localStorage.getItem(seen) === "1") return;
      localStorage.setItem(seen, "1");
    } catch {
      // Some offline and private browsing contexts restrict storage.
    }
    screen.focus({ preventScroll: true });
    showHelp();
  }
  window.addEventListener("keydown", (e) => {
    if (e.defaultPrevented || e.isComposing) return;
    if (e.key === "Escape") {
      e.preventDefault();
      if (e.repeat) return;
      if (helpDialog.open) helpDialog.close();
      else if (mapDialog.open) mapDialog.close();
      else {
        if (placeCard.hidden) release();
        closePanels();
      }
      return;
    }
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.isContentEditable ||
        e.target.closest?.("input,select,textarea") || helpDialog.open) return;
    if (e.code === "KeyM") {
      e.preventDefault();
      if (!e.repeat) toggleMap();
      return;
    }
    if (sceneInputBlocked()) return;
    const liftKey = mode === "drone" && (e.code === "KeyQ" || e.code === "KeyE");
    if (liftKey || ["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(e.code)) {
      e.preventDefault();
      if (!e.code.startsWith("Shift")) clearRoute();
      keys.add(e.code);
      ambience.unlock();
    }
    if (e.code === "KeyV" || e.code === "KeyF") {
      e.preventDefault();
      if (e.repeat) return;
      if (e.code === "KeyV") {
        const nextIndex = (viewOrder.indexOf(mode) + 1) % viewOrder.length;
        views[viewOrder[nextIndex]]();
      } else if (mode === "drone") walkMode();
      else droneMode();
      ambience.unlock();
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => release());
  document.addEventListener("visibilitychange", () => release());
  function fitPanels() {
    document.documentElement.style.setProperty("--visible-height", (window.visualViewport?.height || innerHeight) + "px");
  }
  fitPanels();
  window.visualViewport?.addEventListener("resize", fitPanels);
  touch.addEventListener("change", hint);
  window.addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    quality();
  });
  for (const id of viewOrder) el(id).onclick = views[id];
  el("home").onclick = gateView;
  el("quality").onchange = quality;
  for (const [button, panel] of menus) {
    button.onclick = () => {
      release();
      const opening = panel.hidden;
      closePanels();
      panel.hidden = !opening;
      if (panel.id === "placesPanel" && opening) el("placeQuery").focus();
    };
  }
  for (const button of document.querySelectorAll(".close")) button.onclick = closePanels;
  const pinLayer = document.createElement("div");
  pinLayer.id = "pins";
  el("view").append(pinLayer);
  const pins = [121, 153, 154, 163, 141, 142, 112, 104, 180, 181, 190].map((id) => {
    const s = byId.get(id),
      b = document.createElement("button");
    b.textContent = s.name.split(" · ")[0];
    b.onclick = () => {
      if (placeCard.hidden) focus(s);
      else card(s);
    };
    pinLayer.append(b);
    return { s, b };
  });
  function updatePins() {
    pinLayer.hidden = mode !== "orbit" || !el("pinToggle").checked;
    if (pinLayer.hidden) return;
    const corner = document.querySelector(".map-corner").getBoundingClientRect();
    const used = [[corner.left, corner.top, corner.right, corner.bottom]];
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
    const q = el("placeQuery").value.trim().toLowerCase();
    el("placeList").replaceChildren();
    for (const s of [gate, ...sites.filter((s) => s !== gate)]) {
      if (![s.name, ...(s.aliases || [])].some((name) => name.toLowerCase().includes(q))) continue;
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
    ambience.update(player, walkLook.yaw);
    if (!dirty || frameQueueFull()) return;
    aim();
    updatePins();
    updateMap();
    blades(camera.position, q, camera.position.y - groundY(camera.position.x, camera.position.z) < 8);
    setupShadows();
    if (mode === "drone") {
      const height = Math.round(drone.y - flightSurface(drone.x, drone.z));
      const label = "飞行高度 " + height + " 米";
      if (el("locationLabel").textContent !== label) el("locationLabel").textContent = label;
    }
    if (mode !== "orbit" && now - lastArea > 350) {
      el("location").textContent = locationName(mode === "drone" ? drone : player);
      lastArea = now;
    }
    renderer.render(scene, camera);
    if (q === 2 && gl.fenceSync) {
      const fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      if (fence) pendingFrames.push(fence);
    }
    dirty = false;
  }
  render(performance.now());
  el("loading").hidden = true;
  showInitialHelp();
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
    await Promise.all([prepareSurfaces(), prepareModels()]);
    explore();
  } catch (error) {
    console.error(error);
    el("loading").textContent =
      "校园加载失败。请在开启硬件加速的 Edge 或 Chrome 中打开。 " + error.message;
  }
});
