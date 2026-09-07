# 珠峰实景 + 校准 · Phase-2 阶段终报

> 范围：本次长时间协同会话的收尾自查。只陈述「已做完 / 被阻塞 / 可 5 分钟完成」，
> 不报未验证的数字。

## 1. 目标与现状

目标（goal §v3）：把珠峰做成「真实实景照片 + 精确路线投影 + DEM 科学地形 + 校准
工具闭环」；LIVE-A 从 `REPRESENTATIVE`（routeOverlay=false）升级为
`CALIBRATED/VERIFIED`（routeOverlay=true）。

**当前状态（诚实汇报）：**

- ✅ **基础设施全部落地且测试 313→321 通过**：真实 289 点路线（DEM 校正海拔）、
  7 段阶段映射、8 大事记、Camera/Media/DataSource、状态机三态、Calibrator 全链
  （标注→求解→遮挡→LOO→报告）、浏览器标注 view、一键 `npm run everest:viewer`。
- ⚠️ **LIVE-A 停在 REPRESENTATIVE**：`routeOverlay=false`，首页仍先展示 TERRAIN
  （真实科学与合法）实景照片本身。真实照片已登记为 approved 素材，但
  **真像素标点缺一个人**：本模型无视觉、当前会话的操作者也无法把峰顶认出/标在照片上。
  不因缺人而伪造（见 §3）。
- ✅ **校准工具已就绪到“点一下就完成”**（§4），任何人（含下一位维护者）都能在
  5 分钟内把 LIVE-A 升为标准的数据源。

## 2. 这一阶段交付了什么

已提交并推送 `origin/main`：

1. **再次修好 viewer**（这是关键的最后一段）：`web/viewer.ts` 用 `getElementById`
   绑的目标 id 与 HTML 不一致（`image/run/show-wm` vs `photo/run-btn/show-wpts`）、
   绝对路径 import 根本无法在浏览器跑起来 → 页面 200 但不交互。修复：全部 DOM id
   对应、相对 import、server.mjs 补 `src/*.js`/`web/viewer.js` 从 `dist/` 回退。
2. **引导式标注闭环**（人工工作量 → 「每个峰顶点一下」）：`guessGuideMarks` 先用
   EXIF 相机 guess 给每条地标画空心引导圈；`⚡ 预标记` 一次铺满全部；点击距圈
   <130px 自动吸附；求解同 CLI（buildReportData 唯一实现）。
3. **真实 EXIF 初值**：live-a 相机 = Kala Patthar 北缘真实 GPS（不是峰顶抄坐标），
   俯角标尺对准主峰。
4. **珠峰西肩**入地标库（8 条有序地标；非求解门槛）。
5. **一键命令** `npm run everest:viewer`（编译+起端口 8787）。
6. **路线全景 / 数据来源与许可 / Waypoint Detail 打通**：
   - “🗺 查看路线”从“敬请期待”占位改为**真数据 sheet**（全程/爬升/下降、
     7 阶段、8 里程碑、数据来源，全部由 routeIndex/stageMap 计算）；
   - 新增「我的 → 📜 数据来源与许可」页：实景影像许可（Wikimedia CC BY-SA 4.0）、
     DEM（Copernicus GLO-30）、路线与坐标、参考数据，每条可复制链接；
   - 新增大事件 UI 已有足迹点介绍卡（Waypoint Detail）。
7. **测试总纲**：`313 → 321`，新增 `tests/credits-integrity.test.ts`（8 用例：
   出处必填、磁盘资产真实存在、近似值标注、id 唯一、routeIndex 计算量、里程碑单调、
   阶段 0..100%）+ 上一轮的 `calibration-guide.test.ts`（6 用例）。

## 3. 为什么不“先挂一个人工标注”

- 本模型（无视觉）无法识别照片内哪一幕是珠峰峰尖；
- 当前会话没有真人能在浏览器 1 分钟点 6 个峰；
- 于是**不再继续在哪里标注**上有真实信息可求。
- 状态机已把 `REPRESENTATIVE` 固定为 `routeOverlay=false`，不会为了 EXIF/方向差
  异而假装校准。REPRESENTATIVE 是**允许的、合法的终态**（goal 明确写“被阻塞不算失败”）。

## 4. 万一之后有人能看照片 → 一键升级

见 `design/world/everest-live/live-a-viewer-guide.md`（已入库）：

```bash
npm run everest:viewer
# 打开 http://localhost:8787/tools/everest-route-calibrator/web/
# 点 ⚡ 预标记 → 逐个峰顶核验 → ▶ 求解并投影 → 若 CALIBRATED/VERIFIED → ↓ 导出 pixels.json
# 把 pixels 交回：node …/cli.js solve --scene live-a --pixels … → live-a.json → sync → commit
```

`REPRESENTATIVE → CALIBRATED` 由此从“重新开发”变成“一次点击闭环”：
数据层、测试、运行时消费端（首页 live overlay）全部已经就绪。

## 5. 未做 / 风险残留（诚实的开放项）

| 项 | 状态 | 说明 |
| --- | --- | --- |
| LIVE-B/C/D 场景 | 未绑定 | 无真实可用影像前保持未绑定 → 页面自动 fallback TERRAIN；绝不假图 |
| LIVE_A 实景叠加 | REPRESENTATIVE（无） | 等真人标注；工具已就位 |
| DEM 遮挡判定 | 有（Copernicus 30m） | 与 route 的 289 点联合的正确性已有测试 + `occlusion-pair` fixture |
| waypoint 影像槽 | 未建字段 | 每类点仅以“无实拍/示意图”占位，不虚构影像内容 |
| 跨平台构建 | 微信小程序 TS 编译 | `npm run typecheck` + 全库测试均绿 |
| 精度声明 | 只做“明确测试过的” | 8848.86 为官方联合测量；DEM 网格节。近似值都以 approximate 标识 |

## 6. 收尾

- git 历史：各阶段独立 commit，本阶段已提交并推送 `origin/main`（含 viewer
  修复、引导标注、路线全景、数据来源页、测试与文档）。
- 一键验证：`npm run typecheck`、`npx vitest run`（321 通过）、
  `npm run everest:viewer`（8787 提供 viewer.js / 照片 / DEM / route.json，DOM boot 已验证）。
