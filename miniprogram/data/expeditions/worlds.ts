/**
 * 非珠峰世界的 Expedition 附件 —— 数据驱动接入珠峰的沉浸机制。
 *
 * 每个世界只需声明：类型（攀登/下潜/下切）、真实里程、主视觉实景照片、
 * 经视觉核验的路线走向、以及 LIVE 资产。其余（里程轴 / 阶段 / 相机 / 投影）
 * 全部由 buildWorldExpedition 统一生成 —— 新增地貌照此追加一个条目即可。
 *
 * 路线走向（spine）由视觉核验确定：必须贴合照片里真实的地形特征
 * （登山道 / 海底构造 / 之字形步道），否则折线会浮在画面上。
 */
import type { DataSource, Exploration } from "../../types/exploration";
import type { MediaAsset, MediaManifest } from "../../types/expedition";
import { EXPLORATIONS } from "../explorations/index";
import {
  COLORADO_MANIFEST,
  FUJI_MANIFEST,
  MARIANA_MANIFEST,
} from "../media/world-manifests";
import { buildWorldExpedition, type WorldStageSpec } from "./world-expedition";

function world(id: string): Exploration {
  const found = EXPLORATIONS.find((e) => e.id === id);
  if (!found) throw new Error(`[world-expeditions] 未找到世界：${id}`);
  return found;
}

/** 阶段命名沿用探索数据；段数 = 里程碑间隔数（多余的历史阶段丢弃）。 */
function stagesOf(ex: Exploration): WorldStageSpec[] {
  const need = ((ex.route && ex.route.waypoints) || []).length - 1;
  return ex.stages.slice(0, need).map((stage) => ({
    id: stage.id,
    name: stage.name,
    emoji: stage.emoji,
    // ExplorationStage 没有独立简介字段，用生态带名称作为阶段说明
    intro: stage.biome,
  }));
}

/**
 * 取用既有媒体清单里的实景资产作为 LIVE 主视觉。
 * 直接复用原资产（继承许可 / 出处 / hash），并在数据层强制「必须是 approved 实景照片」，
 * 避免主视觉又滑回科研图。
 */
function liveAsset(manifest: MediaManifest, sourceId: string): MediaAsset {
  const src = manifest.assets.find((a) => a.id === sourceId);
  if (!src) throw new Error(`[world-expeditions] 源资产不存在：${sourceId}`);
  if (src.reviewStatus !== "approved") {
    throw new Error(`[world-expeditions] ${sourceId} 不是 approved 资产`);
  }
  if (src.kind !== "photograph") {
    throw new Error(`[world-expeditions] ${sourceId} 不是实景照片`);
  }
  return src;
}

function liveManifest(
  id: string,
  sceneId: string,
  asset: MediaAsset,
): MediaManifest {
  return {
    schemaVersion: 1,
    id,
    sceneId,
    assets: [asset],
    notes:
      "非珠峰世界：LIVE 主视觉实景资产；TERRAIN 与 LIVE 共用同一张实景图（该世界无独立 DEM 影像）。",
  };
}

const DISTANCE_SOURCE: DataSource = {
  name: "Wikipedia — 各路线公开里程/深度资料（近似值）",
  url: "https://en.wikipedia.org/wiki/Mariana_Trench",
  verifiedAt: "2026-09-12",
  approximate: true,
  evidence: "reference",
};

/* ------------------------------------------------------------------ */
/* 马里亚纳海沟 —— 下潜                                                     */
/* ------------------------------------------------------------------ */

const MARIANA_SPEC_SOURCES: DataSource[] = [
  DISTANCE_SOURCE,
  {
    name: "Wikipedia — Challenger Deep（最大深度约 10,935 m）",
    url: "https://en.wikipedia.org/wiki/Challenger_Deep",
    verifiedAt: "2026-09-12",
    approximate: true,
    evidence: "reference",
  },
];

export const MARIANA_EXPEDITION = buildWorldExpedition(world("mariana"), {
  type: "DIVE",
  // 下潜几乎没有水平位移：以垂直深度差作为路线里程，用户读到的推进即深度。
  totalDistanceM: 10935,
  heroImage: "/assets/content/mariana/k40-ifremer-snow.jpg",
  heroAspect: 1080 / 810,
  focusX: 0.44,
  focusY: 0.5,
  // 下潜：视线自上而下推进（与海面→深渊一致）
  cameraFocusY: { from: 0.35, to: 0.65 },
  cameraOffsetY: { from: 0.45, to: 0.55 },
  cameraScale: { from: 1.03, to: 1.16 },
  // 竖屏下横图按高度 cover 裁切，只有中部一条可见；路线因此以纵向为主导，
  // x 收在中部窗口内，避免折线被裁到画面之外（横向大跨度在竖屏根本看不见）。
  spine: [
    { x: 0.48, y: 0.14 },
    { x: 0.52, y: 0.32 },
    { x: 0.47, y: 0.5 },
    { x: 0.51, y: 0.7 },
    { x: 0.46, y: 0.9 },
  ],
  liveInfo: "深海实拍影像 · 代表性视角",
  liveAssetId: "k40-ifremer-snow",
  media: liveManifest(
    "mariana-expedition-media",
    "mariana",
    liveAsset(MARIANA_MANIFEST, "k40-ifremer-snow"),
  ),
  stages: stagesOf(world("mariana")),
  sources: MARIANA_SPEC_SOURCES,
});

