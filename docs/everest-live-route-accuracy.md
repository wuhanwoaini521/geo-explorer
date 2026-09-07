# Everest LIVE — 路线精度与真实性（Route Accuracy & Truthfulness）

> 状态：**live-a = REPRESENTATIVE（暂无精确 route overlay）** · 更新时间：Stage 7
>
> 本文回答三件事：
>
> 1. 正式 route overlay 的**数据链**与**状态机**是什么；
> 2. 每一环**误差从哪来**、**允许多大**、**如何验证**；
> 3. 现在**敢宣称什么**、不宣称什么（诚实边界）。

---

## 1. 一句话

在生产小程序里，**不会有人手画一条“看起来像”的路线**：
只有「校准求解 + 硬阈值验证」达标的照片，才允许在 LIVE 照片上画路线；
不达标（REPRESENTATIVE）的照片只显示**真实影像 + HUD**，路线由 TERRAIN 的
科学地形（289 点真实控制点折线）承载。

---

## 2. 数据链（single chain of truth）

```text
设计真相源（dev）
  design/world/everest-live/coordinate-system.md   ← 唯一世界坐标系（ENU，米）
  design/world/everest-live/calibration/<scene>.json ← CalibrationReportV1
        （由 tools/everest-route-calibrator 求解/导出，route[] 已投影+可见性标注）
           │  scripts/calibration/sync-live-calibrations.mjs（搬运+降维，零计算）
           ▼
运行时（微信小程序）
  miniprogram/data/calibrations/everest/<scene>-calibration.ts  ← RuntimeSceneCalibration
        （runtime 唯一数据源；生产不依赖 viewer/Python/localhost，§39）
           │
           ▼
  engine/expedition-visual.ts  resolveLiveOverlay()
        只有 status ∈ {VERIFIED, CALIBRATED} 才用 route[] 画折线
        REPRESENTATIVE → 不画（§5/§40/§41）；OCCLUDED 段自动断开
```

**为什么需要两步（JSON → .ts）？**
微信运行时不能 `require(.json)` 作为模块（loader 会去找 `x.json.js`）。
因此按仓库既有模式（`south-col.json → south-col.ts`）用生成脚本搬运。
校准 JSON 仍是**唯一真相源**；`.ts` 只是它的运行时视图，命令可复现。

---

## 3. 状态机与 CI 阈值（§16/§43）

> 单一实现：`miniprogram/engine/calibration-validate.ts`（`statusFromReprojection`）。
> CI 不得放宽。

| 状态 | 判定（硬阈值） | route overlay | 文案（§40） |
| --- | --- | --- | --- |
| `VERIFIED` | 校准集 median ≤ **0.5%** 对角线 && hold-out validation ≤ **0.75%** | ✅ 可画 | “路线：已验证投影” |
| `CALIBRATED` | 校准集 median ≤ **0.5%**（validation 未过/缺） | ✅ 可画 | “路线：校准投影” |
| `REPRESENTATIVE` | 未求解 / 误差超标（>0.5%） | ❌ 一律不画 | “真实珠峰影像 · 代表性视角” |
| `UNAVAILABLE` | 不适合投影（视觉背景） | ❌ 一律不画 | “真实珠峰影像 · 视觉参考” |

参考换算：对角线 ≈3000 px 时，0.5% ≈ **15 px** 中位重投影误差。

runtime 唯一门禁：`routeOverlayAllowed(status) === VERIFIED/CALIBRATED`。

---

## 4. 坐标与投影（所有环共享同一帧）

见 `design/world/everest-live/coordinate-system.md`（数值已验证，与 south-col.json 回归一致）。

```text
x  =  98334.5 · (lon − 86.8450)
y  = -110575.116 · (lat − 27.95)      # +y 向南
z  =  elevation_m − 2976.22            # baseM = 2976.22 m
```

- Route 世界点：`south-col.json`（289 控制点 + 8 waypoint，同一帧）。
- 相机世界位置：由 EXIF GPS → 上式换算（如 LIVE-A Kala Patthar：
  `x≈1144.8, y≈−5409.3, z≈2568.8`）。
- 像素投影：`world → camera` 纯旋转+平移（径向畸变忽略，中焦段近似）→ 原始像素。
- 运行层把“原始像素 × 裁剪/缩放变换”换算为**运行归一化 0..1**（× 9:16 画布），
  route[] 输出的就是**运行坐标**，页面直接消费（不做第二套投影）。

**精度来源分解（CALIBRATED/VERIFIED 时）：**

- EXIF GPS / 海拔 → 相机位置（数百 m 级不确定度可接受，因 landmark 校准会归拢）；
- landmarks 人工标点：每点 1–2 px 级别的点击误差；
- 求解器最小化重投影 → 中位误差控制在 0.5% 对角线下；
- **验证**：hold-out landmark（求解时不参与）独立校核 ≤ 0.75%。

---

## 5. DEM 遮挡（§20 occlusion，真实科学地形）

