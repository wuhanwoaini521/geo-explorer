"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWorldExpedition = buildWorldExpedition;
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
const route_index_1 = require("../../engine/route-index");
const expedition_stages_1 = require("../../engine/expedition-stages");
/** 相邻里程碑之间的插值采样点数：保证里程轴与相机插值足够平滑 */
const SAMPLES_PER_SEGMENT = 8;
/** 参考海拔：攀登类用 altitude，下潜/下切类用 depth（正值）。 */
function referenceM(point) {
    if (point.altitude != null && !Number.isNaN(point.altitude))
        return point.altitude;
    if (point.depth != null && !Number.isNaN(point.depth))
        return point.depth;
    return 0;
}
function lerp(from, to, t) {
    return from + (to - from) * t;
}
/** 按 waypoint 稳定排序（progress 严格升序是数据契约，这里只做防御） */
function orderedWaypoints(ex) {
    const list = (ex.route && ex.route.waypoints) || [];
    return [...list].sort((a, b) => a.progress - b.progress);
}
/** 由相邻里程碑生成 289 点式的米制几何：x = progress × 总里程，z = 插值参考海拔。 */
function buildWorldGeometry(waypoints, spec) {
    const totalDistanceM = spec.totalDistanceM;
    const points = [];
    const last = waypoints.length - 1;
    // 参考量：默认绝对海拔/深度；下切世界取「相对起点的下降量」以保证单调递增。
    const base = referenceM(waypoints[0]);
    const refOf = (point) => spec.invertReference ? Math.max(0, base - referenceM(point)) : referenceM(point);
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
    const milestones = waypoints.map((point, index) => {
        const kind = index === last ? "summit" : "waypoint";
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
function milestoneBoundary(id, label) {
    return { kind: "milestone", milestoneId: id, label };
}
/** 阶段：相邻里程碑之间一段，因此段数 = waypoints.length - 1。 */
function buildWorldStages(waypoints, spec) {
    const expected = waypoints.length - 1;
    if (spec.stages.length !== expected) {
        throw new Error(`[world-expedition] 阶段数(${spec.stages.length})必须等于里程碑间隔数(${expected})`);
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
function buildWorldCamera(index, spec) {
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
function clamp01(value) {
    return Math.min(1, Math.max(0, value));
}
/**
 * spine：路线在画面上的走向。优先用 spec.spine（经视觉核验、贴合照片地形），
 * 缺省时退化为 waypoint 的旧画布坐标（下潜类世界翻转纵向）。
 */
function buildWorldSpine(waypoints, spec) {
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
function buildWorldRoutePath(waypoints, spec) {
    const spine = buildWorldSpine(waypoints, spec);
    const projection = (id) => ({
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
function buildWorldVisualMode(ex, stageIds, spec) {
    var _a;
    const scene = {
        id: `${ex.id}-live`,
        label: ex.route ? ex.route.name : ex.title,
        stageIds,
        assetId: spec.liveAssetId,
        crop: { focusX: spec.focusX, focusY: spec.focusY, scale: 1 },
        routeOverlay: (_a = spec.routeOverlay) !== null && _a !== void 0 ? _a : "full-route",
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
function buildWorldExpedition(ex, spec) {
    const waypoints = orderedWaypoints(ex);
    if (waypoints.length < 2) {
        throw new Error(`[world-expedition] ${ex.id} 至少需要 2 个里程碑`);
    }
    const routeIndex = (0, route_index_1.buildRouteIndex)(buildWorldGeometry(waypoints, spec));
    const stageMap = (0, expedition_stages_1.buildStageMap)(buildWorldStages(waypoints, spec), routeIndex);
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
