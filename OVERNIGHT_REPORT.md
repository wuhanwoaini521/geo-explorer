# Geo Explorer — Overnight Development Report

> 2025 夜间自主开发 · 分支 `feat/geo-explorer-product-polish` · 基线 `main@2214537`

---

## 1. Summary

本次任务把 Geo Explorer 从「两个探索场景的技术 Demo」推进为带**世界图鉴层**的地理探索产品：

- 修复了最核心的结构性问题：**`data/places.ts`（地理地点数据）此前完全没有被任何页面消费**，数据与 UI 脱节。
- 新建了完整的「图鉴 → 详情 → 收藏 → 沉浸探索 → 登顶 → 下一站」产品闭环。
- 地点数据从 20 条浅层数据重建为 **49 条带完整字段的公开资料数据**（中英文名/坐标/高程/成因/气候/冷知识/标签/来源）。
- Everest 体验补上了「点击营地 → 看到名称/海拔/真实介绍」这块核心拼图。
- 测试从 131 个增长到 **196 个**（+65），新增覆盖：数据完整性、搜索/筛选、收藏、页面逻辑、WXML 绑定一致性。

**验证状态**：`typecheck ✓ · build ✓ · 196/196 tests ✓ · 8 页面 WXML 绑定与方法一一对照 ✓`

**验证手段说明（诚实声明）**：本环境无法启动微信开发者工具 GUI，UI 验证采用三层替代：
1. `npm run build`（WXML/WXSS/JSON/TS 全量编译产物检查）；
2. **WXML↔TS 绑定一致性静态测试**（`tests/ui-bindings.test.ts`：提取全部 `bind/catch` 事件名与 Page/Component 定义对照，任何绑定丢失/拼错都会测试失败——这正好覆盖了「开发者工具里才发现白屏/按钮无响应」这一类最常见问题）；
3. 页面逻辑测试：mock `wx/Page` 全局后真实执行 `onLoad/onShow/handler`（首页/地图/详情共 15 个用例）。
真机/开发者工具的人工过检仍建议在合并前做一轮。

---

## 2. UI Improvements

| 页面 | 改动 |
|---|---|
| **首页** `pages/home` | 重设计：品牌 Hero（探索地球 + DEM 主视觉 + 三统计）→ 沉浸探索场景卡 → **精选目的地横向卡列**（可探索地点带徽标）→ **按地貌探索 11 类宫格**（带数量，一键携筛选跳图鉴）→ **你知道吗冷知识卡**（可换一条，带来源）→ 关于 |
| **地图页** `pages/map` | 升级为「探索地图 + 世界图鉴」：保留沉浸路线卡（含 DEM 路线图），预告场景压缩为紧凑条；新增**图鉴区**——搜索框（中英文/区域/标签）+ 11 类地貌筛选 chips + 双列地点卡片网格 + 空状态 |
| **地点详情页** `pages/place`（新） | 编辑风详情：Hero（名称/英文名/类型/收藏♥）→ 关键数据行（高程+坐标+区域，海沟自动切换「深度」语义）→ 概览/成因/气候/地质年代 → 编号冷知识 → **沉浸探索 CTA**（everest/mariana 直达）→ 相关地点 → 关联知识 → 标签与来源 |
| **我的页** `pages/profile` | 新增「我的收藏」列表（跳详情/快速移除） |
| **知识详情** `pages/knowledge-detail` | 新增「相关地点」链接（知识 → 图鉴闭环） |
| **探索页** `pages/exploration` | 登顶总结卡新增「下一站 · 继续探索」跨类型精选推荐；清理调试代码 |

视觉遵循既有「暖纸/古地图」Design System（#f6f0dd 纸底 / 琥珀金主色 / 硬投影按钮），新页面全部复用该语言，未引入新依赖。

## 3. New Features

1. **世界图鉴 + 全局搜索/分类筛选**（P0）：`utils/place-search.ts` 纯函数；首页分类入口经 `services/ui-bus` 跨 tab 传筛选（显式消费语义，不重置用户选择）。
2. **地点详情页**（P0）：含相关地点推荐（同类型优先+共享标签打分）与关联知识反查。
3. **收藏**（P1）：`services/favorites-store.ts`，存储可注入、id 去重、下架 id 自动跳过；列表/详情/图鉴三处联动。
4. **Did You Know**（P1）：12 条可溯源冷知识，`randomDiscovery` 避免连抽重复。
5. **Everest 途经点介绍卡**（P1）：路线 8 个营地全部补充真实介绍；点击路线点/Rail 节点优先开已解锁知识卡，否则显示「名称+海拔+介绍」卡片。
6. **登顶「下一站」推荐**：跨类型精选地点，形成「探索 → 发现新目标」循环。
7. **图片加载失败兜底**：首页主视觉与地图路线图 `binderror` 降级，不再出现破图。

## 4. Data

