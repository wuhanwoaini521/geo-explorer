"use strict";
/**
 * Expedition V2 —— 独立能力类型。
 *
 * 设计原则（Gate 1 §四）：不新建第二套「场景顶层模型」，而是在现有
 * types/exploration.ts 的 Exploration 之上做增量演进。
 * 本文件只存放「新增能力」的独立类型，与场景选数据集 kuley 组合为一个
 * `Exploration & ExpeditionAttachment`（见 data/expeditions/everest.ts）。
 *
 * 本文件仅描述数据形态，不依赖（也不应依赖）wx API —— 保证可在 Node 环境单测。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.VISUAL_MODE_LABEL = exports.DEFAULT_EXPEDITION_VISUAL_MODE = exports.EVIDENCE_META = exports.EXPEDITION_AXIS_TO_PROGRESS = void 0;
/** 沿进度前进/后退是否与「上/下」轴一致（CLIMB/DIVE 轴向上；TRAVERSE 轴横向） */
exports.EXPEDITION_AXIS_TO_PROGRESS = {
    CLIMB: "up",
    DIVE: "down",
    TRAVERSE: "side",
    FLYOVER: "side",
    CUTAWAY: "side",
};
exports.EVIDENCE_META = {
    measured: { label: "实测", short: "实测", icon: "●" },
    dataset: { label: "数据集", short: "数据集", icon: "◉" },
    reference: { label: "引用", short: "文献", icon: "◐" },
    model: { label: "建模", short: "模型", icon: "○" },
    illustration: { label: "示意", short: "示意", icon: "◇" },
};
/** Expedition 会话内初始模式（用户切换后由页面在会话内记住，离开后默认回到此值） */
exports.DEFAULT_EXPEDITION_VISUAL_MODE = "LIVE";
/** 模式展示文案（UI 层可读；本注释为契约，不在数据层渲染） */
exports.VISUAL_MODE_LABEL = {
    LIVE: "实景",
    TERRAIN: "地形",
};
