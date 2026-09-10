# Gate 3.4 — Everest Expedition Core

> Long-running autonomous implementation goal  
> Repository: `geo-explorer`  
> Primary principle: **Do not optimize the screenshot. Build the expedition.**

---

## 1. Mission

当前 Everest 页面已经完成 Gate 3.3 系列的基础视觉建设。

现阶段拥有：

- Everest 实景 / Terrain 基础视觉
- HUD
- 海拔 / 环境数据
- 路线百分比
- LIVE / TERRAIN visual mode
- South Col 真实路线数据
- ExpeditionDriver
- DEM
- CameraConfig
- Knowledge / Discovery / Quiz 等既有系统

但是产品核心体验仍然不足。

当前页面本质上仍然接近：

```text
Everest background
+
HUD
+
progress bar
+
buttons
```

而不是：

```text
real expedition route
+
continuous climbing
+
terrain position
+
camera progression
+
route planning
+
environment transition
+
milestone events
+
spatial understanding
```

Gate 3.4 的目标不是继续微调 UI。

Gate 3.4 必须把 Everest 从：

> 静态山峰展示页

升级为：

> 用户能够明确感觉“我正在沿珠峰南坡路线向上攀登”的交互式 Expedition Experience。

---

## 2. Product North Star

最终用户必须明显感受到：

```text
我现在在珠峰的什么位置
        ↓
我刚刚从哪里爬过来
        ↓
我正在沿哪一段路线移动
        ↓
下一个节点是什么
        ↓
前面的地形与风险是什么
        ↓
海拔、环境和视角随着攀登持续变化
        ↓
最终沿 South Col Route 抵达峰顶
```

每一次：

```text
攀登
```

都必须推动整个 Expedition World State 向前。

不能只是：

```text
点击
↓
数字变化
↓
progress bar 跳一下
```

---

## 3. Governing Policy

开始任何工作前必须阅读：

```text
AGENTS.md
```

如果存在，视为 repository governing policy。

同时阅读：

```text
docs/
docs/gates/
design/reference/expedition-v2/
design/reference/expedition-v2/README.md
```

以及当前：

```text
miniprogram/pages/exploration/
miniprogram/engine/
miniprogram/data/
miniprogram/components/
tests/
```

禁止为了完成 Gate 3.4 顺手重构无关模块。

禁止未经必要性证明的大规模 rewrite。

禁止自动 push。

禁止：

```bash
git add .
```

禁止为了让 workspace 看起来干净而提交无关文件。

---

## 4. Autonomous Execution Mode

这是一个长时间运行 Goal。

用户可能已经离开电脑。

因此：

### 不要在每一个 Phase 完成后等待人工授权。

正常情况下：

```text
Phase 1
↓
validate
↓
Phase 2
↓
validate
↓
Phase 3
↓
validate
↓
Phase 4
↓
validate
↓
Phase 5
```

连续自动推进。

每个阶段必须：

```text
update todo
run relevant tests
inspect git diff
confirm scope
continue
```

只有出现真正的架构级 blocker 时才允许停止等待人工确认。

---

## 5. Mandatory Stop Conditions

仅在以下情况停止：

### Architecture

需要：

```text
替换 ExpeditionDriver
```

或：

```text
重写 south-col.ts canonical route
```

或：

```text
建立第二套 canonical progress / altitude / GPS 状态
```

### Technology

准备引入大型：

```text
Three.js
WebGL framework
3D engine
GIS engine
```

或其他明显增加 bundle / runtime complexity 的核心依赖。

### Data

准备：

```text
修改真实 South Col 路线事实
修改 canonical coordinates
修改 canonical altitude
修改 route geometry
```

且无法证明来源。

### Existing Features

准备：

```text
删除 Gate 2 / Gate 3 已有能力
重写 LIVE mode
重写 Discovery / Knowledge 核心逻辑
大规模修改 Mariana
```

### Git

发现：

```text
大量与 Gate 3.4 无关 tracked changes
```

无法安全隔离。

### Safety

测试表明新实现：

```text
严重破坏现有功能
性能明显不可接受
微信小程序 runtime 无法支持所选方案
```

除此之外：

**不要停。**

---

## 6. Installed Pi Capabilities

当前环境安装：

```text
pi-web-access
pi-mcp-adapter
@juicesharp/rpiv-todo
pi-subagents
pi-lens
@narumitw/pi-goal
```

Gate 3.4 应主动利用这些能力。

但：

> 不得猜插件命令。

如果不知道插件调用方式：

先查看已加载 help / docs / commands。

---

## 7. Global Concurrency Limit

模型服务的硬限制：

```text
MAX MODEL CONCURRENCY = 6
```

