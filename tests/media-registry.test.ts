/**
 * Gate 1 · MediaRegistry —— approved-only 纯函数查询层 + 媒体校验（Node 可跑）。
 *
 * 覆盖：approved 可查 / draft·review·rejected 不可查 / 不存在 ID 空结果 /
 *       entity 归属隔离 / hero·gallery 确定性 / GeographicRole 受控 /
 *       approved 必须有 localPath / candidate 允许无 localPath。
 */
import { describe, it, expect } from "vitest";
import {
  approvedMediaAssets,
  getGalleryMedia,
  getHeroMedia,
  getMediaById,
  getMediaForEntity,
  isApprovedMedia,
} from "../miniprogram/engine/media-registry";
import {
  validateCandidateMedia,
  validateMediaManifest,
} from "../miniprogram/engine/validate-expedition";
import type {
  CandidateMediaAsset,
  MediaAsset,
  MediaManifest,
} from "../miniprogram/types/expedition";
import { EVEREST_EXPEDITION } from "../miniprogram/data/expeditions/everest";

/* ---------------- fixtures ---------------- */

function asset(
  overrides: Partial<MediaAsset> & Pick<MediaAsset, "id">,
): MediaAsset {
  return {
    entityType: "waypoint",
    entityId: "base-camp",
    title: `t-${overrides.id}`,
    description: `d-${overrides.id}`,
    kind: "photograph",
    localPath: `/assets/test/${overrides.id}.jpg`,
    license: "CC BY-SA 4.0",
    geographicRole: "REPRESENTATIVE",
    reviewStatus: "approved",
    ...overrides,
  } as MediaAsset;
}

function manifestOf(...assets: MediaAsset[]): MediaManifest {
  return { schemaVersion: 1, id: "test-media", sceneId: "test", assets };
}

function candidate(
  overrides: Partial<CandidateMediaAsset> & Pick<CandidateMediaAsset, "id">,
): CandidateMediaAsset {
  return {
    entityType: "waypoint",
    entityId: "base-camp",
    purpose: "hero",
    title: `t-${overrides.id}`,
    kind: "photograph",
    sourceUrl: "https://commons.wikimedia.org/wiki/Test",
    geographicRole: "REPRESENTATIVE",
    reviewStatus: "review",
    tags: ["test"],
    ...overrides,
  } as CandidateMediaAsset;
}

/* ---------------- registry ---------------- */

describe("MediaRegistry · approved-only 查询", () => {
  const manifests = [
    manifestOf(
      asset({ id: "wp-hero", purpose: "hero" }),
      asset({ id: "wp-gallery", purpose: "gallery" }),
      asset({ id: "wp-review", reviewStatus: "review" }),
      asset({ id: "wp-draft", reviewStatus: "draft" }),
      asset({ id: "wp-rejected", reviewStatus: "rejected" }),
      asset({ id: "p-hero", entityType: "place", entityId: "p-everest", purpose: "hero" }),
    ),
  ];

  it("approved asset 可以查询", () => {
    expect(getMediaById(manifests, "wp-hero")?.id).toBe("wp-hero");
    expect(isApprovedMedia(getMediaById(manifests, "wp-hero")!)).toBe(true);
  });

  it("review / draft / rejected asset 不进入正式查询", () => {
    expect(getMediaById(manifests, "wp-review")).toBeUndefined();
    expect(getMediaById(manifests, "wp-draft")).toBeUndefined();
    expect(getMediaById(manifests, "wp-rejected")).toBeUndefined();
    expect(getMediaForEntity(manifests, "waypoint", "base-camp").map((a) => a.id)).toEqual([
      "wp-hero",
      "wp-gallery",
    ]);
  });

  it("不存在 ID 返回明确空结果", () => {
    expect(getMediaById(manifests, "nonexistent")).toBeUndefined();
    expect(getMediaForEntity(manifests, "waypoint", "ghost")).toEqual([]);
    expect(getHeroMedia(manifests, "waypoint", "ghost")).toBeUndefined();
    expect(getGalleryMedia(manifests, "waypoint", "ghost")).toEqual([]);
  });

  it("entityType + entityId 查询正确，不同实体不串数据", () => {
    expect(
      getMediaForEntity(manifests, "place", "p-everest").map((a) => a.id),
    ).toEqual(["p-hero"]);
    expect(
      getMediaForEntity(manifests, "waypoint", "p-everest").map((a) => a.id),
    ).toEqual([]);
    expect(
      getMediaForEntity(manifests, "stage", "base-camp").map((a) => a.id),
    ).toEqual([]);
  });

  it("hero selection deterministic：purpose==='hero' 首张优先", () => {
    expect(getHeroMedia(manifests, "waypoint", "base-camp")?.id).toBe("wp-hero");
    expect(getHeroMedia(manifests, "waypoint", "base-camp")?.id).toBe("wp-hero");
  });

  it("hero 无 purpose 标记时回落到声明顺序首张（同样确定性）", () => {
    const m = manifestOf(
      asset({ id: "first" }),
      asset({ id: "second" }),
    );
    const src = [m];
    expect(getHeroMedia(src, "waypoint", "base-camp")?.id).toBe("first");
    expect(getHeroMedia(src, "waypoint", "base-camp")?.id).toBe("first");
  });

  it("gallery selection deterministic：排除 hero、保持声明顺序", () => {
    expect(
      getGalleryMedia(manifests, "waypoint", "base-camp").map((a) => a.id),
    ).toEqual(["wp-gallery"]);
    expect(
      getGalleryMedia(manifests, "waypoint", "base-camp").map((a) => a.id),
    ).toEqual(["wp-gallery"]);
  });

  it("实体只有 hero 时 gallery 为空", () => {
    const src = [manifestOf(asset({ id: "only-hero", purpose: "hero" }))];
    expect(getGalleryMedia(src, "waypoint", "base-camp")).toEqual([]);
  });

  it("跨清单去重：重复 id 首个声明者胜出", () => {
    const src = [
      manifestOf(asset({ id: "dup", entityId: "first-owner" })),
      manifestOf(asset({ id: "dup", entityId: "second-owner" })),
    ];
    expect(approvedMediaAssets(src).map((a) => a.entityId)).toEqual([
      "first-owner",
    ]);
    expect(
      getMediaForEntity(src, "waypoint", "second-owner").map((a) => a.id),
    ).toEqual([]);
  });
});

