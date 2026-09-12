/**
 * Expedition V2 —— 独立能力类型。
 *
 * 设计原则（Gate 1 §四）：不新建第二套「场景顶层模型」，而是在现有
 * types/exploration.ts 的 Exploration 之上做增量演进。
 * 本文件只存放「新增能力」的独立类型，与场景选数据集 kuley 组合为一个
 * `Exploration & ExpeditionAttachment`（见 data/expeditions/everest.ts）。
 *
 * 本文件仅描述数据形态，不依赖（也不应依赖）wx API —— 保证可在 Node 环境单测。
 */

import type { DataSource } from "./exploration";
import type { RuntimeSceneCalibration } from "./calibration";

/* ------------------------------------------------------------------ */
/* ExpeditionType：探索的移动/视角类型                                  */
/* ------------------------------------------------------------------ */

export type ExpeditionType =
   | "CLIMB" // 攀爬（垂直上行，如珠峰）
   | "DIVE" // 下潜（垂直下行，如马里亚纳）
   | "TRAVERSE" // 横向穿越（如山脉徒步 / 峡谷纵穿）
   | "FLYOVER" // 上帝视角俯瞰
   | "CUTAWAY"; // 剖面观察

/** 沿进度前进/后退是否与「上/下」轴一致（CLIMB/DIVE 轴向上；TRAVERSE 轴横向） */
export const EXPEDITION_AXIS_TO_PROGRESS: Record<
   ExpeditionType,
   "up" | "down" | "side"
> = {
   CLIMB: "up",
   DIVE: "down",
   TRAVERSE: "side",
   FLYOVER: "side",
   CUTAWAY: "side",
};

/* ------------------------------------------------------------------ */
/*  2：证据强度（EvidenceType）：区分实测 / 数据 / 引用 / 模型 / 示意图   */
/* ------------------------------------------------------------------ */

export type EvidenceType =
   | "measured" // 实测量测（现场/传感器）
   | "dataset" // 数据集统计（如 GLO-30 DEM 格点）
   | "reference" // 权威/文献引用（Camp 海拔表、官方冲顶高程）
   | "model" // 建模推导（直减率、指数大气）
   | "illustration"; // 示意/示意图形（非数值）

export const EVIDENCE_META: Record<
   EvidenceType,
   { label: string; short: string; icon: string }
> = {
   measured: { label: "实测", short: "实测", icon: "●" },
   dataset: { label: "数据集", short: "数据集", icon: "◉" },
   reference: { label: "引用", short: "文献", icon: "◐" },
   model: { label: "建模", short: "模型", icon: "○" },
   illustration: { label: "示意", short: "示意", icon: "◇" },
};

/** 事件源证据标记：附加到 DataSource / 指标（可选，向后兼容） */
export interface Evidence {
   type: EvidenceType;
   note?: string;
}

/* ------------------------------------------------------------------ */
/*  3：CameraConfig —— 相机段配置（数据层，供 UI/渲染消费）              */
/* ------------------------------------------------------------------ */

export interface CameraFocus {
   /** 画布横坐标比例 0-1（左侧边缘起） */
   x: number;
   /** 画布纵坐标比例 0-1（顶部起） */
   y: number;
}

export interface CameraSegment {
   id: string;
   /** 该段在路线 progress 上的合法区间 [from, to]，单调递增、不重叠、覆盖全轴 */
   fromProgress: number;
   toProgress: number;
   /** 渲染资源标识（相对 assets/world 的 key，如 everest-expedition-hero-v1） */
   asset: string;
   /** 聚焦点（画面注视点），可选 */
   focus?: CameraFocus;
   /** 该段起始聚焦点；缺省时沿用上一段终点或画面中心 */
   fromFocus?: CameraFocus;
   /** 期望缩放：（1 原图）可插值 */
   scale?: number;
   /** 视线水平偏移（0.5 中心） */
   offsetX?: number;
   /** 该段起始水平偏移 */
   fromOffsetX?: number;
   /** 视线垂直偏移（0.5 中心） */
   offsetY?: number;
   /** 该段起始垂直偏移 */
   fromOffsetY?: number;
}

export interface CameraConfig {
   segments: CameraSegment[];
}

