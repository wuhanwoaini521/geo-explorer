# Mariana Media Candidates（Long Run · PHASE 5）

> 状态语义沿用 `design/world/everest-live/media-review.md`。本轮只做候选记录，不下载/不入 Manifest；晋升需人工视觉签核（Windows 阶段）。
> 深海世界的媒体层级与陆域不同：按提示词 §16，ROV/scientific → bathymetry → terrain 的顺序比 photograph 更合理。
> 文件名与许可经 Commons API 于 2026-09-11 核验，附 sha1 指纹。

| # | 候选文件 | 映射 entity + purpose | kind | geographicRole | license | 分辨率 | sha1(前12) | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M1 | `File:GEBCO 2019 bathymetry Challenger Deep and Sirena Deep.jpg` | place/p-mariana · hero（科学图）＋ expedition/mariana hero 候选 | scientific（测深图） | REPRESENTATIVE（挑战者深渊与塞壬深渊区域测深图，Bongiovanni/Stewart/Jamieson 2021） | CC BY 4.0 | 2128×1552 | c6c2b7d6fb2b | approved（记录级） |
| M2 | `File:Photo of Dr. Dawn Wright with Snoopy at Challenger Deep 071222 in the submersible DSV Limiting Factor.jpg` | waypoint/challenger-bottom · secondary（2022-07-12 实坐底影像） | photograph | EXACT（DSV Limiting Factor 在挑战者深渊坐底的现场记录，Vescovo/Wright 发布） | CC0（Vlvescovo） | 4032×3024 | 95b1fc324bcc | approved（记录级） |
| M3 | `File:Bathyscaphe Trieste beforedive.jpg` | knowledge-support（diving-history/k11：1960 的里雅斯特号历史影像） | photograph | REPRESENTATIVE（U.S. Navy 历史照片，母港检查中） | Public Domain（U.S. Navy） | 740×580 | 07d3a496b4e8 | approved（记录级，低清 historical 用途） |
| M4 | `File:Photo of Dr. Dawn Wright with Snoopy at Challenger Deep 071222 in the submersible DSV Limiting Factor.jpg`（同 M2 系列：`In Submersible ... 071222.jpg`、`Pre Challenger Deep Dive 072.jpg`） | waypoint/bottom-approach · secondary 备选 | photograph | EXACT（同系列现场照） | CC0 | — | — | review（作为 M2 的替代镜头池） |

## 映射缺口（Waypoint Primary Media Coverage）

| waypoint | primary | fallback |
| --- | --- | --- |
| surface-start | — | — |
| thermocline | — | — |
| twilight-end | — | — |
| deep-water | — | — |
| trench-rim | — | — |
| bottom-approach | M4 系列（review） | — |
| challenger-bottom | M2（EXACT 坐底照） | M1（测深图 fallback） |

> 中层水柱（thermocline/twilight/deep-water）不存在「地点级」照片——水柱本身没有地标；规范允许此类节点 fallback-only（本场景以数据驱动的深海渐变 + 知识卡表达）。M1 测深图可同时作为海沟几何的科学支撑图（knowledge-support for hadal-zone / trench-rim）。

## 采集策略

- 原始素材若下载：入 `media-source/mariana/`，记录 source/resolution/sha256/license；不修改 original。
- M2/M4 系列来自 2022-07-12 「极限因子」号坐底影像（CC0），是四个世界里**唯一已核验的 EXACT 现场记录**，建议优先晋升。
- 不启用 Git LFS；原始大图不入 git。
