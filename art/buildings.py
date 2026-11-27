"""1937 exterior meshes. Facade frames face outwards; all measurements are in metres."""

import math
from meshkit import Frame, Part, block, empty, export, tube


def curve(width, height, shape):
    """Upper edge of a pointed, segmental or flat opening, ordered left to right."""
    radius = width / 2
    if shape in ("flat", "oculus"):
        return [(-radius, height), (radius, height)]
    rise = min(height * 0.42, radius * (1.22 if shape == "point" else 0.69))

    def arch(x):
        if shape == "point":
            offset = 0.38
            return rise * math.sqrt(
                max(0, ((1 + offset) ** 2 - (abs(x) / radius + offset) ** 2) / (1 + 2 * offset))
            )
        return rise * math.sqrt(max(0, 1 - (x / radius) ** 2))

    return [(radius * i / 10, height - rise + arch(radius * i / 10)) for i in range(-10, 11)]


def ring(part, f, cx, sill, w, h, t, depth, mat, shape, face=0.07):
    inner = curve(w, h, shape)
    outer = curve(w + 2 * t, h + t, shape)
    for i, (a, b) in enumerate(zip(inner, inner[1:])):
        c, d = outer[i], outer[i + 1]
        tone = ("Dark brick" if i % 6 == 1 else mat) if mat == "Arch brick" else mat
        q = lambda p, z: f.p(cx + p[0], sill + p[1], z)
        part.face([q(a, face), q(b, face), q(d, face), q(c, face)], tone)
        part.face([q(b, face), q(a, face), q(a, face - depth), q(b, face - depth)], mat)
        if mat == "Arch brick" and shape != "flat":
            # Each radial voussoir projects slightly from the mortar bed.
            def inset(p, toward):
                return tuple(x + 0.043 * (y - x) for x, y in zip(p, toward))

            corners = [inset(a, b), inset(b, a), inset(d, c), inset(c, d)]
            crest = face + 0.023 + (0.016 if i in (9, 10) else 0)
            part.face([q(point, crest) for point in corners], tone)
            for j in range(4):
                left, right = corners[j], corners[(j + 1) % 4]
                part.face(
                    [q(left, face), q(right, face), q(right, crest), q(left, crest)], "Dark brick"
                )
    for s in [-1, 1]:
        block(part, f, cx + s * (w + t) / 2, sill, face - depth / 2, t, inner[0][1], depth, mat)


def glazing(part, f, cx, sill, w, h, shape, columns, door=False):
    edge = curve(w, h, shape)
    recess = -0.34 if door else -0.24

    def top(u):
        for (x, y), (xx, yy) in zip(edge, edge[1:]):
            if u <= xx + 1e-6:
                return y + (yy - y) * (u - x) / (xx - x)
        return edge[-1][1]

    # Individual inset panes carry subtle alternating reflection, bounded by physical glazing bars.
    for i in range(columns):
        a = -w / 2 + i * w / columns
        b = a + w / columns
        strip = [(a, top(a))] + [(x, y) for x, y in edge if a < x < b] + [(b, top(b))]
        pts = [f.p(cx + a, sill, recess), f.p(cx + b, sill, recess)]
        pts.extend(f.p(cx + x, sill + y, recess) for x, y in reversed(strip))
        part.face(pts, "Timber" if door else ("Glass shade" if i % 3 == 0 else "Glass"))
        if i:
            bar = 0.082 if door else (0.145 if w > 3.2 else 0.058)
            block(
                part,
                f,
                cx + a,
                sill,
                recess + 0.065,
                bar,
                top(a),
                0.15 if w > 3.2 else 0.082,
                "Timber" if door else "Limestone" if w > 3.2 else "Window lead",
            )
        if door:
            pc = cx + (a + b) / 2
            for j in range(2):
                block(
                    part,
                    f,
                    pc,
                    sill + 0.18 + j * 0.79,
                    recess + 0.043,
                    (b - a) * 0.77,
                    0.59,
                    0.07,
                    "Door panel",
                )
            tube(
                part,
                [
                    f.p(pc + (b - a) * 0.33, sill + 1.05, recess + 0.07),
                    f.p(pc + (b - a) * 0.33, sill + 1.27, recess + 0.07),
                ],
                [0.021, 0.021],
                "Iron",
            )
    for y in [h * 0.67] if door else ([h * 0.31, h * 0.63] if h > 2.2 else [h * 0.49]):
        wide = w > 3.2 and y < h * 0.4
        block(
            part,
            f,
            cx,
            sill + y,
            recess + 0.058,
            w,
            0.153 if wide else 0.047,
            0.19 if wide else 0.083,
            "Timber" if door else "Limestone" if wide else "Window lead",
        )
    if w > 3.2 and not door:
        # Five sub-lancets terminate at different heights beneath the stone hood.
        pitch = w / columns
        for i in range(columns):
            mid = -w / 2 + (i + 0.5) * pitch
            finish = min(top(mid - pitch * 0.40), top(mid + pitch * 0.40)) - 0.16
            arch = curve(pitch - 0.13, 0.77, "point")
            pts = [f.p(cx + mid + x, sill + finish - 0.77 + y, recess + 0.10) for x, y in arch]
            tube(part, pts, [0.070] * len(pts), "Limestone", 7)
            # Diamond leaded lights in the upper register, trimmed at the masonry.
            left, right = mid - pitch * 0.42, mid + pitch * 0.42
            for sign in (-1, 1):
                n = int((finish - h * 0.33) / 0.41) + 2
                for j in range(n):
                    yy = h * 0.32 + j * 0.41
                    if yy + 0.35 > finish - 0.52:
                        continue
                    tube(
                        part,
                        [
                            f.p(cx + left, sill + yy + (0 if sign == 1 else 0.36), recess + 0.019),
                            f.p(cx + right, sill + yy + (0.36 if sign == 1 else 0), recess + 0.019),
                        ],
                        [0.011, 0.011],
                        "Window lead",
                        4,
                    )
    return edge, recess


