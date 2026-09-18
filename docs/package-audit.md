# Gate 1 — 包体审计（Package Audit）

审计对象：`geo-explorer` 主工作区（`D:\code\self-github\geo-explorer`，分支 `main`，HEAD `3681121`）。

本轮**只读审计，未修改任何生产代码**，未执行 `npm run build`（避免改写已跟踪的 `dist/`），未提交、未推送。

审计时间基准：`dist/miniprogram` 与源码编译结果**逐字节一致**（80/80 个 `.js` 文件 SHA-256 相同），因此下文所有产物体积即当前源码的真实构建体积。

---

## 0. 结论摘要

| # | 结论 | 证据 |
| --- | --- | --- |
| 1 | **包体问题的 96% 是图片**，不是 JS。图片 27,327.0 KB / 总量 28,465.8 KB。JS 只有 853.5 KB。 | §2 |
| 2 | **主包 = 总包 = 27.80 MiB，当前没有任何分包。** 微信主包上限 2 MiB，超出约 **13.9 倍**，这个包目前无法上传。 | §2 |
| 3 | 若把图片全部排除，**主包只剩 1,138.7 KB（约 1.11 MiB）**——正好落在 Gate 5 的 `< 1.2 MB` 目标内。这决定了优化重心。 | §2 |
| 4 | 微信报告里列出的 **`engine/pixel-scene.js` 在本仓库根本不存在**。该文件只存在于另一个 worktree（`geo-explorer-pixel`，`feat/pixel-redesign`）。**这份报告来自那个工作区，不是当前工作区。** | §7.1 |
| 5 | 另外 8 个"未使用"模块在**当前工作区都有真实生产引用**，全部是直接的 `require`，且在编译产物中同样存在。它们被标记的原因是：**它们唯一的引用者是探索页/海拔页；在子包化之后这两个页面都在 `pkg-explore` 分包里**，微信的未使用分析没有把这些主包文件计入"已使用"。 | §7.2 |
| 6 | 有一个文件是**真正的死代码**：`miniprogram/data/landforms.ts`（导出 `LANDFORMS` / `getLandformById`），生产、测试、脚本**全都没有引用**。本轮不删除，仅记录。 | §7.3 |
| 7 | 另有 9 个模块（102.8 KB 编译体积）**只被测试和内容脚本使用，却被打进运行时包**——因为 `tsconfig.build.json` 无条件编译 `miniprogram/**/*.ts`，`copy-assets.mjs` 无条件复制所有非 TS 文件。 | §8.1 |
| 8 | 3 个资源（约 272 KB）在生产代码中**无任何引用**：两张内容候选图 + 一个说明文本文件。 | §8.2 |
| 9 | 6 个 4096 档地球贴图（12.9 MB）只通过 `?texture=4096` 查询参数可达，默认路径用的是 2048 档。 | §8.3 |
| 10 | 构建管线没有分包、没有 minify（`"minified": false`）、没有包体守卫。`packOptions.ignore` 为空数组。 | §10 |

---

## 1. 审计范围与方法

检查对象：

| 对象 | 说明 |
| --- | --- |
| `miniprogram/` | 190 个文件（源码 28,523.5 KB，含未被构建的 `.ts` 与 `.json` 源） |
| `dist/miniprogram/` | 188 个文件，28,465.8 KB，开发者工具实际加载与打包的目录 |
| `project.config.json` | `miniprogramRoot = dist/miniprogram/`，`packOptions.ignore = []` |
| `app.json` | 13 个页面，全部在主包；**无 `subpackages` 字段** |
| `pages/` `engine/` `data/` `utils/` `assets/` `components/` `services/` `types/` | 逐文件列体积 |

使用的静态分析（临时脚本，置于系统临时目录，**未写入仓库**）：

1. 体积统计：按文件、扩展名、目录聚合 `dist/miniprogram` 与 `miniprogram`。
2. 可达性遍历：以 `app.json` 的 `pages` + `app.ts` + `custom-tab-bar` 为入口，解析 `import` / `export from` / 动态 `import()` / `require()` / `.json` 的 `usingComponents` / `.wxss` 的 `@import` / `.wxml` 中的组件标签，得到**生产可达闭包**。
3. 反向引用查询：对指定模块严格解析全部 `import`/`require` 语句（不使用文件名模糊匹配），区分「生产入口 / 内部模块 / 测试 / 脚本」四类引用者。
4. 资源引用扫描：收集字符串字面量中的 `/assets/**` 路径，并单独识别模板字符串动态路径（`${...}`）。
5. 图片元数据：直接解析 PNG / JPEG 头，取得像素尺寸。

基线验证（已执行，全部通过）：

| 命令 | 结果 |
| --- | --- |
| `npx tsc -p tsconfig.build.json --outDir <temp>` | 退出码 0；80 个 `.js` 与 `dist/` 全部逐字节一致 |
| `npm run typecheck` | 退出码 0 |
| `npm test`（vitest run） | 50 个测试文件：48 通过 / 2 跳过；552 个用例：545 通过 / 7 跳过 |

> 注：`npm test` 输出中有 2 处预期内的跳过（`tests/review-board.test.ts` 5 例、`tests/occlusion-grid-smoke.test.ts` 2 例），与包体无关。

---

## 2. 当前体积

### 2.1 主包 / 总包

| 指标 | 数值 |
| --- | --- |
| **主包大小** | **28,465.8 KB ≈ 27.80 MiB** |
| **总包大小** | **28,465.8 KB ≈ 27.80 MiB**（当前无 `subpackages`，主包即全部） |
| 文件总数 | 188 |
| 微信主包上限 | 2 MiB → **超限 13.9 倍** |
| 微信所有分包合计上限 | 20 MiB → **超限 1.39 倍** |

即：**当前构建产物既超出主包限制，也超出整体限制。** 这不是红色警告级别的提示，而是发布阻断。

