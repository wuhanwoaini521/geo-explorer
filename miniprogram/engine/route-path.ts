/**
 * Terrain-Conforming Route —— 山体路径投影层（纯逻辑，可 Node 单测；无 wx 依赖）。
 *
 * 设计前提（本模块存在的理由）：
 *   路线属于山体，不属于屏幕。路线不是「把 waypoint 连起来」，而是先在真实山体上
 *   定出一条连续路径（RouteSpine），waypoint 只是这条路经上的地理节点。
 *
 * 因此本模块只做三件事：
 *   1. projectCoverPoint：图像归一化坐标 → 容器归一化坐标的 aspectFill（cover）投影。
 *      cover 会裁剪，简单 x*width 会漂移；这里显式还原裁剪偏移，是「地理 → 屏幕」
 *      的唯一换算入口。
 *   2. buildRoutePathGeometry：把 RouteSpine 用 Catmull-Rom 平滑后**按 progress 均匀
 *      重采样**，产出渲染层直接可用的折线段（含透视：近端更粗更亮、远端更细更淡）。
 *      均匀 progress 采样意味着第 k 段恰好覆盖 progress ∈ [k/N, (k+1)/N]，
 *      于是「已走路线」= floor(progress·N)，不需要第二套几何。
 *   3. pointOnPath / segmentsCovered：路线、waypoint、explorer marker 全部走同一个
 *      投影函数（严禁各算各的），保证 marker 真的沿路径移动、waypoint 真的吸附在路径上。
 *
 * 坐标约定：
 *   - spine 与 cover 的输入是**图像归一化坐标**（0..1，原图 natural 空间，左上原点），
 *     与设备无关；不写死 px、不为每种屏幕手写坐标。
 *   - 输出是**容器归一化坐标**（0..1，相对承载路线的视口），渲染层用 % 定位。
 */
import type {
  RouteSpinePoint,
  RouteCoverFrame,
  RouteSegmentSample,
} from "../types/expedition";
import { clamp } from "../utils/format";

/** 默认分段数：约 72 段足以让折线在视觉上连续（每段 ≈1.4% 路程）。 */
export const DEFAULT_ROUTE_SEGMENTS = 72;

/** 折线渲染规格（rpx 与 0-1 透明度；透视由 nearness 插值得到） */
export interface RouteStrokeSpec {
  widthNear: number;
  widthFar: number;
  opacityNear: number;
  opacityFar: number;
}

export const DEFAULT_ROUTE_STROKE: RouteStrokeSpec = {
  widthNear: 11,
  widthFar: 4,
  opacityNear: 0.94,
  opacityFar: 0.58,
};

/** 渲染层一段折线的可渲染描述（style 直接进 WXML） */
export interface RouteSegmentUi {
  id: string;
  /** progress 区间（用于「已走」判定与测试复算） */
  progress: number;
  endProgress: number;
  /** 是否为 marker 当前所在（未走满）段——用于轻微流动动画 */
  active: boolean;
  style: string;
}

/** 一条山体路径的投影几何（静态；只依赖 spine + cover + 容器宽高比） */
export interface RoutePathGeometry {
  segmentCount: number;
  containerAspect: number;
  /** 均匀 progress 采样点（0..1，含两端）：marker 与 waypoint 的唯一投影来源 */
  samples: RouteSegmentSample[];
  segments: RouteSegmentUi[];
}

function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* 1 · aspectFill（cover）投影                                          */
/* ------------------------------------------------------------------ */

/**
 * 图像归一化坐标 → 容器归一化坐标（object-fit: cover 语义）。
 *
 * cover：等比缩放至刚好覆盖容器，超出部分被裁掉；object-position 决定裁剪窗口
 * 在图像内的位置（p% 表示图像 p 处与容器 p 处对齐）。竖屏手机上图像通常比容器
 * 更宽 → 只发生水平裁剪；横屏/平板则可能发生垂直裁剪。两者都必须正确处理，
 * 否则同一条路线在不同机型上会横向或纵向漂移。
 */
