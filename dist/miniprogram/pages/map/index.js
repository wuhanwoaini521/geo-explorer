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
const everest_1 = require("../../data/expeditions/everest");
const expedition_observation_1 = require("../../engine/expedition-observation");
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
        mapPoints: [],
        routeSegments: [],
        atlasOpen: false,
        mapMode: "地形",
        activePointId: "",
        activePlace: null,
        mapImageFailed: false,
    },
    onLoad() {
        this.refreshScenes();
        this.refreshAtlas();
    },
    onShow() {
        var _a, _b, _c, _d;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ selected: 1 });
        (_d = (_c = this.getTabBar) === null || _c === void 0 ? void 0 : _c.call(this)) === null || _d === void 0 ? void 0 : _d.setData({ hidden: false });
        // 从探索/图鉴返回后刷新完成度；仅当首页分类入口显式传入筛选时才切换类型
        const pending = (0, ui_bus_1.consumeTypeFilter)();
        const pendingQuery = (0, ui_bus_1.consumeSearchQuery)();
        const patch = {};
        if (pending !== null)
            patch.activeType = pending;
        if (pendingQuery !== null)
            patch.query = pendingQuery;
        if (Object.keys(patch).length)
            this.setData(patch);
        this.refreshScenes();
        this.refreshAtlas();
    },
    refreshScenes() {
        var _a, _b, _c;
        const records = (0, exploration_store_1.getRecords)();
        const everestRecord = records.find((record) => record.id === "everest");
        const reached = (_a = everestRecord === null || everestRecord === void 0 ? void 0 : everestRecord.reachElevation) !== null && _a !== void 0 ? _a : 0;
        const progress = (everestRecord === null || everestRecord === void 0 ? void 0 : everestRecord.completed)
            ? 1
            : (0, expedition_observation_1.progressForReferenceElevation)(everest_1.EVEREST_EXPEDITION.routeIndex, everest_1.EVEREST_EXPEDITION.maxElevation, reached);
        const canonical = (0, expedition_observation_1.buildObservationPoints)(everest_1.EVEREST_EXPEDITION, progress);
        const projection = (0, expedition_observation_1.projectRouteMilestones)(everest_1.EVEREST_EXPEDITION.routeIndex);
        const mapPoints = canonical.map((point) => {
            var _a;
            const position = (_a = projection.points.find((item) => item.id === point.id)) !== null && _a !== void 0 ? _a : { x: 50, y: 50 };
            return {
                id: point.id,
                name: point.label,
                altitudeText: point.elevationText,
                top: position.y,
                left: position.x,
                side: position.x > 55 ? "left" : "right",
                state: point.state,
                stateLabel: point.stateLabel,
                isSummit: point.id === "summit",
            };
        });
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
        const routeSegments = projection.points.slice(0, -1).map((point, index) => (0, expedition_observation_1.routeSegment)(point, projection.points[index + 1]));
        const currentPoint = (_b = mapPoints.find((point) => point.state === "current")) !== null && _b !== void 0 ? _b : mapPoints[0];
        const activePointId = this.data.activePointId && mapPoints.some((point) => point.id === this.data.activePointId)
            ? this.data.activePointId
            : (_c = currentPoint === null || currentPoint === void 0 ? void 0 : currentPoint.id) !== null && _c !== void 0 ? _c : "";
        this.setData({
            open,
            mapPoints,
            routeSegments,
            activePointId,
            activePlace: this.placeCardForPoint(activePointId, mapPoints),
        });
    },
    placeCardForPoint(id, points) {
        var _a;
        const point = (_a = points.find((item) => item.id === id)) !== null && _a !== void 0 ? _a : points[0];
        if (!point)
            return null;
        return {
            id: point.id,
            name: point.name,
            altitudeText: point.altitudeText,
            description: point.state === "completed"
                ? "已观察：从冰川纹理与雪脊形态认识这里的高山地貌。"
                : point.state === "current"
                    ? "当前观察点：留意冰体破碎、坡度与山脊走向。"
                    : "前方观察点：继续浏览山体影像，认识高海拔地貌变化。",
            image: this.mapPointImage(point.id),
            stateLabel: point.stateLabel,
        };
    },
    mapPointImage(id) {
        var _a;
        const images = {
            "base-camp": "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
            "khumbu-icefall": "/assets/world/everest-view-a.jpg",
            "camp-i": "/assets/world/everest-view-a.jpg",
            "western-cwm-camp-ii": "/assets/world/everest-view-b.jpg",
            "lhotse-face-camp-iii": "/assets/world/everest-view-b.jpg",
            "south-col-camp-iv": "/assets/world/everest-view-c.jpg",
            "south-summit": "/assets/world/everest-view-c.jpg",
            summit: "/assets/world/everest-hero.jpg",
        };
        return (_a = images[id]) !== null && _a !== void 0 ? _a : "/assets/world/everest-hero.jpg";
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
    onMapImageError() {
        this.setData({ mapImageFailed: true });
    },
    onMapPointTap(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        this.setData({
            activePointId: id,
            activePlace: this.placeCardForPoint(id, this.data.mapPoints),
        });
    },
    onToggleAtlas() {
        this.setData({ atlasOpen: !this.data.atlasOpen });
    },
    onToggleMapMode() {
        this.setData({ mapMode: this.data.mapMode === "地形" ? "路线" : "地形" });
    },
    onResetMap() {
        var _a;
        const point = (_a = this.data.mapPoints.find((item) => item.state === "current")) !== null && _a !== void 0 ? _a : this.data.mapPoints[0];
        if (!point)
            return;
        this.setData({ activePointId: point.id, activePlace: this.placeCardForPoint(point.id, this.data.mapPoints) });
    },
    onBack() {
        wx.switchTab({ url: "/pages/home/index" });
    },
    onOpenPlaceCard() {
        var _a;
        const id = (_a = this.data.activePlace) === null || _a === void 0 ? void 0 : _a.id;
        if (!id)
            return;
        wx.navigateTo({ url: `/pages/exploration/index?id=everest&waypointId=${id}` });
    },
});
