# Knowledge Coverage Matrix（Long Run 2 · 更新版）

> 四个探索世界 × 知识主题的覆盖快照。状态：`COVERED / PARTIAL / MISSING / NOT_APPLICABLE`。
> 所有数字由 `npm run content:report` 自动生成（design/content/final/metrics-report.json），本文件为主题级摘要。

---

## 1. 来源覆盖（PHASE 1 完成）

| 指标 | 数值（代码统计） |
| --- | --- |
| Knowledge total | 41（k01–k41） |
| with sources | **41 / 41（100%）** |
| A/B-quality sourced（NOAA/NPS/USGS/NSIDC/avalanche.org/大学机构） | 11 |
| 来源核验方式 | 每条 URL 本会话实际访问：Wikipedia 主站在本环境不可达，改经 api.wikimedia.org 同页镜像核验存在性与关键事实；NOAA/NSIDC/NPS/avalanche.org 直连核验 200 |

A/B 升级记录（关键科学知识不再只依赖 Wikipedia）：
- k03 板块碰撞 → USGS Plate Tectonics（仓库既有引用）
- k08 冰川 → NSIDC（B）
- k11 深渊 → NOAA deepest-ocean（A）
- k10 洋流 / k28 潮汐 → NOAA（A）
- k24 雪崩 → avalanche.org（A）
- k35 复式火山 → 东京大学 ERI（B）；k36 宝永 → 静冈大学（B）

## 2. 按 World × 主题覆盖

| 世界 | geology | environment | climate | formation | phenomena | human history | measurement | risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| everest | COVERED | COVERED | COVERED | COVERED | PARTIAL | COVERED | COVERED | COVERED |
| mariana | COVERED | COVERED | NOT_APPLICABLE | COVERED | COVERED | COVERED | COVERED | PARTIAL |
| fuji | COVERED | PARTIAL | PARTIAL | COVERED | COVERED | COVERED | PARTIAL | COVERED |
| colorado | COVERED | COVERED | COVERED | COVERED | PARTIAL | PARTIAL | PARTIAL | PARTIAL |

本轮变化：
- colorado「生物/生态」：MISSING → **COVERED**（新增 k41 加州神鹫，NPS A 级来源）。
- 仍 PARTIAL 的条目均为 P2 扩充项（everest 旗云、fuji 焚风/特有植被、mariana 潜水人体效应、colorado 侧谷人文）。

## 3. 知识数量纪律

本轮新增仅 1 条（k41，由 coverage gap 驱动），未为指标注水。扩写 6 条薄条目（k12/k16/k21/k26/k28/k30），每条补齐「为什么 + 在哪里观察到」。总量纪律：**少而完整 > 多而薄**。

## 4. 与 Waypoint 的关系

waypoint.knowledgeIds（场景侧）+ node.knowledgeId（全局侧）在本轮维持上轮结构；Knowledge ↔ Media 的 runtime 关联待媒体晋升后建立（见 media-review 报告的 plannedMediaIds）。
