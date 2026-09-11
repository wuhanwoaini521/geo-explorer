"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ROUTE_STROKE = exports.DEFAULT_ROUTE_SEGMENTS = void 0;
exports.projectCoverPoint = projectCoverPoint;
exports.splinePointAtProgress = splinePointAtProgress;
exports.buildRoutePathGeometry = buildRoutePathGeometry;
exports.pointOnPath = pointOnPath;
exports.segmentsCovered = segmentsCovered;
exports.spineMissesMilestones = spineMissesMilestones;
const format_1 = require("../utils/format");
/** 默认分段数：约 72 段足以让折线在视觉上连续（每段 ≈1.4% 路程）。 */
exports.DEFAULT_ROUTE_SEGMENTS = 72;
exports.DEFAULT_ROUTE_STROKE = {
    widthNear: 11,
    widthFar: 4,
    opacityNear: 0.94,
    opacityFar: 0.58,
};
function clamp01(v) {
    return (0, format_1.clamp)(v, 0, 1);
}
function round2(v) {
    return Math.round(v * 100) / 100;
}
/* ------------------------------------------------------------------ */
/* 1 · aspectFill（cover）投影                                          */
/* ------------------------------------------------------------------ */
/**
 * 图像归一化坐标 → 容器归一化坐标（object-fit: cover 语义）。
 *
 * cover：等比缩放至刚好覆盖容器，超出部分被裁掉；object-position 决定裁剪窗口
 * 在图像内的位置（p% 表示图像 p 处与容器 p 处对齐）。竖屏手机上图像通常比容器
 * 更宽 → 只发生水平裁剪；横屏/平板则可能发生垂直裁剪。两者都必须正确处理，
 * 否则同一条路线在不同机型上会横向或纵向漂移。
 */
function projectCoverPoint(point, frame) {
    var _a, _b;
    const imageAspect = frame.imageAspect > 0 ? frame.imageAspect : 1;
    const containerAspect = frame.containerAspect > 0 ? frame.containerAspect : imageAspect;
    const focusX = clamp01((_a = frame.focusX) !== null && _a !== void 0 ? _a : 0.5);
    const focusY = clamp01((_b = frame.focusY) !== null && _b !== void 0 ? _b : 0.5);
    const ratio = imageAspect / containerAspect;
    // 图像渲染后相对容器的尺寸（1 = 与容器等宽/等高）
    const renderedWidth = ratio > 1 ? ratio : 1;
    const renderedHeight = ratio > 1 ? 1 : 1 / ratio;
    const offsetX = -(renderedWidth - 1) * focusX;
    const offsetY = -(renderedHeight - 1) * focusY;
    return {
        x: point.x * renderedWidth + offsetX,
        y: point.y * renderedHeight + offsetY,
    };
}
/* ------------------------------------------------------------------ */
/* 2 · 山体路径（Catmull-Rom，按 progress 均匀重采样）                    */
/* ------------------------------------------------------------------ */
function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    const axis = (a, b, c, d) => 0.5 *
        (2 * b +
            (-a + c) * t +
            (2 * a - 5 * b + 4 * c - d) * t2 +
            (-a + 3 * b - 3 * c + d) * t3);
    return { x: axis(p0.x, p1.x, p2.x, p3.x), y: axis(p0.y, p1.y, p2.y, p3.y) };
}
/** 在图像归一化坐标里，按 progress 在控制点之间求路径点（Catmull-Rom 穿过控制点）。 */
function splinePointAtProgress(spine, progress) {
    var _a, _b;
    const n = spine.length;
    if (n === 0)
        return { x: 0.5, y: 0.5 };
    if (n === 1)
        return { x: spine[0].x, y: spine[0].y };
    const p = clamp01(progress);
    if (p <= spine[0].progress)
        return { x: spine[0].x, y: spine[0].y };
    if (p >= spine[n - 1].progress) {
        return { x: spine[n - 1].x, y: spine[n - 1].y };
    }
    let i = 0;
    while (i < n - 2 && spine[i + 1].progress < p)
        i += 1;
    const a = spine[i];
    const b = spine[i + 1];
    const span = b.progress - a.progress;
    const local = span > 1e-9 ? (p - a.progress) / span : 0;
    const p0 = (_a = spine[i - 1]) !== null && _a !== void 0 ? _a : a;
    const p3 = (_b = spine[i + 2]) !== null && _b !== void 0 ? _b : b;
    return catmullRom(p0, a, b, p3, (0, format_1.clamp)(local, 0, 1));
}
/** 段样式：旋转角与长度都在「容器宽度 %」这一统一尺度里计算，避免纵横比造成断口。 */
function segmentStyle(a, b, containerAspect, stroke, nearness) {
    const dx = b.x - a.x;
    const dy = (b.y - a.y) / (containerAspect > 0 ? containerAspect : 1);
    const length = Math.hypot(dx, dy);
    const width = round2(stroke.widthFar + (stroke.widthNear - stroke.widthFar) * nearness);
    const opacity = round2(stroke.opacityFar + (stroke.opacityNear - stroke.opacityFar) * nearness);
    const rotate = round2((Math.atan2(dy, dx) * 180) / Math.PI);
    const style = `left:${round2((a.x + b.x) / 2)}%;top:${round2((a.y + b.y) / 2)}%;` +
        `width:${round2(length)}%;height:${width}rpx;` +
        `margin:${-width / 2}rpx 0 0 ${-width / 2}rpx;` +
        `transform:rotate(${rotate}deg);opacity:${opacity};`;
    return { style, length };
}
/**
 * 构建山体路径几何。
 *
 * @param spine            图像归一化控制点（progress 严格升序；必须覆盖全部里程碑进度）
 * @param cover            承载路线的背景资产投影参数
 * @param containerAspect  容器宽/高（viewport）
 * @param segmentCount     分段数（默认 72）
 * @param stroke           线宽/透明度透视规格
 */
