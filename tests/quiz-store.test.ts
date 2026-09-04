/**
 * 挑战最佳成绩持久化测试（Node / vitest，内存存储注入）。
 */
import { describe, expect, it } from "vitest";
import {
  createMemoryStorage,
} from "../miniprogram/services/exploration-store";
import {
  getQuizBest,
  mergeQuizBest,
  saveQuizResult,
  summarizeQuizBest,
  type QuizBestRecord,
} from "../miniprogram/services/quiz-store";

describe("mergeQuizBest（更优者胜，纯函数）", () => {
  const mk = (
    difficulty: number,
    bestCorrect: number,
    bestTotal: number,
    plays = 1,
  ): QuizBestRecord => ({
    difficulty,
    bestCorrect,
    bestTotal,
    bestRate: bestTotal > 0 ? bestCorrect / bestTotal : 0,
    plays,
    updatedAt: 1000,
  });

  it("无旧记录 → 直接成为最佳", () => {
    const merged = mergeQuizBest(undefined, { difficulty: 2, correct: 4, total: 5 });
    expect(merged.bestCorrect).toBe(4);
    expect(merged.bestTotal).toBe(5);
    expect(merged.bestRate).toBeCloseTo(0.8, 5);
    expect(merged.plays).toBe(1);
  });

  it("更高正确率胜出；plays 累加", () => {
    const prev = mk(1, 3, 5); // 60%
    const merged = mergeQuizBest(prev, { difficulty: 1, correct: 5, total: 5 }); // 100%
    expect(merged.bestCorrect).toBe(5);
    expect(merged.bestRate).toBe(1);
    expect(merged.plays).toBe(2);
  });

  it("更低正确率不覆盖最佳，但 plays 仍累加", () => {
    const prev = mk(1, 5, 5); // 100%
    const merged = mergeQuizBest(prev, { difficulty: 1, correct: 2, total: 5 }); // 40%
    expect(merged.bestCorrect).toBe(5);
    expect(merged.bestTotal).toBe(5);
    expect(merged.bestRate).toBe(1);
    expect(merged.plays).toBe(2);
  });

  it("同正确率下正确数更多者胜", () => {
    const prev = mk(1, 2, 2); // 100%（题少）
    const merged = mergeQuizBest(prev, { difficulty: 1, correct: 4, total: 5 }); // 80%
    expect(merged.bestRate).toBe(1);
    expect(merged.bestCorrect).toBe(2);
  });

  it("异常输入（NaN / 负数 / 超界）归一化不崩溃", () => {
    const merged = mergeQuizBest(undefined, { difficulty: NaN, correct: 99, total: 5 });
    expect(merged.bestCorrect).toBe(5); // 鉗制到 total
    expect(merged.difficulty).toBe(0);
    const merged2 = mergeQuizBest(undefined, { difficulty: 1, correct: -3, total: 5 });
    expect(merged2.bestCorrect).toBe(0);
    expect(merged2.bestRate).toBe(0);
  });
});

describe("saveQuizResult / getQuizBest（内存存储）", () => {
  it("按难度隔离保存；读取与写回一致", () => {
    const storage = createMemoryStorage();
    saveQuizResult({ difficulty: 1, correct: 4, total: 5 }, storage);
    saveQuizResult({ difficulty: 2, correct: 2, total: 5 }, storage);
    const best = getQuizBest(storage);
    expect(best[1].bestCorrect).toBe(4);
    expect(best[2].bestCorrect).toBe(2);
    expect(best[3]).toBeUndefined();
  });

  it("更差成绩不覆盖最佳，但 plays 累加", () => {
    const storage = createMemoryStorage();
    saveQuizResult({ difficulty: 1, correct: 5, total: 5 }, storage);
    saveQuizResult({ difficulty: 1, correct: 1, total: 5 }, storage);
    const rec = getQuizBest(storage)[1];
    expect(rec.bestCorrect).toBe(5);
    expect(rec.bestRate).toBe(1);
    expect(rec.plays).toBe(2);
  });

  it("空存储返回空对象", () => {
    expect(getQuizBest(createMemoryStorage())).toEqual({});
  });
});

describe("summarizeQuizBest（我的页汇总，纯函数）", () => {
  it("汇总总次数并按难度升序输出", () => {
    const summary = summarizeQuizBest({
      3: { difficulty: 3, bestCorrect: 2, bestTotal: 5, bestRate: 0.4, plays: 7, updatedAt: 1 },
      1: { difficulty: 1, bestCorrect: 5, bestTotal: 5, bestRate: 1, plays: 2, updatedAt: 2 },
    });
    expect(summary.totalPlays).toBe(9);
    expect(summary.levels.map((l) => l.difficulty)).toEqual([1, 3]);
    expect(summary.levels[0].bestRate).toBe(1);
  });

  it("空 Map → 零次 / 空 levels", () => {
    const summary = summarizeQuizBest({});
    expect(summary.totalPlays).toBe(0);
    expect(summary.levels).toEqual([]);
  });

  it("非法键（0 / 负数 / NaN）被忽略", () => {
    const summary = summarizeQuizBest({
      0: { difficulty: 0, bestCorrect: 1, bestTotal: 2, bestRate: 0.5, plays: 3, updatedAt: 1 },
      2: { difficulty: 2, bestCorrect: 3, bestTotal: 5, bestRate: 0.6, plays: 1, updatedAt: 1 },
    } as Record<number, QuizBestRecord>);
    expect(summary.totalPlays).toBe(1);
    expect(summary.levels).toHaveLength(1);
  });
});
