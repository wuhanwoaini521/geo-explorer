/**
 * 📖 知识页 —— 地理知识库（完整版）。
 *
 * 全量展示知识库条目，支持分类筛选与关键词搜索；
 * 「已在探索中解锁」联动：探索记录里的知识节点经 knowledgeId 映射点亮对应条目。
 * 筛选/联动均为纯函数（utils/knowledge-link），可在 Node 环境单测。
 */
import { KNOWLEDGE, KNOWLEDGE_CATEGORIES } from "../../data/knowledge";
import { EXPLORATIONS } from "../../data/explorations/index";
import { getRecords } from "../../services/exploration-store";
import {
  filterKnowledge,
  unlockedLibraryIds,
} from "../../utils/knowledge-link";
import type { Knowledge } from "../../types/models";

interface KnowledgeItem extends Knowledge {
  unlocked: boolean;
}

const ALL_CATEGORY = "全部";

Page({
  data: {
    categories: [] as string[],
    activeCategory: ALL_CATEGORY,
    query: "",
    items: [] as KnowledgeItem[],
    total: 0,
    unlockedCount: 0,
    empty: false,
  },

  onShow() {
    this.getTabBar?.()?.setData({ selected: 2 });
    const records = getRecords();
    const unlocked = unlockedLibraryIds(records, EXPLORATIONS);
    const items: KnowledgeItem[] = filterKnowledge(
      KNOWLEDGE,
      this.data.activeCategory,
      this.data.query,
    ).map((k) => ({ ...k, unlocked: unlocked.has(k.id) }));
    this.setData({
      categories: [ALL_CATEGORY, ...KNOWLEDGE_CATEGORIES],
      items,
      total: KNOWLEDGE.length,
      unlockedCount: unlocked.size,
      empty: items.length === 0,
    });
  },

  onCategoryTap(e: PageEvent) {
    const category = String(e.currentTarget?.dataset?.category ?? ALL_CATEGORY);
    this.setData({ activeCategory: category });
    this.applyFilter(category, this.data.query);
  },

  onQueryInput(e: PageEvent) {
    const query = String(e.detail?.value ?? "");
    this.setData({ query });
    this.applyFilter(this.data.activeCategory, query);
  },

  onQueryClear() {
    this.setData({ query: "" });
    this.applyFilter(this.data.activeCategory, "");
  },

  /** 依据当前分类/关键词重算列表（联动解锁状态保持不变） */
  applyFilter(category: string, query: string) {
    const records = getRecords();
    const unlocked = unlockedLibraryIds(records, EXPLORATIONS);
    const items: KnowledgeItem[] = filterKnowledge(
      KNOWLEDGE,
      category,
      query,
    ).map((k) => ({ ...k, unlocked: unlocked.has(k.id) }));
    this.setData({ items, empty: items.length === 0 });
  },

  onOpen(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pages/knowledge-detail/index?id=${id}` });
  },
});
