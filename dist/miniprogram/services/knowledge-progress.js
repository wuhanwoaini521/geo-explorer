"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReadKnowledgeIds = getReadKnowledgeIds;
exports.markKnowledgeRead = markKnowledgeRead;
/** Knowledge reading progress persisted independently from exploration unlocks. */
const exploration_store_1 = require("./exploration-store");
const STORAGE_KEY = "geoexplorer.knowledge.progress.v1";
function readIds(storage) {
    const raw = storage.get(STORAGE_KEY);
    if (!raw || typeof raw !== "object")
        return [];
    const ids = raw.readIds;
    return Array.isArray(ids)
        ? Array.from(new Set(ids.filter((id) => typeof id === "string" && Boolean(id))))
        : [];
}
function getReadKnowledgeIds(storage = (0, exploration_store_1.defaultStorage)()) {
    return new Set(readIds(storage));
}
/** Mark an article read only after its detail page has successfully loaded it. */
function markKnowledgeRead(id, storage = (0, exploration_store_1.defaultStorage)()) {
    if (!id.trim())
        return;
    const ids = readIds(storage);
    if (ids.includes(id))
        return;
    storage.set(STORAGE_KEY, { readIds: [...ids, id] });
}
