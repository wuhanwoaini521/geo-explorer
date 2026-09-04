/**
 * 🎯 挑战页 —— 地理挑战完整模式。
 *
 * 流程：选择难度（★~★★★）→ 随机抽 5 题（优先该难度，不足补齐）
 * → 逐题作答（即时判分 + 解析，不可回退）→ 结算（星级/正确率/最佳成绩）。
 * 最佳成绩按难度落盘（quiz-store，更优者胜），抽题/计分为纯函数（utils/quiz）。
 */
import { QUIZZES } from "../../data/quizzes";
import {
  pickQuizzesByDifficulty,
  rateStars,
  scoreAnswers,
  type AnswerResult,
} from "../../utils/quiz";
import {
  getQuizBest,
  saveQuizResult,
} from "../../services/quiz-store";
import type { Quiz } from "../../types/models";

const QUESTIONS_PER_RUN = 5;

interface LevelCard {
  id: number;
  stars: string;
  label: string;
  bestText: string;
  plays: number;
}

/** 渲染中的单题（题干/选项 + 作答状态） */
interface PlayState {
  index: number; // 0-based
  total: number;
  question: string;
  emoji: string;
  options: string[];
  selected: number;
  correct: boolean;
  revealed: boolean;
  explanation: string;
}

interface ResultState {
  correct: number;
  total: number;
  pct: number;
  stars: number;
  isRecord: boolean;
  bestText: string;
}

Page({
  data: {
    count: 0,
    phase: "idle" as "idle" | "play" | "result",
    levels: [] as LevelCard[],
    play: null as PlayState | null,
    result: null as ResultState | null,
  },

  // 内部状态（不参与渲染）
  difficulty: 1,
  quizzes: [] as Quiz[],
  answers: [] as AnswerResult[],

  onShow() {
    this.refreshIdle();
  },

  /* ---------------- 首页（难度选择） ---------------- */

  refreshIdle() {
    const best = getQuizBest();
    const levels: LevelCard[] = [1, 2, 3].map((id) => {
      const rec = best[id];
      return {
        id,
        stars: "★".repeat(id),
        label: id === 1 ? "入门" : id === 2 ? "进阶" : "达人",
        bestText: rec
          ? `最佳 ${rec.bestCorrect}/${rec.bestTotal} · ${Math.round(rec.bestRate * 100)}%`
          : "暂无记录",
        plays: rec ? rec.plays : 0,
      };
    });
    this.setData({
      count: QUIZZES.length,
      phase: "idle",
      levels,
      play: null,
      result: null,
    });
  },

  onStart(e: PageEvent) {
    const id = Number(e.currentTarget?.dataset?.level ?? 0);
    this.startRun(id >= 1 && id <= 3 ? id : 1);
  },

  startRun(difficulty: number) {
    const picked = pickQuizzesByDifficulty(QUIZZES, QUESTIONS_PER_RUN, difficulty);
    if (!picked.length) {
      wx.showToast({ title: "题库为空", icon: "none" });
      return;
    }
    this.difficulty = difficulty;
    this.quizzes = picked;
    this.answers = [];
    this.setData({ phase: "play", result: null });
    this.renderQuestion(0);
  },

  /* ---------------- 答题 ---------------- */

  renderQuestion(index: number) {
    const q = this.quizzes[index];
    if (!q) return this.finishRun();
    this.setData({
      play: {
        index,
        total: this.quizzes.length,
        question: q.question,
        emoji: q.emoji,
        options: q.options,
        selected: -1,
        correct: false,
        revealed: false,
        explanation: q.explanation,
      },
    });
  },

  onPick(e: PageEvent) {
    const play = this.data.play;
    if (!play || play.revealed) return;
    const q = this.quizzes[play.index];
    const index = Number(e.currentTarget?.dataset?.index ?? -1);
    if (!q || index < 0 || index >= q.options.length) return;
    const correct = index === q.answerIndex;
    this.answers.push({ quizId: q.id, optionIndex: index, correct });
    this.setData({
      play: { ...play, selected: index, correct, revealed: true },
    });
  },

  onNext() {
    const play = this.data.play;
    if (!play) return;
    if (play.index + 1 >= this.quizzes.length) {
      this.finishRun();
    } else {
      this.renderQuestion(play.index + 1);
    }
  },

  /* ---------------- 结算 ---------------- */

  finishRun() {
    const score = scoreAnswers(this.answers);
    const before = getQuizBest()[this.difficulty];
    const after = saveQuizResult({
      difficulty: this.difficulty,
      correct: score.correct,
      total: score.total,
    });
    // 是否刷新纪录：以保存前的旧纪录为基准（同率比正确数）
    const isRecord =
      score.total > 0 &&
      (!before ||
        score.rate > before.bestRate ||
        (score.rate === before.bestRate && score.correct > before.bestCorrect));
    const pct = Math.round(score.rate * 100);
    this.setData({
      phase: "result",
      play: null,
      result: {
        correct: score.correct,
        total: score.total,
        pct,
        stars: rateStars(score.rate),
        isRecord,
        bestText: `最佳 ${after.bestCorrect}/${after.bestTotal} · ${Math.round(after.bestRate * 100)}%`,
      },
    });
  },

  onRetry() {
    this.startRun(this.difficulty);
  },

  onBackIdle() {
    this.refreshIdle();
  },
});
