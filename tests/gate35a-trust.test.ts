import { describe, expect, it } from "vitest";
import { EVEREST_EXPEDITION } from "../miniprogram/data/expeditions/everest";
import {
  buildObservationPoints,
  formatObservationElevation,
  progressForReferenceElevation,
  projectRouteMilestones,
  routeSegment,
} from "../miniprogram/engine/expedition-observation";
import { filterScenes } from "../miniprogram/utils/scene-search";
import { readFileSync } from "node:fs";

describe("Gate 3.5A：canonical 观察信任", () => {
  it("所有观察点都由 driver 进度派生，峰顶不显示 8849", () => {
    const start = buildObservationPoints(EVEREST_EXPEDITION, 0);
    const summit = buildObservationPoints(EVEREST_EXPEDITION, 1);
    expect(start.find((point) => point.id === "base-camp")?.state).toBe("current");
    expect(summit.find((point) => point.id === "summit")?.state).toBe("current");
    expect(formatObservationElevation(8849, 8848.86)).toBe("8,848.86");
    expect(progressForReferenceElevation(
      EVEREST_EXPEDITION.routeIndex,
      EVEREST_EXPEDITION.maxElevation,
      8848.86,
    )).toBe(1);
  });

  it("地图连线使用与节点完全相同的投影端点", () => {
    const projection = projectRouteMilestones(EVEREST_EXPEDITION.routeIndex);
    expect(projection.points.length).toBe(EVEREST_EXPEDITION.routeIndex.milestones.length);
    for (let i = 0; i < projection.points.length - 1; i += 1) {
      const segment = routeSegment(projection.points[i], projection.points[i + 1]);
      expect(segment.left).toBe(projection.points[i].x);
      expect(segment.top).toBe(projection.points[i].y);
      expect(segment.width).toBeGreaterThan(0);
    }
  });

  it("首页搜索支持常用别名并能返回空结果", () => {
    const scenes = [
      { id: "everest", title: "珠穆朗玛峰", subtitle: "地球之巅", tags: ["高山地貌"] },
      { id: "mariana", title: "马里亚纳海沟", subtitle: "地球最深处", tags: ["海沟"] },
    ];
    expect(filterScenes(scenes, "珠峰").map((scene) => scene.id)).toEqual(["everest"]);
    expect(filterScenes(scenes, "不存在")).toEqual([]);
  });

  it("关键 P0/P1 文案和确认控件真实存在于 WXML", () => {
    const exploration = readFileSync("miniprogram/pages/exploration/index.wxml", "utf8");
    const profile = readFileSync("miniprogram/pages/profile/index.wxml", "utf8");
    const quiz = readFileSync("miniprogram/pages/quiz/index.wxml", "utf8");
    // 前进提示已按世界类型动态化（攀登/下潜/下切），断言提示仍在且绑定了动作词
    expect(exploration).toContain("expClimbLabel");
    expect(exploration).toContain("前进；可用“上一个”回看");
    expect(exploration).toContain("context-elevation");
    expect(profile).toContain("清空本地数据");
    expect(quiz).toContain("继续学习");
  });
});
