# Four Worlds Content Audit（Long Run · PHASE 1）

> 扫描范围：`miniprogram/data/`、`miniprogram/pages/`、`miniprogram/assets/`、`tests/`、`design/`。
> 真相来源：源码中的 `id` / `name` / `explorationId` / 首页 `SCENE_CATALOG` / `EXPLORATIONS` 注册表。
> 覆盖状态语义：`COMPLETE / PARTIAL / MISSING / NEEDS_REVIEW / FALLBACK_ONLY`。

---

## 1. 四个目标世界的确定依据

当前 `EXPLORATIONS` 注册表只有 2 个场景（everest、mariana），但首页 `SCENE_CATALOG` 明确列了 4 个探索入口，且 `data/explorations/index.ts` 注释点名了设计意图（「富士山/撒哈拉/马里亚纳…」）：

| # | World ID | 名称 | 类型 | 当前状态 |
| --- | --- | --- | --- | --- |
| WORLD_1 | `everest` | 珠穆朗玛峰 | 高山 | 已实现（完整度最高，含 Expedition V2 附件） |
| WORLD_2 | `mariana` | 马里亚纳海沟 | 海沟 | 已实现（海拔轴探索；无 waypoint 路线） |
| WORLD_3 | `fuji` | 富士山 | 火山 | 仅 Place（p-fuji featured，无 explorationId） |
| WORLD_4 | `colorado` | 科罗拉多大峡谷 | 峡谷 | 仅 Place（p-colorado featured，无 explorationId） |

- 首页 `SCENE_CATALOG`：everest / mariana → `target: "exploration"`；p-colorado / p-fuji → `target: "place"`（占位，落到地点页）。
- 未凑数原则：撒哈拉（p-sahara）等只在注册表注释中提及、首页未列入口，不属于「四个主要 Exploration Worlds」，不创建。

---

## 2. WORLD_1 — everest（珠穆朗玛峰 · 高山）

数据：`data/explorations/everest.ts`（场景）+ `data/expeditions/everest.ts`（Expedition V2 附件：289 点真实路线、7 阶段 stageMap、相机、MediaManifest、Dual Visual Mode、山体路径投影）+ `data/routes/everest/`（真实路线几何）。

| 项 | 状态 | 说明 |
| --- | --- | --- |
| Place | COMPLETE | p-everest，explorationId 已连 |
| Exploration / Route / Stages | COMPLETE | 8 waypoint（progress 0→1）、12 stage、南坡路线 289 点 DEM |
| Waypoint 独立内容 | PARTIAL | 8/8 有 desc/detail/facts/images；**environment / risk / history / whatToNotice / sources / reviewStatus / knowledgeIds / mediaIds 全部缺失** |
| Waypoint Sources | MISSING | waypoint 级 `sources` 全缺（知识节点级已有） |
| DEM / terrain | COMPLETE | Copernicus DEM 渲染主视觉 + 8 张 waypoint 裁切图（未登记进 Manifest） |
| Knowledge 节点 | PARTIAL | 7 节点全带来源+随堂题；6/7 链接全局知识库；summit-height 未链 k31/k32 |
| 全局 Knowledge 关联 | PARTIAL | 场景 → 全局：k01/k02/k04/k07/k08/k09（经 knowledgeId）；waypoint.knowledgeIds 未用 |
| Quiz | COMPLETE | 7/7 知识节点带随堂题，来源可溯 |
| 真实 photograph | PARTIAL | 全场景仅 1 张 approved（Kala Patthar，expedition hero）；8 waypoint 无真实照片（只有 terrain 裁切） |
| 合法 fallback | COMPLETE | TERRAIN（DEM 渲染）兜底链路已建成（LIVE 失败 → TERRAIN） |
| 硬编码媒体 | PARTIAL | legacy `images[]`/`imageCredits[]`/`imageKinds[]` 仍在消费（迁移目标 = mediaIds，Gate 6） |
| 来源不明资产 | NEEDS_REVIEW | knowledge 页装饰图 everest-history-1953.png / everest-climb-modern.png 来源不明（Media Debt） |
| MediaManifest | PARTIAL | 1 张 approved；liveScenes B/C/D 未绑定（fallback 策略明确） |

---

## 3. WORLD_2 — mariana（马里亚纳海沟 · 深海）

数据：`data/explorations/mariana.ts`（473 行，海拔轴语义 = 深度轴）。

| 项 | 状态 | 说明 |
| --- | --- | --- |
| Place | COMPLETE | p-mariana，explorationId 已连 |
| Exploration / Stages | COMPLETE | 6 个海洋带（NOAA 分层）、深度 0→10,935 m、5 项 Metric 全带来源 |
| Route / Waypoints | **MISSING** | **完全没有 `route` / waypoints —— Journey 全靠知识节点 elevation 触发，没有可点击的地理节点** |
| Waypoint 独立内容 | MISSING | 同上（0 个 waypoint） |
| Knowledge 节点 | COMPLETE | 7 节点全带 summary/detail/facts/sources/quiz |
| 全局 Knowledge 关联 | PARTIAL | 仅 challenger-deep 链 k11；其余 6 节点未链 |
| Quiz | COMPLETE | 7/7 随堂题 |
| 真实 photograph | MISSING | 0 张真实照片；mariana-card.png 为来源不明占位图 |
| 合法 fallback | FALLBACK_ONLY | 无 DEM/无照片；视觉全靠 palette 渐变 + emoji 点缀（数据驱动，合法但单薄） |
| 重大数据缺陷 | NEEDS_REVIEW | 多个节点文案有乱码/错字（如「呼吸无法」「界宇宙共识为」「硫深海生命只能靠极低的食物供给」「奋斗号」应为「奋斗者」号）——需逐条修复 |

