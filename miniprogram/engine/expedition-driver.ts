/**
 * Expedition Driver —— Gate 3 页面「路线进度轴」适配器（纯逻辑，无 wx 依赖）。
 *
 * ⚠️ 语义常量（用户于 Gate 3 确认）：
 *   1. 驱动「进度 / 标的物 / 剩余路线」的轴 = 路线里程/进度轴
 *      （RouteIndex.totalDistanceM ≈ 12,955.8 m，水平投影），**不是** 3D 折线距离
 *      （≈14,310.9 m，仅可作旁路统计，绝不参与驱动）。
 *   2. 峰顶展示海拔一律为公开高程 8,848.86 m（Exploration.maxElevation），
 *      数据集 refM=8849（峰顶里程碑）与 DEM=~8709 不参与 UI 主数值。
 *
 * 三类海拔（Gate 2 约定，本模块严格分离并显式交付，禁止隐式混用）：
 *   - demM   ：地形几何 / 路线投影（本 Gate 不渲染）
 *   - refM   ：权威参考海拔（Camp 标高、UI 位置海拔）
 *   - modelM ：环境模型海拔（pressure / O2 / temperature）＝ reference-anchored
 *
 * 本文件不做任何渲染；页面 / 测试共用，保证 Node 可单测。
 */
import type {
  ComputedStage,
  RouteIndex,
  RouteMilestoneSample,
} from "../types/expedition";
import { clamp } from "../utils/format";
import { routeSampleAtProgress } from "./route-index";
import { stageIndexAtDistance } from "./expedition-stages";

/** 死亡区参考海拔阈值（公开登山口径：8000 m 以上为死亡区） */
export const DEATH_ZONE_REF_M = 8000;

/** Driver 所需的「Expedition 最小结构」——仅取 routeIndex/stageMap/maxElevation */
export interface ExpeditionCore {
  routeIndex: RouteIndex;
  stageMap: ComputedStage[];
  maxElevation: number;
}

/** 某一刻的完整驾驶状态（纯数据，UI 只消费它） */
export interface ExpeditionDriveState {
  /** 0-1 路线进度（RouteIndex 里程轴，非海拔轴） */
  progress: number;
  /** 当前路线完成距离（m） */
  distanceM: number;
  /** 距终点的路线剩余里程（m） */
  remainingRouteM: number;
  /** 垂直参考高差（到统一峰顶高程）：max(0, maxElevation − refM)（m） */
  remainingVerticalM: number;
  /** 当前参考海拔（m；用户“当前位置”海拔；峰顶态固定 8,848.86） */
  refM: number;
  /** DEM 海拔（m，仅地形/投影，不用于 HUD） */
  demM: number;
  /** 模型海拔（m，pressure/O2/temp 环境模型，= reference-anchored） */
  modelM: number;
  /** WGS84 经纬度（插值） */
  lat: number;
  lon: number;
  /** 路线折线段索引 */
  segment: number;
  /** 行进方向坡度（度，下坡为负） */
  gradeDeg: number;
  /** 阶段槽位（按 distanceM 经 stageMap 定位） */
  stageIndex: number;
  stage: ComputedStage | null;
  nextStage: ComputedStage | null;
  /** 死亡区：refM >= 8000 且尚未跪顶 */
  deathZone: boolean;
  /** 飞机顶（progress >= 1） */
  atSummit: boolean;
  /** 已越过的上一个里程碑（>=0 时 current 存在） */
  current: RouteMilestoneSample | null;
  /** 前一个里程碑 */
  prev: RouteMilestoneSample | null;
  /** 下一里程碑 */
  next: RouteMilestoneSample | null;
  /** “至下一站”精确里程：next.distanceM − distanceM（无下一站为 0） */
  nextGapM: number;
  /** 峰顶统一显示海拔（= core.maxElevation，如 8,848.86） */
  summitRefM: number;
}

/** 取离当前里程最近的已“越过”里程碑（尚未开始返回第一个） */
function milestoneProgress(
  ms: RouteMilestoneSample[],
  distanceM: number,
): { current: RouteMilestoneSample | null; prev: RouteMilestoneSample | null; next: RouteMilestoneSample | null } {
  if (!ms.length) return { current: null, prev: null, next: null };
  let current = ms[0];
  let prev: RouteMilestoneSample | null = null;
  for (let i = 0; i < ms.length; i++) {
    if (ms[i].distanceM <= distanceM + 1e-6) {
      current = ms[i];
      prev = i > 0 ? ms[i - 1] : null;
    } else {
      break;
    }
  }
  const next = ms.find((m) => m.distanceM > distanceM + 1e-6) || null;
  return { current, prev, next };
}

/** 由「最小投入」在当前 progress（0-1 路线轴）处推导完整驾驶状态 */
export function driveAtProgress(core: ExpeditionCore, progress: number): ExpeditionDriveState {
  const p = clamp(progress, 0, 1);
  return driveFromSample(core, routeSampleAtProgress(core.routeIndex, p));
}

/** 与 里程 (m) 处推导：等价于 driveAtProgress(distance / total) */
export function driveAtDistance(core: ExpeditionCore, distanceM: number): ExpeditionDriveState {
  const p = clamp(distanceM / core.routeIndex.totalDistanceM, 0, 1);
  return driveAtProgress(core, p);
}

function driveFromSample(core: ExpeditionCore, sample: ReturnType<typeof routeSampleAtProgress>): ExpeditionDriveState {
  const { routeIndex, stageMap } = core;
  const total = routeIndex.totalDistanceM;
  const distance = sample.distanceM;
  const atSummit = distance >= total - 1e-3;
  const wasDeath = sample.refM >= DEATH_ZONE_REF_M;
  // UI 展示海拔：永不越过公开峰顶值 8,848.86（数据集 refM 在峰顶=8849，须统一）
  const refM = atSummit
    ? core.maxElevation
    : Math.min(sample.refM, core.maxElevation);
  const stageIndex = stageIndexAtDistance(stageMap, clamp(distance, 0, total));
  const ms = routeIndex.milestones;
  const { current, prev, next } = milestoneProgress(ms, distance);
  const nextGapM = next ? next.distanceM - distance : 0;
  return {
    progress: sample.progress,
    distanceM: distance,
    remainingRouteM: Math.max(0, total - distance),
    remainingVerticalM: Math.max(0, core.maxElevation - sample.refM),
    refM,
    demM: sample.demM,
    modelM: sample.modelM,
    lat: sample.lat,
    lon: sample.lon,
    segment: sample.segment,
    gradeDeg: sample.gradeDeg,
    stageIndex,
    stage: stageMap[stageIndex] ?? null,
    nextStage: stageMap[stageIndex + 1] ?? null,
    deathZone: wasDeath && !atSummit,
    atSummit,
    current,
    prev,
    next,
    nextGapM,
    summitRefM: core.maxElevation,
  };
}

/* ------------------------------------------------------------------ */
/* 里程 / 剩余格式辅助（纯函数，展示层共用）                              */
/* ------------------------------------------------------------------ */

/** 米 → “12.9 km” 路线剩余里程展示 */
export function formatRouteKm(meters: number): string {
  return `${(Math.max(0, meters) / 1000).toFixed(1)} km`;
}

/** 米 → 千分位整数（“2,012 m”） */
export function formatDistanceM(meters: number): string {
  const v = Math.max(0, meters);
  return `${v.toLocaleString("en-US", { maximumFractionDigits: 0 })} m`;
}