"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTerrainRouteGeometry = buildTerrainRouteGeometry;
exports.buildTerrainDynamicState = buildTerrainDynamicState;
exports.buildTerrainOverlay = buildTerrainOverlay;
exports.projectTerrainPoint = projectTerrainPoint;
const route_index_1 = require("./route-index");
const CANVAS_W = 9;
const CANVAS_H = 16;
/** 屏幕纵向安全边距（%）：峰顶靠上（TOP），大本营留在底部面板上缘之上（BOTTOM） */
const SUMMIT_TOP_Y = 14;
// 底部信息面板从约 60% 开始；留出 4% 安全边距，起点/当前点不贴面板边缘。
const BASE_BOTTOM_Y = 56;
/** 横向偏差摆幅（屏宽 %）：dev 归一后 ±调幅 */
const DEV_AMP = 34;
function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}
/**
 * 点到「起点→终点」直线的带符号横向偏差（真实米）。
 * 正 = 直线左（面向南峰方向），负 = 右。仅用于还原行进蛇形，不进路线数据。
 */
function lateralDeviation(px, py, startX, startY, dX, dY) {
    const len = Math.hypot(dX, dY);
    if (len < 1e-6)
        return 0;
    return ((px - startX) * -dY + (py - startY) * dX) / len;
}
function computeFrame(routeIndex) {
    const n = routeIndex.pointCount;
    const startX = routeIndex.xs[0];
    const startY = routeIndex.ys[0];
    const dX = routeIndex.xs[n - 1] - startX;
    const dY = routeIndex.ys[n - 1] - startY;
    let demMin = Infinity;
    let demMax = -Infinity;
    let devMin = Infinity;
    let devMax = -Infinity;
    for (let i = 0; i < n; i++) {
        const dem = routeIndex.demM[i];
        if (dem < demMin)
            demMin = dem;
        if (dem > demMax)
            demMax = dem;
        const dev = lateralDeviation(routeIndex.xs[i], routeIndex.ys[i], startX, startY, dX, dY);
        if (dev < devMin)
            devMin = dev;
        if (dev > devMax)
            devMax = dev;
    }
    if (!(demMax > demMin))
        demMax = demMin + 1;
    if (!(devMax > devMin))
        devMax = devMin + 1;
    return { startX, startY, dX, dY, demMin, demMax, devMin, devMax };
}
/** 单点投影（真实 x/y/demM → 屏幕 %）。
 *  - X：横向偏差（真实米）归一 0..1 → 屏幕宽 ±DEV_AMP
 *  - Y：DEM（真实米）归一 0..1 → 屏幕高（峰顶在上）
 */
function projectPointInto(frame, point) {
    const dev = lateralDeviation(point.x, point.y, frame.startX, frame.startY, frame.dX, frame.dY);
    const tDev = clamp01((dev - frame.devMin) / (frame.devMax - frame.devMin));
    const tDem = clamp01((point.demM - frame.demMin) / (frame.demMax - frame.demMin));
    return {
        x: 50 + (tDev * 2 - 1) * DEV_AMP,
        y: BASE_BOTTOM_Y - tDem * (BASE_BOTTOM_Y - SUMMIT_TOP_Y),
    };
}
function downsamplePts(routeIndex, maxPoints) {
    const n = routeIndex.pointCount;
    const out = [];
    if (n <= maxPoints) {
        for (let i = 0; i < n; i++) {
            out.push({
                x: routeIndex.xs[i],
                y: routeIndex.ys[i],
                demM: routeIndex.demM[i],
                progress: routeIndex.cumulative[i] / routeIndex.totalDistanceM,
            });
        }
        return out;
    }
    const stride = (n - 1) / Math.max(1, maxPoints - 1);
    for (let i = 0; i < n - 1; i += stride) {
        const k = Math.min(Math.floor(i + 1e-6), n - 2);
        out.push({
            x: routeIndex.xs[k],
            y: routeIndex.ys[k],
            demM: routeIndex.demM[k],
            progress: routeIndex.cumulative[k] / routeIndex.totalDistanceM,
        });
    }
    out.push({
        x: routeIndex.xs[n - 1],
        y: routeIndex.ys[n - 1],
        demM: routeIndex.demM[n - 1],
        progress: 1,
    });
    return out;
}
function buildSegs(points) {
    const segs = [];
    for (let i = 0; i < points.length - 1; i++) {
        const ax = points[i].x;
        const ay = points[i].y;
        const bx = points[i + 1].x;
        const by = points[i + 1].y;
        const dx = bx - ax;
        const dy = by - ay;
        const len = Math.hypot(dx, dy);
        if (len < 0.02)
            continue;
        segs.push({
            x: (ax + bx) / 2,
            y: (ay + by) / 2,
            lengthX: len,
            rotateDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
            startX: ax,
            startY: ay,
            endX: bx,
            endY: by,
            fromProgress: points[i].progress,
            toProgress: points[i + 1].progress,
        });
    }
    return segs;
}
function buildCompletedSegs(segments, progress) {
    const completed = [];
    for (const segment of segments) {
        if (progress <= segment.fromProgress)
            continue;
        const ratio = progress >= segment.toProgress
            ? 1
            : (progress - segment.fromProgress) /
                Math.max(1e-6, segment.toProgress - segment.fromProgress);
        const endX = segment.startX + (segment.endX - segment.startX) * clamp01(ratio);
        const endY = segment.startY + (segment.endY - segment.startY) * clamp01(ratio);
        const dx = endX - segment.startX;
        const dy = endY - segment.startY;
        const length = Math.hypot(dx, dy);
        if (length < 0.02)
            continue;
        completed.push({
            ...segment,
            x: (segment.startX + endX) / 2,
            y: (segment.startY + endY) / 2,
            lengthX: length,
            rotateDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
            endX,
            endY,
            toProgress: Math.min(progress, segment.toProgress),
        });
    }
    return completed;
}
/**
 * 构建 TERRAIN 路线 overlay。
 *
 * @param routeIndex RouteIndex（真实 geometry；里程碑 / dem 只读）
 * @param progress DRIVE progress（0..1）
 * @param opts 可选：{ maxPoints } 折线稀疏化上限（默认 84 点 → ~200 段内）
 */
