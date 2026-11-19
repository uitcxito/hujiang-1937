function mapContext(surface) {
  const w = surface.clientWidth, h = surface.clientHeight;
  if (!w || !h) return null;
  const dpr = Math.min(window.devicePixelRatio, 2);
  const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
  if (surface.width !== pw || surface.height !== ph) {
    surface.width = pw;
    surface.height = ph;
  }
  const g = surface.getContext("2d");
  g.setTransform(pw / w, 0, 0, ph / h, 0, 0);
  g.clearRect(0, 0, w, h);
  return g;
}

function drawMapRoute(g, start, route, project) {
  if (!route.length) return;
  g.beginPath();
  g.moveTo(...start);
  let end;
  for (const step of route) {
    end = project(step);
    g.lineTo(...end);
  }
  g.save();
  g.lineJoin = g.lineCap = "round";
  g.strokeStyle = "#f5ebd5";
  g.lineWidth = 3.4;
  g.stroke();
  g.setLineDash([5, 3.5]);
  g.strokeStyle = "#8b513d";
  g.lineWidth = 1.8;
  g.stroke();
  g.setLineDash([]);
  g.beginPath();
  g.arc(...end, 3.2, 0, 2 * Math.PI);
  g.fillStyle = "#8b513d";
  g.fill();
  g.strokeStyle = "#f5ebd5";
  g.lineWidth = 1;
  g.stroke();
  g.restore();
}

function drawMapPosition(g, x, y, angle, r) {
  g.save();
  g.translate(x, y);
  if (angle !== null) {
    g.rotate(angle);
    g.beginPath();
    g.moveTo(0, -r + 1);
    g.lineTo(0, -r * 2.15);
    g.lineCap = "round";
    g.strokeStyle = "#f7edd8";
    g.lineWidth = 3.8;
    g.stroke();
    g.strokeStyle = "#493d32";
    g.lineWidth = 1.7;
    g.stroke();
  }
  g.beginPath();
  g.arc(0, 0, r, 0, 2 * Math.PI);
  g.fillStyle = "#f7edd8";
  g.fill();
  g.strokeStyle = "#493d32";
  g.lineWidth = 1.5;
  g.stroke();
  g.beginPath();
  g.arc(0, 0, r * .34, 0, 2 * Math.PI);
  g.fillStyle = "#493d32";
  g.fill();
  g.restore();
}

function makeNearbyMap() {
  const base = canvas(mapWidth, mapHeight), ink = base.getContext("2d");
  function outline(points) {
    ink.beginPath();
    for (const [i, [x, y]] of points.entries()) i ? ink.lineTo(x, y) : ink.moveTo(x, y);
    ink.closePath();
  }
  outline([[riverU(0), 0], [mapWidth, 0], [mapWidth, mapHeight], [riverU(mapHeight), mapHeight]]);
  ink.fillStyle = "#a5b5b6";
  ink.fill();
  outline(boundary);
  ink.fillStyle = "#d8d9bd";
  ink.fill();
  ink.strokeStyle = "#a59b7c";
  ink.lineWidth = 2;
  ink.stroke();
  // Read the existing road mask once, including the short garden approaches.
  const roads = ink.createImageData(mapWidth, mapHeight);
  for (let y = 0; y < mapHeight; y++) {
    for (let x = 0; x < mapWidth; x++) {
      const src = 4 * (Math.floor(y * roadMask.height / mapHeight) * roadMask.width +
        Math.floor(x * roadMask.width / mapWidth));
      const i = 4 * (y * mapWidth + x);
      roads.data[i] = 194;
      roads.data[i + 1] = 175;
      roads.data[i + 2] = 146;
      roads.data[i + 3] = Math.max(maskPixels[src] > 125 ? maskPixels[src] : 0, maskPixels[src + 1]);
    }
  }
  const overlay = canvas(mapWidth, mapHeight);
  overlay.getContext("2d").putImageData(roads, 0, 0);
  ink.drawImage(overlay, 0, 0);
  ink.fillStyle = "#a96850";
  for (const b of obstacles) {
    ink.save();
    ink.translate(b.x / SCALE + 780, b.z / SCALE + 370);
    ink.rotate(-b.angle);
    ink.fillRect(-b.w / SCALE / 2, -b.d / SCALE / 2, b.w / SCALE, b.d / SCALE);
    ink.restore();
  }
  const nearby = el("nearbyMap");
  return (position, yaw, mode, route) => {
    const g = mapContext(nearby);
    if (!g) return;
    const w = nearby.clientWidth, h = nearby.clientHeight, scale = w / 255;
    const u = position.x / SCALE + 780, v = position.z / SCALE + 370;
    g.fillStyle = "#eae0cd";
    g.fillRect(0, 0, w, h);
    g.drawImage(base, w / 2 - u * scale, h / 2 - v * scale, mapWidth * scale, mapHeight * scale);
    drawMapRoute(g, [w / 2, h / 2], route, (p) => [
      w / 2 + (p.x - position.x) * scale / SCALE, h / 2 + (p.z - position.z) * scale / SCALE,
    ]);
    drawMapPosition(g, w / 2, h / 2, mode === "orbit" ? null : yaw, 4.2);
  };
}
