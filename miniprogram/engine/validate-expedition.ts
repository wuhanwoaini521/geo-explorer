/**
 * Everest Expedition V2 校验 —— 纯逻辑，可在 Node 单测。
 *
 * 校验对象：`ExpeditionAttachment`（与其组合的 Exploration 载体见
 * data/expeditions/everest.ts）。产出机器可读报告，不修改任何数据。
 */
import type {
  CandidateMediaAsset,
  ExpeditionAttachment,
  ExpeditionType,
  ExpeditionVisualMode,
  LiveCrop,
  LiveOverlayAnchors,
  LiveSceneDef,
  MediaAsset,
  MediaEntityType,
  MediaManifest,
  MediaReviewStatus,
  OverlayProjectionType,
  RouteGeometryData,
  RouteIndex,
  RouteMilestoneSample,
} from "../types/expedition";

export interface ValidationIssue {
  level: "error" | "warning";
  path: string;
  message: string;
}
export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

function done(issues: ValidationIssue[]): ValidationResult {
  return { ok: issues.every((i) => i.level !== "error"), issues };
}
function issue(
  issues: ValidationIssue[],
  path: string,
  message: string,
  level: "error" | "warning" = "error",
) {
  issues.push({ level, path, message });
}

/* ------------------------------------------------------------------ */
/* RouteGeometryData（原始静态 JSON）                                   */
/* ------------------------------------------------------------------ */

export function validateRouteGeometryData(
  raw: RouteGeometryData,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!raw || typeof raw !== "object") {
    return done([
      { level: "error", path: "$", message: "RouteGeometryData 缺失" },
    ]);
  }
  if (!(raw.schemaVersion >= 1))
    issue(issues, "schemaVersion", `=${raw.schemaVersion}`);
  if (!raw.id) issue(issues, "id", "缺少 id");
  if (raw.geodetic !== "lonlat-wgs84")
    issue(issues, "geodetic", `=${raw.geodetic}`);
  if (!(raw.terrain && raw.terrain.baseM > 0))
    issue(issues, "terrain.baseM", `=${raw.terrain?.baseM}`);

  const pts = raw.points;
  if (!Array.isArray(pts) || pts.length < 2) {
    issue(issues, "points", `数量=${pts?.length}`);
  } else {
    pts.forEach((pt, i) => {
      if (
        !Number.isFinite(pt.x) ||
        !Number.isFinite(pt.y) ||
        !Number.isFinite(pt.z)
      ) {
        issue(issues, `points[${i}]`, `非法坐标 (${pt.x},${pt.y},${pt.z})`);
      }
      const nx = pts[i + 1];
      if (nx) {
        const dl = Math.hypot(nx.x - pt.x, nx.y - pt.y);
        if (!(dl > 0)) issue(issues, `points[${i}]`, `与下一点重合 dl=${dl}`);
      }
    });
  }

  const ms = raw.milestones;
  if (!Array.isArray(ms) || ms.length < 2) {
    issue(issues, "milestones", `数量=${ms?.length}`);
  } else {
    ms.forEach((m, i) => {
      if (!m.id) issue(issues, `milestones[${i}].id`, "缺少 id");
      if (!(m.refM > 0)) issue(issues, `milestones[${i}].refM`, `=${m.refM}`);
      if (!(m.demM > 0)) issue(issues, `milestones[${i}].demM`, `=${m.demM}`);
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lon))
        issue(issues, `milestones[${i}]`, "缺少经纬度");
    });
  }
  return done(issues);
}

/* ------------------------------------------------------------------ */
/* RouteIndex                                                          */
/* ------------------------------------------------------------------ */

