# Everest Content Coverage（Gate 2）

> 配套 `content-plan.md`。覆盖状态语义：`COMPLETE / PARTIAL / MISSING / NEEDS_REVIEW / FALLBACK_ONLY`。
> 优先级：P0（缺→影响真实探索体验）/ P1（明显增强）/ P2（Gallery/深度阅读）。

---

## 1. Content Coverage Matrix（8 waypoint 全覆盖）

| Entity | Content（结构化字段） | Photograph | Terrain | Knowledge | Sources | Priority |
| --- | --- | --- | --- | --- | --- | --- |
| base-camp | PARTIAL（desc/detail/facts 有；environment/history/whatToNotice 缺） | REPRESENTATIVE（Kala Patthar 挂 expedition 名下）；hero 照 MISSING | COMPLETE（裁切图，未登记） | PARTIAL（无直链，k08/k24 可链） | NEEDS_REVIEW | P0 |
| khumbu-icefall | PARTIAL | MISSING（hero/ladder/crevasse 全缺） | COMPLETE | PARTIAL（k08 已链） | NEEDS_REVIEW | P0 |
| camp-i | PARTIAL | MISSING | COMPLETE | PARTIAL（k02 可复用未链） | MISSING | P0 |
| western-cwm-camp-ii | PARTIAL | MISSING（候选 B1 在册未下载） | COMPLETE | PARTIAL（无谷地微气候知识） | NEEDS_REVIEW | P0 |
| lhotse-face-camp-iii | PARTIAL | MISSING | COMPLETE | PARTIAL（k07 弱相关） | NEEDS_REVIEW | P0 |
| south-col-camp-iv | PARTIAL | MISSING（候选 review 在册） | COMPLETE | PARTIAL（k07 已链） | NEEDS_REVIEW | P0 |
| south-summit | PARTIAL | MISSING | COMPLETE | PARTIAL（k31 可链未链） | NEEDS_REVIEW | P0 |
| summit | PARTIAL | MISSING（候选 D1 在册未下载） | COMPLETE | PARTIAL（k31/k32 可链未链） | A 级高程已有（EXISTING VERIFIED），其余 NEEDS_REVIEW | P0 |

说明：
- **Photograph 列**指"已登记进 MediaManifest 且 approved 的真实照片"。当前全清单只有 1 张（Kala Patthar，归属 expedition）。7/8 waypoint 无任何真实照片。
- **Terrain 列**= 现有 DEM 派生裁切图存在且语义正确（COMPLETE），但均未登记进 Manifest（FALLBACK_ONLY，登记动作在 Gate 3/5）。
- **Sources 列**指 waypoint 级 `sources` 字段：全部 MISSING；场景级 sources 存在（NEEDS_REVIEW = 校验 verifiedAt 与数值一致性）。

### 知识节点覆盖（Everest 场景 7 节点）

| 节点 | 内容 | 关联全局 | media | 状态 |
| --- | --- | --- | --- | --- |
| lukla-forest | COMPLETE | k09 ✓ | MISSING | PARTIAL |
| lapse-rate | COMPLETE | k01 ✓ | diagram 计划中 | PARTIAL |
| alpine-oblue | COMPLETE | k04 ✓ | MISSING | PARTIAL |
| snowline-kzha | COMPLETE | k02 ✓ | MISSING | PARTIAL |
| khumbu-glacier | COMPLETE | k08 ✓ | MISSING（#20 目标） | PARTIAL |
| death-zone | COMPLETE | k07 ✓ | diagram 计划中 | PARTIAL |
| summit-height | COMPLETE | 无全局链接（应链 k31/k32） | MISSING | PARTIAL |

---

## 2. Existing Media Audit（现有全部 Everest 媒体逐项登记）

