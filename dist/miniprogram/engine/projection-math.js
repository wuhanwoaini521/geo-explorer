"use strict";
/**
 * Everest 投影数学（projection-math）—— 纯逻辑，可 Node 单测。
 *
 * 统一世界系（coordinate-system.md，米）→ 相机系 → 原始图像素 → 运行归一化。
 * runtime 只做「读到已校准的 u/v → 渲染」，本模块同时被 dev 工具与测试复用；
 * 无任何 WeChat / Node 依赖。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cameraBasis = cameraBasis;
exports.worldToCamera = worldToCamera;
exports.projectToPixel = projectToPixel;
exports.pixelToRuntime = pixelToRuntime;
exports.worldToRuntime = worldToRuntime;
exports.focalMmToPx = focalMmToPx;
exports.fovFromFocal = fovFromFocal;
function deg2rad(d) {
    return (d * Math.PI) / 180;
}
/**
 * 由 yaw/pitch/roll 构造相机三正交轴（right/up/forward）。
 * 约定 forward 指向观察方向；yaw=0 朝北 → forward=−Y。
 */
function cameraBasis(pose) {
    const yaw = deg2rad(pose.yawDeg);
    const pitch = deg2rad(pose.pitchDeg);
    const roll = deg2rad(pose.rollDeg);
    // 未加 roll：forward 由 yaw/pitch 决定，up 取世界 +Z
    const forward = {
        x: Math.sin(yaw) * Math.cos(pitch),
        y: -Math.cos(yaw) * Math.cos(pitch),
        z: Math.sin(pitch),
    };
    const up0 = { x: 0, y: 0, z: 1 };
    // right = up0 × forward（en约定：right 指向 yaw 向右一侧）
    const right = {
        x: up0.y * forward.z - up0.z * forward.y,
        y: up0.z * forward.x - up0.x * forward.z,
        z: up0.x * forward.y - up0.y * forward.x,
    };
    // 重新正交化 up = forward × right（保证 right/up/forward 成右手三维基）
    const up = {
        x: forward.y * right.z - forward.z * right.y,
        y: forward.z * right.x - forward.x * right.z,
        z: forward.x * right.y - forward.y * right.x,
    };
    // roll：绕 forward 旋转 right/up
    const cr = Math.cos(roll);
    const sr = Math.sin(roll);
    const rollRight = {
        x: cr * right.x + sr * up.x,
        y: cr * right.y + sr * up.y,
        z: cr * right.z + sr * up.z,
    };
    const rollUp = {
        x: -sr * right.x + cr * up.x,
        y: -sr * right.y + cr * up.y,
        z: -sr * right.z + cr * up.z,
    };
    return { forward, right: rollRight, up: rollUp };
}
/** 世界点 → 相机系（x 右、y 上、z 前）。返回 null 表示点在相机后方 */
function worldToCamera(p, pose) {
    const b = cameraBasis(pose);
    const d = {
        x: p.x - pose.position.x,
        y: p.y - pose.position.y,
        z: p.z - pose.position.z,
    };
    const cam = {
        x: d.x * b.right.x + d.y * b.right.y + d.z * b.right.z,
        y: d.x * b.up.x + d.y * b.up.y + d.z * b.up.z,
        z: d.x * b.forward.x + d.y * b.forward.y + d.z * b.forward.z,
    };
    return cam.z <= 0 ? null : cam;
}
/** 相机系点到原始图像素（无畸变近似）。返回 null 表示不可见（后方 / 奇点） */
function projectToPixel(cam, intr) {
    if (cam.z <= 0)
        return null;
    const u = (intr.f * cam.x) / cam.z + intr.cx;
    const v = (intr.f * cam.y) / cam.z + intr.cy;
    return { u, v };
}
function pixelToRuntime(u, v, tr) {
    const nx = (u - tr.cropX) / tr.cropWidth;
    const ny = (v - tr.cropY) / tr.cropHeight;
    const inside = nx >= 0 && nx <= 1 && ny >= 0 && ny <= 1;
    return { u: nx, v: ny, inside };
}
/** 世界 → 运行归一化完整一步（用于预计算 route 运行坐标）。 */
function worldToRuntime(p, pose, intr, tr) {
    const cam = worldToCamera(p, pose);
    if (!cam)
        return { u: -1, v: -1, inFront: false, inside: false };
    const px = projectToPixel(cam, intr);
    if (!px)
        return { u: -1, v: -1, inFront: true, inside: false };
    const out = pixelToRuntime(px.u, px.v, tr);
    return { u: out.u, v: out.v, inFront: true, inside: out.inside };
}
/** 原始 35mm 等效焦距（mm）→ 像素焦距（对给定图宽） */
function focalMmToPx(f35mmMm, imageWidthPx) {
    // 全幅宽 36mm
    return (f35mmMm / 36) * imageWidthPx;
}
/** 像素焦距 → 水平 FOV（度） */
function fovFromFocal(f, widthPx) {
    return (2 * Math.atan(widthPx / 2 / f) * 180) / Math.PI;
}