export function validateRouteIndex(index: RouteIndex): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!index)
    return done([{ level: "error", path: "$", message: "RouteIndex 缺失" }]);

  if (!(index.pointCount >= 2))
    issue(issues, "pointCount", `=${index.pointCount}`);
  if (!(index.segmentCount === index.pointCount - 1))
    issue(issues, "segmentCount", `=${index.segmentCount}`);

  const arrs: Array<[string, number[] | undefined]> = [
    ["cumulative", index.cumulative],
    ["demM", index.demM],
    ["xs", index.xs],
    ["ys", index.ys],
    ["lats", index.lats],
    ["lons", index.lons],
  ];
  for (const [k, arr] of arrs) {
    if (!Array.isArray(arr) || arr.length !== index.pointCount) {
      issue(issues, k, `长度=${arr?.length}，应为 ${index.pointCount}`);
    }
  }

  const c = index.cumulative;
  if (Array.isArray(c) && c.length >= 2) {
    for (let i = 1; i < c.length; i++) {
      if (!(c[i] > c[i - 1]))
        issue(issues, `cumulative[${i}]`, `非严格递增 ${c[i - 1]}→${c[i]}`);
    }
    if (Math.abs(c[c.length - 1] - index.totalDistanceM) > 1e-6) {
      issue(
        issues,
        "totalDistanceM",
        `=${index.totalDistanceM}，但最后累计=${c[c.length - 1]}`,
      );
    }
  }
  if (!(index.totalDistanceM > 0))
    issue(issues, "totalDistanceM", `=${index.totalDistanceM}`);
  if (!(index.total3dDistanceM >= index.totalDistanceM))
    issue(issues, "total3dDistanceM", "3D 应 >= 2D");

  const ms = index.milestones;
  if (!Array.isArray(ms) || ms.length < 2) {
    issue(issues, "milestones", `数量=${ms?.length}`);
  } else {
    let prev: RouteMilestoneSample | undefined;
    for (const m of ms) {
      if (!(m.distanceM >= 0) || !(m.distanceM <= index.totalDistanceM)) {
        issue(
          issues,
          `milestones[${m.id}]`,
          `distanceM=${m.distanceM} 越界`,
          "warning",
        );
      }
      if (prev) {
        if (m.distanceM <= prev.distanceM) {
          issue(
            issues,
            `milestones[${m.id}]`,
            `distanceM 未严格递增 (<= ${prev.id} ${prev.distanceM})`,
          );
        }
        if (m.refM < prev.refM) {
          issue(
            issues,
            `milestones[${m.id}].refM`,
            `参考海拔递减 (${prev.id} ${prev.refM}→${m.id} ${m.refM})`,
          );
        }
      }
      prev = m;
    }
    const last = ms[ms.length - 1];
    if (last.kind !== "summit")
      issue(
        issues,
        `milestones[${last.id}].kind`,
        `最后里程碑 kind=${last.kind}，应为 summit`,
      );
    if (Math.abs(1 - last.progress) > 0.002) {
      issue(
        issues,
        `milestones[${last.id}].progress`,
        `终点 progress=${last.progress}`,
      );
    }
  }
  return done(issues);
}

/* ------------------------------------------------------------------ */
/* CameraConfig                                                        */
/* ------------------------------------------------------------------ */

export function validateCamera(
  camera: ExpeditionAttachment["camera"],
): ValidationResult {
  if (!camera)
    return done([
      { level: "error", path: "camera", message: "CameraConfig 缺失" },
    ]);
  const issues: ValidationIssue[] = [];
  const segs = camera.segments;
  if (!Array.isArray(segs) || segs.length === 0) {
    issue(issues, "camera.segments", "未配置相机段");
    return done(issues);
  }

  let prevTo = 0;
  segs.forEach((s, i) => {
    if (!(s.fromProgress >= prevTo - 1e-6)) {
      issue(
        issues,
        `camera.segments[${i}]`,
        `fromProgress=${s.fromProgress} < previous to=${prevTo}`,
      );
    }
    if (!(s.toProgress >= s.fromProgress))
      issue(
        issues,
        `camera.segments[${i}]`,
        `区间 ${s.fromProgress}→${s.toProgress}`,
      );
    prevTo = s.toProgress;
  });
  if (Math.abs(prevTo - 1) > 1e-3)
    issue(issues, "camera.segments", `末端 ends=${prevTo}≈1`);
  return done(issues);
}

