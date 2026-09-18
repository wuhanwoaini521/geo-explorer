# Gate 2 — 安全包体优化（Package Optimization）

对象：`geo-explorer` 主工作区（`D:\code\self-github\geo-explorer`，分支 `main`）。

本轮**没有改变任何用户可见行为**：页面结构、导航、探索交互、Everest / Mariana 体验、视觉方向（realistic design）全部保持原样。未引入 pixel redesign，未切换分支，未 merge / cherry-pick `feat/pixel-redesign`。

`geo-explorer-pixel` 仅作为**只读参考**使用，具体见 §7。

---

## 0. 结果摘要

| 指标 | Before | After | 变化 |
| --- | ---: | ---: | ---: |
| **主包大小** | 28,465.8 KB（27.80 MiB） | **6,560.0 KB（6.41 MiB）** | **−21,905.7 KB（−77.0%）** |
| **总包大小** | 同上（无分包） | 同上 | 同上 |
| 图片 | 27,327.0 KB | 5,522.0 KB | −79.8% |
| JS | 853.5 KB | 772.6 KB | −9.5% |
| 文件数 | 188 | 173 | −15 |
| **>200 KB 本地媒体** | 18 | **4**（均为例外，见 §4.3） | −14 |
| PNG in package | 7 | **0** | −7 |
| dev-only 模块进包 | 8 个 / 102.8 KB | **0** | −102.8 KB |

达标情况：

| 判据 | 目标 | 实际 | 结论 |
| --- | --- | --- | --- |
| Build | PASS | `npm run build` 退出码 0 | ✅ |
| TypeScript | PASS | `npm run typecheck` 退出码 0 | ✅ |
| Vitest | PASS | 50 文件通过 / 2 跳过；555 用例通过 / 7 跳过 | ✅ |
| 用户功能不变 | 必须 | 无业务逻辑改动，见 §6.3 | ✅ |
| 不引入 pixel redesign | 必须 | 未引入 | ✅ |
| 不误删 runtime JS | 必须 | Gate 1 的 8 个模块**一个都没动**，见 §6.4 | ✅ |
| >200 KB 本地媒体 = 0 | 或明确例外 | 4 个，逐项书面说明 | ⚠️ 例外 |
| production build 不再携带 dev-only 模块 | 必须 | 已从 build 配置修复 | ✅ |
| 包体 < 8 MiB | 最低 | 6.41 MiB | ✅ |
| 包体 < 5 MiB | 推荐 | **未达到**，原因见 §8.3 | ⚠️ |
| 主包 < 2 MiB（微信发布限制） | —— | 仍 3.20 倍超限 | ❌ 见 §8.3.1 |

**未达到 5 MiB 的说明（按你的要求如实报告）**：不再继续压缩的唯一原因是——剩下的体积几乎全部是"必须保持原生分辨率才不糊"的实景影像（地球贴图、全屏 TERRAIN 主视觉、全屏 LIVE 实景）。具体数字与论证在 §4.3 与 §8.3，请据此判断是否接受 6.41 MiB，或改用 CDN（Gate 4 的 CloudBase 方案）。

**必须提前说清楚的一点**：Gate 2 把体积砍掉 77%，但**没有让包变成可上传**。当前 `app.json` 仍无 `subpackages`，微信把这 6,560 KB 全部算作主包，仍超 2 MiB 上限 3.20 倍。主包之所以超限，一部分原因是所有页面都还在主包里——这需要 Gate 3 收口。详见 §8.3.1。

---

## 1. 优化策略总览

严格遵循 `尺寸 → 格式 → 质量` 的顺序，没有用"极低 quality"换体积。

| 组 | 处理 | 依据 |
| --- | --- | --- |
| 4096 档地球贴图 ×3 | **移出代码包**（挪到 `design/world/`），运行时保留档位解析与远端回退 | 占改造前整包 45.2%，且只有开发期 query `?texture=4096` 可达 |
| 地球贴图 2048 档 ×3 + everest 主视觉 | PNG → JPEG（原生尺寸不动） | 项目内 7 张 PNG **全部无 alpha 通道**；PNG 对照片型内容是 1748 KB/MP 的灾难 |
| `assets/content/**` ×34 | 最长边 1080 → **900**，JPEG q80 | 真实显示尺寸论证见 §3.2；降采样幅度经视觉评审确认 |
| `assets/expeditions/**` ×9 | JPEG q80，尺寸不动 | 全屏 LIVE 实景与 waypoint 卡片，见 §3.3 |
| 零引用资源 ×2 | 删除 | §5.1 |
| 死代码 `landforms.ts` | 删除 | §5.2 |
| dev-only 模块 ×8 | 从 build 配置排除 | §6.1 |

---

## 2. 体积对照

### 2.1 分组对照

