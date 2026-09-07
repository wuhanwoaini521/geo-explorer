# Gate 3.3A · Everest Dual Visual Mode —— 架构（Data Model / Scene Mapping / Renderer 责任 / Fallback / Media Manifest）

> 状态：已交付 ✅（Gate 3.3A — Architecture only）｜ 前置：Gate 2（数据层 + Route Engine）+ Gate 3（主勘探页）已确认 ｜ 后续：Gate 3.3B（LIVE 素材候选与 review）→ Gate 3.3C（页面接入 LIVE renderer + 模式切换 UI）

需求文档：`D:\Downloads\Geo-Explorer-Gate-3.3-Everest-Dual-Visual-Mode.md`

## 0. 范围纪律（本 Gate 只做架构，交付即停）

| 做 ✅ | 不做 ❌ |
| --- | --- |
| Dual Visual Mode 数据模型与类型定义 | ❌ 不搜索图片 / 不下载任何素材 |
| `sceneId → StageMap → progressRange` 的场景映射 | ❌ 不修改 WXML / WXSS / 页面视觉 |
| renderer 责任划分（Route Engine 不感知视觉模式） | ❌ 不改模式切换 UI（Gate 3.3C） |
| LIVE 不可用时的 fallback 策略 | ❌ 不做页面级 diff（`pages/exploration/index.ts` 未动） |
| Media Manifest 设计（LIVE 影像纳入 review 流程） | |

**验收自检**：`git status` 只应出现数据/逻辑/测试/文档文件；未触碰 `miniprogram/pages/**`、`miniprogram/**/*.wxml`、`miniprogram/**/*.wxss`。

## 1. 目标回顾与三种呈现（§1–§7）

珠峰探索页需要「沉浸 + 科学」双重视觉：

- **模式 A · LIVE 实景**（§1）：真实授权珠峰影像，负责沉浸感。
- **模式 B · TERRAIN 科学地形**（§2/§3）：Copernicus DEM + 3D 地形相机，负责空间理解。
- **同一目标**：两种模式共享 RouteIndex / progress / waypoint / stage / environment / knowledge / summit 状态，**只替换「Scene Presentation Layer」**。

本 Gate 交付的是让 LIVE/TERRAIN 能在同一数据层共同存在的**全部结构性前提**，不产出任何一张图、一行 UI。

## 2.1 关键不变式

1. **Route Engine 无感**：Route Engine（`RouteIndex` / vectorius route geometry）基础不出售、不感知 LIVE/TERRAIN；视觉模式是**纯上层决定**。
2. **无第二套进度**：LIVE 场景的覆盖范围用 `StageMap` 的阶段 id 声明，任何 progress 边界都从 `stageMap`（← `routeIndex` 计算值）**派生**，禁止手写进度（延续 Gate 2 约束 3）。
3. **不空屏**：LIVE 任何时刻不可用（无资产 / 未批准 / 未命中）→ 回退 TERRAIN，页面不允许留白。
4. **不做假 DEM**:TERRAIN 永远是科学地形，不把 DEM 伪装成照片（延续 `design/reference/expedition-v2` 的「地形优先、轻量覆盖层」方向）。

## 3. 数据模型（`types/expedition.ts` · Section 7）

只做**类型 + 常量 + 派生函数**，不写第二套顶层 Expedition 模型（与 Gate 2 的「本质增长」策略一致）。

```text
ExpansionAttachment.visualMode: ExpeditionVisualModeConfig
  ├─ defaultMode: "LIVE" | "TERRAIN"      // 会话初始模式（默认 LIVE）
  ├─ fallback:  "TERRAIN"                  // LIVE 不可用时的兜底（固定 TERRAIN）
  └─ liveScenes: ExpeditionLiveScene[]     // 关键！每个场景覆盖多个 stageId
       ├─ id / label                    // "live-a" · Base Camp · Approach …
       ├─ stageIds: string[]            // 覆盖的 StageMap 阶段 id（连续、不重叠、全覆盖）
       ├─ assetId?                     // → MediaManifest.assets[] 的登记资产（Gate 3.3B 绑定）
       ├─ crop?: LiveCrop               // 竖屏专属焦点/比例，禁止 object-fit 随机裁（§12）
       ├─ anchors?: LiveOverlayAnchors  // projectType + 归一化点（人工审核，§17）
       ├─ routeOverlay: "full-route"|"nearby"|"current-next"|"none"  // 是否画蓝折线（§18）
       └─ transition?: { crossfadeMs, maxScale }                      // §14：500-800ms + ≤1.03 → 禁 Ken Burns
```