- `types/models.ts`：`Place` 模型升级——`nameEn / shortDescription / facts / tags / climate / geologicalAge / featured / explorationId / sources`；`PlaceType` 增加 `waterfall`。
- `data/places.ts`：20 → **49 条**，覆盖山峰/火山/峡谷/沙漠/冰川/河流/湖泊/瀑布/海洋/海岸/高原全部 11 类（每类 ≥2 条，测试保证）。
- 全部为公开资料整理（Wikipedia / 2020 中尼珠峰联合测量 / NOAA 等），每条带 `sources`；不确定的数值明确标注「近似」——**没有编造数据**。
- `data/discoveries.ts`：12 条冷知识（洋中脊 65,000km、南极是最大荒漠、贝加尔湖 20% 淡水、1883 喀拉喀托巨响等），全部带来源。
- **引用完整性测试**：知识库 `relatedPlaceIds` 必须全部存在于 PLACES（实际发现并修复了 3 处旧 id 重命名断链：p-dqinghai→p-qinghai、p-yarulong→p-yarlung、p-himalaya 条目缺失）。

## 5. Everest

- 8 个途经点（BC→冰瀑→C1→西库姆C2→洛子壁C3→南坳C4→南峰→峰顶）补充真实介绍文本，数据化（`ExplorationRouteWaypoint.desc`），引擎与页面零场景硬编码。
- 途经点交互重做：原来点击只有 toast，现在展示介绍卡片；关联知识已解锁则直接进知识卡。
- 新增 `tests/waypoints.test.ts`：id 唯一、progress 严格升序、首尾对齐 0/1、每点有海拔与介绍、峰顶=8848.86 且关联 summit-height。
- 既有资产（DEM 三景硬切换、南坳路线 289 控制点、Rail、知识联动、随堂题、登顶庆祝/总结）全部保留并沿用。

## 6. Testing

**131 → 196 个测试**，全部通过。新增文件：

| 测试文件 | 用例 | 覆盖 |
|---|---|---|
| `tests/places.test.ts` | 11 | 数据完整性/坐标范围/高程符号/类型覆盖/跨数据集引用/珠峰世界之最 |
| `tests/place-search.test.ts` | 9 | 中英搜索/国家/标签/类型/组合/空态 |
| `tests/favorites-store.test.ts` | 7 | toggle/去重/下架 id/持久化/脏数据过滤 |
| `tests/discoveries.test.ts` | 4 | 数据完整性/随机抽取排除项 |
| `tests/pages.test.ts` | 15 | 首页装配与跳转、图鉴搜索/筛选/空态、详情页组装/收藏/兜底（mock wx/Page） |
| `tests/waypoints.test.ts` | 5 | 途经点数据完整性 |
| `tests/ui-bindings.test.ts` | 11 | **8 页面 + 组件的 WXML 事件绑定与方法对照**（替代开发者工具人肉检查） |

## 7. Known Issues

1. **真机/开发者工具未实测**（环境无 GUI）：WXML 绑定一致性测试已静态覆盖主要风险，但仍建议合并前人肉过一轮首页/图鉴/详情/探索四条路径。
2. 首页「精选目的地」横向卡与图鉴搜索输入在低端机上的滚动性能未做真机压测（数据量 49 条，预期无压力）。
3. `landforms.ts`（地貌成因数据）仍无独立消费页面——本次以 places 为主战场，未强行铺开。
4. 地点详情的「相关地点」推荐算法是简单打分（同类型 + 共享标签），没有Embedding 级语义相关性。
5. 收藏/探索进度仍为本地存储（与既有约定一致，未引入后端）。

## 8. Next Steps

1. **真机过检**：微信开发者工具打开 `dist/`，重点走通：首页 → 图鉴搜索 → 详情 → 收藏 → Everest 探索 → 途经点卡 → 登顶 → 下一站。
2. **第三个沉浸场景**：数据驱动架构已验证可插拔（Exploration 接口 + 注册表），建议富士山（山岳世界复用）或火山主题。
3. **Elevation 剖面图**：探索页海拔轴已有数据，可加一条简洁 SVG 高程剖面（路线点标注），进一步服务「地理可视化」。
4. **图鉴词条富化**：为每条地点补真实图片（Wikimedia Commons 分包下载）替代 emoji Hero。
5. **成就系统**：`utils/summary.ts` 已有成就雏形，可扩展「探索过 3 类地貌」「收藏 5 个地点」等跨场景成就（localStorage 即可）。

---

## 附：提交清单（12 commits，语义化）

```
3e92241 docs(readme): 同步世界图鉴/收藏/详情页与测试数量
ce8cd4d fix(data): 知识库关联地点断链修复——喜马拉雅山脉条目补齐 + 引用完整性测试
eb9fe34 feat(knowledge+ui): 知识详情关联地点闭环 + 主视觉/路线图加载失败兜底
4c1cfa7 fix(ui-bus): 筛选参数改为显式消费——返回地图页不再重置用户已选类型
bb89c6a feat(exploration+map): 登顶总结「下一站」推荐闭环 + 图鉴卡收藏标记
4514b78 feat(profile+chore): 我的页收藏夹 + WXML 绑定一致性静态检查 + 清理调试代码
b317e52 feat(everest): 路线途经点介绍卡——点击营地显示名称/海拔/真实介绍
9762c7c fix(test): 页面测试类型修正
8df5135 test(pages): 首页/地图图鉴/地点详情页逻辑测试（mock wx/Page）
bebeb87 feat(home): 首页重设计——沉浸探索/精选目的地/按地貌探索/你知道吗
1f2dd24 feat(place+map): 地点详情页 + 地图页升级为「探索地图 + 世界图鉴」
059aedb feat(data): 重建地理图鉴数据层——48+真实地点/类型体系/收藏/冷知识
```
