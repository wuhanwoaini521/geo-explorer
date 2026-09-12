# Everest Content Plan（Gate 2）

> 性质：内容规划文档，不是 runtime 数据。Source of Truth 仍是 `miniprogram/data/*.ts`（Gate 1 决策 10）。
> 本文档回答：Everest 到底需要哪些内容、哪些真实媒体、哪些知识、它们如何关联。
> 状态语义见 `content-coverage.md`。素材搜集按本文 Search Targets 执行（Gate 3），内容撰写按逐节点计划执行（Gate 4）。

---

## 1. Everest Content Entity Map

以当前代码为真相源（id 均为源码原值）：

```text
p-everest (Place, data/places.ts, featured, explorationId:"everest")
  └── everest (Exploration + ExpeditionAttachment, data/explorations/everest.ts + data/expeditions/everest.ts)
        ├── Stages (ExpeditionStageDef ×7, 边界由 RouteIndex 计算)
        │     approach → khumbu-icefall → western-cwm → lhotse-face → south-col → death-zone → summit-push
        ├── LIVE Hero Scenes (4, visualMode.liveScenes)
        │     live-a[approach,khumbu-icefall] · live-b[western-cwm] · live-c[lhotse-face,south-col,death-zone] · live-d[summit-push]
        ├── Route Waypoints (ExplorationRouteWaypoint ×8, route.waypoints)
        │     base-camp → khumbu-icefall → camp-i → western-cwm-camp-ii →
        │     lhotse-face-camp-iii → south-col-camp-iv → south-summit → summit
        ├── Exploration Knowledge Nodes (7)
        │     lukla-forest→k09 · lapse-rate→k01 · alpine-oblue→k04 · snowline-kzha→k02 ·
        │     khumbu-glacier→k08 · death-zone→k07 · summit-height(→无全局链接)
        └── Media
              MediaManifest "everest-media"（1 个 approved 资产 live-a-kala-patthar）
              legacy waypoint 裁切图 ×8（assets/expeditions/everest/waypoints/，DEM 派生）
              world 渲染资产（everest-expedition-hero-v1.png 等）

关联全局 Knowledge（relatedPlaceIds 含 p-everest / p-himalaya）：
  k01 直减率 · k02 雪线 · k03 喜马拉雅成因 · k04 垂直分带 · k07 死亡区 ·
  k08 冰川流动 · k09 季风 · k24 雪崩 · k31 1953 首登 · k32 现代攀登

Everest 相关 Quiz：
  场景随堂题 7（qz-lukla-forest / qz-lapse-rate / qz-tree-line / qz-snowline /
  qz-glacier / qz-death-zone / qz-summit-height）
  全局题库（data/quizzes.ts）：q04 珠峰高程 · q06 峰顶含氧量 ·
  q08 南北坡降水 · q09 板块碰撞 · q12 攀登突发风险
```

### Waypoint ↔ Stage 映射（由 stageMap 边界派生）

| Stage id | 名称 | 覆盖 waypoint |
| --- | --- | --- |
| approach | 大本营 · 接近 | base-camp（→冰瀑起点） |
| khumbu-icefall | 昆布冰瀑 | khumbu-icefall（→C1） |
| western-cwm | 西库姆冰谷 | camp-i、western-cwm-camp-ii |
| lhotse-face | 洛子壁 | lhotse-face-camp-iii（→C4） |
| south-col | 南坳 | south-col-camp-iv（→8000m） |
| death-zone | 死亡区 | south-summit |
| summit-push | 冲顶 | summit |

### Waypoint ↔ Knowledge（现状）

| Waypoint | knowledgeId（场景节点） | 节点→全局知识 |
| --- | --- | --- |
| base-camp | 无 | — |
| khumbu-icefall | khumbu-glacier | k08 |
| camp-i | 无 | — |
| western-cwm-camp-ii | 无 | — |
| lhotse-face-camp-iii | 无 | — |
| south-col-camp-iv | death-zone | k07 |
| south-summit | 无 | — |
| summit | summit-height | 无全局链接（k31/k32 同主题未链接） |