def oculus(part, f, cx, sill, diameter):
    r = diameter / 2
    cy = sill + r
    angles = [i * math.tau / 40 for i in range(40)]

    def point(a, rad, z):
        return f.p(cx + rad * math.cos(a), cy + rad * math.sin(a), z)

    for i, a in enumerate(angles):
        b = angles[(i + 1) % len(angles)]
        outer = lambda ang: point(ang, r / max(abs(math.cos(ang)), abs(math.sin(ang))), 0)
        part.face([point(a, r, 0), outer(a), outer(b), point(b, r, 0)], "Brick")
        for (outerR, z0), (innerR, z1), mat in [
            ((r, 0), (0.94 * r, 0.075), "Limestone"),
            ((0.94 * r, 0.075), (0.79 * r, 0.065), "Limestone"),
            ((0.79 * r, 0.065), (0.76 * r, -0.21), "Sill"),
        ]:
            part.face(
                [
                    point(a, outerR, z0),
                    point(b, outerR, z0),
                    point(b, innerR, z1),
                    point(a, innerR, z1),
                ],
                mat,
            )
    part.face([point(a, r * 0.76, -0.216) for a in angles], "Glass")
    block(part, f, cx, cy - r * 0.75, -0.18, 0.044, r * 1.50, 0.055, "Window lead")


