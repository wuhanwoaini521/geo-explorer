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
 LiveOverlayAnchors,
 LiveRouteOverlayMode,
 LiveSceneDef,
 LiveSceneTransition,
 MediaAsset,
 MediaManifest,
 VisualFallbackReason,
} from "../types/expedition";
import { calibrationForScene } from "../data/calibrations/everest/index";
import { buildCalibratedLiveOverlay } from "./route-calibration";
import { routeOverlayAllowed } from "./calibration-validate";

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
/* LIVE 竖屏 crop → 可渲染值（§12/§13/§15）：WXML 渲染层消费的唯一来源。    */
/*  数据层只声明焦点 + 期望缩放；本函数把 crop 换算成 object-position 归一化 */
/*  与 scale-cover（保证核心地理对象不被竖屏裁掉，页面不再随机重裁）。        */
/* ------------------------------------------------------------------ */

/** 渲染层消费 crop 的归一化值（WXML：object-position + transform scale） */
export interface LiveCropUi {
 /** 焦点横坐标 0-100（→ object-position x%） */
 focusX: number;
 /** 焦点纵坐标 0-100（→ object-position y%，保证峰顶/西库姆等不被竖屏裁掉） */
 focusY: number;
 /** 期望缩放倍数（≥1；中心 origin 放大，保证平移后仍完整覆盖） */
 zoom: number;
}

/**
 * LiveCrop → 渲染值：焦点 0-1 转 0-100、缩放下限 1。
 * 布局换算只在此完成，页面/样式层不得再随机裁剪或额外缩放。
 */
export function presentationCropUi(crop?: LiveCrop): LiveCropUi {
 const c = crop ?? DEFAULT_LIVE_CROP;
 return {
  focusX: clamp01(c.focusX ?? 0.5) * 100,
  focusY: clamp01(c.focusY ?? 0.4) * 100,
  // 只支持 ≥1 的拉近；禁止缩回比原图小（§12 不给假信息）
  zoom: Math.max(1, c.scale ?? 1),
 };
}

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
  // §31：生产路由的正式来源。REPRESENTATIVE/无校准 → 不画路线（§5/§41）
  calibration: calibrationForScene(scene.id),
  transition: scene.transition ?? { ...DEFAULT_LIVE_TRANSITION },
 };
}

/* ------------------------------------------------------------------ */
/* LIVE overlay（§8）：anchors → 可渲染折线几何（纯逻辑，可单测）          */
/* ------------------------------------------------------------------ */

/** 渲染用折线段（9:16 竖屏画布坐标，% 定位 + 旋转角） */
export interface LiveOverlaySegmentUi {
 /** 线段中心 x（占画布宽 %） */
 x: number;
 /** 线段中心 y（占画布高 %） */
 y: number;
 /** 线段长度（占画布宽 %，按 9:16 单位换算） */
 lengthX: number;
 /** 与水平夹角（度） */
 rotateDeg: number;
}

/** 渲染用锚点标记（起/终点或途经点） */
export interface LiveOverlayOriginUi {
 key: string;
 x: number;
 y: number;
 label: string;
}

/** LIVE 图层之上绘制的路线 overlay 渲染数据 */
export interface LiveOverlayUi {
 /** 画布逻辑宽/高（9:16），保证 angle/length 纵横换算正确 */
 widthUnits: number;
 heightUnits: number;
 /** 折线段（full-route：连续；nearby/current-next：子集） */
 segments: LiveOverlaySegmentUi[];
 /** 途经标点（含起终点） */
 origins: LiveOverlayOriginUi[];
 /** 当前进度点（由场景内局部 progress 沿折线插值） */
 marker: { x: number; y: number };
 /** 是否示意（非 EXACT —— 不冒充高精度投影） */
 schematic: boolean;
}

const OVERLAY_W = 9;
const OVERLAY_H = 16;

function clamp01(v: number): number {
 if (v <= 0) return 0;
 if (v >= 1) return 1;
 return v;
}

/** 点位（归一化 0-1）→ 画布逻辑坐标（9×16 单位） */
function toUnits(ax: number, ay: number): { ux: number; uy: number } {
 return { ux: ax * OVERLAY_W, uy: ay * OVERLAY_H };
}

function ptToPct(ax: number, ay: number): { x: number; y: number } {
 return { x: ax * 100, y: ay * 100 };
}