/* ------------------------------------------------------------------ */
/* MediaManifest                                                       */
/* ------------------------------------------------------------------ */

const MEDIA_KINDS: MediaAsset["kind"][] = [
  "photograph",
  "render",
  "diagram",
  "illustration",
  "video",
  "satellite",
  "scientific",
  "terrain",
];
const MEDIA_ENTITY_TYPES: MediaEntityType[] = [
  "place",
  "knowledge",
  "expedition",
  "waypoint",
  "stage",
];
const GEOGRAPHIC_ROLES: MediaAsset["geographicRole"][] = [
  "EXACT",
  "REPRESENTATIVE",
];
const REVIEW_STATUSES: MediaAsset["reviewStatus"][] = [
  "draft",
  "review",
  "approved",
  "rejected",
];
const CANDIDATE_STATUSES: CandidateMediaAsset["reviewStatus"][] = [
  "draft",
  "review",
  "rejected",
];

export function validateMediaManifest(m: MediaManifest): ValidationResult {
  if (!m)
    return done([
      { level: "error", path: "media", message: "MediaManifest 缺失" },
    ]);
  const issues: ValidationIssue[] = [];
  if (!(m.schemaVersion >= 1))
    issue(issues, "media.schemaVersion", `=${m.schemaVersion}`);
  if (!m.sceneId) issue(issues, "media.sceneId", "缺少 sceneId");

  const ids = new Set<string>();
  (m.assets ?? []).forEach((a, i) => {
    if (!a.id) issue(issues, `media.assets[${i}].id`, "缺少 id");
    else if (ids.has(a.id))
      issue(issues, `media.assets[${i}].id`, `重复 ${a.id}`);
    else ids.add(a.id);
    if (!a.entityType)
      issue(issues, `media.assets[${i}].entityType`, "缺少 entityType");
    else if (!MEDIA_ENTITY_TYPES.includes(a.entityType))
      issue(
        issues,
        `media.assets[${i}].entityType`,
        `未知=${a.entityType}`,
      );
    if (!a.entityId)
      issue(issues, `media.assets[${i}].entityId`, "缺少 entityId");
    if (!MEDIA_KINDS.includes(a.kind))
      issue(issues, `media.assets[${i}].kind`, `未知=${a.kind}`);
    if (!a.geographicRole)
      issue(issues, `media.assets[${i}].geographicRole`, "缺少 geographicRole");
    else if (!GEOGRAPHIC_ROLES.includes(a.geographicRole))
      issue(
        issues,
        `media.assets[${i}].geographicRole`,
        `非法=${a.geographicRole}（仅允许 EXACT / REPRESENTATIVE）`,
      );
    if (!a.localPath)
      issue(issues, `media.assets[${i}].localPath`, "缺少 localPath");
    if (!a.license) issue(issues, `media.assets[${i}].license`, "缺少 license");
    if (!REVIEW_STATUSES.includes(a.reviewStatus)) {
      issue(
        issues,
        `media.assets[${i}].reviewStatus`,
        `未知=${a.reviewStatus}`,
      );
    } else if (a.reviewStatus !== "approved") {
      issue(
        issues,
        `media.assets[${i}].reviewStatus`,
        "非 approved（正式清单仅收录批准项）",
        "warning",
      );
    } else {
      /* approved 正式资产：出处必须齐全（本地文件 + 可溯源署名） */
      if (!a.sourceUrl)
        issue(
          issues,
          `media.assets[${i}].sourceUrl`,
          "approved 资产缺少 sourceUrl",
          "warning",
        );
      if (!a.attribution)
        issue(
          issues,
          `media.assets[${i}].attribution`,
          "approved 资产缺少 attribution",
          "warning",
        );
    }
  });
  return done(issues);
}

/**
 * CandidateMediaAsset 校验：候选必须先说清“来自哪里”，但不要求已下载本地。
 * 与 validateMediaManifest 的分工：候选允许 license 缺失（版权未确认），
 * 不允许 approved 状态（approved 资产应晋升进正式清单）。
 */
