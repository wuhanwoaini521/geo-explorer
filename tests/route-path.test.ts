/**
 * 山体路径（Terrain-Conforming Route）—— 纯逻辑不变式。
 *
 * 这组断言锁定本次重构的核心产品约束：
 *   1. 先有山体路径、再吸附 waypoint：每个真实里程碑进度都必须落在路径控制点上；
 *   2. 路线 / waypoint / marker 共用同一个投影函数（不允许各算各的）；
 *   3. cover（aspectFill）投影必须还原裁剪偏移，否则多机型上路线会漂移；
 *   4. 已走路线 = 路径的连续前缀（均匀 progress 分段），marker 沿路径连续移动。
 */
import { describe, expect, it } from "vitest";
import {
  buildRoutePathGeometry,
  pointOnPath,
  projectCoverPoint,
  segmentsCovered,
  spineMissesMilestones,
  splinePointAtProgress,
} from "../miniprogram/engine/route-path";
import type {
  RouteCoverFrame,
  RouteSpinePoint,
} from "../miniprogram/types/expedition";
import { EVEREST_EXPEDITION } from "../miniprogram/data/expeditions/everest";

const PORTRAIT: RouteCoverFrame = {
  imageAspect: 1024 / 1536,
  containerAspect: 375 / 812,
  focusX: 0.5,
  focusY: 0.5,
};

const SPINE: RouteSpinePoint[] = [
  { x: 0.3, y: 0.56, progress: 0 },
  { x: 0.4, y: 0.44, progress: 0.3 },
  { x: 0.45, y: 0.34, progress: 0.6 },
  { x: 0.48, y: 0.25, progress: 0.8 },
  { x: 0.5, y: 0.16, progress: 1 },
];

describe("cover 投影（aspectFill）", () => {
  it("竖屏容器：图像更宽 → 只发生水平裁剪，纵向不缩放", () => {
    const center = projectCoverPoint({ x: 0.5, y: 0.5 }, PORTRAIT);
    expect(center.x).toBeCloseTo(0.5, 6);
    expect(center.y).toBeCloseTo(0.5, 6);
    // 纵向 0..1 全量可见（无纵向裁剪）
    expect(projectCoverPoint({ x: 0.5, y: 0 }, PORTRAIT).y).toBeCloseTo(0, 6);
    expect(projectCoverPoint({ x: 0.5, y: 1 }, PORTRAIT).y).toBeCloseTo(1, 6);
    // 横向被裁：图像左右边缘落到容器之外
    const left = projectCoverPoint({ x: 0, y: 0.5 }, PORTRAIT);
    const right = projectCoverPoint({ x: 1, y: 0.5 }, PORTRAIT);
    expect(left.x).toBeLessThan(0);
    expect(right.x).toBeGreaterThan(1);
    expect(left.x + right.x).toBeCloseTo(1, 6); // 中心对称
  });

  it("容器宽高比变化时，同一图像点的横向位置随裁剪改变（不漂移的前提）", () => {
    const tall = projectCoverPoint(
      { x: 0.3, y: 0.5 },
      { ...PORTRAIT, containerAspect: 0.46 },
    );
    const short = projectCoverPoint(
      { x: 0.3, y: 0.5 },
      { ...PORTRAIT, containerAspect: 0.56 },
    );
    // 高瘦容器裁得更多 → 同一点被推向更左
    expect(tall.x).toBeLessThan(short.x);
  });

  it("横屏容器（图像比容器更方）时改为纵向裁剪", () => {
    const frame: RouteCoverFrame = { ...PORTRAIT, containerAspect: 1.2 };
    expect(projectCoverPoint({ x: 0.5, y: 0 }, frame).y).toBeLessThan(0);
    expect(projectCoverPoint({ x: 0.5, y: 1 }, frame).y).toBeGreaterThan(1);
    expect(projectCoverPoint({ x: 0.5, y: 0.5 }, frame).y).toBeCloseTo(0.5, 6);
  });
});

