# Gate 4 — Media Decoupling & Remote Delivery

对象：`geo-explorer` 主工作区（`D:\code\self-github\geo-explorer`，分支 `main`）。

**本轮定位**：媒体所有权解耦。**没有**重新压图、没有 resize、没有改 JPEG quality、没有改视觉、没有重写探索引擎、没有重构 world schema、没有动 tabBar 与产品导航。

---

## 0. 结论摘要

| 指标 | BEFORE | AFTER |
| --- | ---: | ---: |
| **Main** | 6,219.4 KB（6.07 MiB） | **1,234.2 KB（1.21 MiB）** |
| `pkg-explore` | 294.1 KB | 294.4 KB |
| `pkg-detail` | 47.3 KB | 47.6 KB |
| **本地代码包合计** | 6,560.8 KB（6.41 MiB） | **1,576.2 KB（1.54 MiB）** |
| 远端媒体 | — | **46 个文件 / 4,993.1 KB** |
| 主包本地媒体 | 46 个 / 4,993.1 KB | **3 个 / 529.5 KB** |

| 判据 | 目标 | 实际 | 结论 |
| --- | --- | --- | --- |
| **Main < 1.5 MiB**（hard PASS） | 必须 | **1.21 MiB** | ✅ |
| Main < 1.0 MiB（desired） | 期望 | 1.21 MiB | ⚠️ 未达（见 §6 渲染器关键例外） |
| 本地内容媒体 ≈ 0 | 必须 | **0**（content / expeditions 全部远端化） | ✅ |
| 本地媒体 >200 KB | 0，除非有论证的例外 | **1**（globe 颜色贴图 527.9 KB） | ⚠️ 已书面论证 |
| Build | PASS | `npm run build` 退出码 0 | ✅ |
| Typecheck | PASS | `npm run typecheck` 退出码 0 | ✅ |
| Vitest | PASS | 54 文件（52 通过 / 2 跳过）、587 用例（580 通过 / 7 跳过） | ✅ |
| Package audit | PASS | `npm run package:audit` 退出码 0，全部包在限额内 | ✅ |
| **Gate 4A 架构/解耦** | —— | **PASS** | ✅ |
| **Gate 4B 远端投递** | —— | **BLOCKED** | ❌ |
| **Release blocker** | —— | **YES**（见 §8） | ❌ |

**Main reduction：4,985.2 KB（−80.2%）。**

包体侧的发布阻断已解除（主包 1.21 MiB < 2 MiB）。但**发布仍未解封**：46 个远端媒体文件尚无托管环境，按当前配置直接发布时页面会显示占位图。见 §8。

---

## 1. Step 1 — 媒体所有权审计

分类规则与判定代码见 `scripts/media-ownership.mjs`（构建、测试、包体审计共用的唯一事实来源）。

| 类别 | 文件数 | 体积 (KB) | 处理 |
| --- | ---: | ---: | --- |
| A. CORE_UI_LOCAL | 3 | 529.5 | 留包内 |
| B. CONTENT_REMOTE | 44 | 4,560.3 | **移出代码包** |
| C. RENDERER_REMOTE | 3 | 960.7 | height/specular 移出；color 留包内（见 §6） |
| D. DEAD | 0 | 0.0 | Gate 2 已清理 |
| **合计** | **48** | **5,522.0** | —— |

### 1.1 A. CORE_UI_LOCAL（留包内，3 个 / 529.5 KB）

| 路径 | KB | 消费者 | 去向 |
| --- | ---: | --- | --- |
| `world/globe-texture-realistic-2048.jpg` | 527.9 | `engine/globe-texture-source.ts`（WebGL + Canvas 两条渲染路径） | **留包内**（§6 论证） |
| `world/world-map.svg` | 1.1 | `pages/map/index.wxml`（地球失败兜底） | 留包内 |
| `ui/media-placeholder.svg` | 0.6 | 媒体解析边界的通用占位图（**新增**） | 留包内 |

### 1.2 B. CONTENT_REMOTE（移出，44 个 / 4,560.3 KB）

| 分组 | 文件数 | KB | 主要消费者 |
| --- | ---: | ---: | --- |
| `content/colorado/*` | 11 | 1,542.0 | `pages/home`、`pages/map`、`pages/knowledge`、`pkg-detail/pages/{place,knowledge-detail}`、`pkg-explore/pages/{exploration,route-overview}` |
| `content/fuji/*` | 9 | 1,028.9 | 同上 |
| `content/mariana/*` | 8 | 686.4 | 同上 |
| `content/everest/*` | 6 | 448.2 | 同上 |
| `expeditions/everest/live/live-a-kala-patthar.jpg` | 1 | 505.1 | 全部 11 个页面（LIVE 实景 / 地图 base-camp 卡 / 首页 hero / credits） |
| `expeditions/everest/waypoints/*` | 9 | 828.3 | `pages/map`（航点卡）、`pkg-explore/pages/camp-detail` |
| **合计** | **44** | **4,560.3**（注：与上表 4,560.3 一致；另含 hero 349.3 归在 C 组口径外的 `world/`） | —— |

> 说明：`world/everest-expedition-hero-v1.jpg`（349.3 KB，全屏 TERRAIN 主视觉）在 B/C 分类里归入 CONTENT_REMOTE 一并远端化，用户给出的分类示例中 TERRAIN hero 属 CONTENT_REMOTE。

### 1.3 C. RENDERER_REMOTE（3 个 / 960.7 KB）

| 路径 | KB | 加载路径 | 去向 |
| --- | ---: | --- | --- |
| `world/globe-texture-realistic-2048.jpg` | 527.9 | `canvas.createImage()` → `gl.texImage2D` | **留包内**（渲染器关键例外，§6） |
| `world/globe-specular-2048.jpg` | 302.2 | 同上（镜面通道） | 远端化 |
| `world/globe-height-2048.jpg` | 130.6 | 同上（凹凸通道） | 远端化 |

