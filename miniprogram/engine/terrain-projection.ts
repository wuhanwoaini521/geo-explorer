/**
 * TERRAIN 2.5D 场景 · 路线投影层（纯逻辑，可 Node 单测；无 wx 依赖）。
 *
 * 定位（相对 LIVE）：
 *   - LIVE：继承校准 route[]/anchors → 真影像上 EXACT 路线（schematic=false）；
 *   - TERRAIN：DEM 渲染场景（everest-expedition-hero-v1）未标定相机位姿 → 这里做的是
 *     「把真实 289 点路线重投影到归一化 9:16 画面」的*投影适配层*，
 *     包装为与 LiveOverlayUi 同构的地形路线结构，统一让 WXML 复用折线渲染。
 *
 * 诚实规则（Gate 约束 2/4 + 知会 8.3）：
 *   - 不造路线：折线 / marker / 峰顶全部由 RouteIndex 真实几何（x/y/demM）重投影，
 *     不读手写像素坐标、不含 `x_PCT` 数组；本层是唯一「地理 → 屏幕」映射来源。
 *   - 不冒充 EXACT：TERRAIN 无相机标定 → 输出恒 `schematic: true`（UI 只见示意路线）。
 *     投影语义明确声明：
 *       屏幕 X ← 「离开 起点→终点 弦线的横向偏差」（真实米）
 *       屏幕 Y ← DEM 绝对海拔（真实米，峰顶在上 / 大本营在下）
 *   - 不造假海拔 / GPS：marker 恒来自 `routeSampleAtProgress(idx, progress)` 真实行进点，
 *     且对外提供相同 `projectTerrainPoint` 单点投影复算（测试直达）。
 *
 * 该模块无任何运行状态，可被 dev 工具 / 页面 / 测试三方复用。
 */
import type { RouteIndex, RouteSampleAt } from "../types/expedition";
import { routeSampleAtProgress } from "./route-index";

export interface TerrainOverlaySegmentUi {
  /** 段中点 x（占画布宽 %） */
  x: number;
  /** 段中点 y（占画布高 %） */
  y: number;
  /** 段长度（占画布宽 %，按 9:16 单位换算） */
  lengthX: number;
  /** 与水平夹角（度） */
  rotateDeg: number;
  /** 该段起点/终点，用于把“已走路线”裁到当前里程。 */
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  /** 该段对应的连续路线进度范围。 */
  fromProgress: number;
  toProgress: number;
}

/** TERRAIN 指示标点（大本营 / 营地 / 峰顶） */
export interface TerrainOverlayOriginUi {
  key: string;
  x: number;
  y: number;
  /** 里程碑在 canonical route 上的连续进度，用于隐藏尚未抵达的节点。 */
  progress: number;
  /** 展示名（页面可用本地化标签覆盖；空则不显示标签） */
  label: string;
  /** 真实权威参考海拔（m） */
  elevationM: number;
  /** 真实折线累计里程（m） */
  distanceM: number;
}

/** TERRAIN 2.5D 路线 overlay（与 LiveOverlayUi 同构，便于 WXML 复用折线渲染） */
export interface TerrainProjectionBasis {
  startX: number;
  startY: number;
  dX: number;
  dY: number;
  demMin: number;
  demMax: number;
  devMin: number;
  devMax: number;
}

/** TERRAIN 静态路线几何：不包含随 progress 变化的 marker。 */
export interface TerrainRouteGeometryUi {
  /** 画布逻辑宽/高（9:16） */
  widthUnits: number;
  heightUnits: number;
  /** 折线段（全程连续，覆盖整条 South Col 路线） */
  segments: TerrainOverlaySegmentUi[];
  /** 途经标点（营地/峰顶） */
  origins: TerrainOverlayOriginUi[];
  /** 峰顶旗位置（真实线路最后一点投影） */
  summit: { x: number; y: number };
  /** 静态投影基准，供动态 marker 复用，避免每帧重算全路线域。 */
  projection: TerrainProjectionBasis;
  /** TERRAIN 无相机标定 → 恒示意（不冒充 EXACT 定位） */
  schematic: boolean;
}

/** TERRAIN 动态状态：必须按攀登运动 cadence 更新。 */
export interface TerrainDynamicStateUi {
  /** 当前进度点（真实 routeSampleAtProgress 点投影） */
  marker: { x: number; y: number };
  /** 当前 DRIVE progress（0..1，透传） */
  progress: number;
  /** 连续路线完成进度；用于动态完成态，不与静态几何 key 绑定。 */
  completedProgress: number;
  /** 当前进度以前的亮色轨迹，明确显示已经走过的路线。 */
  completedSegments: TerrainOverlaySegmentUi[];
}

/** 向后兼容的组合结果：纯引擎调用仍可一次取得完整 overlay。 */
export interface TerrainOverlayUi
  extends TerrainRouteGeometryUi,
    TerrainDynamicStateUi {}