function buildTerrainRouteGeometry(routeIndex, opts) {
    var _a;
    const maxPoints = (_a = opts === null || opts === void 0 ? void 0 : opts.maxPoints) !== null && _a !== void 0 ? _a : 84;
    const frame = computeFrame(routeIndex);
    const project = (p) => projectPointInto(frame, p);
    // 折线（全程真实点 → 屏幕）
    const rawPts = downsamplePts(routeIndex, maxPoints);
    const screenPts = rawPts.map((p) => ({ ...project(p), progress: p.progress }));
    const lastPt = screenPts[screenPts.length - 1];
    // 途经标点（营地 / 峰顶 / 起点）：全部由真实里程碑投影，绝不读像素数据
    const origins = routeIndex.milestones.map((m) => {
        const p = project({ x: m.x, y: m.y, demM: m.demM > 0 ? m.demM : m.refM });
        return {
            key: m.id,
            x: p.x,
            y: p.y,
            progress: routeIndex.totalDistanceM > 0 ? m.distanceM / routeIndex.totalDistanceM : 0,
            label: m.name,
            elevationM: Math.round(m.refM),
            distanceM: m.distanceM,
        };
    });
    return {
        widthUnits: CANVAS_W,
        heightUnits: CANVAS_H,
        segments: buildSegs(screenPts),
        origins,
        summit: { x: lastPt.x, y: lastPt.y },
        projection: frame,
        schematic: true,
    };
}
/**
 * 从已缓存的静态 geometry 派生动态状态。
 * 这里刻意不调用 downsamplePts/buildSegs：marker cadence 不应重建重型路线 geometry。
 */
function buildTerrainDynamicState(routeIndex, progress, geometry) {
    var _a;
    const frame = (_a = geometry === null || geometry === void 0 ? void 0 : geometry.projection) !== null && _a !== void 0 ? _a : computeFrame(routeIndex);
    const project = (p) => projectPointInto(frame, p);
    const at = (0, route_index_1.routeSampleAtProgress)(routeIndex, progress);
    const marker = project({ x: at.x, y: at.y, demM: at.demM });
    const completedProgress = clamp01(progress);
    return {
        marker,
        progress: completedProgress,
        completedProgress,
        completedSegments: geometry
            ? buildCompletedSegs(geometry.segments, completedProgress)
            : [],
    };
}
/** 组合入口，保留旧 API 给现有纯逻辑测试与工具使用。 */
function buildTerrainOverlay(routeIndex, progress, opts) {
    const geometry = buildTerrainRouteGeometry(routeIndex, opts);
    return {
        ...geometry,
        ...buildTerrainDynamicState(routeIndex, progress, geometry),
    };
}
/**
 * 便捷入口：单点投影复算（引擎 / 页面 / 测试三方复用；诚实映射唯一来源）。
 * 与 buildTerrainOverlay 内部使用的映射完全一致。
 */
function projectTerrainPoint(routeIndex, point) {
    return projectPointInto(computeFrame(routeIndex), point);
}