export function projectCoverPoint(
  point: { x: number; y: number },
  frame: RouteCoverFrame,
): { x: number; y: number } {
  const imageAspect = frame.imageAspect > 0 ? frame.imageAspect : 1;
  const containerAspect =
    frame.containerAspect > 0 ? frame.containerAspect : imageAspect;
  const focusX = clamp01(frame.focusX ?? 0.5);
  const focusY = clamp01(frame.focusY ?? 0.5);
  const ratio = imageAspect / containerAspect;
  // 图像渲染后相对容器的尺寸（1 = 与容器等宽/等高）
  const renderedWidth = ratio > 1 ? ratio : 1;
  const renderedHeight = ratio > 1 ? 1 : 1 / ratio;
  const offsetX = -(renderedWidth - 1) * focusX;
  const offsetY = -(renderedHeight - 1) * focusY;
  return {
    x: point.x * renderedWidth + offsetX,
    y: point.y * renderedHeight + offsetY,
  };
}

/* ------------------------------------------------------------------ */
/* 2 · 山体路径（Catmull-Rom，按 progress 均匀重采样）                    */
/* ------------------------------------------------------------------ */

function catmullRom(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const t2 = t * t;
  const t3 = t2 * t;
  const axis = (a: number, b: number, c: number, d: number): number =>
    0.5 *
    (2 * b +
      (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t2 +
      (-a + 3 * b - 3 * c + d) * t3);
  return { x: axis(p0.x, p1.x, p2.x, p3.x), y: axis(p0.y, p1.y, p2.y, p3.y) };
}

/** 在图像归一化坐标里，按 progress 在控制点之间求路径点（Catmull-Rom 穿过控制点）。 */
export function splinePointAtProgress(
  spine: RouteSpinePoint[],
  progress: number,
): { x: number; y: number } {
  const n = spine.length;
  if (n === 0) return { x: 0.5, y: 0.5 };
  if (n === 1) return { x: spine[0].x, y: spine[0].y };
  const p = clamp01(progress);
  if (p <= spine[0].progress) return { x: spine[0].x, y: spine[0].y };
  if (p >= spine[n - 1].progress) {
    return { x: spine[n - 1].x, y: spine[n - 1].y };
  }
  let i = 0;
  while (i < n - 2 && spine[i + 1].progress < p) i += 1;
  const a = spine[i];
  const b = spine[i + 1];
  const span = b.progress - a.progress;
  const local = span > 1e-9 ? (p - a.progress) / span : 0;
  const p0 = spine[i - 1] ?? a;
  const p3 = spine[i + 2] ?? b;
  return catmullRom(p0, a, b, p3, clamp(local, 0, 1));
}

/** 段样式：旋转角与长度都在「容器宽度 %」这一统一尺度里计算，避免纵横比造成断口。 */
function segmentStyle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  containerAspect: number,
  stroke: RouteStrokeSpec,
  nearness: number,
): { style: string; length: number } {
  const dx = b.x - a.x;
  const dy = (b.y - a.y) / (containerAspect > 0 ? containerAspect : 1);
  const length = Math.hypot(dx, dy);
  const width = round2(
    stroke.widthFar + (stroke.widthNear - stroke.widthFar) * nearness,
  );
  const opacity = round2(
    stroke.opacityFar + (stroke.opacityNear - stroke.opacityFar) * nearness,
  );
  const rotate = round2((Math.atan2(dy, dx) * 180) / Math.PI);
  const style =
    `left:${round2((a.x + b.x) / 2)}%;top:${round2((a.y + b.y) / 2)}%;` +
    `width:${round2(length)}%;height:${width}rpx;` +
    `margin:${-width / 2}rpx 0 0 ${-width / 2}rpx;` +
    `transform:rotate(${rotate}deg);opacity:${opacity};`;
  return { style, length };
}

/**
 * 构建山体路径几何。
 *
 * @param spine            图像归一化控制点（progress 严格升序；必须覆盖全部里程碑进度）
 * @param cover            承载路线的背景资产投影参数
 * @param containerAspect  容器宽/高（viewport）
 * @param segmentCount     分段数（默认 72）
 * @param stroke           线宽/透明度透视规格
 */