/* ------------------------------------------------------------------ */
/* 富士山 —— 攀登                                                          */
/* ------------------------------------------------------------------ */

export const FUJI_EXPEDITION = buildWorldExpedition(world("fuji"), {
  type: "CLIMB",
  // 吉田路线 五合目→剑峰 的实际水平里程（约 6.4 km）
  totalDistanceM: 6400,
  // 视觉核验：f1-yamanaka-view 是远眺明信片构图，山体只占一角，相机推进后画面
  // 只剩天空（用户反馈「不知道爬哪去了」）；改用火山砂坡实拍——山体占画面约 75%、
  // 有连续的向上坡面、天空仅两成，相机推到火口缘画面仍被坡面填满。
  heroImage: "/assets/content/fuji/f-osunabashiri.jpg",
  heroAspect: 1080 / 720,
  // 裁切焦点对准主穹顶与路线所在的横向窗口中部
  focusX: 0.48,
  focusY: 0.45,
  // 攀登：视线自下而上推进（与山脚→峰顶一致）
  cameraFocusY: { from: 0.62, to: 0.3 },
  cameraOffsetY: { from: 0.55, to: 0.45 },
  cameraScale: { from: 1.04, to: 1.2 },
  // 视觉核验：沿火山砂坡的引导绳走向，由前景坡脚折向左上坡面再到火口缘
  spine: [
    { x: 0.62, y: 0.95 },
    { x: 0.53, y: 0.76 },
    { x: 0.43, y: 0.57 },
    { x: 0.36, y: 0.38 },
    { x: 0.44, y: 0.2 },
  ],
  liveInfo: "富士山实拍影像 · 代表性视角",
  liveAssetId: "f-osunabashiri",
  media: liveManifest(
    "fuji-expedition-media",
    "fuji",
    liveAsset(FUJI_MANIFEST, "f-osunabashiri"),
  ),
  stages: stagesOf(world("fuji")),
  sources: [
    DISTANCE_SOURCE,
    {
      name: "Wikipedia — Mount Fuji（吉田路线与海拔 3,776 m）",
      url: "https://en.wikipedia.org/wiki/Mount_Fuji",
      verifiedAt: "2026-09-12",
      approximate: true,
      evidence: "reference",
    },
  ],
});

/* ------------------------------------------------------------------ */
/* 科罗拉多大峡谷 —— 下切                                                   */
/* ------------------------------------------------------------------ */

export const COLORADO_EXPEDITION = buildWorldExpedition(world("colorado"), {
  type: "CUTAWAY",
  // 明亮天使步道 南缘→谷底（单程约 12.8 km）
  totalDistanceM: 12800,
  heroImage: "/assets/content/colorado/c2-devils-corkscrew.jpg",
  heroAspect: 1080 / 579,
  focusX: 0.45,
  focusY: 0.6,
  // 下切：视线自上而下推进（与谷缘→谷底一致）
  cameraFocusY: { from: 0.35, to: 0.65 },
  cameraOffsetY: { from: 0.45, to: 0.55 },
  cameraScale: { from: 1.02, to: 1.14 },
  // 海拔天然递减（下切），参考量改用下切深度（0 → 1,389 m）以保持单调
  invertReference: true,
  // 该图宽高比 1.87:1，竖屏下裁切更狠，横向跨度几乎全在窗口外；
  // 路线改为纵向主导：由上方谷缘一路下切到下方谷底。
  spine: [
    { x: 0.5, y: 0.16 },
    { x: 0.54, y: 0.34 },
    { x: 0.49, y: 0.52 },
    { x: 0.53, y: 0.72 },
    { x: 0.48, y: 0.9 },
  ],
  liveInfo: "大峡谷实拍影像 · 代表性视角",
  liveAssetId: "c2-devils-corkscrew",
  media: liveManifest(
    "colorado-expedition-media",
    "colorado",
    liveAsset(COLORADO_MANIFEST, "c2-devils-corkscrew"),
  ),
  stages: stagesOf(world("colorado")),
  sources: [
    DISTANCE_SOURCE,
    {
      name: "NPS — Bright Angel Trail（单程约 12.8 km / 下切约 1,389 m）",
      url: "https://www.nps.gov/grca/planyourvisit/bright-angel-trail.htm",
      verifiedAt: "2026-09-12",
      approximate: true,
      evidence: "reference",
    },
  ],
});

/** 所有已接入 Expedition 机制的非珠峰世界 */
export const WORLD_EXPEDITIONS = [
  MARIANA_EXPEDITION,
  FUJI_EXPEDITION,
  COLORADO_EXPEDITION,
];
