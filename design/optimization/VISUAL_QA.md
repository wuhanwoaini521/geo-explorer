# Product UI Sprint · Visual QA 基线

> 审计快照：2026-09-18，分支 `codex/product-ui-mariana-media`，基线提交 `353ab8a`。
> 本文件是本轮独立视觉验收协议，不把历史截图、文件名或编译成功当作视觉通过证据。

## 1. 审计范围与结论

本轮主验收面为 `pkg-explore/pages/exploration` 的 Mariana 与 Everest 探索流程；强制视口为 **390 × 844 CSS px**。Mariana 是 P0 重做面，Everest 只做渐进优化。

当前基线结论：**Mariana FAIL，Everest PENDING，本轮有效 runtime 证据为 0 张。**

- `design/reference/expedition-v2/` 是有效的视觉规格，但不是当前实现证据。它要求地形/环境优先、路线第二、轻量 HUD、深色探险 UI，以及不把示意素材冒充真实地理证据。
- `artifacts/visual/mariana-dive-current.png` 已实际检查：368 × 792，画面仍是地球地图页，并非 Exploration 页面，不能作为 before 或 after 通过证据。
- `artifacts/visual/stage2/*.png` 已实际抽查：455 × 983，生成于 2026-09-10，只能作为历史问题线索，不能证明当前工作树，也不是目标视口。
- `stage2/09-summit.png` 的可见状态是 7,906 m / 87% / 南坳，不是峰顶；文件名与画面不一致，明确判废为 summit 证据。
- `media-remote/content/mariana/m2-limiting-factor-bottom.jpg` 已实际检查：画面是潜水器舱内操作员与设备，不是海沟岩壁、海床或软泥。任何把它标成这些内容的 UI 都是事实性错误，Mariana 直接判 FAIL。

## 2. 证据规则

每张可接受截图必须同时满足：

1. 本轮构建后从微信小程序 runtime 捕获，画面确实位于 Exploration 页面。
2. 使用 390 × 844 CSS px，并记录世界、深度/进度、运行模式、构建提交与截图时间。
3. 文件保存到 `artifacts/visual/product-ui-sprint/after/`，命名与画面状态一致。
4. 截图保存后重新打开检查；白屏、加载中、错页、裁切、状态错名、系统弹窗遮挡都必须重拍。
5. Mariana 的阶段截图必须在画面中可辨认对应深度/海洋带，不能只靠文件名推断。
6. after 图只证明可见布局；点击、屏幕阅读器、网络失败、动画和持久化仍需运行时或代码验证。

`before/` 允许保存失败证据，但必须标明 `FAIL` 和原因。不得把旧 `artifacts/visual` 文件复制进 `before/` 冒充本轮捕获。

状态定义：

- `PASS`：截图有效，画面和交互检查全部满足硬标准。
- `FAIL`：已获得有效证据，且存在硬失败项。
- `BLOCKED`：因微信工具、扫码或环境问题无法获得证据，必须写明具体原因。
- `NOT CAPTURED`：尚未执行；不能表述为通过。

## 3. 共同视觉基准

以 `design/reference/expedition-v2/everest-product-reference.png` 及 01–08 分页为 canonical direction：

- 环境/地形占第一视觉层级，路线、当前位置、waypoint、数值、目的地、辅助信息依次降低。
- 顶部只保留位置与必要状态；底部 HUD 不应吞没主体，390 × 844 下主场景必须仍能被识别。
- 路线和当前位置必须贴合场景坐标，标签不相互遮挡；未来、已完成、当前位置至少以形状或文字之一作非颜色区分。
- 底部卡片与弹层需要实色或足够不透明的背景，正文不能压在复杂照片上。
- 主 CTA 一眼可见，忙碌/禁用/完成状态要明显；返回、关闭、路线概览不得被胶囊、安全区或底部手势条遮挡。
- 数字可扫读，单位与方向语义准确。Mariana 用深度、下潜、距海底；Everest 用海拔、攀登、距终点。
- 不以粒子、光晕、渐变替代地形信息；程序化环境可以使用，但不得标成实景照片。

## 4. Mariana 硬通过标准

下列任一项失败，则 Mariana 总结论不能为 PASS：

- 第一眼明确是垂直深海下潜，而不是山岳换色版或普通背景轮播。
- 0 → 10,935 m 的光照、色温、颗粒密度和海沟地形变化可感知；相邻阶段有连续性，首尾差异显著。
- 主 marker 是潜水器、ROV、探针或抽象深度指示，不出现人物攀登语义。
- HUD 明确显示 Depth、Pressure、Light、Temperature、Ocean Zone，必要时显示距海底；不出现 Altitude、Oxygen、攀登、登顶等残留。
- `m2-limiting-factor-bottom.jpg` 仅能表达舱内任务、操作员或潜水器行动；不得用作岩壁、海床、沉积物、海沟背景。
- 到底态必须有清晰抵达感、深度 10,935 m、路线完成状态和可继续操作，但不得用未经核验的照片伪装海床。
- 远程图片失败时显示语义正确的本地 fallback 或设计占位；不出现 broken image、空白块或错误图片。
- 390 px 宽度无 CTA 截断、标签溢出、HUD 重叠、胶囊碰撞、底部安全区遮挡。

