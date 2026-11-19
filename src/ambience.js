function makeWalkAmbience(trees, volume, readout, shrubs = []) {
  const Context = window.AudioContext || window.webkitAudioContext;
  const savedVolume = "hujiang.walkVolume";
  try {
    const saved = localStorage.getItem(savedVolume);
    if (saved !== null && /^(100|[1-9]?\d)$/.test(saved)) volume.value = saved;
  } catch {
    // File URLs and private browsing can restrict storage.
  }
  let context, master, river, birds, leafFilter, leafGain, leafPan;
  let walking = true, pauseTimer;
  let nextGust, nextMix = 0;
  let canopyX, canopyZ, canopyYaw;
  const leaves = { clips: [], source: null, last: null };
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
      birds.stop();
      leaves.source?.stop();
      river.silence(context.currentTime);
      context.suspend().catch(() => {});
    }
    // Let the audio clock finish the fade even when the tab stops drawing frames.
    pauseTimer = setTimeout(pause, 320);
  }
  async function decode(url) {
    const response = await fetch(url);
    if (response.ok === false) throw new Error("录音读取失败");
    return context.decodeAudioData(await response.arrayBuffer());
  }
  async function loadRecording(name, url) {
    try {
      let buffer;
      try {
        buffer = await decode(url);
      } catch (error) {
        if (!campusMp3Recordings[name]) throw error;
        buffer = await decode(campusMp3Recordings[name]);
      }
      if (name === "river") {
        river.start(buffer);
      } else if (name.startsWith("leaves-")) {
        leaves.clips.push(buffer);
      } else {
        birds.add(name, buffer);
      }
    } catch (error) {
      console.warn("无法读取环境录音", name, error);
    }
  }
  function fieldCompressor() {
    const node = context.createDynamicsCompressor();
    node.threshold.value = -7;
    node.knee.value = 3;
    node.ratio.value = 18;
    node.attack.value = 0.002;
    node.release.value = 0.14;
    return node;
  }
  function unlock() {
    if (!Context || !audible() || context?.state === "running") return;
    if (!context) {
      context = new Context();
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
      // Leave typical calls linear. The soft knee reserves space for a gust,
      // a wave crest and three birds coinciding at full listening volume.
      const ceiling = context.createWaveShaper();
      ceiling.curve = Float32Array.from({ length: 4097 }, (_, i) => {
        const x = i / 2048 - 1, a = Math.abs(x);
        return a <= 0.74 ? x : Math.sign(x) * (0.74 + 0.21 * Math.tanh((a - 0.74) / 0.21));
      });
      ceiling.connect(master);
      river = makeRiverAudio(context, ceiling, fieldCompressor, blend);
      const birdBus = context.createGain();
      // Approved bird stem at the default listening volume (70%).
      birdBus.gain.value = 0.82916 * 10 ** (-1.78 / 20) / (0.85 * 0.7);
      birdBus.connect(ceiling);
      birds = makeCampusBirdsong(context, birdBus, trees, shrubs);
      leafFilter = context.createBiquadFilter();
      leafFilter.type = "lowpass";
      leafGain = context.createGain();
      leafGain.gain.value = 0;
      leafPan = context.createStereoPanner();
      leafFilter.connect(leafGain).connect(leafPan).connect(fieldCompressor()).connect(ceiling);
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

  function playLeaves() {
    const choices = leaves.clips.length > 1 ? leaves.clips.filter((c) => c !== leaves.last) : leaves.clips;
    leaves.last = choices[Math.floor(Math.random() * choices.length)];
    const source = context.createBufferSource();
    source.buffer = leaves.last;
    source.connect(leafFilter);
    source.onended = () => {
      source.disconnect();
      if (leaves.source === source) leaves.source = null;
    };
    leaves.source = source;
    source.start();
    return source.buffer.duration;
  }
  function leafQuietTime() {
    return Math.random() < 0.75 ? 20 + 30 * Math.random() : 65 + 35 * Math.random();
  }
  function blend(param, target, now, seconds) {
    if (targets.get(param) === target) return;
    param.setTargetAtTime(target, now, seconds);
    targets.set(param, target);
  }
  function mixCanopies(x, z, yaw, rightX, rightZ, now) {
    if (x === canopyX && z === canopyZ && yaw === canopyYaw) return;
    canopyX = x;
    canopyZ = z;
    canopyYaw = yaw;
    let nearestLevel = 0, weightSum = 0, panSum = 0;
    for (const tree of trees) {
      const dx = tree.x - x, dz = tree.z - z;
      const radius = tree.crownRadius ?? 0, reach = radius + 20;
      const distanceSq = dx * dx + dz * dz;
      if (distanceSq >= reach * reach) continue;
      const distance = Math.sqrt(distanceSq);
      const level = 1 - T.MathUtils.smoothstep(distance - radius, 0, 20);
      const weight = level * level;
      // Blend nearby directions and centre the sound as the listener passes under a crown.
      panSum += weight * (dx * rightX + dz * rightZ) / Math.max(distance, radius, 1);
      weightSum += weight;
      nearestLevel = Math.max(nearestLevel, level);
    }
    blend(leafGain.gain, nearestLevel, now, 0.14);
    blend(leafFilter.frequency, 2200 + 9000 * nearestLevel, now, 0.16);
    blend(leafPan.pan, weightSum ? 0.8 * panSum / weightSum : 0, now, 0.12);
  }
  function update(player, yaw) {
    if (context?.state !== "running" || !audible()) return;
    const now = context.currentTime;
    if (now < nextMix) return;
    nextMix = now + 0.1;
    const { x, z } = player;
    const shore = shoreDistance(x, z);
    const rightX = Math.cos(yaw), rightZ = Math.sin(yaw);
    river.update(x, z, yaw, now);
    birds.update(player, yaw, now, shore);
    mixCanopies(x, z, yaw, rightX, rightZ, now);
    // One breeze passes through the campus. Entering another crown only changes the mix.
    if (nextGust === undefined) nextGust = now + leafQuietTime();
    if (!leaves.source && leaves.clips.length && now >= nextGust) {
      nextGust = now + playLeaves() + leafQuietTime();
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
