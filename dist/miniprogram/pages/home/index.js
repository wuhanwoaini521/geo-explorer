"use strict";
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🏠 首页 —— 探索的起点（内容驱动，无硬编码业务数据）。
 *
 * 结构：Hero（品牌 + 珠峰实景主视觉）→ 沉浸场景 → 精选目的地
 * → 按地貌探索（首页原地筛选）→ 你知道吗（随机冷知识）→ 关于。
 */
const discoveries_1 = require("../../data/discoveries");
const places_1 = require("../../data/places");
const world_manifests_1 = require("../../data/media/world-manifests");
const exploration_store_1 = require("../../services/exploration-store");
const ui_bus_1 = require("../../services/ui-bus");
const format_1 = require("../../utils/format");
const discovery_1 = require("../../utils/discovery");
const scene_search_1 = require("../../utils/scene-search");
const SCENE_CATALOG = [
    {
        id: "everest", title: "珠穆朗玛峰", subtitle: "地球之巅 · 8,848 m", emoji: "🏔️",
        meta: "", badge: "", image: "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
        tags: ["高山地貌", "地貌观察"], type: "mountain", target: "exploration",
    },
    {
        id: "mariana", title: "马里亚纳海沟", subtitle: "地球最深处 · 10,935 m", emoji: "🌊",
        meta: "", badge: "", image: (_a = (0, world_manifests_1.getPlaceHeroImage)("p-mariana")) !== null && _a !== void 0 ? _a : "",
        tags: ["海沟", "下潜"], type: "ocean", target: "exploration",
    },
    {
        id: "colorado", title: "科罗拉多大峡谷", subtitle: "下切 1,389 m · 穿越二十亿年", emoji: "🏞️",
        meta: "", badge: "", image: (_b = (0, world_manifests_1.getPlaceHeroImage)("p-colorado")) !== null && _b !== void 0 ? _b : "",
        tags: ["峡谷", "地质剖面"], type: "canyon", target: "exploration",
    },
    {
        id: "fuji", title: "富士山", subtitle: "攀登日本最高点 · 3,776 m", emoji: "🗻",
        meta: "", badge: "", image: (_c = (0, world_manifests_1.getPlaceHeroImage)("p-fuji")) !== null && _c !== void 0 ? _c : "",
        tags: ["火山", "攀登"], type: "volcano", target: "exploration",
    },
];
const TYPE_LABELS = new Map(places_1.PLACE_TYPE_META.map((item) => [item.type, item.label]));
/** 首页分类结果使用完整地点库；有探索能力的地点仍直接进入对应沉浸场景。 */
const PLACE_CATALOG = places_1.PLACES.map((place) => {
    var _a, _b, _c, _d;
    const typeLabel = (_a = TYPE_LABELS.get(place.type)) !== null && _a !== void 0 ? _a : "地貌";
    const elevationText = place.elevationM < 0
        ? `${(0, format_1.formatNumber)(Math.abs(place.elevationM), 0)} m 深`
        : `${(0, format_1.formatNumber)(place.elevationM, 0)} m`;
    return {
        id: (_b = place.explorationId) !== null && _b !== void 0 ? _b : place.id,
        title: place.name,
        subtitle: `${place.shortDescription} · ${elevationText}`,
        emoji: place.emoji,
        meta: "",
        badge: "",
        image: (_c = (0, world_manifests_1.getPlaceHeroImage)(place.id)) !== null && _c !== void 0 ? _c : "",
        tags: [typeLabel, place.explorationId ? "可沉浸探索" : ((_d = place.tags[0]) !== null && _d !== void 0 ? _d : "地点图鉴")],
        type: place.type,
        target: place.explorationId ? "exploration" : "place",
    };
});
function scenesFor(type, query) {
    const source = type === "all" ? SCENE_CATALOG : PLACE_CATALOG.filter((scene) => scene.type === type);
    return (0, scene_search_1.filterScenes)(source, query);
}
function typeLabel(type) {
    var _a;
    return type === "all" ? "推荐探索" : `${(_a = TYPE_LABELS.get(type)) !== null && _a !== void 0 ? _a : "地貌"}地点`;
}
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
        activeTypeLabel: "推荐探索",
        stats: { completed: 0, totalFound: 0 },
        placeCount: places_1.PLACES.length,
    },
    onShow() {
        var _a, _b, _c, _d;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ selected: 1 });
        (_d = (_c = this.getTabBar) === null || _c === void 0 ? void 0 : _c.call(this)) === null || _d === void 0 ? void 0 : _d.setData({ hidden: false });
        this.refresh();
    },
    refresh() {
        var _a;
        const scenes = scenesFor(this.data.activeType, this.data.query);
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
            activeTypeLabel: typeLabel(this.data.activeType),
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
    /** 首页分类 Tab：原地替换主列表，不改变页面与底部导航。 */
    onOpenType(e) {
        var _a, _b, _c;
        const raw = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.type) !== null && _c !== void 0 ? _c : "all");
        const type = raw === "all" ? "all" : raw;
        const scenes = scenesFor(type, this.data.query);
        this.setData({
            activeType: type,
            activeTypeLabel: typeLabel(type),
            scenes,
            sceneEmpty: scenes.length === 0,
        });
    },
    /** 明确的“查看图鉴”入口才进入地图页。 */
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
        const scenes = scenesFor(this.data.activeType, query);
        this.setData({ query, scenes, sceneEmpty: Boolean(query.trim()) && scenes.length === 0 });
    },
    onQueryClear() {
        this.setData({
            query: "",
            scenes: scenesFor(this.data.activeType, ""),
            sceneEmpty: false,
        });
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
