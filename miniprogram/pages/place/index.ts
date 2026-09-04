/**
 * 📍 地点详情页 —— 地理图鉴的单点详情。
 * 数据全部来自 data/places（GeoPlace），页面只做组装与跳转：
 * Overview / Formation / Climate / Facts / 相关地点 / 关联知识 / 进入沉浸探索。
 */
import { PLACES, getPlaceById, PLACE_TYPE_LABEL } from "../../data/places";
import { KNOWLEDGE } from "../../data/knowledge";
import { getExplorationById } from "../../data/explorations/index";
import { favorites } from "../../services/favorites-store";
import type { Place } from "../../types/models";
import { formatNumber } from "../../utils/format";

interface PlaceVM {
  id: string;
  name: string;
  nameEn: string;
  emoji: string;
  typeLabel: string;
  country: string;
  region: string;
  shortDescription: string;
  description: string;
  formation: string;
  climate?: string;
  geologicalAge?: string;
  facts: string[];
  tags: string[];
  /** 高程展示（含单位与语义标签，如「海拔」「深度」） */
  elevLabel: string;
  elevText: string;
  coordText: string;
  /** 是否有可进入的沉浸探索场景 */
  explorationId?: string;
  explorationTitle?: string;
}

interface RelatedItem {
  id: string;
  name: string;
  emoji: string;
  shortDescription: string;
}

interface KnowledgeLinkItem {
  id: string;
  title: string;
  emoji: string;
  category: string;
}

/** 高程语义：海洋类显示深度，其余显示海拔/高程 */
function elevDisplay(place: Place): { label: string; text: string } {
  const digits = Math.abs(place.elevationM) % 1 === 0 ? 0 : 2;
  if (place.elevationM < 0) {
    return { label: "深度", text: `${formatNumber(Math.abs(place.elevationM), digits)} m` };
  }
  return { label: "海拔", text: `${formatNumber(place.elevationM, digits)} m` };
}

/** 相关地点：同类型优先，其次共享标签；最多 4 个 */
function relatedPlaces(place: Place, all: Place[]): RelatedItem[] {
  const scored = all
    .filter((p) => p.id !== place.id)
    .map((p) => {
      const sharedTags = p.tags.filter((t) => place.tags.includes(t)).length;
      const score = (p.type === place.type ? 10 : 0) + sharedTags;
      return { p, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name, "zh"));
  return scored.slice(0, 4).map(({ p }) => ({
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    shortDescription: p.shortDescription,
  }));
}

/** 关联知识库条目（knowledge.relatedPlaceIds 反查） */
function relatedKnowledge(placeId: string): KnowledgeLinkItem[] {
  return KNOWLEDGE.filter((k) => k.relatedPlaceIds.includes(placeId)).map((k) => ({
    id: k.id,
    title: k.title,
    emoji: k.emoji,
    category: k.category,
  }));
}

Page({
  data: {
    place: null as PlaceVM | null,
    favorited: false,
    related: [] as RelatedItem[],
    knowledge: [] as KnowledgeLinkItem[],
  },

  onLoad(query: Record<string, string>) {
    const id = String(query?.id ?? "");
    const place = getPlaceById(id);
    if (!place) {
      wx.showToast({ title: "未找到该地点", icon: "none" });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 600);
      return;
    }
    const elev = elevDisplay(place);
    const ex = place.explorationId ? getExplorationById(place.explorationId) : undefined;
    const vm: PlaceVM = {
      id: place.id,
      name: place.name,
      nameEn: place.nameEn,
      emoji: place.emoji,
      typeLabel: PLACE_TYPE_LABEL[place.type],
      country: place.country,
      region: place.region,
      shortDescription: place.shortDescription,
      description: place.description,
      formation: place.formation,
      climate: place.climate,
      geologicalAge: place.geologicalAge,
      facts: place.facts,
      tags: place.tags,
      elevLabel: elev.label,
      elevText: elev.text,
      coordText: `${place.latitude.toFixed(2)}°, ${place.longitude.toFixed(2)}°`,
      explorationId: place.explorationId,
      explorationTitle: ex?.title,
    };
    this.setData({
      place: vm,
      favorited: favorites.isFavorite(place.id),
      related: relatedPlaces(place, PLACES),
      knowledge: relatedKnowledge(place.id),
    });
  },

  onShow() {
    const id = this.data.place?.id;
    if (id) this.setData({ favorited: favorites.isFavorite(id) });
  },

  onToggleFavorite() {
    const place = this.data.place;
    if (!place) return;
    const added = favorites.toggle(place.id);
    this.setData({ favorited: added });
    wx.showToast({ title: added ? "已加入收藏" : "已取消收藏", icon: "none" });
  },

  onOpenRelated(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pages/place/index?id=${id}` });
  },

  onOpenKnowledge(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pages/knowledge-detail/index?id=${id}` });
  },

  onStartExploration() {
    const id = this.data.place?.explorationId;
    if (!id) return;
    wx.navigateTo({ url: `/pages/exploration/index?id=${id}` });
  },

  onOpenMap() {
    wx.switchTab({ url: "/pages/map/index" });
  },
});