export function validateCandidateMedia(
  a: CandidateMediaAsset,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!a) {
    return done([{ level: "error", path: "candidate", message: "缺失" }]);
  }
  if (!a.id) issue(issues, "candidate.id", "缺少 id");
  if (!a.entityType)
    issue(issues, "candidate.entityType", "缺少 entityType");
  else if (!MEDIA_ENTITY_TYPES.includes(a.entityType))
    issue(issues, "candidate.entityType", `未知=${a.entityType}`);
  if (!a.entityId) issue(issues, "candidate.entityId", "缺少 entityId");
  if (!a.purpose) issue(issues, "candidate.purpose", "缺少 purpose");
  if (!a.title) issue(issues, "candidate.title", "缺少 title");
  if (!a.sourceUrl) issue(issues, "candidate.sourceUrl", "缺少 sourceUrl");
  if (!MEDIA_KINDS.includes(a.kind))
    issue(issues, "candidate.kind", `未知=${a.kind}`);
  if (!GEOGRAPHIC_ROLES.includes(a.geographicRole))
    issue(
      issues,
      "candidate.geographicRole",
      `非法=${a.geographicRole}（仅允许 EXACT / REPRESENTATIVE）`,
    );
  if (!a.license)
    issue(
      issues,
      "candidate.license",
      "license 未确认（待人工审核，禁止填占位假值）",
      "warning",
    );
  if (!CANDIDATE_STATUSES.includes(a.reviewStatus)) {
    /* 运行时数据可能被手工写成 approved（类型层已排除），这里做防御性拦截 */
    issue(
      issues,
      "candidate.reviewStatus",
      (a.reviewStatus as MediaReviewStatus) === "approved"
        ? "候选不允许 approved（应晋升为正式 MediaAsset 进入清单）"
        : `未知=${a.reviewStatus}`,
    );
  }
  return done(issues);
}

/* ------------------------------------------------------------------ */
/* ExpeditionVisualModeConfig（Gate 3.3A · Dual Visual Mode）           */
/* ------------------------------------------------------------------ */

const VISUAL_MODES: ExpeditionVisualMode[] = ["LIVE", "TERRAIN"];
const OVERLAY_PROJECTIONS: OverlayProjectionType[] = [
  "EXACT",
  "CURATED",
  "NOT_AVAILABLE",
];
const ROUTE_OVERLAY_MODES = ["full-route", "nearby", "current-next", "none"];

function inUnitRange(v: number): boolean {
  return Number.isFinite(v) && v >= 0 && v <= 1;
}

/** 校验 crop 焦点/放缩（§12/§13） */
export function validateLiveCrop(
  crop: LiveCrop | undefined,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!crop) {
    issue(
      issues,
      path,
      "缺少 crop（专属竖屏焦点配置，禁止 object-fit 随机裁）",
      "warning",
    );
    return;
  }
  if (!inUnitRange(crop.focusX) || !inUnitRange(crop.focusY)) {
    issue(
      issues,
      `${path}.crop`,
      `焦点越出 [0,1]（(${crop.focusX}, ${crop.focusY})）`,
    );
  }
  if (!(Number.isFinite(crop.scale) && crop.scale >= 1)) {
    issue(issues, `${path}.crop.scale`, `应为 ≥1（=${crop.scale}）`);
  }
}

