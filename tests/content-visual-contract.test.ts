/**
 * 内容视觉契约 —— 用户可见的素材规则回归。
 *
 * 这三条规则全部来自用户反馈，而此前**一条测试都没有**：
 *   1. 地点封面（place hero）必须实景照片，不得用声呐/测深等科研图当封面；
 *   2. 知识列表不得让大量条目回退到同一张占位图（曾出现 29/41 条都是同一张珠峰雪山图）；
 *   3. 马里亚纳封面曾被显式定为「官方声呐图」，用户已推翻该决定。
 */
import { describe, expect, it } from "vitest";
import { KNOWLEDGE } from "../miniprogram/data/knowledge";
import {
  RUNTIME_MANIFESTS,
  getPlaceHeroImage,
} from "../miniprogram/data/media/world-manifests";
import { knowledgeImage } from "../miniprogram/utils/knowledge-media";

const placeHeroes = RUNTIME_MANIFESTS.flatMap((m) =>
  (m.assets ?? []).filter(
    (a) =>
      a.entityType === "place" &&
      a.purpose === "hero" &&
      a.reviewStatus === "approved",
  ),
);

describe("地点封面必须是实景照片", () => {
  it("四个世界的 place hero 都已登记，且 kind 全为 photograph", () => {
    expect(placeHeroes.length).toBeGreaterThanOrEqual(4);
    for (const asset of placeHeroes) {
      expect(asset.kind, `${asset.id} 作为地点封面必须是实景照片`).toBe(
        "photograph",
      );
    }
  });

  it("马里亚纳封面不再指向声呐测深图", () => {
    const hero = getPlaceHeroImage("p-mariana");
    expect(hero).toBeTruthy();
    expect(hero).not.toContain("challenger-sonar");
  });

  it("富士山 / 大峡谷封面保持实景（防止回归）", () => {
    for (const id of ["p-fuji", "p-colorado"]) {
      const hero = getPlaceHeroImage(id);
      expect(hero, `${id} 应有封面`).toBeTruthy();
      expect(hero).toMatch(/\.(jpg|jpeg|png|webp)$/i);
    }
  });
});

describe("知识配图不得大面积重复", () => {
  const paths = KNOWLEDGE.map((k) => knowledgeImage(k)).filter(Boolean);

  it("解析出的图片路径去重后远多于一张", () => {
    expect(paths.length).toBeGreaterThan(0);
    expect(new Set(paths).size).toBeGreaterThan(1);
  });

  it("没有任何一张图被半数以上知识共用（历史 bug：29/41 共用同一张）", () => {
    const counts = new Map<string, number>();
    for (const p of paths) counts.set(p, (counts.get(p) ?? 0) + 1);
    const worst = Math.max(...counts.values());
    expect(
      worst,
      `最热的一张图被 ${worst}/${paths.length} 条知识共用`,
    ).toBeLessThan(paths.length / 2);
  });

  it("无图条目返回空串而不是兜底到无关照片", () => {
    // 至少存在「既无 media 也无语义兜底」的条目，它们必须诚实返回空串，
    // 由页面显示 emoji 占位，而不是拿一张无关照片冒充。
    const empty = KNOWLEDGE.filter((k) => knowledgeImage(k) === "");
    expect(empty.length).toBeGreaterThan(0);
    for (const k of empty) expect(k.emoji).toBeTruthy();
  });
});
