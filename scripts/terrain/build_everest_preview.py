"""Build and render Camera A from the processed Copernicus Everest terrain."""
from __future__ import annotations

import json
import math
import sys
from array import array
from pathlib import Path

import bpy
from mathutils import Vector


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def terrain_point(metadata: dict, longitude: float, latitude: float, elevation: float) -> Vector:
    bbox = metadata["bbox_wgs84"]
    x = ((longitude - bbox["west"]) / (bbox["east"] - bbox["west"]) - 0.5) * metadata["width_m"]
    y = (0.5 - (latitude - bbox["south"]) / (bbox["north"] - bbox["south"])) * metadata["height_m"]
    z = elevation - metadata["elevation_min_m"]
    return Vector((x, y, z))


def make_label(text: str, location: Vector, camera: bpy.types.Object) -> bpy.types.Object:
    curve = bpy.data.curves.new(f"{text}-label", "FONT")
    curve.body = text
    curve.align_x = "CENTER"
    curve.size = 390
    curve.extrude = 0
    curve.materials.append(bpy.data.materials["Label"])
    label = bpy.data.objects.new(f"{text}-label", curve)
    bpy.context.collection.objects.link(label)
    label.location = location
    # Font fronts use +Z; cameras view along their local -Z axis.
    label.rotation_euler = (camera.location - label.location).to_track_quat("Z", "Y").to_euler()
    return label