def wall(part, f, w, h, openings, plinth=True):
    """Build only the solid intervals; reveals, arch rings and sills surround actual holes."""
    limits = sorted(set([-w / 2, w / 2] + [op[0] + s * op[2] / 2 for op in openings for s in (-1, 1)]))

    def panel(a, b, low, high):
        if high <= low + 0.001:
            return
        part.face([f.p(a, low), f.p(b, low), f.p(b, high), f.p(a, high)], "Brick")

    for a, b in zip(limits, limits[1:]):
        active = sorted(
            (op for op in openings if abs((a + b) / 2 - op[0]) < op[2] / 2), key=lambda op: op[1]
        )
        base = 0
        for cx, sill, ow, oh, shape, cols, door in active:
            panel(a, b, base, sill)
            contour = curve(ow, oh, shape)

            def height(x):
                for (u, y), (v, yy) in zip(contour, contour[1:]):
                    if x <= v + 0.0001:
                        return sill + y + (yy - y) * (x - u) / (v - u)
                return sill + oh

            low = a - cx
            high = b - cx
            seg = (
                [(low, height(low))]
                + [(x, sill + y) for x, y in contour if low + 0.001 < x < high - 0.001]
                + [(high, height(high))]
            )
            for (x, y), (xx, yy) in zip(seg, seg[1:]):
                if min(y, yy) >= sill + oh - 0.0001:
                    continue
                poly = [f.p(x + cx, y), f.p(xx + cx, yy)]
                if yy < sill + oh - 0.00001:
                    poly.append(f.p(xx + cx, sill + oh))
                if y < sill + oh - 0.00001:
                    poly.append(f.p(x + cx, sill + oh))
                if len(poly) >= 3:
                    part.face(poly, "Brick")
            base = sill + oh
        panel(a, b, base, h)
    for cx, sill, ow, oh, shape, cols, door in openings:
        if shape == "oculus":
            oculus(part, f, cx, sill, ow)
            continue
        edge, recess = glazing(part, f, cx, sill, ow, oh, shape, cols, door)
        ww = 0.19 if door or ow > 3.3 else 0.10
        ring(
            part,
            f,
            cx,
            sill,
            ow,
            oh,
            ww,
            0.13,
            "Limestone" if door or ow > 2.9 else "Arch brick",
            shape,
            0.09,
        )
        ring(part, f, cx, sill, ow - 0.07, oh - 0.04, 0.075, abs(recess) + 0.03, "Sill", shape, 0.012)
        for s in [-1, 1]:
            start = edge[0][1]
            pts = [
                f.p(cx + s * ow / 2, sill, 0),
                f.p(cx + s * ow / 2, sill + start, 0),
                f.p(cx + s * ow / 2, sill + start, recess),
                f.p(cx + s * ow / 2, sill, recess),
            ]
            part.face(pts if s > 0 else pts[::-1], "Sill")
        if door:
            continue
        block(part, f, cx, sill - 0.105, 0.028, ow + 0.31, 0.105, 0.37, "Limestone")
        block(part, f, cx, sill - 0.16, -0.025, ow + 0.18, 0.058, 0.21, "Sill")
    if plinth:
        block(part, f, 0, 0.02, -0.025, w, 0.49, 0.14, "Sill")


def gable(part, f, w, eave, rise, rose=0):
    # Optional true circular aperture, with stone tracery recessed in the gable.
    if rose:
        cy = eave + rise * 0.33
        corners = [(-w / 2, eave), (w / 2, eave), (0, eave + rise)]
        angles = sorted(
            set(
                [i * math.tau / 72 for i in range(72)]
                + [math.atan2(y - cy, x) % math.tau for x, y in corners]
            )
        )
        inner = []
        outer = []
        for a in angles:
            dx, dy = math.cos(a), math.sin(a)
            reach = []
            if dy < -0.00001:
                reach.append((eave - cy) / dy)
            for side in (-1, 1):
                k = dy + side * 2 * rise / w * dx
                if k > 0.00001:
                    reach.append((eave + rise - cy) / k)
            t = min(reach)
            inner.append(f.p(dx * rose, cy + dy * rose))
            outer.append(f.p(dx * t, cy + dy * t))
        for j in range(len(angles)):
            k = (j + 1) % len(angles)
            part.face([inner[j], outer[j], outer[k], inner[k]], "Brick")
        part.face(
            [f.p(rose * math.cos(a), cy + rose * math.sin(a), -0.18) for a in angles], "Glass shade"
        )
        for r, z, rad in [
            (rose, 0.055, 0.115),
            (rose * 0.82, -0.03, 0.049),
            (rose * 0.23, -0.045, 0.045),
        ]:
            pts = [
                f.p(r * math.cos(i * math.tau / 48), cy + r * math.sin(i * math.tau / 48), z)
                for i in range(49)
            ]
            tube(part, pts, [rad] * 49, "Limestone", 8)
        for i in range(8):
            a = i * math.tau / 8
            tube(
                part,
                [
                    f.p(r * math.cos(a), cy + r * math.sin(a), -0.055)
                    for r in [rose * 0.23, rose * 0.86]
                ],
                [0.044, 0.040],
                "Limestone",
                8,
            )
    else:
        part.face([f.p(-w / 2, eave), f.p(w / 2, eave), f.p(0, eave + rise)], "Brick")
    for side in (-1, 1):
        p = [f.p(side * w * 0.51, eave + 0.02, 0.025), f.p(0, eave + rise + 0.075, 0.025)]
        tube(part, p, [0.13, 0.13], "Limestone", 4, math.pi / 4, False)


