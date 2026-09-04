/**
 * MVP 完整闭环测试（Node / vitest）：珠峰 MVP 的新增行为。
 * 覆盖：环境边界（0/50/100%）、数据完整性（meta/分类/Quiz/自然带视觉字段）、
 * 随堂题、知识解锁、登顶汇总、成就、持久化（含合并与场景隔离）、无效海拔。
 */
import { describe, expect, it } from "vitest";
import { EVEREST } from "../miniprogram/data/explorations/everest";
import { EXPLORATIONS } from "../miniprogram/data/explorations/index";
import {
  deriveState,
  knowledgeUnlockedOnMove,
  pendingNodesNear,
  quizForNode,
} from "../miniprogram/engine/exploration-engine";
import type { ExplorationKnowledgeNode } from "../miniprogram/types/exploration";
import {
  createMemoryStorage,
  saveExplorationRecord,
  getRecords,
  getExplorationStats,
} from "../miniprogram/services/exploration-store";
import { formatDuration, progressPercent } from "../miniprogram/utils/format";
import {
  computeAchievements,
  quizAccuracy,
  summarizeRun,
} from "../miniprogram/utils/summary";

const NODES = EVEREST.knowledgeNodes;
const STAGES = EVEREST.stages;

/* ================= 场景数据完整性 ================= */

describe("场景数据完整性（通用注册表）", () => {
  it("至少注册一个场景，且 id/slug 唯一", () => {
    expect(EXPLORATIONS.length).toBeGreaterThanOrEqual(1);
    const ids = EXPLORATIONS.map((e) => e.id);
    const slugs = EXPLORATIONS.map((e) => e.slug);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("每个注册场景都携带完整 meta", () => {
    for (const ex of EXPLORATIONS) {
      expect(ex.meta).toBeTruthy();
      expect(ex.meta.placeLabel).toBeTruthy();
      expect(ex.meta.region).toBeTruthy();
      expect(ex.meta.typeLabel).toBeTruthy();
      expect(ex.meta.description).toBeTruthy();
    }
  });

  it("珠峰每个自然带都有地形主色与地面点缀（Step2 视觉分层）", () => {
    expect(STAGES.length).toBeGreaterThanOrEqual(8);
    for (const s of STAGES) {
      expect(s.terrainTint).toBeTruthy();
      expect(s.terrainTint!.length).toBe(2);
      expect(s.flora && s.flora.length).toBeGreaterThan(0);
    }
  });

  it("珠峰每个知识节点都有类型标签", () => {
    for (const n of NODES) {
      expect(n.category).toBeTruthy();
      expect(n.summary).toBeTruthy();
      expect(n.detail).toBeTruthy();
    }
  });

  it("节点随堂题格式合法（来源可追溯）", () => {
    for (const n of NODES) {
      if (!n.quiz) continue;
      expect(n.quiz.options.length).toBeGreaterThanOrEqual(2);
      expect(n.quiz.answerIndex).toBeGreaterThanOrEqual(0);
      expect(n.quiz.answerIndex).toBeLessThan(n.quiz.options.length);
      expect(n.quiz.explanation).toBeTruthy();
      expect(n.quiz.source && n.quiz.source.name).toBeTruthy();
    }
  });

  it("阶段海拔严格递增且自 0 起步；节点海拔非降序", () => {
    expect(STAGES[0].elevation).toBe(0);
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGES[i].elevation).toBeGreaterThan(STAGES[i - 1].elevation);
    }
    for (let i = 1; i < NODES.length; i++) {
      expect(NODES[i].elevation).toBeGreaterThanOrEqual(NODES[i - 1].elevation);
    }
  });
});

/* ================= 环境边界：0 / 50% / 100% ================= */