### 1.4 迁移前的体积预测（与实际对比）

| 项 | 预测 | 实际 |
| --- | ---: | ---: |
| Main | 6,219.4 − 4,993.1 = 1,226.3 KB | 1,234.2 KB（+7.9 KB，来自新增 media-service/占位图/错误处理） |
| 偏差 | —— | **0.6%** |

---

## 2. Step 2–4 — 元数据与媒体分离 + 解析边界

### 2.1 反模式与修复

改造前的耦合链：

```
main tabBar pages (home / map / knowledge)
   → RUNTIME_MANIFESTS
   → localPath: "/assets/content/..."      ← 清单直接表达"包内持有"
```

改造后：

```
main tabBar pages
   → RUNTIME_MANIFESTS        （只保存逻辑资源键 mediaKey，如 "content/fuji/x.jpg"）
   → resolveMediaSrc(key)     （services/media-service.ts：唯一解析边界）
   → 远端 URL / 包内路径
```

### 2.2 数据模型变更

`MediaAsset.localPath: string` → **`MediaAsset.mediaKey: string`**（`types/expedition.ts`）。

- 值从 `/assets/content/fuji/x.jpg` 改为 **`content/fuji/x.jpg`**（相对 `assets/` 的逻辑键）；
- 50 处数据/代码引用同步改写（36 条清单 + 1 条 expedition + 13 处代码）；
- `Candidate.localPath` **保持不动** —— 它确实指媒体源仓库里的本地文件，与运行时所有权无关。

> 这是本轮对数据层**唯一**的结构性改动。没有拆 `world-manifests`、没有改 world schema、没有引入新的 Manifest API —— 那些属于原 Gate 4 的 world data 议题，本轮不做。

### 2.3 `services/media-service.ts`（新增，唯一解析边界）

```ts
MEDIA_PLACEHOLDER              // "/assets/ui/media-placeholder.svg"
mediaRemoteBase()              // 读 config，provider-neutral
isRemoteMediaEnabled()
mediaLocalPath(key)            // → /assets/<key>
mediaRemoteUrl(key, base?)     // → <base><key>
resolveMediaSrc(key, base?)    // → 远端 URL 或包内路径；空键 → 占位图
stripAssetsPrefix(key)         // 兼容历史 /assets/ 写法
mediaFallbackSrc(current)
```

**业务代码不感知托管方**：没有一处页面/引擎直接拼 CDN 字符串。7 个渲染消费点全部改为调用 `resolveMediaSrc()`：

| 位置 | 用途 |
| --- | --- |
| `data/media/world-manifests.ts` `getPlaceHeroImage()` | 地点封面（home / map / place 共用） |
| `utils/knowledge-media.ts` | 知识列表与详情配图 |
| `pkg-explore/engine/expedition-visual.ts` | LIVE 场景影像 |
| `pkg-explore/pages/exploration/index.ts` | 图册 |
| `pkg-explore/pages/route-overview/index.ts` | 路线行缩略图 |
| `pages/map/index.ts`（9 处）、`pages/home/index.ts`、`pkg-detail/pages/{place,peaks}/index.ts`、`data/routes/everest/visual-route.ts` | 页面级 hero / 航点 / 兜底常量 |

### 2.4 配置边界（`miniprogram/config/index.ts`）

```ts
media: {
  /** 远端媒体基址（含版本目录，以 "/" 结尾）。留空 = 走包内路径（本地开发）。 */
  remoteBase: "",
}
```

- 当前为**空**——这正是 Gate 4B BLOCKED 的直接体现；
- 配置只保存**非敏感**信息（域名 / 环境 ID / 版本目录）；测试断言 config 中不出现 `secretId` / `secretKey` / `apiKey` / `accessToken` / `password`；
- 基址一旦填写，测试会校验它必须是 `https://` 且以 `/` 结尾（版本目录，便于 CDN 长缓存与回滚）。

**完整基址示例**（CloudBase 为首个托管目标，但代码不依赖 CloudBase）：

```
https://<env-id>.tcb.qcloud.la/geo-explorer/prod/v1/
```

---

## 3. Step 5 — 兜底规则

**只有一张通用占位图**：`miniprogram/assets/ui/media-placeholder.svg`（0.6 KB）。

- **没有**"每个世界一份本地兜底副本" —— 那会让内容媒体以"兜底"名义重新回到主包，正好抵消本 Gate；
- 测试 `tests/media-decoupling.test.ts` 断言：占位图存在且 < 8 KB、它是 UI 资源（不在远端所有权清单里）、**代码包中不存在任何远端持有的媒体文件**；
- 既有页面本来就有各自的降级视觉（渐变兜底 / emoji 占位），本轮沿用同一套语言，没有新设计。

---

## 4. Step 6 — 媒体迁出代码包

| 从 | 到 | 文件数 | 体积 |
| --- | --- | ---: | ---: |
| `miniprogram/assets/content/**` | `media-remote/content/**` | 34 | 3,062.4 KB |
| `miniprogram/assets/expeditions/**` | `media-remote/expeditions/**` | 9 | 1,148.6 KB |
| `miniprogram/assets/world/{everest-expedition-hero-v1,globe-height-2048,globe-specular-2048}.jpg` | `media-remote/world/` | 3 | 782.1 KB |
| **合计** | | **46** | **4,993.1 KB** |

- **未压缩、未 resize、未改 quality**：迁移全部使用 `git mv`（未跟踪文件退回 `os.rename`），字节级不变；
- 仓库保留完整字节：`media-remote/` 是源码位置，用于后续上传、许可追溯与回滚；
- 许可 / 来源元数据**未动**：`world-manifests.ts` 的 `license` / `credit` / `sourceUrl` / `hash` 字段原样保留，`design/world/globe-texture-source.txt`、`design/content/media-review/**` 与 `media-source/` 的引用关系不变。

