"""Nine separately authored crown architectures. Lengths are in metres."""

import math
import random
from mathutils import Vector
from meshkit import Part, blender, empty, export, tube

# Height, clear bole, crown spread, primary scaffold azimuths, lean vector.
FORMS = {
    "camphor": [
        (10.1, 2.6, 4.75, [12, 83, 174, 236, 298], (0.25, -0.25)),
        (12.2, 4.1, 4.15, [39, 134, 213, 282, 351], (-0.26, 0.30)),
        (9.3, 1.85, 5.25, [8, 54, 125, 161, 269, 316], (1.02, 0.28)),
    ],
    "zelkova": [
        (13.2, 4.85, 4.10, [12, 102, 194, 297], (0.10, 0.13)),
        (10.8, 2.72, 4.9, [24, 68, 147, 213, 249, 318], (-0.52, 0.50)),
        (14.0, 5.35, 3.25, [31, 127, 214, 302, 351], (0.40, -0.25)),
    ],
    "maple": [
        (8.50, 2.15, 3.55, [19, 161, 275], (0.05, 0.28)),
        (10.3, 3.65, 3.18, [66, 215, 335, 125], (-0.44, 0.13)),
        (7.9, 1.45, 4.15, [12, 143, 239, 311], (0.85, -0.25)),
    ],
}