### 2.2 按文件类型

| 扩展名 | 文件数 | 体积 (KB) | 占比 |
| --- | ---: | ---: | ---: |
| `.png` | 7 | 20,352.8 | 71.5% |
| `.jpg` | 45 | 6,973.2 | 24.5% |
| `.js` | 80 | 853.5 | 3.0% |
| `.wxss` | 17 | 147.0 | 0.5% |
| `.wxml` | 16 | 80.9 | 0.3% |
| `.json` | 22 | 57.3 | 0.2% |
| `.svg` | 1 | 1.1 | 0.0% |
| 音频（mp3/m4a/aac/wav/ogg） | 0 | 0.0 | 0.0% |

汇总：

| 分类 | 体积 (KB) | 占比 |
| --- | ---: | ---: |
| 图片（png + jpg + svg） | 27,327.0 | **96.0%** |
| 代码（js + wxss + wxml + json） | 1,138.7 | 4.0% |

**这就是全部问题的形状：图片 96%，代码 4%。** 代码侧即使一行不减，只要图片回到合理体积，主包即可满足 1.2 MB 目标。

### 2.3 按目录（前 15）

| 目录 | 文件数 | 体积 (KB) |
| --- | ---: | ---: |
| `assets/world` | 8 | 20,353.8 |
| `assets/content` | 36 | 5,591.9 |
| `assets/expeditions` | 9 | 1,381.3 |
| `pages/exploration` | 4 | 211.8 |
| `data/explorations` | 5 | 141.1 |
| `data/media` | 3 | 96.8 |
| `data/routes` | 4 | 88.6 |
| `pages/map` | 4 | 59.9 |
| `data/places.js` | 1 | 51.9 |
| `data/knowledge.js` | 1 | 40.2 |
| `engine/webgl-globe-renderer.js` | 1 | 31.3 |
| `data/expeditions` | 4 | 30.7 |
| `pages/home` | 4 | 23.2 |
| `engine/validate-content.js` | 1 | 22.1 |
| `pages/place` | 4 | 21.0 |

`assets/` 合计 27,327.0 KB，占 96.0%。

---

## 3. 最大 30 个文件

| # | 文件 | 体积 (KB) | 尺寸 | 类型 |
| ---: | --- | ---: | --- | --- |
| 1 | `assets/world/globe-texture-realistic-4096.png` | 10,476.1 | 4096×2048 | PNG |
| 2 | `assets/world/globe-texture-realistic-2048.png` | 3,666.0 | 2048×1024 | PNG |
| 3 | `assets/world/everest-expedition-hero-v1.png` | 2,922.5 | 1024×1536 | PNG |
| 4 | `assets/world/globe-specular-4096.png` | 1,545.8 | 4096×2048 | PNG |
| 5 | `assets/world/globe-height-4096.png` | 845.3 | 4096×2048 | PNG |
| 6 | `assets/world/globe-specular-2048.png` | 578.7 | 2048×1024 | PNG |
| 7 | `assets/expeditions/everest/live/live-a-kala-patthar.jpg` | 542.2 | 1080×1920 | JPG |
| 8 | `assets/content/fuji/f-forest-lower.jpg` | 358.0 | 1080×720 | JPG |
| 9 | `assets/world/globe-height-2048.png` | 318.3 | 2048×1024 | PNG |
| 10 | `assets/content/colorado/c-indian-garden.jpg` | 314.1 | 1080×718 | JPG |
| 11 | `assets/content/colorado/c-vishnu-river.jpg` | 299.7 | 1080×717 | JPG |
| 12 | `assets/content/colorado/c1-trailhead.jpg` | 294.3 | 1080×718 | JPG |
| 13 | `assets/content/colorado/c3-kaibab-fossils.jpg` | 291.0 | 1080×723 | JPG |
| 14 | `assets/content/colorado/c4-phantom-ranch.jpg` | 272.8 | 1080×718 | JPG |
| 15 | `assets/content/fuji/f-osunabashiri.jpg` | 237.7 | 1080×720 | JPG |
| 16 | `assets/content/fuji/f-yoshida-huts.jpg` | 232.2 | 1080×720 | JPG |
| 17 | `assets/content/colorado/c2-devils-corkscrew.jpg` | 231.1 | 1080×579 | JPG |
| 18 | `assets/content/colorado/c-resthouse-15.jpg` | 209.6 | 1024×728 | JPG |
| 19 | `assets/content/mariana/m1-gebco-bathymetry.jpg` | 180.1 | 1080×788 | JPG |
| 20 | `assets/content/fuji/f4-hoei-rim.jpg` | 179.6 | 1080×720 | JPG |
| 21 | `assets/content/mariana/m4-hadal-snailfish-map.jpg` | 166.8 | 1080×764 | JPG |
| 22 | `assets/content/everest/ev-icefall-ladders.jpg` | 164.2 | 1080×720 | JPG |
| 23 | `assets/content/everest/k32-modern-climb.jpg` | 164.2 | 1080×720 | JPG |
| 24 | `assets/content/fuji/f-navy-trail.jpg` | 161.4 | 1080×718 | JPG |
| 25 | `assets/content/fuji/f1-yamanaka-view.jpg` | 148.9 | 1080×720 | JPG |
| 26 | `assets/content/colorado/c-resthouse-3mi.jpg` | 146.3 | 1024×732 | JPG |
| 27 | `assets/content/colorado/c-river-nps.jpg` | 143.3 | 1080×716 | JPG |
| 28 | `assets/content/everest/ev-b1-western-cwm.jpg` | 131.4 | 1080×810 | JPG |
| 29 | `assets/expeditions/everest/waypoints/camp-i.jpg` | 120.6 | 900×600 | JPG |
| 30 | `assets/expeditions/everest/waypoints/western-cwm-camp-ii.jpg` | 120.6 | 900×600 | JPG |