/** 由点序构造折线几何（按 anchors.points 的 key 顺序；少于 2 点返回 null） */
export function buildLiveRouteOverlay(
 anchors: LiveOverlayAnchors | null | undefined,
 overlayMode: LiveRouteOverlayMode,
 localProgress: number,
): LiveOverlayUi | null {
 if (!anchors) return null;
 const keys = Object.keys(anchors.points ?? {});
 if (keys.length < 2) return null;
 const pts = keys.map((k) => ({
  key: k,
  a: anchors.points[k],
  u: toUnits(anchors.points[k].x, anchors.points[k].y),
 }));

 // nearby/current-next：只展示与当前最近的一段（MVP 简化为连续折线 + 点缀）
 const segments: LiveOverlaySegmentUi[] = [];
 let totalUnits = 0;
 const segUnits: number[] = [];
 for (let i = 0; i < pts.length - 1; i++) {
  const p0 = pts[i].u;
  const p1 = pts[i + 1].u;
  const dx = p1.ux - p0.ux;
  const dy = p1.uy - p0.uy;
  const len = Math.hypot(dx, dy);
  segUnits.push(len);
  totalUnits += len;
  const mx = p0.ux + dx / 2;
  const my = p0.uy + dy / 2;
  const pct = ptToPct(mx / OVERLAY_W, my / OVERLAY_H);
  segments.push({
   x: pct.x,
   y: pct.y,
   // 长度占画布宽的比例（单位空间中 x 轴即宽）
   lengthX: (len / OVERLAY_W) * 100,
   rotateDeg: (Math.atan2(dy, dx) * 180) / Math.PI,
  });
 }

 // 当前点：沿累计折线按局部 progress 插值（安全求即使用 0/1）
 let marker = { x: 0, y: 0 };
 if (totalUnits > 0) {
  const t = clamp01(localProgress) * totalUnits;
  let acc = 0;
  let mx = pts[0].u.ux;
  let my = pts[0].u.uy;
  for (let i = 0; i < segUnits.length; i++) {
   if (acc + segUnits[i] >= t) {
    const segT = segUnits[i] === 0 ? 0 : (t - acc) / segUnits[i];
    const p0 = pts[i].u;
    const p1 = pts[i + 1].u;
    mx = p0.ux + (p1.ux - p0.ux) * segT;
    my = p0.uy + (p1.uy - p0.uy) * segT;
    break;
   }
   acc += segUnits[i];
  }
  marker = { x: (mx / OVERLAY_W) * 100, y: (my / OVERLAY_H) * 100 };
 }

 const origins: LiveOverlayOriginUi[] = pts.map((p, i) => {
  const { x, y } = ptToPct(p.a.x, p.a.y);
  let label = "";
  if (i === 0) {
   label = overlayMode === "full-route" ? "大本营" : "起点";
  } else if (i === pts.length - 1) {
   label =
    overlayMode === "full-route" ? "峰顶" : p.key === "summit" ? "峰顶" : "";
  }
  return { key: p.key, x, y, label };
 });

 return {
  widthUnits: OVERLAY_W,
  heightUnits: OVERLAY_H,
  segments,
  origins,
  marker,
  schematic: true, // 非 EXACT 一律示意；命中 EXACT 后可置 false
 };
}

/* ------------------------------------------------------------------ */
/* LIVE 正式 overlay（§5/§31/§41）：优先校准 route[]，否则不画            */
/* ------------------------------------------------------------------ */

/**
 * 页面级统一决策：LIVE 呈现 → 可渲染 overlay。
 *
 * 优先级/诚实性（§5/§31/§41）：
 *   1. 有校准且 status ∈ {VERIFIED, CALIBRATED} → buildCalibratedLiveOverlay
 *      （route[] 预投影，OCCLUDED 段不画，schematic=false）；
 *   2. REPRESENTATIVE / UNAVAILABLE / 缺校准 → null（不画任何“看着像”的路线），
 *      只保留真实照片 + HUD（§40）；
 *   3. 仅当外部数据仍显式携带 CURATED anchors（dev/review 预览）时兜底 buildLiveRouteOverlay ——
 *      生产数据已不携带 anchors（§41 删除假路线），此分支驻留仅供审核预览。
 */
export function resolveLiveOverlay(
 presentation: Extract<ExpeditionVisualPresentation, { kind: "LIVE" }>,
 localProgress: number,
): LiveOverlayUi | null {
 const cal = presentation.calibration;
 if (cal) {
  // 正式路线 overlay 的唯一门禁（§5）：非 VERIFIED/CALIBRATED 一律不画
  if (!routeOverlayAllowed(cal.status)) return null;
  return buildCalibratedLiveOverlay(
   cal,
   presentation.routeOverlay,
   localProgress,
  );
 }
 if (presentation.anchors) {
  return buildLiveRouteOverlay(
   presentation.anchors,
   presentation.routeOverlay,
   localProgress,
  );
 }
 return null;
}

/** §40：实景 info 一行文案（不写“精准路线”除非 VIEWED/已实调）。 */
export function liveSceneInfo(
 presentation: Extract<ExpeditionVisualPresentation, { kind: "LIVE" }>,
): string | null {
 // 数据层声明的说明优先：非珠峰世界必须自带说明，
 // 否则马里亚纳也会被标成「真实珠峰影像」。
 const declared = presentation.scene && presentation.scene.infoText;
 if (declared) return declared;
 const cal = presentation.calibration;
 if (cal) {
  const s = cal.info.status;
  if (s === "VERIFIED") return "真实珠峰影像 · 路线：已验证投影";
  if (s === "CALIBRATED") return "真实珠峰影像 · 路线：校准投影";
  if (s === "REPRESENTATIVE") return "真实珠峰影像 · 代表性视角";
  return "真实珠峰影像 · 视觉参考";
 }
 return presentation.image ? "真实珠峰影像" : null;
}
