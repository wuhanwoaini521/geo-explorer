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
const world_manifests_1 = require("../../data/media/world-manifests");
const everest_1 = require("../../data/expeditions/everest");
const expedition_observation_1 = require("../../engine/expedition-observation");
const places_1 = require("../../data/places");
const exploration_store_1 = require("../../services/exploration-store");
const ui_bus_1 = require("../../services/ui-bus");
const favorites_store_1 = require("../../services/favorites-store");
const place_search_1 = require("../../utils/place-search");
const globe_renderer_1 = require("../../engine/globe-renderer");
const globe_marker_projection_1 = require("../../engine/globe-marker-projection");
const webgl_globe_renderer_1 = require("../../engine/webgl-globe-renderer");
const COMING = [
    { id: "fuji", emoji: "🗻", title: "富士山", region: "日本 · 本州", basis: "海拔 3,776 m · 休眠火山" },
    { id: "sahara", emoji: "🏜️", title: "撒哈拉沙漠", region: "北非", basis: "世界最大热沙漠" },
];
const ALL_TYPE = "all";
const WORLD_DESTINATION_IDS = [
    "p-everest",
    "p-mariana",
    "p-fuji",
    "p-colorado",
    "p-sahara",
    "p-greenland",
    "p-kilauea",
    "p-qinghai",
];
const MARKER_GLYPHS = {
    mountain: "▲",
    ocean: "▼",
    volcano: "△",
    glacier: "◆",
    canyon: "◇",
    desert: "·",
    plateau: "▰",
};
let webglRenderer = null;
let canvasRenderer = null;
let globeTouch = null;
let globeVariant = "half";
let initialSelectedId = "";
let initialQuery = "";
let globeCanvasOffsetX = 0;
let globeCanvasOffsetY = 0;
let globeCanvasWidth = 0;
let globeCanvasHeight = 0;
let globeEarthOnly = false;
let globeMode = "";
let globeSelectedMode = false;
let forceCanvas = false;
let globeBumpEnabled = true;
let globeAtmosphereEnabled = true;
let globeTextureScale = 2048;
let globeLabelContext = null;
let globeLabelWidth = 0;
let globeLabelHeight = 0;
let latestGlobeProjections = [];
function activeGlobeRenderer() {
    return webglRenderer !== null && webglRenderer !== void 0 ? webglRenderer : canvasRenderer;
}
function mapHeaderTop() {
    var _a, _b, _c, _d;
    const runtime = wx;
    const statusBarHeight = (_b = (_a = runtime.getSystemInfoSync) === null || _a === void 0 ? void 0 : _a.call(runtime).statusBarHeight) !== null && _b !== void 0 ? _b : 20;
    const menuBottom = (_d = (_c = runtime.getMenuButtonBoundingClientRect) === null || _c === void 0 ? void 0 : _c.call(runtime).bottom) !== null && _d !== void 0 ? _d : statusBarHeight + 32;
    return Math.ceil(Math.max(statusBarHeight + 12, menuBottom + 10));
}
function placeImage(place) {
    // Long Run 2：已晋升的地点 hero（runtime 媒体）优先
    const runtimeHero = (0, world_manifests_1.getPlaceHeroImage)(place.id);
    if (runtimeHero)
        return runtimeHero;
    if (place.id === "p-everest")
        return "/assets/expeditions/everest/live/live-a-kala-patthar.jpg";
    if (place.type === "glacier" || place.type === "mountain")
        return "/assets/world/everest-expedition-hero-v1.png";
    return "";
}
function metricForPlace(place) {
    if (place.elevationM < 0)
        return { label: "最大深度", value: `约 ${Math.abs(place.elevationM).toLocaleString()} m` };
    if (place.type === "canyon")
        return { label: "谷底高程", value: `${place.elevationM.toLocaleString()} m` };
    return { label: "最高点", value: `${place.elevationM.toLocaleString()} m` };
}
function worldMarker(place) {
    var _a, _b, _c;
    const left = Math.max(3, Math.min(97, ((place.longitude + 180) / 360) * 100));
    const top = Math.max(8, Math.min(92, ((90 - place.latitude) / 180) * 100));
    return {
        id: place.id,
        name: place.name,
        nameEn: place.nameEn,
        typeLabel: (_b = (_a = places_1.PLACE_TYPE_META.find((item) => item.type === place.type)) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : "地貌",
        typeGlyph: (_c = MARKER_GLYPHS[place.type]) !== null && _c !== void 0 ? _c : "·",
        latitude: place.latitude,
        longitude: place.longitude,
        metricText: metricForPlace(place).value,
        // 墨卡托式的简化世界图定位：用于发现入口，不作为测绘底图。
        left,
        top,
        screenLeft: left,
        screenTop: top,
        screenOpacity: 1,
        screenVisible: true,
        labelPlacement: left < 24 ? "right" : left > 76 ? "left" : "center",
        explorationId: place.explorationId,
        featured: Boolean(place.featured || place.explorationId),
        state: place.explorationId && (0, exploration_store_1.getRecords)().some((record) => record.id === place.explorationId && record.completed)
            ? "explored"
            : "normal",
    };
}
function destinationPreview(place) {
    var _a, _b;
    const metric = metricForPlace(place);
    return {
        id: place.id,
        name: place.name,
        nameEn: place.nameEn,
        typeLabel: (_b = (_a = places_1.PLACE_TYPE_META.find((item) => item.type === place.type)) === null || _a === void 0 ? void 0 : _a.label) !== null && _b !== void 0 ? _b : "地貌",
        region: place.region,
        metricLabel: metric.label,
        metricValue: metric.value,
        description: place.explorationId
            ? place.id === "p-mariana"
                ? "从海面逐层下潜，穿过阳光带、黑暗带，直到挑战者深渊。"
                : "从大本营沿真实路线前进，在环境变化中认识世界之巅。"
            : place.description,
        actionLabel: place.explorationId
            ? place.id === "p-mariana" ? "开始下潜" : "开始攀登"
            : "查看地点",
        image: placeImage(place),
        explorationId: place.explorationId,
    };
}
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
        selectedDestination: null,
        worldMarkers: [],
        worldMarkerCount: 0,
        recommendations: [],
        selectedMarkerId: "",
        globeSelectedMode: false,
        webglFailed: false,
        globeEarthOnly: false,
        globeFailed: false,
        headerTop: 62,
    },
    onLoad(options) {
        var _a, _b, _c;
        this.setData({ headerTop: mapHeaderTop() });
        globeMode = (_a = options === null || options === void 0 ? void 0 : options.globe) !== null && _a !== void 0 ? _a : "";
        globeVariant = globeMode === "third" ? "third" : globeMode === "low" ? "low" : "half";
        globeEarthOnly = globeMode === "earth-only" || globeMode === "no-bump" || globeMode === "with-bump" || globeMode === "no-atmosphere" || globeMode === "subtle-atmosphere" || globeMode.startsWith("variant-");
        forceCanvas = globeMode === "canvas";
        globeBumpEnabled = (options === null || options === void 0 ? void 0 : options.bump) !== "0" && globeMode !== "no-bump";
        globeAtmosphereEnabled = (options === null || options === void 0 ? void 0 : options.atmosphere) !== "0" && globeMode !== "no-atmosphere";
        globeTextureScale = (options === null || options === void 0 ? void 0 : options.texture) === "4096" ? 4096 : 2048;
        if (globeMode === "no-bump")
            globeBumpEnabled = false;
        if (globeMode === "with-bump")
            globeBumpEnabled = true;
        if (globeMode === "no-atmosphere")
            globeAtmosphereEnabled = false;
        if (globeMode === "subtle-atmosphere")
            globeAtmosphereEnabled = true;
        initialSelectedId = (_b = options === null || options === void 0 ? void 0 : options.selected) !== null && _b !== void 0 ? _b : "";
        initialQuery = (_c = options === null || options === void 0 ? void 0 : options.q) !== null && _c !== void 0 ? _c : "";
        globeSelectedMode = Boolean(initialSelectedId || initialQuery);
        this.setData({ globeEarthOnly, globeSelectedMode });
        this.refreshScenes();
        const query = initialQuery;
        const activeType = (options === null || options === void 0 ? void 0 : options.type) && options.type !== ALL_TYPE
            ? options.type
            : ALL_TYPE;
        if (query || activeType !== ALL_TYPE) {
            this.setData({ query, activeType });
            this.refreshAtlas();
            this.focusGlobeQuery(query);
        }
        else {
            this.refreshAtlas();
        }
    },
    onReady() {
        this.initGlobe();
    },
    onShow() {
        var _a, _b, _c, _d, _e, _f;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ selected: 1 });
        (_d = (_c = this.getTabBar) === null || _c === void 0 ? void 0 : _c.call(this)) === null || _d === void 0 ? void 0 : _d.setData({ hidden: globeEarthOnly });
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
        // 首页分类/搜索入口跳转过来的意图是「看筛选结果」。筛选此前确实生效了，
        // 但结果只在图鉴抽屉里渲染，不自动打开的话用户只看到地球，等同于点了没反应。
        // 走 onToggleAtlas 而不是直接 setData：它同时负责停掉地球渲染并卸载 canvas 节点。
        if (!this.data.atlasOpen && (pending !== null || pendingQuery !== null)) {
            this.onToggleAtlas();
            return;
        }
        if (!this.data.atlasOpen) {
            (_e = activeGlobeRenderer()) === null || _e === void 0 ? void 0 : _e.resumeRotation();
            (_f = activeGlobeRenderer()) === null || _f === void 0 ? void 0 : _f.start();
        }
    },
    onHide() {
        webglRenderer === null || webglRenderer === void 0 ? void 0 : webglRenderer.stop();
        canvasRenderer === null || canvasRenderer === void 0 ? void 0 : canvasRenderer.stop();
    },
    onUnload() {
        webglRenderer === null || webglRenderer === void 0 ? void 0 : webglRenderer.dispose();
        canvasRenderer === null || canvasRenderer === void 0 ? void 0 : canvasRenderer.stop();
        webglRenderer = null;
        canvasRenderer = null;
        globeTouch = null;
        globeCanvasOffsetX = 0;
        globeCanvasOffsetY = 0;
        globeCanvasWidth = 0;
        globeCanvasHeight = 0;
        globeLabelContext = null;
        globeLabelWidth = 0;
        globeLabelHeight = 0;
        latestGlobeProjections = [];
    },
    initGlobe() {
        const system = wx.getSystemInfoSync();
        if (forceCanvas) {
            this.setData({ webglFailed: true }, () => this.initCanvasFallback());
            return;
        }
        try {
            wx.createSelectorQuery()
                .select("#globeWebglCanvas")
                .fields({ node: true, size: true, rect: true })
                .exec((result) => {
                var _a, _b;
                const canvasInfo = result[0];
                if (!(canvasInfo === null || canvasInfo === void 0 ? void 0 : canvasInfo.node) || !canvasInfo.width || !canvasInfo.height) {
                    this.setData({ webglFailed: true }, () => this.initCanvasFallback());
                    return;
                }
                globeCanvasWidth = canvasInfo.width;
                globeCanvasHeight = canvasInfo.height;
                globeCanvasOffsetX = (_a = canvasInfo.left) !== null && _a !== void 0 ? _a : 0;
                globeCanvasOffsetY = (_b = canvasInfo.top) !== null && _b !== void 0 ? _b : (globeEarthOnly || initialSelectedId || initialQuery ? 0 : system.windowWidth * 208 / 750);
                try {
                    const variantMode = this.data.globeEarthOnly ? "earth-only" : "default";
                    const renderOptions = {
                        earthOnly: globeEarthOnly,
                        selectedMode: globeSelectedMode,
                        bumpEnabled: globeBumpEnabled,
                        atmosphereEnabled: globeAtmosphereEnabled,
                        textureScale: globeTextureScale,
                        bumpScale: globeMode === "variant-b" ? 1.02 : variantMode === "earth-only" ? 1.18 : globeVariant === "low" ? 0.94 : 1.18,
                        atmosphereStrength: globeMode === "variant-c" ? 0.32 : 0.38,
                    };
                    webglRenderer = new webgl_globe_renderer_1.WebGLGlobeRenderer(canvasInfo.node, canvasInfo.width, canvasInfo.height, system.pixelRatio, globeVariant, renderOptions);
                    const projectionListener = (projections) => {
                        latestGlobeProjections = projections;
                        this.drawGlobeLabels(projections);
                        if (!this.data.worldMarkers.length || !globeCanvasWidth || !globeCanvasHeight)
                            return;
                        const projectionById = new Map(projections.map((projection) => [projection.id, projection]));
                        const worldMarkers = this.data.worldMarkers.map((marker) => {
                            const projection = projectionById.get(marker.id);
                            if (!projection)
                                return marker;
                            // X/Y 必须同基准（承载标记的容器）。此前高度误用整屏高度，
                            // 标记会整体上移、脱离球面飘到太空里。
                            const percent = (0, globe_marker_projection_1.markerScreenPercent)(projection.screenX, projection.screenY, {
                                width: system.windowWidth,
                                height: system.windowHeight,
                                offsetX: globeCanvasOffsetX,
                                offsetY: globeCanvasOffsetY,
                            });
                            return {
                                ...marker,
                                screenLeft: percent.left,
                                screenTop: percent.top,
                                screenOpacity: projection.opacity,
                                screenVisible: projection.visible,
                                labelPlacement: percent.left < 24
                                    ? "right"
                                    : percent.left > 76 ? "left" : "center",
                            };
                        });
                        this.setData({ worldMarkers });
                    };
                    webglRenderer.setProjectionListener(projectionListener);
                    webglRenderer.setMarkers(this.data.worldMarkers);
                    this.initGlobeLabelLayer();
                    const initialPlace = places_1.PLACES.find((place) => place.id === initialSelectedId);
                    if (initialPlace)
                        this.focusGlobePlace(initialPlace);
                    else if (initialQuery)
                        this.focusGlobeQuery(initialQuery);
                    webglRenderer.start();
                }
                catch (_c) {
                    webglRenderer === null || webglRenderer === void 0 ? void 0 : webglRenderer.dispose();
                    webglRenderer = null;
                    this.setData({ webglFailed: true }, () => this.initCanvasFallback());
                }
            });
        }
        catch (_a) {
            this.setData({ webglFailed: true }, () => this.initCanvasFallback());
        }
    },
    initCanvasFallback() {
        const system = wx.getSystemInfoSync();
        try {
            wx.createSelectorQuery()
                .select("#globeCanvas")
                .fields({ node: true, size: true, rect: true })
                .exec((result) => {
                var _a, _b;
                const canvasInfo = result[0];
                if (!(canvasInfo === null || canvasInfo === void 0 ? void 0 : canvasInfo.node) || !canvasInfo.width || !canvasInfo.height) {
                    this.setData({ globeFailed: true });
                    return;
                }
                globeCanvasWidth = canvasInfo.width;
                globeCanvasHeight = canvasInfo.height;
                globeCanvasOffsetX = (_a = canvasInfo.left) !== null && _a !== void 0 ? _a : 0;
                globeCanvasOffsetY = (_b = canvasInfo.top) !== null && _b !== void 0 ? _b : (globeEarthOnly || initialSelectedId || initialQuery ? 0 : system.windowWidth * 208 / 750);
                try {
                    canvasRenderer = new globe_renderer_1.GlobeRenderer(canvasInfo.node, canvasInfo.width, canvasInfo.height, system.pixelRatio, globeVariant, globeSelectedMode);
                    canvasRenderer.setMarkers(this.data.worldMarkers);
                    canvasRenderer.start();
                }
                catch (_c) {
                    canvasRenderer = null;
                    this.setData({ globeFailed: true });
                }
            });
        }
        catch (_a) {
            this.setData({ globeFailed: true });
        }
    },
    initGlobeLabelLayer() {
        try {
            wx.createSelectorQuery()
                .select("#globeLabelCanvas")
                .fields({ node: true, size: true })
                .exec((result) => {
                const canvasInfo = result[0];
                if (!(canvasInfo === null || canvasInfo === void 0 ? void 0 : canvasInfo.node) || !canvasInfo.width || !canvasInfo.height)
                    return;
                const pixelRatio = Math.max(1, wx.getSystemInfoSync().pixelRatio);
                canvasInfo.node.width = Math.round(canvasInfo.width * pixelRatio);
                canvasInfo.node.height = Math.round(canvasInfo.height * pixelRatio);
                const context = canvasInfo.node.getContext("2d");
                context.scale(pixelRatio, pixelRatio);
                globeLabelContext = context;
                globeLabelWidth = canvasInfo.width;
                globeLabelHeight = canvasInfo.height;
                this.drawGlobeLabels(latestGlobeProjections);
            });
        }
        catch (_a) {
            globeLabelContext = null;
        }
    },
    drawGlobeLabels(projections = latestGlobeProjections) {
        const context = globeLabelContext;
        if (!context || !globeLabelWidth || !globeLabelHeight)
            return;
        context.clearRect(0, 0, globeLabelWidth, globeLabelHeight);
        const markerById = new Map(this.data.worldMarkers.map((marker) => [marker.id, marker]));
        projections
            .filter((projection) => projection.visible && projection.opacity > 0.2)
            .sort((a, b) => a.z - b.z)
            .forEach((projection) => {
            const marker = markerById.get(projection.id);
            if (!marker)
                return;
            const selected = marker.id === this.data.selectedMarkerId;
            const title = marker.name;
            const meta = `${marker.typeLabel} · ${marker.metricText}`;
            context.save();
            context.globalAlpha = selected ? 1 : Math.max(0.58, projection.opacity);
            context.font = selected ? "700 13px sans-serif" : "600 12px sans-serif";
            const titleWidth = context.measureText(title).width;
            context.font = "500 10px sans-serif";
            const metaWidth = context.measureText(meta).width;
            const labelWidth = Math.min(168, Math.max(92, Math.max(titleWidth, metaWidth) + 22));
            const labelHeight = selected ? 39 : 36;
            const placeLeft = projection.screenX > globeLabelWidth * 0.64;
            const left = Math.max(8, Math.min(globeLabelWidth - labelWidth - 8, placeLeft ? projection.screenX - labelWidth - 14 : projection.screenX + 14));
            const top = Math.max(8, Math.min(globeLabelHeight - labelHeight - 8, projection.screenY - labelHeight / 2));
            context.fillStyle = selected ? "rgba(44, 24, 27, .96)" : "rgba(3, 21, 35, .92)";
            context.fillRect(left, top, labelWidth, labelHeight);
            context.fillStyle = selected ? "#ff8264" : "#66e4ef";
            context.fillRect(placeLeft ? left + labelWidth - 3 : left, top, 3, labelHeight);
            context.textAlign = "left";
            context.textBaseline = "top";
            context.font = selected ? "700 13px sans-serif" : "600 12px sans-serif";
            context.fillStyle = "#f4fbff";
            context.fillText(title, left + 11, top + 5);
            context.font = "500 10px sans-serif";
            context.fillStyle = "#91d5e7";
            context.fillText(meta, left + 11, top + 21);
            context.restore();
        });
    },
    syncGlobeMarkers() {
        var _a;
        (_a = activeGlobeRenderer()) === null || _a === void 0 ? void 0 : _a.setMarkers(this.data.worldMarkers);
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
            worldMarkers: WORLD_DESTINATION_IDS
                .map((id) => places_1.PLACES.find((place) => place.id === id))
                .filter((place) => Boolean(place))
                .map(worldMarker),
            worldMarkerCount: WORLD_DESTINATION_IDS.length,
            recommendations: WORLD_DESTINATION_IDS
                .slice(0, 2)
                .map((id) => places_1.PLACES.find((place) => place.id === id))
                .filter((place) => Boolean(place))
                .map(destinationPreview),
        });
        this.syncGlobeMarkers();
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
            "khumbu-icefall": "/assets/expeditions/everest/waypoints/khumbu-icefall.jpg",
            "camp-i": "/assets/expeditions/everest/waypoints/camp-i.jpg",
            "western-cwm-camp-ii": "/assets/expeditions/everest/waypoints/western-cwm-camp-ii.jpg",
            "lhotse-face-camp-iii": "/assets/expeditions/everest/waypoints/lhotse-face-camp-iii.jpg",
            "south-col-camp-iv": "/assets/expeditions/everest/waypoints/south-col-camp-iv.jpg",
            "south-summit": "/assets/expeditions/everest/waypoints/south-summit.jpg",
            summit: "/assets/expeditions/everest/waypoints/summit.jpg",
        };
        return (_a = images[id]) !== null && _a !== void 0 ? _a : "/assets/world/everest-expedition-hero-v1.png";
    },
    refreshAtlas(afterUpdate) {
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
        const destinationPlaces = WORLD_DESTINATION_IDS
            .map((id) => places_1.PLACES.find((place) => place.id === id))
            .filter((place) => Boolean(place));
        const worldPlaces = (0, place_search_1.queryPlaces)(destinationPlaces, this.data.query, this.data.activeType);
        this.setData({
            atlas,
            atlasEmpty: atlas.length === 0,
            worldMarkers: worldPlaces.map(worldMarker),
            worldMarkerCount: worldPlaces.length,
        });
        this.syncGlobeMarkers();
        afterUpdate === null || afterUpdate === void 0 ? void 0 : afterUpdate();
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
        const query = String((_b = (_a = e.detail) === null || _a === void 0 ? void 0 : _a.value) !== null && _b !== void 0 ? _b : "");
        this.setData({ query });
        this.refreshAtlas();
        this.focusGlobeQuery(query);
    },
    onQueryClear() {
        var _a;
        this.setData({ query: "" });
        this.refreshAtlas();
        this.setData({ selectedDestination: null, selectedMarkerId: "", globeSelectedMode: false });
        globeCanvasOffsetX = 0;
        (_a = activeGlobeRenderer()) === null || _a === void 0 ? void 0 : _a.setSelected(null);
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
        const place = places_1.PLACES.find((item) => item.id === id);
        if (place) {
            this.focusGlobePlace(place);
            return;
        }
        this.setData({
            activePointId: id,
            activePlace: this.placeCardForPoint(id, this.data.mapPoints),
        });
    },
    /**
     * 推荐卡点击：直接进入对应体验（可探索 → 探索页，否则 → 地点详情）。
     * 此前推荐卡绑的是 onMapPointTap，只会选中地球并弹出预览卡，
     * 卡片上的「开始攀登 / 开始下潜」点了没有下文。
     */
    onOpenRecommendation(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        const place = places_1.PLACES.find((item) => item.id === id);
        if (!place)
            return;
        if (place.explorationId) {
            wx.navigateTo({ url: `/pages/exploration/index?id=${place.explorationId}` });
            return;
        }
        wx.navigateTo({ url: `/pages/place/index?id=${place.id}` });
    },
    onDestinationTap(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        const place = places_1.PLACES.find((item) => item.id === id);
        if (!place)
            return;
        this.focusGlobePlace(place);
    },
    onOpenDestination() {
        const destination = this.data.selectedDestination;
        if (!destination)
            return;
        if (destination.explorationId) {
            wx.navigateTo({ url: `/pages/exploration/index?id=${destination.explorationId}` });
            return;
        }
        wx.navigateTo({ url: `/pages/place/index?id=${destination.id}` });
    },
    onCloseDestination() {
        var _a;
        this.setData({ selectedDestination: null, selectedMarkerId: "", globeSelectedMode: false });
        globeCanvasOffsetX = 0;
        (_a = activeGlobeRenderer()) === null || _a === void 0 ? void 0 : _a.setSelected(null);
        this.drawGlobeLabels();
    },
    globeTouchPoint(e) {
        var _a, _b, _c, _d, _e;
        const detailX = (_a = e.detail) === null || _a === void 0 ? void 0 : _a.x;
        const detailY = (_b = e.detail) === null || _b === void 0 ? void 0 : _b.y;
        if (typeof detailX === "number" && typeof detailY === "number") {
            // 自动化与 Canvas 自身的 detail 坐标已经是渲染器局部坐标。
            return { x: detailX, y: detailY };
        }
        const touch = (_d = (_c = e.touches) === null || _c === void 0 ? void 0 : _c[0]) !== null && _d !== void 0 ? _d : (_e = e.changedTouches) === null || _e === void 0 ? void 0 : _e[0];
        if (!touch)
            return null;
        // cover-view 触摸坐标以页面视口为基准，必须同时扣除 Canvas 的真实 left/top。
        return {
            x: touch.clientX - globeCanvasOffsetX,
            y: touch.clientY - globeCanvasOffsetY,
        };
    },
    onGlobeTouchStart(e) {
        var _a;
        const point = this.globeTouchPoint(e);
        if (!point)
            return;
        globeTouch = {
            ...point,
            startX: point.x,
            startY: point.y,
            moved: false,
            velocityX: 0,
            velocityY: 0,
        };
        (_a = activeGlobeRenderer()) === null || _a === void 0 ? void 0 : _a.pauseRotation();
    },
    onGlobeTouchMove(e) {
        var _a;
        const point = this.globeTouchPoint(e);
        if (!point || !globeTouch)
            return;
        const deltaX = point.x - globeTouch.x;
        const deltaY = point.y - globeTouch.y;
        if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
            (_a = activeGlobeRenderer()) === null || _a === void 0 ? void 0 : _a.dragBy(deltaX, deltaY);
            // 用整段手势位移判定拖动，避免慢速拖动因每一帧位移不足阈值而被误判为点击。
            globeTouch.moved = globeTouch.moved
                || Math.hypot(point.x - globeTouch.startX, point.y - globeTouch.startY) > 6;
            globeTouch.velocityX = deltaX;
            globeTouch.velocityY = deltaY;
            globeTouch.x = point.x;
            globeTouch.y = point.y;
        }
    },
    onGlobeTouchEnd(e) {
        var _a, _b, _c;
        const point = this.globeTouchPoint(e);
        const touch = globeTouch;
        globeTouch = null;
        if (!point || !touch)
            return;
        if (!touch.moved) {
            const id = (_a = activeGlobeRenderer()) === null || _a === void 0 ? void 0 : _a.hitTest(point.x, point.y);
            if (id)
                this.openGlobeMarker(id);
            else
                (_b = activeGlobeRenderer()) === null || _b === void 0 ? void 0 : _b.resumeRotation();
        }
        else {
            (_c = activeGlobeRenderer()) === null || _c === void 0 ? void 0 : _c.release(touch.velocityX, touch.velocityY);
        }
    },
    onGlobeTouchCancel() {
        var _a, _b;
        const touch = globeTouch;
        globeTouch = null;
        if (touch === null || touch === void 0 ? void 0 : touch.moved)
            (_a = activeGlobeRenderer()) === null || _a === void 0 ? void 0 : _a.release(touch.velocityX, touch.velocityY);
        else
            (_b = activeGlobeRenderer()) === null || _b === void 0 ? void 0 : _b.resumeRotation();
    },
    openGlobeMarker(id) {
        const place = places_1.PLACES.find((item) => item.id === id);
        if (!place)
            return;
        this.focusGlobePlace(place);
    },
    focusGlobePlace(place) {
        var _a, _b;
        this.setData({ selectedDestination: destinationPreview(place), selectedMarkerId: place.id }, () => {
            this.drawGlobeLabels();
        });
        globeCanvasOffsetX = 0;
        (_a = activeGlobeRenderer()) === null || _a === void 0 ? void 0 : _a.setSelected(place.id);
        (_b = activeGlobeRenderer()) === null || _b === void 0 ? void 0 : _b.focusOnMarker(place.id);
    },
    focusGlobeQuery(query) {
        var _a, _b;
        if (query.trim().length < 2) {
            this.setData({ selectedDestination: null, selectedMarkerId: "", globeSelectedMode: false });
            (_a = activeGlobeRenderer()) === null || _a === void 0 ? void 0 : _a.setSelected(null);
            return;
        }
        const destinationPlaces = WORLD_DESTINATION_IDS
            .map((id) => places_1.PLACES.find((place) => place.id === id))
            .filter((place) => Boolean(place));
        const place = (0, place_search_1.queryPlaces)(destinationPlaces, query, "all")[0];
        if (place)
            this.focusGlobePlace(place);
        else {
            this.setData({ selectedDestination: null, selectedMarkerId: "", globeSelectedMode: false });
            (_b = activeGlobeRenderer()) === null || _b === void 0 ? void 0 : _b.setSelected(null);
        }
    },
    onToggleAtlas() {
        const opening = !this.data.atlasOpen;
        if (opening) {
            webglRenderer === null || webglRenderer === void 0 ? void 0 : webglRenderer.stop();
            canvasRenderer === null || canvasRenderer === void 0 ? void 0 : canvasRenderer.stop();
            this.setData({
                atlasOpen: true,
                selectedDestination: null,
                selectedMarkerId: "",
                globeSelectedMode: false,
            });
            return;
        }
        // 图鉴关闭后重新创建 Canvas。原生 Canvas 被 wx:if 移除过，不能继续复用旧节点。
        webglRenderer === null || webglRenderer === void 0 ? void 0 : webglRenderer.dispose();
        canvasRenderer === null || canvasRenderer === void 0 ? void 0 : canvasRenderer.stop();
        webglRenderer = null;
        canvasRenderer = null;
        globeTouch = null;
        this.setData({ atlasOpen: false, webglFailed: false, globeFailed: false }, () => {
            this.initGlobe();
        });
    },
    onToggleMapMode() {
        this.setData({ mapMode: this.data.mapMode === "地形" ? "路线" : "地形" });
    },
    onResetGlobe() {
        var _a;
        this.setData({ selectedDestination: null, selectedMarkerId: "", globeSelectedMode: false });
        globeCanvasOffsetX = 0;
        (_a = activeGlobeRenderer()) === null || _a === void 0 ? void 0 : _a.reset();
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
