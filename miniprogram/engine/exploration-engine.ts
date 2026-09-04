/**
 * Exploration Engine —— 沉浸式探索的核心纯逻辑。
 *
 * 一切“海拔 → 环境 / 进度 / 知识”的推导都发生在这里；
 * 页面 / 组件只负责把 Engine 的输出画出来。
 * 不依赖 wx / DOM，保证 Node 环境可单测，且未来新增场景（富士山、撒哈拉、马里亚纳…）
 * 只增加数据文件即可复用同一套引擎（设计文档 §6.7）。
 */
import type {
  Exploration,
  ExplorationDerivedState,
  ExplorationKnowledgeNode,
  ExplorationStage,
} from "../types/exploration";
import { clamp } from "../utils/format";

/** 标准大气温度直减率（℃/km，对流层平均，来源 Standard Atmosphere） */
export const STANDARD_LAPSE_C_PER_KM = 6.5;
/** 压强随海拔近似衰减的标高（m）：p≈p0·e^(−h/H)，H=8.0km 使 8848m 处≈33% 海平面，与实测峰顶气压 ~335hPa 吻合 */
export const PRESSURE_SCALE_HEIGHT_M = 8000;
/** 海平面标准气压（hPa） */
export const SEA_LEVEL_PRESSURE_HPA = 1013.25;

/* ------------------------------------------------------------------ */
/* 基础数值工具                                                          */
/* ------------------------------------------------------------------ */

/** 0-1 钳制 */
export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** 海拔 → 全局进度 0-1 */
export function progressFor(
  elevation: number,
  start: number,
  max: number,
): number {
  if (max <= start) return 1;
  return clamp01((elevation - start) / (max - start));
}

/** 找到海拔当前所在阶段槽位：返回 stages 中最后一个 elevation<=alt 的索引（>=0） */
export function locateStageIndex(
  stages: ExplorationStage[],
  elevation: number,
): number {
  let index = 0;
  for (let i = 0; i < stages.length; i++) {
    if (stages[i].elevation <= elevation) index = i;
  }
  return index;
}

/**
 * 阶段字段在相邻两阶段间的插值比例 t（0-1）。
 * elevation 处于 stages[idx].elevation 与 stages[idx+1].elevation 之间时，t 为该区间内的比例
 */
export function stageBlend(
  stages: ExplorationStage[],
  elevation: number,
): number {
  const idx = locateStageIndex(stages, elevation);
  const a = stages[idx];
  const b = stages[idx + 1];
  if (!b) return 1;
  const span = b.elevation - a.elevation;
  if (span <= 0) return 1;
  return clamp01((elevation - a.elevation) / span);
}

/** 在阶段 a、b 之间按 t 插值某数值字段（b 可缺省 → 直接取 a） */
export function lerpStageField(
  stages: ExplorationStage[],
  elevation: number,
  field: "snow" | "fog" | "wind",
): number {
  const idx = locateStageIndex(stages, elevation);
  const a = stages[idx];
  const b = stages[idx + 1];
  if (!b) return a[field];
  const t = clamp01((elevation - a.elevation) / (b.elevation - a.elevation));
  return a[field] + (b[field] - a[field]) * t;
}

/* ------------------------------------------------------------------ */
/* 气候模型（温度 / 气压 / 植被）                                        */
/* ------------------------------------------------------------------ */

/** 当前海拔典型气温（℃）：直减率线性模型 */
export function temperatureAt(
  exploration: Exploration,
  elevation: number,
): number {
  const rise = Math.max(0, elevation - exploration.startElevation) / 1000;
  return exploration.baseTemperatureC - exploration.lapseRateCPer1000 * rise;
}

/** 相对海平面的气压比（≈含氧量比）：p/p0 = e^(−h / H) */
export function pressureRatioAt(
  elevation: number,
  scaleHeightM = PRESSURE_SCALE_HEIGHT_M,
): number {
  return clamp01(Math.exp(-elevation / scaleHeightM));
}

/** 植被覆盖度 0-1（海拔升高线性减少，之后保持 0） */
export function vegetationAt(
  elevation: number,
  start = 0,
  vanishAt = 5200,
): number {
  const range = Math.max(1, vanishAt - start);
  return clamp01(1 - (elevation - start) / range);
}

/* --------------------------------------------------------- */
/* 颜色插值（天空渐变，阶段 palette 之间过渡）                         */
/* --------------------------------------------------------- */

