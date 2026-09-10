"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🏠 首页 —— 探索的起点（内容驱动，无硬编码业务数据）。
 *
 * 结构：Hero（品牌 + 珠峰实景主视觉）→ 沉浸场景 → 精选目的地
 * → 按地貌探索（分类入口 → 地图页图鉴）→ 你知道吗（随机冷知识）→ 关于。
 */
const discoveries_1 = require("../../data/discoveries");
const places_1 = require("../../data/places");
const exploration_store_1 = require("../../services/exploration-store");
const ui_bus_1 = require("../../services/ui-bus");
const format_1 = require("../../utils/format");
const discovery_1 = require("../../utils/discovery");
const scene_search_1 = require("../../utils/scene-search");
const SCENE_CATALOG = [
    {
        id: "everest", title: "珠穆朗玛峰", subtitle: "地球之巅 · 8,848 m", emoji: "🏔️",
        meta: "", badge: "", image: "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
        tags: ["高山地貌", "地貌观察"], target: "exploration",
    },
    {
        id: "mariana", title: "马里亚纳海沟", subtitle: "地球最深处 · 10,900 m", emoji: "🌊",
        meta: "", badge: "", image: "/assets/world/mariana-card.png",
        tags: ["海沟", "下潜"], target: "exploration",
    },
    {
        id: "p-colorado", title: "大峡谷", subtitle: "穿越地球的历史", emoji: "🏜️",
        meta: "", badge: "", image: "/assets/world/grand-canyon-card.png",
        tags: ["峡谷", "探索"], target: "place",
    },
    {
        id: "p-fuji", title: "富士山", subtitle: "火山与生命", emoji: "🌋",
        meta: "", badge: "", image: "/assets/world/fuji-card.png",
        tags: ["火山", "攀登"], target: "place",
    },
];
Page({
    data: {
        scenes: [],
        featured: [],
        types: [],
        discovery: null,
        heroImageFailed: false,
        failedImages: {},
        query: "",
        sceneEmpty: false,
        activeType: "all",
        stats: { completed: 0, totalFound: 0 },
        placeCount: places_1.PLACES.length,
    },
    onShow() {
        var _a, _b, _c, _d;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ selected: 0 });
        (_d = (_c = this.getTabBar) === null || _c === void 0 ? void 0 : _c.call(this)) === null || _d === void 0 ? void 0 : _d.setData({ hidden: false });
        this.refresh();
    },
    refresh() {
        var _a;
        const scenes = (0, scene_search_1.filterScenes)(SCENE_CATALOG, this.data.query);
        const featured = places_1.PLACES.filter((p) => p.featured)
            .slice(0, 8)
            .map((p) => {
            var _a, _b;
            return ({
                id: p.id,
                name: p.name,
                emoji: p.emoji,
                typeLabel: (_b = (_a = places_1.PLACE_TYPE_META.find((m) => m.type === p.type)) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : "",
                shortDescription: p.shortDescription,
                explorText: p.explorationId
                    ? "可沉浸探索"
                    : p.elevationM < 0
                        ? `${(0, format_1.formatNumber)(Math.abs(p.elevationM), 0)} m 深`
                        : `${(0, format_1.formatNumber)(Math.abs(p.elevationM), 0)} m`,
                exploration: Boolean(p.explorationId),
            });
        });
        const counts = new Map();
        for (const p of places_1.PLACES)
            counts.set(p.type, ((_a = counts.get(p.type)) !== null && _a !== void 0 ? _a : 0) + 1);
        const types = places_1.PLACE_TYPE_META.map((m) => {
            var _a;
            return ({
                type: m.type,
                label: m.label,
                emoji: m.emoji,
                count: (_a = counts.get(m.type)) !== null && _a !== void 0 ? _a : 0,
            });
        });
        this.setData({
            scenes,
            sceneEmpty: Boolean(this.data.query.trim()) && scenes.length === 0,
            featured,
            types,
            discovery: this.pickDiscovery(),
            stats: (0, exploration_store_1.getExplorationStats)(),
        });
    },
    pickDiscovery() {
        var _a, _b, _c, _d, _e;
        if (!discoveries_1.DISCOVERIES.length)
            return null;
        const last = (_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.discovery) === null || _b === void 0 ? void 0 : _b.id;
        const d = (0, discovery_1.randomDiscovery)(last);
        return {
            ...d,
            index: ((_e = (_d = (_c = this.data) === null || _c === void 0 ? void 0 : _c.discovery) === null || _d === void 0 ? void 0 : _d.index) !== null && _e !== void 0 ? _e : 0) + 1,
        };
    },
    onOpenScene(e) {
        var _a, _b, _c, _d, _e, _f;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        const target = String((_f = (_e = (_d = e.currentTarget) === null || _d === void 0 ? void 0 : _d.dataset) === null || _e === void 0 ? void 0 : _e.target) !== null && _f !== void 0 ? _f : "exploration");
        wx.navigateTo({
            url: target === "place"
                ? `/pages/place/index?id=${id}`
                : `/pages/exploration/index?id=${id}`,
        });
    },
    onOpenFeatured(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        wx.navigateTo({ url: `/pages/place/index?id=${id}` });
    },
    /** 分类入口 → 地图页图鉴（带筛选） */
    onOpenType(e) {
        var _a, _b, _c;
        const type = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.type) !== null && _c !== void 0 ? _c : "all");
        this.setData({ activeType: type });
        (0, ui_bus_1.setPendingTypeFilter)(type);
        wx.switchTab({ url: "/pages/map/index" });
    },
    onOpenAtlas() {
        (0, ui_bus_1.setPendingTypeFilter)("all");
        wx.switchTab({ url: "/pages/map/index" });
    },
    /** 换一条冷知识 */
    onShuffleDiscovery() {
        this.setData({ discovery: this.pickDiscovery() });
    },
    onOpenMapTab() {
        wx.switchTab({ url: "/pages/map/index" });
    },
    /** 主视觉加载失败：降级为纯色卡片，避免出现破图 */
    onHeroImageError() {
        this.setData({ heroImageFailed: true });
    },
    onQueryInput(e) {
        var _a, _b;
        const query = String((_b = (_a = e.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : "");
        const scenes = (0, scene_search_1.filterScenes)(SCENE_CATALOG, query);
        this.setData({ query, scenes, sceneEmpty: Boolean(query.trim()) && scenes.length === 0 });
    },
    onQueryClear() {
        this.setData({ query: "", scenes: SCENE_CATALOG, sceneEmpty: false });
    },
    onQueryConfirm() {
        var _a;
        const query = String((_a = this.data.query) !== null && _a !== void 0 ? _a : "").trim();
        if (!query) {
            wx.showToast({ title: "请输入地点或地貌", icon: "none" });
            return;
        }
        (0, ui_bus_1.setPendingSearchQuery)(query);
        wx.switchTab({ url: "/pages/map/index" });
    },
    onSceneImageError(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (id)
            this.setData({ [`failedImages.${id}`]: true });
    },
});
