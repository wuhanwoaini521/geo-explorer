"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyCameraFrame = emptyCameraFrame;
exports.cameraFrameAt = cameraFrameAt;
const format_1 = require("../utils/format");
/** 空相机（无配置/无段位）：返回不可见帧（segmentIndex=-1，UI 不渲染） */
function emptyCameraFrame() {
    return {
        progress: 0,
        segmentIndex: -1,
        segmentId: "",
        asset: "",
        segmentLocal: 0,
        zoom: 1,
        offsetX: 0.5,
        offsetY: 0.5,
        focus: null,
        blendNext: 1,
        nextSegmentId: null,
    };
}
function easeLocal(t) {
    const x = (0, format_1.clamp)(t, 0, 1);
    // smoothstep：段内插值更「推进」，避免回头跳变
    return x * x * (3 - 2 * x);
}
/**
 * 由相机配置 + progress 派生相机帧（默认值 `scale=1 / offsetX=0.5`）。
 * 段边界处的 zoom 取「前一段 scale → 本段 scale」的片段内平滑插值，
 * 保证跨段 zoom 连续（不跳变）。
 */
function cameraFrameAt(camera, progress) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
    if (!camera || !camera.segments || camera.segments.length === 0) {
        return emptyCameraFrame();
    }
    const segs = camera.segments;
    const p = (0, format_1.clamp)(progress, 0, 1);
    // 命中段落（顺序；端点归属于到达该边界的下一段，终点归属最后段）
    let si = 0;
    for (let i = 0; i < segs.length; i++) {
        si = i;
        if (p < segs[i].toProgress - 1e-6)
            break;
    }
    const seg = segs[si];
    const span = seg.toProgress - seg.fromProgress;
    const local = span > 0 ? (0, format_1.clamp)((p - seg.fromProgress) / span, 0, 1) : 1;
    const eased = easeLocal(local);
    // 段间插值所有镜头参数：边界处沿用上一段末值，避免镜头 pop。
    const prevSeg = si > 0 ? segs[si - 1] : undefined;
    const prevScale = (_b = (_a = prevSeg === null || prevSeg === void 0 ? void 0 : prevSeg.scale) !== null && _a !== void 0 ? _a : seg.scale) !== null && _b !== void 0 ? _b : 1;
    const curScale = (_c = seg.scale) !== null && _c !== void 0 ? _c : 1;
    const zoom = prevScale + (curScale - prevScale) * eased;
    const prevOffsetX = (_e = (_d = seg.fromOffsetX) !== null && _d !== void 0 ? _d : prevSeg === null || prevSeg === void 0 ? void 0 : prevSeg.offsetX) !== null && _e !== void 0 ? _e : 0.5;
    const curOffsetX = (_f = seg.offsetX) !== null && _f !== void 0 ? _f : 0.5;
    const prevOffsetY = (_h = (_g = seg.fromOffsetY) !== null && _g !== void 0 ? _g : prevSeg === null || prevSeg === void 0 ? void 0 : prevSeg.offsetY) !== null && _h !== void 0 ? _h : 0.5;
    const curOffsetY = (_j = seg.offsetY) !== null && _j !== void 0 ? _j : 0.5;
    const offsetX = prevOffsetX + (curOffsetX - prevOffsetX) * eased;
    const offsetY = prevOffsetY + (curOffsetY - prevOffsetY) * eased;
    const prevFocus = (_l = (_k = seg.fromFocus) !== null && _k !== void 0 ? _k : prevSeg === null || prevSeg === void 0 ? void 0 : prevSeg.focus) !== null && _l !== void 0 ? _l : { x: 0.5, y: 0.5 };
    const curFocus = (_m = seg.focus) !== null && _m !== void 0 ? _m : { x: 0.5, y: 0.5 };
    const focus = {
        x: prevFocus.x + (curFocus.x - prevFocus.x) * eased,
        y: prevFocus.y + (curFocus.y - prevFocus.y) * eased,
    };
    return {
        progress: p,
        segmentIndex: si,
        segmentId: seg.id,
        asset: seg.asset,
        segmentLocal: local,
        zoom: zoom < 1 ? 1 : zoom,
        offsetX,
        offsetY,
        focus,
        blendNext: local,
        nextSegmentId: si + 1 < segs.length ? segs[si + 1].id : null,
    };
}