| 组 | Before (KB) | After (KB) | 变化 (KB) |
| --- | ---: | ---: | ---: |
| `assets/world` | 20,353.8 | 1,311.0 | −19,042.8 |
| `assets/content` | 5,591.9 | 3,062.4 | −2,529.5 |
| `assets/expeditions` | 1,381.3 | 1,148.6 | −232.7 |
| 代码（js + wxss + wxml + json） | 1,138.7 | 1,038.0 | −100.7 |
| **合计** | **28,465.8** | **6,560.0** | **−21,905.7** |

### 2.2 按类型

| 扩展名 | Before (KB) | After (KB) |
| --- | ---: | ---: |
| `.png` | 20,352.8 (7) | **0（已清零）** |
| `.jpg` | 6,973.2 (45) | 5,520.9 (47) |
| `.js` | 853.5 (80) | 772.6 (73) |
| `.wxss` | 147.0 (17) | 147.0 (17) |
| `.wxml` | 80.9 (16) | 80.9 (16) |
| `.json` | 57.3 (22) | 37.5 (19) |
| `.svg` | 1.1 (1) | 1.1 (1) |

### 2.3 关于 `minified`

`project.config.json` 的 `minified` 由 `false` 改为 `true`（`minifyWXSS` / `minifyWXML` 原本已是 `true`）。开发者工具在**上传时**才做 JS 压缩，`dist/` 里仍是未压缩的编译产物，所以上面的对照是"同口径的 dist 体积"，不包含这项增益。

用 esbuild（仓库自带，`esbuild 0.21.5`，`target: es2018`）对 `dist` 的 73 个 JS 做了压缩估算，作为这项增益的量级参考：

| | KB |
| --- | ---: |
| 未压缩 JS | 772.6 |
| 压缩后（估算） | 574.8（−25.6%） |
| 估算后的整包 | **约 6,362 KB ≈ 6.21 MiB** |

这是**估算**，不是开发者工具实测值——本机无法运行微信代码依赖分析/上传体积统计（见 §8.2）。

---

## 3. 图片处理细节

### 3.1 地球贴图（4096 移出 + 2048 转 JPEG）

| 文件 | Before | After | 处理 |
| --- | ---: | ---: | --- |
| `globe-texture-realistic-4096.png` | 10,476.1 | **0** | 移到 `design/world/` |
| `globe-specular-4096.png` | 1,545.8 | **0** | 移到 `design/world/` |
| `globe-height-4096.png` | 845.3 | **0** | 移到 `design/world/` |
| `globe-texture-realistic-2048.png` → `.jpg` | 3,666.0 | 527.9 | q85，原生 2048×1024 |
| `globe-specular-2048.png` → `.jpg` | 578.7 | 302.2 | q90，原生 2048×1024 |
| `globe-height-2048.png` → `.jpg` | 318.3 | 130.6 | q90，原生 2048×1024 |
| 小计 | 17,430.2 | 960.7 | **−16,469.5 KB** |

**为什么 2048 档不能再降**：`.globe-webgl-canvas` 是 750rpx × 900rpx，3x 设备上 1125×1350 物理像素；渲染器的球体半径是 `min(width*0.45, height*0.5)` = `min(506, 675)` = 506 px，即球体直径约 **1012 px**。2048 等距矩形贴图的可见半球宽是 1024 texel → **恰好 1:1**。降到 1024 会变成 2:1 放大，球面明显发软。

**为什么 4096 档是纯浪费**：
- 只有在 `pages/map` 的 `?texture=4096` query 下才会请求（默认 `textureScale = 2048`），正式运行从不加载；
- 更关键的是，两张 4096 材质图（height / specular）在原脚本里是**把 2048 的颜色栅格放大**得到的（`color_raster(2048).resize((4096, 2048))`），本身不携带任何 2048 之外的信息；
- 3 个文件合计 12,867.2 KB，占改造前整包 **45.2%**。

**CDN / 云存储扩展点**：新增 `miniprogram/engine/globe-texture-source.ts`（纯函数，无 wx 依赖）：

```ts
resolveGlobeTextures(2048)                      // → 包内 /assets/world/globe-*-2048.jpg
resolveGlobeTextures(4096, "")                  // → 降级为包内 2048（不会去请求缺失的 4096）
resolveGlobeTextures(4096, "https://cdn/globe/") // → https://cdn/globe/globe-*-4096.jpg
```

将来接入 CDN 只需填 `GLOBE_TEXTURE_REMOTE_BASE`，渲染器代码不用改。同时修掉一个既有隐患：`uTexel` 原来直接用 `options.textureScale`，若请求 4096 而实际加载 2048，凹凸采样的步长会错位；现在改用解析后的实际档位 `globeTextures.size`。

### 3.2 内容照片（`assets/content/**`）

**决策：最长边 1080 → 900，JPEG q80。**

尺寸依据（把该图在全 app 里的真实显示场景都算了一遍，3x 基准）：

| 场景 | 样式 | 物理像素 | 是否有遮罩 |
| --- | --- | --- | --- |
| 地点详情头图 | `.detail-hero` 750×690rpx，aspectFill | 1125×1035 | 有：`rgba(5,18,32,.65)` → `#07131f` 全不透明 |
| 地点详情内嵌图 | `.detail-inline-image` 750×250rpx | 1125×375 | 无，但 `opacity: .92` |
| 知识详情配图 | `.media-image` 690×400rpx | 1035×600 | 无 |
| 知识卡片 | `.knowledge-card` 360×260rpx | 540×390 | 有：底部 82% 渐变 |
| 知识过程卡 | `.process-card` 430×270rpx | 645×405 | 有 |

