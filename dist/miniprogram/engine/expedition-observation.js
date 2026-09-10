"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PORTRAIT_CANVAS_WIDTH_HEIGHT = void 0;
exports.observationLabel = observationLabel;
exports.observationStateLabel = observationStateLabel;
exports.formatObservationElevation = formatObservationElevation;
exports.buildObservationPoints = buildObservationPoints;
exports.progressForReferenceElevation = progressForReferenceElevation;
exports.projectRouteMilestones = projectRouteMilestones;
exports.routeSegment = routeSegment;
exports.findMilestone = findMilestone;
const expedition_driver_1 = require("./expedition-driver");
const format_1 = require("../utils/format");
/** 竖屏地图中，1% 高度换算成相对 1% 宽度的比例。 */
exports.PORTRAIT_CANVAS_WIDTH_HEIGHT = 0.48;
/** 观察名优先于营地代号，让产品表达“认识地貌”而不是“导航登山”。 */
function observationLabel(id, fallback = "地貌观察点") {
    var _a;
    const labels = {
        "base-camp": "冰川前缘",
        "khumbu-icefall": "冰瀑地形",
        "camp-i": "冰川谷地",
        "western-cwm-camp-ii": "雪原地貌",
        "lhotse-face-camp-iii": "陡峭冰壁",
        "south-col-camp-iv": "高山鞍部",
        "south-summit": "山脊地形",
        summit: "雪峰顶部",
    };
    return (_a = labels[id]) !== null && _a !== void 0 ? _a : fallback;
}
function observationStateLabel(state) {
    return state === "completed" ? "已观察" : state === "current" ? "当前观察" : "待观察";
}
function formatObservationElevation(value, maxElevation) {
    const safe = Math.min(Math.max(0, value), maxElevation);
    return Math.abs(safe - maxElevation) < 0.01
        ? (0, format_1.formatNumber)(maxElevation, 2)
        : (0, format_1.formatNumber)(safe, 0);
}
function buildObservationPoints(core, progress) {
    var _a, _b, _c;
    const drive = (0, expedition_driver_1.driveAtProgress)(core, progress);
    const currentId = (_b = (_a = drive.current) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : (_c = core.routeIndex.milestones[0]) === null || _c === void 0 ? void 0 : _c.id;
    return core.routeIndex.milestones.map((milestone) => {
        const state = milestone.id === currentId
            ? "current"
            : milestone.progress < drive.progress
                ? "completed"
                : "upcoming";
        return {
            id: milestone.id,
            name: milestone.name,
            label: observationLabel(milestone.id, milestone.name),
            kind: milestone.kind,
            elevationM: milestone.refM,
            elevationText: `${formatObservationElevation(milestone.refM, core.maxElevation)} m`,
            progress: milestone.progress,
            state,
            stateLabel: observationStateLabel(state),
        };
    });
}
/** 记录里的最高海拔只用于恢复观察位置，节点/环境仍由 driver 推导。 */
function progressForReferenceElevation(routeIndex, maxElevation, elevation) {
    if (elevation >= maxElevation - 0.01)
        return 1;
    const safe = Math.max(0, elevation);
    let best = 0;
    for (const milestone of routeIndex.milestones) {
        if (milestone.refM <= safe)
            best = milestone.progress;
        else
            break;
    }
    return (0, format_1.clamp)(best, 0, 1);
}
/**
 * 将同一条 canonical 折线的里程碑投影到地图视口。
 * 路线和节点必须消费这组点，避免“线”和“点”各算一遍后错位。
 */
function projectRouteMilestones(routeIndex, viewport = { left: 18, right: 82, top: 16, bottom: 59 }) {
    const xs = routeIndex.xs;
    const ys = routeIndex.ys;
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rangeX = Math.max(1, maxX - minX);
    const rangeY = Math.max(1, maxY - minY);
    const points = routeIndex.milestones.map((milestone) => ({
        id: milestone.id,
        x: viewport.left + ((milestone.x - minX) / rangeX) * (viewport.right - viewport.left),
        y: viewport.top + ((milestone.y - minY) / rangeY) * (viewport.bottom - viewport.top),
    }));
    return { points, bounds: { minX, maxX, minY, maxY } };
}
function routeSegment(a, b, widthHeight = exports.PORTRAIT_CANVAS_WIDTH_HEIGHT) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const screenDy = dy * widthHeight;
    return {
        left: a.x,
        top: a.y,
        width: Math.hypot(dx, screenDy),
        rotate: (Math.atan2(screenDy, dx) * 180) / Math.PI,
    };
}
function findMilestone(milestones, id) {
    var _a;
    return (_a = milestones.find((milestone) => milestone.id === id)) !== null && _a !== void 0 ? _a : null;
}
