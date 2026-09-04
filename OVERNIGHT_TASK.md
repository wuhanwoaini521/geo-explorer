# Geo Explorer — Overnight Autonomous Development Task

你现在是这个项目的主程、产品设计师、UI/UX 设计师和测试工程师。

项目：
`https://github.com/wuhanwoaini521/geo-explorer`

项目定位：

> 一个以“探索世界地理”为核心的沉浸式交互地理学习 / 探索应用。

当前项目处于 Demo 阶段。

目前已经存在一些世界场景、Everest 3D、路线控制点、waypoints、SVG 场景素材等基础能力，但整体仍然存在明显的 Demo 感。

你的任务不是简单修几个 Bug，而是利用一个晚上的时间，把项目从：

> “技术 Demo”

尽可能推进到：

> “看起来像一个真正产品的 Alpha 版本”。

---

# 一、最高优先级原则

## 1. 不要等待我确认

这是一次自主开发任务。

不要频繁询问：

* “这个可以吗？”
* “要不要这样做？”
* “是否继续？”
* “需要增加什么？”

你应该自己分析项目并做出合理决定。

如果存在多个合理方案：

> 选择最符合“沉浸式地理探索产品”定位的方案直接实现。

---

# 二、第一阶段：完整分析项目

开发前必须：

1. 拉取 / 检查最新代码
2. 检查当前 Git 分支
3. 查看 README
4. 查看项目目录结构
5. 查看现有页面
6. 查看现有组件
7. 查看数据结构
8. 查看已有 SVG / 3D / terrain / route 等资源
9. 检查 package.json
10. 检查构建方式
11. 检查现有测试
12. 实际运行项目

尤其重点检查：

* 页面布局
* 导航结构
* 首页
* 世界地图 / 世界探索
* 地理内容详情
* Everest / Mountain 页面
* 3D 场景
* 路线交互
* 数据展示
* 空状态
* Loading
* Error 状态
* 移动端适配
* 微信小程序限制
* 性能问题

不要只看代码。

必须实际运行 UI。

---

# 三、Git 工作规范

开发前：

```bash
git fetch --all
git status
git branch
```

确保代码是最新的。

不要直接在 `main` 开发。

创建独立开发分支，例如：

```text
feat/geo-explorer-product-polish
```

所有修改都在该分支进行。

不要破坏 main。

---

# 四、总体产品目标

请把 Geo Explorer 设计成下面这种产品体验：

用户打开应用后，不应该感觉：

> “这是一个展示几个地理 Demo 的网页。”

而应该感觉：

> “这是一个可以探索地球的交互式地理博物馆 / 数字地球。”

核心体验：

```text
发现
 ↓
探索
 ↓
进入地点
 ↓
了解地理
 ↓
互动
 ↓
获得新的探索目标
```

---

# 五、UI 全面升级

这是本次任务的最高优先级之一。

不要只修改颜色。

需要重新审视：

* Layout
* Typography
* Spacing
* Card
* Navigation
* Hero
* Section
* Button
* Icon
* Information hierarchy
* Empty state
* Loading state
* Responsive layout

---

# 六、视觉设计方向

整体设计关键词：

```text
Modern
Editorial
Geographic
Exploration
Immersive
Cinematic
Educational
Natural
Premium
```

不要做成：

* 普通后台管理系统
* 普通旅游网站
* 普通卡片列表
* AI Dashboard
* 花里胡哨的游戏 UI

应该更接近：

> National Geographic + Google Earth + Interactive Museum + Modern Web Experience

但不要直接复制任何现有网站。

---

# 七、建立统一 Design System

如果当前项目没有统一设计系统，请建立一个轻量级 Design System。

至少统一：

### Typography

建立：

```text
Display
Heading
Subheading
Body
Caption
Label
```

### Spacing

统一：

```text
4
8
12
16
24
32
48
64
96
```

### Radius

统一圆角体系。

### Shadows

减少廉价的“大面积阴影”。

### Colors

