/**
 * 世界 Expedition 构造器 —— 让非珠峰世界复用珠峰的沉浸机制。
 *
 * 珠峰的沉浸感来自三件事：真实里程轴（RouteIndex）、随进度推进的相机（CameraConfig）、
 * 贴合画面的路线（RoutePath.spine）。这些此前只有珠峰有，因为它的 routeIndex 直接来自
 * 289 点测绘几何。本构造器把同一套机制变成**数据驱动**的：输入是既有的 Exploration
 * 路线数据（waypoints 自带 progress / 海拔或深度 / 画布坐标），因此新增世界不需要重做
 * DEM 测绘，只要提供总里程、主视觉与阶段命名即可接入。
 *
 * 输出即可直接挂到 Exploration 上（ExpeditionAttachment），页面无需为具体世界改代码：
 *   - routeIndex：按总里程把 waypoint.progress 还原成米制里程轴，参考海拔沿线插值；
 *   - stageMap：相邻里程碑之间为一段，首段起点=0、末段终点=总长；
 *   - camera：每个里程碑一个镜头段，视线与缩放随进度连续推进；
 *   - routePath：spine 由 waypoint 的画布坐标归一化得到（下潜类世界翻转纵向）；
 *   - visualMode：单一 LIVE 场景覆盖全部阶段，绑定该世界的实景资产。
 */
import { buildRouteIndex } from "../../engine/route-index";
import { buildStageMap } from "../../engine/expedition-stages";
import type { DataSource, Exploration, ExplorationRouteWaypoint } from "../../types/exploration";
import type {
  CameraConfig,
  ExpeditionAttachment,
  ExpeditionRoutePathConfig,
  ExpeditionRouteProjection,
  ExpeditionStageDef,
  ExpeditionType,
  LiveRouteOverlayMode,
  LiveSceneDef,
  MediaManifest,
  RouteGeometryData,
  RouteIndex,
  RouteMilestoneRaw,
  RouteNodeKind,
  RoutePointRaw,
  RouteSpinePoint,
  StageBoundaryRef,
} from "../../types/expedition";

/** 相邻里程碑之间的插值采样点数：保证里程轴与相机插值足够平滑 */
const SAMPLES_PER_SEGMENT = 8;

/** 阶段命名（长度须等于 waypoints.length - 1） */
export interface WorldStageSpec {
  id: string;
  name: string;
  emoji: string;
  intro: string;
}

export interface WorldExpeditionSpec {
  type: ExpeditionType;
  /** 路线总水平里程（米）。来自公开资料的近似值，须在 sources 中声明。 */
  totalDistanceM: number;
  /** 主视觉实景照片（相对 miniprogram/assets 的运行时路径） */
  heroImage: string;
  /** 主视觉原始宽高比（宽/高） */
  heroAspect: number;
  /** 主视觉裁切焦点（0..1） */
  focusX: number;
  focusY: number;
  /** 相机视线纵向推进：起点/终点焦点 y（0=画面顶部） */
  cameraFocusY: { from: number; to: number };
  /** 相机纵向偏移推进（影响截图位移；0.5 为居中） */
  cameraOffsetY: { from: number; to: number };
  /** 相机缩放推进（1 = 原图） */
  cameraScale: { from: number; to: number };
  /**
   * 纵向翻转：下潜类世界的 waypoint.y 是「越深越靠上」的剖面表达，
   * 屏幕语义应为「越深越靠下」，需要翻转后再作为 spine。
   */
  flipY?: boolean;
  /**
   * 参考量取「相对起点的下降量」而非绝对海拔。
   * 下切类世界（大峡谷）海拔天然递减，而里程轴/阶段边界依赖参考量单调递增，
   * 因此改用下切深度（0 → 落差），与下潜世界的 depth 语义一致。
   */
  invertReference?: boolean;
  /**
   * 路线在画面上的走向（归一化 0..1，从起点到终点）。
   * 经视觉核验后逐世界校准，使折线贴合照片里真实的地形走向；
   * 缺省时退化为 waypoint 的旧画布坐标。
   */
  spine?: Array<{ x: number; y: number }>;
  /** LIVE 场景绑定的实景资产 id（必须在本 spec 的 media 中且 approved） */
  liveAssetId: string;
  /** LIVE 场景覆盖策略 */
  routeOverlay?: LiveRouteOverlayMode;
  /** LIVE 实景说明文案（HUD 常显一行）；缺省会回退成「真实珠峰影像」 */
  liveInfo?: string;
  /** expedition 专属媒体清单（承载 LIVE 资产） */
  media: MediaManifest;
  /** 阶段命名，长度 = waypoints.length - 1 */
  stages: WorldStageSpec[];
  sources: DataSource[];
}

