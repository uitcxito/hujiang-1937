function makeWalkAmbience(trees, volume, readout) {
  const Context = window.AudioContext || window.webkitAudioContext;
  const savedVolume = "hujiang.walkVolume";
  try {
    const saved = localStorage.getItem(savedVolume);
    if (saved !== null && /^(100|[1-9]?\d)$/.test(saved)) volume.value = saved;
  } catch {
    // File URLs and private browsing can restrict storage.
  }
  let context, master, waterGain, waterPan, birdGain, birdPan, leafFilter, leafGain, leafPan;
  let walking = true, pauseTimer;
  let perch, nextCall = 0, nextGust, nextMix = 0;
  let canopyX, canopyZ, canopyYaw;
  const birds = { clips: [], source: null, last: null };
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
      birds.source?.stop();
      leaves.source?.stop();
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
        const voice = name.startsWith("leaves-") ? leaves : birds;
        voice.clips.push(buffer);
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
      // All three sounds can coincide at a tree beside the river.
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
      leafFilter = context.createBiquadFilter();
      leafFilter.type = "lowpass";
      leafGain = context.createGain();
      leafGain.gain.value = 0;
      leafPan = context.createStereoPanner();
      leafFilter.connect(leafGain).connect(leafPan).connect(limiter);
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
  function playClip(voice, output) {
    const choices = voice.clips.length > 1 ? voice.clips.filter((c) => c !== voice.last) : voice.clips;
    voice.last = choices[Math.floor(Math.random() * choices.length)];
    const source = context.createBufferSource();
    source.buffer = voice.last;
    source.connect(output);
    source.onended = () => {
      source.disconnect();
      if (voice.source === source) voice.source = null;
    };
    voice.source = source;
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
    const nearWater = 1 - T.MathUtils.smoothstep(shore, 3, 55);
    const rightX = Math.cos(yaw), rightZ = Math.sin(yaw);
    blend(waterGain.gain, nearWater * 0.95, now, 0.24);
    if (nearWater > 0) {
      // The negative distance gradient points from the path toward the river.
      const dx = shore - shoreDistance(x + 1, z), dz = shore - shoreDistance(x, z + 1);
      const pan = (dx * rightX + dz * rightZ) / (Math.hypot(dx, dz) || 1);
      blend(waterPan.pan, 0.6 * pan, now, 0.12);
    }
    if (!birds.source && birds.clips.length && now >= nextCall) {
      perch = pickPerch(x, z);
      if (perch) nextCall = now + playClip(birds, birdGain) + 1.7 + Math.random() * 3.8;
    }
    if (birds.source) {
      const dx = perch.x - x, dz = perch.z - z;
      const distance = Math.max(1, Math.hypot(dx, dz));
      const level = Math.min(1, 14 / distance) * (1 - 0.45 * nearWater);
      blend(birdGain.gain, level, now, 0.1);
      blend(birdPan.pan, 0.8 * (dx * rightX + dz * rightZ) / distance, now, 0.09);
    }
    mixCanopies(x, z, yaw, rightX, rightZ, now);
    // One breeze passes through the campus. Entering another crown only changes the mix.
    if (nextGust === undefined) nextGust = now + leafQuietTime();
    if (!leaves.source && leaves.clips.length && now >= nextGust) {
      nextGust = now + playClip(leaves, leafFilter) + leafQuietTime();
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
