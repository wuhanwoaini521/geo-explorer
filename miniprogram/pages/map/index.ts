/**
 * 🗺️ 地图页 —— 探索入口 + 世界图鉴。
 *
 * 上半部：已开放沉浸探索的场景（来自 data/explorations 注册表，进度本地读取）；
 * 下半部：世界图鉴（GeoPlace 数据集）—— 搜索 + 地貌类型筛选 + 地点卡片 → 地点详情页。
 * 搜索/筛选为纯函数（utils/place-search），页面只负责装配。
 */
import { EXPLORATIONS } from "../../data/explorations/index";
import { getPlaceHeroImage } from "../../data/media/world-manifests";
import { EVEREST_EXPEDITION } from "../../data/expeditions/everest";
import {
  buildObservationPoints,
  progressForReferenceElevation,
  projectRouteMilestones,
  routeSegment,
} from "../../engine/expedition-observation";
import { PLACES, PLACE_TYPE_META } from "../../data/places";
import { getRecords } from "../../services/exploration-store";
import type { ExplorationRecord } from "../../services/exploration-store";
import { consumeSearchQuery, consumeTypeFilter } from "../../services/ui-bus";
import { favorites } from "../../services/favorites-store";
import type { Place, PlaceType } from "../../types/models";
import { queryPlaces } from "../../utils/place-search";
import { GlobeRenderer, type GlobeVariant } from "../../engine/globe-renderer";
import { globeColorTextureFallbackSrc } from "../../engine/globe-texture-source";
import { markerScreenPercent } from "../../engine/globe-marker-projection";
import {
  WebGLGlobeRenderer,
  type GlobeProjectionListener,
  type GlobeRenderOptions,
  type ProjectedGlobeMarker,
} from "../../engine/webgl-globe-renderer";
import { resolveMediaSrc } from "../../services/media-service";
import { getHeaderTopOffset } from "../../utils/layout";

/** 预告场景（尚未提供体验数据的路线占位） */
interface ComingScene {
  id: string;
  emoji: string;
  title: string;
  region: string;
  basis: string;
}

interface OpenCard {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  place: string;
  region: string;
  elevText: string;
  estMin: number;
  desc: string;
  progress: number; // 0-100
  reachedText: string;
  axisGlyph: string;
  completed: boolean;
  record: ExplorationRecord | null;
  image: string;
}

interface AtlasPlace {
  id: string;
  name: string;
  emoji: string;
  typeLabel: string;
  shortDescription: string;
  favorited: boolean;
  exploration: boolean;
}

interface MapPoint {
  id: string;
  name: string;
  altitudeText: string;
  top: number;
  left: number;
  side: "left" | "right";
  state: "completed" | "current" | "upcoming";
  isSummit: boolean;
  stateLabel: string;
}

interface MapSegment {
  left: number;
  top: number;
  width: number;
  rotate: number;
}

interface MapPlaceCard {
  id: string;
  name: string;
  altitudeText: string;
  description: string;
  image: string;
  stateLabel: string;
}

interface WorldMarker {
  id: string;
  name: string;
  nameEn: string;
  image: string;
  typeLabel: string;
  typeGlyph: string;
  latitude: number;
  longitude: number;
  metricText: string;
  left: number;
  top: number;
  screenLeft: number;
  screenTop: number;
  screenOpacity: number;
  screenVisible: boolean;
  labelPlacement: "left" | "center" | "right";
  explorationId?: string;
  featured: boolean;
  state?: "normal" | "explored";
}

interface DestinationPreview {
  id: string;
  name: string;
  nameEn: string;
  typeLabel: string;
  region: string;
  metricLabel: string;
  metricValue: string;
  typeGlyph: string;
  description: string;
  actionLabel: string;
  image: string;
  explorationId?: string;
}

interface GlobeLabelContext {
  fillStyle: string;
  strokeStyle: string;
  font: string;
  globalAlpha: number;
  lineWidth: number;
  textAlign: "left" | "center" | "right";
  textBaseline: "top" | "middle" | "bottom" | "alphabetic";
  beginPath(): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  clearRect(x: number, y: number, width: number, height: number): void;
  fill(): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  fillText(text: string, x: number, y: number): void;
  drawImage(image: GlobeLabelImage, x: number, y: number, width: number, height: number): void;
  measureText(text: string): { width: number };
  save(): void;
  restore(): void;
  scale(x: number, y: number): void;
  stroke(): void;
}

interface GlobeLabelImage {
  src: string;
  onload: (() => void) | null;
  onerror: (() => void) | null;
}

interface GlobeLabelCanvas {
  width: number;
  height: number;
  getContext(type: "2d"): GlobeLabelContext;
  createImage(): GlobeLabelImage;
}

const COMING: ComingScene[] = [
  { id: "fuji", emoji: "🗻", title: "富士山", region: "日本 · 本州", basis: "海拔 3,776 m · 休眠火山" },
  { id: "sahara", emoji: "🏜️", title: "撒哈拉沙漠", region: "北非", basis: "世界最大热沙漠" },
];

const ALL_TYPE = "all";

const WORLD_DESTINATION_IDS = [
  "p-everest",
  "p-mariana",
  "p-fuji",
  "p-colorado",
  "p-sahara",
  "p-greenland",
  "p-kilauea",
  "p-qinghai",
] as const;

// 仅供地图页「今日推荐」缩略卡使用；地点详情与地图标记仍使用媒体清单中的实景素材。
const RECOMMENDATION_ILLUSTRATIONS: Record<string, string> = {
  "p-fuji": resolveMediaSrc("discovery/fuji-illustration-v1.jpg"),
  "p-everest": resolveMediaSrc("discovery/glacier-illustration-v1.jpg"),
  "p-mariana": resolveMediaSrc("discovery/mariana-illustration-v1.jpg"),
};

// 探索页地点浮层与继续探索卡片的氛围图；地球贴图和路线节点仍用原有地理素材。
const EXPLORE_ILLUSTRATIONS: Record<string, string> = {
  "p-everest": resolveMediaSrc("discovery/everest-illustration-v2.jpg"),
  "p-mariana": resolveMediaSrc("discovery/mariana-illustration-v1.jpg"),
  "p-fuji": resolveMediaSrc("discovery/fuji-illustration-v1.jpg"),
  "p-colorado": resolveMediaSrc("discovery/colorado-illustration-v1.jpg"),
};

