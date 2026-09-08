"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 数据来源与许可页 —— 把 expedition 的「材料出处」透明地交给用户。
 *
 * 只读 `buildCredits()`（纯函数，tests/credits-integrity.test.ts 锁定）。
 * 展示：实景影像与许可 / 科学地形（DEM）/ 路线与坐标 / 参考数据 四组；
 * 每条可复制出处链接（小程序无法直接打开外链 → 剪贴板）。
 */
const credits_1 = require("../../engine/credits");
const everest_1 = require("../../data/expeditions/everest");
function toItems(group) {
    return group.items.map((it) => {
        var _a, _b, _c, _d;
        return ({
            id: it.id,
            name: it.name,
            role: it.role,
            credit: (_a = it.credit) !== null && _a !== void 0 ? _a : "",
            license: (_b = it.license) !== null && _b !== void 0 ? _b : "",
            hasLicense: Boolean(it.license),
            url: (_c = it.url) !== null && _c !== void 0 ? _c : "",
            hasUrl: Boolean(it.url),
            note: (_d = it.note) !== null && _d !== void 0 ? _d : "",
            kind: it.kind,
        });
    });
}
Page({
    data: {
        groups: [],
        total: 0,
    },
    onLoad() {
        const groups = (0, credits_1.buildCredits)({
            assets: everest_1.EVEREST_EXPEDITION.media.assets,
            sources: everest_1.EVEREST_EXPEDITION.sources,
            liveStatus: "首页 LIVE-A 当前为 REPRESENTATIVE（routeOverlay=false）：真像素标点由真人标注后升 CALIBRATED/VERIFIED，届时实景叠加才会启用；在此之前实景只展示照片本身（不做假路线）。",
        });
        const vm = groups.reduce((acc, g) => {
            if (g.items.length > 0) {
                acc.push({ key: g.key, title: g.title, items: toItems(g) });
            }
            return acc;
        }, []);
        this.setData({
            groups: vm,
            total: vm.reduce((n, g) => n + g.items.length, 0),
        });
    },
    /** 复制出处链接到剪贴板 */
    onCopyUrl(e) {
        var _a, _b;
        const url = String(((_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.url) || "");
        if (!url)
            return;
        wx.setClipboardData({ data: url, success: () => void 0 });
    },
});