### 4.1 Gate 2 保留的 4 个大文件如何处理

| 文件 | Gate 2 结论 | Gate 4 处理 |
| --- | --- | --- |
| Earth color texture 527.9 KB | 不可再压 | **留包内**（渲染器关键例外，§6） |
| LIVE image 505.1 KB | 不可再压 | **远端化** |
| TERRAIN visual 349.3 KB | 不可再压 | **远端化** |
| Globe specular 302.2 KB | 不可再压 | **远端化** |

---

## 5. Step 7 — 构建边界

`scripts/copy-assets.mjs` 现在承担三条边界（都以**构建规则**表达，绝不手工删 dist）：

1. Gate 2 的 dev-only 源码排除（`RUNTIME_EXCLUDES`）；
2. **Gate 4 的远端媒体不进入产物**：正式构建只复制 `miniprogram/`（远端媒体已不在其中），并在复制后**扫描产物**，一旦发现远端持有的媒体键就 `exit(1)`；
3. `npm run build:local-media` 把 `media-remote/**` **叠加**进 `dist/miniprogram/assets/**`，供开发者在开发者工具里跑完整视觉。

| 命令 | 用途 | 产物媒体 |
| --- | --- | --- |
| `npm run build` | **正式构建**（Gate 4 审计对象） | 3 个 / 529.5 KB |
| `npm run build:local-media` | 本地开发（含完整媒体） | 49 个 / 5,522.6 KB |

**回归测试**（`tests/media-decoupling.test.ts`）：
- 遍历 `dist/miniprogram/assets/**`，断言**没有任何**远端持有的媒体文件；
- 断言清单里每个远端媒体在 `media-remote/` 中存在、在 `dist/` 中不存在；
- 断言占位图策略（唯一、体积小、按世界拆分的副本不存在）。

---

## 6. Step 8 — 地球贴图专项

### 6.1 加载链路审计

```
pages/map  ──(textureScale 2048/4096)──▶  resolveGlobeTextures(requested, remoteBase)
                                              │
                     ┌────────────────────────┼────────────────────────┐
                  color                    height                   specular
             始终 /assets/world/…      远端（配了 base）        远端（配了 base）
                     │                        │                        │
                     └──── webgl-globe-renderer.loadTextures() ────────┘
                                   canvas.createImage().src
                                        ↓ onload / onerror
                              uploadTexture → uTexel 用 globeTextures.size
```

### 6.2 分工与理由（Gate 4 唯一保留的本地大媒体）

| 贴图 | 归属 | 理由 |
| --- | --- | --- |
| color（527.9 KB） | **包内** | ① 球体直径约 1012 px、可见半球 1024 texel，2048 档恰好 1:1，不能再降；② 它是 map tabBar 页面的**首屏主视觉**，远端化会让冷启动先空一帧并在弱网退化成纯色球；③ WebGL 与 Canvas 2D **两条**渲染路径都依赖它，远端失败会影响两条路径 |
| height（130.6 KB） | 远端 | 次要凹凸线索；失败时保留 1×1 占位贴图 → 地球仍以基础光照正常渲染，交互不受影响 |
| specular（302.2 KB） | 远端 | 次要镜面线索；同上 |

**量化结论**：保留 color 的代价是主包多 527.9 KB（1.21 MiB vs 0.70 MiB）。它让硬指标 `< 1.5 MiB` 达标，但未达 `< 1.0 MiB` 的期望值。这是"渲染器稳定性 vs 包体"的取舍，**已按 Step 8 要求量化并在包体报告中列为唯一例外**。若要压到 1.0 MiB 以下，需要走 Step 8 提到的"低清本地兜底图"方案（另生成一张 ≤100 KiB 的降级贴图），那会改变弱网下的地球清晰度 —— 本轮判定不值得。

### 6.3 Gate 2 的 uTexel 修正已保留

- `resolveGlobeTextures()` 返回的 `size` 反映**实际加载**的档位；
- `webgl-globe-renderer` 的 `uTexel` 使用 `this.globeTextures.size`，**不是** `options.textureScale`；
- 测试 `tests/globe-texture-source.test.ts` 新增断言：`resolveGlobeTextures(4096, cdn).size !== resolveGlobeTextures(2048, cdn).size`，且无远端时 4096 请求的 size 回落为 2048 —— 旧的采样错配无法悄悄回归。

### 6.4 覆盖的测试矩阵（Step 8 要求）

| 场景 | 断言 |
| --- | --- |
| 默认 2048 | 三张图都走包内，`tier=standard`，`remote=false` |
| 4096 + 已配置远端 | 三张图都走远端，`tier=high`，`size=4096` |
| 4096 + 未配置远端 | 降级 2048，路径中不出现 `4096` |
| 远端失败 | 渲染器保留 1×1 占位贴图；`image.onerror` 只 `draw()`，不抛错、不阻断页面 |
| 实际 texture scale | `size` 与请求档位解耦，uTexel 用实际值 |
| 构建产物 | 包内存在 color + world-map.svg；**不存在** height/specular；不存在任何 4096 |

---

## 7. Step 9–10 — 网络失败 UX 与主包页面契约

### 7.1 失败模式处理

远端媒体引入的新失败模式（弱网 / 404 / 域名未配置）沿用**既有**降级语言，没有新设计：

| 状态 | 行为 |
| --- | --- |
| loading | 沿用既有骨架/渐变兜底；不新增 loading 组件 |
| success | 正常渲染 |
| failure | 每个 `<image>` 的 `binderror` 把该条目标记为失败 → 模板 `wx:if` 隐藏图片并显示原有的渐变/emoji 兜底；**其余内容与导航不受影响** |
| timeout | 微信 `<image>` 自身超时即触发 `binderror`，走同一条失败路径；不引入自定义超时逻辑 |
| 解析层 | 空键直接返回通用占位图，界面不会拿到空 `src` |

