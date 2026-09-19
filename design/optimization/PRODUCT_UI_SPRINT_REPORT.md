# Product UI Sprint Report

日期：2026-09-19

## 分支

- Branch：`codex/product-ui-mariana-media`
- 起点提交：`353ab8a6af39b4e420f00027be87096af3deb8e1`
- 功能实现终点：`3f8e50bd02dc8e877087cf82bffce8172592cbed`
- 本报告及最终质量报告作为后续文档提交保存。

## 本轮范围与交付

1. 修正 `m2-limiting-factor-bottom` 的真实语义：它是 DSV Limiting Factor 舱内操作员/任务设备记录，不是沟壁、海床或沉积物。运行时由 hero 降级为 `challenger-bottom` 的 secondary 任务记录；错误的 `trench-rim`、水柱与主背景绑定已移除。
2. 重做 Mariana Exploration 主场景为数据驱动的垂直下潜：0–10,935 m 的五个海洋带、衰减光柱、气泡、海雪、6,000 m 后的程序化海沟侧壁、9,000 m 后的程序化海床、非人物探测器 marker、深度标尺与海洋 HUD。程序化环境明确不宣称实拍。
3. HUD 对海洋世界显示深度、压力、自然光、水温、海洋带和距海底；抵底状态显示 10,935 m / 路线完成，不再遗留山岳“海拔/攀登”主语义。
4. 增加资产解析器，形成 `资产 ID → runtime manifest → 远程 URL（可带版本）→ 显式本地 fallback → 设计占位` 链；知识媒体已接入该链。
5. 构建链分离：`npm run build` 只生成可发布的 `dist/`，`npm run build:local-media` 生成已忽略的 `dist-local/` 并带本地媒体。正式包不再复制 `media-remote/`。
6. 修复根 `project.config.json` 的 Exploration 调试路径，改为真实分包路径 `pkg-explore/pages/exploration/index`。

## 媒体与内容审计

- 生成 `MARIANA_MEDIA_AUDIT.md`：逐项记录画面内容、来源、许可、运行时用途和替换需求。
- 生成 `KNOWLEDGE_MEDIA_AUDIT.md` 与 `OTHER_WORLDS_BACKLOG.md`：安全新增富士山 `k39-osunabashiri` 知识媒体关联，同时保留 Fuji / Grand Canyon 的后续媒体债务，不以无关照片填充空缺。
- 重新生成媒体评审板与覆盖报告；质量报告的远程媒体存在性检查已改为识别 `media-remote/` 已审核副本，结果为 **0 errors / 0 warnings**。
- 当前内容指标：41/41 知识条目有来源；29/29 waypoint 有来源并关联知识；runtime media 47 项；Mariana 的无原位水柱/沟坡照片节点使用程序化环境，不伪造实景。

## COS / EdgeOne 状态

- 未发现可用的媒体交付 base URL 或 COS 凭据配置；未输出、未写入、未上传任何密钥或媒体。
- 现有迁移工具的 dry-run 可枚举 46 个远程媒体文件，但正式发布域名仍是外部阻塞项。
- 因而未猜测或硬编码 COS / EdgeOne 地址；解析器已支持未来配置 `remoteBase` 与版本参数。`dist/` 保持无本地内容媒体，`dist-local/` 仅供开发者工具本地调试。

## 验证

| 命令 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run content:validate` | 45/45 通过 |
| `npm test` | 57 个测试文件通过，639 通过，7 个按项目约定跳过 |
| `npm run build` | 通过；77 个 JS 文件引用检查通过 |
| `npm run build:local-media` | 通过；生成 `dist-local/`，含 46 个本地开发媒体 |
| `npm run package:audit` | 通过；总包 1.57 MiB，主包 1.21 MiB |
| `npm run content:report` | 已生成内容覆盖指标 |
| `npm run quality:report` | 0 errors / 0 warnings，知识图 61 边、跨世界 15 边 |
| `git diff --check` | 提交前检查通过 |

## 视觉 QA 与截图

- 已实际检查 `m2-limiting-factor-bottom.jpg`：画面为舱内操作员和设备，验证结果已反映在媒体审计与代码中。
- 已建立 390 × 844 的 Mariana `M00–M09`、Everest `E01–E05` 截图矩阵和通过标准，见 `VISUAL_QA.md`。
- 本轮后台截图脚本实际尝试连接 `ws://127.0.0.1:9420`，TCP 端口可达但微信自动化握手被拒绝（未打开可自动化目标项目）。因此没有生成可信运行截图，所有 after 状态保持 `NOT CAPTURED` / `PENDING`，**不宣称视觉通过**。
- 后续只需在已启用自动化的微信开发者工具会话中执行 `npm run wechat:product-capture`，按 `VISUAL_QA.md` 逐张复核后再决定视觉验收结论。

## 已知限制与下一步

1. 需要配置受控的 COS / EdgeOne 发布域名并完成授权媒体上传，正式环境才会加载远程内容图。
2. 微信自动化会话不可用，尚未完成 Mariana / Everest 的真实运行截图、触控和读屏验收。
3. Mariana 地点封面仍缺可核验的原位实景；当前代表性深海照片已明确标注边界，不能作为海沟地貌证据。
4. 19 条知识仍无专属媒体，保留分类占位，后续仅在来源、许可与画面语义均核验后补充。
