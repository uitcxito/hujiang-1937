// node tools/performance.cjs hujiang.html --rounds 3 --output results.json --screenshots pictures
// Set CAMPUS_ADAPTER to a Windows adapter LUID (decimal high,low) to pin the GPU.
const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("node:util");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { pose, poses } = require("./art-review.cjs");

const routes = ["gate-walk", "grove-turn", "drone-flight", "aerial-orbit"];
const durationMs = 8500;
const warmupMs = 1000;

function stats(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const round = value => Math.round(value * 100) / 100;
  return {
    count: values.length,
    mean: round(values.reduce((sum, n) => sum + n, 0) / values.length),
    p95: round(sorted[Math.ceil(0.95 * sorted.length) - 1]),
    max: round(sorted[sorted.length - 1]),
  };
}

// Install before explore() creates the private grass updater. Only the first call in a new
// 8-metre cell is charged to grass. Ground height and cell selection match the scene code.
function instrumentGrass() {
  document.addEventListener("DOMContentLoaded", () => {
    const create = window.grass;
    window.grass = function (...args) {
      const update = create.apply(this, args);
      let previous = "";
      return function (p, q, groundView) {
        const key = groundView ? [Math.floor(p.x / 8), Math.floor(p.z / 8), q].join() : "";
        const changed = key && key !== previous;
        if (groundView) previous = key;
        const start = changed && performance.now();
        const result = update.apply(this, arguments);
        if (changed && window.campusBenchmark)
          window.campusBenchmark.grass = { cell: key, cpuMs: performance.now() - start };
        return result;
      };
    };
  }, { once: true });
}

// Store the browser's timestamp only while an animation callback is running. The sampler
// records it only when the main scene is actually drawn, so a skipped callback is not a frame.
function markAnimationFrames() {
  const request = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => request(timestamp => {
    window.campusRafTime = timestamp;
    try { callback.call(window, timestamp); }
    finally { window.campusRafTime = null; }
  });
}

function installSampler() {
  const { renderer } = hujiang;
  const probe = window.campusBenchmark = { samples: null, grass: null, shadowMs: null };
  const shadow = renderer.shadowMap.render;
  renderer.shadowMap.render = function (...args) {
    if (!this.needsUpdate) return shadow.apply(this, args);
    const start = performance.now();
    const result = shadow.apply(this, args);
    probe.shadowMs = performance.now() - start;
    return result;
  };
  const render = renderer.render;
  renderer.render = function (...args) {
    const result = render.apply(this, args);
    if (probe.samples) {
      probe.samples.push({
        at: performance.now(), raf: window.campusRafTime,
        calls: this.info.render.calls, triangles: this.info.render.triangles,
        grass: probe.grass, shadowMs: probe.shadowMs,
      });
    }
    probe.grass = null;
    probe.shadowMs = null;
    return result;
  };
}

async function prepareRoute(page, name) {
  await page.evaluate(name => {
    if (name === "aerial-orbit") hujiang.fullView();
    else if (name === "grove-turn") {
      // Use the normal walking relocation controller to place the visitor at the published grove pose.
      const site = byId.get(121), previous = site.approach;
      try {
        if (!hujiang.legal(71, -39.8)) throw Error("The grove walking fixture is obstructed");
        site.approach = [71 / SCALE + 780, -39.8 / SCALE + 370];
        hujiang.focus(121);
        document.getElementById("landHere").click();
      } finally { site.approach = previous; }
    } else {
      hujiang.gateView();
      if (name === "drone-flight") document.getElementById("drone").click();
    }
  }, name);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

// Drive the real viewport handlers. Mouse travel is specified against elapsed time so that
// a slow frame never changes the requested final angle. Holding W exercises normal collision,
// ground sampling, grass streaming, minimap redraws and shadow budgeting at the real frame dt.
async function runRoute(page, name) {
  await prepareRoute(page, name);
  const pivot = await page.evaluate(() => ({ x: innerWidth / 2, y: innerHeight / 2 }));
  const turning = name === "grove-turn" || name === "aerial-orbit";
  if (turning) {
    await page.mouse.move(pivot.x, pivot.y);
    await page.mouse.down();
  }
  try {
    const sample = await page.evaluate(async ({ name, pivot, turning, durationMs, warmupMs }) => {
      const probe = window.campusBenchmark, canvas = hujiang.renderer.domElement;
      const sendKey = (type, code) => window.dispatchEvent(new KeyboardEvent(type, {
        code, key: code.slice(3).toLowerCase(), bubbles: true, cancelable: true,
      }));
      const snapshot = () => ({
        position: hujiang.camera.position.toArray(),
        direction: hujiang.camera.getWorldDirection(new THREE.Vector3()).toArray(),
      });
      const from = snapshot();
      probe.samples = [];
      const start = performance.now();
      if (!turning) sendKey("keydown", "KeyW");
      // At the gate, climb during the first two seconds to clear the avenue before flying onward.
      if (name === "drone-flight") sendKey("keydown", "KeyE");
      let climbing = name === "drone-flight";
      try {
        await new Promise(resolve => {
          function tick() {
            const progress = Math.min(1, (performance.now() - start) / durationMs);
            if (climbing && progress >= 2000 / durationMs) {
              sendKey("keyup", "KeyE");
              climbing = false;
            }
            if (turning) {
              const dx = name === "aerial-orbit" ? 380 * progress : 480 * Math.sin(1.5 * Math.PI * progress);
              canvas.dispatchEvent(new PointerEvent("pointermove", {
                pointerId: 1, pointerType: "mouse", buttons: 1, bubbles: true,
                clientX: pivot.x + dx, clientY: pivot.y,
              }));
            }
            if (progress < 1) requestAnimationFrame(tick);
            else resolve();
          }
          requestAnimationFrame(tick);
        });
      } finally {
        if (!turning) sendKey("keyup", "KeyW");
        if (climbing) sendKey("keyup", "KeyE");
      }
      await new Promise(requestAnimationFrame);
      const frames = probe.samples.filter(s => s.at >= start + warmupMs);
      probe.samples = null;
      return { frames, from, to: snapshot() };
    }, { name, pivot, turning, durationMs, warmupMs });
    if (sample.frames.length < 2) throw Error("No moving frames on " + name);
    const displacement = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));
    const travel = displacement(sample.to.position, sample.from.position);
    const turn = displacement(sample.to.direction, sample.from.direction);
    if ((turning && turn < 0.1) || (!turning && travel < 8))
      throw Error("The normal input handlers did not move the camera on " + name);
    const intervals = [], rafIntervals = [], grass = [], shadows = [];
    const { frames } = sample;
    if (frames.some(frame => !Number.isFinite(frame.raf)))
      throw Error("A measured scene draw occurred outside an animation callback");
    for (let i = 1; i < frames.length; i++) {
      const frame = frames[i], ms = frame.at - frames[i - 1].at;
      intervals.push(ms);
      rafIntervals.push(frame.raf - frames[i - 1].raf);
      if (frame.grass) grass.push({ cpuMs: frame.grass.cpuMs, frameMs: ms, cell: frame.grass.cell });
      if (frame.shadowMs !== null) shadows.push({ cpuMs: frame.shadowMs, frameMs: ms });
    }
    const frameMs = stats(intervals);
    const events = list => ({
      count: list.length, cpuMs: stats(list.map(e => e.cpuMs)), frameMs: stats(list.map(e => e.frameMs)),
    });
    return {
      name, from: sample.from, to: sample.to, fps: Number((1000 / frameMs.mean).toFixed(2)), frameMs,
      renderedRafMs: stats(rafIntervals),
      drawCalls: stats(frames.map(s => s.calls)), triangles: stats(frames.map(s => s.triangles)),
      grass: { ...events(grass), cells: grass.map(e => e.cell) }, shadows: events(shadows),
    };
  } finally { if (turning) await page.mouse.up(); }
}

