"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 📄 知识详情页 —— 单条知识完整内容 + 关联地点（知识 → 图鉴闭环）。
 */
const knowledge_1 = require("../../data/knowledge");
const processes_1 = require("../../data/processes");
const places_1 = require("../../data/places");
Page({
    data: {
        item: null,
        relatedPlaces: [],
        process: null,
        processIndex: 0,
        currentStep: null,
    },
    onLoad(query) {
        const id = query.id || "";
        const item = knowledge_1.KNOWLEDGE.find((k) => k.id === id) || knowledge_1.KNOWLEDGE[0] || null;
        const process = query.process
            ? (0, processes_1.getKnowledgeProcess)(query.process) || null
            : item ? (0, processes_1.processForTopic)(item.id) || null : null;
        const relatedPlaces = item
            ? item.relatedPlaceIds
                .map((pid) => (0, places_1.getPlaceById)(pid))
                .filter((p) => Boolean(p))
                .map((p) => ({
                id: p.id,
                name: p.name,
                emoji: p.emoji,
                typeLabel: places_1.PLACE_TYPE_LABEL[p.type],
                shortDescription: p.shortDescription,
            }))
            : [];
        this.setData({ item, relatedPlaces, process, processIndex: 0, currentStep: (process === null || process === void 0 ? void 0 : process.steps[0]) || null });
        if (item) {
            wx.setNavigationBarTitle({ title: item.title });
        }
    },
    onShow() {
        var _a, _b;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ hidden: true });
    },
    onOpenPlace(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        wx.navigateTo({ url: `/pages/place/index?id=${id}` });
    },
    onBack() {
        wx.navigateBack({ delta: 1 });
    },
    onContinueLearning() {
        wx.switchTab({ url: "/pages/knowledge/index" });
    },
    onProcessNext() {
        const process = this.data.process;
        if (!process)
            return;
        const processIndex = Math.min(process.steps.length - 1, this.data.processIndex + 1);
        this.setData({ processIndex, currentStep: process.steps[processIndex] });
    },
    onProcessPrev() {
        const process = this.data.process;
        if (!process)
            return;
        const processIndex = Math.max(0, this.data.processIndex - 1);
        this.setData({ processIndex, currentStep: process.steps[processIndex] });
    },
});
