/**
 * STAGE-4 成对遮挡测试：TS occlusion.ts 同一 fixture 与 Python 独立实现核对。
 *
 * fixture 由 `python3 scripts/live/occlusion_pair_fixture.py` 生成
 * （同为 isOccluded 视线步进：cell 步进、最近邻高程、越过 body 判 OCCLUDED）。
 * 两份独立实现共享同一定义，任何一方的代码漂移都会在这里暴露。
 */
import { describe, expect, it } from "vitest";
import { isOccluded, type DemGrid } from "../tools/everest-route-calibrator/src/math/occlusion.js";
import type { WorldPt } from "../tools/everest-route-calibrator/src/math/camera-math.js";

import fixture from "../scripts/live/fixtures/occlusion_pair";

interface FixtureQuery {
  camera: number[];
  target: number[];
  expected: boolean;
}
interface Fixture {
  schema: string;
  grid: { rows: number; cols: number; step: number; z: number[] };
  queries: FixtureQuery[];
}

const f = fixture as Fixture;

function buildGrid(): DemGrid {
  const { rows, cols, step, z } = f.grid;
  return {
    rows,
    cols,
    step,
    origin: { x: 0, y: 0, z: 0 },
    z: Float32Array.from(z),
  };
}

describe("occlusion pair test (python fixture ↔ ts)", () => {
  const grid = buildGrid();

  it("schema matches the pair-test contract", () => {
    expect(f.schema).toBe("occlusion-pair/v1");
    expect(f.queries.length).toBeGreaterThan(100);
    // 夹具应同时包含遮挡与可见两种结果，否则测试没有判别力
    const occluded = f.queries.filter((q) => q.expected).length;
    expect(occluded).toBeGreaterThan(20);
    expect(f.queries.length - occluded).toBeGreaterThan(10);
  });

  it("对夹具里每一条视线 TS 与 Python 判定 100% 一致", () => {
    let mismatches = 0;
    for (const q of f.queries) {
      const cam: WorldPt = { x: q.camera[0], y: q.camera[1], z: q.camera[2] };
      const tgt: WorldPt = { x: q.target[0], y: q.target[1], z: q.target[2] };
      const got = isOccluded(grid, cam, tgt);
      if (got !== q.expected) {
        mismatches += 1;
        // eslint-disable-next-line no-console
        console.warn("mismatch", { cam, tgt, got, expected: q.expected });
        if (mismatches > 5) break;
      }
    }
    expect(mismatches).toBe(0);
  });
});