describe("山体路径几何", () => {
  const geometry = buildRoutePathGeometry(SPINE, PORTRAIT, 375 / 812, 20);

  it("采样点按 progress 均匀分布，覆盖 0..1 两端", () => {
    expect(geometry.samples.length).toBe(21);
    expect(geometry.samples[0].progress).toBe(0);
    expect(geometry.samples[20].progress).toBe(1);
    for (let i = 1; i < geometry.samples.length; i += 1) {
      expect(geometry.samples[i].progress).toBeGreaterThan(
        geometry.samples[i - 1].progress,
      );
    }
  });

  it("折线段覆盖整条路线，progress 区间首尾相接", () => {
    expect(geometry.segments.length).toBeGreaterThan(15);
    expect(geometry.segments[0].progress).toBe(0);
    expect(geometry.segments[geometry.segments.length - 1].endProgress).toBe(1);
    for (let i = 1; i < geometry.segments.length; i += 1) {
      expect(geometry.segments[i].progress).toBe(
        geometry.segments[i - 1].endProgress,
      );
    }
  });

  it("透视：靠近山脚的段更粗、更不透明（远端更细更淡）", () => {
    const width = (style: string) =>
      Number(/height:([\d.]+)rpx/.exec(style)?.[1] ?? "0");
    const opacity = (style: string) =>
      Number(/opacity:([\d.]+);/.exec(style)?.[1] ?? "0");
    const first = geometry.segments[0];
    const last = geometry.segments[geometry.segments.length - 1];
    expect(width(first.style)).toBeGreaterThan(width(last.style));
    expect(opacity(first.style)).toBeGreaterThan(opacity(last.style));
  });

  it("样条穿过控制点（waypoint 才能精确吸附在路径上）", () => {
    for (const point of SPINE) {
      const at = splinePointAtProgress(SPINE, point.progress);
      expect(at.x).toBeCloseTo(point.x, 6);
      expect(at.y).toBeCloseTo(point.y, 6);
    }
  });

  it("marker 沿路径连续移动（相邻 progress 之间不跳变）", () => {
    let prev = pointOnPath(geometry, 0);
    for (let i = 1; i <= 40; i += 1) {
      const next = pointOnPath(geometry, i / 40);
      expect(Math.hypot(next.x - prev.x, next.y - prev.y)).toBeLessThan(8);
      expect(next.y).toBeLessThanOrEqual(prev.y + 1e-6); // 向上攀登
      prev = next;
    }
    expect(pointOnPath(geometry, 1).y).toBeLessThan(pointOnPath(geometry, 0).y);
  });

  it("已走路线 = 路径的连续前缀（末尾一段裁剪到 marker）", () => {
    const half = segmentsCovered(geometry, 0.47); // 落在段内部（非边界）
    expect(half.length).toBeGreaterThan(0);
    expect(half[0].progress).toBe(0);
    expect(half[half.length - 1].active).toBe(true);
    expect(half[half.length - 1].endProgress).toBeCloseTo(0.47, 9);
    expect(half.filter((s) => s.active).length).toBe(1);
    // 恰好落在段边界时没有「部分段」，但前缀仍然连续
    const onBoundary = segmentsCovered(geometry, 0.5);
    expect(onBoundary[onBoundary.length - 1].endProgress).toBeCloseTo(0.5, 9);
    expect(onBoundary.filter((s) => s.active).length).toBe(0);
    // 0 进度：没有任何已走段
    expect(segmentsCovered(geometry, 0).length).toBe(0);
    // 满进度：全部段落都算已走
    expect(segmentsCovered(geometry, 1).length).toBe(geometry.segments.length);
  });
});

describe("Everest 山体路径标定约束", () => {
  const routePath = EVEREST_EXPEDITION.routePath!;
  const milestones = EVEREST_EXPEDITION.routeIndex.milestones;

  it("每个真实里程碑进度都落在山体路径控制点上（先定路径，再吸附 waypoint）", () => {
    const progresses = milestones.map((m) => m.progress);
    for (const projection of [
      routePath.default,
      routePath.modes!.LIVE!,
    ]) {
      expect(projection.spine[0].progress).toBe(0);
      expect(projection.spine[projection.spine.length - 1].progress).toBe(1);
      expect(spineMissesMilestones(projection.spine, progresses)).toEqual([]);
    }
  });

  it("LIVE 与 TERRAIN 共享节点进度，只是投影（影像坐标）不同", () => {
    const terrain = routePath.default;
    const live = routePath.modes!.LIVE!;
    expect(live.spine.map((p) => p.progress)).toEqual(
      terrain.spine.map((p) => p.progress),
    );
    expect(live.image).not.toBe(terrain.image);
    expect(live.focusY).not.toBeCloseTo(terrain.focusY, 3);
  });

  it("路线不穿天空：全部节点都在山体高度范围内，且终点高于起点", () => {
    for (const projection of [routePath.default, routePath.modes!.LIVE!]) {
      const spine = projection.spine;
      const top = spine[spine.length - 1];
      const bottom = spine[0];
      expect(top.y).toBeLessThan(bottom.y);
      expect(top.y).toBeGreaterThan(0.05); // 不进入天空带
      expect(bottom.y).toBeLessThan(0.62); // 留在底部信息面板之上
    }
  });

  it("waypoint 位置由同一投影函数给出，且落在路线合理区间", () => {
    const geometry = buildRoutePathGeometry(
      routePath.default.spine,
      {
        imageAspect: routePath.default.imageAspect,
        containerAspect: 375 / 812,
        focusX: routePath.default.focusX,
        focusY: routePath.default.focusY,
      },
      375 / 812,
    );
    const seen = milestones.map((m) => pointOnPath(geometry, m.progress));
    for (const at of seen) {
      expect(at.x).toBeGreaterThan(5);
      expect(at.x).toBeLessThan(95);
      expect(at.y).toBeGreaterThan(5);
      expect(at.y).toBeLessThan(62);
    }
    // 沿进度单调向上（不出现回头下坡）
    for (let i = 1; i < seen.length; i += 1) {
      expect(seen[i].y).toBeLessThan(seen[i - 1].y);
    }
  });
});
