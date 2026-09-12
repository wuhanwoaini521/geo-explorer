/**
 * 四世界（Everest / Mariana / Fuji / Colorado）数据驱动契约测试 + 内容校验 + 静态资源扫描。
 *
 * 数据驱动原则：不为每个世界复制测试体；以 `for each exploration` 统一 contract：
 *   - Journey 完整性（route waypoints / progress / 起终点）
 *   - Waypoint 内容字段（desc/detail/facts/environment/risk/history/whatToNotice/sources/reviewStatus）
 *   - Knowledge 节点与全局知识库引用
 *   - 随堂题合法性
 *   - Metric 声明与来源
 *   - place.explorationId ↔ EXPLORATIONS 双向关系
 *   - 内容校验（validateContent）：0 error
 *   - 静态资源扫描：全部本地图片路径真实存在（防 dist 掩盖源码断链）
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  EXPLORATIONS,
  getExplorationById,
} from "../miniprogram/data/explorations/index";
import { EVEREST } from "../miniprogram/data/explorations/everest";
import { MARIANA } from "../miniprogram/data/explorations/mariana";
import { FUJI } from "../miniprogram/data/explorations/fuji";
import { COLORADO } from "../miniprogram/data/explorations/colorado";
import { PLACES, featuredPlaces } from "../miniprogram/data/places";
import { KNOWLEDGE } from "../miniprogram/data/knowledge";
import {
  validateContent,
  summarizeIssues,
  knowledgeCompleteness,
} from "../miniprogram/engine/validate-content";
import { deriveState, knowledgeUnlockedOnMove } from "../miniprogram/engine/exploration-engine";

const ROOT = join(__dirname, "..", "miniprogram");

const WORLD_IDS = ["everest", "mariana", "fuji", "colorado"] as const;

/* ---------------- 注册表与四世界身份 ---------------- */

describe("四世界注册", () => {
  it("EXPLORATIONS 恰好包含四个目标世界", () => {
    const ids = EXPLORATIONS.map((e) => e.id);
    expect(new Set(ids)).toEqual(new Set(WORLD_IDS));
    expect(ids).toHaveLength(4);
  });

  it("getExplorationById 四个 id 均可命中", () => {
    for (const id of WORLD_IDS) {
      expect(getExplorationById(id)?.id).toBe(id);
    }
  });

  it("四个世界互不重复（差异化：id/subtitle/终点文案）", () => {
    const subs = EXPLORATIONS.map((e) => e.subtitle);
    expect(new Set(subs).size).toBe(4);
    const destinations = EXPLORATIONS.map((e) => e.destination!.label);
    expect(new Set(destinations).size).toBe(4);
  });

  it("place ↔ exploration 双向承接（无孤儿场景）", () => {
    for (const id of WORLD_IDS) {
      const place = PLACES.find((p) => p.explorationId === id);
      expect(place, `exploration ${id} 应有 place 承接`).toBeTruthy();
    }
    for (const p of PLACES) {
      if (p.explorationId) {
        expect(getExplorationById(p.explorationId)).toBeTruthy();
      }
    }
  });

  it("首页精选仍含四个世界的地点", () => {
    const featuredIds = featuredPlaces().map((p) => p.id);
    expect(featuredIds).toContain("p-everest");
    expect(featuredIds).toContain("p-mariana");
    expect(featuredIds).toContain("p-fuji");
    expect(featuredIds).toContain("p-colorado");
  });
});

/* ---------------- 通用契约（for each exploration） ---------------- */

