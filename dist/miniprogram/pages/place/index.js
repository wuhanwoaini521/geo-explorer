"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 📍 地点详情页 —— 地理图鉴的单点详情。
 * 数据全部来自 data/places（GeoPlace），页面只做组装与跳转：
 * Overview / Formation / Climate / Facts / 相关地点 / 关联知识 / 进入沉浸探索。
 */
const places_1 = require("../../data/places");
const knowledge_1 = require("../../data/knowledge");
const index_1 = require("../../data/explorations/index");
const favorites_store_1 = require("../../services/favorites-store");
const format_1 = require("../../utils/format");
const DETAIL_TABS = [
    { id: "overview", label: "概览" },
    { id: "environment", label: "环境" },
    { id: "terrain", label: "地形" },
    { id: "history", label: "历史" },
    { id: "knowledge", label: "相关知识" },
];
function placeImage(place) {
    if (place.id === "p-everest")
        return "/assets/expeditions/everest/live/live-a-kala-patthar.jpg";
    if (place.id === "p-fuji" || place.type === "volcano")
        return "/assets/world/fuji-card.png";
    if (place.id === "p-colorado" || place.type === "canyon" || place.type === "plateau")
        return "/assets/world/grand-canyon-card.png";
    if (place.id === "p-mariana" || place.type === "ocean" || place.type === "coast" || place.type === "lake")
        return "/assets/world/mariana-card.png";
    if (place.type === "mountain" || place.type === "glacier")
        return "/assets/world/everest-view-b.jpg";
    return "/assets/world/grand-canyon-card.png";
}
/** 高程语义：海洋类显示深度，其余显示海拔/高程 */
function elevDisplay(place) {
    const digits = Math.abs(place.elevationM) % 1 === 0 ? 0 : 2;
    if (place.elevationM < 0) {
        return { label: "深度", text: `${(0, format_1.formatNumber)(Math.abs(place.elevationM), digits)} m` };
    }
    return { label: "海拔", text: `${(0, format_1.formatNumber)(place.elevationM, digits)} m` };
}
function placeNoun(place) {
    const nouns = {
        mountain: "这座山",
        volcano: "这座火山",
        glacier: "这片冰川",
        canyon: "这条峡谷",
        desert: "这片荒漠",
        ocean: "这条海沟",
        coast: "这片极地",
        river: "这条河流",
        lake: "这座湖泊",
        waterfall: "这道瀑布",
        plateau: "这片高原",
    };
    return nouns[place.type] || "这个地点";
}
/** 相关地点：同类型优先，其次共享标签；最多 4 个 */
function relatedPlaces(place, all) {
    const scored = all
        .filter((p) => p.id !== place.id)
        .map((p) => {
        const sharedTags = p.tags.filter((t) => place.tags.includes(t)).length;
        const score = (p.type === place.type ? 10 : 0) + sharedTags;
        return { p, score };
    })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name, "zh"));
    return scored.slice(0, 4).map(({ p }) => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        shortDescription: p.shortDescription,
    }));
}
/** 关联知识库条目（knowledge.relatedPlaceIds 反查） */
function relatedKnowledge(placeId) {
    return knowledge_1.KNOWLEDGE.filter((k) => k.relatedPlaceIds.includes(placeId)).map((k) => ({
        id: k.id,
        title: k.title,
        emoji: k.emoji,
        category: k.category,
    }));
}
Page({
    data: {
        place: null,
        favorited: false,
        related: [],
        knowledge: [],
        detailTabs: DETAIL_TABS,
        activeDetailTab: "overview",
        imageFailed: false,
    },
    onLoad(query) {
        var _a;
        const id = String((_a = query === null || query === void 0 ? void 0 : query.id) !== null && _a !== void 0 ? _a : "");
        const place = (0, places_1.getPlaceById)(id);
        if (!place) {
            wx.showToast({ title: "未找到该地点", icon: "none" });
            setTimeout(() => wx.navigateBack({ delta: 1 }), 600);
            return;
        }
        const elev = elevDisplay(place);
        const ex = place.explorationId ? (0, index_1.getExplorationById)(place.explorationId) : undefined;
        const vm = {
            id: place.id,
            name: place.name,
            nameEn: place.nameEn,
            emoji: place.emoji,
            typeLabel: places_1.PLACE_TYPE_LABEL[place.type],
            country: place.country,
            region: place.region,
            shortDescription: place.shortDescription,
            placeNoun: placeNoun(place),
            description: place.description,
            formation: place.formation,
            climate: place.climate,
            geologicalAge: place.geologicalAge,
            facts: place.facts,
            tags: place.tags,
            elevLabel: elev.label,
            elevText: elev.text,
            coordText: `${place.latitude.toFixed(2)}°, ${place.longitude.toFixed(2)}°`,
            explorationId: place.explorationId,
            explorationTitle: ex === null || ex === void 0 ? void 0 : ex.title,
            heroImage: placeImage(place),
        };
        this.setData({
            place: vm,
            favorited: favorites_store_1.favorites.isFavorite(place.id),
            related: relatedPlaces(place, places_1.PLACES),
            knowledge: relatedKnowledge(place.id),
            activeDetailTab: "overview",
            imageFailed: false,
        });
    },
    onShow() {
        var _a, _b, _c;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ hidden: true });
        const id = (_c = this.data.place) === null || _c === void 0 ? void 0 : _c.id;
        if (id)
            this.setData({ favorited: favorites_store_1.favorites.isFavorite(id) });
    },
    onToggleFavorite() {
        const place = this.data.place;
        if (!place)
            return;
        const added = favorites_store_1.favorites.toggle(place.id);
        this.setData({ favorited: added });
        wx.showToast({ title: added ? "已加入收藏" : "已取消收藏", icon: "none" });
    },
    onOpenRelated(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        wx.navigateTo({ url: `/pages/place/index?id=${id}` });
    },
    onOpenKnowledge(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (!id)
            return;
        wx.navigateTo({ url: `/pages/knowledge-detail/index?id=${id}` });
    },
    onStartExploration() {
        var _a;
        const id = (_a = this.data.place) === null || _a === void 0 ? void 0 : _a.explorationId;
        if (!id)
            return;
        wx.navigateTo({ url: `/pages/exploration/index?id=${id}` });
    },
    onOpenMap() {
        wx.switchTab({ url: "/pages/map/index" });
    },
    onDetailTabTap(e) {
        var _a, _b, _c;
        const tab = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.tab) !== null && _c !== void 0 ? _c : "overview");
        if (DETAIL_TABS.some((item) => item.id === tab))
            this.setData({ activeDetailTab: tab });
    },
    onImageError() {
        this.setData({ imageFailed: true });
    },
    onBack() {
        wx.navigateBack({ delta: 1 });
    },
});