**最大的无遮罩显示宽度是 1035 px**（知识详情配图）。900 在这个场景是 1.15× 放大；在完全无遮罩的过程卡场景是 1.4× 密度余量。

**视觉评审（不是我一个人的判断）**：我按真实显示尺寸渲染了三张代表性照片（森林、岩层化石、河谷）的 1080 / 900 / 800 三联对比图，叠加了项目自己的头图渐变遮罩，交给视觉子代理逐面板观察。结论：

> **900：可以说"用户察觉不到质量下降"**，六行里没有任何一行出现可归因于分辨率变化的可见退化。
> **800：也基本达标，但已不是零风险**——高频细节照片上有可测且单调的细节损失（岩层行拉普拉斯锐度 −25%~−38%），头图未遮罩的亮部达到"边缘可察觉"（眼滤波 SSIM 0.983）。
> **必须三选一 → 选 900。**

（评审同时指出它的对比 harness 存在半像素配准偏移，因此它明确声明 `plain r2 / plain r3 / hero r3` 三行的逐像素差异不可用于排序 900 与 800。我采纳这个限制，不据此做更激进的判断。）

实测结果（34 个文件）：`5,591.9 → 3,062.4 KB`。分布：

| 区间 | 文件数 |
| --- | ---: |
| ≤ 100 KB | 17 |
| 100–150 KB | 14 |
| 150–190 KB | 3 |

最大的三个是 `c-vishnu-river.jpg` 189.4、`f-forest-lower.jpg` 178.6、`c4-phantom-ranch.jpg` 171.9 KB——都在你给的 200 KB 硬上限内，略高于 150 KB 推荐值。

### 3.3 探索影像（`assets/expeditions/**`）

`1,381.3 → 1,148.6 KB`，只做 JPEG q80 重编码，**尺寸不动**：

- `live-a-kala-patthar.jpg`（1080×1920）：全屏 LIVE 实景，3x 设备上按 ~1125 px 宽显示，缩下来会糊。
- 8 张 waypoint（900×600）：`.wpd-media` 是 700rpx × 286rpx 的卡片，900 已是原生。

### 3.4 无损母版保留

`everest-expedition-hero-v1.png`（2,922.5 KB）转 JPEG 后，**原始无损 PNG 被保存到 `design/world/everest-expedition-hero-v1.png`**（不进代码包）。

原因：`scripts/waypoints/build-waypoint-images.cjs` 从这张图裁出 8 张 waypoint 卡片。若让它读 q85 的 JPEG，JPEG 的压缩损失会再叠加到裁切结果上。保留母版后，waypoint 生成链路仍然无损，该脚本已改为读 `design/world/` 的母版。

---

## 4. 文件清单

### 4.1 最大 30 个文件（After）

| # | 文件 | KB | | # | 文件 | KB |
| ---: | --- | ---: | --- | ---: | --- | ---: |
| 1 | `assets/world/globe-texture-realistic-2048.jpg` | 527.9 | | 16 | `assets/content/colorado/c2-devils-corkscrew.jpg` | 115.1 |
| 2 | `assets/expeditions/everest/live/live-a-kala-patthar.jpg` | 505.1 | | 17 | `pages/exploration/index.js` | 108.4 |
| 3 | `assets/world/everest-expedition-hero-v1.jpg` | 349.3 | | 18 | `assets/content/mariana/m4-hadal-snailfish-map.jpg` | 104.0 |
| 4 | `assets/world/globe-specular-2048.jpg` | 302.2 | | 19 | `assets/content/mariana/m3-trieste-1960.jpg` | 102.2 |
| 5 | `assets/content/colorado/c-vishnu-river.jpg` | 189.4 | | 20 | `assets/content/fuji/f1-yamanaka-view.jpg` | 97.2 |
| 6 | `assets/content/fuji/f-forest-lower.jpg` | 178.6 | | 21 | `assets/content/colorado/c-river-nps.jpg` | 96.6 |
| 7 | `assets/content/colorado/c4-phantom-ranch.jpg` | 171.9 | | 22 | `assets/content/fuji/f4-hoei-rim.jpg` | 95.4 |
| 8 | `assets/content/colorado/c-indian-garden.jpg` | 152.3 | | 23 | `assets/expeditions/everest/waypoints/camp-i.jpg` | 95.1 |
| 9 | `assets/content/colorado/c1-trailhead.jpg` | 144.3 | | 24 | `assets/content/colorado/c-resthouse-3mi.jpg` | 95.1 |
| 10 | `assets/content/colorado/c3-kaibab-fossils.jpg` | 143.4 | | 25 | `assets/expeditions/everest/waypoints/western-cwm-camp-ii.jpg` | 93.8 |
| 11 | `assets/content/colorado/c-resthouse-15.jpg` | 138.1 | | 26 | `assets/expeditions/everest/waypoints/base-camp.jpg` | 91.0 |
| 12 | `assets/world/globe-height-2048.jpg` | 130.6 | | 27 | `assets/expeditions/everest/waypoints/khumbu-icefall.jpg` | 90.5 |
| 13 | `assets/content/fuji/f-osunabashiri.jpg` | 126.5 | | 28 | `assets/content/everest/ev-b1-western-cwm.jpg` | 89.7 |
| 14 | `assets/content/fuji/f-yoshida-huts.jpg` | 125.1 | | 29 | `assets/expeditions/everest/waypoints/south-col-camp-iv.jpg` | 86.7 |
| 15 | `assets/content/mariana/m1-gebco-bathymetry.jpg` | 124.3 | | 30 | `assets/expeditions/everest/waypoints/lhotse-face-camp-iii.jpg` | 83.3 |