这是硬上限。

任何时刻所有 Agent / Subagent / Vision / Reviewer 模型请求总和：

```text
<= 6
```

### Main Agent Reservation

主 Agent / Coordinator 默认占用：

```text
1 slot
```

因此：

```text
MAX PARALLEL SUBAGENTS = 5
```

禁止：

```text
Main Agent
+
6 Subagents
=
7 concurrent requests
```

### Required Scheduler Rule

始终采用：

```text
1 coordinator
+
maximum 5 active subagents
```

如果一个 subagent 完成：

再启动等待队列中的下一个。

使用：

```text
bounded worker pool
```

思路，而不是无上限 fan-out。

### Vision Special Limit

`vision-reviewer`：

```text
MAX CONCURRENT VISION REVIEWER = 1
```

即使全局仍有剩余并发槽，也不要同时启动多个 Vision 请求。

原因：

- Vision 请求成本较高
- 避免 provider burst
- 避免再次触发 429
- 更容易得到稳定视觉判断

---

## 8. Vision Model

当前 Vision pipeline 已经过真实图片 smoke test。

使用：

```text
vision-reviewer
→ opencode-go/deepseek-v4-flash-vision-exp
```

已验证：

```text
image input PASS
```

不要继续等待：

```text
glm-4.6v-flash
```

不要因为旧报告中的 GLM 429 再次阻塞 Gate。

---

## 9. Vision Responsibility

Vision Reviewer 负责：

```text
composition
visual hierarchy
terrain realism
route readability
marker readability
spatial depth
2.5D quality
motion continuity
camera perception
visual defects
whether experience feels like climbing
```

Vision Reviewer 不负责权威测量：

```text
exact px
exact viewport
exact bbox
exact %
safe-area geometry
performance numbers
```

这些由：

```text
Chrome DevTools MCP
screenshot tooling
programmatic measurement
WeChat DevTools
```

负责。

规则：

```text
numeric fact
→ measurement wins

perceptual visual quality
→ vision reviewer
```

---

## 10. Existing Architecture Findings

Gate 3.4 reconnaissance 已确认：

### South Col Route

已有：

```text
south-col.ts
```

包含约：

```text
289 route control points
```

以及：

```text
Base Camp
Khumbu Icefall
C1
C2
C3
C4 / South Col
South Summit
Summit
```

等里程碑。

总路线约：

```text
12,955.8 m
```

以仓库实际 canonical data 为准。

### ExpeditionDriver

已有：

```text
ExpeditionDriver.driveAtProgress(...)
```

能够派生：

```text
progress
distance
refM
demM
modelM
lat/lon
grade
stage map
current milestone
previous milestone
next milestone
death zone
summit
```

这是 Gate 3.4 最重要的架构事实。

---

## 11. Canonical Source of Truth

强制原则：

```text
South Col Route
      ↓
route progress
      ↓
ExpeditionDriver.driveAtProgress()
      ↓
Canonical Drive State
      │
      ├── HUD
      ├── Environment
      ├── Camera
      ├── Route Scene
      ├── 2.5D
      ├── Route Planner
      └── Events
```

---

## 12. Forbidden Architecture

禁止出现：

```text
ExpeditionDriver progress

Planner progress

Camera progress

Terrain progress

Page progress

HUD altitude

Route altitude
```

各自维护一套状态。

禁止创建新的第二套：

```ts
{
  progress,
  altitude,
  lat,
  lon,
  stage,
  currentNode,
  nextNode
}
```

并手工同步。

如果 ExpeditionDriver 已经可以推导：

必须复用。

---

## 13. Core State Rule

Canonical movement variable 应当是：

```text
route distance
```

或：

```text
normalized route progress
```

取决于现有 Driver API。

Altitude 是结果。

不是控制量。

正确：

```text
route progress
      ↓
route geometry
      ↓
ExpeditionDriver
      ↓
altitude
```

错误：

```text
altitude += 360
```

错误：

```text
progress += 10%
```

错误：

```text
goToNextStage()
```

作为基本攀登模型。

---

## 14. Stage Boundary Rule

Stage Boundary 是：

```text
event
```

不是：

```text
movement unit
```

用户不应该：

```text
点击攀登
↓
瞬移到下一个 Camp
```

正确：

```text
progress continuously moves
        ↓
route continuously moves
        ↓
cross milestone
        ↓
milestone event fires
```

---

## 15. Pi Goal

如果当前 Goal 尚未注册：

使用：

```text
docs/GOAL_GATE_3_4_EVEREST_EXPEDITION_CORE.md
```

作为完整 Goal 内容。

Goal 应持续到：

