# Knowledge Architecture Audit（Long Run · PHASE 3）

> 审计对象：`miniprogram/data/knowledge.ts`（全局知识库）、各探索场景的知识节点（`data/explorations/*.ts`）、随堂题与 `data/quizzes.ts`。
> 审计基线：git 工作区（含用户已有改动）；Before = 本轮开始前，After = 本轮完成后。

---

## 1. 知识库总量与构成

| 指标 | Before | After | 变化 |
| --- | ---: | ---: | --- |
| 全局知识条目 | 32（k01–k32） | 40（k01–k40） | +8 |
| 有 sources 的条目 | 0 | 23 | 15 条既有高价值条目 + 8 条新增 |
| 有 relatedPlaceIds 的条目 | 23 | 30 | 新增 8 条全部关联 Place |
| 与四世界直接关联的条目 | 14 | 24 | 见 §4 覆盖矩阵 |
| Category 分布 | 气候8/地形地貌9/地质5/水文4/生态4/世界地理4（近似） | 地质+3、生态+2、地形地貌+1 | 适配四世界 |

新增条目（每条均满足：有教育价值、非改写、至少关联一个 Place、可溯源、内容完整）：

| id | 标题 | 类别 | 关联 |
| --- | --- | --- | --- |
| k33 | 海洋的五个层带 | 生态 | p-mariana, p-reef |
| k34 | 深海生物为什么会发光？ | 生态 | p-mariana |
| k35 | 什么是复式火山？ | 地质 | p-fuji |
| k36 | 宝永大喷发：富士山的最后一次开口 | 地质 | p-fuji |
| k37 | 大峡谷：一部地质「时间之书」 | 地质 | p-colorado |
| k38 | 大不整合面：12 亿年的空白 | 地质 | p-colorado |
| k39 | 火山砾坡与大砂走り | 地形地貌 | p-fuji |
| k40 | 海雪：深渊的「食物快递」 | 生态 | p-mariana |

分类沿用现有 `KnowledgeCategory` 六类，未扩展枚举（k33/k34/k40 归入「生态」，k35/36/37/38 归入「地质」，k39 归入「地形地貌」）。

## 2. 审计发现与处置

| 问题 | 数量（Before） | 处置 |
| --- | --- | --- |
| 条目完全没有 sources | 32/32 | 已为 15 条高价值条目补公开来源（Wikipedia/NOAA/NPS/ERI，全部为本轮核验过的 URL）；其余 17 条为泛地理常识，来源留空由后续校验标记（不造假） |
| k15 标题乱码（`大陆漂移的证据“。”`） | 1 | 修复为「大陆漂移的证据是什么？」 |
| k11 数值过时（约 11,000 m） | 1 | 对齐 2021 年测量 10,935 ± 6 m，并补 sources |
| 孤立知识（无 Place 关联） | 9（k12/15/16/21/22/26/28 等） | 属通识类（等高线、大气分层等），不强行挂 Place；通过 landform 关联表达。P2 债务 |
| 无 media 关联 | 40/40 | 四世界真实媒体尚未晋升 Runtime（见 media-candidates 文档），`mediaIds` 保持缺省。P1 债务 |
| 无 Quiz 关联（全局层面） | 40/40 | 现有 schema 未建立 Knowledge↔Quiz 直连；随堂题在场景节点内承载（7+7+8+7=29 题来源可溯）。保持现状，避免重复建模 |
| 重复内容 | 基本无 | k02 与 qz-snowline、k07 与 qz-death-zone 属「全局知识 + 随堂题」的互补而非重复 |
| 内容过短 | 少数（k12/k16 等一句型） | P2：扩写但不虚构 |

## 3. 场景知识节点（Exploration KnowledgeNodes）

| 世界 | 节点数 | 有 sources | 有随堂题 | 链接全局知识库 | 媒体 |
| --- | ---: | ---: | ---: | --- | --- |
| everest | 7 | 7 | 7 | 6/7（本轮补 summit-height → k31） | diagram 计划中（P2） |
| mariana | 7 | 7 | 7 | 6/7（本轮补：midnight-zone→k33、bioluminescence→k34） | P1 |
| fuji | 8（新增） | 8 | 8 | 4/8（k01/k04/k29 系/k36/k39） | P1 |
| colorado | 7（新增） | 7 | 7 | 4/7（k06/k37/k38） | P1 |
| 合计 | 29 | 29 | 29 | 20/29 | — |

## 4. Knowledge Coverage Matrix（按世界 × 主题）

标记：`COVERED / PARTIAL / MISSING / NOT_APPLICABLE`（括号内为支撑条目/节点）。

