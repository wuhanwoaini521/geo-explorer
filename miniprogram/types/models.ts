/**
 * 全局共享实体类型（Place / Landform / Knowledge / Quiz）。
 * 与 UI 解耦：页面只消费数据，不硬编码业务内容（设计文档 §28）。
 */

import type { DataSource } from "./exploration";
import type { ContentReviewStatus } from "./expedition";

/** 供外部直接从 models 引入来源类型（数据文件统一 import 自此处） */
export type { DataSource };
export type { ContentReviewStatus };

export type PlaceType =
 | "mountain"
 | "river"
 | "lake"
 | "desert"
 | "plateau"
 | "canyon"
 | "volcano"
 | "glacier"
 | "ocean"
 | "coast"
 | "waterfall";

/**
 * 地理地点（GeoPlace）—— 图鉴 / 详情 / 搜索的统一数据模型。
 * 所有内容为公开资料整理的真实地理信息，无法确认的数值标注 approximate。
 */
export interface Place {
  id: string;
  name: string;
  /** 英文/国际通用名称（搜索用） */
  nameEn: string;
  type: PlaceType;
  emoji: string;
  country: string;
  region: string;
  latitude: number;
  longitude: number;
  /**
   * 特征高程（m）：山峰/火山为海拔，海沟为负的深度，
   * 峡谷为谷底高程，湖泊为湖面海拔，河流为 0（河口海平面）。
   */
  elevationM: number;
  /** 一句话定位（卡片摘要行） */
  shortDescription: string;
  description: string;
  formation: string;
  /** 典型气候特征（一句话，缺省表示暂无可靠概括） */
  climate?: string;
  /** 地质年代/形成时期（一句话，缺省表示暂无可靠概括） */
  geologicalAge?: string;
  /** 真实、可溯源的冷知识（2-3 条） */
  facts: string[];
  tags: string[];
  /** 精选地点（首页 Featured） */
  featured?: boolean;
  /** 关联的已开放沉浸探索场景 id（如 everest / mariana） */
  explorationId?: string;
  sources: DataSource[];
}

export type LandformCategory =
 | "山地"
 | "高原"
 | "平原"
 | "盆地"
 | "峡谷"
 | "沙漠"
 | "流水地貌"
 | "冰川地貌"
 | "海岸地貌"
 | "火山地貌";

export interface Landform {
 id: string;
 name: string;
 category: LandformCategory;
 description: string;
 formation: string;
 features: string[];
 emoji: string;
 sources?: DataSource[];
}

export type KnowledgeCategory =
 | "地形地貌"
 | "地质"
 | "水文"
 | "气候"
 | "生态"
 | "世界地理";

export interface Knowledge {
 id: string;
 title: string;
 summary: string;
 content: string;
 category: KnowledgeCategory;
 emoji: string;
 relatedPlaceIds: string[];
  relatedLandformIds: string[];
  /** 相关知识 id（跨世界知识图谱边；单向声明，反向由报告层推导，避免双向维护冲突） */
  relatedKnowledgeIds?: string[];
  /** 可选的同空间渐进教学过程；详情页消费，旧条目无需迁移。 */
  processId?: string;
  /** 关联正式媒体 id（经 MediaRegistry 查询，approved-only；历史条目可缺省） */
  mediaIds?: string[];
  /** 内容审核状态（历史条目可缺省；新内容由 content validation 强约束） */
  reviewStatus?: ContentReviewStatus;
  /**
   * 来源（历史条目可缺省，保持兼容；禁止为编译通过填充占位假来源）。
   * 新增条目必须提供可溯源来源，由后续 content validation 强制。
   */
  sources?: DataSource[];
}

export interface Quiz {
 id: string;
 question: string;
 type: "choice" | "true-false" | "guess-landform";
 options: string[];
 answerIndex: number;
 explanation: string;
 category: KnowledgeCategory;
 difficulty: 1 | 2 | 3;
 emoji: string;
 sources?: DataSource[];
}
