"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 📖 知识页 —— 地理知识库（完整版）。
 *
 * 全量展示知识库条目，支持分类筛选与关键词搜索；
 * 「已在探索中解锁」联动：探索记录里的知识节点经 knowledgeId 映射点亮对应条目。
 * 筛选/联动均为纯函数（utils/knowledge-link），可在 Node 环境单测。
 */
const knowledge_1 = require("../../data/knowledge");
const index_1 = require("../../data/explorations/index");
const exploration_store_1 = require("../../services/exploration-store");
const knowledge_link_1 = require("../../utils/knowledge-link");
const ALL_CATEGORY = "全部";
const TABS = ["地质成因", "生态环境", "人文历史", "延伸阅读"];
const TAB_IDS = {
    "地质成因": ["k03", "k08"],
    "生态环境": ["k01", "k04", "k07"],
    "人文历史": ["k31", "k32"],
    "延伸阅读": ["k02", "k09"],
};
function knowledgeImage(item) {
    if (item.id === "k31")
        return "/assets/world/everest-history-1953.png";
    if (item.id === "k32")
        return "/assets/world/everest-climb-modern.png";
    if (item.relatedPlaceIds.includes("p-everest"))
        return "/assets/expeditions/everest/live/live-a-kala-patthar.jpg";
    if (item.relatedPlaceIds.includes("p-fuji"))
        return "/assets/world/fuji-card.png";
    if (item.relatedPlaceIds.includes("p-colorado"))
        return "/assets/world/grand-canyon-card.png";
    if (item.relatedPlaceIds.includes("p-mariana"))
        return "/assets/world/mariana-card.png";
    return "/assets/world/everest-expedition-hero-v1.png";
}
Page({
    data: {
        categories: TABS,
        activeCategory: ALL_CATEGORY,
        activeTab: "人文历史",
        query: "",
        items: [],
        total: 0,
        unlockedCount: 0,
        empty: false,
        failedImages: {},
    },
    onShow() {
        var _a, _b, _c, _d;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ selected: 2 });
        (_d = (_c = this.getTabBar) === null || _c === void 0 ? void 0 : _c.call(this)) === null || _d === void 0 ? void 0 : _d.setData({ hidden: true });
        const records = (0, exploration_store_1.getRecords)();
        const unlocked = (0, knowledge_link_1.unlockedLibraryIds)(records, index_1.EXPLORATIONS);
        const items = this.filterForTab(this.data.activeTab, this.data.query, unlocked);
        this.setData({
            items,
            total: knowledge_1.KNOWLEDGE.length,
            unlockedCount: unlocked.size,
            empty: items.length === 0,
        });
    },
    onCategoryTap(e) {
        var _a, _b, _c;
        const tab = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.category) !== null && _c !== void 0 ? _c : "人文历史");
        this.setData({ activeTab: tab });
        this.applyFilter(tab, this.data.query);
    },
    onQueryInput(e) {
        var _a, _b;
        const query = String((_b = (_a = e.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : "");
        this.setData({ query });
        this.applyFilter(this.data.activeTab, query);
    },
    onQueryClear() {
        this.setData({ query: "" });
        this.applyFilter(this.data.activeTab, "");
    },
    /** 依据当前分类/关键词重算列表（联动解锁状态保持不变） */
    applyFilter(category, query) {
        const records = (0, exploration_store_1.getRecords)();
        const unlocked = (0, knowledge_link_1.unlockedLibraryIds)(records, index_1.EXPLORATIONS);
        const items = this.filterForTab(category, query, unlocked);
        this.setData({ items, empty: items.length === 0 });
    },
    filterForTab(tab, query, unlocked) {
        const ids = TAB_IDS[tab] || [];
        const source = ids.length
            ? ids.map((id) => knowledge_1.KNOWLEDGE.find((item) => item.id === id)).filter((item) => Boolean(item))
            : knowledge_1.KNOWLEDGE;
        return (0, knowledge_link_1.filterKnowledge)(source, ALL_CATEGORY, query).slice(0, 8).map((k) => ({
            ...k,
            unlocked: unlocked.has(k.id),
            image: knowledgeImage(k),
        }));
    },
    onOpen(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        wx.navigateTo({ url: `/pages/knowledge-detail/index?id=${id}` });
    },
    onImageError(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (id)
            this.setData({ [`failedImages.${id}`]: true });
    },
    onBack() {
        wx.switchTab({ url: "/pages/home/index" });
    },
});
