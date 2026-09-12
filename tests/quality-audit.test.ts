/**
 * PHASE 10 内容质量审计（脚本化）：
 * - 随堂题 id 全局唯一（跨 4 世界 29 题 + 全局 23 题）
 * - 知识节点海拔在场景内可按升序触发且位于轴范围内
 * - 无乱码/占位残留（"?"、"???"、"TODO"、孤立英文字母）
 * - 跨世界无重复标题
 */
import { describe, expect, it } from "vitest";
import { EXPLORATIONS } from "../miniprogram/data/explorations/index";
import { KNOWLEDGE } from "../miniprogram/data/knowledge";
import { QUIZZES } from "../miniprogram/data/quizzes";

describe("内容质量审计", () => {
  it("全部随堂题 id 全局唯一", () => {
    const ids: string[] = [];
    for (const ex of EXPLORATIONS) {
      for (const n of ex.knowledgeNodes) if (n.quiz) ids.push(n.quiz.id);
    }
    ids.push(...QUIZZES.map((q) => q.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("知识节点海拔均位于场景轴内且末节点=终点", () => {
    for (const ex of EXPLORATIONS) {
      for (const n of ex.knowledgeNodes) {
        expect(n.elevation, `${ex.id}.${n.id}`).toBeGreaterThanOrEqual(
          Math.min(ex.startElevation, 0),
        );
        expect(n.elevation, `${ex.id}.${n.id}`).toBeLessThanOrEqual(ex.maxElevation);
      }
      const last = [...ex.knowledgeNodes].sort((a, b) => a.elevation - b.elevation).pop()!;
      expect(last.elevation).toBe(ex.maxElevation);
    }
  });

  it("无乱码/占位残留（文本字段）", () => {
    const bad: string[] = [];
    const scan = (s: string | undefined, at: string) => {
      if (!s) return;
      if (/[?]{2,}|TODO|FIXME|XXX|待补|placeholder/i.test(s)) bad.push(`${at}: ${s.slice(0, 40)}`);
      if (/\p{Script=Latin}{1,3}(?=[\u4e00-\u9fff])/u.test(s) && !/[A-Z]/.test(s)) {
        // 疑似中文夹英文短残段（1-3 个拉丁字母紧贴中文）——人工核过的缩写（如 C1、mi、km/h）除外
        const cleaned = s.replace(/\b(C[1-4]|K2|mi|km|mm|atm|hPa|CC|BY|SA|DEM|GNSS|GNSS|GPS|NPS|NOAA|NASA|ROV|Hadal|SE|M|W|ft|in)\b/g, "");
        if (/\p{Script=Latin}{1,4}(?=[\u4e00-\u9fff])/u.test(cleaned)) bad.push(`${at}: 疑似英文残段 -> ${s.slice(0, 60)}`);
      }
    };
    for (const ex of EXPLORATIONS) {
      scan(ex.meta.description, `${ex.id}.meta`);
      for (const n of ex.knowledgeNodes) {
        scan(n.title, `${ex.id}.${n.id}.title`);
        scan(n.detail, `${ex.id}.${n.id}.detail`);
      }
      for (const w of ex.route?.waypoints ?? []) {
        scan(w.desc, `${ex.id}.${w.id}.desc`);
        scan(w.detail, `${ex.id}.${w.id}.detail`);
        scan(w.environment, `${ex.id}.${w.id}.environment`);
        scan(w.risk, `${ex.id}.${w.id}.risk`);
        scan(w.history, `${ex.id}.${w.id}.history`);
        scan(w.whatToNotice, `${ex.id}.${w.id}.whatToNotice`);
        for (const f of w.facts ?? []) scan(f, `${ex.id}.${w.id}.fact`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("四个世界标题互不重复", () => {
    const titles = EXPLORATIONS.map((e) => e.title);
    expect(new Set(titles).size).toBe(4);
  });

  it("全局知识与场景节点无同标题重复", () => {
    const sceneTitles = EXPLORATIONS.flatMap((e) => e.knowledgeNodes.map((n) => n.title));
    const overlap = KNOWLEDGE.filter((k) => sceneTitles.includes(k.title));
    expect(overlap).toEqual([]);
  });
});
