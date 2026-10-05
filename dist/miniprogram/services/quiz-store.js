"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeQuizBest = mergeQuizBest;
exports.saveQuizResult = saveQuizResult;
exports.getQuizAttemptHistory = getQuizAttemptHistory;
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
    var _a, _b;
    const all = readAll(storage);
    const merged = mergeQuizBest(all[input.difficulty], input);
    all[input.difficulty] = merged;
    storage.set(STORAGE_KEY, all);
    const attempts = getQuizAttemptHistory(storage);
    const questionIds = Array.from(new Set(((_a = input.questionIds) !== null && _a !== void 0 ? _a : []).filter(Boolean)));
    const correctQuestionIds = Array.from(new Set(((_b = input.correctQuestionIds) !== null && _b !== void 0 ? _b : []).filter((id) => questionIds.includes(id))));
    attempts.push({
        difficulty: Math.max(1, Math.min(3, Number(input.difficulty) || 1)),
        correct: Math.max(0, Math.min(Number(input.total) || 0, Number(input.correct) || 0)),
        total: Math.max(0, Number(input.total) || 0),
        completedAt: Number(input.completedAt) || Date.now(),
        questionIds,
        correctQuestionIds,
    });
    storage.set(ATTEMPT_STORAGE_KEY, attempts.slice(-MAX_ATTEMPT_HISTORY));
    return merged;
}
const ATTEMPT_STORAGE_KEY = "geoexplorer.quiz.attempts.v1";
const MAX_ATTEMPT_HISTORY = 120;
/** Read recent completed runs; older installations simply return an empty history. */
function getQuizAttemptHistory(storage = (0, exploration_store_1.defaultStorage)()) {
    const raw = storage.get(ATTEMPT_STORAGE_KEY);
    if (!Array.isArray(raw))
        return [];
    return raw
        .filter((item) => Boolean(item && typeof item === "object"))
        .map((item) => {
        const questionIds = Array.isArray(item.questionIds)
            ? Array.from(new Set(item.questionIds.filter((id) => typeof id === "string" && Boolean(id))))
            : [];
        const correctQuestionIds = Array.isArray(item.correctQuestionIds)
            ? Array.from(new Set(item.correctQuestionIds.filter((id) => typeof id === "string" && questionIds.includes(id))))
            : [];
        const total = Math.max(0, Number(item.total) || 0);
        return {
            difficulty: Math.max(1, Math.min(3, Number(item.difficulty) || 1)),
            correct: Math.max(0, Math.min(total, Number(item.correct) || 0)),
            total,
            completedAt: Math.max(0, Number(item.completedAt) || 0),
            questionIds,
            correctQuestionIds,
        };
    })
        .slice(-MAX_ATTEMPT_HISTORY);
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
