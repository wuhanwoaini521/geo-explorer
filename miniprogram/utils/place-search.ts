/**
 * 地点搜索 / 筛选纯函数（Node 可单测，无 wx 依赖）。
 * 供地图页图鉴、首页分类入口复用，保证「搜索=一处逻辑」。
 */
import type { Place, PlaceType } from "../types/models";

/** 关键词匹配字段：中文名 / 英文名 / 国家 / 区域 / 标签 */
function matchQuery(place: Place, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    place.name,
    place.nameEn,
    place.country,
    place.region,
    place.shortDescription,
    ...place.tags,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

/** 按关键词过滤（空关键词返回全部引用） */
export function searchPlaces(places: Place[], query: string): Place[] {
  const q = query.trim();
  if (!q) return places;
  return places.filter((p) => matchQuery(p, q));
}

/** 按类型过滤（"全部" 或未注册类型返回全部引用） */
export function filterByType(
  places: Place[],
  type: PlaceType | "all",
): Place[] {
  if (type === "all") return places;
  return places.filter((p) => p.type === type);
}

/** 搜索 + 类型组合筛选（UI 常用入口） */
export function queryPlaces(
  places: Place[],
  query: string,
  type: PlaceType | "all",
): Place[] {
  return searchPlaces(filterByType(places, type), query);
}
