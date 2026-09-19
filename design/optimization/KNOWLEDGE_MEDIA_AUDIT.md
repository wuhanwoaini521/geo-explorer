# Knowledge 媒体覆盖审计

审计日期：2026-09-18

## 口径

- `total`：`KNOWLEDGE` 条目数。
- `withHero`：通过 `knowledgeImages()` 能解析出至少一张可展示图片。这里的 hero 指列表/详情首图，不要求 Manifest 的 `purpose` 字面等于 `hero`。
- `withoutHero`：没有已审核 Manifest 媒体，也没有现有语义兜底。
- `withGallery`：能解析出两张及以上图片。
- `coverage`：`withHero / total`。

## 结果

| 阶段 | total | withHero | withoutHero | withGallery | coverage |
| --- | ---: | ---: | ---: | ---: | ---: |
| Sprint 开始 | 41 | 21 | 20 | 2 | 51.2% |
| 本轮修正后 | 41 | 22 | 19 | 2 | 53.7% |

`withGallery` 为 `k11`（Trieste 历史照 + 测深图）与 `k33`（海洋分层图 + hadal 观测分布图）。

## 本轮安全增量

- 为 `k39`「火山砾坡与大砂走り」增加 `k39-osunabashiri` 运行时媒体关联。
- 复用仓库中已审核的 `f-osunabashiri.jpg`、既有 hash、source、credit 与 CC BY-SA 4.0 许可；没有新增下载，也没有复制进小程序生产包。
- 描述明确素材来自御殿场路线大砂走り，只用于解释火山砾坡休止角，不冒充吉田路线 waypoint。

## 四个 Exploration 相关知识现状

| 世界 | 已有可靠媒体的核心知识 | 主要缺口 |
| --- | --- | --- |
| Everest | `k03`、`k07`、`k08`、`k31`、`k32` 等 | 高海拔生理、冰川与现代攀登仍有复用图，需继续减少“一图多义” |
| Mariana | `k11`、`k33`、`k34`、`k40` | `k34` 当前为表层夜光藻现象示例；缺深海发光生物原位照 |
| Fuji | `k35`、`k36`、`k39`，另有少量语义兜底 | `k39` 已补齐；其他通识条目的世界关联图仍需逐条核验 |
| Grand Canyon | `k06`、`k37`、`k38`、`k41` | 通用侵蚀知识仍用路线环境照，缺机制图/历史对照图 |

## 判断

本轮没有为追求覆盖率强行配图。仍有 19 条知识无图，页面应继续显示各自分类 emoji 占位，而不是回退到同一张无关照片。下一轮只有在 source、license、实际画面和主题语义都通过审核后再晋升。
