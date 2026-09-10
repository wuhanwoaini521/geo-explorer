"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const everest_1 = require("../../data/expeditions/everest");
const expedition_observation_1 = require("../../engine/expedition-observation");
const DISPLAY_IDS = new Set([
    "base-camp",
    "khumbu-icefall",
    "lhotse-face-camp-iii",
    "south-col-camp-iv",
    "summit",
]);
function rows(progress) {
    const ordered = everest_1.EVEREST_EXPEDITION.routeIndex.milestones
        .filter((m) => DISPLAY_IDS.has(m.id))
        .slice();
    const points = (0, expedition_observation_1.buildObservationPoints)(everest_1.EVEREST_EXPEDITION, progress);
    const byId = new Map(points.map((point) => [point.id, point]));
    return ordered.reverse().map((m) => {
        var _a, _b;
        const point = byId.get(m.id);
        return {
            id: m.id,
            title: (0, expedition_observation_1.observationLabel)(m.id, m.name),
            elevation: `${(0, expedition_observation_1.formatObservationElevation)(m.refM, everest_1.EVEREST_EXPEDITION.maxElevation)} m`,
            image: "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
            state: (_a = point === null || point === void 0 ? void 0 : point.state) !== null && _a !== void 0 ? _a : "upcoming",
            stateLabel: (_b = point === null || point === void 0 ? void 0 : point.stateLabel) !== null && _b !== void 0 ? _b : "待观察",
        };
    });
}
Page({
    data: { rows: [], progressText: "已观察 1/5" },
    onLoad(query) {
        const progress = Math.max(0, Math.min(1, Number(query.progress || 0)));
        const routeRows = rows(progress);
        const completed = routeRows.filter((row) => row.state === "completed" || row.state === "current").length;
        this.setData({ rows: routeRows, progressText: `已观察 ${completed}/5` });
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
    onBack() { wx.navigateBack({ delta: 1 }); },
});