第 30 名之后即不再有 80 KB 以上的文件。对照 Before：前 30 名合计 25,463.0 KB（占当时整包 89.5%）；After 前 30 名合计 **4,753.1 KB（占当前整包 72.5%）**。

### 4.2 所有 > 100 KB 媒体（After，共 19 个）

即上表第 1–19 名（唯一非媒体条目是第 17 名的 `pages/exploration/index.js`，108.4 KB，未压缩的编译产物，`minified: true` 后会更小）。

### 4.3 所有 > 200 KB 媒体（After，共 4 个 —— 全部为例外）

| # | 文件 | KB | 为什么不能更小 |
| ---: | --- | ---: | --- |
| 1 | `assets/world/globe-texture-realistic-2048.jpg` | 527.9 | 2048×1024 等距矩形贴图，球体直径 1012 px，可见半球 1024 texel → **恰好 1:1**。降到 1024 会变成 2:1 放大。格式已是 JPEG（q85，对比原图 PSNR 35.0 dB）；PNG 原版是 3,666 KB，压缩比已达 6.9:1 |
| 2 | `assets/expeditions/everest/live/live-a-kala-patthar.jpg` | 505.1 | 1080×1920，全屏 LIVE 实景主图（`object-position` 焦点裁切 + 相机 transform），3x 屏按约 1125 px 宽显示。q80 后已是 244 KB/MP，继续降 quality 属于靠质量换体积 |
| 3 | `assets/world/everest-expedition-hero-v1.jpg` | 349.3 | 1024×1536，全屏 TERRAIN 主视觉，且会被相机 `viewZoom` **二次放大**。这是原生分辨率，本身就低于 3x 屏需求；再缩会直接可见 |
| 4 | `assets/world/globe-specular-2048.jpg` | 302.2 | 图内海岸线边界在球面上约 1 texel ≈ 1 屏幕像素，降分辨率会让海面高光边界变糊。已从 578.7 KB 的 PNG 转为 JPEG q90（对比原图 PSNR 43.4 dB） |

4 个合计 1,684.5 KB，占当前整包 **25.7%**。这是"保持现有视觉不变"这条硬约束下的体积下界。

---

## 5. 删除与迁移的资源

### 5.1 删除（生产零引用）

| 路径 | 大小 | 检索证据 | 理由 |
| --- | ---: | --- | --- |
| `miniprogram/assets/content/fuji/f-navy-trail.jpg` | 161.4 KB | 全仓库检索 `f-navy-trail`：仅命中 `miniprogram/data/media/candidates.ts:298`（`status: "rejected"`，tag `user-feedback-2026-09-12-runtime-replaced`）、`miniprogram/data/media/runtime-ingest.json`、`design/content/media-review/*.json`（评审板数据）。`data/media/**` 整体生产不可达（Gate 1 §7.3） | 已评审**拒绝**的候选图，运行时副本是残留；`world-manifests.ts` 从未登记它 |
| `miniprogram/assets/content/mariana/k-marine-snow.jpg` | 108.6 KB | 同上检索 `k-marine-snow` | 候选状态为 `review`（从未 approved）；`engine/media-registry.ts` 只返回 `reviewStatus === "approved"` 的资产，因此它**永远不可能被显示** |

两张图的候选记录仍保留在 `candidates.ts` 与评审板数据中（那是对的——管线记录不该丢），只是运行时的副本被清除。同时把这两条从 `runtime-ingest.json` 移除，避免留下指向不存在文件的条目。

### 5.2 删除（死代码）

| 路径 | 大小 | 检索证据 | 理由 |
| --- | ---: | --- | --- |
| `miniprogram/data/landforms.ts` | 4.3 KB（编译后） | 全仓库大小写不敏感检索 `landform`：除自身定义外，`LANDFORMS` / `getLandformById` **没有任何导入方**。生产、55 个测试文件、`scripts/**` 全部为零引用。`data/knowledge.ts` 的 `relatedLandformIds` 是自由字符串，`pages/exploration/index.ts` 有自己独立的 `LANDFORM_LABELS` 映射 | 确认无任何入口可达 |

