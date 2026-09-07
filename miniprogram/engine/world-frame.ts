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
export const WORLD_LAT0 = 27.95;
export const WORLD_LON0 = 86.845;
export const WORLD_M_PER_DEG_LON = 98334.5;
export const WORLD_M_PER_DEG_LAT = 110575.116;
/** DEM 相对高程的参考基准（south-col.json terrain.baseM） */
export const WORLD_BASE_ELEV_M = 2976.22;

/** 世界坐标（本帧米） */
export interface WorldPoint {
  x: number;
  y: number;
  z: number;
}

/** 地理坐标（WGS84 经纬度 + 绝对海拔米） */
export interface GeoPoint {
  lat: number;
  lon: number;
  elevationM: number;
}

/** 由 geo 转 world（按官方公式） */
export function geodToWorld(geo: GeoPoint): WorldPoint {
  return {
    x: WORLD_M_PER_DEG_LON * (geo.lon - WORLD_LON0),
    y: -WORLD_M_PER_DEG_LAT * (geo.lat - WORLD_LAT0),
    z: geo.elevationM - WORLD_BASE_ELEV_M,
  };
}

/** 由 world 转 geo（无 DEM 逆变换；海拔 = z + base） */
export function worldToGeod(w: WorldPoint): GeoPoint {
  return {
    lat: WORLD_LAT0 - w.y / WORLD_M_PER_DEG_LAT,
    lon: WORLD_LON0 + w.x / WORLD_M_PER_DEG_LON,
    elevationM: w.z + WORLD_BASE_ELEV_M,
  };
}

/** DEM 绝对海拔 ↔ 世界相对高程 便捷换算 */
export function demElevToZ(elevationM: number): number {
  return elevationM - WORLD_BASE_ELEV_M;
}
export function zToDemElevation(z: number): number {
  return z + WORLD_BASE_ELEV_M;
}

/**
 * 由 geo + 目标坐标快速构造 Landmark 世界点（缓存常用地标）。
 * source：权威坐标来源标识（如 “DEM+authoritative elevation” / “waypoints.json”）。
 */
export function landmarkToWorld(geo: GeoPoint, source: string) {
  const w = geodToWorld(geo);
  return { ...w, source };
}