---

## 4. WORLD_3 — fuji（富士山 · 火山）

数据：**探索数据不存在**（仅 `data/places.ts` 的 p-fuji 条目 + 首页占位卡）。

| 项 | 状态 | 说明 |
| --- | --- | --- |
| Place | PARTIAL | p-fuji 内容齐全（3776m、1707 宝永喷发、2013 世遗），无 explorationId |
| Exploration | MISSING | 无数据文件；注册表注释点名设计意图 |
| Route / Waypoints / Knowledge / Quiz | MISSING | 全缺 |
| 真实 photograph | MISSING | fuji-card.png 来源不明（AI 占位卡） |
| 全局 Knowledge | PARTIAL | k01/k04/k29 关联了 p-fuji（无探索场景承接） |

---

## 5. WORLD_4 — colorado（科罗拉多大峡谷 · 峡谷）

数据：**探索数据不存在**（仅 p-colorado 条目 + 首页占位卡）。

| 项 | 状态 | 说明 |
| --- | --- | --- |
| Place | PARTIAL | p-colorado 内容齐全（446km、1,800m 深、5-6 Ma 下切、20 亿年地层） |
| Exploration | MISSING | 无数据文件 |
| Route / Waypoints / Knowledge / Quiz | MISSING | 全缺 |
| 真实 photograph | MISSING | grand-canyon-card.png 来源不明 |
| 全局 Knowledge | PARTIAL | k06 链接了 p-colorado（processes.ts 有 canyon-erosion 渐进过程可复用） |

---

## 6. 架构与页面能力边界（新增世界的前提）

1. **引擎完全数据驱动**：`engine/exploration-engine.ts` 无场景分支；新场景 = 新数据文件 + 注册表登记。
2. **探索页视觉分派**：`world.style === "mountain"` → Everest DEM 渲染（Everest 专属）；`"ocean"` → 海洋层；**其它 → 通用世界**（天空渐变 + 视差山脊 + 地面/雪/雾层，全部由 stage palette/terrainTint 数据驱动）。富士山/大峡谷不应声明 `mountain`（会渲染珠峰山体），用通用世界即可，无 Everest 串景。
3. **场景内路线（非 Expedition）已可用**：`route.waypoints`（x/y 画布百分比 + progress）在通用世界直接渲染成可点击路线点 + Discovery Card（`onTapRouteWaypoint`）。马里亚纳/富士山/大峡谷可用此机制补 waypoint，不需要 Expedition 附件（289 点路线仅 Everest 有）。
4. **注意硬编码**：探索页 `routeSub: "Mount Everest · South Col Route"` 需数据化；`LANDFORM_LABELS` 仅覆盖 Everest waypoint id（fallback 文案安全）。
5. **Media 管线**：Candidate → review → approved → MediaManifest（`types/expedition.ts`）→ MediaRegistry（approved-only 查询）→ credits。`CandidateMediaAsset` 可承载新世界候选（sourceUrl 必填、license 未确认留空）。
6. **首页目录**：`SCENE_CATALOG` 硬编码 4 张卡（id/target/image）；新世界上线后应翻转为 exploration 入口。

---

## 7. 全局 Content Debt 清单（跨世界）

| 债务 | 位置 | 级别 |
| --- | --- | --- |
| fuji / colorado 探索数据缺失 | data/explorations | P0 |
| mariana 无 waypoint 路线 | data/explorations/mariana.ts | P0 |
| everest waypoint 内容字段缺（environment/risk/history/whatToNotice/sources/reviewStatus） | data/explorations/everest.ts | P0 |
| mariana 节点文案乱码/错字 | data/explorations/mariana.ts | P0 |
| knowledge 页装饰图来源不明（everest-history-1953 / everest-climb-modern） | assets/world | P1 |
| 三张世界卡占位图来源不明（fuji/mariana/grand-canyon-card.png） | assets/world | P1（降级为「插画占位」或替换为真实媒体） |
| legacy `images[]` 未迁移到 mediaIds + MediaRegistry | types/exploration.ts、探索页 | P1（保持 backward compat 前提下推进） |
| knowledge.ts 32 条：无 sources、部分无 Place 关联、k15 标题带乱码引号 | data/knowledge.ts | P0 |
| quizzes.ts 20 题：题面错字（q05「地物深渊」、q15「冰山肚雪」、q20「简冰」） | data/quizzes.ts | P0 |
| 场景路线副标题硬编码（routeSub） | pages/exploration | P1 |
| camp-detail 页硬编码 C3 文案 | pages/camp-detail | P2 |
