# Fuji / Grand Canyon 媒体 Backlog

审计日期：2026-09-18
本轮原则：只记录，不重做两个世界；没有发现必须立即阻断 Mariana Sprint 的 P0 媒体错误。

## Fuji

| 优先级 | 问题 | 事实依据 | 建议验收 |
| --- | --- | --- | --- |
| P1 | `f-osunabashiri` 同时作为 Fuji Expedition 背景和 `nanagome` hero，但照片来自御殿场路线大砂走り，不是吉田路线七合目 | Manifest 已注明 `shot on the Gotemba side`；当前 Exploration 路线是 Yoshida | 获得经授权的吉田路线七合目连续坡面照后替换；此前 UI 必须标为代表性地貌，不宣称精确地点 |
| P1 | 吉田路线 waypoint 覆盖不均 | `gogome`、`hachigome`、`kyugome` 没有独立 runtime hero；`hon-hachigome` 有两张 | 优先补五合目出发、八合目与九合目真实路线照片；每张核对路线、拍摄位置和许可 |
| P1 | `f3-goraiko` 是火口缘御来光场景，当前映射到 `kengamine` 仅为代表性 | `geographicRole=REPRESENTATIVE`、无精确峰顶坐标 | 保持代表性标签；找到剑峰测候所/最高点标志的可授权环境照后再升级 EXACT |
| P2 | `f5-navy-climb` 的候选语义与 runtime 归属曾有漂移风险 | 候选记录面向八合目语境，runtime 当前为 `hon-hachigome` secondary | 下轮对候选、Manifest、route 三方 entityId 做自动一致性报告，不凭文件名推断地点 |
| done | `k39` 缺少正式知识媒体关联 | 已有审核通过的大砂走り实拍，但此前仅登记为 waypoint | 已新增 `k39-osunabashiri` knowledge-support；测试保证复用现有授权文件 |

## Grand Canyon

| 优先级 | 问题 | 事实依据 | 建议验收 |
| --- | --- | --- | --- |
| P1 | 1.5 Mile / 3 Mile Resthouse 图片偏历史设施记录，沉浸主视觉能力弱 | 两张均约 1024×730，候选评审为 `ALTERNATIVE`，runtime 当前仍是 waypoint hero | 有更高分辨率、位置可证明的步道环境照后降级旧图为 secondary |
| P1 | 路线图片色调与年代差异较大 | 河畔图为黑白 NPS 记录，其他节点多为彩色现代照片 | 保留史料属性，在 UI 标注年代/类型；不要用统一滤镜伪装同一时段 |
| P1 | `k06` 峡谷下切仍依赖 Devil's Corkscrew 环境照兜底 | 画面能展示峡谷，但不能直接解释下切机制 | 候选应优先 USGS/NPS 河流下切剖面或时间序列图，并只放知识页 |
| P2 | waypoint hero 与知识图的职责需持续分离 | `c3-kaibab-fossils`、`c-vishnu-river`、`k-condor` 已正确作为知识媒体 | 新媒体继续遵循 place/waypoint=实景，机制图=knowledge-support，不让科研图抢占封面 |

## 不做事项

- 不因缺图复用无关世界照片。
- 不把科研图、剖面图或分布图提升为地点 hero。
- 不新增来源或许可未核验的下载。
- 不在本轮重做 Fuji / Grand Canyon 页面或路线引擎。
