/**
 * MediaRegistry —— 统一媒体查询层（纯函数，可在 Node 单测）。
 *
 * 职责边界（Gate 1 Decision 7/8）：
 *   - 只负责「查询有哪些合法（approved）媒体」：approved-only、确定性、无副作用；
 *   - 不决定探索场景使用 LIVE 还是 TERRAIN —— 那是 expedition-visual.ts
 *     （Expedition Visual Resolver）的职责，本层不推翻也不替代它；
 *   - 不读取页面状态、不访问 wx API / Page / Component / Storage / Network；
 *   - 不做网络 fallback：查不到就返回空，由调用方按既定兜底策略处理。
 *
 * 确定性规则：
 *   - 资产顺序 = 清单声明顺序（跨清单时先声明的清单在前）；
 *   - 重复 id 只保留首个声明者；
 *   - hero = purpose==="hero" 的首张，否则该实体声明顺序的首张；
 *   - gallery = 除 hero 外的全部实体媒体（声明顺序）。
 */
import type {
  MediaAsset,
  MediaEntityType,
  MediaManifest,
} from "../types/expedition";

export type MediaRegistrySource = readonly MediaManifest[];

/** 正式 UI 只消费 approved 资产（与 validateMediaManifest 双层把关） */
export function isApprovedMedia(asset: MediaAsset): boolean {
  return asset.reviewStatus === "approved";
}

/** 跨清单收集全部 approved 资产（重复 id 首个声明者胜出） */
export function approvedMediaAssets(
  manifests: MediaRegistrySource,
): MediaAsset[] {
  const seen = new Set<string>();
  const out: MediaAsset[] = [];
  for (const manifest of manifests) {
    for (const asset of manifest.assets ?? []) {
      if (!isApprovedMedia(asset) || seen.has(asset.id)) continue;
      seen.add(asset.id);
      out.push(asset);
    }
  }
  return out;
}

/** 按 id 查询（approved-only；非 approved / 不存在返回 undefined） */
export function getMediaById(
  manifests: MediaRegistrySource,
  id: string,
): MediaAsset | undefined {
  return approvedMediaAssets(manifests).find((a) => a.id === id);
}

/** 查询某实体的全部 approved 媒体（不同实体互不串数据） */
export function getMediaForEntity(
  manifests: MediaRegistrySource,
  entityType: MediaEntityType,
  entityId: string,
): MediaAsset[] {
  return approvedMediaAssets(manifests).filter(
    (a) => a.entityType === entityType && a.entityId === entityId,
  );
}

/** 实体主图：purpose==="hero" 首张优先，否则声明顺序首张 */
export function getHeroMedia(
  manifests: MediaRegistrySource,
  entityType: MediaEntityType,
  entityId: string,
): MediaAsset | undefined {
  const list = getMediaForEntity(manifests, entityType, entityId);
  return list.find((a) => a.purpose === "hero") ?? list[0];
}

/** 实体图册：除 hero 外的全部媒体（声明顺序；无 hero 时返回全部） */
export function getGalleryMedia(
  manifests: MediaRegistrySource,
  entityType: MediaEntityType,
  entityId: string,
): MediaAsset[] {
  const list = getMediaForEntity(manifests, entityType, entityId);
  const hero = list.find((a) => a.purpose === "hero") ?? list[0];
  return hero ? list.filter((a) => a.id !== hero.id) : list;
}
