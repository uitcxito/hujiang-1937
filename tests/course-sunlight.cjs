const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

async function checkLesson(browser, viewport, touch) {
  const page = await browser.newPage({ viewport, isMobile: touch, hasTouch: touch, offline: true });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const course = pathToFileURL(path.join(__dirname, "..", "course", "index.html"));
    course.hash = "module-6";
    await page.goto(course.href);
    const lesson = page.locator("#module-6");
    await page.waitForFunction(() => Math.abs(document.querySelector("#module-6").getBoundingClientRect().top) < 2);
    const title = await lesson.locator("h2").boundingBox();
    const nav = await page.locator("#nav").boundingBox();
    assert(title.y >= nav.y + nav.height, "Navigation obscures the lesson title");
    assert(await lesson.evaluate((el) => el.scrollWidth <= document.documentElement.clientWidth));

    const shadows = lesson.locator("#gate-shadow-on");
    const unshaded = lesson.locator("#gate-shadow-off");
    assert(await shadows.isVisible());
    await shadows.locator("img").evaluate((img) => img.decode());
    const offSwitch = lesson.getByRole("radio", { name: "关闭投影" });
    if (touch) await offSwitch.tap();
    else await offSwitch.check();
    assert(await unshaded.isVisible() && await shadows.isHidden());
    await unshaded.locator("img").evaluate((img) => img.decode());
    await lesson.getByRole("radio", { name: "显示投影" }).check();
    assert(await shadows.isVisible() && await unshaded.isHidden());

    const slider = lesson.getByRole("slider");
    const angle = lesson.locator('output[name="angleReadout"]');
    const shadow = lesson.locator('output[name="shadowReadout"]');
    assert.equal(await angle.textContent(), "24°");
    assert.equal(await shadow.textContent(), "4.5 米");
    for (let degree = 24; degree < 45; degree++) await slider.press("ArrowRight");
    assert.equal(await angle.textContent(), "45°");
    assert.equal(await shadow.textContent(), "2.0 米");
    await slider.press("Home");
    assert.equal(await shadow.textContent(), "9.4 米");
    await slider.press("End");
    assert.equal(await shadow.textContent(), "0.6 米");

    const flow = lesson.locator(".flow-animation");
    for (const actor of ["flow-sun-pillar", "flow-sun-map", "flow-sun-road"]) {
      await flow.getByRole("button", { name: "下一步" }).click();
      assert.equal(await flow.locator(".flow-actor.active").getAttribute("id"), actor);
    }
    await flow.getByRole("button", { name: "从头看" }).click();
    assert.equal(await flow.locator(".flow-actor.active").count(), 0);
    for (const img of await lesson.locator(".pattern-card img").all()) {
      await img.scrollIntoViewIfNeeded();
      await img.evaluate((el) => el.decode());
    }

    const quiz = lesson.locator("#quiz-sunlight");
    const grade = quiz.getByRole("button", { name: "核对答案" });
    await quiz.locator('[data-value="power"]').click();
    await grade.click();
    assert.equal(await quiz.locator(".quiz-feedback.error").count(), 1);
    assert.equal(await quiz.locator(".quiz-feedback.warning").count(), 2);
    await quiz.getByRole("button", { name: "重试" }).click();
    for (const answer of ["angle", "receiver", "normals"]) {
      await quiz.locator('[data-value="' + answer + '"]').click();
    }
    await grade.click();
    assert.equal(await quiz.locator(".quiz-feedback.success").count(), 3);
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

async function check() {
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
  try {
    await checkLesson(browser, { width: 1280, height: 800 }, false);
    await checkLesson(browser, { width: 390, height: 844 }, true);
    console.log("Sunlight course images, shadow experiment, flow and quiz passed on desktop and mobile.");
  } finally {
    await browser.close();
  }
}

check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