```text
READY FOR HUMAN REVIEW
```

而不是完成一个子阶段就结束。

---

## 16. Todo Management

必须使用：

```text
@juicesharp/rpiv-todo
```

维护长期任务。

建议结构：

```text
Gate 3.4
│
├── Reconnaissance
│   ├── repository architecture
│   ├── route architecture
│   ├── rendering research
│   └── vision research
│
├── Phase 1
│   ├── planner derived model
│   ├── camera derived model
│   └── tests
│
├── Phase 2
│   ├── continuous climb target
│   ├── animation driver
│   ├── environment sync
│   └── milestone crossing
│
├── Phase 3
│   ├── terrain projection
│   ├── route rendering
│   ├── marker
│   ├── camera movement
│   └── 2.5D scene
│
├── Phase 4
│   ├── route overview
│   ├── elevation profile
│   ├── node inspector
│   ├── knowledge
│   └── discovery
│
└── Phase 5
    ├── motion QA
    ├── vision QA
    ├── performance
    ├── docs
    └── final validation
```

不要创建几十个没有层级的平铺任务。

---

## 17. Subagent Strategy

使用：

```text
pi-subagents
```

但遵守：

```text
MAX 5 parallel children
```

---

## 18. Recommended Subagent Roles

允许根据实际需要复用或调整角色。

### Repository Architect

职责：

```text
检查 canonical architecture
检查 duplicate state
review route/driver integration
review boundaries between engines
```

### Rendering Engineer

职责：

```text
TERRAIN
2.5D
Canvas
CSS transforms
WebGL feasibility
projection
performance
```

### Interaction Designer

职责：

```text
climb motion
camera progression
marker movement
arrival motion
route planner UX
```

### Route / Data Reviewer

职责：

```text
south-col route integrity
route segmentation
milestone consistency
elevation profile
data provenance
```

### QA Reviewer

职责：

```text
tests
regression
event correctness
performance
edge cases
```

### Vision Reviewer

职责：

```text
visual quality
terrain depth
route attachment
camera perception
motion continuity
```

Model：

```text
opencode-go/deepseek-v4-flash-vision-exp
```

始终单线程：

```text
1 vision request at a time
```

---

## 19. Subagent Scheduling

推荐批次：

```text
Batch A

Repository Architect
Rendering Engineer
Interaction Designer
Route Reviewer
QA Reviewer
```

最多：

```text
5 subagents
```

Main Agent 保留：

```text
1 slot
```

总计：

```text
6
```

Vision Reviewer 不要和大批 Vision 请求一起 fan-out。

Vision 检查按：

```text
one visual state
→ review
→ next state
```

或少量序列进行。

---

## 20. pi-lens Policy

使用：

```text
pi-lens
```

进行：

```text
diff review
code review
test review
possible regressions
```

但是：

不得允许 pi-lens 自动修改无关文件。

如果 deferred format 涉及：

```text
temporary probes
third-party files
node_modules
unrelated source
```

排除。

持续检查：

```bash
git status --short
git diff --stat
```

---

## 21. MCP Policy

使用：

```text
pi-mcp-adapter
```

检查已有 MCP。

如果存在：

```text
chrome-devtools
browser
filesystem
```

可用于：

```text
layout measurement
screenshots
console
runtime debugging
performance inspection
```

普通 Chrome reproduction 是辅助验证。

最终微信小程序体验仍需：

```text
WeChat DevTools
```

人工签核。

---

## 22. Phase 1 — Derived Architecture

目标：

> 不改 canonical state，只建立下游消费能力。

### 22.1 Planner

如有必要创建：

```text
engine/expedition-planner.ts
```

它只能负责：

```text
route overview
segment summaries
remaining route
milestone summaries
elevation profile data
node inspection view model
```

输入：

```text
South Col route
+
ExpeditionDriver state
```

输出：

```text
Planner View Model
```

禁止：

```text
plannerProgress
plannerAltitude
plannerCurrentPosition
```

成为独立状态。

### 22.2 Camera Engine

如有必要创建：

```text
engine/expedition-camera.ts
```

职责：

```text
progress
+
stage map
+
CameraConfig
↓
camera view state
```

输出例如：

```text
zoom
offsetX
offsetY
focus
crop
scene
```

Camera 不维护 progress。

---

## 23. Existing CameraConfig First

侦察确认已有：

```text
camera-a
camera-b
camera-c
```

但当前页面：

```text
viewZoom
```

仍有硬编码。

必须优先消费已有 CameraConfig。

先证明：

```text
Base Camp
→ mid mountain
→ high altitude
→ summit
```

可以形成连续 camera progression。

只有确实不够：

才允许最小扩展 camera keyframes。

