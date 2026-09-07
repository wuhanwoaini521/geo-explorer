"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🗺️ 地图页 —— 探索入口 + 世界图鉴。
 *
 * 上半部：已开放沉浸探索的场景（来自 data/explorations 注册表，进度本地读取）；
 * 下半部：世界图鉴（GeoPlace 数据集）—— 搜索 + 地貌类型筛选 + 地点卡片 → 地点详情页。
 * 搜索/筛选为纯函数（utils/place-search），页面只负责装配。
 */
const index_1 = require("../../data/explorations/index");
const places_1 = require("../../data/places");
const exploration_store_1 = require("../../services/exploration-store");
const ui_bus_1 = require("../../services/ui-bus");
const favorites_store_1 = require("../../services/favorites-store");
const place_search_1 = require("../../utils/place-search");
const COMING = [
    { id: "fuji", emoji: "🗻", title: "富士山", region: "日本 · 本州", basis: "海拔 3,776 m · 休眠火山" },
    { id: "sahara", emoji: "🏜️", title: "撒哈拉沙漠", region: "北非", basis: "世界最大热沙漠" },
];
const ALL_TYPE = "all";
Page({
    data: {
        open: [],
        coming: COMING,
        // 图鉴
        types: [{ type: ALL_TYPE, label: "全部", emoji: "🧭" }, ...places_1.PLACE_TYPE_META],
        activeType: ALL_TYPE,
        query: "",
        atlas: [],
        atlasTotal: places_1.PLACES.length,
        atlasEmpty: false,
        routeImageFailed: {},
    },
    onLoad() {
        this.refreshScenes();
        this.refreshAtlas();
    },
    onShow() {
        var _a, _b;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ selected: 1 });
        // 从探索/图鉴返回后刷新完成度；仅当首页分类入口显式传入筛选时才切换类型
        const pending = (0, ui_bus_1.consumeTypeFilter)();
        if (pending !== null && pending !== this.data.activeType) {
            this.setData({ activeType: pending });
        }
        this.refreshScenes();
        this.refreshAtlas();
    },
    refreshScenes() {
        const records = (0, exploration_store_1.getRecords)();
        const open = index_1.EXPLORATIONS.map((ex) => {
            var _a, _b, _c, _d, _e, _f;
            const record = records.find((r) => r.id === ex.id) || null;
            const reached = record ? record.reachElevation : 0;
            const progress = Math.min(100, Math.round((reached / Math.max(1, ex.maxElevation)) * 100));
            return {
                id: ex.id,
                emoji: ex.emoji,
                title: ex.title,
                subtitle: ex.subtitle,
                place: ex.meta.placeLabel,
                region: ex.meta.region,
                elevText: `${Math.round(ex.maxElevation).toLocaleString()} m`,
                estMin: ex.estimatedMinutes,
                desc: ex.meta.description,
                progress,
                reachedText: `${progress}% · ${(_b = (_a = ex.ui) === null || _a === void 0 ? void 0 : _a.extentWord) !== null && _b !== void 0 ? _b : "已至"} ${Math.round(reached).toLocaleString()} ${(_d = (_c = ex.ui) === null || _c === void 0 ? void 0 : _c.axisUnit) !== null && _d !== void 0 ? _d : "m"}`,
                axisGlyph: (_f = (_e = ex.ui) === null || _e === void 0 ? void 0 : _e.forwardGlyph) !== null && _f !== void 0 ? _f : "▲",
                completed: Boolean(record && record.completed),
                record,
            };
        });
        this.setData({ open });
    },
    refreshAtlas() {
        const places = (0, place_search_1.queryPlaces)(places_1.PLACES, this.data.query, this.data.activeType);
        const atlas = places.map((p) => {
            var _a, _b;
            return ({
                id: p.id,
                name: p.name,
                emoji: p.emoji,
                typeLabel: (_b = (_a = places_1.PLACE_TYPE_META.find((m) => m.type === p.type)) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : "",
                shortDescription: p.shortDescription,
                favorited: favorites_store_1.favorites.isFavorite(p.id),
                exploration: Boolean(p.explorationId),
            });
        });
        this.setData({ atlas, atlasEmpty: atlas.length === 0 });
    },
    onTypeTap(e) {
        var _a, _b, _c;
        const type = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.type) !== null && _c !== void 0 ? _c : ALL_TYPE);
        if (type === this.data.activeType)
            return;
        this.setData({ activeType: type });
        this.refreshAtlas();
    },
    onQueryInput(e) {
        var _a, _b;
        this.setData({ query: String((_b = (_a = e.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : "") });
        this.refreshAtlas();
    },
    onQueryClear() {
        this.setData({ query: "" });
        this.refreshAtlas();
    },
    /** 路线图加载失败：隐藏图块并提示（不阻断流程） */
    onRouteImageError(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        this.setData({ [`routeImageFailed.${id}`]: true });
    },
    /** 打开地点详情 */
    onOpenPlace(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        wx.navigateTo({ url: `/pages/place/index?id=${id}` });
    },
    /** 进入探索（场景数据已就绪） */
    onGo(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        wx.navigateTo({ url: `/pages/exploration/index?id=${id}` });
    },
});
