"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRegistryAsset = resolveRegistryAsset;
/**
 * AssetResolver —— 连接业务 assetId、approved-only MediaRegistry 与地址解析层。
 *
 * 页面只需要持有 assetId；清单决定媒体键与授权状态，MediaService 决定远端、
 * 版本、本地兜底和最终占位。这里不访问 wx、Storage 或网络，便于完整单测。
 */
const media_registry_1 = require("./media-registry");
const media_service_1 = require("../services/media-service");
function resolveRegistryAsset(manifests, assetId, options = {}) {
    const asset = (0, media_registry_1.getMediaById)(manifests, assetId);
    return {
        assetId,
        asset,
        ...(0, media_service_1.resolveAssetSource)(asset === null || asset === void 0 ? void 0 : asset.mediaKey, options),
    };
}