/** 参考海拔：攀登类用 altitude，下潜/下切类用 depth（正值）。 */
function referenceM(point: ExplorationRouteWaypoint): number {
  if (point.altitude != null && !Number.isNaN(point.altitude)) return point.altitude;
  if (point.depth != null && !Number.isNaN(point.depth)) return point.depth;
  return 0;
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** 按 waypoint 稳定排序（progress 严格升序是数据契约，这里只做防御） */
function orderedWaypoints(ex: Exploration): ExplorationRouteWaypoint[] {
  const list = (ex.route && ex.route.waypoints) || [];
  return [...list].sort((a, b) => a.progress - b.progress);
}

/** 由相邻里程碑生成 289 点式的米制几何：x = progress × 总里程，z = 插值参考海拔。 */
function buildWorldGeometry(
  waypoints: ExplorationRouteWaypoint[],
  spec: WorldExpeditionSpec,
): RouteGeometryData {
  const totalDistanceM = spec.totalDistanceM;
  const points: RoutePointRaw[] = [];
  const last = waypoints.length - 1;
  // 参考量：默认绝对海拔/深度；下切世界取「相对起点的下降量」以保证单调递增。
  const base = referenceM(waypoints[0]);
  const refOf = (point: ExplorationRouteWaypoint): number =>
    spec.invertReference ? Math.max(0, base - referenceM(point)) : referenceM(point);

  for (let i = 0; i < last; i += 1) {
    const from = waypoints[i];
    const to = waypoints[i + 1];
    const steps = SAMPLES_PER_SEGMENT;
    for (let k = 0; k < steps; k += 1) {
      const t = k / steps;
      const progress = lerp(from.progress, to.progress, t);
      const z = lerp(refOf(from), refOf(to), t);
      points.push({ x: progress * totalDistanceM, y: 0, z, lat: 0, lon: 0 });
    }
  }
  const tail = waypoints[last];
  points.push({ x: tail.progress * totalDistanceM, y: 0, z: refOf(tail), lat: 0, lon: 0 });

  const milestones: RouteMilestoneRaw[] = waypoints.map((point, index) => {
    const kind: RouteNodeKind = index === last ? "summit" : "waypoint";
    const refM = refOf(point);
    return {
      id: point.id,
      name: point.name,
      kind,
      lat: 0,
      lon: 0,
      refM,
      demM: refM,
      x: point.progress * totalDistanceM,
      y: 0,
    };
  });

  return {
    schemaVersion: 1,
    id: "world-route",
    name: "world-route",
    geodetic: "lonlat-wgs84",
    terrain: { baseM: 0, units: "m" },
    points,
    milestones,
    provenance: ["由 world-expedition builder 从 Exploration waypoints 生成"],
  };
}

function milestoneBoundary(id: string, label: string): StageBoundaryRef {
  return { kind: "milestone", milestoneId: id, label };
}

/** 阶段：相邻里程碑之间一段，因此段数 = waypoints.length - 1。 */
function buildWorldStages(
  waypoints: ExplorationRouteWaypoint[],
  spec: WorldExpeditionSpec,
): ExpeditionStageDef[] {
  const expected = waypoints.length - 1;
  if (spec.stages.length !== expected) {
    throw new Error(
      `[world-expedition] 阶段数(${spec.stages.length})必须等于里程碑间隔数(${expected})`,
    );
  }
  return spec.stages.map((stage, i) => ({
    id: stage.id,
    name: stage.name,
    emoji: stage.emoji,
    intro: stage.intro,
    from: milestoneBoundary(waypoints[i].id, waypoints[i].name),
    to: milestoneBoundary(waypoints[i + 1].id, waypoints[i + 1].name),
  }));
}

/** 每个里程碑一个镜头段：视线与缩放随进度线性推进。 */
function buildWorldCamera(
  index: RouteIndex,
  spec: WorldExpeditionSpec,
): CameraConfig {
  const marks = index.milestones;
  const last = marks.length - 1;
  return {
    segments: marks.map((mark, i) => {
      const t = last === 0 ? 0 : i / last;
      const focusY = lerp(spec.cameraFocusY.from, spec.cameraFocusY.to, t);
      const offsetY = lerp(spec.cameraOffsetY.from, spec.cameraOffsetY.to, t);
      return {
        id: `camera-${mark.id}`,
        fromProgress: mark.progress,
        toProgress: i < last ? marks[i + 1].progress : 1,
        asset: spec.heroImage,
        scale: Math.round(lerp(spec.cameraScale.from, spec.cameraScale.to, t) * 1000) / 1000,
        offsetX: 0.5,
        offsetY,
        focus: { x: 0.5, y: focusY },
      };
    }),
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * spine：路线在画面上的走向。优先用 spec.spine（经视觉核验、贴合照片地形），
 * 缺省时退化为 waypoint 的旧画布坐标（下潜类世界翻转纵向）。
 */
function buildWorldSpine(
  waypoints: ExplorationRouteWaypoint[],
  spec: WorldExpeditionSpec,
): RouteSpinePoint[] {
  if (spec.spine && spec.spine.length >= 2) {
    const last = spec.spine.length - 1;
    return spec.spine.map((point, i) => ({
      x: clamp01(point.x),
      y: clamp01(point.y),
      progress: i / last,
    }));
  }
  const flipY = spec.flipY === true;
  return waypoints.map((point) => ({
    x: clamp01(point.x / 100),
    y: clamp01((flipY ? 100 - point.y : point.y) / 100),
    progress: point.progress,
  }));
}

function buildWorldRoutePath(
  waypoints: ExplorationRouteWaypoint[],
  spec: WorldExpeditionSpec,
): ExpeditionRoutePathConfig {
  const spine = buildWorldSpine(waypoints, spec);
  const projection = (id: "LIVE" | "TERRAIN"): ExpeditionRouteProjection => ({
    id,
    image: spec.heroImage,
    imageAspect: spec.heroAspect,
    focusX: spec.focusX,
    focusY: spec.focusY,
    spine,
  });
  const terrain = projection("TERRAIN");
  return {
    default: terrain,
    // 非珠峰世界没有独立 DEM 影像：两种模式共用同一张实景主视觉，
    // 保证用户切到 TERRAIN 时看到的是本世界的图，而不是珠峰渲染图。
    modes: { TERRAIN: terrain, LIVE: projection("LIVE") },
  };
}

function buildWorldVisualMode(
  ex: Exploration,
  stageIds: string[],
  spec: WorldExpeditionSpec,
): ExpeditionAttachment["visualMode"] {
  const scene: LiveSceneDef = {
    id: `${ex.id}-live`,
    label: ex.route ? ex.route.name : ex.title,
    stageIds,
    assetId: spec.liveAssetId,
    crop: { focusX: spec.focusX, focusY: spec.focusY, scale: 1 },
    routeOverlay: spec.routeOverlay ?? "full-route",
    infoText: spec.liveInfo,
  };
  return {
    defaultMode: "LIVE",
    fallback: "TERRAIN",
    liveScenes: [scene],
  };
}

/**
 * 组装世界 Expedition 附件（返回原 Exploration 的扩展对象，可直接注册）。
 */
export function buildWorldExpedition(
  ex: Exploration,
  spec: WorldExpeditionSpec,
): Exploration & ExpeditionAttachment {
  const waypoints = orderedWaypoints(ex);
  if (waypoints.length < 2) {
    throw new Error(`[world-expedition] ${ex.id} 至少需要 2 个里程碑`);
  }
  const routeIndex = buildRouteIndex(buildWorldGeometry(waypoints, spec));
  const stageMap = buildStageMap(buildWorldStages(waypoints, spec), routeIndex);
  return {
    ...ex,
    type: spec.type,
    routeIndex,
    stageMap,
    camera: buildWorldCamera(routeIndex, spec),
    media: spec.media,
    elevationPolicy: { model: "reference-anchored" },
    sources: spec.sources,
    visualMode: buildWorldVisualMode(ex, stageMap.map((s) => s.id), spec),
    routePath: buildWorldRoutePath(waypoints, spec),
  };
}
