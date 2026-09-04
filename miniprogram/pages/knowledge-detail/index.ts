/**
 * 📄 知识详情页 —— 展示单条知识完整内容（占位 MVP 实现）。
 */
import { KNOWLEDGE } from "../../data/knowledge";
import type { Knowledge } from "../../types/models";

Page({
  data: {
    item: null as Knowledge | null,
  },

  onLoad(query: Record<string, string>) {
    const id = query.id || "";
    const item = KNOWLEDGE.find((k) => k.id === id) || KNOWLEDGE[0] || null;
    this.setData({ item });
    if (item) {
      wx.setNavigationBarTitle({ title: item.title });
    }
  },
});
