/**
 * Gate 3.4 · 相机派生层（纯函数，无 wx / 页面依赖）。
 *
 * 单一真相源规则：
 *   - 唯一输入 = CameraConfig（数据层静态配置） + 某一路线 progress；
 *   - 相机没有任何持久状态 / 第二套 progress；
 *   - 相机只是「用户所在位置 → 视觉呈现参数」的纯派生映射；
 *   - 段边界默认平滑过渡（zoom 在相邻段之间插值而非跳变）。
 *
 * UI 消费：
 *   - segmentIndex / asset / zoom / offsetX / focus：渲染当前相机；
 *   - blendToNext（0..1）：按需交叉淡化到下一段资源（页面可只做 opacity）。
 */
import type { CameraSegment } from "../types/expedition";
import { clamp } from "../utils/format";

/** 相机自一派生的一帧（全部由配置 + progress 求得） */
export interface ExpeditionCameraFrame {
  /** 0-1 全局路线进度（= 输入） */
  progress: number;
  /** 命中相机段索引（0..n-1） */
  segmentIndex: number;
  /** 当前段 id */
  segmentId: string;
  /** 当前段资源 key（如 everest-expedition-hero-v1） */
  asset: string;
  /** 当前段内 0-1 局部进度（插值基准） */
  segmentLocal: number;
  /** 期望缩放（≥1；由段 scale 在边界间平滑插值，非跳变） */
  zoom: number;
  /** 视线水平偏移（0.5 中心） */
  offsetX: number;
  /** 视线垂直偏移（0.5 中心） */
  offsetY: number;
  /** 聚焦点（画面注视点） */
  focus: { x: number; y: number } | null;
  /** 下一段的交叉淡化权重 0..1（1 = 完全离开当前段；无下一段 = 1） */
  blendNext: number;
  /** 下一段 id（供 UI 预加载淡入；无则 null） */
  nextSegmentId: string | null;
}

/** 空相机（无配置/无段位）：返回不可见帧（segmentIndex=-1，UI 不渲染） */
export function emptyCameraFrame(): ExpeditionCameraFrame {
  return {
    progress: 0,
    segmentIndex: -1,
    segmentId: "",
    asset: "",
    segmentLocal: 0,
    zoom: 1,
    offsetX: 0.5,
    offsetY: 0.5,
    focus: null,
    blendNext: 1,
    nextSegmentId: null,
  };
}

function easeLocal(t: number): number {
  const x = clamp(t, 0, 1);
  // smoothstep：段内插值更「推进」，避免回头跳变
  return x * x * (3 - 2 * x);
}

/**
 * 由相机配置 + progress 派生相机帧（默认值 `scale=1 / offsetX=0.5`）。
 * 段边界处的 zoom 取「前一段 scale → 本段 scale」的片段内平滑插值，
 * 保证跨段 zoom 连续（不跳变）。
 */
export function cameraFrameAt(
  camera: { segments: CameraSegment[] } | undefined | null,
  progress: number,
): ExpeditionCameraFrame {
  if (!camera || !camera.segments || camera.segments.length === 0) {
    return emptyCameraFrame();
  }
  const segs = camera.segments;
  const p = clamp(progress, 0, 1);
  // 命中段落（顺序；端点归属于到达该边界的下一段，终点归属最后段）
  let si = 0;
  for (let i = 0; i < segs.length; i++) {
    si = i;
    if (p < segs[i].toProgress - 1e-6) break;
  }
  const seg = segs[si];
  const span = seg.toProgress - seg.fromProgress;
  const local = span > 0 ? clamp((p - seg.fromProgress) / span, 0, 1) : 1;
  const eased = easeLocal(local);
  // 段间插值所有镜头参数：边界处沿用上一段末值，避免镜头 pop。
  const prevSeg = si > 0 ? segs[si - 1] : undefined;
  const prevScale = prevSeg?.scale ?? seg.scale ?? 1;
  const curScale = seg.scale ?? 1;
  const zoom = prevScale + (curScale - prevScale) * eased;
  const prevOffsetX = seg.fromOffsetX ?? prevSeg?.offsetX ?? 0.5;
  const curOffsetX = seg.offsetX ?? 0.5;
  const prevOffsetY = seg.fromOffsetY ?? prevSeg?.offsetY ?? 0.5;
  const curOffsetY = seg.offsetY ?? 0.5;
  const offsetX = prevOffsetX + (curOffsetX - prevOffsetX) * eased;
  const offsetY = prevOffsetY + (curOffsetY - prevOffsetY) * eased;
  const prevFocus = seg.fromFocus ?? prevSeg?.focus ?? { x: 0.5, y: 0.5 };
  const curFocus = seg.focus ?? { x: 0.5, y: 0.5 };
  const focus = {
    x: prevFocus.x + (curFocus.x - prevFocus.x) * eased,
    y: prevFocus.y + (curFocus.y - prevFocus.y) * eased,
  };
  return {
    progress: p,
    segmentIndex: si,
    segmentId: seg.id,
    asset: seg.asset,
    segmentLocal: local,
    zoom: zoom < 1 ? 1 : zoom,
    offsetX,
    offsetY,
    focus,
    blendNext: local,
    nextSegmentId: si + 1 < segs.length ? segs[si + 1].id : null,
  };
}