前 30 个文件合计 **25,463.0 KB**，占总量 **89.5%**。其中 **只有第 1—18 名超过 200 KB**，全部是图片。

---

## 4. 所有 > 100 KB 的文件

共 **40 个**（39 张图片 + 1 个 JS），合计 **26,559.8 KB**，占总量 **93.3%**。

第 1—39 名即 §3 表格中的 39 张图片（第 39 名为 `assets/content/mariana/k34-noctiluca-glow.jpg`，101.6 KB）。唯一的非图片条目：

| 文件 | 体积 (KB) | 备注 |
| --- | ---: | --- |
| `dist/miniprogram/pages/exploration/index.js` | 108.4 | 单个页面编译产物，是最大的 JS 文件 |

按 Gate 2 的「普通图片目标 < 180 KB」衡量，**当前有 19 张图片超标**（§3 第 1—19 名，含 180.1 KB 的 `m1-gebco-bathymetry.jpg`）。

---

## 5. 所有 > 200 KB 的图片 / 音频

共 **18 个，全部是图片，音频为 0 个**，合计 **23,635.6 KB**，占总量 **83.0%**。

| # | 文件 | 体积 (KB) | 尺寸 | KB/MP |
| ---: | --- | ---: | --- | ---: |
| 1 | `assets/world/globe-texture-realistic-4096.png` | 10,476.1 | 4096×2048 | 1,249 |
| 2 | `assets/world/globe-texture-realistic-2048.png` | 3,666.0 | 2048×1024 | 1,748 |
| 3 | `assets/world/everest-expedition-hero-v1.png` | 2,922.5 | 1024×1536 | 1,858 |
| 4 | `assets/world/globe-specular-4096.png` | 1,545.8 | 4096×2048 | 184 |
| 5 | `assets/world/globe-height-4096.png` | 845.3 | 4096×2048 | 101 |
| 6 | `assets/world/globe-specular-2048.png` | 578.7 | 2048×1024 | 276 |
| 7 | `assets/expeditions/everest/live/live-a-kala-patthar.jpg` | 542.2 | 1080×1920 | 262 |
| 8 | `assets/content/fuji/f-forest-lower.jpg` | 358.0 | 1080×720 | 460 |
| 9 | `assets/world/globe-height-2048.png` | 318.3 | 2048×1024 | 152 |
| 10 | `assets/content/colorado/c-indian-garden.jpg` | 314.1 | 1080×718 | 405 |
| 11 | `assets/content/colorado/c-vishnu-river.jpg` | 299.7 | 1080×717 | 387 |
| 12 | `assets/content/colorado/c1-trailhead.jpg` | 294.3 | 1080×718 | 380 |
| 13 | `assets/content/colorado/c3-kaibab-fossils.jpg` | 291.0 | 1080×723 | 373 |
| 14 | `assets/content/colorado/c4-phantom-ranch.jpg` | 272.8 | 1080×718 | 352 |
| 15 | `assets/content/fuji/f-osunabashiri.jpg` | 237.7 | 1080×720 | 306 |
| 16 | `assets/content/fuji/f-yoshida-huts.jpg` | 232.2 | 1080×720 | 299 |
| 17 | `assets/content/colorado/c2-devils-corkscrew.jpg` | 231.1 | 1080×579 | 370 |
| 18 | `assets/content/colorado/c-resthouse-15.jpg` | 209.6 | 1024×728 | 281 |

关键观察：

- **7 张 PNG 全部是"照片型"内容**（地球颜色贴图、地貌渲染图），却被存成 PNG：1,249—1,858 KB/MP。同样内容存 JPEG/WebP 通常落在 100—300 KB/MP，**理论上存在约 5—10 倍的体积削减空间，且不改变显示尺寸**。
- `globe-height-4096.png` / `globe-specular-4096.png` 属于 **非视觉数据贴图**（高度 / 高光），可用较低精度或有损格式，视觉损失难以察觉。
- `assets/content/**/*.jpg` 是 1080 宽的内容图，262—460 KB/MP 属"高画质导出"档位，是四个世界知识配图的主要负担。
- `assets/expeditions/everest/live/live-a-kala-patthar.jpg`（542 KB，1080×1920）是被引用最多的单张图，出现在 6 个页面里。

---

## 6. JS 文件体积排行榜

编译产物共 **80 个 `.js`，合计 853.5 KB**。前 40 名：

| # | 文件 | KB | | # | 文件 | KB |
| ---: | --- | ---: | --- | ---: | --- | ---: |
| 1 | `pages/exploration/index.js` | 108.4 | | 21 | `engine/route-path.js` | 8.9 |
| 2 | `data/places.js` | 51.9 | | 22 | `engine/terrain-projection.js` | 8.5 |
| 3 | `data/media/world-manifests.js` | 47.8 | | 23 | `data/expeditions/world-expedition.js` | 8.5 |
| 4 | `data/routes/everest/south-col.js` | 46.7 | | 24 | `engine/route-index.js` | 8.1 |
| 5 | `data/knowledge.js` | 40.2 | | 25 | `data/expeditions/worlds.js` | 8.0 |
| 6 | `pages/map/index.js` | 40.1 | | 26 | `engine/calibration-solver.js` | 7.7 |
| 7 | `data/explorations/everest.js` | 39.0 | | 27 | `pages/place/index.js` | 7.4 |
| 8 | `data/explorations/fuji.js` | 35.7 | | 28 | `data/processes.js` | 7.4 |
| 9 | `data/explorations/colorado.js` | 34.4 | | 29 | `pages/quiz/index.js` | 5.6 |
| 10 | `data/explorations/mariana.js` | 31.4 | | 30 | `data/routes/everest/visual-route.js` | 5.5 |
| 11 | `engine/webgl-globe-renderer.js` | 31.3 | | 31 | `pages/knowledge/index.js` | 5.2 |
| 12 | `data/media/candidates.js` | 30.1 | | 32 | `engine/route-calibration.js` | 5.2 |
| 13 | `engine/validate-content.js` | 22.1 | | 33 | `pages/profile/index.js` | 5.1 |
| 14 | `engine/validate-expedition.js` | 20.7 | | 34 | `engine/expedition-planner.js` | 4.8 |
| 15 | `engine/globe-renderer.js` | 18.8 | | 35 | `engine/expedition-stages.js` | 4.7 |
| 16 | `data/expeditions/everest.js` | 13.7 | | 36 | `engine/expedition-observation.js` | 4.6 |
| 17 | `data/quizzes.js` | 12.0 | | 37 | `engine/expedition-climb.js` | 4.6 |
| 18 | `engine/exploration-engine.js` | 11.3 | | 38 | `services/exploration-store.js` | 4.4 |
| 19 | `engine/expedition-visual.js` | 10.9 | | 39 | `data/landforms.js` | 4.3 |
| 20 | `pages/home/index.js` | 10.0 | | 40 | `pages/camp-detail/index.js` | 4.1 |