---

## 24. Phase 1 Tests

至少覆盖：

```text
planner derived from canonical route
current milestone
next milestone
remaining route
elevation profile
camera interpolation
camera boundary
no duplicate progress state
```

Phase 1 完成后：

```bash
npx tsc --noEmit
npx vitest run
```

根据 repo 实际 scripts 补充其他检查。

如果全部通过：

自动进入 Phase 2。

---

## 25. Phase 2 — Continuous Climb Engine Integration

这是 Gate 3.4 核心。

当前 legacy：

```text
+360m
```

必须被 route-based movement 替代。

---

## 26. Climb Action

目标流程：

```text
user taps 攀登
        ↓
requestClimb()
        ↓
resolve target route progress
        ↓
animate progress
        ↓
ExpeditionDriver.driveAtProgress()
        ↓
derive real position / altitude / stage
        ↓
minimal UI update
        ↓
detect milestone crossing
        ↓
camera settle
        ↓
event
```

函数名按现有代码风格决定。

不要机械照抄。

---

## 27. Climb Target

攀登目标必须基于：

```text
route distance
```

或：

```text
route progress delta
```

不得基于：

```text
fixed altitude
fixed percentage
next stage
next camp
```

---

## 28. Continuous Movement

例如概念：

```text
start progress = 0.183
target progress = 0.201
```

在：

```text
~800ms - 1800ms
```

范围内平滑推进。

实际时长根据：

```text
distance
motion quality
performance
```

决定。

禁止为了动画每 16ms 全量 setData。

---

## 29. Animation State

至少表达：

```text
idle
climbing
settling
arrived
summit
```

不要求重新设计 canonical Expedition State。

这可以是：

```text
UI interaction state
```

而不是另一个 route state。

---

## 30. Visual Motion

Climb 期间至少同步：

```text
route marker
route line
camera
altitude
environment
distance
current stage
```

但视觉主次：

```text
marker + camera + terrain
```

优先。

不能所有数字同时疯狂跳。

---

## 31. Altitude Tween

Altitude 显示可以 tween。

但 tween 值必须来自：

```text
ExpeditionDriver.driveAtProgress(progress)
```

而不是：

```text
UI interpolation between arbitrary numbers
```

---

## 32. Environment

继续使用既有：

```text
exploration-engine.deriveState(...)
```

以及现有：

```text
pressureAt
vegetationAt
terrainGradient
```

等能力。

不得再创建第二套环境公式。

---

## 33. Milestone Crossing

假设：

```text
progress A
→
progress B
```

跨过一个 milestone。

必须产生：

```text
milestone crossed
```

event。

如果一次 movement 跨多个 milestone：

必须正确处理。

不允许漏掉。

---

## 34. Event Once Rule

同一个 milestone：

```text
discovery
knowledge
achievement
```

不得重复触发。

测试：

```text
event fires once
```

必须存在。

---

## 35. Step Down / Retreat

如果已有：

```text
下撤
```

保持功能。

Architecture 必须允许：

```text
route progress reverse
```

但 Gate 3.4 不需要构建复杂求生 simulation。

---

## 36. setData Performance Rule

禁止：

```text
requestAnimationFrame
→
setData(full page state)
```

优先研究：

```text
CSS transforms
Canvas
WXS
局部 setData
controlled animation ticks
```

具体方案由 Rendering Engineer 结合现有架构决定。

必须记录最终策略。

---

## 37. Phase 3 — TERRAIN / 2.5D Expedition Scene

这是第二个核心阶段。

侦察确认：

```text
LIVE
→ route overlay already exists

TERRAIN
→ canonical route not properly rendered
```

必须补齐。

---

## 38. Projection Architecture

必须形成：

```text
Canonical South Col Route
        ↓
Projection Layer
        │
        ├── LIVE calibrated projection
        │
        └── TERRAIN / 2.5D projection
```

两种模式：

可以使用不同 projection。

但必须共享：

```text
same route
same progress
same position
same milestone
```

---

## 39. Forbidden Route Rendering

禁止：

```text
markerX += 5
markerY -= 8
```

禁止：

```text
根据 altitude 猜 Y
```

禁止把路线 canonical data 写成：

```text
x: 148px
y: 300px
```

---

## 40. Correct Route Rendering

关系：

```text
current progress
      ↓
canonical route point
      ↓
projection
      ↓
screen position
      ↓
marker
```

---

## 41. Normalized Visual Projection

如果 TERRAIN 是艺术化 2.5D 而不是 GIS 视角：

允许：

```text
normalized visual control points
```

但必须明确属于：

```text
projection layer
```

不是：

```text
canonical route data
```

例如：