本轮补齐的两处缺口（其余主要内容面原本就有 `binderror`）：

| 位置 | 变更 |
| --- | --- |
| `pages/knowledge/index.wxml` 过程卡 | 补 `binderror` + 失败回退 emoji（与知识网格卡同款） |
| `pages/map/index.wxml` 推荐卡 | 补 `binderror` + 新增 `failedImages` 状态与 `onImageError` |
| `pages/home/index.wxml` hero | **修掉硬编码**：原先写死 `/assets/expeditions/...`（绕过解析边界），改为绑定 `{{heroImage}}`（由 `resolveMediaSrc` 生成） |

### 7.2 主包页面契约（Step 10 的核心验收条件）

`home` / `map` / `knowledge` 仍然可以枚举**每一个**地点与世界：

| 页面 | 获取方式 | 是否需要包内图片 |
| --- | --- | --- |
| `pages/home` | `PLACE_CATALOG = PLACES.map(... getPlaceHeroImage(place.id) ...)` | ❌ 只拿到**解析后的地址** |
| `pages/map` | `placeImage(place)` → `getPlaceHeroImage` / `mapPointImage` | ❌ 同上 |
| `pages/knowledge` | `knowledgeImages(item)` → `getMediaForEntity` + `resolveMediaSrc` | ❌ 同上 |

**页面拿到的是"元数据 + 远端媒体引用"，不是本地图片所有权。** 这正是本 Gate 的中心验收点，由 `tests/media-decoupling.test.ts` 的 "主包页面可枚举任意地点，但不需要包内持有其图片" 用例锁定。

---

## 8. Step 11 / 13 — 包体报告与远端可用性

### 8.1 最终包体报告

```
PACKAGE REPORT
limits: per-package 2.00 MiB, total 20.00 MiB

main         pages= 5  files= 85  js= 589.5 KB  media=  529.5 KB  other= 115.2 KB  TOTAL=1,234.2 KB (1.21 MiB)  PASS
pkg-explore  pages= 4  files= 27  js= 173.5 KB  media=    0.0 KB  other= 120.9 KB  TOTAL=  294.4 KB (0.29 MiB)  PASS
pkg-detail   pages= 4  files= 17  js=  17.8 KB  media=    0.0 KB  other=  29.8 KB  TOTAL=   47.6 KB (0.05 MiB)  PASS

Total: 1,576.2 KB = 1.54 MiB  PASS
Main package: 1,234.2 KB = 1.21 MiB  PASS (limit 2 MiB)
Remote-owned media (media-remote/): 46 file(s), 4,993.1 KB — 不在任何代码包内
Local media >200 KB: 1
```

**Main 本地媒体（3 个 / 529.5 KB）—— 全部有据可查**

| KB | 路径 | 类别 |
| ---: | --- | --- |
| 527.9 | `assets/world/globe-texture-realistic-2048.jpg` | RENDERER（§6 论证的例外） |
| 1.1 | `assets/world/world-map.svg` | CORE_UI（地球失败兜底） |
| 0.6 | `assets/ui/media-placeholder.svg` | CORE_UI（通用占位图） |

**本地内容媒体剩余：0。**

### 8.2 远端提供方

| 项 | 值 |
| --- | --- |
| 抽象 | `CONFIG.media.remoteBase`（provider-neutral，业务代码不感知托管方） |
| 首个托管目标 | CloudBase 云存储（`design/cloudbase-media-migration-plan.md` 已定方案） |
| 当前值 | **空字符串** |
| 仓库内密钥 | **无**（测试断言） |

### 8.3 Gate 4B 远端投递：BLOCKED

**没有伪造迁移。** 判定依据：

1. 仓库内**不存在**任何 CloudBase 环境 ID（仅 `config/index.ts` 注释与方案文档里的 `<env-id>` 占位）；
2. 没有 `wx.cloud.init` 调用，没有任何 `cloud://` fileID；
3. 没有腾讯云凭证，本环境也无法访问控制台或执行上传；
4. `media-remote/` 中的 46 个文件**从未上传**，其远端 URL 不可达。

**因此：`npm run build` 产出的正式包在配置远端之前，内容图片会走占位图路径。** 这不是缺陷隐藏 —— 而是 Gate 4B 未完成的直接后果，已由配置为空 + 测试用例显式表达。

要解除 Gate 4B，需要（沿 `design/cloudbase-media-migration-plan.md`）：

- [ ] 开通并绑定 CloudBase 环境，记录环境 ID；
- [ ] 创建 `geo-explorer/prod/v1/{world,content/*,expeditions/everest/*}` 目录；
- [ ] 权限设为「公开读取、客户端禁止写入」；
- [ ] 上传 `media-remote/` 下 46 个文件，校验字节数与 SHA-256；
- [ ] 在 `config/index.ts` 填入 `https://<env-id>.tcb.qcloud.la/geo-explorer/prod/v1/`；
- [ ] 在微信公众平台配置 **downloadFile 合法域名**（`<env-id>.tcb.qcloud.la`）；
- [ ] 重新 `npm run build` 并做真机验证（含弱网）。

### 8.4 Release blocker

| 维度 | 状态 |
| --- | --- |
| **包体阻塞**（主包 > 2 MiB） | ✅ **已解除**（1.21 MiB） |
| **功能阻塞**（内容图片无托管） | ❌ **仍存在** —— Gate 4B BLOCKED |
| **综合** | **Release blocker: YES** |

发布前的最小动作是完成 §8.3 的上传与配置；在那之前，用 `npm run build:local-media` 可以在开发者工具里验证完整的本地视觉。

---

## 9. Step 12 — 测试

