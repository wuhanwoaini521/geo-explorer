"""Determine solid_light direction convention with a cube test (red=-X, blue=+X)."""
from __future__ import annotations

import sys
from pathlib import Path


import bpy
from mathutils import Vector



argv = sys.argv[sys.argv.index("--") + 1:]
outdir = Path(argv[0])


def build_cube():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.mesh.primitive_cube_add(size=200, location=(0, 0, 100))
    obj = bpy.context.object
    mesh = obj.data
    red = bpy.data.materials.new("red")
    red.diffuse_color = (1.0, 0.1, 0.1, 1)
    blue = bpy.data.materials.new("blue")
    blue.diffuse_color = (0.1, 0.3, 1.0, 1)
    mesh.materials.append(red)
    mesh.materials.append(blue)
    # cube polygon order: -x, +x, -y, +y, -z, +z (Blender ordering)
    faces = list(mesh.polygons)
    faces[0].material_index = 0  # -x red
    faces[1].material_index = 1  # +x blue


def render(dirv: Vector, out: str) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 600
    scene.render.resolution_y = 400
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = True
    sh = scene.display.shading
    sh.light = "STUDIO"
    sh.color_type = "MATERIAL"
    sh.use_world_space_lighting = True
    sl = sh.selected_studio_light
    for li in sl.solid_lights:
        li.use = False
    m0 = sl.solid_lights[0]
    m0.use = True
    m0.direction = dirv
    m0.diffuse_color = (1.0, 1.0, 1.0)
    m0.smooth = 0.0
    # (light_ambient is read-only in 5.2; use extra solid lights for the base brightness)
    cam_data = bpy.data.cameras.new("C")
    cam = bpy.data.objects.new("C", cam_data)
    bpy.context.collection.objects.link(cam)
    cam.location = Vector((900, 620, 500))
    target = Vector((0, 0, 100))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 60
    scene.camera = cam
    scene.render.filepath = str(Path(out).resolve())
    bpy.ops.render.render(write_still=True)


def analyze(path: str) -> None:
    im = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)
    h, w = im.shape[:2]
    # cube occupies center: sample wall extremes along horizontal mid line
    row = im[h // 2, :]
    left = row[: w // 2]
    right = row[w // 2:]
    print(f"{Path(path).name}: left_mean={left.mean():.2f}  right_mean={right.mean():.2f}")


def main() -> None:
    build_cube()
    render(Vector((1.0, 0.0, -0.2)).normalized(), str(outdir / "posx.png"))
    render(Vector((-1.0, 0.0, -0.2)).normalized(), str(outdir / "negx.png"))


if __name__ == "__main__":
    main()