### Media ↔ Entity（现状）

| 媒体 | kind | 归属 | 状态 |
| --- | --- | --- | --- |
| live-a-kala-patthar.jpg | photograph（真实） | expedition/everest，purpose=hero | approved，已入 Manifest |
| waypoints/*.jpg ×8 | terrain（DEM 派生，**非照片**） | waypoint/*（legacy images 引用，未入 Manifest） | 运行中 |
| everest-expedition-hero-v1.png | render/terrain | expedition/everest（TERRAIN 模式相机 + 多处兜底） | 运行中 |

---

## 2. Media Purpose Vocabulary（v1）

| purpose | 含义 | 何时使用 | 示例 |
| --- | --- | --- | --- |
| `hero` | 实体主视觉：进入该节点第一眼看到的画面 | 每个实体至多 1 张；卡片封面/场景主图 | base-camp hero（EBC 现场照） |
| `environment` | 环境/氛围：天气、光线、营地生活、体感 | 展示"在这里是什么感觉" | 西库姆强反射阳光下的队员 |
| `terrain` | 地形/地貌语境（DEM 渲染、卫星、地形图均可） | 无实景时的合法 fallback；空间理解 | everest-expedition-hero-v1 |
| `route-context` | 路线语境：显示该点在整条路线中的位置 | 讲"从哪来、到哪去" | 自 C2 望 C3 沿洛子壁路线 |
| `detail` | 细节特写：支撑理解的具体对象 | 放大关键理解对象 | 冰裂隙铝梯特写 |
| `historical` | 历史影像（必须标注年代与背景） | 历史标签页/历史知识 | 1953 首登影像 |
| `scientific` | 科研/测量影像或数据可视化 | 知识点理解、非装饰 | DEM 剖面、测量成果图 |
| `satellite` | 卫星影像（NASA/ESA/USGS 级） | 大尺度地形/对比（南北坡植被） | Everest 3D 卫星视图 |
| `camp` | 营地（waypoint 特有）：帐篷/营地布局 | 有营地的节点 | C4 鞍部营地 |
| `climbing` | 攀登行为（waypoint 特有） | 展示"如何通过" | 固定绳攀登洛子壁 |
| `hazard` | 危险/特殊现象（waypoint 特有） | 风险知识支撑 | 冰瀑崩塌痕迹 |
| `crevasse` | 冰裂隙（icefall 特有细分，勿滥用） | 昆布冰瀑 | 裂隙+铝梯 |
| `serac` | 冰塔/冰柱（icefall 特有细分） | 昆布冰瀑 | 冰塔林 |
| `ladder-crossing` | 铝梯跨越（icefall 特有细分） | 昆布冰瀑 | 队员过梯 |
| `fixed-rope` | 固定绳（陡壁段特有细分） | 洛子壁 | 上升器+绳 |
| `summit-view` | 峰顶视角/视野（summit 特有） | 峰顶 | 顶上环视 |

规则：新 purpose 必须先登记进本表再使用；禁止 `main/cover/big-photo` 等同义词。

### 媒体形态角色（REAL-WORLD vs GENERATED）

- **REAL-WORLD**：photograph / satellite / scientific（真实摄影、科研、卫星）
- **GENERATED/DERIVED**：terrain（DEM 渲染）/ render / diagram / illustration
- 当前 `waypoints/*.jpg` 与 `everest-expedition-hero-v1.png` 一律属于 DERIVED，登记为 `kind: "terrain"`（或 render），**绝不标 photograph**。
- 每个 waypoint 建议视觉层级：EXACT photograph → REPRESENTATIVE photograph → scientific/satellite → terrain（现有 DEM 裁切兜底）→ render/diagram。
- Summit 层级示例：EXACT summit photo（候选 D1，GPS=峰顶）→ REPRESENTATIVE summit environment → terrain 兜底。
- 无法获得实景的节点（如 camp-i 近景）：scientific/satellite → terrain 亦为合法方案，不硬塞。

---

## 3. 逐 Waypoint Content Plan

> 通用：所有 waypoint 已有 desc/detail/facts（legacy 卡片层 COMPLETE）；下列 requiredContent 指新增结构化字段。
> `desiredGeographicRole` 仅对 photograph/satellite 类媒体有意义；terrain 派生图无此要求。

### 3.1 base-camp（南坡大本营，5,364 m，P0）

- **requiredContent**：environment（帐篷城/补给/适应训练）、terrain（冰碛/冰川前缘）、history（攀登中枢地位）、whatToNotice（冰面位移、牦牛队）。facts 已有 3 条。
- **requiredMedia**：hero（photograph，EXACT preferred——现有候选 A3 之二 `Everest Base Camp view.jpg` 带 GPS 佐证）、environment（camp）、terrain（已有 DEM 裁切）。
- **relatedKnowledge**（现有优先）：k08 冰川流动（帐扎冰面）、k24 雪崩关联常识；NEEDS EXPANSION：海拔适应（NEW CANDIDATE：高原适应/拉练）。
- **facts 状态**：3 条已存在（5,364 m/冰面帐篷/补给中枢）→ EXISTING NEEDS VERIFY（Gate 4 对海拔与冰面描述做来源复核）。
- **sourceRequirements**：一般背景 B/C/D；海拔 A（官方高程/测量）；媒体 Commons/官方。
- **existingCoverage**：desc/detail/facts=COMPLETE；terrain 裁切=COMPLETE（未登记）；photo=REPRESENTATIVE（Kala Patthar 挂在 expedition 名下）。
- **missingCoverage**：environment/risk/history/whatToNotice、mediaIds、waypoint 级 sources、hero 登记晋升。

### 3.2 khumbu-icefall（昆布冰瀑，~5,870 m，P0）

- **requiredContent**：environment（凌晨通过策略）、terrain（冰塔/裂隙地貌）、risk（崩塌/裂隙，重点）、history（修路队/梯子维护）、whatToNotice（冰体移动迹象、通过节奏）。
- **requiredMedia**：hero（EXACT preferred）、ladder-crossing（EXACT preferred）、crevasse（EXACT preferred / REPRESENTATIVE 需明确标注）、serac（P2）、hazard（崩塌痕迹，P1）、route-context（P2）。
- **relatedKnowledge**：k08（冰川流动，EXISTING）、k24（雪崩，EXISTING 弱相关）；NEW CANDIDATE：冰塔/裂隙成因（serac 与 crevasse 形成机制）。
- **sourceRequirements**：风险描述 A/B（登山协会级）或 C；冰川运动 B/C/D。
- **existingCoverage**：detail/facts=COMPLETE（含移动冰体/凌晨通过/铝梯）；knowledge=PARTIAL（k08 已链）；terrain=COMPLETE。
- **missingCoverage**：history/whatToNotice 结构化、hero 及细节实景照全部 MISSING。

### 3.3 camp-i（C1 营地，~6,065 m，P0）

- **requiredContent**：summary、environment（谷口风/低温）、terrain（冰瀑顶缓雪坡）、risk（续冰瀑暴露）、whatToNotice（短停特点）。
- **requiredMedia**：hero（REPRESENTATIVE acceptable——该点实景素材稀缺，不硬找）、environment（P2）、terrain（已有）。scientific/terrain fallback 合法。
- **relatedKnowledge**：k08（弱）；无强关联 → NEEDS EXPANSION：可复用 k02 雪线（6,065 m 位于雪线之上）。
- **sourceRequirements**：B/C/D。
- **missingCoverage**：几乎全部结构化内容 + 任何实景照。

### 3.4 western-cwm-camp-ii（西库姆·C2，~6,500 m，P0）

- **requiredContent**：environment（强日照反射/昼夜温差，重点）、terrain（U 形雪谷几何）、history（"寂静之谷"得名）、risk（高反+酷晒脱水）、whatToNotice（两侧壁体关系：珠峰西南壁/洛子北壁）。
- **requiredMedia**：hero（候选 B1 `Western Cwm - 14th May 2011.jpg` 已记录级 approved，绑定前必须做 9:16 双峰保留 crop 检查）、environment（P1）、route-context（谷地几何，P1）、camp（C2，P2）。
- **relatedKnowledge**：NEW CANDIDATE：谷地辐射增温（为什么 Cwm 白天这么热）。
- **sourceRequirements**：背景 B/C/D；谷地微气候数值标注 approximate（C/D 起步，Gate 4 二次验证）。
- **missingCoverage**：hero 未晋升（候选在册未下载）；environment 等 MISSING。

### 3.5 lhotse-face-camp-iii（洛子壁·C3，~7,200 m，P0）

- **requiredContent**：terrain（连续陡冰坡，重点）、risk（滑坠/冰况，重点）、environment（硬冰低温）、history（C3 挂壁营地传统）、whatToNotice（固定绳/上升器使用）。
- **requiredMedia**：hero（EXACT preferred——攀登视角照片）、fixed-rope（EXACT preferred）、climbing（P1）、route-context（仰视 C4，P2）、detail（冰面台阶，P2）。
- **relatedKnowledge**：k07 死亡区前置认知（弱）；NEW CANDIDATE：固定绳系统/技术攀登入门。
- **sourceRequirements**：坡度/海拔数值 B/C（approximate 标注）。
- **missingCoverage**：无实景照；camp-detail 页现以此节点为硬编码样板（Gate 6 处理）。

### 3.6 south-col-camp-iv（南坳·C4，7,906 m，P0）

- **requiredContent**：environment（狂风/极低温，重点）、terrain（鞍部）、risk（死亡区边缘暴露）、history（冲顶前最后一夜传统）、whatToNotice（夜间出发逻辑）。
- **requiredMedia**：hero（EXACT **strongly preferred**——营地视角照；候选池有 review 级 `Everest, South Col` 与 `Cloud inversion viewed from Everest Camp IV`）、environment（风/P1）、camp（P1）、route-context（P2）。
- **relatedKnowledge**：k07（EXISTING，已链 death-zone 节点）、k01（直减率背景）。
- **sourceRequirements**：7,906 m/风力 A/B（复用既有 south-col.json provenance 链）。
- **existingCoverage**：detail/facts=COMPLETE；knowledge=PARTIAL（已链 k07）；terrain=COMPLETE。

### 3.7 south-summit（南峰，8,749 m，P0）

- **requiredContent**：terrain（暴露雪脊/两侧陡崖）、risk（最后往返事故多发段，重点）、history（希拉里台阶及 2015 后地貌变化讨论——须带 approximate/有据表述）、whatToNotice（台阶现状描述）。
- **requiredMedia**：hero（EXACT preferred）、detail（希拉里台阶，EXACT preferred，须注明 2015 后变化，候选 C 区已降级历史照仅作 historical）、historical（P2）、summit-view（P2）。
- **relatedKnowledge**：k31（首登历史，EXISTING）、NEW CANDIDATE：希拉里台阶今昔。
- **sourceRequirements**：地貌变化讨论 A/B/C（不转述社区传言，引用有出处表述）。

### 3.8 summit（珠峰峰顶，8,848.86 m，P0）

- **requiredContent**：environment（气压 335 hPa≈1/3 海平面、含氧、极短停留窗，重点）、history（2020 联合测量 + 1953 首登）、terrain（顶点地质：4 亿年前海底灰岩）、whatToNotice（天气窗口/旗云）。
- **requiredMedia**：hero（EXACT——候选 D1 `Everest Summit.jpg` CC0+EXIF GPS=主峰，最强；人像占比大则 D2）、summit-view（P1）、scientific（测量/三角成果图，P1）、historical（P2）、satellite（P2）。
- **relatedKnowledge**：k31/k32（EXISTING，建议补链接到 summit-height 节点）、k03（板块抬升）。
- **sourceRequirements**：高程 A（gov.cn 已有）；地质 B/C；峰顶环境 A/B（NOAA/文献）。

---

## 4. Knowledge ↔ Waypoint Matrix

| 全局 Knowledge | 关联 waypoint（规划） | 状态 |
| --- | --- | --- |
| k01 直减率 | base-camp / camp-i / lhotse-face | EXISTING（lapse-rate 节点已链 k01） |
| k02 雪线 | camp-i / western-cwm | EXISTING（snowline-kzha 已链 k02） |
| k03 喜马拉雅成因 | summit（地质背景） | EXISTING（未与 waypoint 链）→ NEEDS EXPANSION |
| k04 垂直分带 | base-camp / camp-i | EXISTING（alpine-oblue 已链 k04） |
| k07 死亡区 | south-col-camp-iv / south-summit / summit | EXISTING（death-zone 已链 k07） |
| k08 冰川流动 | base-camp / khumbu-icefall / camp-i | EXISTING（khumbu-glacier 已链 k08） |
| k09 季风 | base-camp（南坡气候背景） | EXISTING（lukla-forest 已链 k09） |
| k24 雪崩 | khumbu-icefall / lhotse-face | EXISTING（无场景节点链接）→ NEEDS EXPANSION |
| k31 1953 首登 | summit / south-summit | EXISTING（未与场景节点链接）→ NEEDS EXPANSION |
| k32 现代攀登 | summit / base-camp | EXISTING（无链接）→ NEEDS EXPANSION |
| （新）冰塔/裂隙形成 | khumbu-icefall | NEW KNOWLEDGE CANDIDATE |
| （新）西库姆辐射增温 | western-cwm-camp-ii | NEW KNOWLEDGE CANDIDATE |
| （新）固定绳攀登 | lhotse-face-camp-iii | NEW KNOWLEDGE CANDIDATE |
| （新）高原适应 | base-camp | NEW KNOWLEDGE CANDIDATE |
| （新）希拉里台阶今昔 | south-summit | NEW KNOWLEDGE CANDIDATE（Gate 4 评估是否并入 k31 扩写） |

原则：**优先复用现有 ID**；NEW CANDIDATE 只登记不动数据，是否新增由 Gate 4 依据来源质量决定（无据不写）。

---

## 5. Knowledge Media Plan（知识图片 = 帮助理解，不是装饰）

| 知识 | requiredMedia（purpose 优先序） | desiredGeographicRole | 优先级 |
| --- | --- | --- | --- |
| k08 冰川流动 | photograph（冰瀑实景）→ diagram（塑性流示意） | REPRESENTATIVE acceptable（能证明是昆布冰川更佳→EXACT） | P1 |
| k07 死亡区 | scientific（气压/含氧曲线已内置 metrics）+ diagram | ——（数据类无地理角色） | P1 |
| k02 雪线 | photograph / satellite | REPRESENTATIVE acceptable | P2 |
| k04 垂直分带 | satellite（南北坡对比）或 photograph | REPRESENTATIVE acceptable | P2 |
| k31 1953 首登 | historical photograph | REPRESENTATIVE（历史影像必须标年代） | P1 |
| k32 现代攀登 | photograph（现代攀登/排队） | REPRESENTATIVE acceptable | P1 |
| k03 喜马拉雅成因 | diagram（板块剖面）/ scientific | —— | P2 |
| k24 雪崩 | photograph（雪崩痕迹）/ scientific | REPRESENTATIVE acceptable | P2 |

---

## 6. Source Requirements（内容来源等级）

| 实体/主题 | 要求等级 | 备注 |
| --- | --- | --- |
| 珠峰高程 8,848.86 | **A** | gov.cn 联合测量已在 data（EXISTING VERIFIED） |
| 营地海拔/路线参数 | A/B | south-col.json provenance 链已有（Alan Arnette 参照 + OSM/Wikipedia 交叉） |
| 冰川运动/裂隙/冰塔 | B/C/D | Gate 4 需对现有"每年数米~十余米（近似）"做二次验证 |
| 死亡区气压/含氧 | A/B | 峰顶 ~335 hPa 需权威对照（EXISTING NEEDS VERIFY） |
| 攀登史 k31/k32 | A/B/C | 1953/2020 事件均可达 A（官方纪念/测量发布） |
| 一般 waypoint 背景 | B/C/D | 近似值必须显式标注 approximate |
| 媒体来源 | Wikimedia Commons / NASA / NOAA / USGS / ESA / 政府与科研机构 | license 未确认不入库（Gate 3 纪律） |

---

## 7. Search Targets（→ Gate 3 输入）

格式：`entityId · purpose · preferred kind · desiredGeographicRole · sourceQuality · priority`。
标注 `[候选已存在]` 的项先核查 `media-review.md` 已有候选，不重复搜索。

| # | entityId | purpose | kind | role | source | P | 备注 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | base-camp | hero | photograph | EXACT preferred（有 GPS→EXACT） | A-D | P0 | [候选已存在] EBC view.jpg（GPS 28.004263/86.857116） |
| 2 | base-camp | environment | photograph | REPRESENTATIVE acceptable | B-D | P1 | 营地生活/帐篷城 |
| 3 | khumbu-icefall | hero | photograph | EXACT preferred | A-D | P0 | 搜索：Khumbu Icefall |
| 4 | khumbu-icefall | ladder-crossing | photograph | EXACT preferred | A-D | P1 | 搜索：ladder + icefall |
| 5 | khumbu-icefall | crevasse | photograph | EXACT preferred / REPRESENTATIVE 需标注 | A-D | P1 | |
| 6 | khumbu-icefall | serac | photograph | REPRESENTATIVE acceptable | B-D | P2 | |
| 7 | camp-i | hero | photograph | REPRESENTATIVE acceptable | A-D | P0 | 稀缺，fallback=scientific/terrain 合法 |
| 8 | western-cwm-camp-ii | hero | photograph | REPRESENTATIVE acceptable | A-D | P0 | [候选已存在] B1（9:16 双峰保留检查） |
| 9 | western-cwm-camp-ii | environment | photograph | REPRESENTATIVE acceptable | B-D | P1 | 强日照/热 |
| 10 | lhotse-face-camp-iii | hero | photograph | EXACT preferred | A-D | P0 | 搜索：Lhotse Face climbing |
| 11 | lhotse-face-camp-iii | fixed-rope | photograph | EXACT preferred | A-D | P1 | |
| 12 | south-col-camp-iv | hero | photograph | EXACT strongly preferred | A-D | P0 | [候选 review] Everest South Col / Camp IV cloud inversion |
| 13 | south-col-camp-iv | camp | photograph | EXACT preferred | A-D | P1 | 鞍部营地 |
| 14 | south-summit | hero | photograph | EXACT preferred | A-D | P0 | 搜索：South Summit / ridge |
| 15 | south-summit | detail | photograph | EXACT preferred（注明 2015 后变化） | A-C | P1 | 希拉里台阶 |
| 16 | summit | hero | photograph | EXACT（GPS=峰顶） | A-D | P0 | [候选已存在] D1（CC0，GPS 27.987956/86.925111） |
| 17 | summit | summit-view | photograph | REPRESENTATIVE acceptable | B-D | P1 | 顶上环视 |
| 18 | everest | route-context | satellite | REPRESENTATIVE acceptable | A-B（NASA/ESA/USGS） | P1 | 大尺度路线语境 |
| 19 | everest | scientific | scientific | —— | A-B | P1 | DEM/测量可视化 |
| 20 | knowledge:k08 | hero | photograph | EXACT/REPRESENTATIVE | A-D | P1 | 冰川实景（可与 #3 共图但须分别登记 purpose） |
| 21 | knowledge:k31 | hero | photograph(historical) | REPRESENTATIVE | A-C | P1 | 替代 everest-history-1953.png |
| 22 | knowledge:k32 | hero | photograph | REPRESENTATIVE acceptable | A-D | P1 | 替代 everest-climb-modern.png（可与 #18/C1 复用） |
| 23 | knowledge:k07 | support | diagram/scientific | —— | A-B | P2 | 气压/含氧示意 |

（复用纪律：同一文件可为不同 entity 服务，但每条 entity+purpose 一条登记记录；候选状态默认 review，不因下载成功而 approved。）
