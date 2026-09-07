/**
 * 校准 CLI（node dist/cli.js …）。
 *
 *   node src/cli.ts --help
 *   node dist/cli.js solve --scene live-a --pixels design/world/everest-live/pixels/live-a.json
 *     [--dem design/world/everest-live/dem/occlusion-30m.raw]
 *
 * pixels.json 结构：[{ landmarkId: "everest-summit", u: 0..1, v: 0..1 }, …]
 * 由 web/viewer 直接导出；也允许手工编写（CLI 全本地、无浏览器依赖）。
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { assembleReport } from "./node.js";
import type { PixelInput } from "./calibrate.js";
import { SCENES, sceneById } from "./scenes.js";
import type { DemGrid } from "./math/occlusion.js";

function usage(): void {
  console.log(`Everest Route Calibrator (§X)

用法:
  node dist/cli.js solve --scene <id> --pixels <file.json> [--dem <raw.raw>] [--out <dir>]
  node dist/cli.js solve --scene live-a --pixels design/world/everest-live/pixels/live-a.json

必需:
  --scene <id>   live-a | live-b | live-c | live-d
  --pixels <file.json>  地标归一化标注 [{"landmarkId":...,"u":0..1,"v":0..1}]

可选:
  --dem <grid.raw>   DEM 网格（.raw Float32 行优先，配 <name>.json 元数据）
  --out <dir>        输出目录（默认 design/world/everest-live/calibration）

输出:
  calibration/<scene>.json（CalibrationReportV1，runtime 数据源）+ .md 摘要

状态机（§43）：
  VERIFIED: medianDiagPct≤0.5% 且 LOO-max≤0.75%
  CALIBRATED: medianDiagPct≤0.5%
  其余一律 REPRESENTATIVE（routeOverlay=false）
`);
}

function loadPixels(path: string): PixelInput[] {
  const text = readFileSync(path, "utf8");
  let data: PixelInput[];
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`pixels 文件不是合法 JSON：${path}`);
  }
  if (!Array.isArray(data)) throw new Error("pixels file 需为数组");
  for (const p of data) {
    if (!p || typeof p.landmarkId !== "string" || typeof p.u !== "number" || typeof p.v !== "number") {
      throw new Error(`非法标注：${JSON.stringify(p)}`);
    }
  }
  return data;
}

/** 读 DEM（companion .json 元数据给出 shape/origin/step） */
function loadDem(rawPath: string): DemGrid | null {
  const metaPath = rawPath.replace(/\.raw$/, ".json");
  if (!existsSync(metaPath)) throw new Error(`缺少 DEM 元数据 ${metaPath}`);
  let meta: { rows?: number; cols?: number; step: number; originX: number; originY: number; originZ?: number };
  try {
    meta = JSON.parse(readFileSync(metaPath, "utf8"));
  } catch {
    throw new Error(`DEM 元数据不是合法 JSON：${metaPath}`);
  }
  const buf = readFileSync(rawPath);
  const rows = meta.rows as number;
  const cols = meta.cols as number;
  if (buf.length !== rows * cols * 4) {
    throw new Error(`DEM 尺寸不符：${buf.length} != ${rows * cols * 4}`);
  }
  return {
    rows,
    cols,
    step: meta.step,
    origin: { x: meta.originX, y: meta.originY, z: meta.originZ ?? 0 },
    z: new Float32Array(buf.buffer, buf.byteOffset, rows * cols),
  };
}

function run(argv: string[]): void {
  if (argv.length === 0 || argv.includes("--help") || argv.includes("-h")) {
    usage();
    return;
  }
  const arg = (name: string): string | undefined => {
    const i = argv.indexOf(name);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : undefined;
  };
  const sceneId = arg("--scene") ?? "live-a";
  const pixelsPath = arg("--pixels");
  if (!pixelsPath) {
    console.error("缺少 --pixels <file.json>");
    usage();
    process.exitCode = 2;
    return;
  }
  const scene = sceneById(sceneId);
  if (!scene) {
    console.error(`未知 scene ${sceneId}（可用：${SCENES.map((s) => s.id).join(", ")}）`);
    process.exitCode = 2;
    return;
  }
  if (!scene.cameraGuesses) {
    console.warn(`场景 ${sceneId} 没有相机 guess —— 该场景还不能求解（仅能生成 REPRESENTATIVE 报告）。`);
  }
  const pixels = loadPixels(resolve(pixelsPath));
  const demRaw = arg("--dem");
  const dem = demRaw ? loadDem(resolve(demRaw)) : null;

  const outDir = arg("--out");
  const result = assembleReport({
    scene,
    pixels,
    dem,
    outDir,
    extraLimitations:
      dem === null ? ["未加载 DEM；遮挡全部按 VISIBLE 处理（推荐 --dem）。"] : undefined,
  });
  console.log("");
  console.log(`✔ 场景        ${scene.id}`);
  console.log(`  状态        ${result.status}`);
  console.log(`  校准标注    ${pixels.length} 点`);
  console.log(`  输出        ${result.wrote.join(", ")}`);
  console.log(`  状态机断言  ${result.status === "VERIFIED" || result.status === "CALIBRATED" ? "routes可开overlay" : "REPRESENTATIVE: routeOverlay=false"}`);
}

// 直执行：node dist/src/cli.js …
if (import.meta.url.endsWith("dist/src/cli.js")) {
  run(process.argv.slice(2));
}

export { run };