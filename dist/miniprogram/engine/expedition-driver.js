"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEATH_ZONE_REF_M = void 0;
exports.driveAtProgress = driveAtProgress;
exports.driveAtDistance = driveAtDistance;
exports.formatRouteKm = formatRouteKm;
exports.formatDistanceM = formatDistanceM;
const format_1 = require("../utils/format");
const route_index_1 = require("./route-index");
const expedition_stages_1 = require("./expedition-stages");
/** 死亡区参考海拔阈值（公开登山口径：8000 m 以上为死亡区） */
exports.DEATH_ZONE_REF_M = 8000;
/** 取离当前里程最近的已“越过”里程碑（尚未开始返回第一个） */
function milestoneProgress(ms, distanceM) {
    if (!ms.length)
        return { current: null, prev: null, next: null };
    let current = ms[0];
    let prev = null;
    for (let i = 0; i < ms.length; i++) {
        if (ms[i].distanceM <= distanceM + 1e-6) {
            current = ms[i];
            prev = i > 0 ? ms[i - 1] : null;
        }
        else {
            break;
        }
    }
    const next = ms.find((m) => m.distanceM > distanceM + 1e-6) || null;
    return { current, prev, next };
}
/** 由「最小投入」在当前 progress（0-1 路线轴）处推导完整驾驶状态 */
function driveAtProgress(core, progress) {
    const p = (0, format_1.clamp)(progress, 0, 1);
    return driveFromSample(core, (0, route_index_1.routeSampleAtProgress)(core.routeIndex, p));
}
/** 与 里程 (m) 处推导：等价于 driveAtProgress(distance / total) */
function driveAtDistance(core, distanceM) {
    const p = (0, format_1.clamp)(distanceM / core.routeIndex.totalDistanceM, 0, 1);
    return driveAtProgress(core, p);
}
function driveFromSample(core, sample) {
    var _a, _b;
    const { routeIndex, stageMap } = core;
    const total = routeIndex.totalDistanceM;
    const distance = sample.distanceM;
    const atSummit = distance >= total - 1e-3;
    const wasDeath = sample.refM >= exports.DEATH_ZONE_REF_M;
    // UI 展示海拔：永不越过公开峰顶值 8,848.86（数据集 refM 在峰顶=8849，须统一）
    const refM = atSummit
        ? core.maxElevation
        : Math.min(sample.refM, core.maxElevation);
    const stageIndex = (0, expedition_stages_1.stageIndexAtDistance)(stageMap, (0, format_1.clamp)(distance, 0, total));
    const ms = routeIndex.milestones;
    const { current, prev, next } = milestoneProgress(ms, distance);
    const nextGapM = next ? next.distanceM - distance : 0;
    return {
        progress: sample.progress,
        distanceM: distance,
        remainingRouteM: Math.max(0, total - distance),
        remainingVerticalM: Math.max(0, core.maxElevation - sample.refM),
        refM,
        demM: sample.demM,
        modelM: sample.modelM,
        lat: sample.lat,
        lon: sample.lon,
        segment: sample.segment,
        gradeDeg: sample.gradeDeg,
        stageIndex,
        stage: (_a = stageMap[stageIndex]) !== null && _a !== void 0 ? _a : null,
        nextStage: (_b = stageMap[stageIndex + 1]) !== null && _b !== void 0 ? _b : null,
        deathZone: wasDeath && !atSummit,
        atSummit,
        current,
        prev,
        next,
        nextGapM,
        summitRefM: core.maxElevation,
    };
}
/* ------------------------------------------------------------------ */
/* 里程 / 剩余格式辅助（纯函数，展示层共用）                              */
/* ------------------------------------------------------------------ */
/** 米 → “12.9 km” 路线剩余里程展示 */
function formatRouteKm(meters) {
    return `${(Math.max(0, meters) / 1000).toFixed(1)} km`;
}
/** 米 → 千分位整数（“2,012 m”） */
function formatDistanceM(meters) {
    const v = Math.max(0, meters);
    return `${v.toLocaleString("en-US", { maximumFractionDigits: 0 })} m`;
}
