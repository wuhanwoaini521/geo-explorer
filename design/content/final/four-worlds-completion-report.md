# Four Worlds Completion Report（Long Run 最终报告 · PHASE 11）

> **2026-09-12 更新（Overnight Hardening 后）**：媒体已 Runtime Integrated 40 项（29 waypoints 中 21 个有 runtime 图，16 实景照）；知识 41 条全来源；下表 Media 列的「MISSING/候选在册」表述已部分过时，最新见 media-coverage-report.md 与 metrics-report.json。

> 完成时间：2026-09-11。验证基线：`typecheck PASS / 474 tests PASS / build PASS / content:validate PASS / asset scan PASS`。
> 视觉状态：**PENDING_WINDOWS_VISUAL_QA**（Linux 无法运行微信开发者工具，未做任何视觉宣称）。

---

## 1. 总览

| World | Waypoints | Content | Sources | Knowledge | Media | Quiz | Overall |
| ----- | --------: | ------- | ------- | --------- | ----- | ---- | ------- |
| everest | 8 | COMPLETE（本轮补齐 environment/risk/history/whatToNotice/knowledgeIds/sources/reviewStatus） | COMPLETE | 7 节点全链全局（7/7） | PARTIAL（1 approved 实景 + 8 terrain 兜底；7 个 Commons 候选在册未晋升） | COMPLETE（7 随堂题） | COMPLETE |
| mariana | 7（本轮新增 route） | COMPLETE | COMPLETE | 7 节点（3/7 链全局） | MISSING（2 记录级候选在册：1 EXACT 坐底照 + 1 测深图） | COMPLETE（7 随堂题） | COMPLETE |
| fuji | 7（新增世界） | COMPLETE | COMPLETE | 8 节点（4/8 链全局） | MISSING（4 记录级候选在册） | COMPLETE（8 随堂题） | COMPLETE |
| colorado | 7（新增世界） | COMPLETE | COMPLETE | 7 节点（3/7 链全局） | MISSING（3 记录级候选在册） | COMPLETE（7 随堂题） | COMPLETE |

---

## 2. 逐世界改进说明

### everest（珠穆朗玛峰 · 高山）

- **Route**：未动（289 点真实路线 + Expedition V2 附件保持原样）。
- **Stages**：12 段自然带保持原样。
- **Waypoints**：8 个节点全部补齐 `environment / risk / history / whatToNotice / knowledgeIds / sources / reviewStatus: approved`（此前全部缺失）。
- **Content**：新增内容聚焦各节点专属事实（冰瀑的休止角证据、C1 的 1952 瑞士远征史、西库姆雪盲风险、C4 风向观察建议、南峰的希拉里台阶 2015 地形变化、峰顶石灰岩观察点）。
- **Sources**：全部指向已在场景内核验的 Wikipedia / 2020 中尼联合测量 / Khumbu Glacier 来源。
- **Knowledge**：summit-height 节点补 `knowledgeId: k31`（7/7 全链全局知识库）。
- **Quiz**：保持 7 随堂题（原有质量已达标）。

### mariana（马里亚纳海沟 · 深海）

- **Route**：**新增 `mariana-descent` 下潜序列（7 waypoints，depth 语义 0→10,935 m）**——修复审计发现的最大缺口（此前完全没有可点击的地理节点）。
- **Waypoints**：海面出发 → 温跃层 → 微光带下界 → 深层带 → 海沟坡 → 沟底接近段 → 坐底；每点含 desc/detail/facts/environment/history/whatToNotice/knowledgeIds/sources/reviewStatus。
- **Content 修复**：清理原文件的多处乱码/错字（「呼吸无法」「界宇宙共识」「硫深海生命」「奋斗号」等），数值表述统一为 2021 年测量口径（10,935 ± 6 m）。
- **Knowledge**：midnight-zone → k33（海洋五带）、bioluminescence → k34（生物发光）；水压节点上移至 2,000 m（黑暗带），叙事顺序更符合下潜体验。
- **Quiz**：保持 7 随堂题（文案错字已修）。

### fuji（富士山 · 火山，新增世界）