建议建立：

```text
Background
Surface
Surface Elevated
Text Primary
Text Secondary
Text Muted
Accent
Success
Warning
Danger
```

地理相关视觉可以适当使用：

* Terrain Green
* Ocean Blue
* Glacier White
* Earth Brown
* Sunset Orange

但是不要让页面变成彩色 UI。

---

# 八、首页重新设计

首页应该成为整个产品最重要的入口。

不要只是：

```text
标题
几个卡片
```

建议设计成：

```text
Hero

Explore the Earth
探索地球，发现你从未见过的世界。

[开始探索]

↓
Featured Destinations

Everest
Grand Canyon
Sahara
Amazon
...

↓
Explore by Geography

Mountains
Canyons
Deserts
Glaciers
Volcanoes
Forests
Rivers
Coasts

↓
Interactive Experiences

Climb a Mountain
Fly Through a Canyon
Explore a Glacier
...

↓
Did You Know?

地理冷知识

↓
Continue Exploring
```

如果已有页面，不要机械照搬。

根据现有项目结构进行合理重构。

---

# 九、增加“探索感”

这是 Geo Explorer 最重要的产品特征。

用户应该始终有：

> “下一步去哪里？”

可以增加：

### Featured

推荐地点。

### Random Discovery

随机发现一个地点。

例如：

```text
Discover something new

You are 8,848m above sea level.
Explore Mount Everest.
```

### Explore Nearby

如果项目环境允许，可以根据地图位置展示附近地理对象。

### Explore by Type

```text
Mountains
Canyons
Deserts
Volcanoes
Glaciers
Rivers
Lakes
Forests
Coasts
Islands
Caves
Waterfalls
```

---

# 十、完善地理数据

当前最大的 Demo 感之一，很可能来自：

> UI 看起来不错，但是数据太少。

必须扩充数据体系。

不要把大量数据硬编码在页面组件里。

建立统一数据模型。

例如：

```ts
GeoPlace {
  id
  slug
  name
  nameEn
  type
  country
  region
  latitude
  longitude
  elevation
  description
  shortDescription
  formation
  climate
  geologicalAge
  interestingFacts
  tags
  images
  relatedPlaces
  difficulty
  featured
}
```

根据项目实际技术栈调整。

---

# 十一、数据内容必须真实

不要为了填充页面编造地理事实。

优先使用：

* Wikimedia Commons
* NASA
* USGS
* NOAA
* Natural Earth
* OpenStreetMap
* 官方国家地理 / 地质机构资料
* Wikipedia（作为辅助资料）

对于不确定的数据：

> 不要编造。

可以先使用：

```text
TODO: source required
```

或者暂时不展示。

---

# 十二、至少建立一批完整地理数据

不要只增加几十个名字。

至少覆盖：

## Mountains

例如：

* Mount Everest
* K2
* Kangchenjunga
* Denali
* Aconcagua
* Kilimanjaro
* Mont Blanc
* Matterhorn

## Canyons

例如：

* Grand Canyon
* Antelope Canyon
* Fish River Canyon
* Colca Canyon

## Deserts

例如：

* Sahara
* Gobi
* Atacama
* Arabian Desert
* Namib
* Mojave

## Volcanoes

例如：

* Mount Fuji
* Mauna Loa
* Mount Etna
* Vesuvius
* Krakatoa

## Glaciers

增加具有代表性的冰川。

## Rivers

增加世界主要河流。

## Lakes

增加主要湖泊。

## Waterfalls

增加世界著名瀑布。

数量不是唯一目标。

重点是：

> 数据结构完整 + 内容质量高 + 可以被 UI 真正使用。

---

# 十三、地理详情页升级

每一个地点都不应该只是：

```text
图片
名字
一句介绍
```

建议至少包含：

```text
Hero

名称
英文名称
地点类型

Overview

Location

Elevation

Formation

Climate

Geology

Interesting Facts

Explore

Related Places
```

例如 Everest：