```text
Route fact
↓
Projection calibration
↓
normalized x/y
```

而不是：

```text
Route fact = x/y
```

---

## 42. 2.5D Definition

Gate 3.4 不接受：

```text
background image
+
two mountain layers
+
parallax
```

就宣称：

```text
2.5D DONE
```

---

## 43. 2.5D Minimum Quality

必须同时具备：

```text
foreground
midground
background
terrain depth
route attached to terrain
marker attached to route
camera progression
altitude-linked visual progression
```

否则只是：

> parallax wallpaper

---

## 44. Suggested Layer Model

可参考：

```text
Sky
↓
Far Himalaya
↓
Main Everest massif
↓
Route terrain
↓
Foreground ridge / ice
↓
Atmosphere
↓
Route
↓
Current marker
```

具体实现由 Rendering Engineer 决定。

---

## 45. Camera

Camera 至少控制：

```text
translateX
translateY
zoom
focus
crop
```

可以不是真 3D camera。

但视觉效果必须让用户潜意识感受到：

```text
向山上推进
```

---

## 46. Camera Motion

禁止：

```text
每次攀登突然 zoom 30%
```

应：

```text
subtle
continuous
directional
```

---

## 47. Route Visual States

路线至少区分：

```text
completed
active
future
```

推荐视觉：

```text
completed
→ restrained cyan

active
→ stronger cyan / white accent

future
→ low-opacity blue/white
```

不要整条 neon 发光。

---

## 48. Marker

Marker 应：

```text
white core
cyan border
small glow
subtle idle pulse
```

攀登时：

```text
pulse stops
movement becomes primary
```

Marker 必须看起来：

> 在山上。

不能像：

> HUD overlay 上的图标。

---

## 49. Phase 3 Vision QA

完成第一版 2.5D 后：

自动生成至少以下状态截图：

```text
Base Camp
mid-route
C2
South Col
summit approach
```

依次交给：

```text
vision-reviewer
```

不要五个 Vision 同时并发。

---

## 50. Vision Questions

每一个状态检查：

```text
Is Everest still the main visual subject?

Is there obvious spatial depth?

Does the route appear attached to terrain?

Does the marker appear located on the route?

Does the camera imply upward movement?

Does the scene feel like a world rather than a background?

Does it look like a CSS demo?

Does it look like a game HUD?

Does it look like a navigation app?
```

---

## 51. Vision Rejection Criteria

以下任意明显存在：

```text
flat
cardboard
floating route
floating marker
arbitrary curve
wallpaper parallax
game HUD
dashboard
map navigation look
```

不能宣称 Phase 3 视觉完成。

优先修核心视觉模型。

不要增加装饰掩盖问题。

---

## 52. Motion QA

至少生成 / 检查：

```text
T0 before climb
T1 movement start
T2 mid-climb
T3 near target
T4 settled
```

Vision Reviewer 检查：

```text
marker direction
camera direction
terrain movement
altitude progression
continuity
arrival feeling
```

---

## 53. Phase 4 — Expedition Route Overview

现有：

```text
查看路线
```

不能只打开普通 list。

它应该升级成：

> Expedition Route Overview / Inspector

不是：

> path-finding planner。

---

## 54. No Pathfinding

不要实现：

```text
A*
Dijkstra
custom route selection
```

South Col 是固定 expedition route。

Gate 3.4 主要目标：

```text
理解路线
理解高度
理解当前点
理解未来节点
```

---

## 55. Route Overview

至少展示：

```text
South Col Route
current location
completed route
active segment
future route
milestones
summit
```

路线视觉必须是主角。

节点 list 只是辅助。

---

## 56. Elevation Profile

既然已有约：

```text
289 route points
```

Elevation Profile 必须由 canonical route 派生。

不得手绘 fake curve。

允许：

```text
visual smoothing
```

但数据来源必须真实。

---

## 57. Elevation Profile State

至少表达：

```text
visited
current
future
```

以及当前：

```text
altitude
route distance
progress
```

---

## 58. Route Node Inspector

点击 milestone 可查看：

```text
name
altitude
terrain
risk
environment
description
knowledge
```

保持简洁。

---

## 59. Knowledge Integration

Knowledge 应与：

```text
RouteNode
```

或：

```text
RouteSegment
```

关联。

例如：

```text
Khumbu Icefall
→ moving glacier

Western Cwm
→ solar radiation

Lhotse Face
→ steep ice / fixed ropes

South Col
→ death zone

Summit
→ atmospheric pressure
```

不要随机弹。

---

## 60. Discovery Integration

现有 Discovery 功能继续复用。

关系：

```text
progress
↓
milestone / segment
↓
discovery
```

