/**
 * 挑战（Quiz）最佳成绩 —— 小型持久化层。
 * 按难度分别记录最佳成绩：正确率优先，其次正确数；另计挑战次数。
 * 存储实现可注入（与 exploration-store 同一套 StorageLike 抽象），
 * Node 环境（vitest）可直接单测；后续切服务端只需替换默认实现。
 */
import { defaultStorage, type StorageLike } from "./exploration-store";

/** 单个难度的最佳成绩记录 */
export interface QuizBestRecord {
  /** 难度 1-3 */
  difficulty: number;
  /** 最佳正确数 */
  bestCorrect: number;
  /** 对应总题数 */
  bestTotal: number;
  /** 最佳正确率 0-1（保留两位以内） */
  bestRate: number;
  /** 累计挑战次数 */
  plays: number;
  /** 最近更新时间戳（ms） */
  updatedAt: number;
}

const STORAGE_KEY = "geoexplorer.quiz.best.v1";

export type QuizBestMap = Record<number, QuizBestRecord>;

/* ---------------- 归一化 ---------------- */

function normalizeRecord(raw: Partial<QuizBestRecord>): QuizBestRecord {
  const bestTotal = Math.max(0, Number(raw.bestTotal) || 0);
  const bestCorrect = Math.min(
    bestTotal,
    Math.max(0, Number(raw.bestCorrect) || 0),
  );
  return {
    difficulty: Number(raw.difficulty) || 0,
    bestCorrect,
    bestTotal,
    bestRate: bestTotal > 0 ? bestCorrect / bestTotal : 0,
    plays: Math.max(0, Number(raw.plays) || 0),
    updatedAt: Number(raw.updatedAt) || 0,
  };
}

/* ---------------- 纯合并逻辑（可单测） ---------------- */

/**
 * “更优者胜”：正确率更高者胜；同率之下正确数更多者胜。
 * plays 永远累加。
 */
export function mergeQuizBest(
  prev: QuizBestRecord | undefined,
  next: { difficulty: number; correct: number; total: number },
): QuizBestRecord {
  const incoming = normalizeRecord({
    difficulty: next.difficulty,
    bestCorrect: next.correct,
    bestTotal: next.total,
    plays: 1,
    updatedAt: Date.now(),
  });
  if (!prev) return incoming;
  const prevWins =
    prev.bestRate > incoming.bestRate ||
    (prev.bestRate === incoming.bestRate &&
      prev.bestCorrect >= incoming.bestCorrect);
  return {
    ...incoming,
    bestCorrect: prevWins ? prev.bestCorrect : incoming.bestCorrect,
    bestTotal: prevWins ? prev.bestTotal : incoming.bestTotal,
    bestRate: prevWins ? prev.bestRate : incoming.bestRate,
    plays: prev.plays + 1,
    updatedAt: Math.max(prev.updatedAt, incoming.updatedAt),
  };
}

/* ---------------- 读取 / 写入 ---------------- */

function readAll(storage: StorageLike): QuizBestMap {
  const raw = storage.get<QuizBestMap>(STORAGE_KEY);
  if (!raw || typeof raw !== "object") return {};
  const out: QuizBestMap = {};
  for (const key of Object.keys(raw)) {
    const difficulty = Number(key);
    if (!difficulty) continue;
    out[difficulty] = normalizeRecord(raw[difficulty]);
  }
  return out;
}

export interface QuizResultInput {
  difficulty: number;
  correct: number;
  total: number;
}

/** 记录一次挑战成绩（内部合并最佳，返回该难度最新记录） */
export function saveQuizResult(
  input: QuizResultInput,
  storage: StorageLike = defaultStorage(),
): QuizBestRecord {
  const all = readAll(storage);
  const merged = mergeQuizBest(all[input.difficulty], input);
  all[input.difficulty] = merged;
  storage.set(STORAGE_KEY, all);
  return merged;
}

/** 读取全部难度的最佳成绩（无记录的难度不出现在结果里） */
export function getQuizBest(
  storage: StorageLike = defaultStorage(),
): QuizBestMap {
  return readAll(storage);
}

/* ---------------- 汇总（纯函数，供「我的」页展示） ---------------- */

export interface QuizSummaryLevel {
  difficulty: number;
  /** 「最佳 x/y · z%」文案（由页面拼装前先给原始值） */
  bestCorrect: number;
  bestTotal: number;
  bestRate: number;
  plays: number;
}

export interface QuizSummary {
  /** 累计挑战次数（所有难度之和） */
  totalPlays: number;
  /** 有记录的难度（按难度升序） */
  levels: QuizSummaryLevel[];
}

/**
 * 由最佳成绩 Map 汇总出「我的」页展示数据。
 * 纯函数：只读入参，不落盘。
 */
export function summarizeQuizBest(best: QuizBestMap): QuizSummary {
  const levels: QuizSummaryLevel[] = Object.keys(best)
    .map(Number)
    .filter((d) => d > 0 && best[d])
    .sort((a, b) => a - b)
    .map((difficulty) => {
      const rec = best[difficulty];
      return {
        difficulty,
        bestCorrect: rec.bestCorrect,
        bestTotal: rec.bestTotal,
        bestRate: rec.bestRate,
        plays: rec.plays,
      };
    });
  return {
    totalPlays: levels.reduce((sum, l) => sum + l.plays, 0),
    levels,
  };
}
