/**
 * 探索进度 / 完成记录 —— 小型持久化层。
 * 封装 wx 本地存储（StorageLike），页面 / 服务只调用纯函数接口；
 * 存储实现可注入，从而在 Node 环境（vitest）中直接单测持久化逻辑。
 * 后续切换服务端 API 时只需替换默认 storage 实现。
 */
import type { Exploration } from "../types/exploration";

/** 最小存储抽象（wx 或 Node 内存均可实现） */
export interface StorageLike {
  get<T = unknown>(key: string): T | undefined;
  set(key: string, data: unknown): void;
}

export interface ExplorationRecord {
  id: string;
  title: string;
  emoji: string;
  /** 最高到达海拔（m） */
  reachElevation: number;
  maxElevation: number;
  /** 是否登顶 */
  completed: boolean;
  /** 已解锁知识节点 id */
  knowledgeIds: string[];
  /** 耗时（秒） */
  durationSec: number;
  /** 随堂答题正确/总数 */
  quizCorrect: number;
  quizTotal: number;
  /** 途经自然带 id（按首次进入顺序去重） */
  stagesVisited: string[];
  /** 解锁成就 id 列表 */
  achievements: string[];
  /** 最近更新时间戳（ms） */
  updatedAt: number;
}

const STORAGE_KEY = "geoexplorer.explorations.v1";

/* ---------------- 默认实现：wx 本地存储 ---------------- */
function defaultStorage(): StorageLike {
  return {
    get<T = unknown>(key: string): T | undefined {
      const w = (globalThis as Record<string, unknown>).wx as
        | { getStorageSync?: (k: string) => unknown }
        | undefined;
      try {
        const v = w?.getStorageSync?.(key);
        return v === undefined || v === null || v === "" ? undefined : (v as T);
      } catch {
        return undefined;
      }
    },
    set(key: string, data: unknown): void {
      const w = (globalThis as Record<string, unknown>).wx as
        | { setStorageSync?: (k: string, v: unknown) => void }
        | undefined;
      try {
        w?.setStorageSync?.(key, data);
      } catch {
        /* 本地存储失败不阻断探索 */
      }
    },
  };
}

/* ---------------- 内存实现（测试用） ---------------- */

export function createMemoryStorage(): StorageLike {
  const map = new Map<string, unknown>();
  return {
    get: <T,>(key: string): T | undefined =>
      map.has(key) ? (map.get(key) as T) : undefined,
    set: (key, data) => {
      map.set(key, data);
    },
  };
}

/* ---------------- 读取 / 归一化 ---------------- */

function readAll(storage: StorageLike): ExplorationRecord[] {
  const raw = Array.isArray(storage.get<unknown>(STORAGE_KEY))
    ? (storage.get<unknown>(STORAGE_KEY) as ExplorationRecord[])
    : [];
  return raw.map(normalizeRecord).sort((a, b) => b.updatedAt - a.updatedAt);
}

function writeAll(storage: StorageLike, records: ExplorationRecord[]): void {
  storage.set(STORAGE_KEY, records);
}

/** 兼容旧版记录：补齐缺省字段 */
function normalizeRecord(r: Partial<ExplorationRecord>): ExplorationRecord {
  return {
    id: r.id || "",
    title: r.title || "",
    emoji: r.emoji || "🏔️",
    reachElevation: Number(r.reachElevation) || 0,
    maxElevation: Number(r.maxElevation) || 0,
    completed: Boolean(r.completed),
    knowledgeIds: Array.isArray(r.knowledgeIds) ? r.knowledgeIds : [],
    durationSec: Number(r.durationSec) || 0,
    quizCorrect: Number(r.quizCorrect) || 0,
    quizTotal: Number(r.quizTotal) || 0,
    stagesVisited: Array.isArray(r.stagesVisited) ? r.stagesVisited : [],
    achievements: Array.isArray(r.achievements) ? r.achievements : [],
    updatedAt: Number(r.updatedAt) || Date.now(),
  };
}

/* ---------------- 对外 API ---------------- */

export interface SaveInput {
  exploration: Exploration;
  reachElevation: number;
  completed: boolean;
  knowledgeIds?: string[];
  durationSec?: number;
  quizCorrect?: number;
  quizTotal?: number;
  stagesVisited?: string[];
  achievements?: string[];
}

/** 记录一次探索进展（按统一“更优优先”规则：海拔更高者胜，其次已完成，其次更新时间新） */
export function saveExplorationRecord(
  input: SaveInput,
  storage: StorageLike = defaultStorage(),
): ExplorationRecord {
  const records = readAll(storage);
  const index = records.findIndex((r) => r.id === input.exploration.id);
  const record: ExplorationRecord = normalizeRecord({
    id: input.exploration.id,
    title: input.exploration.title,
    emoji: input.exploration.emoji,
    reachElevation: input.reachElevation,
    maxElevation: input.exploration.maxElevation,
    completed: input.completed,
    knowledgeIds: input.knowledgeIds,
    durationSec: input.durationSec || 0,
    quizCorrect: input.quizCorrect || 0,
    quizTotal: input.quizTotal || 0,
    stagesVisited: input.stagesVisited || [],
    achievements: input.achievements || [],
    updatedAt: Date.now(),
  });
  if (index >= 0) {
    const prev = records[index];
    // 更优者胜：先比海拔（更高），再比是否完成（同一海拔下已登顶者优）
    const prevWins =
      prev.reachElevation > record.reachElevation ||
      (prev.reachElevation === record.reachElevation &&
        prev.completed >= record.completed);
    records[index] = prevWins ? prev : record;
  } else {
    records.push(record);
  }
  writeAll(storage, records);
  return record;
}

export function getRecords(
  storage: StorageLike = defaultStorage(),
): ExplorationRecord[] {
  return readAll(storage);
}

export function getExplorationStats(
  storage: StorageLike = defaultStorage(),
): { completed: number; totalFound: number; totalDistanceM: number } {
  const records = readAll(storage);
  return {
    completed: records.filter((r) => r.completed).length,
    totalFound: records.reduce((sum, r) => sum + r.knowledgeIds.length, 0),
    totalDistanceM: records.reduce((sum, r) => sum + r.reachElevation, 0),
  };
}