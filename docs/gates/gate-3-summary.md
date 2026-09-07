# Gate 3 · 珠峰探索页真实路线驱动（Main Expedition UI）

> 状态：已交付 ✅ ｜ 前置：Gate 2（数据层与纯逻辑改造）已确认 ｜ 后续：Gate 4–7

## 0. Gate 3 目标回顾

把 Gate 2 建好的**真实路线引擎**接进珠峰探索页，替换旧的「海拔 → 进度」虚拟路径：
用户滑动手势 → route progress（水平投影链长轴 0→1）→ `routeSampleAt` → HUD/场景驱动，
同时保持马里亚纳（Mariana，无 V2 附件）走旧海拔轴、完全向后兼容。

范围纪律（沿用用户确认语义）：
- **进度轴 = 水平投影链长 ~12,955.8 m**（非 3D 折线 ~14,310.9 m；3D 只作统计展示）。
- 峰顶 UI 统一 **8,848.86 m**；驱动层 `refM` 在 summit 被 clamp 到该值。
- 不做 CameraSegment / Three.js / 三维 DEM 投影 / 山峰识别 / 路线 overlay / 媒体清单（Gate 4–7）。
- 不做庆祝大弹窗；峰顶地形优先；死亡区只做克制的 UI 变化。

## 1. 架构：两级驱动 + 兼容兜底

```
探索页（pages/exploration）
├─ onLoad(id) → getExpeditionById(id)   （V2，真实路线）
│      └─ routeMode = true → 起驱动于南坡大本营（progress=0）
└─ 否则 getExplorationById(id) / fallback （V1 旧探索，原海拔轴不动）
     └─ routeMode = false → 沿用 tickLegacyFrame
```

- **纯逻辑 bridge**：`engine/expedition-driver.ts`（`ExpeditionCore` / `ExpeditionDriveState` / `driveAtProgress` / `driveAtDistance`），与上面路过的 render/physics 解耦，页面只拿「结果」，便于 Node 单测。
- **注册表**：`data/expeditions/index.ts` → `getExpeditionById(id)`，无则回退；`getExplorationById` 绝不返回 Expedition。
- 页面级唯一入口 `tickFrame()` 按 `routeMode` 分派：`tickExpeditionFrame()` / `tickLegacyFrame()`，共享「current 向 target 缓动、计时、知识解锁基线」语义。

## 2. 数据层（Gate 2 产物，本 Gate 消费）

- `data/routes/everest/south-col.json`：289 控制点 + 8 里程碑（**零手写距离**，Generator 脚本同步）。
- `data/expeditions/everest.ts`：`EVEREST_EXPEDITION = { ...EVEREST, type:"CLIMB", routeIndex, stageMap, camera, media, elevationPolicy, sources }`（组合不新建第二套顶层场景）。
- 7 段阶段（approach → khumbu-icefall → western-cwm → lhotse-face → south-col → death-zone → summit-push），边界全部来自 routeIndex 计算（start/end/milestone/cross-ref-m 四类合法来源）。

## 3. 引擎纯逻辑（Gate 2 产物，直接复用，无 schema 更改）

- `engine/route-index.ts`：buildRouteIndex（折叠重复点、单调递增保证、累计距离、升降统计）+ `routeSampleAt / referenceElevationAt / demElevationAt / modelElevationAt`（三类高程分离）。
- `engine/expedition-stages.ts`：buildStageMap / stageIndexAtDistance / findRefCrossing（约 8000 m 死亡区边界）。
- `engine/validate-expedition.ts`：完全校验（正/反例）。

## 4. 页面改造（本 Gate 主体）

**`index.ts`**
- 新增 driver 相关接口/类：`ExpeditionView`、`ExpeditionSummitView`、`emptyExpeditionView()`、`routeMode`、`expeditionCore`、`hudElevation`、`prevExpoStageIndex` 等。
- `tickFrame` 双分支：route 分支调用 `tickExpeditionFrame` → `driveAtProgress(core, current)`。
- `renderExpeditionView`：差量推送 expedition HUD（进度/当前站/下一站/剩余里程/垂直差/阶段/环境三指标/死亡区/峰顶）。
- `syncExpeditionStage`：七段首过记录 + 克制横幅（与 legacy 同语义：intro 阶段不弹）。
- `onExpeditionSummit`：仅轻提示（8,848.86 + 坐标 + “你已抵达世界最高点”），**不置位** `data.summit` / `data.celebration`；仍落盘记录（`persistProgress`）。
- `onViewRoute`：路线全景占位（Gate 4+ 视觉延后）。
- 手势/按钮：`onTouchMove / onStepUp / onStepDown` 在 route 分支以 `ROUTE_STEP_METERS / totalDistanceM` 换算为 progress 步进；`onRestart` 全维重置（current/target/lastElev/hudElevation/highestReached/expSummit/expDeathZone/visitedStageIds）。

