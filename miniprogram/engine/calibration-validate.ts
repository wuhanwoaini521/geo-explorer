/**
 * 校准状态派生（§16）与 CI 验收阈值（P43 Route accuracy tests）。
 *
 * 单一事实：任何 LIVE 场景**只允许**以下状态，且状态由硬阈值自动判定——
 * REPRESENTATIVE 一律 routeOverlay=false（禁止"看着像"的折线冒充路线）。
 */
import type { CalibrationReportV1, PhotoProjectionStatus } from "../types/calibration";

/** 硬阈值（对角线百分比，§17/§43 默认） */
export const THRESHOLD_DIAG_PCT = 0.5; // 校准集 median
export const THRESHOLD_VALIDATION_DIAG_PCT = 0.75; // hold-out validation 集合
export const THRESHOLD_IMAGE_DIAG_PX = 3000; // 参考：×0.5% ⇒ ≤15px @3000px 对角线

/** 由指标决定可宣称的状态（默认阈值；CI 不得放宽） */
export function statusFromReprojection(
  medianDiagPct: number | undefined,
  maxValidationDiagPct: number | undefined,
): PhotoProjectionStatus {
  if (
    medianDiagPct !== undefined &&
    medianDiagPct <= THRESHOLD_DIAG_PCT &&
    maxValidationDiagPct !== undefined &&
    maxValidationDiagPct <= THRESHOLD_VALIDATION_DIAG_PCT
  ) {
    return "VERIFIED";
  }
  if (medianDiagPct !== undefined && medianDiagPct <= THRESHOLD_DIAG_PCT) {
    return "CALIBRATED";
  }
  return "REPRESENTATIVE";
}

/** route overlay 是否允许绘制（只放行已求解的高精度 status） */
export function routeOverlayAllowed(status: PhotoProjectionStatus): boolean {
  return status === "VERIFIED" || status === "CALIBRATED";
}

/** 校验整份 CalibrationReport 的结构完整性（告警级，命中则入 limitations） */
export function lintCalibration(
  report: CalibrationReportV1,
): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  if (!report.assetId) issues.push("assetId 缺失");
  if (!report.media?.localAsset) issues.push("media.localAsset 缺失");
  if (report.status === "VERIFIED") {
    if (!report.camera) issues.push("VERIFIED 但缺少 camera");
    if (!report.metadata?.cameraLat || !report.metadata?.cameraLon)
      issues.push("VERIFIED 但缺少相机 GPS 元数据");
    if (!report.reprojection?.medianPx) issues.push("VERIFIED 但缺少重投影指标");
  }
  for (const lm of report.landmarks ?? []) {
    if (lm.role === "validation" && lm.reprojectionErrorPx === undefined)
      issues.push(`validation landmark ${lm.id} 缺少 reprojectionErrorPx`);
  }
  if ((report.route?.length ?? 0) < 2) issues.push("route 点不足（须 >=2）");
  return { valid: issues.length === 0, issues };
}

/** 对角线长度（px） */
export function imageDiagonalPx(report: CalibrationReportV1): number {
  const md = report.media?.dimensions ?? "";
  const m = md.match(/(\d+)\s*[x×]\s*(\d+)/);
  if (m) return Math.hypot(Number(m[1]), Number(m[2]));
  const w = report.metadata?.imageWidth ?? 0;
  const h = report.metadata?.imageHeight ?? 0;
  return Math.hypot(w, h);
}

/** 重投影指标 → 对角线百分比 */
export function diagPct(px: number, diagPx: number): number {
  if (!diagPx) return NaN;
  return (px / diagPx) * 100;
}