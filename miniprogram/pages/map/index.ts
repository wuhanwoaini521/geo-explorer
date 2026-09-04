/**
 * 🗺️ 地图页 —— 探索入口 + 世界图鉴。
 *
 * 上半部：已开放沉浸探索的场景（来自 data/explorations 注册表，进度本地读取）；
 * 下半部：世界图鉴（GeoPlace 数据集）—— 搜索 + 地貌类型筛选 + 地点卡片 → 地点详情页。
 * 搜索/筛选为纯函数（utils/place-search），页面只负责装配。
 */
import { EXPLORATIONS } from "../../data/explorations/index";
import { PLACES, PLACE_TYPE_META } from "../../data/places";
import { getRecords } from "../../services/exploration-store";
import type { ExplorationRecord } from "../../services/exploration-store";
import { consumeTypeFilter } from "../../services/ui-bus";
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
  },

  onLoad() {
    this.refreshScenes();
    this.refreshAtlas();
  },

  onShow() {
    this.getTabBar?.()?.setData({ selected: 1 });
    // 从探索/图鉴返回后刷新完成度与筛选（首页分类入口经 ui-bus 传入）
    const pending = consumeTypeFilter();
    if (pending !== this.data.activeType) {
      this.setData({ activeType: pending });
    }
    this.refreshScenes();
    this.refreshAtlas();
  },

  refreshScenes() {
    const records = getRecords();
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
    this.setData({ open });
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
});
