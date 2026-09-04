/**
 * 🏠 首页 —— 探索场景入口。
 * 从 EXPLORATIONS 注册表动态渲染可选场景；MVP 只有珠峰。
 */
import { EXPLORATIONS } from "../../data/explorations/index";
import { getExplorationStats } from "../../services/exploration-store";
import type { Exploration } from "../../types/exploration";
import { formatNumber } from "../../utils/format";

interface SceneCard {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  maxElevation: number;
  stageCount: number;
  nodeCount: number;
  meta: string;
  badge: string;
}

Page({
  data: {
    scenes: [] as SceneCard[],
    stats: { completed: 0, totalFound: 0 },
    hint: "",
  },

  onShow() {
    const scenes: SceneCard[] = EXPLORATIONS.map((ex: Exploration) => ({
      id: ex.id,
      title: ex.title,
      subtitle: ex.subtitle,
      emoji: ex.emoji,
      maxElevation: ex.maxElevation,
      stageCount: ex.stages.length,
      nodeCount: ex.knowledgeNodes.length,
      meta: `${formatNumber(ex.maxElevation, 2)} m 海拔 · ${ex.stages.length} 个自然带`,
      badge: `知识节点 ×${ex.knowledgeNodes.length}`,
    }));
    this.setData({
      scenes,
      stats: getExplorationStats(),
    });
  },

  onOpenScene(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pages/exploration/index?id=${id}` });
  },
});
