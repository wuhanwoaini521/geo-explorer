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
import { geodToWorld, projectWorldToPixel, solveCameraPose, } from "./math/camera-math.js";
import { classifyVisibility } from "./math/occlusion.js";
import { LANDMARKS } from "./scenes.js";
/* ------------------------------------------------------------------ */
/* 解析标注                                                            */
/* ------------------------------------------------------------------ */
/** 归一化标点 → 3D 世界观测（跳过未知 id） */
export function landmarkObs(scene, mark) {
    const l = LANDMARKS.find((x) => x.id === mark.landmarkId);
    if (!l)
        return null;
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
export function solveFromPixels(scene, marks, init) {
    const observations = [];
    for (const m of marks) {
        const obs = landmarkObs(scene, m);
        if (!obs)
            continue;
        observations.push({ world: obs.world, pixel: obs.pixel });
    }
    if (observations.length < 3)
        return null;
    const solved = solveCameraPose(observations, { pose: init.pose, focalPx: init.focalPx, cx: scene.width / 2, cy: scene.height / 2 }, scene.width, scene.height, {
        x: true,
        y: true,
        z: true,
        yaw: true,
        pitch: true,
        roll: true,
        f: scene.freedom === "attitude" ? false : true,
    });
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
function occlusionOf(dem, eye, pts) {
    const raw = classifyVisibility(dem, eye, pts);
    return raw.map((s) => (s === "OCCLUDED" ? "OCCLUDED" : "VISIBLE"));
}
/** 投影全部路线点 */
export function projectRoute(scene, pose, focalPx, dem, route) {
    const cx = scene.width / 2;
    const cy = scene.height / 2;
    const eye = { x: pose.position.x, y: pose.position.y, z: pose.position.z };
    const occ = dem ? occlusionOf(dem, eye, route.map((r) => r.world)) : route.map(() => "VISIBLE");
    return route.map((rp, i) => {
        const shot = projectWorldToPixel(rp.world, pose, { f: focalPx, cx, cy });
        if (!shot) {
            return { routeIndex: rp.routeIndex, u: NaN, v: NaN, visibility: "OUT_OF_FRAME" };
        }
        const u = shot.u / scene.width;
        const v = shot.v / scene.height;
        const inFrame = u >= -0.02 && u <= 1.02 && v >= -0.02 && v <= 1.02;
        if (!inFrame)
            return { routeIndex: rp.routeIndex, u, v, visibility: "OUT_OF_FRAME" };
        return { routeIndex: rp.routeIndex, u, v, visibility: occ[i] };
    });
}
/** waypoints（里程碑）投影，仅 VISIBLE + in-frame 保留 */
export function projectWaypoints(scene, pose, focalPx, dem, waypoints) {
    const cx = scene.width / 2;
    const cy = scene.height / 2;
    const out = [];
    for (const w of waypoints) {
        const world = { x: w.world[0], y: w.world[1], z: w.world[2] };
        const vis = dem
            ? classifyVisibility(dem, { x: pose.position.x, y: pose.position.y, z: pose.position.z }, [world])[0]
            : "VISIBLE";
        if (vis !== "VISIBLE")
            continue;
        const shot = projectWorldToPixel(world, pose, { f: focalPx, cx, cy });
        if (!shot)
            continue;
        const u = shot.u / scene.width;
        const v = shot.v / scene.height;
        if (u < 0 || u > 1 || v < 0 || v > 1)
            continue;
        out.push({ waypointId: w.id, u, v });
    }
    return out;
}
/* ------------------------------------------------------------------ */
/* 报告装配                                                            */
/* ------------------------------------------------------------------ */
function diagPct(scene, px) {
    return (px / Math.hypot(scene.width, scene.height)) * 100;
}
/** leave-one-out 验证：每次剔除一个标点，量它在重建 pose 下的重投影误差 */
function leaveOneOutValidation(scene, observations, init) {
    let worst = 0;
    for (let i = 0; i < observations.length; i++) {
        const others = observations.filter((_, j) => j !== i);
        if (others.length < 3)
            continue;
        const solved = solveCameraPose(others, { pose: init.pose, focalPx: init.focalPx, cx: scene.width / 2, cy: scene.height / 2 }, scene.width, scene.height, { x: true, y: true, z: true, yaw: true, pitch: true, roll: true, f: true });
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
        if (err > worst)
            worst = err;
    }
    return worst;
}
/** 状态机（与 calibration-validate.ts §43 语义锁定） */
export function statusFromStats(medianDiagPct, maxValidationPct, landmarkCount) {
    if (!Number.isFinite(medianDiagPct) || landmarkCount === 0)
        return "REPRESENTATIVE";
    if (medianDiagPct <= 0.5 && maxValidationPct <= 0.75)
        return "VERIFIED";
    if (medianDiagPct <= 0.5)
        return "CALIBRATED";
    return "REPRESENTATIVE";
}
/** 场景的媒体元数据（来源 ：/media 清单） */
function sceneMedia(scene) {
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
export function buildReportData(opts) {
    const { scene, pixels, dem, route: routeData, waypoints: waypointData } = opts;
    const guess = scene.cameraGuesses;
    const init = {
        pose: {
            position: geodToWorld({ lat: guess.lat, lon: guess.lon, elevationM: guess.elevationM }),
            yawDeg: guess.yawDeg,
            pitchDeg: guess.pitchDeg,
            rollDeg: guess.rollDeg,
        },
        focalPx: guess.focalPx,
    };
    const obsList = [];
    const landmarkMeta = [];
    for (const m of pixels) {
        const obs = landmarkObs(scene, m);
        if (!obs)
            continue;
        obsList.push({ world: obs.world, pixel: obs.pixel });
        landmarkMeta.push({ id: obs.landmark.id, name: obs.landmark.nameEn, world: obs.world, pixel: obs.pixel });
    }
    const outcome = solveFromPixels(scene, pixels, init);
    if (!outcome) {
        throw new Error(`求解失败：有效的观测 <3 个（给了 ${landmarkMeta.length}）`);
    }
    const solution = outcome;
    const route = projectRoute(scene, solution.pose, solution.focalPx, dem, routeData);
    const waypoints = projectWaypoints(scene, solution.pose, solution.focalPx, dem, waypointData);
    const diag = Math.hypot(scene.width, scene.height);
    const medianPct = diagPct(scene, solution.medianPx);
    const validationPx = leaveOneOutValidation(scene, obsList, init);
    const maxValidationPct = diagPct(scene, validationPx);
    const status = statusFromStats(medianPct, maxValidationPct, pixels.length);
    const meanPx = solution.perPointPx.reduce((a, b) => a + (isFinite(b) ? b : 0), 0) / solution.perPointPx.length;
    const pass = medianPct <= 0.5 && maxValidationPct <= 0.75;
    const report = {
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
            role: i === 0 ? "validation" : "calibration",
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
/** CLI 组装：load 静态数据 → buildReportData → 写 JSON + MD */
export function renderMarkdown(r, scene) {
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
