"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isApprovedMedia = isApprovedMedia;
exports.approvedMediaAssets = approvedMediaAssets;
exports.getMediaById = getMediaById;
exports.getMediaForEntity = getMediaForEntity;
exports.getHeroMedia = getHeroMedia;
exports.getGalleryMedia = getGalleryMedia;
/** 正式 UI 只消费 approved 资产（与 validateMediaManifest 双层把关） */
function isApprovedMedia(asset) {
    return asset.reviewStatus === "approved";
}
/** 跨清单收集全部 approved 资产（重复 id 首个声明者胜出） */
function approvedMediaAssets(manifests) {
    var _a;
    const seen = new Set();
    const out = [];
    for (const manifest of manifests) {
        for (const asset of (_a = manifest.assets) !== null && _a !== void 0 ? _a : []) {
            if (!isApprovedMedia(asset) || seen.has(asset.id))
                continue;
            seen.add(asset.id);
            out.push(asset);
        }
    }
    return out;
}
/** 按 id 查询（approved-only；非 approved / 不存在返回 undefined） */
function getMediaById(manifests, id) {
    return approvedMediaAssets(manifests).find((a) => a.id === id);
}
/** 查询某实体的全部 approved 媒体（不同实体互不串数据） */
function getMediaForEntity(manifests, entityType, entityId) {
    return approvedMediaAssets(manifests).filter((a) => a.entityType === entityType && a.entityId === entityId);
}
/** 实体主图：purpose==="hero" 首张优先，否则声明顺序首张 */
function getHeroMedia(manifests, entityType, entityId) {
    var _a;
    const list = getMediaForEntity(manifests, entityType, entityId);
    return (_a = list.find((a) => a.purpose === "hero")) !== null && _a !== void 0 ? _a : list[0];
}
/** 实体图册：除 hero 外的全部媒体（声明顺序；无 hero 时返回全部） */
function getGalleryMedia(manifests, entityType, entityId) {
    var _a;
    const list = getMediaForEntity(manifests, entityType, entityId);
    const hero = (_a = list.find((a) => a.purpose === "hero")) !== null && _a !== void 0 ? _a : list[0];
    return hero ? list.filter((a) => a.id !== hero.id) : list;
}
