/**
 * 📖 知识页 —— 可浏览、可搜索、可从探索回到理解的地理知识库。
 * 列表不再绑定少量固定栏目；分类和内容都从真实数据动态派生。
 */
import { KNOWLEDGE, KNOWLEDGE_CATEGORIES } from "../../data/knowledge";
import { KNOWLEDGE_PROCESSES } from "../../data/processes";
import { EXPLORATIONS } from "../../data/explorations/index";
import { getRecords } from "../../services/exploration-store";
import { filterKnowledge, unlockedLibraryIds } from "../../utils/knowledge-link";
import { featuredKnowledgeImage, knowledgeAtlasImage, knowledgeImage } from "../../utils/knowledge-media";
import type { Knowledge } from "../../types/models";
import { getReadKnowledgeIds } from "../../services/knowledge-progress";
import { getQuizAttemptHistory } from "../../services/quiz-store";
import { getHeaderTopOffset } from "../../utils/layout";
import { QUIZZES } from "../../data/quizzes";
import { VISUAL_LANDFORM_QUIZZES } from "../../data/visual-challenges";
import { WebGLGlobeRenderer } from "../../engine/webgl-globe-renderer";

let knowledgeGlobeRenderer: WebGLGlobeRenderer | null = null;

interface KnowledgeItem extends Knowledge {
  unlocked: boolean;
  image: string;
}

