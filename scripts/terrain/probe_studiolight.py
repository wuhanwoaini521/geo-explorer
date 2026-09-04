"""Probe StudioLight datablock for directional control in Workbench shading."""
from __future__ import annotations

import bpy

def dump_struct(obj, name: str, depth: int = 0) -> None:
    if depth > 3:
        return
    print("  " * depth + f"--- {name} ---")
    for key in dir(obj):
        if key.startswith("_"):
            continue
        try:
            value = getattr(obj, key)
        except Exception:
            continue
        if callable(value):
            continue
        if hasattr(value, "bl_rna") and not isinstance(value, (float, int, str, bool)):
            print("  " * depth, f"{key}: <{type(value).__name__}>")
        else:
            print("  " * depth, f"{key} = {value!r}")

scene = bpy.context.scene
sl = scene.display.shading.selected_studio_light
print("selected_studio_light type:", type(sl))
dump_struct(sl, "selected_studio_light", 0)

print("\n=== type ===", getattr(sl, "type", None))
print("name:", sl.name if hasattr(sl, "name") else None)
for attr in dir(sl):
    if attr.startswith("_"):
        continue
    try:
        v = getattr(sl, attr)
    except Exception:
        continue
    if callable(v):
        continue
    if hasattr(v, "bl_rna"):
        print("  OBJECT:", attr, type(v).__name__)

print("\n=== list of all studio lights ===")
for i, name in enumerate(bpy.data.studio_lights):
    bl = bpy.data.studio_lights[name]
    print(i, name, "type:", bl.type if hasattr(bl, "type") else None, bl)