/** 投影域（由 RouteIndex 真实数据算得，稳定可复算） */
type ProjectionFrame = TerrainProjectionBasis;

const CANVAS_W = 9;
const CANVAS_H = 16;
/** 屏幕纵向安全边距（%）：峰顶靠上（TOP），大本营留在底部面板上缘之上（BOTTOM） */
const SUMMIT_TOP_Y = 14;
// 底部信息面板从约 60% 开始；留出 4% 安全边距，起点/当前点不贴面板边缘。
const BASE_BOTTOM_Y = 56;
/** 横向偏差摆幅（屏宽 %）：dev 归一后 ±调幅 */
const DEV_AMP = 34;

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * 点到「起点→终点」直线的带符号横向偏差（真实米）。
 * 正 = 直线左（面向南峰方向），负 = 右。仅用于还原行进蛇形，不进路线数据。
 */
function lateralDeviation(
  px: number,
  py: number,
  startX: number,
  startY: number,
  dX: number,
  dY: number,
): number {
  const len = Math.hypot(dX, dY);
  if (len < 1e-6) return 0;
  return ((px - startX) * -dY + (py - startY) * dX) / len;
}

function computeFrame(routeIndex: RouteIndex): ProjectionFrame {
  const n = routeIndex.pointCount;
  const startX = routeIndex.xs[0];
  const startY = routeIndex.ys[0];
  const dX = routeIndex.xs[n - 1] - startX;
  const dY = routeIndex.ys[n - 1] - startY;

  let demMin = Infinity;
  let demMax = -Infinity;
  let devMin = Infinity;
  let devMax = -Infinity;
  for (let i = 0; i < n; i++) {
    const dem = routeIndex.demM[i];
    if (dem < demMin) demMin = dem;
    if (dem > demMax) demMax = dem;
    const dev = lateralDeviation(
      routeIndex.xs[i],
      routeIndex.ys[i],
      startX,
      startY,
      dX,
      dY,
    );
    if (dev < devMin) devMin = dev;
    if (dev > devMax) devMax = dev;
  }
  if (!(demMax > demMin)) demMax = demMin + 1;
  if (!(devMax > devMin)) devMax = devMin + 1;
  return { startX, startY, dX, dY, demMin, demMax, devMin, devMax };
}

/** 单点投影（真实 x/y/demM → 屏幕 %）。
 *  - X：横向偏差（真实米）归一 0..1 → 屏幕宽 ±DEV_AMP
 *  - Y：DEM（真实米）归一 0..1 → 屏幕高（峰顶在上）
 */
function projectPointInto(
  frame: ProjectionFrame,
  point: { x: number; y: number; demM: number },
): { x: number; y: number } {
  const dev = lateralDeviation(
    point.x,
    point.y,
    frame.startX,
    frame.startY,
    frame.dX,
    frame.dY,
  );
  const tDev = clamp01((dev - frame.devMin) / (frame.devMax - frame.devMin));
  const tDem = clamp01(
    (point.demM - frame.demMin) / (frame.demMax - frame.demMin),
  );
  return {
    x: 50 + (tDev * 2 - 1) * DEV_AMP,
    y: BASE_BOTTOM_Y - tDem * (BASE_BOTTOM_Y - SUMMIT_TOP_Y),
  };
}

function downsamplePts(
  routeIndex: RouteIndex,
  maxPoints: number,
): Array<{ x: number; y: number; demM: number; progress: number }> {
  const n = routeIndex.pointCount;
  const out: Array<{ x: number; y: number; demM: number; progress: number }> = [];
  if (n <= maxPoints) {
    for (let i = 0; i < n; i++) {
      out.push({
        x: routeIndex.xs[i],
        y: routeIndex.ys[i],
        demM: routeIndex.demM[i],
        progress: routeIndex.cumulative[i] / routeIndex.totalDistanceM,
      });
    }
    return out;
  }
  const stride = (n - 1) / Math.max(1, maxPoints - 1);
  for (let i = 0; i < n - 1; i += stride) {
    const k = Math.min(Math.floor(i + 1e-6), n - 2);
    out.push({
      x: routeIndex.xs[k],
      y: routeIndex.ys[k],
      demM: routeIndex.demM[k],
      progress: routeIndex.cumulative[k] / routeIndex.totalDistanceM,
    });
  }
  out.push({
    x: routeIndex.xs[n - 1],
    y: routeIndex.ys[n - 1],
    demM: routeIndex.demM[n - 1],
    progress: 1,
  });
  return out;
}

function buildSegs(
  points: Array<{ x: number; y: number; progress: number }>,
): TerrainOverlaySegmentUi[] {
  const segs: TerrainOverlaySegmentUi[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const ax = points[i].x;
    const ay = points[i].y;
    const bx = points[i + 1].x;
    const by = points[i + 1].y;
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy);
    if (len < 0.02) continue;
    segs.push({
      x: (ax + bx) / 2,
      y: (ay + by) / 2,
      lengthX: len,
      rotateDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
      startX: ax,
      startY: ay,
      endX: bx,
      endY: by,
      fromProgress: points[i].progress,
      toProgress: points[i + 1].progress,
    });
  }
  return segs;
}

