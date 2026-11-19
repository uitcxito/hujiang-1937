function showBirdCredits() {
  const list = document.getElementById("birdCredits");
  function link(text, url, rel) {
    const a = document.createElement("a");
    a.textContent = text;
    a.href = url;
    a.target = "_blank";
    a.rel = rel;
    return a;
  }
  for (const clip of campusBirdLibrary) {
    const item = document.createElement("li");
    item.append(clip.species + "（" + clip.location + "） · ",
      link(clip.credit, clip.observation, "noopener"), " · ",
      link(clip.license, clip.licenseUrl, "license noopener"));
    list.append(item);
  }
}
showBirdCredits();

function makeCampusBirdsong(context, output, trees, shrubs) {
  // A walk gets its own sequence, independent of the timing of wind gusts.
  let seed = Math.floor(Math.random() * 4294967296);
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }
  const pick = (items) => items[Math.floor(random() * items.length)];
  const clips = new Map(), lastClip = new Map();
  let lastLead, nextGroup = 0, nextThird = 12, nextDove = 8;
  let lastX, lastZ;
  const voices = [
    { level: 1, range: 14, min: 5, max: 23, hz: 12500 },
    { level: 0.57, range: 22, min: 16, max: 39, hz: 7600 },
    { level: 0.39, range: 31, min: 25, max: 54, hz: 6150 },
  ];
  for (const voice of voices) {
    voice.gain = context.createGain();
    voice.pan = context.createStereoPanner();
    const tone = context.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = voice.hz;
    tone.Q.value = -3; // Web Audio expresses low-pass Q in dB.
    voice.gain.connect(tone).connect(voice.pan).connect(output);
  }
  function add(id, buffer) {
    const species = id.split("-")[0];
    if (!clips.has(species)) clips.set(species, []);
    clips.get(species).push(buffer);
  }
  function variants(species, slot) {
    const takes = clips.get(species);
    return takes.filter(c => (takes.length === 1 || c !== lastClip.get(species)) &&
      (slot !== 2 || c.duration <= 2.5));
  }
  function stop() {
    for (const voice of voices) {
      voice.note = null;
      if (voice.source) voice.source.stop();
      voice.source = null;
    }
    nextGroup = 0;
    lastX = lastZ = undefined;
  }
  function around(points, x, z) {
    const sites = [];
    for (const site of points) {
      const dx = site.x - x, dz = site.z - z, d = Math.hypot(dx, dz);
      if (d <= 67) sites.push({ x: site.x, z: site.z, d, dx, dz });
    }
    return sites;
  }
  function compose(now, player, shore) {
    const { x, z } = player, canopy = around(trees, x, z), brush = around(shrubs, x, z);
    const wooded = canopy.filter(p => p.d < 32).length >= 5 && shore > 12;
    const open = shore < 48 || inPolygon(x / SCALE + 780, z / SCALE + 370, track);
    const selected = [];
    function choose(slot, start) {
      const voice = voices[slot];
      const inRange = (p) => p.d >= voice.min && p.d <= voice.max;
      let branches = canopy.filter(inRange);
      if (!slot && !branches.length) branches = canopy.filter(p => p.d >= 2 && p.d < 42);
      const bushes = brush.filter(inRange), distant = canopy.filter(p => p.d >= 27 && p.d <= 57);
      const available = new Map();
      for (const species of clips.keys()) {
        if (selected.some(n => n.species === species) || !variants(species, slot).length) continue;
        let sites = branches;
        if (species === "parrotbill") sites = bushes;
        if (species === "dove") {
          if (!slot || now < nextDove || random() > 0.23) continue;
          sites = distant;
        }
        if (species === "swallow") {
          if (!open) continue;
          const angle = random() * Math.PI * 2, d = voice.min + (voice.max - voice.min) * random();
          const dx = d * Math.cos(angle), dz = d * Math.sin(angle);
          sites = [{ x: x + dx, z: z + dz, dx, dz, d, vx: -2.1 * Math.sin(angle), vz: 2.1 * Math.cos(angle) }];
        }
        if (slot) sites = sites.filter(p => selected.every(n => Math.hypot(p.x - n.site.x, p.z - n.site.z) >= 7));
        if (sites.length) available.set(species, sites);
      }
      if (!available.size) return;
      if (!slot && available.size > 1) available.delete(lastLead);
      const species = pick([...available.keys()]);
      let sites = available.get(species);
      if (slot) {
        const separated = sites.filter(p => selected.every(({ site }) =>
          p.dx * site.dx + p.dz * site.dz < 0.35 * p.d * site.d));
        if (separated.length) sites = separated;
      }
      const buffer = pick(variants(species, slot)), site = pick(sites);
      const note = { species, site, buffer, start, end: start + buffer.duration };
      voice.note = note;
      selected.push(note);
      return note;
    }
    const lead = choose(0, now);
    if (!lead) { nextGroup = now + 2; return; }
    lastLead = lead.species;
    if (random() < (shore < 12 ? 0.27 : 0.74)) {
      const reply = choose(1, now + Math.min(1.35, lead.buffer.duration * (0.30 + random() * 0.18)));
      if (reply && wooded && now >= nextThird && random() < 0.30) {
        const overlap = Math.min(lead.end, reply.end) - reply.start;
        if (overlap >= 0.35) choose(2, reply.start + Math.min(0.48, overlap * 0.38));
      }
    }
    nextGroup = Math.max(...selected.map(n => n.end)) + 2 + random() * 3.2 + (shore < 12 ? 3.0 : 0);
  }
  function update(player, yaw, now, shore) {
    if (lastX !== undefined && Math.hypot(player.x - lastX, player.z - lastZ) > 18) stop();
    lastX = player.x;
    lastZ = player.z;
    if (clips.size && now >= nextGroup && voices.every(v => !v.note && !v.source)) compose(now, player, shore);
    const bank = 1 - T.MathUtils.smoothstep(shore, 3, 55);
    for (const voice of voices) {
      const n = voice.note;
      if (!n || now < n.start) continue;
      if (!voice.source && now >= n.end) { voice.note = null; continue; }
      const elapsed = now - n.start, site = n.site;
      const dx = site.x + (site.vx || 0) * elapsed - player.x;
      const dz = site.z + (site.vz || 0) * elapsed - player.z;
      const height = n.species === "parrotbill" ? 1.2 : n.species === "dove" ? 6.4 : 4.2;
      const d = Math.max(1, Math.hypot(dx, dz, height - 1.66));
      const scale = n.species === "dove" ? 0.28 : voice.level;
      const level = scale * Math.min(1, voice.range / d) * (1 - 0.47 * bank);
      const pan = 0.83 * (dx * Math.cos(yaw) + dz * Math.sin(yaw)) / d;
      if (!voice.source) {
        for (const [param, value] of [[voice.gain.gain, level], [voice.pan.pan, pan]]) {
          param.cancelScheduledValues(now);
          param.setValueAtTime(value, now);
        }
        const source = context.createBufferSource();
        source.buffer = n.buffer;
        source.connect(voice.gain);
        source.onended = () => {
          source.disconnect();
          if (voice.source === source) { voice.source = null; voice.note = null; }
        };
        voice.source = source;
        lastClip.set(n.species, n.buffer);
        if (n.species === "dove") nextDove = now + 65 + random() * 30;
        if (voice === voices[2]) nextThird = now + 45;
        source.start();
      } else {
        if (level !== voice.lastLevel) voice.gain.gain.setTargetAtTime(level, now, 0.10);
        if (pan !== voice.lastPan) voice.pan.pan.setTargetAtTime(pan, now, 0.09);
      }
      voice.lastLevel = level;
      voice.lastPan = pan;
    }
  }
  return { add, update, stop };
}
