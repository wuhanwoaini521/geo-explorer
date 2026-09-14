/**
 * 🏠 首页 —— 探索的起点（内容驱动，无硬编码业务数据）。
 *
 * 结构：Hero（品牌 + 珠峰实景主视觉）→ 沉浸场景 → 精选目的地
 * → 按地貌探索（首页原地筛选）→ 你知道吗（随机冷知识）→ 关于。
 */
import { DISCOVERIES, type Discovery } from "../../data/discoveries";
import { PLACES, PLACE_TYPE_META } from "../../data/places";
import { getPlaceHeroImage } from "../../data/media/world-manifests";
import { getExplorationStats } from "../../services/exploration-store";
import { setPendingSearchQuery, setPendingTypeFilter } from "../../services/ui-bus";
import type { PlaceType } from "../../types/models";
import { formatNumber } from "../../utils/format";
import { randomDiscovery } from "../../utils/discovery";
import { filterScenes } from "../../utils/scene-search";

interface SceneCard {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  meta: string;
  badge: string;
  image: string;
  tags: [string, string];
  type: PlaceType;
  target: "exploration" | "place";
}

interface FeaturedCard {
  id: string;
  name: string;
  emoji: string;
  typeLabel: string;
  shortDescription: string;
  explorText: string;
  exploration: boolean;
}

interface TypeEntry {
  type: PlaceType;
  label: string;
  emoji: string;
  count: number;
}

const SCENE_CATALOG: SceneCard[] = [
  {
    id: "everest", title: "珠穆朗玛峰", subtitle: "地球之巅 · 8,848 m", emoji: "🏔️",
    meta: "", badge: "", image: "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
    tags: ["高山地貌", "地貌观察"], type: "mountain", target: "exploration",
  },
  {
    id: "mariana", title: "马里亚纳海沟", subtitle: "地球最深处 · 10,935 m", emoji: "🌊",
    meta: "", badge: "", image: getPlaceHeroImage("p-mariana") ?? "",
    tags: ["海沟", "下潜"], type: "ocean", target: "exploration",
  },
  {
    id: "colorado", title: "科罗拉多大峡谷", subtitle: "下切 1,389 m · 穿越二十亿年", emoji: "🏞️",
    meta: "", badge: "", image: getPlaceHeroImage("p-colorado") ?? "",
    tags: ["峡谷", "地质剖面"], type: "canyon", target: "exploration",
  },
  {
    id: "fuji", title: "富士山", subtitle: "攀登日本最高点 · 3,776 m", emoji: "🗻",
    meta: "", badge: "", image: getPlaceHeroImage("p-fuji") ?? "",
    tags: ["火山", "攀登"], type: "volcano", target: "exploration",
  },
];

const TYPE_LABELS = new Map(PLACE_TYPE_META.map((item) => [item.type, item.label]));

/** 首页分类结果使用完整地点库；有探索能力的地点仍直接进入对应沉浸场景。 */
const PLACE_CATALOG: SceneCard[] = PLACES.map((place) => {
  const typeLabel = TYPE_LABELS.get(place.type) ?? "地貌";
  const elevationText =
    place.elevationM < 0
      ? `${formatNumber(Math.abs(place.elevationM), 0)} m 深`
      : `${formatNumber(place.elevationM, 0)} m`;
  return {
    id: place.explorationId ?? place.id,
    title: place.name,
    subtitle: `${place.shortDescription} · ${elevationText}`,
    emoji: place.emoji,
    meta: "",
    badge: "",
    image: getPlaceHeroImage(place.id) ?? "",
    tags: [typeLabel, place.explorationId ? "可沉浸探索" : (place.tags[0] ?? "地点图鉴")],
    type: place.type,
    target: place.explorationId ? "exploration" : "place",
  };
});

function scenesFor(type: PlaceType | "all", query: string): SceneCard[] {
  const source = type === "all" ? SCENE_CATALOG : PLACE_CATALOG.filter((scene) => scene.type === type);
  return filterScenes(source, query);
}

function typeLabel(type: PlaceType | "all"): string {
  return type === "all" ? "推荐探索" : `${TYPE_LABELS.get(type) ?? "地貌"}地点`;
}

