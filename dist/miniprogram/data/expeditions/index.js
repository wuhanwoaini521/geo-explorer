"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpeditionById = getExpeditionById;
exports.expeditionRegistryCount = expeditionRegistryCount;
const everest_1 = require("./everest");
const REGISTRY = [everest_1.EVEREST_EXPEDITION];
/** 按 id 获取带有 V2 附件的探索（无附件返回 undefined → 走旧海拔轴） */
function getExpeditionById(id) {
    return REGISTRY.find((x) => x.id === id);
}
/** 当前注册的 Expedition 数量（供测试/诊断） */
function expeditionRegistryCount() {
    return REGISTRY.length;
}
