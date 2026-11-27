// Reproduce the comparison with the same poses, drawing buffer and quality settings on both revisions.
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const poses = {
  auditorium: [
    [21, 1.73, -3],
    [32, 3, -16],
  ],
  yates: [
    [120.8, 3.8, -60.3],
    [103, 7.55, -65.3],
  ],
  gate: [
    [-317.4, 1.8, -4.9],
    [-306.45, 2.1, -9.5],
  ],
  grove: [
    [71, 1.73, -39.8],
    [40, 3.8, -34],
  ],
  aerial: [
    [-155, 246, 300],
    [-12, 0, -26],
  ],
};
async function pose(page, name) {
  await page.evaluate(([eye, at]) => {
    const vector = new THREE.Vector3(...eye).sub(new THREE.Vector3(...at));
    hujiang.setView(
      ...at,
      vector.length(),
      Math.atan2(vector.x, vector.z),
      Math.acos(vector.y / vector.length()),
    );
  }, poses[name]);
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
}
async function run() {
  const [pageFile, output] = process.argv.slice(2);
  if (!pageFile || !output)
    throw Error("Usage: node tools/art-review.cjs <page.html> <output-dir>");
  fs.mkdirSync(output, { recursive: true });
  const args = [];
  if (process.env.CAMPUS_ADAPTER)
    args.push("--use-angle=d3d11", "--use-adapter-luid=" + process.env.CAMPUS_ADAPTER);
  const browser = await chromium.launch({
    channel: process.platform === "win32" ? "msedge" : undefined,
    args,
  });
  try {
    const page = await browser.newPage({
      offline: true,
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto(pathToFileURL(path.resolve(pageFile)).href);
    await page.waitForFunction(() => window.hujiang, null, { timeout: 90000 });
    await page.keyboard.press("Escape");
    const graphics = await page.evaluate(() => {
      const el = document.querySelector("#quality");
      el.value = 2;
      el.dispatchEvent(new Event("change"));
      const r = hujiang.renderer,
        gl = r.getContext(),
        ext = gl.getExtension("WEBGL_debug_renderer_info");
      return {
        gpu: ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
        samples: gl.getParameter(gl.SAMPLES),
        width: gl.drawingBufferWidth,
        height: gl.drawingBufferHeight,
        trees: hujiang.treeTrunks.length,
      };
    });
    await page.addStyleTag({ content: "body > :not(#view), #pins { visibility:hidden!important }" });
    for (const name of Object.keys(poses)) {
      await pose(page, name);
      await page.screenshot({ path: path.join(output, name + ".jpg"), type: "jpeg", quality: 92 });
    }
    console.log(JSON.stringify(graphics));
    if (errors.length) throw Error(errors.join("\n"));
  } finally {
    await browser.close();
  }
}
module.exports = { poses, pose };
if (require.main === module) run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
