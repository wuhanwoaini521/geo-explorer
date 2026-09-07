/**
 * DEM 遮挡引擎（dev 工具自包含版本）。
 *
 * 对相机 → 场景点视线：沿视线以 DEM 分辨率步进，检查视线高度与 DEM 表面高度，
 * 若 DEM 高于视线 → OCCLUDED（禁止后山脊线穿过）。
 *
 * 与 scripts/live/occlusion_dem.py 的 RayMarch 实现一一对应（数值同一套网格）。
 */
import { cameraBasis } from "./camera-math.js";
/** 网格索引 → (x, y, z) */
export function gridAt(grid, row, col) {
    if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols)
        return null;
    return {
        x: grid.origin.x + col * grid.step,
        y: grid.origin.y + row * grid.step,
        z: grid.z[row * grid.cols + col],
    };
}
/** 世界点 → 最近网格 cell（越界返回 null） */
export function worldToCell(grid, p) {
    const col = Math.round((p.x - grid.origin.x) / grid.step);
    const row = Math.round((p.y - grid.origin.y) / grid.step);
    if (row < 0 || row >= grid.rows || col < 0 || col >= grid.cols)
        return null;
    return { row, col };
}
export function worldToDemZ(grid, p) {
    const c = worldToCell(grid, p);
    if (!c)
        return null;
    return grid.z[c.row * grid.cols + c.col];
}
/** 返回 clamp 到最近 cell 的高程（用于视线端点的地面） */
export function demZAt(grid, p) {
    return worldToDemZ(grid, p);
}
/**
 * 视线遮挡检测：相机位置 → 目标点（可为 DEM 上/场景点）。
 * 沿视线每个 DEM cell 检查；DEM 表面高 > 直线高 → 被遮挡。
 * @param cameraEye 相机世界位置（已含相机高度的 z）
 * @param target 目标世界点（比相机更远）
 */
export function isOccluded(grid, cameraEye, target) {
    const dx = target.x - cameraEye.x;
    const dy = target.y - cameraEye.y;
    const dz = target.z - cameraEye.z;
    const distXY = Math.hypot(dx, dy);
    if (distXY < grid.step)
        return false;
    // 沿视线以 cell 步进（避免漏掉较高特征点）
    const steps = Math.max(2, Math.ceil(distXY / (grid.step * 0.5)));
    for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const p = {
            x: cameraEye.x + dx * t,
            y: cameraEye.y + dy * t,
            z: cameraEye.z + dz * t,
        };
        const elev = demZAt(grid, p);
        if (elev === null)
            continue;
        // 剔除与目标/相机贴太近的 cell（自身站地形不算遮挡）
        const distToCam = Math.hypot(p.x - cameraEye.x, p.y - cameraEye.y);
        if (distToCam < grid.step)
            continue;
        // 视线在该采样点的高度（修正：目标点照到远处）
        if (elev > p.z + 0.5)
            return true;
    }
    return false;
}
/**
 * 给一列世界点标记可见性。
 * @returns 与 points 等长的状态数组
 */
export function classifyVisibility(grid, cameraEye, points) {
    return points.map((p) => (isOccluded(grid, cameraEye, p) ? "OCCLUDED" : "VISIBLE"));
}
/** 将世界点裁剪到光锥：相机前方 z>0（保障 run 判断） */
export function projectAll(pose, focalPx, cx, cy, w, h, points) {
    return points.map((p) => {
        const cam = worldCameraHelper(p, pose);
        if (!cam || cam.z <= 0)
            return { x: 0, y: 0, ok: false };
        const u = (focalPx * cam.x) / cam.z + cx;
        const v = (focalPx * cam.y) / cam.z + cy;
        return { x: u, y: v, ok: u >= 0 && u < w && v >= 0 && v < h };
    });
}
function worldCameraHelper(p, pose) {
    // 与 camera-math.ts 的 cameraBasis 同一套 ENU 基（避免重复实现）
    const b = cameraBasis(pose);
    const d = { x: p.x - pose.position.x, y: p.y - pose.position.y, z: p.z - pose.position.z };
    const z = d.x * b.forward.x + d.y * b.forward.y + d.z * b.forward.z;
    if (z <= 0)
        return null;
    return {
        x: d.x * b.right.x + d.y * b.right.y + d.z * b.right.z,
        y: d.x * b.up.x + d.y * b.up.y + d.z * b.up.z,
        z,
    };
}
