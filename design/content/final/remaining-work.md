# Remaining Work（自动生成 2026-09-12）

> 分级：P0（阻塞用户体验）/ P1（明显增强）/ P2（长期扩充）。
> 维度：AUTOMATABLE（下个 Long Run 可做）/ NEEDS_WINDOWS / NEEDS_HUMAN_MEDIA_REVIEW / FUTURE。

## P1 — NEEDS_HUMAN_MEDIA_REVIEW（用户在 Linux 浏览器即可完成）

1. 打开 `design/content/media-review/contact-sheet.html`：29 个 waypoint hero 总览，确认 25 项 runtime 媒体的画面取舍。
2. 打开 `design/content/media-review/index.html`：37 候选逐张复核（尤其 9 项 ALTERNATIVE/REVIEW 池）。
3. 签核后：剩余 9 项候选按 `scripts/content/optimize-images.ts` → world-manifests → mediaIds 管线晋升。

## P1 — NEEDS_WINDOWS（微信开发者工具）

1. 按 `design/content/final/windows-visual-qa-checklist.md`（含 §8b 实景媒体专项）完成四世界 + 知识页视觉验收。
2. 重点：新世界（fuji/colorado）通用视觉层的观感是否需要专属场景插画（P2 设计任务）。

## P1 — AUTOMATABLE（可并入下轮 Long Run）

1. 知识 diagram 批量检索（knowledge-media-plan.md 中 17 条 diagram 类：k01/k04/k05/k07/k09/k10/k12/k15/k16/k21/k23/k25/k28/k30 等，Commons SVG 池）。
2. mariana/colorado 的 place hero 候选锁定（m1 测深图 / 南缘全景系列许可链核验）。
3. k32「现代攀登」替换图（需 2020s 开放授权攀登实拍检索）。
4. 3 张预览级候选补下原图（f1/c4/c-vishnu，源站限流）。
5. 跨世界对照学习 UI（数据层已就绪：relatedKnowledgeIds 93 边 + 10 个主题簇）。

## P2 — FUTURE（产品向）

1. 跨世界对照学习 UI（知识图谱数据层已就绪：relatedKnowledgeIds + knowledge-graph-report.md 的 10 个主题簇）。
2. fuji/colorado 专属场景插画（当前为数据驱动通用世界，合法兜底）。
3. mariana 水柱 5 点 / fuji 3 点的媒体候选（大概率保持 fallback-only，属地理特性）。
4. camp-detail 页硬编码文案数据化；探索页 route-overview 对非 Everest 场景的里程摘要（当前仅 Everest 有真实里程）。

## P0

无。
