import { describe, expect, it } from "vitest";
import { resolveRegistryAsset } from "../miniprogram/engine/asset-resolver";
import type { MediaManifest } from "../miniprogram/types/expedition";
import { MEDIA_PLACEHOLDER } from "../miniprogram/services/media-service";

const manifests: MediaManifest[] = [
  {
    schemaVersion: 1,
    id: "resolver-test",
    sceneId: "test",
    assets: [
      {
        id: "approved-photo",
        entityType: "knowledge",
        entityId: "k-test",
        purpose: "hero",
        title: "Approved",
        description: "Approved test media",
        kind: "photograph",
        mediaKey: "knowledge/test.jpg",
        license: "Public Domain",
        geographicRole: "REPRESENTATIVE",
        reviewStatus: "approved",
      },
      {
        id: "review-photo",
        entityType: "knowledge",
        entityId: "k-test",
        title: "Review",
        description: "Not runtime approved",
        kind: "photograph",
        mediaKey: "knowledge/review.jpg",
        license: "Public Domain",
        geographicRole: "REPRESENTATIVE",
        reviewStatus: "review",
      },
    ],
  },
];

describe("AssetResolver", () => {
  it("assetId → approved registry → versioned remote URL", () => {
    const result = resolveRegistryAsset(manifests, "approved-photo", {
      remoteBase: "https://media.example.com/",
      version: "v3",
    });
    expect(result.asset?.id).toBe("approved-photo");
    expect(result.src).toBe("https://media.example.com/v3/knowledge/test.jpg");
    expect(result.fallbackSrc).toBe(MEDIA_PLACEHOLDER);
  });

  it("未审核或不存在的 assetId 直接落到设计占位", () => {
    for (const id of ["review-photo", "missing"]) {
      const result = resolveRegistryAsset(manifests, id, {
        remoteBase: "https://media.example.com/",
      });
      expect(result.asset).toBeUndefined();
      expect(result.src).toBe(MEDIA_PLACEHOLDER);
      expect(result.fallbackSrc).toBe(MEDIA_PLACEHOLDER);
    }
  });
});
