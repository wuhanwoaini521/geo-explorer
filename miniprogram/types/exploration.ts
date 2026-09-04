/**
 * 沉浸式探索（Exploration）领域模型。
 * 该文件只描述数据形态，不依赖（也不应依赖）wx API —— 保证引擎可在 Node 环境单测。
 */

/** 山地地表分类：山岳世界中控制近景地形/植被/冰雪细节（纯 UI 数据，引擎不参与） */
export type ExplorationSurfaceKind =
  | "forest"
  | "alpine"
  | "meadow"
  | "barren"
  | "snow"
  | "glacier"
  | "death"
  | "summit";

/** 场景“世界风貌”主题（仅 UI 层）：style 例如 'mountain'（山岳）、'ocean'（洋）… */
export interface ExplorationWorld {
  style: string;
}

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
 /** 触发海拔（m） */
 elevation: number;
 emoji: string;
 title: string;
 /** 知识类型标签（如：气候 / 地质 / 地形 / 生态 / 水文），展示在知识卡第一层 */
 category: string;
 /** 一句话事实（知识卡第一层展示） */
 summary: string;
 /** 完整背景解释（详情页展示） */
 detail: string;
 /** 关键事实列表（source 统一为 DataSource，避免混用字符串） */
 facts?: Array<{ label: string; value: string; source?: DataSource }>;
 sources?: DataSource[];
 /** 关联全局知识库条目 id（可选，用于“查看详解”跳转知识库） */
 knowledgeId?: string;
 /** 该节点的轻量随堂题（答错不阻断探索；来源必须可追溯） */
 quiz?: ExplorationQuiz;
}

/** 探索内嵌的“随堂一题”（数据驱动，来源可追溯） */
export interface ExplorationQuiz {
 id: string;
 /** “本题对应知识点”的一句话引导（如 “刚学完气温递减，试试这题”） */
 lead?: string;
 question: string;
 options: string[];
 answerIndex: number;
 explanation: string;
 emoji: string;
 source?: DataSource;
}

/** 场景通用展示元数据（地图页 / 首页 / 总结复用） */
export interface ExplorationMeta {
 /** 地点名称，如 “珠穆朗玛峰” */
 placeLabel: string;
 /** 区域，如 “喜马拉雅山脉” */
 region: string;
 /** 场景类型标签，如 “极高山 / 山地” */
 typeLabel: string;
 /** 场景简介（地图详情 / 首页摘要） */
 description: string;
 /** 亮点标签 */
 tags?: string[];
}

/**
 * 顶部指标条里的一个通用环境指标（数据驱动）。
 * Scene 自行决定展示什么指标；UI 遍历 metrics 渲染，禁止写 if(scene)。
 */
export interface EnvironmentMetric {
  key: string;
  label: string;
  /** 已格式化数值/文本（含单位或 %） */
  value: string;
  unit?: string;
  icon?: string;
}

/**
 * 指标配置：Scene 数据声明“展示什么、怎么算”。
 * 引擎只提供通用公式（curve 逐段折线 / constValue 常数），
 * 无需为每个场景新增 waterPressureAt() / salinityAt() 之类专用函数。
 */
export interface MetricSpec {
  key: string;
  label: string;
  icon?: string;
  unit?: string;
  /** 小数位（默认 0） */
  digits?: number;
  /** 按百分比展示：value=raw*100 并接数 %（如含氧量 0.33 → “33%”） */
  percent?: boolean;
  /** 逐步折线（点位按纵轴升序）＝通用线性插值曲线 */
  curve?: Array<[number, number]>;
  /** 固定值（如盐度 34.6‰）；提供则忽略 curve */
  constValue?: number;
  source?: DataSource;
}

/** 终局表现文案（“登顶成功！”/“抵达挑战者深渊！”等，数据驱动） */
export interface ExplorationDestination {
  label: string;
  title: string;
  tagline: string;
  emoji: string;
}

/** 探索页界面文案，纵轴/按钮/提示等场景词由数据提供 */
export interface ExplorationUi {
  axisLabel: string;
  axisUnit: string;
  forwardLabel: string;
  forwardGlyph: string;
  backLabel: string;
  backGlyph: string;
  /** 距终点短语，如 “距峰顶” / “距海底” */
  remainingLabel: string;
  advanceHint: string;
  /** 总结页“穿越自然带 / 海洋带” */
  stagesLabel: string;
  /** “最高/最深”前缀 */
  extentWord: string;
}