interface AtlasNode {
  id: string;
  label: string;
  topicId: string;
  status: "locked" | "available" | "learned" | "mastered";
  statusLabel: string;
  image: string;
  masteryQuizIds: readonly string[];
  x: number;
  y: number;
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
const ATLAS_NODE_CONFIG = [
  { id: "atmosphere", label: "大气", topicId: "k01", worldIds: ["everest", "fuji"], masteryQuizIds: ["q06", "q07"], x: 50, y: 13 },
  { id: "hydrology", label: "水文", topicId: "k13", worldIds: ["colorado"], masteryQuizIds: ["q11", "q15"], x: 80, y: 29 },
  { id: "mountain", label: "山脉", topicId: "k03", worldIds: ["everest"], masteryQuizIds: ["q09", "q18"], x: 83, y: 53 },
  { id: "glacier", label: "冰川", topicId: "k08", worldIds: ["everest"], masteryQuizIds: ["q20", "photo-icefall"], x: 69, y: 79 },
  { id: "geology", label: "地质", topicId: "k06", worldIds: ["colorado"], masteryQuizIds: ["q15", "q23"], x: 31, y: 79 },
  { id: "volcano", label: "火山", topicId: "k36", worldIds: ["fuji"], masteryQuizIds: ["q21"], x: 17, y: 53 },
  { id: "ecology", label: "生态", topicId: "k12", worldIds: ["everest", "fuji"], masteryQuizIds: ["q19"], x: 20, y: 29 },
  { id: "ocean", label: "海洋", topicId: "k11", worldIds: ["mariana"], masteryQuizIds: ["q05", "q17"], x: 50, y: 87 },
] as const;

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
    nodes: [] as AtlasNode[],
    featuredItems: [] as KnowledgeItem[],
    headerTop: 12,
    scrollTop: 175,
    earthFailed: false,
  },

  onReady() {
    this.initKnowledgeEarth();
  },

  onShow() {
    this.getTabBar?.()?.setData({ selected: 2 });
    this.getTabBar?.()?.setData({ hidden: false });
    this.getTabBar?.()?.setData({ theme: "dark" });
    const headerTop = getHeaderTopOffset();
    this.setData({ headerTop, scrollTop: headerTop + 114 });
    this.refresh();
    knowledgeGlobeRenderer?.resumeRotation();
  },

  onHide() {
    knowledgeGlobeRenderer?.pauseRotation();
  },

  onUnload() {
    knowledgeGlobeRenderer?.dispose();
    knowledgeGlobeRenderer = null;
  },

  onResize() {
    knowledgeGlobeRenderer?.dispose();
    knowledgeGlobeRenderer = null;
    this.setData({ earthFailed: false }, () => this.initKnowledgeEarth());
  },

  initKnowledgeEarth() {
    wx.createSelectorQuery()
      .select("#knowledgeEarthCanvas")
      .fields({ node: true, size: true })
      .exec((result) => {
        const canvasInfo = result[0] as { node?: unknown; width?: number; height?: number } | undefined;
        if (!canvasInfo?.node || !canvasInfo.width || !canvasInfo.height) {
          this.setData({ earthFailed: true });
          return;
        }
        try {
          knowledgeGlobeRenderer?.dispose();
          const system = wx.getSystemInfoSync();
          knowledgeGlobeRenderer = new WebGLGlobeRenderer(
            canvasInfo.node as unknown as ConstructorParameters<typeof WebGLGlobeRenderer>[0],
            canvasInfo.width,
            canvasInfo.height,
            system.pixelRatio,
            "half",
            { bumpEnabled: true, atmosphereEnabled: true, bumpScale: 0.78, atmosphereStrength: 0.3 },
          );
          knowledgeGlobeRenderer.pauseRotation();
        } catch {
          knowledgeGlobeRenderer = null;
          this.setData({ earthFailed: true });
        }
      });
  },

  refresh() {
    const unlocked = unlockedLibraryIds(getRecords(), EXPLORATIONS);
    const items = this.filterForTab(this.data.activeCategory, this.data.query, unlocked);
    const reads = getReadKnowledgeIds();
    const exploredWorlds = new Set(getRecords().map((record) => record.id));
    const quizHistory = getQuizAttemptHistory();
    const correctIds = new Set(quizHistory.flatMap((attempt) => attempt.correctQuestionIds));
    const masteryQuizIds = new Set([...QUIZZES, ...VISUAL_LANDFORM_QUIZZES].map((quiz) => quiz.id));
    const nodes: AtlasNode[] = ATLAS_NODE_CONFIG.map((config) => {
      const topic = KNOWLEDGE.find((item) => item.id === config.topicId);
      const read = reads.has(config.topicId);
      const relevantQuizIds = config.masteryQuizIds.filter((id) => masteryQuizIds.has(id));
      const mastered = read && relevantQuizIds.length > 0 && relevantQuizIds.every((id) => correctIds.has(id));
      const status: AtlasNode["status"] = !topic
        ? "locked"
        : mastered ? "mastered"
          : read ? "learned"
            : config.worldIds.some((worldId) => exploredWorlds.has(worldId)) || unlocked.has(config.topicId) ? "available" : "locked";
      return {
        id: config.id,
        label: config.label,
        topicId: config.topicId,
        status,
        statusLabel: status === "mastered" ? "已掌握" : status === "learned" ? "已学会" : status === "available" ? "可学习" : "待探索",
        image: topic ? knowledgeAtlasImage(config.id) : "",
        masteryQuizIds: relevantQuizIds,
        x: config.x,
        y: config.y,
      };
    });
    const featuredItems = ["k03", "k08", "k11"]
      .map((id) => KNOWLEDGE.find((item) => item.id === id))
      .filter((item): item is Knowledge => Boolean(item))
      .map((item) => ({ ...item, unlocked: unlocked.has(item.id), image: featuredKnowledgeImage(item) }));
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
    this.setData({ items, processCards, featuredItems, nodes, total: KNOWLEDGE.length, unlockedCount: unlocked.size, empty: items.length === 0 });
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
    if (id) wx.navigateTo({ url: `/pkg-detail/pages/knowledge-detail/index?id=${id}` });
  },

  onOpenProcess(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    const process = KNOWLEDGE_PROCESSES.find((item) => item.id === id);
    if (process) wx.navigateTo({ url: `/pkg-detail/pages/knowledge-detail/index?id=${process.topicId}&process=${process.id}` });
  },

  onImageError(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (id) this.setData({ [`failedImages.${id}`]: true } as Record<string, unknown>);
  },

  onBack() {
    wx.switchTab({ url: "/pages/map/index" });
  },

  onOpenNode(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.topicId ?? "");
    if (id) wx.navigateTo({ url: `/pkg-detail/pages/knowledge-detail/index?id=${id}` });
  },
});
