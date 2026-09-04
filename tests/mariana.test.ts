/**
 * 🌊 马里亚纳海沟 + 通用 Metric 系统测试。
 *
 * 覆盖（Phase 8）：
 *   - 新场景登记（EXPLORATIONS / getExplorationById）
 *   - 数据完整性：6 个海洋带、深度 0→10,935、真实温度/压力/盐度/光照曲线、来源
 *   - 通用指标：curveValue 线性插值（夹取/端点/空）、constValue、percent、digits
 *   - deriveState 在负深度语义下的边界行为（深度方向前进 / stageIndex / progress / isSummit）
 *   - 海洋带边界：正好跨边界切换 stage
 *   - 知识解锁 / 随堂 / 终点 / summary
 *   - Everest ↔ Mariana 持久化切换隔离（store 多 id）
 */
import { describe, expect, it } from "vitest";
import { EVEREST } from "../miniprogram/data/explorations/everest";
import { MARIANA } from "../miniprogram/data/explorations/mariana";
import {
  EXPLORATIONS,
  getExplorationById,
} from "../miniprogram/data/explorations/index";
import {
  curveValue,
  deriveMetrics,
  deriveState,
  knowledgeUnlockedOnMove,
  metricValueAt,
  pendingNodesNear,
  quizForNode,
  progressFor,
} from "../miniprogram/engine/exploration-engine";
import {
  createMemoryStorage,
  getExplorationStats,
  getRecords,
  saveExplorationRecord,
} from "../miniprogram/services/exploration-store";
import {
  computeAchievements,
  summarizeRun,
} from "../miniprogram/utils/summary";

const M_NODES = MARIANA.knowledgeNodes;
const M_STAGES = MARIANA.stages;

/* ================= 1. 注册与数据完整性 ================= */

