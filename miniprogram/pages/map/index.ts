/**
 * 🗺️ 地图页 —— 探索入口 + 世界图鉴。
 *
 * 上半部：已开放沉浸探索的场景（来自 data/explorations 注册表，进度本地读取）；
 * 下半部：世界图鉴（GeoPlace 数据集）—— 搜索 + 地貌类型筛选 + 地点卡片 → 地点详情页。
 * 搜索/筛选为纯函数（utils/place-search），页面只负责装配。
 */
import { EXPLORATIONS } from "../../data/explorations/index";
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
import {
  WebGLGlobeRenderer,
  type GlobeProjectionListener,
  type GlobeRenderOptions,
} from "../../engine/webgl-globe-renderer";

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
  description: string;
  actionLabel: string;
  image: string;
  explorationId?: string;
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
let globeTouch: { x: number; y: number; moved: boolean; velocityX: number; velocityY: number } | null = null;
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

function activeGlobeRenderer(): GlobeController | null {
  return webglRenderer ?? canvasRenderer;
}

function placeImage(place: Place): string {
  if (place.id === "p-everest") return "/assets/expeditions/everest/live/live-a-kala-patthar.jpg";
  if (place.id === "p-mariana" || place.type === "ocean") return "/assets/world/mariana-card.png";
  if (place.id === "p-fuji" || place.type === "volcano") return "/assets/world/fuji-card.png";
  if (place.id === "p-colorado" || place.type === "canyon" || place.type === "plateau") return "/assets/world/grand-canyon-card.png";
  if (place.type === "glacier" || place.type === "mountain") return "/assets/world/everest-view-b.jpg";
  return "/assets/world/grand-canyon-card.png";
}

function metricForPlace(place: Place): { label: string; value: string } {
  if (place.elevationM < 0) return { label: "最大深度", value: `约 ${Math.abs(place.elevationM).toLocaleString()} m` };
  if (place.type === "canyon") return { label: "谷底高程", value: `${place.elevationM.toLocaleString()} m` };
  return { label: "最高点", value: `${place.elevationM.toLocaleString()} m` };
}

