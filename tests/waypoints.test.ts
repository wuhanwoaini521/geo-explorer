/**
 * 路线途经点数据完整性 —— 「点击 waypoint 有介绍」的产品底线。
 */
import { describe, expect, it } from "vitest";
import { EVEREST } from "../miniprogram/data/explorations/everest";
import { EXPLORATIONS } from "../miniprogram/data/explorations/index";

describe("Everest 路线途经点", () => {
  const route = EVEREST.route!;

  it("路线存在且途经点 ≥ 8（含营地/峰顶）", () => {
    expect(route).toBeTruthy();
    expect(route.waypoints.length).toBeGreaterThanOrEqual(8);
  });

  it("id 唯一、progress 严格升序、首尾对齐 0/1", () => {
    const ids = route.waypoints.map((w) => w.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < route.waypoints.length; i++) {
      expect(route.waypoints[i].progress).toBeGreaterThan(route.waypoints[i - 1].progress);
    }
    expect(route.waypoints[0].progress).toBe(0);
    expect(route.waypoints[route.waypoints.length - 1].progress).toBe(1);
  });

  it("每个途经点都有海拔与介绍（点击卡片内容），介绍不含占位符", () => {
    for (const w of route.waypoints) {
      expect(w.altitude, w.id).toBeGreaterThan(0);
      expect(w.desc, w.id).toBeTruthy();
      expect(w.desc!.length, w.id).toBeGreaterThan(8);
      expect(w.desc, w.id).not.toMatch(/TODO|待补充|xxx/i);
    }
  });

  it("峰顶点为 8848.86 且关联 summit-height 知识", () => {
    const summit = route.waypoints[route.waypoints.length - 1];
    expect(summit.altitude).toBe(8848.86);
    expect(summit.knowledgeId).toBe("summit-height");
  });

  it("每个已注册场景的 route（若有）都满足同样的完整性约束", () => {
    for (const ex of EXPLORATIONS) {
      if (!ex.route) continue;
      expect(ex.route.waypoints.length, ex.id).toBeGreaterThan(0);
      for (const w of ex.route.waypoints) {
        expect(w.desc, `${ex.id}:${w.id}`).toBeTruthy();
      }
    }
  });
});