/** 探索阶段（按海拔切分的一段自然带） */
export interface ExplorationStage {
 id: string;
/** 阶段起始海拔（m，升序排列） */
 elevation: number;
 name: string;
 /** 生态/植被带的名称 */
 biome: string;
 emoji: string;
 /** 该海拔的典型气温（近似值，用于 HUD 展示与引擎插值） */
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
 /** 地面点缀图样（按自然带切换的 emoji 集合，如森林 🌲 / 草甸 🌿 / 冰岩 🪨） */
 flora?: string[];
 /** 地面主体（两色 hex；在阶段间插值，如林地→棕色、雪线→灰白） */
 terrainTint?: [string, string];
 /** 山地地表形态分类：山岳世界驱动近景地形/植被/冰雪细节（缺省=通用） */
  surfaceKind?: ExplorationSurfaceKind;
}

/**
 * 场景内路线的关键途经点。坐标是场景画布的百分比（左上角为 0,0），
 * 与海拔教学轴解耦：例如珠峰场景可以从 0m 的教学轴映射到南坡大本营开始。
 */
export interface ExplorationRouteWaypoint {
  id: string;
  name: string;
  /** 空间有限时使用的简写（路线概览 Rail 使用） */
  shortName?: string;
  /** 该地标的真实/参考海拔，仅作展示，不参与 Exploration Axis 计算 */
  altitude?: number;
  /** 该点在本场景探索进度中的位置，范围 0–1，严格升序 */
  progress: number;
  /** 场景画布横坐标百分比 */
  x: number;
  /** 场景画布纵坐标百分比 */
  y: number;
  /** 关联的场景知识节点；解锁后可从路线点进入知识卡 */
  knowledgeId?: string;
  /** 途经点介绍（点击路线点卡片展示，真实地理信息） */
  desc?: string;
}

/**
 * 场景路线配置。路线属于 Scene Data；页面只按该数据绘制，Engine 不含场景判断。
 */
export interface ExplorationRoute {
  id: string;
  name: string;
  waypoints: ExplorationRouteWaypoint[];
}

/** 一个完整的探索场景（可复用引擎 + 数据的范式） */
export interface Exploration {
 id: string;
 slug: string;
 title: string;
 subtitle: string;
 emoji: string;
 /** 场景视觉主题（仅 UI 层消费）：world.style==='mountain' 启用山岳氛围视觉 */
 world?: ExplorationWorld;
 /** 场景元数据（展示用，非物理量） */
 meta: ExplorationMeta;
 /** 封面渐变色（三色） */
 palette: [string, string, string];
 /** 起始海拔（一般 0） */
 startElevation: number;
 /** 目标最高海拔（如 8848.86） */
 maxElevation: number;
 /** 预探索总时长（分钟，展示用） */
 estimatedMinutes: number;
 /** 起始海拔处典型气温（℃） */
 baseTemperatureC: number;
 /** 温度直减率（℃/1000m，用于线性插值） */
 lapseRateCPer1000: number;
 /** 标准大气气压（海平面 hPa），用于含氧量 / 气压建模 */
 seaLevelPressureHpa: number;
 /** 植被完全消失的海拔（m，用于植被覆盖度；缺省 5200） */
 vegetationTopM?: number;
 /** 气压衰减标高（m，用于 p≈p0·e^(−h/H)；缺省 8000） */
 pressureScaleHeightM?: number;
 /** 温度直减率与气压模型的来源说明 */
 climateSource?: DataSource;
 /** HUD 指标条（通用 Metric，可空） */
 metrics?: MetricSpec[];
 /** 终点/登顶表现文案 */
 destination?: ExplorationDestination;
  /** 探索页界面文案 */
  ui?: ExplorationUi;
  /** 可选的场景内空间路线（如登山线、潜水线） */
  route?: ExplorationRoute;
  stages: ExplorationStage[];
 knowledgeNodes: ExplorationKnowledgeNode[];
 /** 场景整体来源与数据真实性的说明 */
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
 /** 0-1 本阶段内进度 */
 stageProgress: number;
 /** 当前气温（℃，插值） */
 temperatureC: number;
 /** 当前实际气压（hPa）= p0 × e^(−h/H) */
 pressureHpa: number;
 /** 相对海平面的气压比（0-1，近似含氧量比） */
 pressureRatio: number;
 /** 视觉强度 0-1（在阶段间插值） */
 snow: number;
 fog: number;
 wind: number;
 /** 当前天空渐变三色（阶段间插值） */
 sky: [string, string, string];
 /** 0-1 植被覆盖度（海拔越高越小） */
 vegetation: number;
 /** 当前阶段地面点缀（emojis，按场景数据） */
 flora: string[];
 /** 地面主色（阶段间插值） */
 terrainTint: [string, string];
 isSummit: boolean;
 /** HUD 指标条（已格式化，数据驱动） */
 metrics: EnvironmentMetric[];
 /** 当前已触发的知识节点（已解锁） */
 discovered: ExplorationKnowledgeNode[];
 /** 当前海拔附近待解锁的节点（轻量标记用） */
 pending: ExplorationKnowledgeNode[];
}
