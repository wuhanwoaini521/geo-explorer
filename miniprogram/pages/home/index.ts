/**
 * 🏠 首页 —— 探索的起点（内容驱动，无硬编码业务数据）。
 *
 * 结构：Hero（品牌 + 真实 DEM 主视觉）→ 沉浸场景 → 精选目的地
 * → 按地貌探索（分类入口 → 地图页图鉴）→ 你知道吗（随机冷知识）→ 关于。
 */
import { EXPLORATIONS } from "../../data/explorations/index";
import { DISCOVERIES, type Discovery } from "../../data/discoveries";
import { PLACES, PLACE_TYPE_META } from "../../data/places";
import { getExplorationStats } from "../../services/exploration-store";
import { setPendingTypeFilter } from "../../services/ui-bus";
import type { Exploration } from "../../types/exploration";
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
    stats: { completed: 0, totalFound: 0 },
    placeCount: PLACES.length,
  },

  onShow() {
    this.getTabBar?.()?.setData({ selected: 0 });
    this.refresh();
  },

  refresh() {
    const scenes: SceneCard[] = EXPLORATIONS.map((ex: Exploration) => ({
      id: ex.id,
      title: ex.title,
      subtitle: ex.subtitle,
      emoji: ex.emoji,
      meta: `${formatNumber(ex.maxElevation, 2)} m 海拔 · ${ex.stages.length} 个自然带`,
      badge: `知识节点 ×${ex.knowledgeNodes.length}`,
    }));

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
    wx.navigateTo({ url: `/pages/exploration/index?id=${id}` });
  },

  onOpenFeatured(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pages/place/index?id=${id}` });
  },

  /** 分类入口 → 地图页图鉴（带筛选） */
  onOpenType(e: PageEvent) {
    const type = String(e.currentTarget?.dataset?.type ?? "all") as PlaceType;
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
});