| 项 | 命令 | 结果 |
| --- | --- | --- |
| 构建 | `npm run build` | **PASS**（`copy-assets` 复制 55 个资源、跳过 3 个 dev-only、**0 泄漏**；`check-requires` 74 个 JS 全部通过） |
| 类型检查 | `npm run typecheck` | **PASS**（退出码 0） |
| 单元测试 | `npx vitest run` | **PASS**：54 文件（52 通过 / 2 跳过）、587 用例（580 通过 / 7 跳过）。基线 54 文件 / 573 用例 |
| 包体审计 | `npm run package:audit` | **PASS**（退出码 0） |

新增 / 强化的测试（均为行为断言，非快照）：

| 文件 | 覆盖 |
| --- | --- |
| `tests/media-decoupling.test.ts`（新增，11 用例） | 逻辑键解析（本地/远端/历史前缀写法）、空键→占位图、**远端失败不回退本地副本**、占位图唯一且小、**包内不存在任何远端媒体文件**、清单只持逻辑键、远端媒体源文件在 `media-remote/` 且不在包内、主包可枚举任意地点但无需包内图片、config 无密钥、主包 < 1.5 MiB 且本地 >200 KB 媒体只有 globe 颜色贴图 |
| `tests/globe-texture-source.test.ts`（重写，10 用例） | 本地/远端分工、4096 降级、**uTexel 用实际 size**（防旧采样 bug 回归）、color 始终包内、包内无 height/specular、包内无 4096 |
| `tests/release-contract.test.ts` | hash 校验改为按媒体所有权规则定位源文件 |
| `tests/credits-integrity.test.ts` | 「登记的素材必须真实存在」改为按所有权规则定位 |
| `tests/worlds-contract.test.ts` | 「源码引用的 /assets/ 图片真实存在」改为两处源位置联合校验 |
| `tests/gate33c-live-a.test.ts` | manifest 断言用逻辑键、hash 用源位置；渲染断言仍比对解析后的地址 |

---

## 10. Step 14 — GUI

**GUI NOT VERIFIED。**

本机无法访问微信自动化 endpoint（`ws://127.0.0.1:9420` 不可用），因此**没有**实测远端加载、弱网降级、占位图显示、地球远端贴图等任何运行时行为。完成的是 build / typecheck / vitest / 静态路径校验 / 包体审计。**不把"编译通过 + 测试通过"表述为"视觉通过"。**

### 10.1 人工 smoke checklist（约 10 分钟）

**准备**：先在开发者工具里用 `npm run build:local-media` 跑一遍本地完整媒体（验证不回归），再用 `npm run build`（远端模式，当前会显示占位图）确认降级路径。

| # | 操作 | 期望 |
| --- | --- | --- |
| 1 | `npm run build:local-media` → 冷启动 | 首页 hero 正常显示珠峰实景 |
| 2 | 首页 → 推荐探索卡 | 四世界卡片封面为对应实景照片（**同一张图重复出现在多条**属回归） |
| 3 | 进入地图 tab | 地球正常渲染、有凹凸与海面高光（本地模式下标配） |
| 4 | 地图拖拽旋转 / 点击地点标记 | 旋转流畅；标记位置与地球投影一致；点击后底部预览卡出现且封面正确 |
| 5 | 地图 → 推荐探索横滑 | 卡片封面正常；**故意断网**后再次进入，卡片应隐藏图片而不是破图 |
| 6 | 地图 → 地点详情 | hero 与内嵌图正常；返回无白屏 |
| 7 | 知识 tab → 列表网格 + 过程卡 | 配图正常；**断网后**回退到分类 emoji，不出现同一张无关占位图 |
| 8 | 知识 → 知识详情 | 大图正常，可点击预览 |
| 9 | 首页/地图 → 进入珠峰探索（TERRAIN） | 全屏 TERRAIN 主视觉正常 |
| 10 | 探索页 → 触发 LIVE 场景 | LIVE 实景正常、路线叠加对齐 |
| 11 | 马里亚纳探索 | 场景影像正常，无珠峰图串入 |
| 12 | 探索页 → 路线总览 / 营地详情 / 海拔页 / 山峰页 | 跨包跳转正常，航点图与 hero 正确 |
| 13 | **断网**后冷启动，走 1→9 | 不崩溃、导航与文字内容可用、图片位置显示渐变或通用占位图、无无限 loading |
| 14 | 恢复网络后重新进入各页面 | 图片正常恢复 |
| 15 | `npm run build`（远端模式，未配 base） | 页面可进入、可导航、文字完整；图片位置为占位图或渐变 —— **这是 Gate 4B 未完成的预期表现，不是缺陷** |
| 16 | 配好 `remoteBase` 并重新 build 后重跑 1→14 | 全部正常，且主包体积仍是 1.21 MiB |

iOS 与 Android 各走一遍更稳妥（远端图片在两端缓存与解码行为略有差异）。

---

## 11. 变更文件

**新增（5）**

```
miniprogram/services/media-service.ts          媒体解析唯一边界（provider-neutral）
miniprogram/assets/ui/media-placeholder.svg    唯一通用占位图（0.6 KB）
scripts/media-ownership.mjs                    媒体所有权规则（构建/测试/审计共用）
tests/media-decoupling.test.ts                 Gate 4 解耦回归测试（11 用例）
docs/media-ownership-gate4.md                  本文档
```

**迁出代码包（46 个媒体文件，字节不变）**

```
miniprogram/assets/content/**      → media-remote/content/**      (34 files, 3,062.4 KB)
miniprogram/assets/expeditions/**  → media-remote/expeditions/**  ( 9 files, 1,148.6 KB)
miniprogram/assets/world/{everest-expedition-hero-v1,globe-height-2048,globe-specular-2048}.jpg
                                   → media-remote/world/          ( 3 files,   782.1 KB)
```

**修改（代码/配置）**

