"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 👤 我的页 —— 探索记录与统计（MVP：本地存储数据）。
 * 挑战统计来自 quiz-store（按难度最佳成绩 + 累计次数）。
 */
const exploration_store_1 = require("../../services/exploration-store");
const favorites_store_1 = require("../../services/favorites-store");
const places_1 = require("../../data/places");
const places_2 = require("../../data/places");
const quiz_store_1 = require("../../services/quiz-store");
const index_1 = require("../../data/explorations/index");
/** 难度星级文案（与挑战页 ★~★★★ 对应） */
function difficultyStars(d) {
    if (d <= 1)
        return "★";
    if (d === 2)
        return "★★";
    return "★★★";
}
Page({
    data: {
        stats: { completed: 0, totalFound: 0 },
        records: [],
        empty: false,
        quiz: { totalPlays: 0, levels: [] },
        quizEmpty: true,
        favoritesList: [],
        favoritesEmpty: true,
    },
    onShow() {
        var _a, _b, _c, _d;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ selected: 3 });
        (_d = (_c = this.getTabBar) === null || _c === void 0 ? void 0 : _c.call(this)) === null || _d === void 0 ? void 0 : _d.setData({ hidden: false });
        const records = (0, exploration_store_1.getRecords)().map((r) => {
            var _a, _b;
            const ex = index_1.EXPLORATIONS.find((e) => e.id === r.id);
            return {
                id: r.id,
                emoji: r.emoji,
                title: r.title,
                completed: r.completed,
                reachElevation: r.reachElevation,
                maxElevation: r.maxElevation,
                unitText: (_b = (_a = ex === null || ex === void 0 ? void 0 : ex.ui) === null || _a === void 0 ? void 0 : _a.axisUnit) !== null && _b !== void 0 ? _b : "m",
                knowledgeCount: r.knowledgeIds.length,
                pct: Math.round((r.reachElevation / r.maxElevation) * 100),
            };
        });
        const best = (0, quiz_store_1.getQuizBest)();
        const summary = (0, quiz_store_1.summarizeQuizBest)(best);
        const quizLevels = summary.levels.map((l) => ({
            ...l,
            stars: difficultyStars(l.difficulty),
            bestText: `最佳 ${l.bestCorrect}/${l.bestTotal} · ${Math.round(l.bestRate * 100)}%`,
        }));
        this.setData({
            stats: (0, exploration_store_1.getExplorationStats)(),
            records,
            empty: records.length === 0,
            quiz: { totalPlays: summary.totalPlays, levels: quizLevels },
            quizEmpty: quizLevels.length === 0,
            favoritesList: favorites_store_1.favorites.getPlaces(places_1.PLACES).map((p) => ({
                id: p.id,
                name: p.name,
                emoji: p.emoji,
                typeLabel: places_2.PLACE_TYPE_LABEL[p.type],
                shortDescription: p.shortDescription,
            })),
            favoritesEmpty: favorites_store_1.favorites.count() === 0,
        });
    },
    /** 打开收藏的地点详情 */
    onOpenFavorite(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        wx.navigateTo({ url: `/pages/place/index?id=${id}` });
    },
    /** 从列表快速取消收藏 */
    onRemoveFavorite(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        favorites_store_1.favorites.toggle(id);
        this.onShow();
    },
    /** 数据来源与许可页 */
    onOpenCredits() {
        wx.navigateTo({ url: "/pages/credits/index" });
    },
    onClear() {
        wx.showModal({
            title: "清空探索记录",
            content: "将删除本地保存的全部进度记录，确定？",
            confirmText: "清空",
            success: (res) => {
                if (res.confirm) {
                    wx.clearStorageSync();
                    this.onShow();
                }
            },
        });
    },
});
