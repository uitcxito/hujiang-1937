// Run the page's own mixer against a repeatable walk. A virtual clock advances
// quiet minutes quickly. For an audition the same events drive native Web Audio.
async function simulateWalkAudio({ seconds, seed, poses, probes = [], trees = hujiang.treeTrunks,
  shrubs = [], render = false, soloWater = false, volumePercent, traceBirds = false }) {
  const rate = 48000;
  const offline = new OfflineAudioContext(render ? 4 : 2, render ? seconds * rate : 1, rate);
  const bytesByURL = new Map(), clips = new Map(), names = new Map();
  for (const [name, url] of Object.entries(campusRecordings)) {
    const bytes = await (await fetch(url)).arrayBuffer();
    const buffer = await offline.decodeAudioData(bytes.slice(0));
    bytesByURL.set(url, bytes);
    clips.set(bytes, buffer);
    names.set(buffer, name);
  }

  const mix = offline.createGain(), outputs = new Map(), pending = [], gusts = [], samples = [];
  let now = 0, filter;
  const levels = {}, birds = [], values = new WeakMap();
  function track(node) {
    const connect = node.connect.bind(node);
    node.connect = (dest) => { outputs.set(node, dest); return connect(dest); };
    const param = node.gain || node.pan;
    if (traceBirds && param) for (const kind of ["setValueAtTime", "setTargetAtTime"]) {
      const apply = param[kind].bind(param);
      param[kind] = (value, ...args) => { values.set(param, value); return apply(value, ...args); };
    }
    return node;
  }
  function createSource() {
    const source = track(offline.createBufferSource());
    const start = source.start.bind(source);
    const stop = source.stop.bind(source);
    let started = false;
    source.start = () => {
      if (render && (source.loop || !soloWater)) { start(now); started = true; }
      if (source.loop) return;
      const end = now + source.buffer.duration;
      const name = names.get(source.buffer);
      const item = { source, end, name };
      pending.push(item);
      if (name.startsWith("leaves-")) gusts.push({ name, start: now, end, ...levels });
      else if (traceBirds) {
        const gain = outputs.get(source), tone = outputs.get(gain);
        item.pan = outputs.get(tone).pan;
        birds.push({ name, start: now, end, hz: tone.frequency.value,
          pan: values.get(item.pan), gain: values.get(gain.gain) });
      }
    };
    source.stop = () => {
      if (started) stop(now);
      const item = pending.find(e => e.source === source);
      if (item) item.end = now;
    };
    // These connections must still exist when the scheduled audio is rendered.
    if (render) source.disconnect = () => {};
    return source;
  }
  const context = {
    get currentTime() { return now; },
    state: "running", destination: mix, resume: async () => {}, suspend: async () => {},
    decodeAudioData: async (data) => clips.get(data),
    createBufferSource: createSource,
    createBiquadFilter: () => (filter = track(offline.createBiquadFilter())),
    createGain: () => track(offline.createGain()),
    createWaveShaper: () => offline.createWaveShaper(),
    createStereoPanner: () => track(offline.createStereoPanner()),
    createDynamicsCompressor: () => offline.createDynamicsCompressor(),
  };
  const original = { AudioContext: window.AudioContext, fetch: window.fetch, random: Math.random };
  try {
    window.AudioContext = function () { return context; };
    window.fetch = async (url) => ({ arrayBuffer: async () => bytesByURL.get(url) });
    Math.random = () => {
      seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const volume = document.createElement("input");
    volume.type = "range";
    const controller = makeWalkAmbience(trees, volume, document.createElement("output"), shrubs);
    volume.value = volumePercent ?? document.querySelector("#ambientVolume").defaultValue;
    controller.unlock();
    await new Promise(resolve => setTimeout(resolve, 0));
    const leafGain = outputs.get(filter), pan = outputs.get(leafGain);
    for (const [name, param] of Object.entries({ gain: leafGain.gain, pan: pan.pan, hz: filter.frequency })) {
      const set = param.setTargetAtTime.bind(param);
      param.setTargetAtTime = (value, time, decay) => {
        levels[name] = value;
        return set(value, time, decay);
      };
    }
    if (render) {
      const merger = offline.createChannelMerger(4);
      merger.connect(offline.destination);
      for (const [node, channel] of [[mix, 0], [pan, 2]]) {
        const split = offline.createChannelSplitter(2);
        node.connect(split);
        split.connect(merger, 0, channel);
        split.connect(merger, 1, channel + 1);
      }
    }

    let segment = 0;
    for (let frame = 0; frame < seconds * 30; frame++) {
      now = frame / 30;
      for (let i = pending.length - 1; i >= 0; i--) {
        if (pending[i].end > now) continue;
        const { source } = pending.splice(i, 1)[0];
        source.onended();
        source.onended = null;
      }
      while (segment + 1 < poses.length && poses[segment + 1].at <= now) segment++;
      const a = poses[segment], b = poses[segment + 1] || a;
      const u = b === a ? 0 : (now - a.at) / (b.at - a.at);
      controller.update({ x: a.x + (b.x - a.x) * u, z: a.z + (b.z - a.z) * u }, a.yaw + (b.yaw - a.yaw) * u);
      if (samples.length < probes.length && now >= probes[samples.length]) {
        const sample = { ...levels };
        if (traceBirds) sample.birds = pending.filter(n => n.pan).map(n => [n.name, values.get(n.pan)]);
        samples.push(sample);
      }
    }
  } finally {
    window.AudioContext = original.AudioContext;
    window.fetch = original.fetch;
    Math.random = original.random;
  }
  if (render) window.walkAudioRender = await offline.startRendering();
  return { gusts, samples, birds };
}

module.exports = { simulateWalkAudio };
