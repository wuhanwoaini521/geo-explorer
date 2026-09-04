/**
 * 知识库联动 / 筛选纯逻辑测试（Node / vitest）。
 */
import { describe, expect, it } from "vitest";
import { EXPLORATIONS } from "../miniprogram/data/explorations/index";
import { KNOWLEDGE, KNOWLEDGE_CATEGORIES } from "../miniprogram/data/knowledge";
import {
  buildNodeToLibraryMap,
  filterKnowledge,
  unlockedLibraryIds,
} from "../miniprogram/utils/knowledge-link";
import type { ExplorationRecord } from "../miniprogram/services/exploration-store";

describe("buildNodeToLibraryMap / knowledgeId 映射", () => {
  it("映射的 knowledgeId 都指向真实存在的知识库条目", () => {
    const libIds = new Set(KNOWLEDGE.map((k) => k.id));
    const map = buildNodeToLibraryMap(EXPLORATIONS);
    expect(map.size).toBeGreaterThanOrEqual(6); // 珠峰 6 + 马里亚纳 ≥1
    for (const libId of map.values()) {
      expect(libIds.has(libId)).toBe(true);
    }
  });
});

describe("unlockedLibraryIds（探索记录 → 知识库解锁集合）", () => {
  const mkRecord = (patch: Partial<ExplorationRecord>): ExplorationRecord => ({
    id: "everest",
    title: "",
    emoji: "🏔️",
    reachElevation: 0,
    maxElevation: 8848.86,
    completed: false,
    knowledgeIds: [],
    durationSec: 0,
    quizCorrect: 0,
    quizTotal: 0,
    stagesVisited: [],
    achievements: [],
    updatedAt: 0,
    ...patch,
  });

  it("探索节点 id 经映射点亮知识库条目", () => {
    const unlocked = unlockedLibraryIds(
      [mkRecord({ knowledgeIds: ["lapse-rate", "khumbu-glacier"] })],
      EXPLORATIONS,
    );
    expect(unlocked.has("k01")).toBe(true); // 直减率
    expect(unlocked.has("k08")).toBe(true); // 冰川
    expect(unlocked.size).toBe(2);
  });

  it("未映射到知识库的节点 id 被忽略；无记录返回空集", () => {
    const unlocked = unlockedLibraryIds(
      [mkRecord({ knowledgeIds: ["summit-height"] })],
      EXPLORATIONS,
    );
    expect(unlocked.size).toBe(0);
    expect(unlockedLibraryIds([], EXPLORATIONS).size).toBe(0);
  });

  it("多场景记录合并（马里亚纳 challenger-deep → k11）", () => {
    const unlocked = unlockedLibraryIds(
      [
        mkRecord({ id: "everest", knowledgeIds: ["death-zone"] }),
        mkRecord({ id: "mariana", knowledgeIds: ["challenger-deep"] }),
      ],
      EXPLORATIONS,
    );
    expect(unlocked.has("k07")).toBe(true);
    expect(unlocked.has("k11")).toBe(true);
  });
});

describe("filterKnowledge（分类 + 关键词筛选）", () => {
  it("「全部」不过滤分类", () => {
    expect(filterKnowledge(KNOWLEDGE, "全部", "")).toHaveLength(KNOWLEDGE.length);
  });

  it("按分类过滤且结果都属于该分类", () => {
    for (const category of KNOWLEDGE_CATEGORIES) {
      const items = filterKnowledge(KNOWLEDGE, category, "");
      expect(items.length).toBeGreaterThan(0);
      expect(items.every((k) => k.category === category)).toBe(true);
    }
  });

  it("关键词匹配标题/一句话/正文，忽略大小写", () => {
    expect(filterKnowledge(KNOWLEDGE, "全部", "雪线").length).toBeGreaterThanOrEqual(1);
    expect(
      filterKnowledge(KNOWLEDGE, "全部", "EVEREST").length,
    ).toBe(filterKnowledge(KNOWLEDGE, "全部", "everest").length);
  });

  it("分类 + 关键词叠加过滤", () => {
    const items = filterKnowledge(KNOWLEDGE, "气候", "雪线");
    expect(items.every((k) => k.category === "气候")).toBe(true);
  });

  it("无匹配返回空数组；空白关键词等同无关键词", () => {
    expect(filterKnowledge(KNOWLEDGE, "全部", "不存在的关键词xyz")).toHaveLength(0);
    expect(filterKnowledge(KNOWLEDGE, "全部", "   ")).toHaveLength(KNOWLEDGE.length);
  });
});
