const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

// Tap the real audio graph so a successful play request with silent output fails the test.
function meterAudio() {
  const connect = AudioNode.prototype.connect;
  function meter(node) {
    const analyser = node.context.createAnalyser();
    connect.call(node, analyser);
    return analyser;
  }
  const probe = window.soundProbe = {
    birds: [],
    loops: 0,
    rms(analyser) {
      const samples = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      return Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
    },
  };
  AudioNode.prototype.connect = function (target, ...ports) {
    if (target === this.context.destination) {
      probe.context = this.context;
      probe.output = meter(this);
    } else if (this instanceof AudioBufferSourceNode) {
      if (this.loop) {
        probe.loops++;
        probe.river = meter(target);
        probe.riverGain = target.gain;
      } else {
        probe.birds.push(this.buffer);
      }
    }
    return connect.call(this, target, ...ports);
  };
}

async function check() {
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
  try {
    const page = await browser.newPage({ offline: true, viewport: { width: 1280, height: 800 } });
    await page.addInitScript(meterAudio);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (msg) => {
      if (msg.text().includes("无法读取环境录音")) errors.push(msg.text());
    });
    page.on("request", (r) => {
      if (/^https?:/.test(r.url())) errors.push(r.url());
    });
    const file = process.argv[2] || "hujiang.html";
    await page.goto(pathToFileURL(path.join(__dirname, "..", file)).href);
    const ready = () => page.waitForFunction(() => window.hujiang, undefined, { timeout: 60000 });
    const quiet = () => page.waitForFunction(() => soundProbe.context.state === "suspended");
    await ready();
    assert(await page.evaluate(() => !soundProbe.context));
    await page.keyboard.press("w");
    await page.waitForFunction(() => soundProbe.output && soundProbe.rms(soundProbe.output) > 0.008);
    await page.waitForFunction(() => soundProbe.river && soundProbe.birds.length >= 2);
    assert(await page.evaluate(() =>
      soundProbe.birds[0] !== soundProbe.birds[1] && soundProbe.rms(soundProbe.river) === 0
    ));

    async function visit(query) {
      await page.click("#guide");
      await page.fill("#placeQuery", query);
      await page.locator("#placeList button").first().click();
      await page.click("#landHere");
    }
    await visit("生物园");
    await page.waitForFunction(() => soundProbe.riverGain.value > 0.24 && soundProbe.riverGain.value < 0.4);
    // From the garden approach, strafe inland and then back towards the bank.
    await page.keyboard.down("Shift");
    await page.keyboard.down("a");
    await page.waitForFunction(() => soundProbe.riverGain.value < 0.19);
    await page.keyboard.up("a");
    await page.keyboard.down("d");
    await page.waitForFunction(() => soundProbe.riverGain.value > 0.37);
    await page.keyboard.up("d");
    await page.keyboard.up("Shift");
    await visit("黄浦江岸");
    await page.waitForFunction(() =>
      soundProbe.riverGain.value > 0.85 && soundProbe.rms(soundProbe.river) > 0.02 &&
      soundProbe.rms(soundProbe.output) > 0.009
    );
    for (const mode of ["orbit", "drone"]) {
      await page.click("#" + mode);
      await quiet();
      await page.click("#walk");
      await page.waitForFunction(() =>
        soundProbe.context.state === "running" && soundProbe.rms(soundProbe.river) > 0.02
      );
    }
    // Headless Chromium keeps tabs visible, so deliver both visibility events explicitly.
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, value: true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await quiet();
    await page.evaluate(() => {
      delete document.hidden;
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForFunction(() =>
      soundProbe.context.state === "running" && soundProbe.rms(soundProbe.output) > 0.009
    );
    await page.click("#home");
    await page.waitForFunction(() => soundProbe.riverGain.value < 0.002);
    assert.equal(await page.evaluate(() => soundProbe.loops), 1);

    await page.click("#settings");
    const volume = page.getByRole("slider", { name: "步行环境音量" });
    await volume.press("Home");
    await quiet();
    assert.equal(await volume.getAttribute("aria-valuetext"), "静音");
    await page.reload();
    await ready();
    await page.keyboard.press("w");
    assert(await page.evaluate(() => document.getElementById("ambientVolume").value === "0" && !soundProbe.context));
    await page.click("#settings");
    await volume.press("End");
    await page.waitForFunction(() => soundProbe.output && soundProbe.rms(soundProbe.output) > 0.008);
    assert.deepEqual(errors, []);
    console.log(file + " passed offline birdsong, shore-distance mixing, mode changes, mute and volume restoration.");
  } finally {
    await browser.close();
  }
}
check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
