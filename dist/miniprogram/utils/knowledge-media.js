"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KNOWLEDGE_ATLAS_MEDIA_IDS = void 0;
exports.knowledgeAtlasImage = knowledgeAtlasImage;
exports.featuredKnowledgeImage = featuredKnowledgeImage;
exports.knowledgeImages = knowledgeImages;
exports.knowledgeImage = knowledgeImage;
/**
 * 知识配图解析（知识列表页与知识详情页共用）。
 *
 * 2026-09-12 用户反馈修正：
 *   - 列表页 41 条知识曾把 29 条无媒体条目全部回退到同一张珠峰主视觉 → 改为逐条语义兜底；
 *   - 详情页原先完全没有配图 → 复用同一套解析，并支持点击看大图。
 *
 * 优先级：approved-only（MediaRegistry）→ 实景照片优先 → 语义兜底 → 无图返回空。
 */
const world_manifests_1 = require("../data/media/world-manifests");
const asset_resolver_1 = require("../engine/asset-resolver");
const media_registry_1 = require("../engine/media-registry");
const media_service_1 = require("../services/media-service");
/**
 * 无 runtime 媒体时的语义兜底图：按知识主题关联到对应世界的真实照片。
 * 映射不到的条目返回空数组，由页面显示该条目的分类 emoji 占位，不拿无关照片冒充。
 * 键为逻辑资源键（相对 assets/），地址解析统一走 resolveMediaSrc。
 */
const KNOWLEDGE_FALLBACK_IMAGE = {
    k02: "expeditions/everest/live/live-a-kala-patthar.jpg", // 雪线 · 珠峰南坡实景
    k04: "content/fuji/f-forest-lower.jpg", // 垂直分带 · 富士山林带
    k06: "content/colorado/c2-devils-corkscrew.jpg", // 峡谷下切 · 大峡谷河谷
    k07: "expeditions/everest/live/live-a-kala-patthar.jpg", // 死亡区 · 高海拔实景
    k08: "content/everest/ev-icefall-ladders.jpg", // 冰川流动 · 昆布冰瀑
    k15: "content/everest/k-subduction.jpg", // 大陆漂移 · 俯冲对照
    k25: "content/everest/k-subduction.jpg", // 热点 · 俯冲对照
    k27: "content/fuji/f3-goraiko.jpg", // 火山湖 · 富士山火口
    k29: "content/fuji/f4-hoei-rim.jpg", // 火山灰 · 宝永火口
};
/** Knowledge Atlas thumbnails follow the reference's real-landform photography. */
exports.KNOWLEDGE_ATLAS_MEDIA_IDS = {
    atmosphere: "f1-yamanaka-view",
    hydrology: "c-vishnu-river",
    mountain: "p-everest-kala-patthar",
    glacier: "ev-icefall-ladders",
    geology: "c2-devils-corkscrew",
    volcano: "f4-hoei-rim",
    ecology: "k-condor",
    ocean: "m8-mariana-deep-photo",
};
const FEATURED_KNOWLEDGE_MEDIA_IDS = {
    k03: "p-everest-kala-patthar",
    k08: "ev-icefall-ladders",
    k11: "m8-mariana-deep-photo",
};
function approvedPhotograph(mediaId) {
    if (!mediaId)
        return "";
    const asset = (0, media_registry_1.getMediaById)(world_manifests_1.RUNTIME_MANIFESTS, mediaId);
    if (!asset || asset.kind !== "photograph")
        return "";
    return (0, asset_resolver_1.resolveRegistryAsset)(world_manifests_1.RUNTIME_MANIFESTS, asset.id).src;
}
function knowledgeAtlasImage(nodeId) {
    return approvedPhotograph(exports.KNOWLEDGE_ATLAS_MEDIA_IDS[nodeId]);
}
/** Featured Atlas cards use scene photography while the detail page keeps its support media gallery. */
function featuredKnowledgeImage(item) {
    return approvedPhotograph(FEATURED_KNOWLEDGE_MEDIA_IDS[item.id]) || knowledgeImage(item);
}
/**
 * 该知识可展示的全部图片。
 *
 * 同一知识有多张已核验媒体时，实景照片排前（如 k11 深潜历史优先展示的里雅斯特号
 * 历史照片，而不是测深图），其余按清单声明顺序跟随——详情页可左右滑动看全部。
 */
function knowledgeImages(item) {
    const media = (0, media_registry_1.getMediaForEntity)(world_manifests_1.RUNTIME_MANIFESTS, "knowledge", item.id);
    if (media.length) {
        const photos = media.filter((a) => a.kind === "photograph");
        const rest = media.filter((a) => a.kind !== "photograph");
        return [...photos, ...rest].map((asset) => (0, asset_resolver_1.resolveRegistryAsset)(world_manifests_1.RUNTIME_MANIFESTS, asset.id).src);
    }
    const fallback = KNOWLEDGE_FALLBACK_IMAGE[item.id];
    return fallback ? [(0, media_service_1.resolveMediaSrc)(fallback)] : [];
}
/** 列表卡片主图（首张；无图返回空串，页面用 emoji 占位）。 */
function knowledgeImage(item) {
    var _a;
    return (_a = knowledgeImages(item)[0]) !== null && _a !== void 0 ? _a : "";
}
