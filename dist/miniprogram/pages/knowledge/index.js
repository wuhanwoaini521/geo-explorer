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
Page({
    data: {
        categories: [],
        activeCategory: ALL_CATEGORY,
        query: "",
        items: [],
        total: 0,
        unlockedCount: 0,
        empty: false,
    },
    onShow() {
        var _a, _b;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ selected: 2 });
        const records = (0, exploration_store_1.getRecords)();
        const unlocked = (0, knowledge_link_1.unlockedLibraryIds)(records, index_1.EXPLORATIONS);
        const items = (0, knowledge_link_1.filterKnowledge)(knowledge_1.KNOWLEDGE, this.data.activeCategory, this.data.query).map((k) => ({ ...k, unlocked: unlocked.has(k.id) }));
        this.setData({
            categories: [ALL_CATEGORY, ...knowledge_1.KNOWLEDGE_CATEGORIES],
            items,
            total: knowledge_1.KNOWLEDGE.length,
            unlockedCount: unlocked.size,
            empty: items.length === 0,
        });
    },
    onCategoryTap(e) {
        var _a, _b, _c;
        const category = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.category) !== null && _c !== void 0 ? _c : ALL_CATEGORY);
        this.setData({ activeCategory: category });
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
    /** 依据当前分类/关键词重算列表（联动解锁状态保持不变） */
    applyFilter(category, query) {
        const records = (0, exploration_store_1.getRecords)();
        const unlocked = (0, knowledge_link_1.unlockedLibraryIds)(records, index_1.EXPLORATIONS);
        const items = (0, knowledge_link_1.filterKnowledge)(knowledge_1.KNOWLEDGE, category, query).map((k) => ({ ...k, unlocked: unlocked.has(k.id) }));
        this.setData({ items, empty: items.length === 0 });
    },
    onOpen(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        wx.navigateTo({ url: `/pages/knowledge-detail/index?id=${id}` });
    },
});
