/**
 * Exploration Engine 核心逻辑测试（Node / vitest）。
 * 覆盖：进度、阶段定位、温度直减率、气压（含氧量）衰减、
 * 知识节点解锁、天空渐变 —— 均无需 wx 运行时。
 */
import { describe, expect, it } from "vitest";
import { EVEREST } from "../miniprogram/data/explorations/everest";
import {
  clamp01,
  progressFor,
  locateStageIndex,
  stageBlend,
  lerpStageField,
  temperatureAt,
  pressureRatioAt,
  vegetationAt,
  knowledgeUnlockedOnMove,
  nodeCovered,
  skyGradient,
  deriveState,
} from "../miniprogram/engine/exploration-engine";
import { clamp } from "../miniprogram/utils/format";

describe("clamp / 数值工具", () => {
  it("clamp 钳制到上下界", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp01(1.5)).toBe(1);
    expect(clamp01(-0.2)).toBe(0);
  });
});

describe("progressFor（海拔→全局进度）", () => {
  it("起点为 0，终点为 1", () => {
    expect(
      progressFor(
        EVEREST.startElevation,
        EVEREST.startElevation,
        EVEREST.maxElevation,
      ),
    ).toBe(0);
    expect(
      progressFor(
        EVEREST.maxElevation,
        EVEREST.startElevation,
        EVEREST.maxElevation,
      ),
    ).toBe(1);
  });

  it("中间海拔按比例", () => {
    const mid = (EVEREST.startElevation + EVEREST.maxElevation) / 2;
    expect(
      progressFor(mid, EVEREST.startElevation, EVEREST.maxElevation),
    ).toBeCloseTo(0.5, 1);
  });

  it("越界返回钳制值", () => {
    expect(progressFor(-100, 0, 100)).toBe(0);
    expect(progressFor(200, 0, 100)).toBe(1);
  });
});

describe("stage 定位与插值", () => {
  it("locateStageIndex 找到最后一个 <= 海拔的阶段", () => {
    expect(locateStageIndex(EVEREST.stages, 400)).toBe(0);
    expect(locateStageIndex(EVEREST.stages, EVEREST.maxElevation)).toBe(
      EVEREST.stages.length - 1,
    );
  });

  it("stageBlend 在两阶段间返回 0-1", () => {
    const t = stageBlend(EVEREST.stages, 500);
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThanOrEqual(1);
  });

  it("lerpStageField 在边界处等于阶段原值", () => {
    expect(lerpStageField(EVEREST.stages, 0, "snow")).toBe(
      EVEREST.stages[0].snow,
    );
    expect(lerpStageField(EVEREST.stages, EVEREST.maxElevation, "snow")).toBe(
      EVEREST.stages[EVEREST.stages.length - 1].snow,
    );
  });
});

describe("气候模型", () => {
  it("温度随海拔单调下降", () => {
    const low = temperatureAt(EVEREST, 500);
    const high = temperatureAt(EVEREST, 8000);
    expect(high).toBeLessThan(low);
  });

  it("峰顶气压比 ≈ 海平面的 1/3（与实测 ~335hPa 吻合）", () => {
    const p = pressureRatioAt(EVEREST.maxElevation);
    const p0 = EVEREST.seaLevelPressureHpa || 1013.25;
    expect(p).toBeCloseTo(0.33, 1);
    expect(p * p0).toBeGreaterThan(280);
  });

  it("植被覆盖度随海拔单调递减", () => {
    const low = vegetationAt(0, EVEREST.startElevation, 5200);
    const high = vegetationAt(3000, EVEREST.startElevation, 5200);
    expect(clamp01(low)).toBeGreaterThan(clamp01(high));
  });
});

describe("知识节点", () => {
  it("nodeCovered 达到海拔即解锁", () => {
    expect(nodeCovered(5400, 6000)).toBe(true);
    expect(nodeCovered(6000, 5400)).toBe(false);
  });

  it("knowledgeUnlockedOnMove 只返回区间内新节点且升序", () => {
    const unlocked = knowledgeUnlockedOnMove(EVEREST.knowledgeNodes, 0, 3200);
    expect(unlocked.length).toBeGreaterThanOrEqual(1);
    expect(unlocked.every((n) => n.elevation <= 3200)).toBe(true);
    // 升序
    for (let i = 1; i < unlocked.length; i++) {
      expect(unlocked[i].elevation).toBeGreaterThanOrEqual(
        unlocked[i - 1].elevation,
      );
    }
  });

  it("下行/静止不返回节点", () => {
    expect(knowledgeUnlockedOnMove(EVEREST.knowledgeNodes, 5000, 4000)).toEqual(
      [],
    );
  });
});

describe("deriveState 主推导", () => {
  it("返回结构完整且一致", () => {
    const s = deriveState(EVEREST, 3000);
    expect(s.elevation).toBe(3000);
    expect(s.stage).toBeDefined();
    expect(typeof s.temperatureC).toBe("number");
    expect(s.sky).toHaveLength(3);
    expect(s.progress).toBeGreaterThan(0);
  });

  it("峰顶 isSummit 为 true", () => {
    const s = deriveState(EVEREST, EVEREST.maxElevation);
    expect(s.isSummit).toBe(true);
  });
});

describe("skyGradient 渐变", () => {
  it("返回三段颜色", () => {
    const g = skyGradient(EVEREST.stages, 0);
    expect(g).toHaveLength(3);
    expect(g[0]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(g[1]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(g[2]).toMatch(/^#[0-9a-f]{6}$/i);
  });
});