describe("环境边界（0% / 50% / 100%）", () => {
  it("0%：起点温度≈基准、气压≈海平面、植被满、无雪", () => {
    const s = deriveState(EVEREST, 0);
    expect(s.elevation).toBe(0);
    expect(Math.abs(s.temperatureC - EVEREST.baseTemperatureC)).toBeLessThan(0.6);
    expect(s.pressureRatio).toBeGreaterThan(0.98);
    expect(s.pressureHpa).toBeGreaterThan(990);
    expect(s.vegetation).toBeGreaterThan(0.95);
    expect(s.snow).toBeLessThan(0.05);
    expect(s.isSummit).toBe(false);
  });

  it("50%：气压与含氧量显著下降、温度冷却", () => {
    const mid = (EVEREST.maxElevation + EVEREST.startElevation) / 2;
    const s = deriveState(EVEREST, mid);
    expect(s.progress).toBeCloseTo(0.5, 1);
    expect(s.temperatureC).toBeLessThan(EVEREST.baseTemperatureC - 20);
    expect(s.pressureRatio).toBeLessThan(0.8);
    expect(s.pressureRatio).toBeGreaterThan(0.4);
    expect(s.vegetation).toBeLessThan(0.6);
  });

  it("100%：登顶环境（峰顶 -31℃ 附近、含氧≈1/3、满雪）", () => {
    const s = deriveState(EVEREST, EVEREST.maxElevation);
    expect(s.isSummit).toBe(true);
    expect(s.elevation).toBeCloseTo(8848.86, 1);
    expect(s.temperatureC).toBeLessThan(-25);
    expect(s.temperatureC).toBeGreaterThan(-35);
    expect(s.pressureRatio).toBeCloseTo(0.33, 1); // ≈ e^(−8848/8000)
    expect(s.snow).toBeGreaterThan(0.8);
    expect(s.vegetation).toBeLessThan(0.05);
  });

  it("无效海拔（负值 / 超高）被钳制", () => {
    const low = deriveState(EVEREST, -5000);
    expect(low.elevation).toBe(0);
    expect(low.progress).toBe(0);
    const high = deriveState(EVEREST, 99999);
    expect(high.elevation).toBeCloseTo(8848.86, 1);
    expect(high.isSummit).toBe(true);
  });

  it("progressPercent：0 / 50 / 100", () => {
    expect(progressPercent(0, 0, 8848.86)).toBe(0);
    expect(progressPercent(8848.86, 0, 8848.86)).toBe(100);
    expect(progressPercent(4424.43, 0, 8848.86)).toBeCloseTo(50);
  });
});

/* ================= 知识解锁 & 随堂题 ================= */

describe("知识解锁 / 随堂题", () => {
  const treeline = NODES[2]; // 树线（4400m）

  it("上行穿越海拔即解锁；未到达不解锁；下行不解锁", () => {
    expect(
      knowledgeUnlockedOnMove(NODES, 4300, 4600).map((n) => n.id),
    ).toContain(treeline.id);
    expect(knowledgeUnlockedOnMove(NODES, 3800, 4399)).toEqual([]);
    expect(knowledgeUnlockedOnMove(NODES, 4500, 2000)).toEqual([]);
  });

  it("今后待发现窗口：pendingNodesNear 与 derive.pending", () => {
    expect(pendingNodesNear(NODES, 4050).some((n) => n.id === treeline.id)).toBe(
      true,
    );
    const below = deriveState(EVEREST, 4200);
    expect(below.discovered).toHaveLength(0);
    expect(below.pending.some((n) => n.id === treeline.id)).toBe(true);
  });

  it("quizForNode：有题出题、无题返回 null", () => {
    expect(quizForNode(NODES[0])).toBeTruthy();
    const withoutQuiz: ExplorationKnowledgeNode = { ...NODES[0], quiz: undefined };
    expect(quizForNode(withoutQuiz)).toBeNull();
  });
});

/* ================= 登顶汇总 / 成就 ================= */

describe("登顶汇总与成就（纯函数）", () => {
  it("0% 会话：未解锁、未答题、正确率 0、未登顶", () => {
    const r = summarizeRun({
      exploration: EVEREST,
      discoveredIds: [],
      answers: [],
      stageIds: [],
      durationSec: 0,
      maxReached: 0,
    });
    expect(r.unlockedCount).toBe(0);
    expect(r.quizTotal).toBe(0);
    expect(r.accuracy).toBe(0);
    expect(r.summitted).toBe(false);
    expect(r.visitedStages).toHaveLength(0);
  });

  it("50% 会话：部分解锁 / 部分自然带 / 单一正确", () => {
    const r = summarizeRun({
      exploration: EVEREST,
      discoveredIds: ["lukla-forest", "lapse-rate"],
      answers: [{ quizId: "qz-lapse-rate", correct: true }],
      stageIds: ["southern-foothills", "mid-forest"],
      durationSec: 30,
      maxReached: 3000,
    });
    expect(r.unlockedCount).toBe(2);
    expect(r.quizCorrect).toBe(1);
    expect(r.accuracy).toBe(1);
    expect(r.visitedStages).toEqual(["山麓低地", "中低山·混交林"]);
    expect(r.summitted).toBe(false);
  });

  it("100% 会话：登顶 + 全解锁 + 自然带去重 + 答题计数", () => {
    const r = summarizeRun({
      exploration: EVEREST,
      discoveredIds: EVEREST.knowledgeNodes.map((n) => n.id),
      answers: EVEREST.knowledgeNodes.map((n) => ({
        correct: true,
        quizId: n.id,
      })),
      stageIds: ["southern-foothills", "mid-forest", "mid-forest", "summit"],
      durationSec: 372,
      maxReached: 8848.86,
    });
    expect(r.summitted).toBe(true);
    expect(r.unlockedCount).toBe(EVEREST.knowledgeNodes.length);
    expect(r.quizCorrect).toBe(EVEREST.knowledgeNodes.length);
    expect(r.accuracy).toBe(1);
    expect(r.visitedStages).toEqual(["山麓低地", "中低山·混交林", "珠峰之巅"]);
    expect(r.durationSec).toBe(372);
  });

  it("quizAccuracy：无答 0 / 全对 1 / 半数 0.5", () => {
    expect(quizAccuracy([])).toBe(0);
    expect(quizAccuracy([{ quizId: "a", correct: true }])).toBe(1);
    expect(
      quizAccuracy([
        { quizId: "a", correct: true },
        { quizId: "b", correct: false },
      ]),
    ).toBe(0.5);
  });

  it("成就：按统计解锁全四项", () => {
    const ac = computeAchievements({
      summitted: true,
      durationSec: 60,
      unlockedCount: NODES.length,
      nodeTotal: NODES.length,
      quizAnswerCount: 4,
      quizAccuracy: 0.9,
      visitedStageCount: 6,
      stageTotal: STAGES.length,
    }).map((a) => a.id);
    expect(ac).toEqual(["summit", "sage", "quiz-sharp", "trail"]);
  });

  it("未登顶则无「登顶」成就", () => {
    const ac = computeAchievements({
      summitted: false,
      durationSec: 60,
      unlockedCount: 1,
      nodeTotal: NODES.length,
      quizAnswerCount: 0,
      quizAccuracy: 0,
      visitedStageCount: 1,
      stageTotal: STAGES.length,
    }).map((a) => a.id);
    expect(ac).not.toContain("summit");
  });
});

