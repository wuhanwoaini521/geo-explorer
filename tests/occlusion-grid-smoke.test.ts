/**
 * STAGE-4 烟煤测试：真实 Copernicus 30m 网格穿过 occlusion.ts 运行时是否为科学结果。
 *
 * 读取 build_occlusion_dem.py 的产物（.raw 为 gitignored；若无则跳过），
 * 以 Kala Patthar 相机对整个 south-col route 全部点做视线分类，断言：
 *   1. route 点全部落在网格内；
 *   2. 有可见（本项目关键视角 Everest 脊线必须可见）也有被挡的点，
 *      说明网格既不过度保守（全挡）也不过度乐观（全可见）；
 *   3. 至少存在真实遮挡（山体挡住后方视线）。
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { classifyVisibility } from "../tools/everest-route-calibrator/src/math/occlusion.js";
import type { DemGrid } from "../tools/everest-route-calibrator/src/math/occlusion.js";
import { SOUTH_COL_ROUTE } from "../miniprogram/data/routes/everest/index";

const repoRoot = join(dirname(new URL(import.meta.url).pathname), "..");
const RAW_JSON = join(
  repoRoot, "design", "world", "everest-live", "dem", "occlusion-30m.raw.json",
);
const RAW_PATH = join(
  repoRoot, "design", "world", "everest-live", "dem", "occlusion-30m.raw",
);

/* 相机：Kala Patthar（27.9837, 86.7870, 5545m）→ 世界 frame（coordinate-system.md）。 */
const CAM = {
  x: (86.787 - 86.845) * 98334.5,
  y: (27.95 - 27.9837) * 110575.116,
  z: 5545 - 2976.22,
};

const hasGrid = existsSync(RAW_JSON) && existsSync(RAW_PATH);

function loadGrid(): DemGrid {
  const meta = JSON.parse(readFileSync(RAW_JSON, "utf8")) as {
    rows: number;
    cols: number;
    step: number;
    originX: number;
    originY: number;
    originZ?: number;
  };
  return {
    rows: meta.rows,
    cols: meta.cols,
    step: meta.step,
    origin: { x: meta.originX, y: meta.originY, z: meta.originZ ?? 0 },
    z: new Float32Array(readFileSync(RAW_PATH).buffer),
  };
}

describe("occlusion real DEM smoke (dev 侧)", () => {
  const runTest = hasGrid ? it : it.skip;
  runTest("Kala Patthar 相机对 route 点：可见与遮挡并存且峰顶可见", () => {
    const grid = loadGrid();
    const pts = (SOUTH_COL_ROUTE as {
      points: Array<{ x: number; y: number; z: number }>;
    }).points;
    expect(pts.length).toBeGreaterThan(100);
    const statuses = classifyVisibility(grid, CAM, pts);
    const visible = statuses.filter((s) => s === "VISIBLE").length;
    const occluded = statuses.filter((s) => s === "OCCLUDED").length;
    expect(visible, "关键视角不应全被遮挡").toBeGreaterThan(0);
    expect(occluded, "网格必须存在真实遮挡，否则无判别力").toBeGreaterThan(0);
    expect(visible + occluded).toBe(pts.length);
    // 登顶段（Everest 峰顶区域 z>5950 且 x>4000）应从 Kala Patthar 可见。
    const summitIdx = pts.findIndex((p) => p.z > 5950 && p.x > 4000);
    if (summitIdx >= 0) {
      expect(statuses[summitIdx]).toBe("VISIBLE");
    }
  });

  runTest("网格元数据完整性", () => {
    const grid = loadGrid();
    expect(grid.step).toBeGreaterThan(10);
    expect(grid.step).toBeLessThan(100);
    expect(grid.rows).toBeGreaterThan(500);
    expect(grid.cols).toBeGreaterThan(500);
  });
});