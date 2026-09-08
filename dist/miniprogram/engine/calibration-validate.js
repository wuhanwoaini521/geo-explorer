"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.THRESHOLD_IMAGE_DIAG_PX = exports.THRESHOLD_VALIDATION_DIAG_PCT = exports.THRESHOLD_DIAG_PCT = void 0;
exports.statusFromReprojection = statusFromReprojection;
exports.routeOverlayAllowed = routeOverlayAllowed;
exports.lintCalibration = lintCalibration;
exports.imageDiagonalPx = imageDiagonalPx;
exports.diagPct = diagPct;
/** 硬阈值（对角线百分比，§17/§43 默认） */
exports.THRESHOLD_DIAG_PCT = 0.5; // 校准集 median
exports.THRESHOLD_VALIDATION_DIAG_PCT = 0.75; // hold-out validation 集合
exports.THRESHOLD_IMAGE_DIAG_PX = 3000; // 参考：×0.5% ⇒ ≤15px @3000px 对角线
/** 由指标决定可宣称的状态（默认阈值；CI 不得放宽） */
function statusFromReprojection(medianDiagPct, maxValidationDiagPct) {
    if (medianDiagPct !== undefined &&
        medianDiagPct <= exports.THRESHOLD_DIAG_PCT &&
        maxValidationDiagPct !== undefined &&
        maxValidationDiagPct <= exports.THRESHOLD_VALIDATION_DIAG_PCT) {
        return "VERIFIED";
    }
    if (medianDiagPct !== undefined && medianDiagPct <= exports.THRESHOLD_DIAG_PCT) {
        return "CALIBRATED";
    }
    return "REPRESENTATIVE";
}
/** route overlay 是否允许绘制（只放行已求解的高精度 status） */
function routeOverlayAllowed(status) {
    return status === "VERIFIED" || status === "CALIBRATED";
}
/** 校验整份 CalibrationReport 的结构完整性（告警级，命中则入 limitations） */
function lintCalibration(report) {
    var _a, _b, _c, _d, _e, _f, _g;
    const issues = [];
    if (!report.assetId)
        issues.push("assetId 缺失");
    if (!((_a = report.media) === null || _a === void 0 ? void 0 : _a.localAsset))
        issues.push("media.localAsset 缺失");
    if (report.status === "VERIFIED") {
        if (!report.camera)
            issues.push("VERIFIED 但缺少 camera");
        if (!((_b = report.metadata) === null || _b === void 0 ? void 0 : _b.cameraLat) || !((_c = report.metadata) === null || _c === void 0 ? void 0 : _c.cameraLon))
            issues.push("VERIFIED 但缺少相机 GPS 元数据");
        if (!((_d = report.reprojection) === null || _d === void 0 ? void 0 : _d.medianPx))
            issues.push("VERIFIED 但缺少重投影指标");
    }
    for (const lm of (_e = report.landmarks) !== null && _e !== void 0 ? _e : []) {
        if (lm.role === "validation" && lm.reprojectionErrorPx === undefined)
            issues.push(`validation landmark ${lm.id} 缺少 reprojectionErrorPx`);
    }
    if (((_g = (_f = report.route) === null || _f === void 0 ? void 0 : _f.length) !== null && _g !== void 0 ? _g : 0) < 2)
        issues.push("route 点不足（须 >=2）");
    return { valid: issues.length === 0, issues };
}
/** 对角线长度（px） */
function imageDiagonalPx(report) {
    var _a, _b, _c, _d, _e, _f;
    const md = (_b = (_a = report.media) === null || _a === void 0 ? void 0 : _a.dimensions) !== null && _b !== void 0 ? _b : "";
    const m = md.match(/(\d+)\s*[x×]\s*(\d+)/);
    if (m)
        return Math.hypot(Number(m[1]), Number(m[2]));
    const w = (_d = (_c = report.metadata) === null || _c === void 0 ? void 0 : _c.imageWidth) !== null && _d !== void 0 ? _d : 0;
    const h = (_f = (_e = report.metadata) === null || _e === void 0 ? void 0 : _e.imageHeight) !== null && _f !== void 0 ? _f : 0;
    return Math.hypot(w, h);
}
/** 重投影指标 → 对角线百分比 */
function diagPct(px, diagPx) {
    if (!diagPx)
        return NaN;
    return (px / diagPx) * 100;
}