/** 校验锚接与投影类型（§17） */
export function validateLiveAnchors(
  anchors: LiveOverlayAnchors | undefined,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!anchors) return;
  if (!OVERLAY_PROJECTIONS.includes(anchors.projectionType)) {
    issue(
      issues,
      `${path}.anchors.projectionType`,
      `未知=${anchors.projectionType}`,
    );
    return;
  }
  if (anchors.projectionType === "EXACT" && !anchors.note) {
    issue(
      issues,
      `${path}.anchors`,
      "EXACT 投影必须附 camera/测绘及依据 note",
      "warning",
    );
  }
  if (anchors.projectionType === "CURATED" && !anchors.note) {
    issue(
      issues,
      `${path}.anchors`,
      "CURATED 锚点建议附人工审核说明",
      "warning",
    );
  }
  for (const [key, pt] of Object.entries(anchors.points ?? {})) {
    if (!inUnitRange(pt.x) || !inUnitRange(pt.y)) {
      issue(
        issues,
        `${path}.anchors.points[${key}]`,
        `坐标越界 (${pt.x},${pt.y})`,
      );
    }
  }
  if (
    (anchors.projectionType === "EXACT" ||
      anchors.projectionType === "CURATED") &&
    Object.keys(anchors.points ?? {}).length === 0
  ) {
    issue(
      issues,
      `${path}.anchors`,
      `${anchors.projectionType} 声明但无任何点（需人工审核布点）`,
      "warning",
    );
  }
}

/** 校验 LIVE 场景列表：查询定义、覆盖完整性、资产许可（§4-§12/§17/§18） */
export function validateVisualMode(
  exp: ExpeditionAttachment,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const v = exp.visualMode;
  if (!v || typeof v !== "object") {
    return done([
      {
        level: "error",
        path: "visualMode",
        message: "Dual Visual Mode 配置缺失",
      },
    ]);
  }
  if (!VISUAL_MODES.includes(v.defaultMode)) {
    issue(issues, "visualMode.defaultMode", `未知=${v.defaultMode}`);
  }
  if (v.fallback !== "TERRAIN") {
    issue(issues, "visualMode.fallback", `=${v.fallback}（Gate 固定 TERRAIN）`);
  }

  const stages = exp.stageMap;
  if (!Array.isArray(stages) || stages.length === 0) {
    issue(issues, "visualMode.liveScenes", "stageMap 缺失，无法校验场景覆盖");
    return done(issues);
  }
  const stageIdx = new Map(stages.map((s, i) => [s.id, i]));

  const scenes = v.liveScenes;
  if (!Array.isArray(scenes) || scenes.length === 0) {
    issue(issues, "visualMode.liveScenes", "未定义任何 LIVE 场景", "error");
    return done(issues);
  }

  const seen = new Set<string>();
  scenes.forEach((scene: LiveSceneDef, i: number) => {
    const p = `visualMode.liveScenes[${i}]`;
    if (!scene.id) issue(issues, `${p}.id`, "缺少 id");
    else if (seen.has(scene.id)) issue(issues, `${p}.id`, `重复 ${scene.id}`);
    else seen.add(scene.id);

    if (!Array.isArray(scene.stageIds) || scene.stageIds.length === 0) {
      issue(issues, `${p}.stageIds`, "未声明覆盖阶段");
    } else {
      for (const sid of scene.stageIds) {
        if (!stageIdx.has(sid))
          issue(issues, `${p}.stageIds`, `阶段不存在：${sid}`);
      }
    }
    if (!ROUTE_OVERLAY_MODES.includes(scene.routeOverlay)) {
      issue(issues, `${p}.routeOverlay`, `未知=${scene.routeOverlay}`);
    }

    // 图片绑定：仅在 binding 后才校验 crop/锚点/许可
    if (scene.assetId) {
      const asset = exp.media.assets.find((a) => a.id === scene.assetId);
      if (!asset) {
        issue(
          issues,
          `${p}.assetId`,
          `引用不存在 MediaAsset：${scene.assetId}`,
        );
      } else {
        if (asset.reviewStatus !== "approved") {
          issue(
            issues,
            `${p}.assetId`,
            `${scene.assetId} 未approved（正式场景仅收录批准项）`,
            "warning",
          );
        } else {
          validateLiveCrop(scene.crop, `${p}`, issues);
          validateLiveAnchors(
            scene.anchors ?? newAnchorsStub(),
            `${p}`,
            issues,
          );
        }
      }
    }
    if (scene.transition) {
      const t = scene.transition;
      if (!(t.crossfadeMs >= 300 && t.crossfadeMs <= 1200)) {
        issue(
          issues,
          `${p}.transition.crossfadeMs`,
          `=${t.crossfadeMs}（推荐 500-800）`,
          "warning",
        );
      }
      if (!(t.maxScale > 1 && t.maxScale <= 1.12)) {
        issue(
          issues,
          `${p}.transition.maxScale`,
          `=${t.maxScale}（应 >1 且 ≤1.12，禁大幅 zoom）`,
          "warning",
        );
      }
    }
  });

  // 覆盖完整性：StageMap 每段恰好属于一个场景（无空隙/无重叠）
  const covered = new Map<string, string>(); // stageId → sceneId
  scenes.forEach((scene) => {
    (scene.stageIds ?? []).forEach((sid) => {
      if (!stageIdx.has(sid)) return;
      const prev = covered.get(sid);
      if (prev && prev !== scene.id) {
        issue(
          issues,
          `visualMode.liveScenes[${scene.id}]`,
          `阶段 ${sid} 被多个场景覆盖（${prev} 与 ${scene.id}）`,
        );
      } else {
        covered.set(sid, scene.id);
        // 必须在 stageIds 有序：阶段序号随场景递增（覆盖不反向）
      }
    });
  });
  if (covered.size < stages.length) {
    const missing = stages.filter((s) => !covered.has(s.id)).map((s) => s.id);
    issue(
      issues,
      "visualMode.liveScenes",
      `以下阶段未被任何场景覆盖：${missing.join(", ")}`,
    );
  }

  return done(issues);
}

