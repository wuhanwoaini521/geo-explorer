"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 📖 知识页 —— 可浏览、可搜索、可从探索回到理解的地理知识库。
 * 列表不再绑定少量固定栏目；分类和内容都从真实数据动态派生。
 */
const knowledge_1 = require("../../data/knowledge");
const processes_1 = require("../../data/processes");
const index_1 = require("../../data/explorations/index");
const exploration_store_1 = require("../../services/exploration-store");
const knowledge_link_1 = require("../../utils/knowledge-link");
const ALL_CATEGORY = "全部";
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
        categories: [ALL_CATEGORY, ...knowledge_1.KNOWLEDGE_CATEGORIES],
        activeCategory: ALL_CATEGORY,
        // 保留 activeTab 字段兼容现有调用与测试，实际筛选使用动态分类。
        activeTab: ALL_CATEGORY,
        query: "",
        items: [],
        processCards: [],
        total: knowledge_1.KNOWLEDGE.length,
        unlockedCount: 0,
        processCount: processes_1.KNOWLEDGE_PROCESSES.length,
        empty: false,
        failedImages: {},
    },
    onShow() {
        var _a, _b, _c, _d;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ selected: 2 });
        (_d = (_c = this.getTabBar) === null || _c === void 0 ? void 0 : _c.call(this)) === null || _d === void 0 ? void 0 : _d.setData({ hidden: false });
        this.refresh();
    },
    refresh() {
        const unlocked = (0, knowledge_link_1.unlockedLibraryIds)((0, exploration_store_1.getRecords)(), index_1.EXPLORATIONS);
        const items = this.filterForTab(this.data.activeCategory, this.data.query, unlocked);
        const processCards = processes_1.KNOWLEDGE_PROCESSES.map((process) => ({
            id: process.id,
            topicId: process.topicId,
            kicker: process.kicker,
            title: process.title,
            question: process.question,
            summary: process.summary,
            stepsText: `${process.steps.length} 个渐进步骤`,
            image: knowledgeImage(knowledge_1.KNOWLEDGE.find((item) => item.id === process.topicId) || knowledge_1.KNOWLEDGE[0]),
        }));
        this.setData({ items, processCards, total: knowledge_1.KNOWLEDGE.length, unlockedCount: unlocked.size, empty: items.length === 0 });
    },
    onCategoryTap(e) {
        var _a, _b, _c;
        const category = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.category) !== null && _c !== void 0 ? _c : ALL_CATEGORY);
        this.setData({ activeCategory: category, activeTab: category });
        this.applyFilter(category, this.data.query);
    },
    onQueryInput(e) {
        var _a, _b;
        const query = String((_b = (_a = e.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : "");
        this.setData({ query });
        this.applyFilter(this.data.activeCategory, query);
    },
    onQueryClear() {
        this.setData({ query: "" });
        this.applyFilter(this.data.activeCategory, "");
    },
    applyFilter(category, query) {
        const unlocked = (0, knowledge_link_1.unlockedLibraryIds)((0, exploration_store_1.getRecords)(), index_1.EXPLORATIONS);
        const items = this.filterForTab(category, query, unlocked);
        this.setData({ items, empty: items.length === 0 });
    },
    filterForTab(category, query, unlocked) {
        return (0, knowledge_link_1.filterKnowledge)(knowledge_1.KNOWLEDGE, category, query).map((item) => ({
            ...item,
            unlocked: unlocked.has(item.id),
            image: knowledgeImage(item),
        }));
    },
    onOpen(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (id)
            wx.navigateTo({ url: `/pages/knowledge-detail/index?id=${id}` });
    },
    onOpenProcess(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        const process = processes_1.KNOWLEDGE_PROCESSES.find((item) => item.id === id);
        if (process)
            wx.navigateTo({ url: `/pages/knowledge-detail/index?id=${process.topicId}&process=${process.id}` });
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
