const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const { facePoint } = require("./helpers/scene.cjs");

// Tap the real audio graph so a successful play request with silent output fails the test.
function meterAudio() {
  const connect = AudioNode.prototype.connect;
  const outputs = new Map();
  function meter(node) {
    const analyser = node.context.createAnalyser();
    connect.call(node, analyser);
    return analyser;
  }
  const probe = window.soundProbe = {
    birds: [],
    gusts: [],
    loops: 0,
    rms(analyser) {
      const samples = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(samples);
      return Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length);
    },
  };
  AudioNode.prototype.connect = function (target, ...ports) {
    outputs.set(this, target);
    if (target === this.context.destination) {
      probe.context = this.context;
      probe.output = meter(this);
    } else if (this instanceof BiquadFilterNode && target instanceof GainNode) {
      probe.leaves = meter(target);
      probe.leafGain = target.gain;
    } else if (this instanceof AudioBufferSourceNode) {
      if (this.loop) {
        probe.loops++;
        let distanceGain = target;
        while (outputs.has(distanceGain) && !(outputs.get(distanceGain) instanceof WaveShaperNode)) {
          distanceGain = outputs.get(distanceGain);
        }
        probe.river = meter(distanceGain);
        probe.riverGain = distanceGain.gain;
      } else if (target instanceof BiquadFilterNode) {
        probe.gusts.push(this.buffer);
      } else {
        probe.birds.push(this.buffer);
      }
    }
    return connect.call(this, target, ...ports);
  };
}

