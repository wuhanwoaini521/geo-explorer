"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 📄 知识详情页 —— 单条知识完整内容 + 关联地点（知识 → 图鉴闭环）。
 */
const knowledge_1 = require("../../data/knowledge");
const processes_1 = require("../../data/processes");
const places_1 = require("../../data/places");
const knowledge_media_1 = require("../../utils/knowledge-media");
Page({
    data: {
        item: null,
        relatedPlaces: [],
        process: null,
        processIndex: 0,
        currentStep: null,
        /** 该知识的配图（实景优先）；点击可全屏预览，多图左右滑动看大图 */
        images: [],
        /** 主图解码失败 → 退回分类 emoji 占位 */
        imageFailed: false,
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
        this.setData({
            item,
            relatedPlaces,
            process,
            processIndex: 0,
            currentStep: (process === null || process === void 0 ? void 0 : process.steps[0]) || null,
            images: item ? (0, knowledge_media_1.knowledgeImages)(item) : [],
            imageFailed: false,
        });
        if (item) {
            wx.setNavigationBarTitle({ title: item.title });
        }
    },
    onShow() {
        var _a, _b;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ hidden: true });
    },
    /** 点击配图 → 全屏看大图（多张时可左右滑动切换）。 */
    onPreviewImage() {
        const urls = this.data.images.filter(Boolean);
        if (!urls.length)
            return;
        // SAFETY: 官方类型只覆盖本页用到的子集，先按方法名守卫再调用（同探索页地点卡）。
        const preview = wx["previewImage"];
        if (typeof preview === "function") {
            preview({
                current: urls[0],
                urls,
            });
        }
    },
    onImageError() {
        if (this.data.imageFailed)
            return;
        this.setData({ imageFailed: true });
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
