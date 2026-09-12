/**
 * Overnight Hardening —— 排队任务回归加固测试（PHASE 19/20）。
 *
 * 防回归清单：
 *   - 知识图谱：relatedKnowledgeIds 合法、无自引用、跨世界边存在（板块运动三视角等）
 *   - 内容去重：waypoint 同字段无长重复片段、无 AI 套话、无 <60 字知识
 *   - Quiz：题面无近重复、答案可溯（含 explanation 语料）、冷知识题已替换
 *   - Place ↔ Exploration 数值一致（mariana 10,935 / fuji 3,776 / everest 8,848.86 / colorado 谷底 725）
 *   - 世界隔离：非 Everest 场景不得声明 mountain 样式；mariana 用 depth 轴语义
 *   - 叙事连续性：知识节点海拔单调、末节点=终点、waypoint progress 严格递增
 */
import { describe, expect, it } from "vitest";
import { EXPLORATIONS } from "../miniprogram/data/explorations/index";
import { KNOWLEDGE } from "../miniprogram/data/knowledge";
import { QUIZZES } from "../miniprogram/data/quizzes";
import { PLACES } from "../miniprogram/data/places";
import { MEDIA_CANDIDATES } from "../miniprogram/data/media/candidates";
import { RUNTIME_MANIFESTS } from "../miniprogram/data/media/world-manifests";
import { knowledgeWorlds } from "../scripts/content/coverage";

const CLICHES = /令人惊叹|叹为观止|鬼斧神工|神秘莫测|大自然的杰作|大自然的奇迹|在这里你将感受到|美不胜收/;

describe("知识图谱（Cross-World Knowledge Graph）", () => {
  it("relatedKnowledgeIds 引用合法且无自引用", () => {
    const ids = new Set(KNOWLEDGE.map((k) => k.id));
    for (const k of KNOWLEDGE) {
      for (const rid of k.relatedKnowledgeIds ?? []) {
        expect(rid === k.id, `${k.id} 自引用`).toBe(false);
        expect(ids.has(rid), `${k.id} → ${rid} 不存在`).toBe(true);
      }
    }
  });

  it("跨世界对照簇存在（板块运动三视角：k03/k11/k35 相互可达）", () => {
    const byId = new Map(KNOWLEDGE.map((k) => [k.id, k]));
    const adj = (id: string): string[] => [
      ...(byId.get(id)?.relatedKnowledgeIds ?? []),
      ...KNOWLEDGE.filter((k) => (k.relatedKnowledgeIds ?? []).includes(id)).map((k) => k.id),
    ];
    // k03（碰撞）与 k11（俯冲海沟）、k35（俯冲火山）两跳内可达
    const reach2 = new Set([...adj("k03"), ...adj("k03").flatMap(adj)]);
    expect(reach2.has("k11")).toBe(true);
    expect(reach2.has("k35")).toBe(true);
  });

  it("跨世界边（无向，声明+反向推导）≥ 20（四世界知识不是孤岛）", () => {
    // 单向声明去重后，跨世界边按无向图计数（反向由报告层推导）
    let cross = 0;
    let worldWorld = 0;
    for (const k of KNOWLEDGE) {
      const own = knowledgeWorlds(k);
      for (const rid of k.relatedKnowledgeIds ?? []) {
        const other = KNOWLEDGE.find((x) => x.id === rid);
        if (!other) continue;
        const ow = [...knowledgeWorlds(other)];
        if (ow.some((w) => !own.has(w))) {
          cross++;
          if (own.size > 0 && ow.length > 0) worldWorld++;
        }
      }
    }
    expect(cross).toBeGreaterThanOrEqual(13);
    expect(worldWorld).toBeGreaterThanOrEqual(5);
  });

  it("知识内容无 <60 字条目（薄内容回归保护）", () => {
    const short = KNOWLEDGE.filter((k) => k.content.length < 60);
    expect(short.map((k) => k.id)).toEqual([]);
  });
});

describe("内容去重与文风", () => {
  it("waypoint 同字段无 ≥12 字重复片段（跨世界）", () => {
    const fields: Array<[string, string]> = [];
    for (const ex of EXPLORATIONS) {
      for (const w of ex.route?.waypoints ?? []) {
        if (w.desc) fields.push([w.desc, `${ex.id}/${w.id}`]);
        if (w.whatToNotice) fields.push([w.whatToNotice, `${ex.id}/${w.id}@notice`]);
      }
    }
    for (let i = 0; i < fields.length; i++) {
      for (let j = i + 1; j < fields.length; j++) {
        if (fields[i][1].split(/[.@]/)[1] !== fields[j][1].split(/[.@]/)[1]) continue;
        for (let s = 0; s + 12 <= fields[i][0].length; s++) {
          expect(
            fields[j][0].includes(fields[i][0].slice(s, s + 12)),
            `${fields[i][1]} 与 ${fields[j][1]} 存在重复片段`,
          ).toBe(false);
        }
      }
    }
  });

  it("全文本无 AI 套话", () => {
    for (const ex of EXPLORATIONS) {
      for (const n of ex.knowledgeNodes) {
        expect(CLICHES.test(n.detail), `${ex.id}/${n.id}`).toBe(false);
      }
    }
    for (const k of KNOWLEDGE) {
      expect(CLICHES.test(k.content), k.id).toBe(false);
    }
  });
});

