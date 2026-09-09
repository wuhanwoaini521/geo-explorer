# Gate 3.4 — Everest Expedition Core

> 当前结论：**NOT READY FOR HUMAN REVIEW**
>
> 代码与纯逻辑验证已完成；目标 WeChat 小程序的本次渲染截图未能取得，因此不能宣称 Phase 3 视觉通过。

## Goal

把 Everest 从静态背景 + HUD + 进度按钮，推进为由 canonical South Col Route 驱动的连续远征体验：路线、攀登、当前位置、相机、2.5D 地形、路线概览、环境和里程碑事件共享同一条进度事实源。

## Canonical Architecture

```text
South Col routeIndex
        ↓
driveAtProgress(progress)
        ↓
ExpeditionDriveState
   ├── HUD / environment
   ├── terrain marker
   ├── cameraFrameAt(progress)
   ├── route overview
   └── milestone / knowledge events
```

页面没有新增独立的 PlannerProgress、CameraProgress、TerrainProgress 或 PageProgress。海拔、位置和环境仍由 driver 派生；真实路线数据未修改。

## Phase 1 — Derived Engines

状态：**PASS（纯逻辑）**

- `expedition-planner.ts` 从 `stageMap` / `routeIndex` 派生段计划和目标，不手写距离。
- `expedition-camera.ts` 从 `CameraConfig + progress` 派生资源、缩放、偏移、focus 和段间平滑插值。
- `terrain-projection.ts` 从 canonical route 的 `x/y/demM` 生成 TERRAIN 静态几何和动态 marker；TERRAIN 明确标记为 schematic，不冒充校准像素定位。

## Phase 2 — Continuous Climb

状态：**PASS（页面逻辑与运动审计）**

- 攀登请求由真实 route distance 计算，`climbFrameAt` 是会话内唯一运动插值源。
- 攀登期间 `current` 与 `target` 同步，不再叠加第二层追赶平滑。
- arrived 只在实际位置已精确落到请求目标后成立。
- marker、camera、HUD 海拔和环境均消费同一帧的 effective progress。
- 里程碑跨越使用实际 driver distance，并按 expedition session 只触发一次；restart 才重置 ledger。

## Phase 3 — TERRAIN / 2.5D

状态：**IMPLEMENTED, VISUAL GATE PENDING**

### Terrain projection

- TERRAIN 路线由 `buildTerrainRouteGeometry(routeIndex)` 生成，静态路线 geometry 与动态 `terrainDynamicState` 分离。
- 静态几何只在视觉模式/路线上下文变化时重建；动态 marker 按运动 cadence 更新，避免被整数百分比冻结。
- WXML 路线图层与主 terrain 使用相同的 `camera.routeTransform`，避免路线和主地形脱钩。

### Marker and camera

- marker 使用 `routeSampleAtProgress` 的真实路线点投影。
- camera 使用 `cameraFrameAt(effectiveProgress)`；`offsetX/offsetY/focus` 也来自 `CameraConfig`，页面只负责归一化 UI 翻译。
- transform 保留小数像素，避免连续相机运动被量化成少数整数位置。

### Depth

- 采用自制的高质量珠峰远征主视觉作为全屏主背景，山体和冰川占据主体，消除旧 DEM 建模图的空蓝天与底部灰山问题。
- 路线与 marker 仍是独立动态图层，并与主视觉使用同一相机 transform；旧 A/B/C 分层资产不再作为 Everest 主场景渲染入口。
- 未引入 Three.js、WebGL 或其他大型运行时依赖。

### Visual review

本次已直接检查设计参考与 DEM 资产，但没有取得本次代码的 WeChat 渲染截图。`npm run wechat:screenshot` 连接 `ws://127.0.0.1:9420` 失败；脚本没有启动可见窗口。仓库中旧的 `artifacts/visual/current.png` 早于本次修改，未作为证据使用。

因此以下项目仍不能由当前运行自动判定：路线是否贴合新主视觉、marker 是否贴合路线、相机边界是否无视觉 pop、主图与动态路线组合是否自然、TERRAIN 配色是否保持 cinematic 而非 GIS/dashboard。