def make_form(kind, idx, parent):
    height, bole, spread, azimuths, lean = FORMS[kind][idx]
    randomizer = random.Random(193705 + idx * 3989 + list(FORMS).index(kind) * 97)
    rand = randomizer.uniform
    wood = Part("wood")
    leaves = Part("foliage")
    bark = kind + " bark"
    foliage = kind + " leaves"
    centre = Vector((lean[0], 0, lean[1]))

    def vec(a, r, y):
        return Vector((math.cos(a) * r, y, math.sin(a) * r))

    def limb(points, radii, sides=7):
        tube(wood, points, radii, bark, sides, rand(0, 0.48))

    radius = (0.34 if kind == "camphor" else 0.27 if kind == "zelkova" else 0.20) * (
        height / 10
    ) ** 0.62
    bottom = Vector((0, -0.12, 0))
    fork = centre * 0.35 + Vector((0, bole, 0))
    limb(
        [bottom, Vector((0, 0.24, 0)), fork * 0.44, fork],
        [radius * 1.58, radius * 1.16, radius, radius * 0.82],
        12,
    )
    for j in range(6):
        a = j * math.tau / 6 + rand(-0.27, 0.27)
        limb(
            [vec(a, 0.03, 0.39), vec(a, radius * 1.28, 0.12), vec(a, radius * rand(2, 3), -0.055)],
            [radius * 0.42, radius * 0.29, 0.025],
            7,
        )

    def spray(anchor, a, w, length, lift, roll):
        # A bent four-triangle leaflet spray, anchored by its stem to the twig.
        axis = vec(a, math.sqrt(max(0.04, 1 - lift * lift)), lift)
        side = vec(a + math.pi / 2, 1, 0) * math.cos(roll) + axis.cross(
            vec(a + math.pi / 2, 1, 0)
        ) * math.sin(roll)
        tip = anchor + axis * length
        lower = anchor - axis * (length * 0.07)
        left = lower - side * (w * 0.48)
        right = lower + side * (w * 0.48)
        ltip = tip - side * (w * 0.52)
        rtip = tip + side * (w * 0.52)
        mid = anchor + axis * (length * 0.48) + Vector((0, w * 0.12, 0))
        for a1, a2, uv1, uv2 in [
            (left, right, (0, 0), (1, 0)),
            (right, rtip, (1, 0), (1, 1)),
            (rtip, ltip, (1, 1), (0, 1)),
            (ltip, left, (0, 1), (0, 0)),
        ]:
            leaves.face([a1, a2, mid], foliage, [uv1, uv2, (0.50, 0.47)])

    for j, deg in enumerate(azimuths):
        a = math.radians(deg) + rand(-0.08, 0.08)
        frac = j / max(1, len(azimuths) - 1)
        root = fork + vec(a, 0.025, frac * bole * 0.22)
        # Camphor curves out low and back up. Zelkova holds long ascending forks.
        # Maple carries offset whorls on several distinct leaders.
        if kind == "camphor":
            bias = rand(0.79, 1.12) * (1 + 0.19 * math.cos(a) if idx == 2 else 1)
            lengths = (0.44, 0.73, 0.94)
            levels = (0.24, 0.53, rand(0.64, 0.87))
        elif kind == "zelkova":
            bias = rand(0.84, 1.09)
            lengths = (0.23, 0.58, 0.86)
            levels = (0.27, 0.62, rand(0.84, 0.98))
        else:
            bias = rand(0.73, 1.20)
            lengths = (0.15, 0.36, 0.58)
            levels = (0.24, 0.56, rand(0.83, 1.00))
        main = [root] + [
            centre + vec(a + rand(-0.17, 0.17), spread * bias * r, bole + (height - bole) * v)
            for r, v in zip(lengths, levels)
        ]
        limb(main, [radius * 0.72, radius * 0.49, radius * 0.29, 0.049], 9)
        total = 8 if kind == "maple" else 7
        for k in range(total):
            t = k / (total - 1)
            seg = 1 if t > 0.43 else 0
            rel = (t - 0.43) / 0.57 if seg else 0.26 + t / 0.43 * 0.71
            origin = main[seg + 1].lerp(main[seg + 2], max(0.03, min(0.97, rel)))
            side = -1 if k % 2 else 1
            turn = a + side * (rand(0.47, 1.12) if kind != "maple" else rand(0.65, 1.58))
            reach = (
                spread * (1.03 - 0.56 * t) * (0.72 if kind == "zelkova" else 0.90) * rand(0.68, 1.04)
            )
            climb = (
                (height - bole)
                * (0.35 if kind == "zelkova" else 0.19)
                * (1 - 0.37 * t)
                * rand(0.66, 1.14)
            )
            elbow = origin + vec(turn + 0.17 * side, reach * 0.55, climb * 0.48)
            end = origin + vec(turn, reach, climb)
            limb(
                [origin, elbow, end],
                [radius * (0.36 - 0.16 * t), 0.068 if kind != "maple" else 0.048, 0.019],
                6,
            )
            for m in range(5):
                q = 0.19 + 0.17 * m
                point = elbow.lerp(end, q) if m > 1 else origin.lerp(elbow, 0.47 + m * 0.34)
                az = turn + (1 if m % 2 else -1) * rand(0.51, 1.23)
                reach2 = spread * rand(0.14, 0.29)
                tip = point + vec(az, reach2, rand(0.22, 0.92))
                bend = point.lerp(tip, 0.52) + vec(az + 0.9, 0.13, -0.06)
                limb([point, bend, tip], [0.047, 0.027, 0.009], 5)
                for n in range(7):
                    v = n / 6
                    angle = az + (-1 if n % 2 else 1) * rand(0.22, 1.32)
                    start = bend.lerp(tip, 0.21 + 0.76 * v) if n > 2 else point.lerp(bend, 0.4 + v)
                    width = rand(0.92, 1.39) * (0.9 if kind == "maple" else 1)
                    spray(
                        start,
                        angle,
                        width,
                        width * rand(0.78, 1.14),
                        rand(-0.31, 0.87),
                        rand(-1.15, 1.15),
                    )
    # A separate upright crown fills the apex in the rounded camphor and the maple.
    for j in range(4 if kind != "zelkova" else 2):
        a = j * 2.399 + rand(-0.40, 0.40)
        top = fork + vec(a, spread * 0.24, height - bole - 0.35)
        bend = fork.lerp(top, 0.55) + vec(a, 0.28, 0)
        limb([fork, bend, top], [radius * 0.58, radius * 0.33, 0.032], 7)
        for k in range(10):
            angle = a + k * 2.399
            start = bend.lerp(top, 0.2 + 0.078 * k)
            end = start + vec(angle, spread * (0.43 - 0.024 * k), rand(0.48, 1.04))
            limb([start, end], [0.056, 0.012], 5)
            for n in range(7):
                size = rand(0.89, 1.29)
                spray(
                    start.lerp(end, 0.30 + n / 10),
                    angle + (-1) ** n * rand(0.3, 1),
                    size,
                    size,
                    rand(0.1, 0.81),
                    rand(-1, 1),
                )
    root = empty(kind + "_" + str(idx + 1))
    root.parent = parent
    root["species"] = kind
    root["form"] = idx
    root["trunkRadius"] = radius * 1.21
    wood.build(root)
    canopy = leaves.build(root)
    normals = []
    for v in canopy.data.vertices:
        x, z, y = v.co
        normal = Vector((x, (y - height * 0.51) * 0.53 + spread * 0.61, -z)).normalized()
        normals.append(blender(normal))
    for polygon in canopy.data.polygons:
        polygon.use_smooth = True
    canopy.data.normals_split_custom_set_from_vertices(normals)


def generate(folder):
    for species in FORMS:
        root = empty(species)
        for i in range(3):
            make_form(species, i, root)
        export(root, folder / (species + ".glb"))