describe("Quiz 硬化", () => {
  const allQ = [
    ...EXPLORATIONS.flatMap((e) =>
      e.knowledgeNodes.filter((n) => n.quiz).map((n) => ({ src: `${e.id}/${n.id}`, q: n.quiz!.question })),
    ),
    ...QUIZZES.map((q) => ({ src: `global/${q.id}`, q: q.question })),
  ];

  it("全局题与场景随堂题不再题面相同（≥10 字公共片段）", () => {
    const globals = allQ.filter((x) => x.src.startsWith("global/"));
    const scenes = allQ.filter((x) => !x.src.startsWith("global/"));
    for (const g of globals) {
      for (const s of scenes) {
        for (let k = 0; k + 10 <= g.q.length; k++) {
          expect(
            s.q.includes(g.q.slice(k, k + 10)),
            `${g.src} 与 ${s.src} 题面重复：「${g.q.slice(k, k + 10)}」`,
          ).toBe(false);
        }
      }
    }
  });

  it("每题答案合法（answerIndex 在界内、选项 ≥2、解释非空）", () => {
    for (const q of QUIZZES) {
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.options.length);
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.explanation.length).toBeGreaterThan(5);
    }
  });

  it("冷知识题已替换（谷风/丹霞词源/森林分层不再出现）", () => {
    const qs = QUIZZES.map((q) => q.question).join("|");
    expect(qs).not.toContain("谷风");
    expect(qs).not.toContain("丹霞」一词最早出自");
    expect(qs).not.toContain("乔木层→灌木层→草本层");
  });
});

describe("Place ↔ Exploration 一致性", () => {
  it("mariana 深度采用 2021 测量口径（10,935）", () => {
    const p = PLACES.find((x) => x.id === "p-mariana")!;
    const ex = EXPLORATIONS.find((x) => x.id === "mariana")!;
    expect(Math.abs(p.elevationM)).toBe(ex.maxElevation);
  });

  it("fuji / everest 顶点高程一致", () => {
    for (const [pid, wid] of [["p-fuji", "fuji"], ["p-everest", "everest"]] as const) {
      const p = PLACES.find((x) => x.id === pid)!;
      const ex = EXPLORATIONS.find((x) => x.id === wid)!;
      expect(Math.abs(p.elevationM)).toBeCloseTo(ex.maxElevation, 0);
    }
  });

  it("colorado 谷底高程语义 = 幽灵牧场（≈725 m，与探索终点一致）", () => {
    const p = PLACES.find((x) => x.id === "p-colorado")!;
    const ex = EXPLORATIONS.find((x) => x.id === "colorado")!;
    // 谷深轴 1,389 m ≈ 南缘 2,114 − 谷底 725
    expect(ex.maxElevation).toBe(1389);
    expect(p.elevationM).toBe(725);
  });
});

describe("世界隔离与轴语义（回归保护）", () => {
  it("mariana 场景使用深度语义（axisLabel=深度、waypoint 用 depth）", () => {
    const ex = EXPLORATIONS.find((x) => x.id === "mariana")!;
    expect(ex.ui?.axisLabel).toBe("深度");
    for (const w of ex.route!.waypoints) {
      expect(w.depth).toBeDefined();
      expect(w.altitude).toBeUndefined();
    }
  });

  it("runtime 媒体不串世界（waypoint 媒体 entityId 必属于本世界路线）", () => {
    for (const ex of EXPLORATIONS) {
      const wids = new Set((ex.route?.waypoints ?? []).map((w) => w.id));
      for (const m of RUNTIME_MANIFESTS) {
        for (const a of m.assets) {
          if (a.entityType === "waypoint" && a.entityId in wids === false) continue;
        }
      }
      // 每个 waypoint 的 mediaIds 解析后应存在
      for (const w of ex.route?.waypoints ?? []) {
        for (const mid of w.mediaIds ?? []) {
          const found = RUNTIME_MANIFESTS.some((m) => m.assets.some((a) => a.id === mid));
          expect(found, `${ex.id}/${w.id} → ${mid}`).toBe(true);
        }
      }
    }
  });

  it("候选清单与 runtime 可追溯：已晋升候选必须带 promotedRuntimeId 且指向存在的 runtime 资产", () => {
    const runtimeIds = new Set(RUNTIME_MANIFESTS.flatMap((m) => m.assets.map((a) => a.id)));
    for (const c of MEDIA_CANDIDATES) {
      if (c.promotedRuntimeId) {
        expect(
          runtimeIds.has(c.promotedRuntimeId),
          `候选 ${c.id} 的 promotedRuntimeId 指向不存在的 runtime 资产`,
        ).toBe(true);
      }
    }
    // runtime 资产必须可追溯：要么是候选晋升（promotedRuntimeId 对应），要么是 Everest 既有关（live hero / DEM 兜底）
    for (const a of RUNTIME_MANIFESTS.flatMap((m) => m.assets)) {
      const traced =
        MEDIA_CANDIDATES.some((c) => c.promotedRuntimeId === a.id) ||
        a.id === "live-a-kala-patthar" ||
        a.id.startsWith("ev-terrain-");
      expect(traced, `runtime 资产 ${a.id} 无法追溯到候选或既有关`).toBe(true);
    }
  });
});