### 5.3 迁移（移出代码包，未删除）

| 路径 | 大小 | 去向 | 理由 |
| --- | ---: | --- | --- |
| `globe-texture-realistic-4096.png` | 10,476.1 KB | `design/world/` | 见 §3.1 |
| `globe-specular-4096.png` | 1,545.8 KB | `design/world/` | 同上 |
| `globe-height-4096.png` | 845.3 KB | `design/world/` | 同上 |
| `globe-texture-source.txt` | 2.1 KB | `design/world/` | **移动而非删除**：它是贴图来源/许可说明（比赛材料需要）。内容已更新为新的格式与档位策略。代码包不再携带它 |
| `everest-expedition-hero-v1.png` | 2,922.5 KB | `design/world/` | 保留为无损母版，供 waypoint 裁切链路使用，见 §3.4 |

### 5.4 格式替换（PNG → JPEG）

4 个文件：`globe-texture-realistic-2048`、`globe-spectral-2048`、`globe-height-2048`、`everest-expedition-hero-v1`。

依据：**项目内全部 7 张 PNG 都没有 alpha 通道**（用 Pillow 逐张检查 `mode` 与 `transparency`：颜色贴图/主视觉是 `RGB`，height/specular 是 8-bit 灰度 `L`）。所以转 JPEG 不涉及透明度损失。

---

## 6. 代码与配置变更

### 6.1 生产构建边界（你要求的第 5 项）

**根因**（Gate 1 已查明）：构建链路有两处"无条件"步骤——`tsconfig.build.json` 的 `include: ["miniprogram/**/*.ts"]` 全量编译，`scripts/copy-assets.mjs` 无条件复制全部非 TS 资源。

**修复（从 build source / configuration，不是删 dist）**：

| 文件 | 变更 |
| --- | --- |
| `scripts/runtime-excludes.mjs`（新增） | dev-only 清单的**单一事实来源**，含 10 个条目 |
| `tsconfig.build.json` | `exclude` 加入 7 个 .ts 条目 |
| `scripts/copy-assets.mjs` | 消费该清单，跳过 dev-only 资源（本次输出 `skipped 3 dev-only file(s)`） |
| `tests/build-boundary.test.ts`（新增，4 个用例） | ① tsconfig 的 exclude 与清单的 .ts 子集一致；② 清单条目真实存在（防腐化）；③ **构建产物里不存在这些条目**（端到端）；④ **反向验证**：这些模块不被任何生产入口可达——清单漏加或误加都会失败 |

被排除的条目：

```
data/media/candidates.ts           内容流水线数据（只被 scripts/content/* 读）
data/media/runtime-ingest.json     同上
engine/calibration-solver.ts       离线相机校准求解器（只被 tests/*）
engine/expedition-planner.ts       离线规划器（只被 tests/*）
engine/projection-math.ts          投影数学（只被 tests/*）
engine/terrain-projection.ts       地形投影（只被 tests/*）
engine/world-frame.ts              大地坐标换算（只被 tests/*）
engine/validate-content.ts         内容校验器（只被 scripts/* 与 tests/*）
project.config.json                开发者工具工程配置副本（打包根由顶层配置指定）
project.private.config.json        同上（本地未跟踪文件）
```

**注意**：`engine/validate-expedition.ts` **没有**被排除——它被 7 个生产页面引用，属于运行时校验。`engine/calibration-validate.ts` 同理（探索页引用）。

产物侧结果：JS 文件 80 → 73（含新增的 `globe-texture-source.js`），`.json` 22 → 19，`dist/miniprogram/` 根目录不再有多余的 `project*.config.json`。

### 6.2 `project.config.json`

| 字段 | Before | After |
| --- | --- | --- |
| `minified` | `false` | **`true`** |
| `minifyWXSS` | `true` | 不变 |
| `minifyWXML` | `true` | 不变 |

**只改了 `minified` 这一个字段。** 你已有的 `appid: "wxb11931290726eb78"` 与 `isGameTourist: false` 原样保留（`git diff` 可见它们与本次改动并存，未被覆盖或还原）。

### 6.3 其余代码改动（均为最小改动，无业务逻辑变化）

| 文件 | 变更 |
| --- | --- |
| `miniprogram/engine/globe-texture-source.ts` | **新增**。贴图档位 → URL 的纯函数解析，含远端基址扩展点 |
| `miniprogram/engine/webgl-globe-renderer.ts` | 贴图地址改用解析器；`uTexel` 改用实际生效档位 |
| `miniprogram/engine/globe-renderer.ts` | Canvas 2D 兜底路径的 `TEXTURE_SRC` 改用 `globeColorTextureSrc()` |
| `miniprogram/pages/{exploration,map,peaks,place}/index.ts` | 5 处 `everest-expedition-hero-v1.png` → `.jpg`（仅扩展名） |
| `miniprogram/data/routes/everest/visual-route.ts` | `EVEREST_HERO_IMAGE` 扩展名 |
| `miniprogram/data/media/world-manifests.ts` | **45 处 `hash` 更新**为优化后文件的 sha256 |
| `miniprogram/data/expeditions/everest.ts` | 1 处 `hash` 更新 |
| `miniprogram/data/media/runtime-ingest.json` | 34 条 `runtimeSha256` 重算；移除 2 条指向已删除文件的条目 |