代码侧特征：

- **最大的单点是探索页**：`pages/exploration/index.js` 108.4 KB，是第二名的 2.1 倍。它的依赖闭包共 540.8 KB，占全部 JS 的 **63%**。
- **data 层是第二大块**：`data/**` 24 个文件合计 **477.8 KB**，其中 `world-manifests.js`（47.8 KB）把四个世界的全部媒体清单塞进一个文件，任何页面引用它就整体进包。
- `types/*.js` 四个文件共 3.0 KB，内容**只有注释和 `__esModule` 标记**——纯类型模块被编译成空壳并入包。
- 无 `.map` 文件（`tsconfig.build.json` 设 `sourceMap: false`，尽管 `project.config.json` 的 `uploadWithSourceMap` 为 `true`）。

---

## 7. 微信 unused JS 分析

微信报告中列出 9 个文件。逐个核查结果如下。

### 7.1 关键发现：报告来自另一个 worktree

仓库存在第二个 worktree：

```
D:/code/self-github/geo-explorer        3681121 [main]              ← 本次审计对象
D:/code/self-github/geo-explorer-pixel  3681121 [feat/pixel-redesign]
```

`miniprogram/engine/pixel-scene.ts` 在**当前工作区完全不存在**（源码、`dist/`、git 全历史中均无），只存在于 `geo-explorer-pixel` 工作区。同时：

| 判据 | 当前工作区 | pixel 工作区 |
| --- | --- | --- |
| `engine/pixel-scene.ts` | 不存在 | 存在（并有 `dist/.../pixel-scene.js`） |
| `ignoreDevUnusedFiles` | `false` | **`true`** |
| `ignoreUploadUnusedFiles` | `false` | **`true`** |
| `pages/exploration` 所在位置 | 主包 | **`pkg-explore` 分包** |
| `pages/altitude` 所在位置 | 主包 | **`pkg-explore` 分包** |

**结论：用户引用的这份微信报告产自 `geo-explorer-pixel` 工作区（`feat/pixel-redesign`），不是当前主工作区的报告。** 当前工作区的 `ignoreDevUnusedFiles` / `ignoreUploadUnusedFiles` 均为 `false`，开发者工具不会呈现这份清单。

这一点很重要，因为它意味着：**当前工作区"没有红色 unused 警告"并不代表干净**，只是对应的开关没开；反过来，也不应把这份报告的文件名直接当作当前工作区的待删清单。

### 7.2 逐个分类

分类标准：

- **A 真正未使用**：任何入口（生产 / 测试 / 脚本）都到不了。
- **B 微信扫描误判**：有确凿的生产静态引用，但被工具标记。
- **C 仅测试使用**：只有测试或构建脚本引用。
- **D 仍无法确认**。

反向引用查询使用严格语句解析（不是文件名模糊匹配），四类引用者分列：

| 模块 | 唯一引用者（当前工作区） | 在 pixel 工作区的引用者 | 分类 |
| --- | --- | --- | --- |
| `data/expeditions/index` | 生产：`pages/exploration/index.ts:14`<br>测试：3 个 | `pkg-explore/pages/exploration` | **B** |
| `engine/expedition-camera` | 生产：`pages/exploration/index.ts:45`<br>测试：1 个 | `pkg-explore/pages/exploration` | **B** |
| `engine/expedition-climb` | 生产：`pages/exploration/index.ts:37`<br>测试：1 个 | `pkg-explore/pages/exploration` | **B** |
| `engine/expedition-visual` | 生产：`pages/exploration/index.ts:49,57`<br>内部：`engine/route-calibration.ts:9`<br>测试：2 个 | `pkg-explore/pages/exploration` | **B** |
| `engine/exploration-engine` | 生产：`pages/exploration/index.ts:21`、`pages/altitude/index.ts:2`<br>测试：5 个 | `pkg-explore/pages/exploration`、`pkg-explore/pages/altitude` | **B** |
| `engine/pixel-scene` | **文件不存在** | `pkg-explore/pages/exploration/index.ts` | **不适用（本仓库无此文件）** |
| `engine/route-path` | 生产：`pages/exploration/index.ts:58`<br>测试：1 个 | `pkg-explore/pages/exploration` | **B** |
| `utils/route` | 生产：`pages/exploration/index.ts:93`<br>测试：1 个 | `pkg-explore/pages/exploration` | **B** |
| `utils/summary` | 生产：`pages/exploration/index.ts:99`<br>测试：2 个 | `pkg-explore/pages/exploration` | **B** |

编译产物中的引用同样存在，以 `dist/miniprogram/pages/exploration/index.js` 第 13—28 行为证：