describe("新场景注册（马里亚纳）", () => {
  it("已注册进 EXPLORATIONS，可通过 id 获取", () => {
    const ids = EXPLORATIONS.map((e) => e.id);
    expect(ids).toContain("mariana");
    expect(getExplorationById("mariana")?.id).toBe("mariana");
    expect(ids).toContain("everest");
  });

  it("每个注册场景均声明 ui / destination / metrics（数据驱动前提）", () => {
    for (const ex of EXPLORATIONS) {
      expect(ex.ui).toBeTruthy();
      expect(ex.ui!.axisLabel).toBeTruthy();
      expect(ex.ui!.remainingLabel).toBeTruthy();
      expect(ex.ui!.extentWord).toBeTruthy();
      expect(ex.destination).toBeTruthy();
      expect(ex.destination!.title).toBeTruthy();
      expect(Array.isArray(ex.metrics)).toBe(true);
      expect(ex.metrics!.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("世界主题声明：珠峰为 mountain，马里亚纳为 ocean（探索页按此分派视觉）", () => {
    expect(EXPLORATIONS.find((e) => e.id === "everest")?.world?.style).toBe(
      "mountain",
    );
    expect(EXPLORATIONS.find((e) => e.id === "mariana")?.world?.style).toBe(
      "ocean",
    );
  });

  it("马里亚纳：6 个海洋带从海面向下排布，`每 stage 带生物/地形色/照明密度", () => {
    expect(M_STAGES.length).toBe(6);
    // 深度应 单调 递增（0 → 10000）
    for (let i = 1; i < M_STAGES.length; i++) {
      expect(M_STAGES[i].elevation).toBeGreaterThan(
        M_STAGES[i - 1].elevation,
      );
    }
    expect(M_STAGES[0].elevation).toBe(0);
    expect(M_STAGES[M_STAGES.length - 1].elevation).toBeLessThanOrEqual(
      MARIANA.maxElevation,
    );
    for (const s of M_STAGES) {
      expect(s.biome).toBeTruthy();
      expect(s.terrainTint!.length).toBe(2);
      expect(s.flora!.length).toBeGreaterThan(0);
      expect(typeof s.snow).toBe("number");
      expect(typeof s.fog).toBe("number");
    }
  });

  it("最深处数据：10,935 m（2021 年修正 ≤ 数值）", () => {
    expect(MARIANA.maxElevation).toBeCloseTo(10935, 0);
    expect(MARIANA.startElevation).toBe(0);
  });

  it("指标声明：5 项，按覆盖 ≠ 鳞散水压×盐度，且每条有来源", () => {
    const keys = MARIANA.metrics!.map((m) => m.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        "temperature",
        "pressure",
        "light",
        "salinity",
        "life",
      ]),
    );
    for (const m of MARIANA.metrics!) {
      expect(m.label).toBeTruthy();
      expect(
        m.curve !== undefined || m.constValue !== undefined,
      ).toBe(true);
      if (m.curve) expect(m.curve.length).toBeGreaterThanOrEqual(2);
      expect(m.source).toBeTruthy();
      expect(m.source!.name.length).toBeGreaterThan(0);
    }
  });

  it("7 个知识节点：必带摘要/详情/来源，Quiz 题目合法", () => {
    expect(M_NODES.length).toBe(7);
    for (const n of M_NODES) {
      expect(n.title).toBeTruthy();
      expect(n.summary.length).toBeGreaterThan(5);
      expect(n.detail.length).toBeGreaterThan(10);
      expect(n.sources && n.sources.length).toBeGreaterThan(0);
      const q = n.quiz!;
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.options.length);
      expect(q.explanation.length).toBeGreaterThan(0);
    }
  });

  it("最大深度节点放在最后（抵底才触发）", () => {
    const sorted = [...M_NODES].sort(
      (a, b) => a.elevation - b.elevation,
    );
    expect(sorted[M_NODES.length - 1].id).toBe("challenger-deep");
    expect(sorted[M_NODES.length - 1].elevation).toBeCloseTo(10935, 0);
  });
});

/* ================= 2. 通用 Metric 数学 ================= */

describe("curveValue（逐步折线线性插值）", () => {
  it("空数组 / 单点", () => {
    expect(curveValue([], 100)).toBe(0);
    expect(curveValue([[50, 7]], 999)).toBe(7);
  });

  it("升序 clamp 首尾", () => {
    const pts: Array<[number, number]> = [
      [0, 0],
      [100, 10],
    ];
    expect(curveValue(pts, -5)).toBe(0);
    expect(curveValue(pts, 200)).toBe(10);
  });

  it("区间内线性插值（中点精确）", () => {
    const pts: Array<[number, number]> = [
      [0, 0],
      [100, 10],
      [200, 20],
    ];
    expect(curveValue(pts, 50)).toBe(5);
    expect(curveValue(pts, 150)).toBe(15);
  });
});

describe("deriveMetrics（场景声明 → 已格式化显示）", () => {
  const specs = MARIANA.metrics!;

  it("水压随深度近似线性: 海面 1 atm → 万米 ~1000+ atm", () => {
    const m = deriveMetrics(specs, 0).find((x) => x.key === "pressure")!;
    expect(m.value).toBe("1");
    expect(m.unit).toBe("atm");
    const deep = deriveMetrics(specs, 10935).find(
      (x) => x.key === "pressure",
    )!;
    expect(Number(deep.value)).toBeGreaterThan(1000);
  });

  it("水温：表层高 → 小型极小值 → 近底略回升", () => {
    const t = (y: number) =>
      Number(
        deriveMetrics(specs, y).find((x) => x.key === "temperature")!
          .value,
      );
    expect(t(0)).toBeGreaterThanOrEqual(27);
    expect(t(1000)).toBeLessThan(8); // 温跃层后大幅下降（5°C）
    const bottom = t(10935);
    expect(bottom).toBeGreaterThan(0.5);
    expect(bottom).toBeLessThan(4);
  });

  it("盐度 constValue：任何深度恒为 34.6‰", () => {
    for (const y of [0, 500, 4000, 10935]) {
      const m = deriveMetrics(specs, y).find((x) => x.key === "salinity")!;
      expect(m.value).toBe("34.6");
      expect(m.unit).toBe("‰");
    }
  });

  it("光照 percent：海面 100% → 1000m 后 0%", () => {
    const light = (y: number) =>
      deriveMetrics(specs, y).find((x) => x.key === "light")!;
    expect(light(0).value).toBe("100");
    expect(light(0).unit).toBe("%");
    expect(Number(light(200).value)).toBeLessThan(10);
    expect(light(10935).value).toBe("0");
  });

  it("减速生菌 percent：近海面高 → 深海低（生物量梯度）", () => {
    const life = (y: number) =>
      deriveMetrics(specs, y).find((x) => x.key === "life")!;
    expect(Number(life(0).value)).toBeGreaterThan(Number(life(6000).value));
    expect(Number(life(6000).value)).toBeLessThan(Number(life(1000).value));
  });

  it("metricValueAt 返回原始数值（未格式化）", () => {
    expect(metricValueAt(specs.find((s) => s.key === "salinity")!, 9999)).toBe(
      34.6,
    );
    expect(
      metricValueAt(specs.find((s) => s.key === "pressure")!, 0),
    ).toBeCloseTo(1, 0);
  });
});

/* ================= 3. 引擎在深度轴上的边界行为 ================= */

describe("deriveState（马里亚纳 / 5000→深度方向）", () => {
  it("surface 为第 0 带，海底为最末带", () => {
    expect(deriveState(MARIANA, 0).stageIndex).toBe(0);
    expect(deriveState(MARIANA, 10).stageIndex).toBe(0);
    expect(deriveState(MARIANA, MARIANA.maxElevation).stageIndex).toBe(
      M_STAGES.length - 1,
    );
  });

  it("跨海洋带边界切换 stage", () => {
    const before = deriveState(MARIANA, M_STAGES[1].elevation - 1);
    const at = deriveState(MARIANA, M_STAGES[1].elevation);
    const inside = deriveState(MARIANA, M_STAGES[1].elevation + 1);
    expect(before.stage.id).toBe("epipelagic");
    expect(at.stage.id).toBe("mesopelagic");
    expect(inside.stage.id).toBe("mesopelagic");
  });

  it("到达最深处 isSummit=true（判定词“抵达”）", () => {
    expect(deriveState(MARIANA, 10935).isSummit).toBe(true);
    // 引擎语义：须 ≥ 场景最大深度；10900 m 尚未“触底”
    expect(deriveState(MARIANA, 10900).isSummit).toBe(false);
    expect(deriveState(MARIANA, 10000).isSummit).toBe(false);
  });

  it("deriveState 返回 metrics 数组（场景声明）", () => {
    const st = deriveState(MARIANA, 200);
    expect(st.metrics).toBeTruthy();
    expect(st.metrics.length).toBe(5);
    expect(st.metrics[0].label).toBeTruthy();
  });
});

/* ================= 4. 知识 / 随堂 / 终点总结 ================= */

describe("马里亚纳知识解锁与测验", () => {
  it("抵达节点海拔即 pending / 可解锁", () => {
    // 中微光带的两个节点（600m 生物发光、1000m 黑暗带）即将出现
    const near1 = pendingNodesNear(M_NODES, 998);
    expect(near1.some((n) => n.id === "midnight-zone")).toBe(true);
    // 最深点节点仅在底部附近出现
    const atBottom = pendingNodesNear(M_NODES, 10934);
    expect(atBottom.some((n) => n.id === "challenger-deep")).toBe(true);
    // 海面处没有任何即将出现的节点（首个知识在 600m）
    expect(pendingNodesNear(M_NODES, 0)).toHaveLength(0);
  });

  it("knowledgeUnlockedOnMove 解锁沿途节点", () => {
    const unlocked = knowledgeUnlockedOnMove(
      M_NODES,
      500,
      10940,
    ).map((n) => n.id);
    expect(unlocked).toContain("midnight-zone");
    expect(unlocked).toContain("bioluminescence");
    expect(unlocked).toContain("challenger-deep");
  });

  it("quizForNode 命中知识点随堂题", () => {
    const node = M_NODES.find((n) => n.id === "diving-history")!;
    const qz = quizForNode(node)!;
    expect(qz.question).toBeTruthy();
    expect(qz.options).toContain("的里雅斯特号（Trieste）");
  });
});

describe("终点总结（马里亚）", () => {
  it("抵达最深点 → sumitted=true，海洋带带名包含终点", () => {
    const r = summarizeRun({
      exploration: MARIANA,
      discoveredIds: M_NODES.map((n) => n.id),
      answers: M_NODES.map((n) => ({ correct: true, quizId: n.id })),
      stageIds: M_STAGES.map((s) => s.id),
      durationSec: 600,
      maxReached: MARIANA.maxElevation,
    });
    expect(r.summitted).toBe(true);
    expect(r.visitedStages.length).toBeGreaterThanOrEqual(6);
    expect(r.visitedStages).toContain("挑战者深渊");
  });

  it("未抵达（浅水域）→ summitted=false", () => {
    const r = summarizeRun({
      exploration: MARIANA,
      discoveredIds: [],
      answers: [],
      stageIds: ["epipelagic"],
      durationSec: 100,
      maxReached: 150,
    });
    expect(r.summitted).toBe(false);
  });

  it("成就含 summit（已抵达）", () => {
    const ac = computeAchievements({
      summitted: true,
      durationSec: 100,
      unlockedCount: M_NODES.length,
      nodeTotal: M_NODES.length,
      quizAnswerCount: 3,
      quizAccuracy: 1,
      visitedStageCount: 6,
      stageTotal: M_STAGES.length,
    }).map((a) => a.title);
    expect(ac).toContain("抵达终点");
  });
});

/* ================= 5. 归一化 progress（负方向语义） ================= */

describe("progress（深度轴方向归一化）", () => {
  it("海面 0 / 底部 1 / 中叶 0.5", () => {
    expect(progressFor(0, 0, 10935)).toBe(0);
    expect(progressFor(10935, 0, 10935)).toBe(1);
    expect(progressFor(5467.5, 0, 10935)).toBeCloseTo(0.5, 3);
  });
  it("超界 clamp：负深度与超深都归一", () => {
    expect(progressFor(-300, 0, 10935)).toBe(0);
    expect(progressFor(99999, 0, 10935)).toBe(1);
  });
});

/* ================= 6. 持久化与 Everest↔Mariana 隔离 ================= */

describe("Everest ↔ Mariana 记录隔离", () => {
  const mk = () => createMemoryStorage();

  it("两场景记录写入后互不覆盖", () => {
    const storage = mk();
    saveExplorationRecord(
      { exploration: EVEREST, reachElevation: 5000, completed: false, knowledgeIds: [] },
      storage
    );
    saveExplorationRecord(
      { exploration: MARIANA, reachElevation: 8000, completed: false, knowledgeIds: [] },
      storage
    );
    const recs = getRecords(storage);
    expect(recs).toHaveLength(2);
    const everestRec = recs.find((r) => r.id === "everest")!;
    const marianaRec = recs.find((r) => r.id === "mariana")!;
    expect(everestRec.reachElevation).toBe(5000);
    expect(marianaRec.reachElevation).toBe(8000);
  });

  it("马里亚纳入总和统计（总距离 = 两场景之和）", () => {
    const storage = mk();
    saveExplorationRecord(
      { exploration: EVEREST, reachElevation: 4000, completed: false, knowledgeIds: [] },
      storage
    );
    saveExplorationRecord(
      { exploration: MARIANA, reachElevation: 2000, completed: false, knowledgeIds: [] },
      storage
    );
    const stats = getExplorationStats(storage);
    expect(stats.totalDistanceM).toBe(6000); // 4000 + 2000
    expect(stats.completed).toBe(0);
  });

  it("完成马里亚后 stats.completed=1", () => {
    const storage = mk();
    saveExplorationRecord(
      { exploration: MARIANA, reachElevation: 10935, completed: true, knowledgeIds: ["challenger-deep"] },
      storage
    );
    const stats = getExplorationStats(storage);
    expect(stats.completed).toBe(1);
  });
});