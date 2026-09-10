# Gate 3.4 · Reconnaissance — Everest Expedition Core

> 状态：侦察完成 ✅（Do not modify ）｜ 前置：Gate 3.x 全部已交付
> 目标：把当前「静态珠峰探索页」升级为「可交互的攀登远征」——真实路线分段
> 推进、2.5D 地形路线场景、路线规划、相机推进、环境/攀登同步、里程碑事件。
> 产出本文档不包含任何代码改动；实现需等用户授权。

---

## 0. 一句话总结

现有代码库远比「重新发明」强：**真实 289 点路线 + RouteIndex 距离轴 + ExpeditionDriver
纯驱动 + 7 段阶段映射 + LIVE/TERRAIN 双视觉模式 + 校准路线 overlay** 已经全部就位。
Gate 3.4 的真正工作是**补齐链路下半段**：

- 攀登分段模型（阶段即段落，边界一律由 stageMap 派生，禁止手写距离）
- 路线规划器（段选 + 跳转到目标段 + 该段进出点）
- 2.5D 场景相机推进（`CameraConfig` 存在但未被消费；替换现 hand-coded zoom）
- TERRAIN 上的真实路线绘制（当前仅 LIVE 照片有 overlay；照片侧有校准 route[]）
- 里程碑事件与行程同步、攀登驱动（禁止 `progress += 10` 假进度）
- 单一攀登状态源（`ExpeditionDriver.deliverAtProgress` 已是唯一事实源）

**不做**：3D / Three.js / DEM 光照 / GPS 伪造 / 伪海拔。2.5D 为默认结论。

---

## 1. 现有架构（端到端管线，全部已存在）

```
data/routes/everest/south-col.ts  (289 控制点 + 8 里程碑；只读 JSON/TS 模块)
        │ buildRouteIndex()
        ▼
engine/route-index.ts  RouteIndex {totalDistanceM≈12,955.8, milestones[], 3 高程契约}
engine/expedition-stages.ts     7 段 STAGE_DEFS → buildStageMap()（边界全由 routeIndex 计算）
data/explorations/everest.ts     EVEREST：Exploration（知识/阶段/指标/气候/动画、视觉+text）
data/expeditions/everest.ts      EVEREST_EXPEDITION = EVEREST + ExpeditionAttachment
                                      (routeIndex/stageMap/camera/media/visualMode/…)
engine/expedition-driver.ts      driveAtProgress / driveAtDistance → ExpeditionDriveState
                                      (progress/distance/refM/demM/modelM/lat/lon/grade/stage/
                                       milestone current/prev/next/deathZone/atSummit)
engine/expedition-visual.ts      resolveExpeditionVisual：LIVE(scene) / TERRAIN(DEM)
                                      + resolveLiveOverlay(校准 route[] → 可渲染折线)
engine/route-calibration.ts      buildCalibratedLiveOverlay：真实照片上投影路线折线
engine/exploration-engine.ts     deriveState(海拔→环境/进度/知识/指标)
pages/exploration/index.{ts,wxml,wxss}  页面：摄取Legacy route / Expedition 双分支
```

关键点：**全部状态已经被纯驱动层产出**。页面不必实现任何新计算；只需要
「在哪些 UI 动作的驱动下，把驱动结果变得更可理解」。

---

## 2. 可复用系统（不重复造轮子）

| 系统 | 现状 | Gate 3.4 怎么用 |
| --- | --- | --- |
| `RouteIndex` + `driveAtProgress` | 单一路线里程轴（12,955.8m），海量插入，1 训练点 | **唯一进度事实源** |
| `buildStageMap` 7 段 (`stageMap`) | 边界来自 routeIndex；每段 `fromM/toM/fromProgressName/toProgressName` | 分段（段=第二节或更细，如冰瀑/西库/洛子面）用 stageMap 即可，无需新数据 |
| `RouteMilestoneSample[]`（首页、首通、里程碑） | 大本营/冰瀑/C1/C2/C3/C4/南峰/峰顶 | 里程碑事件触发条件；路线规划器目标点 |
| `resolveExpeditionVisual` + LIVE camera/asset + 校准 route[] | LIVE overlay 只有「照片+路线」，无 TERRAIN 重图路线 | TERRAIN / 背景照片路线 overlay 复用它 |
| `CameraConfig`（camera-a/b/c） | **已声明但页面未消费**（viewZoom 硬编码缩放） | 2.5D 相机推进目标：progress → segment → 相机 |
| `exploration-engine.deriveState` | 温度/气压/氧气/雪/风/雾/植被 | 攀登进度 → 环境实时同步 |
| `routePositionAt` / `currentRouteWaypoint` / `nextRouteWaypoint` | Gap 已死：距离 → 屏空间 | 2.5D 地形路线屏上 place marker of waypoints当前点 |
| `driveAtProgress(套 Segment)` | — | 规划「到某站 = driveAtD(distanceM=那段到M)」 |
| 知识节点 / quiz / discoveries | 既有 | 里程碑事件触发知识解锁 |

---

## 3. 问题所在 / 差距分析（当前状态 vs 目标）

