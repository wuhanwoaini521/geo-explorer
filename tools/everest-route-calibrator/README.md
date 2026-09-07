# Everest Route Calibrator —— 珠峰实景校准工具链

> **只做数学上站得住的作品**（目标 §23）：真实珠峰实景照片 + 精确路线投影，禁止手画"看起来合理"的假路线。
> 「标注 → 求解 → 验证 → 渲染」全闭环，所有步骤本地运行，无外部服务依赖。

```
pixels.json（web/viewer 点出 0..1 坐标）
   └→ camera-math.solveCameraPose（Geod→World · 相机基 · LM 求解 · 6DoF+f）
     └→ occlusion.classifyVisibility（可选 DEM 网格视线遮挡）
       └→ calibrate.buildReportData → CalibrationReportV1（runtime 数据源）
          → node.assembleReport 落盘 <scene>.json + .md
```

## 快速开始（10 分钟 DIST-A 标注流程）

```bash
# 0) 用一个命令起全部（编译 viewer.ts → 起端口 8787）
npm run everest:viewer
#    → 浏览器打开 http://localhost:8787/tools/everest-route-calibrator/web/
#      等价手动：npm --prefix tools/everest-route-calibrator run build
#                && node tools/everest-route-calibrator/server.mjs

# 1) （可选）手工起本地静态服务器（仓库根即站点根）
node tools/everest-route-calibrator/server.mjs

# 2) 浏览器里：
#    - 左边"地标目录"选中一个地标（Everest Summit 等）
#    - 在主图上单击落点（给同一地标多打几个点可消系统误差）
#    - 凑满 5+ 个可见地标 → 点"▶ 求解并投影"
#    - 看状态机：VERIFIED/CALIBRATED → 该照片可开 routeOverlay
#    - "↓ 导出 pixels.json" 得到标注文件

# 3) 终端重跑生成权威报告（结果与浏览器同源，只是落盘到仓库）
node tools/everest-route-calibrator/dist/src/cli.js solve \
  --scene live-a \
  --pixels design/world/everest-live/pixels/live-a.json \
  --out design/world/everest-live/calibration
```

材料来自 Wikimedia Commons（Kala Patthar 遥望珠峰，CC BY-SA 4.0，SONY ILCE-6000 28mm 等效，5848×4387 原图裁剪为 1080×1920 肖像）。
材料来自 Wikimedia Commons（Kala Patthar 遥望珠峰，CC BY-SA 4.0，SONY ILCE-6000 28mm 等效，5848×4387 原图裁剪为 1080×1920 肖像）。
珠峰顶 / Lhotse / Nuptse / Pumori / 南坳 / **西肩**（`everest-west-shoulder`）等官方地标坐标见 `design/world/everest-live/coordinate-system.md`。

## Phase-2/一键引导（人工只点几个像素）

live-a 的相机初始值取 **EXIF 真实 GPS**（27.9989129,86.856634），初始俯角定珠峰中上方；
viewer 会用 guess 把每条地标投影成**空心引导圈**（纯函数 `guessGuideMarks`），
`⚡ 预标记` 一键把圈位放入标点列表，单击峰真时距圈 <130px 自动吸附。
人工只需“缘点确认”，`▶ 求解并投影` 走与 CLI 同源的 `buildReportData`（solver 真值 + DEM 遮挡 + LOO 阈值）。
浏览器操作手册：`design/world/everest-live/live-a-viewer-guide.md`。
server.mjs 会把 `src/*.js`/`web/viewer.js` 从 `dist/` 回退，因此 `npm run everest:viewer` 一键即可运行。

## CLI 子命令

| 命令 | 说明 |
| --- | --- |
| `node dist/src/cli.js solve --scene <live-a\|b\|c\|d> --pixels <json> [--dem <grid.raw>] [--out <dir>]` | 求解 + 全路线投影 + LOO 验证 → 写 `CalibrationReportV1` |
| `node dist/src/cli.js --help` | 参数说明 |

`--dem` 需要 20m 网格：`.raw`（Float32 行优先）+ 同名 `.json`（`{rows,cols,step,originX,originY,originZ}`）。

## 浏览器工具

- `web/index.html` —— 画布标注器；复用与 CLI 完全同源的核心（`buildReportData`），无重复实现。
- `web/viewer.ts` —— 控制器；`fetch` 拉取 route / waypoints / DEM。纯本地。
- 两地归一的惯：**`src/calibrate.ts` 只做纯求解**（不引 node）；`src/node.ts` 才接触 fs/文件。浏览器永远不 import node.ts。

## 镜像纪律（与 miniprogram 一对一）

```
tools/everest-route-calibrator/src/math/camera-math.ts  ≙  miniprogram/engine/world-frame.ts
tools/…/src/math/occlusion.ts                                （miniprogram 无 DEM，仅工具侧判断）
tools/…/src/calibrate.ts / node.ts                      ≙  miniprogram/engine/calibration-solver.ts (+报告)
```

改任一公式/解法，必须同步另外几处；唯一真相在
`design/world/everest-live/coordinate-system.md`（289 点回归，残差 <0.1m）。

## 人为不能看的兜底（模型无视觉）

LIVE-A 真实照片的"人工像素标点"必须由真人在地图上点出（本模型看不到图）。
若最终拿不到标点，Stage 5 会产出 **REPRESENTATIVE** 校准（仅坐标 guess + routeOverlay=false），
工具链完整保留，留给任何一位标注者按上文 10 分钟流程完成 VERIFIED。

## 构建 / 测试

```bash
npx tsc -p tools/everest-route-calibrator/tsconfig.json     # 工具
npx vitest run tests/calibration-tool.test.ts               # 工具回解 + 遮挡 + 状态机
```
