/**
 * 📖 知识页 —— 可浏览、可搜索、可从探索回到理解的地理知识库。
 * 列表不再绑定少量固定栏目；分类和内容都从真实数据动态派生。
 */
import { KNOWLEDGE, KNOWLEDGE_CATEGORIES } from "../../data/knowledge";
import { KNOWLEDGE_PROCESSES } from "../../data/processes";
import { EXPLORATIONS } from "../../data/explorations/index";
import { getRecords } from "../../services/exploration-store";
import { filterKnowledge, unlockedLibraryIds } from "../../utils/knowledge-link";
import { knowledgeImage } from "../../utils/knowledge-media";
import type { Knowledge } from "../../types/models";

interface KnowledgeItem extends Knowledge {
  unlocked: boolean;
  image: string;
}

interface ProcessCard {
  id: string;
  topicId: string;
  kicker: string;
  title: string;
  question: string;
  summary: string;
  stepsText: string;
  image: string;
  /** 无配图时的占位（与该知识条目一致），避免流程卡出现空白块。 */
  emoji: string;
}

const ALL_CATEGORY = "全部";

// 知识配图解析见 utils/knowledge-media.ts（列表页与详情页共用，避免两处维护同一份映射）。

Page({
  data: {
    categories: [ALL_CATEGORY, ...KNOWLEDGE_CATEGORIES],
    activeCategory: ALL_CATEGORY,
    // 保留 activeTab 字段兼容现有调用与测试，实际筛选使用动态分类。
    activeTab: ALL_CATEGORY,
    query: "",
    items: [] as KnowledgeItem[],
    processCards: [] as ProcessCard[],
    total: KNOWLEDGE.length,
    unlockedCount: 0,
    processCount: KNOWLEDGE_PROCESSES.length,
    empty: false,
    failedImages: {} as Record<string, boolean>,
  },

  onShow() {
    this.getTabBar?.()?.setData({ selected: 2 });
    this.getTabBar?.()?.setData({ hidden: false });
    this.refresh();
  },

  refresh() {
    const unlocked = unlockedLibraryIds(getRecords(), EXPLORATIONS);
    const items = this.filterForTab(this.data.activeCategory, this.data.query, unlocked);
    const processCards = KNOWLEDGE_PROCESSES.map((process) => {
      const topic =
        KNOWLEDGE.find((item) => item.id === process.topicId) || KNOWLEDGE[0];
      return {
        id: process.id,
        topicId: process.topicId,
        kicker: process.kicker,
        title: process.title,
        question: process.question,
        summary: process.summary,
        stepsText: `${process.steps.length} 个渐进步骤`,
        image: knowledgeImage(topic),
        emoji: topic.emoji,
      };
    });
    this.setData({ items, processCards, total: KNOWLEDGE.length, unlockedCount: unlocked.size, empty: items.length === 0 });
  },

  onCategoryTap(e: PageEvent) {
    const category = String(e.currentTarget?.dataset?.category ?? ALL_CATEGORY);
    this.setData({ activeCategory: category, activeTab: category });
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

  applyFilter(category: string, query: string) {
    const unlocked = unlockedLibraryIds(getRecords(), EXPLORATIONS);
    const items = this.filterForTab(category, query, unlocked);
    this.setData({ items, empty: items.length === 0 });
  },

  filterForTab(category: string, query: string, unlocked: Set<string>): KnowledgeItem[] {
    return filterKnowledge(KNOWLEDGE, category, query).map((item) => ({
      ...item,
      unlocked: unlocked.has(item.id),
      image: knowledgeImage(item),
    }));
  },

  onOpen(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (id) wx.navigateTo({ url: `/pages/knowledge-detail/index?id=${id}` });
  },

  onOpenProcess(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    const process = KNOWLEDGE_PROCESSES.find((item) => item.id === id);
    if (process) wx.navigateTo({ url: `/pages/knowledge-detail/index?id=${process.topicId}&process=${process.id}` });
  },

  onImageError(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (id) this.setData({ [`failedImages.${id}`]: true } as Record<string, unknown>);
  },

  onBack() {
    wx.switchTab({ url: "/pages/home/index" });
  },
});
