"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildExpeditionPlan = buildExpeditionPlan;
exports.plannerAt = plannerAt;
exports.emptyPlannerAt = emptyPlannerAt;
const route_index_1 = require("./route-index");
function clamp01(v) {
    return Math.min(1, Math.max(0, v));
}
/** 从 RouteIndex 派生计划里程碑（不含伪造；里程/进度/海拔全部算得） */
function toPlannerMilestone(ms) {
    return {
        id: ms.id,
        name: ms.name,
        kind: ms.kind,
        distanceM: ms.distanceM,
        progress: ms.progress,
        refM: ms.refM,
        isSummit: ms.kind === "summit",
    };
}
/** 由 stageMap 段派生 PlannerSegment（真实距离边界；参考海拔实时计算）
 *  里程碑归属：某里程碑距离恰好落在段边界时，归“先到达该距离的段”（避免跨段重复）。 */
function milestoneOwnerIndexes(core) {
    const routeIndex = core.routeIndex;
    const ret = routeIndex.milestones.map(() => -1);
    routeIndex.milestones.forEach((ml, mi) => {
        for (let i = 0; i < core.stageMap.length; i++) {
            if (core.stageMap[i].toDistanceM >= ml.distanceM - 1e-6) {
                ret[mi] = i;
                break;
            }
        }
    });
    return ret;
}
function deriveSegmentFromStage(core, index, owners) {
    var _a;
    const routeIndex = core.routeIndex;
    const stage = core.stageMap[index];
    const fromM = stage.fromDistanceM;
    const toM = stage.toDistanceM;
    // 归属于本段的里程碑（同一段内取距离最大者）
    const ownedMile = routeIndex.milestones
        .map((ml, mi) => ({ ml, mi }))
        .filter(({ mi }) => owners[mi] === index)
        .sort((a, b) => a.ml.distanceM - b.ml.distanceM)
        .map(({ ml }) => ml);
    const endMile = (_a = ownedMile[ownedMile.length - 1]) !== null && _a !== void 0 ? _a : undefined;
    return {
        index,
        id: stage.id,
        name: stage.name,
        emoji: stage.emoji,
        intro: stage.intro,
        fromDistanceM: fromM,
        toDistanceM: toM,
        spanM: toM - fromM,
        fromProgress: fromM / routeIndex.totalDistanceM,
        toProgress: toM / routeIndex.totalDistanceM,
        fromRefM: (0, route_index_1.referenceElevationAt)(routeIndex, fromM),
        toRefM: (0, route_index_1.referenceElevationAt)(routeIndex, toM),
        ascentM: (0, route_index_1.referenceElevationAt)(routeIndex, toM) -
            (0, route_index_1.referenceElevationAt)(routeIndex, fromM),
        endMilestone: endMile ? toPlannerMilestone(endMile) : null,
    };
}
/** 由 core 一次性派生完整计划（含里程碑）。名称缺省用 routeIndex.name。 */
function buildExpeditionPlan(core, name) {
    const routeIndex = core.routeIndex;
    const owners = milestoneOwnerIndexes(core);
    const segments = core.stageMap.map((_, i) => deriveSegmentFromStage(core, i, owners));
    return {
        name: name !== null && name !== void 0 ? name : routeIndex.name,
        totalDistanceM: routeIndex.totalDistanceM,
        startRefM: (0, route_index_1.referenceElevationAt)(routeIndex, 0),
        summitRefM: core.maxElevation,
        segments,
        milestones: routeIndex.milestones.map(toPlannerMilestone),
    };
}
/** 找到 distanceM 命中的段索引（顺序查找；空 core → 0） */
function plannerSegmentIndex(core, distanceM) {
    const stages = core.stageMap;
    if (!stages.length)
        return 0;
    for (let i = 0; i < stages.length; i++) {
        if (distanceM <= stages[i].toDistanceM + 1e-6)
            return i;
    }
    return stages.length - 1;
}
/**
 * 当前位置的三态呈现（distance 或 progress 均可；页面传入 drive.distanceM）。
 * 全部由 core 派生；不做任何业务写回。
 */
function plannerAt(core, distanceM) {
    const routeIndex = core.routeIndex;
    const total = routeIndex.totalDistanceM;
    const progress = clamp01(distanceM / total);
    const stages = core.stageMap;
    const segments = stages.map((stage, i) => {
        const from = stage.fromProgress;
        const to = stage.toProgress;
        let state = "upcoming";
        if (progress >= to - 1e-6)
            state = "done";
        else if (progress >= from - 1e-6)
            state = "current";
        return {
            index: i,
            id: stage.id,
            state,
            fromProgress: from,
            toProgress: to,
        };
    });
    const segmentIndex = plannerSegmentIndex(core, distanceM);
    const seg = stages[segmentIndex];
    const segmentLocal = seg
        ? clamp01((progress - seg.fromProgress) /
            Math.max(1e-6, seg.toProgress - seg.fromProgress))
        : 0;
    return { segmentIndex, segmentLocal, progress, segments };
}
/** 空 core（Mariana 等无 stageMap 场景）容错位置 */
function emptyPlannerAt() {
    return { segmentIndex: 0, segmentLocal: 0, progress: 0, segments: [] };
}
