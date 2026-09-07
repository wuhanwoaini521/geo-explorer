# LIVE-A 实景校准 · 一步操作指南（Phase-2）

> 目的：把 LIVE-A 从 `REPRESENTATIVE / routeOverlay=false` 升到
> `CALIBRATED / VERIFIED`（`routeOverlay=true`、真实像素投影 289 点路线）。
> 人工只做一件最简单的事：**在照片上把每条峰点一下**。相机位姿/焦距/遮挡/阈值
> 全部由本仓库的 solver + DEM 完成，不需要懂 GPS/ENU/PnP。

## 0) 零前置：一个命令

```bash
npm run everest:viewer
```

等价于 `node tools/everest-route-calibrator/server.mjs`（首次会把 `web/viewer.ts`
编译到 `dist/`）。只要仓库根有 `node_modules` 即可。

在浏览器打开（**必须是这个 URL，带末尾斜杠**）：

```
http://localhost:8787/tools/everest-route-calibrator/web/
```

页面会显示 `live-a-kala-patthar.jpg` 真照片。左侧是「地标库」按钮，底部按钮列
包含：`⚡ 预标记`、`▶ 求解并投影`、`↓ 导出 pixels.json`、`↓ 导出 report.json`、
`叠加路线` / `waypoints` 开关。

## 1) 一键落点（⚡ 预标记）

点 **`⚡ 预标记`**：viewer 会用初始相机 guess 把每一处可见地标投影成
**空心引导圈** 并直接放入标注列表。这会让你的工作量从 8 次“找峰”，降为
“瞄一眼确认”。

- 预标记是按 guess 投影的，**可能偏几个像素到一屏幕**（EXIF GPS 有 ±百米误差，
  焦距也是 guess）。
- 对每个圈：先在左侧点亮该地标按钮，再在照片上**该峰的真实顶点**单击一次。
  若你点得离对应引导圈较近（≤130px），会自动**吸附**到圈上——就算你的点
  不到位也只影响那一峰的假设，不等于自动校准——真正的解由后续对全部标点的
  solver 求出。
- 若某个引导圈和照片完全对不上（相机预设不是本张照片的机位），可以全部清空，
  手工逐个单击真实峰顶即可——每次点击都把 (u, v) 加入列表。

## 3. 应标注哪些地标（最少 6，推荐 8+）

这些都在内置地标库，不需要输入 GPS / ENU：

| 按钮 | 在照片里长这样（Kala Patthar 9:16 竖构图） |
| --- | --- |
| `everest-summit` | 珠峰主峰尖——画面**中上偏右或中上**的那座雪尖，绝对要准 |
| `everest-south-col` | 珠峰与洛子之间那段城口（横缝） |
| `lhotse-summit` | 珠峰右下、南脊后面的璪块（比珠峰矮一截的雪峰） |
| `nptse-summit` | 金字塔形黑岩峰（取决于机位可能在珠峰的左或右前景） |
| `changtse` | 最左侧、珠峰北后一座山体（9:16 可能被切出帧） |
| `everest-west-shoulder` | 珠峰西侧的大肩（西側雪坡），通常是最高峰左侧（西面）的宽大肩带 |
| `pumori` | 左前方白色陡锥（可能已在画面外） |
| `ama` | 极远处右侧的山影（远） |

经验顺序：先标 **everest-summit**（最尖、最好认）→ 再从近到远补到 ≥6。
每条都点过 `⚡ 预标记` 后，只检查每个圈与真实峰顶的对齐情况，再补点。

## 4. 求解 → 验收阈值

点 **`▶ 求解并投影`**，右侧输出：

```
状态: CALIBRATED | VERIFIED | REPRESENTATIVE
重新投影 median ≤ 0.5% · LOO 最差 ≤ 0.75% …
route: VISIBLE 68 / OCCLUDED 153 / OUT-OF-FRAME 68 …
```

- **CALIBRATED**：`median ≤ 0.5% 对角线` 且 LOO 最差 `≤ 0.75%`
- **VERIFIED**：校准点 数 ≥ 6 + 验证点 ≥ 2 且全部通过 → 标记
  `VERIFIED`（`routeOverlay=true`）
- 若显示 REPRESENTATIVE：多半是任何点太少（<3）或解对不准，看右侧提示。
- 若有个别地标误差大，回到画图把那块**再点一次更准的位置**，重跑，观察 median
  降低。

## 5. 保存 → 提交

点 `↓ 导出 pixels.json`（带对应 `landmarkId + u/v`），再把 `↓ 导出 report.json`
也存下（可选，验证 user + route 数据）。把 `pixels.json` 交给我（会话主人）即可：

> 交接格式：把 `landmarkId,u,v` 贴到对话里（或存回仓库
> `design/world/everest-live/calibration/live-a.pixels.json`）

我会：`node tools/everest-route-calibrator/dist/src/cli.js solve --scene live-a --pixels …`
→ 写 `live-a.json`（像素→唯一真源）→ `scripts/calibration/sync-live-calibrations.mjs`
→ 验证 → commit。此后 LIVE-A 首页即显示真实投影路线 + 新的状态 chip；
`solve` 语义与 viewer 完全同源（`buildReportData`）。

## 6. 我（人类）能把这任务当多久？

- **目标：一气到 VERIFIED/CALIBRATED + routeOverlay=true**（若时间够）。
- 若视频/浏览器受限（如没有 GUI），也**不失败**：保持在 REPRESENTATIVE 是
  诚实且允许的终态，不会手画假路线；后续把工作切到 LIVE-B/C/D 中的站点 +
  waypoint media + Route Overview + Credits + 测试。
- 一旦 EXIF/构图 metadata 有修正（或你把某个峰的真实像点改了），重复 3–5
  就进入 CALIBRATED，无需开发改动。

## 术语 & 验证源头

- 全部来自本仓库分析：坐标系 `design/world/everest-live/coordinate-system.md`，
  精度/阈值 `docs/everest-live-route-accuracy.md`，路线 289 点（VISIBLE/OCCLUDED/
  OUT_OF_FRAME 由 Copernicus 30m DEM 遮挡判定），waypoints 交叉 ≤160m。
- 只承诺明确声明的：状态机三态（VERIFIED/CALIBRATED/REPRESENTATIVE）都写在
  `miniprogram/engine/expedition-visual.ts`，生产禁用 routeOverlay 于未验证态。
