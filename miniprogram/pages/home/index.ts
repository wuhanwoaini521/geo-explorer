/**
 * 🏠 首页 —— 探索的起点（内容驱动，无硬编码业务数据）。
 *
 * 结构：Hero（品牌 + 珠峰实景主视觉）→ 沉浸场景 → 精选目的地
 * → 按地貌探索（分类入口 → 地图页图鉴）→ 你知道吗（随机冷知识）→ 关于。
 */
import { DISCOVERIES, type Discovery } from "../../data/discoveries";
import { PLACES, PLACE_TYPE_META } from "../../data/places";
import { getExplorationStats } from "../../services/exploration-store";
import { setPendingSearchQuery, setPendingTypeFilter } from "../../services/ui-bus";
import type { PlaceType } from "../../types/models";
import { formatNumber } from "../../utils/format";
import { randomDiscovery } from "../../utils/discovery";

interface SceneCard {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  meta: string;
  badge: string;
  image: string;
  tags: [string, string];
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

Page({
  data: {
    scenes: [] as SceneCard[],
    featured: [] as FeaturedCard[],
    types: [] as TypeEntry[],
    discovery: null as (Discovery & { index: number }) | null,
    heroImageFailed: false,
    failedImages: {} as Record<string, boolean>,
    query: "",
    activeType: "all" as PlaceType | "all",
    stats: { completed: 0, totalFound: 0 },
    placeCount: PLACES.length,
  },

  onShow() {
    this.getTabBar?.()?.setData({ selected: 0 });
    this.getTabBar?.()?.setData({ hidden: false });
    this.refresh();
  },

  refresh() {
    const scenes: SceneCard[] = [
      {
        id: "everest", title: "珠穆朗玛峰", subtitle: "地球之巅 · 8,848 m", emoji: "🏔️",
        meta: "", badge: "", image: "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
        tags: ["高山地貌", "地貌观察"], target: "exploration",
      },
      {
        id: "mariana", title: "马里亚纳海沟", subtitle: "地球最深处 · 10,900 m", emoji: "🌊",
        meta: "", badge: "", image: "/assets/world/mariana-card.png",
        tags: ["海沟", "下潜"], target: "exploration",
      },
      {
        id: "p-colorado", title: "大峡谷", subtitle: "穿越地球的历史", emoji: "🏜️",
        meta: "", badge: "", image: "/assets/world/grand-canyon-card.png",
        tags: ["峡谷", "探索"], target: "place",
      },
      {
        id: "p-fuji", title: "富士山", subtitle: "火山与生命", emoji: "🌋",
        meta: "", badge: "", image: "/assets/world/fuji-card.png",
        tags: ["火山", "攀登"], target: "place",
      },
    ];

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

  /** 分类入口 → 地图页图鉴（带筛选） */
  onOpenType(e: PageEvent) {
    const type = String(e.currentTarget?.dataset?.type ?? "all") as PlaceType;
    this.setData({ activeType: type });
    setPendingTypeFilter(type);
    wx.switchTab({ url: "/pages/map/index" });
  },

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
    this.setData({ query: String(e.detail?.value ?? "") });
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
