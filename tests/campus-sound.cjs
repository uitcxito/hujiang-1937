const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { simulateWalkAudio } = require("./helpers/walk-audio.cjs");

const root = path.resolve(__dirname, "..");
const garden = { x: 232.053004, z: -70.005896 }, bank = { x: 279.558566, z: -81.778839 };
const face = Math.atan2(0.7984765, -0.6020259);
const pose = (at, point, yaw = face) => ({ at, ...point, yaw });
const rate = 48000;

// The two approved auditions are stereo PCM16. Read the RIFF chunks so metadata
// can change without moving the listening windows.
function readAudition(file) {
  const bytes = fs.readFileSync(path.join(root, "试听/江水调轻", file));
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  for (let p = 12; p + 8 <= bytes.length;) {
    const id = bytes.toString("ascii", p, p + 4), size = bytes.readUInt32LE(p + 4);
    p += 8;
    if (id === "fmt ") {
      assert.equal(bytes.readUInt16LE(p), 1);
      assert.equal(bytes.readUInt16LE(p + 2), 2);
      assert.equal(bytes.readUInt32LE(p + 4), rate);
      assert.equal(bytes.readUInt16LE(p + 14), 16);
    }
    if (id === "data") return bytes.subarray(p, p + size);
    p += size + size % 2;
  }
  throw new Error("Missing PCM in " + file);
}

// Mean square in stereo and after folding both channels to mono.
function referenceLevels(bytes, from, to) {
  let stereo = 0, mono = 0;
  const begin = Math.round(from * rate), end = Math.round(to * rate);
  for (let i = begin; i < end; i++) {
    const l = bytes.readInt16LE(i * 4) / 32768, r = bytes.readInt16LE(i * 4 + 2) / 32768;
    stereo += (l * l + r * r) / 2;
    mono += ((l + r) / 2) ** 2;
  }
  return [stereo, mono].map(v => v / (end - begin));
}

async function checkWater(page) {
  const walking = readAudition("01-生物园到江边.wav"), stations = readAudition("02-蓝线外到红线内.wav");
  const dx = bank.x - garden.x, dz = bank.z - garden.z, length = Math.hypot(dx, dz);
  const yaw = Math.atan2(dx, -dz);
  const route = [0, 12, 35.5, 12 + length / 2, 37, 38, 39, 45].map(at => {
    const progress = Math.min(1, Math.max(0, (at - 12) * 2 / length));
    const turn = Math.min(1, Math.max(0, (at - 35.5) / 3.5));
    return pose(at, { x: garden.x + dx * progress, z: garden.z + dz * progress },
      yaw + (face - yaw) * turn ** 2 * (3 - 2 * turn));
  });
  async function render(seconds, poses, windows) {
    await page.evaluate(simulateWalkAudio, { seed: 193706, seconds, poses, render: true, soloWater: true, volumePercent: 70 });
    return page.evaluate(windows => {
      const audio = window.walkAudioRender, l = audio.getChannelData(0), r = audio.getChannelData(1);
      return windows.map(([a, b]) => {
        const start = Math.round(a * audio.sampleRate), end = Math.round(b * audio.sampleRate);
        let stereo = 0, mono = 0;
        for (let i = start; i < end; i++) {
          stereo += (l[i] ** 2 + r[i] ** 2) / 2;
          mono += ((l[i] + r[i]) / 2) ** 2;
        }
        return [stereo, mono].map(v => v / (end - start));
      });
    }, windows);
  }
  const errors = [];
  function compare(levels, file, from, to) {
    referenceLevels(file, from, to).forEach((v, i) => {
      const db = Math.abs(10 * Math.log10(levels[i] / v));
      assert(db <= 1, `Water differs by ${db.toFixed(2)} dB at ${from}–${to} seconds, channel mix ${i}`);
      errors.push(db);
    });
  }
  // These windows contain only the water in the published mixes.
  const windows = [[6, 7.6], [11.7, 14.71], [18.53, 20.96], [25.22, 26.29], [31.25, 35.64], [40.5, 43.7]];
  const walk = await render(45, route, windows);
  windows.forEach(([from, to], i) => compare(walk[i], walking, from, to));
  const road = [{ x: -65.6336, z: 1.4478 }, { x: 32.616255, z: 6.965311 }, { x: 208.088087, z: 13.013586 }];
  const stationLevels = [];
  for (const [i, point] of road.entries()) {
    const [levels] = await render(8, [pose(0, point)], [[5, 7.6]]);
    if (!i) assert.deepEqual(levels, [0, 0]);
    else compare(levels, stations, i * 8 + 5, i * 8 + 7.6);
    stationLevels.push(levels[0]);
  }
  const bandDb = 10 * Math.log10(stationLevels[1] / stationLevels[2]);
  assert(Math.abs(bandDb + 18) < 1);
  console.log(`River vs both WAVs: largest stereo/mono error ${Math.max(...errors).toFixed(3)} dB, midfield ${bandDb.toFixed(2)} dB, outside silent.`);
}