/* ------------------------------------------------------------------ *
 *  4 · RouteGeometry / RouteIndex —— 真实路线几何与运行时索引            *
 * ------------------------------------------------------------------ */

export type RouteNodeKind =
   | "waypoint" // 普通途经点
   | "camp" // 营地
   | "landmark" // 地标
   | "danger" // 危险段（冰瀑等）
   | "knowledge" // 知识锚点
   | "summit"; // 峰顶/终点

/** 静态几何原始点（对应 route-control-points.json 的 289 个采样点） */
export interface RoutePointRaw {
   lat?: number;
   lon?: number;
   /** 局部投影坐标（米，+X 东，+Y 南，以 DEM 中心为原点） */
   x: number;
   y: number;
   /** 地形局部相对高度（米，非绝对海拔；绝对 DEM = z + terrain.eminElevationM） */
   z: number;
}

/** 里程碑（对应 waypoints.json 的显著点）：营地= Camp/Summit 等 */
export interface RouteMilestoneRaw {
   id: string;
   name: string;
   kind: RouteNodeKind;
   /** 真实 WGS84 经纬度 */
   lat: number;
   lon: number;
   /** 权威/参考海拔（米）：用于 UI 展示（Camp 标高、峰顶 8848.86 等） */
   refM: number;
   /** 该点 DEM 海拔（米）：用于地形几何 / 路线投影 */
   demM: number;
   /** 局部投影坐标（米，+X 东，+Y 南）——投影到 289 扫描折线时使用 */
   x: number;
   y: number;
}

/** 静态路线几何文件（独立 JSON/static data，不经 by RouteIndex builder 转运行时） */
export interface RouteGeometryData {
   schemaVersion: number;
   id: string;
   name: string;
   geodetic: "lonlat-wgs84";
   /** 地形元数据（对应 everest-terrain-metadata.json 的派生信息） */
   terrain: {
      /** DEM 局部高度的基底（绝对海拔 = z + baseM） */
      baseM: number;
      units: "m";
   };
   /** 采样的路线中轴控制点（通常 289 个，经平滑/谷底追踪） */
   points: RoutePointRaw[];
   /** 显著里程碑（8 个） */
   milestones: RouteMilestoneRaw[];
   /** 数据溯源（原始文件 / 生成脚本） */
   provenance: string[];
}

/** 里程碑在路线上的计算采样结果（含累计距离/进度/DEM/参考海拔） */
export interface RouteMilestoneSample extends RouteMilestoneRaw {
   /** 该点沿折线的累计距离（米，由 289 点折线投影得出） */
   distanceM: number;
   /** 0-1 进度（distanceM / totalDistanceM） */
   progress: number;
   /** 该点最近并内差后的 DEM 海拔（米） */
   demM: number;
}

/** 运行时路线索引：由 buildRouteIndex() 从 RouteGeometryData 构建 */
export interface RouteIndex {
   routeId: string;
   name: string;
   /** 控制点数量（289） */
   pointCount: number;
   /** 折线段数量（288） */
   segmentCount: number;
   /** cumulative[ i ] = 从起点沿折线到点 i 的累计长度（米，单调递增） */
   cumulative: number[];
   /** dem[ i ] = 点 i 的 DEM 绝对海拔（米 = z + baseM） */
   demM: number[];
   /** 路线总长（水平投影，米） */
   totalDistanceM: number;
   /** 路线总长（含高差，米） */
   total3dDistanceM: number;
   /** 累计爬升（米，向下为正） */
   ascentM: number;
   /** 累计下降（米） */
   descentM: number;
   /** 各折点水平投影坐标（米，与 cumulative 同长） */
   xs: number[];
   ys: number[];
   /** 各折点 WGS84 经纬度（无数据时为 0） */
   lats: number[];
   lons: number[];
   /** 里程碑（8，按距离计算排序） */
   milestones: RouteMilestoneSample[];
   /** 构建时原始数据胎引 */
   sourceLabel: string[];
}

