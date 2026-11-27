"""Small authoring primitives in campus metres, Y up. Blender exports the assembled meshes as glTF."""

import json
import math
import struct
from collections import defaultdict
from pathlib import Path

import bpy
from mathutils import Vector

TEX = None
MATERIALS = {}


def color(rgb):
    return tuple(((v / 255 + 0.055) / 1.055) ** 2.4 if v > 10 else v / 3294.6 for v in rgb) + (1,)


def surface(name, rgb, rough=0.85, metal=0, image=None, normal=None, cutout=False):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, link = mat.node_tree.nodes, mat.node_tree.links.new
    bsdf = nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color(rgb)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = metal
    if image:
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(str(TEX / image), check_existing=True)
        link(tex.outputs["Color"], bsdf.inputs["Base Color"])
        if cutout:
            link(tex.outputs["Alpha"], bsdf.inputs["Alpha"])
    if normal:
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = bpy.data.images.load(str(TEX / normal), check_existing=True)
        tex.image.colorspace_settings.name = "Non-Color"
        norm = nodes.new("ShaderNodeNormalMap")
        norm.inputs["Strength"].default_value = 0.65
        link(tex.outputs["Color"], norm.inputs["Color"])
        link(norm.outputs["Normal"], bsdf.inputs["Normal"])
    mat.use_backface_culling = not cutout
    MATERIALS[name] = mat


def setup(textures):
    global TEX
    TEX = Path(textures)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for name, rgb, rough, metal, image, norm in [
        ("Brick", (130, 79, 62), 0.88, 0, "brick.jpg", "brick-normal.png"),
        ("Limestone", (182, 173, 154), 0.81, 0, "stone.jpg", "stone-normal.png"),
        ("Terracotta", (120, 83, 65), 0.78, 0, "tile.jpg", "tile-normal.png"),
        ("Sill", (142, 132, 113), 0.79, 0, None, None),
        ("Arch brick", (145, 83, 66), 0.89, 0, None, None),
        ("Dark brick", (103, 65, 53), 0.90, 0, None, None),
        ("Window lead", (77, 80, 70), 0.63, 0.30, None, None),
        ("Timber", (84, 65, 49), 0.75, 0, None, None),
        ("Door panel", (102, 76, 54), 0.71, 0, None, None),
        ("Glass", (99, 121, 121), 0.19, 0.22, None, None),
        ("Glass shade", (81, 103, 104), 0.23, 0.21, None, None),
        ("Iron", (57, 61, 56), 0.54, 0.69, None, None),
        ("Inscription", (160, 150, 130), 0.85, 0, "inscription.png", None),
    ]:
        surface(name, rgb, rough, metal, image, norm)
    for kind in ("camphor", "zelkova", "maple"):
        surface(kind + " bark", (110, 103, 86), 0.92, 0, kind + "-bark.jpg", kind + "-bark-normal.png")
        surface(kind + " leaves", (100, 132, 65), 0.75, 0, kind + "-spray.png", cutout=True)


def blender(v):
    return (v[0], -v[2], v[1])


class Part:
    def __init__(self, name):
        self.name = name
        self.vertices = []
        self.faces = []
        self.slots = []
        self.uv = []
        self.smooth = []
        self.lookup = {}

    def face(self, points, mat, uv=None, smooth=False):
        points = [tuple(p) for p in points]
        # All authoring polygons are convex. Split first so a clipped arch edge or
        # circular reveal that collapses to a point never creates a zero-area face.
        if len(points) > 3:
            for i in range(1, len(points) - 1):
                tri = (0, i, i + 1)
                self.face([points[j] for j in tri], mat, [uv[j] for j in tri] if uv else None, smooth)
            return
        fn = (Vector(points[1]) - Vector(points[0])).cross(Vector(points[2]) - Vector(points[0]))
        if fn.length_squared < 1e-16:
            return
        if uv is None:
            axis = max(range(3), key=lambda i: abs(fn[i]))
            # The masonry map spans eight 0.24 m stretchers and 24 courses.
            scale = (
                (1.92, 1.86) if mat == "Brick" else (1.92, 2.08) if mat == "Terracotta" else (1.6, 1.6)
            )
            axes = ((2, 1), (0, 2), (0, 1))[axis]
            uv = [(p[axes[0]] / scale[0], p[axes[1]] / scale[1]) for p in points]
        ids = []
        for p in points:
            idx = self.lookup.get(p)
            if idx is None:
                idx = len(self.vertices)
                self.lookup[p] = idx
                self.vertices.append(blender(p))
            ids.append(idx)
        self.faces.append(ids)
        self.slots.append(mat)
        self.uv.extend(uv)
        self.smooth.append(smooth)

    def build(self, parent):
        if not self.faces:
            return None
        mesh = bpy.data.meshes.new(self.name)
        mesh.from_pydata(self.vertices, [], self.faces)
        mesh.update()
        ob = bpy.data.objects.new(self.name, mesh)
        bpy.context.collection.objects.link(ob)
        ob.parent = parent
        names = list(dict.fromkeys(self.slots))
        for name in names:
            mesh.materials.append(MATERIALS[name])
        for f, name, smooth in zip(mesh.polygons, self.slots, self.smooth):
            f.material_index = names.index(name)
            f.use_smooth = smooth
        tex = mesh.uv_layers.new(name="UVMap")
        tex.data.foreach_set("uv", [v for uv in self.uv for v in uv])
        mesh.validate(clean_customdata=False)
        return ob