```js
const index_2 = require("../../data/expeditions/index");
const exploration_engine_1 = require("../../engine/exploration-engine");
const expedition_climb_1 = require("../../engine/expedition-climb");
const expedition_camera_1 = require("../../engine/expedition-camera");
const expedition_visual_1 = require("../../engine/expedition-visual");
const route_path_1 = require("../../engine/route-path");
const route_1 = require("../../utils/route");
const summary_1 = require("../../utils/summary");
```

且 `engine/route-path.ts`、`engine/expedition-camera.ts` 等文件在 `dist/miniprogram/engine/` 下确实存在，路径可解析。

**为什么仍被判为未使用——当前最强解释：**

把报告的 8 个（除 `pixel-scene` 外）文件与「唯一引用者集合」对照，吻合度是 100%：它们**全部**是"只被探索页引用"（`engine/exploration-engine` 多一个海拔页），而**不在**报告里的 `data/explorations/index`、`world-manifests`、`media-registry`、`places`、`expedition-driver`、`exploration-store`、`format`、`expedition-observation` 则都有探索页之外的引用者。

而在 pixel 工作区里，**探索页与海拔页都已迁入 `pkg-explore` 分包**。因此这份名单精确等于「所有引用者都落在分包页面内的主包文件」。这与微信的未使用文件分析不把"仅被分包页面引用的主包文件"计入已使用这一行为一致。

**这个推论的旁证**：如果报告来自当前工作区，`engine/exploration-engine` 有一个主包页面的引用者（`pages/altitude`），就不应被标记——但它被标记了。

> 限制说明：我无法在本机运行微信代码依赖分析（自动化端点在当前环境不可用），因此上述归因是基于静态证据的推断，不是对工具行为的实测。分类 B 的理由是**生产引用确凿存在**，与工具为何误判无关。

**对 Gate 3 的直接含义：** 把探索页迁入分包后，**这份警告会原样复现**。这是子包架构的预期结果，不是需要靠删文件消除的问题。Gate 3 完成后必须用「引用可达性脚本 + 构建 + 测试」证明文件在用，而不是以微信列表变空为目标。

### 7.3 当前工作区真正的死代码

对全部 190 个源文件做可达性遍历（入口 = `app.json` 页面 + `app.ts` + `custom-tab-bar`），**生产不可达**的文件有 13 个，剔除配置文件与类型声明后为 9 个模块：

| 文件 | 编译体积 (KB) | 引用者 | 分类 |
| --- | ---: | --- | --- |
| `data/landforms.ts` | 4.3 | **无（生产 / 测试 / 脚本皆无）** | **A 真正未使用** |
| `data/media/candidates.ts` | 30.1 | 脚本 4 处 + 测试 2 处 | C 仅测试/工具使用 |
| `data/media/runtime-ingest.json` | 18.9 | 脚本 2 处（`fs.readFileSync`） | C 仅脚本使用 |
| `engine/calibration-solver.ts` | 7.7 | 测试 1 处 | C |
| `engine/expedition-planner.ts` | 4.8 | 测试 1 处 | C |
| `engine/projection-math.ts` | 4.1 | 测试 1 处 | C |
| `engine/terrain-projection.ts` | 8.5 | 测试 1 处 | C |
| `engine/validate-content.ts` | 22.1 | 脚本 3 处 + 测试 2 处 | C |
| `engine/world-frame.ts` | 2.3 | 测试 1 处 | C |

合计 **102.8 KB**。

`data/landforms.ts` 的核查过程：全仓库大小写不敏感搜索 `landform`，除自身定义外，`LANDFORMS` 与 `getLandformById` 两个导出**没有任何导入方**。`data/knowledge.ts` 里的 `relatedLandformIds` 是自由字符串，`pages/exploration/index.ts` 有自己独立的 `LANDFORM_LABELS` 映射。仓库内的 `OVERNIGHT_REPORT.md` 也记录了"`landforms.ts`（地貌成因数据）仍无独立消费页面"。

> 按用户明确规定：**本轮不为了扫描通过而删除任何文件**。以上仅作记录，处置方式留待后续 Gate 决策。

---

## 8. 资源引用审计

### 8.1 打进运行时包的非生产代码

`assets/` 之外的代码体积看似只有 1,138.7 KB，但其中 **102.8 KB 是生产不可达的**（§7.3 的 C 类）。它们进包的原因是构建管线两道无条件操作：

- `tsconfig.build.json` 的 `include: ["miniprogram/**/*.ts"]` —— 全量编译，不区分运行时/工具代码；
- `scripts/copy-assets.mjs` —— 遍历 `miniprogram/`，**无条件复制**全部 `.wxml/.wxss/.json/.png/.jpg/.jpeg/.webp/.svg`。

同一机制还导致以下文件被复制进 `dist/miniprogram/` 并参与打包：

| 文件 | 体积 (KB) | 说明 |
| --- | ---: | --- |
| `dist/miniprogram/project.config.json` | 0.5 | 开发者工具工程配置，属打包目录内的冗余副本 |
| `dist/miniprogram/project.private.config.json` | 0.3 | 同上（私有配置） |
| `dist/miniprogram/assets/world/globe-texture-source.txt` | 2.1 | 素材来源说明文档，代码中无引用 |

`packOptions.ignore` 为 `[]`，没有任何排除规则。

### 8.2 生产代码零引用的资源

| 文件 | 体积 (KB) | 核查结果 |
| --- | ---: | --- |
| `assets/content/fuji/f-navy-trail.jpg` | 161.4 | 只出现在 `data/media/candidates.ts`（候选清单，非生产）与 `data/media/runtime-ingest.json`（脚本产物）中；`data/media/**` 整体生产不可达 |
| `assets/content/mariana/k-marine-snow.jpg` | 108.6 | 同上 |
| `assets/world/globe-texture-source.txt` | 2.1 | 无代码引用，仅被设计文档提及 |

合计 **272.1 KB**。

> 注意：这两张图是"候选/评审阶段"资产。是否属于"已审核未上线"还是"应清除"，需要内容侧判断，本审计只报告事实。

