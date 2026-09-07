"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultStorage = defaultStorage;
exports.createMemoryStorage = createMemoryStorage;
exports.saveExplorationRecord = saveExplorationRecord;
exports.getRecords = getRecords;
exports.getExplorationStats = getExplorationStats;
const STORAGE_KEY = "geoexplorer.explorations.v1";
/* ---------------- 默认实现：wx 本地存储 ---------------- */
function defaultStorage() {
    return {
        get(key) {
            var _a;
            const w = globalThis.wx;
            try {
                const v = (_a = w === null || w === void 0 ? void 0 : w.getStorageSync) === null || _a === void 0 ? void 0 : _a.call(w, key);
                return v === undefined || v === null || v === "" ? undefined : v;
            }
            catch (_b) {
                return undefined;
            }
        },
        set(key, data) {
            var _a;
            const w = globalThis.wx;
            try {
                (_a = w === null || w === void 0 ? void 0 : w.setStorageSync) === null || _a === void 0 ? void 0 : _a.call(w, key, data);
            }
            catch (_b) {
                /* 本地存储失败不阻断探索 */
            }
        },
    };
}
/* ---------------- 内存实现（测试用） ---------------- */
function createMemoryStorage() {
    const map = new Map();
    return {
        get: (key) => map.has(key) ? map.get(key) : undefined,
        set: (key, data) => {
            map.set(key, data);
        },
    };
}
/* ---------------- 读取 / 归一化 ---------------- */
function readAll(storage) {
    const raw = Array.isArray(storage.get(STORAGE_KEY))
        ? storage.get(STORAGE_KEY)
        : [];
    return raw.map(normalizeRecord).sort((a, b) => b.updatedAt - a.updatedAt);
}
function writeAll(storage, records) {
    storage.set(STORAGE_KEY, records);
}
/** 兼容旧版记录：补齐缺省字段 */
function normalizeRecord(r) {
    return {
        id: r.id || "",
        title: r.title || "",
        emoji: r.emoji || "🏔️",
        reachElevation: Number(r.reachElevation) || 0,
        maxElevation: Number(r.maxElevation) || 0,
        completed: Boolean(r.completed),
        knowledgeIds: Array.isArray(r.knowledgeIds) ? r.knowledgeIds : [],
        durationSec: Number(r.durationSec) || 0,
        quizCorrect: Number(r.quizCorrect) || 0,
        quizTotal: Number(r.quizTotal) || 0,
        stagesVisited: Array.isArray(r.stagesVisited) ? r.stagesVisited : [],
        achievements: Array.isArray(r.achievements) ? r.achievements : [],
        updatedAt: Number(r.updatedAt) || Date.now(),
    };
}
/** 记录一次探索进展（按统一“更优优先”规则：海拔更高者胜，其次已完成，其次更新时间新） */
function saveExplorationRecord(input, storage = defaultStorage()) {
    const records = readAll(storage);
    const index = records.findIndex((r) => r.id === input.exploration.id);
    const record = normalizeRecord({
        id: input.exploration.id,
        title: input.exploration.title,
        emoji: input.exploration.emoji,
        reachElevation: input.reachElevation,
        maxElevation: input.exploration.maxElevation,
        completed: input.completed,
        knowledgeIds: input.knowledgeIds,
        durationSec: input.durationSec || 0,
        quizCorrect: input.quizCorrect || 0,
        quizTotal: input.quizTotal || 0,
        stagesVisited: input.stagesVisited || [],
        achievements: input.achievements || [],
        updatedAt: Date.now(),
    });
    if (index >= 0) {
        const prev = records[index];
        // 更优者胜：先比海拔（更高），再比是否完成（同一海拔下已登顶者优）
        const prevWins = prev.reachElevation > record.reachElevation ||
            (prev.reachElevation === record.reachElevation &&
                prev.completed >= record.completed);
        records[index] = prevWins ? prev : record;
    }
    else {
        records.push(record);
    }
    writeAll(storage, records);
    return record;
}
function getRecords(storage = defaultStorage()) {
    return readAll(storage);
}
function getExplorationStats(storage = defaultStorage()) {
    const records = readAll(storage);
    return {
        completed: records.filter((r) => r.completed).length,
        totalFound: records.reduce((sum, r) => sum + r.knowledgeIds.length, 0),
        totalDistanceM: records.reduce((sum, r) => sum + r.reachElevation, 0),
    };
}
