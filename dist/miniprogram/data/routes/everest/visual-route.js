"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVEREST_HERO_IMAGE = void 0;
exports.buildEverestRoutePath = buildEverestRoutePath;
/** TERRAIN（远征主视觉 everest-expedition-hero-v1.png，1024×1536） */
const TERRAIN_SPINE = [
    // 大本营：冰川前缘的平坦冰碛/冰面（画面下缘，底部信息面板之上）
    { x: 0.298, y: 0.562, milestone: "base-camp" },
    { x: 0.317, y: 0.54, progress: 0.06 },
    // 昆布冰瀑：进入流动冰川的破碎冰塔带，路线在冰塔之间折向右侧
    { x: 0.335, y: 0.508, milestone: "khumbu-icefall" },
    { x: 0.35, y: 0.478, progress: 0.21 },
    // C1：冰瀑顶端 / 昆布冰川上缘的缓雪坡
    { x: 0.368, y: 0.443, milestone: "camp-i" },
    { x: 0.392, y: 0.408, progress: 0.36 },
    { x: 0.415, y: 0.375, progress: 0.46 },
    // C2：西库姆冰谷（宽阔雪盆），路线沿雪谷向右上方推进
    { x: 0.432, y: 0.343, milestone: "western-cwm-camp-ii" },
    { x: 0.45, y: 0.312, progress: 0.65 },
    // C3：洛子壁（陡峭冰壁），路径沿雪槽连续抬升
    { x: 0.466, y: 0.278, milestone: "lhotse-face-camp-iii" },
    { x: 0.478, y: 0.25, progress: 0.82 },
    // C4：南坳（珠峰与洛子峰之间的鞍部），路径在此向左上收拢
    { x: 0.486, y: 0.226, milestone: "south-col-camp-iv" },
    { x: 0.492, y: 0.203, progress: 0.92 },
    // 南峰：冲顶前最后一道凸起
    { x: 0.497, y: 0.183, milestone: "south-summit" },
    { x: 0.501, y: 0.172, progress: 0.99 },
    // 峰顶：金色峰顶岩雪尖（画面 (0.505, 0.163) 处的山尖）
    { x: 0.505, y: 0.163, milestone: "summit" },
];
/**
 * LIVE（Kala Patthar 实拍 live-a-kala-patthar.jpg，1080×1920）。
 * 同一座山、不同焦距与构图：实拍图的峰顶更靠左下，山体在画面中整体下移，
 * 因此路径必须单独标定——共用一套坐标会在实景上明显偏离山脊。
 */
const LIVE_SPINE = [
    // 大本营：实拍图冰川/冰碛交汇处（画面左侧下方）
    { x: 0.185, y: 0.565, milestone: "base-camp" },
    { x: 0.198, y: 0.532, progress: 0.06 },
    // 昆布冰瀑：冰面破碎、冰塔密集处
    { x: 0.212, y: 0.492, milestone: "khumbu-icefall" },
    { x: 0.228, y: 0.452, progress: 0.21 },
    // C1：冰瀑顶端，进入雪谷
    { x: 0.248, y: 0.412, milestone: "camp-i" },
    { x: 0.262, y: 0.382, progress: 0.36 },
    { x: 0.278, y: 0.352, progress: 0.46 },
    // C2：西库姆雪盆（实拍图中的大片雪坡）
    { x: 0.292, y: 0.328, milestone: "western-cwm-camp-ii" },
    { x: 0.312, y: 0.304, progress: 0.65 },
    // C3：洛子壁雪槽
    { x: 0.34, y: 0.282, milestone: "lhotse-face-camp-iii" },
    { x: 0.366, y: 0.262, progress: 0.82 },
    // C4：南坳鞍部
    { x: 0.392, y: 0.245, milestone: "south-col-camp-iv" },
    { x: 0.418, y: 0.228, progress: 0.92 },
    // 南峰
    { x: 0.442, y: 0.212, milestone: "south-summit" },
    { x: 0.456, y: 0.2, progress: 0.99 },
    // 峰顶：实拍图峰顶雪尖（≈ (0.47, 0.19)）
    { x: 0.47, y: 0.19, milestone: "summit" },
];
function milestoneProgress(index, id) {
    const found = index.milestones.find((m) => m.id === id);
    if (!found) {
        throw new Error(`[everest-route-path] 山体路径引用了不存在的里程碑：${id}`);
    }
    return found.progress;
}
/** 把声明式控制点解析为带真实进度的 RouteSpinePoint，并做单调性硬校验。 */
function resolveSpine(defs, index) {
    const points = defs.map((def) => ({
        x: def.x,
        y: def.y,
        progress: def.milestone !== undefined
            ? milestoneProgress(index, def.milestone)
            : def.progress,
    }));
    for (let i = 0; i < points.length; i += 1) {
        const p = points[i];
        if (!(p.progress >= 0 && p.progress <= 1)) {
            throw new Error(`[everest-route-path] 控制点进度越界：${p.progress}`);
        }
        if (i > 0 && !(p.progress > points[i - 1].progress)) {
            throw new Error(`[everest-route-path] 控制点进度非严格升序：${points[i - 1].progress} → ${p.progress}`);
        }
    }
    if (points[0].progress !== 0 || points[points.length - 1].progress !== 1) {
        throw new Error("[everest-route-path] 山体路径必须覆盖起点(0)与峰顶(1)");
    }
    return points;
}
/** 远征主视觉（页面 TERRAIN 模式的承载影像） */
exports.EVEREST_HERO_IMAGE = "/assets/world/everest-expedition-hero-v1.png";
/** TERRAIN 承载图 natural 宽高比（1024 × 1536） */
const HERO_IMAGE_ASPECT = 1024 / 1536;
/** LIVE 承载图 natural 宽高比（1080 × 1920） */
const LIVE_IMAGE_ASPECT = 1080 / 1920;
/**
 * 构建 Everest 山体路径配置。
 * 传入已构建的 RouteIndex，避免重复构建 289 点索引（也是进度的唯一真源）。
 */
function buildEverestRoutePath(index) {
    const terrain = {
        id: "TERRAIN",
        image: exports.EVEREST_HERO_IMAGE,
        imageAspect: HERO_IMAGE_ASPECT,
        focusX: 0.5,
        focusY: 0.5,
        spine: resolveSpine(TERRAIN_SPINE, index),
    };
    const live = {
        id: "LIVE",
        image: "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
        imageAspect: LIVE_IMAGE_ASPECT,
        // 与 visualMode.liveScenes[0].crop 的焦点保持一致（同一裁剪的唯一声明在数据层）
        focusX: 0.5,
        focusY: 0.38,
        spine: resolveSpine(LIVE_SPINE, index),
    };
    return { default: terrain, modes: { TERRAIN: terrain, LIVE: live } };
}
