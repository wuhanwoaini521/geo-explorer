"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setPendingTypeFilter = setPendingTypeFilter;
exports.consumeTypeFilter = consumeTypeFilter;
let pending = null;
function setPendingTypeFilter(type) {
    pending = type;
}
/** 取出并清除待消费的筛选类型；无待消费时返回 null */
function consumeTypeFilter() {
    const value = pending;
    pending = null;
    return value;
}