/** routeAt：某一进度/距离处的沿路线采样（三类海拔一并返回，严禁隐式混用） */
export interface RouteSampleAt {
   /** 沿路线累计距离（米） */
   distanceM: number;
   /** 0-1 进度（= distanceM / total） */
   progress: number;
   /** 命中折线段索引 */
   segment: number;
   /** 线段内位置 0-1 */
   t: number;
   /** 插值世界坐标（米） */
   x: number;
   y: number;
   /** 插值 WGS84 经纬度 */
   lat: number;
   lon: number;
   /** DEM 海拔（米）：地形几何/路线投影用（不用于展示海拔冒烟） */
   demM: number;
   /** 权威参考海拔（米）：Camp/Summit 等展示用；在里程碑间沿距离插值 */
   refM: number;
   /** 模型海拔（米）：pressure/oxygen/template 等环境模型用（本实现=fref 锚定） */
   modelM: number;
   /** 局部坡度角（度，与水平面夹角，沿行进方向；下坡为负） */
   gradeDeg: number;
}

/* ------------------------------------------------------------------ *
 * 3.5 · Terrain-Conforming Route —— 山体路径（视觉层地理几何）             *
 *                                                                     *
 *  与 RouteIndex 的分工：                                               *
 *    RouteIndex   —— 真实世界几何（米 / WGS84 / DEM），负责进度与海拔；   *
 *    RouteSpine   —— 山体影像上的路径控制点（图像归一化 0..1），负责视觉。 *
 *  两者共享同一条「路线进度轴」：spine 控制点的 progress 直接取自         *
 *  RouteIndex 里程碑进度，因此 waypoint 可以精确吸附到路径上。           *
 * ------------------------------------------------------------------ */

/** 山体路径控制点：归一化图像坐标 + 该点对应的真实路线进度 */
export interface RouteSpinePoint {
   /** 归一化图像横坐标（0..1，原图 natural 空间） */
   x: number;
   /** 归一化图像纵坐标（0..1，原图 natural 空间） */
   y: number;
   /** 该控制点在真实路线里程轴上的进度（0..1，严格升序） */
   progress: number;
}

/** 承载路线的背景资产投影参数（aspectFill / cover 裁剪还原所需） */
export interface RouteCoverFrame {
   /** 原图 natural 宽高比（宽 / 高） */
   imageAspect: number;
   /** 容器（视口）宽高比（宽 / 高） */
   containerAspect: number;
   /** 裁剪焦点横坐标（0..1，对应 object-position x%）；缺省 0.5 */
   focusX?: number;
   /** 裁剪焦点纵坐标（0..1，对应 object-position y%）；缺省 0.5 */
   focusY?: number;
}

/** 路径均匀采样点（容器归一化百分位），marker / waypoint 共用同一投影来源 */
export interface RouteSegmentSample {
   /** 0..1（与路线里程轴一致） */
   progress: number;
   /** 容器宽度百分位 */
   x: number;
   /** 容器高度百分位 */
   y: number;
}

/**
 * 一套山体路径投影（一种渲染模式一份）。
 *
 * LIVE 与 TERRAIN 是同一段攀登的两个 renderer：waypoint id / 进度 / 海拔 / 解锁状态
 * 完全共享（见 ExpeditionAttachment.routeIndex），只有「山体影像上的位置」不同。
 * 因此这里只声明投影差异，不复制任何业务数据。
 */
export interface ExpeditionRouteProjection {
   /** 投影 id（= 视觉模式：LIVE | TERRAIN） */
   id: ExpeditionVisualMode;
   /** 该投影承载路线的背景资产（须与页面实际渲染的图层同源） */
   image: string;
   /** 背景资产 natural 宽高比 */
   imageAspect: number;
   /** aspectFill 裁剪焦点（0..1） */
   focusX: number;
   focusY: number;
   /**
    * 山体路径控制点（图像归一化坐标）。
    * 必须包含全部里程碑的 progress —— waypoint 由这些控制点吸附得到，
    * 而不是反过来用 waypoint 连直线。
    */
   spine: RouteSpinePoint[];
}

/** 场景的山体路径声明（按视觉模式索引；缺省的模式回落到 terrain） */
export interface ExpeditionRoutePathConfig {
   /** 缺省投影（无对应模式投影时使用，通常是 terrain/hero 影像） */
   default: ExpeditionRouteProjection;
   /** 分模式投影（可选；键为视觉模式） */
   modes?: Partial<Record<ExpeditionVisualMode, ExpeditionRouteProjection>>;
}