### 8.3 模板字符串动态引用（合法但需注意）

静态扫描识别出两类动态路径：

| 位置 | 模板 | 覆盖的资产 |
| --- | --- | --- |
| `engine/webgl-globe-renderer.ts:750-752` | `/assets/world/globe-{texture-realistic,height,specular}-${suffix}.png` | 6 个 PNG（2048 档 + 4096 档） |
| `data/media/world-manifests.ts:38` | `/assets/expeditions/everest/waypoints/${file}` | 8 张 waypoint JPG |

`suffix` 的取值链：`pages/map/index.ts:336` ← `options.texture === "4096" ? 4096 : 2048`，默认 **2048**。

即：**3 个 4096 档贴图共 12,867.2 KB，占总量 45.2%**，只能通过 `?texture=4096` 查询参数抵达，日常路径不会加载它们。这 3 个文件单独就比主包上限大 6.3 倍。

其中 `base-camp.jpg` 值得单独说明：它被 `world-manifests.ts` 的模板引用（登记为 `ev-terrain-base-camp`），但 `pages/map/index.ts:722` 把地图上的 `base-camp` 节点指向了 `live-a-kala-patthar.jpg`。因此它**有声明、无实际展示路径**——不算死资源，但当前不产生用户可见价值。

### 8.4 资源引用总表

| 状态 | 文件数 | 体积 (KB) |
| --- | ---: | ---: |
| 有静态字符串引用 | 45 | 13,178.7 |
| 仅模板字符串动态引用 | 6 | 13,878.4 |
| **完全无引用** | **3** | **272.1** |
| 合计 | 54 | 27,329.1 |

（含 `base-camp.jpg` 在内的 6 个动态引用文件里，3 个是 4096 档贴图，另 3 个是 2048 档贴图与 `base-camp.jpg`。）

---

## 9. 页面依赖图

入口：`app.json` 的 13 个页面 + `app.ts` + `custom-tab-bar`。箭头表示 `import` / `require` / `usingComponents` / `@import`。

### 9.1 分层结构

```text
app.json (13 pages, 全部在主包)
│
├── pages/map ──────┬─→ engine: webgl-globe-renderer, globe-renderer, globe-marker-projection,
│                   │          expedition-observation, expedition-driver, expedition-stages,
│                   │          route-index, validate-expedition
│                   ├─→ data:   places, expeditions/everest, routes/everest/{index,south-col,visual-route},
│                   │          explorations/{index,everest,fuji,colorado,mariana}, media/world-manifests
│                   ├─→ utils:  place-search, format
│                   └─→ assets: 44 个（13,177.7 KB）
│
├── pages/exploration ─┬─→ engine: 13 个（expedition-camera/climb/visual/driver/observation/stages,
│                      │          exploration-engine, route-path, route-calibration, route-index,
│                      │          calibration-validate, media-registry, validate-expedition）
│                      ├─→ data:   15 个（含 expeditions/index, worlds, world-expedition）
│                      ├─→ utils:  summary, route, format
│                      └─→ assets: 36 个（8,786.7 KB）
│
├── pages/altitude ────┬─→ engine: exploration-engine, expedition-stages, route-index
│                      └─→ data:   9 个
│
├── pages/route-overview ┬─→ engine: expedition-observation, expedition-driver, expedition-stages,
│                        │          route-index, media-registry, validate-expedition
│                        └─→ data:   6 个
│
├── pages/camp-detail ─┬─→ engine: expedition-stages, route-index
│                      └─→ data:   expeditions/everest, routes/everest/*
│
├── pages/home ────────┬─→ engine: validate-expedition, expedition-stages, route-index
│                      ├─→ data:   discoveries, media/world-manifests, expeditions/everest, ...
│                      └─→ utils:  scene-search, discovery, format
│
├── pages/knowledge ──┬─→ engine: media-registry, validate-expedition, expedition-stages, route-index
│                     ├─→ data:   media/world-manifests, expeditions/everest, routes/everest/*,
│                     │          explorations/*, processes, knowledge
│                     ├─→ utils:  knowledge-media, knowledge-link
│                     └─→ assets: 36 个（8,786.7 KB）
│
├── pages/knowledge-detail ┬─→ engine: media-registry, validate-expedition, expedition-stages, route-index
│                          ├─→ data:   media/world-manifests, places, processes, knowledge, explorations/everest, ...
│                          └─→ assets: 36 个（8,786.7 KB）
│
├── pages/place ───────┬─→ engine: validate-expedition, expedition-stages, route-index
│                      └─→ data:   12 个
│
├── pages/quiz ────────┬─→ data:   quizzes
│                      └─→ utils:  quiz
│
├── pages/profile ─────┬─→ engine: expedition-observation, expedition-driver, expedition-stages, route-index
│                      └─→ data:   knowledge, explorations/*, places
│
└── pages/credits ─────┬─→ engine: expedition-stages, route-index, credits
                       └─→ data:   expeditions/everest, routes/everest/*

app.ts ─→ config/index
custom-tab-bar ─→ (仅页面路径跳转)
components/knowledge-popup, components/progress-bar ─→ (仅被 exploration 的 index.json 引用)
```

### 9.2 每页闭包规模

「distJS」为该页可达的全部 `.js` 之和（计唯一文件），「assets」为静态字符串可达的图片。

