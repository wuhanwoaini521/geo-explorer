/**
 * 校准工作流：landmarks(像素) + 相机 guess → solve → 全路线投影 + DEM 遮挡 →
 * CalibrationReportV1（与 miniprogram/engine 运行时 schema §31 byte-compatible）。
 *
 * 数据流（全本地，无网络）：
 *   pixels.json（viewer 里点出的地标 0..1 坐标）
 *   └→ solveCameraPose → 相机位姿 + 焦距
 *     └→ DEM 遮挡（optional）→ 每路线点 VISIBLE / OCCLUDED / OUT_OF_FRAME
 *       └→ 投影 route[]（运行归一化）→ CalibrationReportV1
 *          → design/world/everest-live/calibration/<scene>.json（+ .md）
 */
import {
  geodToWorld,
  projectWorldToPixel,
  solveCameraPose,
  type CameraPose,
  type SolverObservation,
  type WorldPt,
} from "./math/camera-math.js";
import { classifyVisibility, type DemGrid } from "./math/occlusion.js";
import { LANDMARKS, type Landmark, type SceneDef } from "./scenes.js";

/* ------------------------------------------------------------------ */
/* 类型                                                               */
/* ------------------------------------------------------------------ */

/** viewer 导出的地标标注（u/v 为 0..1 归一化） */
export interface PixelInput {
  landmarkId: string;
  u: number;
  v: number;
}

/** 求解观测：3D 世界点在 SolvePose 解内投影对应 */
export interface LandmarkObs {
  world: WorldPt;
  pixel: { x: number; y: number };
  landmark: Landmark;
}

export interface SolveOutcome {
  pose: CameraPose;
  focalPx: number;
  medianPx: number;
  maxPx: number;
  perPointPx: number[];
}

export interface RoutePoint {
  routeIndex: number;
  world: WorldPt;
}

type RouteVis = "VISIBLE" | "OCCLUDED" | "OUT_OF_FRAME";

export interface ProjectedPoint {
  routeIndex: number;
  u: number;
  v: number;
  visibility: RouteVis;
}

/** 输出文件的报告类型（与 miniprogram/types/calibration.ts 对齐） */
export interface CalibrationReportV1Out {
  schemaVersion: 1;
  sceneId: string;
  assetId: string;
  status: "VERIFIED" | "CALIBRATED" | "REPRESENTATIVE";
  media: {
    source: string;
    author: string;
    license: string;
    localAsset: string;
    dimensions: string;
  };
  metadata: {
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
    metadataSource: string;
    unknown?: string[];
  };
  camera?: {
    status: "solved" | "preliminary";
    position: { x: number; y: number; z: number };
    yawDeg: number;
    pitchDeg: number;
    rollDeg: number;
    focalPx: number;
    fovDeg: number;
  };
  imageTransform: {
    sourceWidth: number;
    sourceHeight: number;
    cropX: number;
    cropY: number;
    cropWidth: number;
    cropHeight: number;
    outputWidth: number;
    outputHeight: number;
  };
  landmarks: Array<{
    id: string;
    name: string;
    world: { x: number; y: number; z: number };
    pixel: { x: number; y: number };
    role: "calibration" | "validation";
    source: string;
    reprojectionErrorPx: number;
  }>;
  reprojection: {
    medianPx: number;
    meanPx: number;
    maxPx: number;
    maxValidationPx: number;
    medianDiagPct: number;
    maxValidationDiagPct: number;
    imageDiagonalPx: number;
    pass: boolean;
  };
  route: ProjectedPoint[];
  waypoints: Array<{ waypointId: string; u: number; v: number }>;
  summary: { visibleCount: number; occludedCount: number; outOfFrameCount: number };
  limitations: string[];
  generatedAt: string;
}

/* ------------------------------------------------------------------ */
/* 解析标注                                                            */
/* ------------------------------------------------------------------ */

/** 归一化标点 → 3D 世界观测（跳过未知 id） */
export function landmarkObs(scene: SceneDef, mark: PixelInput): LandmarkObs | null {
  const l = LANDMARKS.find((x) => x.id === mark.landmarkId);
  if (!l) return null;
  return {
    world: geodToWorld({ lat: l.lat, lon: l.lon, elevationM: l.elevationM }),
    pixel: { x: mark.u * scene.width, y: mark.v * scene.height },
    landmark: l,
  };
}

