/**
 * Everest Expedition V2 校验 —— 纯逻辑，可在 Node 单测。
 *
 * 校验对象：`ExpeditionAttachment`（与其组合的 Exploration 载体见
 * data/expeditions/everest.ts）。产出机器可读报告，不修改任何数据。
 */
import type {
  ExpeditionAttachment,
  ExpeditionType,
  MediaAsset,
  MediaManifest,
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
function issue(issues: ValidationIssue[], path: string, message: string, level: "error" | "warning" = "error") {
  issues.push({ level, path, message });
}

/* ------------------------------------------------------------------ */
/* RouteGeometryData（原始静态 JSON）                                   */
/* ------------------------------------------------------------------ */

export function validateRouteGeometryData(raw: RouteGeometryData): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!raw || typeof raw !== "object") {
    return done([{ level: "error", path: "$", message: "RouteGeometryData 缺失" }]);
  }
  if (!(raw.schemaVersion >= 1)) issue(issues, "schemaVersion", `=${raw.schemaVersion}`);
  if (!raw.id) issue(issues, "id", "缺少 id");
  if (raw.geodetic !== "lonlat-wgs84") issue(issues, "geodetic", `=${raw.geodetic}`);
  if (!(raw.terrain && raw.terrain.baseM > 0)) issue(issues, "terrain.baseM", `=${raw.terrain?.baseM}`);

  const pts = raw.points;
  if (!Array.isArray(pts) || pts.length < 2) {
    issue(issues, "points", `数量=${pts?.length}`);
  } else {
    pts.forEach((pt, i) => {
      if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y) || !Number.isFinite(pt.z)) {
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
      if (!Number.isFinite(m.lat) || !Number.isFinite(m.lon)) issue(issues, `milestones[${i}]`, "缺少经纬度");
    });
  }
  return done(issues);
}

/* ------------------------------------------------------------------ */
/* RouteIndex                                                          */
/* ------------------------------------------------------------------ */

export function validateRouteIndex(index: RouteIndex): ValidationResult {
  const issues: ValidationIssue[] = [];
  if (!index) return done([{ level: "error", path: "$", message: "RouteIndex 缺失" }]);

  if (!(index.pointCount >= 2)) issue(issues, "pointCount", `=${index.pointCount}`);
  if (!(index.segmentCount === index.pointCount - 1)) issue(issues, "segmentCount", `=${index.segmentCount}`);

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
      if (!(c[i] > c[i - 1])) issue(issues, `cumulative[${i}]`, `非严格递增 ${c[i - 1]}→${c[i]}`);
    }
    if (Math.abs(c[c.length - 1] - index.totalDistanceM) > 1e-6) {
      issue(issues, "totalDistanceM", `=${index.totalDistanceM}，但最后累计=${c[c.length - 1]}`);
    }
  }
  if (!(index.totalDistanceM > 0)) issue(issues, "totalDistanceM", `=${index.totalDistanceM}`);
  if (!(index.total3dDistanceM >= index.totalDistanceM)) issue(issues, "total3dDistanceM", "3D 应 >= 2D");

  const ms = index.milestones;
  if (!Array.isArray(ms) || ms.length < 2) {
    issue(issues, "milestones", `数量=${ms?.length}`);
  } else {
    let prev: RouteMilestoneSample | undefined;
    for (const m of ms) {
      if (!(m.distanceM >= 0) || !(m.distanceM <= index.totalDistanceM)) {
        issue(issues, `milestones[${m.id}]`, `distanceM=${m.distanceM} 越界`, "warning");
      }
      if (prev) {
        if (m.distanceM <= prev.distanceM) {
          issue(issues, `milestones[${m.id}]`, `distanceM 未严格递增 (<= ${prev.id} ${prev.distanceM})`);
        }
        if (m.refM < prev.refM) {
          issue(issues, `milestones[${m.id}].refM`, `参考海拔递减 (${prev.id} ${prev.refM}→${m.id} ${m.refM})`);
        }
      }
      prev = m;
    }
    const last = ms[ms.length - 1];
    if (last.kind !== "summit") issue(issues, `milestones[${last.id}].kind`, `最后里程碑 kind=${last.kind}，应为 summit`);
    if (Math.abs(1 - last.progress) > 0.002) {
      issue(issues, `milestones[${last.id}].progress`, `终点 progress=${last.progress}`);
    }
  }
  return done(issues);
}

/* ------------------------------------------------------------------ */
/* CameraConfig                                                        */
/* ------------------------------------------------------------------ */

