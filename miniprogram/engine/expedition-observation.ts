/**
 * Expedition 观察视图适配器。
 *
 * 这里不保存任何进度，也不复制路线数据；所有结果都从 ExpeditionDriver
 * 的 canonical RouteIndex 派生，供地图、探索索引和个人记录共享同一套语义。
 */
import type { ExpeditionCore } from "./expedition-driver";
import { driveAtProgress } from "./expedition-driver";
import type { RouteIndex, RouteMilestoneSample } from "../types/expedition";
import { clamp, formatNumber } from "../utils/format";

export type ObservationPointState = "completed" | "current" | "upcoming";

export interface ObservationPointView {
  id: string;
  name: string;
  label: string;
  kind: string;
  elevationM: number;
  elevationText: string;
  progress: number;
  state: ObservationPointState;
  stateLabel: string;
}

export interface RouteProjectionPoint {
  id: string;
  x: number;
  y: number;
}

export interface RouteProjection {
  points: RouteProjectionPoint[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
}

/** 竖屏地图中，1% 高度换算成相对 1% 宽度的比例。 */
export const PORTRAIT_CANVAS_WIDTH_HEIGHT = 0.48;

/** 观察名优先于营地代号，让产品表达“认识地貌”而不是“导航登山”。 */
export function observationLabel(id: string, fallback = "地貌观察点"): string {
  const labels: Record<string, string> = {
    "base-camp": "冰川前缘",
    "khumbu-icefall": "冰瀑地形",
    "camp-i": "冰川谷地",
    "western-cwm-camp-ii": "雪原地貌",
    "lhotse-face-camp-iii": "陡峭冰壁",
    "south-col-camp-iv": "高山鞍部",
    "south-summit": "山脊地形",
    summit: "雪峰顶部",
  };
  return labels[id] ?? fallback;
}

export function observationStateLabel(state: ObservationPointState): string {
  return state === "completed" ? "已观察" : state === "current" ? "当前观察" : "待观察";
}

export function formatObservationElevation(value: number, maxElevation: number): string {
  const safe = Math.min(Math.max(0, value), maxElevation);
  return Math.abs(safe - maxElevation) < 0.01
    ? formatNumber(maxElevation, 2)
    : formatNumber(safe, 0);
}

export function buildObservationPoints(
  core: ExpeditionCore,
  progress: number,
): ObservationPointView[] {
  const drive = driveAtProgress(core, progress);
  const currentId = drive.current?.id ?? core.routeIndex.milestones[0]?.id;
  return core.routeIndex.milestones.map((milestone) => {
    const state: ObservationPointState = milestone.id === currentId
      ? "current"
      : milestone.progress < drive.progress
        ? "completed"
        : "upcoming";
    return {
      id: milestone.id,
      name: milestone.name,
      label: observationLabel(milestone.id, milestone.name),
      kind: milestone.kind,
      elevationM: milestone.refM,
      elevationText: `${formatObservationElevation(milestone.refM, core.maxElevation)} m`,
      progress: milestone.progress,
      state,
      stateLabel: observationStateLabel(state),
    };
  });
}

/** 记录里的最高海拔只用于恢复观察位置，节点/环境仍由 driver 推导。 */
export function progressForReferenceElevation(
  routeIndex: RouteIndex,
  maxElevation: number,
  elevation: number,
): number {
  if (elevation >= maxElevation - 0.01) return 1;
  const safe = Math.max(0, elevation);
  let best = 0;
  for (const milestone of routeIndex.milestones) {
    if (milestone.refM <= safe) best = milestone.progress;
    else break;
  }
  return clamp(best, 0, 1);
}

/**
 * 将同一条 canonical 折线的里程碑投影到地图视口。
 * 路线和节点必须消费这组点，避免“线”和“点”各算一遍后错位。
 */
export function projectRouteMilestones(
  routeIndex: RouteIndex,
  viewport = { left: 18, right: 82, top: 16, bottom: 59 },
): RouteProjection {
  const xs = routeIndex.xs;
  const ys = routeIndex.ys;
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = Math.max(1, maxX - minX);
  const rangeY = Math.max(1, maxY - minY);
  const points = routeIndex.milestones.map((milestone) => ({
    id: milestone.id,
    x: viewport.left + ((milestone.x - minX) / rangeX) * (viewport.right - viewport.left),
    y: viewport.top + ((milestone.y - minY) / rangeY) * (viewport.bottom - viewport.top),
  }));
  return { points, bounds: { minX, maxX, minY, maxY } };
}

export function routeSegment(
  a: RouteProjectionPoint,
  b: RouteProjectionPoint,
  widthHeight = PORTRAIT_CANVAS_WIDTH_HEIGHT,
) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const screenDy = dy * widthHeight;
  return {
    left: a.x,
    top: a.y,
    width: Math.hypot(dx, screenDy),
    rotate: (Math.atan2(screenDy, dx) * 180) / Math.PI,
  };
}

export function findMilestone(
  milestones: RouteMilestoneSample[],
  id: string,
): RouteMilestoneSample | null {
  return milestones.find((milestone) => milestone.id === id) ?? null;
}
