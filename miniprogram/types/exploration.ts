/**
 * 沉浸式探索（Exploration）领域模型。
 * 该文件只描述数据形态，不依赖（也不应依赖）wx API —— 保证引擎可在 Node 环境单测。
 */

/** 数据来源（内容真实性，见设计文档 §29） */
export interface DataSource {
 /** 来源名称，如 "国家测绘局 / Wikipedia" */
 name: string;
 /** 来源链接 */
 url: string;
 /** 最近校验日期（ISO 日期）。TODO/Mock 数据可缺省。 */
 verifiedAt?: string;
 /** 该数值是否为“公开近似值/建模推导”（非精确实测） */
 approximate?: boolean;
}

/** 探索路线上的知识节点 */
export interface ExplorationKnowledgeNode {
 id: string;
 /** 出现海拔（m） */
 elevation: number;
 emoji: string;
 title: string;
 /** 一句话解释 */
 summary: string;
 detail: string;
 /** 关键事实列表 */
 facts?: Array<{ label: string; value: string; source?: string | DataSource }>;
 sources?: DataSource[];
}

/** 探索阶段（按海拔切分的一段自然带） */
export interface ExplorationStage {
 id: string;
 /** 阶段起始海拔（m，升序排列） */
 elevation: number;
 name: string;
 /** 植被/地貌带的名称 */
 biome: string;
 emoji: string;
 /** 该海拔的典型气温（近似值，用于 UI 展示与引擎插值） */
 temperatureC: number;
 /** 该阶段天空渐变三色（自上而下），缺省使用探索封面色 */
 palette?: [string, string, string];
 /** 0-1 积雪程度（视觉强度） */
 snow: number;
 /** 0-1 云雾强度 */
 fog: number;
 /** 0-1 风力强度 */
 wind: number;
 /** 环境说明（HUD 显示） */
 description: string;
}

/** 一个完整的探索场景（可复用引擎 + 数据的范式） */
export interface Exploration {
 id: string;
 slug: string;
 title: string;
 subtitle: string;
 emoji: string;
 /** 封面渐变色（三色） */
 palette: [string, string, string];
 /** 起始海拔（一般 0） */
 startElevation: number;
 /** 目标最高海拔（如 8848.86） */
 maxElevation: number;
 /** 起始海拔处典型气温（℃） */
 baseTemperatureC: number;
 /** 温度直减率（℃/1000m，用于线性插值） */
 lapseRateCPer1000: number;
 /** 标准大气气压（海平面 hPa），用于含氧量 / 气压建模 */
 seaLevelPressureHpa: number;
 /** 温度直减率与气压模型的来源说明 */
 climateSource?: DataSource;
 stages: ExplorationStage[];
 knowledgeNodes: ExplorationKnowledgeNode[];
 /** 场景来源与整体数据说明 */
 source?: DataSource;
}

/** 引擎根据海拔推导出的实时环境状态（纯数据，UI 只消费它） */
export interface ExplorationDerivedState {
 elevation: number;
 /** 0-1 全局进度 */
 progress: number;
 stageIndex: number;
 stage: ExplorationStage;
 nextStage: ExplorationStage | null;
 /** 0-1 本阶段内进度（subset） */
 stageProgress: number;
 /** 当前气温（℃，插值） */
 temperatureC: number;
 /** 相对海平面的大气压比（0-1，近似含氧量） */
 pressureRatio: number;
 /** 视觉强度 0-1（在阶段间插值） */
 snow: number;
 fog: number;
 wind: number;
 /** 当前天空渐变三色（阶段间插值） */
 sky: [string, string, string];
 /** 植被覆盖度 0-1（海拔越高越小） */
 vegetation: number;
 isSummit: boolean;
 /** 当前海拔已经触发的知识节点（已解锁） */
 discovered: ExplorationKnowledgeNode[];
 /** 当前海拔附近未解锁的节点建议（轻量标记用） */
 pending: ExplorationKnowledgeNode[];
}
