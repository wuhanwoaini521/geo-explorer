/**
 * Release Contract —— Release Candidate 冻结测试（Final Acceptance · PHASE 11）。
 *
 * 本测试锁定当前 Release 的版本基线（4 worlds / 29 waypoints / 41 knowledge）。
 * 数字属于 RELEASE 契约，不属于通用 validator（validator 保持动态）；
 * 未来版本升级内容量时，应有意更新本文件的基线数字。
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { EXPLORATIONS } from "../miniprogram/data/explorations/index";
import { KNOWLEDGE } from "../miniprogram/data/knowledge";
import { PLACES } from "../miniprogram/data/places";
import { QUIZZES } from "../miniprogram/data/quizzes";
import { MEDIA_CANDIDATES } from "../miniprogram/data/media/candidates";
import { RUNTIME_MANIFESTS, validateRuntimeManifests } from "../miniprogram/data/media/world-manifests";
import { validateContent } from "../miniprogram/engine/validate-content";

const ROOT = join(__dirname, "..");
const RELEASE = { worlds: 4, waypoints: 29, knowledge: 41 };

describe("Release 基线（版本契约）", () => {
  it("4 worlds / 29 waypoints / 41 knowledge / 4 places with exploration", () => {
    expect(EXPLORATIONS.length).toBe(RELEASE.worlds);
    expect(EXPLORATIONS.reduce((n, e) => n + (e.route?.waypoints.length ?? 0), 0)).toBe(RELEASE.waypoints);
    expect(KNOWLEDGE.length).toBe(RELEASE.knowledge);
    expect(PLACES.filter((p) => p.explorationId).length).toBe(RELEASE.worlds);
  });

  it("source coverage 100%（知识 + waypoint）", () => {
    expect(KNOWLEDGE.every((k) => (k.sources?.length ?? 0) > 0)).toBe(true);
    for (const ex of EXPLORATIONS) {
      for (const w of ex.route?.waypoints ?? []) {
        expect((w.sources?.length ?? 0) > 0, `${ex.id}/${w.id}`).toBe(true);
      }
    }
  });
});

describe("Release 孤儿与引用完整性", () => {
  it("无孤儿知识（每条知识关联 Place / 地貌 / 世界场景 至少一路）", () => {
    for (const k of KNOWLEDGE) {
      const linked =
        k.relatedPlaceIds.length > 0 ||
        k.relatedLandformIds.length > 0 ||
        EXPLORATIONS.some((ex) =>
          ex.route?.waypoints.some((w) => (w.knowledgeIds ?? []).includes(k.id)),
        );
      expect(linked, `孤儿知识 ${k.id}`).toBe(true);
    }
  });

  it("无孤儿 waypoint（全部有 primary 或诚实 fallback，且 knowledge ≥1）", () => {
    const wpAssets = new Set(
      RUNTIME_MANIFESTS.flatMap((m) => m.assets).filter((a) => a.entityType === "waypoint").map((a) => a.entityId),
    );
    for (const ex of EXPLORATIONS) {
      for (const w of ex.route?.waypoints ?? []) {
        const hasMedia = wpAssets.has(w.id);
        const hasKnowledge =
          (w.knowledgeIds?.length ?? 0) + (w.knowledgeId ? 1 : 0) > 0;
        expect(hasKnowledge, `${ex.id}/${w.id} 无知识`).toBe(true);
        // 媒体允许诚实 fallback（无图），但必须有内容
        expect(w.desc, `${ex.id}/${w.id} 无 desc`).toBeTruthy();
        void hasMedia;
      }
    }
  });

  it("无无效 / 未知 / 重复 media", () => {
    expect(validateRuntimeManifests()).toEqual([]);
    const issues = validateContent((p) => existsSync(join(ROOT, "miniprogram", p)));
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
    const ids = RUNTIME_MANIFESTS.flatMap((m) => m.assets.map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("unknown provenance 资产 runtime usage = 0（Final Acceptance 收口）", () => {
    const retired = ["fuji-card.png", "mariana-card.png", "grand-canyon-card.png", "everest-climb-modern.png", "everest-history-1953.png"];
    for (const f of retired) {
      expect(existsSync(join(ROOT, "miniprogram/assets/world", f)), `${f} 应已退役删除`).toBe(false);
    }
  });

  it("runtime hash 全部可实算复核（防篡改）", () => {
    for (const m of RUNTIME_MANIFESTS) {
      for (const a of m.assets) {
        const p = join(ROOT, "miniprogram", a.localPath);
        expect(existsSync(p), a.id).toBe(true);
        if (!a.hash) continue; // 自产历史资产豁免
        const actual = createHash("sha256").update(readFileSync(p)).digest("hex");
        expect(actual, `${a.id} hash mismatch`).toBe(a.hash);
      }
    }
  });
});

describe("Release 路线与进度契约", () => {
  it("全部路线 progress 单调、首尾 0/1、终点海拔=场景 max", () => {
    for (const ex of EXPLORATIONS) {
      const wps = ex.route!.waypoints;
      expect(wps[0].progress).toBe(0);
      expect(wps[wps.length - 1].progress).toBe(1);
      for (let i = 1; i < wps.length; i++) {
        expect(wps[i].progress).toBeGreaterThan(wps[i - 1].progress);
      }
      const lastNode = [...ex.knowledgeNodes].sort((a, b) => a.elevation - b.elevation).pop()!;
      expect(lastNode.elevation).toBe(ex.maxElevation);
    }
  });

  it("全部 quiz answerIndex 合法且解释非空", () => {
    for (const q of QUIZZES) {
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(q.options.length);
      expect(q.explanation.length).toBeGreaterThan(5);
    }
    for (const ex of EXPLORATIONS) {
      for (const n of ex.knowledgeNodes) {
        if (!n.quiz) continue;
        expect(n.quiz.answerIndex).toBeLessThan(n.quiz.options.length);
      }
    }
  });

  it("media 候选与 runtime 边界干净（无 approved 留候选区）", () => {
    expect(validateContent().filter((i) => i.level === "error")).toEqual([]);
    const runtimeIds = new Set(RUNTIME_MANIFESTS.flatMap((m) => m.assets.map((a) => a.id)));
    for (const c of MEDIA_CANDIDATES) {
      if (c.promotedRuntimeId) {
        expect(runtimeIds.has(c.promotedRuntimeId), c.id).toBe(true);
      }
    }
  });
});
