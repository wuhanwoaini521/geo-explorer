/**
 * Node 专属壳层：数据加载 + 报告落盘。
 * calibrate.ts（纯）负责求解；本模块只做 fs 相关装卸，浏览器 viewer 不 import 它。
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildReportData, representativeReport, renderMarkdown } from "./calibrate.js";
/** 加载南坡路线密集点（world 系，来自 south-col.json） */
export function loadRoute() {
    const p = join(process.cwd(), "miniprogram/data/routes/everest/south-col.json");
    let data;
    try {
        data = JSON.parse(readFileSync(p, "utf8"));
    }
    catch {
        return [];
    }
    const arr = data.points ?? [];
    return arr
        .filter((r) => r && typeof r.x === "number" && typeof r.y === "number" && typeof r.z === "number")
        .map((r, idx) => ({
        routeIndex: idx,
        world: { x: r.x, y: r.y, z: r.z },
    }));
}
/** 场景 waypoint 候选列表（全局渲染惯例 8 里程碑） */
export function loadWaypointList() {
    const p = join(process.cwd(), "design/world/everest-3d/route/waypoints.json");
    let data;
    try {
        data = JSON.parse(readFileSync(p, "utf8"));
    }
    catch {
        return [];
    }
    return data
        .filter((w) => w && w.id && Array.isArray(w.world) && w.world.length === 3)
        .map((w) => ({ id: w.id, world: w.world }));
}
/** 组装 + 落盘 CalibrationReportV1（JSON + MD）。 */
export function assembleReport(opts) {
    const { scene, pixels, dem, outDir } = opts;
    const built = buildReportData({
        scene,
        pixels,
        dem,
        route: loadRoute(),
        waypoints: loadWaypointList(),
        extraLimitations: opts.extraLimitations,
    });
    const report = built.report;
    const status = built.status;
    const route = built.route;
    const outRoot = outDir ?? "design/world/everest-live/calibration";
    const outAbs = resolve(process.cwd(), outRoot);
    mkdirSync(outAbs, { recursive: true });
    const key = join(outAbs, `${scene.id}.json`);
    const mdKey = key.replace(/\.json$/, ".md");
    writeFileSync(key, JSON.stringify(report, null, 2) + "\n", "utf8");
    writeFileSync(mdKey, renderMarkdown(report, scene), "utf8");
    return { key, wrote: [key, mdKey], status, route };
}
/** REPRESENTATIVE 兜底报告：写 JSON + MD（不求解，route 为空）。 */
export function writeRepresentative(opts) {
    const { scene } = opts;
    const built = representativeReport(scene);
    const outRoot = opts.outDir ?? "design/world/everest-live/calibration";
    const outAbs = resolve(process.cwd(), outRoot);
    mkdirSync(outAbs, { recursive: true });
    const key = join(outAbs, `${scene.id}.json`);
    const mdKey = key.replace(/\.json$/, ".md");
    writeFileSync(key, JSON.stringify(built.report, null, 2) + "\n", "utf8");
    writeFileSync(mdKey, renderMarkdown(built.report, scene), "utf8");
    return { key, wrote: [key, mdKey], status: built.status };
}
