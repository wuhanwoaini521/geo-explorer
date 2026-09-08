"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LIVE_TRANSITION = exports.DEFAULT_LIVE_CROP = void 0;
exports.presentationCropUi = presentationCropUi;
exports.liveSceneForStageIndex = liveSceneForStageIndex;
exports.liveSceneProgressRange = liveSceneProgressRange;
exports.visualFallbackWarning = visualFallbackWarning;
exports.resolveExpeditionVisual = resolveExpeditionVisual;
exports.buildLiveRouteOverlay = buildLiveRouteOverlay;
exports.resolveLiveOverlay = resolveLiveOverlay;
exports.liveSceneInfo = liveSceneInfo;
const index_1 = require("../data/calibrations/everest/index");
const route_calibration_1 = require("./route-calibration");
const calibration_validate_1 = require("./calibration-validate");
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
/**
 * LiveCrop → 渲染值：焦点 0-1 转 0-100、缩放下限 1。
 * 布局换算只在此完成，页面/样式层不得再随机裁剪或额外缩放。
 */
function presentationCropUi(crop) {
    var _a, _b, _c;
    const c = crop !== null && crop !== void 0 ? crop : exports.DEFAULT_LIVE_CROP;
    return {
        focusX: clamp01((_a = c.focusX) !== null && _a !== void 0 ? _a : 0.5) * 100,
        focusY: clamp01((_b = c.focusY) !== null && _b !== void 0 ? _b : 0.4) * 100,
        // 只支持 ≥1 的拉近；禁止缩回比原图小（§12 不给假信息）
        zoom: Math.max(1, (_c = c.scale) !== null && _c !== void 0 ? _c : 1),
    };
}
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
        // §31：生产路由的正式来源。REPRESENTATIVE/无校准 → 不画路线（§5/§41）
        calibration: (0, index_1.calibrationForScene)(scene.id),
        transition: (_c = scene.transition) !== null && _c !== void 0 ? _c : { ...exports.DEFAULT_LIVE_TRANSITION },
    };
}
const OVERLAY_W = 9;
const OVERLAY_H = 16;
function clamp01(v) {
    if (v <= 0)
        return 0;
    if (v >= 1)
        return 1;
    return v;
}
/** 点位（归一化 0-1）→ 画布逻辑坐标（9×16 单位） */
function toUnits(ax, ay) {
    return { ux: ax * OVERLAY_W, uy: ay * OVERLAY_H };
}
function ptToPct(ax, ay) {
    return { x: ax * 100, y: ay * 100 };
}
/** 由点序构造折线几何（按 anchors.points 的 key 顺序；少于 2 点返回 null） */
function buildLiveRouteOverlay(anchors, overlayMode, localProgress) {
    var _a;
    if (!anchors)
        return null;
    const keys = Object.keys((_a = anchors.points) !== null && _a !== void 0 ? _a : {});
    if (keys.length < 2)
        return null;
    const pts = keys.map((k) => ({
        key: k,
        a: anchors.points[k],
        u: toUnits(anchors.points[k].x, anchors.points[k].y),
    }));
    // nearby/current-next：只展示与当前最近的一段（MVP 简化为连续折线 + 点缀）
    const segments = [];
    let totalUnits = 0;
    const segUnits = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i].u;
        const p1 = pts[i + 1].u;
        const dx = p1.ux - p0.ux;
        const dy = p1.uy - p0.uy;
        const len = Math.hypot(dx, dy);
        segUnits.push(len);
        totalUnits += len;
        const mx = p0.ux + dx / 2;
        const my = p0.uy + dy / 2;
        const pct = ptToPct(mx / OVERLAY_W, my / OVERLAY_H);
        segments.push({
            x: pct.x,
            y: pct.y,
            // 长度占画布宽的比例（单位空间中 x 轴即宽）
            lengthX: (len / OVERLAY_W) * 100,
            rotateDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
        });
    }
    // 当前点：沿累计折线按局部 progress 插值（安全求即使用 0/1）
    let marker = { x: 0, y: 0 };
    if (totalUnits > 0) {
        const t = clamp01(localProgress) * totalUnits;
        let acc = 0;
        let mx = pts[0].u.ux;
        let my = pts[0].u.uy;
        for (let i = 0; i < segUnits.length; i++) {
            if (acc + segUnits[i] >= t) {
                const segT = segUnits[i] === 0 ? 0 : (t - acc) / segUnits[i];
                const p0 = pts[i].u;
                const p1 = pts[i + 1].u;
                mx = p0.ux + (p1.ux - p0.ux) * segT;
                my = p0.uy + (p1.uy - p0.uy) * segT;
                break;
            }
            acc += segUnits[i];
        }
        marker = { x: (mx / OVERLAY_W) * 100, y: (my / OVERLAY_H) * 100 };
    }
    const origins = pts.map((p, i) => {
        const { x, y } = ptToPct(p.a.x, p.a.y);
        let label = "";
        if (i === 0) {
            label = overlayMode === "full-route" ? "大本营" : "起点";
        }
        else if (i === pts.length - 1) {
            label =
                overlayMode === "full-route" ? "峰顶" : p.key === "summit" ? "峰顶" : "";
        }
        return { key: p.key, x, y, label };
    });
    return {
        widthUnits: OVERLAY_W,
        heightUnits: OVERLAY_H,
        segments,
        origins,
        marker,
        schematic: true, // 非 EXACT 一律示意；命中 EXACT 后可置 false
    };
}
/* ------------------------------------------------------------------ */
/* LIVE 正式 overlay（§5/§31/§41）：优先校准 route[]，否则不画            */
/* ------------------------------------------------------------------ */
/**
 * 页面级统一决策：LIVE 呈现 → 可渲染 overlay。
 *
 * 优先级/诚实性（§5/§31/§41）：
 *   1. 有校准且 status ∈ {VERIFIED, CALIBRATED} → buildCalibratedLiveOverlay
 *      （route[] 预投影，OCCLUDED 段不画，schematic=false）；
 *   2. REPRESENTATIVE / UNAVAILABLE / 缺校准 → null（不画任何“看着像”的路线），
 *      只保留真实照片 + HUD（§40）；
 *   3. 仅当外部数据仍显式携带 CURATED anchors（dev/review 预览）时兜底 buildLiveRouteOverlay ——
 *      生产数据已不携带 anchors（§41 删除假路线），此分支驻留仅供审核预览。
 */
function resolveLiveOverlay(presentation, localProgress) {
    const cal = presentation.calibration;
    if (cal) {
        // 正式路线 overlay 的唯一门禁（§5）：非 VERIFIED/CALIBRATED 一律不画
        if (!(0, calibration_validate_1.routeOverlayAllowed)(cal.status))
            return null;
        return (0, route_calibration_1.buildCalibratedLiveOverlay)(cal, presentation.routeOverlay, localProgress);
    }
    if (presentation.anchors) {
        return buildLiveRouteOverlay(presentation.anchors, presentation.routeOverlay, localProgress);
    }
    return null;
}
/** §40：实景 info 一行文案（不写“精准路线”除非 VIEWED/已实调）。 */
function liveSceneInfo(presentation) {
    const cal = presentation.calibration;
    if (cal) {
        const s = cal.info.status;
        if (s === "VERIFIED")
            return "真实珠峰影像 · 路线：已验证投影";
        if (s === "CALIBRATED")
            return "真实珠峰影像 · 路线：校准投影";
        if (s === "REPRESENTATIVE")
            return "真实珠峰影像 · 代表性视角";
        return "真实珠峰影像 · 视觉参考";
    }
    return presentation.image ? "真实珠峰影像" : null;
}
