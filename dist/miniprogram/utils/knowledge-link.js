"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildNodeToLibraryMap = buildNodeToLibraryMap;
exports.unlockedLibraryIds = unlockedLibraryIds;
exports.filterKnowledge = filterKnowledge;
/** 构建「探索节点 id → 知识库条目 id」映射 */
function buildNodeToLibraryMap(explorations) {
    const map = new Map();
    for (const ex of explorations) {
        for (const node of ex.knowledgeNodes) {
            if (node.knowledgeId)
                map.set(node.id, node.knowledgeId);
        }
    }
    return map;
}
/** 由探索记录推导已解锁的知识库条目 id 集合 */
function unlockedLibraryIds(records, explorations) {
    const nodeToLib = buildNodeToLibraryMap(explorations);
    const out = new Set();
    for (const record of records) {
        for (const nodeId of record.knowledgeIds) {
            const libId = nodeToLib.get(nodeId);
            if (libId)
                out.add(libId);
        }
    }
    return out;
}
/**
 * 知识库列表筛选：分类（"全部" 表示不过滤）+ 关键词（匹配标题/一句话/正文，忽略大小写）。
 * 纯函数：不修改入参。
 */
function filterKnowledge(items, category, query) {
    const kw = query.trim().toLowerCase();
    return items.filter((item) => {
        if (category !== "全部" && item.category !== category)
            return false;
        if (!kw)
            return true;
        return (item.title.toLowerCase().includes(kw) ||
            item.summary.toLowerCase().includes(kw) ||
            item.content.toLowerCase().includes(kw));
    });
}