不是随机独立白卡。

视觉上融入 Expedition HUD。

---

## 61. Existing Visual Language

必须保留 Gate 3.3 已接受视觉：

```text
Everest primary
dark cinematic HUD
cyan route accent
white typography
minimal glass
lightweight overlays
```

---

## 62. Do Not Turn It Into

禁止重构成：

```text
RPG
mobile game
fitness app
dashboard
navigation app
weather app
```

目标：

```text
interactive expedition documentary
+
terrain storytelling
+
route visualization
```

---

## 63. Reference Images

使用：

```text
design/reference/expedition-v2/
```

作为：

```text
visual language
hierarchy
tone
density
camera inspiration
route language
```

但不要：

```text
pixel-match screenshot
```

Gate 3.4 必须超越 reference 的静态能力。

---

## 64. Research Tools

使用：

```text
pi-web-access
```

研究可借鉴体验。

可研究：

```text
Relive route animation
Google Earth storytelling
Strava elevation
Garmin elevation profile
Mapbox terrain
Cesium terrain storytelling
ski trail visualization
mountaineering trackers
```

只研究：

```text
interaction principles
route readability
camera
terrain storytelling
```

不要照搬 UI。

---

## 65. Full 3D Evaluation

允许评估：

```text
CSS layered 2.5D
Canvas 2D
WebGL
Three-compatible solution
Hybrid
```

比较：

```text
visual quality
performance
bundle size
compatibility
complexity
maintainability
```

默认优先：

```text
high-quality 2.5D
```

而不是为了“3D”三个字增加巨大风险。

---

## 66. Full 3D Stop Rule

如果要正式引入大型 WebGL / 3D dependency：

触发 Mandatory Stop。

先报告：

```text
why 2.5D insufficient
expected gain
bundle impact
runtime impact
compatibility
fallback
```

等待人工确认。

---

## 67. Phase 5 — QA

完成核心体验后统一做：

```text
logic QA
motion QA
visual QA
performance QA
responsive QA
fallback QA
```

---

## 68. Logic Tests

至少覆盖：

```text
route boundaries
progress interpolation
distance interpolation
altitude derivation
current milestone
next milestone
milestone crossing
multiple milestone crossing
summit
reverse progress
event fires once
planner derived state
camera interpolation
projection boundaries
```

---

## 69. Responsive QA

至少：

```text
301x761 reference viewport
normal iPhone
long-screen iPhone
common Android ratio
```

检查：

```text
WeChat capsule
safe area
bottom home indicator
route visibility
planner
```

---

## 70. LIVE Fallback

Vision / visual regression 必须覆盖：

```text
LIVE available
LIVE unavailable
TERRAIN
Route Overview
```

fallback 不能像：

```text
broken image
blank placeholder
```

---

## 71. Performance

必须关注：

```text
initial load
animation smoothness
setData volume
image memory
bundle size
Canvas cost
WebGL cost if any
```

不得出现：

```text
per-frame full state setData
huge transparent PNG spam
dozens of unnecessary moving DOM nodes
```

---

## 72. Validation Baseline

当前 reconnaissance baseline：

```text
28 test files
324 passed
2 skipped
```

后续结果不得低于 baseline，除非测试数量因合理新增而增加。

---

## 73. Required Validation

每个 major phase：

至少执行相关：

```bash
npx tsc --noEmit
npx vitest run
```

最终：

```bash
npx tsc --noEmit
npx vitest run
npm run build
```

并执行仓库现有其他 validation scripts。

---

## 74. Continuous Git Hygiene

每个 Phase 完成后执行：

```bash
git status --short
git diff --stat
git diff --name-only
```

检查：

```text
scope contamination
generated noise
tooling noise
temporary artifacts
```

不要等到最后出现 100 个文件再清理。

---

## 75. Temporary Files

所有：

```text
probe
screenshot
frame
pixel analysis
temporary HTML
temporary Python
debug artifacts
```

必须放：

```text
.gate3tmp/
artifacts/visual/
OS temp
```

不得污染正式 source。

---

## 76. Dist Policy

如果：

```text
dist/
```

是 tracked artifact：

开发过程中尽量不要反复加入 diff。

源代码稳定后：

```bash
npm run build
```

最后统一重新生成。

---

## 77. GitHub Actions

Reconnaissance 发现当前：

```text
.github/workflows
```

不存在。

这是有效发现。

但：

> CI 不是 Gate 3.4 核心 blocker。

不要因为没有 GitHub Actions 阻塞：

```text
route
climb
2.5D
camera
planner
```

如果时间充足并且核心 Gate 已完成：

可以准备独立：

```text
chore(ci)
```

