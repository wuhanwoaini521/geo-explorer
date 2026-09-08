"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WORLD_BASE_ELEV_M = exports.WORLD_M_PER_DEG_LAT = exports.WORLD_M_PER_DEG_LON = exports.WORLD_LON0 = exports.WORLD_LAT0 = void 0;
exports.geodToWorld = geodToWorld;
exports.worldToGeod = worldToGeod;
exports.demElevToZ = demElevToZ;
exports.zToDemElevation = zToDemElevation;
exports.landmarkToWorld = landmarkToWorld;
/**
 * Everest 统一世界坐标系（World Frame）—— 纯逻辑，可在 Node 单测。
 *
 * 对应 design/world/everest-live/coordinate-system.md（唯一坐标真相）。
 * 所有 Route / Waypoint / 相机 / DEM / Landmark 一律经本模块换算，
 * 任何组件不得自行私换变换后再参与投影。
 *
 * 帧定义（Local World）：
 *   +X = East（东），+Y = South（南，注意符号），+Z = Up（为 DEM 相对高程）
 *   x = 98334.5      · (lon − 86.8450)
 *   y = −110575.116  · (lat − 27.9500)
 *   z = elevation_m  − 2976.22       （← DEM elevation_min_m）
 */
exports.WORLD_LAT0 = 27.95;
exports.WORLD_LON0 = 86.845;
exports.WORLD_M_PER_DEG_LON = 98334.5;
exports.WORLD_M_PER_DEG_LAT = 110575.116;
/** DEM 相对高程的参考基准（south-col.json terrain.baseM） */
exports.WORLD_BASE_ELEV_M = 2976.22;
/** 由 geo 转 world（按官方公式） */
function geodToWorld(geo) {
    return {
        x: exports.WORLD_M_PER_DEG_LON * (geo.lon - exports.WORLD_LON0),
        y: -exports.WORLD_M_PER_DEG_LAT * (geo.lat - exports.WORLD_LAT0),
        z: geo.elevationM - exports.WORLD_BASE_ELEV_M,
    };
}
/** 由 world 转 geo（无 DEM 逆变换；海拔 = z + base） */
function worldToGeod(w) {
    return {
        lat: exports.WORLD_LAT0 - w.y / exports.WORLD_M_PER_DEG_LAT,
        lon: exports.WORLD_LON0 + w.x / exports.WORLD_M_PER_DEG_LON,
        elevationM: w.z + exports.WORLD_BASE_ELEV_M,
    };
}
/** DEM 绝对海拔 ↔ 世界相对高程 便捷换算 */
function demElevToZ(elevationM) {
    return elevationM - exports.WORLD_BASE_ELEV_M;
}
function zToDemElevation(z) {
    return z + exports.WORLD_BASE_ELEV_M;
}
/**
 * 由 geo + 目标坐标快速构造 Landmark 世界点（缓存常用地标）。
 * source：权威坐标来源标识（如 “DEM+authoritative elevation” / “waypoints.json”）。
 */
function landmarkToWorld(geo, source) {
    const w = geodToWorld(geo);
    return { ...w, source };
}
