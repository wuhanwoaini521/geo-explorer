/**
 * 轻量 UI 状态总线 —— 跨 tab 传递筛选参数。
 * 小程序 switchTab 不能携带 query，分类入口（首页 → 地图页图鉴）
 * 通过此模块级状态传递，目标页 onShow 消费后清除。
 */
import type { PlaceType } from "../types/models";

let pendingTypeFilter: PlaceType | "all" = "all";

export function setPendingTypeFilter(type: PlaceType | "all"): void {
  pendingTypeFilter = type;
}

/** 取出并清除待消费的筛选类型 */
export function consumeTypeFilter(): PlaceType | "all" {
  const value = pendingTypeFilter;
  pendingTypeFilter = "all";
  return value;
}
