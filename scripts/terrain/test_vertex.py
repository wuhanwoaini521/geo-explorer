"""Quick test: open saved scene, render with Workbench color_type=VERTEX, save ascii+stats."""
from __future__ import annotations

import sys
from pathlib import Path
import bpy

argv = sys.argv[sys.argv.index("--") + 1 :]
blend, out = argv[0], argv[1]
bpy.ops.wm.open_mainfile(filepath=str(Path(blend).resolve()))
scene = bpy.context.scene
sh = scene.display.shading
sh.light = "STUDIO"
sh.color_type = "VERTEX"
sh.show_shadows = True
sh.shadow_intensity = 0.7
sh.show_cavity = True
sh.cavity_type = "WORLD"
scene.render.resolution_x = 1440
scene.render.resolution_y = 1080
scene.render.filepath = str(Path(out).resolve())
bpy.ops.render.render(write_still=True)
print("DONE VERTEX TEST")