function worldMarker(place: Place): WorldMarker {
  const left = Math.max(3, Math.min(97, ((place.longitude + 180) / 360) * 100));
  const top = Math.max(8, Math.min(92, ((90 - place.latitude) / 180) * 100));
  return {
    id: place.id,
    name: place.name,
    nameEn: place.nameEn,
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
    selectedMarkerId: "",
    globeSelectedMode: false,
    webglFailed: false,
    globeEarthOnly: false,
    globeFailed: false,
  },

  onLoad(options?: { globe?: string; selected?: string; q?: string; type?: string; bump?: string; atmosphere?: string; texture?: string }) {
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
    this.setData({ globeEarthOnly, globeSelectedMode });
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
    this.initGlobe();
  },

  onShow() {
    this.getTabBar?.()?.setData({ selected: 1 });
    this.getTabBar?.()?.setData({ hidden: globeEarthOnly });
    // 从探索/图鉴返回后刷新完成度；仅当首页分类入口显式传入筛选时才切换类型
    const pending = consumeTypeFilter();
    const pendingQuery = consumeSearchQuery();
    const patch: Record<string, unknown> = {};
    if (pending !== null) patch.activeType = pending;
    if (pendingQuery !== null) patch.query = pendingQuery;
    if (Object.keys(patch).length) this.setData(patch);
    this.refreshScenes();
    this.refreshAtlas();
    if (!this.data.atlasOpen) {
      activeGlobeRenderer()?.resumeRotation();
      activeGlobeRenderer()?.start();
    }
  },

  onHide() {
    webglRenderer?.stop();
    canvasRenderer?.stop();
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
  },

  initGlobe() {
    const system = wx.getSystemInfoSync();
    if (forceCanvas) {
      this.setData({ webglFailed: true }, () => this.initCanvasFallback());
      return;
    }
    try {
      wx.createSelectorQuery()
        .select("#globeWebglCanvas")
        .fields({ node: true, size: true })
        .exec((result) => {
          const canvasInfo = result[0] as { node?: unknown; width?: number; height?: number } | undefined;
          if (!canvasInfo?.node || !canvasInfo.width || !canvasInfo.height) {
            this.setData({ webglFailed: true }, () => this.initCanvasFallback());
            return;
          }
          globeCanvasWidth = canvasInfo.width;
          globeCanvasHeight = canvasInfo.height;
          globeCanvasOffsetX = 0;
          globeCanvasOffsetY = globeEarthOnly || initialSelectedId || initialQuery ? 0 : system.windowWidth * 208 / 750;
          try {
            const variantMode = this.data.globeEarthOnly ? "earth-only" : "default";
            const renderOptions: GlobeRenderOptions = {
              earthOnly: globeEarthOnly,
              selectedMode: globeSelectedMode,
              bumpEnabled: globeBumpEnabled,
              atmosphereEnabled: globeAtmosphereEnabled,
              textureScale: globeTextureScale,
              bumpScale: globeMode === "variant-b" ? 1.02 : variantMode === "earth-only" ? 1.18 : globeVariant === "low" ? 0.94 : 1.18,
              atmosphereStrength: globeMode === "variant-c" ? 0.32 : 0.38,
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
              if (!this.data.worldMarkers.length || !globeCanvasWidth || !globeCanvasHeight) return;
              const projectionById = new Map(projections.map((projection) => [projection.id, projection]));
              const worldMarkers = this.data.worldMarkers.map((marker) => {
                const projection = projectionById.get(marker.id);
                if (!projection) return marker;
                return {
                  ...marker,
                  screenLeft: ((projection.screenX + globeCanvasOffsetX) / globeCanvasWidth) * 100,
                  screenTop: ((projection.screenY + globeCanvasOffsetY) / Math.max(1, system.screenHeight)) * 100,
                  screenOpacity: projection.opacity,
                  screenVisible: projection.visible,
                };
              });
              this.setData({ worldMarkers });
            };
            webglRenderer.setProjectionListener(projectionListener);
            webglRenderer.setMarkers(this.data.worldMarkers);
            const initialPlace = PLACES.find((place) => place.id === initialSelectedId);
            if (initialPlace) this.focusGlobePlace(initialPlace);
            else if (initialQuery) this.focusGlobeQuery(initialQuery);
            webglRenderer.start();
          } catch {
            webglRenderer?.dispose();
            webglRenderer = null;
            this.setData({ webglFailed: true }, () => this.initCanvasFallback());
          }
        });
    } catch {
      this.setData({ webglFailed: true }, () => this.initCanvasFallback());
    }
  },

  initCanvasFallback() {
    const system = wx.getSystemInfoSync();
    try {
      wx.createSelectorQuery()
        .select("#globeCanvas")
        .fields({ node: true, size: true })
        .exec((result) => {
          const canvasInfo = result[0] as { node?: unknown; width?: number; height?: number } | undefined;
          if (!canvasInfo?.node || !canvasInfo.width || !canvasInfo.height) {
            this.setData({ globeFailed: true });
            return;
          }
          globeCanvasWidth = canvasInfo.width;
          globeCanvasHeight = canvasInfo.height;
          globeCanvasOffsetX = 0;
          globeCanvasOffsetY = globeEarthOnly || initialSelectedId || initialQuery ? 0 : system.windowWidth * 208 / 750;
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
        reachedText: `${progress}% · ${ex.ui?.extentWord ?? "已至"} ${Math.round(reached).toLocaleString()} ${ex.ui?.axisUnit ?? "m"}`,
        axisGlyph: ex.ui?.forwardGlyph ?? "▲",
        completed: Boolean(record && record.completed),
        record,
      };
    });
    const routeSegments: MapSegment[] = projection.points.slice(0, -1).map((point, index) => routeSegment(point, projection.points[index + 1]));
    const currentPoint = mapPoints.find((point) => point.state === "current") ?? mapPoints[0];
    const activePointId = this.data.activePointId && mapPoints.some((point) => point.id === this.data.activePointId)
      ? this.data.activePointId
      : currentPoint?.id ?? "";
    this.setData({
      open,
      mapPoints,
      routeSegments,
      activePointId,
      activePlace: this.placeCardForPoint(activePointId, mapPoints),
      worldMarkers: WORLD_DESTINATION_IDS
        .map((id) => PLACES.find((place) => place.id === id))
        .filter((place): place is Place => Boolean(place))
        .map(worldMarker),
      worldMarkerCount: WORLD_DESTINATION_IDS.length,
      recommendations: WORLD_DESTINATION_IDS
        .slice(0, 2)
        .map((id) => PLACES.find((place) => place.id === id))
        .filter((place): place is Place => Boolean(place))
        .map(destinationPreview),
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
      "base-camp": "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
      "khumbu-icefall": "/assets/world/everest-view-a.jpg",
      "camp-i": "/assets/world/everest-view-a.jpg",
      "western-cwm-camp-ii": "/assets/world/everest-view-b.jpg",
      "lhotse-face-camp-iii": "/assets/world/everest-view-b.jpg",
      "south-col-camp-iv": "/assets/world/everest-view-c.jpg",
      "south-summit": "/assets/world/everest-view-c.jpg",
      summit: "/assets/world/everest-hero.jpg",
    };
    return images[id] ?? "/assets/world/everest-hero.jpg";
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
    this.setData({
      atlas,
      atlasEmpty: atlas.length === 0,
      worldMarkers: worldPlaces.map(worldMarker),
      worldMarkerCount: worldPlaces.length,
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

  onQueryInput(e: PageEvent) {
    const query = String(e.detail?.value ?? "");
    this.setData({ query });
    this.refreshAtlas();
    this.focusGlobeQuery(query);
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
    wx.navigateTo({ url: `/pages/place/index?id=${id}` });
  },

  /** 进入探索（场景数据已就绪） */
  onGo(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pages/exploration/index?id=${id}` });
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
      wx.navigateTo({ url: `/pages/exploration/index?id=${destination.explorationId}` });
      return;
    }
    wx.navigateTo({ url: `/pages/place/index?id=${destination.id}` });
  },

  onCloseDestination() {
    this.setData({ selectedDestination: null, selectedMarkerId: "", globeSelectedMode: false });
    globeCanvasOffsetX = 0;
    activeGlobeRenderer()?.setSelected(null);
  },

  globeTouchPoint(e: PageEvent): { x: number; y: number } | null {
    const detailX = e.detail?.x;
    const detailY = e.detail?.y;
    if (typeof detailX === "number" && typeof detailY === "number") {
      return { x: detailX - globeCanvasOffsetX, y: detailY };
    }
    const touch = e.touches?.[0] ?? e.changedTouches?.[0];
    if (!touch) return null;
    return { x: (touch.x ?? touch.clientX) - globeCanvasOffsetX, y: touch.y ?? touch.clientY };
  },

  onGlobeTouchStart(e: PageEvent) {
    const point = this.globeTouchPoint(e);
    if (!point) return;
    globeTouch = { ...point, moved: false, velocityX: 0, velocityY: 0 };
    activeGlobeRenderer()?.pauseRotation();
  },

  onGlobeTouchMove(e: PageEvent) {
    const point = this.globeTouchPoint(e);
    if (!point || !globeTouch) return;
    const deltaX = point.x - globeTouch.x;
    const deltaY = point.y - globeTouch.y;
    if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
      activeGlobeRenderer()?.dragBy(deltaX, deltaY);
      globeTouch.moved = globeTouch.moved || Math.hypot(deltaX, deltaY) > 7;
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

  openGlobeMarker(id: string) {
    const place = PLACES.find((item) => item.id === id);
    if (!place) return;
    this.focusGlobePlace(place);
  },

  focusGlobePlace(place: Place) {
    this.setData({ selectedDestination: destinationPreview(place), selectedMarkerId: place.id });
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
    this.setData({ atlasOpen: false, webglFailed: false, globeFailed: false }, () => {
      this.initGlobe();
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

  onResetMap() {
    const point = this.data.mapPoints.find((item: MapPoint) => item.state === "current") ?? this.data.mapPoints[0];
    if (!point) return;
    this.setData({ activePointId: point.id, activePlace: this.placeCardForPoint(point.id, this.data.mapPoints) });
  },

  onBack() {
    wx.switchTab({ url: "/pages/home/index" });
  },

  onOpenPlaceCard() {
    const id = this.data.activePlace?.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/exploration/index?id=everest&waypointId=${id}` });
  },
});