/* ---------------- validation ---------------- */

describe("MediaAsset validation（正式清单强约束）", () => {
  it("非法 geographicRole 全部报 error（自由字符串时代结束）", () => {
    for (const bad of [
      "Representative real-world image",
      "Exact current viewpoint",
      "nearby",
      "exact-ish",
    ]) {
      const r = validateMediaManifest(
        manifestOf(
          asset({
            id: "bad-role",
            geographicRole: bad as unknown as MediaAsset["geographicRole"],
          }),
        ),
      );
      expect(r.ok).toBe(false);
      expect(
        r.issues.some(
          (i) => i.path.includes("geographicRole") && i.level === "error",
        ),
      ).toBe(true);
    }
  });

  it("缺少 entityType / entityId → error", () => {
    for (const key of ["entityType", "entityId"] as const) {
      const a = asset({ id: "no-owner" });
      delete (a as Record<typeof key, unknown>)[key];
      const r = validateMediaManifest(manifestOf(a));
      expect(r.ok).toBe(false);
      expect(r.issues.some((i) => i.path.endsWith(key))).toBe(true);
    }
  });

  it("approved asset 缺 localPath → validation failure", () => {
    const a = asset({ id: "no-file" });
    delete (a as Record<"localPath", unknown>).localPath;
    const r = validateMediaManifest(manifestOf(a));
    expect(r.ok).toBe(false);
    expect(
      r.issues.some(
        (i) => i.path.includes("localPath") && i.level === "error",
      ),
    ).toBe(true);
  });

  it("approved 缺 sourceUrl/attribution → warning（不阻断但提示）", () => {
    const a = asset({ id: "thin-provenance" });
    delete (a as Record<"sourceUrl", unknown>).sourceUrl;
    delete (a as Record<"attribution", unknown>).attribution;
    const r = validateMediaManifest(manifestOf(a));
    expect(r.ok).toBe(true);
    expect(r.issues.filter((i) => i.level === "warning").length).toBe(2);
  });

  it("真实 Everest manifest 在新结构下整体合规", () => {
    const r = validateMediaManifest(EVEREST_EXPEDITION.media);
    expect(r.issues.filter((i) => i.level === "error")).toEqual([]);
    expect(r.ok).toBe(true);
  });
});

describe("CandidateMediaAsset validation（候选期弱约束）", () => {
  it("最小候选（无 localPath、license 未确认）允许通过，license 仅 warning", () => {
    const r = validateCandidateMedia(candidate({ id: "cand-1" }));
    expect(r.ok).toBe(true);
    expect(
      r.issues.some(
        (i) => i.path === "candidate.license" && i.level === "warning",
      ),
    ).toBe(true);
  });

  it("candidate 缺 sourceUrl → error（候选必须先说清来自哪里）", () => {
    const c = candidate({ id: "cand-2" });
    delete (c as Record<"sourceUrl", unknown>).sourceUrl;
    const r = validateCandidateMedia(c);
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.path === "candidate.sourceUrl")).toBe(true);
  });

  it("candidate 不允许 approved 状态（应晋升进正式清单）", () => {
    const r = validateCandidateMedia(
      candidate({
        id: "cand-3",
        reviewStatus: "approved" as unknown as CandidateMediaAsset["reviewStatus"],
      }),
    );
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.path === "candidate.reviewStatus")).toBe(
      true,
    );
  });

  it("candidate 非法 geographicRole → error", () => {
    const r = validateCandidateMedia(
      candidate({
        id: "cand-4",
        geographicRole: "nearby" as unknown as CandidateMediaAsset["geographicRole"],
      }),
    );
    expect(r.ok).toBe(false);
    expect(
      r.issues.some(
        (i) => i.path === "candidate.geographicRole" && i.level === "error",
      ),
    ).toBe(true);
  });
});
