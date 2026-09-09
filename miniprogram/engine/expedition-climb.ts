/**
 * Gate 3.4 · 攀登引擎（纯函数，无 wx / 页面依赖）。
 *
 * 语义：
 *   - 攀登目标一律基于「路线里程」或「路线 progress 增量」，绝不基于海拔/固定百分比/下一营地；
 *   - 单次攀登 = fromDistance → toDistance 在 CLIMB_MIN..MAX 时长内的连续补间
 *     （移动同一刻就是路线推进，driveAtProgress 仍是唯一位置真相源）；
 *   - 依靠本引擎只产出「运动的连续位置」与「沿途跨越里程碑」的纯结果，
 *     是否触发一次性事件由调用方（页面 controller）决策 —— 本层同样提供
 *     MilestoneCrossTracker 纯记账，保证「同一里程碑只触发一次」可被直接单测。
 */
import type { RouteIndex, RouteMilestoneSample } from "../types/expedition";
import { clamp } from "../utils/format";

/* ---------------- 常量（运动观感） ---------------- */

/** 单次攀登最小/最大时长（ms） */
export const CLIMB_MIN_MS = 700;
export const CLIMB_MAX_MS = 1600;
/** 每 100m 的耗时系数（用于把里程增量映射到时长；180m 左右≈1.0s 观感） */
const CLIMB_MS_PER_100M = 560;
/** 攀登结束后的惯性停止（settling) 窗口（ms） */
export const CLIMB_SETTLE_MS = 260;

/* ---------------- 类型 ---------------- */

/** 攀登交互状态（Goal §29：不重设 canonical Expedition State，仅 UI 交互状态） */
export type ClimbPhase =
  | "idle"
  | "climbing"
  | "settling"
  | "arrived"
  | "summit";

/** 单次攀登会话（目标基于路线里程增量） */
export interface ClimbRequest {
  /** 起始里程（m，路线轴） */
  fromDistanceM: number;
  /** 目标里程（m，路线轴；可由 delta 派生） */
  toDistanceM: number;
  /** 会话起点时间戳（ms） */
  startedAt: number;
  /** 会话总时长（ms） */
  durationMs: number;
}

/** 单帧攀登结果（每一帧都是真实路线位置：totalDistanceM 全程共享） */
export interface ClimbFrame {
  phase: ClimbPhase;
  /** 到达的里程（m，路线轴 → progress = dist / total） */
  distanceM: number;
  /** 0-1 局部补间进度（eased） */
  eased: number;
  /** ≥1 表示已完成 */
  done: boolean;
  /** 距目标差值（m；settling/arrived 后接近 0） */
  remainingM: number;
}

/** 由「当前里程 + 有方向的增量」解析攀登目标（唯一方式：路线里程/进度增量） */
export function climbTargetForStep(
  currentDistanceM: number,
  deltaDistanceM: number,
  totalDistanceM: number,
): number {
  return clamp(currentDistanceM + deltaDistanceM, 0, totalDistanceM);
}

/** 用「里程增量 + 均匀观感」估算时长（目标在 CLIMB_MIN..MAX 内，随距离渐变） */
export function climbDurationForDistance(deltaDistanceM: number): number {
  const d = Math.abs(deltaDistanceM);
  return clamp((d / 100) * CLIMB_MS_PER_100M + 60, CLIMB_MIN_MS, CLIMB_MAX_MS);
}

/** 创建单次攀登请求（起点 = 当前距离，目标 = 增量后的距离） */
export function createClimbRequest(
  fromDistanceM: number,
  deltaDistanceM: number,
  totalDistanceM: number,
  startedAt = 0,
): ClimbRequest {
  const toDistanceM = climbTargetForStep(
    fromDistanceM,
    deltaDistanceM,
    totalDistanceM,
  );
  return {
    fromDistanceM,
    toDistanceM,
    startedAt,
    durationMs: climbDurationForDistance(toDistanceM - fromDistanceM),
  };
}

/** 由距离会话在 nowMs 处求位置（smoothstep 补间；跨越到达后钳到最后一点） */
export function climbFrameAt(req: ClimbRequest, nowMs: number): ClimbFrame {
  const elapsed = Math.max(0, nowMs - req.startedAt);
  const t = clamp(elapsed / req.durationMs, 0, 1);
  const eased = smoothstep(t);
  let phase: ClimbPhase = "idle";
  if (t >= 1) {
    phase =
      elapsed - req.durationMs <= CLIMB_SETTLE_MS ? "settling" : "arrived";
  } else {
    phase = "climbing";
  }
  const distanceM =
    req.fromDistanceM + (req.toDistanceM - req.fromDistanceM) * eased;
  return {
    phase,
    distanceM,
    eased,
    done: t >= 1,
    remainingM: clamp(
      req.toDistanceM - distanceM,
      0,
      Math.abs(req.toDistanceM - req.fromDistanceM),
    ),
  };
}

/** 完成判定：无论朝向，进度已装（eased >= 1） */
export function climbDone(frame: ClimbFrame): boolean {
  return frame.eased >= 1;
}

/** 一次跨越 [fromM, toM] 中「被越过」的里程碑（含两端匹配；升/降同逻辑） */
export function milestonesCrossedBetween(
  index: RouteIndex,
  fromDistanceM: number,
  toDistanceM: number,
): RouteMilestoneSample[] {
  const lo = Math.min(fromDistanceM, toDistanceM);
  const hi = Math.max(fromDistanceM, toDistanceM);
  return index.milestones.filter(
    (m) => m.distanceM >= lo - 1e-6 && m.distanceM <= hi + 1e-6,
  );
}

/**
 * 里程碑跨域一次性记账（纯记账，可单测）。
 *   - 每次 submit(crossedIds) 返回「首次出现」的 id（已见过的剔除）；
 *   - 同一里程碑在整个记账生命周期只被返回一次；
 *   - 跨多个里程碑、中途中途撤回再前进（反向）均正确：只对「第一次越过」计账。
 */
export class MilestoneCrossTracker {
  private fired = new Set<string>();

  reset() {
    this.fired.clear();
  }

  /** 标注某里程碑已记过（让记账器把当前骨架当成已触发基线） */
  prime(id: string) {
    this.fired.add(id);
  }

  /** 给定「已位于当前里程之后」的里程碑 id 列表，返回新触发的（调用方对每个触发发事件） */
  note(crossed: Array<{ id: string } | string>): string[] {
    const out: string[] = [];
    for (const c of crossed) {
      const id = typeof c === "string" ? c : c.id;
      if (!id) continue;
      if (!this.fired.has(id)) {
        this.fired.add(id);
        out.push(id);
      }
    }
    return out;
  }

  has(id: string): boolean {
    return this.fired.has(id);
  }

  size(): number {
    return this.fired.size;
  }
}

/* 便于外部使用 */
export function smoothstep(t: number): number {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}
