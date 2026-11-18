function makeCampusMap() {
  const base = canvas(mapWidth, mapHeight), ink = base.getContext("2d");
  function outline(points) {
    ink.beginPath();
    for (const [i, [x, y]] of points.entries()) i ? ink.lineTo(x, y) : ink.moveTo(x, y);
    ink.closePath();
  }
  outline([[riverU(0), 0], [mapWidth, 0], [mapWidth, mapHeight], [riverU(mapHeight), mapHeight]]);
  ink.fillStyle = "#78b9c26e";
  ink.fill();
  outline(boundary);
  ink.fillStyle = "#93aa7d32";
  ink.fill();
  ink.strokeStyle = "#cfd5ae9c";
  ink.lineWidth = 2;
  ink.stroke();
  // Read the existing road mask once, including the short garden approaches.
  const roads = ink.createImageData(mapWidth, mapHeight);
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const src = 4 * (Math.floor(y * roadMask.height / mapHeight) * roadMask.width +
        Math.floor(x * roadMask.width / mapWidth));
      const i = 4 * (y * mapWidth + x);
      roads.data[i] = 235;
      roads.data[i + 1] = 225;
      roads.data[i + 2] = 192;
      roads.data[i + 3] = Math.max(maskPixels[src] > 125 ? maskPixels[src] : 0, maskPixels[src + 1]);
    }
  }
  const overlay = canvas(mapWidth, mapHeight);
  overlay.getContext("2d").putImageData(roads, 0, 0);
  ink.drawImage(overlay, 0, 0);
  ink.fillStyle = "#c6ae81";
  for (const b of obstacles) {
    ink.save();
    ink.translate(b.x / SCALE + 780, b.z / SCALE + 370);
    ink.rotate(-b.angle);
    ink.fillRect(-b.w / SCALE / 2, -b.d / SCALE / 2, b.w / SCALE, b.d / SCALE);
    ink.restore();
  }
  const nearby = el("nearbyMap"), overview = el("campusMap");
  return (position, yaw, mode, route) => {
    const expanded = el("mapDialog").open;
    const surface = expanded ? overview : nearby;
    const w = surface.clientWidth, h = surface.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
    if (surface.width !== pw || surface.height !== ph) {
      surface.width = pw;
      surface.height = ph;
    }
    const g = surface.getContext("2d");
    g.setTransform(pw / w, 0, 0, ph / h, 0, 0);
    g.clearRect(0, 0, w, h);
    const u = position.x / SCALE + 780, v = position.z / SCALE + 370;
    const left = Math.min(0, u - 24), right = Math.max(mapWidth, u + 24);
    const top = Math.min(0, v - 24), bottom = Math.max(mapHeight, v + 24);
    const scale = expanded ? Math.min(w / (right - left), h / (bottom - top)) : w / 255;
    const cx = expanded ? (left + right) / 2 : u, cy = expanded ? (top + bottom) / 2 : v;
    const sx = (x) => w / 2 + (x - cx) * scale, sy = (y) => h / 2 + (y - cy) * scale;
    g.drawImage(base, sx(0), sy(0), mapWidth * scale, mapHeight * scale);
    if (expanded) {
      g.font = '12px "Microsoft YaHei", sans-serif';
      g.textAlign = "center";
      g.lineWidth = 3;
      for (const [id, label] of [[190, "密氏校门"], [180, "运动场"], [154, "水塔"], [182, "黄浦江岸"]]) {
        const site = byId.get(id), x = sx(site.u), y = sy(site.v) + 16;
        g.strokeStyle = "#253f37";
        g.strokeText(label, x, y);
        g.fillStyle = "#f6f0db";
        g.fillText(label, x, y);
      }
    }
    const px = sx(u), py = sy(v);
    if (route.length) {
      g.beginPath();
      g.moveTo(px, py);
      let x, y;
      for (const step of route) {
        x = sx(step.x / SCALE + 780);
        y = sy(step.z / SCALE + 370);
        g.lineTo(x, y);
      }
      g.strokeStyle = "#ffe58b";
      g.lineWidth = 2.5;
      g.setLineDash([5, 3]);
      g.stroke();
      g.setLineDash([]);
      g.beginPath();
      g.arc(x, y, 4, 0, 2 * Math.PI);
      g.fillStyle = "#ffe58b";
      g.fill();
    }
    g.save();
    g.translate(px, py);
    g.rotate(yaw);
    g.beginPath();
    if (mode === "orbit") g.arc(0, 0, 5, 0, 2 * Math.PI);
    else {
      g.moveTo(0, -9);
      g.lineTo(6, 7);
      g.lineTo(0, 4);
      g.lineTo(-6, 7);
      g.closePath();
    }
    g.strokeStyle = "#163d36";
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = "#fff6c9";
    g.fill();
    g.restore();
  };
}
