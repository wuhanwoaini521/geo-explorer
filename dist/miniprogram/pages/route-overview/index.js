"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const everest_1 = require("../../data/expeditions/everest");
const world_manifests_1 = require("../../data/media/world-manifests");
const media_registry_1 = require("../../engine/media-registry");
const expedition_observation_1 = require("../../engine/expedition-observation");
const FALLBACK_HERO = "/assets/expeditions/everest/live/live-a-kala-patthar.jpg";
function formatKm(meters) {
    return `${(meters / 1000).toFixed(1)} km`;
}
function imageForWaypoint(id) {
    var _a;
    const assets = (0, media_registry_1.getMediaForEntity)(world_manifests_1.RUNTIME_MANIFESTS, "waypoint", id);
    const asset = (_a = assets.find((item) => item.kind === "photograph")) !== null && _a !== void 0 ? _a : assets[0];
    if (!asset)
        return { path: FALLBACK_HERO, label: "路线参考图" };
    return {
        path: asset.localPath,
        label: asset.kind === "photograph" ? "现场照片" : "地形示意",
    };
}
function rows(progress) {
    const ordered = everest_1.EVEREST_EXPEDITION.routeIndex.milestones;
    const points = (0, expedition_observation_1.buildObservationPoints)(everest_1.EVEREST_EXPEDITION, progress);
    const byId = new Map(points.map((point) => [point.id, point]));
    const lastIndex = ordered.length - 1;
    return ordered
        .map((milestone, index) => {
        var _a;
        const point = byId.get(milestone.id);
        const state = (_a = point === null || point === void 0 ? void 0 : point.state) !== null && _a !== void 0 ? _a : "upcoming";
        const media = imageForWaypoint(milestone.id);
        return {
            id: milestone.id,
            // 路线页优先展示真实地点名；地貌归类作为解释，不能反客为主。
            title: milestone.name,
            landform: (0, expedition_observation_1.observationLabel)(milestone.id, milestone.name),
            elevation: `${(0, expedition_observation_1.formatObservationElevation)(milestone.refM, everest_1.EVEREST_EXPEDITION.maxElevation)} m`,
            image: media.path,
            imageLabel: media.label,
            roleLabel: index === 0 ? "起点" : index === lastIndex ? "终点" : `第 ${index + 1} 站`,
            state,
            stateLabel: state === "current" ? "当前位置" : state === "completed" ? "已抵达" : "未抵达",
        };
    })
        .reverse();
}
Page({
    data: {
        rows: [],
        heroImage: FALLBACK_HERO,
        routeTitle: "珠峰南坡路线",
        routeSubtitle: "南坡大本营 → 珠穆朗玛峰顶",
        progressText: "已抵达 1/8 个节点",
        progressPct: 0,
        distanceText: formatKm(everest_1.EVEREST_EXPEDITION.routeIndex.totalDistanceM),
        elevationSpanText: `${(0, expedition_observation_1.formatObservationElevation)(everest_1.EVEREST_EXPEDITION.maxElevation - everest_1.EVEREST_EXPEDITION.routeIndex.milestones[0].refM, Number.POSITIVE_INFINITY)} m`,
        nodeCountText: `${everest_1.EVEREST_EXPEDITION.routeIndex.milestones.length} 个`,
    },
    onLoad(query) {
        const progress = Math.max(0, Math.min(1, Number(query.progress || 0)));
        const routeRows = rows(progress);
        const completed = routeRows.filter((row) => row.state === "completed" || row.state === "current").length;
        const total = routeRows.length;
        this.setData({
            rows: routeRows,
            progressPct: Math.round(progress * 100),
            progressText: progress >= 0.999
                ? `路线已完成 · ${completed}/${total} 个节点`
                : `已抵达 ${completed}/${total} 个节点`,
        });
    },
    onRowTap(e) {
        var _a, _b;
        const id = String(((_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) || "");
        if (id)
            wx.navigateTo({ url: `/pages/camp-detail/index?id=${id}` });
    },
    onContinue() {
        wx.navigateBack({ delta: 1 });
    },
    onBack() {
        wx.navigateBack({ delta: 1 });
    },
});
