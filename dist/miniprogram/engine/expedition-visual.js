"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LIVE_TRANSITION = exports.DEFAULT_LIVE_CROP = void 0;
exports.liveSceneForStageIndex = liveSceneForStageIndex;
exports.liveSceneProgressRange = liveSceneProgressRange;
exports.visualFallbackWarning = visualFallbackWarning;
exports.resolveExpeditionVisual = resolveExpeditionVisual;
/** 场景尚未绑定 crop 时的兜底焦点（§12：绝不随机裁剪珠峰主体） */
exports.DEFAULT_LIVE_CROP = {
    focusX: 0.5,
    focusY: 0.4,
    scale: 1,
};
/** 阶段切换过渡默认值（§14：crossfade + 极轻微 scale，禁止 Ken Burns） */
exports.DEFAULT_LIVE_TRANSITION = {
    crossfadeMs: 600,
    maxScale: 1.03,
};
/** stageMap.id → 索引（WeakMap 缓存，避免每帧重建 map） */
const STAGE_INDEX_CACHE = new WeakMap();
function stageIndexMap(stageMap) {
    let m = STAGE_INDEX_CACHE.get(stageMap);
    if (!m) {
        m = new Map(stageMap.map((s, i) => [s.id, i]));
        STAGE_INDEX_CACHE.set(stageMap, m);
    }
    return m;
}
/** 命中某 stageIndex 所属的 LIVE 场景（未命中返回 undefined → 兜底 TERRAIN） */
function liveSceneForStageIndex(config, stageMap, stageIndex) {
    const idx = stageIndexMap(stageMap);
    return config.liveScenes.find((sc) => sc.stageIds.some((sid) => idx.get(sid) === stageIndex));
}
/** 场景覆盖的 progress 区间 —— 完全由 stageMap 派生（不手写任何进度） */
function liveSceneProgressRange(scene, stageMap) {
    const idx = stageIndexMap(stageMap);
    const idxs = scene.stageIds
        .map((sid) => idx.get(sid))
        .filter((n) => n !== undefined);
    if (idxs.length === 0)
        return null;
    const lo = Math.min(...idxs);
    const hi = Math.max(...idxs);
    return {
        from: stageMap[lo].fromProgress,
        to: stageMap[hi].toProgress,
    };
}
/* ------------------------------------------------------------------ */
/* presentation 解析（含兜底）                                         */
/* ------------------------------------------------------------------ */
/** LIVE 不可用 → TERRAIN 时给出 console.warn 文案（§24） */
function visualFallbackWarning(reason, sceneId) {
    const sc = sceneId ? ` scene=${sceneId}` : "";
    return `[visual-mode] LIVE → TERRAIN 兜底：${reason}${sc}`;
}
/** 仅当 manifest 中该资产为 approved 且带 localPath 时视为「可正式渲染」影像（§11） */
function approvedLiveImage(deps, scene) {
    if (!scene.assetId)
        return null;
    const asset = deps.media.assets.find((a) => a.id === scene.assetId);
    if (!asset || !asset.localPath)
        return null;
    if (asset.reviewStatus !== "approved")
        return null;
    return { asset, image: asset.localPath };
}
/**
 * 解析当前视觉呈现。
 *
 * - 模式为 TERRAIN  → TERRAIN（reason: user-selected，非兜底）；
 * - 模式为 LIVE 但未命中场景 / 未绑资产 / 资产未批准 → 一律兜底 TERRAIN（§24）；
 * - 模式为 LIVE 且资产批准 → 返回可渲染 LIVE（image + crop + anchors + overlay + 过渡）。
 */
function resolveExpeditionVisual(deps, input) {
    var _a, _b, _c;
    const scene = liveSceneForStageIndex(deps.config, deps.stageMap, input.stageIndex);
    // 用户主动选择 TERRAIN —— 非兜底，直接返回
    if (input.mode !== "LIVE") {
        return {
            kind: "TERRAIN",
            reason: "user-selected",
            stageIndex: input.stageIndex,
        };
    }
    if (!scene) {
        return {
            kind: "TERRAIN",
            reason: "no-scene-match",
            stageIndex: input.stageIndex,
        };
    }
    const img = approvedLiveImage(deps, scene);
    if (!img) {
        return {
            kind: "TERRAIN",
            reason: scene.assetId ? "asset-not-approved" : "no-live-assets",
            stageIndex: input.stageIndex,
        };
    }
    return {
        kind: "LIVE",
        scene,
        stageIndex: input.stageIndex,
        image: img.image,
        crop: (_a = scene.crop) !== null && _a !== void 0 ? _a : exports.DEFAULT_LIVE_CROP,
        routeOverlay: scene.routeOverlay,
        anchors: (_b = scene.anchors) !== null && _b !== void 0 ? _b : null,
        transition: (_c = scene.transition) !== null && _c !== void 0 ? _c : { ...exports.DEFAULT_LIVE_TRANSITION },
    };
}