**关于 hash 更新**：`world-manifests.ts` 的 `hash` 是运行时资产的 sha256 指纹，`tests/release-contract.test.ts` 与 `tests/gate33c-live-a.test.ts` 会实算校验，`scripts/content/release-readiness.ts` 还会交叉校验 `runtime-ingest.json`。资产内容因优化而合法改变，指纹必须同步重算——否则这套"防篡改"契约会变成红灯。45 处均已按实文件重算并通过测试。

### 6.4 明确没有动的东西

Gate 1 §7.2 用真实 `require` 证据证明了下列模块**存在生产引用**，本轮**一个都没有删除、移动、重写或禁用**：

```
data/expeditions/index    engine/expedition-camera   engine/expedition-climb
engine/expedition-visual  engine/exploration-engine  engine/route-path
utils/route               utils/summary
```

`engine/pixel-scene.js` 不属于本工作区（Gate 1 §7.1 已证），已忽略。

### 6.5 脚本与工具链（保持可复现）

| 文件 | 变更 |
| --- | --- |
| `scripts/optimize-package-assets.py` | **新增**。本轮图片优化的可复现脚本（支持 `--dry-run`），docstring 记录了每一步的尺寸依据 |
| `scripts/world_textures.py` | **新增**。贴图派生的共享配方（颜色栅格 + 输出层/格式约定） |
| `scripts/prepare-globe-texture-variants.py` | 改为：2048 → 包内 JPEG，4096 → `design/world/` PNG |
| `scripts/build-globe-material-maps.py` | 同上；并从 design 源派生而非读包内 PNG |
| `scripts/waypoints/build-waypoint-images.cjs` | 取源改为 `design/world/` 的无损母版 |

**可复现性已验证**：`prepare-globe-texture-variants.py` 与 `build-globe-material-maps.py` 重新生成 6 个贴图文件后，与仓库内文件 **sha256 逐字节一致**（含 design 层的 3 个 4096 PNG）。

---

## 7. 对 `geo-explorer-pixel` 的使用（只读参考）

按你的规定，**没有切换分支、没有 merge、没有 cherry-pick**，只做了只读核查，具体是：

| 参考内容 | 用途 | 是否采用 |
| --- | --- | --- |
| 它的 `scripts/content/optimize-images.ts` 与压缩后资产的实际尺寸 | 了解已被验证过的压缩档位 | 部分参考。它把 content 压到 **600 px** 宽（3,062 KB → 1,806 KB）。我判断 600 px 在知识详情配图（1035 px 显示）上会明显发软，因此选择 **900 px**，并做了独立的视觉评审 |
| 它把地球贴图移出 `miniprogram/assets/world/` 的做法 | 4096 档处理的思路验证 | 采用同一思路，但在 main 上独立实现，并补上档位解析模块与回退契约 |
| 它有 `scripts/audit-package-size.mjs` | 确认包体审计工具是合理方向 | 未采用其代码；Gate 5 会在 main 上独立实现 `package-audit.mjs` 等三个脚本 |
| 它的像素风渲染、页面重排、`pkg-explore` 分包 | —— | **完全未采用**（不属于 Gate 2 范围，且你明确禁止 pixel redesign） |

它的 `project.config.json` 把 `ignoreDevUnusedFiles` / `ignoreUploadUnusedFiles` 设为 `true`；我**没有**在 main 上跟随这个设置（理由见 §8.4）。

---

## 8. 验证与限制

### 8.1 验证结果

| 项 | 命令 | 结果 |
| --- | --- | --- |
| 构建 | `npm run build` | **PASS**（退出码 0）。`clean` 删除 173 文件 → `tsc` 编译 73 个 JS → `copy-assets` 复制 100 个资源（跳过 3 个 dev-only）→ `check-requires` 无目录级 require / 无悬空引用 |
| 类型检查 | `npm run typecheck` | **PASS**（退出码 0） |
| 单元测试 | `npx vitest run` | **PASS**：52 个文件（50 通过 / 2 跳过）、562 个用例（555 通过 / 7 跳过）。基线为 50 文件 / 552 用例，新增 `build-boundary.test.ts`(4) 与 `globe-texture-source.test.ts`(6) |
| 资产引用完整性 | 自建扫描器遍历 210 个文件的 `/assets/**` 字面量 | **无可达资产的断链**。48 个资源全部被引用（其中 4 个经由模板字符串，已单独归集） |
| 贴图可复现性 | 重跑两个贴图脚本 + sha256 比对 | 6/6 文件逐字节一致 |
| 包体 | 自建统计 | 见 §2 |

### 8.2 未能完成的验证（限制）

