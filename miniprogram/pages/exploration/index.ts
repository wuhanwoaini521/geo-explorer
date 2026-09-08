/**
 * 🏔️ 探索页 —— 沉浸式探索场景（MVP 完整闭环）。
 *
 * 架构：Exploration Engine（海拔→环境 纯推导）+ 数据驱动（Exploration）+ CSS 2.5D 视差渲染。
 * 页面职责：手势/按钮 → 修改目标海拔 → 引擎推导 → 差分 setData 渲染；
 * 知识发现 → 分层知识卡 → 随堂 Quiz（答错不阻断）→ 登顶庆祝 → 汇总与成就。
 * 不含任何 Everest 专属逻辑，新增场景无需改本页面。
 *
 * 性能：ticker 只推送真正变化的字段（diff）；markers/flora 仅在阶段切换与解锁变化时重建。
 */
import {
  EXPLORATIONS,
  getExplorationById,
} from "../../data/explorations/index";
import { getExpeditionById } from "../../data/expeditions/index";
import { PLACES } from "../../data/places";
import {
  deriveState,
  knowledgeUnlockedOnMove,
  pressureAt,
  pressureRatioAt,
  progressFor,
  quizForNode,
  temperatureAt,
} from "../../engine/exploration-engine";
import {
  driveAtProgress,
  formatDistanceM,
  formatRouteKm,
  type ExpeditionCore,
  type ExpeditionDriveState,
} from "../../engine/expedition-driver";
import {
  liveSceneInfo,
  liveSceneProgressRange,
  presentationCropUi,
  resolveExpeditionVisual,
  resolveLiveOverlay,
  visualFallbackWarning,
} from "../../engine/expedition-visual";
import type { LiveCropUi, LiveOverlayUi } from "../../engine/expedition-visual";
import { saveExplorationRecord } from "../../services/exploration-store";
import type {
  MediaManifest,
  ExpeditionVisualMode,
  ExpeditionVisualModeConfig,
} from "../../types/expedition";
import type {
  EnvironmentMetric,
  Exploration,
  ExplorationDerivedState,
  ExplorationDestination,
  ExplorationKnowledgeNode,
  ExplorationRoute,
  ExplorationUi,
} from "../../types/exploration";
import {
  clamp,
  formatDuration,
  formatNumber,
  formatPercent,
  formatTemperature,
} from "../../utils/format";
import {
  currentRouteWaypoint,
  nextRouteWaypoint,
  routePositionAt,
} from "../../utils/route";
import {
  computeAchievements,
  summarizeRun,
  type QuizAnswerRecord,
} from "../../utils/summary";

/* ---------------- 交互 / 动画参数 ---------------- */
const TICK_MS = 55; // 渲染节拍（≈18fps）
const METERS_PER_PX = 9; // 拖动 1px ≈ 爬升 9m
const STEP_METERS = 360; // 上/下按钮步进（m）
const ROUTE_STEP_METERS = 360; // 路线模式按钮步进（按真实路线里程，m）
const EASE_EPS_ROUTE = 0.004; // 路线轴（0-1 progress）静止判定阈值（对应海拔轴 EASE_EPS）
const OXYGEN_DEATH_TEXT = "≤ 30%"; // 死亡区含氧量提示（模型值被压制为克制的上限文案）
const MOTION_GAIN = 0.22; // current 每 tick 逼近 target 系数
const EASE_EPS = 0.4; // 静止判定阈值（m）
const PARALLAX_BASE = 220; // 全场视差总位移（px）
const LAYER_SPEED = {
  sky: 0.06,
  far: 0.28,
  mid: 0.52,
  near: 0.82,
  ground: 1.0,
  climber: 1.12,
  snow: 1.26,
};
const METRICS_PINNED = 3; // 指标条缺省折叠数量，其余折叠为“更多”
const MAX_SNOWFLAKES = 26;
const SNOWFLAKE_COUNT_STEP = 4; // 粒子数按档量化，减少数组重建
const BANNER_MS = 2600; // 自然带进入提示时长
const SUMMIT_CELEBRATION_MS = 3200; // 登顶庆祝动画时长
const ROUTE_CANVAS_ASPECT = 1.9; // 可视场景画布高/宽近似比，用于将百分比坐标换为线段角度

interface Particle {
  id: number;
  left: number; // %（水平）
  size: number; // px
  duration: number; // s
  delay: number; // s
  opacity: number;
}

interface FloraItem {
  emoji: string;
  left: number; // %（水平）分散
  bottom: number; // vh（贴地高度，分组）
  size: number; // rpx
}

/** 场景插画层（世界.style === 'mountain'：SVG 底片一层一个 PNG 插画） */
interface SceneState {
  mode: "mnt" | "summit"; // summit：8848 峰顶全景（深蓝天空+云海+峰顶雪脊）
  plates: {
    far: string;
    main: string;
    snow: string; // 主峰雪冠覆盖层（雪量→透明度）
    mid: string;
    cloud: string;
    ground: string;
  };
  op: {
    far: number;
    main: number;
    snow: number;
    mid: number;
    cloud: number;
    ground: number;
  };
  sun: number;
}

interface RouteRailItem {
  id: string;
  label: string;
  top: number;
  state: "completed" | "current" | "upcoming";
  knowledgeId?: string;
}

interface SceneRouteSegment {
  id: string;
  style: string;
  completedStyle: string;
  completed: boolean;
}

interface SceneRouteWaypoint {
  id: string;
  name: string;
  shortName: string;
  altitudeText: string;
  desc?: string;
  style: string;
  state: "completed" | "current" | "upcoming";
  knowledgeId?: string;
}

interface SceneRouteState {
  name: string;
  segments: SceneRouteSegment[];
  waypoints: SceneRouteWaypoint[];
  currentStyle: string;
  currentName: string;
  nextName: string;
  completed: boolean;
  rail: RouteRailItem[];
}

interface WaypointCardState {
  show: boolean;
  name: string;
  altitudeText: string;
  desc: string;
  /** 该点关联知识尚未解锁 */
  lockedKnowledge?: boolean;
}

/** 路线全景（Gate 3 on 按钮 → 真实数据 sheet；替代“敬请期待”占位） */
interface RouteOverviewState {
  show: boolean;
  name: string;
  intro: string;
  totalKmText: string;
  ascentText: string;
  descentText: string;
  startName: string;
  startElevText: string;
  endName: string;
  endElevText: string;
  pointCount: number;
  stages: Array<{
    index: number;
    name: string;
    emoji: string;
    intro: string;
    kmText: string;
    rangeText: string;
  }>;
  milestones: Array<{
    name: string;
    kindLabel: string;
    kmText: string;
    elevText: string;
    isSummit: boolean;
  }>;
  provenance: string[];
}

interface QuizState {
  show: boolean;
  nodeId: string;
  nodeEmoji: string;
  lead: string;
  question: string;
  options: string[];
  selected: number;
  correct: boolean;
  revealed: boolean;
  explanation: string;
}

interface SummaryStats {
  durationText: string;
  unlocked: number;
  nodeTotal: number;
  quizText: string; // "4/5"
  accuracyText: string; // "80%"
  stageNames: string[];
  stageTotal: number;
  maxText: string;
  achievements: Array<{
    id: string;
    emoji: string;
    title: string;
    desc: string;
  }>;
}

interface StageBanner {
  show: boolean;
  title: string;
  biome: string;
  emoji: string;
}

/** Relay模式（Gate 3：真实路线驱动）HUD 展示层数据结构 */
interface ExpeditionView {
  /** 0-100 整数进度 */
  pct: number;
  /** 0-1 真实路线进度 */
  progress: number;
  /** 当前路线完成里程（如 “2,012 m”） */
  distanceText: string;
  /** 剩余路线里程（如 “3.5 km”） */
  remainingRouteText: string;
  /** 距顶峰垂直参考高差（如 “1,649”），单位 m */
  remainingVerticalText: string;
  /** 当前标的物（上一站）名称 */
  currentName: string;
  /** 当前参考海拔（ref，m） */
  currentElevText: string;
  /** 前一个标的物 */
  prevName: string;
  /** 下一站名称 */
  nextName: string;
  /** 距下一站精确里程（如 “3,139 m”） */
  nextGapText: string;
  stageName: string;
  stageEmoji: string;
  stageIntro: string;
  nextStageName: string;
  /** 死亡区（ref ≥ 8000 且未达峰顶）：克制 UI 参数 */
  deathZone: boolean;
  atSummit: boolean;
  latText: string;
  lonText: string;
  pressText: string;
  oxygenText: string;
  tempText: string;
}