## 5. 390 × 844 截图验收矩阵

初始状态全部为 `NOT CAPTURED`。建议按下列精确文件名输出；若实际节点深度略有差异，在截图旁记录实际值，但不得跳过对应海洋带。

| ID | 建议文件名 | 必须可见的状态 | 核心检查 | 初始状态 |
|---|---|---|---|---|
| M00 | `mariana-00-intro-390x844.png` | Mariana 开始引导 | 标题、区域、预计时间、开始 CTA；背景已明确是海洋；文案无“攀登/海拔” | NOT CAPTURED |
| M01 | `mariana-01-surface-390x844.png` | 0 m / Surface | 明亮青蓝水体、向下路线起点、深度方向、主 marker 非人物；HUD 不碰胶囊 | NOT CAPTURED |
| M02 | `mariana-02-sunlight-390x844.png` | 0–200 m / Sunlight Zone | 阳光衰减仍可见；压力、光照、水温、海洋带匹配；路线与 marker 清楚 | NOT CAPTURED |
| M03 | `mariana-03-twilight-390x844.png` | 200–1,000 m / Twilight Zone | 蓝色明显变深、自然光显著降低；阶段变化不是瞬时换背景 | NOT CAPTURED |
| M04 | `mariana-04-midnight-390x844.png` | 1,000–4,000 m / Midnight Zone | 自然光为零或接近零；海雪/生物发光克制；正文仍有足够对比度 | NOT CAPTURED |
| M05 | `mariana-05-abyssal-390x844.png` | 4,000–6,000 m / Abyssal Zone | 近黑深水与稀疏颗粒；HUD 数值准确可读；主体不被纯黑吞没 | NOT CAPTURED |
| M06 | `mariana-06-hadal-390x844.png` | 6,000–10,000 m / Hadal Zone | 海沟地形开始主导，竖向压迫感明确；不得出现舱内人物照片作岩壁 | NOT CAPTURED |
| M07 | `mariana-07-bottom-390x844.png` | 10,935 m / Challenger Deep | 抵达状态、100%、约 1,086 atm、完成 CTA；海床呈现不冒充实景 | NOT CAPTURED |
| M08 | `mariana-08-waypoint-390x844.png` | 任一 Mariana waypoint 卡 | 卡片标题/图/说明语义一致；代表性环境照必须明确标注“非原位” | NOT CAPTURED |
| M09 | `mariana-09-media-fallback-390x844.png` | 强制远端媒体失败 | 程序化环境仍完整、无破图、fallback 文案不声称错误地点 | NOT CAPTURED |
| E01 | `everest-01-start-390x844.png` | Base Camp / 0% | 山体为焦点、路线起点和 HUD 可读，顶部避开系统胶囊 | NOT CAPTURED |
| E02 | `everest-02-mid-390x844.png` | 中段约 50% | 路线完成/未来段区分，当前点与 waypoint 标签不碰撞，阶段文案不盖山体 | NOT CAPTURED |
| E03 | `everest-03-summit-390x844.png` | 8,848 m / 100% | 峰顶状态真实为 100%；完成提示与 CTA 不遮主峰；不能用 7,906 m 截图代替 | NOT CAPTURED |
| E04 | `everest-04-waypoint-390x844.png` | waypoint 半高卡 | 卡片可滚动、关闭与继续 CTA 可达，图片与地点匹配，上方仍保留路线上下文 | NOT CAPTURED |
| E05 | `everest-05-live-fallback-390x844.png` | LIVE 加载失败 | 自动回退 DEM，明确但不惊扰；无白闪、无破图、路线坐标不漂移 | NOT CAPTURED |

## 6. 响应式与安全区检查

390 × 844 为强制项；375 × 812 与 430 × 932 为有条件补测项。

- 顶部返回、标题、状态、深度/海拔和原生胶囊之间至少保留可辨间距；历史 Everest 图中右上数值有接近胶囊的风险，需本轮复测。
- 底部面板、CTA 和手势条不得重叠；最后一行按钮在最大系统字体时仍能完整显示。
- 长中文地貌名、英文副标题、四位/五位数深度、`1,086 atm` 不截断、不压单位。
- 横向三按钮在 390 px 下至少保留清楚的主次关系；不能因压缩把主 CTA 变成最窄项。
- waypoint 卡、路线概览、Quiz、完成态的固定层不超过可视高度；内容长时只滚动内容区，标题和主要操作不丢失。
- 切换图片、阶段横幅、里程碑卡同时出现时不得叠层；原生 Canvas 上方元素需在真实设备/工具中验证层级。

## 7. 语义、可读性与无障碍检查

### 媒体语义

- 每张照片逐一核对“画面实际内容—标题—caption—credit—用途”。`semanticMatch=false` 的素材在改正前不得进入 PASS 截图。
- “代表性环境照”“历史记录”“舱内任务记录”“原位实拍”必须区分；来源和许可信息可追溯。
- 程序化海沟、粒子、光束和地形只能称为环境渲染/示意，不能称为实拍。

