/**
 * 知识库与探索场景的联动 / 筛选纯逻辑（Node 可单测，无 wx 依赖）。
 *
 * 联动模型：探索场景的 knowledgeNode 可通过 `knowledgeId` 字段指向
 * 全局知识库（data/knowledge.ts）条目；探索记录里的已解锁节点 id
 * 经映射后即得到「已在探索中解锁」的知识库条目集合。
 */
import type { ExplorationRecord } from "../services/exploration-store";
import type { Exploration } from "../types/exploration";
import type { Knowledge } from "../types/models";

/** 构建「探索节点 id → 知识库条目 id」映射 */
export function buildNodeToLibraryMap(
  explorations: readonly Exploration[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const ex of explorations) {
    for (const node of ex.knowledgeNodes) {
      if (node.knowledgeId) map.set(node.id, node.knowledgeId);
    }
  }
  return map;
}

/** 由探索记录推导已解锁的知识库条目 id 集合 */
export function unlockedLibraryIds(
  records: readonly ExplorationRecord[],
  explorations: readonly Exploration[],
): Set<string> {
  const nodeToLib = buildNodeToLibraryMap(explorations);
  const out = new Set<string>();
  for (const record of records) {
    for (const nodeId of record.knowledgeIds) {
      const libId = nodeToLib.get(nodeId);
      if (libId) out.add(libId);
    }
  }
  return out;
}

/**
 * 知识库列表筛选：分类（"全部" 表示不过滤）+ 关键词（匹配标题/一句话/正文，忽略大小写）。
 * 纯函数：不修改入参。
 */
export function filterKnowledge(
  items: readonly Knowledge[],
  category: string,
  query: string,
): Knowledge[] {
  const kw = query.trim().toLowerCase();
  return items.filter((item) => {
    if (category !== "全部" && item.category !== category) return false;
    if (!kw) return true;
    return (
      item.title.toLowerCase().includes(kw) ||
      item.summary.toLowerCase().includes(kw) ||
      item.content.toLowerCase().includes(kw)
    );
  });
}