- DEM：Copernicus DSM（1″，约 30 m 栅格），`design/world/everest-live/dem/`（`.raw` 不入仓，
  元数据 + 生成脚本 + 本 README 入仓）。`occlusion-30m`：rows=737 cols=819 step=30 m，
  绝对高程 min 4277 / max 6738（峰顶/洛子均覆盖）。
- 投影点可见性：`classifyVisibility()` 沿视线以 DEM 采样判 `VISIBLE / OCCLUDED / OUT_OF_FRAME`。
- 折线**按 VISIBLE run 切段**：不跨 OCCLUDED 直连（§33）；像素巨跳（>0.5 归一）视为断层同样断开。
- 简化：`decimate` 等步重采样上限 10 段/run（百万点里只取必要精度；符合 §32 简化误差 ≤1–2px 约束的叠加语义）。
- 验证：`tests/occlusion-pair.test.ts`（192 queries 与 Python 成对 100% 一致）、
  `tests/occlusion-grid-smoke.test.ts`（真实 Kala Patthar 相机对 289 route 点更可见字节混合）。

---

## 6. 当前状态表（2024-xx-xx）

| Scene | 照片 | status | route overlay | 说明 |
| --- | --- | --- | --- | --- |
| live-a | Kala Patthar（CC BY-SA 4.0，5848×4387） | **REPRESENTATIVE** | ❌ 不画 | 真实照片 + 校准工具链已就绪；无人工像素标点 → 不冒充精度 |
| live-b | — | 未绑定 | （fallback TERRAIN） | B/C/D 在影像确定前保持未绑定，绝不假图填坑 |
| live-c | — | 未绑定 | （fallback TERRAIN） | 同上 |
| live-d | — | 未绑定 | （fallback TERRAIN） | 同上 |

> `design/world/everest-live/calibration/live-a.json` 由 CLI 生成
>（`cli representative --scene live-a`，status=REPRESENTATIVE，route[] 空，reprojection 全 0 占位
> 且 pass=false，limitations 明示「未作精度声明」）。
> 运行下沉数据 `miniprogram/data/calibrations/everest/live-a-calibration.ts` 由
> `node scripts/calibration/sync-live-calibrations.mjs` 同步。

---

## 7. 升级路径（什么时候能画路线）

1. 打开校准 viewer 加载 live-a 原图 + DEM 相机（Kala Patthar GPS 已入 metadata）；
2. 人工在真实珠峰/洛子肩等视界标记 6–8 个 landmark（role calibration + 2 个 validation）；
3. 求解 → 查看重投影误差（median 对角线）、validation 误差；
    - median ≤0.5% 且 validation ≤0.75% → `VERIFIED`；
    - 只 median ≤0.5% → `CALIBRATED`；
    - 否则仍是 `REPRESENTATIVE`（不升级）。
4. 导出 calibration JSON → 跑 sync 脚本 → 小程序运行时自动出现路线 overlay
   （用户无感知切换；无需写任何绘制代码）。

**重新生成命令：**

```bash
# 求解 / 导出（在仓库根目录执行，cwd=process.cwd()）
node tools/everest-route-calibrator/dist/src/cli.js solve --scene live-a ...
node tools/everest-route-calibrator/dist/src/cli.js representative --scene live-a   # 兜底报告
# 同步到运行时 .ts
node scripts/calibration/sync-live-calibrations.mjs
```

---

## 8. 诚实边界（为什么现在不画）

- 某张照片无法精确投影 → 标 `REPRESENTATIVE` 并关闭 route overlay；
  不因为“其它图有路线”就强迫每张图都有（§35）。
- UI 从不写“精准路线”，除非 status 已达 VERIFIED/CALIBRATED（§40）；
  `live-a` 的 → info 显示 “真实珠峰影像 · 代表性视角”。
- 生产数据**不再携带**手工 CURATED 示意锚点（§41 已删除）；dev 预览锚点只能放在
  review/工具侧，不进生产。
- 校准 JSON 是运行时数据源；solver 只在 dev 工具（`tools/everest-route-calibrator`）。

---

## 9. 测试覆盖（§42 / P43）

- 求解器回归：合成相机位姿 → 解回误差 < 阈值（`tests/calibration-tool.test.ts`）；
- 状态机：VERIFIED/CALIBRATED/REPRESENTATIVE 阈值与 routeOverlay 门禁
  （`tests/calibration-stage2.test.ts`）；
- DEM 遮挡：合成山脊 + 真实 DEM 网格（`tests/occlusion-pair/grid-smoke`）；
- 运行时：LIVE calibrated（合成 route 画线）与 LIVE representative（无 route）
  （`tests/gate33c-live-a.test.ts` / `tests/expedition-visual.test.ts`）；
- 数据门禁：不得 `import .json`（`tests/gate31-require-regression.test.ts`）。

---

## 12. 已知限制（Dev）

- 中焦段镜头畸变近似忽略；有较广角素材时应先标定内参。
- landmark 点击精度为人工视觉审核（≥1–2 px）——正是需要人工标点的环节（§3）。
- 零解算时 route[] 为 []，不产生任何“假”路径点。