const HOME_MAP_LABEL_PRIORITY: Record<string, number> = {
  "p-everest": 0,
  "p-colorado": 1,
  "p-mariana": 2,
};

const MARKER_GLYPHS: Partial<Record<PlaceType, string>> = {
  mountain: "▲",
  ocean: "▼",
  volcano: "△",
  glacier: "◆",
  canyon: "◇",
  desert: "·",
  plateau: "▰",
};

type GlobeController = Pick<GlobeRenderer, "setMarkers" | "setSelected" | "start" | "stop" | "pauseRotation" | "resumeRotation" | "reset" | "dragBy" | "release" | "focusOnMarker" | "hitTest">;

let webglRenderer: WebGLGlobeRenderer | null = null;
let canvasRenderer: GlobeRenderer | null = null;
let globeTouch: {
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
  velocityX: number;
  velocityY: number;
} | null = null;
let globeVariant: GlobeVariant = "half";
let initialSelectedId = "";
let initialQuery = "";
let globeCanvasOffsetX = 0;
let globeCanvasOffsetY = 0;
let globeCanvasWidth = 0;
let globeCanvasHeight = 0;
let globeEarthOnly = false;
let globeMode = "";
let globeSelectedMode = false;
let forceCanvas = false;
let globeBumpEnabled = true;
let globeAtmosphereEnabled = true;
let globeTextureScale: 2048 | 4096 = 2048;
let globeLabelContext: GlobeLabelContext | null = null;
let globeLabelWidth = 0;
let globeLabelHeight = 0;
let globeLabelImages: Record<string, GlobeLabelImage> = {};
let globeSideControlRects: Array<{ left: number; top: number; width: number; height: number }> = [];
let latestGlobeProjections: ProjectedGlobeMarker[] = [];

function activeGlobeRenderer(): GlobeController | null {
  return webglRenderer ?? canvasRenderer;
}

function placeImage(place: Place): string {
  return EXPLORE_ILLUSTRATIONS[place.id] ?? getPlaceHeroImage(place.id) ?? "";
}

function metricForPlace(place: Place): { label: string; value: string } {
  const wholeMeters = Math.floor(Math.abs(place.elevationM)).toLocaleString();
  if (place.elevationM < 0) return { label: "最大深度", value: `约 ${wholeMeters} m` };
  if (place.type === "canyon") return { label: "谷底高程", value: `${wholeMeters} m` };
  return { label: "最高点", value: `${wholeMeters} m` };
}

function worldMarker(place: Place): WorldMarker {
  const left = Math.max(3, Math.min(97, ((place.longitude + 180) / 360) * 100));
  const top = Math.max(8, Math.min(92, ((90 - place.latitude) / 180) * 100));
  return {
    id: place.id,
    name: place.name,
    nameEn: place.nameEn,
    image: placeImage(place),
    typeLabel: PLACE_TYPE_META.find((item) => item.type === place.type)?.label ?? "地貌",
    typeGlyph: MARKER_GLYPHS[place.type] ?? "·",
    latitude: place.latitude,
    longitude: place.longitude,
    metricText: metricForPlace(place).value,
    // 墨卡托式的简化世界图定位：用于发现入口，不作为测绘底图。
    left,
    top,
    screenLeft: left,
    screenTop: top,
    screenOpacity: 1,
    screenVisible: true,
    labelPlacement: left < 24 ? "right" : left > 76 ? "left" : "center",
    explorationId: place.explorationId,
    featured: Boolean(place.featured || place.explorationId),
    state: place.explorationId && getRecords().some((record) => record.id === place.explorationId && record.completed)
      ? "explored"
      : "normal",
  };
}

function destinationPreview(place: Place): DestinationPreview {
  const metric = metricForPlace(place);
  return {
    id: place.id,
    name: place.name,
    nameEn: place.nameEn,
    typeLabel: PLACE_TYPE_META.find((item) => item.type === place.type)?.label ?? "地貌",
    typeGlyph: MARKER_GLYPHS[place.type] ?? "·",
    region: place.region,
    metricLabel: metric.label,
    metricValue: metric.value,
    description: place.explorationId
      ? place.id === "p-mariana"
        ? "从海面逐层下潜，穿过阳光带、黑暗带，直到挑战者深渊。"
        : "从大本营沿真实路线前进，在环境变化中认识世界之巅。"
      : place.description,
    actionLabel: place.explorationId
      ? place.id === "p-mariana" ? "开始下潜" : "开始攀登"
      : "查看地点",
    image: placeImage(place),
    explorationId: place.explorationId,
  };
}