/** 峰顶轻提示（无庆祝大弹窗，保证峰顶地形优先可见） */
interface ExpeditionSummitView {
  show: boolean;
  altitudeText: string;
  latText: string;
  lonText: string;
  note: string;
}

/** 路线 HUD 初始态（未开始/重制时使用） */
function emptyExpeditionView(): ExpeditionView {
  return {
    pct: 0,
    progress: 0,
    distanceText: "0 m",
    remainingRouteText: "",
    remainingVerticalText: "",
    currentName: "",
    currentElevText: "",
    prevName: "—",
    nextName: "",
    nextGapText: "",
    stageName: "",
    stageEmoji: "",
    stageIntro: "",
    nextStageName: "",
    deathZone: false,
    atSummit: false,
    latText: "",
    lonText: "",
    pressText: "",
    oxygenText: "",
    tempText: "",
  };
}
function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function buildParticles(count: number): Particle[] {
  const list: Particle[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      id: i,
      left: Math.round(randomBetween(0, 100) * 10) / 10,
      size: Math.round(randomBetween(6, 14)),
      duration: Math.round(randomBetween(4, 9) * 10) / 10,
      delay: Math.round(randomBetween(0, 6) * 10) / 10,
      opacity: Math.round(randomBetween(0.5, 0.95) * 100) / 100,
    });
  }
  return list;
}

/** 由 stage.flora 生成散布于地面的点缀（确定性，仅供展示） */
function buildFlora(emojis: string[]): FloraItem[] {
  const picks = emojis && emojis.length ? emojis : [];
  const displayed = picks.slice(0, 6);
  return displayed.map((emoji, i) => ({
    emoji,
    left: 8 + ((i * 37) % 84),
    bottom: 12 + ((i * 7 + 3) % 16),
    size: 34 + ((i * 5) % 22),
  }));
}

/** 路线位置由 Scene Data 的 progress 与坐标推导，页面不识别场景 id。 */
function buildRouteState(
  route: ExplorationRoute,
  progress: number,
): SceneRouteState {
  const position = routePositionAt(route, progress);
  const current = currentRouteWaypoint(route, progress);
  const next = nextRouteWaypoint(route, progress);
  const currentId = current ? current.id : "";
  const points = route.waypoints;
  return {
    name: route.name,
    currentStyle: `left:${position.x.toFixed(2)}%;top:${position.y.toFixed(2)}%;`,
    currentName: current ? current.name : "",
    nextName: next ? next.name : "已抵达终点",
    completed: progress >= 1,
    segments: points.slice(0, -1).map((from, index) => {
      const to = points[index + 1];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const visualDy = dy * ROUTE_CANVAS_ASPECT;
      const length = Math.sqrt(dx * dx + visualDy * visualDy);
      const angle = (Math.atan2(visualDy, dx) * 180) / Math.PI;
      const ratio = clamp(
        (progress - from.progress) / (to.progress - from.progress),
        0,
        1,
      );
      const base = `left:${from.x}%;top:${from.y}%;width:${length.toFixed(2)}%;transform:rotate(${angle.toFixed(2)}deg);`;
      return {
        id: `${from.id}-${to.id}`,
        style: base,
        completedStyle: `${base}width:${(length * ratio).toFixed(2)}%;`,
        completed: ratio > 0,
      };
    }),
    waypoints: points.map((point) => ({
      id: point.id,
      name: point.name,
      shortName: point.shortName || point.name,
      altitudeText: point.altitude
        ? `${formatNumber(point.altitude, point.altitude % 1 ? 2 : 0)}m`
        : "",
      desc: point.desc,
      style: `left:${point.x}%;top:${point.y}%;`,
      state:
        point.id === currentId
          ? "current"
          : point.progress < progress
            ? "completed"
            : "upcoming",
      knowledgeId: point.knowledgeId,
    })),
    rail: points.map((point) => ({
      id: point.id,
      label: point.shortName || point.name,
      top: Math.round((1 - point.progress) * 1000) / 10,
      state:
        point.id === currentId
          ? "current"
          : point.progress < progress
            ? "completed"
            : "upcoming",
      knowledgeId: point.knowledgeId,
    })),
  };
}

/* ---------------- 山岳世界（真实 DEM 渲染场景布，仅可视化数据，引擎不参与） ---------------- */

/** 默认场景（首帧空 src 用） */
const SCENE_DEFAULT: SceneState = {
  mode: "mnt",
  plates: {
    far: "/assets/world/everest-view-a.jpg",
    main: "/assets/world/everest-view-b.jpg",
    snow: "",
    mid: "/assets/world/everest-view-c.jpg",
    cloud: "",
    ground: "",
  },
  op: { far: 1, main: 0, snow: 0, mid: 0, cloud: 0, ground: 0 },
  sun: 0,
};

/** 云海/云雾选片（保留供未来接真实云层）：冰川带及以上 → 云海，其余 → 轻雾 */
function cloudSeaKey(
  kind: string | undefined,
  progress: number,
): "sea" | "wisp" {
  return kind === "glacier" ||
    kind === "death" ||
    kind === "snow" ||
    progress >= 0.6
    ? "sea"
    : "wisp";
}

/** 依据 进度/登顶态 生成场景图层（低频：阶段/雪量变化才换层；d 保留以备未来接入阶段氛围） */
function buildScene(
  _d: ExplorationDerivedState,
  progress: number,
  summitMode: boolean,
): SceneState {
  // 8848.86：冲顶段渲染图 + 路线终点提示（旧峰顶全景插画已弃用）
  if (summitMode) {
    return {
      mode: "summit",
      plates: {
        far: "/assets/world/everest-view-a.jpg",
        main: "/assets/world/everest-view-b.jpg",
        snow: "",
        mid: "/assets/world/everest-view-c.jpg",
        cloud: "",
        ground: "",
      },
      op: { far: 0, main: 0, snow: 0, mid: 1, cloud: 0, ground: 0 },
      sun: 0,
    };
  }
  // 真实 DEM 渲染三景硬切换（照片级图叠加会双曝光，不交叉淡化）：
  // A 远景全景（徒步→BC）→ B 中景山脊（冰瀑→C3）→ C 死亡区冰岩壁（冲顶段）
  // 同屏只亮一张：op 严格取 0 / 1
  const band = viewBand(progress);
  return {
    mode: "mnt",
    plates: {
      far: "/assets/world/everest-view-a.jpg",
      main: "/assets/world/everest-view-b.jpg",
      snow: "",
      mid: "/assets/world/everest-view-c.jpg",
      // 手绘云海/地面插画与照片级渲染风格冲突，已下架（图层保留供未来接真实云层）
      cloud: "",
      ground: "",
    },
    op: {
      far: band === 0 ? 1 : 0,
      main: band === 1 ? 1 : 0,
      snow: 0,
      mid: band === 2 ? 1 : 0,
      cloud: 0,
      ground: 0,
    },
    // 渲染图自带光照，内置太阳不再叠加
    sun: 0,
  };
}

/** 视图分带（与 buildScene 同阈值）：0=A 远景，1=B 中景，2=C 冲顶 */
function viewBand(progress: number): 0 | 1 | 2 {
  return progress < 0.4 ? 0 : progress < 0.66 ? 1 : 2;
}
/* 界面文案 / 终点文案的兜底默认值（场景未声明时使用，措辞保持中性） */
const DEFAULT_UI: ExplorationUi = {
  axisLabel: "海拔",
  axisUnit: "m",
  forwardLabel: "前进",
  forwardGlyph: "▶",
  backLabel: "返回",
  backGlyph: "◀",
  remainingLabel: "距终点",
  advanceHint: "按场景提示滑动推进 · 途经节点记得「查看详情」",
  stagesLabel: "穿越区带",
  extentWord: "之最",
};

const DEFAULT_DESTINATION: ExplorationDestination = {
  label: "终点",
  title: "完成探索！",
  tagline: "抵达终点 · 一段精彩的旅程",
  emoji: "🏁",
};

