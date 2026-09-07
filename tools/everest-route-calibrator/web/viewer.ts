/**
 * 浏览器标注器：载入 live 实景 → 点地标 → 求解 → 验证 → 投影 route。
 * 复用纯核心（camera-math / occlusion / calibrate.buildReportData），
 * 全部本地处理；报告结构与 CLI/node assembleReport 完全同源。
 *
 * 引导模式：用初始相机 guess 把每个地标投影成空心引导圈（预测位置）。
 * 人工只需在照片里把每个山峰点一下：接近引导圈即自动吸附到圈上。
 * 吸附不是"自动校准"——只是把人工点击对准到猜测位置，真正的解
 * 仍由 solver 对全部标点求（加上 DEM 遮挡与 LOO 验证）。
 */
import { SCENES, sceneById, LANDMARKS, type SceneDef } from "../src/scenes.js";
import {
  buildReportData,
  guessGuideMarks,
  type ProjectedPoint,
  type RoutePoint,
} from "../src/calibrate.js";
import type { DemGrid } from "../src/math/occlusion.js";

interface Mark {
  landmarkId: string;
  name: string;
  /** 归一化屏幕坐标（0..1，左上原点，与运行时 route[] 一致） */
  u: number;
  v: number;
}

interface WptPix {
  waypointId: string;
  u: number;
  v: number;
}

const NATIVE_W = 1080;
const NATIVE_H = 1920;
/** 点击距引导圈多少 px 内 吸附到引导点（照片 1080 宽，110px 相当宽松） */
const SNAP_PX = 130;
const ROUTE_URL = "/miniprogram/data/routes/everest/south-col.json";
const WAYPOINTS_URL = "/design/world/everest-3d/route/waypoints.json";
const DEM_META_URL = "/design/world/everest-live/dem/occlusion-30m.raw.json";

function el<T extends HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

const photo = el<HTMLImageElement>("photo");
const canvas = el<HTMLCanvasElement>("overlay");
const ctx = canvas.getContext("2d")!;

interface GuideMark {
  landmarkId: string;
  nameEn: string;
  u: number;
  v: number;
  elevationM: number;
}

const state: {
  scene: SceneDef;
  marks: Mark[];
  activeLandmarkId: string;
  guides: GuideMark[];
  route: RoutePoint[];
  waypoints: Array<{ id: string; world: [number, number, number] }>;
  dem: DemGrid | null;
  reportRoute: ProjectedPoint[];
  waypointPixels: WptPix[];
} = {
  scene: SCENES[0],
  marks: [],
  activeLandmarkId: "everest-summit",
  guides: [],
  route: [],
  waypoints: [],
  dem: null,
  reportRoute: [],
  waypointPixels: [],
};

async function fetchJson<T>(path: string): Promise<T> {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`GET ${path} → ${r.status}`);
  return (await r.json()) as T;
}

function guidePx(g: GuideMark): { x: number; y: number } {
  return { x: g.u * NATIVE_W, y: g.v * NATIVE_H };
}

async function boot(): Promise<void> {
  // 场景选择
  const sel = el<HTMLSelectElement>("scene-select");
  for (const s of SCENES) {
    const o = document.createElement("option");
    o.value = s.id;
    o.textContent = `${s.id} · ${s.label}`;
    sel.appendChild(o);
  }
  sel.addEventListener("change", () => {
    const s = sceneById(sel.value);
    if (s) void loadScene(s).catch((e) => report(`场景载入失败：${String(e)}`));
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
      for (const b of Array.from(catalog.querySelectorAll<HTMLButtonElement>(".chip"))) {
        b.classList.toggle("on", b.dataset.id === l.id);
      }
      drawScene();
    });
    catalog.appendChild(btn);
  }

  // 预取静态数据
  try {
    const rj = await fetchJson<{ points: Array<{ x?: number; y?: number; z?: number }> }>(ROUTE_URL);
    state.route = (rj.points ?? [])
      .filter((p) => p && typeof p.x === "number" && typeof p.y === "number" && typeof p.z === "number")
      .map((p, idx) => ({ routeIndex: idx, world: { x: p.x!, y: p.y!, z: p.z! } }));
  } catch (e) {
    console.warn("route 载入失败", e);
  }
  try {
    const wj = await fetchJson<Array<{ id: string; world?: [number, number, number] }>>(WAYPOINTS_URL);
    state.waypoints = (wj ?? [])
      .filter((w) => w && w.id && Array.isArray(w.world) && w.world.length === 3)
      .map((w) => ({ id: w.id, world: w.world as [number, number, number] }));
  } catch (e) {
    console.warn("waypoints 载入失败", e);
  }
  try {
    const meta = await fetchJson<{
      cols: number;
      rows: number;
      step: number;
      originX: number;
      originY: number;
      originZ?: number;
      rawUrl: string;
    }>(DEM_META_URL);
    const buf = await (await fetch(meta.rawUrl)).arrayBuffer();
    state.dem = {
      cols: meta.cols,
      rows: meta.rows,
      step: meta.step,
      origin: { x: meta.originX, y: meta.originY, z: meta.originZ ?? 0 },
      z: new Float32Array(buf),
    };
  } catch (e) {
    console.warn("DEM 未加载（全部按 VISIBLE 处理）", e);
    state.dem = null;
  }

  el("run-btn").addEventListener("click", runSolve);
  el("auto-marks-btn").addEventListener("click", autoMarks);
  el("export-btn").addEventListener("click", exportPixels);
  el("export-report-btn").addEventListener("click", exportReport);
  el("show-route").addEventListener("change", drawScene);
  el("show-wpts").addEventListener("change", drawScene);

  const first = sceneById(sel.value) ?? SCENES[0];
  await loadScene(first);
}