function newAnchorsStub(): LiveOverlayAnchors {
  return { projectionType: "NOT_AVAILABLE", points: {} };
}

/* ------------------------------------------------------------------ */
/* ExpeditionAttachment 整体                                            */
/* ------------------------------------------------------------------ */

const VALID_TYPES: ExpeditionType[] = [
  "CLIMB",
  "DIVE",
  "TRAVERSE",
  "FLYOVER",
  "CUTAWAY",
];

export function validateExpedition(
  exp: ExpeditionAttachment,
): ValidationResult {
  if (!exp || typeof exp !== "object") {
    return done([
      { level: "error", path: "$", message: "Expedition 附件缺失" },
    ]);
  }
  const issues: ValidationIssue[] = [];

  if (!VALID_TYPES.includes(exp.type))
    issue(issues, "type", `未知=${exp.type}`);
  if (!(exp.elevationPolicy?.model === "reference-anchored")) {
    issue(
      issues,
      "elevationPolicy.model",
      `=${JSON.stringify(exp.elevationPolicy)}`,
    );
  }

  issues.push(...validateRouteIndex(exp.routeIndex).issues);
  issues.push(...validateCamera(exp.camera).issues);
  issues.push(...validateMediaManifest(exp.media).issues);
  issues.push(...validateVisualMode(exp).issues);

  const stages = exp.stageMap;
  if (!Array.isArray(stages) || stages.length === 0) {
    issue(issues, "stageMap", "未定义阶段");
  } else {
    if (stages[0].fromDistanceM !== 0)
      issue(issues, "stageMap[0]", "首阶段起点≠0");
    for (let i = 1; i < stages.length; i++) {
      if (
        Math.abs(stages[i - 1].toDistanceM - stages[i].fromDistanceM) > 1e-3
      ) {
        issue(
          issues,
          `stageMap[${i}]`,
          `阶段不连续 ${stages[i - 1].id}.to↔${stages[i].id}.from`,
        );
      }
    }
    const lastS = stages[stages.length - 1];
    if (Math.abs(lastS.toDistanceM - exp.routeIndex.totalDistanceM) > 1e-3) {
      issue(
        issues,
        "stageMap[-1]",
        `结束 ${lastS.toDistanceM} ≠ total ${exp.routeIndex.totalDistanceM}`,
      );
    }
  }

  if (!Array.isArray(exp.sources) || exp.sources.length === 0) {
    issue(issues, "sources", "未声明数据来源与证据", "warning");
  }
  return done(issues);
}