- **Exploration**：新建 `data/explorations/fuji.ts`（约 700 行），Journey = 吉田路线（富士斯巴鲁线五合目 2,305 m → 剑峰 3,776.24 m）。
- **Route**：7 waypoints（五合目/六合目/七合目/八合目/本八合目/九合目/剑峰），altitude 为公开参考值（标注近似）。
- **Stages**：7 段火山垂直带（林线 → 火山砾坡 → 山小屋带 → 云上 → 砂坡 → 火口缘）。
- **Content**：每点独立内容——休止角 31–35° 的砾石坡、大泽崩れ侵蚀谷、宝永 1707 喷发、直径 780 m 火口、御来光夜爬文化、お鉢巡り；差异化测量维度 = 海拔 + 风力（火山世界没有 DEM）。
- **Knowledge**：8 节点（含 2 个火山专属新全局知识 k35 复式火山 / k36 宝永大喷发 / k39 火山砾坡）。
- **Sources**：Wikipedia / japan-guide / 静冈大学小山真人 / 东大 ERI / UNESCO / 环境省。
- **Quiz**：8 随堂题，全部答案可从节点内容推出。

### colorado（科罗拉多大峡谷 · 峡谷，新增世界）

- **Exploration**：新建 `data/explorations/colorado.ts`（约 470 行），Journey = 明亮天使步道缘到河（南缘 2,114 m → 幽灵牧场 725 m），教学轴 = 谷深 0–1,389 m。
- **Route**：7 waypoints（步道口/1.5 mi/3 mi/哈瓦苏派花园/魔鬼螺旋/河畔/幽灵牧场）。
- **Stages**：7 段地质剖面（黄松林 → 凯巴布灰岩 → 科科尼诺砂岩 → 红墙 → 托托平台 → 内峡 → 河）。
- **差异化设计**：**「岩层年代」HUD 指标**（亿年，2.7 → 17.5 的大跳跃可视化大不整合面）+ 负直减率（下切增温，谷底比谷缘热 ~13 ℃）——这是其它三个世界都没有的体验轴。
- **Knowledge**：7 节点（下切成因 / 地层时间之书 / 大不整合面 / 内峡高温 / 1869 鲍威尔 / 明亮天使溪水文）。
- **Sources**：Wikipedia / NPS（2026-09-11 实核）。

---

## 3. Before / After 对比

| 维度 | Before | After |
| --- | --- | --- |
| 探索世界数 | 2（everest 完整 / mariana 无 route） | 4（全部 Journey 完整） |
| Waypoint 总数 | 8（仅 everest） | 29（8+7+7+7） |
| Waypoint 内容字段覆盖 | desc/detail/facts 有；environment/risk/history/whatToNotice/sources/reviewStatus 0% | 100%（29/29 全字段，sources 全部可溯） |
| 场景知识节点 | 14（7+7） | 29（7+7+8+7），29/29 带来源与随堂题 |
| 场景↔全局知识链接 | 12/14 | 17/29（其余为无对应全局条目的新主题，记录为 P2） |
| 首页探索入口 | 4 张卡（2 个 target=place 的占位） | 4 张卡全部 target=exploration |
| place.explorationId | 2 | 4（p-fuji / p-colorado 补齐） |

## 4. Remaining Debt（未解决债务）

| 级别 | 债务 | 位置 |
| --- | --- | --- |
| P1 | 四世界真实媒体晋升 Runtime（候选已记录、许可已核验，待人工视觉签核后下载/裁切/入 Manifest/credits） | design/content/{fuji,colorado,mariana}/media-candidates.md |
| P1 | legacy `images[]` → mediaIds + MediaRegistry 迁移（保持 backward compat 的前提下推进；本轮已建校验层，未动运行时） | types/exploration.ts、pages/exploration |
| P1 | 三张世界卡占位图（fuji/mariana/grand-canyon-card.png）来源不明；knowledge 页两张装饰图来源不明 | assets/world |
| P2 | colorado 生态类知识缺口（加州神鹫、荒漠生态）；everest 旗云机制；fuji 焚风/特有植被；mariana 潜水人体效应 | knowledge-coverage.md |
| P2 | 17 条全局知识补 sources | data/knowledge.ts |
| P2 | camp-detail 页硬编码 C3 文案数据化 | pages/camp-detail |
| P2 | 探索页「新世界视觉语言」：volcano/canyon 样式目前走通用渐变世界（合法兜底），专属场景插画留待 Windows 视觉验收后再设计 | pages/exploration |