Page({
  data: {
    open: [] as OpenCard[],
    continueCard: null as OpenCard | null,
    coming: COMING,
    // 图鉴
    types: [{ type: ALL_TYPE, label: "全部", emoji: "🧭" }, ...PLACE_TYPE_META] as Array<{
      type: PlaceType | "all";
      label: string;
      emoji: string;
    }>,
    activeType: ALL_TYPE as PlaceType | "all",
    query: "",
    atlas: [] as AtlasPlace[],
    atlasTotal: PLACES.length,
    atlasEmpty: false,
    routeImageFailed: {} as Record<string, boolean>,
    mapPoints: [] as MapPoint[],
    routeSegments: [] as MapSegment[],
    atlasOpen: false,
    mapMode: "地形" as "地形" | "路线",
    activePointId: "",
    activePlace: null as MapPlaceCard | null,
    mapImageFailed: false,
    selectedDestination: null as DestinationPreview | null,
    worldMarkers: [] as WorldMarker[],
    worldMarkerCount: 0,
    recommendations: [] as DestinationPreview[],
    /** 远端媒体加载失败的条目（Gate 4：失败时隐藏图片，卡片其余内容仍可用） */
    failedImages: {} as Record<string, boolean>,
    selectedMarkerId: "",
    globeSelectedMode: false,
    webglFailed: false,
    globeEarthOnly: false,
    globeFailed: false,
    headerTop: 62,
    globeCanvasHeight: "800rpx",
    globeRendererReady: true,
    recommendationsVisible: true,
  },

  onLoad(options?: { globe?: string; selected?: string; q?: string; type?: string; bump?: string; atmosphere?: string; texture?: string }) {
    this.setData({ headerTop: getHeaderTopOffset() });
    globeMode = options?.globe ?? "";
    globeVariant = globeMode === "third" ? "third" : globeMode === "low" ? "low" : "half";
    globeEarthOnly = globeMode === "earth-only" || globeMode === "no-bump" || globeMode === "with-bump" || globeMode === "no-atmosphere" || globeMode === "subtle-atmosphere" || globeMode.startsWith("variant-");
    forceCanvas = globeMode === "canvas";
    globeBumpEnabled = options?.bump !== "0" && globeMode !== "no-bump";
    globeAtmosphereEnabled = options?.atmosphere !== "0" && globeMode !== "no-atmosphere";
    globeTextureScale = options?.texture === "4096" ? 4096 : 2048;
    if (globeMode === "no-bump") globeBumpEnabled = false;
    if (globeMode === "with-bump") globeBumpEnabled = true;
    if (globeMode === "no-atmosphere") globeAtmosphereEnabled = false;
    if (globeMode === "subtle-atmosphere") globeAtmosphereEnabled = true;
    initialSelectedId = options?.selected ?? "";
    initialQuery = options?.q ?? "";
    globeSelectedMode = Boolean(initialSelectedId || initialQuery);
    this.setData({ globeEarthOnly, globeSelectedMode, globeCanvasHeight: globeEarthOnly ? "100%" : "800rpx" });
    this.refreshScenes();
    const query = initialQuery;
    const activeType = options?.type && options.type !== ALL_TYPE
      ? options.type as PlaceType
      : ALL_TYPE as PlaceType | "all";
    if (query || activeType !== ALL_TYPE) {
      this.setData({ query, activeType });
      this.refreshAtlas();
      this.focusGlobeQuery(query);
    } else {
      this.refreshAtlas();
    }
  },

  onReady() {
    this.fitGlobeCanvasToRecommendationRail();
  },

  /** 按真实布局压短绘制区，保证推荐栏不会落在原生 Canvas 下方。 */
  fitGlobeCanvasToRecommendationRail() {
    const initializeRenderer = () => this.data.webglFailed ? this.initCanvasFallback() : this.initGlobe();
    if (this.data.globeEarthOnly && !this.data.webglFailed) {
      this.initGlobe();
      return;
    }
    let canvasRect: { top: number; left: number; width: number; height: number } | null = null;
    let railRect: { top: number; left: number; width: number; height: number } | null = null;
    let measured = 0;
    const applyLayout = () => {
      measured += 1;
      if (measured < 2) return;
      if (!canvasRect || !railRect) {
        initializeRenderer();
        return;
      }
      const availableHeight = railRect.top - canvasRect.top - 12;
      if (availableHeight < 140) {
        this.setData({ globeCanvasHeight: "800rpx", recommendationsVisible: false }, initializeRenderer);
        return;
      }
      const nextHeight = Math.min(canvasRect.height, availableHeight);
      if (nextHeight < canvasRect.height - 1) {
        this.setData({ globeCanvasHeight: `${Math.round(nextHeight)}px` }, initializeRenderer);
      } else {
        initializeRenderer();
      }
    };
    wx.createSelectorQuery()
      .select(this.data.webglFailed ? "#globeCanvas" : "#globeWebglCanvas")
      .boundingClientRect((rect) => { canvasRect = rect; applyLayout(); })
      .exec();
    wx.createSelectorQuery()
      .select(".recommendation-rail")
      .boundingClientRect((rect) => { railRect = rect; applyLayout(); })
      .exec();
  },

  onShow() {
    this.getTabBar?.()?.setData({ selected: 0 });
    this.getTabBar?.()?.setData({ hidden: globeEarthOnly });
    this.getTabBar?.()?.setData({ theme: "dark" });
    // 从探索/图鉴返回后刷新完成度；仅当首页分类入口显式传入筛选时才切换类型
    const pending = consumeTypeFilter();
    const pendingQuery = consumeSearchQuery();
    const patch: Record<string, unknown> = {};
    if (pending !== null) patch.activeType = pending;
    if (pendingQuery !== null) patch.query = pendingQuery;
    if (Object.keys(patch).length) this.setData(patch);
    this.refreshScenes();
    this.refreshAtlas();
    // 首页分类/搜索入口跳转过来的意图是「看筛选结果」。筛选此前确实生效了，
    // 但结果只在图鉴抽屉里渲染，不自动打开的话用户只看到地球，等同于点了没反应。
    // 走 onToggleAtlas 而不是直接 setData：它同时负责停掉地球渲染并卸载 canvas 节点。
    if (!this.data.atlasOpen && (pending !== null || pendingQuery !== null)) {
      this.onToggleAtlas();
      return;
    }
    if (!this.data.atlasOpen) {
      activeGlobeRenderer()?.resumeRotation();
      activeGlobeRenderer()?.start();
    }
  },

  onHide() {
    webglRenderer?.stop();
    canvasRenderer?.stop();
  },

  /** 屏幕尺寸变化后重建原生 Canvas，避免沿用旧 viewport 与投影尺寸。 */
  onResize() {
    if (this.data.atlasOpen) return;
    webglRenderer?.dispose();
    canvasRenderer?.stop();
    webglRenderer = null;
    canvasRenderer = null;
    globeTouch = null;
    globeCanvasWidth = 0;
    globeCanvasHeight = 0;
    globeLabelContext = null;
    globeLabelWidth = 0;
    globeLabelHeight = 0;
    globeSideControlRects = [];
    const baseHeight = this.data.globeEarthOnly ? "100%" : "800rpx";
    this.setData({
      globeRendererReady: false,
      globeCanvasHeight: baseHeight,
      recommendationsVisible: true,
      webglFailed: false,
      globeFailed: false,
    }, () => {
      this.setData({ globeRendererReady: true }, () => this.fitGlobeCanvasToRecommendationRail());
    });
  },

  onUnload() {
    webglRenderer?.dispose();
    canvasRenderer?.stop();
    webglRenderer = null;
    canvasRenderer = null;
    globeTouch = null;
    globeCanvasOffsetX = 0;
    globeCanvasOffsetY = 0;
    globeCanvasWidth = 0;
    globeCanvasHeight = 0;
    globeLabelContext = null;
    globeLabelWidth = 0;
    globeLabelHeight = 0;
    globeSideControlRects = [];
    latestGlobeProjections = [];
  },

  initGlobe() {
    const system = wx.getSystemInfoSync();
    if (forceCanvas) {
      this.setData({ webglFailed: true }, () => this.fitGlobeCanvasToRecommendationRail());
      return;
    }
    try {
      wx.createSelectorQuery()
        .select("#globeWebglCanvas")
        .fields({ node: true, size: true, rect: true })
        .exec((result) => {
          const canvasInfo = result[0] as {
            node?: unknown;
            width?: number;
            height?: number;
            left?: number;
            top?: number;
          } | undefined;
          if (!canvasInfo?.node || !canvasInfo.width || !canvasInfo.height) {
            this.setData({ webglFailed: true }, () => this.fitGlobeCanvasToRecommendationRail());
            return;
          }
          globeCanvasWidth = canvasInfo.width;
          globeCanvasHeight = canvasInfo.height;
          globeCanvasOffsetX = canvasInfo.left ?? 0;
          globeCanvasOffsetY = canvasInfo.top
            ?? (globeEarthOnly || initialSelectedId || initialQuery ? 0 : system.windowWidth * 208 / 750);
          try {
            const variantMode = this.data.globeEarthOnly ? "earth-only" : "default";
            const renderOptions: GlobeRenderOptions = {
              earthOnly: globeEarthOnly,
              selectedMode: globeSelectedMode,
              bumpEnabled: globeBumpEnabled,
              atmosphereEnabled: globeAtmosphereEnabled,
              textureScale: globeTextureScale,
              bumpScale: globeMode === "variant-b" ? 1.02 : variantMode === "earth-only" ? 1.18 : globeVariant === "low" ? 0.94 : 1.18,
              atmosphereStrength: globeMode === "variant-c" ? 0.32 : 0.64,
              onTextureDiagnostic: (diagnostic) => {
                const line = `[GLOBE_TEXTURE_DIAGNOSTIC] ${JSON.stringify(diagnostic)}`;
                if (diagnostic.stage === "load-error" || diagnostic.stage === "upload-error") {
                  console.error(line);
                  if (diagnostic.key === "color" && diagnostic.src === globeColorTextureFallbackSrc()) {
                    webglRenderer?.dispose();
                    webglRenderer = null;
                    this.setData({ webglFailed: true }, () => this.fitGlobeCanvasToRecommendationRail());
                  }
                } else {
                  console.info(line);
                }
              },
            };
            webglRenderer = new WebGLGlobeRenderer(
              canvasInfo.node as unknown as ConstructorParameters<typeof WebGLGlobeRenderer>[0],
              canvasInfo.width,
              canvasInfo.height,
              system.pixelRatio,
              globeVariant,
              renderOptions,
            );
            const projectionListener: GlobeProjectionListener = (projections) => {
              latestGlobeProjections = projections;
              this.drawGlobeLabels(projections);
              if (!this.data.worldMarkers.length || !globeCanvasWidth || !globeCanvasHeight) return;
              const projectionById = new Map(projections.map((projection) => [projection.id, projection]));
              const worldMarkers = this.data.worldMarkers.map((marker) => {
                const projection = projectionById.get(marker.id);
                if (!projection) return marker;
                // X/Y 必须同基准（承载标记的容器）。此前高度误用整屏高度，
                // 标记会整体上移、脱离球面飘到太空里。
                const percent = markerScreenPercent(projection.screenX, projection.screenY, {
                  width: system.windowWidth,
                  height: system.windowHeight,
                  offsetX: globeCanvasOffsetX,
                  offsetY: globeCanvasOffsetY,
                });
                return {
                  ...marker,
                  screenLeft: percent.left,
                  screenTop: percent.top,
                  screenOpacity: projection.opacity,
                  screenVisible: projection.visible,
                  labelPlacement: percent.left < 24
                    ? "right"
                    : percent.left > 76 ? "left" : "center",
                };
              });
              this.setData({ worldMarkers });
            };
            webglRenderer.setProjectionListener(projectionListener);
            webglRenderer.setMarkers(this.data.worldMarkers);
            this.initGlobeLabelLayer();
            const initialPlace = PLACES.find((place) => place.id === initialSelectedId);
            if (initialPlace) this.focusGlobePlace(initialPlace);
            else if (initialQuery) this.focusGlobeQuery(initialQuery);
            webglRenderer.start();
          } catch {
            webglRenderer?.dispose();
            webglRenderer = null;
            this.setData({ webglFailed: true }, () => this.fitGlobeCanvasToRecommendationRail());
          }
        });
    } catch {
      this.setData({ webglFailed: true }, () => this.fitGlobeCanvasToRecommendationRail());
    }
  },

  initCanvasFallback() {
    const system = wx.getSystemInfoSync();
    try {
      wx.createSelectorQuery()
        .select("#globeCanvas")
        .fields({ node: true, size: true, rect: true })
        .exec((result) => {
          const canvasInfo = result[0] as {
            node?: unknown;
            width?: number;
            height?: number;
            left?: number;
            top?: number;
          } | undefined;
          if (!canvasInfo?.node || !canvasInfo.width || !canvasInfo.height) {
            this.setData({ globeFailed: true });
            return;
          }
          globeCanvasWidth = canvasInfo.width;
          globeCanvasHeight = canvasInfo.height;
          globeCanvasOffsetX = canvasInfo.left ?? 0;
          globeCanvasOffsetY = canvasInfo.top
            ?? (globeEarthOnly || initialSelectedId || initialQuery ? 0 : system.windowWidth * 208 / 750);
          try {
            canvasRenderer = new GlobeRenderer(
              canvasInfo.node as ConstructorParameters<typeof GlobeRenderer>[0],
              canvasInfo.width,
              canvasInfo.height,
              system.pixelRatio,
              globeVariant,
              globeSelectedMode,
            );
            canvasRenderer.setMarkers(this.data.worldMarkers);
            canvasRenderer.start();
          } catch {
            canvasRenderer = null;
            this.setData({ globeFailed: true });
          }
        });
    } catch {
      this.setData({ globeFailed: true });
    }
  },

  initGlobeLabelLayer() {
    try {
      wx.createSelectorQuery()
        .select("#globeLabelCanvas")
        .fields({ node: true, size: true, rect: true })
        .exec((result) => {
          const canvasInfo = result[0] as {
            node?: GlobeLabelCanvas;
            width?: number;
            height?: number;
            left?: number;
            top?: number;
          } | undefined;
          if (!canvasInfo?.node || !canvasInfo.width || !canvasInfo.height) return;
          const pixelRatio = Math.max(1, wx.getSystemInfoSync().pixelRatio);
          canvasInfo.node.width = Math.round(canvasInfo.width * pixelRatio);
          canvasInfo.node.height = Math.round(canvasInfo.height * pixelRatio);
          const context = canvasInfo.node.getContext("2d");
          context.scale(pixelRatio, pixelRatio);
          globeLabelContext = context;
          globeLabelWidth = canvasInfo.width;
          globeLabelHeight = canvasInfo.height;
          const rpx = wx.getSystemInfoSync().windowWidth / 750;
          globeSideControlRects = [
            { top: 338, width: 70 },
            { top: 432, width: 64 },
            { top: 520, width: 64 },
          ].map(({ top, width }) => ({
            left: canvasInfo.width! - (60 + width) * rpx,
            top: (top - 162) * rpx,
            width: width * rpx,
            height: width * rpx,
          }));
          globeLabelImages = {};
          ["layers", "target", "atlas"].forEach((name) => {
            const image = canvasInfo.node!.createImage();
            image.onload = () => {
              globeLabelImages[`map-control-${name}`] = image;
              this.drawGlobeLabels();
            };
            image.onerror = () => undefined;
            image.src = `/assets/icons/${name}-on-dark.png`;
          });
          this.data.worldMarkers.forEach((marker) => {
            if (!marker.image) return;
            const image = canvasInfo.node!.createImage();
            image.onload = () => {
              globeLabelImages[marker.id] = image;
              this.drawGlobeLabels();
            };
            image.onerror = () => undefined;
            image.src = marker.image;
          });
          this.drawGlobeLabels(latestGlobeProjections);
        });
    } catch {
      globeLabelContext = null;
    }
  },

  drawGlobeLabels(projections: ProjectedGlobeMarker[] = latestGlobeProjections) {
    const context = globeLabelContext;
    if (!context || !globeLabelWidth || !globeLabelHeight) return;
    context.clearRect(0, 0, globeLabelWidth, globeLabelHeight);
    const markerById = new Map(this.data.worldMarkers.map((marker) => [marker.id, marker]));
    const occupiedLabels: Array<{ left: number; top: number; right: number; bottom: number }> = [];
    projections
      .filter((projection) => projection.visible && projection.opacity > 0.2
        && (projection.id === this.data.selectedMarkerId || HOME_MAP_LABEL_PRIORITY[projection.id] !== undefined))
      .sort((a, b) => Number(b.id === this.data.selectedMarkerId) - Number(a.id === this.data.selectedMarkerId)
        || (HOME_MAP_LABEL_PRIORITY[a.id] ?? Number.MAX_SAFE_INTEGER)
          - (HOME_MAP_LABEL_PRIORITY[b.id] ?? Number.MAX_SAFE_INTEGER)
        || a.z - b.z
        || a.id.localeCompare(b.id))
      .forEach((projection) => {
        const marker = markerById.get(projection.id);
        if (!marker) return;
        const selected = marker.id === this.data.selectedMarkerId;
        const title = marker.name;
        const meta = `${marker.typeLabel} · ${marker.metricText}`;
        context.save();
        context.globalAlpha = selected ? 1 : Math.max(0.84, projection.opacity);
        context.font = selected ? "700 13px sans-serif" : "600 12px sans-serif";
        const titleWidth = context.measureText(title).width;
        context.font = "500 10px sans-serif";
        const metaWidth = context.measureText(meta).width;
        const thumbnail = globeLabelImages[marker.id];
        const labelWidth = Math.min(184, Math.max(124, Math.max(titleWidth, metaWidth) + (thumbnail ? 48 : 22)));
        const labelHeight = selected ? 44 : 40;
        const preferLeft = projection.screenX > globeLabelWidth * 0.64;
        const centerTop = projection.screenY - labelHeight / 2;
        const right = projection.screenX + 14;
        const left = projection.screenX - labelWidth - 14;
        const centerLeft = projection.screenX - labelWidth / 2;
        const above = projection.screenY - labelHeight - 16;
        const below = projection.screenY + 12;
        const candidates = [
          { left: preferLeft ? left : right, top: above },
          { left: centerLeft, top: above },
          { left: preferLeft ? right : left, top: above },
          { left: preferLeft ? left : right, top: centerTop },
          { left: preferLeft ? right : left, top: centerTop },
          { left: centerLeft, top: centerTop },
          { left: centerLeft, top: below },
          { left: preferLeft ? left : right, top: above },
          { left: preferLeft ? right : left, top: above },
          { left: preferLeft ? left : right, top: below },
          { left: preferLeft ? right : left, top: below },
        ].map((candidate) => ({
          left: Math.max(8, Math.min(globeLabelWidth - labelWidth - 8, candidate.left)),
          top: Math.max(8, Math.min(globeLabelHeight - labelHeight - 8, candidate.top)),
        }));
        const rectFor = (candidate: { left: number; top: number }) => ({
          ...candidate,
          right: candidate.left + labelWidth,
          bottom: candidate.top + labelHeight,
        });
        const overlapArea = (candidate: ReturnType<typeof rectFor>) => occupiedLabels.reduce((sum, occupied) => {
          const width = Math.min(candidate.right, occupied.right) - Math.max(candidate.left, occupied.left);
          const height = Math.min(candidate.bottom, occupied.bottom) - Math.max(candidate.top, occupied.top);
          return sum + (width > 0 && height > 0 ? width * height : 0);
        }, 0);
        const rects = candidates.map(rectFor);
        const labelRect = rects.find((candidate) => overlapArea(candidate) === 0);
        if (!labelRect) {
          context.restore();
          return;
        }
        occupiedLabels.push(labelRect);
        const placeLeft = labelRect.left < projection.screenX;
        const labelLeft = labelRect.left;
        const labelTop = labelRect.top;
        context.fillStyle = selected ? "rgba(44, 24, 27, .94)" : "rgba(3, 21, 35, .82)";
        context.fillRect(labelLeft, labelTop, labelWidth, labelHeight);
        context.fillStyle = selected ? "#e88b6b" : "#49b6c5";
        context.fillRect(placeLeft ? labelLeft + labelWidth - 1.5 : labelLeft, labelTop + 1, 1.5, labelHeight - 2);
        if (thumbnail) context.drawImage(thumbnail, labelLeft + 5, labelTop + 5, 28, 28);
        const copyLeft = labelLeft + (thumbnail ? 39 : 11);
        context.textAlign = "left";
        context.textBaseline = "top";
        context.font = selected ? "700 13px sans-serif" : "600 12px sans-serif";
        context.fillStyle = "#f4fbff";
        context.fillText(title, copyLeft, labelTop + 5);
        context.font = "500 10px sans-serif";
        context.fillStyle = "#b0cbd2";
        context.fillText(meta, copyLeft, labelTop + 23);
        context.restore();
      });
    this.drawGlobeSideControls(context);
  },

  drawGlobeSideControls(context: GlobeLabelContext) {
    const names = ["layers", "target", "atlas"];
    globeSideControlRects.forEach((rect, index) => {
      const image = globeLabelImages[`map-control-${names[index]}`];
      if (!image) return;
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const iconSize = Math.min(16, rect.width * 0.48);
      context.save();
      context.globalAlpha = 1;
      context.beginPath();
      context.arc(centerX, centerY, rect.width / 2 - 0.5, 0, Math.PI * 2);
      context.fillStyle = index === 0 ? "rgba(11,48,67,.92)" : "rgba(7,31,46,.84)";
      context.fill();
      context.strokeStyle = index === 0 ? "rgba(165,216,222,.54)" : "rgba(165,216,222,.34)";
      context.lineWidth = 1;
      context.stroke();
      context.drawImage(image, centerX - iconSize / 2, centerY - iconSize / 2, iconSize, iconSize);
      context.restore();
    });
  },

  syncGlobeMarkers() {
    activeGlobeRenderer()?.setMarkers(this.data.worldMarkers);
  },

  refreshScenes() {
    const records = getRecords();
    const everestRecord = records.find((record) => record.id === "everest");
    const reached = everestRecord?.reachElevation ?? 0;
    const progress = everestRecord?.completed
      ? 1
      : progressForReferenceElevation(
        EVEREST_EXPEDITION.routeIndex,
        EVEREST_EXPEDITION.maxElevation,
        reached,
      );
    const canonical = buildObservationPoints(EVEREST_EXPEDITION, progress);
    const projection = projectRouteMilestones(EVEREST_EXPEDITION.routeIndex);
    const mapPoints: MapPoint[] = canonical.map((point) => {
      const position = projection.points.find((item) => item.id === point.id) ?? { x: 50, y: 50 };
      return {
        id: point.id,
        name: point.label,
        altitudeText: point.elevationText,
        top: position.y,
        left: position.x,
        side: position.x > 55 ? "left" : "right",
        state: point.state,
        stateLabel: point.stateLabel,
        isSummit: point.id === "summit",
      };
    });
    const open: OpenCard[] = EXPLORATIONS.map((ex) => {
      const record = records.find((r) => r.id === ex.id) || null;
      const reached = record ? record.reachElevation : 0;
      const progress = Math.min(
        100,
        Math.round((reached / Math.max(1, ex.maxElevation)) * 100),
      );
      return {
        id: ex.id,
        emoji: ex.emoji,
        title: ex.title,
        subtitle: ex.subtitle,
        place: ex.meta.placeLabel,
        region: ex.meta.region,
        elevText: `${Math.round(ex.maxElevation).toLocaleString()} m`,
        estMin: ex.estimatedMinutes,
        desc: ex.meta.description,
        progress,
        reachedText: `${Math.round(reached).toLocaleString()} ${ex.ui?.axisUnit ?? "m"}`,
        axisGlyph: ex.ui?.forwardGlyph ?? "▲",
        completed: Boolean(record && record.completed),
        record,
        image: (() => {
          const place = PLACES.find((item) => item.explorationId === ex.id);
          return place ? placeImage(place) : "";
        })(),
      };
    });
    const routeSegments: MapSegment[] = projection.points.slice(0, -1).map((point, index) => routeSegment(point, projection.points[index + 1]));
    const currentPoint = mapPoints.find((point) => point.state === "current") ?? mapPoints[0];
    const activePointId = this.data.activePointId && mapPoints.some((point) => point.id === this.data.activePointId)
      ? this.data.activePointId
      : currentPoint?.id ?? "";
    this.setData({
      open,
      continueCard: open.find((item) => item.id === "everest") ?? open[0] ?? null,
      mapPoints,
      routeSegments,
      activePointId,
      activePlace: this.placeCardForPoint(activePointId, mapPoints),
      worldMarkers: WORLD_DESTINATION_IDS
        .map((id) => PLACES.find((place) => place.id === id))
        .filter((place): place is Place => Boolean(place))
        .map(worldMarker),
      worldMarkerCount: WORLD_DESTINATION_IDS.length,
      recommendations: ["p-fuji", "p-everest", "p-mariana"]
        .map((id) => PLACES.find((place) => place.id === id))
        .filter((place): place is Place => Boolean(place))
        .map((place) => {
          const preview = destinationPreview(place);
          return {
            ...preview,
            image: RECOMMENDATION_ILLUSTRATIONS[place.id] ?? preview.image,
            typeLabel: place.id === "p-fuji" ? "火山地貌" : place.id === "p-everest" ? "冰川地貌" : "海沟地貌",
          };
        }),
    });
    this.syncGlobeMarkers();
  },

  placeCardForPoint(id: string, points: MapPoint[]): MapPlaceCard | null {
    const point = points.find((item) => item.id === id) ?? points[0];
    if (!point) return null;
    return {
      id: point.id,
      name: point.name,
      altitudeText: point.altitudeText,
      description: point.state === "completed"
        ? "已观察：从冰川纹理与雪脊形态认识这里的高山地貌。"
        : point.state === "current"
          ? "当前观察点：留意冰体破碎、坡度与山脊走向。"
          : "前方观察点：继续浏览山体影像，认识高海拔地貌变化。",
      image: this.mapPointImage(point.id),
      stateLabel: point.stateLabel,
    };
  },

  mapPointImage(id: string): string {
    const images: Record<string, string> = {
      "base-camp": resolveMediaSrc("expeditions/everest/live/live-a-kala-patthar.jpg"),
      "khumbu-icefall": resolveMediaSrc("expeditions/everest/waypoints/khumbu-icefall.jpg"),
      "camp-i": resolveMediaSrc("expeditions/everest/waypoints/camp-i.jpg"),
      "western-cwm-camp-ii": resolveMediaSrc("expeditions/everest/waypoints/western-cwm-camp-ii.jpg"),
      "lhotse-face-camp-iii": resolveMediaSrc("expeditions/everest/waypoints/lhotse-face-camp-iii.jpg"),
      "south-col-camp-iv": resolveMediaSrc("expeditions/everest/waypoints/south-col-camp-iv.jpg"),
      "south-summit": resolveMediaSrc("expeditions/everest/waypoints/south-summit.jpg"),
      summit: resolveMediaSrc("expeditions/everest/waypoints/summit.jpg"),
    };
    return images[id] ?? resolveMediaSrc("world/everest-expedition-hero-v1.jpg");
  },

  refreshAtlas(afterUpdate?: () => void) {
    const places: Place[] = queryPlaces(
      PLACES,
      this.data.query,
      this.data.activeType,
    );
    const atlas: AtlasPlace[] = places.map((p) => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      typeLabel: PLACE_TYPE_META.find((m) => m.type === p.type)?.label ?? "",
      shortDescription: p.shortDescription,
      favorited: favorites.isFavorite(p.id),
      exploration: Boolean(p.explorationId),
    }));
    const destinationPlaces = WORLD_DESTINATION_IDS
      .map((id) => PLACES.find((place) => place.id === id))
      .filter((place): place is Place => Boolean(place));
    const worldPlaces = queryPlaces(destinationPlaces, this.data.query, this.data.activeType);
    const defaultExplorePlaces = !this.data.query.trim() && this.data.activeType === ALL_TYPE
      ? worldPlaces.filter((place) => HOME_MAP_LABEL_PRIORITY[place.id] !== undefined)
      : worldPlaces;
    this.setData({
      atlas,
      atlasEmpty: atlas.length === 0,
      worldMarkers: defaultExplorePlaces.map(worldMarker),
      worldMarkerCount: defaultExplorePlaces.length,
    });
    this.syncGlobeMarkers();
    afterUpdate?.();
  },

  onTypeTap(e: PageEvent) {
    const type = String(e.currentTarget?.dataset?.type ?? ALL_TYPE) as PlaceType | "all";
    if (type === this.data.activeType) return;
    this.setData({ activeType: type });
    this.refreshAtlas();
  },

  onToggleFavorite(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    favorites.toggle(id);
    this.refreshAtlas();
  },

  onQueryInput(e: PageEvent) {
    const query = String(e.detail?.value ?? "");
    this.setData({ query });
    this.refreshAtlas();
    this.focusGlobeQuery(query);
  },

  onAtlasSearchInput(e: PageEvent) {
    this.onQueryInput(e);
  },

  onQueryClear() {
    this.setData({ query: "" });
    this.refreshAtlas();
    this.setData({ selectedDestination: null, selectedMarkerId: "", globeSelectedMode: false });
    globeCanvasOffsetX = 0;
    activeGlobeRenderer()?.setSelected(null);
  },

  /** 路线图加载失败：隐藏图块并提示（不阻断流程） */
  onRouteImageError(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    this.setData({ [`routeImageFailed.${id}`]: true } as Record<string, unknown>);
  },

  /** 打开地点详情 */
  onOpenPlace(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pkg-detail/pages/place/index?id=${id}` });
  },

  /** 进入探索（场景数据已就绪） */
  onGo(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pkg-explore/pages/exploration/index?id=${id}` });
  },

  onMapImageError() {
    this.setData({ mapImageFailed: true });
  },

  onMapPointTap(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    const place = PLACES.find((item) => item.id === id);
    if (place) {
      this.focusGlobePlace(place);
      return;
    }
    this.setData({
      activePointId: id,
      activePlace: this.placeCardForPoint(id, this.data.mapPoints),
    });
  },

  /**
   * 推荐卡点击：直接进入对应体验（可探索 → 探索页，否则 → 地点详情）。
   * 此前推荐卡绑的是 onMapPointTap，只会选中地球并弹出预览卡，
   * 卡片上的「开始攀登 / 开始下潜」点了没有下文。
   */
  onOpenRecommendation(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    const place = PLACES.find((item) => item.id === id);
    if (!place) return;
    if (place.explorationId) {
      wx.navigateTo({ url: `/pkg-explore/pages/exploration/index?id=${place.explorationId}` });
      return;
    }
    wx.navigateTo({ url: `/pkg-detail/pages/place/index?id=${place.id}` });
  },

  onDestinationTap(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    const place = PLACES.find((item) => item.id === id);
    if (!place) return;
    this.focusGlobePlace(place);
  },

  onOpenDestination() {
    const destination = this.data.selectedDestination;
    if (!destination) return;
    if (destination.explorationId) {
      wx.navigateTo({ url: `/pkg-explore/pages/exploration/index?id=${destination.explorationId}` });
      return;
    }
    wx.navigateTo({ url: `/pkg-detail/pages/place/index?id=${destination.id}` });
  },

  onCloseDestination() {
    this.setData({ selectedDestination: null, selectedMarkerId: "", globeSelectedMode: false });
    globeCanvasOffsetX = 0;
    activeGlobeRenderer()?.setSelected(null);
    this.drawGlobeLabels();
  },

  globeTouchPoint(e: PageEvent): { x: number; y: number } | null {
    const detailX = e.detail?.x;
    const detailY = e.detail?.y;
    if (typeof detailX === "number" && typeof detailY === "number") {
      // 自动化与 Canvas 自身的 detail 坐标已经是渲染器局部坐标。
      return { x: detailX, y: detailY };
    }
    const touch = e.touches?.[0] ?? e.changedTouches?.[0];
    if (!touch) return null;
    // cover-view 触摸坐标以页面视口为基准，必须同时扣除 Canvas 的真实 left/top。
    return {
      x: touch.clientX - globeCanvasOffsetX,
      y: touch.clientY - globeCanvasOffsetY,
    };
  },

  onGlobeTouchStart(e: PageEvent) {
    const point = this.globeTouchPoint(e);
    if (!point) return;
    globeTouch = {
      ...point,
      startX: point.x,
      startY: point.y,
      moved: false,
      velocityX: 0,
      velocityY: 0,
    };
    activeGlobeRenderer()?.pauseRotation();
  },

  onGlobeTouchMove(e: PageEvent) {
    const point = this.globeTouchPoint(e);
    if (!point || !globeTouch) return;
    const deltaX = point.x - globeTouch.x;
    const deltaY = point.y - globeTouch.y;
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      activeGlobeRenderer()?.dragBy(deltaX, deltaY);
      // 用整段手势位移判定拖动，避免慢速拖动因每一帧位移不足阈值而被误判为点击。
      globeTouch.moved = globeTouch.moved
        || Math.hypot(point.x - globeTouch.startX, point.y - globeTouch.startY) > 6;
      globeTouch.velocityX = deltaX;
      globeTouch.velocityY = deltaY;
      globeTouch.x = point.x;
      globeTouch.y = point.y;
    }
  },

  onGlobeTouchEnd(e: PageEvent) {
    const point = this.globeTouchPoint(e);
    const touch = globeTouch;
    globeTouch = null;
    if (!point || !touch) return;
    if (!touch.moved) {
      const id = activeGlobeRenderer()?.hitTest(point.x, point.y);
      if (id) this.openGlobeMarker(id);
      else activeGlobeRenderer()?.resumeRotation();
    } else {
      activeGlobeRenderer()?.release(touch.velocityX, touch.velocityY);
    }
  },

  onGlobeTouchCancel() {
    const touch = globeTouch;
    globeTouch = null;
    if (touch?.moved) activeGlobeRenderer()?.release(touch.velocityX, touch.velocityY);
    else activeGlobeRenderer()?.resumeRotation();
  },

  openGlobeMarker(id: string) {
    const place = PLACES.find((item) => item.id === id);
    if (!place) return;
    this.focusGlobePlace(place);
  },

  focusGlobePlace(place: Place) {
    this.setData({ selectedDestination: destinationPreview(place), selectedMarkerId: place.id }, () => {
      this.drawGlobeLabels();
    });
    globeCanvasOffsetX = 0;
    activeGlobeRenderer()?.setSelected(place.id);
    activeGlobeRenderer()?.focusOnMarker(place.id);
  },

  focusGlobeQuery(query: string) {
    if (query.trim().length < 2) {
      this.setData({ selectedDestination: null, selectedMarkerId: "", globeSelectedMode: false });
      activeGlobeRenderer()?.setSelected(null);
      return;
    }
    const destinationPlaces = WORLD_DESTINATION_IDS
      .map((id) => PLACES.find((place) => place.id === id))
      .filter((place): place is Place => Boolean(place));
    const place = queryPlaces(destinationPlaces, query, "all")[0];
    if (place) this.focusGlobePlace(place);
    else {
      this.setData({ selectedDestination: null, selectedMarkerId: "", globeSelectedMode: false });
      activeGlobeRenderer()?.setSelected(null);
    }
  },

  /** 远端图片加载失败 → 记入 failedImages，模板用 wx:if 隐藏该图，不阻断页面 */
  onImageError(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (id) this.setData({ [`failedImages.${id}`]: true } as Record<string, unknown>);
  },

  onToggleAtlas() {
    const opening = !this.data.atlasOpen;
    if (opening) {
      webglRenderer?.stop();
      canvasRenderer?.stop();
      this.setData({
        atlasOpen: true,
        selectedDestination: null,
        selectedMarkerId: "",
        globeSelectedMode: false,
      });
      return;
    }

    // 图鉴关闭后重新创建 Canvas。原生 Canvas 被 wx:if 移除过，不能继续复用旧节点。
    webglRenderer?.dispose();
    canvasRenderer?.stop();
    webglRenderer = null;
    canvasRenderer = null;
    globeTouch = null;
    this.setData({
      atlasOpen: false,
      webglFailed: false,
      globeFailed: false,
      globeCanvasHeight: this.data.globeEarthOnly ? "100%" : "800rpx",
      recommendationsVisible: true,
    }, () => {
      this.fitGlobeCanvasToRecommendationRail();
    });
  },

  onToggleMapMode() {
    this.setData({ mapMode: this.data.mapMode === "地形" ? "路线" : "地形" });
  },

  onResetGlobe() {
    this.setData({ selectedDestination: null, selectedMarkerId: "", globeSelectedMode: false });
    globeCanvasOffsetX = 0;
    activeGlobeRenderer()?.reset();
  },

  onOpenMapActions() {
    wx.showActionSheet({
      itemList: ["重置地球视角", "打开地貌图鉴"],
      success: ({ tapIndex }) => {
        if (tapIndex === 0) this.onResetGlobe();
        if (tapIndex === 1) this.onToggleAtlas();
      },
    });
  },

  onResetMap() {
    const point = this.data.mapPoints.find((item: MapPoint) => item.state === "current") ?? this.data.mapPoints[0];
    if (!point) return;
    this.setData({ activePointId: point.id, activePlace: this.placeCardForPoint(point.id, this.data.mapPoints) });
  },

  onOpenPlaceCard() {
    const id = this.data.activePlace?.id;
    if (!id) return;
    wx.navigateTo({ url: `/pkg-explore/pages/exploration/index?id=everest&waypointId=${id}` });
  },
});
