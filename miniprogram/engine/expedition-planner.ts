/**
 * Gate 3.4 · 攀登计划派生层（纯函数，无 wx / 页面依赖）。
 *
 * 单一真相源规则：
 *   - 本模块只消费 ExpeditionCore 的既有输出（routeIndex / stageMap），
 *     不建立第二套进度、不读写任何 progress 状态；
 *   - 全部距离/进度/海拔均派生自 289 点真实路线（RouteIndex），禁止手写；
 *   - 该层把「路线计划」和「路线上的当前位置（在哪一段/下一个节点）」以
 *     只读方式暴露给 UI，UI 消费后自行 setData，绝不反向写回。
 */
import type { RouteMilestoneSample } from "../types/expedition";
import type { ExpeditionCore } from "./expedition-driver";
import { referenceElevationAt } from "./route-index";

/** 计划内的里程碑呈现（消费 RouteIndex 派生结果，不带任何伪造数据） */
export interface PlannerMilestone {
  id: string;
  name: string;
  kind: string;
  /** 累计里程（m） */
  distanceM: number;
  /** 0-1 路线进度 */
  progress: number;
  /** 参考海拔（m，UI 展示用） */
  refM: number;
  isSummit: boolean;
}

/** 单一里程段（来自 stageMap 的真实边界；不含手写数字） */
export interface PlannerSegment {
  index: number;
  id: string;
  name: string;
  emoji: string;
  intro: string;
  fromDistanceM: number;
  toDistanceM: number;
  /** 段长（m） */
  spanM: number;
  fromProgress: number;
  toProgress: number;
  fromRefM: number;
  toRefM: number;
  /** 段内顶部—底部参考海拔差（真实参考海拔，非伪造） */
  ascentM: number;
  /** 该段覆盖的最后一个里程碑（到段末为止最新一个；无则 null） */
  endMilestone: PlannerMilestone | null;
}

/** 每个里程段的三态（UI 渲染用；纯派生，无写回） */
export interface PlannerSegmentStatus {
  index: number;
  id: string;
  state: "done" | "current" | "upcoming";
  fromProgress: number;
  toProgress: number;
}

/** 当前位置的派生呈现（一次调用，全部由 core 换算） */
export interface PlannerAt {
  /** 命中段索引（0..n-1） */
  segmentIndex: number;
  /** 当前段内 0-1 局部进度 */
  segmentLocal: number;
  /** 全路线 0-1 进度 */
  progress: number;
  /** 全部段三态（按序） */
  segments: PlannerSegmentStatus[];
}