### everest（珠峰 · 高山）

| 主题 | 状态 | 支撑 |
| --- | --- | --- |
| 地形形成 | COVERED | k03、process mountain-formation |
| 地形与侵蚀 | COVERED | k08、k02、k24、waypoint 内容 |
| 环境/气候 | COVERED | k01、k04、k09、k02 |
| 关键自然现象 | PARTIAL | k24（雪崩）；旗云/风速具体机制 MISSING（P2） |
| 生物/生态 | PARTIAL | k12 泛植被带；喜马拉雅特有生态 MISSING（P2） |
| 人类探索 | COVERED | k31、k32 |
| 测量/科学 | COVERED | 2020 中尼联合测量（节点 summit-height） |
| 风险 | COVERED | k07、k24 |

### mariana（马里亚纳 · 深海）

| 主题 | 状态 | 支撑 |
| --- | --- | --- |
| 地形形成 | COVERED | k11、process trench-formation |
| 环境（压力/温度/光照） | COVERED | k33、节点 pressure、abyss-zone |
| 气候 | NOT_APPLICABLE | （深海无天气概念） |
| 地质 | COVERED | k11、hadal-zone |
| 关键自然现象 | COVERED | k40（海雪） |
| 生物/生态 | COVERED | k33、k34、k40 |
| 人类探索 | COVERED | 节点 diving-history（1960/2012/2020） |
| 测量/科学 | COVERED | 10,935 ± 6 m（2021 压力反演） |
| 风险 | PARTIAL | 水压已覆盖；人体效应 MISSING（P2） |

### fuji（富士山 · 火山）

| 主题 | 状态 | 支撑 |
| --- | --- | --- |
| 地形形成 | COVERED | k35（复式火山）、k39（休止角坡）、process volcano-formation |
| 环境/气候 | PARTIAL | k01（直减率）；御殿场坡与焚风等 MISSING（P2） |
| 关键自然现象 | COVERED | k36（宝永喷发）、k29（火山灰）、k39（大砂走り） |
| 地质 | COVERED | k35、k36 |
| 生物/生态 | PARTIAL | k04（垂直分带）；富士山特有植被 MISSING（P2） |
| 人类探索 | COVERED | 节点 goraiko（登山文化/管理）、k31 类比（世遗文化景观 k37 无关，用 UNESCO 来源支撑） |
| 测量/科学 | PARTIAL | 3,776.24 m 高程；地磁/重力观测 MISSING（P2） |
| 风险 | COVERED | waypoint risk 字段（高山反应/失温/砾石） |

### colorado（大峡谷 · 峡谷）

| 主题 | 状态 | 支撑 |
| --- | --- | --- |
| 地形形成 | COVERED | k06、process canyon-erosion、节点 canyon-birth |
| 地质/地层 | COVERED | k37、k38 |
| 环境/气候 | COVERED | 节点 inner-gorge-heat（谷地逆温） |
| 关键自然现象 | PARTIAL | 岩层/不整合已覆盖；洪水过程（暴洪塑造）MISSING（P2） |
| 生物/生态 | MISSING | 大峡谷生态系统（加州神鹫再引入等）无条目（P2） |
| 人类探索 | PARTIAL | 节点 powell-1869；全局条目 MISSING（P2） |
| 测量/科学 | PARTIAL | 岩层年代覆盖；峡谷成因争议（Karlstrom 等）已提；量化速率 MISSING（P2） |
| 风险 | PARTIAL | 高温/脱水已覆盖（节点 + waypoint）；NPS 安全指引可再扩（P2） |

## 5. 来源等级分布（After）

- Level A（政府/官方科研）：NOAA、NPS、国土地理院（转引）、环境省、自然资源部（everest 场景）— 支撑 9 处
- Level B（大学/研究机构）：东京大学 ERI、静冈大学小山真人、Scientific Reports（DOI）— 支撑 5 处
- Level C/D（权威百科）：Wikipedia（approximate 标注）— 支撑其余
- 所有新写入数值均显式标注 approximate 或来源；跨源冲突处（峡谷成因、Fuji 山小屋沿革）采用「近似/公开资料」措辞，未拍脑袋定值。

## 6. 剩余债务

| 级别 | 债务 |
| --- | --- |
| P1 | Knowledge↔Media 关联（等待媒体晋升 Runtime 后统一建立） |
| P2 | 其余 17 条全局知识补来源（需逐条研究，避免造假来源） |
| P2 | 生物/人文类主题缺口（大峡谷生态、富士特有植被、旗云机制、潜水人体效应） |
| P2 | 内容过短条目扩写（k12/k16/k21/k26/k28） |
