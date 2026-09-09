"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../data/explorations/index");
const everest_1 = require("../../data/expeditions/everest");
const exploration_engine_1 = require("../../engine/exploration-engine");
const format_1 = require("../../utils/format");
const EXP = (0, index_1.getExplorationById)("everest");
const TABS = [
    { key: "elevation", label: "海拔" },
    { key: "pressure", label: "气压" },
    { key: "oxygen", label: "氧气" },
    { key: "temperature", label: "温度" },
];
function metricValue(m, key) {
    if (key === "elevation")
        return m.refM;
    if (key === "pressure")
        return (0, exploration_engine_1.pressureAt)(EXP, m.refM);
    if (key === "oxygen")
        return (0, exploration_engine_1.pressureRatioAt)(m.refM);
    return (0, exploration_engine_1.temperatureAt)(EXP, m.refM);
}
function metricText(value, key) {
    if (key === "elevation")
        return Math.round(value).toLocaleString();
    if (key === "pressure")
        return `${(value / 10).toFixed(1)} kPa`;
    if (key === "oxygen")
        return `${Math.round(value * 100)}%`;
    return (0, format_1.formatTemperature)(value);
}
function chart(key) {
    const source = everest_1.EVEREST_EXPEDITION.routeIndex.milestones.filter((m) => m.id !== "south-summit");
    const values = source.map((m) => metricValue(m, key));
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = Math.max(1, hi - lo);
    const points = values.map((value, i) => ({
        x: 8 + i * (84 / Math.max(1, values.length - 1)),
        y: key === "elevation" ? 78 - (value / 9000) * 60 : 78 - ((value - lo) / span) * 60,
        label: source[i].id === "base-camp" ? "大本营" : source[i].id === "summit" ? "顶峰" : source[i].name.replace("营地", ""),
        value: metricText(value, key),
    }));
    const segments = points.slice(0, -1).map((p, i) => {
        const n = points[i + 1];
        const dx = n.x - p.x;
        const dy = n.y - p.y;
        return { x: (p.x + n.x) / 2, y: (p.y + n.y) / 2, width: Math.hypot(dx, dy), rotate: Math.atan2(dy, dx) * 180 / Math.PI };
    });
    return { points, segments, min: key === "elevation" ? "0" : metricText(lo, key), max: key === "elevation" ? "9,000" : metricText(hi, key) };
}
Page({
    data: { tabs: TABS, active: "elevation", chart: chart("elevation") },
    onMetricTap(e) {
        var _a, _b;
        const key = String(((_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.key) || "elevation");
        this.setData({ active: key, chart: chart(key) });
    },
    onBack() { wx.navigateBack({ delta: 1 }); },
});
