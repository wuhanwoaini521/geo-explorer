/**
 * 🏔️ 探索页 —— 「攀登珠穆朗玛峰」沉浸式场景（MVP 核心闭环）。
 *
 * 架构：Exploration Engine（海拔→环境 纯推导）+ 数据驱动（Exploration）+ CSS 2.5D 视差渲染。
 * 页面职责：手势/按钮 → 修改目标海拔 → 引擎推导 → setData 渲染。新增场景无需改本页面。
 */
import { getExplorationById } from "../../data/explorations/index";
import {
  deriveState,
  knowledgeUnlockedOnMove,
  progressFor,
} from "../../engine/exploration-engine";
import { saveExplorationRecord } from "../../services/exploration-store";
import type {
  Exploration,
  ExplorationDerivedState,
  ExplorationKnowledgeNode,
} from "../../types/exploration";
import { clamp, formatNumber } from "../../utils/format";

/* ---------------- 交互 / 动画参数 ---------------- */
const TICK_MS = 55; // 渲染节拍（≈18fps）
const METERS_PER_PX = 9; // 拖动 1px ≈ 爬升 9m
const STEP_METERS = 360; // 上/下按钮步进（m）
const MOTION_GAIN = 0.22; // current 每 tick 逼近 target 系数
const EASE_EPS = 0.4; // 静止判定阈值（m）
const PARALLAX_BASE = 220; // 全场视差总位移（px）
const LAYER_SPEED = {
  sky: 0.08,
  far: 0.3,
  mid: 0.55,
  near: 0.85,
  ground: 1.0,
  climber: 1.12,
  snow: 1.3,
};
const MAX_SNOWFLAKES = 26;
const SNOWFLAKE_COUNT_STEP = 4; // 粒子数按档量化，减少数组重建

