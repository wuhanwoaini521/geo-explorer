/**
 * 👤 我的页 —— 探索记录与统计（MVP：本地存储数据）。
 */
import {
  getExplorationStats,
  getRecords,
} from "../../services/exploration-store";
import { EXPLORATIONS } from "../../data/explorations/index";
import type { ExplorationRecord } from "../../services/exploration-store";

interface RecordItem {
  id: string;
  emoji: string;
  title: string;
  completed: boolean;
  reachElevation: number;
  maxElevation: number;
  unitText: string;
  knowledgeCount: number;
  pct: number;
}

Page({
  data: {
    stats: { completed: 0, totalFound: 0 },
    records: [] as RecordItem[],
    empty: false,
  },

  onShow() {
    const records: RecordItem[] = getRecords().map((r: ExplorationRecord) => {
      const ex = EXPLORATIONS.find((e) => e.id === r.id);
      return {
        id: r.id,
        emoji: r.emoji,
        title: r.title,
        completed: r.completed,
        reachElevation: r.reachElevation,
        maxElevation: r.maxElevation,
        unitText: ex?.ui?.axisUnit ?? "m",
        knowledgeCount: r.knowledgeIds.length,
        pct: Math.round((r.reachElevation / r.maxElevation) * 100),
      };
    });
    this.setData({
      stats: getExplorationStats(),
      records,
      empty: records.length === 0,
    });
  },

  onClear() {
    wx.showModal({
      title: "清空探索记录",
      content: "将删除本地保存的全部进度记录，确定？",
      confirmText: "清空",
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          this.onShow();
        }
      },
    });
  },
});
