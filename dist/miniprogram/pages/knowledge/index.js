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
const knowledge_media_1 = require("../../utils/knowledge-media");
const knowledge_progress_1 = require("../../services/knowledge-progress");
const quiz_store_1 = require("../../services/quiz-store");
const layout_1 = require("../../utils/layout");
const quizzes_1 = require("../../data/quizzes");
const visual_challenges_1 = require("../../data/visual-challenges");
const webgl_globe_renderer_1 = require("../../engine/webgl-globe-renderer");
let knowledgeGlobeRenderer = null;
const ALL_CATEGORY = "全部";
const ATLAS_NODE_CONFIG = [
    { id: "atmosphere", label: "大气", topicId: "k01", worldIds: ["everest", "fuji"], masteryQuizIds: ["q06", "q07"], x: 50, y: 13 },
    { id: "hydrology", label: "水文", topicId: "k13", worldIds: ["colorado"], masteryQuizIds: ["q11", "q15"], x: 80, y: 29 },
    { id: "mountain", label: "山脉", topicId: "k03", worldIds: ["everest"], masteryQuizIds: ["q09", "q18"], x: 83, y: 53 },
    { id: "glacier", label: "冰川", topicId: "k08", worldIds: ["everest"], masteryQuizIds: ["q20", "photo-icefall"], x: 69, y: 79 },
    { id: "geology", label: "地质", topicId: "k06", worldIds: ["colorado"], masteryQuizIds: ["q15", "q23"], x: 31, y: 79 },
    { id: "volcano", label: "火山", topicId: "k36", worldIds: ["fuji"], masteryQuizIds: ["q21"], x: 17, y: 53 },
    { id: "ecology", label: "生态", topicId: "k12", worldIds: ["everest", "fuji"], masteryQuizIds: ["q19"], x: 20, y: 29 },
    { id: "ocean", label: "海洋", topicId: "k11", worldIds: ["mariana"], masteryQuizIds: ["q05", "q17"], x: 50, y: 87 },
];
// 知识配图解析见 utils/knowledge-media.ts（列表页与详情页共用，避免两处维护同一份映射）。
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
        nodes: [],
        featuredItems: [],
        headerTop: 12,
        scrollTop: 175,
        earthFailed: false,
    },
    onReady() {
        this.initKnowledgeEarth();
    },
    onShow() {
        var _a, _b, _c, _d, _e, _f;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ selected: 2 });
        (_d = (_c = this.getTabBar) === null || _c === void 0 ? void 0 : _c.call(this)) === null || _d === void 0 ? void 0 : _d.setData({ hidden: false });
        (_f = (_e = this.getTabBar) === null || _e === void 0 ? void 0 : _e.call(this)) === null || _f === void 0 ? void 0 : _f.setData({ theme: "dark" });
        const headerTop = (0, layout_1.getHeaderTopOffset)();
        this.setData({ headerTop, scrollTop: headerTop + 114 });
        this.refresh();
        knowledgeGlobeRenderer === null || knowledgeGlobeRenderer === void 0 ? void 0 : knowledgeGlobeRenderer.resumeRotation();
    },
    onHide() {
        knowledgeGlobeRenderer === null || knowledgeGlobeRenderer === void 0 ? void 0 : knowledgeGlobeRenderer.pauseRotation();
    },
    onUnload() {
        knowledgeGlobeRenderer === null || knowledgeGlobeRenderer === void 0 ? void 0 : knowledgeGlobeRenderer.dispose();
        knowledgeGlobeRenderer = null;
    },
    onResize() {
        knowledgeGlobeRenderer === null || knowledgeGlobeRenderer === void 0 ? void 0 : knowledgeGlobeRenderer.dispose();
        knowledgeGlobeRenderer = null;
        this.setData({ earthFailed: false }, () => this.initKnowledgeEarth());
    },
    initKnowledgeEarth() {
        wx.createSelectorQuery()
            .select("#knowledgeEarthCanvas")
            .fields({ node: true, size: true })
            .exec((result) => {
            const canvasInfo = result[0];
            if (!(canvasInfo === null || canvasInfo === void 0 ? void 0 : canvasInfo.node) || !canvasInfo.width || !canvasInfo.height) {
                this.setData({ earthFailed: true });
                return;
            }
            try {
                knowledgeGlobeRenderer === null || knowledgeGlobeRenderer === void 0 ? void 0 : knowledgeGlobeRenderer.dispose();
                const system = wx.getSystemInfoSync();
                knowledgeGlobeRenderer = new webgl_globe_renderer_1.WebGLGlobeRenderer(canvasInfo.node, canvasInfo.width, canvasInfo.height, system.pixelRatio, "half", { bumpEnabled: true, atmosphereEnabled: true, bumpScale: 0.78, atmosphereStrength: 0.3 });
                knowledgeGlobeRenderer.pauseRotation();
            }
            catch (_a) {
                knowledgeGlobeRenderer = null;
                this.setData({ earthFailed: true });
            }
        });
    },
    refresh() {
        const unlocked = (0, knowledge_link_1.unlockedLibraryIds)((0, exploration_store_1.getRecords)(), index_1.EXPLORATIONS);
        const items = this.filterForTab(this.data.activeCategory, this.data.query, unlocked);
        const reads = (0, knowledge_progress_1.getReadKnowledgeIds)();
        const exploredWorlds = new Set((0, exploration_store_1.getRecords)().map((record) => record.id));
        const quizHistory = (0, quiz_store_1.getQuizAttemptHistory)();
        const correctIds = new Set(quizHistory.flatMap((attempt) => attempt.correctQuestionIds));
        const masteryQuizIds = new Set([...quizzes_1.QUIZZES, ...visual_challenges_1.VISUAL_LANDFORM_QUIZZES].map((quiz) => quiz.id));
        const nodes = ATLAS_NODE_CONFIG.map((config) => {
            const topic = knowledge_1.KNOWLEDGE.find((item) => item.id === config.topicId);
            const read = reads.has(config.topicId);
            const relevantQuizIds = config.masteryQuizIds.filter((id) => masteryQuizIds.has(id));
            const mastered = read && relevantQuizIds.length > 0 && relevantQuizIds.every((id) => correctIds.has(id));
            const status = !topic
                ? "locked"
                : mastered ? "mastered"
                    : read ? "learned"
                        : config.worldIds.some((worldId) => exploredWorlds.has(worldId)) || unlocked.has(config.topicId) ? "available" : "locked";
            return {
                id: config.id,
                label: config.label,
                topicId: config.topicId,
                status,
                statusLabel: status === "mastered" ? "已掌握" : status === "learned" ? "已学会" : status === "available" ? "可学习" : "待探索",
                image: topic ? (0, knowledge_media_1.knowledgeAtlasImage)(config.id) : "",
                masteryQuizIds: relevantQuizIds,
                x: config.x,
                y: config.y,
            };
        });
        const featuredItems = ["k03", "k08", "k11"]
            .map((id) => knowledge_1.KNOWLEDGE.find((item) => item.id === id))
            .filter((item) => Boolean(item))
            .map((item) => ({ ...item, unlocked: unlocked.has(item.id), image: (0, knowledge_media_1.featuredKnowledgeImage)(item) }));
        const processCards = processes_1.KNOWLEDGE_PROCESSES.map((process) => {
            const topic = knowledge_1.KNOWLEDGE.find((item) => item.id === process.topicId) || knowledge_1.KNOWLEDGE[0];
            return {
                id: process.id,
                topicId: process.topicId,
                kicker: process.kicker,
                title: process.title,
                question: process.question,
                summary: process.summary,
                stepsText: `${process.steps.length} 个渐进步骤`,
                image: (0, knowledge_media_1.knowledgeImage)(topic),
                emoji: topic.emoji,
            };
        });
        this.setData({ items, processCards, featuredItems, nodes, total: knowledge_1.KNOWLEDGE.length, unlockedCount: unlocked.size, empty: items.length === 0 });
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
            image: (0, knowledge_media_1.knowledgeImage)(item),
        }));
    },
    onOpen(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (id)
            wx.navigateTo({ url: `/pkg-detail/pages/knowledge-detail/index?id=${id}` });
    },
    onOpenProcess(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        const process = processes_1.KNOWLEDGE_PROCESSES.find((item) => item.id === id);
        if (process)
            wx.navigateTo({ url: `/pkg-detail/pages/knowledge-detail/index?id=${process.topicId}&process=${process.id}` });
    },
    onImageError(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (id)
            this.setData({ [`failedImages.${id}`]: true });
    },
    onBack() {
        wx.switchTab({ url: "/pages/map/index" });
    },
    onOpenNode(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.topicId) !== null && _c !== void 0 ? _c : "");
        if (id)
            wx.navigateTo({ url: `/pkg-detail/pages/knowledge-detail/index?id=${id}` });
    },
});