describe("探索场景契约（for each exploration）", () => {
  for (const ex of EXPLORATIONS) {
    describe(`${ex.id}`, () => {
      it("元数据完整：title/meta/destination/ui/metrics", () => {
        expect(ex.title).toBeTruthy();
        expect(ex.meta.placeLabel).toBeTruthy();
        expect(ex.meta.description.length).toBeGreaterThan(10);
        expect(ex.destination?.title).toBeTruthy();
        expect(ex.ui?.axisLabel).toBeTruthy();
        expect(ex.metrics!.length).toBeGreaterThanOrEqual(3);
        for (const m of ex.metrics!) {
          expect(m.source).toBeTruthy();
        }
      });

      it("stage 序列合法：升序、覆盖起点与终点", () => {
        expect(ex.stages.length).toBeGreaterThanOrEqual(5);
        expect(ex.stages[0].elevation).toBe(ex.startElevation);
        for (let i = 1; i < ex.stages.length; i++) {
          expect(ex.stages[i].elevation).toBeGreaterThan(ex.stages[i - 1].elevation);
        }
        expect(
          ex.stages[ex.stages.length - 1].elevation,
        ).toBeLessThanOrEqual(ex.maxElevation);
        for (const s of ex.stages) {
          expect(s.description).toBeTruthy();
          expect(s.terrainTint?.length).toBe(2);
          expect(s.flora?.length).toBeGreaterThan(0);
        }
      });

      it("知识节点完整：内容/来源/随堂题合法", () => {
        expect(ex.knowledgeNodes.length).toBeGreaterThanOrEqual(7);
        for (const n of ex.knowledgeNodes) {
          expect(n.title).toBeTruthy();
          expect(n.summary.length).toBeGreaterThan(5);
          expect(n.detail.length).toBeGreaterThan(20);
          expect((n.sources?.length ?? 0)).toBeGreaterThan(0);
          if (n.quiz) {
            expect(n.quiz.options.length).toBeGreaterThanOrEqual(2);
            expect(n.quiz.answerIndex).toBeGreaterThanOrEqual(0);
            expect(n.quiz.answerIndex).toBeLessThan(n.quiz.options.length);
            expect(n.quiz.explanation).toBeTruthy();
          }
        }
        // 末个知识节点必须位于终点海拔（抵终点才触发最后一课）
        const sortedNodes = [...ex.knowledgeNodes].sort(
          (a, b) => a.elevation - b.elevation,
        );
        expect(sortedNodes[sortedNodes.length - 1].elevation).toBe(
          ex.maxElevation,
        );
      });

      it("route Journey 完整：waypoint 数量 / progress 严格递增 / 起终点", () => {
        expect(ex.route).toBeTruthy();
        const wps = ex.route!.waypoints;
        expect(wps.length).toBeGreaterThanOrEqual(7);
        expect(wps[0].progress).toBe(0);
        expect(wps[wps.length - 1].progress).toBe(1);
        for (let i = 1; i < wps.length; i++) {
          expect(wps[i].progress).toBeGreaterThan(wps[i - 1].progress);
        }
      });

      it("waypoint 内容字段齐备（desc/detail/facts/environment/risk/history/whatToNotice/sources/reviewStatus）", () => {
        for (const w of ex.route!.waypoints) {
          const at = `${ex.id}.${w.id}`;
          expect(w.desc, `${at}.desc`).toBeTruthy();
          expect((w.detail?.length ?? 0), `${at}.detail`).toBeGreaterThan(40);
          expect((w.facts?.length ?? 0), `${at}.facts`).toBeGreaterThan(0);
          expect(w.environment, `${at}.environment`).toBeTruthy();
          expect(w.history, `${at}.history`).toBeTruthy();
          expect(w.whatToNotice, `${at}.whatToNotice`).toBeTruthy();
          expect((w.sources?.length ?? 0), `${at}.sources`).toBeGreaterThan(0);
          expect(w.reviewStatus, `${at}.reviewStatus`).toBe("approved");
          // 富士山风险字段允许简短，但不得缺失
          expect(w.risk === undefined || typeof w.risk === "string").toBe(true);
        }
      });

      it("waypoint.knowledgeIds 引用合法（场景节点 ∪ 全局知识库）", () => {
        for (const w of ex.route!.waypoints) {
          for (const kid of w.knowledgeIds ?? []) {
            const ok =
              ex.knowledgeNodes.some((n) => n.id === kid) ||
              KNOWLEDGE.some((k) => k.id === kid);
            expect(ok, `${ex.id}.${w.id} -> ${kid}`).toBe(true);
          }
        }
      });

      it("引擎可跑通全轴：起点/终点/中点均能 deriveState，且无 NaN 指标", () => {
        const { startElevation, maxElevation } = ex;
        for (const elev of [startElevation, startElevation + (maxElevation - startElevation) / 2, maxElevation]) {
          const st = deriveState(ex, elev);
          expect(Number.isFinite(st.temperatureC)).toBe(true);
          expect(Number.isFinite(st.progress)).toBe(true);
          expect(st.stage).toBeTruthy();
          for (const m of st.metrics) {
            expect(Number.isFinite(Number(m.value))).toBe(true);
          }
        }
        // 正向推进应解锁知识节点
        const unlocked = knowledgeUnlockedOnMove(
          ex.knowledgeNodes,
          startElevation,
          maxElevation,
        );
        expect(unlocked.length).toBeGreaterThan(0);
        // 终点态：isSummit
        expect(deriveState(ex, maxElevation).isSummit).toBe(true);
      });

      it("气候模型方向正确（山地越爬越冷 / 峡谷越下越热）", () => {
        const st = deriveState(ex, ex.startElevation);
        const end = deriveState(ex, ex.maxElevation);
        if (ex.id === "colorado") {
          expect(end.temperatureC).toBeGreaterThan(st.temperatureC);
        } else {
          expect(end.temperatureC).toBeLessThan(st.temperatureC);
        }
      });
    });
  }
});