/* ================= 时长格式化 ================= */

describe("formatDuration", () => {
  it("秒 → 人性化格式", () => {
    expect(formatDuration(45)).toBe("45 秒");
    expect(formatDuration(60)).toBe("1 分");
    expect(formatDuration(372)).toBe("6 分 12 秒");
    expect(formatDuration(-5)).toBe("0 秒");
  });
});

/* ================= 持久化（内存 storage） ================= */

describe("持久化（exploration-store + memory）", () => {
  const mk = () => createMemoryStorage();

  it("写入后读取同一记录，统计字段齐全", () => {
    const storage = mk();
    saveExplorationRecord(
      {
        exploration: EVEREST,
        reachElevation: 3000,
        completed: false,
        knowledgeIds: ["lukla-forest"],
        durationSec: 42,
        quizCorrect: 1,
        quizTotal: 2,
        stagesVisited: ["southern-foothills"],
        achievements: ["trail"],
      },
      storage
    );
    const rec = getRecords(storage)[0];
    expect(rec).toBeTruthy();
    expect(rec.id).toBe("everest");
    expect(rec.reachElevation).toBe(3000);
    expect(rec.durationSec).toBe(42);
    expect(rec.quizCorrect).toBe(1);
    expect(rec.quizTotal).toBe(2);
    expect(rec.stagesVisited).toEqual(["southern-foothills"]);
    expect(rec.achievements).toContain("trail");
    expect(rec.completed).toBe(false);
  });

  it("合并且更高优先：低海拔不覆盖高海拔", () => {
    const storage = mk();
    const base = { exploration: EVEREST };
    saveExplorationRecord({ ...base, reachElevation: 4000, completed: false }, storage);
    saveExplorationRecord({ ...base, reachElevation: 2000, completed: false }, storage);
    const rec = getRecords(storage)[0];
    expect(rec.reachElevation).toBe(4000);
  });

  it("更优记录：已完成优先保留", () => {
    const storage = mk();
    const base = { exploration: EVEREST };
    saveExplorationRecord({ ...base, reachElevation: 8848.86, completed: true }, storage);
    saveExplorationRecord({ ...base, reachElevation: 8000, completed: false }, storage);
    const rec = getRecords(storage)[0];
    expect(rec.completed).toBe(true);
    expect(rec.reachElevation).toBe(8848.86);
  });

  it("切换场景（多 id）互不干扰", () => {
    const storage = mk();
    saveExplorationRecord({
      exploration: EVEREST, reachElevation: 3000, completed: false, knowledgeIds: [],
    }, storage);
    const fake = { ...EVEREST, id: "fuji", slug: "fuji", title: "富士山" };
    saveExplorationRecord({
      exploration: fake, reachElevation: 1500, completed: false, knowledgeIds: [],
    }, storage);
    const recs = getRecords(storage);
    expect(recs).toHaveLength(2);
    const stats = getExplorationStats(storage);
    expect(stats.completed).toBe(0);
    expect(stats.totalDistanceM).toBe(4500);
  });

  it("异常值（NaN 等）归一为 0，不崩溃", () => {
    const storage = mk();
    saveExplorationRecord(
      {
        exploration: EVEREST,
        reachElevation: NaN,
        completed: false,
        knowledgeIds: [],
      },
      storage
    );
    const rec = getRecords(storage)[0];
    expect(rec).toBeTruthy();
    expect(rec.reachElevation).toBe(0);
  });
});