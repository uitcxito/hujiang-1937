"""Create the original tileable PBR surfaces and botanical sprays used by the GLBs.
Run with Python, Pillow and NumPy. Output is an intermediate directory supplied by the caller.
"""

import math
import base64
import io
import os
import random
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(193705)
rand = random.Random(193705)


def noise(n, grid):
    raw = rng.normal(0, 1, (grid, grid))
    padded = np.pad(raw, 1, mode="wrap")
    tile = Image.fromarray(padded.astype("float32")).resize(
        ((grid + 2) * n // grid,) * 2, Image.Resampling.BICUBIC
    )
    start = n // grid
    return np.array(tile.crop((start, start, start + n, start + n)))


def save_surface(name, color, height, strength):
    c = np.uint8(np.clip(color, 0, 255))
    Image.fromarray(c).save(OUT / (name + ".jpg"), quality=90, subsampling=0)
    normals = np.stack(
        [
            (np.roll(height, 1, 1) - np.roll(height, -1, 1)) * strength,
            (np.roll(height, -1, 0) - np.roll(height, 1, 0)) * strength,
            np.ones_like(height),
        ],
        axis=-1,
    )
    normals /= np.maximum(np.linalg.norm(normals, axis=-1, keepdims=True), 0.0001)
    Image.fromarray(np.uint8((normals * 0.5 + 0.5) * 255)).save(
        OUT / (name + "-normal.png"), optimize=True
    )


def masonry():
    n = 768
    y, x = np.mgrid[:n, :n]
    fine, clouds = rng.normal(0, 1, (n, n)), noise(n, 16)
    warp = noise(n, 128) * 0.45
    row = y // 32
    across = (x + (row % 2) * 48) % n
    joint = np.minimum(
        np.minimum(across % 96, 95 - across % 96) + warp, np.minimum(y % 32, 31 - y % 32) + warp
    )
    face = np.clip((joint - 0.9) / 2.5, 0, 1)
    bricks = rng.normal(0, 7, (24, 8))[row, across // 96]
    grain = fine * 2.6 + clouds * 3.2 + noise(n, 64) * 3.6
    body = np.array([126, 76, 62]) + (bricks + grain)[:, :, None] * [1.0, 0.81, 0.68]
    mortar = np.array([136, 124, 105]) + (grain * 0.8)[:, :, None]
    color = mortar * (1 - face[:, :, None]) + body * face[:, :, None]
    save_surface("brick", color, face + fine * 0.028 + clouds * 0.05, 0.62)
    n = 512
    y, x = np.mgrid[:n, :n]
    fine = rng.normal(0, 1, (n, n))
    flecks = noise(n, 64) * 3 + fine * 2.6 + noise(n, 8) * 3
    save_surface(
        "stone",
        np.array([183, 174, 151]) + flecks[:, :, None],
        noise(n, 64) * 0.08 + fine * 0.025,
        0.65,
    )
    row = y // 64
    tx = (x + 32 * (row % 2)) % 64
    roll = np.cos((tx / 64) * 2 * math.pi)
    height = roll * 0.28 + (y % 64) / 90 - np.exp(-(y % 64) / 2.2) * 0.56
    tone = (
        roll * 6
        + noise(n, 16) * 3
        + fine * 1.8
        + rng.normal(0, 4, (8, 8))[row, ((x + 32 * (row % 2)) // 64) % 8]
    )
    save_surface("tile", np.array([116, 80, 66]) + tone[:, :, None], height, 1.7)


def bark(name, base, plates):
    n = 512
    y, x = np.mgrid[:n, :n]
    bend = noise(n, 8) * 4 + noise(n, 32) * 1.3
    grooves = np.abs(np.sin(2 * math.pi * (x * plates / n + bend * 0.022)))
    height = np.clip(grooves * 3, 0, 1) * 0.6 + noise(n, 64) * 0.09
    tone = (height - 0.43) * 23 + noise(n, 16) * 5 + rng.normal(0, 2.8, (n, n))
    if name != "camphor":
        patches = noise(n, 16) + noise(n, 32) * 0.43
        tone += (patches > 0.35) * 8 - (patches < -0.4) * 7
    save_surface(name + "-bark", np.array(base) + tone[:, :, None], height, 1.2)


def spray(kind):
    # One physical branchlet, with individually drawn leaves, petioles and lateral veins.
    size = 768
    img = Image.new("RGBA", (size, size))
    d = ImageDraw.Draw(img)
    palette = {"camphor": (82, 112, 58), "zelkova": (105, 131, 67), "maple": (95, 123, 63)}[kind]

    def leaf(p, angle, length, width):
        a = np.array([math.cos(angle), math.sin(angle)])
        b = np.array([-a[1], a[0]])

        def pt(t, w):
            v = p + a * t * length + b * w * width
            return tuple(v)

        if kind == "maple":
            outline = [
                (0, 0),
                (0.1, -0.52),
                (0.35, -0.72),
                (0.58, -1.0),
                (0.54, -0.40),
                (0.72, -0.34),
                (1, 0),
                (0.70, 0.34),
                (0.55, 0.42),
                (0.59, 1.0),
                (0.31, 0.72),
                (0.09, 0.45),
            ]
        else:
            outline = []
            steps = 18 if kind == "zelkova" else 12
            for side, rg in [(1, range(steps + 1)), (-1, range(steps - 1, 0, -1))]:
                for i in rg:
                    t = i / steps
                    breadth = math.sin(math.pi * t) ** 0.8 * (1.10 - 0.25 * t)
                    if kind == "zelkova" and i % 2:
                        breadth *= 0.83
                    outline.append((t, side * breadth))
        tone = rand.uniform(-18, 23)
        col = tuple(int(v + tone * f) for v, f in zip(palette, (0.88, 1, 0.72)))
        d.polygon([pt(t, w) for t, w in outline], fill=col + (255,))
        vein = tuple(min(255, v + 17) for v in col) + (255,)
        d.line([pt(0, 0), pt(0.92, 0)], fill=vein, width=2)
        for t in (0.26, 0.44, 0.63):
            for side in (-1, 1):
                d.line(
                    [pt(t, 0), pt(t + 0.16, side * 0.57)],
                    fill=tuple(min(255, v + 7) for v in col),
                    width=1,
                )

    # An open axial twig with separate lateral sprays. Gaps between leaves survive minification.
    stem = np.array([373.0, 725.0])
    for i in range(7):
        y = 641 - i * 79
        x = 370 + 12 * math.sin(i * 0.63)
        d.line([tuple(stem), (x, y)], fill=(85, 83, 56, 255), width=max(2, 7 - i // 2))
        stem = np.array([x, y])
        for side in (-1, 1):
            span = (248 - 15 * i) * rand.uniform(0.79, 1.04)
            base = stem + np.array([0.0, (16 * side if kind != "maple" else 0)])
            angle = (-0.56 if side > 0 else -math.pi + 0.56) + rand.uniform(-0.18, 0.18)
            axis = np.array([math.cos(angle), math.sin(angle)])
            end = base + axis * span
            d.line([tuple(base), tuple(end)], fill=(92, 90, 57, 255), width=3)
            for j in range(3):
                q = base + axis * span * (0.28 + 0.22 * j)
                for sign in (-1, 1):
                    leaf(
                        q,
                        angle + sign * rand.uniform(0.51, 0.97),
                        rand.uniform(47, 74),
                        rand.uniform(15, 23) if kind == "maple" else rand.uniform(10, 15),
                    )
            leaf(end, angle, rand.uniform(49, 70), 19 if kind == "maple" else 12)
    leaf(stem, -1.56, 72, 18)
    img = img.resize((512, 512), Image.Resampling.LANCZOS)
    # Extend leaf colour under transparent texels to prevent dark mip fringes.
    a = np.array(img)
    no = a[:, :, 3] == 0
    a[:, :, :3][no] = palette
    Image.fromarray(a).save(OUT / (kind + "-spray.png"), optimize=True)


masonry()
for species, base, count in [
    ("camphor", (92, 83, 66), 13),
    ("zelkova", (126, 119, 95), 9),
    ("maple", (110, 101, 84), 8),
]:
    bark(species, base, count)
    spray(species)
# Reuse the project's credited CC0 bark scan for the fissured older camphor trees.
source = (Path(__file__).resolve().parents[1] / "assets" / "surfaces.js").read_text("utf8")
for suffix, filename in [("Diffuse", "camphor-bark.jpg"), ("nor_gl", "camphor-bark-normal.png")]:
    start = source.index("bark_brown_02_" + suffix)
    encoded = re.search(r"base64,([A-Za-z0-9+/=]+)", source[start:]).group(1)
    scan = Image.open(io.BytesIO(base64.b64decode(encoded))).convert("RGB")
    scan.thumbnail((768, 768), Image.Resampling.LANCZOS)
    scan.save(OUT / filename)
# The old inscription's exact position is inferred in the historical record.
font_path = Path(os.environ.get("HUJIANG_CJK_FONT", "NotoSerifCJKsc-Regular.otf"))
if not font_path.exists():
    raise SystemExit("Set HUJIANG_CJK_FONT to the Noto Serif CJK SC Regular font.")
plaque = Image.new("RGB", (160, 576), (157, 146, 123))
pen = ImageDraw.Draw(plaque)
font = ImageFont.truetype(str(font_path), 104)
for i, c in enumerate("滬江大學"):
    pen.text((80, 73 + i * 140), c, font=font, anchor="mm", fill=(57, 55, 45))
plaque.save(OUT / "inscription.png")