| 编号 | 现状 | 差距 | 影响 |
| --- | --- | --- | --- |
| G-1 | 攀登只是「按钮 +360m + 单条 progress bar」 | 无分段、无规划和/或「当前阶段」「选段」 | 无法低摩擦规划 |
| G-2 | TERRAIN 路线无路线线条（只有 LIVE 照片 overlay 与板式） | TERRAIN 的 2.5D 表达缺真实路线/当前点/分段 | 2.5D 场景未成立 |
| G-3 | `CameraConfig` 已存在但页面用硬编码 `viewZoom.a/b/c` + step | 相机未按 progress 推进 | 缺“相机推进” |
| G-4 | 里程碑是否有事件/横幅？(syncExpeditionStage 已有 7 段横幅) | 峰顶/冰瀑/大本营/4700 等没有「事件」语义 | 里程碑事件体系 |
| G-5 | 环境推导（deriveState）已存在，但页面 route 分支是否调用它？ | 需要把不同环境中间值推到 EXP **视图** | 环境/攀登同步 |
| G-6 | `onViewRoute` 是占位（showModal） | 无路线规划器 | 规划器 |
| G-7 | `progress += 10` 型假进度在 `onStepUp` 中的按钮步进 | 步进是离散的 360m（真实但缺乏「攀登动画段执行」） | 段执行/预动画 |
| G-8 | `setData` 每 tick 差量（diff 机制存在，41 处 setData） | 需要把 diff 纪律落实给新增字段 | diff-only |
| G-9 | `route.position` etc. | 无 | — |

---

## 4. 设计决策（前置约束的结论）

- **2.5D 而非 3D**：无 Three.js/Mesh。基于「单视角叠加」的 2.5D = 场景照片/DEM + 相应用routeOverlay重投影；
  不引入真实 3D 投影、不引入光照。除非后续拍摄证据（本 Gate 不新增）。
- **单一状态源**：`driveAtProgress` 是唯一入口；页面行为全pass 到 `tickFrame → tickExpeditionFrame`。
  不得在页面内另外写一套海拔/进度/里程。
- **禁止假数据**：没有伪 GPS/伪海拔；`progress += 10` 之类一律禁止；目标段用 routeIndex 实际里程，不用手写。
- **no second progress**：场景覆盖用 stageMap，不另写 scene progress。
- **合规证据**：新数字/段信息都来自 routeIndex/stageMap/milestone/refM；不伪造实况。
- **performance**：diff setData；视图改变需防止 onSetData 循环。

---

## 5. 权威参考（Design Reference）

- **设计图集**:`design/reference/expedition-v2/`（01 首页探索 / 02 路线地图 / 03 进度 / 04 营地详情 / 05 路线概述 / 06 海拔环境 / 07 周遭 / 08 知识）
  指引：终极——路线地图 + 山体背景 + 路线叠层 + 阶段卡 + 进度 + 营地图鉴 + 下一步 CTA。
- **重要原则（ref. README）**：地形是第一视觉主体；HUD 是轻量 informatic overlay；勿做 dashboard。
- **完整 visual QA** 由 vision 子代理在实现阶段做（当前不可用 —— 状态: 限流不可调用，见 §8.2）。

---

## 6. 建议开发阶段（每个阶段含测试）

**Phase 1 —— 数据/引擎层（Node 纯，不碰页面）**

- `types/expedition.ts`：加 `ExpeditionSegmentPlan`（segment + from/to progress + start/end exact name + planner target）
- 可复用现有 `ComputedStage` 与 `RouteMilestoneSample`。
- 新增纯逻辑 `engine/expedition-planner.ts`：
  - `buildSegmentPlan(core)` —— 从 stageMap/里程碑派生「段计划数组」（不手写距离）；
  - `jumpTo(target)` —— 计算离 jump 目标最近的目标里程（`driveAtProgress` 原生支持）；
  - `planSummary(...)` -> 每段已完成/剩余里程。
- 新增 `engine/expedition-camera.ts`（纯）：
  - `resolveCamera(camera config, progress)` -> zoom/offset/asset；
  - 在 page 层把 `viewZoom.*` 改为按 segment + 目标推进（replaces hand-written zoom）。
- 新增 `engine/expedition-progress` helper：从 `driveSegment` 桥段分「目标段 → 目标 progress」。
- 该层测试：`tests/expedition-planner.test.ts` / `tests/expedition-camera.test.ts`（纯 Node，headless）。

**Phase 2: 页面状态机与攀爬司机（page 集成，不动样式）**

- 页面 `onStepUp/onStepDown` 改为 **driver-based段步进**：
  - 单步 = 目标「下一段边界到 progress」（真实里程），非 +360；
  - `onViewRoute` → 打开真规划器 sheet；规划器卡片 set 目标；
  - 新建 `tick` writer for "segmented climb": `targetProgress` 由 `plan.segmentToReach` 决定、`current` 递增不假跳。
- **环境/攀登同步**：`tickExpeditionFrame` 里调用 `deriveState` 拿温度/氧/风/雪 → 填入 HUD（新增差量 setData）。
- Page 测试：`tests/expedition-page-3.4.test.ts` mock wx，验证 ROUND.