async function check() {
  const browser = await chromium.launch({
    channel: process.platform === "win32" ? "msedge" : undefined,
    args: ["--autoplay-policy=document-user-activation-required"],
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hujiang-"));
  const file = path.join(dir, "hujiang.html");
  try {
    fs.copyFileSync(path.resolve(__dirname, "..", process.argv[2] || "hujiang.html"), file);
    const page = await browser.newPage({ offline: true, viewport: { width: 1280, height: 800 } });
    await page.addInitScript(meterAudio);
    const errors = [];
    function watch(tab) {
      tab.on("pageerror", (e) => errors.push(e.message));
      tab.on("console", (msg) => {
        if (msg.text().includes("无法读取环境录音")) errors.push(msg.text());
      });
      tab.on("request", (r) => {
        if (/^https?:/.test(r.url())) errors.push(r.url());
      });
    }
    watch(page);
    const url = pathToFileURL(file).href;
    await page.goto(url);
    const ready = () => page.waitForFunction(() => window.hujiang, undefined, { timeout: 60000 });
    const quiet = () => page.waitForFunction(() => soundProbe.context.state === "suspended");
    await ready();
    await page.keyboard.press("Escape");
    assert(await page.evaluate(() => !soundProbe.context));
    await page.evaluate(() => {
      let seed = 19;
      Math.random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
    });
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
    await page.waitForFunction(() => soundProbe.riverGain.value > 0.047 && soundProbe.riverGain.value < 0.06);
    await page.waitForFunction(() => soundProbe.gusts.length && soundProbe.leafGain.value > 0.7 &&
      soundProbe.rms(soundProbe.leaves) > 0.007 && soundProbe.rms(soundProbe.river) > 0.002,
      undefined, { timeout: 115000 });
    // Interrupt an audible gust. Returning to the same trees keeps the quiet interval.
    await page.click("#orbit");
    await quiet();
    const gustCount = await page.evaluate(() => soundProbe.gusts.length);
    await page.click("#walk");
    await page.waitForFunction(() => soundProbe.context.state === "running" && soundProbe.rms(soundProbe.leaves) < 0.0001);
    assert.equal(await page.evaluate(() => soundProbe.gusts.length), gustCount);
    await visit("生物园");
    // From the garden approach, strafe inland and then back towards the bank.
    await page.keyboard.down("Shift");
    await page.keyboard.down("a");
    await page.waitForFunction(() => soundProbe.riverGain.value < 0.0505);
    await page.keyboard.up("a");
    await page.keyboard.down("d");
    await page.waitForFunction(() => soundProbe.riverGain.value > 0.053);
    await page.keyboard.up("d");
    await page.keyboard.up("Shift");
    await visit("生物园");
    await walkToRiver(page);
    await page.waitForFunction(() =>
      soundProbe.riverGain.value > 0.18 && soundProbe.rms(soundProbe.river) > 0.005 &&
      soundProbe.rms(soundProbe.output) > 0.003
    );
    for (const mode of ["orbit", "drone"]) {
      await page.click("#" + mode);
      await quiet();
      await page.click("#walk");
      await page.waitForFunction(() =>
        soundProbe.context.state === "running" && soundProbe.rms(soundProbe.river) > 0.005
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
    await page.close();
    for (const action of ["walk", "ground"]) {
      const mobile = await browser.newPage({ offline: true, hasTouch: true, isMobile: true, viewport: { width: 412, height: 800 } });
      watch(mobile);
      await mobile.addInitScript(meterAudio);
      if (action === "ground") await mobile.addInitScript(rejectOgg);
      await mobile.goto(url);
      await mobile.waitForFunction(() => window.hujiang && !soundProbe.context);
      await mobile.keyboard.press("Escape");
      if (action === "walk") await mobile.locator("#walk").tap();
      else {
        const x = 206, y = 505;
        assert(await mobile.evaluate(([x, y]) => document.elementFromPoint(x, y).tagName === "CANVAS", [x, y]));
        await mobile.touchscreen.tap(x, y);
      }
      await mobile.waitForFunction(() => soundProbe.output && soundProbe.rms(soundProbe.output) > 0.006);
      if (action === "ground") {
        await mobile.waitForFunction(() => codecs.mp3 === 4 && codecs.flac === 14 && soundProbe.loops === 1);
        assert.equal(await mobile.evaluate(() => codecs.ogg), 4);
        // The fallback must play the water, as well as decode the file.
        await mobile.evaluate(() => hujiang.focus(181));
        await mobile.locator("#landHere").tap();
        await mobile.waitForFunction(() => soundProbe.rms(soundProbe.river) > 0.001);
      }
      await mobile.close();
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(fs.readdirSync(dir), ["hujiang.html"]);
    console.log("Isolated offline HTML passed keyboard, touch, MP3 fallback, garden walk, mode changes, mute and volume restoration.");
  } finally {
    await browser.close();
    if (fs.existsSync(file)) fs.unlinkSync(file);
    fs.rmdirSync(dir);
  }
}

async function walkToRiver(page) {
  const target = { x: 279.558566, z: -81.778839 };
  await page.waitForFunction(() => hujiang.mode === "walk" && hujiang.camera.position.equals(hujiang.player));
  await facePoint(page, target);
  const depths = [30, 20, 10, 4.1];
  let previousGain = 0;
  await page.keyboard.down("w");
  try {
    for (const d of depths) {
      await page.waitForFunction(d => shoreDistance(hujiang.player.x, hujiang.player.z) <= d, d,
        { polling: 50, timeout: 60000 });
      const gain = await page.evaluate(() => soundProbe.riverGain.value);
      assert(gain > previousGain, "Water grew while walking to " + d + " m");
      previousGain = gain;
    }
  } finally { await page.keyboard.up("w"); }
  assert(await page.evaluate(p => Math.hypot(hujiang.player.x - p.x, hujiang.player.z - p.z) < 1, target));
}

function rejectOgg() {
  const decode = AudioContext.prototype.decodeAudioData;
  window.codecs = { ogg: 0, flac: 0, mp3: 0 };
  AudioContext.prototype.decodeAudioData = async function (data, ...callbacks) {
    const bytes = new Uint8Array(data, 0, 4), magic = String.fromCharCode(...bytes);
    if (magic === "OggS") {
      codecs.ogg++;
      throw new DOMException("Ogg unavailable", "EncodingError");
    }
    const mp3 = magic.startsWith("ID3") || (bytes[0] === 255 && (bytes[1] & 224) === 224);
    const buffer = await decode.call(this, data, ...callbacks);
    if (magic === "fLaC") codecs.flac++;
    if (mp3) codecs.mp3++;
    return buffer;
  };
}
check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
