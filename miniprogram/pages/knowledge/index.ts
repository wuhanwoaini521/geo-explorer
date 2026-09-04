/**
 * 📖 知识页 —— 地理知识库（MVP 展示前 8 条，占位实现）。
 */
import { KNOWLEDGE, KNOWLEDGE_CATEGORIES } from "../../data/knowledge";
import type { Knowledge } from "../../types/models";

Page({
  data: {
    categories: [] as string[],
    items: [] as Knowledge[],
  },

  onShow() {
    this.setData({
      categories: KNOWLEDGE_CATEGORIES.slice(0, 4),
      items: KNOWLEDGE.slice(0, 8),
    });
  },

  onOpen(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pages/knowledge-detail/index?id=${id}` });
  },
});