def roof(part, cx, cz, length, width, eave, rise, axis="x"):
    def p(u, y, v):
        return (cx + u, y, cz + v) if axis == "x" else (cx - v, y, cz + u)

    l = length / 2 + 0.22
    d = width / 2 + 0.22
    for s in (-1, 1):
        points = [
            p(-l, eave + rise, 0),
            p(l, eave + rise, 0),
            p(l, eave - 0.10, s * d),
            p(-l, eave - 0.10, s * d),
        ]
        coords = [(-l / 1.92, 0), (l / 1.92, 0), (l / 1.92, d / 2.08), (-l / 1.92, d / 2.08)]
        part.face(points[::-1] if s == 1 else points, "Terracotta", coords[::-1] if s == 1 else coords)
        tube(part, [p(-l, eave - 0.13, s * d), p(l, eave - 0.13, s * d)], [0.087, 0.087], "Sill", 8)
    # Rounded overlapping ridge units give a visible segmented skyline.
    count = math.ceil(length / 0.62)
    for i in range(count):
        u = -l + i * 2 * l / count
        tube(
            part,
            [p(u, eave + rise + 0.035, 0), p(u + 2 * l / count + 0.024, eave + rise + 0.035, 0)],
            [0.13, 0.116],
            "Arch brick",
            8,
        )


def buttress(p, f, u, h):
    for y, w, d, hh in [
        (0, 0.95, 0.67, 0.49),
        (0.49, 0.79, 0.52, h * 0.54 - 0.49),
        (h * 0.54, 0.69, 0.45, h * 0.46 - 0.22),
        (h - 0.22, 0.76, 0.53, 0.22),
    ]:
        block(p, f, u, y, d * 0.39, w, hh, d, "Limestone" if y >= h - 0.23 else "Brick")
    block(p, f, u, h * 0.54 - 0.09, 0.17, 0.87, 0.12, 0.69, "Sill")


def stair(p, f, u, width, count, depth, step=0.15):
    levels = []
    for i in range(count):
        d = 0.02 + depth * (count - 1 - i)
        block(p, f, u, 0, d, width + (count - i) * 0.045, step * (i + 1), depth + 0.025, "Sill")
        block(
            p,
            f,
            u,
            step * (i + 1) - 0.055,
            d + 0.022,
            width + (count - i) * 0.045 + 0.035,
            0.055,
            depth + 0.075,
            "Limestone",
        )
        x, y, z = f.p(u, 0, d)
        levels.append(
            [
                x,
                z,
                (depth + 0.075 if f.nx else width + (count - i) * 0.045 + 0.035),
                (width + (count - i) * 0.045 + 0.035 if f.nx else depth + 0.075),
                step * (i + 1),
            ]
        )
    return levels


def op(u, y, w, h, shape="flat", bars=2, door=False):
    return (u, y, w, h, shape, bars, door)


