"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MilestoneCrossTracker = exports.CLIMB_SETTLE_MS = exports.CLIMB_MAX_MS = exports.CLIMB_MIN_MS = void 0;
exports.climbTargetForStep = climbTargetForStep;
exports.climbDurationForDistance = climbDurationForDistance;
exports.createClimbRequest = createClimbRequest;
exports.climbFrameAt = climbFrameAt;
exports.climbDone = climbDone;
exports.milestonesCrossedBetween = milestonesCrossedBetween;
exports.smoothstep = smoothstep;
const format_1 = require("../utils/format");
/* ---------------- 常量（运动观感） ---------------- */
/** 单次攀登最小/最大时长（ms） */
exports.CLIMB_MIN_MS = 700;
exports.CLIMB_MAX_MS = 1600;
/** 每 100m 的耗时系数（用于把里程增量映射到时长；180m 左右≈1.0s 观感） */
const CLIMB_MS_PER_100M = 560;
/** 攀登结束后的惯性停止（settling) 窗口（ms） */
exports.CLIMB_SETTLE_MS = 260;
/** 由「当前里程 + 有方向的增量」解析攀登目标（唯一方式：路线里程/进度增量） */
function climbTargetForStep(currentDistanceM, deltaDistanceM, totalDistanceM) {
    return (0, format_1.clamp)(currentDistanceM + deltaDistanceM, 0, totalDistanceM);
}
/** 用「里程增量 + 均匀观感」估算时长（目标在 CLIMB_MIN..MAX 内，随距离渐变） */
function climbDurationForDistance(deltaDistanceM) {
    const d = Math.abs(deltaDistanceM);
    return (0, format_1.clamp)((d / 100) * CLIMB_MS_PER_100M + 60, exports.CLIMB_MIN_MS, exports.CLIMB_MAX_MS);
}
/** 创建单次攀登请求（起点 = 当前距离，目标 = 增量后的距离） */
function createClimbRequest(fromDistanceM, deltaDistanceM, totalDistanceM, startedAt = 0) {
    const toDistanceM = climbTargetForStep(fromDistanceM, deltaDistanceM, totalDistanceM);
    return {
        fromDistanceM,
        toDistanceM,
        startedAt,
        durationMs: climbDurationForDistance(toDistanceM - fromDistanceM),
    };
}
/** 由距离会话在 nowMs 处求位置（smoothstep 补间；跨越到达后钳到最后一点） */
function climbFrameAt(req, nowMs) {
    const elapsed = Math.max(0, nowMs - req.startedAt);
    const t = (0, format_1.clamp)(elapsed / req.durationMs, 0, 1);
    const eased = smoothstep(t);
    let phase = "idle";
    if (t >= 1) {
        phase =
            elapsed - req.durationMs <= exports.CLIMB_SETTLE_MS ? "settling" : "arrived";
    }
    else {
        phase = "climbing";
    }
    const distanceM = req.fromDistanceM + (req.toDistanceM - req.fromDistanceM) * eased;
    return {
        phase,
        distanceM,
        eased,
        done: t >= 1,
        remainingM: (0, format_1.clamp)(req.toDistanceM - distanceM, 0, Math.abs(req.toDistanceM - req.fromDistanceM)),
    };
}
/** 完成判定：无论朝向，进度已装（eased >= 1） */
function climbDone(frame) {
    return frame.eased >= 1;
}
/** 一次跨越 [fromM, toM] 中「被越过」的里程碑（含两端匹配；升/降同逻辑） */
function milestonesCrossedBetween(index, fromDistanceM, toDistanceM) {
    const lo = Math.min(fromDistanceM, toDistanceM);
    const hi = Math.max(fromDistanceM, toDistanceM);
    return index.milestones.filter((m) => m.distanceM >= lo - 1e-6 && m.distanceM <= hi + 1e-6);
}
/**
 * 里程碑跨域一次性记账（纯记账，可单测）。
 *   - 每次 submit(crossedIds) 返回「首次出现」的 id（已见过的剔除）；
 *   - 同一里程碑在整个记账生命周期只被返回一次；
 *   - 跨多个里程碑、中途中途撤回再前进（反向）均正确：只对「第一次越过」计账。
 */
class MilestoneCrossTracker {
    constructor() {
        this.fired = new Set();
    }
    reset() {
        this.fired.clear();
    }
    /** 标注某里程碑已记过（让记账器把当前骨架当成已触发基线） */
    prime(id) {
        this.fired.add(id);
    }
    /** 给定「已位于当前里程之后」的里程碑 id 列表，返回新触发的（调用方对每个触发发事件） */
    note(crossed) {
        const out = [];
        for (const c of crossed) {
            const id = typeof c === "string" ? c : c.id;
            if (!id)
                continue;
            if (!this.fired.has(id)) {
                this.fired.add(id);
                out.push(id);
            }
        }
        return out;
    }
    has(id) {
        return this.fired.has(id);
    }
    size() {
        return this.fired.size;
    }
}
exports.MilestoneCrossTracker = MilestoneCrossTracker;
/* 便于外部使用 */
function smoothstep(t) {
    const x = (0, format_1.clamp)(t, 0, 1);
    return x * x * (3 - 2 * x);
}
