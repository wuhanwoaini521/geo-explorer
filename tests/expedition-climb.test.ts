/**
 * Gate 3.4 · 攀登引擎测试。
 *
 * 覆盖（Goal §68 / §33 / §34 / §35）：
 *   - 攀登目标基于路线里程/进度增量（非海拔/百分比/下一营地）；
 *   - 连续运动：时长落在 CLIMB_MIN..MAX；smoothstep 连续、不跳变；
 *   - 里程碑跨域：一次移动跨多个里程碑不漏；
 *   - 事件只触发一次（Event Once Rule）；
 *   - 反向（下撤）支持；起点/终点钳制。
 */
import { describe, expect, it } from "vitest";
import { EVEREST_EXPEDITION } from "../miniprogram/data/expeditions/everest";
import {
  CLIMB_MAX_MS,
  CLIMB_MIN_MS,
  climbDone,
  climbFrameAt,
  climbTargetForStep,
  createClimbRequest,
  milestonesCrossedBetween,
  MilestoneCrossTracker,
} from "../miniprogram/engine/expedition-climb";

const total = EVEREST_EXPEDITION.routeIndex.totalDistanceM;

describe("攀登目标 = 路线里程/进度增量（禁止固定海拔/百分比/营地）", () => {
  it("climbTargetForStep 由里程增量派生", () => {
    expect(climbTargetForStep(1000, 360, total)).toBe(1360);
    expect(climbTargetForStep(0, 0, total)).toBe(0);
  });

  it("目标钳制在 [0, total]，不会越界登顶", () => {
    expect(climbTargetForStep(total - 100, 500, total)).toBe(total);
    expect(climbTargetForStep(100, -500, total)).toBe(0);
  });

  it("createClimbRequest 的 toDistance 基于 delta；时长在窗口内", () => {
    const req = createClimbRequest(1000, 360, total);
    expect(req.toDistanceM).toBe(1360);
    expect(req.durationMs).toBeGreaterThanOrEqual(CLIMB_MIN_MS);
    expect(req.durationMs).toBeLessThanOrEqual(CLIMB_MAX_MS);
  });

  it("下撤（负增量）一样合法", () => {
    const req = createClimbRequest(5000, -360, total);
    expect(req.toDistanceM).toBe(4640);
    expect(
      climbDone(climbFrameAt(req, req.startedAt + req.durationMs + 10)),
    ).toBe(true);
  });
});

describe("连续运动 · smoothstep 补间", () => {
  it("从 from → to 单调递增且连续", () => {
    const req = createClimbRequest(1000, 360, total);
    let prev = 1000;
    let prevEased = 0;
    for (let t = 0; t <= req.durationMs; t += 40) {
      const f = climbFrameAt(req, req.startedAt + t);
      expect(f.distanceM).toBeGreaterThanOrEqual(prev - 1e-6);
      expect(f.distanceM).toBeLessThanOrEqual(req.toDistanceM + 1e-6);
      expect(f.eased).toBeGreaterThanOrEqual(prevEased - 1e-6);
      prev = f.distanceM;
      prevEased = f.eased;
    }
  });

  it("起点=from，终点=to（eased=1 时 done）", () => {
    const req = createClimbRequest(2000, 720, total);
    const s = climbFrameAt(req, req.startedAt);
    expect(s.eased).toBe(0);
    const e = climbFrameAt(req, req.startedAt + req.durationMs + 600);
    expect(e.eased).toBe(1);
    expect(climbDone(e)).toBe(true);
  });

  it("phase 沿 climbing → settling → arrived", () => {
    const req = createClimbRequest(2000, 720, total);
    const a = climbFrameAt(req, req.startedAt + req.durationMs * 0.5);
    expect(a.phase).toBe("climbing");
    const s = climbFrameAt(req, req.startedAt + req.durationMs + 50);
    expect(s.phase).toBe("settling");
    const r = climbFrameAt(req, req.startedAt + req.durationMs + CLIMB_MAX_MS);
    expect(r.phase).toBe("arrived");
    expect(r.remainingM).toBeLessThan(1e-6);
  });
});

describe("里程碑跨域（milestonesCrossedBetween）", () => {
  it("跨向量里包含沿途里程碑且不重复", () => {
    const ms = EVEREST_EXPEDITION.routeIndex.milestones;
    const fromM = ms[0].distanceM + 1;
    const toM = ms[3].distanceM;
    const crossed = milestonesCrossedBetween(
      EVEREST_EXPEDITION.routeIndex,
      fromM,
      toM,
    );
    expect(crossed.length).toBeGreaterThanOrEqual(2);
    const ids = new Set(crossed.map((m) => m.id));
    expect(ids.size).toBe(crossed.length);
    // 全部落在 [from, to] 区间
    for (const m of crossed) {
      expect(m.distanceM).toBeGreaterThanOrEqual(fromM);
      expect(m.distanceM).toBeLessThanOrEqual(toM + 1e-6);
    }
  });

  it("一次跨多个里程碑（多跨），不丢失", () => {
    const idx = EVEREST_EXPEDITION.routeIndex;
    const startM = idx.milestones[1].distanceM;
    const endM = idx.milestones[6].distanceM;
    const crossed = milestonesCrossedBetween(idx, startM, endM);
    // 至少含 start 和 end 之间所有里程碑
    for (let i = 1; i <= 6; i++) {
      expect(
        crossed.some((m) => m.distanceM === idx.milestones[i].distanceM),
      ).toBe(true);
    }
  });
});

describe("MilestoneCrossTracker · Event Once Rule", () => {
  it("同一里程碑只触发一次（打卡/知识/成就不会再触发）", () => {
    const t = new MilestoneCrossTracker();
    const first = t.note(["m1", "m2"]);
    expect(first).toEqual(["m1", "m2"]);
    const again = t.note(["m2", "m3"]);
    expect(again).toEqual(["m3"]); // m2 已触发过
    expect(t.note(["m1", "m2", "m3"])).toEqual([]);
    expect(t.size()).toBe(3);
  });

  it("反向到达（先升后撤）不会重复触发", () => {
    const t = new MilestoneCrossTracker();
    t.note(["c1", "c2"]);
    t.note(["c4"]);
    // 下撤 → 回到 c2 不再触发
    expect(t.note(["c3", "c2", "c1"])).toEqual(["c3"]);
  });

  it("prime 可把初始骨架当作已触发基线（首帧不整批解锁）", () => {
    const t = new MilestoneCrossTracker();
    t.prime("base-camp");
    expect(t.note(["base-camp"])).toEqual([]);
    expect(t.note(["icefall"])).toEqual(["icefall"]);
  });
});
