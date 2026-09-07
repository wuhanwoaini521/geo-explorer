/**
 * Dual Visual Mode 解析（Gate 3.3A 纯逻辑）—— 可在 Node 单测。
 *
 * 职责（只对「Scene Presentation Layer」做决定，不触碰 WXML/WXSS/页面视觉）：
 *   1. 按当前 stageIndex 命中 LIVE Hero Scene（复用 StageMap，不做第二套 progress）；
 *   2. 检查该场景是否绑定了「approved」影像（MediaManifest 是出处唯一真相）；
 *   3. 产出 ExpeditionVisualPresentation —— LIVE（可渲染）或 TERRAIN（DEM）；
 *   4. LIVE 不可用时按配置兜底 TERRAIN 并给出原因（§24 的 console.warn 文案来源）。
 *
 * ⚠️ Route Engine 不感知具体视觉模式：本模块只消费 driver 的公开输出
 *    （ExpeditionDriveState.stageIndex / progress），绝不触碰 RouteIndex 内部结构。
 *
 * ⚠️ 本文件不创建「第二套进度」：场景覆盖范围用 StageMap 阶段 id 声明，
 *    场景 progress 边界一律由 stageMap（← routeIndex 计算值）派生（Gate 2 约束 3）。
 */
import type {
 ComputedStage,
 ExpeditionVisualMode,
 ExpeditionVisualModeConfig,
 ExpeditionVisualPresentation,
 LiveCrop,
 LiveSceneDef,
 LiveSceneTransition,
 MediaAsset,
 MediaManifest,
 VisualFallbackReason,
} from "../types/expedition";

/** 场景尚未绑定 crop 时的兜底焦点（§12：绝不随机裁剪珠峰主体） */
export const DEFAULT_LIVE_CROP: LiveCrop = {
 focusX: 0.5,
 focusY: 0.4,
 scale: 1,
};

/** 阶段切换过渡默认值（§14：crossfade + 极轻微 scale，禁止 Ken Burns） */
export const DEFAULT_LIVE_TRANSITION: LiveSceneTransition = {
 crossfadeMs: 600,
 maxScale: 1.03,
};

/* ------------------------------------------------------------------ */
/* 场景选取：只依据「阶段索引」，progress 边界由 stageMap 派生              */
/* ------------------------------------------------------------------ */

/** 场景选择的输入透镜（页面直接把 driver 的公开输出塞进来即可） */
export interface VisualResolveInput {
 /** 用户当前选择的模式（会话内记住；未记录时用 config.defaultMode） */
 mode: ExpeditionVisualMode;
 /** 当前所在阶段索引（0..stageMap.length-1，来自 ExpeditionDriveState） */
 stageIndex: number;
 /** 可选：0-1 路线进度（供后续跨场景预取等；本 Gate 只消费 stageIndex） */
 progress?: number;
}

/** 解析依赖 —— 数据层已就绪，本模块零副作用 */
export interface VisualResolveDeps {
 config: ExpeditionVisualModeConfig;
 stageMap: ComputedStage[];
 media: MediaManifest;
}

/** stageMap.id → 索引（WeakMap 缓存，避免每帧重建 map） */
const STAGE_INDEX_CACHE = new WeakMap<ComputedStage[], Map<string, number>>();
function stageIndexMap(stageMap: ComputedStage[]): Map<string, number> {
 let m = STAGE_INDEX_CACHE.get(stageMap);
 if (!m) {
  m = new Map(stageMap.map((s, i) => [s.id, i]));
  STAGE_INDEX_CACHE.set(stageMap, m);
 }
 return m;
}

/** 命中某 stageIndex 所属的 LIVE 场景（未命中返回 undefined → 兜底 TERRAIN） */
export function liveSceneForStageIndex(
 config: ExpeditionVisualModeConfig,
 stageMap: ComputedStage[],
 stageIndex: number,
): LiveSceneDef | undefined {
 const idx = stageIndexMap(stageMap);
 return config.liveScenes.find((sc) =>
  sc.stageIds.some((sid) => idx.get(sid) === stageIndex),
 );
}

/** 场景覆盖的 progress 区间 —— 完全由 stageMap 派生（不手写任何进度） */
export function liveSceneProgressRange(
 scene: LiveSceneDef,
 stageMap: ComputedStage[],
): { from: number; to: number } | null {
 const idx = stageIndexMap(stageMap);
 const idxs = scene.stageIds
  .map((sid) => idx.get(sid))
  .filter((n): n is number => n !== undefined);
 if (idxs.length === 0) return null;
 const lo = Math.min(...idxs);
 const hi = Math.max(...idxs);
 return {
  from: stageMap[lo].fromProgress,
  to: stageMap[hi].toProgress,
 };
}

/* ------------------------------------------------------------------ */
/* presentation 解析（含兜底）                                         */
/* ------------------------------------------------------------------ */

/** LIVE 不可用 → TERRAIN 时给出 console.warn 文案（§24） */
export function visualFallbackWarning(
 reason: VisualFallbackReason,
 sceneId?: string,
): string {
 const sc = sceneId ? ` scene=${sceneId}` : "";
 return `[visual-mode] LIVE → TERRAIN 兜底：${reason}${sc}`;
}

/** 仅当 manifest 中该资产为 approved 且带 localPath 时视为「可正式渲染」影像（§11） */
function approvedLiveImage(
 deps: VisualResolveDeps,
 scene: LiveSceneDef,
): { asset: MediaAsset; image: string } | null {
 if (!scene.assetId) return null;
 const asset = deps.media.assets.find((a) => a.id === scene.assetId);
 if (!asset || !asset.localPath) return null;
 if (asset.reviewStatus !== "approved") return null;
 return { asset, image: asset.localPath };
}

/**
 * 解析当前视觉呈现。
 *
 * - 模式为 TERRAIN  → TERRAIN（reason: user-selected，非兜底）；
 * - 模式为 LIVE 但未命中场景 / 未绑资产 / 资产未批准 → 一律兜底 TERRAIN（§24）；
 * - 模式为 LIVE 且资产批准 → 返回可渲染 LIVE（image + crop + anchors + overlay + 过渡）。
 */
export function resolveExpeditionVisual(
 deps: VisualResolveDeps,
 input: VisualResolveInput,
): ExpeditionVisualPresentation {
 const scene = liveSceneForStageIndex(
  deps.config,
  deps.stageMap,
  input.stageIndex,
 );

 // 用户主动选择 TERRAIN —— 非兜底，直接返回
 if (input.mode !== "LIVE") {
  return {
   kind: "TERRAIN",
   reason: "user-selected",
   stageIndex: input.stageIndex,
  };
 }
 if (!scene) {
  return {
   kind: "TERRAIN",
   reason: "no-scene-match",
   stageIndex: input.stageIndex,
  };
 }

 const img = approvedLiveImage(deps, scene);
 if (!img) {
  return {
   kind: "TERRAIN",
   reason: scene.assetId ? "asset-not-approved" : "no-live-assets",
   stageIndex: input.stageIndex,
  };
 }

 return {
  kind: "LIVE",
  scene,
  stageIndex: input.stageIndex,
  image: img.image,
  crop: scene.crop ?? DEFAULT_LIVE_CROP,
  routeOverlay: scene.routeOverlay,
  anchors: scene.anchors ?? null,
  transition: scene.transition ?? { ...DEFAULT_LIVE_TRANSITION },
 };
}
