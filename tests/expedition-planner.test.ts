/**
 * Gate 3.4 · 攀登计划派生层测试。
 *
 * 语义断言：
 *   - planner 只消费 ExpeditionCore 派生值（routeIndex/stageMap），不维护 progress；
 *   - 全部距离/进度/海拔来自真实 289 点路线，无手写数字;
 *   - plannerAt 三态 = 纯展示判断（done/current/upcoming），无业务写回。
 */
import { describe, expect, it } from "vitest";
import { EVEREST_EXPEDITION } from "../miniprogram/data/expeditions/everest";
import {
  buildExpeditionPlan,
  plannerAt,
} from "../miniprogram/engine/expedition-planner";
import { driveAtProgress } from "../miniprogram/engine/expedition-driver";

const core = {
  routeIndex: EVEREST_EXPEDITION.routeIndex,
  stageMap: EVEREST_EXPEDITION.stageMap,
  maxElevation: EVEREST_EXPEDITION.maxElevation,
};

describe("buildExpeditionPlan —— 由 core 一次性派生", () => {
  it("段数与 stageMap 一致，边界连续、覆盖全长", () => {
    const plan = buildExpeditionPlan(core);
    expect(plan.segments).toHaveLength(core.stageMap.length);
    expect(plan.totalDistanceM).toBeCloseTo(core.routeIndex.totalDistanceM, 2);
    for (let i = 0; i < plan.segments.length; i++) {
      const s = plan.segments[i];
      expect(s.fromDistanceM).toBeCloseTo(core.stageMap[i].fromDistanceM, 2);
      expect(s.toDistanceM).toBeCloseTo(core.stageMap[i].toDistanceM, 2);
      expect(s.spanM).toBeCloseTo(s.toDistanceM - s.fromDistanceM, 2);
      if (i > 0) {
        expect(s.fromDistanceM).toBeCloseTo(
          plan.segments[i - 1].toDistanceM,
          2,
        );
      }
    }
    // 末段到终点
    expect(plan.segments[plan.segments.length - 1].toDistanceM).toBeCloseTo(
      core.routeIndex.totalDistanceM,
      2,
    );
  });

  it("里程碑 = RouteIndex 完整派生（首=大本营、末=Summit）", () => {
    const plan = buildExpeditionPlan(core);
    expect(plan.milestones).toHaveLength(core.routeIndex.milestones.length);
    expect(plan.milestones[0].name).toContain("大本营");
    const last = plan.milestones[plan.milestones.length - 1];
    expect(last.isSummit).toBe(true);
    expect(last.refM).toBeCloseTo(core.maxElevation, 0);
  });

  it("段末里程碑指向段内最新一个（跨段不重复）", () => {
    const plan = buildExpeditionPlan(core);
    const seen = new Set<string>();
    for (const seg of plan.segments) {
      if (seg.endMilestone) {
        expect(seen.has(seg.endMilestone.id)).toBe(false);
        seen.add(seg.endMilestone.id);
      }
    }
  });
});

describe("plannerAt —— 当前位置三态（纯派生）", () => {
  it("progress=0 → 段0 current，后续 upcoming", () => {
    const at = plannerAt(core, 0);
    expect(at.segmentIndex).toBe(0);
    expect(at.progress).toBe(0);
    expect(at.segmentLocal).toBe(0);
    expect(at.segments[0].state).toBe("current");
    expect(at.segments.at(-1)!.state).toBe("upcoming");
  });

  it("drive.distanceM 直接可用（与 drive 一致）", () => {
    const drive = driveAtProgress(core, 0.5);
    const at = plannerAt(core, drive.distanceM);
    expect(at.progress).toBeCloseTo(0.5, 5);
    expect(at.segmentIndex).toBe(drive.stageIndex);
    // 命中段为 current
    expect(at.segments.find((s) => s.index === drive.stageIndex)!.state).toBe(
      "current",
    );
    // 更早段已完成
    expect(at.segments[0].state).toBe("done");
  });

  it("progress=1 → 全部 done（含 summit 段）", () => {
    const at = plannerAt(core, core.routeIndex.totalDistanceM);
    expect(at.progress).toBeCloseTo(1, 5);
    expect(at.segmentLocal).toBeGreaterThan(0.9);
    for (const seg of at.segments) expect(seg.state).toBe("done");
  });
});
