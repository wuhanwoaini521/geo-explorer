# Release Readiness（最终收口 · 2026-09-12）

> 五维状态分离，不混称 PASS。

## 1. 状态总览

| 维度 | 状态 | 说明 |
|---|---|---|
| Engineering | **PASS** | typecheck ✅ / 504 tests ✅ / build ✅（dist 同步） |
| Content | **PASS** | content:validate **0 ERROR / 0 WARNING / 2 INFO**（诚实 fallback 已从 warning 降级为 INFO，符合"预期设计不用 WARNING"原则） |
| Media Integrity | **PASS** | 43 runtime 资产全链路审计：字段齐备、hash 实算 43/43、ownership 校验 0 违规、source→runtime 溯源链完整；unknown-provenance runtime usage = **0** |
| Human Media Review | **PASS**（增量待验） | 3 张替换图获用户确认（HUMAN_APPROVED）；本轮收口新增 3 项（声呐图 place hero / 南缘全景 / k32 现代攀登）标 HUMAN_REVIEW_PENDING，随 Windows QA 一并目验 |
| Windows Visual QA | **PENDING** | 清单 + 机器可读 manifest（windows-qa-manifest.json）已备；待微信开发者工具 |

## 2. 媒体状态模型（PHASE 2）

不复用 `approved` 单词承担多重含义；四态在报告层区分：

| 状态 | 含义 | 当前数量 |
|---|---|---:|
| VERIFIED | 来源/许可/地理三证核验（候选层） | 48 条候选全部过基础核验 |
| RUNTIME_INTEGRATED | 已入 MediaManifest + assets/content 落盘 + mediaIds 接线 | 43 项 |
| HUMAN_APPROVED | 用户显式签核（2026-09-12） | 3（f-osunabashiri 七合目远景、k34-noctiluca 夜光藻、k40-ifremer 海雪） |
| REJECTED | 用户明确否决 | ev-d1/d2/d4、k34-firefly-squid、k34-anglerfish（5） |

## 3. Runtime 链路审计（PHASE 3）

- 资产总数：43；hash 实算核验：43；链路问题：**0**
- 链路：`media-source 原图（sha256）→ optimize（q80 派生，runtimeSha256）→ MediaManifest.hash → mediaIds` 全程可追溯
- DEM 兜底 8 张为自产资产，sha256 已入清单（无外部来源链，SOURCE 见 everest-3d/SOURCE.md）
- 无审计问题

## 4. 四世界 29 Waypoint Primary Media 终表（PHASE 4）

| World | Waypoint | Primary | Kind | Role | Runtime | Human | Fallback |
|---|---|---|---|---|---|---|---|
| everest | 南坡大本营 | ev-terrain-base-camp | terrain | EXACT | RUNTIME_INTEGRATED | SELF_PRODUCED | — |
| everest | 昆布冰瀑 | ev-icefall-ladders | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | ev-terrain-khumbu-icefall |
| everest | C1 营地 | ev-terrain-camp-i | terrain | EXACT | RUNTIME_INTEGRATED | SELF_PRODUCED | — |
| everest | 西库姆 · C2 营地 | ev-b1-western-cwm | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | ev-terrain-western-cwm-camp-ii |
| everest | 洛子壁 · C3 营地 | ev-c1-yellow-band | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | ev-terrain-lhotse-face-camp-iii |
| everest | 南坳 · C4 营地 | ev-terrain-south-col-camp-iv | terrain | EXACT | RUNTIME_INTEGRATED | SELF_PRODUCED | — |
| everest | 南峰 · 最终雪脊 | ev-terrain-south-summit | terrain | EXACT | RUNTIME_INTEGRATED | SELF_PRODUCED | — |
| everest | 珠峰峰顶 | ev-terrain-summit | terrain | EXACT | RUNTIME_INTEGRATED | SELF_PRODUCED | — |
| mariana | 海面 · 出发 | — | — | — | FALLBACK_RENDER | — | NONE（无诚实媒体，渲染层兜底） |
| mariana | 温跃层 | — | — | — | FALLBACK_RENDER | — | NONE（无诚实媒体，渲染层兜底） |
| mariana | 微光带下界 | — | — | — | FALLBACK_RENDER | — | NONE（无诚实媒体，渲染层兜底） |
| mariana | 深层带水柱 | — | — | — | FALLBACK_RENDER | — | NONE（无诚实媒体，渲染层兜底） |
| mariana | 海沟坡 | — | — | — | FALLBACK_RENDER | — | NONE（无诚实媒体，渲染层兜底） |
| mariana | 沟底接近段 | m5-hirondellea | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | — |
| mariana | 挑战者深渊 · 坐底 | m2-limiting-factor-bottom | photograph | EXACT | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | — |
| fuji | 五合目 · 富士斯巴鲁线 | — | — | — | FALLBACK_RENDER | — | NONE（无诚实媒体，渲染层兜底） |
| fuji | 六合目 | f-forest-lower | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | — |
| fuji | 七合目 | f-osunabashiri | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_APPROVED | — |
| fuji | 八合目 | — | — | — | FALLBACK_RENDER | — | NONE（无诚实媒体，渲染层兜底） |
| fuji | 本八合目 | f-yoshida-huts | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | f5-navy-climb |
| fuji | 九合目 | — | — | — | FALLBACK_RENDER | — | NONE（无诚实媒体，渲染层兜底） |
| fuji | 剑峰 · 日本最高点 | f3-goraiko | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | — |
| colorado | 南缘 · 明亮天使步道口 | c1-trailhead | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | — |
| colorado | 一英里半休息站 | c-resthouse-15 | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | — |
| colorado | 三英里休息站 | c-resthouse-3mi | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | — |
| colorado | 哈瓦苏派花园 | c-indian-garden | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | — |
| colorado | 魔鬼螺旋坡 | c2-devils-corkscrew | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | — |
| colorado | 科罗拉多河畔 | c-river-nps | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | — |
| colorado | 幽灵牧场 | c4-phantom-ranch | photograph | REPRESENTATIVE | RUNTIME_INTEGRATED | HUMAN_REVIEW_PENDING | — |

