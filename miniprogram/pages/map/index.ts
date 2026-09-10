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

const COMING: ComingScene[] = [
  { id: "fuji", emoji: "🗻", title: "富士山", region: "日本 · 本州", basis: "海拔 3,776 m · 休眠火山" },
  { id: "sahara", emoji: "🏜️", title: "撒哈拉沙漠", region: "北非", basis: "世界最大热沙漠" },
];

const ALL_TYPE = "all";

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
  },

  onLoad() {
    this.refreshScenes();
    this.refreshAtlas();
  },

  onShow() {
    this.getTabBar?.()?.setData({ selected: 1 });
    this.getTabBar?.()?.setData({ hidden: false });
    // 从探索/图鉴返回后刷新完成度；仅当首页分类入口显式传入筛选时才切换类型
    const pending = consumeTypeFilter();
    const pendingQuery = consumeSearchQuery();
    const patch: Record<string, unknown> = {};
    if (pending !== null) patch.activeType = pending;
    if (pendingQuery !== null) patch.query = pendingQuery;
    if (Object.keys(patch).length) this.setData(patch);
    this.refreshScenes();
    this.refreshAtlas();
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
    });
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

  refreshAtlas() {
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
    this.setData({ atlas, atlasEmpty: atlas.length === 0 });
  },

  onTypeTap(e: PageEvent) {
    const type = String(e.currentTarget?.dataset?.type ?? ALL_TYPE) as PlaceType | "all";
    if (type === this.data.activeType) return;
    this.setData({ activeType: type });
    this.refreshAtlas();
  },

  onQueryInput(e: PageEvent) {
    this.setData({ query: String(e.detail?.value ?? "") });
    this.refreshAtlas();
  },

  onQueryClear() {
    this.setData({ query: "" });
    this.refreshAtlas();
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
    this.setData({
      activePointId: id,
      activePlace: this.placeCardForPoint(id, this.data.mapPoints),
    });
  },

  onToggleAtlas() {
    this.setData({ atlasOpen: !this.data.atlasOpen });
  },

  onToggleMapMode() {
    this.setData({ mapMode: this.data.mapMode === "地形" ? "路线" : "地形" });
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
