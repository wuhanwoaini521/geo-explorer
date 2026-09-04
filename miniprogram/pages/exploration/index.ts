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
import { EXPLORATIONS, getExplorationById } from "../../data/explorations/index";
import { PLACES } from "../../data/places";
import {
  deriveState,
  knowledgeUnlockedOnMove,
  progressFor,
  quizForNode,
} from "../../engine/exploration-engine";
import { saveExplorationRecord } from "../../services/exploration-store";
import type {
  EnvironmentMetric,
  Exploration,
  ExplorationDerivedState,
  ExplorationDestination,
  ExplorationKnowledgeNode,
  ExplorationRoute,
  ExplorationUi,
} from "../../types/exploration";
import { clamp, formatDuration, formatNumber } from "../../utils/format";
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
  achievements: Array<{ id: string; emoji: string; title: string; desc: string }>;
}

interface StageBanner {
  show: boolean;
  title: string;
  biome: string;
  emoji: string;
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
function buildRouteState(route: ExplorationRoute, progress: number): SceneRouteState {
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
  return kind === "glacier" || kind === "death" || kind === "snow" ||
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
    stageBanner: { show: false, title: "", biome: "", emoji: "" } as StageBanner,
    hint: { show: false, text: "" },
    openNode: null as ExplorationKnowledgeNode | null,
    waypointCard: null as WaypointCardState | null,
    quiz: null as QuizState | null,

    // 登顶 / 汇总
    celebration: false,
    summit: false,
    summaryStats: null as SummaryStats | null,
    nextStops: [] as Array<{ id: string; name: string; emoji: string; shortDescription: string }>,
  },

  // ---- 内部实例状态（不参与渲染） ----
  exploration: null as Exploration | null,
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
    const id = (query && query.id) || "";
    const fallback = EXPLORATIONS[0];
    const exploration =
      getExplorationById(id) || fallback || undefined;
    if (!exploration) {
      wx.showToast({ title: "场景不存在", icon: "none" });
      wx.switchTab({ url: "/pages/home/index" });
      return;
    }
    this.exploration = exploration;
    this.current = exploration.startElevation;
    this.target = exploration.startElevation;
    this.lastElev = exploration.startElevation;
    this.highestReached = exploration.startElevation;
    // 登顶后的「下一站」推荐：与当前场景地点不同类的精选地点（跨类型激发新探索）
    const currentPlaceIds = new Set(
      PLACES.filter((p) => p.explorationId === exploration.id).map((p) => p.id),
    );
    const picks = PLACES.filter((p) => p.featured && !currentPlaceIds.has(p.id));
    const nextStops: Array<{ id: string; name: string; emoji: string; shortDescription: string }> = [];
    for (const p of picks) {
      if (nextStops.length >= 2) break;
      if (nextStops.some((n) => PLACES.find((q) => q.id === n.id)!.type === p.type)) continue;
      nextStops.push({ id: p.id, name: p.name, emoji: p.emoji, shortDescription: p.shortDescription });
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
      estMinutes: exploration.estimatedMinutes,
      metaDesc: exploration.meta.description,
      ui: { ...DEFAULT_UI, ...(exploration.ui || {}) },
      destination: exploration.destination || DEFAULT_DESTINATION,
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

  tickFrame() {
    const ex = this.exploration;
    if (!ex) return;

    // 平滑追向目标海拔
    this.current += (this.target - this.current) * MOTION_GAIN;
    if (Math.abs(this.target - this.current) < EASE_EPS) {
      this.current = this.target;
    }
    this.current = clamp(this.current, ex.startElevation, ex.maxElevation);
    this.highestReached = Math.max(this.highestReached, this.current);

    // 计时（从开始攀登计）
    if (this.startedAt > 0) {
      this.elapsedSec = (Date.now() - this.startedAt) / 1000;
    }

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
  renderFrame(ex: Exploration, d: ExplorationDerivedState) {
    const progress = progressFor(
      d.elevation,
      ex.startElevation,
      ex.maxElevation,
    );
    const cache = this.frameCache;
    const pct = Math.round(progress * 100);
    const nextCache: Record<string, unknown> = {};
    const patch: Record<string, unknown> = {};
    const ui = this.data.ui as ExplorationUi;

    // 高频：大数字海拔（每帧只推变化值）
    const elevationM = Math.max(0, this.current);
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
        0.3 +
        d.vegetation * 0.6
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
    const dy = this.lastTouchY - t.clientY; // 上滑 → 海拔上升
    this.lastTouchY = t.clientY;
    const ex = this.exploration;
    if (!ex) return;
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
      (e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.id) || "",
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
    const index = Number((e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.index) || -1);
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
    this.current = ex.startElevation;
    this.target = ex.startElevation;
    this.lastElev = ex.startElevation;
    this.highestReached = ex.startElevation;
    this.celebrated = false;
    this.discovered = new Set();
    this.answers = [];
    this.quizDone = new Set();
    this.visitedStageIds = [];
    this.elapsedSec = 0;
    this.startedAt = Date.now();
    this.particlesCached = null;
    this.partBucket = -1;
    this.frameCache = {}; // 重置差分缓存，下一帧重建全部视觉
    this.setData({
      intro: false,
      celebration: false,
      summit: false,
      summaryStats: null,
      openNode: null,
      waypointCard: null,
      quiz: null,
      hint: { show: false, text: "" },
      stageBanner: { show: false, title: "", biome: "", emoji: "" },
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