1. **没有做微信 GUI 验收。** 当前环境微信自动化端点不可用（`npm run wechat:screenshot` 依赖 `ws://127.0.0.1:9420`），因此**地球是否正常渲染、各页面视觉是否正常，本轮没有在微信环境里实际看过**。我把能做的静态证据都做了：

   - 贴图档位解析的 6 个单元测试（含"解析出的包内地址在 dist 中真实存在"与"代码包里不存在任何 4096 贴图文件"）；
   - `tests/globe-texture-source.test.ts` 断言 dist 中确实存在 `globe-*-2048.jpg` 三个文件；
   - 全仓库资产引用扫描无断链；
   - `tests/globe-renderer.test.ts`、`tests/map-globe-ui.test.ts` 等既有地球测试全部通过。

   **但这不等同于"地球上屏正常"。** 请按你的流程在开发者工具/真机确认默认态、选中态、拖拽旋转、地点点击、图鉴开合与 Canvas 兜底态。

2. **`minified: true` 的实际效果未实测。** §2.3 的压缩后体积是 esbuild 的估算，不是开发者工具的上传体积统计。

3. **视觉评审的尺度限制。** 评审用的是按真实显示尺寸渲染的三联对比图，但子代理最终是以约 1/3 尺度观察面板的，它自己也声明了这一点以及 harness 的半像素配准偏移。900 px 的结论是"该尺度下的肉眼判断 + 数值代理指标"，不是 1:1 像素级确认。

4. **内容图源不可逆。** 优化后的 `assets/content/**` 是从仓库内的 1080 px 版本降采样得到的；`media-source/` 原图不在仓库里（gitignored），`scripts/content/optimize-images.ts` 无法在当前环境重跑。1080 px 版本可从 git 历史取回。

### 8.3 包体为什么停在 6.41 MiB（而不是 < 5 MiB）

按你的要求如实报告，不再暴力压缩。当前 6.41 MiB 的构成：

| 组 | KB | 占整包 |
| --- | ---: | ---: |
| 4 个"必须原生分辨率"的实景影像（§4.3） | 1,684.5 | 25.7% |
| 其余 43 张已优化的照片 | 3,836.4 | 58.5% |
| SVG（`world-map.svg`，地图兜底层） | 1.1 | 0.0% |
| 未压缩 JS | 772.6 | 11.8% |
| wxss + wxml + json | 265.4 | 4.0% |

要再降约 1.3 MB（到 5 MiB）只有三条路，都不在 Gate 2 的允许范围内：

1. **把 content 再降到 600–720 px** —— 视觉评审已明确判定 800 在知识详情配图上有可测退化，720 会更差。属于"为数字破坏视觉质量"。
2. **给 content 加一层缩略图（列表用 400px + 详情用原图）** —— 这是架构改动（要引入 `thumbPath` 与两套资产），Gate 2 明确不做，且会把资产数量翻倍。
3. **把照片搬上 CDN / 微信云存储** —— 这是 Gate 4 与 `design/cloudbase-media-migration-plan.md` 的议题。按 Gate 1 的测量，全部图片云化后主包约 1.0 MB。

我的判断：**6.41 MiB 是"保持现有视觉不变"这条约束下的合理结果**（相对 20 MiB 的总包额度只用掉 32.0%）。是否继续降，取决于你对上面三条路的取舍。

### 8.3.1 一个必须说清楚的限制：Gate 2 没有让包变成"可上传"

当前 `app.json` **仍然没有 `subpackages`**，所以微信把这 6,560 KB 全部算作**主包**：

| 限制 | 额度 | 当前 | 结论 |
| --- | ---: | ---: | --- |
| 主包 | 2 MiB | 6.41 MiB | **仍超 3.20 倍，无法上传** |
| 所有分包合计 | 20 MiB | 6.41 MiB | 32.0%，有余量 |

也就是说：**Gate 2 把体积砍掉了 77%，但没有解决"主包超限"这个发布阻断**——因为主包之所以超限，一部分原因是所有页面都还在主包里。这需要 Gate 3 的分包架构来收口。Gate 1 §2.1 与本次结果合起来看：代码总量（1,038 KB）已经能装进 2 MiB 主包，瓶颈是"图片该跟哪个页面走"。

### 8.4 其他未处理项（有意保留）