/* ------------------------------------------------------------------ *
 * 4 · 阶段（ExpeditionStage）—— 沿路线距离的阶段映射                       *
 * ------------------------------------------------------------------ */

/** 阶段边界定义：可指某个里程碑（计算距离），或「参考海拔跨过阈值」（计算求交） */
export type StageBoundaryRef =
   | { kind: "start" }
   | { kind: "end"; label?: string } // 终点（全长度）
   | { kind: "milestone"; milestoneId: string; label: string }
   | { kind: "cross-ref-m"; crossRefM: number; label: string }; // 跨过某参考海拔

export interface ExpeditionStageDef {
   id: string;
   name: string;
   emoji: string;
   intro: string;
   /** 路线样式提示（数据层，UI 渲染用；V2 只声明不实现视觉效果） */
   routeStyle?: string;
   from: StageBoundaryRef;
   to: StageBoundaryRef;
}
export interface ComputedStage {
   id: string;
   name: string;
   emoji: string;
   intro: string;
   from: StageBoundaryRef;
   to: StageBoundaryRef;
   /** 下列全部由 route builder 从真实 289 点路线计算 */
   fromDistanceM: number;
   toDistanceM: number;
   fromProgress: number;
   toProgress: number;
}

/* ------------------------------------------------------------------ */
/*  5 · Media —— 媒体资产模型（Candidate → approved → MediaRegistry）    */
/* ------------------------------------------------------------------ */

/** 审核状态：Candidate 走 draft/review/rejected；正式资产恒为 approved */
export type MediaReviewStatus = "draft" | "review" | "approved" | "rejected";

/** 内容实体（Knowledge / Waypoint 等）与媒体共用同一套审核生命周期 */
export type ContentReviewStatus = MediaReviewStatus;

/** 媒体形态（kind 表达“这是什么媒介”；数据证据强度仍由 DataSource.evidence 表达） */
export type MediaKind =
   | "photograph"
   | "render"
   | "diagram"
   | "illustration"
   | "video"
   | "satellite"
   | "scientific"
   | "terrain";

/**
 * 地理角色（受控枚举，禁止自由字符串）：
 *   EXACT          —— 有可靠依据（GPS/官方描述等）证明媒体就是该实体本身；
 *   REPRESENTATIVE —— 真实媒体，但只代表该实体的区域/环境/附近视角，
 *                     不得声称是当前节点的现场精确视角。
 */
export type GeographicRole = "EXACT" | "REPRESENTATIVE";

/** 媒体归属实体类型（stage 目前无独立媒体，仅保留模型能力） */
export type MediaEntityType =
   | "place"
   | "knowledge"
   | "expedition"
   | "waypoint"
   | "stage";

/**
 * 正式媒体资产（Runtime）：已通过审核、可进入产品的媒体。
 *
 * 强约束：localPath 必填、reviewStatus 恒为 approved（validateMediaManifest
 * 与 MediaRegistry 双层保证非 approved 资产不会进入正式查询）。
 */
export interface MediaAsset {
   id: string;
   /** 媒体归属的实体类型（entity ownership） */
   entityType: MediaEntityType;
   /** 归属实体 id（如 place id / waypoint id / 场景 id） */
   entityId: string;
   /** 用途（如 hero / gallery / knowledge-support）；缺省按声明顺序取首张为 hero */
   purpose?: string;
   /** 原始标题（Commons 原始文件名/发布标题） */
   title: string;
   description: string;
   /** 资源形态 */
   kind: MediaKind;
   /** 本地资源路径（相对 miniprogram/assets/...）；正式运行资产必填 */
   localPath: string;
   /** 版权/许可（如 "CC BY-SA 4.0"、"Public Domain"、"自有建模渲染"） */
   license: string;
   /** 许可链接（如 creativecommons.org/licenses/by-sa/4.0） */
   licenseUrl?: string;
   /** 作者/机构（可为空） */
   credit?: string;
   /** 来源链接（原始文件页/出处）——MediaManifest 是出处的唯一真相 */
   sourceUrl?: string;
   /** 署名文本（CC 要求：作者 + 许可名 + 来源） */
   attribution?: string;
   /** 拍摄/制作年份 */
   capturedAt?: string;
   /** 原始分辨率（如 "5848×4387"） */
   originalResolution?: string;
   /** 派生资源的宽高（px） */
   dimensions?: { width: number; height: number };
   /** 文件 sha256（防来源混乱，管线产物指纹） */
   hash?: string;
   /** 地理角色：EXACT / REPRESENTATIVE（受控枚举，见类型注释） */
   geographicRole: GeographicRole;
   /** 覆盖投影方式（EXACT/CURATED/NOT_AVAILABLE；无相机参数不得自称精确） */
   overlayProjection?: OverlayProjectionType;
   /** 审核状态（正式清单仅收录 approved；MediaRegistry 同层再过滤一次） */
   reviewStatus: MediaReviewStatus;
   tags?: string[];
}

