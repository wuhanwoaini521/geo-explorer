/**
 * 阶段（Stage）映射（V2 数据层）—— 纯逻辑，可在 Node 单测。
 *
 * 阶段边界只有四种来源，全部转换为「真实路线距离」：
 *   - start / end            → 0 / 路线总长
 *   - milestone              → 该里程碑沿 289 点折线的累计距离（计算所得）
 *   - cross-ref-m            → 参考海拔跨过阈值点的距离（二分求交，参考海拔单增）
 * 严禁手写任何边界距离（Gate 2 约束 3）。
 */
import type {
  ComputedStage,
  ExpeditionStageDef,
  RouteIndex,
  StageBoundaryRef,
} from "../types/expedition";
import { referenceElevationAt } from "./route-index";

export class StageBoundaryError extends Error {}

/** 解析一个边界引用 → 路线上的真实距离（米） */
function boundaryDistance(
  ref: StageBoundaryRef,
  index: RouteIndex,
  searchFromM: number,
): number {
  switch (ref.kind) {
    case "start":
      return 0;
    case "end":
      return index.totalDistanceM;
    case "milestone": {
      const m = index.milestones.find((x) => x.id === ref.milestoneId);
      if (!m) {
        throw new StageBoundaryError(
          `[stages] 里程碑不存在：${ref.milestoneId}（可用：${index.milestones.map((x) => x.id).join(", ")}）`,
        );
      }
      if (m.distanceM < searchFromM - 1e-6) {
        throw new StageBoundaryError(
          `[stages] 边界回退：${ref.milestoneId} @${Math.round(m.distanceM)}m < 前边界 ${Math.round(searchFromM)}m`,
        );
      }
      return m.distanceM;
    }
    case "cross-ref-m": {
      // referenceElevationAt 沿距离单调非降（里程碑 refM 严格升序），二分求交
      const crossing = findRefCrossing(index, ref.crossRefM, searchFromM, index.totalDistanceM);
      if (!(crossing >= searchFromM - 1e-6)) {
        throw new StageBoundaryError(
          `[stages] cross-ref 交点逆行：${ref.crossRefM}m。`,
        );
      }
      return crossing;
    }
    default:
      throw new StageBoundaryError(`[stages] 未知边界类型：${JSON.stringify(ref)}`);
  }
}

/** 在 [fromM, toM] 内求「参考海拔 >= M」的分界距离（前提：参考海拔单调） */
function findRefCrossing(index: RouteIndex, crossRefM: number, fromM: number, toM: number): number {
  let lo = fromM;
  let hi = toM;
  if (referenceElevationAt(index, hi) < crossRefM) {
    // 未能在 [from,to] 内跨过 → 返回 toM（校验层会报告覆盖不全）
    return toM;
  }
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (referenceElevationAt(index, mid) < crossRefM) lo = mid;
    else hi = mid;
  }
  return hi;
}

/** 从阶段定义构建计算后的阶段序列（距离/进度全部由此算出） */
export function buildStageMap(
  defs: ExpeditionStageDef[],
  index: RouteIndex,
): ComputedStage[] {
  if (defs.length === 0) throw new StageBoundaryError("[stages] 未定义任何阶段");

  const out: ComputedStage[] = [];
  let prevToM = 0;
  defs.forEach((def, i) => {
    const fromM = boundaryDistance(def.from, index, i === 0 ? 0 : prevToM);
    const toM = boundaryDistance(def.to, index, fromM);
    if (!(toM >= fromM)) {
      throw new StageBoundaryError(
        `[stages] 阶段「${def.id}」边界无效：${Math.round(fromM)}→${Math.round(toM)}`,
      );
    }
    // 连续性：本段 from 必须等于上一段 to（防止漏圈/重叠）
    if (i > 0 && Math.abs(fromM - prevToM) > 1e-3) {
      throw new StageBoundaryError(
        `[stages] 阶段不连续：前段 ends ${Math.round(prevToM)}m，本段「${def.id}」starts ${Math.round(fromM)}m`,
      );
    }
    // prevToM 是从上一段 to 更新的
    out.push({
      id: def.id,
      name: def.name,
      emoji: def.emoji,
      intro: def.intro,
      from: def.from,
      to: def.to,
      fromDistanceM: fromM,
      toDistanceM: toM,
      fromProgress: fromM / index.totalDistanceM,
      toProgress: toM / index.totalDistanceM,
    });
    prevToM = toM;
  });
  return out;
}

/** 检查阶段覆盖是否完整连续（[0,total]，无缝） */
export function stagesCoverRoute(stages: ComputedStage[], totalM: number): boolean {
  if (stages.length === 0) return false;
  if (Math.abs(stages[0].fromDistanceM - 0) > 1e-6) return false;
  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1];
    const cur = stages[i];
    if (Math.abs(prev.toDistanceM - cur.fromDistanceM) > 1e-3) return false;
  }
  return Math.abs(stages[stages.length - 1].toDistanceM - totalM) <= 1e-3;
}

/** 依距离定位所在阶段（区间 [from,to) ；在 name 都能到总长时即最后一段） */
export function stageIndexAtDistance(stages: ComputedStage[], distanceM: number): number {
  for (let i = 0; i < stages.length; i++) {
    if (
      distanceM >= stages[i].fromDistanceM &&
      distanceM <= stages[i].toDistanceM &&
      (i === stages.length - 1 || distanceM < stages[i + 1].fromDistanceM)
    ) {
      return i;
    }
  }
  return stages.length - 1;
}