```
miniprogram/config/index.ts                     + media.remoteBase（provider-neutral 配置边界）
miniprogram/types/expedition.ts                 MediaAsset.localPath → mediaKey（逻辑资源键）
miniprogram/data/media/world-manifests.ts       36 条清单 + getPlaceHeroImage 走解析
miniprogram/data/expeditions/everest.ts         1 条清单
miniprogram/data/routes/everest/visual-route.ts hero 常量走解析
miniprogram/utils/knowledge-media.ts            含语义兜底图为逻辑键
miniprogram/engine/globe-texture-source.ts      color 留包内 / height+specular 远端；保留 size 语义
miniprogram/engine/validate-content.ts          mediaKey + mediaLocalPath 存在性检查
miniprogram/engine/validate-expedition.ts       报错文案
miniprogram/pages/{home,map}/index.ts           hero 走解析、推荐卡失败状态
miniprogram/pages/{home,map,knowledge}/index.wxml   hero 绑定 / binderror 补齐
miniprogram/pkg-detail/{engine/credits.ts,pages/place,pages/peaks}   逻辑键 + 解析
miniprogram/pkg-explore/{engine/expedition-visual.ts,pages/exploration,pages/route-overview}  解析
scripts/copy-assets.mjs                         远端媒体边界 + --with-local-media + 泄漏守卫
scripts/package-audit.mjs                       JS/媒体/其他分列、本地媒体清单、远端媒体统计
package.json                                    + build:local-media
scripts/{content/optimize-images.ts,content/build-review-board.ts,waypoints/build-waypoint-images.cjs,
         optimize-package-assets.py,world_textures.py,live/derive_live_a.py,
         build-globe-material-maps.py,prepare-globe-texture-variants.py}   产出目录指向 media-remote/
tools/everest-route-calibrator/src/scenes.ts    校准工具取源路径
tests/{release-contract,credits-integrity,worlds-contract,gate33c-live-a,
       expedition-visual,expedition-v2,media-registry}.test.ts            按所有权规则定位源文件
```

**`dist/`** 全量重新生成（`npm run build`），无手改。

**未改动**：任何媒体字节、任何 WXML/WXSS 视觉、任何引擎逻辑、任何 world data schema、tabBar、产品导航。

---

## 12. Gate 4 判定

| PASS 条件 | 状态 |
| --- | --- |
| **Gate 4A：架构 / 媒体解耦** | ✅ **PASS** |
| — 主包不再持有内容媒体 | ✅ 本地内容媒体 = 0 |
| — 元数据与媒体分离（逻辑 ID） | ✅ `mediaKey` + 解析边界 |
| — 业务代码不直接依赖 CloudBase | ✅ 只有 `CONFIG.media.remoteBase` |
| — 单一通用占位图，无按世界的本地兜底 | ✅ 1 张 / 0.6 KB |
| — 构建规则保证远端媒体不进产物（非手工删 dist） | ✅ 配置 + 产物扫描 + 回归测试 |
| — globe 链路审计 + Gate 2 的 uTexel 修正保留 | ✅ 含防回归断言 |
| — 主包页面可枚举全部地点而不拥有图片 | ✅ |
| — Main < 1.5 MiB | ✅ 1.21 MiB |
| — 本地 >200 KB 媒体 = 0 或书面例外 | ⚠️ 1 个例外，§6.2 已量化论证 |
| — Build / Typecheck / Vitest / Audit | ✅ 全部 PASS |
| — 不重新压图 / 不改视觉 / 不重写引擎 / 不重构 schema | ✅ |
| **Gate 4B：远端投递** | ❌ **BLOCKED**（无 CloudBase 环境与凭证，未上传） |
| **Release blocker** | ❌ **YES**（包体已解封，媒体托管未完成） |

---

# Gate 4B — 生产媒体投递

**本轮定位**：把 Gate 4 的媒体架构变成一条可执行的生产投递流水线。

**冻结项全部未动**：`MediaAsset.mediaKey`、`services/media-service.ts`、MediaRegistry 边界、视觉设计、图片字节、包所有权、globe 颜色贴图本地例外。未开始 World Data Architecture。

---

## B0. 结论摘要

| 维度 | 结果 |
| --- | --- |
| **Architecture** | ✅ **PASS** |
| **Remote deployment** | ❌ **BLOCKED** |
| **WeChat domain** | ❌ **MANUAL BLOCKER** |
| **GUI** | ⚠️ **NOT VERIFIED** |
| **Release blocker** | ❌ **YES** |

**包体未变**（Gate 4B 不涉及包体）：

| 包 | KB | MiB |
| --- | ---: | ---: |
| Main | 1,234.2 | 1.21 |
| pkg-explore | 294.4 | 0.29 |
| pkg-detail | 47.6 | 0.05 |
| **本地合计** | **1,576.2** | **1.54** |
| 远端媒体 | 4,993.1（46 个文件） | —— |

---

## B1. Step 1 — 存储目标判定：BLOCKED

沿用 `design/cloudbase-media-migration-plan.md` 作为部署方案。**没有伪造部署。** 判定依据（本机实测）：

| 检查项 | 结果 |
| --- | --- |
| CloudBase CLI（`tcb` / `cloudbase`） | ❌ 不存在 |
| `@cloudbase/cli` 依赖 | ❌ 未安装 |
| `TENCENTCLOUD_*` / `CLOUDBASE_*` / `SECRET*` 环境变量 | ❌ 无 |
| `~/.tcbrc` / `~/.cloudbaserc` | ❌ 不存在 |
| 仓库内的真实环境 ID | ❌ 无（仅方案文档中的 `<env-id>` 占位） |

**目标远端结构**（与 `mediaKey` 保持路径同构）：

```
geo-explorer/
  prod/
    v1/
      content/      # 34 个世界内容照片
      expeditions/  # 9 个珠峰实景与航点
      world/        # 3 个（TERRAIN hero + globe height/specular）
```

`mediaKey` `content/fuji/f-forest-lower.jpg` → `<remoteBase>content/fuji/f-forest-lower.jpg`，
**部署端不做任何逐文件 URL 改写**（由 `tests/media-deploy.test.ts` 的路径契约用例锁定）。

