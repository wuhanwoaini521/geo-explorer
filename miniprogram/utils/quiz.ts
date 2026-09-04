/**
 * Quiz 纯逻辑（可在 Node 单测）：抽题、批改、计分。
 * 与页面解耦 —— 页面只负责渲染题干与收集选择。
 */
import type { Quiz } from "../types/models";

/** Fisher–Yates 洗牌（纯函数，可注入 rng 便于测试） */
export function shuffle<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/** 从题库随机抽取 count 道题（不重复；超出则取全部） */
export function pickQuizzes(
  quizzes: readonly Quiz[],
  count: number,
  random: () => number = Math.random,
): Quiz[] {
  if (count <= 0 || quizzes.length === 0) return [];
  return shuffle(quizzes, random).slice(0, Math.min(count, quizzes.length));
}

/**
 * 按难度抽题：优先从指定难度的题目中抽；不足 count 时用其他难度补齐。
 * difficulty 缺省 / 题库为空时退化为普通抽题。
 */
export function pickQuizzesByDifficulty(
  quizzes: readonly Quiz[],
  count: number,
  difficulty?: number,
  random: () => number = Math.random,
): Quiz[] {
  if (count <= 0 || quizzes.length === 0) return [];
  if (difficulty === undefined) return pickQuizzes(quizzes, count, random);
  const matched = quizzes.filter((q) => q.difficulty === difficulty);
  if (matched.length === 0) return pickQuizzes(quizzes, count, random);
  if (matched.length >= count) return pickQuizzes(matched, count, random);
  const rest = quizzes.filter((q) => q.difficulty !== difficulty);
  return [...pickQuizzes(matched, matched.length, random), ...pickQuizzes(rest, count - matched.length, random)];
}

/** 判断某选项是否正确答案 */
export function isCorrectAnswer(quiz: Quiz, selectedIndex: number): boolean {
  return selectedIndex === quiz.answerIndex;
}

export interface AnswerResult {
  quizId: string;
  optionIndex: number;
  correct: boolean;
}

/** 判断一次选择，产出标准化结果 */
export function gradeAnswer(quiz: Quiz, optionIndex: number): AnswerResult {
  return {
    quizId: quiz.id,
    optionIndex,
    correct: isCorrectAnswer(quiz, optionIndex),
  };
}

export interface QuizScore {
  total: number;
  correct: number;
  /** 正确率 0-1 */
  rate: number;
}

/** 对一组作答计分 */
export function scoreAnswers(answers: readonly AnswerResult[]): QuizScore {
  const correct = answers.filter((a) => a.correct).length;
  return {
    total: answers.length,
    correct,
    rate: answers.length === 0 ? 0 : correct / answers.length,
  };
}

/** 成绩文案等级（结算页用）：≥80% 三星 / ≥60% 两星 / >0 一星 / 未答无星 */
export function rateStars(rate: number): number {
  if (rate >= 0.8) return 3;
  if (rate >= 0.6) return 2;
  if (rate > 0) return 1;
  return 0;
}