```text
Mount Everest

8,848.86 m
Nepal / China
Himalayas

Overview

...

Formation

...

Climate

...

Interesting Facts

01 ...
02 ...
03 ...

Interactive Experience

[Explore Everest]
```

---

# 十四、重点升级 Everest 体验

这是项目最有特色的资产之一。

必须重点打磨。

当前项目已经存在：

* Everest 3D
* terrain
* route
* waypoints
* control points
* preview
* scene SVG

不要浪费这些已有资产。

---

# 十五、Everest 3D 体验

目标：

> 让用户产生“我正在探索珠穆朗玛峰”的感觉。

至少考虑：

### Camera

支持：

* Orbit
* Zoom
* Pan

### Terrain

显示真实地形层次。

### Route

显示登山路线。

### Waypoints

例如：

```text
Base Camp
Camp I
Camp II
Camp III
Camp IV
Summit
```

点击 waypoint：

```text
名称
海拔
简短介绍
```

---

# 十六、增加“登山体验”

如果技术条件允许，可以增加：

```text
Start Expedition
```

用户沿着路线向山顶探索。

例如：

```text
Base Camp
   ↓
Khumbu Icefall
   ↓
Camp I
   ↓
Western Cwm
   ↓
Camp II
   ↓
Lhotse Face
   ↓
Camp III
   ↓
South Col
   ↓
Summit
```

可以使用：

* camera animation
* terrain movement
* route highlighting
* elevation indicator
* waypoint transitions
* atmospheric effects

不要追求复杂游戏引擎。

重点是：

> 有“旅程感”。

---

# 十七、增加地理数据可视化

适合 Geo Explorer 的内容：

### Elevation

海拔高度图。

### Route

路线图。

### Distance

距离。

### Coordinates

经纬度。

### Climate

简单气候信息。

### Terrain

地形类型。

### Formation

形成过程。

使用图表时：

> 简洁、视觉化，不要做成数据后台。

---

# 十八、增加探索地图

如果当前已有地图能力：

进一步完善。

地图上显示：

```text
Mountains
Canyons
Deserts
Volcanoes
Glaciers
Rivers
Lakes
```

用户点击：

```text
地点 Marker
↓
Preview Card
↓
Explore
```

可以增加：

```text
Search
Filter
Category
```

---

# 十九、搜索功能

增加全局搜索。

用户可以搜索：

```text
Everest
Japan
Desert
Volcano
Himalaya
Amazon
```

结果应该包含：

```text
Places
Regions
Landforms
```

支持：

* 模糊搜索
* 分类
* 空结果状态

---

# 二十、Filter / Category

建立地理分类系统。

例如：

```text
All

Mountains
Volcanoes
Canyons
Deserts
Glaciers
Rivers
Lakes
Waterfalls
Forests
Islands
Caves
```

Filter UI 要简洁。

不要出现几十个按钮挤在一起。

---

# 二十一、增加“Did You Know?”

增加地理知识卡。

例如：

```text
Did you know?

The Earth's highest mountain is measured differently
depending on whether you measure from sea level or from
the Earth's base.
```

重点：

> 短、准确、有趣。

可以随机展示。

---

# 二十二、增加探索成就感

不要做复杂账号体系。

可以先做轻量：

```text
Explored 3 places

Explored 5 mountains

Visited Asia

Explored a volcano

Reached Everest Summit
```

如果适合当前架构，可以使用 localStorage 保存。

不要引入后端，只为了做这个功能。

---

# 二十三、增加“收藏”

允许用户：

```text
Favorite
```

保存：

```text
My Explorations
```

例如：

```text
❤️ Everest
❤️ Grand Canyon
❤️ Mount Fuji
```

同样可以优先使用本地存储。

---

# 二十四、动画

需要动画，但不要滥用。

推荐：

### Page transition

淡入 / 位移。

### Cards

hover / reveal。

### Map

marker transition。

### Hero

轻微 parallax。

### 3D

camera transition。

### Scroll

