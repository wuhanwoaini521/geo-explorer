"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomDiscovery = randomDiscovery;
/**
 * 「你知道吗」随机抽取（纯函数，可单测）。
 * 尽量避开上一次的条目，保证连续刷新有新内容。
 */
const discoveries_1 = require("../data/discoveries");
/** 随机抽一条；提供 excludeId 时从其余条目中抽取（总数 ≤1 时忽略排除） */
function randomDiscovery(excludeId) {
    const pool = excludeId && discoveries_1.DISCOVERIES.length > 1
        ? discoveries_1.DISCOVERIES.filter((d) => d.id !== excludeId)
        : discoveries_1.DISCOVERIES;
    return pool[Math.floor(Math.random() * pool.length)];
}