export interface MediaManifest {
   schemaVersion: number;
   id: string;
   /** 关联 scene id（如 "everest"）；资产级归属由 MediaAsset.entityType/entityId 表达 */
   sceneId: string;
   assets: MediaAsset[];
   /** 清单说明 / 待办 */
   notes?: string;
}

/**
 * 候选媒体资产（Candidate）：服务于搜索/来源确认/版权确认/人工审核/候选比较。
 *
 * 与正式 MediaAsset 的边界：
 *   - sourceUrl 必填（候选必须先说清来自哪里）；
 *   - localPath 可选（不要求已下载到本地）；
 *   - license 可选（版权未确认时保持缺失，禁止猜测）；
 *   - reviewStatus 只允许 draft/review/rejected —— 一旦 approved，
 *     应晋升为正式 MediaAsset 进入 MediaManifest，而不是留在候选区。
 */
export interface CandidateMediaAsset {
   id: string;
   entityType: MediaEntityType;
   entityId: string;
   /** 用途（如 hero / gallery / knowledge-support） */
   purpose: string;
   title: string;
   description?: string;
   kind: MediaKind;
   /** 原始来源链接（候选期必填，是审核依据） */
   sourceUrl: string;
   /** 版权/许可（未确认时留空，禁止填占位假值） */
   license?: string;
   licenseUrl?: string;
   credit?: string;
   attribution?: string;
   geographicRole: GeographicRole;
   reviewStatus: Exclude<MediaReviewStatus, "approved">;
   /** 已下载/已派生到本地的路径（可选） */
   localPath?: string;
   capturedAt?: string;
   originalResolution?: string;
   hash?: string;
   tags: string[];
   /**
    * 晋升标记：该候选已按管线晋升为 runtime 资产（MediaManifest 中的 id）。
    * 保留候选记录以维护候选库存与评审历史；runtime 以 MediaManifest 为唯一事实。
    */
   promotedRuntimeId?: string;
}

/* ------------------------------------------------------------------ */
/*  6 · ExpeditionAttachment —— 与现有 Exploration 的增量组合            */
/* ------------------------------------------------------------------ */

/**
 * V2 附件：不复制场景数据（stages/metrics/knowledge 仍在 Exploration 内），
 * 只把“真实路线 / 阶段映射 / 相机配置 / 媒体清单 / 证据策略”这些新能力
 * 作为独立能力挂到现有 Exploration 之上，类型为 `Exploration & ExpeditionAttachment`。
 */
export interface ExpeditionAttachment {
   /** 探索类型（CLIMB/DIVE/…） */
   type: ExpeditionType;
   /** 真实路线索（289 点，运行时由 builder 计算） */
   routeIndex: RouteIndex;
   /** 7 段路线阶段映射（边界距离全部由 routeIndex 计算） */
   stageMap: ComputedStage[];
   /** 相机段配置（数据层；UI 渲染才会消费） */
   camera: CameraConfig;
   /** 媒体资源清单（Gate 6 前可为空/v1） */
   media: MediaManifest;
   /** 三类海拔处理策略：明确声明模型海拔的锚定方式 */
   elevationPolicy: {
      /** 模型海拔 = 权威参考海拔锚定（沿距离在里程碑 reference 之间插值） */
      model: "reference-anchored";
   };
   /** 附加数据来源与证据标记 */
   sources: DataSource[];
   /** Dual Visual Mode 配置（Gate 3.3A）：LIVE 实景 / TERRAIN 科学地形 */
   visualMode: ExpeditionVisualModeConfig;
   /**
    * 山体路径投影（可选）：声明「路线贴哪座山、怎么投影到屏幕」。
    * 缺省时页面不绘制山体路径（只保留 HUD），因此旧场景无需改动。
    */
   routePath?: ExpeditionRoutePathConfig;
}

