"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CREDIT_GROUP_KEYS = void 0;
exports.buildCredits = buildCredits;
/** 固定分组键 —— 页面与测试都引用这个常量 */
exports.CREDIT_GROUP_KEYS = [
    "imagery",
    "terrain",
    "geometry",
    "reference",
];
const GROUP_TITLES = {
    imagery: "实景影像与许可",
    terrain: "科学地形（DEM）",
    geometry: "路线与坐标",
    reference: "参考数据",
};
function sourceRole(s) {
    const n = s.name;
    if (/DEM|Copernicus/i.test(n))
        return "科学地形（DEM）";
    if (/路线|测绘|route|control|里程碑|GPS/i.test(n))
        return "路线与坐标";
    if (/高程|测量|8 ?848/i.test(n))
        return "高程实测";
    if (/Wikipedia/i.test(n))
        return "参考资料";
    return "参考资料";
}
/**
 * 收敛媒体资产 + 数据来源 → 可分组的许可清单。
 * 影像类条目按 media 原样；来源类条目按角色归类；同 key 内保持输入顺序。
 */
function buildCredits(input) {
    var _a, _b;
    const groups = {
        imagery: [],
        terrain: [],
        geometry: [],
        reference: [],
    };
    for (const a of input.assets) {
        const credit = (_b = (_a = a.credit) !== null && _a !== void 0 ? _a : a.attribution) !== null && _b !== void 0 ? _b : "";
        groups.imagery.push({
            id: `asset-${a.id}`,
            name: a.title || a.id,
            role: "实景影像",
            localPath: a.localPath,
            license: a.license,
            licenseUrl: a.licenseUrl,
            credit: credit || undefined,
            url: a.sourceUrl || "",
            kind: "asset",
            note: a.sourceUrl ? undefined : "未登记出处链接（评审与测试均不应通过）",
        });
    }
    if (input.liveStatus) {
        groups.imagery.push({
            id: "asset-live-status",
            name: "实景叠加状态（LIVE overlay）",
            role: "状态说明",
            url: "",
            kind: "source",
            note: input.liveStatus,
        });
    }
    for (const s of input.sources) {
        const role = sourceRole(s);
        const key = role === "科学地形（DEM）"
            ? "terrain"
            : role === "路线与坐标"
                ? "geometry"
                : "reference";
        groups[key].push({
            id: `source-${s.name.slice(0, 12)}-${s.url}`,
            name: s.name,
            role,
            url: s.url,
            kind: "source",
            note: s.approximate ? "公开近似 / 建模推导（非精确实测）" : "已核实数据",
            // 高程类本身是一条 source：单放在 reference 里即可
        });
    }
    return exports.CREDIT_GROUP_KEYS.map((key) => ({
        key,
        title: GROUP_TITLES[key],
        items: groups[key],
    }));
}