export function buildRoutePathGeometry(
  spine: RouteSpinePoint[],
  cover: RouteCoverFrame,
  containerAspect: number,
  segmentCount: number = DEFAULT_ROUTE_SEGMENTS,
  stroke: RouteStrokeSpec = DEFAULT_ROUTE_STROKE,
): RoutePathGeometry {
  const aspect = containerAspect > 0 ? containerAspect : cover.imageAspect;
  const count = Math.max(2, Math.round(segmentCount));
  const samples: RouteSegmentSample[] = [];
  for (let k = 0; k <= count; k += 1) {
    const progress = k / count;
    const imagePoint = splinePointAtProgress(spine, progress);
    const screenPoint = projectCoverPoint(imagePoint, {
      ...cover,
      containerAspect: aspect,
    });
    samples.push({
      progress,
      x: round2(screenPoint.x * 100),
      y: round2(screenPoint.y * 100),
    });
  }
  const segments: RouteSegmentUi[] = [];
  for (let k = 0; k < count; k += 1) {
    const a = samples[k];
    const b = samples[k + 1];
    const nearness = 1 - (a.progress + b.progress) / 2;
    const { style, length } = segmentStyle(a, b, aspect, stroke, nearness);
    // 退化段（重采样后两点几乎重合）不渲染，但保留 progress 区间语义
    if (length < 0.02) continue;
    segments.push({
      id: `seg-${k}`,
      progress: a.progress,
      endProgress: b.progress,
      active: false,
      style,
    });
  }
  return { segmentCount: count, containerAspect: aspect, samples, segments };
}

/* ------------------------------------------------------------------ */
/* 3 · 统一投影：路线 / waypoint / marker 共用同一函数                    */
/* ------------------------------------------------------------------ */

/**
 * 路径上任意 progress 处的容器归一化坐标（%）。
 * 采样点按 progress 均匀分布，因此可直接索引，无需二分。
 */
export function pointOnPath(
  geometry: RoutePathGeometry,
  progress: number,
): { x: number; y: number } {
  const samples = geometry.samples;
  const n = samples.length - 1;
  if (n <= 0) return { x: 50, y: 50 };
  const u = clamp01(progress) * n;
  const i = Math.min(n - 1, Math.floor(u));
  const t = u - i;
  const a = samples[i];
  const b = samples[i + 1];
  return { x: round2(a.x + (b.x - a.x) * t), y: round2(a.y + (b.y - a.y) * t) };
}

/**
 * 已走路线（含当前段的局部裁剪），供渲染层直接覆盖在基础折线上。
 * 最后一段（marker 所在段）标记 active，用于极轻微的流动感。
 */
export function segmentsCovered(
  geometry: RoutePathGeometry,
  progress: number,
  stroke: RouteStrokeSpec = DEFAULT_ROUTE_STROKE,
): RouteSegmentUi[] {
  const p = clamp01(progress);
  const out: RouteSegmentUi[] = [];
  for (const segment of geometry.segments) {
    if (segment.progress >= p) break;
    if (segment.endProgress <= p) {
      out.push({ ...segment, active: false });
      continue;
    }
    // 当前段：只画到 marker，位置由同一批采样点插值
    const a = pointOnPath(geometry, segment.progress);
    const b = pointOnPath(geometry, p);
    const nearness = 1 - (segment.progress + p) / 2;
    const { style, length } = segmentStyle(
      a,
      b,
      geometry.containerAspect,
      stroke,
      nearness,
    );
    if (length < 0.02) continue;
    out.push({
      id: segment.id,
      progress: segment.progress,
      endProgress: p,
      active: true,
      style,
    });
  }
  return out;
}

/**
 * 里程碑（waypoint）吸附检查：真实路线里程碑的 progress 必须落在山体控制点上，
 * 否则「先定路径、再吸附 waypoint」的约束被破坏。测试与 dev 工具使用。
 */
export function spineMissesMilestones(
  spine: RouteSpinePoint[],
  milestoneProgress: number[],
  epsilon = 1e-6,
): number[] {
  const known = spine.map((p) => p.progress);
  return milestoneProgress.filter(
    (progress) => !known.some((v) => Math.abs(v - progress) <= epsilon),
  );
}