| 页面 | 模块数 | distJS (KB) | 资源数 | 资源 (KB) |
| --- | ---: | ---: | ---: | ---: |
| `pages/exploration/index` | 38 | **540.8** | 36 | 8,786.7 |
| `pages/map/index` | 29 | 453.7 | 44 | 13,177.7 |
| `pages/place/index` | 23 | 400.3 | 36 | 8,786.7 |
| `pages/knowledge/index` | 24 | 356.0 | 36 | 8,786.7 |
| `pages/knowledge-detail/index` | 19 | 298.6 | 36 | 8,786.7 |
| `pages/profile/index` | 20 | 274.5 | 0 | 0.0 |
| `pages/home/index` | 21 | 265.0 | 36 | 8,786.7 |
| `pages/altitude/index` | 17 | 239.8 | 2 | 3,464.7 |
| `pages/route-overview/index` | 17 | 206.8 | 36 | 8,786.7 |
| `pages/credits/index` | 12 | 126.7 | 2 | 3,464.7 |
| `pages/camp-detail/index` | 11 | 125.7 | 4 | 3,691.5 |
| `pages/quiz/index` | 9 | 31.3 | 0 | 0.0 |
| `pages/peaks/index` | 1 | 0.9 | 2 | 3,464.7 |

### 9.3 从依赖图读出的结构问题

1. **`data/media/world-manifests.ts`（47.8 KB 编译）是最大的人为耦合点。** 它被 `map`、`home`、`knowledge`、`knowledge-detail`、`place`、`route-overview`、`exploration` 共 7 个页面引用。由于它把四个世界的**全部**媒体条目放在一个文件里，**任何页面引用它，四个世界的全部媒体清单就整体进包**——这正是 Gate 4 要解决的 `data/expeditions/index` 同构问题。
2. **`data/explorations/**`（141.1 KB）与四个世界数据被 11 个页面可达**，其中包括只需 manifest 级信息的 `map` / `home` / `knowledge` / `knowledge-detail` / `profile`。主页与地图其实只需要世界的名称、图标、封面，却拉进了完整世界数据。
3. **`engine/validate-expedition.ts`（20.7 KB）与 `engine/validate-content.ts`（22.1 KB）是校验器**。前者被 7 个生产页面引用，后者生产不可达。校验逻辑进运行时包，属于典型的"工具代码误入产物"。
4. **探索页闭包吞掉 63% 的 JS**，其中 8 个模块的唯一生产引用者就是它（§7.2）——这正是 Gate 3 应该随探索页一起迁入分包的最小集合。
5. **`pages/peaks` 是空壳**（1 个模块，0.9 KB），仅由硬编码路径引用资源。
6. 资源可达性在页面之间存在大量重叠：`home`、`knowledge`、`knowledge-detail`、`exploration`、`route-overview`、`place` 六个页面的资源集合**完全相同**，都是同一批 36 张图；`map` 则可达 44 张。说明**没有按"世界"划分资源边界**。

---

## 10. 构建管线与配置事实

### 10.1 构建链路

```text
miniprogram/**/*.ts
   └─ tsc -p tsconfig.build.json   (module: CommonJS, outDir: dist/miniprogram)
        └─ dist/miniprogram/**/*.js        ← 全量编译，不区分运行时/工具

miniprogram/**/*.{wxml,wxss,json,png,jpg,jpeg,webp,svg}
   └─ scripts/copy-assets.mjs              ← 无条件全量复制

dist/miniprogram/
   └─ scripts/check-requires.mjs           ← 校验相对 require 可解析
```

`npm run build` = `clean` → `tsc` → `copy-assets` → `check-requires`。

**管线中没有任何一步涉及：分包、包体预算、资源压缩、未使用文件剔除、体积回归守卫。**

### 10.2 `project.config.json` 关键设置

| 设置 | 当前值 | 含义 |
| --- | --- | --- |
| `miniprogramRoot` | `dist/miniprogram/` | 打包根目录 |
| `packOptions.ignore` | `[]` | **无排除规则** |
| `minified` | **`false`** | **JS 未压缩** |
| `minifyWXSS` | `true` | 已开启 |
| `minifyWXML` | `true` | 已开启 |
| `es6` | `false` | 不做 ES6→ES5 转换 |
| `enhance` | `false` | 未启用增强编译 |
| `ignoreDevUnusedFiles` | `false` | 不剔除未使用文件 |
| `ignoreUploadUnusedFiles` | `false` | **上传时未使用文件全部进包** |
| `uploadWithSourceMap` | `true` | 无 `.map` 产生，实际无影响 |
| `lazyCodeLoading`（`app.json`） | `requiredComponents` | 运行时按需注入组件 |

`packOptions.ignore` 为空 + `ignoreUploadUnusedFiles: false` 的组合，解释了为什么 §7.3 的 9 个工具模块会进入上传包。

### 10.3 工作区状态（审计前后一致，未改动）

```text
 M project.config.json                                   ← 用户已有改动：填入 appid、isGameTourist
?? design/2026-wechat-mini-program-contest-requirements.md
?? design/cloudbase-media-migration-plan.md
```

`project.config.json` 的已有改动内容为 `appid`（空 → `wxb11931290726eb78`）与新增 `isGameTourist: false`，**本轮未触碰**。

### 10.4 另一个工作区（相关背景，不属本次范围）

`D:/code/self-github/geo-explorer-pixel`（`feat/pixel-redesign`）中已存在一份方向相同、进度明显更深的进行中工作：

- 已建立 `pkg-explore` / `pkg-place` 分包（页面迁出主包，`engine`/`data` 留在主包）；
- 已把地球贴图从 `miniprogram/assets/world/` 移到 `design/world/`，并新增 `assets/thumbs/`、`globe-color-1024.jpg`、`globe-height-512.png`、`globe-specular-512.png`；
- 已新增 `engine/globe-texture-tiers.ts`、`engine/pixel-scene.ts`、`data/media/media-tiers.ts`、`data/media/waypoint-images.ts`；
- 已用 `scripts/content/optimize-images.ts` 压缩全部 `assets/content/**` JPG（例如 `live-a-kala-patthar.jpg` 555 KB → 67 KB，`f-forest-lower.jpg` 367 KB → 93 KB）；
- 已有 `scripts/audit-package-size.mjs`。