/* ------------------------------------------------------------------ */
/* 求解                                                                */
/* ------------------------------------------------------------------ */

/** 从标注求解位姿；观测 < 3 → null */
export function solveFromPixels(
  scene: SceneDef,
  marks: PixelInput[],
  init: { pose: CameraPose; focalPx: number },
): SolveOutcome | null {
  const observations: SolverObservation[] = [];
  for (const m of marks) {
    const obs = landmarkObs(scene, m);
    if (!obs) continue;
    observations.push({ world: obs.world, pixel: obs.pixel });
  }
  if (observations.length < 3) return null;
  const solved = solveCameraPose(
    observations,
    { pose: init.pose, focalPx: init.focalPx, cx: scene.width / 2, cy: scene.height / 2 },
    scene.width,
    scene.height,
    {
      x: true,
      y: true,
      z: true,
      yaw: true,
      pitch: true,
      roll: true,
      f: scene.freedom === "attitude" ? false : true,
    },
  );
  return {
    pose: { ...solved.pose, position: { ...solved.pose.position } },
    focalPx: solved.focalPx,
    medianPx: solved.medianPx,
    maxPx: solved.maxPx,
    perPointPx: solved.perPointPx,
  };
}

/* ------------------------------------------------------------------ */
/* 路线投影 + 遮挡                                                      */
/* ------------------------------------------------------------------ */

/** 与图标对齐：DEM 视线遮挡（只算 OCCLUDED / VISIBLE；越界单独处理） */
function occlusionOf(dem: DemGrid, eye: WorldPt, pts: WorldPt[]): RouteVis[] {
  const raw = classifyVisibility(dem, eye, pts);
  return raw.map((s) => (s === "OCCLUDED" ? "OCCLUDED" : "VISIBLE"));
}

/** 投影全部路线点 */
export function projectRoute(
  scene: SceneDef,
  pose: CameraPose,
  focalPx: number,
  dem: DemGrid | null,
  route: RoutePoint[],
): ProjectedPoint[] {
  const cx = scene.width / 2;
  const cy = scene.height / 2;
  const eye: WorldPt = { x: pose.position.x, y: pose.position.y, z: pose.position.z };
  const occ = dem ? occlusionOf(dem, eye, route.map((r) => r.world)) : route.map(() => "VISIBLE" as RouteVis);
  return route.map((rp, i) => {
    const shot = projectWorldToPixel(rp.world, pose, { f: focalPx, cx, cy });
    if (!shot) {
      return { routeIndex: rp.routeIndex, u: NaN, v: NaN, visibility: "OUT_OF_FRAME" };
    }
    const u = shot.u / scene.width;
    const v = shot.v / scene.height;
    const inFrame = u >= -0.02 && u <= 1.02 && v >= -0.02 && v <= 1.02;
    if (!inFrame) return { routeIndex: rp.routeIndex, u, v, visibility: "OUT_OF_FRAME" };
    return { routeIndex: rp.routeIndex, u, v, visibility: occ[i] };
  });
}

