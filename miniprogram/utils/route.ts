/** 场景路线的纯数据映射；不依赖 wx，也不关心任何具体场景。 */
import type {
  ExplorationRoute,
  ExplorationRouteWaypoint,
} from "../types/exploration";
import { clamp } from "./format";

export interface RoutePosition {
  x: number;
  y: number;
  progress: number;
  segmentIndex: number;
}

/** 将全局探索进度映射到路线折线上的当前位置。 */
export function routePositionAt(
  route: ExplorationRoute,
  progress: number,
): RoutePosition {
  const points = route.waypoints;
  if (!points.length) return { x: 0, y: 0, progress: 0, segmentIndex: -1 };
  const p = clamp(progress, 0, 1);
  if (points.length === 1 || p <= points[0].progress) {
    return { x: points[0].x, y: points[0].y, progress: p, segmentIndex: 0 };
  }
  const lastIndex = points.length - 1;
  if (p >= points[lastIndex].progress) {
    return {
      x: points[lastIndex].x,
      y: points[lastIndex].y,
      progress: p,
      segmentIndex: lastIndex - 1,
    };
  }
  for (let index = 0; index < lastIndex; index++) {
    const from = points[index];
    const to = points[index + 1];
    if (p <= to.progress) {
      const range = to.progress - from.progress;
      const t = range > 0 ? (p - from.progress) / range : 0;
      return {
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        progress: p,
        segmentIndex: index,
      };
    }
  }
  return { x: points[lastIndex].x, y: points[lastIndex].y, progress: p, segmentIndex: lastIndex - 1 };
}

/** 当前已经经过的最后一个途经点；尚未开始时仍返回起点。 */
export function currentRouteWaypoint(
  route: ExplorationRoute,
  progress: number,
): ExplorationRouteWaypoint | null {
  if (!route.waypoints.length) return null;
  const p = clamp(progress, 0, 1);
  return route.waypoints.filter((point) => point.progress <= p).pop() || route.waypoints[0];
}

/** 当前之后的下一站；到终点后为 null。 */
export function nextRouteWaypoint(
  route: ExplorationRoute,
  progress: number,
): ExplorationRouteWaypoint | null {
  const p = clamp(progress, 0, 1);
  return route.waypoints.find((point) => point.progress > p) || null;
}