**该工作区的改动不属于本次任务范围。本轮只做了只读核查（git status、目录列表、`app.json`/`project.config.json` 读取、编译产物的 `require` 路径比对），未修改其任何文件，也未合并其改动。** 记录在此是因为：它证明本任务的部分方案已被探索过，且 §7.1 的微信报告正是来自那里。若后续 Gate 需要复用其思路，应作为独立决策单独提出。

---

## 11. 面向后续 Gate 的事实性提示（不含方案设计）

以下仅为审计结论的直接推论，供 Gate 2/3/4 决策参考，**本轮未据此做任何修改**。

1. **Gate 2 的必要性排序已由数据决定**：图片 96%，代码 4%。即使 `minified: true` 全量生效，能省的也只是 JS 里的一部分，量级在数百 KB；而 7 张 PNG 与其余 12 张超 180 KB 的图片才是 MB 级。
2. **4096 档贴图（3 个文件，12,867.2 KB，占 45.2%）是一个独立决策点**：它只能由 `?texture=4096` 触发，是否应留在包内需产品判断。
3. **Gate 3 应迁移的最小集合是可精确计算的**：8 个模块的唯一生产引用者是探索页（+海拔页），它们是 `data/expeditions/index`、`engine/{expedition-camera,expedition-climb,expedition-visual,exploration-engine,route-path}`、`utils/{route,summary}`。迁走它们可让主包减少约 **540.8 KB 中的绝大部分**（探索页闭包）。
4. **Gate 3 会复现微信的 unused 警告**（§7.2）。验收必须依赖可达性脚本与测试，而不是微信列表。
5. **`check-requires.mjs` 已有"禁止裸目录 require"的约束**（微信 loader 不做 Node 式目录 index 解析）。任何分包迁移都必须保持这个不变量，`tests/gate31-require-regression.test.ts` 已覆盖源码侧。
6. **`world-manifests.ts` 是 Gate 4 最直接的靶点**：它是"一个文件装四个世界全部媒体"的现状实现，被 7 个页面引用。
7. **`data/landforms.ts`（真正死代码）与 3 个零引用资源**可作为独立的小清理项，但按用户规定本轮未删除。

---

## 12. 验证与限制

### 已执行的验证

| 项 | 命令 / 方法 | 结果 |
| --- | --- | --- |
| 产物新鲜度 | `tsc -p tsconfig.build.json --outDir <temp>` + SHA-256 比对 | 80/80 逐字节一致 |
| 类型检查 | `npm run typecheck` | 通过（退出码 0） |
| 单元测试 | `npx vitest run` | 48 文件通过 / 2 跳过，545 用例通过 / 7 跳过 |
| 可达性遍历 | 自建脚本，入口 = `app.json` + `app.ts` + `custom-tab-bar` | 生产不可达 13 个文件（含 4 个配置/类型） |
| 反向引用 | 严格语句解析 | 见 §7.2 |
| 资源引用 | 字符串字面量 + 模板路径识别 | 54 个资源全部归类 |
| 图片元数据 | 直接解析 PNG/JPEG 头 | 见 §5 |

### 限制

1. **未运行 `npm run build`。** 目的是避免改写已跟踪的 `dist/`；改用"编译到临时目录 + 逐字节比对"证明产物与源码一致，结论等价。
2. **未进行微信真机 / 开发者工具截图验收。** 当前环境的微信自动化端点不可用，本轮为纯静态审计，本来也不需要视觉验收。
3. **微信未使用文件的官方分析未实测。** §7.2 对误判成因的归因基于静态证据链推断，已在文中标注。
4. **资源可达性为静态近似。** 模板字符串、`wx.navigateTo` 携带的 id、运行时拼接的路径无法被完全静态枚举；本审计对动态路径做了单独归集（§8.3），未列入"零引用"的资源仍可能存在运行时不可达的情况。
5. **未对 `geo-explorer-pixel` 工作区做完整审计**，仅做了与 §7.1 归因直接相关的核查。

---

## 附录 A：本次审计使用的临时脚本

脚本写在系统临时目录 `C:\Users\admin\AppData\Local\Temp\geo-audit\`，**未加入仓库，未修改任何工作区文件**：

| 脚本 | 用途 |
| --- | --- |
| `size.mjs` | 按文件/扩展名/目录统计体积，输出 top60、>100KB、>200KB |
| `graph.mjs` | 生产可达性遍历 + 资源引用扫描 + 每页依赖闭包 |
| `usage.mjs` | 指定模块的严格反向引用（生产/内部/测试/脚本四类） |
| `pages.mjs` | 渲染每页依赖闭包与资源清单 |
| `assets.mjs` | 资源引用状态分类输出 |
| `imgmeta.mjs` | 解析 PNG/JPEG/WebP 头取得像素尺寸 |
| `compare.mjs` | `dist/` 与临时编译结果的 SHA-256 比对 |

Gate 5 要求的 `scripts/package-audit.mjs` / `asset-audit.mjs` / `package-verify.mjs` 尚未创建——它们属于 Gate 5 的交付物，本轮按 Gate 顺序未提前实现。

---

## 附录 B：Gate 1 判定

| 检查项 | 状态 |
| --- | --- |
| 当前主包大小 | ✅ 28,465.8 KB ≈ 27.80 MiB |
| 总包大小 | ✅ 同主包（无分包） |
| 最大 30 个文件 | ✅ §3 |
| 所有 > 100 KB 文件 | ✅ §4（40 个） |
| 所有 > 200 KB 图片/音频 | ✅ §5（18 个，音频 0） |
| JS 文件体积排行榜 | ✅ §6（80 个，前 40 名） |
| 微信报告 unused JS 逐个核查 + 分类 | ✅ §7（A/B/C/D 分类完成） |
| 页面依赖图 page → engine → data → assets | ✅ §9 |

**Gate 1 完成，按指令在此停止，不进入 Gate 2。**
