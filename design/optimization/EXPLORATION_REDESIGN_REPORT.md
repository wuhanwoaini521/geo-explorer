# Exploration Module Redesign Sprint

## Executive Summary

本轮在 `codex/exploration-redesign` 重建了 Exploration 的交互主干：整条路线与当前位置共享同一进度，用户可以连续拖动或逐站推进、点击节点发现内容，并在抵达终点后查看探索报告。Mariana 改为专属垂直下潜场景；Everest 保留成熟的实景/DEM 路线并接入新控制台；Grand Canyon 完成“路线 + 岩层时间”实验。路线引擎、内容、媒体注册、知识解锁和记录系统均保留。用户已有 `project.config.json` 改动保留且不提交；本地开发者工具读取 `dist-local/miniprogram/`，源码与两套构建产物已同步。

## Current Problem

源码与改版前截图共同确认：旧水柱沿用了山岳路径投影，7 个下潜节点在主场景中不能完整呈现；底部 HUD 占 43%–46% 视口；总览为独立长说明层；首次到站会弹出内容卡，中断连续探索。世界之间虽然数据不同，但操作与空间表达没有形成足够强的差异。

## New Interaction Model

- 整条路线与当前局部共用 routeIndex 和唯一 current 进度；切换视角不解锁、不传送、不重置。
- 路线微缩站点条常驻，明确当前站、下一站、旅程终点。
- 向下拖动海洋场景即下潜；按钮逐站连续推进；点击路线节点查看已到达内容或未到达预告。
- 首次到站改为发现邀请，主动点击才展开媒体/知识；抵达终点可打开现有探索报告。

## Mariana

专属水柱示意替代照片投影：局部将潜水器保持在可视场景中，让前后站点随连续进度流动；总览展示全部 7 站和海洋分层。明确标注非等比示意，不使用不相关照片冒充沟底。深度连续驱动光照、水压、水温、海雪与沟壁/沟底显现。

## Everest

保留实景、DEM、现有相机与路线数据。共享旅程控制台与总览/局部切换；路线节点、当前海拔、下一站、沿途观察和终点报告形成同一条操作链。起点、中段、峰顶及 360×640 小屏截图已检查。

## Grand Canyon

已完成实验版：复用相同 routeIndex，但用“实景路线 + 当前岩层 + 从新到老的岩层时间轴”建立独立表达。局部视角显示当前位置对应岩层与年代；总览展开五层地质时间；向下拖动与下切方向一致。主数值显示实际海拔，辅助指标显示累计下切深度，避免混淆。

## Whole View / Detail View

同一 current → routeIndex → journeyAt → 总览/局部。局部显示前站、当前站、后站；总览显示全程。海洋的纵向刻度明确为非等比布局，数值仍来自真实路线参考深度。

## Media & Background

复用已核验的注册媒体和出处，历史任务照片只在内容卡出现；没有原位照片的节点保持科学示意，不伪造实景。本地媒体构建继续携带 46 个媒体文件，正式构建维持既有远程资源机制。

## Visual QA

截图目录：`artifacts/visual/exploration-redesign/`（按项目约定不提交图片）。

- `before/`：改版前代码基线。
- `round-1/`：第一轮 Mariana/Everest 起点、全部站点、总览终点及大峡谷基线。
- `round-2/`：Mariana、Everest、Colorado 的起点、全部节点、总览起终点，共 28 张，390×844；用于第二轮结构检查。
- `round-2-small/`：同一矩阵，共 28 张，360×640；用于检查紧凑视口、底部安全区与长文案裁切。
- `round-3/`：最终 390×844 矩阵，共 28 张；`capture-report.json` 记录 0 页面错误、0 图片加载失败。
- `scripts/exploration-headless.cjs` 使用真实编译 Page + 源 WXML/WXSS，后台 Chromium 渲染。属于浏览器适配预览，不是微信原生模拟器。
- 适配器已检查并修复 page 选择器、内联 rpx、WXML include、text 选择器的转换；不得将适配器转换问题误判为产品问题。
- 微信原生截图阻塞：`ws://127.0.0.1:9420` 无法建立自动化会话；没有自动打开可见窗口。

## Validation

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run content:validate` | 45/45 通过 |
| `npm test` | 58 个测试文件通过，650 项通过，7 项按项目约定跳过 |
| `npm run build` | 通过；78 个 JS 文件引用检查通过 |
| `npm run build:local-media` | 通过；`dist-local/miniprogram/` 含 46 个本地开发媒体 |
| `npm run package:audit` | 通过；总包 1.59 MiB，主包 1.21 MiB，全部包低于 2 MiB 单包限制 |
| `npm run content:report` | 通过；41/41 知识有来源，内容报告已更新 |
| `npm run quality:report` | 通过；0 errors / 0 warnings，知识图 61 边、跨世界 15 边 |
| `git diff --check` | 通过 |

新增回归覆盖总览/局部切换不改变进度与解锁状态、Mariana/Colorado 的拖动方向、连续节点投影、大峡谷实际海拔与岩层年代、内容卡防误触、到站邀请、终点报告和重新开始。

## Remaining Issues

1. 微信自动化端点 `ws://127.0.0.1:9420` 最终重试仍无法连接；没有启动或抢占可见窗口。因此已完成真实 Page 逻辑 + WXML/WXSS 的无头截图 QA，但不宣称微信原生视觉通过。
2. 正式媒体 CDN base URL / 凭据仍未配置；`dist-local` 可供明早开发者工具本地预览，正式包继续遵循既有远程媒体边界。
3. 质量报告仍列出需要人工媒体签核的 P1，以及 Fuji/Colorado 专属场景插画等长期 P2；本轮 Exploration 体验无 P0 剩余项。
