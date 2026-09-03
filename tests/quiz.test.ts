/**
 * Quiz 纯逻辑测试（Node / vitest）。
 */
import { describe, expect, it } from "vitest";
import { QUIZZES } from "../miniprogram/data/quizzes";
import {
  gradeAnswer,
  isCorrectAnswer,
  pickQuizzes,
  scoreAnswers,
  shuffle,
} from "../miniprogram/utils/quiz";

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
    expect(r).toEqual({ quizId: q.id, optionIndex: q.answerIndex, correct: true });
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