"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildRouteIndex = buildRouteIndex;
exports.referenceElevationAt = referenceElevationAt;
exports.routeSampleAt = routeSampleAt;
exports.routeSampleAtProgress = routeSampleAtProgress;
exports.demElevationAt = demElevationAt;
exports.referenceAltitudeAt = referenceAltitudeAt;
exports.modelElevationAt = modelElevationAt;
/** 相邻控制点水平间距小于该值视为重合/退化 */
const MIN_SEGMENT_M = 0.001;
function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
}
function dist2d(ax, ay, bx, by) {
    return Math.hypot(bx - ax, by - ay);
}
/** 把点 (px, py) 投影到折线（由 xs/ys 定义）上，返回 {seg, t, distanceM, crossDistM} */
function projectOn(xs, ys, cum, px, py) {
    const n = xs.length;
    let bestSeg = -1;
    let bestT = 0;
    let bestDist = Infinity;
    for (let i = 0; i < n - 1; i++) {
        const dx = xs[i + 1] - xs[i];
        const dy = ys[i + 1] - ys[i];
        const l2 = dx * dx + dy * dy;
        let t = l2 > 0 ? ((px - xs[i]) * dx + (py - ys[i]) * dy) / l2 : 0;
        t = clamp(t, 0, 1);
        const cx = xs[i] + dx * t;
        const cy = ys[i] + dy * t;
        const d = Math.hypot(px - cx, py - cy);
        if (d < bestDist) {
            bestDist = d;
            bestSeg = i;
            bestT = t;
        }
    }
    const segLen = cum[bestSeg + 1] - cum[bestSeg];
    return { seg: bestSeg, t: bestT, distanceM: cum[bestSeg] + segLen * bestT, crossDistM: bestDist };
}
/**
 * 构建运行时路线索引。
 * 所有总量（totalDistanceM / node.distanceM / node.progress）全部由此函数
 * 从 289 点真实折线计算；**不接受任何手工距离**。
 */
