/**
 * 收藏（My Explorations）—— 轻量本地收藏夹。
 * 只存地点 id（数据权威来源是 data/places），id 列表持久化于 wx 存储；
 * 存储实现可注入，Node 环境（vitest）可直接单测。
 */
import type { Place } from "../types/models";
import type { StorageLike } from "./exploration-store";
import { defaultStorage } from "./exploration-store";

const STORAGE_KEY = "geoexplorer.favorites.v1";
const MAX_FAVORITES = 100;

export function createFavoritesService(storage: StorageLike) {
  function readIds(): string[] {
    const raw = storage.get<unknown>(STORAGE_KEY);
    if (!Array.isArray(raw)) return [];
    return Array.from(
      new Set(raw.filter((v): v is string => typeof v === "string")),
    ).slice(0, MAX_FAVORITES);
  }

  function writeIds(ids: string[]): void {
    storage.set(STORAGE_KEY, ids.slice(0, MAX_FAVORITES));
  }

  return {
    /** 收藏 id 列表（去重，按加入顺序） */
    getIds(): string[] {
      return readIds();
    },

    /** 收藏的地点对象（跳过已下架 id） */
    getPlaces(all: Place[]): Place[] {
      const ids = new Set(readIds());
      return all.filter((p) => ids.has(p.id));
    },

    isFavorite(id: string): boolean {
      return readIds().includes(id);
    },

    /** 切换收藏状态，返回切换后的状态 */
    toggle(id: string): boolean {
      const ids = readIds();
      const index = ids.indexOf(id);
      if (index >= 0) {
        ids.splice(index, 1);
        writeIds(ids);
        return false;
      }
      writeIds([...ids, id]);
      return true;
    },

    /** 计数（我的页汇总用） */
    count(): number {
      return readIds().length;
    },
  };
}

/** 默认实例（wx 本地存储） */
export const favorites = createFavoritesService(defaultStorage());
