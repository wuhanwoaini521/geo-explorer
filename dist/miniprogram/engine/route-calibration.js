"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildCalibratedLiveOverlay = buildCalibratedLiveOverlay;
const OVERLAY_W = 9;
const OVERLAY_H = 16;
/** 等步重采样（保留首末），用于控制 segment 段数 */
function decimate(pts, maxPerRun) {
    if (pts.length <= maxPerRun)
        return pts;
    const out = [];
    const stride = pts.length / maxPerRun;
    for (let i = 0; i < pts.length; i += stride) {
        out.push(pts[Math.floor(i)]);
    }
    const last = pts[pts.length - 1];
    if (out[out.length - 1] !== last)
        out.push(last);
    return out;
}
/** 折线 → 独立小段几何（percent-based，兼容原 overlay） */
function buildPolySegs(pts) {
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
        const p0 = { ux: pts[i].u * OVERLAY_W, uy: pts[i].v * OVERLAY_H };
        const p1 = { ux: pts[i + 1].u * OVERLAY_W, uy: pts[i + 1].v * OVERLAY_H };
        const dx = p1.ux - p0.ux;
        const dy = p1.uy - p0.uy;
        const len = Math.hypot(dx, dy);
        if (len < 1e-4)
            continue;
        segs.push({
            x: (((p0.ux + p1.ux) / 2) / OVERLAY_W) * 100,
            y: (((p0.uy + p1.uy) / 2) / OVERLAY_H) * 100,
            lengthX: (len / OVERLAY_W) * 100,
            rotateDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
        });
    }
    return segs;
}
/** 按 overlayMode 切出可见折线子集（§18 B/C 语义） */
function sliceForMode(pts, overlayMode, localProgress) {
    if (overlayMode === "none")
        return [];
    if (overlayMode === "full-route")
        return pts;
    const t = Math.max(0, Math.min(1, localProgress));
    const lo = Math.max(0, t - 0.15);
    const hi = Math.min(1, t + (overlayMode === "nearby" ? 0.15 : 0.3));
    const iLo = Math.floor(lo * pts.length);
    const iHi = Math.min(pts.length - 1, Math.ceil(hi * pts.length));
    const out = pts.slice(Math.max(0, iLo), iHi + 1);
    return out.length >= 2 ? out : pts;
}
/**
 * 由校准数据构建 run-time overlay。
 *
 * @param report 校准报告（route=运行归一化坐标，0..1 + visibility）
 * @param overlayMode full-route / nearby / current-next / none
 * @param localProgress 0..1 场景内进度
 */
function buildCalibratedLiveOverlay(report, overlayMode, localProgress) {
    var _a;
    if (!report || !report.route || report.route.length < 2)
        return null;
    const raw = report.route.map((p) => ({
        u: p.u,
        v: p.v,
        visibility: p.visibility,
    }));
    if (raw.length < 2)
        return null;
    const window = sliceForMode(raw, overlayMode, localProgress);
    // 可见 run：按可见性过渡直接断开（OCCLUDED 即断）；同 run 内像素巨跳（越界）也断
    const runs = [];
    let cur = [];
    const flushRun = () => {
        if (cur.length >= 2)
            runs.push(cur);
        cur = [];
    };
    for (let i = 0; i < window.length; i++) {
        if (window[i].visibility !== "VISIBLE") {
            flushRun();
            continue;
        }
        cur.push(window[i]);
        if (i === window.length - 1)
            break;
        if (window[i + 1].visibility !== "VISIBLE") {
            flushRun();
        }
        else {
            const d = Math.hypot(window[i + 1].u - window[i].u, window[i + 1].v - window[i].v);
            if (d > 0.5)
                flushRun(); // 越出/深度断层（仍可见但相距极远）
        }
    }
    flushRun();
    const segments = [];
    for (const run of runs) {
        if (run.length >= 2)
            segments.push(...buildPolySegs(decimate(run, 10)));
    }
    // marker：仅沿可见 pts（非 VISIBLE 点跳过）按局部 progress 插值
    const visPoly = raw.filter((p) => p.visibility === "VISIBLE");
    const poly = sliceForMode(visPoly, overlayMode, localProgress);
    const usePoly = poly.length >= 2 ? poly : raw;
    let totalLen = 0;
    const cum = [0];
    for (let i = 1; i < usePoly.length; i++) {
        totalLen += Math.hypot(usePoly[i].u - usePoly[i - 1].u, usePoly[i].v - usePoly[i - 1].v);
        cum.push(totalLen);
    }
    const t = Math.min(1, Math.max(0, localProgress)) * totalLen;
    let ideal = 0;
    for (let i = 0; i < cum.length; i++) {
        if (cum[i] >= t) {
            ideal = i;
            break;
        }
    }
    ideal = Math.min(ideal, Math.max(0, usePoly.length - 1));
    let mx = usePoly[ideal].u;
    let my = usePoly[ideal].v;
    if (ideal > 0) {
        const segLen = cum[ideal] - cum[ideal - 1];
        if (segLen > 0) {
            const st = (t - cum[ideal - 1]) / segLen;
            mx = usePoly[ideal - 1].u + (usePoly[ideal].u - usePoly[ideal - 1].u) * st;
            my = usePoly[ideal - 1].v + (usePoly[ideal].v - usePoly[ideal - 1].v) * st;
        }
    }
    const origins = ((_a = report.waypoints) !== null && _a !== void 0 ? _a : []).map((wp) => ({
        key: wp.waypointId,
        x: wp.u * 100,
        y: wp.v * 100,
        label: wp.waypointId, // 页面按 id 本地化
    }));
    return {
        widthUnits: OVERLAY_W,
        heightUnits: OVERLAY_H,
        segments,
        origins,
        marker: { x: mx * (100 / OVERLAY_W), y: my * (100 / OVERLAY_H) },
        schematic: false, // 校准数据 → 非示意
    };
}