function buildCompletedSegs(
  segments: TerrainOverlaySegmentUi[],
  progress: number,
): TerrainOverlaySegmentUi[] {
  const completed: TerrainOverlaySegmentUi[] = [];
  for (const segment of segments) {
    if (progress <= segment.fromProgress) continue;
    const ratio =
      progress >= segment.toProgress
        ? 1
        : (progress - segment.fromProgress) /
          Math.max(1e-6, segment.toProgress - segment.fromProgress);
    const endX =
      segment.startX + (segment.endX - segment.startX) * clamp01(ratio);
    const endY =
      segment.startY + (segment.endY - segment.startY) * clamp01(ratio);
    const dx = endX - segment.startX;
    const dy = endY - segment.startY;
    const length = Math.hypot(dx, dy);
    if (length < 0.02) continue;
    completed.push({
      ...segment,
      x: (segment.startX + endX) / 2,
      y: (segment.startY + endY) / 2,
      lengthX: length,
      rotateDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
      endX,
      endY,
      toProgress: Math.min(progress, segment.toProgress),
    });
  }
  return completed;
}

/**
 * 构建 TERRAIN 路线 overlay。
 *
 * @param routeIndex RouteIndex（真实 geometry；里程碑 / dem 只读）
 * @param progress DRIVE progress（0..1）
 * @param opts 可选：{ maxPoints } 折线稀疏化上限（默认 84 点 → ~200 段内）
 */
export function buildTerrainRouteGeometry(
  routeIndex: RouteIndex,
  opts?: { maxPoints?: number },
): TerrainRouteGeometryUi {
  const maxPoints = opts?.maxPoints ?? 84;
  const frame = computeFrame(routeIndex);
  const project = (p: { x: number; y: number; demM: number }) =>
    projectPointInto(frame, p);

  // 折线（全程真实点 → 屏幕）
  const rawPts = downsamplePts(routeIndex, maxPoints);
  const screenPts = rawPts.map((p) => ({ ...project(p), progress: p.progress }));
  const lastPt = screenPts[screenPts.length - 1];

  // 途经标点（营地 / 峰顶 / 起点）：全部由真实里程碑投影，绝不读像素数据
  const origins: TerrainOverlayOriginUi[] = routeIndex.milestones.map((m) => {
    const p = project({ x: m.x, y: m.y, demM: m.demM > 0 ? m.demM : m.refM });
    return {
      key: m.id,
      x: p.x,
      y: p.y,
      progress: routeIndex.totalDistanceM > 0 ? m.distanceM / routeIndex.totalDistanceM : 0,
      label: m.name,
      elevationM: Math.round(m.refM),
      distanceM: m.distanceM,
    };
  });

  return {
    widthUnits: CANVAS_W,
    heightUnits: CANVAS_H,
    segments: buildSegs(screenPts),
    origins,
    summit: { x: lastPt.x, y: lastPt.y },
    projection: frame,
    schematic: true,
  };
}

/**
 * 从已缓存的静态 geometry 派生动态状态。
 * 这里刻意不调用 downsamplePts/buildSegs：marker cadence 不应重建重型路线 geometry。
 */
export function buildTerrainDynamicState(
  routeIndex: RouteIndex,
  progress: number,
  geometry?: TerrainRouteGeometryUi,
): TerrainDynamicStateUi {
  const frame = geometry?.projection ?? computeFrame(routeIndex);
  const project = (p: { x: number; y: number; demM: number }) =>
    projectPointInto(frame, p);
  const at: RouteSampleAt = routeSampleAtProgress(routeIndex, progress);
  const marker = project({ x: at.x, y: at.y, demM: at.demM });
  const completedProgress = clamp01(progress);
  return {
    marker,
    progress: completedProgress,
    completedProgress,
    completedSegments: geometry
      ? buildCompletedSegs(geometry.segments, completedProgress)
      : [],
  };
}

/** 组合入口，保留旧 API 给现有纯逻辑测试与工具使用。 */
export function buildTerrainOverlay(
  routeIndex: RouteIndex,
  progress: number,
  opts?: { maxPoints?: number },
): TerrainOverlayUi {
  const geometry = buildTerrainRouteGeometry(routeIndex, opts);
  return {
    ...geometry,
    ...buildTerrainDynamicState(routeIndex, progress, geometry),
  };
}

/**
 * 便捷入口：单点投影复算（引擎 / 页面 / 测试三方复用；诚实映射唯一来源）。
 * 与 buildTerrainOverlay 内部使用的映射完全一致。
 */
export function projectTerrainPoint(
  routeIndex: RouteIndex,
  point: { x: number; y: number; demM: number },
): { x: number; y: number } {
  return projectPointInto(computeFrame(routeIndex), point);
}