function buildRoutePathGeometry(spine, cover, containerAspect, segmentCount = exports.DEFAULT_ROUTE_SEGMENTS, stroke = exports.DEFAULT_ROUTE_STROKE) {
    const aspect = containerAspect > 0 ? containerAspect : cover.imageAspect;
    const count = Math.max(2, Math.round(segmentCount));
    const samples = [];
    for (let k = 0; k <= count; k += 1) {
        const progress = k / count;
        const imagePoint = splinePointAtProgress(spine, progress);
        const screenPoint = projectCoverPoint(imagePoint, {
            ...cover,
            containerAspect: aspect,
        });
        samples.push({
            progress,
            x: round2(screenPoint.x * 100),
            y: round2(screenPoint.y * 100),
        });
    }
    const segments = [];
    for (let k = 0; k < count; k += 1) {
        const a = samples[k];
        const b = samples[k + 1];
        const nearness = 1 - (a.progress + b.progress) / 2;
        const { style, length } = segmentStyle(a, b, aspect, stroke, nearness);
        // 退化段（重采样后两点几乎重合）不渲染，但保留 progress 区间语义
        if (length < 0.02)
            continue;
        segments.push({
            id: `seg-${k}`,
            progress: a.progress,
            endProgress: b.progress,
            active: false,
            style,
        });
    }
    return { segmentCount: count, containerAspect: aspect, samples, segments };
}
/* ------------------------------------------------------------------ */
/* 3 · 统一投影：路线 / waypoint / marker 共用同一函数                    */
/* ------------------------------------------------------------------ */
/**
 * 路径上任意 progress 处的容器归一化坐标（%）。
 * 采样点按 progress 均匀分布，因此可直接索引，无需二分。
 */
function pointOnPath(geometry, progress) {
    const samples = geometry.samples;
    const n = samples.length - 1;
    if (n <= 0)
        return { x: 50, y: 50 };
    const u = clamp01(progress) * n;
    const i = Math.min(n - 1, Math.floor(u));
    const t = u - i;
    const a = samples[i];
    const b = samples[i + 1];
    return { x: round2(a.x + (b.x - a.x) * t), y: round2(a.y + (b.y - a.y) * t) };
}
/**
 * 已走路线（含当前段的局部裁剪），供渲染层直接覆盖在基础折线上。
 * 最后一段（marker 所在段）标记 active，用于极轻微的流动感。
 */
function segmentsCovered(geometry, progress, stroke = exports.DEFAULT_ROUTE_STROKE) {
    const p = clamp01(progress);
    const out = [];
    for (const segment of geometry.segments) {
        if (segment.progress >= p)
            break;
        if (segment.endProgress <= p) {
            out.push({ ...segment, active: false });
            continue;
        }
        // 当前段：只画到 marker，位置由同一批采样点插值
        const a = pointOnPath(geometry, segment.progress);
        const b = pointOnPath(geometry, p);
        const nearness = 1 - (segment.progress + p) / 2;
        const { style, length } = segmentStyle(a, b, geometry.containerAspect, stroke, nearness);
        if (length < 0.02)
            continue;
        out.push({
            id: segment.id,
            progress: segment.progress,
            endProgress: p,
            active: true,
            style,
        });
    }
    return out;
}
/**
 * 里程碑（waypoint）吸附检查：真实路线里程碑的 progress 必须落在山体控制点上，
 * 否则「先定路径、再吸附 waypoint」的约束被破坏。测试与 dev 工具使用。
 */
function spineMissesMilestones(spine, milestoneProgress, epsilon = 1e-6) {
    const known = spine.map((p) => p.progress);
    return milestoneProgress.filter((progress) => !known.some((v) => Math.abs(v - progress) <= epsilon));
}
