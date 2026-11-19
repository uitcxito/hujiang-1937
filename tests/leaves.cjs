const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { simulateWalkAudio } = require("./helpers/walk-audio.cjs");

async function check() {
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
  try {
    const page = await browser.newPage({ offline: true });
    await page.goto(pathToFileURL(path.resolve(__dirname, "..", process.argv[2] || "hujiang.html")).href);
    await page.waitForFunction(() => window.hujiang, null, { timeout: 60000 });
    const underTree = await page.evaluate(() => {
      for (const t of hujiang.treeTrunks) {
        const x = t.x + t.crownRadius * 0.7;
        if (hujiang.legal(x, t.z)) return { at: 0, x, z: t.z, yaw: 0 };
      }
    });
    assert(underTree);
    const seed = 193706, minutes = 120;
    const { gusts } = await page.evaluate(simulateWalkAudio, { seed, seconds: minutes * 60, poses: [underTree] });
    assert.equal(new Set(gusts.map(g => g.name)).size, 3);
    assert(gusts[0].start >= 20);
    const gaps = [];
    for (const [i, g] of gusts.entries()) {
      assert(g.end - g.start >= 4 && g.end - g.start <= 10 && g.gain > 0.99);
      if (!i) continue;
      assert.notEqual(g.name, gusts[i - 1].name);
      const gap = g.start - gusts[i - 1].end;
      assert((gap >= 20 && gap <= 50.14) || (gap >= 65 && gap <= 100.14), "Invalid quiet interval " + gap);
      gaps.push(gap);
    }
    const perMinute = gusts.length / minutes, longest = Math.max(...gaps);
    const longFraction = gaps.filter(gap => gap >= 65).length / gaps.length;
    assert(perMinute >= 0.9 && perMinute <= 1.3 && longFraction > 0.15 && longFraction < 0.35 && longest > 90);

    // Put a second tree past a clearing. The same ongoing wind must be heard on
    // the far side, even when the listener moves between the crowns during a gust.
    const start = gusts[0].start, second = gusts[1].start;
    const walkSeconds = Math.ceil(second) + 3;
    const pose = (at, x, yaw = 0) => ({ at, x, z: 0, yaw });
    const walk = await page.evaluate(simulateWalkAudio, {
      seed, seconds: walkSeconds, render: true,
      trees: [{ x: 5, z: 0, crownRadius: 5 }, { x: 70, z: 0, crownRadius: 3 }],
      poses: [pose(0, 0), pose(start + 0.5, 0), pose(start + 0.8, 0, Math.PI),
        pose(start + 1.4, 0, Math.PI), pose(start + 1.7, 20), pose(start + 2.1, 20),
        pose(start + 2.4, 30), pose(start + 2.8, 30), pose(start + 3.1, 67),
        pose(start + 10, 67), pose(start + 12, 30)],
      probes: [start + 0.4, start + 1.25, start + 2, start + 2.7, start + 3.5],
    });
    assert.deepEqual(walk.gusts.map(g => [g.start, g.name]), gusts.filter(g => g.start < walkSeconds).map(g => [g.start, g.name]));
    const [right, left, halfway, clear, nextTree] = walk.samples;
    assert(right.gain === 1 && right.pan > 0.75 && left.pan < -0.75);
    assert(Math.abs(halfway.gain - 0.5) < 0.001 && halfway.hz < right.hz);
    assert(clear.gain === 0 && nextTree.gain === 1);
    const [beforeTurn, afterTurn, openField] = await page.evaluate(([first, second]) => {
      const audio = window.walkAudioRender;
      function stereoRms(from, to) {
        return [2, 3].map(channel => {
          const data = audio.getChannelData(channel).subarray(Math.round(from * audio.sampleRate), Math.round(to * audio.sampleRate));
          return Math.sqrt(data.reduce((sum, sample) => sum + sample * sample, 0) / data.length);
        });
      }
      return [stereoRms(first + 0.2, first + 0.45), stereoRms(first + 1.15, first + 1.35), stereoRms(second + 1, second + 2)];
    }, [start, second]);
    assert(beforeTurn[1] > 2 * beforeTurn[0] && beforeTurn[1] > 0.0005);
    assert(afterTurn[0] > 2 * afterTurn[1] && afterTurn[0] > 0.0005);
    assert(Math.max(...openField) < 0.00001);
    console.log(`${minutes} minutes under a campus tree: ${gusts.length} gusts, ${perMinute.toFixed(2)}/min, ` +
      `${(100 * longFraction).toFixed(1)}% long gaps, longest ${longest.toFixed(1)} s. Crown distance and stereo turn passed.`);
  } finally { await browser.close(); }
}
check().catch(error => { console.error(error); process.exitCode = 1; });