/**
 * ⚡ 预标记：把初始 guess 能投影到的所有地标一次性放进标注列表。
 * 引导点可能略偏（EXIF GPS / 焦距有误差），人工只需“瞄一眼”后
 * 逐个微调：在对应圈的准确峰顶再单击一次即可覆盖为真实位置。
 */
function autoMarks(): void {
  if (state.marks.length > 0) {
    if (!window.confirm("已有点标（可能来自求解微调）——将先清空现有标注，再按引导重新预标记。继续？")) return;
    state.marks = [];
  }
  for (const g of state.guides) {
    const inFrame = g.u >= 0 && g.u <= 1 && g.v >= 0 && g.v <= 1;
    if (!inFrame) continue;
    state.marks.push({
      landmarkId: g.landmarkId,
      name: g.nameEn,
      u: g.u,
      v: g.v,
    });
  }
  if (state.marks.length < 3) {
    report("按 guess 只能投影出少（应能 ≥6 个）；改用左侧目录手工选点。");
  }
  renderMarkList();
  drawScene();
}

async function loadScene(scene: SceneDef): Promise<void> {
  state.scene = scene;
  state.marks = [];
  state.reportRoute = [];
  state.waypointPixels = [];
  state.guides = guessGuideMarks(scene);
  document.body.classList.toggle("loading");
  photo.onload = () => {
    el("loading").style.display = "none";
    canvas.style.display = "block";
    drawScene();
  };
  photo.src = `/${scene.assetPath}`;
  drawScene();
}

