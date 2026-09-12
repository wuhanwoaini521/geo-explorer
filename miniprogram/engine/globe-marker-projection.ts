/**
 * 球面标记 → 容器百分比坐标换算（纯函数，可在 Node 单测）。
 *
 * 为什么单独抽出来：这段换算原先内联在 canvas 的投影回调闭包里，无法测试，
 * 结果 X/Y 用了两个不同的归一化基准（宽度用画布、高度用整屏），标记整体脱离
 * 球面飘到太空里，而 499 条测试一条都没拦住。
 *
 * 约束（AGENTS.md §7）：地球上的地点标记必须与渲染器投影坐标同步。
 * 标记层铺满页面容器，渲染器返回的却是**画布内**坐标，因此换算必须：
 *   1. 先叠加画布在容器内的偏移，把坐标变回容器坐标系；
 *   2. X/Y 使用**同一个**基准 —— 容器尺寸，而不是一轴用容器、一轴用整屏。
 */
export interface MarkerScreenView {
  /** 容器宽度（px）：标记层定位所依据的宽度 */
  width: number;
  /** 容器高度（px）：标记层定位所依据的高度 */
  height: number;
  /** 画布在容器内的横向偏移（px） */
  offsetX: number;
  /** 画布在容器内的纵向偏移（px） */
  offsetY: number;
}

export interface MarkerScreenPercent {
  /** 供 style.left 消费的百分比 */
  left: number;
  /** 供 style.top 消费的百分比 */
  top: number;
}

/** 画布内坐标 → 容器百分比坐标。宽高为 0 时按 1 处理，避免除零产生 Infinity。 */
export function markerScreenPercent(
  screenX: number,
  screenY: number,
  view: MarkerScreenView,
): MarkerScreenPercent {
  const width = Math.max(1, view.width);
  const height = Math.max(1, view.height);
  return {
    left: ((screenX + view.offsetX) / width) * 100,
    top: ((screenY + view.offsetY) / height) * 100,
  };
}