/** waypoints（里程碑）投影，仅 VISIBLE + in-frame 保留 */
export function projectWaypoints(
  scene: SceneDef,
  pose: CameraPose,
  focalPx: number,
  dem: DemGrid | null,
  waypoints: Array<{ id: string; world: [number, number, number] }>,
): Array<{ waypointId: string; u: number; v: number }> {
  const cx = scene.width / 2;
  const cy = scene.height / 2;
  const out: Array<{ waypointId: string; u: number; v: number }> = [];
  for (const w of waypoints) {
    const world: WorldPt = { x: w.world[0], y: w.world[1], z: w.world[2] };
    const vis = dem
      ? classifyVisibility(dem, { x: pose.position.x, y: pose.position.y, z: pose.position.z }, [world])[0]
      : "VISIBLE";
    if (vis !== "VISIBLE") continue;
    const shot = projectWorldToPixel(world, pose, { f: focalPx, cx, cy });
    if (!shot) continue;
    const u = shot.u / scene.width;
    const v = shot.v / scene.height;
    if (u < 0 || u > 1 || v < 0 || v > 1) continue;
    out.push({ waypointId: w.id, u, v });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* 报告装配                                                            */
/* ------------------------------------------------------------------ */

function diagPct(scene: SceneDef, px: number): number {
  return (px / Math.hypot(scene.width, scene.height)) * 100;
}

/** leave-one-out 验证：每次剔除一个标点，量它在重建 pose 下的重投影误差 */
function leaveOneOutValidation(
  scene: SceneDef,
  observations: SolverObservation[],
  init: { pose: CameraPose; focalPx: number },
): number {
  let worst = 0;
  for (let i = 0; i < observations.length; i++) {
    const others = observations.filter((_, j) => j !== i);
    if (others.length < 3) continue;
    const solved = solveCameraPose(
      others,
      { pose: init.pose, focalPx: init.focalPx, cx: scene.width / 2, cy: scene.height / 2 },
      scene.width,
      scene.height,
      { x: true, y: true, z: true, yaw: true, pitch: true, roll: true, f: true },
    );
    const shot = projectWorldToPixel(observations[i].world, solved.pose, {
      f: solved.focalPx,
      cx: scene.width / 2,
      cy: scene.height / 2,
    });
    if (!shot) {
      worst = Infinity;
      continue;
    }
    const err = Math.hypot(shot.u - observations[i].pixel.x, shot.v - observations[i].pixel.y);
    if (err > worst) worst = err;
  }
  return worst;
}

/** 状态机（与 calibration-validate.ts §43 语义锁定） */
export function statusFromStats(
  medianDiagPct: number,
  maxValidationPct: number,
  landmarkCount: number,
): "VERIFIED" | "CALIBRATED" | "REPRESENTATIVE" {
  if (!Number.isFinite(medianDiagPct) || landmarkCount === 0) return "REPRESENTATIVE";
  if (medianDiagPct <= 0.5 && maxValidationPct <= 0.75) return "VERIFIED";
  if (medianDiagPct <= 0.5) return "CALIBRATED";
  return "REPRESENTATIVE";
}

/** 场景的媒体元数据（来源 ：/media 清单） */
function sceneMedia(scene: SceneDef): {
  source: string;
  author: string;
  license: string;
  localAsset: string;
  dimensions: string;
} {
  if (scene.id === "live-a") {
    return {
      source: "https://commons.wikimedia.org/wiki/File:Mount_Everest_from_Kala_Patthar.jpg",
      author: "Matheus Hobold Sovernigo",
      license: "CC BY-SA 4.0",
      localAsset: "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
      dimensions: "1080×1920 (derivative of 5848×4387)",
    };
  }
  return { source: "unknown", author: "unknown", license: "unknown", localAsset: "unknown", dimensions: "unknown" };
}

/** 完整装配：求解 → 投影 route/waypoints → LOO 验证 → 状态机 → 报告 */
export function buildReportData(opts: {
  scene: SceneDef;
  pixels: PixelInput[];
  dem: DemGrid | null;
  route: RoutePoint[];
  waypoints: Array<{ id: string; world: [number, number, number] }>;
  extraLimitations?: string[];
}): { report: CalibrationReportV1Out; status: string; route: ProjectedPoint[] } {
  const { scene, pixels, dem, route: routeData, waypoints: waypointData } = opts;
  const guess = scene.cameraGuesses!;

  const init: { pose: CameraPose; focalPx: number } = {
    pose: {
      position: geodToWorld({ lat: guess.lat, lon: guess.lon, elevationM: guess.elevationM }),
      yawDeg: guess.yawDeg,
      pitchDeg: guess.pitchDeg,
      rollDeg: guess.rollDeg,
    },
    focalPx: guess.focalPx,
  };

  const obsList: SolverObservation[] = [];
  const landmarkMeta: Array<{ id: string; name: string; world: WorldPt; pixel: { x: number; y: number } }> = [];
  for (const m of pixels) {
    const obs = landmarkObs(scene, m);
    if (!obs) continue;
    obsList.push({ world: obs.world, pixel: obs.pixel });
    landmarkMeta.push({ id: obs.landmark.id, name: obs.landmark.nameEn, world: obs.world, pixel: obs.pixel });
  }
  const outcome = solveFromPixels(scene, pixels, init);
  if (!outcome) {
    throw new Error(`求解失败：有效的观测 <3 个（给了 ${landmarkMeta.length}）`);
  }

  const solution = outcome as SolveOutcome;
  const route = projectRoute(scene, solution.pose, solution.focalPx, dem, routeData);
  const waypoints = projectWaypoints(scene, solution.pose, solution.focalPx, dem, waypointData);

  const diag = Math.hypot(scene.width, scene.height);
  const medianPct = diagPct(scene, solution.medianPx);
  const validationPx = leaveOneOutValidation(scene, obsList, init);
  const maxValidationPct = diagPct(scene, validationPx);
  const status = statusFromStats(medianPct, maxValidationPct, pixels.length);

  const meanPx =
    solution.perPointPx.reduce((a, b) => a + (isFinite(b) ? b : 0), 0) / solution.perPointPx.length;
  const pass = medianPct <= 0.5 && maxValidationPct <= 0.75;

  const report: CalibrationReportV1Out = {
    schemaVersion: 1,
    sceneId: scene.id,
    assetId: scene.id === "live-a" ? "live-a-kala-patthar" : scene.id,
    status,
    media: sceneMedia(scene),
    metadata: {
      imageWidth: scene.width,
      imageHeight: scene.height,
      cameraLat: guess.lat,
      cameraLon: guess.lon,
      cameraAltitudeM: guess.elevationM,
      focalLengthMm: 28,
      focalLength35Mm: 28,
      yawDeg: solution.pose.yawDeg,
      pitchDeg: solution.pose.pitchDeg,
      rollDeg: solution.pose.rollDeg,
      metadataSource: scene.id === "live-a" ? "WikimediaCommons(FILE)·相机 EXIF SONY ILCE-6000(Kala Patthar)" : "unknown",
      unknown: scene.id === "live-a" ? [] : ["cameraPose", "intrinsics", "拍摄点"],
    },
    camera: {
      status: "solved",
      position: {
        x: solution.pose.position.x,
        y: solution.pose.position.y,
        z: solution.pose.position.z,
      },
      yawDeg: solution.pose.yawDeg,
      pitchDeg: solution.pose.pitchDeg,
      rollDeg: solution.pose.rollDeg,
      focalPx: solution.focalPx,
      fovDeg: (2 * Math.atan2(scene.width / 2, solution.focalPx) * 180) / Math.PI,
    },
    imageTransform: {
      sourceWidth: scene.width,
      sourceHeight: scene.height,
      cropX: 0,
      cropY: 0,
      cropWidth: scene.width,
      cropHeight: scene.height,
      outputWidth: scene.width,
      outputHeight: scene.height,
    },
    landmarks: landmarkMeta.map((lm, i) => ({
      id: lm.id,
      name: lm.name,
      world: lm.world,
      pixel: lm.pixel,
      role: i === 0 ? ("validation" as const) : ("calibration" as const),
      source: "viewer",
      reprojectionErrorPx: solution.perPointPx[i] ?? NaN,
    })),
    reprojection: {
      medianPx: solution.medianPx,
      meanPx,
      maxPx: solution.maxPx,
      maxValidationPx: validationPx,
      medianDiagPct: medianPct,
      maxValidationDiagPct: maxValidationPct,
      imageDiagonalPx: diag,
      pass,
    },
    route,
    waypoints,
    summary: {
      visibleCount: route.filter((r) => r.visibility === "VISIBLE").length,
      occludedCount: route.filter((r) => r.visibility === "OCCLUDED").length,
      outOfFrameCount: route.filter((r) => r.visibility === "OUT_OF_FRAME").length,
    },
    limitations: [
      ...(scene.id === "live-a"
        ? ["相机来自 Wikimedia 元数据（Kala Patthar 拍摄点）；原始 EXIF 缺失时 pose 不会同时为官方。"]
        : ["该场景尚未收录原始照片/相机元数据，仅机器投影。"]),
      ...(opts.extraLimitations ?? []),
    ],
    generatedAt: new Date().toISOString(),
  };

  return { report, status, route };
}

/* ------------------------------------------------------------------ */
/* REPRESENTATIVE 兜底报告（§47：无法保证精确投影 → 诚实不画路线）      */
/* ------------------------------------------------------------------ */

/**
 * 生成 REPRESENTATIVE 报告（routeOverlay 强制 false）。
 * 无任何 landmark 求解：camera 省略、route/waypoints 为空、reprojection 全 0 只作占位。
 * “坐标 guess”只体现在 metadata（EXIF/已知拍摄点），不冒充 camera 解。
 */
export function representativeReport(scene: SceneDef): {
  report: CalibrationReportV1Out;
  status: string;
  route: ProjectedPoint[];
} {
  const media = sceneMedia(scene);
  const derivative = { width: scene.width, height: scene.height };
  // 原图（已知）与派生图对角线
  const originalDiag = scene.id === "live-a" ? Math.hypot(5848, 4387) : Math.hypot(scene.width, scene.height);
  const liveGP: { lat: number; lon: number; alt: number } | null =
    scene.id === "live-a" ? { lat: 27.998912, lon: 86.856634, alt: 5545 } : null;
  const limitations = [
    "未执行任何 landmark 求解：status=REPRESENTATIVE，routeOverlay 强制为 false（禁止画“看着像”的假路线）。",
    liveGP
      ? "真实珠峰照片：Kala Patthar 视角（5848×4387，CC BY-SA 4.0）；camera GPS 取自原图 EXIF。TERRAIN 模式提供准确科学地形路线。"
      : "该场景尚未收录可求解照片/相机元数据；TERRAIN 模式提供准确科学地形路线。",
    "yaw/pitch/roll/焦距/内参 未校准：camera 解省略；reprojection 全 0 仅为 schema 占位，不作任何精度声明。",
    "待人工视觉核签 + viewer 标点求解后可升级为 CALIBRATED/VERIFIED。",
  ];
  const report: CalibrationReportV1Out = {
    schemaVersion: 1,
    sceneId: scene.id,
    assetId: scene.id === "live-a" ? "live-a-kala-patthar" : scene.id,
    status: "REPRESENTATIVE",
    media,
    metadata: {
      imageWidth: scene.id === "live-a" ? 5848 : scene.width,
      imageHeight: scene.id === "live-a" ? 4387 : scene.height,
      cameraLat: liveGP?.lat,
      cameraLon: liveGP?.lon,
      cameraAltitudeM: liveGP?.alt,
      metadataSource:
        scene.id === "live-a"
          ? "WikimediaCommons(FILE)·相机 EXIF(SONY ILCE-6000)·Kala Patthar 拍摄点 GPS"
          : "unknown",
      unknown: ["yaw", "pitch", "roll", "focalLength", "intrinsics", "实际拍摄海拔精度"],
    },
    imageTransform: {
      sourceWidth: derivative.width,
      sourceHeight: derivative.height,
      cropX: 0,
      cropY: 0,
      cropWidth: derivative.width,
      cropHeight: derivative.height,
      outputWidth: derivative.width,
      outputHeight: derivative.height,
    },
    landmarks: [],
    reprojection: {
      medianPx: 0,
      meanPx: 0,
      maxPx: 0,
      maxValidationPx: 0,
      medianDiagPct: 0,
      maxValidationDiagPct: 0,
      imageDiagonalPx: originalDiag,
      pass: false,
    },
    route: [],
    waypoints: [],
    summary: { visibleCount: 0, occludedCount: 0, outOfFrameCount: 0 },
    limitations,
    generatedAt: new Date().toISOString(),
  };
  return { report, status: "REPRESENTATIVE", route: [] };
}

/** CLI 组装：load 静态数据 → buildReportData → 写 JSON + MD */
export function renderMarkdown(r: CalibrationReportV1Out, scene: SceneDef): string {
  return `# ${scene.id} · 校准报告

- 状态：**${r.status}**
- 重投影：median=${r.reprojection.medianPx.toFixed(2)}px · max=${r.reprojection.maxPx.toFixed(2)}px
- LOO 验证（最差）：${r.reprojection.maxValidationPx.toFixed(2)}px
- DEM 遮挡：VISIBLE ${r.summary.visibleCount} / OCCLUDED ${r.summary.occludedCount} / OUT_OF_FRAME ${r.summary.outOfFrameCount}
- route 点位：${r.route.length}
- kala：${r.media.author} · 版权 ${r.media.license}

> routeOverlay 仅允许 VERIFIED / CALIBRATED；REPRESENTATIVE 一律不开。
`;
}