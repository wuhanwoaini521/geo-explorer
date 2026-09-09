"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPendingTypeFilter = setPendingTypeFilter;
exports.consumeTypeFilter = consumeTypeFilter;
exports.setPendingSearchQuery = setPendingSearchQuery;
exports.consumeSearchQuery = consumeSearchQuery;
let pending = null;
let pendingQuery = null;
function setPendingTypeFilter(type) {
    pending = type;
}
/** 取出并清除待消费的筛选类型；无待消费时返回 null */
function consumeTypeFilter() {
    const value = pending;
    pending = null;
    return value;
}
function setPendingSearchQuery(query) {
    pendingQuery = query.trim();
}
/** 取出并清除待消费的图鉴关键词；空关键词视为无待处理项。 */
function consumeSearchQuery() {
    const value = pendingQuery;
    pendingQuery = null;
    return value || null;
}