## Phase 4 — Route Overview and Events

状态：**逻辑已实现，依赖 Phase 3 视觉复核**

- `onViewRoute` 已从 canonical route 采样 elevation profile，并展示全程、里程碑、当前/未来路线信息。
- 营地/里程碑详情继续复用既有 knowledge/discovery 链路。
- milestone crossing、summit 和 restart 语义由页面测试覆盖。

## Performance Audit

代码内置 motion audit，验证以下关系：

- marker 更新次数显著高于整数百分比 cadence；
- camera 在运动期间持续更新；
- route geometry 在一次攀登中最多重建一次；
- 高频更新采用差量 `setData`，而非每帧重发整页静态数据。

定量断言已纳入 `tests/expedition-motion.test.ts`。尚未在目标 WeChat runtime 取得真实帧率、patch bytes/sec 或多 viewport 截图数据。

## Final Validation

- TypeScript：`npx tsc --noEmit -p tsconfig.json` ✅
- TypeScript script：`npm run typecheck` ✅
- Targeted Gate 3.4 tests：6 files / 50 tests ✅
- Full Vitest：33 files passed, 1 existing file skipped；365 tests passed, 2 skipped ✅
- Build：`npm run build` ✅
- Import check：`node scripts/check-dir-imports.mjs` ✅
- Require check：`node scripts/check-requires.mjs` ✅
- WeChat screenshot：未通过连接检查，非代码断言失败；需要已开启 automation 的 DevTools 服务 ❌

## Files Changed in Gate 3.4

- `miniprogram/engine/expedition-camera.ts`
- `miniprogram/engine/expedition-climb.ts`
- `miniprogram/engine/expedition-planner.ts`
- `miniprogram/engine/terrain-projection.ts`
- `miniprogram/types/expedition.ts`
- `miniprogram/data/expeditions/everest.ts`
- `miniprogram/pages/exploration/index.ts`
- `miniprogram/pages/exploration/index.wxml`
- `miniprogram/pages/exploration/index.wxss`
- `miniprogram/pages/home/index.ts`
- `miniprogram/pages/home/index.wxml`
- `miniprogram/assets/world/everest-expedition-hero-v1.png`
- `tests/expedition-camera.test.ts`
- `tests/expedition-climb.test.ts`
- `tests/expedition-motion.test.ts`
- `tests/expedition-planner.test.ts`
- `tests/terrain-projection.test.ts`
- `dist/miniprogram/**`（本次最终 build 同步产物）

## Git Scope

本次未执行 push、reset 或 clean unrelated files。已按功能分类创建 commit：

- `298eb52 feat(expedition): implement Gate 3.4 expedition core`
- `845b14d feat(home): use real Everest hero photo`
- 当前变更待创建：`feat(ui): add custom Everest expedition visual`

工作区原有的 `AGENTS.md`、`.pi/agents/vision-reviewer.md`、临时参考图及其他文档修改均未混入。

## Human Review Checklist

在 WeChat DevTools automation 可用后，至少补齐：

1. TERRAIN：Base Camp、Early climb/Icefall、C1/C2、South Col、Summit approach。
2. 动画序列：T0、起动、约 33%、约 66%、arrived/settled。
3. LIVE → TERRAIN、TERRAIN → LIVE、LIVE fallback、restart 的 stale route/marker/camera 检查。
4. 301×761、普通 iPhone、长屏 iPhone 和常见 Android 比例的 safe area / route visibility 检查。
5. 直接确认路线贴地、marker 贴线、深度自然、Everest 仍是第一视觉主体，且没有 GIS/dashboard 或 game-HUD 观感。

## Gate Status

**NOT READY FOR HUMAN REVIEW** — 阻塞项仅为目标 WeChat runtime 的本次视觉证据缺失。代码、测试、构建和纯逻辑性能审计已完成；补齐截图并完成直接视觉复核后，才能决定 Phase 3 / Gate 3.4 是否 PASS。

**NO COMMIT · NO PUSH**
