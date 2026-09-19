/**
 * AssetResolver —— 连接业务 assetId、approved-only MediaRegistry 与地址解析层。
 *
 * 页面只需要持有 assetId；清单决定媒体键与授权状态，MediaService 决定远端、
 * 版本、本地兜底和最终占位。这里不访问 wx、Storage 或网络，便于完整单测。
 */
import { getMediaById, type MediaRegistrySource } from "./media-registry";
import {
  resolveAssetSource,
  type AssetResolveOptions,
  type ResolvedAssetSource,
} from "../services/media-service";
import type { MediaAsset } from "../types/expedition";

export interface ResolvedRegistryAsset extends ResolvedAssetSource {
  assetId: string;
  asset?: MediaAsset;
}

export function resolveRegistryAsset(
  manifests: MediaRegistrySource,
  assetId: string,
  options: AssetResolveOptions = {},
): ResolvedRegistryAsset {
  const asset = getMediaById(manifests, assetId);
  return {
    assetId,
    asset,
    ...resolveAssetSource(asset?.mediaKey, options),
  };
}
