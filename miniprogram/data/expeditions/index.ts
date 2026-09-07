/**
 * Expedition V2 注册表 —— Gate 3 页面入口。
 *
 * 页面 `onLoad` 先查「Expedition 附件」（routeIndex 驱动），查到即进入路线进度轴模式；
 * 查不到则回落到原有 Exploration 注册表（海拔轴，如马里亚纳）。
 * 本文件仅是“入口选择”，不修改任何已有场景数据。
 */
import type { ExpeditionAttachment } from "../../types/expedition";
import type { Exploration } from "../../types/exploration";
import { EVEREST_EXPEDITION } from "./everest";

/** 具有 V2 附件（真实路线驱动）的探索对象 */
export type ExpeditionExploration = Exploration & ExpeditionAttachment;

const REGISTRY: ExpeditionExploration[] = [EVEREST_EXPEDITION];

/** 按 id 获取带有 V2 附件的探索（无附件返回 undefined → 走旧海拔轴） */
export function getExpeditionById(id: string): ExpeditionExploration | undefined {
  return REGISTRY.find((x) => x.id === id);
}

/** 当前注册的 Expedition 数量（供测试/诊断） */
export function expeditionRegistryCount(): number {
  return REGISTRY.length;
}