"use strict";
/**
 * Everest Photo Calibration —— 数据模型（P0.3 · Overnight P0.3）。
 *
 * 只描述**数据形状**与**语义契约**；不做任何 OpenCV / pnp ；
 * runtime（微信小程序）只消费「预先校准后的轻量 JSON」（§31），
 * 求解计算全部发生在 dev 工具（tools/everest-route-calibrator）。
 *
 * 坐标/单位约定：
 *  - 世界坐标：design/world/everest-live/coordinate-system.md 的 Local World（米）；
 *  - 原始像素：**原始图**（未裁、未缩放的原图）像素坐标（左上原点）；
 *  - 运行坐标：本项目 portrait 派生图（如 1080×1920) 归一化 0..1；
 *  - route[] 对外输出已投影 + 可见性标注的**运行归一化**坐标（runtime 直接消费）。
 */
Object.defineProperty(exports, "__esModule", { value: true });
