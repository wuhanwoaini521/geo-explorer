/**
 * 轻量 UI 状态总线 —— 跨 tab 传递筛选参数。
 * 小程序 switchTab 不能携带 query，分类入口（首页 → 地图页图鉴）
 * 通过此模块级状态传递；未显式设置时 consume 返回 null（目标页保持现状）。
 */
import type { PlaceType } from "../types/models";

let pending: PlaceType | "all" | null = null;

export function setPendingTypeFilter(type: PlaceType | "all"): void {
  pending = type;
}

/** 取出并清除待消费的筛选类型；无待消费时返回 null */
export function consumeTypeFilter(): PlaceType | "all" | null {
  const value = pending;
  pending = null;
  return value;
}