### 可读性

- 主数值、阶段、CTA、路线当前点在复杂背景上需保持稳定对比；不能依赖文字阴影勉强辨认。
- 390 px 下正文建议不低于 24rpx，辅助字不低于 20rpx；当前样式中存在大量 15–19rpx 文字，需以 runtime 截图确认，关键信息若出现肉眼费力即判 FAIL。
- 标签不应以低透明度白字压在照片高光区域；信息卡需提供稳定底色。
- 颜色不能是完成/当前/未来、正确/错误、可用/不可用的唯一信号。

### 交互与辅助技术

- 返回、关闭、模式切换、地点名、图片、waypoint 等可点元素必须有明确可点击外观、可访问名称与状态；当前 WXML 中多处使用 `text/view + bindtap`，需运行时验证读屏语义。
- 主要触控目标至少 44 × 44 CSS px（390 px 设备约 85rpx）；关闭叉、分页点和路线节点不能只靠很小的可视图形承担点击。
- 忙碌时按钮有禁用态且状态变化可感知；完成、错误、媒体回退不能只由动画或颜色表达。
- 截图只能发现视觉风险，不能证明完整 WCAG/读屏合规；至少补做微信开发者工具的可访问性检查和真实点击路径。

## 8. Loading、Error 与 Completion 专项

### Loading

- 首帧不得出现白屏后突变；数据未 ready、远程 hero 未加载、图片切换时均有稳定背景或骨架。
- 图片淡入不能让路线先悬空在无背景上；加载慢时 CTA 不误导为已就绪。
- 动画期间标签、按钮不抖动，不出现旧深度与新场景错帧。

### Error

- 远程 hero、waypoint 图、缩略图分别注入失败；确认 remote → local fallback → designed placeholder 顺序。
- 两级图片都失败时仍保留标题、描述、credit 状态与操作，不出现浏览器/小程序破图图标。
- 无效 exploration id 应显示明确提示并安全返回地图；不能停留在空白 Exploration 页面。

### Completion

- Mariana 到底态必须是 10,935 m / 100%，Everest 峰顶态必须是 8,848 m / 100%。
- 完成横幅、完成摘要、路线回顾、查看成就、回看路线不能互相遮挡；返回上一节点后完成态正确收起或保持一致。
- 重启探索后进度、视觉阶段、marker、HUD 和已解锁卡片同步复位，不残留上一次终点画面。

## 9. 当前已确认问题（before）

| 优先级 | 问题 | 证据 | 验收动作 |
|---|---|---|---|
| P0 | Mariana 主场景把舱内操作员照片描述/使用为海沟岩壁和海床 | 已实看 `m2-limiting-factor-bottom.jpg`；当前 `index.ts` 同时赋给 `marianaWallHero`、`marianaBottomHero`，WXML 文案称“岩壁实景”“坐底实拍” | 移除两个背景用途，保留为舱内任务/操作员媒体并改 caption |
| P0 | 本轮 Mariana runtime 证据缺失 | `mariana-dive-current.png` 实际是地图页且为 368 × 792 | 按 M00–M09 在 390 × 844 重拍 |
| P0 | Mariana 通用 HUD 仍有山岳语义风险 | 当前顶部固定“地貌观察”，共用 `currentElevText m`、通用 summit 命名；需 runtime 核对最终文案 | 所有 Mariana 图逐项检查 Depth/Zone/下潜/到底语义 |
| P1 | Everest 旧“峰顶”证据状态错误 | `stage2/09-summit.png` 可见为 7,906 m / 87% | 使用真实 8,848 m / 100% 状态重拍 E03 |
| P1 | 关键信息字号偏小风险 | 当前 WXSS 有多处 15–19rpx 标签；旧图上辅助字明显吃力 | 390 × 844 和系统大字体复测，关键字达不到可读性则修 |
| P1 | 可点文本语义与目标尺寸风险 | 当前 WXML 中返回、切换、关闭、地点、图片等多为 `text/view + bindtap` | 核对读屏名称、状态与 ≥44px 点击区 |

## 10. After 复查记录

由 visual-qa 在实际打开每张 after 图后填写；未填写前总状态保持 PENDING。

| 轮次 | 构建提交 | 有效截图数 | Mariana | Everest | 主要退回项 |
|---|---|---:|---|---|---|
| Baseline | `353ab8a` | 0 | FAIL | PENDING | Mariana 错页/错媒体；目标视口证据缺失 |
| After 1 | 待填 | 0 | PENDING | PENDING | 待复查 |
| After 2 | 待填 | 0 | PENDING | PENDING | 仅在有实质修复时执行 |
| After 3 | 待填 | 0 | PENDING | PENDING | 最多三轮，不做无止境微调 |

最终 PASS 必须附上已接受文件清单、仍未覆盖的交互/无障碍限制，以及无法截图时的明确外部 blocker。