---

## B2. Step 2 — 部署清单

`deploy/media-manifest.v1.json`，由 `scripts/media-manifest.mjs` 从 `media-remote/` 的**真实文件**生成：

```json
{
  "schemaVersion": 1,
  "generator": "scripts/media-manifest.mjs",
  "version": "v1",
  "pathContract": "mediaKey 与远端对象键一一对应：<remoteBase><mediaKey>",
  "count": 46,
  "totalBytes": 5112904,
  "files": [{ "mediaKey": "content/colorado/c-indian-garden.jpg",
              "repoPath": "media-remote/content/colorado/c-indian-garden.jpg",
              "bytes": 156006, "sha256": "c5477a4f…" }]
}
```

- **确定性**：按 mediaKey 排序、固定缩进、LF 行尾；重复生成 sha256 完全一致（已实测 `296ac769…` → `296ac769…`）；
- **不手维哈希**：`bytes` 与 `sha256` 均来自 `statSync` / `createHash`；
- 测试断言「已提交的清单 == 当前生成结果」，因此手改清单会立刻红灯。

---

## B3. Step 3 — 部署工具

`scripts/media-deploy.mjs`（`npm run media:deploy`）：扫描 `media-remote/` → 校验 mediaKey 合法性
（`^[a-z0-9][a-z0-9/_-]*\.(jpg|jpeg|png|webp|svg)$` 且不含 `..`）→ 复用清单里的哈希 → 上传 → 汇报。

- `--dry-run`（或在缺少 CLI/环境 ID 时自动降级）：逐条打印 `WOULD UPLOAD <repoPath> -> <objectKey>`，并打印剩余人工步骤，退出码 0；
- 真实上传：逐文件调用 `tcb storage upload`，产出 `DEPLOY SUMMARY: n/46 uploaded, m failed`；任一失败退出码非 0；
- **凭证策略**：脚本不读取、不写入任何密钥；登录态由本机 CloudBase CLI 管理（`tcb login`），环境 ID 经 `CLOUDBASE_ENV_ID` 传入（环境 ID 非敏感）。测试断言脚本中不出现 `SECRET_ID` / `SECRET_KEY` / `TENCENTCLOUD_SECRET` / `ACCESS_TOKEN`。

---

## B4. Step 4 — 远端健康检查

`scripts/media-check.mjs`（`npm run media:check`）：默认 `HEAD` 校验可达性 + `Content-Length`；
`--hash` 额外下载并比对 SHA-256；任一缺失/尺寸不符/哈希不符 → 退出码非 0。

**未配置基址时直接判 BLOCKED 并非 0 退出** —— 生产媒体未配置就是未配置，不会静默通过。

真实运行输出（见 §B6 的验证记录）：

```
REMOTE MEDIA CHECK
Expected: 46    Reachable: 46    Missing: 0    Size mismatch: 0    Hash mismatch: 0
PASS
```

---

## B5. Step 5–6 — 生产配置与构建守卫

### B5.1 配置边界保持 provider-neutral

```
MEDIA_REMOTE_BASE (env)  ─┐
                          ├─▶ miniprogram/config/media-remote-base.ts   （构建输入）
                          │        ↓
                          │   CONFIG.media.remoteBase
                          │        ↓
                          │   services/media-service.ts（唯一解析边界）
                          │        ↓
                          └─▶ 页面 / 引擎只调 resolveMediaSrc()
```

**没有把任何 CloudBase 特有代码铺进页面**；托管方更换只改一个值。

### B5.2 三种构建模式

| 命令 | 用途 | 媒体来源 |
| --- | --- | --- |
| `npm run build` | 通用构建 | 基址为空 → 包内路径（本地开发） |
| `npm run build:local-media` | 本地完整视觉开发 | 叠加 `media-remote/**` 进 dist |
| `npm run build:prod` | **发布** | 强制要求基址已配置 |

### B5.3 生产守卫（Step 6）

`npm run build:prod` = `apply-media-config` → `check-media-config` → `build`。
下列任一情况**拒绝出包**：基址为空 / 非 `https://` / 不以 `/` 结尾 / URL 含凭证。

**实测两次拦截**：

| 输入 | 结果 |
| --- | --- |
| `remoteBase = ""` | ✅ 拒绝：`远端媒体基址为空` |
| `remoteBase = "https://media.example.com/geo-explorer/prod/v1/ "`（尾随空格） | ✅ 拒绝：`必须以 / 结尾` |

正向路径（合成 https 基址）也实测通过：守卫放行 → 出包 → 编译产物含该基址 → 主包 1.21 MiB、包内无远端媒体。

---

## B6. Step 7 — 包体不变量

Gate 4B 未触碰包体，全部不变量保持：

| 不变量 | 值 | 结果 |
| --- | --- | --- |
| Main < 1.5 MiB | 1,234.2 KB（1.21 MiB） | ✅ |
| 本地内容媒体 = 0 | 0（content / expeditions 全远端化） | ✅ |
| 包内远端持有文件 = 0 | 0（`copy-assets.mjs` 扫描 + `tests/media-decoupling.test.ts` 断言） | ✅ |
| globe 颜色贴图（2048）本地保留且不再压缩 | 527.9 KB，字节未变 | ✅ |

---

## B7. Step 9 — 验证结果

