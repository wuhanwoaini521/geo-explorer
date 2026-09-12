# Unknown-Provenance Media Cleanup（Long Run 2 · PHASE 12）

> 原则：来源不明图片不得冒充正式实景。逐项处置记录如下（可追溯）。

| 资产 | 原用途 | 处置 | 状态 |
| --- | --- | --- | --- |
| `everest-history-1953.png`（2.1MB，来源不明） | knowledge 页 k31 装饰 | **已退役（git rm）**：k31 现绑定 runtime 实拍 `k-hillary-tenzing`（1953 首登双人照，CC BY-SA 3.0，MediaRegistry 解析） | ✅ DONE 2026-09-12 |
| `fuji-card.png`（AI 占位卡，来源不明） | home/map/place/knowledge 兜底 | **运行时已被替换**：p-fuji hero 晋升 `f1-yamanaka-view`（山中湖实拍 CC BY-SA 4.0），home 卡与 place/map/knowledge 页均走 `getPlaceHeroImage()` runtime 优先；`fuji-card.png` 保留为代码内最后兜底（仅在 runtime 缺失时触达） | ✅ REPLACED（兜底标记 UNKNOWN_PROVENANCE / DO_NOT_PROMOTE） |
| `mariana-card.png`（AI 占位卡，来源不明） | home/map/place 兜底 | 暂无合适实景候选（m1 为科学图，作 hero 偏图表感）→ **保留兜底**，标记 UNKNOWN_PROVENANCE / DO_NOT_PROMOTE；后续以 m1 或新氛围图晋升后替换 | ⏳ PENDING（标记完成） |
| `grand-canyon-card.png`（AI 占位卡，来源不明） | home/map/place 兜底 | 同上：C5 南缘系列候选仍在 review（许可链未核）→ **保留兜底** + 标记 | ⏳ PENDING（标记完成） |
| `everest-climb-modern.png`（来源不明） | knowledge 页 k32 装饰 | 暂无替换候选（k32 现代攀登实景需开放授权的新攀登照）→ **保留** + 标记 | ⏳ PENDING（标记完成） |

## 标记清单（代码注释级）

- `fuji-card.png` / `mariana-card.png` / `grand-canyon-card.png` / `everest-climb-modern.png`：
  `UNKNOWN_PROVENANCE — DO_NOT_PROMOTE`（仅作 runtime 缺失时的最后兜底；禁止登记进任何 MediaManifest）。
- 校验器约束：`validateMedia()` 拒绝非 approved 资产进入清单，四张占位图从未也不会被登记。

## 替换后的运行时状态

- p-fuji hero：真实实拍（runtime）✅
- k31/k03/k11/k33/k35/k36/k37/k38/k39/k40/k41 知识媒体：真实实拍/科学图/diagram（runtime）✅
- 29 个 waypoint 中 19 个已有 runtime 图片（13 实景 + 8 DEM 兜底 + 部分双兜底），详见 metrics-report.json。
