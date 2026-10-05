import { describe, expect, it } from "vitest";
import { MARIANA_EXPEDITION } from "../miniprogram/pkg-explore/data/expeditions/worlds";
import { MARIANA } from "../miniprogram/data/explorations/mariana";
import { KNOWLEDGE } from "../miniprogram/data/knowledge";
import { MEDIA_CANDIDATES } from "../miniprogram/data/media/candidates";
import { MARIANA_MANIFEST } from "../miniprogram/data/media/world-manifests";
import { knowledgeImages } from "../miniprogram/utils/knowledge-media";

describe("Mariana 媒体语义", () => {
  const m2 = MARIANA_MANIFEST.assets.find(
    (asset) => asset.id === "m2-limiting-factor-bottom",
  )!;

  it("m2 只表示潜水器舱内任务记录，不冒充岩壁或海床", () => {
    expect(m2.purpose).toBe("secondary");
    expect(m2.description).toContain("载人舱内");
    expect(m2.description).toContain("不展示海沟岩壁、海床或沉积物");
    expect(m2.tags).toEqual(
      expect.arrayContaining([
        "submersible-interior",
        "operator",
        "mission-record",
        "not-seabed",
      ]),
    );

    const candidate = MEDIA_CANDIDATES.find(
      (asset) => asset.id === "m2-limiting-factor-bottom",
    )!;
    expect(candidate.purpose).toBe("secondary");
    expect(candidate.description).toContain("载人舱内");
    expect(candidate.tags).toContain("not-seabed");
  });

  it("m2 不再作为 Expedition 全场背景或沟坡图片", () => {
    expect(MARIANA_EXPEDITION.routePath!.default.image).not.toContain(
      "m2-limiting-factor-bottom",
    );
    expect(
      MARIANA_EXPEDITION.visualMode!.liveScenes[0].assetId,
    ).not.toBe("m2-limiting-factor-bottom");

    const waypoints = MARIANA.route!.waypoints;
    const imageUsers = waypoints
      .filter((point) =>
        point.images?.some((image) =>
          image.includes("m2-limiting-factor-bottom"),
        ),
      )
      .map((point) => point.id);
    expect(imageUsers).toEqual(["challenger-bottom"]);
    expect(
      waypoints.find((point) => point.id === "challenger-bottom")!
        .imageCredits?.[0],
    ).toContain("非海床影像");
    expect(
      waypoints.find((point) => point.id === "trench-rim")!.images,
    ).toBeUndefined();
  });

  it("没有合格原位照片的水柱节点保持无图，由程序化环境表达", () => {
    const noPhotoWaypoints = [
      "thermocline",
      "twilight-end",
      "deep-water",
      "trench-rim",
    ];
    for (const id of noPhotoWaypoints) {
      const point = MARIANA.route!.waypoints.find((item) => item.id === id)!;
      expect(point.images, `${id} 不应挂接伪现场照片`).toBeUndefined();
      expect(point.mediaIds, `${id} 不应挂接伪现场媒体`).toBeUndefined();
      expect(
        MARIANA_MANIFEST.assets.some(
          (asset) => asset.entityType === "waypoint" && asset.entityId === id,
        ),
        `${id} 不应有 runtime waypoint 媒体`,
      ).toBe(false);
    }
  });

  it("Mariana runtime 媒体均保留来源与许可", () => {
    for (const asset of MARIANA_MANIFEST.assets) {
      expect(asset.sourceUrl, `${asset.id} 缺 sourceUrl`).toMatch(/^https?:\/\//);
      expect(asset.license, `${asset.id} 缺 license`).toBeTruthy();
    }
  });
});

describe("知识媒体增量关联", () => {
  it("k39 复用已审核的大砂走り照片，不新增未授权资源", () => {
    const k39 = KNOWLEDGE.find((item) => item.id === "k39")!;
    const images = knowledgeImages(k39);
    expect(images).toHaveLength(1);
    expect(images[0]).toContain("content/fuji/f-osunabashiri.jpg");
  });
});
