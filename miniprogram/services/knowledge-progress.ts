/** Knowledge reading progress persisted independently from exploration unlocks. */
import { defaultStorage, type StorageLike } from "./exploration-store";

const STORAGE_KEY = "geoexplorer.knowledge.progress.v1";

function readIds(storage: StorageLike): string[] {
  const raw = storage.get<unknown>(STORAGE_KEY);
  if (!raw || typeof raw !== "object") return [];
  const ids = (raw as { readIds?: unknown }).readIds;
  return Array.isArray(ids)
    ? Array.from(new Set(ids.filter((id): id is string => typeof id === "string" && Boolean(id))))
    : [];
}

export function getReadKnowledgeIds(storage: StorageLike = defaultStorage()): Set<string> {
  return new Set(readIds(storage));
}

/** Mark an article read only after its detail page has successfully loaded it. */
export function markKnowledgeRead(id: string, storage: StorageLike = defaultStorage()): void {
  if (!id.trim()) return;
  const ids = readIds(storage);
  if (ids.includes(id)) return;
  storage.set(STORAGE_KEY, { readIds: [...ids, id] });
}