interface Rgb {
  r: number;
  g: number;
  b: number;
}

function hexToRgb(hex: string): Rgb {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(rgb: Rgb): string {
  const round = (v: number): string =>
    clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0");
  return `#${round(rgb.r)}${round(rgb.g)}${round(rgb.b)}`;
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

/** 插值色（hex 字符串 0-1 比例） */
function mixHex(a: string, b: string, t: number): string {
  return rgbToHex(mixRgb(hexToRgb(a), hexToRgb(b), clamp01(t)));
}

/** 根据当前海拔、在阶段 palette（相邻阶段天空色）间插值，得到三段天空渐变 */
export function skyGradient(
  stages: ExplorationStage[],
  elevation: number,
): [string, string, string] {
  const idx = locateStageIndex(stages, elevation);
  const a = stages[idx];
  const b = stages[idx + 1];
  const t = b
    ? clamp01((elevation - a.elevation) / (b.elevation - a.elevation))
    : 1;
  const pa = a.palette || ["#cfeaff", "#eef7ff", "#ffffff"];
  const pb = (b && b.palette) || pa;
  return [
    mixHex(pa[0], pb[0], t),
    mixHex(pa[1], pb[1], t),
    mixHex(pa[2], pb[2], t),
  ];
}

/* -------------------------------------------- */
/* 知识节点                                      */
/* -------------------------------------------- */

/** 判断海拔是否已覆盖某个节点（上行解锁）。 */
export function nodeCovered(nodeElevation: number, elevation: number): boolean {
  return elevation >= nodeElevation;
}

/**
 * 计算本次“行进”新解锁的知识节点（升序）。
 * direction<0（下山）不触发新节点。
 */
export function knowledgeUnlockedOnMove(
  nodes: ExplorationKnowledgeNode[],
  fromElev: number,
  toElev: number,
): ExplorationKnowledgeNode[] {
  if (toElev <= fromElev) return [];
  return nodes
    .filter((n) => n.elevation > fromElev && n.elevation <= toElev)
    .sort((a, b) => a.elevation - b.elevation);
}

/** 海拔阈值附近（即将出现）的节点 —— 用于地图上“种草”待发现标记 */
export function pendingNodesNear(
  nodes: ExplorationKnowledgeNode[],
  elevation: number,
  windowM = 400,
): ExplorationKnowledgeNode[] {
  return nodes
    .filter(
      (n) => n.elevation > elevation && n.elevation - elevation <= windowM,
    )
    .sort((a, b) => a.elevation - b.elevation);
}

/* ------------------------------------------- */
/* 主推导入口                                   */
/* ------------------------------------------- */

/**
 * 根据海拔推导完整环境状态。UI 只消费返回值。
 * @param discoveredIds 已解锁知识节点 id 集合
 */
export function deriveState(
  exploration: Exploration,
  elevation: number,
  discoveredIds: ReadonlyArray<string> = [],
): ExplorationDerivedState {
  const exact = clamp(
    elevation,
    exploration.startElevation,
    exploration.maxElevation,
  );
  const progress = progressFor(
    exact,
    exploration.startElevation,
    exploration.maxElevation,
  );
  const stageIndex = locateStageIndex(exploration.stages, exact);
  const stage = exploration.stages[stageIndex];
  const nextStage = exploration.stages[stageIndex + 1] ?? null;
  const t = stageBlend(exploration.stages, exact);

  const predicted = pendingNodesNear(exploration.knowledgeNodes, exact);
  const discoveredNodes = exploration.knowledgeNodes.filter((n) =>
    discoveredIds.includes(n.id),
  );

  return {
    elevation: exact,
    progress,
    stageIndex,
    stage,
    nextStage,
    stageProgress: t,
    temperatureC: temperatureAt(exploration, exact),
    pressureRatio: pressureRatioAt(exact),
    snow: lerpStageField(exploration.stages, exact, "snow"),
    fog: lerpStageField(exploration.stages, exact, "fog"),
    wind: lerpStageField(exploration.stages, exact, "wind"),
    vegetation: vegetationAt(exact, exploration.startElevation, 5200),
    sky: skyGradient(exploration.stages, exact),
    isSummit: exact >= exploration.maxElevation,
    discovered: discoveredNodes,
    pending: predicted,
  };
}