def main() -> None:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    if len(argv) != 3:
        raise RuntimeError("Usage: blender --background --python build_everest_preview.py -- WORK_DIR OUTPUT_DIR BLEND_PATH")
    project_root = Path(__file__).resolve().parents[2]
    def project_path(value: str) -> Path:
        path = Path(value)
        return path if path.is_absolute() else project_root / path
    work_dir, output_dir, blend_path = map(project_path, argv)
    output_dir.mkdir(parents=True, exist_ok=True)
    metadata = json.loads((work_dir / "everest-terrain-metadata.json").read_text(encoding="utf-8"))
    rows, columns = metadata["mesh_shape"]["rows"], metadata["mesh_shape"]["columns"]
    elevations = array("f")
    with (work_dir / "everest-terrain-height.raw").open("rb") as raw_file:
        elevations.fromfile(raw_file, rows * columns)
    colours = array("B")
    with (work_dir / "everest-terrain-colour.rgb").open("rb") as colour_file:
        colours.fromfile(colour_file, rows * columns * 3)
    snow_values = array("B")
    with (work_dir / "everest-terrain-snow.raw").open("rb") as snow_file:
        snow_values.fromfile(snow_file, rows * columns)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablock in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        pass

    width_m, height_m = metadata["width_m"], metadata["height_m"]
    dx, dy = width_m / (columns - 1), height_m / (rows - 1)
    vertices = [
        (-width_m / 2 + column * dx, height_m / 2 - row * dy, elevations[row * columns + column])
        for row in range(rows)
        for column in range(columns)
    ]
    faces = [
        (index, index + columns, index + columns + 1, index + 1)
        for row in range(rows - 1)
        for column in range(columns - 1)
        for index in [row * columns + column]
    ]
    mesh = bpy.data.meshes.new("EverestTerrain")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    terrain = bpy.data.objects.new("Everest Terrain — Copernicus GLO-30", mesh)
    bpy.context.collection.objects.link(terrain)

    colour_attr = mesh.color_attributes.new("terrain_colour", "BYTE_COLOR", "POINT")
    for index, colour in enumerate(colour_attr.data):
        offset = index * 3
        colour.color = (colours[offset] / 255, colours[offset + 1] / 255, colours[offset + 2] / 255, 1.0)
    material = bpy.data.materials.new("Terrain Rock + Snow")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    principled = nodes.get("Principled BSDF")
    attribute = nodes.new("ShaderNodeVertexColor")
    attribute.layer_name = "terrain_colour"
    links.new(attribute.outputs["Color"], principled.inputs["Base Color"])
    principled.inputs["Roughness"].default_value = 0.82
    terrain.data.materials.append(material)

    # Workbench keeps the host render stable. Give it three terrain materials
    # driven by the same DEM height+slope snow weight computed in prepare_everest_dem.py.
    material.diffuse_color = (0.20, 0.18, 0.15, 1.0)
    transition = bpy.data.materials.new("Weathered high rock")
    transition.diffuse_color = (0.42, 0.44, 0.43, 1.0)
    snow_material = bpy.data.materials.new("High snow and glacier")
    snow_material.diffuse_color = (0.72, 0.81, 0.84, 1.0)
    terrain.data.materials.append(transition)
    terrain.data.materials.append(snow_material)
    for polygon, face in zip(mesh.polygons, faces):
        snow_weight = sum(snow_values[index] for index in face) / (4 * 255)
        polygon.material_index = 0 if snow_weight < 0.20 else 1 if snow_weight < 0.58 else 2

    world = bpy.context.scene.world or bpy.data.worlds.new("World")
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.018, 0.04, 0.075, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.25
    bpy.ops.object.light_add(type="SUN", location=(0, 0, 20_000))
    sun = bpy.context.object
    sun.name = "Cold morning sun"
    sun.data.energy = 2.3
    sun.data.angle = math.radians(8)
    sun.rotation_euler = (math.radians(35), math.radians(-20), math.radians(-28))

    everest_data = metadata["everest_wgs84"]
    lhotse_data = metadata["lhotse_wgs84"]
    everest = terrain_point(metadata, everest_data["longitude"], everest_data["latitude"], everest_data["dem_elevation_m"])
    lhotse = terrain_point(metadata, lhotse_data["longitude"], lhotse_data["latitude"], lhotse_data["dem_elevation_m"])
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.name = "Camera A — Everest overview"
    camera.data.lens = 52
    camera.data.sensor_width = 36
    camera.data.clip_start = 10
    camera.data.clip_end = 100_000
    # A distant, elevated three-quarter view preserves the Himalayan context
    # while holding Everest as the compositional anchor.
    # Nepal/south-west looking north-east: the intended South Side of Everest
    # is visible, with Lhotse retained in the same terrain context.
    camera.location = everest + Vector((-17_000, 28_000, 14_500))
    target = everest + Vector((0, 0, -750))
    look_at(camera, target)
    bpy.context.scene.camera = camera

    # Temporary design markers become only the labeled validation render.
    marker_material = bpy.data.materials.new("Label")
    marker_material.diffuse_color = (1.0, 0.78, 0.24, 1.0)
    markers = []
    label_offsets = {
        "EVEREST": Vector((1_500, 400, 1_100)),
        "LHOTSE": Vector((-2_000, 350, 1_100)),
    }
    for name, point in (("EVEREST", everest), ("LHOTSE", lhotse)):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=250, location=point + Vector((0, 0, 400)))
        marker = bpy.context.object
        marker.name = f"{name} validation marker"
        marker.data.materials.append(marker_material)
        markers.extend((marker, make_label(name, point + label_offsets[name], camera)))
    south_label = make_label("SOUTH SIDE", everest + Vector((-5_500, -5_500, 1_200)), camera)
    markers.append(south_label)

    scene = bpy.context.scene
    # Eevee background rendering terminates without a diagnostic on this host.
    # Workbench is deterministic here and still renders the actual DEM mesh,
    # terrain vertex colours, studio lighting, shadows and cavity detail.
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "WORLD"
    scene.display.shading.background_type = "WORLD"
    scene.render.resolution_x = 1440
    scene.render.resolution_y = 1080
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.film_transparent = False
    scene.view_settings.look = "AgX - Medium High Contrast"
    for marker in markers:
        marker.hide_render = True
    scene.render.filepath = str(output_dir / "everest-terrain-preview.png")
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    bpy.ops.render.render(write_still=True)
    for marker in markers:
        marker.hide_render = False
    # Annotation geometry is intentionally rendered without projected text
    # shadows; it is an identification aid, not a lighting pass.
    scene.display.shading.show_shadows = False
    scene.render.filepath = str(output_dir / "everest-terrain-preview-labeled.png")
    bpy.ops.render.render(write_still=True)
    print(json.dumps({"everest_local_m": list(everest), "lhotse_local_m": list(lhotse), "faces": len(faces)}))


if __name__ == "__main__":
    main()
