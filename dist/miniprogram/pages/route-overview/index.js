"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const everest_1 = require("../../data/expeditions/everest");
const IMAGES = [
    "/assets/world/everest-view-c.jpg",
    "/assets/world/everest-view-b.jpg",
    "/assets/world/everest-view-a.jpg",
    "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
];
function rows(progress) {
    var _a;
    const ordered = everest_1.EVEREST_EXPEDITION.routeIndex.milestones
        .filter((m) => m.id !== "south-summit")
        .slice();
    const current = (_a = ordered.find((m) => m.progress >= progress)) !== null && _a !== void 0 ? _a : ordered[ordered.length - 1];
    return ordered.reverse().map((m) => ({
        id: m.id,
        title: m.id === "summit" ? "珠穆朗玛峰 Summit" : m.name,
        elevation: `${Math.round(m.refM).toLocaleString()} m`,
        image: IMAGES[ordered.indexOf(m) % IMAGES.length],
        state: m.progress < progress ? "completed" : m.id === current.id ? "current" : "upcoming",
    }));
}
Page({
    data: { rows: [] },
    onLoad(query) {
        const progress = Math.max(0, Math.min(1, Number(query.progress || 0)));
        this.setData({ rows: rows(progress) });
    },
    onRowTap(e) {
        var _a, _b;
        const id = String(((_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) || "");
        if (id)
            wx.navigateTo({ url: `/pages/camp-detail/index?id=${id}` });
    },
    onBack() { wx.navigateBack({ delta: 1 }); },
});