def auditorium():
    p = Part("Auditorium exterior")
    f = Frame(-15.5, 7.5, -1, 0)
    # West entrance. Stone liners and the dark inner door are set back into twin portals.
    door = [op(u, 0.60, 2.04, 3.03, "round", 2, True) for u in (-1.20, 1.20)]
    wall(
        p,
        f,
        15,
        10.40,
        door + [op(0, 4.45, 6.05, 5.30, "point", 5)] + [op(u, 1.2, 1.19, 1.55) for u in (-5.35, 5.35)],
        False,
    )
    for s in [-1, 1]:
        block(p, f, s * 5.29, 3.82, 0.04, 4.44, 0.14, 0.24, "Limestone")
    gable(p, f, 15, 10.4, 4.8)
    for u in (-7.05, 7.05):
        buttress(p, f, u, 9.8)
    for u in (-2.57, 2.57):
        block(p, f, u, 0.02, 0.24, 0.58, 3.72, 0.79, "Limestone")
        block(p, f, u, 3.50, 0.25, 0.82, 0.18, 0.89, "Sill")
    block(p, f, 0, 3.78, 0.22, 5.92, 0.17, 0.85, "Limestone")
    ts = stair(p, f, 0, 6.20, 4, 0.36)
    for side in [-1, 1]:
        long = Frame(0, 7.5 + side * 7.5, 0, side)
        # The north wall is partly concealed by the shorter chapel.
        spaces = [-12.6, -8.4, -4.2, 0, 4.2, 8.4, 12.6] if side == 1 else [3.0, 7.2, 11.4]
        windows = []
        for i, u in enumerate(spaces):
            upper = (
                op(u, 6.65, 1.58, 1.58, "oculus") if i % 6 == 0 else op(u, 5.04, 2.20, 4.04, "point", 2)
            )
            windows += [op(u, 1.08, 2.10, 1.58), upper]
            buttress(p, long, u - 1.93, 9.88)
        wall(p, long, 31, 10.40, windows)
        block(p, long, 0, 3.85, 0.04, 31, 0.15, 0.24, "Limestone")
    east = Frame(15.5, 7.5, 1, 0)
    wall(
        p,
        east,
        15,
        10.4,
        [op(0, 4.25, 5.65, 5.76, "point", 5)] + [op(u, 1.05, 2.10, 1.67) for u in [-4, 0, 4]],
    )
    gable(p, east, 15, 10.4, 4.8)
    roof(p, 0, 7.5, 31, 15, 10.4, 4.8)
    north = Frame(8.78, -14.875, 0, -1)
    wall(
        p,
        north,
        13.45,
        8.75,
        [
            op(0, 4.06, 6.95, 4.45, "round", 5),
            op(0, 0.34, 1.52, 2.06, "flat", 2, True),
            op(-4.65, 1.13, 2.14, 1.4),
            op(4.65, 1.13, 2.14, 1.4),
        ],
    )
    gable(p, north, 13.45, 8.75, 4.42)
    for side in [-1, 1]:
        flank = Frame(8.78 + side * 6.725, -7.35, side, 0)
        windows = []
        for u in (-4.82, 0, 4.82):
            windows += [op(u, 1.14, 1.87, 1.42), op(u, 4.54, 1.78, 3.44, "point")]
            buttress(p, flank, u - 1.88, 8.47)
        wall(p, flank, 15.05, 8.75, windows)
        block(p, flank, 0, 3.84, 0.04, 15.05, 0.14, 0.23, "Limestone")
    roof(p, 8.78, -7.35, 15.05, 13.45, 8.75, 4.42, "z")
    obstacles = [
        [-0.0, 7.5, 30.10, 15, 10.4],
        [8.78, -7.35, 13.45, 15.05, 8.75],
        [-15.30, 2.41, 0.65, 4.82, 10.4],
        [-15.30, 12.59, 0.65, 4.82, 10.4],
        [-15.50, 7.5, 0.55, 0.36, 3.65],
    ]
    # Door leaves close the inner ends; the stone step reaches the recessed threshold.
    for u in [-1.2, 1.2]:
        obstacles.append([-15.09, 7.5 + u, 0.16, 2.08, 3.4])
    return p, obstacles, ts, [[0, 7.5, 31.5, 15.5, 15.4], [8.78, -7.35, 14, 15.6, 13.38]]


