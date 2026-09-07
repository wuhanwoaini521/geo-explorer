/**
 * Gate 3 驾驶层测试 —— 路线进度轴（不掺 3D 距离，峰顶统一 8,848.86）。
 *
 * 语义断言（用户确认）：
 *  - progress/标的物由 routeIndex.totalDistanceM（≈12,955.8 m 水平投影）驱动；
 *  - 峰顶展示海拔 = 8,848.86，与数据集 refM=8849 / DEM=~8709 分离；
 *  - current/next 下一站里程 = next.distanceM − 当前路线里程（精确）；
 *  - 死亡区在 refM ≥ 8000（DEM 不参与）触发。
 */
import { describe, expect, it } from "vitest";
import { EVEREST_EXPEDITION } from "../miniprogram/data/expeditions/everest";
import {
  DEATH_ZONE_REF_M,
  driveAtDistance,
  driveAtProgress,
  formatDistanceM,
  formatRouteKm,
} from "../miniprogram/engine/expedition-driver";
import { stageIndexAtDistance } from "../miniprogram/engine/expedition-stages";

const core = {
  routeIndex: EVEREST_EXPEDITION.routeIndex,
  stageMap: EVEREST_EXPEDITION.stageMap,
  maxElevation: EVEREST_EXPEDITION.maxElevation, // 8,848.86
};

function driveAt(p: number) {
  return driveAtProgress(core, p);
}
function driveD(d: number) {
  return driveAtDistance(core, d);
}

describe("路线轴（不是 3D 距离）", () => {
  it("总长 = 水平投影 totalDistanceM ≈ 12,955.8 m（非 total3d）", () => {
    expect(core.routeIndex.totalDistanceM).toBeCloseTo(12955.8, -1); // ±5m
    expect(core.routeIndex.total3dDistanceM).toBeGreaterThan(
      core.routeIndex.totalDistanceM,
    );
  });

  it("progress=1 = 总长；剩余 0；峰顶统一 8,848.86（非 8849/8709）", () => {
    const d = driveAt(1);
    expect(d.progress).toBeCloseTo(1, 5);
    expect(d.distanceM).toBeCloseTo(core.routeIndex.totalDistanceM, 2);
    expect(d.remainingRouteM).toBe(0);
    expect(d.atSummit).toBe(true);
    expect(d.refM).toBeCloseTo(8848.86, 1);
    expect(d.summitRefM).toBeCloseTo(8848.86, 1);
    expect(d.remainingVerticalM).toBe(0);
  });

  it("progress=0：大本营 ref 5,364；垂直差 = 8848.86−5364 = 3484.86", () => {
    const d = driveAt(0);
    expect(d.progress).toBe(0);
    expect(d.distanceM).toBe(0);
    expect(d.refM).toBeCloseTo(5364, 0);
    expect(d.remainingVerticalM).toBeCloseTo(8848.86 - 5364, 1);
    expect(d.atSummit).toBe(false);
    expect(d.deathZone).toBe(false);
  });
});

describe("单调性：progress 越大 → 里程增 / 剩余递减", () => {
  it("0→0.5→1 单调", () => {
    const a = driveAt(0);
    const b = driveAt(0.5);
    const c = driveAt(1);
    expect(b.distanceM).toBeGreaterThan(a.distanceM);
    expect(c.distanceM).toBeGreaterThan(b.distanceM);
    expect(b.remainingRouteM).toBeLessThan(a.remainingRouteM);
    expect(b.remainingVerticalM).toBeLessThanOrEqual(a.remainingVerticalM);
    expect(c.remainingVerticalM).toBe(0);
  });
});

