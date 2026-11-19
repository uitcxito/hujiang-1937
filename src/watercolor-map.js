// Coordinates on the approved 734 × 382 watercolor plate. Each row pairs the
// printed name with the visible outline of the corresponding model.
const watercolorSites = [
  [190, [8, 252, 58, 15], "M50,229 50,236 53,243 56,243 56,232Z M43,210 40,211 42,222 41,216 44,213Z"],
  [112, [145, 178, 54, 17], "M239,201 234,201 231,197 228,202 214,203 211,198 207,204 205,202 203,205 196,205 190,202 187,206 188,232 196,247 242,243 243,217Z"],
  [113, [268, 275, 54, 18], "M297,194 293,194 289,190 284,195 273,197 269,191 265,197 261,196 261,198 251,199 248,195 245,199 245,225 253,241 301,235 302,210Z"],
  [121, [363, 202, 120, 19], "M473,117 461,129 461,147 443,149 443,173 450,188 453,189 456,195 507,189 508,165 502,143 494,143 485,126Z"],
  [153, [521, 134, 54, 17], "M525,83 520,84 519,81 515,85 511,78 507,86 502,83 501,86 488,88 483,81 478,89 476,87 475,112 490,135 506,132 508,138 518,137 517,131 532,130 532,107Z"],
  [154, [468, 28, 31, 15], "M506,46 497,48 497,86 502,86 502,83 507,85 511,80 511,54Z"],
  [161, [515, 26, 85, 15], "M514,54 512,56 512,80 515,84 519,81 520,84 526,83 533,110 537,109 537,107 543,107 543,93 540,80 533,81 523,60Z"],
  [166, [579, 126, 45, 15], "M547,85 547,104 555,119 570,118 572,123 580,123 580,117 592,115 592,96 588,80 579,81 576,78 574,82 568,82 565,76 561,83 557,84 554,80 552,84Z"],
  [167, [628, 120, 45, 15], "M594,77 593,99 602,116 647,111 648,93 643,75 638,75 635,71 633,76 630,72 628,76 625,72 624,76 621,72 619,77 615,71 612,76 610,74 609,78 606,74 604,79 601,74 600,79 596,75Z"],
  [141, [491, 206, 45, 15], "M562,157 557,157 553,152 549,158 545,155 540,159 537,156 531,160 528,157 524,161 519,156 514,164 514,184 522,199 566,194 566,173Z"],
  [142, [595, 200, 45, 15], "M631,155 625,157 623,153 620,157 610,159 608,153 596,155 595,160 588,161 583,157 579,163 579,177 584,187 589,192 604,189 609,193 620,192 621,187 635,186 636,172Z"],
  [131, [591, 234, 45, 15], "M551,204 541,214 542,241 563,280 582,278 581,242 577,243 574,239 572,225 566,225 563,209 556,209Z"],
  [180, [422, 268, 51, 16], ""],
  [182, [651, 320, 73, 17], ""],
];

function makeWatercolorMap(selectSite, refresh) {
  const dialog = el("mapDialog"), viewport = el("mapViewport"), surface = el("campusMap");
  const zoom = el("mapZoom"), links = el("mapSites"), frame = links.viewBox.baseVal;
  const svg = (tag) => document.createElementNS(links.namespaceURI, tag);
  for (const [id, bounds, outline] of watercolorSites) {
    const site = byId.get(id), link = svg("a"), label = svg("rect");
    link.setAttribute("href", "#placeCard");
    link.setAttribute("aria-label", site.name);
    for (const [i, key] of ["x", "y", "width", "height"].entries()) label.setAttribute(key, bounds[i]);
    if (outline) {
      const building = svg("path");
      building.setAttribute("d", outline);
      link.append(building);
    }
    link.append(label);
    link.addEventListener("click", (event) => {
      event.preventDefault();
      dialog.close();
      selectSite(site);
    });
    links.append(link);
  }

  let focusX = .5, focusY = .5;
  function setZoom(enlarged) {
    dialog.toggleAttribute("data-zoomed", enlarged);
    zoom.setAttribute("aria-pressed", String(enlarged));
    zoom.textContent = enlarged ? "查看全图" : "放大地图";
    viewport.scrollLeft = enlarged ? focusX * surface.clientWidth - viewport.clientWidth / 2 : 0;
    viewport.scrollTop = enlarged ? focusY * surface.clientHeight - viewport.clientHeight / 2 : 0;
  }
  zoom.onclick = () => setZoom(!dialog.hasAttribute("data-zoomed"));
  dialog.addEventListener("close", () => setZoom(false));
  new ResizeObserver(() => { if (dialog.open) refresh(); }).observe(surface);

  return (position, yaw, mode, route, place) => {
    const g = mapContext(surface);
    if (!g) return;
    const w = surface.clientWidth, h = surface.clientHeight;
    // Ground-plane projection from the illustration's orthographic camera.
    // World metres at the gate, track and riverbank register both axes to the plate.
    function project({ x, z }) {
      return [
        (427.313001 + 1.22044892 * x + .55972353 * z) * w / frame.width,
        (200.199864 - .13105967 * x + 1.03831747 * z) * h / frame.height,
      ];
    }
    const [x, y] = project(position);
    const outside = x < 0 || x > w || y < 0 || y > h;
    const r = T.MathUtils.clamp(4.15 * w / frame.width, 4.2, 7.5);
    const pad = outside ? r * 2.2 + 2 : r + 1;
    const px = T.MathUtils.clamp(x, pad, w - pad), py = T.MathUtils.clamp(y, pad, h - pad);
    focusX = px / w; focusY = py / h;
    drawMapRoute(g, [x, y], route, project);
    let angle = null;
    if (outside) angle = Math.atan2(x - px, py - y);
    else if (mode !== "orbit") {
      const [fx, fy] = project({ x: position.x + Math.sin(yaw), z: position.z - Math.cos(yaw) });
      angle = Math.atan2(fx - x, y - fy);
    }
    drawMapPosition(g, px, py, angle, r);
    el("mapPositionKind").textContent = mode === "orbit" ? "鸟瞰中心" : mode === "drone" ? "无人机位置" : "所在位置";
    el("mapPlace").textContent = outside ? place + "（图外）" : place;
    el("mapRouteHint").textContent = route.length ? " · 虚线为剩余路线" : "";
  };
}