**Phase 3 — 2.5D 场景 + 相机（可视化）**

- index.ts 填入 camera-ui（zoom）/overlay（按 TERRAIN 用 `routePositionAt` 重投影段折线；LIVE 复用现有 overlay）。
- WXML/WXSS：新增「terrain 2.5D scene 图层 (view + routeMask)」；规划器 bottom-sheet；
  里程碑条目分支（camp/danger .k/a）。
- render 测试（non 视觉） + headless 快照管道（`scripts/wechat-screenshot.cjs` 已存在）。

**Phase 4 —— 里程碑事件 + 知识钩子**

- `onExeditionMilestone`：越过某个带事件的里程碑（大本营离开/冰瀑/ C1/C2/C3/C4/南峰/峰顶/死亡区）→ 单次通知 + 知识钩子。
- 注入现有 discovery/knowledge 系统（不要新开一条平行体系）。

**Phase 5 —— UX 品格 + 收尾**

- controller：死区（`deathZone` 提示已有）、峰顶、计算打卡提醒。
- 持续对接 `renderExpeditionView` 的 diff 纪律（差量 patch）。
- 文档 + 注释。

**（未动）**：完全不动旧「非网关的 DEM 主视图 / 旧海拔轴 legacy tickLegacyFrame」（向后兼容不变）。

---

## 6. 测试计划（headless / 后台 全部）

| 套件 | 内容 | 运行 |
| --- | --- | --- |
| 新建 `tests/expedition-plan-3.4.test.ts` | plan 段数与 stageMap 一致; 边界单调; jump target 计算 | vite run |
| 新建 `tests/expedition-camera.test.ts` | camera zoom 随 progress 单调; segment bound 合规 | vite run |
| 存档 `expedition-page.test.ts` | 页面事件 mock; 规划 sheet 打开、目标选择后 target 变化（tickFrame 确认） | 现有模式 |
| `tests/gate33-recovery-require-regression` | build 后起步就使用 | 现有 |
| 全部现有套件 | 无回归（36 files） | — |
| 实际视觉 | `npm run wechat:screenshot`（需要微信 devtools/cli）或 headless chrome + MCP | 见 8 |

---

## 7. 验收清单（最终完成）

- [ ] 单一 climbing state 源（driver) 未出现第二套
- [ ] 2.5D 画面（TERRAIN 上真实路线）可
- [ ] route planner 端到端（浏览器状态或 real data）
- [ ] 相机随 progress 持续平滑
- [ ] 环境字段（temp/pressure/O2 wind）随进度同步
- [ ] milestone event 触发一次不再重复
- [ ] 无 `progress += 10`、手写距离、假海拔/GPS
- [ ] 无新增无 test 的引擎逻辑
- [ ] `git status` 只含计划内文件；dist 重新生成的提交策略
- [ ] 全冒烟 headless 测试 + 视觉 QA（vision） 或 有据可依 fallback
- [ ] GitHub Actions（若要求）见下一步

---

## 8. 环境与风险记录

- 8.1 **Vision 子代理不可调用**（`zhipu-vision/glm-4.6v-flash` 受限 429「访问量过大」两次）。
  当前将视觉/参考图分析标记为「待实现阶段执行时重试」；不阻塞存档层。
- 8.2 **WeChat DevTools 未探测到**（`cli.bat` 不在常见路径）→
  `(wechat-screenshot.cjs)` 需要 CLI 在运行；计划用 `artifcts/vision` 流程或 headless Chrome-preview（如需要）。
  不能假装已截图。
- 8.3 **摄像头资源**：`everest-view-a/b/c.jpg` 已在 `assets/world`。LIVE overlay 校准 → 一个场景
  （live-a）以外多为 REPRESENTATIVE / 未批准 → **生产不得画(LIVE 除外)**；
  TERRAIN 上画参考线用 `routePositionAt` 与 DRIVER 重投影，不违反「不做假路线」（否则只画正式校准）。
- 8.4 **GitHub Actions 现状**：远程仓库 **当前没有任何 workflow**（`GET /actions/workflows` → `total_count: 0`，
  `.github` 目录不存在）。用户末尾要求「提交并推送 → 验证 GitHub Actions 构建绿色」——
  **在交付阶段需要新增 `.github/workflows/ci`（typecheck + `npm test` + `npm run build`），推送后再查该 workflow 的 run 状态**。
  git push 已验证可用（SSH `Hi wuhanwoaini521!`）。

---

## 9. GOAL 文件

目标非过长，用本文件作侧记；将创建 `docs/GOAL_GATE_3_4_EVEREST_EXPEDITION_CORE.md`
（pi-goal 只引用该文件）。

---

## ✅ READY TO IMPLEMENT PHASE 1 — 等待授权

侦察结束。基于现有成熟架构，Phase 1（规划/相机纯逻辑层，不碰页面、不碰 WXML/WXSS）
可以在无风险地立刻启动；但依约定**我停下来等待用户授权**再写实现代码。

实在发问（确认用）：

- 是否授权 Phase 1 开始？
- 是否需要 tracon 把视觉代理限制挪出，或先试着用 headless chrome MCP 做参考对比？
