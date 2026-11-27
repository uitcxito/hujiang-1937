// Render the actual Blender trees into orthographic front, side and overhead foliage cards.
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const dir = path.resolve(__dirname, "../assets/models");
const species = ["camphor", "zelkova", "maple"];
async function run() {
  const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined });
  try {
    const page = await browser.newPage();
    for (const file of ["three.min.js", "GLTFLoader.r160.js"])
      await page.addScriptTag({ path: path.resolve(__dirname, "../vendor", file) });
    const data = species.map((s) => fs.readFileSync(path.join(dir, s + ".glb")).toString("base64"));
    const result = await page.evaluate(
      async ({ data, species }) => {
        const T = THREE,
          size = 256,
          renderer = new T.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
        renderer.setSize(480, 480);
        renderer.outputColorSpace = T.SRGBColorSpace;
        renderer.toneMapping = T.ACESFilmicToneMapping;
        const scene = new T.Scene(),
          hemi = new T.HemisphereLight(0xfff7e9, 0x938375, 1.8);
        const sun = new T.DirectionalLight(0xffebd4, 2.9);
        sun.position.set(-0.6, 1, 0.7);
        scene.add(hemi, sun);
        const atlas = document.createElement("canvas");
        atlas.width = 8 * size;
        atlas.height = 8 * size;
        const ctx = atlas.getContext("2d");
        const gallery = document.createElement("canvas");
        gallery.width = 1624;
        gallery.height = 1320;
        const g = gallery.getContext("2d");
        g.fillStyle = "#f0efe7";
        g.fillRect(0, 0, gallery.width, gallery.height);
        g.fillStyle = "#293b31";
        g.font = "38px 'Microsoft YaHei', sans-serif";
        g.fillText("沪江大学 · 初夏树种与树形", 42, 61);
        const labels = [
          ["香樟", "低干展冠", "高干圆冠", "偏冠斜干"],
          ["榉树", "高位帚冠", "低叉扇冠", "窄冠直立"],
          ["三角枫", "多干层冠", "高干疏冠", "低位偏冠"],
        ];
        const forms = [];
        for (let s = 0; s < species.length; s++) {
          const bytes = Uint8Array.from(atob(data[s]), (c) => c.charCodeAt(0));
          const model = await new T.GLTFLoader().parseAsync(bytes.buffer, "");
          const roots = [];
          model.scene.traverse((o) => {
            if (o.userData.species) roots.push(o);
          });
          roots.sort((a, b) => a.userData.form - b.userData.form);
          for (const tree of roots) {
            scene.add(tree);
            const index = tree.userData.form,
              ordinal = s * 3 + index;
            let radius = 0,
              top = 0,
              min = 0;
            tree.updateMatrixWorld(true);
            const v = new T.Vector3();
            tree.traverse((o) => {
              if (!o.isMesh) return;
              if (o.material.name.endsWith(" leaves"))
                o.material.onBeforeCompile = (shader) => {
                  shader.fragmentShader = shader.fragmentShader.replace(
                    "#include <normal_fragment_begin>",
                    T.ShaderChunk.normal_fragment_begin.replace("normal *= faceDirection;", ""),
                  );
                };
              const pos = o.geometry.attributes.position;
              for (let k = 0; k < pos.count; k++) {
                v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld);
                radius = Math.max(radius, Math.hypot(v.x, v.z));
                top = Math.max(top, v.y);
                min = Math.min(min, v.y);
              }
            });
            const extent = Math.max(2 * radius, top - min) * 1.045,
              centerY = (top + min) * 0.5;
            forms.push({ species: species[s], form: index, radius, top, extent, centerY });
            function render(dir, diameter, y) {
              const c = new T.OrthographicCamera(
                -diameter / 2,
                diameter / 2,
                diameter / 2,
                -diameter / 2,
                0.1,
                115,
              );
              c.position.set(dir[0] * 45, y + dir[1] * 45, dir[2] * 45);
              if (dir[1] === 1) c.up.set(0, 0, -1);
              c.lookAt(0, y, 0);
              renderer.render(scene, c);
            }
            for (const [j, dir] of [
              [0, [0, 0, 1]],
              [1, [1, 0, 0]],
              [2, [0, 0.64, 0.77]],
              [3, [0.77, 0.64, 0]],
              [4, [0, 1, 0]],
            ]) {
              render(dir, extent, centerY);
              const tile = ordinal * 5 + j;
              ctx.drawImage(renderer.domElement, (tile % 8) * size, Math.floor(tile / 8) * size, size, size);
            }
            render([0.34, 0.1, 0.9], 18.2, 7.9);
            const x = 22 + index * 440,
              y = 94 + s * 409;
            g.drawImage(renderer.domElement, x + 27, y, 366, 366);
            g.fillStyle = "#344638";
            g.font = "21px 'Microsoft YaHei',sans-serif";
            g.fillText(labels[s][0] + "  ·  " + labels[s][index + 1], x + 22, y + 387);
            if (index === 0) {
              const leaf = tree.children.find((o) => o.material?.name.endsWith(" leaves")).material.map.image;
              g.drawImage(leaf, 1316, y + 45, 281, 281);
              g.fillText(["香樟 · 全缘卵形叶", "榉树 · 锯齿叶缘", "三角枫 · 对生三裂叶"][s], 1322, y + 387);
            }
            scene.remove(tree);
          }
        }
        return {
          forms,
          atlas: atlas.toDataURL("image/webp", 0.94).split(",")[1],
          gallery: gallery.toDataURL("image/jpeg", 0.92).split(",")[1],
        };
      },
      { data, species },
    );
    fs.writeFileSync(path.join(dir, "canopies.webp"), Buffer.from(result.atlas, "base64"));
    fs.writeFileSync(path.join(dir, "canopies.json"), JSON.stringify(result.forms, null, 2) + "\n");
    const dest = path.resolve(__dirname, "../验收/美术升级");
    fs.mkdirSync(dest, { recursive: true });
    fs.writeFileSync(path.join(dest, "九株树形.jpg"), Buffer.from(result.gallery, "base64"));
  } finally {
    await browser.close();
  }
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