def empty(name):
    ob = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(ob)
    return ob


class Frame:
    def __init__(self, x, z, nx=0, nz=1):
        self.x, self.z, self.nx, self.nz = x, z, nx, nz

    def p(self, u, y, d=0):
        return (self.x + self.nz * u + self.nx * d, y, self.z - self.nx * u + self.nz * d)


def block(part, frame, u, y, d, w, h, depth, mat):
    a, b = u - w / 2, u + w / 2
    lo, hi = d - depth / 2, d + depth / 2
    verts = [frame.p(x, v, z) for z in (lo, hi) for v in (y, y + h) for x in (a, b)]
    for face in ((4, 5, 7, 6), (1, 0, 2, 3), (0, 4, 6, 2), (5, 1, 3, 7), (6, 7, 3, 2), (0, 1, 5, 4)):
        part.face([verts[i] for i in face], mat)


def tube(part, points, radii, mat, sides=8, phase=0, smooth=True):
    pts = [Vector(p) for p in points]
    rings = []
    ref = Vector((0, 0, 1))
    dist = 0
    lengths = [0]
    for i, p in enumerate(pts):
        tangent = (pts[min(i + 1, len(pts) - 1)] - pts[max(0, i - 1)]).normalized()
        if abs(tangent.dot(ref)) > 0.94:
            ref = Vector((1, 0, 0))
        a = tangent.cross(ref).normalized()
        b = tangent.cross(a).normalized()
        rings.append(
            [
                p
                + radii[i]
                * (
                    a * math.cos(phase + j * math.tau / sides)
                    + b * math.sin(phase + j * math.tau / sides)
                )
                for j in range(sides)
            ]
        )
        if i:
            dist += (p - pts[i - 1]).length
            lengths.append(dist)
    for i, (r0, r1) in enumerate(zip(rings, rings[1:])):
        for j in range(sides):
            k = (j + 1) % sides
            u = j / sides
            v = (j + 1) / sides
            part.face(
                (r0[j], r0[k], r1[k], r1[j]),
                mat,
                [
                    (u, lengths[i] * 0.65),
                    (v, lengths[i] * 0.65),
                    (v, lengths[i + 1] * 0.65),
                    (u, lengths[i + 1] * 0.65),
                ],
                smooth,
            )
    part.face(list(reversed(rings[0])), mat)
    part.face(rings[-1], mat)


def export(root, path):
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for o in root.children_recursive:
        o.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_tangents=True,
        export_extras=True,
        export_animations=False,
        export_image_format="AUTO",
    )
    # Explicit alpha masking keeps leaf depth, shadow and sorting identical across importers.
    raw = path.read_bytes()
    length = struct.unpack_from("<I", raw, 12)[0]
    obj = json.loads(raw[20 : 20 + length])
    for m in obj.get("materials", []):
        if m["name"].endswith(" leaves"):
            m.update(alphaMode="MASK", alphaCutoff=0.32, doubleSided=True)
    data = json.dumps(obj, separators=(",", ":"), ensure_ascii=False).encode()
    data += b" " * (-len(data) % 4)
    tail = raw[20 + length :]
    path.write_bytes(
        struct.pack("<4sIIII", b"glTF", 2, 20 + len(data) + len(tail), len(data), 0x4E4F534A)
        + data
        + tail
    )
