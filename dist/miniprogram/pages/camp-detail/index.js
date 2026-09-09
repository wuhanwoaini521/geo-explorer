"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const everest_1 = require("../../data/expeditions/everest");
const TABS = ["概览", "环境", "地形", "历史", "相关知识"];
function buildDetail(id, activeTab = "概览") {
    var _a;
    const point = (_a = everest_1.EVEREST_EXPEDITION.routeIndex.milestones.find((m) => m.id === id)) !== null && _a !== void 0 ? _a : everest_1.EVEREST_EXPEDITION.routeIndex.milestones.find((m) => m.id === "lhotse-face-camp-iii");
    const isCamp3 = point.id === "lhotse-face-camp-iii";
    const tabCopy = isCamp3
        ? {
            概览: {
                title: "洛子壁（Lhotse Face）",
                body: "是从 Camp II 通往 Camp III 的陡峭冰雪岩壁，平均坡度约 40–50°，高度超过 1,000 米，是攀登珠峰过程中最具挑战性的路段之一。",
            },
            环境: {
                title: "稀薄空气里的短暂停留",
                body: "7,200 米以上气压显著下降，温度常年低于冰点。登山者需要控制停留时间，在固定绳索和补给之间保持稳定节奏。",
            },
            地形: {
                title: "连续陡峭的冰雪岩壁",
                body: "洛子壁由硬雪、蓝冰和裸露岩石组成，坡面长而连续。路线的难点不是某一个台阶，而是持续攀爬带来的体力消耗。",
            },
            历史: {
                title: "南坡路线的关键转折",
                body: "从 Camp II 离开后，路线正式进入洛子峰冰壁。Camp III 是冲向南坳前的重要高海拔营地，也是整条南坡线路的关键转折。",
            },
            相关知识: {
                title: "继续理解这段路线",
                body: "从气压、温度到冰川运动，洛子壁把地理知识变成了可以亲身感受的路线变化。打开相关知识，继续查看珠峰上的自然现象。",
            },
        }
        : {};
    const copy = tabCopy[activeTab] || tabCopy.概览 || {
        title: `${point.name} · 远征节点`,
        body: `${point.name} 是珠峰南坡路线上的关键节点。这里的海拔约为 ${Math.round(point.refM).toLocaleString()} 米，登山者会在此短暂停留、补给并重新评估下一段路线。`,
    };
    return {
        id: point.id,
        title: isCamp3 ? "Camp III · 洛子壁" : point.name,
        range: isCamp3 ? "7,200 – 7,500 m" : `${Math.round(point.refM - 120)} – ${Math.round(point.refM + 120)} m`,
        hero: "/assets/world/everest-view-b.jpg",
        inlineImage: "/assets/world/everest-view-c.jpg",
        sectionTitle: copy.title,
        body: copy.body,
        facts: isCamp3
            ? [
                { label: "海拔范围", value: "7,200 – 7,500 m" },
                { label: "相对高度", value: "约 1,000 m" },
                { label: "平均坡度", value: "40 – 50°" },
                { label: "地形类型", value: "冰雪 / 岩壁" },
                { label: "主要风险", value: "滑坠、雪崩、缺氧" },
            ]
            : [
                { label: "参考海拔", value: `${Math.round(point.refM).toLocaleString()} m` },
                { label: "路线位置", value: `${Math.round(point.distanceM / 1000)} km · 南坡路线` },
                { label: "节点类型", value: "远征营地 / 途经点" },
            ],
        activeTab,
    };
}
Page({
    data: {
        tabs: TABS,
        detail: null,
    },
    onLoad(query) {
        this.setData({ detail: buildDetail(query.id || "lhotse-face-camp-iii") });
    },
    onTabTap(e) {
        var _a, _b;
        const tab = String(((_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.tab) || "概览");
        const detail = this.data.detail;
        if (!detail)
            return;
        this.setData({ detail: buildDetail(detail.id, tab) });
    },
    onOpenKnowledge() {
        wx.switchTab({ url: "/pages/knowledge/index" });
    },
    onBack() {
        wx.navigateBack({ delta: 1 });
    },
});
