"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.favorites = void 0;
exports.createFavoritesService = createFavoritesService;
const exploration_store_1 = require("./exploration-store");
const STORAGE_KEY = "geoexplorer.favorites.v1";
const MAX_FAVORITES = 100;
function createFavoritesService(storage) {
    function readIds() {
        const raw = storage.get(STORAGE_KEY);
        if (!Array.isArray(raw))
            return [];
        return Array.from(new Set(raw.filter((v) => typeof v === "string"))).slice(0, MAX_FAVORITES);
    }
    function writeIds(ids) {
        storage.set(STORAGE_KEY, ids.slice(0, MAX_FAVORITES));
    }
    return {
        /** 收藏 id 列表（去重，按加入顺序） */
        getIds() {
            return readIds();
        },
        /** 收藏的地点对象（跳过已下架 id） */
        getPlaces(all) {
            const ids = new Set(readIds());
            return all.filter((p) => ids.has(p.id));
        },
        isFavorite(id) {
            return readIds().includes(id);
        },
        /** 切换收藏状态，返回切换后的状态 */
        toggle(id) {
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
        count() {
            return readIds().length;
        },
    };
}
/** 默认实例（wx 本地存储） */
exports.favorites = createFavoritesService((0, exploration_store_1.defaultStorage)());
