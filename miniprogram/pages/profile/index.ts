/**
 * 👤 我的页 —— 探索记录与统计（MVP：本地存储数据）。
 * 挑战统计来自 quiz-store（按难度最佳成绩 + 累计次数）。
 */
import {
  getExplorationStats,
  getRecords,
} from "../../services/exploration-store";
import {
  getQuizBest,
  summarizeQuizBest,
  type QuizSummaryLevel,
} from "../../services/quiz-store";
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

/** 难度星级文案（与挑战页 ★~★★★ 对应） */
function difficultyStars(d: number): string {
  if (d <= 1) return "★";
  if (d === 2) return "★★";
  return "★★★";
}

Page({
  data: {
    stats: { completed: 0, totalFound: 0 },
    records: [] as RecordItem[],
    empty: false,
    quiz: { totalPlays: 0, levels: [] as (QuizSummaryLevel & { stars: string; bestText: string })[] },
    quizEmpty: true,
  },

  onShow() {
    this.getTabBar?.()?.setData({ selected: 4 });
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
    const best = getQuizBest();
    const summary = summarizeQuizBest(best);
    const quizLevels = summary.levels.map((l) => ({
      ...l,
      stars: difficultyStars(l.difficulty),
      bestText: `最佳 ${l.bestCorrect}/${l.bestTotal} · ${Math.round(l.bestRate * 100)}%`,
    }));
    this.setData({
      stats: getExplorationStats(),
      records,
      empty: records.length === 0,
      quiz: { totalPlays: summary.totalPlays, levels: quizLevels },
      quizEmpty: quizLevels.length === 0,
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
