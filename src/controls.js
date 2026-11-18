function bindCampusControls(screen, actions) {
  const fingers = new Map(), heldLift = new Map();
  const stick = el("stick"), knob = el("stickKnob");
  let stickId = null;
  const axes = { forward: 0, right: 0, lift: 0 };
  function resetStick() {
    stickId = null;
    axes.forward = axes.right = 0;
    knob.style.transform = "";
  }
  function reset() {
    fingers.clear();
    heldLift.clear();
    axes.lift = 0;
    resetStick();
  }
  function moveStick(e) {
    if (e.pointerId !== stickId) return;
    const box = stick.getBoundingClientRect();
    const radius = box.width * 0.31;
    const dx = (e.clientX - box.left - box.width / 2) / radius;
    const dy = (e.clientY - box.top - box.height / 2) / radius;
    const magnitude = Math.max(1, Math.hypot(dx, dy));
    axes.right = dx / magnitude;
    axes.forward = -dy / magnitude;
    knob.style.transform = "translate(" + axes.right * radius + "px," + -axes.forward * radius + "px)";
  }
  stick.onpointerdown = (e) => {
    if (stickId !== null || e.button !== 0) return;
    stickId = e.pointerId;
    stick.setPointerCapture(e.pointerId);
    actions.manual();
    moveStick(e);
  };
  stick.onpointermove = moveStick;
  stick.onpointerup = stick.onpointercancel = stick.onlostpointercapture = (e) => {
    if (e.pointerId === stickId) resetStick();
  };
  function updateLift() {
    axes.lift = Math.sign([...heldLift.values()].reduce((sum, n) => sum + n, 0));
  }
  for (const [button, sign] of [[el("ascend"), 1], [el("descend"), -1]]) {
    button.onpointerdown = (e) => {
      if (e.button !== 0) return;
      button.setPointerCapture(e.pointerId);
      heldLift.set(e.pointerId, sign);
      updateLift();
    };
    button.onpointerup = button.onpointercancel = button.onlostpointercapture = (e) => {
      heldLift.delete(e.pointerId);
      updateLift();
    };
    button.onkeydown = (e) => {
      if (e.code !== "Space" && e.code !== "Enter") return;
      e.preventDefault();
      heldLift.set(button, sign);
      updateLift();
    };
    button.onkeyup = button.onblur = () => {
      heldLift.delete(button);
      updateLift();
    };
  }
  const sceneView = screen.parentElement;
  sceneView.onpointerdown = (e) => {
    if (!actions.enabled() || (e.button !== 0 && e.button !== 2)) return;
    screen.focus({ preventScroll: true });
    actions.unlock();
    screen.setPointerCapture(e.pointerId);
    fingers.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY,
      pin: e.target.closest("#pins button"), pan: e.button === 2 || e.shiftKey, moved: false });
    if (fingers.size > 1) for (const finger of fingers.values()) finger.moved = true;
  };
  sceneView.onpointermove = (e) => {
    const finger = fingers.get(e.pointerId);
    if (!finger) return;
    const x = e.clientX, y = e.clientY;
    const dx = x - finger.x, dy = y - finger.y;
    if (!finger.moved && Math.hypot(x - finger.startX, y - finger.startY) < (e.pointerType === "touch" ? 7 : 3)) return;
    finger.moved = true;
    if (fingers.size === 2 && actions.mode() === "orbit") {
      const other = [...fingers.values()].find((p) => p !== finger);
      const before = Math.hypot(finger.x - other.x, finger.y - other.y);
      const after = Math.hypot(x - other.x, y - other.y);
      actions.pan(dx / 2, dy / 2);
      if (after > 4 && before > 4) actions.zoom(before / after);
    } else if (fingers.size === 1) {
      if (finger.pan && actions.mode() === "orbit") actions.pan(dx, dy);
      else actions.rotate(dx, dy);
    }
    finger.x = x;
    finger.y = y;
  };
  sceneView.onpointerup = (e) => {
    const finger = fingers.get(e.pointerId);
    fingers.delete(e.pointerId);
    if (finger && !finger.moved && e.button === 0 &&
        Math.hypot(e.clientX - finger.startX, e.clientY - finger.startY) < (e.pointerType === "touch" ? 7 : 3)) {
      if (finger.pin) return finger.pin.click();
      const rect = screen.getBoundingClientRect();
      actions.tap((e.clientX - rect.left) / rect.width * 2 - 1, 1 - (e.clientY - rect.top) / rect.height * 2);
    }
  };
  sceneView.onpointercancel = sceneView.onlostpointercapture = (e) => fingers.delete(e.pointerId);
  sceneView.oncontextmenu = (e) => e.preventDefault();
  sceneView.addEventListener("wheel", (e) => {
    if (actions.mode() !== "orbit") return;
    e.preventDefault();
    actions.zoom(Math.exp(e.deltaY * 0.001));
  }, { passive: false });
  return { axes, reset };
}