describe("阶段系统（消费 stageMap=7 段，边界由 mileage 计算）", () => {
  it("7 段 id 顺序", () => {
    expect(core.stageMap).toHaveLength(7);
    expect(core.stageMap.map((s) => s.id)).toEqual([
      "approach",
      "khumbu-icefall",
      "western-cwm",
      "lhotse-face",
      "south-col",
      "death-zone",
      "summit-push",
    ]);
  });

  it("progress=0→approach；progress=1→summit-push", () => {
    expect(driveAt(0).stage!.id).toBe("approach");
    expect(driveAt(1).stage!.id).toBe("summit-push");
  });

  it("连续覆盖：每段 from==上一段 to，最后到总长", () => {
    for (let i = 1; i < core.stageMap.length; i++) {
      expect(core.stageMap[i].fromDistanceM).toBeCloseTo(
        core.stageMap[i - 1].toDistanceM,
        2,
      );
    }
    expect(core.stageMap[6].toDistanceM).toBeCloseTo(
      core.routeIndex.totalDistanceM,
      2,
    );
  });

  it("11750 m → death-zone（与 stageIndexAtDistance 一致）", () => {
    const dist = 11750;
    expect(core.stageMap[stageIndexAtDistance(core.stageMap, dist)].id).toBe(
      "death-zone",
    );
    expect(driveD(dist).stage!.id).toBe("death-zone");
  });
});

describe("标的物：current / prev / next / nextGap", () => {
  it("progress=0 → 当前=大本营，下一站=冰瀑，nextGap=冰瀑distanceM−0", () => {
    const d = driveAt(0);
    expect(d.current!.id).toBe("base-camp");
    expect(d.current!.name).toContain("大本营");
    expect(d.next!.id).toBe("khumbu-icefall");
    expect(d.nextGapM).toBeCloseTo(d.next!.distanceM - d.distanceM, 4);
    expect(d.nextGapM).toBeCloseTo(d.next!.distanceM, 4);
  });

  it("越过 C1 后：current=C1、next=C2，nextGap 精确", () => {
    const c1 = core.routeIndex.milestones.find((m) => m.id === "camp-i")!;
    const d = driveD(c1.distanceM + 7);
    expect(d.current!.id).toBe("camp-i");
    expect(d.next!.id).toBe("western-cwm-camp-ii");
    expect(d.nextGapM).toBeCloseTo(d.next!.distanceM - d.distanceM, 3);
  });

  it("南峰之上未至终点：current=南峰、next=峰顶、nextGap 精确", () => {
    const summitM = core.routeIndex.milestones[core.routeIndex.milestones.length - 1];
    const south = core.routeIndex.milestones.find((m) => m.id === "south-summit")!;
    const d = driveD(south.distanceM + 1);
    expect(d.current!.id).toBe("south-summit");
    expect(d.next!.id).toBe("summit");
    expect(d.nextGapM).toBeCloseTo(summitM.distanceM - d.distanceM, 3);
    expect(d.atSummit).toBe(false); // 尚未到总长终点
  });

  it("终点：current=峰顶(summit)、next=null、nextGap=0", () => {
    const d = driveAt(1);
    expect(d.current!.kind).toBe("summit");
    expect(d.next).toBeNull();
    expect(d.nextGapM).toBe(0);
  });
});

describe("死亡区（refM ≥ 8000 且未登顶）", () => {
  it("常数 8000", () => {
    expect(DEATH_ZONE_REF_M).toBe(8000);
  });

  it("death-zone 起点 ≈ 越过 8000m 参考海拔的交点距离（11000~12000m）", () => {
    const dz = core.stageMap.find((s) => s.id === "death-zone")!;
    expect(dz.fromDistanceM).toBeGreaterThan(11000);
    expect(dz.fromDistanceM).toBeLessThan(12000);
  });

  it("0.8 未进入死亡区；0.9（ref≥8000）死亡区为真", () => {
    expect(driveAt(0.8).deathZone).toBe(false);
    expect(driveAt(0.9).deathZone).toBe(true);
  });

  it("峰顶（ref→8848.86）不算死亡区、是登顶", () => {
    const d = driveAt(1);
    expect(d.deathZone).toBe(false);
    expect(d.atSummit).toBe(true);
  });
});

describe("格式辅助", () => {
  it("formatRouteKm：3510 → '3.5 km'", () => expect(formatRouteKm(3510)).toBe("3.5 km"));
  it("formatDistanceM：2012.34 → '2,012 m'", () =>
    expect(formatDistanceM(2012.34)).toBe("2,012 m"));
  it("formatDistanceM 负值钳 0", () => expect(formatDistanceM(-5)).toBe("0 m"));
});