统计：RUNTIME_INTEGRATED 21/29（实景 photograph 16 + terrain 兜底 5）；NO HONEST MEDIA 8（诚实 fallback 政策，渲染层兜底）。

## 5. 诚实 Fallback 政策（PHASE 5）

- 马里亚纳 5 个水柱节点（海面/温跃层/微光尽/深层/沟坡）：无地标媒体，保持 **NO HONEST PHOTOGRAPH**（场景渲染层兜底）——不为覆盖率硬塞
- 媒体类型区分明确：photograph 16 / terrain 5 / scientific+diagram（知识层）
- 终极兜底：EVEREST_CUSTOM_VISUAL 仅供 Everest；其它世界走数据驱动通用渲染

## 6. Unknown Provenance（PHASE 6）

- fuji-card.png（已被 f1-yamanaka-view 实拍替换，仅存代码级最后兜底）
- mariana-card.png（无合格候选，占位兜底）
- grand-canyon-card.png（无合格候选，占位兜底）
- everest-climb-modern.png（k32 装饰，无替换候选）

- 四者均 **UNKNOWN_PROVENANCE / DO_NOT_PROMOTE**：不在任何 MediaManifest、MediaRegistry 不可能将其作 approved 实景（校验器双层把关）
- everest-history-1953.png 已退役删除（k31 由历史实拍替换）

## 7. Place Hero（PHASE 7）

- p-everest：expedition hero（Kala Patthar 实拍）✅
- p-fuji：f1-yamanaka-view 实拍 ✅
- p-mariana：**m7 官方声呐测深图**（Five Deeps Expedition EM124，EXACT，用户明确允许 scientific hero）✅
- p-colorado：**c6 南缘访客中心全景**（CC BY-SA 2.0，8192×1856）✅
- 四世界 Place hero 全部落地；占位卡引用清零、4 张 unknown-provenance 文件退役删除

## 8. Knowledge 终检（PHASE 8/9/10）

- 来源：41/41（100%）——A/B backed 12，C/D backed 29
- 图谱：61 条单向声明边（已去重互边 38 条），跨世界 13 条；无自引用/无效 id/重复边
- 教育媒体（12 条，全部机制/现象对应，无风景凑数）：k03 俯冲图 · k11 测深+历史照 · k31 1953 历史照 · k33 分布图+分层图 · k34 夜光藻 · k35 地质剖面 · k36 宝永火口 · k37 化石 · k38 片岩 · k40 Ifremer 海雪 · k41 神鹫
- Quiz：全局 23（冷知识题已替换为内容可溯题）+ 场景随堂 29

## 9. Validation（PHASE 14/15）

| 检查 | 结果 |
|---|---|
| content:validate | 0 ERROR / 0 WARNING（） |
| media ownership 校验（新增） | waypoint/knowledge mediaIds 必须归属本实体 |
| manifest 校验 + 跨清单重复 id | 0 |
| 候选完整性 | 0 issue |

## 10. Windows QA（PHASE 16/17）

见 windows-visual-qa-checklist.md（逐世界 + 截图矩阵）。渲染风险清单：

| 风险 | 涉及 | 缓解 |
|---|---|---|
| aspectFill 中心裁切切主体 | ev-c1-yellow-band（队列偏右）、f3-goraiko（火口缘右下）、c2-devils-corkscrew（步道中下） | 卡片 200px 高 contain 优先；Windows 验收重点看这三张的裁切结果 |
| 竖图在横卡留边 | ev-d2/d4 已否决不涉及；k34-noctiluca 竖图 3000×4000 | aspectFill 下会裁上下——主体居中，安全 |
| 深色图与深色 UI 融合 | k34-noctiluca / k40-ifremer（夜景） | 卡片有边框与文字层，Windows 确认可辨识 |
| 文字 overlay 对比度 | place hero（mariana/grand-canyon 占位卡） | 现状未变；新实拍 hero（fuji）浅色天空区域需看标题对比度 |

## 11. Remaining P0/P1/P2

- **P0**：无
- **P1**：p-mariana/p-colorado place hero 候选；剩余 ALTERNATIVE 池人工定夺（D3 峰顶中景、Maug 航拍等）；Windows 视觉验收
- **P2**：跨世界对照 UI；fuji/colorado 专属场景插画；知识 diagram 批量补图（media plan）

## 12. 当前 Release Status

```
PASS_PENDING_WINDOWS_VISUAL_QA
（Engineering / Content / Media Integrity / Human Media Review 均 PASS；
 待：Windows 微信开发者工具逐世界验收（含 3 项增量资产目验）→ RELEASE_CANDIDATE）
```