- `MediaAsset` 已具备 `license / credit / sourceUrl / capturedAt / reviewStatus / localPath` —— LIVE 资产的「出处唯一真相」留在 **MediaManifest**，场景不重复持有，避免两处授权信息跑偏。
- `ExperimentalTypeManager ?? MediaManifest`：LIVE 清单与航拍/渲染清单分离？不。继续复用同一 `MediaManifest`（`assets` 追加 kind 即表），只增加 `elevation` 相关不相关，不新增清单顶层类型。LIVE 资产用 `reviewStatus: "approved"` 才能进入正式。

## 4. Scene Mapping（`engine/expedition-visual.ts` · 纯逻辑）

真正落到代码的是五个纯函数，均可在 Node 单测（`tests/expedition-visual.test.ts`）：

| 函数 | 作用 |
| --- | --- |
| `liveSceneForStageIndex(config, stageMap, stageIndex)` | 用 `stageMap.stageId ↔ index` 反查命中 Hero Scene |
| `liveSceneProgressRange(scene, stageMap)` | 由 `StageMap` 派生覆盖的 `[from,to]` progress（不手写） |
| `resolveExpeditionVisual(deps, input)` | → `ExpeditionVisualPresentation`（LIVE 可渲染 or TERRAIN） |
| `approvedLiveImage(deps, scene)` | 仅在 `media.assets[assetId].reviewStatus === "approved"` 时返回可渲染图 |
| `visualFallbackWarning(reason, sceneId)` | 兜底时输出 `[visual-mode] LIVE → TERRAIN …`（§24） |

### 呈现类型

```text
ExpeditionVisualPresentation =
  | { kind: "LIVE";   scene; image; crop; routeOverlay; anchors; transition }
  | { kind: "TERRAIN"; reason: "user-selected"|"no-live-assets"|"asset-not-approved"|"no-scene-match" }
```

#### 场景映射表（4 Hero Scenes → 当前 7 段 stageMap）

| 场景 | 阶段（StageMap id） | routeOverlay | 语义 |
| --- | --- | --- | --- |
| `live-a` Base Camp · Approach | `approach` + `khumbu-icefall` | `full-route` | 大本营 → 冰瀑全景 ✅ |
| `live-b` Western Cwm · C2 | `western-cwm` | `nearby` | 西库姆冰谷（C1→C2） |
| `live-c` Death Zone · Push | `lhotse-face` + `south-col` + `death-zone` | `current-next` | 死亡区/南坎/拖山（当前→下一点） |
| `live-d` Summit | `summit-push` | `none` | 峰顶只标 SUMMIT，不画路线 |

覆盖检查在 `validateVisualMode`（错误覆盖= gap 或 overlap），由 `validateExpedition` 门禁强制 — 7 段全部有唯一归属。

## 5. Renderer 责任划分（Layer ≥ Presentation）

- **Route Engine（Data）**：`routeIndex` / `stageMap` / `driver` —— 无感知视觉模式。
- **Visual Resolver（新，纯逻辑）**：`expedition-visual.ts` —— 消费 `drive.stageIndex` 与 user mode，**做出**「当前呈现 LIVE 还是 TERRAIN、用哪张图、怎么 crop、撤不画 overlay」的决定。纯函数，输出 `ExpeditionVisualPresentation`。
- **Scene Presentation Layer / UI（Gate 3.3C 才动）**：拿到 presentation 后渲染 —— LIVE 渲染真实图 + 覆盖层；TERRAIN 走现有 3D DEM 相机。页面自身**不做决策**，只翻译。

这样当 UI 接入时，只改“渲染”不改“决定”，而“决定”已全部经过 Node 测试。

