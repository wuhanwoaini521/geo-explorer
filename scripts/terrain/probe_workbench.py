"""Probe workbench shading API capabilities for the Gate 2 lighting pass."""
from __future__ import annotations

import bpy


def dump(obj, prefix: str = "", depth: int = 0) -> None:
    for key in dir(obj):
        if key.startswith("_"):
            continue
        try:
            value = getattr(obj, key)
        except Exception:
            continue
        if callable(value):
            continue
        print(f"{prefix}{key} = {value!r}")


scene = bpy.context.scene
print("=== scene.display.shading ===")
dump(scene.display.shading)
print("\n=== scene.display.shading.__annotations__ ===")
try:
    for k, v in scene.display.shading.bl_rna.properties.items():
        print(k, v.type)
except Exception as exc:
    print("err", exc)
print("\n=== studio light names in file ===")
for name in dir(bpy.data):
    print(name)