interface Particle {
  id: number;
  left: number; // %（水平）
  size: number; // px
  duration: number; // s（下落周期）
  delay: number; // s
  sway: number; // s（左右飘移周期）
  opacity: number;
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function buildParticles(count: number): Particle[] {
  const list: Particle[] = [];
  for (let i = 0; i < count; i++) {
    list.push({
      id: i,
      left: randomBetween(0, 100),
      size: Math.round(randomBetween(6, 14)),
      duration: Math.round(randomBetween(4, 9) * 10) / 10,
      delay: Math.round(randomBetween(0, 6) * 10) / 10,
      sway: Math.round(randomBetween(2, 5) * 10) / 10,
      opacity: Math.round(randomBetween(0.5, 0.95) * 100) / 100,
    });
  }
  return list;
}

function windLabel(wind: number): string {
  if (wind >= 0.7) return "烈风";
  if (wind >= 0.4) return "疾风";
  if (wind >= 0.2) return "微风";
  return "无风";
}

function airFeel(pressureRatio: number): string {
  if (pressureRatio >= 0.9) return "空气充足";
  if (pressureRatio >= 0.6) return "略有高原反应";
  if (pressureRatio >= 0.4) return "明显缺氧";
  return "严重缺氧";
}

interface MarkerItem {
  id: string;
  emoji: string;
  top: number; // 右侧海拔刻度 top%（峰顶=0）
  found: boolean;
  elevationText: string;
}

Page({
  data: {
    // 场景信息
    ready: false,
    intro: true, // 开场介绍卡
    title: "",
    subtitle: "",
    emoji: "",
    maxElevation: 8848.86,
    // 实时状态 HUD
    elevationText: "0",
    progress: 0,
    pct: 0,
    kmStage: "",
    stageName: "",
    stageEmoji: "",
    biome: "",
    stageDescription: "",
    temperatureText: "",
    o2Text: "",
    windText: "",
    airFeel: "",
    // 渲染层
    skyGradient: "",
    par: { far: 0, mid: 0, near: 0, ground: 0, climber: 0, snow: 0 },
    fogOpacity: 0,
    snowCover: 0,
    vegetation: 1,
    greenTint: "rgba(146,174,94,0.9)",
    climberLean: 0,
    particles: [] as Particle[],
    markers: [] as MarkerItem[],
    // 知识
    hint: { show: false, text: "" },
    openNode: null as ExplorationKnowledgeNode | null,
    // 结算
    summit: false,
    summary: null as { learned: string[] } | null,
  },

  // ---- 内部运行时状态（per-instance，防止多页面实例共享） ----
  exploration: null as Exploration | null,
  current: 0,
  target: 0,
  lastElev: 0,
  discovered: new Set<string>(),
  ticker: null as number | null,
  touching: false,
  lastTouchY: 0,
  celebrated: false,
  particlesCached: null as Particle[] | null,
  partBucket: -1,

  /* ---------------- 生命周期 ---------------- */

  onLoad(query: Record<string, string>) {
    const id = query.id || "everest";
    const exploration = getExplorationById(id) || getExplorationById("everest");
    if (!exploration) {
      wx.showToast({ title: "场景不存在", icon: "none" });
      wx.switchTab({ url: "/pages/home/index" });
      return;
    }
    this.exploration = exploration;
    this.current = exploration.startElevation;
    this.target = exploration.startElevation;
    this.lastElev = exploration.startElevation;
    this.setData({
      ready: true,
      intro: true,
      title: exploration.title,
      subtitle: exploration.subtitle,
      emoji: exploration.emoji,
      maxElevation: exploration.maxElevation,
    });
  },

  onReady() {
    this.startTicker();
  },

  onHide() {
    this.persistProgress();
  },

  onUnload() {
    this.stopTicker();
    this.persistProgress();
  },

  /* ---------------- 引擎节拍 ---------------- */

  startTicker() {
    this.stopTicker();
    this.ticker = setInterval(() => this.tickFrame(), TICK_MS);
  },

  stopTicker() {
    if (this.ticker) {
      clearInterval(this.ticker);
      this.ticker = null;
    }
  },

  /** 每帧：逼近目标海拔 → 引擎推导 → 渲染 → 登顶检测 */
  tickFrame() {
    const ex = this.exploration;
    if (!ex) return;

    // 平滑追向目标海拔
    this.current += (this.target - this.current) * MOTION_GAIN;
    const slew = Math.abs(this.target - this.current);
    if (slew < EASE_EPS) this.current = this.target;
    this.current = clamp(this.current, ex.startElevation, ex.maxElevation);

    // 上行穿越 → 解锁知识节点
    const unlocked = knowledgeUnlockedOnMove(
      ex.knowledgeNodes,
      this.lastElev,
      this.current,
    );
    if (unlocked.length) {
      unlocked.forEach((n) => this.discovered.add(n.id));
      this.setData({
        hint: { show: true, text: `发现「${unlocked[0].title}」· 点击查看` },
      });
    }
    this.lastElev = this.current;

    const derived = deriveState(ex, this.current, Array.from(this.discovered));
    this.renderFrame(ex, derived);

    // 登顶
    if (!this.celebrated && this.current >= ex.maxElevation - 0.5) {
      this.celebrated = true;
      this.onSummit();
    }
  },

  /** 引擎输出 → display payload → setData（动画只含 translate/opacity/gradient） */
  renderFrame(ex: Exploration, d: ExplorationDerivedState) {
    const progress = progressFor(
      d.elevation,
      ex.startElevation,
      ex.maxElevation,
    );
    const elevationM = Math.max(0, this.current);

    // 雪粒数量按档量化，档位变化才重建数组
    const bucket = Math.min(
      MAX_SNOWFLAKES,
      Math.ceil((d.snow * MAX_SNOWFLAKES) / SNOWFLAKE_COUNT_STEP) *
        SNOWFLAKE_COUNT_STEP,
    );
    let particles = this.particlesCached;
    if (bucket !== this.partBucket || !particles) {
      particles = buildParticles(bucket);
      this.particlesCached = particles;
      this.partBucket = bucket;
    }

    // 低海拔绿色植被 → 高海拔灰褐裸岩
    const greenTint = `rgba(${Math.round(88 + d.vegetation * 58)},${Math.round(148 + d.vegetation * 26)},${Math.round(76 + d.vegetation * 18)},${0.4 + d.vegetation * 0.5})`;

    this.setData({
      elevationText: formatNumber(elevationM, 0),
      progress,
      pct: Math.round(progress * 100),
      kmStage: this.kmLabel(ex, elevationM),
      stageName: d.stage.name,
      stageEmoji: d.stage.emoji,
      biome: d.stage.biome,
      stageDescription: d.stage.description,
      temperatureText: `${Math.round(d.temperatureC)}°C`,
      o2Text: `${Math.round(d.pressureRatio * 100)}`,
      windText: windLabel(d.wind),
      airFeel: airFeel(d.pressureRatio),
      skyGradient: `linear-gradient(180deg, ${d.sky[0]} 0%, ${d.sky[1]} 55%, ${d.sky[2]} 100%)`,
      par: {
        far: Math.round(progress * PARALLAX_BASE * LAYER_SPEED.far),
        mid: Math.round(progress * PARALLAX_BASE * LAYER_SPEED.mid),
        near: Math.round(progress * PARALLAX_BASE * LAYER_SPEED.near),
        ground: Math.round(progress * PARALLAX_BASE * LAYER_SPEED.ground),
        climber: Math.round(progress * PARALLAX_BASE * LAYER_SPEED.climber),
        snow: Math.round(progress * PARALLAX_BASE * LAYER_SPEED.snow),
      },
      fogOpacity: Math.round(d.fog * 100) / 100,
      snowCover: Math.round(d.snow * 100) / 100,
      vegetation: Math.round(d.vegetation * 100) / 100,
      greenTint,
      climberLean: Math.round(clamp(d.wind * 6, 0, 6)),
      particles,
      markers: this.buildMarkers(ex),
    });
  },

  kmLabel(ex: Exploration, meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km · 距峰顶 ${formatNumber(Math.max(0, ex.maxElevation - meters), 0)} m`;
    }
    return `${formatNumber(meters, 0)} m · 距峰顶 ${formatNumber(ex.maxElevation, 0)} m`;
  },

  /** 右侧海拔刻度上的知识节点（已解锁=实心，未解锁=描边） */
  buildMarkers(ex: Exploration): MarkerItem[] {
    return ex.knowledgeNodes.map((n) => ({
      id: n.id,
      emoji: n.emoji,
      top:
        Math.round(
          (1 - progressFor(n.elevation, ex.startElevation, ex.maxElevation)) *
            1000,
        ) / 10,
      found: this.discovered.has(n.id),
      elevationText: formatNumber(n.elevation, 0),
    }));
  },

  /* ---------------- 交互：滑动 / 步进 ---------------- */

  onTouchStart(e: PageEvent) {
    if (this.data.intro || this.data.summit) return;
    const t = e.touches?.[0];
    if (!t) return;
    this.touching = true;
    this.lastTouchY = t.clientY;
  },

  onTouchMove(e: PageEvent) {
    if (!this.touching) return;
    const t = e.touches?.[0];
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
    if (this.data.summit || this.data.summary) return;
    const ex = this.exploration;
    if (!ex) return;
    this.target = clamp(
      this.target + STEP_METERS,
      ex.startElevation,
      ex.maxElevation,
    );
  },

  onStepDown() {
    if (this.data.intro) return;
    const ex = this.exploration;
    if (!ex) return;
    this.target = clamp(
      this.target - STEP_METERS,
      ex.startElevation,
      ex.maxElevation,
    );
  },

  onStartClimb() {
    this.setData({ intro: false });
  },

  onJumpToSummit() {
    // 便捷验证闭环：直达峰顶
    const ex = this.exploration;
    if (!ex) return;
    this.target = ex.maxElevation;
  },

  /* ---------------- 知识节点交互 ---------------- */

  onTapMarker(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    const node = this.exploration?.knowledgeNodes.find((n) => n.id === id);
    if (node) {
      this.setData({ openNode: node, hint: { show: false, text: "" } });
    }
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

  onPopupContinue() {
    this.setData({ openNode: null, hint: { show: false, text: "" } });
  },

  /* ---------------- 登顶 / 结算 ---------------- */

  onSummit() {
    this.setData({ summit: true });
    this.persistProgress();
  },

  onShowSummary() {
    const ex = this.exploration;
    if (!ex) return;
    const learned = ex.knowledgeNodes
      .filter((n) => this.discovered.has(n.id))
      .map((n) => n.title);
    this.persistProgress();
    this.setData({ summit: false, summary: { learned } });
  },

  onBackHome() {
    wx.switchTab({ url: "/pages/home/index" });
  },

  onRestart() {
    const ex = this.exploration;
    if (!ex) return;
    this.current = ex.startElevation;
    this.target = ex.startElevation;
    this.lastElev = ex.startElevation;
    this.celebrated = false;
    this.discovered = new Set();
    this.particlesCached = null;
    this.setData({
      summit: false,
      summary: null,
      openNode: null,
      hint: { show: false, text: "" },
    });
  },

  /** 记录本次探索进度（本地存储） */
  persistProgress() {
    const ex = this.exploration;
    if (!ex) return;
    saveExplorationRecord({
      exploration: ex,
      reachElevation: Math.round(this.target),
      completed: this.celebrated,
      knowledgeIds: Array.from(this.discovered),
    });
  },
});
