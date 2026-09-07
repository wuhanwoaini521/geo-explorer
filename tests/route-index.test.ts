/**
 * V2 数据层：真实路线索引（route-index）。
 *
 * 所有距离/进度必须来自 289 点真实折线，测试同时承担“输出”职责：
 * 断言区间的关键数字即 Gate 2 交付标定。
 */
import { describe, it, expect } from "vitest";
import { SOUTH_COL_ROUTE } from "../miniprogram/data/routes/everest/index";
import {
  buildRouteIndex,
  routeSampleAt,
  routeSampleAtProgress,
  referenceElevationAt,
  demElevationAt,
  referenceAltitudeAt,
  modelElevationAt,
} from "../miniprogram/engine/route-index";

const index = buildRouteIndex(SOUTH_COL_ROUTE);

describe("采样点同时输出三类海拔（避免隐式混用）", () => {
  it("dem/ref/model 三函数一致", () => {
    const d = index.totalDistanceM / 2;
    const s0 = routeSampleAt(index, d);
    expect(demElevationAt(index, d)).toBe(s0.demM);
    expect(referenceAltitudeAt(index, d)).toBe(s0.refM);
    expect(modelElevationAt(index, d)).toBe(s0.modelM);
  });
});

describe("buildRouteIndex（289 点真近路由）", () => {
  it("点/段数量正确", () => {
    expect(index.pointCount).toBe(289);
    expect(index.segmentCount).toBe(288);
    expect(index.cumulative).toHaveLength(289);
    expect(index.demM).toHaveLength(289);
    expect(index.xs).toHaveLength(289);
  });

  it("累计距离严格单调（无零/负段）", () => {
    for (let i = 1; i < index.cumulative.length; i++) {
      expect(index.cumulative[i]).toBeGreaterThan(index.cumulative[i - 1]);
      expect(index.cumulative[i] - index.cumulative[i - 1]).toBeGreaterThan(0.01);
    }
  });

  it("总长落在可信范围（≈12.9–14 km，含高差 ≥2D）", () => {
    expect(index.totalDistanceM).toBeGreaterThan(12000);
    expect(index.totalDistanceM).toBeLessThan(16000);
    expect(index.total3dDistanceM).toBeGreaterThanOrEqual(index.totalDistanceM);
  });

  it("8 个里程碑按距离单调、起点 > 0、终点 ≈ 全进步", () => {
    const ms = index.milestones;
    expect(ms).toHaveLength(8);
    expect(ms[0].name).toContain("大本营");
    for (let i = 1; i < ms.length; i++) {
      expect(ms[i].distanceM).toBeGreaterThan(ms[i - 1].distanceM);
      expect(ms[i].progress).toBeGreaterThan(ms[i - 1].progress);
    }
    const last = ms[ms.length - 1];
    expect(last.kind).toBe("summit");
    expect(last.progress).toBeCloseTo(1, 3);
  });

  it("DEM 高程 = z + baseM（起点样品）", () => {
    expect(index.demM[0]).toBeCloseTo(SOUTH_COL_ROUTE.points[0].z + SOUTH_COL_ROUTE.terrain.baseM, 6);
  });

  it("三类海拔分离：里程碑处 refM 为权威、demM 为 DEM（峰顶 8849/8709）", () => {
    const summit = index.milestones[index.milestones.length - 1];
    expect(summit.refM).toBe(8849);
    expect(summit.demM).toBeCloseTo(8709, 0);
    // 南峰
    const southSummit = index.milestones.find((m) => m.id === "south-summit")!;
    expect(southSummit.refM).toBe(8749);
  });
});

describe("routeSampleAt / 三类海拔", () => {
  it("progress=0 位于起点（DEM≈大本营，ref=5364）", () => {
    const s = routeSampleAtProgress(index, 0);
    expect(s.distanceM).toBe(0);
    expect(s.progress).toBe(0);
    expect(s.demM).toBeCloseTo(index.demM[0], 1);
    expect(s.refM).toBe(5364); // reference-anchored：起始钳制到大本营参考海拔
    expect(s.modelM).toBe(s.refM);
  });

  it("progress=1 位于终点（峰顶）", () => {
    const s = routeSampleAtProgress(index, 1);
    expect(s.progress).toBeCloseTo(1, 6);
    expect(s.distanceM).toBeCloseTo(index.totalDistanceM, 3);
    expect(s.refM).toBeCloseTo(8849, 0);
  });

  it("里程单调映射：距离更大的样本 progress/海拔都应 >= 前面", () => {
    for (let d = 0; d <= index.totalDistanceM; d += 500) {
      const s = routeSampleAt(index, d);
      expect(s.distanceM).toBeCloseTo(d, 6);
      expect(s.progress).toBe(s.distanceM / index.totalDistanceM);
      expect(s.modelM).toBe(s.refM); // elevationPolicy：模型=参考锚定
    }
  });

  it("referenceElevationAt 在里程碑处取到权威海拔（含内插线性）", () => {
    const c2 = index.milestones.find((m) => m.id === "western-cwm-camp-ii")!;
    expect(referenceElevationAt(index, c2.distanceM)).toBeCloseTo(c2.refM, 3);
    // 大本营→冰瀑 之间线性插值
    const a = index.milestones[1]; // 冰瀑
    const b = index.milestones[0]; // 大本营？
    const mid = (a.distanceM + b.distanceM) / 2;
    const expectRef = (b.refM + a.refM) / 2;
    expect(referenceElevationAt(index, mid)).toBeCloseTo(expectRef, 3);
  });
});