- `ignoreUploadUnusedFiles` 仍为 `false`。我**没有**打开它：Gate 1 §7.2 已证明微信的未使用分析在"仅被分包页面引用的主包文件"上会误判，而现在正准备做 Gate 3 分包——打开它风险大于收益。构建边界已经用配置从源头修好了。
- `data/media/candidates.ts` 与 `runtime-ingest.json` 仍是**被跟踪的仓库文件**（测试与 `scripts/content/*` 依赖它们），只是不再进代码包。这是正确的边界：仓库里可以留，运行时包里不留。
- 空模板字符串引用的 4 个资产（`base-camp.jpg` 与 3 个贴图）无法被字面量扫描发现，已在 §8.1 用专门测试覆盖。
- `tests/expedition-visual.test.ts` / `tests/gate33c-live-a.test.ts` 里有一个**既有的**虚构路径 `/assets/expeditions/everest/live/live-a.webp`（测试构造的 MediaAsset 数据，非真实资源查找）。与 Gate 2 无关，未改动。
- `ev-icefall-ladders.jpg` 与 `k32-modern-climb.jpg` 是**同一张图**（优化前后 sha256 都相同）。属于既有的内容重复，本轮未处理。
- **`git diff --check` 的 2 条 trailing-whitespace 告警是既有的行尾符问题，不是本次引入的。** 证据：告警只出现在 `scripts/copy-assets.mjs` 与 `tsconfig.build.json` 两个文件，而这两个文件的 **HEAD blob 本身就是 CRLF**（分别为 `crlf=42/bareLF=3` 与 `crlf=25/bareLF=0`）；本次改动的其余 15 个文件 HEAD blob 均为 LF，`git diff --check` 全部干净。在 CRLF 存储的文件里新增行，git 会把行尾的 `\r` 当作 trailing whitespace。我没有把这两个文件整体转成 LF——那会让 diff 变成"整文件重写"，在包体 Gate 里属于无谓噪音。如需消除，可单独执行 `git add --renormalize scripts/copy-assets.mjs tsconfig.build.json`。

---

## 9. 变更文件汇总

**新增（6 个代码文件 + 4 个 design 资产）**

```
miniprogram/engine/globe-texture-source.ts         贴图档位解析（纯函数）
scripts/runtime-excludes.mjs                       dev-only 清单（单一事实来源）
scripts/optimize-package-assets.py                 图片优化脚本（可复现，支持 --dry-run）
scripts/world_textures.py                          贴图派生共享配方
tests/build-boundary.test.ts                       构建边界守卫（4 用例）
tests/globe-texture-source.test.ts                 贴图档位与回退（6 用例）
design/world/everest-expedition-hero-v1.png        无损母版（不进包）
design/world/globe-texture-realistic-4096.png      4096 档（移入，不进包）
design/world/globe-height-4096.png                 同上
design/world/globe-specular-4096.png               同上
```

**修改（代码/配置，16）**

```
tsconfig.build.json
scripts/copy-assets.mjs
scripts/prepare-globe-texture-variants.py
scripts/build-globe-material-maps.py
scripts/waypoints/build-waypoint-images.cjs
project.config.json                          （仅 minified；appid / isGameTourist 保留）
miniprogram/engine/webgl-globe-renderer.ts
miniprogram/engine/globe-renderer.ts
miniprogram/data/media/world-manifests.ts    （45 处 hash）
miniprogram/data/expeditions/everest.ts      （1 处 hash）
miniprogram/data/media/runtime-ingest.json   （34 处 digest + 删 2 条）
miniprogram/data/routes/everest/visual-route.ts
miniprogram/pages/exploration/index.ts
miniprogram/pages/map/index.ts
miniprogram/pages/peaks/index.ts
miniprogram/pages/place/index.ts
```

**删除（3）**

```
miniprogram/data/landforms.ts
miniprogram/assets/content/fuji/f-navy-trail.jpg
miniprogram/assets/content/mariana/k-marine-snow.jpg
```

**资源优化（47 个文件重编码 + 4 个 PNG→JPEG 换名）**

`miniprogram/assets/**` 下 47 个文件被重编码；4 个 PNG 以新文件名落盘后删除原 PNG。

**构建产物（`dist/`，已按 `npm run build` 全量重新生成，无手改）**

`dist/miniprogram/` 173 个文件，全部可由 `miniprogram/` + 构建配置重新生成。工作区里另有 Gate 1 的 `docs/package-audit.md`（未提交）与你原有的两个 design 文档。

---

## 10. Gate 2 判定

| 检查项 | 状态 |
| --- | --- |
| 4096 texture 不进入代码包 + 保留 CDN 扩展点 | ✅ |
| 默认地球渲染路径未改动（仍走 2048 档，且修掉 texel 步长错配） | ✅（未做 GUI 实测，见 §8.2） |
| 内容图按 尺寸 → 格式 → 质量 优化 | ✅（900 px / JPEG q80，经视觉评审） |
| 零引用资源确认后删除（path / size / 证据 / 理由） | ✅ §5.1 |
| 死代码 `landforms.ts` 确认后删除 | ✅ §5.2 |
| dev-only 模块从 build 配置排除（非删 dist） | ✅ §6.1 |
| 微信报告里的 8 个 runtime 模块未被误删/移动/重写/禁用 | ✅ §6.4 |
| `minified=true`，且未覆盖用户已有 `project.config.json` 变更 | ✅ §6.2 |
| Build / TypeScript / Vitest 全 PASS | ✅ §8.1 |
| >200 KB 本地媒体 = 0 或明确例外 | ⚠️ 4 个例外，逐项书面说明（§4.3） |
| 包体 < 8 MiB | ✅ 6.41 MiB |
| 包体 < 5 MiB | ⚠️ 未达到，原因与可选路径见 §8.3 |

**Gate 2 完成，按指令在此停止，不进入 Gate 3。**
