/**
 * 探索进度 / 完成记录 —— 基于 wx 本地存储的小型持久化层。
 * 隔离存储细节，页面/服务只调用纯函数接口；后续可切换为服务端 API 而无侵入。
 */
import type { Exploration } from "../types/exploration";

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
  /** 完成时间戳（ms） */
  updatedAt: number;
}

const STORAGE_KEY = "geoexplorer.explorations.v1";

function readAll(): ExplorationRecord[] {
  try {
    const raw = wx.getStorageSync<ExplorationRecord[]>(STORAGE_KEY);
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function writeAll(records: ExplorationRecord[]): void {
  wx.setStorageSync(STORAGE_KEY, records);
}

/** 记录一次探索进展（保留最优记录） */
export function saveExplorationRecord(input: {
  exploration: Exploration;
  reachElevation: number;
  completed: boolean;
  knowledgeIds: string[];
}): ExplorationRecord {
  const records = readAll();
  const index = records.findIndex((r) => r.id === input.exploration.id);
  const record: ExplorationRecord = {
    id: input.exploration.id,
    title: input.exploration.title,
    emoji: input.exploration.emoji,
    reachElevation: input.reachElevation,
    maxElevation: input.exploration.maxElevation,
    completed: input.completed,
    knowledgeIds: input.knowledgeIds,
    updatedAt: Date.now(),
  };
  if (index >= 0) {
    const prev = records[index];
    records[index] =
      prev.reachElevation >= record.reachElevation &&
      prev.completed >= record.completed
        ? prev
        : record;
  } else {
    records.push(record);
  }
  writeAll(records);
  return record;
}

export function getRecords(): ExplorationRecord[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getExplorationStats(): {
  completed: number;
  totalFound: number;
} {
  const records = readAll();
  return {
    completed: records.filter((r) => r.completed).length,
    totalFound: records.reduce((sum, r) => sum + r.knowledgeIds.length, 0),
  };
}
