/**
 * 📖 知识页 —— 地理知识库（完整版）。
 *
 * 全量展示知识库条目，支持分类筛选与关键词搜索；
 * 「已在探索中解锁」联动：探索记录里的知识节点经 knowledgeId 映射点亮对应条目。
 * 筛选/联动均为纯函数（utils/knowledge-link），可在 Node 环境单测。
 */
import { KNOWLEDGE } from "../../data/knowledge";
import { EXPLORATIONS } from "../../data/explorations/index";
import { getRecords } from "../../services/exploration-store";
import {
  filterKnowledge,
  unlockedLibraryIds,
} from "../../utils/knowledge-link";
import type { Knowledge } from "../../types/models";

interface KnowledgeItem extends Knowledge {
  unlocked: boolean;
  image: string;
}

const ALL_CATEGORY = "全部";
const TABS = ["地质成因", "生态环境", "人文历史", "延伸阅读"];
const TAB_IDS: Record<string, string[]> = {
  "地质成因": ["k03", "k08"],
  "生态环境": ["k01", "k04", "k07"],
  "人文历史": ["k31", "k32"],
  "延伸阅读": ["k02", "k09"],
};

function knowledgeImage(item: Knowledge): string {
  if (item.id === "k31") return "/assets/world/everest-history-1953.png";
  if (item.id === "k32") return "/assets/world/everest-climb-modern.png";
  if (item.relatedPlaceIds.includes("p-everest")) return "/assets/expeditions/everest/live/live-a-kala-patthar.jpg";
  if (item.relatedPlaceIds.includes("p-fuji")) return "/assets/world/fuji-card.png";
  if (item.relatedPlaceIds.includes("p-colorado")) return "/assets/world/grand-canyon-card.png";
  if (item.relatedPlaceIds.includes("p-mariana")) return "/assets/world/mariana-card.png";
  return "/assets/world/everest-expedition-hero-v1.png";
}

Page({
  data: {
    categories: TABS,
    activeCategory: ALL_CATEGORY,
    activeTab: "人文历史",
    query: "",
    items: [] as KnowledgeItem[],
    total: 0,
    unlockedCount: 0,
    empty: false,
    failedImages: {} as Record<string, boolean>,
  },

  onShow() {
    this.getTabBar?.()?.setData({ selected: 2 });
    this.getTabBar?.()?.setData({ hidden: true });
    const records = getRecords();
    const unlocked = unlockedLibraryIds(records, EXPLORATIONS);
    const items = this.filterForTab(this.data.activeTab, this.data.query, unlocked);
    this.setData({
      items,
      total: KNOWLEDGE.length,
      unlockedCount: unlocked.size,
      empty: items.length === 0,
    });
  },

  onCategoryTap(e: PageEvent) {
    const tab = String(e.currentTarget?.dataset?.category ?? "人文历史");
    this.setData({ activeTab: tab });
    this.applyFilter(tab, this.data.query);
  },

  onQueryInput(e: PageEvent) {
    const query = String(e.detail?.value ?? "");
    this.setData({ query });
    this.applyFilter(this.data.activeTab, query);
  },

  onQueryClear() {
    this.setData({ query: "" });
    this.applyFilter(this.data.activeTab, "");
  },

  /** 依据当前分类/关键词重算列表（联动解锁状态保持不变） */
  applyFilter(category: string, query: string) {
    const records = getRecords();
    const unlocked = unlockedLibraryIds(records, EXPLORATIONS);
    const items = this.filterForTab(category, query, unlocked);
    this.setData({ items, empty: items.length === 0 });
  },

  filterForTab(tab: string, query: string, unlocked: Set<string>): KnowledgeItem[] {
    const ids = TAB_IDS[tab] || [];
    const source = ids.length
      ? ids.map((id) => KNOWLEDGE.find((item) => item.id === id)).filter((item): item is Knowledge => Boolean(item))
      : KNOWLEDGE;
    return filterKnowledge(source, ALL_CATEGORY, query).slice(0, 8).map((k) => ({
      ...k,
      unlocked: unlocked.has(k.id),
      image: knowledgeImage(k),
    }));
  },

  onOpen(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pages/knowledge-detail/index?id=${id}` });
  },

  onImageError(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (id) this.setData({ [`failedImages.${id}`]: true } as Record<string, unknown>);
  },

  onBack() {
    wx.switchTab({ url: "/pages/home/index" });
  },
});