def yates():
    p = Part("Yates exterior")
    w, d = 55 * 0.4826, 34 * 0.4826
    h, rise = 9.85, 4.95
    obstacles = [[0, 0, w, d, h]]
    for side in (-1, 1):
        f = Frame(0, side * d / 2, 0, side)
        windows = []
        for i in range(7):
            u = (i - 3) * 3.50
            if i != 3 or side < 0:
                windows.append(op(u, 0.83, 1.62, 1.75))
            else:
                windows.append(op(u, 0.52, 1.94, 2.61, "round", 2, True))
            lancets = side == 1 and i in (4, 5)
            if lancets:
                for offset in [-0.56, 0.56]:
                    windows.append(op(u + offset, 3.91, 0.94, 4.12, "point", 1))
            else:
                windows.append(
                    op(u, 3.91, 2.02, 3.05 if i == 3 else 1.63, "round" if i == 3 else "flat", 2)
                )
            if i != 3 and not lancets:
                for j in [-1, 1]:
                    windows.append(op(u + j * 0.46, 6.84, 0.68, 1.56, "round", 1))
        wall(p, f, w, h, windows)
        for yy in (3.07, 6.28):
            block(p, f, 0, yy, 0.06, w + 0.12, 0.16, 0.29, "Sill")
        for u in [-w * 0.48, -w * 0.16, w * 0.16, w * 0.48]:
            buttress(p, f, u, h - 0.24)
        for u in [-w * 0.302, w * 0.302]:
            small = Frame(*[f.p(u, 0, 0.24)[k] for k in (0, 2)], 0, side)
            # Dormer face and slate cheeks sit above the wall, below the ridge.
            gable(p, small, 3.9, h, 2.24)
            for j in [-1, 0, 1]:
                block(p, small, j * 0.68, h + 0.12, 0.055, 0.37, 0.66, 0.10, "Glass shade")
            for s in (-1, 1):
                p.face(
                    [
                        small.p(0, h + 2.24, 0.05),
                        small.p(s * 1.95, h, 0.05),
                        small.p(0, h + 2.24, -3.5),
                    ],
                    "Terracotta",
                )
            tube(
                p,
                [small.p(0, h + 2.14, 0.02), small.p(0, h + 2.83, 0.02)],
                [0.18, 0.024],
                "Limestone",
                5,
            )
    south = Frame(0, d / 2)
    for u in (-2.81, -2.26, 2.26, 2.81):
        c = south.p(u, 0, 2.43)
        for a, b, r0, r1 in [
            (0, 0.54, 0.29, 0.29),
            (0.54, 0.68, 0.28, 0.22),
            (0.68, 3.13, 0.208, 0.170),
            (3.13, 3.31, 0.18, 0.30),
        ]:
            tube(p, [(c[0], a, c[2]), (c[0], b, c[2])], [r0, r1], "Limestone", 12)
        obstacles.append([c[0], c[2], 0.55, 0.55, 3.4])
    for y, wid, thk in [(3.30, 6.67, 0.19), (3.48, 6.95, 0.16), (3.64, 7.12, 0.13)]:
        block(p, south, 0, y, 1.20, wid, thk, 3.10, "Limestone")
    for side in [-1, 1]:
        f = Frame(side * w / 2, 0, side, 0)
        wins = [op(0, 0.55, 2.15, 2.65, "round", 2, side == 1)]
        for u in [-5.2, 5.2]:
            wins.append(op(u, 0.83, 1.75, 1.74))
        for u in [-5.45, -1.87, 1.87, 5.45]:
            wins.append(op(u, 3.96, 2.03, 4.02, "point"))
        wall(p, f, d, h, wins)
        gable(p, f, d, h, rise, 1.15 if side == 1 else 0)
        for level in (3.34, h - 0.19):
            block(p, f, 0, level, -0.005, d + 0.10, 0.12, 0.32, "Limestone")
            block(p, f, 0, level - 0.073, 0.004, d + 0.04, 0.068, 0.22, "Dark brick")
        # The end gable's crest and flanking spires predate the 1956 roof loss.
        for u in (0, -d * 0.19, d * 0.19, -d * 0.46, d * 0.46):
            base = h + rise * (1 - abs(u) / (d / 2))
            block(p, f, u, base - 0.12, 0.16, 0.52, 0.25, 0.56, "Brick")
            block(p, f, u, base + 0.13, 0.16, 0.61, 0.095, 0.65, "Limestone")
            tube(
                p,
                [f.p(u, base + 0.22, 0.16), f.p(u, base + 0.65, 0.16), f.p(u, base + 1.02, 0.16)],
                [0.26, 0.115, 0.018],
                "Limestone",
                4,
                math.pi / 4,
            )
        for u in [-d * 0.46, -d * 0.19, d * 0.19, d * 0.46]:
            ht = h + rise * (1 - abs(u) / (d / 2))
            buttress(p, f, u, ht - 0.14)
    roof(p, 0, 0, w, d, h, rise)
    for u in [-w * 0.35, 0, w * 0.34]:
        block(p, south, u, h + rise - 1.1, -d / 2 + 0.34, 0.72, 2.05, 0.74, "Brick")
        block(p, south, u, h + rise + 0.83, -d / 2 + 0.34, 0.86, 0.18, 0.91, "Sill")
    return (
        p,
        obstacles,
        stair(p, south, 0, 6.78, 3, 0.39),
        [[0, 0, w + 0.5, d + 0.5, h + rise + 1.12], [0, d / 2 + 1.19, 7.2, 3.15, 3.80]],
    )


