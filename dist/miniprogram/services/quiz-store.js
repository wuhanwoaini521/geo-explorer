"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeQuizBest = mergeQuizBest;
exports.saveQuizResult = saveQuizResult;
exports.getQuizBest = getQuizBest;
exports.summarizeQuizBest = summarizeQuizBest;
/**
 * 挑战（Quiz）最佳成绩 —— 小型持久化层。
 * 按难度分别记录最佳成绩：正确率优先，其次正确数；另计挑战次数。
 * 存储实现可注入（与 exploration-store 同一套 StorageLike 抽象），
 * Node 环境（vitest）可直接单测；后续切服务端只需替换默认实现。
 */
const exploration_store_1 = require("./exploration-store");
const STORAGE_KEY = "geoexplorer.quiz.best.v1";
/* ---------------- 归一化 ---------------- */
function normalizeRecord(raw) {
    const bestTotal = Math.max(0, Number(raw.bestTotal) || 0);
    const bestCorrect = Math.min(bestTotal, Math.max(0, Number(raw.bestCorrect) || 0));
    return {
        difficulty: Number(raw.difficulty) || 0,
        bestCorrect,
        bestTotal,
        bestRate: bestTotal > 0 ? bestCorrect / bestTotal : 0,
        plays: Math.max(0, Number(raw.plays) || 0),
        updatedAt: Number(raw.updatedAt) || 0,
    };
}
/* ---------------- 纯合并逻辑（可单测） ---------------- */
/**
 * “更优者胜”：正确率更高者胜；同率之下正确数更多者胜。
 * plays 永远累加。
 */
function mergeQuizBest(prev, next) {
    const incoming = normalizeRecord({
        difficulty: next.difficulty,
        bestCorrect: next.correct,
        bestTotal: next.total,
        plays: 1,
        updatedAt: Date.now(),
    });
    if (!prev)
        return incoming;
    const prevWins = prev.bestRate > incoming.bestRate ||
        (prev.bestRate === incoming.bestRate &&
            prev.bestCorrect >= incoming.bestCorrect);
    return {
        ...incoming,
        bestCorrect: prevWins ? prev.bestCorrect : incoming.bestCorrect,
        bestTotal: prevWins ? prev.bestTotal : incoming.bestTotal,
        bestRate: prevWins ? prev.bestRate : incoming.bestRate,
        plays: prev.plays + 1,
        updatedAt: Math.max(prev.updatedAt, incoming.updatedAt),
    };
}
/* ---------------- 读取 / 写入 ---------------- */
function readAll(storage) {
    const raw = storage.get(STORAGE_KEY);
    if (!raw || typeof raw !== "object")
        return {};
    const out = {};
    for (const key of Object.keys(raw)) {
        const difficulty = Number(key);
        if (!difficulty)
            continue;
        out[difficulty] = normalizeRecord(raw[difficulty]);
    }
    return out;
}
/** 记录一次挑战成绩（内部合并最佳，返回该难度最新记录） */
function saveQuizResult(input, storage = (0, exploration_store_1.defaultStorage)()) {
    const all = readAll(storage);
    const merged = mergeQuizBest(all[input.difficulty], input);
    all[input.difficulty] = merged;
    storage.set(STORAGE_KEY, all);
    return merged;
}
/** 读取全部难度的最佳成绩（无记录的难度不出现在结果里） */
function getQuizBest(storage = (0, exploration_store_1.defaultStorage)()) {
    return readAll(storage);
}
/**
 * 由最佳成绩 Map 汇总出「我的」页展示数据。
 * 纯函数：只读入参，不落盘。
 */
function summarizeQuizBest(best) {
    const levels = Object.keys(best)
        .map(Number)
        .filter((d) => d > 0 && best[d])
        .sort((a, b) => a - b)
        .map((difficulty) => {
        const rec = best[difficulty];
        return {
            difficulty,
            bestCorrect: rec.bestCorrect,
            bestTotal: rec.bestTotal,
            bestRate: rec.bestRate,
            plays: rec.plays,
        };
    });
    return {
        totalPlays: levels.reduce((sum, l) => sum + l.plays, 0),
        levels,
    };
}