/* ------------------------------------------------------------------ *
 *  7 · ExpeditionVisualModeConfig —— Dual Visual Mode（Gate 3.3A）      *
 *                                                                      *
 *  Everest Expedition 采用「Dual Visual Mode」：                        *
 *    LIVE    —— 实景探索（真实授权珠峰影像，负责沉浸感）                 *
 *    TERRAIN —— 科学地形（Copernicus DEM，负责空间理解）               *
 *                                                                      *
 *  两种模式共享全部 Expedition 状态（RouteIndex / progress / waypoint /  *
 *  stage / 环境 / 知识 / 登顶态），只替换「Scene Presentation Layer」。  *
 *  Route Engine 不允许感知具体视觉模式：本层只消费其公开输出             *
 *  （stageIndex / progress），反向逻辑运算全部在此文件 / expedition-     *
 *  visual.ts 内，与 RouteIndex 解耦。                                   *
 * ------------------------------------------------------------------ */

/** 视觉模式：LIVE = 真实珠峰影像；TERRAIN = DEM 科学地形 */
export type ExpeditionVisualMode = "LIVE" | "TERRAIN";

/** Expedition 会话内初始模式（用户切换后由页面在会话内记住，离开后默认回到此值） */
export const DEFAULT_EXPEDITION_VISUAL_MODE: ExpeditionVisualMode = "LIVE";

/** 模式展示文案（UI 层可读；本注释为契约，不在数据层渲染） */
export const VISUAL_MODE_LABEL: Record<ExpeditionVisualMode, string> = {
   LIVE: "实景",
   TERRAIN: "地形",
};

/** LIVE 影像的竖屏 crop（§12/§13）：焦点 + 放缩，不做随机 object-fit 裁剪 */
export interface LiveCrop {
   /** 画面横坐标焦点（0-1，左侧起） */
   focusX: number;
   /** 画面纵坐标焦点（0-1，顶部起）——核心地理对象（峰顶/西库姆/南坎）不能被竖屏裁掉 */
   focusY: number;
   /** 期望缩放（≥1；origin 图 + 裁切得到 portrait 派生图时用） */
   scale: number;
}

/** 实景覆盖投影方式（§17） */
export type OverlayProjectionType =
   | "EXACT" // 有 camera 位置/朝向/focal 元数据，可按真实投影计算 marker
   | "CURATED" // 人工审核锚点（默认；严禁声称是精确摄影测量）
   | "NOT_AVAILABLE";

/** 单点锚（归一化坐标 0-1） */
export interface LiveOverlayAnchor {
   x: number;
   y: number;
}

/**
 * 真实照片覆盖锚点（§17）：普通照片无完整相机参数时不允许自动 GPS projection，
 * 只能使用人工审核布点。KEY 用地理对象名（everest / summit / lhotse / nuptse /
 * campII / campIV / southCol / westernCwm …），取值必须人工审核并显式 CURATED。
 */
export interface LiveOverlayAnchors {
   projectionType: OverlayProjectionType;
   points: Record<string, LiveOverlayAnchor>;
   /** 锚定依据 / 视角说明（如“自西库姆望向珠峰南壁”） */
   note?: string;
}

/**
 * LIVE 场景覆盖路线绘制策略（§18）：不是每张照片都适合画整条蓝色折线。
 *   - full-route  : LIVE-A 全景路线 overview
 *   - nearby      : LIVE-B 只画当前附近路线
 *   - current-next: LIVE-C 只画 current → next waypoint
 *   - none        : LIVE-D 甚至不画路线，只标 SUMMIT
 */
export type LiveRouteOverlayMode =
   | "full-route"
   | "nearby"
   | "current-next"
   | "none";

/**
 * 实景阶段切换过渡（§14）：crossfade + very subtle scale。
 * 禁止大幅 zoom / 旋转 / Ken Burns / 电影感转场。
 */
export interface LiveSceneTransition {
   /** 交叉淡化时长（推荐 500-800ms） */
   crossfadeMs: number;
   /** 细微放大上限（推荐 ≤1.04），跨场景时渐进到下一张 */
   maxScale: number;
}

