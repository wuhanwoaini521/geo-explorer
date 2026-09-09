"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVEREST_STAGE_MAP = exports.EVEREST_ROUTE_INDEX = exports.EVEREST_EXPEDITION = void 0;
const everest_1 = require("../explorations/everest");
const route_index_1 = require("../../engine/route-index");
const expedition_stages_1 = require("../../engine/expedition-stages");
const index_1 = require("../routes/everest/index");
const routeIndex = (0, route_index_1.buildRouteIndex)(index_1.SOUTH_COL_ROUTE);
exports.EVEREST_ROUTE_INDEX = routeIndex;
/* ------------------------------------------------------------------ */
/* 阶段定义（7 段）：边界只允许四类来源，全部由 routeIndex 计算            */
/* ------------------------------------------------------------------ */
const STAGE_DEFS = [
    {
        id: "approach",
        name: "大本营 · 接近",
        emoji: "⛺",
        intro: "从南坡大本营（5,364 m）起步，沿昆布冰川上缘推进。一出发就将面对整条路线最危险的昆布冰瀑。",
        routeStyle: "route-a",
        from: { kind: "start" },
        to: {
            kind: "milestone",
            milestoneId: "khumbu-icefall",
            label: "到达冰瀑起点",
        },
    },
    {
        id: "khumbu-icefall",
        name: "昆布冰瀑",
        emoji: "🧊",
        intro: "昆布冰川最破碎的一段：冰塔、深裂隙、随时可能崩溃的冰柱。绝大多数登山者都选择趁夜里气温最低时快速通过（危险度与通过策略为公开登山科普的概括，非即时间点数据）。",
        routeStyle: "danger-line",
        from: {
            kind: "milestone",
            milestoneId: "khumbu-icefall",
            label: "昆布冰瀑",
        },
        to: { kind: "milestone", milestoneId: "camp-i", label: "C1 营地" },
    },
    {
        id: "western-cwm",
        name: "西库姆冰谷",
        emoji: "🏔️",
        intro: "相对平缓但开阔的雪原（Western Cwm，英国登山者称之为“The Valley of Silence”——寂静之谷），雪山脊影跳动，在烈日下煎熬与大风中行进到 C2。",
        from: { kind: "milestone", milestoneId: "camp-i", label: "C1 营地" },
        to: {
            kind: "milestone",
            milestoneId: "western-cwm-camp-ii",
            label: "C2 营地",
        },
    },
    {
        id: "lhotse-face",
        name: "洛子壁",
        emoji: "⛰️",
        intro: "沿着洛子峰冰壁（Lhotse Face）连续陡峭雪坡攀爬，途经 C3 后直上抵南坳（C4，7,906 m）。",
        from: {
            kind: "milestone",
            milestoneId: "western-cwm-camp-ii",
            label: "C2 营地",
        },
        to: {
            kind: "milestone",
            milestoneId: "south-col-camp-iv",
            label: "南坳 C4",
        },
    },
    {
        id: "south-col",
        name: "南坳",
        emoji: "⛺",
        intro: "位于世界屋脊边缘的“挡风营地”——南坳（C4），与洛子峰隔脊相望；登顶前的最后一晚通常留在这里。",
        from: {
            kind: "milestone",
            milestoneId: "south-col-camp-iv",
            label: "南坳 C4",
        },
        to: {
            kind: "cross-ref-m",
            crossRefM: 8000,
            label: "越过 8000 m（进入死亡区）",
        },
    },
    {
        id: "death-zone",
        name: "死亡区",
        emoji: "☠️",
        intro: "海拔 8000 m 以上的“死亡区”：大气含氧量不足海平面三分之一。人体机能在稀氧下开始崩溃，休息、补给与意志都难以为继，每一步都在与身体反目成仇。",
        from: { kind: "cross-ref-m", crossRefM: 8000, label: "8000 m" },
        to: {
            kind: "milestone",
            milestoneId: "south-summit",
            label: "南峰（8,749 m）",
        },
    },
    {
        id: "summit-push",
        name: "冲顶",
        emoji: "🏁",
        intro: "最后的南东脊推高：经希拉里台阶登上世界之巅 8,848.86 m。风、寒、稀氧……所有条件在这里被允许同时对登山者提最严苛的要求。",
        from: { kind: "milestone", milestoneId: "south-summit", label: "南峰" },
        to: { kind: "end", label: "珠峰峰顶" },
    },
];
const stageMap = (0, expedition_stages_1.buildStageMap)(STAGE_DEFS, routeIndex);
exports.EVEREST_STAGE_MAP = stageMap;
/* ------------------------------------------------------------------ */
/* 相机配置（数据层声明；Gate 4 渲染才消费）                              */
/* ------------------------------------------------------------------ */
const camera = {
    segments: [
        {
            id: "camera-a",
            fromProgress: 0,
            toProgress: 0.4,
            asset: "everest-view-a",
            scale: 1.06,
            offsetX: 0.50,
            offsetY: 0.56,
            fromOffsetX: 0.54,
            fromOffsetY: 0.62,
            fromFocus: { x: 0.50, y: 0.66 },
            focus: { x: 0.50, y: 0.58 },
        },
        {
            id: "camera-b",
            fromProgress: 0.4,
            toProgress: 0.66,
            asset: "everest-view-b",
            scale: 1.12,
            offsetX: 0.46,
            offsetY: 0.51,
            focus: { x: 0.48, y: 0.52 },
        },
        {
            id: "camera-c",
            fromProgress: 0.66,
            toProgress: 1,
            asset: "everest-view-c",
            scale: 1.2,
            offsetX: 0.54,
            offsetY: 0.42,
            focus: { x: 0.52, y: 0.36 },
        },
    ],
};
/* ------------------------------------------------------------------ */
/* 媒体清单（schema 已锁定，validateMediaManifest 校验）                  */
/*  Gate 3.3C：LIVE-A（Kala Patthar 正式实拍）以 approved 资产登记；     */
/*  B/C/D 未确认前保持未绑定；页面 LIVE 遇未收录一律 fallback 回 TERRAIN。*/
/* ------------------------------------------------------------------ */
const media = {
    schemaVersion: 1,
    id: "everest-media",
    sceneId: "everest",
    assets: [
        {
            id: "live-a-kala-patthar",
            title: "Mount Everest from Kala Patthar",
            description: "Mount Everest, Khumbu Glacier and surrounding mountains seen with clear sky from Kala Patthar (≈5,545 m), 2019-04-24.",
            kind: "photograph",
            localPath: "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
            license: "CC BY-SA 4.0",
            licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0",
            credit: "Matheus Hobold Sovernigo",
            sourceUrl: "https://commons.wikimedia.org/wiki/File:Mount_Everest_from_Kala_Patthar.jpg",
            attribution: "Matheus Hobold Sovernigo — Wikimedia Commons · CC BY-SA 4.0",
            capturedAt: "2019-04-24",
            originalResolution: "5848\u00d74387",
            dimensions: { width: 1080, height: 1920 },
            /* 运行时派生 sha256（quality=80；原始 sha256 见 design/world/everest-live/raw/） */
            hash: "15008117ff5f1715d3f0b7cb23b4613c9c78e90ff5cf2ee65e3d488bcbf695aa",
            geographicRole: "Representative real-world image",
            overlayProjection: "CURATED",
            reviewStatus: "approved",
            tags: ["everest", "live", "kala-patthar"],
        },
    ],
    notes: "Gate 3.3C：LIVE-A（Kala Patthar，CC BY-SA 4.0）正式登记为 approved；B/C/D 未绑定前页面 LIVE 按 fallback 回退 TERRAIN。",
};
/* ------------------------------------------------------------------ */
/* Dual Visual Mode（Gate 3.3A）：LIVE 实景 / TERRAIN 科学地形          */
/* ------------------------------------------------------------------ */
/**
 * 4 个 LIVE Hero Scene（§5/§6）。
 *
 * 覆盖范围用 StageMap 阶段 id 声明（不手写 progress）：
 *   为 7 段 → 4 场景的分段；全部路由由 stageMap 派生，任何进度方向只此一处。
 * Gate 3.3C：liveScenes[0]（LIVE-A）已绑定 approved 实拍（Kala Patthar）。
 * B/C/D 在影像不确定前保持未绑定——页面在 LIVE 模式遇未绑定场景时
 * 会按 fallback 策略落到 TERRAIN（§11/§24）：绝不假图填坑。
 */
