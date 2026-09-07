/**
 * 浏览器标注器：载入 live 实景 → 点地标 → 求解 → 验证 → 投影 route。
 * 复用纯核心（camera-math / occlusion / calibrate.buildReportData），
 * 全部本地处理；报告结构与 CLI/node assembleReport 完全同源。
 */
import { SCENES, sceneById, LANDMARKS } from "../src/scenes.js";
import { buildReportData, } from "/home/hans/Code/self-github/geo-explorer/tools/everest-route-calibrator/src/calibrate.js";
const NATIVE_W = 1080;
const NATIVE_H = 1920;
const ROUTE_URL = "/miniprogram/data/routes/everest/south-col.json";
const WAYPOINTS_URL = "/design/world/everest-3d/route/waypoints.json";
const DEM_META_URL = "/design/world/everest-live/dem/occlusion-60m.raw.json";
function el(id) {
    return document.getElementById(id);
}
const img = el("image");
const canvas = el("overlay");
const ctx = canvas.getContext("2d");
const state = {
    scene: SCENES[0],
    marks: [],
    activeLandmarkId: "everest-summit",
    route: [],
    waypoints: [],
    dem: null,
    reportRoute: [],
    waypointPixels: [],
};
async function fetchJson(path) {
    const r = await fetch(path);
    if (!r.ok)
        throw new Error(`GET ${path} → ${r.status}`);
    return (await r.json());
}
async function boot() {
    // 场景选择
    const sel = el("scene-select");
    for (const s of SCENES) {
        const o = document.createElement("option");
        o.value = s.id;
        o.textContent = `${s.id} · ${s.label}`;
        sel.appendChild(o);
    }
    sel.addEventListener("change", () => {
        const s = sceneById(sel.value);
        if (s)
            void loadScene(s).catch((e) => report(`场景载入失败：${String(e)}`));
    });
    // 地标目录
    const catalog = el("catalog");
    for (const l of LANDMARKS) {
        const btn = document.createElement("button");
        btn.className = `chip${l.id === state.activeLandmarkId ? " on" : ""}`;
        btn.textContent = l.nameEn;
        btn.title = `${l.id} · ${l.lat.toFixed(4)},${l.lon.toFixed(4)} @${l.elevationM}m`;
        btn.dataset.id = l.id;
        btn.addEventListener("click", () => {
            state.activeLandmarkId = l.id;
            for (const b of Array.from(catalog.querySelectorAll(".chip"))) {
                b.classList.toggle("on", b.dataset.id === l.id);
            }
        });
        catalog.appendChild(btn);
    }
    // 预取静态数据
    try {
        const rj = await fetchJson(ROUTE_URL);
        state.route = (rj.points ?? [])
            .filter((p) => p && typeof p.x === "number" && typeof p.y === "number" && typeof p.z === "number")
            .map((p, idx) => ({ routeIndex: idx, world: { x: p.x, y: p.y, z: p.z } }));
    }
    catch (e) {
        console.warn("route 载入失败", e);
    }
    try {
        const wj = await fetchJson(WAYPOINTS_URL);
        state.waypoints = (wj ?? [])
            .filter((w) => w && w.id && Array.isArray(w.world) && w.world.length === 3)
            .map((w) => ({ id: w.id, world: w.world }));
    }
    catch (e) {
        console.warn("waypoints 载入失败", e);
    }
    try {
        const meta = await fetchJson(DEM_META_URL);
        const buf = await (await fetch(meta.rawUrl)).arrayBuffer();
        state.dem = {
            cols: meta.cols,
            rows: meta.rows,
            step: meta.step,
            origin: { x: meta.originX, y: meta.originY, z: meta.originZ ?? 0 },
            z: new Float32Array(buf),
        };
    }
    catch (e) {
        console.warn("DEM 未加载（全部按 VISIBLE 处理）", e);
        state.dem = null;
    }
    el("run").addEventListener("click", runSolve);
    el("export-btn").addEventListener("click", exportPixels);
    el("export-report-btn").addEventListener("click", exportReport);
    el("show-route").addEventListener("change", drawScene);
    el("show-wm").addEventListener("change", drawScene);
    const first = sceneById(sel.value) ?? SCENES[0];
    await loadScene(first);
}
async function loadScene(scene) {
    state.scene = scene;
    state.marks = [];
    state.reportRoute = [];
    state.waypointPixels = [];
    document.body.classList.toggle("loading"); // live 状态指示
    img.onload = () => {
        el("loading").style.display = "none";
        canvas.style.display = "block";
        drawScene();
    };
    img.src = `/${scene.assetPath}`;
    drawScene();
}
function drawScene() {
    canvas.width = NATIVE_W;
    canvas.height = NATIVE_H;
    ctx.clearRect(0, 0, NATIVE_W, NATIVE_H);
    // 标注点 + 名字
    for (const m of state.marks) {
        ctx.fillStyle = "#ffd23f";
        ctx.beginPath();
        ctx.arc(m.u * NATIVE_W, m.v * NATIVE_H, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#111";
        ctx.font = "bold 14px sans-serif";
        ctx.fillText(m.landmarkId, m.u * NATIVE_W + 12, m.v * NATIVE_H - 12);
    }
    // 投影路线
    if (el("show-route").checked && state.reportRoute.length > 1) {
        drawRouteOverlay();
    }
    // waypoints 圆点
    if (el("show-wm").checked) {
        for (const w of state.waypointPixels) {
            if (w.u < 0 || w.u > 1 || w.v < 0 || w.v > 1)
                continue;
            ctx.fillStyle = "#ffe74a";
            ctx.beginPath();
            ctx.arc(w.u * NATIVE_W, w.v * NATIVE_H, 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
function drawRouteOverlay() {
    const route = state.reportRoute;
    ctx.lineWidth = 3;
    for (let i = 1; i < route.length; i++) {
        const a = route[i - 1];
        const b = route[i];
        if (a.visibility === "OUT_OF_FRAME" || b.visibility === "OUT_OF_FRAME")
            continue;
        ctx.strokeStyle = a.visibility === "OCCLUDED" ? "rgba(190,70,70,0.9)" : "rgba(36,120,255,0.95)";
        ctx.beginPath();
        ctx.moveTo(a.u * NATIVE_W, a.v * NATIVE_H);
        ctx.lineTo(b.u * NATIVE_W, b.v * NATIVE_H);
        ctx.stroke();
    }
}
/** 主图单击 → 给当前地标落点 */
canvas.addEventListener("pointerdown", (e) => {
    const rect = canvas.getBoundingClientRect();
    state.marks.push({
        landmarkId: state.activeLandmarkId,
        name: state.activeLandmarkId,
        u: (e.clientX - rect.left) / rect.width,
        v: (e.clientY - rect.top) / rect.height,
    });
    renderMarkList();
    drawScene();
});
function renderMarkList() {
    const ul = el("marks");
    ul.innerHTML = "";
    state.marks.forEach((m, i) => {
        const li = document.createElement("li");
        const name = LANDMARKS.find((l) => l.id === m.landmarkId)?.nameEn ?? m.landmarkId;
        li.textContent = `${i + 1}. ${name}  (u=${m.u.toFixed(4)}, v=${m.v.toFixed(4)})`;
        const del = document.createElement("button");
        del.textContent = "✕";
        del.addEventListener("click", () => {
            state.marks.splice(i, 1);
            renderMarkList();
            drawScene();
        });
        li.appendChild(del);
        ul.appendChild(li);
    });
}
function runSolve() {
    if (!state.scene)
        return;
    if (state.marks.length < 3) {
        report("请至少标注 3 个地标点（推荐 5+）：先用左边目录选中地标，再在主图上单击。");
        return;
    }
    const pixels = state.marks.map((m) => ({ landmarkId: m.landmarkId, u: m.u, v: m.v }));
    try {
        const built = buildReportData({
            scene: state.scene,
            pixels,
            dem: state.dem,
            route: state.route,
            waypoints: state.waypoints,
        });
        state.reportRoute = built.route;
        state.waypointPixels = built.report.waypoints;
        drawScene();
        report(fmtReport(built));
    }
    catch (err) {
        report(`求解失败：${err instanceof Error ? err.message : String(err)}`);
    }
}
function fmtReport(b) {
    const r = b.report;
    const overlay = r.status === "VERIFIED" || r.status === "CALIBRATED"
        ? "✓ 可开 routeOverlay（route[] 以本项目为 truth）"
        : "✗ REPRESENTATIVE → routeOverlay=false";
    return [
        `状态: ${r.status}`,
        `重投影: median ${r.reprojection.medianPx.toFixed(2)}px · max ${r.reprojection.maxPx.toFixed(2)}px`,
        `LOO 验证最差: ${r.reprojection.maxValidationPx.toFixed(2)}px (diag ${r.reprojection.maxValidationDiagPct.toFixed(3)}%)`,
        `route: VISIBLE ${r.summary.visibleCount} / OCCLUDED ${r.summary.occludedCount} / OUT ${r.summary.outOfFrameCount}`,
        overlay,
    ].join("\n");
}
function report(text) {
    el("result").textContent = text;
}
function exportPixels() {
    const json = JSON.stringify(state.marks.map((m) => ({
        landmarkId: m.landmarkId,
        u: Number(m.u.toFixed(5)),
        v: Number(m.v.toFixed(5)),
    })), null, 1);
    download("pixels.json", json);
}
function exportReport() {
    if (state.reportRoute.length === 0) {
        report("先运行求解，再导出报告。");
        return;
    }
    // 用 buildReportData 重算一次拿完整 report JSON（确定性）
    const built = buildReportData({
        scene: state.scene,
        pixels: state.marks.map((m) => ({ landmarkId: m.landmarkId, u: m.u, v: m.v })),
        dem: state.dem,
        route: state.route,
        waypoints: state.waypoints,
    });
    download(`${state.scene.id}.calibration.json`, JSON.stringify(built.report, null, 2));
}
function download(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
}
void boot().catch((e) => console.error(e));
