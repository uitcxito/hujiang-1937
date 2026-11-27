// Decode local samples before the first frame so the application works from file://.
const scans = {};
async function prepareSurfaces() {
  const decoded = await Promise.all(
    Object.entries(surfaceImages).map(async ([key, uri]) => {
      const image = new Image();
      image.src = uri;
      await image.decode();
      const c = canvas(image.width, image.height),
        ctx = c.getContext("2d");
      ctx.drawImage(image, 0, 0);
      if (key === "brick_wall_001_Diffuse") {
        const pixels = ctx.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < pixels.data.length; i += 4) {
          const r = pixels.data[i],
            g = pixels.data[i + 1],
            b = pixels.data[i + 2],
            l = 0.35 * r + 0.5 * g + 0.15 * b;
          pixels.data[i] = r * 0.4 + l * 0.46 + 42;
          pixels.data[i + 1] = g * 0.49 + l * 0.25 + 20;
          pixels.data[i + 2] = b * 0.48 + l * 0.23 + 17;
        }
        ctx.putImageData(pixels, 0, 0);
      }
      return [key, texture(c, !key.endsWith("nor_gl"))];
    }),
  );
  Object.assign(scans, Object.fromEntries(decoded));
  brick.map = scans.brick_wall_001_Diffuse;
  brick.normalMap = scans.brick_wall_001_nor_gl;
  brick.map.repeat.set(1.54, 1.14);
  brick.normalMap.repeat.copy(brick.map.repeat);
  brick.normalScale.set(0.43, 0.43);
  brick.bumpMap = null;
}