**`index.wxml`**
- 顶部 `<block wx:if="{{routeMode}}">` 内含新路线 HUD（顶部标题、底 30% 面板：位置/距顶剩余/路线进度条/上下站/阶段+环境/阶段简介/死亡区提示/底部三按钮/峰顶轻提示）。
- 旧集群（hud-top / stage-card / route-status / progress-row / controls / rail / scene-route / summit-route-finish）统一加 `!routeMode` 遮蔽；hint（知识解锁）双模式共用。

**`index.wxss`**
- `.exp-*` 暗色限定面板（Terrain First ~70/30），`.exp-death` 死亡区变体（降饱和 + 细红描边），`.exp-summit-pill` 克制卡片；`.route-mode .hint` 上移到面板上方。

## 5. 测试（新增 + 全量回归）

| 文件 | 条数 | 覆盖 |
|---|---|---|
| `tests/expedition-driver.test.ts` | 19 | 纯 driver：progress 0/1、summit 8848.86、死亡区边界、7 段边界、nextGap、Mariana 兼容基础 |
| `tests/route-index.test.ts` | 11 | RouteIndex 构建 / 单调 / 累积 / 投影 / 里程碑 |
| `tests/expedition-v2.test.ts` | 10 | 组合对象完整性 / 三类高程 / 校验器 |
| `tests/expedition-page.test.ts`（**新增**） | 9 | 页面接线：routeMode 开起、起点 HUD、中程 current/next/剩余、死亡区 O₂ 压文、七段横幅、登顶 8,848.86 + 轻提示 + 无庆祝标志、重制、ViewRoute toast、Mariana fallback |

全量：`20 files / 245 条全绿`（Gate 2 末 217 → +28）。

## 6. 验证（环境限制说明）

无真微信开发者工具 GUI（无截图/模拟器预览）。链路为：
1. `npx tsc --noEmit`（零错误）；
2. `npm run build`（tsc 编译 + `copy-assets` 44 项资源入 `dist/miniprogram`）；
3. `npm test` 245 条全绿；
4. WXML↔TS 静态绑定审计（`tests/ui-bindings.test.ts`：exploration page 全部 bind handlers 均存在于 page def；8 pages + 1 component 断言不破）；
5. WXML 标签平衡校验（view/text/block/button 开闭计数一致）。

## 7. 语义落实确认

- [x] 真实路线轴：progress 0–1 ↔ 2D 链长 12,955.8 m；3D 距离仅统计（不在 HUD 主路径）。
- [x] 峰顶统一 8,848.86 m：`drive.summitRefM`/`drive.refM`（summit）均 clamp 到 core.maxElevation=8848.86；不出现数据集 ref 8849 / DEM 8709。
- [x] 三类高程分离：HUD 位置 = refM（REFERENCE 标记）；压力/氧/温度 = modelM（MODEL 标记）；地形几何 demM 仅留投影。
- [x] 死亡区：ref≥8000 且未到顶 → `expDeathZone`、氧气文案 `≤30%`、低对比面板，不弹窗/不震屏。
- [x] 峰顶：progress=1 → 8,848.86 + 坐标 + “你已抵达世界最高点”，无庆祝大弹窗；`data.summit/celebration` 恒 false。
- [x] Mariana 兼容：`routeMode=false` → 原 ticker/海拔轴路径不动，全量回归通过。
- [x] 环境指标：压力/氧气/温度 + MODEL/REFERENCE 标记。

## 8. 变更文件清单

**新增**（Gate 3 涉及）
- `miniprogram/engine/expedition-driver.ts`
- `miniprogram/data/expeditions/index.ts`
- `tests/expedition-page.test.ts`

**修改**
- `miniprogram/pages/exploration/index.ts`（双模式 tickFrame / renderExpeditionView / summit / 手势 / 重启）
- `miniprogram/pages/exploration/index.wxml`（route-mode HUD block + legacy 遮蔽）
- `miniprogram/pages/exploration/index.wxss`（`exp-*` 样式）

**复用（Gate 2，无再改）**：route-index / expedition-stages / validate-expedition / south-col.json / expeditions 组合对象 / 相关测试。

## 9. 入口路径现状

- 探索页：`pages/exploration/index?id=everest`（地图/home/place 周边卡片 → navigateTo）。
- 珠峰 V2：`getExpeditionById('everest')` → `EVEREST_EXPEDITION`（真实路线驱动）。
- 马里亚纳：`getExplorationById('mariana')`（无附件 → V1 海拔轴）。