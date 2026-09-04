/**
 * 「你知道吗」随机抽取（纯函数，可单测）。
 * 尽量避开上一次的条目，保证连续刷新有新内容。
 */
import { DISCOVERIES, type Discovery } from "../data/discoveries";

/** 随机抽一条；提供 excludeId 时从其余条目中抽取（总数 ≤1 时忽略排除） */
export function randomDiscovery(excludeId?: string): Discovery {
  const pool =
    excludeId && DISCOVERIES.length > 1
      ? DISCOVERIES.filter((d) => d.id !== excludeId)
      : DISCOVERIES;
  return pool[Math.floor(Math.random() * pool.length)];
}