/**
 * LIVE 场景定义（§4/§5/§6）。
 *
 * 不做“重新发明一套 progress”：场景覆盖范围用 StageMap 的阶段 id 声明，
 * 实际 progress 边界全部由 stageMap（→ routeIndex 计算值）派生，
 * 禁止手写任何进度（对齐 Gate 2 约束 3）。
 */
export interface LiveSceneDef {
   /** 场景 id（如 "live-a" = Base Camp / Approach） */
   id: string;
   /** 场景语义名（校验层可读） */
   label: string;
   /** 覆盖的 StageMap 阶段 id（按顺序、互不重叠、全部覆盖一次）。 */
   stageIds: string[];
   /** 引用 MediaManifest 中本场景的正式影像（Gate 3.3B 绑定；无 = 兜底 TERRAIN） */
   assetId?: string;
   /**
    * LIVE 实景说明文案（HUD 上常显一行）。缺省时引擎按珠峰口径回退，
    * 非珠峰世界必须声明，否则会显示成「真实珠峰影像」。
    */
   infoText?: string;
   /** 竖屏 crop（图片批准时必填，§12/§13） */
   crop?: LiveCrop;
   /** 覆盖锚点（图片批准后人工审核，§17） */
   anchors?: LiveOverlayAnchors;
   /** 路线叠加策略（§18） */
   routeOverlay: LiveRouteOverlayMode;
   /** 阶段切换过渡（§14） */
   transition?: LiveSceneTransition;
}

/**
 * Dual Visual Mode 运行配置（挂在 ExpeditionAttachment 上）。
 * 默认 LIVE；LIVE 不可用时始终回退 TERRAIN（页面不能空白，§24）。
 */
export interface ExpeditionVisualModeConfig {
   /** 会话内默认模式（用户显示器选择后，页面仅在本会话例记；不要求长 期存储） */
   defaultMode: ExpeditionVisualMode;
   /** LIVE 不可用时的兜底（本 Gate 固定为 TERRAIN） */
   fallback: ExpeditionVisualMode;
   /** LIVE 场景列表（共同覆盖全部 stageMap；每个场景可绑定 approved 影像） */
   liveScenes: LiveSceneDef[];
}

/** 回退 LIVE → TERRAIN 的原因（§23/§24 的 console.warn 文案来源） */
export type VisualFallbackReason =
   | "user-selected" // 用户主动选择 TERRAIN（非兜底，不 warn）
   | "no-live-assets" // 场景未绑定任何影像
   | "asset-not-approved" // 绑定但 reviewStatus ≠ approved
   | "no-scene-match" // 未命中任何 LIVE 场景（配置必须全覆盖，不应发生）
   | "load-failed" // 运行时图片解码失败（页面层由 renderer 上报，纯 resolver 不产生）
   | "manifest-invalid"; // Manifest 结构无效（校验层已拦，运行时几乎不可达）

/**
 * 视觉层最终交付（纯函数 resolveExpeditionVisual() 产出的，页面渲染层下一步消费）：
 *   LIVE   → 拿到可渲染图片 + crop + 锚点 + overlay + 过渡
 *   TERRAIN → 无图，用现有 DEM 场景（camera / 视角），不再制作照片感
 */
export type ExpeditionVisualPresentation =
   | {
        kind: "LIVE";
        scene: LiveSceneDef;
        stageIndex: number;
        /** 本地资源路径（相对 miniprogram/assets/**） */
        image: string;
        crop: LiveCrop;
        routeOverlay: LiveRouteOverlayMode;
        /** 已废弃的 CURATED 锚点（§41）：生产数据不再附带；仅 dev/review 可能提供 */
        anchors: LiveOverlayAnchors | null;
        /** 运行时校准视图（§31）—— route 描线唯一真相源；无/REPRESENTATIVE → 不画路线 */
        calibration: RuntimeSceneCalibration | null;
        transition?: LiveSceneTransition;
     }
   | {
        kind: "TERRAIN";
        /** user-selected = 主动选择；其余 = 兜底（调用方可 console.warn） */
        reason: VisualFallbackReason;
        stageIndex: number;
     };
