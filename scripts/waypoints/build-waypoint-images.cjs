#!/usr/bin/env node
/**
 * 生成 waypoint 地点图（Discovery Card 用）——本地开发脚本，headless。
 *
 * 为什么要派生而不是新找图：
 *   每个 waypoint 的卡片图片必须与该地点强相关（冰瀑/雪谷/陡壁/南坳…）。
 *   仓库里唯一可自由使用的珠峰山体影像，是本项目自制的远征主视觉
 *   （everest-expedition-hero-v1.png，由 Copernicus DEM + Blender 渲染，
 *   见 design/world/everest-3d/SOURCE.md）。因此这里从该渲染图裁出
 *   各地点所在的山体区域——同一座山、同一光线，内容与地点对得上。
 *
 * 用法：node scripts/waypoints/build-waypoint-images.cjs
 * 输出：miniprogram/assets/expeditions/everest/waypoints/<id>.jpg（900×600）
 *
 * 注意：坐标是**归一化 0..1**（与 data/routes/everest/visual-route.ts 同一坐标系），
 * 改动山体路径标定后如发现卡片取景偏移，只需调整下方区域表。
 */
const path = require("path");
const fs = require("fs");
const Jimp = require("jimp");

const ROOT = path.join(__dirname, "..", "..");
const SRC = path.join(
  ROOT,
  "miniprogram/assets/world/everest-expedition-hero-v1.png",
);
const OUT_DIR = path.join(
  ROOT,
  "miniprogram/assets/expeditions/everest/waypoints",
);

const OUT_W = 900;
const OUT_H = 600;

/**
 * 取景区域：归一化中心 + 归一化半宽（高度由 3:2 输出比例推出）。
 * 每个区域对准该 waypoint 在山体上的地貌带（冰川前缘 / 冰塔带 / 雪谷 / 陡壁 / 山脊）。
 */
const REGIONS = [
  // 大本营：冰川前缘与冰碛坡（画面下部的平坦冰面 + 碎岩）
  { id: "base-camp", cx: 0.34, cy: 0.7, halfW: 0.28 },
  // 昆布冰瀑：破碎冰塔最密集的一段
  { id: "khumbu-icefall", cx: 0.42, cy: 0.67, halfW: 0.3 },
  // C1：冰瀑顶端进入冰川谷地
  { id: "camp-i", cx: 0.36, cy: 0.5, halfW: 0.26 },
  // C2：西库姆雪盆（更宽的雪谷视野）
  { id: "western-cwm-camp-ii", cx: 0.46, cy: 0.42, halfW: 0.28 },
  // C3：洛子壁陡峭冰壁
  { id: "lhotse-face-camp-iii", cx: 0.52, cy: 0.3, halfW: 0.24 },
  // C4：南坳鞍部（珠峰与洛子峰之间的低凹处）
  { id: "south-col-camp-iv", cx: 0.4, cy: 0.3, halfW: 0.26 },
  // 南峰：冲顶前雪脊
  { id: "south-summit", cx: 0.44, cy: 0.21, halfW: 0.22 },
  // 峰顶：金色山尖
  { id: "summit", cx: 0.51, cy: 0.16, halfW: 0.17 },
];

(async () => {
  if (!fs.existsSync(SRC)) {
    throw new Error(`缺少山体主视觉：${SRC}`);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const base = await Jimp.read(SRC);
  const naturalW = base.bitmap.width;
  const naturalH = base.bitmap.height;

  for (const region of REGIONS) {
    const img = await Jimp.read(SRC);
    const cropW = Math.round(region.halfW * 2 * naturalW);
    const cropH = Math.round((cropW * OUT_H) / OUT_W);
    const cropX = Math.max(
      0,
      Math.min(naturalW - cropW, Math.round(region.cx * naturalW - cropW / 2)),
    );
    const cropY = Math.max(
      0,
      Math.min(naturalH - cropH, Math.round(region.cy * naturalH - cropH / 2)),
    );
    img.crop(cropX, cropY, cropW, cropH).resize(OUT_W, OUT_H);
    const out = path.join(OUT_DIR, `${region.id}.jpg`);
    await img.quality(82).writeAsync(out);
    console.log(
      `[waypoint-image] ${region.id}.jpg ← crop(${cropX},${cropY},${cropW},${cropH}) of ${naturalW}×${naturalH}`,
    );
  }
})();
