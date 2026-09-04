/**
 * Quiz 纯逻辑测试（Node / vitest）。
 */
import { describe, expect, it } from "vitest";
import { QUIZZES } from "../miniprogram/data/quizzes";
import {
  gradeAnswer,
  isCorrectAnswer,
  pickQuizzes,
  pickQuizzesByDifficulty,
  rateStars,
  scoreAnswers,
  shuffle,
} from "../miniprogram/utils/quiz";

describe("pickQuizzesByDifficulty（按难度抽题）", () => {
  it("难度题充足时只抽该难度", () => {
    const d2 = QUIZZES.filter((q) => q.difficulty === 2);
    expect(d2.length).toBeGreaterThanOrEqual(5);
    const picked = pickQuizzesByDifficulty(QUIZZES, 5, 2);
    expect(picked).toHaveLength(5);
    expect(picked.every((q) => q.difficulty === 2)).toBe(true);
  });

  it("难度题不足时用其他难度补齐到 count", () => {
    const d3 = QUIZZES.filter((q) => q.difficulty === 3);
    expect(d3.length).toBeLessThan(8);
    const picked = pickQuizzesByDifficulty(QUIZZES, 8, 3);
    expect(picked).toHaveLength(8);
    expect(picked.filter((q) => q.difficulty === 3)).toHaveLength(d3.length);
    expect(new Set(picked.map((q) => q.id)).size).toBe(8); // 不重复
  });

  it("难度不存在 / 未指定时退化为普通抽题", () => {
    const picked = pickQuizzesByDifficulty(QUIZZES, 4, 99);
    expect(picked).toHaveLength(4);
    const plain = pickQuizzesByDifficulty(QUIZZES, 4);
    expect(plain).toHaveLength(4);
  });

  it("count<=0 或空题库返回空", () => {
    expect(pickQuizzesByDifficulty(QUIZZES, 0, 1)).toHaveLength(0);
    expect(pickQuizzesByDifficulty([], 3, 1)).toHaveLength(0);
  });
});

describe("rateStars（正确率→星级）", () => {
  it("阈值：≥80% 三星 / ≥60% 两星 / >0 一星 / 0 无星", () => {
    expect(rateStars(1)).toBe(3);
    expect(rateStars(0.8)).toBe(3);
    expect(rateStars(0.79)).toBe(2);
    expect(rateStars(0.6)).toBe(2);
    expect(rateStars(0.2)).toBe(1);
    expect(rateStars(0)).toBe(0);
  });
});

describe("pickQuizzes（抽题）", () => {
  it("抽取数量正确且不越界", () => {
    const picked = pickQuizzes(QUIZZES, 5);
    expect(picked).toHaveLength(5);
    const tooMany = pickQuizzes(QUIZZES, 9999);
    expect(tooMany).toHaveLength(QUIZZES.length);
  });

  it("抽出的题不重复（id 唯一）", () => {
    const picked = pickQuizzes(QUIZZES, 8);
    const ids = picked.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("count<=0 或空题库返回空", () => {
    expect(pickQuizzes(QUIZZES, 0)).toHaveLength(0);
    expect(pickQuizzes([], 3)).toHaveLength(0);
  });

  it("shuffle 打乱顺序但保留元素", () => {
    const rng = () => 0.42;
    const list = [1, 2, 3, 4, 5];
    const s = shuffle(list, rng);
    expect([...s].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("批改与计分", () => {
  it("isCorrectAnswer 正误判定", () => {
    const q = QUIZZES[0];
    expect(isCorrectAnswer(q, q.answerIndex)).toBe(true);
    const wrong = (q.answerIndex + 1) % q.options.length;
    expect(isCorrectAnswer(q, wrong)).toBe(false);
  });

  it("gradeAnswer 产出标准化结果", () => {
    const q = QUIZZES[1];
    const r = gradeAnswer(q, q.answerIndex);
    expect(r).toEqual({
      quizId: q.id,
      optionIndex: q.answerIndex,
      correct: true,
    });
  });

  it("scoreAnswers 正确率", () => {
    const s = scoreAnswers([
      { quizId: "a", optionIndex: 0, correct: true },
      { quizId: "b", optionIndex: 1, correct: false },
      { quizId: "c", optionIndex: 2, correct: true },
    ]);
    expect(s.total).toBe(3);
    expect(s.correct).toBe(2);
    expect(s.rate).toBeCloseTo(2 / 3, 5);
  });

  it("空答题集 rate=0", () => {
    expect(scoreAnswers([]).rate).toBe(0);
  });
});
