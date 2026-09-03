/**
 * Everest 场景数据完整性与真实性（来源标注）测试。
 */
import { describe, expect, it } from "vitest";
import { EXPLORATIONS } from "../miniprogram/data/explorations/index";
import { EVEREST } from "../miniprogram/data/explorations/everest";

describe("EXPLORATIONS 注册表", () => {
  it("非空且 id 唯一", () => {
    expect(EXPLORATIONS.length).toBeGreaterThanOrEqual(1);
    const ids = EXPLORATIONS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("珠峰首元素可被 getExplorationById('everest') 获取", () => {
    expect(EXPLORATIONS.find((e) => e.id === "everest")).toBe(EVEREST);
  });
});

describe("Everest 阶段数据", () => {
  it("阶段数量 >= 6（设计文档默认海拔梯子）", () => {
    expect(EVEREST.stages.length).toBeGreaterThanOrEqual(6);
  });

  it("起始海拔 0，最大海拔 8848.86，阶段海拔单调升序去重", () => {
    expect(EVEREST.startElevation).toBe(0);
    expect(EVEREST.maxElevation).toBeCloseTo(8848.86, 1);
    const els = EVEREST.stages.map((s) => s.elevation);
    for (let i = 1; i < els.length; i++) {
      expect(els[i]).toBeGreaterThan(els[i - 1]);
    }
  });

  it("最后一个阶段就是峰顶", () => {
    const last = EVEREST.stages[EVEREST.stages.length - 1];
    expect(last.elevation).toBeCloseTo(EVEREST.maxElevation, 1);
  });

  it("每个阶段含完整字段（数值 0-1 的强度字段）", () => {
    for (const s of EVEREST.stages) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.biome).toBeTruthy();
      expect(typeof s.temperatureC).toBe("number");
      expect(s.snow).toBeGreaterThanOrEqual(0);
      expect(s.snow).toBeLessThanOrEqual(1);
      expect(s.fog).toBeGreaterThanOrEqual(0);
      expect(s.fog).toBeLessThanOrEqual(1);
      expect(s.wind).toBeGreaterThanOrEqual(0);
      expect(s.wind).toBeLessThanOrEqual(1);
    }
  });
});

describe("Everest 知识节点", () => {
  it("知识节点数量 >= 5", () => {
    expect(EVEREST.knowledgeNodes.length).toBeGreaterThanOrEqual(5);
  });

  it("节点 id 唯一、海拔在攀登区间内", () => {
    const ids = EVEREST.knowledgeNodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of EVEREST.knowledgeNodes) {
      expect(n.elevation).toBeGreaterThanOrEqual(EVEREST.startElevation);
      expect(n.elevation).toBeLessThanOrEqual(EVEREST.maxElevation);
      expect(n.title).toBeTruthy();
      expect(n.summary).toBeTruthy();
      expect(n.detail).toBeTruthy();
    }
  });

  it("每个知识节点都有来源或标注为 Mock/TODO", () => {
    for (const n of EVEREST.knowledgeNodes) {
      const sourcesOk = Array.isArray(n.sources) && n.sources.length > 0;
      expect(sourcesOk).toBe(true);
      // facts 的 source 可为字符串或 DataSource 对象
      const factsOk =
        !Array.isArray(n.facts) ||
        n.facts.length === 0 ||
        n.facts.every((f) => {
          const s = (f as { source?: unknown }).source;
          if (typeof s === "string") return true;
          return (
            typeof s === "object" &&
            s !== null &&
            "name" in s &&
            Boolean((s as { name: string }).name)
          );
        });
      expect(factsOk).toBe(true);
    }
  });
});

describe("真假性：敏感数值需附 source/approx", () => {
  it("气候模型字段带来源或明确为建模参数", () => {
    expect(EVEREST.climateSource).toBeTruthy();
    expect(EVEREST.source).toBeTruthy();
  });
});