Page({
  data: {
    ready: false,
    intro: true,
    title: "",
    subtitle: "",
    emoji: "",
    maxElevation: 0,
    maxElevationText: "0",
    metaPlace: "",
    metaRegion: "",
    estMinutes: 0,
    metaDesc: "",

    // 实时 HUD
    elevationText: "0",
    kmStage: "",
    progress: 0,
    pct: 0,
    stageName: "",
    stageEmoji: "",
    biome: "",
    stageDescription: "",
    nextStageName: "",

    // 通用指标条（场景声明，含 value/unit/percent），UI 遍历渲染
    metrics: [] as EnvironmentMetric[],
    metricsShow: [] as EnvironmentMetric[],
    metricsMore: false,
    metricsOpen: false,
    worldMountain: false,
    worldOcean: false,
    scene: SCENE_DEFAULT as SceneState,
    mntScale: 100,
    // Gate 3.2 构图：垂向缩放系数（把照片底部 DEM 山体带映射为整屏主体，下锚缩放）
    viewZoom: { a: 4.55, b: 2.3, c: 1.12 },
    // 顶部安全区（沉浸页：真实状态栏 + 胶囊几何驱动）
    capTop: 20,
    capH: 32,
    capBottom: 52,
    // Gate 3.3C.1 P0：胶囊右侧留白（px）——从右缘到「胶囊左缘 - 8px」
    // 使 实景/DEM 切换器 整体位于原生胶囊左侧，绝不与其重叠；缺几何时默认 96。
    capRight: 96,
    routeSub: "",
    ui: DEFAULT_UI as ExplorationUi,
    destination: DEFAULT_DESTINATION as ExplorationDestination,

    // 环境图层
    skyGradient: "",
    par: { sky: 0, far: 0, mid: 0, near: 0, ground: 0, climber: 0, snow: 0 },
    fogOpacity: 0,
    snowCover: 0,
    vegetation: 1,
    greenTint: "rgba(146,174,94,0.9)",
    terrainTop: "#4a7a3a",
    terrainBottom: "#26401f",
    flora: [] as FloraItem[],
    climberLean: 0,
    particles: [] as Particle[],
    bubbles: [] as Particle[], // 海洋世界：上浮气泡（复用 Particle 结构）
    rayOpacity: 0, // 海洋世界：表层光柱透明度（随深度衰减）
    route: null as SceneRouteState | null,

    // 阶段横幅 / 知识 / 随堂
    stageBanner: {
      show: false,
      title: "",
      biome: "",
      emoji: "",
    } as StageBanner,
    hint: { show: false, text: "" },
    openNode: null as ExplorationKnowledgeNode | null,
    waypointCard: null as WaypointCardState | null,
    routeOverview: null as RouteOverviewState | null,
    quiz: null as QuizState | null,

    // 登顶 / 汇总
    celebration: false,
    summit: false,
    summaryStats: null as SummaryStats | null,
    nextStops: [] as Array<{
      id: string;
      name: string;
      emoji: string;
      shortDescription: string;
    }>,

    // Relay模式（Expedition 附件存在时启用）：真实路线 HUD
    routeMode: false,
    expedition: emptyExpeditionView(),
    expDeathZone: false,
    expSummit: null as ExpeditionSummitView | null,
    // Gate 3.3C.1：Dual Visual Mode —— requested（会话）/ active（实际渲染）分离
    visMode: "LIVE" as ExpeditionVisualMode, // 用户会话内请求（默认 LIVE）
    visActive: "TERRAIN" as ExpeditionVisualMode, // 实际渲染层（toggle 高亮；兜底时诚实显示 DEM）
    visLiveFallback: false, // LIVE 不可用 → 已兑底 TERRAIN（UI 不得虚假点亮“实景”）
    visLiveSrc: "",
    visLiveReady: false,
    liveOverlay: null as LiveOverlayUi | null,
    // §40：LIVE 实景数据说明一行（选中称·代表视角等；无则空）
    liveInfo: "",
    // §12/§13：crop → object-position/zoom（渲染层消费点；由 presentationCropUi 产出）
    liveCropUi: { focusX: 50, focusY: 38, zoom: 1 } as LiveCropUi,
  },

  // ---- 内部实例状态（不参与渲染） ----
  exploration: null as Exploration | null,
  routeMode: false,
  expeditionCore: null as ExpeditionCore | null,
  // Gate 3.3C：Dual Visual Mode 会话状态（不含渲染字段）
  visualConfig: null as ExpeditionVisualModeConfig | null,
  visualMedia: null as MediaManifest | null,
  visMode: "LIVE" as ExpeditionVisualMode,
  /** 会话内是否已对“实景暂不可用”说明过一次（避免每帧重写同一 setData） */
  visLiveNoted: false,
  visMountedSrc: "" as string,
  visBroken: false,
  visFallbackWarned: {} as Record<string, boolean>,
  /** 当前 HUD 展示高程（Relay=refM，旧轴=current）公共字段，渲染层读取 */
  hudElevation: 0,
  current: 0,
  target: 0,
  lastElev: 0,
  highestReached: 0,
  discovered: new Set<string>(),
  answers: [] as QuizAnswerRecord[],
  quizDone: new Set<string>(),
  visitedStageIds: [] as string[],
  startedAt: 0,
  elapsedSec: 0,
  prevStageIndex: -1,
  prevExpoStageIndex: -1,
  frameCache: {} as Record<string, unknown>,
  ticker: null as ReturnType<typeof setInterval> | null,
  touching: false,
  lastTouchY: 0,
  celebrated: false,
  particlesCached: null as Particle[] | null,
  partBucket: -1,
  bannerTimer: null as ReturnType<typeof setTimeout> | null,
  celebrationTimer: null as ReturnType<typeof setTimeout> | null,

  /* ---------------- 生命周期 ---------------- */

  onLoad(query: Record<string, string>) {
    this.refreshSafeArea();
    const id = (query && query.id) || "";
    const fallback = EXPLORATIONS[0];
    // Gate 3：优先取“真实路线”的 Expedition 场景（Everest V2），否则回落旧探索（海拔轴）
    const expedition = getExpeditionById(id);
    const exploration =
      expedition || getExplorationById(id) || fallback || undefined;
    if (!exploration) {
      wx.showToast({ title: "场景不存在", icon: "none" });
      wx.switchTab({ url: "/pages/home/index" });
      return;
    }
    this.routeMode = Boolean(expedition);
    this.expeditionCore = expedition
      ? {
          routeIndex: expedition.routeIndex,
          stageMap: expedition.stageMap,
          maxElevation: expedition.maxElevation,
        }
      : null;
    this.exploration = exploration;
    // Gate 3.3C：Dual Visual Mode 会话初始化（无视觉配置的旧场景如 Mariana 保持 TERRAIN）
    this.visualConfig = expedition?.visualMode ?? null;
    this.visualMedia = expedition?.media ?? null;
    this.visMode = expedition?.visualMode?.defaultMode ?? "TERRAIN";
    this.visMountedSrc = "";
    this.visBroken = false;
    this.visLiveNoted = false;
    this.visFallbackWarned = {};
    if (this.routeMode && this.expeditionCore) {
      // Relay：初始在路线起点（南坡大本营），轴域 = 0…1 progress
      const initial = driveAtProgress(this.expeditionCore, 0);
      this.current = 0;
      this.target = 0;
      this.lastElev = initial.refM; // 知识解锁基线 = 实际起点参考海拔（避免首帧整批解锁）
      this.hudElevation = initial.refM;
      this.highestReached = initial.refM;
    } else {
      this.current = exploration.startElevation;
      this.target = exploration.startElevation;
      this.lastElev = exploration.startElevation;
      this.hudElevation = exploration.startElevation;
      this.highestReached = exploration.startElevation;
    }
    // 登顶后的「下一站」推荐：与当前场景地点不同类的精选地点（跨类型激发新探索）
    const currentPlaceIds = new Set(
      PLACES.filter((p) => p.explorationId === exploration.id).map((p) => p.id),
    );
    const picks = PLACES.filter(
      (p) => p.featured && !currentPlaceIds.has(p.id),
    );
    const nextStops: Array<{
      id: string;
      name: string;
      emoji: string;
      shortDescription: string;
    }> = [];
    for (const p of picks) {
      if (nextStops.length >= 2) break;
      if (
        nextStops.some(
          (n) => PLACES.find((q) => q.id === n.id)!.type === p.type,
        )
      )
        continue;
      nextStops.push({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        shortDescription: p.shortDescription,
      });
    }
    this.setData({
      nextStops,
      ready: true,
      intro: true,
      title: exploration.title,
      subtitle: exploration.subtitle,
      emoji: exploration.emoji,
      maxElevation: exploration.maxElevation,
      maxElevationText: formatNumber(
        exploration.maxElevation,
        exploration.maxElevation % 1 === 0 ? 0 : 2,
      ),
      metaPlace: exploration.meta.placeLabel,
      metaRegion: exploration.meta.region,
      routeSub: "Mount Everest · South Col Route",
      estMinutes: exploration.estimatedMinutes,
      metaDesc: exploration.meta.description,
      ui: { ...DEFAULT_UI, ...(exploration.ui || {}) },
      destination: exploration.destination || DEFAULT_DESTINATION,
      // Relay 模式：路由 HUD 初始态
      routeMode: this.routeMode,
      // Gate 3.3C.1：请求 = 默认模式；首帧 sync 会把 active 纠正为实际渲染
      visMode: this.visMode,
      visActive: this.visMode,
      visLiveFallback: false,
      liveCropUi: { focusX: 50, focusY: 38, zoom: 1 },
      expedition: emptyExpeditionView(),
      expDeathZone: false,
      expSummit: null,
      worldMountain:
        (exploration.world && exploration.world.style === "mountain") || false,
      worldOcean:
        (exploration.world && exploration.world.style === "ocean") || false,
      // 海洋世界：一次性生成上浮气泡（低频，不复位）
      bubbles:
        (exploration.world && exploration.world.style === "ocean") || false
          ? buildParticles(10)
          : [],
    });
  },

  onReady() {
    // 胶囊几何在页面挂载后补齐（沉浸页顶部安全区）
    this.refreshSafeArea();
    this.startTicker();
  },

  onShow() {
    // 从知识库详情页返回时继续渲染
    if (this.ticker === null && this.exploration) this.startTicker();
  },

  onHide() {
    // 后台停止渲染，省电；并落盘进度
    this.stopTicker();
    this.persistProgress();
  },

  onUnload() {
    this.stopTicker();
    if (this.bannerTimer !== null) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
    if (this.celebrationTimer !== null) {
      clearTimeout(this.celebrationTimer);
      this.celebrationTimer = null;
    }
    this.persistProgress();
  },

  /* ---------------- 引擎节拍 ---------------- */

  startTicker() {
    if (this.ticker !== null) return;
    this.ticker = setInterval(() => this.tickFrame(), TICK_MS);
  },

  stopTicker() {
    if (this.ticker !== null) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  },

  /** 沉浸页顶部安全区：优先取真实状态栏 + 胶囊几何；缺失时段回退默认 20px */
  refreshSafeArea() {
    // SAFETY: wx 官方类型只暴露本页用到的子集，这里按方法名访问运行时 API；
    // 每次取用前都有 typeof 非函数守卫，取不到时回退默认值，不会 NPE。
    const has = (fn: string) =>
      typeof (wx as unknown as Record<string, unknown>)[fn] === "function";
    // SAFETY: 同上 —— win 只在其公开方法存在时才断言为窗口信息对象；
    // 字段可选 + 默认 20px，任何运行时不满足都安全回退。
    const win: { statusBarHeight?: number; windowWidth?: number } = has(
      "getWindowInfo",
    )
      ? (
          (
            wx as unknown as Record<
              string,
              () => { statusBarHeight?: number; windowWidth?: number }
            >
          )["getWindowInfo"] as () => {
            statusBarHeight?: number;
            windowWidth?: number;
          }
        )()
      : has("getSystemInfoSync")
        ? (
            (
              wx as unknown as Record<
                string,
                () => { statusBarHeight?: number; windowWidth?: number }
              >
            )["getSystemInfoSync"] as () => {
              statusBarHeight?: number;
              windowWidth?: number;
            }
          )()
        : {};
    const statusBarH = win.statusBarHeight ?? 20;
    let cap = { top: Math.round(statusBarH), h: 32, left: 0 };
    if (has("getMenuButtonBoundingClientRect")) {
      // SAFETY: 同样先验证方法存在；返回对象字段可选，取不到即回退默认胶囊高。
      const rect = (
        wx as unknown as Record<
          string,
          () => { top?: number; height?: number; left?: number } | undefined
        >
      )[`getMenuButtonBoundingClientRect`]();
      if (rect && rect.top != null) {
        cap = {
          top: Math.round(rect.top),
          h: Math.round(rect.height ?? 32),
          left: Math.round(rect.left ?? 0),
        };
      }
    }
    const bottom = cap.top + cap.h;
    // Gate 3.3C.1 P0：切换器置于胶囊左缘外侧 8px；无几何时默认 96。
    const winW = win.windowWidth ?? 375;
    const capRight = Math.max(
      12,
      Math.round(winW - (cap.left > 0 ? cap.left : winW - 96)) + 8,
    );
    if (
      this.data.capTop !== cap.top ||
      this.data.capH !== cap.h ||
      this.data.capBottom !== bottom ||
      this.data.capRight !== capRight
    ) {
      this.setData({
        capTop: cap.top,
        capH: cap.h,
        capBottom: bottom,
        capRight,
      });
    }
  },

  tickFrame() {
    const ex = this.exploration;
    if (!ex) return;
    const relay = this.routeMode && this.expeditionCore;

    // 平滑追向目标（真实路线：轴域 0-1 progress；旧海拔轴：m）
    this.current += (this.target - this.current) * MOTION_GAIN;
    const eps = relay ? EASE_EPS_ROUTE : EASE_EPS;
    if (Math.abs(this.target - this.current) < eps) {
      this.current = this.target;
    }
    this.current = clamp(
      this.current,
      relay ? 0 : ex.startElevation,
      relay ? 1 : ex.maxElevation,
    );

    // 计时（从开始攀登计）
    if (this.startedAt > 0) {
      this.elapsedSec = (Date.now() - this.startedAt) / 1000;
    }

    if (relay) {
      this.tickExpeditionFrame();
    } else {
      this.tickLegacyFrame(ex);
    }
  },

  /** 旧探索（无 V2 附件，如马里亚纳）：海拔轴原语义完全保留 */
  tickLegacyFrame(ex: Exploration) {
    this.highestReached = Math.max(this.highestReached, this.current);
    this.hudElevation = this.current;

    // 上行穿越 → 解锁知识节点
    const unlocked = knowledgeUnlockedOnMove(
      ex.knowledgeNodes,
      this.lastElev,
      this.current,
    );
    if (unlocked.length) {
      unlocked.forEach((n) => this.discovered.add(n.id));
      this.setData({
        hint: { show: true, text: `发现「${unlocked[0].title}」，点击查看` },
      });
    }
    this.lastElev = this.current;

    const derived = deriveState(ex, this.current, Array.from(this.discovered));
    this.renderFrame(ex, derived);
    this.syncStageTransition(ex, derived.stageIndex);

    // 登顶
    if (!this.celebrated && this.current >= ex.maxElevation - 0.5) {
      this.celebrated = true;
      this.onSummit();
    }
  },

  /** 路线轴（Gate 3）：真实 routeIndex 驱动（Everest V2），不使用海拔轴向 */
  tickExpeditionFrame() {
    const core = this.expeditionCore;
    const ex = this.exploration;
    if (!core || !ex) return;
    const drive = driveAtProgress(core, this.current);

    // 知识解锁：参考海拔作为穿越观测轴（起点=BC 实际参考海拔，首帧不会整批解锁）
    const unlocked = knowledgeUnlockedOnMove(
      ex.knowledgeNodes,
      this.lastElev,
      drive.refM,
    );
    if (unlocked.length) {
      unlocked.forEach((n) => this.discovered.add(n.id));
      this.setData({
        hint: { show: true, text: `发现「${unlocked[0].title}」，点击查看` },
      });
    }
    this.lastElev = drive.refM;
    this.hudElevation = drive.refM;
    this.highestReached = Math.max(this.highestReached, drive.refM);

    // 外观环境：以“模型海拔”（reference-anchored）驱动引擎推导；视觉 progress 用真路实际进度
    const derived = deriveState(ex, drive.modelM, Array.from(this.discovered));
    this.renderFrame(ex, derived, drive.progress);
    // 驾驶HUD（全新）
    this.renderExpeditionView(drive);
    // Gate 3.3C：LIVE 实景 / TERRAIN 科学地形 视觉层（由同一 stageIndex 驱动）
    this.syncVisualMode(drive);
    // 七大阶段（按真实里程）：进站记录 + 克制横幅
    this.syncExpeditionStage(drive.stageIndex);

    // 登顶：真实 progress 到达终点（不再用「海拔 ≥ maxElevation−0.5」阈值）
    if (!this.celebrated && drive.atSummit) {
      this.celebrated = true;
      this.onExpeditionSummit(drive);
    }
  },

  /** 七大阶段消费：仅记录首次进入 + 短横幅（克制，不弹大层） */
  syncExpeditionStage(stageIndex: number) {
    if (stageIndex === this.prevExpoStageIndex) return;
    this.prevExpoStageIndex = stageIndex;
    const core = this.expeditionCore;
    if (!core) return;
    const stage = core.stageMap[stageIndex];
    if (!stage) return;
    if (this.visitedStageIds.indexOf(stage.id) === -1) {
      this.visitedStageIds.push(stage.id);
    }
    if (!this.data.intro && !this.data.summit && stage) {
      this.showStageBanner({
        name: stage.name,
        biome: `段 ${stageIndex + 1}/${core.stageMap.length}`,
        emoji: stage.emoji,
      } as Exploration["stages"][number]);
    }
  },

  /* ---------------- Gate 3.3C：Dual Visual Mode（LIVE 实景 / TERRAIN 科学地形） ---------------- */

  /** 每帧由真实路线 stageIndex 派生视觉呈现（不建立第二套进度；切换不动 current/target） */
  syncVisualMode(drive: ExpeditionDriveState) {
    // 无视觉配置（Mariana 等）或已发生解码失败：一律走 DEM（TERRAIN），不 blank
    if (
      !this.visualMedia ||
      !this.visualConfig ||
      !this.expeditionCore ||
      this.visBroken
    ) {
      // 无视觉配置/已解码失败：只停 LIVE，active 诚实置回 TERRAIN
      this.visMountedSrc = "";
      this.setData({
        visActive: "TERRAIN",
        visLiveFallback: false,
        visLiveSrc: "",
        visLiveReady: false,
        liveOverlay: null,
      });
      return;
    }
    const presentation = resolveExpeditionVisual(
      {
        config: this.visualConfig,
        stageMap: this.expeditionCore.stageMap,
        media: this.visualMedia,
      },
      {
        mode: this.visMode,
        stageIndex: drive.stageIndex,
        progress: drive.progress,
      },
    );
    if (presentation.kind === "LIVE") {
      const image = presentation.image || "";
      if (image !== this.visMountedSrc) {
        // 换资产/换场景：重新装载；播放 DEM 底色保持可见（加载完成后再淡入）
        this.visMountedSrc = image;
        this.setData({
          visLiveSrc: image,
          visLiveReady: false,
          liveOverlay: null,
          liveInfo: "",
          liveCropUi: presentationCropUi(presentation.crop),
        });
      }
      // §5/§31/§41：LIVE 上的路线 overlay 正式走 calibration route[]（REPRESENTATIVE
      // 一律不画）；旧 CURATED anchors 仅 dev/review 预览可能触发，生产数据已不携带。
      const range = liveSceneProgressRange(
        presentation.scene,
        this.expeditionCore.stageMap,
      );
      const localProgress =
        range && range.to > range.from
          ? (drive.progress - range.from) / (range.to - range.from)
          : 0.5;
      this.setData({
        visActive: "LIVE",
        visLiveFallback: false,
        liveOverlay: resolveLiveOverlay(presentation, localProgress),
        // §40：实景说明一行（“真实珠峰影像 · 代表性视角”等）
        liveInfo: liveSceneInfo(presentation) ?? "",
        liveCropUi: presentationCropUi(presentation.crop),
      });
      return;
    }
    // TERRAIN：仅对「非用户选择 / 非未绑定场景」的兜底输出一次 warn（B/C/D 静默）
    if (
      presentation.reason &&
      presentation.reason !== "user-selected" &&
      presentation.reason !== "no-live-assets"
    ) {
      const key = `${presentation.stageIndex}:${presentation.reason}`;
      if (!this.visFallbackWarned[key]) {
        this.visFallbackWarned[key] = true;
        console.warn(
          visualFallbackWarning(
            presentation.reason,
            String(presentation.stageIndex),
          ),
        );
      }
    }
    // TERRAIN：诚实表现——只会实际渲染画面上无 LIVE 时，把 toggle 的“自信”交给 visActive。
    // 用户正请求 LIVE（B/C/D 无图 / 解码失败）→ 亮出“实景暂不可用 · 已回退本地影像”一次。
    const requestedLive = this.visMode === "LIVE";
    if (this.visMountedSrc === "" && this.data.visActive === "TERRAIN") {
      if (requestedLive && !this.visLiveNoted) {
        this.visLiveNoted = true;
        this.setData({
          visActive: "TERRAIN",
          visLiveFallback: true,
          liveInfo: "实景暂不可用 · 已回退本地影像",
        });
      } else if (!requestedLive && this.data.visLiveFallback) {
        this.visLiveNoted = false;
        this.setData({
          visActive: "TERRAIN",
          visLiveFallback: false,
          liveInfo: "",
        });
      }
      return;
    }
    this.visMountedSrc = "";
    this.visLiveNoted = requestedLive;
    this.setData({
      visActive: "TERRAIN",
      visLiveFallback: requestedLive,
      visLiveSrc: "",
      visLiveReady: false,
      liveOverlay: null,
      liveInfo: requestedLive ? "实景暂不可用 · 已回退本地影像" : "",
    });
  },

  /** LIVE / TERRAIN 切换（会话记住）：绝不改动 current/target/progress */
  onToggleVisualMode(e: PageEvent) {
    const mode = String(
      (e.currentTarget &&
        e.currentTarget.dataset &&
        e.currentTarget.dataset.mode) ||
        "",
    );
    const next: ExpeditionVisualMode = mode === "LIVE" ? "LIVE" : "TERRAIN";
    this.visMode = next;
    this.visLiveNoted = false; // 切换后肯定重新进入“真实可用”状态，允许重新提示
    this.setData({
      visMode: next,
      visActive: next === "LIVE" ? "LIVE" : "TERRAIN",
      visLiveFallback: false,
      liveCropUi: { focusX: 50, focusY: 38, zoom: 1 },
      visLiveSrc: "",
      visLiveReady: false,
      liveOverlay: null,
      liveInfo: "",
    });
    if (next === "LIVE" && this.expeditionCore) {
      const drive = driveAtProgress(this.expeditionCore, this.current);
      this.syncVisualMode(drive);
    }
  },

  /** LIVE 图片解码成功 → 淡入（装载期间 DEM 底色保持，无白屏） */
  onLiveImageLoad() {
    if (this.visMountedSrc === "" || this.visBroken) return;
    this.setData({ visLiveReady: true });
  },

  /** §42：LIVE 图片解码失败 → 会话内回退（不白屏、不反复重试坏资产），并如实反映到 toggle */
  onLiveImageError() {
    if (this.visBroken) return;
    this.visBroken = true;
    this.visMode = "TERRAIN";
    this.visMountedSrc = "";
    this.visLiveNoted = true;
    console.warn(visualFallbackWarning("load-failed", "live-image"));
    this.setData({
      visMode: "TERRAIN",
      visActive: "TERRAIN",
      visLiveFallback: true,
      visLiveSrc: "",
      visLiveReady: false,
      liveOverlay: null,
      liveInfo: "实景暂不可用 · 已回退本地影像",
    });
  },

  /** Gate 3：真实路线HUD（差分推送；死亡区/峰顶附独立 flag 供样式切换） */
  renderExpeditionView(drive: ExpeditionDriveState) {
    const ex = this.exploration;
    if (!ex) return;
    const v: ExpeditionView = {
      pct: Math.round(drive.progress * 100),
      progress: Math.round(drive.progress * 1000) / 1000,
      distanceText: formatDistanceM(drive.distanceM),
      remainingRouteText: formatRouteKm(drive.remainingRouteM),
      remainingVerticalText: formatNumber(drive.remainingVerticalM, 0),
      currentName: drive.current ? drive.current.name : "",
      currentElevText: drive.atSummit
        ? formatNumber(drive.summitRefM, 2)
        : formatNumber(drive.refM, 0),
      prevName: drive.prev ? drive.prev.name : "—",
      nextName: drive.next ? drive.next.name : "已抵达峰顶",
      nextGapText: drive.next ? formatDistanceM(drive.nextGapM) : "—",
      stageName: drive.stage ? drive.stage.name : "",
      stageEmoji: drive.stage ? drive.stage.emoji : "",
      stageIntro: drive.stage ? drive.stage.intro : "",
      nextStageName: drive.nextStage ? drive.nextStage.name : "",
      deathZone: drive.deathZone,
      atSummit: drive.atSummit,
      latText: drive.lat.toFixed(4),
      lonText: drive.lon.toFixed(4),
      pressText: `${formatNumber(pressureAt(ex, drive.modelM), 0)} hPa`,
      oxygenText: drive.deathZone
        ? OXYGEN_DEATH_TEXT
        : formatPercent(pressureRatioAt(drive.modelM), 1),
      tempText: formatTemperature(temperatureAt(ex, drive.modelM)),
    };
    const sig = [
      v.pct,
      v.progress,
      v.distanceText,
      v.remainingRouteText,
      v.remainingVerticalText,
      v.currentName,
      v.currentElevText,
      v.prevName,
      v.nextName,
      v.nextGapText,
      v.stageName,
      v.stageEmoji,
      v.stageIntro.slice(0, 160),
      v.nextStageName,
      v.latText,
      v.lonText,
      v.deathZone,
      v.atSummit,
      v.pressText,
      v.oxygenText,
      v.tempText,
    ].join("|");
    const cache = this.frameCache;
    // 阶段 intro 极长，只参与签名不参与 diff 主串长度（由 stageName 渐变识别）
    if (cache.expSig !== sig) {
      cache.expSig = sig;
      this.setData({ expedition: v });
    }
    if (cache.expDeath !== drive.deathZone) {
      cache.expDeath = drive.deathZone;
      this.setData({ expDeathZone: drive.deathZone });
    }
  },

  /** 峰顶轻提示（不弹庆祝大层，保证峰顶地形优先可见；数据记录仍完整落盘） */
  onExpeditionSummit(drive: ExpeditionDriveState) {
    if (this.elapsedSec === 0 && this.startedAt > 0) {
      this.elapsedSec = (Date.now() - this.startedAt) / 1000;
    }
    this.setData({
      expSummit: {
        show: true,
        altitudeText: formatNumber(drive.summitRefM, 2), // 唯一峰顶展示：8,848.86
        latText: drive.lat.toFixed(4),
        lonText: drive.lon.toFixed(4),
        note: "你已抵达世界最高点",
      },
      summaryStats: this.computeSummary(),
    });
    this.persistProgress();
  },

  /** Gate 4+：真实路线全景 —— 全部由 routeIndex + stageMap 计算（无“敬请期待”占位） */
  onViewRoute() {
    const core = this.expeditionCore;
    if (!core || !core.routeIndex || core.stageMap.length === 0) {
      wx.showToast({ title: "该场景暂无真实路线全景", icon: "none" });
      return;
    }
    const idx = core.routeIndex;
    const totalM = idx.totalDistanceM || 0;
    const km = (m: number) =>
      m >= 1000 ? `${formatNumber(m / 1000, 1)} km` : `${Math.round(m)} m`;
    const elev = (m: number) => `${formatNumber(m, 0)} m`;
    const ms = idx.milestones;
    const first = ms[0];
    const last = ms[ms.length - 1];
    const kindLabel = (k: string): string => {
      const map: Record<string, string> = {
        camp: "营地",
        landmark: "地标",
        danger: "危险段",
        knowledge: "知识",
        summit: "峰顶",
        waypoint: "途经点",
      };
      return map[k] ?? "途经点";
    };
    const stage = core.stageMap as Array<{
      id: string;
      name: string;
      emoji: string;
      intro: string;
      fromDistanceM: number;
      toDistanceM: number;
    }>;
    this.setData({
      routeOverview: {
        show: true,
        name: idx.name,
        intro: `全程 ${km(totalM)}（含起伏 ${km(idx.total3dDistanceM)}）· 累计爬升 ${elev(idx.ascentM)} · 累计下降 ${elev(idx.descentM)}`,
        totalKmText: km(totalM),
        ascentText: elev(idx.ascentM),
        descentText: elev(idx.descentM),
        startName: first?.name ?? "起点",
        startElevText: first ? elev(first.refM) : "",
        endName: last?.name ?? "终点",
        endElevText: last ? elev(last.refM) : "",
        pointCount: idx.pointCount,
        stages: stage.map((s, i) => ({
          index: i + 1,
          name: s.name,
          emoji: s.emoji,
          intro: s.intro,
          kmText: km(s.toDistanceM - s.fromDistanceM || 0),
          rangeText: `${km(s.fromDistanceM)} → ${km(s.toDistanceM)}`,
        })),
        milestones: ms.map((m) => ({
          name: m.name,
          kindLabel: kindLabel(m.kind),
          kmText: km(m.distanceM),
          elevText: m.refM ? elev(m.refM) : "",
          isSummit: m.kind === "summit",
        })),
        provenance: (idx.sourceLabel || []).slice(0, 6),
      },
    });
  },

  onCloseRouteOverview() {
    this.setData({ routeOverview: null });
  },

  /** 阶段切换：首次途经记录 + 短暂横幅 */
  syncStageTransition(ex: Exploration, stageIndex: number) {
    if (stageIndex === this.prevStageIndex) return;
    this.prevStageIndex = stageIndex;
    const stage = ex.stages[stageIndex];
    if (stage && this.visitedStageIds.indexOf(stage.id) === -1) {
      this.visitedStageIds.push(stage.id);
    }
    if (!this.data.intro && !this.data.summit && stage) {
      this.showStageBanner(stage);
    }
  },

  showStageBanner(stage: Exploration["stages"][number]) {
    if (this.bannerTimer !== null) clearTimeout(this.bannerTimer);
    this.setData({
      stageBanner: {
        show: true,
        title: stage.name,
        biome: stage.biome,
        emoji: stage.emoji,
      },
    });
    this.bannerTimer = setTimeout(() => {
      this.setData({
        stageBanner: { show: false, title: "", biome: "", emoji: "" },
      });
      this.bannerTimer = null;
    }, BANNER_MS);
  },

  /** 引擎输出 → 差分 setData：高频运动字段每帧只推变化值，低频业务/环境只在切阶段或值变化时推 */
  renderFrame(
    ex: Exploration,
    d: ExplorationDerivedState,
    progressOverride?: number,
  ) {
    // 真实路线模式：视觉 progress 直接用真实里程轴（而不是由海拔推导）
    const progress =
      progressOverride ??
      progressFor(d.elevation, ex.startElevation, ex.maxElevation);
    const cache = this.frameCache;
    const pct = Math.round(progress * 100);
    const nextCache: Record<string, unknown> = {};
    const patch: Record<string, unknown> = {};
    const ui = this.data.ui as ExplorationUi;

    // 高频：大数字海拔（每帧只推变化值；真实路线模式读 refM）
    const elevationM = Math.max(0, this.hudElevation);
    nextCache.elevationText = formatNumber(elevationM, 0);
    if (cache.elevationText !== nextCache.elevationText) {
      patch.elevationText = nextCache.elevationText;
    }

    // 高频：海拔小字 8.8 km · 距峰顶 123 m（文案来自场景 ui.remainingLabel）
    const km =
      elevationM >= 1000
        ? `${(elevationM / 1000).toFixed(1)} km`
        : `${formatNumber(elevationM, 0)} m`;
    nextCache.kmStage = `${km} ${ui.remainingLabel} ${formatNumber(
      Math.max(0, ex.maxElevation - elevationM),
      0,
    )} m`;
    if (cache.kmStage !== nextCache.kmStage) {
      patch.kmStage = nextCache.kmStage;
    }

    // 高频：进度环/条
    nextCache.pct = pct;
    if (cache.pct !== pct) {
      patch.progress = progress;
      patch.pct = pct;
    }

    // 路线当前位置每 1% 更新一次，避免把连续拖动放大为高频 setData。
    const routeKey = ex.route ? `${ex.route.id}:${pct}` : "";
    nextCache.routeKey = routeKey;
    if (cache.routeKey !== routeKey) {
      patch.route = ex.route ? buildRouteState(ex.route, progress) : null;
    }

    // ---- 低频：仅跨阶段边界时刷新整套环境与视觉（地形/天光/雾/植被/人物姿态/生物/刻度） ----
    nextCache.stageId = d.stage.id;
    if (cache.stageId !== d.stage.id) {
      patch.stageName = d.stage.name;
      patch.stageEmoji = d.stage.emoji;
      patch.biome = d.stage.biome;
      patch.stageDescription = d.stage.description;
      patch.nextStageName = d.nextStage
        ? `下一带 · ${d.nextStage.name}`
        : `已到${(this.data.destination || DEFAULT_DESTINATION).label}`;
      patch.flora = buildFlora(d.flora);
      patch.skyGradient = `linear-gradient(180deg, ${d.sky[0]} 0%, ${d.sky[1]} 55%, ${d.sky[2]} 100%)`;
      patch.fogOpacity = Math.round(d.fog * 100) / 100;
      patch.snowCover = Math.round(d.snow * 100) / 100;
      patch.vegetation = Math.round(d.vegetation * 100) / 100;
      patch.greenTint = `rgba(${Math.round(88 + d.vegetation * 58)},${Math.round(
        148 + d.vegetation * 26,
      )},${Math.round(76 + d.vegetation * 18)},${(
        0.3 + d.vegetation * 0.6
      ).toFixed(2)})`;
      patch.terrainTop = d.terrainTint[0];
      patch.terrainBottom = d.terrainTint[1];
      patch.climberLean = Math.round(clamp(d.wind * 6, 0, 6));
      // 海洋世界：表层光柱随深度衰减（只在阶段边界更新，低频）
      if (this.data.worldOcean) {
        patch.rayOpacity = Math.round((1 - progress) * 50) / 100;
      }
    }

    // 知识解锁状态变化由 onTapRouteWaypoint 读取 discovered 集合判断。
    nextCache.disc = this.discovered.size;

    // ---- 通用指标条（低频）：仅当显示值变化才推 —— 场景自行声明展示什么 ----
    const metricsSig = (d.metrics || [])
      .map((m) => `${m.key}:${m.value}${m.unit || ""}`)
      .join("|");
    nextCache.metricsSig = metricsSig;
    if (cache.metricsSig !== metricsSig) {
      patch.metrics = d.metrics;
      const all = d.metrics || ([] as EnvironmentMetric[]);
      const open = this.data.metricsOpen;
      patch.metricsShow = open ? all : all.slice(0, METRICS_PINNED);
      patch.metricsMore = all.length > METRICS_PINNED;
    }

    // 高频视差：dirty-check 后仅推变化组
    const parVals = [
      Math.round(progress * PARALLAX_BASE * LAYER_SPEED.sky),
      Math.round(progress * PARALLAX_BASE * LAYER_SPEED.far),
      Math.round(progress * PARALLAX_BASE * LAYER_SPEED.mid),
      Math.round(progress * PARALLAX_BASE * LAYER_SPEED.near),
      Math.round(progress * PARALLAX_BASE * LAYER_SPEED.ground),
      Math.round(progress * PARALLAX_BASE * LAYER_SPEED.climber),
      Math.round(progress * PARALLAX_BASE * LAYER_SPEED.snow),
    ];
    const parKey = parVals.join(",");
    nextCache.parKey = parKey;
    if (cache.parKey !== parKey) {
      patch.par = {
        sky: parVals[0],
        far: parVals[1],
        mid: parVals[2],
        near: parVals[3],
        ground: parVals[4],
        climber: parVals[5],
        snow: parVals[6],
      };
    }

    // 高频：主峰渐近（独立字段，值变化才推）
    const mntScale = this.data.worldMountain
      ? Math.round((100 + progress * 46) * 10) / 10
      : 100;
    nextCache.mntScale = mntScale;
    if (cache.mntScale !== mntScale) patch.mntScale = mntScale;

    // 场景插画层：阶段/登顶模式/雪量/云海/视图分带 变化时才重建（山岳世界专用）
    // 峰顶全景只在真正抵达终点后进入，避免 8,826m 左右提前“登顶”。
    const summitMode = Boolean(this.data.worldMountain && d.isSummit);
    {
      const sKey = [
        d.stage.id,
        summitMode ? "summit" : "mnt",
        Math.round(d.snow * 40),
        cloudSeaKey(d.stage.surfaceKind, progress),
        this.data.worldMountain && !summitMode ? viewBand(progress) : "-",
      ].join("|");
      nextCache.sceneKey = sKey;
      if (cache.sceneKey !== sKey) {
        patch.scene = this.data.worldMountain
          ? buildScene(d, progress, summitMode)
          : SCENE_DEFAULT;
      }
    }

    // 雪花粒子（档位变化才重建）
    const bucket = Math.min(
      MAX_SNOWFLAKES,
      Math.ceil((d.snow * MAX_SNOWFLAKES) / SNOWFLAKE_COUNT_STEP) *
        SNOWFLAKE_COUNT_STEP,
    );
    if (bucket !== this.partBucket || !this.particlesCached) {
      this.particlesCached = buildParticles(bucket);
      this.partBucket = bucket;
      patch.particles = this.particlesCached;
    }

    this.frameCache = nextCache;
    if (Object.keys(patch).length > 0) this.setData(patch);
  },

  /* ---------------- 交互：滑动 / 步进 ---------------- */

  busy(): boolean {
    return Boolean(
      this.data.intro ||
        this.data.summit ||
        this.data.celebration ||
        (this.data.quiz && this.data.quiz.show),
    );
  },

  onTouchStart(e: PageEvent) {
    if (this.busy()) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    this.touching = true;
    this.lastTouchY = t.clientY;
  },

  onTouchMove(e: PageEvent) {
    if (!this.touching) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const dy = this.lastTouchY - t.clientY; // 上滑 → 前进
    this.lastTouchY = t.clientY;
    const ex = this.exploration;
    if (!ex) return;
    if (this.routeMode && this.expeditionCore) {
      // 真实路线：拖动像素 → 路线里程 → progress（1px ≈ 9m 里程）
      const total = this.expeditionCore.routeIndex.totalDistanceM;
      this.target = clamp(this.target + (dy * METERS_PER_PX) / total, 0, 1);
      return;
    }
    this.target = clamp(
      this.target + dy * METERS_PER_PX,
      ex.startElevation,
      ex.maxElevation,
    );
  },

  onTouchEnd() {
    this.touching = false;
  },

  onStepUp() {
    if (this.busy()) return;
    const ex = this.exploration;
    if (!ex) return;
    if (this.routeMode && this.expeditionCore) {
      const total = this.expeditionCore.routeIndex.totalDistanceM;
      this.target = clamp(this.target + ROUTE_STEP_METERS / total, 0, 1);
      return;
    }
    this.target = clamp(
      this.target + STEP_METERS,
      ex.startElevation,
      ex.maxElevation,
    );
  },

  noop() {},

  onToggleMetrics() {
    const open = !this.data.metricsOpen;
    const all = this.data.metrics as EnvironmentMetric[];
    this.setData({
      metricsOpen: open,
      metricsShow: open ? all : all.slice(0, METRICS_PINNED),
      metricsMore: all.length > METRICS_PINNED,
    });
  },

  onStepDown() {
    if (this.busy()) return;
    const ex = this.exploration;
    if (!ex) return;
    if (this.routeMode && this.expeditionCore) {
      const total = this.expeditionCore.routeIndex.totalDistanceM;
      this.target = clamp(this.target - ROUTE_STEP_METERS / total, 0, 1);
      return;
    }
    this.target = clamp(
      this.target - STEP_METERS,
      ex.startElevation,
      ex.maxElevation,
    );
  },

  onStartClimb() {
    if (!this.startedAt) this.startedAt = Date.now();
    this.setData({ intro: false });
  },

  /* ---------------- 知识节点交互 ---------------- */

  /**
   * 点击路线途经点：优先展示「名称 + 海拔 + 介绍」卡片；
   * 若该点关联的知识已解锁，则直接打开知识卡。
   */
  onTapRouteWaypoint(e: PageEvent) {
    const ex = this.exploration;
    if (!ex || !ex.route) return;
    const waypointId = String(
      (e.currentTarget &&
        e.currentTarget.dataset &&
        e.currentTarget.dataset.id) ||
        "",
    );
    const point = ex.route.waypoints.find((p) => p.id === waypointId);
    if (!point) return;
    const linkedNode = point.knowledgeId
      ? ex.knowledgeNodes.find((n) => n.id === point.knowledgeId)
      : undefined;
    if (linkedNode && this.discovered.has(linkedNode.id)) {
      this.setData({ openNode: linkedNode, hint: { show: false, text: "" } });
      return;
    }
    if (!point.desc) {
      wx.showToast({ title: `${point.name} · 继续攀登探索`, icon: "none" });
      return;
    }
    this.setData({
      waypointCard: {
        show: true,
        name: point.name,
        altitudeText: point.altitude
          ? `${formatNumber(point.altitude, point.altitude % 1 ? 2 : 0)} ${this.data.ui.axisUnit}`
          : "",
        desc: point.desc,
        lockedKnowledge: Boolean(linkedNode),
      },
    });
  },

  onWaypointCardClose() {
    this.setData({ waypointCard: null });
  },

  onHintTap() {
    const ex = this.exploration;
    if (!ex) return;
    const last = ex.knowledgeNodes
      .filter((n) => this.discovered.has(n.id))
      .pop();
    if (last) this.setData({ openNode: last, hint: { show: false, text: "" } });
  },

  onPopupClose() {
    this.setData({ openNode: null });
  },

  /** 读完知识卡“继续探索” → 若该节点带随堂题且尚未作答，弹出 Quiz */
  onPopupContinue() {
    const node = this.data.openNode;
    this.setData({ openNode: null, hint: { show: false, text: "" } });
    if (node && node.quiz && !this.quizDone.has(node.id)) this.openQuiz(node);
  },

  /* ---------------- 随堂 Quiz ---------------- */

  openQuiz(node: ExplorationKnowledgeNode) {
    const q = quizForNode(node);
    if (!q) return this.setData({ openNode: null });
    this.quizDone.add(node.id);
    this.setData({
      openNode: null,
      quiz: {
        show: true,
        nodeId: node.id,
        nodeEmoji: q.emoji || node.emoji,
        lead: q.lead || "刚学完这段知识，试着回答这一题：",
        question: q.question,
        options: q.options,
        selected: -1,
        correct: false,
        revealed: false,
        explanation: q.explanation,
      },
    });
  },

  onQuizPick(e: PageEvent) {
    const q = this.data.quiz;
    if (!q || q.revealed) return;
    const index = Number(
      (e.currentTarget &&
        e.currentTarget.dataset &&
        e.currentTarget.dataset.index) ||
        -1,
    );
    if (index < 0 || index >= q.options.length) return;
    const node =
      this.exploration &&
      this.exploration.knowledgeNodes.find((n) => n.id === q.nodeId);
    const correct = Boolean(
      node && node.quiz && node.quiz.answerIndex === index,
    );
    this.answers.push({ quizId: q.nodeId, correct });
    this.setData({
      quiz: { ...q, selected: index, correct, revealed: true },
    });
  },

  onQuizClose() {
    this.setData({ quiz: null });
  },

  onQuizContinue() {
    this.setData({ quiz: null });
  },

  /* ---------------- 登顶 / 结算 ---------------- */

  onSummit() {
    if (this.elapsedSec === 0 && this.startedAt > 0) {
      this.elapsedSec = (Date.now() - this.startedAt) / 1000;
    }
    this.setData({
      celebration: true,
      summaryStats: this.computeSummary(),
    });
    this.persistProgress();
    this.celebrationTimer = setTimeout(() => {
      this.setData({ celebration: false, summit: true });
      this.celebrationTimer = null;
    }, SUMMIT_CELEBRATION_MS);
  },

  /** 计算总结（纯汇总；登顶动画期间即准备，等展示时已就绪） */
  computeSummary(): SummaryStats {
    const ex = this.exploration;
    if (!ex)
      return {
        durationText: formatDuration(this.elapsedSec),
        unlocked: 0,
        nodeTotal: 0,
        quizText: "0/0",
        accuracyText: "0%",
        stageNames: [],
        stageTotal: 0,
        maxText: "0",
        achievements: [],
      };
    const stats = summarizeRun({
      exploration: ex,
      discoveredIds: Array.from(this.discovered),
      answers: this.answers,
      stageIds: this.visitedStageIds,
      durationSec: this.elapsedSec,
      maxReached: this.highestReached,
    });
    const achievements = computeAchievements({
      summitted: stats.summitted,
      durationSec: stats.durationSec,
      unlockedCount: stats.unlockedCount,
      nodeTotal: stats.nodeTotal,
      quizAnswerCount: stats.quizTotal,
      quizAccuracy: stats.accuracy,
      visitedStageCount: stats.visitedStages.length,
      stageTotal: stats.stageTotal,
    });
    return {
      durationText: formatDuration(stats.durationSec),
      unlocked: stats.unlockedCount,
      nodeTotal: stats.nodeTotal,
      quizText: `${stats.quizCorrect}/${stats.quizTotal}`,
      accuracyText: `${Math.round(stats.accuracy * 100)}%`,
      stageNames: stats.visitedStages,
      stageTotal: stats.stageTotal,
      maxText: formatNumber(stats.maxReached, 0),
      achievements,
    };
  },

  /** 登顶总结：跳转「下一站」地点详情（发现新的探索目标） */
  onOpenNextStop(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pages/place/index?id=${id}` });
  },

  onBackHome() {
    wx.switchTab({ url: "/pages/home/index" });
  },

  onGoProfile() {
    wx.switchTab({ url: "/pages/profile/index" });
  },

  onRestart() {
    const ex = this.exploration;
    if (!ex) return;
    if (this.routeMode && this.expeditionCore) {
      const initial = driveAtProgress(this.expeditionCore, 0);
      this.current = 0;
      this.target = 0;
      this.lastElev = initial.refM;
      this.hudElevation = initial.refM;
      this.highestReached = initial.refM;
    } else {
      this.current = ex.startElevation;
      this.target = ex.startElevation;
      this.lastElev = ex.startElevation;
      this.hudElevation = ex.startElevation;
      this.highestReached = ex.startElevation;
    }
    this.celebrated = false;
    this.discovered = new Set();
    this.answers = [];
    this.quizDone = new Set();
    this.visitedStageIds = [];
    this.elapsedSec = 0;
    this.startedAt = Date.now();
    this.particlesCached = null;
    this.partBucket = -1;
    this.prevExpoStageIndex = -1;
    this.frameCache = {}; // 重置差分缓存，下一帧重建全部视觉
    this.setData({
      intro: false,
      celebration: false,
      summit: false,
      summaryStats: null,
      openNode: null,
      waypointCard: null,
      routeOverview: null,
      quiz: null,
      hint: { show: false, text: "" },
      stageBanner: { show: false, title: "", biome: "", emoji: "" },
      expedition: emptyExpeditionView(),
      expDeathZone: false,
      expSummit: null,
    });
  },

  /* ---------------- 持久化 ---------------- */

  persistProgress() {
    const ex = this.exploration;
    if (!ex) return;
    const stats = this.buildStats();
    saveExplorationRecord({
      exploration: ex,
      reachElevation: Math.round(this.highestReached),
      completed: this.celebrated,
      knowledgeIds: Array.from(this.discovered),
      durationSec: Math.round(stats.durationSec),
      quizCorrect: stats.quizCorrect,
      quizTotal: stats.quizTotal,
      stagesVisited: this.visitedStageIds,
      achievements: stats.achievementIds,
    });
  },

  buildStats() {
    const ex = this.exploration;
    if (!ex)
      return {
        durationSec: 0,
        quizCorrect: 0,
        quizTotal: 0,
        achievementIds: [] as string[],
      };
    const s = summarizeRun({
      exploration: ex,
      discoveredIds: Array.from(this.discovered),
      answers: this.answers,
      stageIds: this.visitedStageIds,
      durationSec: this.elapsedSec,
      maxReached: this.highestReached,
    });
    return {
      durationSec: s.durationSec,
      quizCorrect: s.quizCorrect,
      quizTotal: s.quizTotal,
      achievementIds: computeAchievements({
        summitted: s.summitted,
        durationSec: s.durationSec,
        unlockedCount: s.unlockedCount,
        nodeTotal: s.nodeTotal,
        quizAnswerCount: s.quizTotal,
        quizAccuracy: s.accuracy,
        visitedStageCount: s.visitedStages.length,
        stageTotal: s.stageTotal,
      }).map((a) => a.id),
    };
  },
});
