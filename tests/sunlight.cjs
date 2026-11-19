const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

function measureSunlight() {
  const { scene, renderer, camera } = hujiang;
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 160;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  function pixels(view) {
    renderer.render(scene, view);
    ctx.drawImage(renderer.domElement, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  }

  // From above all buildings, look along the actual light vector and find the disc against its halo.
  const sun = scene.children.find((o) => o.isDirectionalLight);
  const direction = sun.position.clone().sub(sun.target.position).normalize();
  const skyView = new THREE.PerspectiveCamera(18, camera.aspect, 0.1, 2500);
  skyView.position.set(0, 150, 0);
  skyView.lookAt(skyView.position.clone().add(direction));
  const sky = pixels(skyView);
  const green = (x, y) => sky[(y * canvas.width + x) * 4 + 1];
  const halo = (green(110, 80) + green(146, 80) + green(128, 62) + green(128, 98)) / 4;

  // Compare the same view with and without receivers, including the custom terrain material.
  const shaded = pixels(camera);
  const receivers = [];
  scene.traverse((o) => {
    if (o.receiveShadow) receivers.push(o);
  });
  receivers.forEach((o) => (o.receiveShadow = false));
  const unshaded = pixels(camera);
  receivers.forEach((o) => (o.receiveShadow = true));
  renderer.render(scene, camera);
  let shadowPixels = 0;
  for (let i = 1; i < shaded.length; i += 4) {
    if (unshaded[i] - shaded[i] > 12) shadowPixels++;
  }
  return { shadowFraction: shadowPixels / (canvas.width * canvas.height), discContrast: green(128, 80) - halo };
}

async function check() {
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
  try {
    const page = await browser.newPage({ offline: true, viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto(pathToFileURL(path.join(__dirname, "..", "hujiang.html")).href);
    await page.waitForFunction(() => window.hujiang, undefined, { timeout: 60000 });
    await page.keyboard.press("Escape");
    for (const mode of ["walk", "orbit", "drone"]) {
      if (mode === "drone") await page.evaluate(() => hujiang.focus(121));
      await page.click("#" + mode);
      await page.click("#settings");
      for (const quality of ["0", "1", "2"]) {
        await page.selectOption("#quality", quality);
        await page.evaluate(() => new Promise(requestAnimationFrame));
        const { shadowFraction, discContrast } = await page.evaluate(measureSunlight);
        assert(discContrast > 8, mode + " sky disc does not match the sunlight direction at quality " + quality);
        assert(shadowFraction > 0.01, mode + " view has no visible cast shadows at quality " + quality);
      }
      await page.getByRole("button", { name: "关闭设置" }).click();
    }
    assert.deepEqual(errors, []);
    console.log("Sun disc alignment and rendered shadows passed in walking, aerial and drone views across three quality levels.");
  } finally {
    await browser.close();
  }
}
check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