方案。

但不要自动 push。

---

## 78. Commit Policy

当前目标不是边开发边 commit。

最终先到达：

```text
READY FOR HUMAN REVIEW
```

建议最终 commit scope：

```text
feat(expedition): derived route planner and camera

feat(exploration): continuous Everest climb experience

feat(terrain): route-aware 2.5D Everest scene

feat(route): expedition route overview and elevation profile

test(expedition): climb route camera projection contracts

docs(everest): Gate 3.4 architecture and acceptance

build: resync miniprogram dist
```

根据真实 diff 合理合并。

不要为了 commit 数量机械拆分。

---

## 79. No Push

整个 unattended run：

```text
DO NOT PUSH
```

即使：

```text
SSH verified
GitHub reachable
tests green
```

也不 push。

---

## 80. No Automatic Final Commit

默认：

```text
DO NOT COMMIT
```

最终停在：

```text
cleanly classified
validated
ready-to-commit
```

等待人工回来检查。

---

## 81. Documentation

维护 / 创建：

```text
docs/gates/gate-3.4-reconnaissance.md
```

更新 Vision section。

创建：

```text
docs/gates/gate-3.4-architecture.md
```

记录：

```text
canonical state
planner
camera
projection
motion
events
data flow
```

最终：

```text
docs/gates/gate-3.4-everest-expedition-core.md
```

---

## 82. Architecture Diagram

最终文档至少包含类似：

```text
south-col.ts
289 route points
       ↓
ExpeditionDriver
       ↓
Canonical DriveState
       │
       ├──────── HUD
       │
       ├──────── deriveState → Environment
       │
       ├──────── Camera Engine
       │
       ├──────── Projection
       │             ├─ LIVE
       │             └─ TERRAIN / 2.5D
       │
       ├──────── Route Overview
       │
       └──────── Milestone Events
                     ↓
              Knowledge / Discovery
```

---

## 83. Phase Exit Rules

### Phase 1 PASS

必须证明：

```text
ExpeditionDriver remains canonical
Planner is derived
Camera is derived
no fake route data
no fake altitude
tests green
```

自动进入 Phase 2。

### Phase 2 PASS

必须证明：

```text
climb uses route progress/distance
no +360m
no +10%
continuous movement exists
altitude derived from driver
environment follows climb
milestone crossing works
```

自动进入 Phase 3。

### Phase 3 PASS

必须证明：

```text
TERRAIN renders real route
marker follows canonical route
camera progresses
2.5D has actual depth
vision reviewer accepts core spatial model
```

自动进入 Phase 4。

### Phase 4 PASS

必须证明：

```text
route overview exists
elevation profile uses canonical route
node inspector works
knowledge/discovery integration works
```

自动进入 Phase 5。

### Phase 5 PASS

必须证明：

```text
typecheck green
tests green
build green
visual QA complete
motion QA complete
performance acceptable
git scope clean
```

进入：

```text
READY FOR HUMAN REVIEW
```

---

## 84. Human Experience Acceptance

最终用户必须可以回答 YES：

```text
第一眼仍然是 Everest 吗？

我能知道自己在哪里吗？

我能看懂路线往哪里走吗？

点击攀登后真的有移动感吗？

marker 是否真的沿山体路线移动？

camera 是否真的随着攀登推进？

海拔是否随着路线变化？

环境是否同步变化？

到达 Camp / milestone 是否有感觉？

查看路线是否真的能理解整条 South Col Route？

2.5D 是否比普通照片提供明显更强的空间理解？

页面是否仍然克制而不是游戏化？
```

如果核心答案明显为：

```text
NO
```

不能宣称 Gate 完成。

---

## 85. Anti-Patterns

以下任何一种结果都视为失败。

### FAIL — Fake Progress

```text
progress += 10
```

### FAIL — Fake Altitude

```text
altitude += 360
```

### FAIL — Teleport Climb

```text
click
→ next camp
```

### FAIL — Floating Route

路线只是画在图片上的任意曲线。

### FAIL — Fake Marker

marker 使用：

```text
x += 5
y -= 5
```

移动。

### FAIL — Parallax Wallpaper

只增加几层图片滑动就叫 2.5D。

### FAIL — Planner List

Route Planner 只是：

```text
Base Camp
C1
C2
C3
Summit
```

普通列表。

### FAIL — Screenshot Optimization

为了 reference：

```text
hardcode %
hardcode x/y
fake progress
fake mock data
```

### FAIL — Game HUD

大量：

```text
neon
particles
level-up
health-bar
arcade feedback
```

### FAIL — Duplicate State

多个 subsystem 各算：

```text
progress
altitude
position
```

---