function drawScene(): void {
  canvas.width = NATIVE_W;
  canvas.height = NATIVE_H;
  ctx.clearRect(0, 0, NATIVE_W, NATIVE_H);

  // 引导圈（guess 投影位，空心圈；命中即吸附）
  for (const g of state.guides) {
    const px = guidePx(g);
    if (px.x < -60 || px.x > NATIVE_W + 60 || px.y < -60 || px.y > NATIVE_H + 60) continue;
    const active = g.landmarkId === state.activeLandmarkId;
    ctx.strokeStyle = active ? "rgba(255,210,63,0.95)" : "rgba(120,220,255,0.55)";
    ctx.lineWidth = active ? 3 : 2;
    ctx.setLineDash(active ? [0] : [4, 4]);
    ctx.beginPath();
    ctx.arc(px.x, px.y, active ? 14 : 10, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.font = "11px sans-serif";
    ctx.fillText(g.nameEn, px.x + 14, px.y - 8);
  }

  // 标注点 + 名字
  for (const m of state.marks) {
    ctx.fillStyle = "#ff7d23";
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
  if (el<HTMLInputElement>("show-route").checked && state.reportRoute.length > 1) {
    drawRouteOverlay();
  }
  // waypoints 圆点
  if (el<HTMLInputElement>("show-wpts").checked) {
    for (const w of state.waypointPixels) {
      if (w.u < 0 || w.u > 1 || w.v < 0 || w.v > 1) continue;
      ctx.fillStyle = "#ffe74a";
      ctx.beginPath();
      ctx.arc(w.u * NATIVE_W, w.v * NATIVE_H, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawRouteOverlay(): void {
  const route = state.reportRoute;
  ctx.lineWidth = 3;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    if (a.visibility === "OUT_OF_FRAME" || b.visibility === "OUT_OF_FRAME") continue;
    ctx.strokeStyle = a.visibility === "OCCLUDED" ? "rgba(230,96,96,0.9)" : "rgba(36,120,255,0.95)";
    ctx.beginPath();
    ctx.moveTo(a.u * NATIVE_W, a.v * NATIVE_H);
    ctx.lineTo(b.u * NATIVE_W, b.v * NATIVE_H);
    ctx.stroke();
  }
}

/** 主图单击 → 给当前地标落点（贴近引导圈时自动吸附） */
canvas.addEventListener("pointerdown", (e) => {
  const rect = canvas.getBoundingClientRect();
  const px = { x: (e.clientX - rect.left) / rect.width * NATIVE_W, y: (e.clientY - rect.top) / rect.height * NATIVE_H };
  let u = px.x / NATIVE_W;
  let v = px.y / NATIVE_H;
  const guide = state.guides.find((g) => g.landmarkId === state.activeLandmarkId);
  if (guide) {
    const gp = guidePx(guide);
    if (Math.hypot(px.x - gp.x, px.y - gp.y) < SNAP_PX) {
      u = guide.u;
      v = guide.v;
    }
  }
  state.marks.push({
    landmarkId: state.activeLandmarkId,
    name: state.activeLandmarkId,
    u,
    v,
  });
  renderMarkList();
  drawScene();
});

function renderMarkList(): void {
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

function runSolve(): void {
  if (!state.scene) return;
  if (state.marks.length < 3) {
    report("请至少标注 3 个地标点（推荐 6+ 校准 + 2 验证）：\n· 直接点“⚡ 预标记”按 guess 全量落点；\n· 或先选左侧地标，再在主图上单击其峰顶（带引导圈）；\n· 关键确认：珠峰 / 洛子 / 努子 / 普马里 四个主峰点必须对准真实山尖。");
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
  } catch (err) {
    report(`求解失败：${err instanceof Error ? err.message : String(err)}`);
  }
}

function fmtReport(b: { report: { status: string; reprojection: Repro; summary: Summary } }): string {
  const r = b.report;
  const overlay =
    r.status === "VERIFIED" || r.status === "CALIBRATED"
      ? "✅ 可开 routeOverlay（route[] 以本项目为 truth）"
      : "✗ REPRESENTATIVE → routeOverlay=false";
  return [
    `状态: ${r.status}`,
    `重新投影: median ${r.reprojection.medianPx.toFixed(2)}px · max ${r.reprojection.maxPx.toFixed(2)}px`,
    `LOO 验证最差: ${r.reprojection.maxValidationPx.toFixed(2)}px (diag ${r.reprojection.maxValidationDiagPct.toFixed(3)}%)`,
    `route: VISIBLE ${r.summary.visibleCount} / OCCLUDED ${r.summary.occludedCount} / OUT ${r.summary.outOfFrameCount}`,
    overlay,
  ].join("\n");
}

function report(text: string): void {
  el("result").textContent = text;
}

function exportPixels(): void {
  const json = JSON.stringify(
    state.marks.map((m) => ({
      landmarkId: m.landmarkId,
      u: Number(m.u.toFixed(5)),
      v: Number(m.v.toFixed(5)),
    })),
    null,
    1,
  );
  download("pixels.json", json);
}

function exportReport(): void {
  if (state.reportRoute.length === 0) {
    report("先运行求解，再导出报告。");
    return;
  }
  const built = buildReportData({
    scene: state.scene,
    pixels: state.marks.map((m) => ({ landmarkId: m.landmarkId, u: m.u, v: m.v })),
    dem: state.dem,
    route: state.route,
    waypoints: state.waypoints,
  });
  download(`${state.scene.id}.calibration.json`, JSON.stringify(built.report, null, 2));
}

function download(name: string, text: string): void {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

interface Repro {
  medianPx: number;
  maxPx: number;
  maxValidationPx: number;
  medianDiagPct: number;
  maxValidationDiagPct: number;
}
interface Summary {
  visibleCount: number;
  occludedCount: number;
  outOfFrameCount: number;
}

void boot().catch((e) => console.error(e));