export interface ExpeditionPlan {
  /** 目标名称（如 “珠穆朗玛峰”） */
  name: string;
  /** 总里程（水平投影，m） */
  totalDistanceM: number;
  /** 起点参考海拔（m） */
  startRefM: number;
  /** 峰顶统一展示海拔（m） */
  summitRefM: number;
  segments: PlannerSegment[];
  milestones: PlannerMilestone[];
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** 从 RouteIndex 派生计划里程碑（不含伪造；里程/进度/海拔全部算得） */
function toPlannerMilestone(ms: RouteMilestoneSample): PlannerMilestone {
  return {
    id: ms.id,
    name: ms.name,
    kind: ms.kind,
    distanceM: ms.distanceM,
    progress: ms.progress,
    refM: ms.refM,
    isSummit: ms.kind === "summit",
  };
}

/** 由 stageMap 段派生 PlannerSegment（真实距离边界；参考海拔实时计算）
 *  里程碑归属：某里程碑距离恰好落在段边界时，归“先到达该距离的段”（避免跨段重复）。 */
function milestoneOwnerIndexes(core: ExpeditionCore): number[] {
  const routeIndex = core.routeIndex;
  const ret = routeIndex.milestones.map(() => -1);
  routeIndex.milestones.forEach((ml, mi) => {
    for (let i = 0; i < core.stageMap.length; i++) {
      if (core.stageMap[i].toDistanceM >= ml.distanceM - 1e-6) {
        ret[mi] = i;
        break;
      }
    }
  });
  return ret;
}

function deriveSegmentFromStage(
  core: ExpeditionCore,
  index: number,
  owners: number[],
): PlannerSegment {
  const routeIndex = core.routeIndex;
  const stage = core.stageMap[index];
  const fromM = stage.fromDistanceM;
  const toM = stage.toDistanceM;
  // 归属于本段的里程碑（同一段内取距离最大者）
  const ownedMile = routeIndex.milestones
    .map((ml, mi) => ({ ml, mi }))
    .filter(({ mi }) => owners[mi] === index)
    .sort((a, b) => a.ml.distanceM - b.ml.distanceM)
    .map(({ ml }) => ml);
  const endMile = ownedMile[ownedMile.length - 1] ?? undefined;
  return {
    index,
    id: stage.id,
    name: stage.name,
    emoji: stage.emoji,
    intro: stage.intro,
    fromDistanceM: fromM,
    toDistanceM: toM,
    spanM: toM - fromM,
    fromProgress: fromM / routeIndex.totalDistanceM,
    toProgress: toM / routeIndex.totalDistanceM,
    fromRefM: referenceElevationAt(routeIndex, fromM),
    toRefM: referenceElevationAt(routeIndex, toM),
    ascentM:
      referenceElevationAt(routeIndex, toM) -
      referenceElevationAt(routeIndex, fromM),
    endMilestone: endMile ? toPlannerMilestone(endMile) : null,
  };
}

/** 由 core 一次性派生完整计划（含里程碑）。名称缺省用 routeIndex.name。 */
export function buildExpeditionPlan(
  core: ExpeditionCore,
  name?: string,
): ExpeditionPlan {
  const routeIndex = core.routeIndex;
  const owners = milestoneOwnerIndexes(core);
  const segments = core.stageMap.map((_, i) =>
    deriveSegmentFromStage(core, i, owners),
  );
  return {
    name: name ?? routeIndex.name,
    totalDistanceM: routeIndex.totalDistanceM,
    startRefM: referenceElevationAt(routeIndex, 0),
    summitRefM: core.maxElevation,
    segments,
    milestones: routeIndex.milestones.map(toPlannerMilestone),
  };
}

/** 找到 distanceM 命中的段索引（顺序查找；空 core → 0） */
function plannerSegmentIndex(core: ExpeditionCore, distanceM: number): number {
  const stages = core.stageMap;
  if (!stages.length) return 0;
  for (let i = 0; i < stages.length; i++) {
    if (distanceM <= stages[i].toDistanceM + 1e-6) return i;
  }
  return stages.length - 1;
}

/**
 * 当前位置的三态呈现（distance 或 progress 均可；页面传入 drive.distanceM）。
 * 全部由 core 派生；不做任何业务写回。
 */
export function plannerAt(core: ExpeditionCore, distanceM: number): PlannerAt {
  const routeIndex = core.routeIndex;
  const total = routeIndex.totalDistanceM;
  const progress = clamp01(distanceM / total);
  const stages = core.stageMap;
  const segments = stages.map((stage, i): PlannerSegmentStatus => {
    const from = stage.fromProgress;
    const to = stage.toProgress;
    let state: PlannerSegmentStatus["state"] = "upcoming";
    if (progress >= to - 1e-6) state = "done";
    else if (progress >= from - 1e-6) state = "current";
    return {
      index: i,
      id: stage.id,
      state,
      fromProgress: from,
      toProgress: to,
    };
  });
  const segmentIndex = plannerSegmentIndex(core, distanceM);
  const seg = stages[segmentIndex];
  const segmentLocal = seg
    ? clamp01(
        (progress - seg.fromProgress) /
          Math.max(1e-6, seg.toProgress - seg.fromProgress),
      )
    : 0;
  return { segmentIndex, segmentLocal, progress, segments };
}

/** 空 core（Mariana 等无 stageMap 场景）容错位置 */
export function emptyPlannerAt(): PlannerAt {
  return { segmentIndex: 0, segmentLocal: 0, progress: 0, segments: [] };
}
