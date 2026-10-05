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

/** §16 投影状态（严格执行层级；REPRESENTATIVE 一律不开 routeOverlay） */
export type PhotoProjectionStatus =
  | "VERIFIED" // 相机元数据充分 + 校准/验证均过严格阈值 → route 投影可靠
  | "CALIBRATED" // 人工 landmarks 求解得相机位姿，误差达标 → 可显示但标注 calibrated
  | "REPRESENTATIVE" // 照片真实、阶段代表性正确，但无足够相机信息保证精确 route
  | "UNAVAILABLE"; // 照片不适合做 route 投影，只做视觉背景

/** 单个 route 点对当前相机的可见性（§20 occlusion 语义） */
export type RouteVisibility = "VISIBLE" | "OCCLUDED" | "OUT_OF_FRAME";

/** landmark 角色：参与求解（calibration）或仅用于 hold-out 验证（validation） */
export type LandmarkRole = "calibration" | "validation";

/** 照片 EXIF / 记录级元数据 —— 缺失字段必须显式 unknown，禁止猜测成事实 */
export interface PhotoMetadata {
  imageWidth: number;
  imageHeight: number;
  cameraLat?: number;
  cameraLon?: number;
  cameraAltitudeM?: number;
  focalLengthMm?: number;
  focalLength35Mm?: number;
  yawDeg?: number;
  pitchDeg?: number;
  rollDeg?: number;
  /** 来源：如 EXIF / WikimediaCommonsFlicker / 人工评估 */
  metadataSource: string;
  /** 已知缺项（用于诚实标注） */
  unknown?: string[];
}

/** 3D 地标控制点 ↔ 2D 图像点 */
export interface LandmarkControlPoint {
  id: string;
  name: string;
  /** 世界坐标（米，本帧） */
  world: { x: number; y: number; z: number };
  /** 原始图（全分辨率）像素 */
  pixel: { x: number; y: number };
  role: LandmarkRole;
  /** 坐标来源 */
  source: string;
  /** 求解后投影回的原图像素（供误差展示） */
  projectedPixel?: { x: number; y: number };
  reprojectionErrorPx?: number;
}

/** 相机解（pose + intrinsics），状态区分 solved / preliminary */
export interface CameraSolution {
  status: "solved" | "preliminary";
  position: { x: number; y: number; z: number }; // 世界（米）
  yawDeg: number;
  pitchDeg: number;
  rollDeg: number;
  /** 焦距（px，对应原始图宽） */
  focalPx: number;
  /** 水平 FOV（度） */
  fovDeg: number;
  note?: string;
}

/** 图片裁剪 / 缩放的确定性变换（§18：校准基于原始坐标，裁图不得沿用原坐标） */
export interface ImageTransform {
  sourceWidth: number;
  sourceHeight: number;
  cropX: number;
  cropY: number;
  cropWidth: number;
  cropHeight: number;
  outputWidth: number;
  outputHeight: number;
}

/** 单条 route 运行点（已投影 + 可见性） */
export interface ProjectedRoutePoint {
  routeIndex: number;
  /** 运行归一化坐标 0..1（相对 portrait 派生图） */
  u: number;
  v: number;
  visibility: RouteVisibility;
}

/** 校准报告（每 LIVE 图一份：design/world/everest-live/calibration/<scene-id>.json） */
export interface CalibrationReportV1 {
  schemaVersion: 1;
  sceneId: string;
  assetId: string;
  status: PhotoProjectionStatus;
  media: {
    source: string;
    author: string;
    license: string;
    localAsset: string;
    dimensions: string;
  };
  metadata: PhotoMetadata;
  camera?: CameraSolution;
  imageTransform: ImageTransform;
  landmarks: LandmarkControlPoint[];
  reprojection: {
    medianPx: number;
    meanPx: number;
    maxPx: number;
    maxValidationPx: number;
    medianDiagPct: number; // 中位数 / 对角线
    imageDiagonalPx: number;
    thresholdMedianPx?: number;
    thresholdMaxValidationPx?: number;
    pass: boolean;
  };
  route: ProjectedRoutePoint[];
  /** 途经 waypoint（scene 级 waypoints.json 投影到运行图，仅 VISIBLE / in-frame） */
  waypoints: Array<{
    waypointId: string;
    u: number;
    v: number;
  }>;
  /** 统计（自动生成） */
  summary: {
    visibleCount: number;
    occludedCount: number;
    outOfFrameCount: number;
  };
  limitations: string[];
  generatedAt: string;
}

/** 运行时极简视图（微信端仅消费此层；route 已裁剪/合并） */
export interface RuntimeSceneCalibration {
  sceneId: string;
  assetId: string;
  status: PhotoProjectionStatus;
  /** 运行归一化 route（已投影 + 可见性 + 可选简化） */
  route: ProjectedRoutePoint[];
  /** 起/终点与途经 waypoint 的运行归一化标点（仅 VISIBLE） */
  waypoints: Array<{
    waypointId: string;
    u: number;
    v: number;
  }>;
  /** 说明文案 / 指标（用于“实景” info 展示） */
  info: {
    status: PhotoProjectionStatus;
    medianPx: number;
    maxValidationPx: number;
    note: string;
  };
}