| 资产 | kind | entity 归属 | purpose | geographicRole | 来源/许可 | 运行状态 | 建议未来角色 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/assets/expeditions/everest/live/live-a-kala-patthar.jpg` | photograph（真实） | expedition/everest | hero | REPRESENTATIVE（Kala Patthar 视角，CURATED） | 已知（Commons，CC BY-SA 4.0，hash 已记） | approved · 已入 Manifest · 首页/map/peaks 等复用 | 维持 expedition/hero；勿冒充任何 waypoint 的 EXACT 视角 |
| `assets/expeditions/everest/waypoints/base-camp.jpg` 等 ×8 | terrain（DEM 派生） | waypoint/*（legacy `images[]` 引用） | terrain | ——（派生图无地理角色声明） | 自产（Copernicus DEM 渲染，SOURCE.md 在册），许可安全 | 运行中 · 未入 Manifest | 登记为 kind=terrain，作为各 waypoint 合法 fallback 层 |
| `/assets/world/everest-expedition-hero-v1.png` | render/terrain | expedition/everest | terrain | ——（自产） | 自产（SOURCE.md） | 运行中（TERRAIN 模式 + mountain/glacier 兜底 + map 兜底） | 维持 TERRAIN 场景主视觉与最后兜底 |
| globe-* 系列纹理 | render/terrain | 地球页专用（非 Everest） | —— | —— | 自产（globe-texture-source.txt 在册） | 运行中 | 维持 |
| `everest-history-1953.png` | 未登记 · 来源不明 | knowledge 页 k31 装饰 | —— | —— | **来源不明** | 运行中 | Media Debt：由 historical purpose 真实影像替换（Search Target #21） |
| `everest-climb-modern.png` | 未登记 · 来源不明 | knowledge 页 k32 装饰 | —— | —— | **来源不明** | 运行中 | Media Debt：以现代攀登实拍替换（Target #22） |
| `fuji-card.png` / `mariana-card.png` / `grand-canyon-card.png` | 未登记 · 来源不明 | home/map/place 兜底卡 | —— | —— | **来源不明** | 运行中 | 其它地点 backlog（超出 Gate 2 范围） |

### media-review.md 候选映射（Gate 3 处理，本 Gate 不晋升）

| 候选（Commons 文件） | 记录级状态 | 映射 entity + purpose |
| --- | --- | --- |
| Mount Everest from Kala Patthar（CC BY-SA 4.0，GPS） | approved（已入 Manifest = live-a-kala-patthar） | expedition/everest hero ✓ 完成 |
| Everest Lhotse, Nuptse and Khumbu glacier（CC BY-SA 4.0） | approved（记录级） | everest/route-context 或 base-camp environment 备选 |
| 7ST 7264 / Everest Base Camp view（CC BY-SA 4.0，EBC view 有 GPS） | approved（记录级） | base-camp hero（Target #1）/ khumbu-icefall 知识图备选 |
| Western Cwm - 14th May 2011（CC BY 2.0） | approved（记录级） | western-cwm-camp-ii hero + live-b 绑定（须 9:16 双峰 crop 检查） |
| Traffic near Yellow Band Rock（2026，CC BY-SA 4.0） | approved（记录级） | lhotse-face→death-zone 路段语境 + live-c；兼 k32 候选 |
| Struggle in the death zone / Mt. Pumori sunrise（2022，CC BY-SA 4.0） | review | live-c 备选氛围图 |
| Everest Summit.jpg（CC0，GPS=主峰） | approved（记录级） | summit hero + live-d（人像占比检查） |
| Everest summit picture 2 / y；At the top…（CC BY-SA 4.0） | review | summit 竖屏备选/全景源 |
| Lenticular over Everest summit（800×600，CC BY 2.0） | review（低清） | P2 氛围图或淘汰 |
| NASA ISS022-E-37302（PD） | review | live-b institutional fallback（空中视角，语境不同） |

> 纪律重申：候选"记录级 approved"≠ 可上架；下载成功≠approved；每张图 Gate 3 按 license/位置/画面三验后才可 approved。

---

## 3. 数据事实清单（→ Gate 4 验证任务）

| 事实 | 覆盖节点 | 状态 |
| --- | --- | --- |
| 高程 8,848.86 m | summit / p-everest | EXISTING VERIFIED（gov.cn） |
| 营地海拔 5,364/5,870/6,065/6,500/7,200/7,906/8,749 | 各 waypoint | EXISTING NEEDS VERIFY（参照表口径统一，approximate 标注） |
| 峰顶气压 ~335 hPa / 含氧 ≈1/3 | summit / death-zone | EXISTING NEEDS VERIFY（A/B 复核） |
| 冰流速度"每年数米~十余米（近似）" | khumbu-glacier | APPROXIMATE → Gate 4 二次验证 |
| 南坡雪线 5,000–5,500 m / 树线 ~4,200 m | snowline / alpine-oblue | APPROXIMATE（已标注，保持） |
| C3 坡度 40–50° | lhotse-face（camp-detail 硬编码文案） | EXISTING NEEDS VERIFY（camp-detail 数据化时迁移） |
| 冰瀑凌晨通过策略 | khumbu-icefall | EXISTING NEEDS VERIFY（登山科普概括，需 C 级出处） |
| 希拉里台阶 2015 后地貌变化 | south-summit | MISSING（新增，A/B/C 出处） |
| 1953 首登 / 2020 联测 | summit / k31 | EXISTING VERIFIED |
| 顶点灰岩（~4 亿年前海底） | summit | EXISTING VERIFIED（d-everest-limestone 已溯源） |
| 西库姆"体感温度高于同海拔开阔区" | western-cwm-camp-ii | APPROXIMATE（方向正确，Gate 4 补出处表述） |
| C4 风大暴露/夜间出发 | south-col | EXISTING NEEDS VERIFY |

（Gate 2 不补任何新精确数字；以上只标验证义务。）

---

## 4. P0 Missing Items（Gate 3 / Gate 4 必须解决）

1. **7/8 waypoint 无真实照片**（base-camp/camp-i/khumbu-icefall/western-cwm/lhotse-face/south-col/south-summit/summit 中 7 个 MISSING；候选池已覆盖其中 5 个节点，Gate 3 优先核查在册候选）。
2. **LIVE-B/C/D 无 approved 资产**，当前恒 TERRAIN 兜底（候选在册：B1/C1/D1，Gate 3 完成下载+审核+绑定）。
3. **全部 8 waypoint 缺结构化内容**（environment/risk/history/whatToNotice）与 waypoint 级 sources/reviewStatus —— Gate 4。
4. **summit-height 节点缺全局知识链接**（k31/k32 现成可链）。
5. **Dem 派生 waypoint 图未登记进 Manifest**（登记为 terrain，杜绝"jpg=照片"误解）。
6. **5 张无来源媒体债**（Everest 相关 2 张：everest-history-1953.png、everest-climb-modern.png —— 由 Target #21/#22 真实影像替换后退役）。

P1（增强）：ladder-crossing/crevasse/fixed-rope 细节照、k08/k31/k32 knowledge hero、西库姆 environment。
P2：serac、satellite 大尺度、k02/k03/k24 知识配图、低清氛围图取舍。

---

## 5. Schema Gap Candidates（只记录，不修改）

1. **`Place` 无 media 关联字段**：MediaAsset.entityType 已支持 `"place"`，归属由资产侧表达即可工作（`getMediaForEntity("place","p-everest")`），非 blocker；但若 Gate 6 希望 Place 侧声明式指定 hero 次序，可考虑 `Place.mediaIds?`（与 Knowledge.mediaIds 对称）。
2. **非 expedition 媒体的 Manifest 宿主未定义**：当前 MediaManifest 只挂在 `ExpeditionAttachment.media`；place/knowledge 级媒体将来需要聚合清单（如 data/media.ts 或 per-entity manifests）。Gate 5/6 落地前须决策，Gate 2 表达无阻塞。
3. **`MediaAsset.purpose` 为自由字符串**：本表（Purpose Vocabulary）是文档级约束；若 Gate 5 校验需要，可升级为受控枚举 + 白名单校验（届时改 schema）。
4. **legacy `ExplorationImageKind`（photo/terrain/diagram）与 `MediaKind` 并存**：Gate 6 迁移 images[]→mediaIds 时应退役 legacy 三数组，勿两套长期并行。
5. **Waypoint `knowledgeId`（单数，场景节点）与新增 `knowledgeIds[]`**：语义不同（前者=场景节点 id，后者=可含全局知识 id），Gate 4 填充时须在注释/校验里明确区分，避免混用。

均为增强项，无 Gate 2 表达 blocker → schema 保持 frozen。
