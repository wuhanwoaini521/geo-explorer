"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markerScreenPercent = markerScreenPercent;
/** 画布内坐标 → 容器百分比坐标。宽高为 0 时按 1 处理，避免除零产生 Infinity。 */
function markerScreenPercent(screenX, screenY, view) {
    const width = Math.max(1, view.width);
    const height = Math.max(1, view.height);
    return {
        left: ((screenX + view.offsetX) / width) * 100,
        top: ((screenY + view.offsetY) / height) * 100,
    };
}