## 86. Definition of Done

Gate 3.4 只有全部满足才能进入 Human Review。

### Route

```text
canonical South Col route consumed
```

### Climb

```text
continuous route-based climb
```

### Position

```text
real route position drives marker
```

### Camera

```text
camera responds continuously to progress
```

### Terrain

```text
TERRAIN / 2.5D provides spatial understanding
```

### Planner

```text
route overview + elevation profile
```

### Environment

```text
route progress synchronizes environment
```

### Events

```text
milestone / knowledge / discovery linked to progression
```

### Architecture

```text
single canonical source of truth
```

### Tests

```text
typecheck green
Vitest green
build green
new core tests green
```

### Performance

```text
no obvious jank
no unreasonable setData
no unnecessary huge dependency
```

### Visual

```text
vision reviewer accepts spatial model
```

---

## 87. Final Visual Evidence

最终保存至少：

```text
Base Camp
Khumbu / early climb
C1/C2
high route
South Col
summit approach
summit
route overview
LIVE fallback
TERRAIN
```

截图。

以及一个 climb motion sequence：

```text
T0
T1
T2
T3
T4
```

---

## 88. Final Report

最终创建：

```text
docs/gates/gate-3.4-everest-expedition-core.md
```

内容：

```markdown
# Gate 3.4 — Everest Expedition Core

## Goal

## Before

## After

## Canonical Architecture

## South Col Route

## Climb Engine Integration

## Camera

## Projection

## 2.5D Terrain

## Route Overview

## Elevation Profile

## Environment

## Knowledge / Discovery

## Motion

## Performance

## Tests

## Vision Review

## Visual Evidence

## Known Limitations

## Deferred

## Git Scope

## Proposed Commits

## Human Review Checklist

## Gate Decision
READY FOR HUMAN REVIEW
```

---

## 89. Final Response

完成 unattended run 后不要继续开发新功能。

输出：

```markdown
# Gate 3.4 — READY FOR HUMAN REVIEW

## Goal
...

## Core Experience
- Route:
- Climb:
- Terrain:
- Camera:
- Planner:
- Environment:
- Events:

## Architecture
...

## Vision Review
...

## Motion Review
...

## Validation
- TypeScript:
- Vitest:
- Build:
- Performance:

## Visual Evidence
...

## Files Changed
...

## Git Status
...

## Proposed Commits
...

## Known Limitations
...

## Deferred
...

## Human Review Checklist
...

## Gate Status

READY FOR HUMAN REVIEW

NO COMMIT
NO PUSH
```

然后停止。

---

## 90. Final Directive

不要把时间继续浪费在：

```text
字体 2rpx
进度条上下 10px
青色亮一点
黑色浅一点
reference pixel matching
```

这些不是 Gate 3.4 的核心。

整个 Gate 只有一个真正的问题：

> 用户有没有终于感觉到自己正在沿珠峰南坡往上爬？

技术实现必须服务于：

```text
ROUTE
+
MOVEMENT
+
TERRAIN
+
CAMERA
+
POSITION
+
ENVIRONMENT
+
MILESTONE
```

而不是：

```text
STATIC UI
```

记住：

> Do not optimize the screenshot.
>
> Build the expedition.

---

## 91. Autonomous Work Directive

用户已经授权 Gate 3.4 正常阶段连续执行。

因此：

```text
DO NOT STOP AFTER PHASE 1
DO NOT ASK FOR PHASE 2 AUTHORIZATION
DO NOT ASK FOR PHASE 3 AUTHORIZATION
DO NOT ASK FOR PHASE 4 AUTHORIZATION
```

正常验证通过就继续。

只有触发本文：

```text
Mandatory Stop Conditions
```

才允许暂停。

---

## 92. Resource Discipline

用户模型服务最大并发数：

```text
6
```

这是不可突破的硬约束。

最终再次强调：

```text
MAIN COORDINATOR = 1

MAX ACTIVE SUBAGENTS = 5

MAX TOTAL MODEL REQUESTS = 6

MAX VISION REVIEWERS = 1
```

不要因为追求速度触发 provider rate limit。

稳定完成优先于瞬时吞吐。

---

## 93. Start Now

现在：

```text
1. Load current Goal/Todo state
2. Read Gate 3.4 reconnaissance
3. Update old Vision-blocked finding
4. Run missing Vision reconnaissance
5. Update architecture docs
6. Begin Phase 1
7. Continue automatically through all phases
8. Validate continuously
9. Stop only at READY FOR HUMAN REVIEW or Mandatory Stop
```

不要重新做已经完成并验证过的 reconnaissance。

不要重复浪费模型调用。

开始执行 Gate 3.4。

---


