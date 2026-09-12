# Media Coverage Report（Long Run 2 终态）

> 本报告由 `npm run content:report` + `npm run content:validate` 驱动（design/content/final/metrics-report.json），人工撰述仅限语义说明。
> Round 2 关键变化：**25 项媒体经四项 PASS（source/license/geography/visual）晋升 Runtime**；legacy images[] 完成迁移；4 张来源不明占位图处置完毕（1 张退役 + 1 张替换 + 2 张标记）。


## 1. 统计总览（代码统计）

| 类别 | 数量 | 说明 |
| --- | ---: | --- |
| Runtime integrated（approved，全仓） | 40 | everest hero 1 + DEM 兜底 8 + 实景/教育媒体 31（Round 2 晋升 25 项） |
| Waypoint 覆盖 | 21/29（16 实景照 + 5 terrain-only） | 8 个 fallback-only 为「水柱/无可靠候选」的合法兜底（见 contact-sheet） |
| Knowledge 媒体 | 11 条（k03/11/31/33/35/36/37/38/39/40/41） | photograph 6 + scientific 2 + diagram 3 |
| Place hero | 1（p-fuji 实拍） | p-everest 沿用 expedition hero；p-mariana/p-colorado 占位卡待候选 |
| 候选清单（机器可读） | 37 | data/media/candidates.ts（review/draft；approved 不得留在候选区——校验器强制） |
| 原始素材 | 36/37 已下载（56.9MB，gitignore） | media-source/<world>/，sha256 全记录；k-ifremer-snow（备选）放弃下载 |
| Rejected | 1 | F6（FujiHoei2078.jpg 低清 + 署名链不完整） |
| EXACT | 1 | m2（DSV 坐底记录 CC0） |

## 2. 按 Entity 的媒体覆盖

### Place hero

| place | 现状 | 候选 |
| --- | --- | --- |
| p-everest | COMPLETE（live-a-kala-patthar，REPRESENTATIVE） | — |
| p-mariana | 占位卡（来源不明） | M1 GEBCO 测深图（scientific，REPRESENTATIVE，CC BY 4.0） |
| p-fuji | 占位卡（来源不明） | F1 山中湖实拍（CC BY-SA 4.0） |
| p-colorado | 占位卡（来源不明） | C5 南缘系列（review，许可链待逐张核验） |

### Waypoint Primary Media Coverage（四世界全量）

| World | Waypoint | Primary | GeographicRole | 状态 |
| --- | --- | --- | --- | --- |
| everest | base-camp | DEM 裁切（terrain） | — | FALLBACK_ONLY（候选 7ST 7264 / EBC view 在册） |
| everest | khumbu-icefall | DEM 裁切（terrain） | — | FALLBACK_ONLY |
| everest | camp-i | DEM 裁切（terrain） | — | FALLBACK_ONLY |
| everest | western-cwm-camp-ii | DEM 裁切（terrain） | — | FALLBACK_ONLY（候选 B1 Western Cwm 2011 在册，需 9:16 双峰保留检查） |
| everest | lhotse-face-camp-iii | DEM 裁切（terrain） | — | FALLBACK_ONLY（候选 C1 Traffic near Yellow Band 在册） |
| everest | south-col-camp-iv | DEM 裁切（terrain） | — | FALLBACK_ONLY |
| everest | south-summit | DEM 裁切（terrain） | — | FALLBACK_ONLY（候选 C3/C2 在册 review） |
| everest | summit | DEM 裁切（terrain） | — | FALLBACK_ONLY（候选 D1 Everest Summit.jpg CC0 + GPS 在册） |
| mariana | surface-start | — | — | FALLBACK_ONLY（水柱无地标） |
| mariana | thermocline | — | — | FALLBACK_ONLY |
| mariana | twilight-end | — | — | FALLBACK_ONLY |
| mariana | deep-water | — | — | FALLBACK_ONLY |
| mariana | trench-rim | — | — | FALLBACK_ONLY |
| mariana | bottom-approach | — | — | FALLBACK_ONLY（M4 系列池 review） |
| mariana | challenger-bottom | — | — | FALLBACK_ONLY（M2 EXACT 候选在册） |
| fuji | gogome | — | — | FALLBACK_ONLY（F1 候选） |
| fuji | rokugome / nanagome | — | — | FALLBACK_ONLY（无可靠候选） |
| fuji | hachigome | — | — | FALLBACK_ONLY（F5 review） |
| fuji | hon-hachigome / kyugome | — | — | FALLBACK_ONLY |
| fuji | kengamine | — | — | FALLBACK_ONLY（F3 御来光候选） |
| colorado | rim-trailhead | — | — | FALLBACK_ONLY（C1 候选 PD） |
| colorado | mile-and-half / three-mile | — | — | FALLBACK_ONLY |
| colorado | havasupai-gardens | — | — | FALLBACK_ONLY |
| colorado | devils-corkscrew | — | — | FALLBACK_ONLY（C2 候选 PD/NPS） |
| colorado | river-side | — | — | FALLBACK_ONLY |
| colorado | phantom-ranch | — | — | FALLBACK_ONLY（C4 候选 CC BY 2.0/NPS） |

> 说明：everest 的 8 张 DEM 裁切图属于**合法 fallback**（自产、SOURCE.md 在册），不是「来源不明」资产；mariana/fuji/colorado 的 fallback 是数据驱动的通用世界渲染（palette/terrainTint），同样不冒充实景。29/29 waypoint 当前均为「合法 fallback」，13 张真实媒体候选等待人工签核晋升。

### Knowledge 媒体

- 全局知识与场景节点 `mediaIds` 均为空（40/40）：在媒体晋升 Runtime 前不建立空壳关联。
- 设计映射已预留：k36/k39 → F4（宝永火口）、k37 → C3（Kaibab 化石）、k33/k34/k40 → M1/M2、k11 → M3（的里雅斯特号历史照）。

## 3. 许可与来源核验记录

- 全部 13 个候选经 Commons API（`prop=imageinfo&iiprop=extmetadata|sha1`）于 2026-09-11 核验 license/author/date/sha1，逐条记录在 `design/content/{fuji,colorado,mariana}/media-candidates.md`。
- 无 AI 生成图片冒充实景；无「来源不明图片晋升」。
- EXACT 仅 1 处（M2，DSV 坐底现场照 CC0 + 官方说明），其余全部 REPRESENTATIVE。
- 三张来源不明的旧占位卡（fuji/mariana/grand-canyon-card.png）本轮**未晋升、未删除**（页面仍在用），列为 P1 Media Debt：用候选 F1/M1/C5 替换后可消除。

## 4. 仓库体积策略（已执行）

- 本轮未向仓库添加任何二进制媒体；候选以文档 + 外链 + sha1 指纹形式记录。
- 若后续下载 originals：`media-source/<world>/`（gitignore）+ 元数据入仓；运行时资产走既有管线（9:16 crop + quality=80 + sha256 → `miniprogram/assets/...` → MediaManifest）。
- 不启用 Git LFS。
