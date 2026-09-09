/**
 * Gate 3.4 Phase 3 · TERRAIN 路线投影层测试（纯逻辑，无 wx / 视觉依赖）。
 *
 * 断言要点：
 *  - schematic=true（TERRAIN 无相机标定 → 绝不冒充 EXACT 定位）；
 *  - 折线 / origins / summit / marker 全部来自真实 RouteIndex 几何（x/y/demM），
 *    不读手写像素坐标（无 x_PCT）、无绝对像素向量；
 *  - marker 恒来自 routeSampleAtProgress(drive.progress) 的真实行进点，
 *    且与 projectTerrainPoint 单点投影一致（诚实映射唯一来源）；
 *  - 9:16 画布；全程折线从大本营（低）到峰顶（高），纵向自下而上。
 */
import { describe, expect, it } from "vitest";
import { EVEREST_EXPEDITION } from "../miniprogram/data/expeditions/everest";
import {
  buildTerrainDynamicState,
  buildTerrainRouteGeometry,
  buildTerrainOverlay,
  projectTerrainPoint,
} from "../miniprogram/engine/terrain-projection";
import { routeSampleAtProgress } from "../miniprogram/engine/route-index";

const routeIndex = EVEREST_EXPEDITION.routeIndex;

describe("TERRAIN 路线投影层", () => {
  it("静态 geometry 与动态 marker 分离，20.1%→20.9% marker 不冻结", () => {
    const geometry = buildTerrainRouteGeometry(routeIndex);
    const a = buildTerrainDynamicState(routeIndex, 0.201, geometry);
    const b = buildTerrainDynamicState(routeIndex, 0.209, geometry);
    expect(buildTerrainRouteGeometry(routeIndex)).toEqual(geometry);
    expect(a.progress).not.toBe(b.progress);
    expect(Math.hypot(b.marker.x - a.marker.x, b.marker.y - a.marker.y)).toBeGreaterThan(0.001);
  });

  it("schematic 恒 true（TERRAIN 无相机标定，不冒充 EXACT）", () => {
    expect(buildTerrainOverlay(routeIndex, 0.2).schematic).toBe(true);
    expect(buildTerrainOverlay(routeIndex, 0.8).schematic).toBe(true);
  });

  it("画布规格：9:16", () => {
    const ov = buildTerrainOverlay(routeIndex, 0.3);
    expect(ov.widthUnits).toBe(9);
    expect(ov.heightUnits).toBe(16);
    expect(ov.segments.length).toBeGreaterThan(2);
  });

  it("marker 与 routeSampleAtProgress 单点投影一致（真实进度唯一来源）", () => {
    for (const p of [0, 0.15, 0.4, 0.66, 0.9, 1]) {
      const ov = buildTerrainOverlay(routeIndex, p);
      const at = routeSampleAtProgress(routeIndex, p);
      const expected = projectTerrainPoint(routeIndex, {
        x: at.x,
        y: at.y,
        demM: at.demM,
      });
      expect(ov.marker.x).toBeCloseTo(expected.x, 6);
      expect(ov.marker.y).toBeCloseTo(expected.y, 6);
      expect(ov.progress).toBeCloseTo(p, 6);
    }
  });

  it("progress 透传且被钳制到 0..1", () => {
    expect(buildTerrainOverlay(routeIndex, -0.5).progress).toBe(0);
    expect(buildTerrainOverlay(routeIndex, 1.5).progress).toBe(1);
  });

  it("折线覆盖全程：首段在大本营（低），末段在峰顶（高）", () => {
    const ovStart = buildTerrainOverlay(routeIndex, 0);
    const ovEnd = buildTerrainOverlay(routeIndex, 1);
    const firstY = ovStart.segments[0].y;
    const lastY = ovEnd.segments[ovEnd.segments.length - 1].y;
    // 纵轴：Y 低 = 峰顶（上），Y 高 = 大本营（下）
    expect(lastY).toBeLessThan(firstY);
    expect(ovStart.segments[0].y).toBeGreaterThan(20);
    expect(ovEnd.segments[ovEnd.segments.length - 1].y).toBeLessThan(30);
  });

  it("origins：真实里程碑全覆盖（8 个，含首尾 BC / summit）", () => {
    const ov = buildTerrainOverlay(routeIndex, 0.5);
    const ids = ov.origins.map((o) => o.key);
    expect(ids).toContain("base-camp");
    expect(ids).toContain("summit");
    expect(ids).toHaveLength(8);
    expect(ids.sort()).toEqual(
      routeIndex.milestones.map((m: { id: string }) => m.id).sort(),
    );
    // 海拔为真实权威海拔（m）
    for (const o of ov.origins) {
      expect(o.elevationM).toBeGreaterThan(0);
      expect(o.label.length).toBeGreaterThan(0);
      expectNumberInCanvas(o.x);
      expectNumberInCanvas(o.y);
    }
  });

  it("全程 marker / origins / 折线坐标均在画布 9:16 内（带示意边距容差）", () => {
    for (const p of [0.1, 0.5, 0.9]) {
      const ov = buildTerrainOverlay(routeIndex, p);
      expectNumberInCanvas(ov.marker.x);
      expectNumberInCanvas(ov.marker.y);
      expectNumberInCanvas(ov.summit.x);
      expectNumberInCanvas(ov.summit.y);
      for (const s of ov.segments) {
        expectNumberInCanvas(s.x);
        expectNumberInCanvas(s.y);
      }
    }
  });

  it("数据不含手写像素向量（无 x_PCT / 无绝对像素坐标）", () => {
    const ov = buildTerrainOverlay(routeIndex, 0.2);
    expect(JSON.stringify(ov)).not.toContain("x_PCT");
  });

  it("marker 位于折线视觉区内（大本营→峰顶之间）", () => {
    const ovMid = buildTerrainOverlay(routeIndex, 0.45);
    const ovBaseY = buildTerrainOverlay(routeIndex, 0).segments[0].y;
    const ovTopY = buildTerrainOverlay(routeIndex, 1).segments[
      buildTerrainOverlay(routeIndex, 1).segments.length - 1
    ].y;
    const lo = Math.min(ovBaseY, ovTopY) - 2;
    const hi = Math.max(ovBaseY, ovTopY) + 2;
    expect(ovMid.marker.y).toBeGreaterThanOrEqual(lo - 3);
    expect(ovMid.marker.y).toBeLessThanOrEqual(hi + 3);
  });
});

function expectNumberInCanvas(v: number): void {
  expect(Number.isFinite(v)).toBe(true);
  expect(Math.abs(v)).toBeLessThanOrEqual(150);
}