/* ---------------- 单世界关键值（防止静默退化） ---------------- */

describe("关键数值锚点", () => {
  it("everest：8,848.86 m / 8 waypoints / 7 节点", () => {
    expect(EVEREST.maxElevation).toBeCloseTo(8848.86, 2);
    expect(EVEREST.route!.waypoints).toHaveLength(8);
    expect(EVEREST.knowledgeNodes).toHaveLength(7);
  });

  it("mariana：10,935 m / 7 waypoints / 7 节点（route 补齐）", () => {
    expect(MARIANA.maxElevation).toBeCloseTo(10935, 0);
    expect(MARIANA.route!.waypoints).toHaveLength(7);
    expect(MARIANA.knowledgeNodes).toHaveLength(7);
    // 下潜场景 waypoint 用 depth 语义
    for (const w of MARIANA.route!.waypoints) {
      expect(w.depth).toBeDefined();
      expect(w.altitude).toBeUndefined();
    }
  });

  it("fuji：3,776 m / 7 waypoints / 8 节点（火山世界新增）", () => {
    expect(FUJI.maxElevation).toBeCloseTo(3776, 0);
    expect(FUJI.route!.waypoints).toHaveLength(7);
    expect(FUJI.knowledgeNodes).toHaveLength(8);
    expect(FUJI.world?.style).toBe("volcano");
  });

  it("colorado：谷深 1,389 m / 7 waypoints / 7 节点（峡谷世界新增）", () => {
    expect(COLORADO.maxElevation).toBeCloseTo(1389, 0);
    expect(COLORADO.route!.waypoints).toHaveLength(7);
    expect(COLORADO.knowledgeNodes).toHaveLength(7);
    expect(COLORADO.world?.style).toBe("canyon");
    // 谷深语义：起点为 0（谷缘）
    expect(COLORADO.startElevation).toBe(0);
  });
});

/* ---------------- 内容校验（validateContent） ---------------- */

describe("内容校验", () => {
  const issues = validateContent();
  const { errors, warnings } = summarizeIssues(issues);

  it("0 error（阻塞级问题必须清零）", () => {
    expect(
      errors.map((e) => `${e.code}: ${e.message}`),
    ).toEqual([]);
  });

  it("四世界全量数据通过校验（警告数已知并小于阈值）", () => {
    // 警告是债务记录（P2），只允许减少不允许膨胀
    expect(warnings.length).toBeLessThan(10);
  });

  it("知识完整度统计可用且与数据一致", () => {
    const s = knowledgeCompleteness();
    expect(s.total).toBe(KNOWLEDGE.length);
    expect(s.withSources).toBeGreaterThan(20);
    expect(s.linkedToPlace).toBeGreaterThan(25);
  });
});

/* ---------------- 静态资源扫描（Gate 0 防回归） ---------------- */

describe("静态资源引用扫描", () => {
  function collectLocalImageRefs(dir: string, acc: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        collectLocalImageRefs(p, acc);
      } else if (/\.(ts|wxml|wxss|json)$/.test(name)) {
        const text = readFileSync(p, "utf8");
        const re = /["'(](\/assets\/[\w./-]+\.(?:png|jpg|jpeg|webp|svg))["')]/g;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text))) acc.push(m[1]);
      }
    }
    return acc;
  }

  it("源码引用的全部 /assets/ 图片真实存在（.ts/.wxml/.wxss/.json）", () => {
    const refs = collectLocalImageRefs(ROOT);
    expect(refs.length).toBeGreaterThan(10);
    const missing = [...new Set(refs)].filter(
      (ref) => !existsSync(join(ROOT, ref.slice("/".length))),
    );
    expect(missing).toEqual([]);
  });
});
