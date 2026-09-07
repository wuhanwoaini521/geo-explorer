"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🏠 首页 —— 探索的起点（内容驱动，无硬编码业务数据）。
 *
 * 结构：Hero（品牌 + 真实 DEM 主视觉）→ 沉浸场景 → 精选目的地
 * → 按地貌探索（分类入口 → 地图页图鉴）→ 你知道吗（随机冷知识）→ 关于。
 */
const index_1 = require("../../data/explorations/index");
const discoveries_1 = require("../../data/discoveries");
const places_1 = require("../../data/places");
const exploration_store_1 = require("../../services/exploration-store");
const ui_bus_1 = require("../../services/ui-bus");
const format_1 = require("../../utils/format");
const discovery_1 = require("../../utils/discovery");
Page({
    data: {
        scenes: [],
        featured: [],
        types: [],
        discovery: null,
        heroImageFailed: false,
        stats: { completed: 0, totalFound: 0 },
        placeCount: places_1.PLACES.length,
    },
    onShow() {
        var _a, _b;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ selected: 0 });
        this.refresh();
    },
    refresh() {
        var _a;
        const scenes = index_1.EXPLORATIONS.map((ex) => ({
            id: ex.id,
            title: ex.title,
            subtitle: ex.subtitle,
            emoji: ex.emoji,
            meta: `${(0, format_1.formatNumber)(ex.maxElevation, 2)} m 海拔 · ${ex.stages.length} 个自然带`,
            badge: `知识节点 ×${ex.knowledgeNodes.length}`,
        }));
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
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        wx.navigateTo({ url: `/pages/exploration/index?id=${id}` });
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
});