function buildRouteIndex(raw) {
    var _a, _b;
    const src = raw.points;
    if (src.length < 2)
        throw new Error(`[route-index] 控制点不足：${src.length}`);
    // 坐标折叠（重合点只保留第一个）
    const xs = [];
    const ys = [];
    const zs = [];
    const lats = [];
    const lons = [];
    for (const p of src) {
        const last = xs.length - 1;
        if (last < 0 || dist2d(xs[last], ys[last], p.x, p.y) >= MIN_SEGMENT_M) {
            xs.push(p.x);
            ys.push(p.y);
            zs.push(p.z);
            lats.push((_a = p.lat) !== null && _a !== void 0 ? _a : 0);
            lons.push((_b = p.lon) !== null && _b !== void 0 ? _b : 0);
        }
    }
    const n = xs.length;
    if (n < 2)
        throw new Error("[route-index] 折线退化：不足两个有效点");
    // 累计距离（水平投影，米）+ 绝对 DEM
    const cumulative = new Array(n).fill(0);
    const demM = new Array(n).fill(0);
    let total3d = 0;
    let ascentM = 0;
    let descentM = 0;
    for (let i = 0; i < n; i++) {
        demM[i] = zs[i] + raw.terrain.baseM;
        if (i === 0)
            continue;
        const dl = dist2d(xs[i - 1], ys[i - 1], xs[i], ys[i]);
        cumulative[i] = cumulative[i - 1] + dl;
        total3d += Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1], zs[i] - zs[i - 1]);
        const dz = zs[i] - zs[i - 1];
        if (dz > 0)
            ascentM += dz;
        else
            descentM += -dz;
    }
    const total = cumulative[n - 1];
    if (!(total > MIN_SEGMENT_M))
        throw new Error(`[route-index] 总长为 0：${total}`);
    // 单调性硬保证（数据一致性；validateExpedition 再兜一层）
    for (let i = 1; i < n; i++) {
        if (cumulative[i] <= cumulative[i - 1]) {
            throw new Error(`[route-index] 累计距离非严格单调，段 ${i - 1}→${i}`);
        }
    }
    // 里程碑投影 → distanceM / progress（全部计算所得）
    const milestones = raw.milestones
        .map((m) => {
        const proj = projectOn(xs, ys, cumulative, m.x, m.y);
        return {
            id: m.id,
            name: m.name,
            kind: m.kind,
            lat: m.lat,
            lon: m.lon,
            refM: m.refM,
            demM: m.demM,
            x: m.x,
            y: m.y,
            distanceM: proj.distanceM,
            progress: proj.distanceM / total,
        };
    })
        .sort((a, b) => a.distanceM - b.distanceM);
    for (let i = 1; i < milestones.length; i++) {
        if (milestones[i].distanceM <= milestones[i - 1].distanceM) {
            throw new Error(`[route-index] 里程碑距离非单调：${milestones[i - 1].id}→${milestones[i].id}`);
        }
    }
    return {
        routeId: raw.id,
        name: raw.name,
        pointCount: n,
        segmentCount: n - 1,
        cumulative,
        demM,
        xs,
        ys,
        lats,
        lons,
        totalDistanceM: total,
        total3dDistanceM: total3d,
        ascentM,
        descentM,
        milestones,
        sourceLabel: raw.provenance,
    };
}
/* ------------------------------------------------------------------ */
/* 采样：给定距离/进度 → 三类海拔 + 坐标                                 */
/* ------------------------------------------------------------------ */
/** 沿折线定位段（二分），返回 seg（0..segments-1）、t（0..1） */
function locate(index, distanceM) {
    const d = clamp(distanceM, 0, index.totalDistanceM);
    let lo = 0;
    let hi = index.segmentCount - 1; // n-2
    while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (index.cumulative[mid] <= d)
            lo = mid;
        else
            hi = mid - 1;
    }
    const seg = lo;
    const span = index.cumulative[seg + 1] - index.cumulative[seg];
    const t = span > 0 ? (d - index.cumulative[seg]) / span : 0;
    return { seg, t };
}
/** 权威参考海拔插值：里程碑 refM 之间沿距离线性，端点外钳制 */
function referenceElevationAt(index, distanceM) {
    const ms = index.milestones;
    if (ms.length === 0)
        return NaN;
    if (distanceM <= ms[0].distanceM)
        return ms[0].refM;
    if (distanceM >= ms[ms.length - 1].distanceM)
        return ms[ms.length - 1].refM;
    let lo = 0;
    let hi = ms.length - 1;
    while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (ms[mid].distanceM <= distanceM)
            lo = mid;
        else
            hi = mid;
    }
    const a = ms[lo];
    const b = ms[hi];
    const span = b.distanceM - a.distanceM;
    const t = span > 0 ? (distanceM - a.distanceM) / span : 0;
    return a.refM + (b.refM - a.refM) * t;
}
/** 在给定距离处的完整采样（三类海拔一并返回） */
function routeSampleAt(index, distanceM) {
    const d = clamp(distanceM, 0, index.totalDistanceM);
    const { seg, t } = locate(index, d);
    const segLen = index.cumulative[seg + 1] - index.cumulative[seg];
    const demElev = index.demM[seg] + (index.demM[seg + 1] - index.demM[seg]) * t;
    const ref = referenceElevationAt(index, d);
    return {
        distanceM: d,
        progress: d / index.totalDistanceM,
        segment: seg,
        t,
        x: index.xs[seg] + (index.xs[seg + 1] - index.xs[seg]) * t,
        y: index.ys[seg] + (index.ys[seg + 1] - index.ys[seg]) * t,
        lat: index.lats[seg] + (index.lats[seg + 1] - index.lats[seg]) * t,
        lon: index.lons[seg] + (index.lons[seg + 1] - index.lons[seg]) * t,
        demM: demElev,
        refM: ref,
        modelM: ref, // elevationPolicy：模型海拔 = 参考海拔锚定
        gradeDeg: ((Math.atan2(index.demM[seg + 1] - index.demM[seg], segLen) * 180) / Math.PI),
    };
}
/** 按 progress（0..1）采样 */
function routeSampleAtProgress(index, progress) {
    return routeSampleAt(index, clamp(progress, 0, 1) * index.totalDistanceM);
}
/* ------------------------------------------------------------------ */
/** 显式访问三类海拔（Gate 2 约束 4：禁止隐式混用） */
/** DEM 海拔：地形几何 / 路线投影 */
function demElevationAt(index, distanceM) {
    return routeSampleAt(index, distanceM).demM;
}
/** 权威参考海拔：Camp/Summit 等 UI 展示 */
function referenceAltitudeAt(index, distanceM) {
    return routeSampleAt(index, distanceM).refM;
}
/** 模型海拔：pressure / O2 / temperature 环境模型 = reference-anchored */
function modelElevationAt(index, distanceM) {
    return routeSampleAt(index, distanceM).modelM;
}