Page({
  data: {
    scenes: [] as SceneCard[],
    featured: [] as FeaturedCard[],
    types: [] as TypeEntry[],
    discovery: null as (Discovery & { index: number }) | null,
    heroImageFailed: false,
    failedImages: {} as Record<string, boolean>,
    query: "",
    sceneEmpty: false,
    activeType: "all" as PlaceType | "all",
    activeTypeLabel: "推荐探索",
    stats: { completed: 0, totalFound: 0 },
    placeCount: PLACES.length,
  },

  onShow() {
    this.getTabBar?.()?.setData({ selected: 1 });
    this.getTabBar?.()?.setData({ hidden: false });
    this.refresh();
  },

  refresh() {
    const scenes = scenesFor(this.data.activeType, this.data.query);

    const featured: FeaturedCard[] = PLACES.filter((p) => p.featured)
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        typeLabel: PLACE_TYPE_META.find((m) => m.type === p.type)?.label ?? "",
        shortDescription: p.shortDescription,
        explorText: p.explorationId
          ? "可沉浸探索"
          : p.elevationM < 0
            ? `${formatNumber(Math.abs(p.elevationM), 0)} m 深`
            : `${formatNumber(Math.abs(p.elevationM), 0)} m`,
        exploration: Boolean(p.explorationId),
      }));

    const counts = new Map<PlaceType, number>();
    for (const p of PLACES) counts.set(p.type, (counts.get(p.type) ?? 0) + 1);
    const types: TypeEntry[] = PLACE_TYPE_META.map((m) => ({
      type: m.type,
      label: m.label,
      emoji: m.emoji,
      count: counts.get(m.type) ?? 0,
    }));

    this.setData({
      scenes,
      sceneEmpty: Boolean(this.data.query.trim()) && scenes.length === 0,
      activeTypeLabel: typeLabel(this.data.activeType),
      featured,
      types,
      discovery: this.pickDiscovery(),
      stats: getExplorationStats(),
    });
  },

  pickDiscovery(): (Discovery & { index: number }) | null {
    if (!DISCOVERIES.length) return null;
    const last = this.data?.discovery?.id;
    const d = randomDiscovery(last);
    return {
      ...d,
      index: (this.data?.discovery?.index ?? 0) + 1,
    };
  },

  onOpenScene(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    const target = String(e.currentTarget?.dataset?.target ?? "exploration");
    wx.navigateTo({
      url: target === "place"
        ? `/pages/place/index?id=${id}`
        : `/pages/exploration/index?id=${id}`,
    });
  },

  onOpenFeatured(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pages/place/index?id=${id}` });
  },

  /** 首页分类 Tab：原地替换主列表，不改变页面与底部导航。 */
  onOpenType(e: PageEvent) {
    const raw = String(e.currentTarget?.dataset?.type ?? "all");
    const type = raw === "all" ? "all" : (raw as PlaceType);
    const scenes = scenesFor(type, this.data.query);
    this.setData({
      activeType: type,
      activeTypeLabel: typeLabel(type),
      scenes,
      sceneEmpty: scenes.length === 0,
    });
  },

  /** 明确的“查看图鉴”入口才进入地图页。 */
  onOpenAtlas() {
    setPendingTypeFilter("all");
    wx.switchTab({ url: "/pages/map/index" });
  },

  /** 换一条冷知识 */
  onShuffleDiscovery() {
    this.setData({ discovery: this.pickDiscovery() });
  },

  onOpenMapTab() {
    wx.switchTab({ url: "/pages/map/index" });
  },

  /** 主视觉加载失败：降级为纯色卡片，避免出现破图 */
  onHeroImageError() {
    this.setData({ heroImageFailed: true });
  },

  onQueryInput(e: PageEvent) {
    const query = String(e.detail?.value ?? "");
    const scenes = scenesFor(this.data.activeType, query);
    this.setData({ query, scenes, sceneEmpty: Boolean(query.trim()) && scenes.length === 0 });
  },

  onQueryClear() {
    this.setData({
      query: "",
      scenes: scenesFor(this.data.activeType, ""),
      sceneEmpty: false,
    });
  },

  onQueryConfirm() {
    const query = String(this.data.query ?? "").trim();
    if (!query) {
      wx.showToast({ title: "请输入地点或地貌", icon: "none" });
      return;
    }
    setPendingSearchQuery(query);
    wx.switchTab({ url: "/pages/map/index" });
  },

  onSceneImageError(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (id) this.setData({ [`failedImages.${id}`]: true } as Record<string, unknown>);
  },
});
