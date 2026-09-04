/**
 * 📄 知识详情页 —— 单条知识完整内容 + 关联地点（知识 → 图鉴闭环）。
 */
import { KNOWLEDGE } from "../../data/knowledge";
import { getPlaceById, PLACE_TYPE_LABEL } from "../../data/places";
import type { Knowledge } from "../../types/models";

interface RelatedPlace {
  id: string;
  name: string;
  emoji: string;
  typeLabel: string;
  shortDescription: string;
}

Page({
  data: {
    item: null as Knowledge | null,
    relatedPlaces: [] as RelatedPlace[],
  },

  onLoad(query: Record<string, string>) {
    const id = query.id || "";
    const item = KNOWLEDGE.find((k) => k.id === id) || KNOWLEDGE[0] || null;
    const relatedPlaces: RelatedPlace[] = item
      ? item.relatedPlaceIds
          .map((pid) => getPlaceById(pid))
          .filter((p): p is NonNullable<typeof p> => Boolean(p))
          .map((p) => ({
            id: p.id,
            name: p.name,
            emoji: p.emoji,
            typeLabel: PLACE_TYPE_LABEL[p.type],
            shortDescription: p.shortDescription,
          }))
      : [];
    this.setData({ item, relatedPlaces });
    if (item) {
      wx.setNavigationBarTitle({ title: item.title });
    }
  },

  onOpenPlace(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pages/place/index?id=${id}` });
  },
});
