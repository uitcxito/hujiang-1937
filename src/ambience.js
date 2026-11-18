function makeWalkAmbience(trees, volume, readout) {
  const Context = window.AudioContext || window.webkitAudioContext;
  const savedVolume = "hujiang.walkVolume";
  try {
    const saved = localStorage.getItem(savedVolume);
    if (saved !== null && /^(100|[1-9]?\d)$/.test(saved)) volume.value = saved;
  } catch {
    // File URLs and private browsing can restrict storage.
  }
  let context, master, waterGain, waterPan, birdGain, birdPan;
  let walking = true, pauseTimer;
  let bird, perch, lastCall, nextCall = 0, nextMix = 0;
  const calls = [];
  const targets = new Map();

  function showVolume() {
    const label = volume.valueAsNumber ? volume.value + "%" : "静音";
    volume.setAttribute("aria-valuetext", label);
    readout.value = Context ? label : "不可用";
  }
  volume.disabled = !Context;
  showVolume();

  function audible() {
    return walking && !document.hidden && volume.valueAsNumber > 0;
  }
  function syncPlayback() {
    if (!context) return;
    clearTimeout(pauseTimer);
    const now = context.currentTime;
    if (audible()) {
      master.gain.setTargetAtTime(0.85 * volume.valueAsNumber / 100, now, 0.07);
      // A browser interruption can require another gesture to resume.
      context.resume().catch(() => {});
      nextMix = 0;
      return;
    }
    master.gain.setTargetAtTime(0, now, 0.045);
    function pause() {
      if (audible()) return;
      if (bird) bird.stop();
      nextCall = 0;
      context.suspend().catch(() => {});
    }
    if (document.hidden) pause();
    else pauseTimer = setTimeout(pause, 320);
  }
  async function loadRecording(name, url) {
    try {
      const response = await fetch(url);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      if (name === "river") {
        const water = context.createBufferSource();
        water.buffer = buffer;
        water.loop = true;
        water.connect(waterGain);
        water.start();
      } else {
        calls.push(buffer);
      }
    } catch (error) {
      console.warn("无法读取环境录音", name, error);
    }
  }
  function unlock() {
    if (!Context || !audible() || context?.state === "running") return;
    if (!context) {
      context = new Context();
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
      // Leave room for a nearby call and a wave crest to coincide, even at full volume.
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -7;
      limiter.knee.value = 3;
      limiter.ratio.value = 18;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.14;
      limiter.connect(master);
      waterGain = context.createGain();
      waterGain.gain.value = 0;
      waterPan = context.createStereoPanner();
      waterGain.connect(waterPan).connect(limiter);
      birdGain = context.createGain();
      birdPan = context.createStereoPanner();
      birdGain.connect(birdPan).connect(limiter);
      for (const [name, url] of Object.entries(campusRecordings)) loadRecording(name, url);
    }
    syncPlayback();
  }
  volume.addEventListener("input", () => {
    showVolume();
    try {
      localStorage.setItem(savedVolume, volume.value);
    } catch {}
    if (context) syncPlayback();
    else unlock();
  });
  document.addEventListener("visibilitychange", syncPlayback);

  function pickPerch(x, z) {
    const nearby = [];
    let nearest, shortest = Infinity;
    for (const tree of trees) {
      const distance = Math.hypot(tree.x - x, tree.z - z);
      if (distance < shortest) {
        nearest = tree;
        shortest = distance;
      }
      if (distance >= 5 && distance <= 32) nearby.push(tree);
    }
    return nearby[Math.floor(Math.random() * nearby.length)] || nearest;
  }
  function sing(now) {
    const choices = calls.length > 1 ? calls.filter((c) => c !== lastCall) : calls;
    lastCall = choices[Math.floor(Math.random() * choices.length)];
    const source = context.createBufferSource();
    source.buffer = lastCall;
    source.connect(birdGain);
    source.onended = () => {
      source.disconnect();
      if (bird === source) bird = null;
    };
    bird = source;
    source.start();
    nextCall = now + source.buffer.duration + 1.7 + Math.random() * 3.8;
  }
  function blend(param, target, now, seconds) {
    if (targets.get(param) === target) return;
    param.setTargetAtTime(target, now, seconds);
    targets.set(param, target);
  }
  function update(player, yaw) {
    if (context?.state !== "running" || !audible()) return;
    const now = context.currentTime;
    if (now < nextMix) return;
    nextMix = now + 0.1;
    const { x, z } = player;
    const shore = shoreDistance(x, z);
    const nearWater = 1 - T.MathUtils.smoothstep(shore, 3, 55);
    const rightX = Math.cos(yaw), rightZ = Math.sin(yaw);
    blend(waterGain.gain, nearWater * 0.95, now, 0.24);
    if (nearWater > 0) {
      // The negative distance gradient points from the path toward the river.
      const dx = shore - shoreDistance(x + 1, z), dz = shore - shoreDistance(x, z + 1);
      const pan = (dx * rightX + dz * rightZ) / (Math.hypot(dx, dz) || 1);
      blend(waterPan.pan, 0.6 * pan, now, 0.12);
    }
    if (!bird && calls.length && now >= nextCall) {
      perch = pickPerch(x, z);
      if (perch) sing(now);
    }
    if (bird) {
      const dx = perch.x - x, dz = perch.z - z;
      const distance = Math.max(1, Math.hypot(dx, dz));
      const level = Math.min(1, 14 / distance) * (1 - 0.45 * nearWater);
      blend(birdGain.gain, level, now, 0.1);
      blend(birdPan.pan, 0.8 * (dx * rightX + dz * rightZ) / distance, now, 0.09);
    }
  }
  return {
    unlock,
    update,
    setWalking(value) {
      walking = value;
      syncPlayback();
    },
  };
}