section reveal。

原则：

> 动画服务于探索感，而不是为了“炫技”。

---

# 二十五、Loading 状态

所有异步内容必须有 Loading。

不要出现：

```text
空白页面
```

可以设计：

```text
Skeleton
```

尤其：

* 3D
* 图片
* 地图
* 地理详情

---

# 二十六、Error 状态

所有重要功能考虑：

```text
Loading
Success
Empty
Error
```

例如地图加载失败：

```text
Unable to load the map

Please try again.
```

不要直接出现 JS error。

---

# 二十七、响应式

必须测试：

```text
Desktop
Tablet
Mobile
```

重点检查：

* Header
* Hero
* Cards
* Map
* 3D
* Detail page
* Navigation

不能简单：

```css
width: 100%;
```

就认为完成了响应式。

---

# 二十八、性能

检查：

* 图片大小
* SVG
* 3D
* lazy loading
* bundle
* unnecessary re-render
* 大型 JSON
* 地图数据

尤其注意：

> 不要因为增加大量地理数据导致首屏变慢。

可以：

```text
dynamic import
lazy loading
data splitting
```

---

# 二十九、代码质量

不要为了赶进度把代码写烂。

必须：

* 复用组件
* 避免重复代码
* 类型完整
* 数据与 UI 分离
* 逻辑与展示分离
* 不产生明显 dead code
* 不产生大量 magic number
* 不产生临时 hack

如果发现现有结构不合理：

> 可以重构。

但是：

> 不要为了“架构漂亮”进行没有实际收益的大规模重写。

---

# 三十、测试要求

你必须自己写测试。

至少覆盖：

### 核心功能

* 首页加载
* 搜索
* Filter
* 地理详情
* Favorite
* 地图交互
* Everest
* Waypoint
* Route

### Edge cases

* 空搜索
* 搜索不存在
* 数据为空
* 图片加载失败
* 3D 初始化失败

---

# 三十一、实际 UI 测试

不能只运行：

```bash
npm test
```

还必须：

1. 启动开发服务器
2. 实际访问页面
3. 检查 Console
4. 检查 Network
5. 检查页面布局
6. 检查移动端
7. 检查交互
8. 检查主要流程

如果项目有 Playwright：

> 优先使用 Playwright 做实际浏览器验证。

---

# 三十二、不要为了完成任务制造功能

非常重要。

如果某个功能：

* 当前架构不适合
* 实现成本巨大
* 会引入大量依赖
* 会破坏现有体验
* 没有实际产品价值

不要硬做。

优先：

```text
UI Polish
+
Data Quality
+
Core Interaction
+
Exploration Experience
```

---

# 三十三、不要随便增加依赖

添加依赖前必须判断：

> 当前项目是否真的需要？

能使用现有技术解决，就不要增加新的库。

如果确实需要：

> 使用成熟、轻量、维护活跃的方案。

---

# 三十四、不要伪造 3D

如果真正的 3D 技术暂时无法完善：

不要做一个假的：

```text
3D
```

按钮然后实际上只是图片缩放。

应该把现有 Everest 3D 做到真正可交互。

---

# 三十五、内容质量优先

所有用户可见文字必须检查：

* 中文
* 英文
* 拼写
* 地理名称
* 单位
* 海拔
* 经纬度

单位保持一致：

```text
m
km
°C
```

不要：

```text
8848m
8848.86 meters
8,848.86m
```

到处混用。

---

# 三十六、不要堆卡片

这是非常重要的 UI 原则。

不要把所有内容都设计成：

```text
┌──────────┐
│ Image    │
│ Title    │
│ Text     │
│ Button   │
└──────────┘
```

需要混合：

* Hero
* Full-width section
* Editorial layout
* Map
* Timeline
* Data visualization
* Image
* Text
* Interactive scene
* Cards

让页面有节奏。

---

# 三十七、最终用户体验

完成以后，一个用户应该可以：