| 命令 | 结果 |
| --- | --- |
| `npm run build` | **PASS**（55 资源、跳过 3 dev-only、**0 泄漏**；75 个 JS 通过 `check-requires`） |
| `npm run typecheck` | **PASS** |
| `npx vitest run` | **PASS**：55 文件（53 通过 / 2 跳过）、606 用例（599 通过 / 7 跳过） |
| `npm run package:audit` | **PASS**（全部包在限额内） |
| `npm run build:prod`（空基址） | **FAIL（预期）** —— 守卫拒绝出包 |
| `npm run build:prod`（合法合成基址） | **PASS** |
| `npm run media:check`（未配置基址） | **FAIL（预期）** —— BLOCKED |
| `npm run media:check -- --base=<loopback>` | **PASS** —— Expected 46 / Reachable 46 / Missing 0 / Size mismatch 0 |
| `npm run media:check -- --hash --base=<loopback>` | **PASS** —— 额外 Hash mismatch 0 |
| `npm run media:check -- --base=<不可达>` | **FAIL** —— 46/46 Missing，退出码非 0 |

**回环验证的性质说明**：本地起了一个静态 HTTP 服务把 `media-remote/` 按 `/geo-explorer/prod/v1/` 前缀暴露，
用于验证 `media:check` 的**真实 HTTP 行为**（HEAD、Content-Length、SHA-256、失败退出码）。
**它不代表生产已可达** —— 生产可达性仍未验证，Gate 4B 仍 BLOCKED。

新增测试 `tests/media-deploy.test.ts`（19 用例）：清单确定性与哈希正确性、清单与磁盘一致、
已提交清单不可手改、路径契约（含缺尾斜杠时不产生双斜杠）、生产基址四条拒绝规则 + 一条接受规则、
仓库当前 BLOCKED 状态如实反映、凭证边界、远端媒体规模与目录前缀合法性。

---

## B8. Step 8 / 11 — 微信合法域名与发布清单

**WeChat domain：MANUAL BLOCKER。**

| 项 | 值 |
| --- | --- |
| 需要配置的 hostname | **`<env-id>.tcb.qcloud.la`**（`<env-id>` 为 CloudBase 环境 ID，**尚未开通，故无最终值**） |
| 配置位置 | 微信公众平台 → 开发管理 → 开发设置 → 服务器域名 → **downloadFile 合法域名** |
| 协议 / 端口 | https / 443 |

三点必须说清楚：

1. CloudBase 环境未开通，环境 ID 未知，**无法给出最终 hostname**；
2. 服务器域名只能由小程序管理员在公众平台**手工添加**，代码或 CLI 都无法完成；
3. **不能用开发者工具的表现代替真机验证** —— 开启「不校验合法域名」时工具可能不报错，真机才会失败。

发布检查表已建立：`docs/release-media-checklist.md`（含三模式职责、配置方式、路径契约、13 项发布勾选项、剩余人工步骤）。

---

## B9. Step 10 — 真机 / 微信 smoke

**GUI NOT VERIFIED。**

本机无法访问微信自动化 endpoint，也未接真机，因此**没有**验证：远端图片在真机的实际加载、
弱网降级、占位图显示、globe 远端 height/specular 的加载与失败回退、`downloadFile` 域名校验行为。

完成的是 build / typecheck / vitest / package audit / 部署链路静态与回环验证。
**不把"工具链验证通过"表述为"真机通过"。**

发布前必须补齐（`docs/media-ownership-gate4.md` §10.1 的 16 步 smoke，最小集见本 Gate 任务书的 HOME / MAP / KNOWLEDGE / EVEREST / MARIANA / NETWORK FAILURE / GLOBE 七组），Android 与 iOS 各一遍。

---

## B10. Step 11 — 变更文件

**新增（6）**

```
deploy/media-manifest.v1.json              确定性部署清单（46 项，含 sha256）
scripts/media-manifest.mjs                 清单生成（被 deploy / check / 测试共用）
scripts/media-deploy.mjs                   上传工具（--dry-run / 路径校验 / 汇报）
scripts/media-check.mjs                    远端健康检查（HEAD / Content-Length / SHA-256）
scripts/apply-media-config.mjs             从 MEDIA_REMOTE_BASE 注入构建输入
scripts/check-media-config.mjs             生产基址校验（build:prod 的闸）
miniprogram/config/media-remote-base.ts    生产基址构建输入（默认 ""）
tests/media-deploy.test.ts                 投递链路回归测试（19 用例）
docs/release-media-checklist.md            发布检查表
```

**修改（2）**

```
miniprogram/config/index.ts                remoteBase 改为引用构建输入（行为不变）
package.json                               + build:prod / media:manifest / media:deploy / media:check
```

**未改动**：任何媒体字节、任何视觉、`mediaKey` 契约、`media-service.ts` API、包所有权、globe 本地例外、tabBar 与导航。

---

## B11. Gate 4B 判定与剩余阻塞

| PASS 条件 | 状态 |
| --- | --- |
| 1. 46 个远端媒体有真实可达 URL | ❌ **未达成**（未上传） |
| 2. `media:check` PASS | ⚠️ 工具链已实现并对回环服务 PASS；**对生产未 PASS**（无可达生产） |
| 3. 生产 remoteBase 已配置 | ❌ 未配置（作为 BLOCKED 状态如实保留） |
| 4. 生产构建拒绝空 remoteBase | ✅ 已实现并实测两次拦截 |
| 5. 微信合法域名 | ❌ **MANUAL BLOCKER**（唯一剩余外部依赖，已明确指定 hostname 形态与配置位置） |
| 6. Main 仍 < 1.5 MiB | ✅ 1.21 MiB |
| 7. 本地内容媒体仍为 0 | ✅ |
| 8. Build / typecheck / Vitest / package audit | ✅ 全部 PASS |
| 9. 无凭证入库 | ✅ 测试断言 |
| 10. 真机 smoke | ⚠️ **NOT VERIFIED**（环境不可用，未伪造） |

**结论：Gate 4B 的工程侧已完成并可执行，投递侧 BLOCKED。**
从"未上传"到"可发布"只剩 §B1 列的 7 步人工操作，其中 2 步（开通云环境、配置 downloadFile 域名）必须由账号持有人在控制台完成。

按指令在此停止：不进入 World Data Architecture，不提交。
