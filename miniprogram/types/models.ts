/**
 * 全局共享实体类型（Place / Landform / Knowledge / Quiz）。
 * 与 UI 解耦：页面只消费数据，不硬编码业务内容（设计文档 §28）。
 */

import type { DataSource } from "./exploration";

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
 | "coast";

export interface Place {
 id: string;
 name: string;
 type: PlaceType;
 country: string;
 region: string;
 latitude: number;
 longitude: number;
 elevationM: number;
 description: string;
 formation: string;
 emoji: string;
 sources?: DataSource[];
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