def gate():
    mesh = Part("Millard gate")
    collisions = []
    west = Frame(0, 0, -1, 0)
    for sign in [-1, 1]:
        for centre, outer in [(3.30 * sign, False), (6.55 * sign, True)]:
            w = 1.15 if outer else 0.70
            ht = 3.48 if outer else 2.45
            front = 0.30 if outer else 0
            extra = 0.39 if outer else 0
            block(mesh, west, centre, 0, front, w + 0.31, 0.20, w + 0.31 + extra, "Sill")
            block(mesh, west, centre, 0.20, front, w + 0.15, 0.24, w + 0.15 + extra, "Limestone")
            courses = 8 if outer else 5
            ch = (ht - 0.44) / courses
            for i in range(courses):
                block(
                    mesh, west, centre, 0.44 + i * ch, front, w - 0.035, ch, w - 0.035 + extra, "Sill"
                )
                bw = w + (0.032 if outer and i % 3 == 1 else 0)
                block(
                    mesh,
                    west,
                    centre,
                    0.44 + i * ch + 0.015,
                    front,
                    bw,
                    ch - 0.036,
                    bw + extra,
                    "Limestone",
                )
            for offset, width, thick in [
                (0, w + 0.14, 0.10),
                (0.10, w + 0.25, 0.14),
                (0.24, w + 0.38, 0.12),
                (0.36, w + 0.06, 0.12),
            ]:
                block(mesh, west, centre, ht + offset, front, width, thick, width + extra, "Limestone")
            px, _, pz = west.p(centre, 0, front)
            points = [(px, ht + y, pz) for y in [0.46, 0.52, 0.65, 0.78, 0.87]]
            tube(mesh, points, [0.13, 0.20, 0.21, 0.13, 0.035], "Sill", 12)
            collisions.append([px, pz, w + 0.38 + extra, w + 0.38, ht + 0.88])
            if not outer and sign == 1:
                mesh.face(
                    [
                        west.p(centre + u, y, w / 2 + 0.008)
                        for u, y in [(-0.15, 0.71), (0.15, 0.71), (0.15, 2.13), (-0.15, 2.13)]
                    ],
                    "Inscription",
                    [(0, 0), (1, 0), (1, 1), (0, 1)],
                )
        # The paired leaves fold into the approach; side railings remain between masonry piers.
        for is_leaf in [False, True]:
            start = 3.30 * sign
            span = 2.91 if is_leaf else 2.49

            def q(t, y, dep=0):
                return (
                    (t + 0.16, y, start - sign * 0.50 + dep)
                    if is_leaf
                    else west.p(start + sign * (0.39 + t), y, dep)
                )

            for j in range(15):
                t = j * span / 14
                hh = 1.76 + 0.28 * math.sin(math.pi * j / 14)
                tube(mesh, [q(t, 0.24), q(t, hh)], [0.024, 0.023], "Iron", 6)
                tube(
                    mesh,
                    [q(t, hh - 0.025), q(t, hh + 0.07), q(t, hh + 0.19)],
                    [0.025, 0.055, 0.007],
                    "Iron",
                    4,
                )
            for y in [0.30, 1.34, 1.57]:
                tube(mesh, [q(0, y), q(span, y)], [0.034, 0.034], "Iron", 6)
            for j in range(7):
                mid = (j + 0.5) * span / 7
                pts = [
                    q(
                        mid + 0.117 * math.cos(math.tau * k / 12),
                        1.455 + 0.098 * math.sin(math.tau * k / 12),
                    )
                    for k in range(13)
                ]
                tube(mesh, pts, [0.013] * 13, "Iron", 5)
            if is_leaf:
                for y in [0.38, 1.5]:
                    tube(mesh, [q(0, y), q(0, y + 0.21)], [0.067, 0.068], "Iron")
                collisions.append([1.60, start - sign * 0.50, 3.05, 0.14, 2.22])
            else:
                collisions.append([0, start + sign * 1.64, 0.15, 2.5, 2.22])
    return mesh, collisions, [], collisions


def generate(folder):
    for name, builder, sid in [
        ("auditorium", auditorium, 121),
        ("yates", yates, 153),
        ("gate", gate, 190),
    ]:
        mesh, obstacles, stairs, flight = builder()
        root = empty(name)
        root["campusSite"] = sid
        # Node extras keep the invisible occupied volumes separate from decorative geometry.
        import json

        root["campusProxies"] = json.dumps(
            dict(walls=obstacles, steps=stairs, roofs=flight), separators=(",", ":")
        )
        mesh.build(root)
        export(root, folder / (name + ".glb"))