## 6. Fallback 策略（§11/§23/§24）

```text
用户模式 = TERRAIN               → TERRAIN (reason: user-selected)          ← 主动、无告警
用户模式 = LIVE 且未命中场景      → TERRAIN (reason: no-scene-match)         ← 配置错误，理想不发生
用户模式 = LIVE 且 scene 无资产   → TERRAIN (reason: no-live-assets)         ← Gate 3.3B 前的正常态
用户模式 = LIVE 但资产未批准      → TERRAIN (reason: asset-not-approved)     ← 保留在 `review` 的候选
```

- 默认模式 = **LIVE**。页面在 Gate 3.3C 会：切换后「会话内记忆」默认回到 LIVE（不要求长期存储）。
- **绝不空白**：回退链没有「空屏」分支。

## 7. Media Manifest 设计（延续并细化）

- `media/assets` 继续作为「通证单位」：每一行都自带 `license / sourceUrl / author / reviewStatus`，不允许成“无名无证”媒体进正式。
- LIVE 素材在 Gate 3.3B 候选审核阶段用 `reviewStatus: "review"` 暂存；**只有 approved 的 asset 才能被 `liveScenes[i].assetId` 引用**（validator 强制）。
- **不新增第二份 manifest**；LiveScene 内部只引用 `assetId`（“出处唯一真相在 Manifest”），由 `approvedLiveImage()` 运行时解析。

## 8. 校验器（`validate-expedition.ts` · `validateVisualMode`）

接入 `validateExpedition`，检查：

- `defaultMode ∈ {LIVE, TERRAIN}`；`fallback === "TERRAIN"`（固定）。
- `liveScenes` 非空、`id` 唯一；每个场景 `stageIds` 非空且存在于 `stageMap`。
- **覆盖完整性**：每个 stage 恰好属于**一个**场景（gap/overlap 均 error）。
- `crop`：焦点 `[0,1]`；scale `≥1`（批准资产必填）。
- `anchors`：落入 `EXACT/CURATED/NOT_AVAILABLE`，点都在 `[0,1]`；EXACT/CURATED 需人工审核注释。
- `transition`：`crossfadeMs ∈ [300,1200]`、`maxScale ∈ (1,1.12]`（禁大幅 zoom）。
- `assetId` 引用的资产必须存在且 approved（未存在 → error；存在但未批准 → warning）。

## 9. 文件清单（本 Gate 交付物）

```text
miniprogram/types/expedition.ts            ★ +Section 7（核心类型 + 常量）
miniprogram/engine/expedition-visual.ts     ★ 纯逻辑 scene resolver + fallback
miniprogram/engine/validate-expedition.ts  ★ +validateVisualMode（接入 validateExpedition）
miniature/data/expeditions/everest.ts      ★ +visualMode config（4 场景覆盖 7 段，暂无资产）
tests/expedition-visual.test.ts             ★ 新：15 用例（LIVE/TERRAIN/fallback/validator）
tests/expedition-v2.test.ts                ★ 增 1 用例（visualMode 结构）
docs/gates/gate-3.3a-visual-mode.md        ★ 本文
design/world/everest-live/README.md        ★ LIVE 素材管线（Gate 3.3B 计划）
```

未改动：`pages/exploration/**`、`.wxml/.wxss`、`media-review/*`（Gate 6 前为空）。

## 10. 交给 3.3B / 3.3C

- **3.3B（素材）**：执行 `design/world/everest-live/README.md` —— 候选清单 + 许可证审查 + `approved → everest.ts`。（**本 Gate 明确不做**。）
- **3.3C（UI）**：探索页消费 `resolveExpeditionVisual()` —— 每次 `driveAtProgress` 之后调用 resolver，把 `ExpeditionVisualPresentation` 喂给渲染层；LIVE renderer + TERRAIN renderer 分别实现成 render；模式切换 UI + 会话内记忆。届时 `engine/expedition-visual.ts` 之外的改动都在页面层。
- **验证**：`npx tsc --noEmit` + `npx vitest run` + `npm run build`（build 期间 `check-requires.mjs` 防止遗留 require 问题）已全绿。