async function checkChorus(page) {
  const offsets = [[4, 8], [-12, 4], [20, 2], [-15, -18], [34, 6], [-34, 7], [26, -34]];
  const shrubs = offsets.map(([dx, dz]) => ({ x: garden.x + dx, z: garden.z + dz }));
  const options = { seconds: 1200, seed: 193706, poses: [pose(0, garden)], shrubs, traceBirds: true };
  const { birds } = await page.evaluate(simulateWalkAudio, options);
  const species = bird => bird.name.split("-")[0];
  assert.equal(new Set(birds.map(b => b.name)).size, 14, "Every take can be heard");
  const last = new Map(), thirds = [], doves = [];
  let peakVoices = 0, groupEnd = -Infinity;
  for (const [i, call] of birds.entries()) {
    const active = birds.slice(0, i).filter(b => b.end > call.start);
    assert(!active.some(b => species(b) === species(call)));
    assert.notEqual(last.get(species(call)), call.name);
    last.set(species(call), call.name);
    if (call.hz === 12500) assert(call.start - groupEnd > 1.8);
    groupEnd = Math.max(groupEnd, call.end);
    peakVoices = Math.max(peakVoices, active.length + 1);
    if (call.hz === 6150) {
      assert.equal(active.length, 2);
      assert(call.end - call.start <= 2.51);
      thirds.push(call.start);
    }
    if (species(call) === "dove") {
      assert(call.hz < 12500 && call.gain < 0.30);
      doves.push(call.start);
    }
  }
  assert.equal(peakVoices, 3);
  for (const [arr, minimum] of [[thirds, 45], [doves, 65]]) {
    assert(arr.length > 1);
    assert(arr.slice(1).every((t, i) => t - arr[i] >= minimum));
  }
  const secondWalk = await page.evaluate(simulateWalkAudio, { ...options, seed: 9, seconds: 45 });
  assert.notDeepEqual(birds.slice(0, 5).map(b => b.name), secondWalk.birds.slice(0, 5).map(b => b.name));
  // A single tree on the listener's right stays planted as the listener turns 180°.
  const gate = { x: -300, z: 0 };
  const turn = await page.evaluate(simulateWalkAudio, {
    seed: 5, seconds: 5, trees: [{ x: gate.x + 10, z: gate.z }], traceBirds: true, render: true,
    poses: [pose(0, gate, 0), pose(0.28, gate, 0), pose(0.45, gate, Math.PI)], probes: [0.2, 0.6],
  });
  const [before, after] = turn.samples.map(s => s.birds[0]);
  assert.equal(before[0], after[0]);
  assert(before[1] > 0.7 && after[1] < -0.7);
  const sides = await page.evaluate(() => {
    const a = walkAudioRender;
    return [[0.1, 0.27], [0.7, 0.91]].map(([t0, t1]) => [0, 1].map(c => {
      const samples = a.getChannelData(c).subarray(t0 * a.sampleRate, t1 * a.sampleRate);
      return samples.reduce((sum, v) => sum + v * v, 0);
    }));
  });
  assert(sides[0][1] > 2 * sides[0][0] && sides[1][0] > 2 * sides[1][1], "Audible stereo image follows the turn");
  const sparse = await page.evaluate(simulateWalkAudio, { ...options, seconds: 120, trees: [], shrubs: [] });
  assert(sparse.birds.length && sparse.birds.every(b => species(b) === "swallow" && b.hz === 12500));
  console.log(`20 min: all 14 takes, ${thirds.length} brief third voices, ${doves.length} distant dove calls. Perch direction and quiet gaps passed.`);
}

async function check() {
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
  try {
    const page = await browser.newPage({ offline: true });
    await page.goto(pathToFileURL(path.resolve(root, process.argv[2] || "hujiang.html")).href);
    await page.waitForFunction(() => window.hujiang);
    assert.equal(await page.locator("#birdCredits li").count(), 14);
    // Sample the hand-drawn lines at several different latitudes. Walk from the
    // campus across both boundaries checking that approaching the river never gets quieter.
    await page.evaluate(() => {
      for (const v of [61, 787]) {
        const u = riverU(v) - 4 / (SCALE * 0.8);
        if (riverSoundProfile(...point(u, v)).level < 0.9999) throw Error("Lost the bank near the tip at " + v);
      }
      for (const v of [142, 219, 351, 391, 506, 627]) {
        const [, blue, red] = riverSoundLines.find(line => line[0] === v);
        const at = u => riverSoundProfile(...point(u, v)).level;
        if (at(blue - 3) !== 0 || Math.abs(at(red) - 0.199526) > 0.0001) throw Error("Mapped boundary at " + v);
        let prev = 0;
        for (let u = blue; u < riverU(v); u += 1) {
          const level = at(u);
          if (level < prev - 0.000001) throw Error("Reversed water gradient at " + v);
          prev = level;
        }
      }
    });
    await checkChorus(page);
    await checkWater(page);
  } finally { await browser.close(); }
}
check().catch(error => { console.error(error); process.exitCode = 1; });