```text
打开 Geo Explorer
      ↓
看到一个有吸引力的首页
      ↓
发现 Everest
      ↓
进入 Everest
      ↓
看到真实地理信息
      ↓
进入 3D
      ↓
看到山体
      ↓
看到路线
      ↓
点击 Base Camp
      ↓
沿路线探索
      ↓
看到海拔变化
      ↓
了解 Everest
      ↓
发现其他山脉
      ↓
继续探索
```

整个流程必须自然。

---

# 三十八、优先级

如果时间有限，严格按照：

## P0

必须完成：

* UI 全面优化
* 首页升级
* 导航优化
* 地理数据结构
* 增加核心地理数据
* 地理详情页
* 搜索
* 分类
* Loading / Error / Empty
* 响应式
* Everest 核心体验
* 核心测试

## P1

有时间继续：

* 收藏
* 探索记录
* Did You Know
* Discovery
* Elevation visualization
* Route animation
* 更丰富的地图交互
* 页面动画

## P2

最后再考虑：

* 成就系统
* 更复杂的 3D
* 社交
* 登录
* 云端数据
* 后端
* 多人功能

---

# 三十九、时间管理

这是一次“自主工作一晚上”的任务。

不要在前两个小时一直分析。

建议：

```text
10%  项目分析
15%  产品 / UI 规划
35%  UI + 核心功能
20%  数据完善
10%  Everest / 交互
10%  测试 + 修复
```

如果时间不足：

> 宁可把 5 个核心页面做到优秀，也不要做 30 个半成品页面。

---

# 四十、最终验收标准

最终必须达到：

### UI

* 不再明显具有 Demo 感
* 页面有统一视觉语言
* 信息层级清晰
* 间距统一
* 动画自然
* 移动端可用

### 功能

* 核心探索流程完整
* 搜索可用
* 分类可用
* 地理详情可用
* Everest 可探索
* 3D 可交互
* Route 可用
* Waypoint 可用

### 数据

* 数据结构统一
* 数据与 UI 分离
* 地理信息完整
* 不编造事实
* 核心类别有足够内容

### 稳定性

* 无明显 Console Error
* 无明显 TypeScript Error
* 构建成功
* 测试通过
* 核心页面实际访问正常

---

# 四十一、Git 提交

完成一个完整功能后进行合理 commit。

例如：

```text
feat: redesign geo explorer homepage
feat: add geographic exploration data
feat: improve place detail experience
feat: enhance Everest exploration
feat: add global search and filters
feat: improve responsive layout
test: add core exploration flow tests
```

不要产生：

```text
fix
fix2
fix-final
fix-final2
really-final
```

这种提交。

---

# 四十二、最终必须执行

完成开发后：

```bash
git status
```

检查是否存在：

* debug code
* console.log
* TODO
* 临时文件
* 未使用依赖
* 未使用组件
* 错误 import
* broken asset

然后：

```bash
npm run build
```

或者项目实际使用的构建命令。

运行全部测试。

如果测试失败：

> 修复后重新测试。

不要带着失败测试结束。

---

# 四十三、最终报告

完成后生成：

```text
OVERNIGHT_REPORT.md
```

包含：

## 1. Summary

这次完成了什么。

## 2. UI Improvements

修改了哪些页面。

## 3. New Features

新增了什么功能。

## 4. Data

新增了哪些地理数据。

## 5. Everest

Everest 做了什么。

## 6. Testing

运行了哪些测试。

## 7. Known Issues

还有什么问题。

## 8. Next Steps

下一阶段最值得做什么。

---

# 四十四、最重要的一句话

不要把目标理解为：

> “帮我增加几个功能。”

真正目标是：

> **把 Geo Explorer 从一个有趣的地理技术 Demo，推进成一个具有完整产品感、探索感和内容价值的 Interactive Geography Experience。**

请主动发现问题。

请主动设计。

请主动实现。

请主动测试。

请主动修复。

在没有明显阻塞的情况下，不要停下来等待用户确认。

开始工作。