const liveScenes = [
    {
        id: "live-a",
        label: "Base Camp · Approach",
        // StageMap：approach（大本营）→ khumbu-icefall（昆布冰瀑）→ C1
        stageIds: ["approach", "khumbu-icefall"],
        routeOverlay: "full-route", // §18 LIVE-A：全景路线 overview
        // Gate 3.3C：MediaManifest 是出处的唯一真相，此处只做引用；
        // 竖屏焦点/缩放在此指定，禁止页面 object-fit 随机重裁（§5/§12）。
        assetId: "live-a-kala-patthar",
        crop: { focusX: 0.5, focusY: 0.38, scale: 1 },
        /* §5/§41：不再携带人工手画 CURATED 示意折线（假路线）。
           正式 route overlay 只来自校准 JSON（design/…/calibration/live-a.json），
           页面统一走 resolveLiveOverlay：REPRESENTATIVE → 不画（保留真实照片 + HUD）。
           如需 dev 预览锚点，只能放在 review/工具侧，不得进生产数据。 */
    },
    {
        id: "live-b",
        label: "Western Cwm · Camp II",
        // StageMap：western-cwm（西库姆冰谷，C1 → C2）
        stageIds: ["western-cwm"],
        routeOverlay: "nearby", // §18 LIVE-B：只画当前附近路线
    },
    {
        id: "live-c",
        label: "Death Zone · Summit Push",
        // StageMap：lhotse-face（洛子壁）→ south-col（南坳 C4）→ death-zone（死亡区）
        stageIds: ["lhotse-face", "south-col", "death-zone"],
        routeOverlay: "current-next", // §18 LIVE-C：只画 current → next waypoint
    },
    {
        id: "live-d",
        label: "Summit",
        // StageMap：summit-push（冲顶段）
        stageIds: ["summit-push"],
        routeOverlay: "none", // §18 LIVE-D：不画路线，只标 SUMMIT
    },
];
const visualMode = {
    defaultMode: "LIVE", // §23：默认实景；用户切换后仅在会话内记住，离开后回到默认
    fallback: "TERRAIN", // §24：LIVE 不可用（无图/未批准/资产无效）一律回退科学地形，页面不空白
    liveScenes,
};
/* ------------------------------------------------------------------ */
/* 高程策略 / 数据来源                                                   */
/* ------------------------------------------------------------------ */
const elevationPolicy = {
    model: "reference-anchored",
};
const sources = [
    {
        name: "自然资源部 / 人民日报 · 2020 中尼珠峰高程联合测量（8 848.86 m）",
        url: "https://www.gov.cn/xinwen/2020-12/08/content_5567858.htm",
        verifiedAt: "2025-01-10",
        approximate: false,
        evidence: "reference",
    },
    {
        name: "Copernicus DEM GLO-30（EU/ESA，AWS Open Data）→ 地形几何与路线 DEM 剖面",
        url: "https://registry.opendata.aws/copernicus-dem/",
        verifiedAt: "2025-01-10",
        approximate: true,
        evidence: "dataset",
    },
    {
        name: "本地设计与测绘：everest-3d/route（289 控制点 + 8 里程碑 GPS）与 everest-terrain-metadata.json",
        url: "https://github.com/wuhanwoaini/geo-explorer",
        verifiedAt: "2025-01-10",
        approximate: true,
        evidence: "dataset",
    },
    {
        name: "Wikipedia — Mount Everest（营地海拔、峰顶气压 ~335 hPa 等参照）",
        url: "https://en.wikipedia.org/wiki/Mount_Everest",
        verifiedAt: "2025-01-10",
        approximate: true,
        evidence: "reference",
    },
];
exports.EVEREST_EXPEDITION = {
    ...everest_1.EVEREST,
    type: "CLIMB",
    routeIndex,
    stageMap,
    camera,
    media,
    elevationPolicy,
    sources,
    /* Gate 3.3A：Dual Visual Mode（LIVE/TERRAIN） */
    visualMode,
};
