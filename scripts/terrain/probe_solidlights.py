"""Probe solid_lights elements inside the selected StudioLight."""
from __future__ import annotations

import bpy

scene = bpy.context.scene
sl = scene.display.shading.selected_studio_light
slots = sl.solid_lights
print("solid_lights type:", type(slots).__name__)
# solid_lights looks like a fixed-length array (4 entries: key/fill/rim/back)
try:
    print("len:", len(slots))
except Exception as exc:
    print("no len:", exc)

# Inspect each slot
index = 0
while True:
    try:
        item = slots[index]
    except Exception as exc:
        print("end at", index, exc)
        break
    print(f"\n--- solid_lights[{index}] ({type(item).__name__}) bl_rna props ---")
    for prop in item.bl_rna.properties:
        try:
            v = getattr(item, prop.identifier)
        except Exception:
            continue
        if callable(v):
            continue
        if hasattr(v, "bl_rna") and not isinstance(v, (float, int, str, bool)):
            print("   ", prop.identifier, "<struct>")
        else:
            print("   ", prop.identifier, "=", repr(v))
    index += 1
    if index > 10:
        break