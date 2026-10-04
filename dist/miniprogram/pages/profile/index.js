"use strict";
var _a;
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
const knowledge_1 = require("../../data/knowledge");
const expedition_observation_1 = require("../../engine/expedition-observation");
const world_manifests_1 = require("../../data/media/world-manifests");
const knowledge_link_1 = require("../../utils/knowledge-link");
const knowledge_progress_1 = require("../../services/knowledge-progress");
const layout_1 = require("../../utils/layout");
const BADGE_CONFIG = [
    { id: "everest", title: "登顶者", subtitle: "珠穆朗玛峰", emoji: "▲", placeId: "p-everest" },
    { id: "mariana", title: "深海探索", subtitle: "马里亚纳海沟", emoji: "▽", placeId: "p-mariana" },
    { id: "colorado", title: "峡谷行者", subtitle: "科罗拉多大峡谷", emoji: "◇", placeId: "p-colorado" },
    { id: "fuji", title: "火山观察者", subtitle: "富士山", emoji: "△", placeId: "p-fuji" },
];
function passportLevel(exp) {
    const threshold = 800;
    return { level: Math.floor(exp / threshold) + 1, current: exp % threshold, threshold };
}
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
        stats: { completed: 0, totalFound: 0, totalExplorations: index_1.EXPLORATIONS.length, totalKnowledge: knowledge_1.KNOWLEDGE.length, challenges: 0, places: places_1.PLACES.length },
        records: [],
        empty: false,
        badges: [],
        earnedBadgeCount: 0,
        passport: { level: 1, current: 0, threshold: 800, exp: 0, percent: 0 },
        headerTop: 12,
        failedImages: {},
        quiz: {
            totalPlays: 0,
            levels: [],
        },
        quizEmpty: true,
        favoritesList: [],
        favoritesEmpty: true,
        profileHero: (_a = (0, world_manifests_1.getPlaceHeroImage)("p-everest")) !== null && _a !== void 0 ? _a : "",
    },
    onShow() {
        var _a, _b, _c, _d, _e, _f, _g;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ selected: 4 });
        (_d = (_c = this.getTabBar) === null || _c === void 0 ? void 0 : _c.call(this)) === null || _d === void 0 ? void 0 : _d.setData({ hidden: false });
        (_f = (_e = this.getTabBar) === null || _e === void 0 ? void 0 : _e.call(this)) === null || _f === void 0 ? void 0 : _f.setData({ theme: "dark" });
        const headerTop = (0, layout_1.getHeaderTopOffset)();
        const allRecords = (0, exploration_store_1.getRecords)();
        const records = allRecords.map((r) => {
            var _a, _b, _c;
            const ex = index_1.EXPLORATIONS.find((e) => e.id === r.id);
            const place = places_1.PLACES.find((item) => item.explorationId === r.id);
            return {
                id: r.id,
                emoji: r.emoji,
                title: r.title,
                completed: r.completed,
                reachElevation: r.reachElevation,
                maxElevation: r.maxElevation,
                unitText: (_b = (_a = ex === null || ex === void 0 ? void 0 : ex.ui) === null || _a === void 0 ? void 0 : _a.axisUnit) !== null && _b !== void 0 ? _b : "m",
                knowledgeCount: r.knowledgeIds.length,
                pct: Math.min(100, Math.round((Math.abs(r.reachElevation) / Math.max(1, Math.abs(r.maxElevation))) * 100)),
                reachText: (0, expedition_observation_1.formatObservationElevation)(r.reachElevation, r.maxElevation),
                maxText: (0, expedition_observation_1.formatObservationElevation)(r.maxElevation, r.maxElevation),
                image: place ? (_c = (0, world_manifests_1.getPlaceHeroImage)(place.id)) !== null && _c !== void 0 ? _c : "" : "",
            };
        });
        const best = (0, quiz_store_1.getQuizBest)();
        const summary = (0, quiz_store_1.summarizeQuizBest)(best);
        const quizLevels = summary.levels.map((l) => ({
            ...l,
            stars: difficultyStars(l.difficulty),
            bestText: `最佳 ${l.bestCorrect}/${l.bestTotal} · ${Math.round(l.bestRate * 100)}%`,
        }));
        const unlocked = (0, knowledge_link_1.unlockedLibraryIds)(allRecords, index_1.EXPLORATIONS);
        const readIds = (0, knowledge_progress_1.getReadKnowledgeIds)();
        const learned = new Set([...unlocked, ...readIds].filter((id) => knowledge_1.KNOWLEDGE.some((item) => item.id === id)));
        const completedCount = new Set(allRecords.filter((record) => record.completed).map((record) => record.id)).size;
        // 进度经验由已完成探索、已获知识和挑战次数推导；每项采用固定分值。
        const exp = completedCount * 250 + learned.size * 12 + summary.totalPlays * 30;
        const threshold = 800;
        const level = passportLevel(exp);
        const badges = BADGE_CONFIG.map((badge) => {
            var _a;
            return ({
                ...badge,
                image: (_a = (0, world_manifests_1.getPlaceHeroImage)(badge.placeId)) !== null && _a !== void 0 ? _a : "",
                earned: allRecords.some((record) => record.id === badge.id && record.completed),
            });
        });
        this.setData({
            headerTop,
            profileHero: (_g = (0, world_manifests_1.getPlaceHeroImage)("p-everest")) !== null && _g !== void 0 ? _g : "",
            stats: {
                completed: completedCount,
                totalFound: learned.size,
                totalExplorations: index_1.EXPLORATIONS.length,
                totalKnowledge: knowledge_1.KNOWLEDGE.length,
                challenges: summary.totalPlays,
                places: places_1.PLACES.length,
            },
            badges,
            earnedBadgeCount: badges.filter((badge) => badge.earned).length,
            passport: { ...level, exp, percent: Math.round((level.current / threshold) * 100) },
            records,
            empty: records.length === 0,
            quiz: { totalPlays: summary.totalPlays, levels: quizLevels },
            quizEmpty: quizLevels.length === 0,
            favoritesList: favorites_store_1.favorites.getPlaces(places_1.PLACES).map((p) => {
                var _a;
                return ({
                    id: p.id,
                    name: p.name,
                    emoji: p.emoji,
                    typeLabel: places_2.PLACE_TYPE_LABEL[p.type],
                    shortDescription: p.shortDescription,
                    image: (_a = (0, world_manifests_1.getPlaceHeroImage)(p.id)) !== null && _a !== void 0 ? _a : "",
                });
            }),
            favoritesEmpty: favorites_store_1.favorites.count() === 0,
        });
    },
    /** 打开收藏的地点详情 */
    onOpenFavorite(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        wx.navigateTo({ url: `/pkg-detail/pages/place/index?id=${id}` });
    },
    onOpenRecord(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        wx.navigateTo({ url: `/pkg-explore/pages/exploration/index?id=${id}` });
    },
    onImageError(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (id)
            this.setData({ [`failedImages.${id}`]: true });
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
        wx.navigateTo({ url: "/pkg-detail/pages/credits/index" });
    },
    onOpenSettings() {
        wx.showActionSheet({
            itemList: ["数据来源与许可", "清空本地数据"],
            success: ({ tapIndex }) => {
                if (tapIndex === 0)
                    this.onOpenCredits();
                if (tapIndex === 1)
                    this.onClear();
            },
        });
    },
    onClear() {
        wx.showModal({
            title: "清空探索记录",
            content: "会删除探索进度、收藏和挑战成绩，仅影响本机数据，且不能恢复。确定清空？",
            confirmText: "清空本地数据",
            cancelText: "保留数据",
            success: (res) => {
                if (res.confirm) {
                    wx.clearStorageSync();
                    this.onShow();
                }
            },
        });
    },
});