async function main() {
  const { positionals, values } = parseArgs({ allowPositionals: true, options: {
    rounds: { type: "string", default: "3" }, output: { type: "string" }, screenshots: { type: "string" },
    width: { type: "string", default: "1600" }, height: { type: "string", default: "1000" },
    dpr: { type: "string", default: "2" },
  } });
  if (positionals.length !== 1)
    throw Error("Usage: node tools/performance.cjs <page.html> [--output results.json] [--screenshots folder] [--rounds 3]");
  const rounds = Number(values.rounds), dpr = Number(values.dpr);
  const viewport = { width: Number(values.width), height: Number(values.height) };
  if (![rounds, viewport.width, viewport.height].every(n => Number.isInteger(n) && n > 0) || !(dpr > 0 && Number.isFinite(dpr)))
    throw Error("Use positive dimensions, device scale and integer rounds");
  const args = process.env.CAMPUS_ADAPTER ? ["--use-angle=d3d11", "--use-adapter-luid=" + process.env.CAMPUS_ADAPTER] : [];
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined, args });
  try {
    const page = await browser.newPage({ offline: true, viewport, deviceScaleFactor: dpr });
    const errors = [];
    page.on("pageerror", err => errors.push(err.message));
    page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
    await page.addInitScript(markAnimationFrames);
    await page.addInitScript(instrumentGrass);
    await page.goto(pathToFileURL(path.resolve(positionals[0])).href);
    await page.waitForFunction(() => window.hujiang, null, { timeout: 120000 });
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      const quality = document.getElementById("quality");
      quality.value = "2";
      quality.dispatchEvent(new Event("change"));
    });
    await page.evaluate(installSampler);
    const graphics = await page.evaluate(() => {
      const { renderer } = hujiang, gl = renderer.getContext();
      const debug = gl.getExtension("WEBGL_debug_renderer_info");
      return { gpu: debug && gl.getParameter(debug.UNMASKED_RENDERER_WEBGL), dpr: devicePixelRatio,
        buffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], msaa: gl.getParameter(gl.SAMPLES),
        shadowMap: hujiang.scene.children.find(o => o.isDirectionalLight && o.castShadow).shadow.mapSize.x };
    });
    const report = {
      browser: browser.version(), viewport, graphics, durationMs, warmupMs,
      timing: "frameMs measures consecutive main renderer.render returns. renderedRafMs uses browser animation timestamps of those same draws. Event CPU durations include driver submission.",
      rounds: [],
    };
    if (values.screenshots) {
      fs.mkdirSync(values.screenshots, { recursive: true });
      const hidden = await page.addStyleTag({ content: "body > :not(#view), #pins {visibility:hidden!important}" });
      for (const name of Object.keys(poses)) {
        await pose(page, name);
        await page.screenshot({ path: path.join(values.screenshots, name + ".png") });
      }
      await hidden.evaluate(node => node.remove());
    }
    for (let round = 1; round <= rounds; round++) {
      const runs = {};
      for (const name of routes) {
        const row = await runRoute(page, name);
        runs[name] = row;
        console.error(round, name, row.fps + " fps, return P95 " + row.frameMs.p95
          + " ms, rendered RAF P95 " + row.renderedRafMs.p95 + " ms");
      }
      report.rounds.push(runs);
    }
    if (errors.length) throw Error(errors.join("\n"));
    const body = JSON.stringify(report, null, 2) + "\n";
    if (values.output) {
      fs.mkdirSync(path.dirname(values.output), { recursive: true });
      fs.writeFileSync(values.output, body);
    } else process.stdout.write(body);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
