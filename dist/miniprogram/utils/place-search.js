"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchPlaces = searchPlaces;
exports.filterByType = filterByType;
exports.queryPlaces = queryPlaces;
/** 关键词匹配字段：中文名 / 英文名 / 国家 / 区域 / 标签 */
function matchQuery(place, query) {
    const q = query.trim().toLowerCase();
    if (!q)
        return true;
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
function searchPlaces(places, query) {
    const q = query.trim();
    if (!q)
        return places;
    return places.filter((p) => matchQuery(p, q));
}
/** 按类型过滤（"全部" 或未注册类型返回全部引用） */
function filterByType(places, type) {
    if (type === "all")
        return places;
    return places.filter((p) => p.type === type);
}
/** 搜索 + 类型组合筛选（UI 常用入口） */
function queryPlaces(places, query, type) {
    return searchPlaces(filterByType(places, type), query);
}