export function validateCamera(camera: ExpeditionAttachment["camera"]): ValidationResult {
  if (!camera) return done([{ level: "error", path: "camera", message: "CameraConfig 缺失" }]);
  const issues: ValidationIssue[] = [];
  const segs = camera.segments;
  if (!Array.isArray(segs) || segs.length === 0) {
    issue(issues, "camera.segments", "未配置相机段");
    return done(issues);
  }

  let prevTo = 0;
  segs.forEach((s, i) => {
    if (!(s.fromProgress >= prevTo - 1e-6)) {
      issue(issues, `camera.segments[${i}]`, `fromProgress=${s.fromProgress} < previous to=${prevTo}`);
    }
    if (!(s.toProgress >= s.fromProgress)) issue(issues, `camera.segments[${i}]`, `区间 ${s.fromProgress}→${s.toProgress}`);
    prevTo = s.toProgress;
  });
  if (Math.abs(prevTo - 1) > 1e-3) issue(issues, "camera.segments", `末端 ends=${prevTo}≈1`);
  return done(issues);
}

/* ------------------------------------------------------------------ */
/* MediaManifest                                                       */
/* ------------------------------------------------------------------ */

const MEDIA_KINDS: MediaAsset["kind"][] = ["photograph", "render", "diagram", "illustration", "video"];
const REVIEW_STATUSES: MediaAsset["reviewStatus"][] = ["draft", "review", "approved", "rejected"];

export function validateMediaManifest(m: MediaManifest): ValidationResult {
  if (!m) return done([{ level: "error", path: "media", message: "MediaManifest 缺失" }]);
  const issues: ValidationIssue[] = [];
  if (!(m.schemaVersion >= 1)) issue(issues, "media.schemaVersion", `=${m.schemaVersion}`);
  if (!m.sceneId) issue(issues, "media.sceneId", "缺少 sceneId");

  const ids = new Set<string>();
  (m.assets ?? []).forEach((a, i) => {
    if (!a.id) issue(issues, `media.assets[${i}].id`, "缺少 id");
    else if (ids.has(a.id)) issue(issues, `media.assets[${i}].id`, `重复 ${a.id}`);
    else ids.add(a.id);
    if (!MEDIA_KINDS.includes(a.kind)) issue(issues, `media.assets[${i}].kind`, `未知=${a.kind}`);
    if (!a.localPath) issue(issues, `media.assets[${i}].localPath`, "缺少 localPath");
    if (!a.license) issue(issues, `media.assets[${i}].license`, "缺少 license");
    if (!REVIEW_STATUSES.includes(a.reviewStatus)) {
      issue(issues, `media.assets[${i}].reviewStatus`, `未知=${a.reviewStatus}`);
    } else if (a.reviewStatus !== "approved") {
      issue(issues, `media.assets[${i}].reviewStatus`, "非 approved（正式清单仅收录批准项）", "warning");
    }
  });
  return done(issues);
}

/* ------------------------------------------------------------------ */
/* ExpeditionAttachment 整体                                            */
/* ------------------------------------------------------------------ */

const VALID_TYPES: ExpeditionType[] = ["CLIMB", "DIVE", "TRAVERSE", "FLYOVER", "CUTAWAY"];

export function validateExpedition(exp: ExpeditionAttachment): ValidationResult {
  if (!exp || typeof exp !== "object") {
    return done([{ level: "error", path: "$", message: "Expedition 附件缺失" }]);
  }
  const issues: ValidationIssue[] = [];

  if (!VALID_TYPES.includes(exp.type)) issue(issues, "type", `未知=${exp.type}`);
  if (!(exp.elevationPolicy?.model === "reference-anchored")) {
    issue(issues, "elevationPolicy.model", `=${JSON.stringify(exp.elevationPolicy)}`);
  }

  issues.push(...validateRouteIndex(exp.routeIndex).issues);
  issues.push(...validateCamera(exp.camera).issues);
  issues.push(...validateMediaManifest(exp.media).issues);

  const stages = exp.stageMap;
  if (!Array.isArray(stages) || stages.length === 0) {
    issue(issues, "stageMap", "未定义阶段");
  } else {
    if (stages[0].fromDistanceM !== 0) issue(issues, "stageMap[0]", "首阶段起点≠0");
    for (let i = 1; i < stages.length; i++) {
      if (Math.abs(stages[i - 1].toDistanceM - stages[i].fromDistanceM) > 1e-3) {
        issue(issues, `stageMap[${i}]`, `阶段不连续 ${stages[i - 1].id}.to↔${stages[i].id}.from`);
      }
    }
    const lastS = stages[stages.length - 1];
    if (Math.abs(lastS.toDistanceM - exp.routeIndex.totalDistanceM) > 1e-3) {
      issue(issues, "stageMap[-1]", `结束 ${lastS.toDistanceM} ≠ total ${exp.routeIndex.totalDistanceM}`);
    }
  }

  if (!Array.isArray(exp.sources) || exp.sources.length === 0) {
    issue(issues, "sources", "未声明数据来源与证据", "warning");
  }
  return done(issues);
}