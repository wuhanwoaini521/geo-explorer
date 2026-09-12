"use strict";
Page({
    data: {
        terrain: false,
        hero: "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
        peaks: [
            { name: "洛子峰", elevation: "8,516 m", left: 18, top: 35 },
            { name: "珠穆朗玛峰", elevation: "8,848 m", left: 50, top: 19 },
            { name: "努子峰", elevation: "7,861 m", left: 77, top: 34 },
        ],
    },
    onToggleTerrain(e) {
        var _a, _b;
        const mode = String(((_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.mode) || "terrain");
        const terrain = mode === "terrain";
        this.setData({
            terrain,
            hero: terrain
                ? "/assets/world/everest-expedition-hero-v1.png"
                : "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
        });
    },
    onBack() { wx.navigateBack({ delta: 1 }); },
});
