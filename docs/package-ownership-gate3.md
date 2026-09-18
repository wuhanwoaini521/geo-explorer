# Gate 3 — Package Ownership / Subpackage

对象：`geo-explorer` 主工作区（`D:\code\self-github\geo-explorer`，分支 `main`）。

**本轮定位**：ownership migration，不是资源压缩。没有重新压图、没有 resize、没有改 JPEG quality、没有改视觉、没有上 CDN、没有重写 engine、没有重构 world data。

---

## 0. 结论摘要

| 指标 | BEFORE | AFTER |
| --- | ---: | ---: |
| **Main package** | 6,560.0 KB（6.41 MiB） | **6,219.4 KB（6.07 MiB）** |
| `pkg-explore` | 不存在 | 294.1 KB（0.29 MiB） |
| `pkg-detail` | 不存在 | 47.3 KB（0.05 MiB） |
| Total | 6,560.0 KB | 6,560.8 KB |
| Main 文件数 | 173 | 129 |
| 主包媒体 | 5,520.9 KB | **5,522.0 KB（未变）** |

| 判据 | 目标 | 实际 | 结论 |
| --- | --- | --- | --- |
| Build PASS | 必须 | `npm run build` 退出码 0 | ✅ |
| Typecheck PASS | 必须 | `npm run typecheck` 退出码 0 | ✅ |
| Vitest PASS | 必须 | 53 文件（51 通过 / 2 跳过）、570 用例（563 通过 / 7 跳过） | ✅ |
| Main < 2 MiB | **Hard PASS** | **6,219.4 KB = 3.04× 超限** | ❌ |
| package ownership clear | 必须 | 14+1 个独占模块与 8 个页面已按所有权迁移；主包→分包引用 = 0 | ✅ |
| 独占 exploration assets 不再留在主包 | 必须 | **无此类资源**（见 §3） | ⚠️ 条件不成立 |
| 独占 detail assets 不再留在主包 | 必须 | **无此类资源** | ⚠️ 条件不成立 |
| navigation 路径有效 | 必须 | app.json 13 条路径全部四件套齐全；52 处运行时路径已改写；`main → subpackage` 引用 = 0 | ✅（静态） |
| runtime asset 路径有效 | 必须 | broken reference scan = 0 | ✅ |
| 不改变 UI / 图片质量 | 必须 | 无任何资源字节变化、无 WXML/WXSS 视觉改动 | ✅ |
| 不做 Gate 4 工作 | 必须 | 未做 | ✅ |
| **Remaining release blocker** | —— | **YES**（主包超 2 MiB） | ❌ |

**Main reduction：340.6 KB（−5.2%）。**

**Hard PASS 未达成**，原因是结构性的，且已被算术证明不可能（§5）。按指示**没有做超范围 hack**，如实记录并移交 Gate 4。

---

## 1. 方法

以 Gate 1 建立的静态分析器为基础（入口 = `app.json` 的 pages **+ subpackages** + `app.ts` + `custom-tab-bar`），解析 `import` / `export … from` / 动态 `import()` / `require()` / `usingComponents` / `@import` / `wxml` 资源字面量，把每个**模块**与**资源**标记为 `MAIN` / `EXPLORE` / `DETAIL` / `SHARED`。

> **判据**：文件只有被**单一 package 的页面**可达时才能迁出。被两个以上 package 可达 → 必须留主包（微信规则：主包不能引用分包资源，分包可以引用主包资源）。

---

## 2. 页面依赖闭包（迁移前）

| 页面 | 归属 | 模块数 | distJS (KB) | 资源数 | 资源 (KB) |
| --- | --- | ---: | ---: | ---: | ---: |
| `pages/map/index` | MAIN | 30 | 456.6 | 43 | 4,469.2 |
| `pages/exploration/index` | EXPLORE | 38 | 540.8 | 36 | 3,916.8 |
| `pages/place/index` | DETAIL | 23 | 400.3 | 36 | 3,916.8 |
| `pages/knowledge/index` | MAIN | 24 | 356.0 | 36 | 3,916.8 |
| `pages/knowledge-detail/index` | DETAIL | 19 | 298.6 | 36 | 3,916.8 |
| `pages/profile/index` | MAIN | 20 | 274.5 | 0 | 0.0 |
| `pages/home/index` | MAIN | 21 | 265.0 | 36 | 3,916.8 |
| `pages/altitude/index` | EXPLORE | 17 | 239.8 | 2 | 854.3 |
| `pages/route-overview/index` | EXPLORE | 17 | 206.8 | 36 | 3,916.8 |
| `pages/credits/index` | DETAIL | 12 | 126.7 | 2 | 854.3 |
| `pages/camp-detail/index` | EXPLORE | 11 | 125.7 | 4 | 1,024.4 |
| `pages/quiz/index` | MAIN | 9 | 31.3 | 0 | 0.0 |
| `pages/peaks/index` | DETAIL | 1 | 0.9 | 2 | 854.3 |

关键观测量：`map` / `home` / `knowledge` / `place` / `knowledge-detail` / `exploration` / `route-overview` 七个页面的资源闭包**完全重叠**——都是同一批 36 张图。

---

## 3. Asset 归属 —— hypothesis 不成立

| 归属 | 文件数 | 体积 (KB) |
| --- | ---: | ---: |
| MAIN 独占 | 9 | 1,434.1 |
| **EXPLORE 独占** | **0** | **0** |
| **DETAIL 独占** | **0** | **0** |
| SHARED | 38 | 4,086.8 |
| 合计 | 47 | 5,520.9 |

**没有任何一张图片是 EXPLORE 或 DETAIL 独占的**，所以 Gate 3 没有迁移任何资源（也就没有出现"页面搬走了、资源孤立留在主包"的反模式——资源本来就被主包页面占用）。

### 3.1 MAIN 独占（9 个，1,434.1 KB）——唯一引用者是 `map`

| 体积 (KB) | 资源 |
| ---: | --- |
| 527.9 | `assets/world/globe-texture-realistic-2048.jpg` |
| 302.2 | `assets/world/globe-specular-2048.jpg` |
| 130.6 | `assets/world/globe-height-2048.jpg` |
| 95.1 / 93.8 / 91.0 / 90.5 / 63.9 / 39.1 | `waypoints/{camp-i, western-cwm-camp-ii, base-camp, khumbu-icefall, south-summit, summit}.jpg` |

`map` 是 tabBar 页面（微信要求 tabBar 页面必须在主包），这一组**必须留主包**。

### 3.2 SHARED（38 个，4,086.8 KB）——代码级根因

| 体积 (KB) | 资源 | 可达 package |
| ---: | --- | --- |
| 505.1 | `assets/expeditions/everest/live/live-a-kala-patthar.jpg` | MAIN, DETAIL, EXPLORE |
| 349.3 | `assets/world/everest-expedition-hero-v1.jpg` | MAIN, DETAIL, EXPLORE |
| 3,062.4 | `assets/content/**` ×34 | MAIN, DETAIL, EXPLORE |
| 170.0 | `waypoints/{south-col-camp-iv, lhotse-face-camp-iii}.jpg` | MAIN, EXPLORE |

根因（不是推测，是代码）：

```
pages/home/index.ts:86   image: getPlaceHeroImage(place.id) ?? ""       ← 模块级遍历全部 PLACES
pages/map/index.ts:229   const runtimeHero = getPlaceHeroImage(place.id); ← 任意选中地点
pages/place/index.ts:64  const runtime = getPlaceHeroImage(place.id);
```

`getPlaceHeroImage`（`data/media/world-manifests.ts:898`）在 `RUNTIME_MANIFESTS` 里按 `entityType === "place"` 做**运行时按 id 查询**。因此 `home` 与 `map`（都在主包）可以显示**任意地点**的封面图 → 全部 place 封面必须留主包。同理 `knowledge`（主包 tabBar）与 `knowledge-detail` 共用 `utils/knowledge-media.ts` → 14 张知识配图必须留主包。

按实体类型统计 `assets/content/**`（36 条登记）：

| entityType | 文件数 | 体积 (KB) | purpose |
| --- | ---: | ---: | --- |
| `waypoint` | 17 | 1,724.9 | hero 15 / secondary 2 |
| `knowledge` | 14 | 1,138.7 | knowledge-support 12 / secondary 2 |
| `place` | 5 | 757.4 | hero 4 / secondary 1 |

**没有一类满足"只由 EXPLORE 页面使用"这个迁移前提。**

---

## 4. Module 归属与迁移结果

### 4.1 已迁入 `pkg-explore`（14 个模块 + 4 个页面）

```
engine/exploration-engine.ts    engine/expedition-visual.ts
engine/route-path.ts            engine/route-calibration.ts
engine/expedition-climb.ts      engine/expedition-camera.ts
engine/calibration-validate.ts
utils/summary.ts                utils/route.ts
data/calibrations/everest/{index,live-a-calibration}.ts
```

**这 14 个模块 + 4 个页面（exploration / route-overview / camp-detail / altitude）正是 Gate 1 §7.2 被微信标记为"未使用"的那一批。** Gate 1 已用真实 `require` 证据证明它们不是死代码；Gate 3 依所有权把它们迁入 `pkg-explore`，**没有删除、没有重写、没有禁用**。

### 4.2 已迁入 `pkg-detail`（1 个模块 + 4 个页面）

```
engine/credits.ts
pages/knowledge-detail/  pages/place/  pages/peaks/  pages/credits/
```

### 4.3 SHARED（27 个，全部留主包）

```
data/media/world-manifests.ts   data/places.ts   data/expeditions/everest.ts
data/explorations/{index,everest,mariana,fuji,colorado}.ts
data/routes/everest/{index,south-col,visual-route}.ts
data/knowledge.ts  data/processes.ts
engine/{route-index,expedition-stages,media-registry,validate-expedition}.ts
engine/{expedition-driver,expedition-observation}.ts
services/exploration-store.ts  services/favorites-store.ts
utils/format.ts  utils/knowledge-media.ts
types/{calibration,expedition,exploration,models}.ts
```

### 4.4 一处刻意的偏离（需要你确认）

`data/expeditions/{index,worlds,world-expedition}.ts` 在生产上**只被探索页引用**（EXPLORE 独占），但我**没有迁移它们**，仍然留在主包，原因：

1. 它们的同目录兄弟 `data/expeditions/everest.ts` 是 SHARED（被 7 个主包页面引用），必须留主包；
2. `index.ts` 是 `everest.ts` + `worlds.ts` 的 barrel —— 把 barrel 搬走、数据留下，会产生 3 条跨包相对 import（`../../../data/expeditions/everest`），把"一个世界的远征数据"这一整体拆开，ownership 反而更模糊；
3. 体积收益只有 **17.1 KB（占主包 0.27%）**；
4. 你在 Step 2 明确写了「不要机械搬目录」，且 Step 9 把 `data/expeditions` 的架构问题划给 Gate 4。

如果认为必须严格按"EXPLORE 独占即迁出"执行，这 17.1 KB 可以随时补迁——但它对 2 MiB 目标没有任何影响。

---

## 5. 关键结论：Hard PASS 不可达（算术证明）

```
主包必须保留的媒体              = 5,522.0 KB   （§3：47/47 个资源无一是非主包独占）
主包必须保留的代码（迁移后实测） =   697.4 KB   （582.3 JS + 115.1 other）
                                  ─────────────
主包实测                        = 6,219.4 KB   = 6.07 MiB
```

**5,522.0 KB 的媒体单独一项就是 2 MiB 上限的 2.70 倍。** 即使把所有代码都搬出主包（不可能——`app` 与 5 个 tabBar 页面必须在主包），主包也不可能 < 2 MiB。

要让主包 < 2 MiB 只有四条路，**全部被 Gate 3 明确禁止或超出范围**：

| 路径 | 为什么不做 |
| --- | --- |
| 再压图片 / 再缩尺寸 | Gate 3 FREEZE 明令禁止；Gate 2 已量化证明剩下的图是"原生分辨率下界" |
| 改视觉 / 改页面引用哪张图 | 禁止改变 UI 与用户体验 |
| 图片上 CDN / 云存储 | Gate 3 明令不上 CDN（属 Gate 4） |
| 把 `map`/`home`/`knowledge` 移出主包 | 微信要求 tabBar 页面在主包；改 tabBar 就是改产品导航 |

### 5.1 Gate 4 candidate（按 Step 5 要求记录）

**不是**只有 globe assets（960.7 KB）。真实结构是：

> **三个必须在主包的 tabBar 页面（`map` / `home` / `knowledge`）通过共享的 `world-manifests` 做运行时按 id 查询，共同引用了项目里的每一张图片。**

按可行性排序的 Gate 4 candidate：

1. **remote media / 云存储**（`design/cloudbase-media-migration-plan.md` 已有方案）。媒体全部上云后主包媒体 ≈ 0，主包 ≈ 700 KB，**直接可发布**。这是唯一能一次性解决 2 MiB 的方向。
2. **globe texture 上云**：仅这一项 960.7 KB，让主包降到约 5.26 MB —— **仍然超限**，单独做没有意义。
3. **`world-manifests` 按世界拆分 + 主包只依赖轻量 manifest**（即原 Gate 4 的 world data 架构）。能让主包只保留主页/地图真正需要的那几张封面，但会让 `map`/`home` 失去对非主包世界封面的访问，**属于产品行为变更**，需要单独决策。
4. **轻量地图策略**（把 Earth 换成更小贴图或矢量）：属于视觉变更，需单独决策。

---

## 6. 目标结构与实际落地

```
miniprogram/
  pages/{map,home,knowledge,quiz,profile}/          ← MAIN，5 个 tabBar 页面
  pkg-explore/
    pages/{exploration,route-overview,camp-detail,altitude}/
    engine/{exploration-engine,expedition-visual,route-path,route-calibration,
            expedition-climb,expedition-camera,calibration-validate}.ts
    utils/{summary,route}.ts
    data/calibrations/everest/{index,live-a-calibration}.ts
  pkg-detail/
    pages/{knowledge-detail,place,peaks,credits}/
    engine/credits.ts
  engine/ data/ utils/ services/ types/ components/ assets/   ← SHARED，留主包
```

### 6.1 `app.json`

新增两个 `subpackages`（`pkg-explore` / `pkg-detail`），主包 `pages` 收敛为 5 个 tabBar 页面。同时新增一条 `preloadRule`：

```json
"preloadRule": { "pages/map/index": { "network": "all", "packages": ["explore"] } }
```

理由：`map` 是进入沉浸探索的主要入口，预载 294 KB 的分包可以让"点击进入探索"的**感知速度与改造前一致**（否则会多出一次分包下载等待）。这不是新的用户可见行为，而是保持既有体验。tabBar 的 5 项**一个都没有改动**。

### 6.2 路径改写（Step 7）

| 类型 | 数量 | 处理 |
| --- | ---: | --- |
| TypeScript 相对 import（迁移文件内部） | 48 处 / 44 文件 | 按新位置重算相对路径，保持原 spec 的"形状"（不擅自加扩展名、不擅自补 `/index`） |
| 运行时导航字符串（`navigateTo` / `redirectTo` / `reLaunch`） | 22 处 / 11 文件 | 8 个页面路径改为 `/pkg-*/pages/.../index` |
| `project.config.json` 编译模式 `pathName` | 2 处 | `pages/exploration/index` → `pkg-explore/pages/exploration/index`（历史踩坑点） |
| 测试/脚本的模块 import 与文件读取 | 19 处 / 15 文件 | 同步新路径 |
| 测试里的 page 路径断言 | 8 处 / 8 文件 | 同步新路径（**断言语义未变**） |
| WXML / WXSS / usingComponents | **0** | 全部使用绝对路径，页面下沉后仍有效 |
| **资源路径** | **0** | 资源全部留主包，`/assets/...` 绝对路径继续有效 |

### 6.3 验证工具升级（Step 8）

**新增 `scripts/package-audit.mjs`**（`npm run package:audit`）：

- 读 `dist/miniprogram/app.json`，按 `pages` / `subpackages` 划分包，**不再把整个 dist 算成主包**；
- 每个包分别输出 JS / Media / Other / Total，并附 Top 20 最大文件；
- 对照微信限额（单包 2 MiB、合计 20 MiB）给出 PASS/FAIL 与退出码；
- 支持 `--json` 供后续 `package:verify` 消费。

**新增 `tests/package-ownership.test.ts`**（5 个用例）——把微信的两条硬规则变成回归测试：

1. **主包不引用任何分包文件**（当前 0 条，违反即失败）
2. **分包之间不互相引用**（当前 0 条）
3. 分包引用主包确实存在（当前 50 条：pkg-explore 36 / pkg-detail 14）—— 反向验证切分不是空的
4. 13 个页面的四件套都在 app.json 声明的包内
5. tabBar 5 个页面都在主包

这两条规则在真机才会报错、预览时未必能发现，因此值得用测试固化。

---

## 7. 验证结果

| 项 | 命令 | 结果 |
| --- | --- | --- |
| 构建 | `npm run build` | **PASS**。clean 173 文件 → tsc 73 个 JS → copy-assets 100 资源（跳过 3 个 dev-only）→ `check-requires` 无目录级 require / 无悬空引用 |
| 类型检查 | `npm run typecheck` | **PASS**（退出码 0） |
| 单元测试 | `npx vitest run` | **PASS**：53 文件（51 通过 / 2 跳过）、570 用例（563 通过 / 7 跳过）。基线 52 文件 / 562 用例，新增 `package-ownership.test.ts` 5 个用例 + `ui-bindings` 3 个包结构用例 |
| 包体审计 | `npm run package:audit` | Main 6,219.4 KB **FAIL**；pkg-explore 294.1 KB PASS；pkg-detail 47.3 KB PASS |
| 破链扫描 | 自建扫描器遍历 213 个文件的 `/assets/**` 字面量 | **broken = 0**（3 条命中的是测试里既有的虚构路径 `live-a.webp`，与本次无关） |
| 微信包规则 | `tests/package-ownership.test.ts` | main→subpackage = **0**；subpackage→subpackage = **0**；subpackage→main = 50（合法） |
| 可达性 | 静态闭包遍历 | 生产不可达 12 个文件，与 Gate 2 后的集合**完全一致**——迁移没有留下孤儿文件，也没有把 dev-only 模块卷进生产 |

### 7.1 GUI NOT VERIFIED

当前环境**无法访问微信自动化 endpoint**，因此以下**没有实测**：

- 分包在真机/开发者工具中的实际加载
- `map → exploration` 等跨包跳转、返回栈
- 五个 tabBar 页面切换
- 预载规则的实际效果

完成的是 build / typecheck / vitest / 静态路径校验 / 包体审计 / 微信包规则静态校验。**不把"编译通过"表述为"导航通过"。**

### 7.2 人工 smoke checklist（约 8 分钟）

按顺序走一遍，重点看**跨包跳转**与**返回**：

| # | 操作 | 期望 |
| --- | --- | --- |
| 1 | 冷启动 → 地图 tab | 地球正常渲染、可拖动旋转、地点标记位置正确 |
| 2 | 点击地点标记 → 预览卡 | 卡片出现，封面图正常（**这是主包内资源，不应变化**） |
| 3 | 点卡片进入地点详情 | 跳 `/pkg-detail/pages/place/index`，**首次进入会有一次分包加载**（约 47 KB，应在 1 秒内）；详情页头图/内嵌图正常 |
| 4 | 地点详情 → 返回 | 回到地图，无白屏 |
| 5 | 地图 → 进入探索（珠峰） | 跳 `pkg-explore`，预载命中时**应无明显等待**；探索页场景、路线、推进按钮正常 |
| 6 | 探索页 → 路线总览 → 返回 | 同包内跳转，正常 |
| 7 | 探索页 → 营地详情 → 返回 | 同包内跳转，正常 |
| 8 | 探索页 → 海拔页 / 山峰页 | 跨包跳转（altitude 在 explore，peaks 在 detail），均正常 |
| 9 | 知识 tab → 知识详情 → 返回 | 跨包（main → pkg-detail），正常 |
| 10 | 我的 → 关于/致谢 → 返回 | 跨包（main → pkg-detail），正常 |
| 11 | 首页 → 四个世界分别进入 | 探索类进 pkg-explore，地点类进 pkg-detail |
| 12 | 五个 tabBar 反复切换 | 无卡顿、无白屏 |
| 13 | 下拉刷新 / 杀进程冷启动后再走 1 遍 | 分包状态正常 |

Android 与 iOS 各走一遍则更稳妥（分包下载行为在两端略有差异）。

---

## 8. 变更文件

**新增（3）**

```
scripts/package-audit.mjs            支持分包解析的包体审计器
tests/package-ownership.test.ts      微信分包规则回归测试（5 用例）
docs/package-ownership-gate3.md      本文档
```

**新增目录（9 个页面 + 15 个模块的落位）**

```
miniprogram/pkg-explore/pages/{exploration,route-overview,camp-detail,altitude}/
miniprogram/pkg-explore/engine/{exploration-engine,expedition-visual,route-path,
                                route-calibration,expedition-climb,expedition-camera,
                                calibration-validate}.ts
miniprogram/pkg-explore/utils/{summary,route}.ts
miniprogram/pkg-explore/data/calibrations/everest/{index,live-a-calibration}.ts
miniprogram/pkg-detail/pages/{knowledge-detail,place,peaks,credits}/
miniprogram/pkg-detail/engine/credits.ts
```

**修改（代码/配置）**

```
miniprogram/app.json                                 subpackages + preloadRule；主包 pages 收敛为 5 项
project.config.json                                  编译模式 pathName ×2（保留用户 appid / isGameTourist）
miniprogram/components/knowledge-popup/index.ts      导航路径
miniprogram/pages/{home,map,knowledge,profile}/index.ts   导航路径
miniprogram/pkg-*/pages/*/index.ts                   迁移后的相对 import + 同包导航路径
package.json                                         + npm run package:audit
tests/{pages,ui-bindings,expedition-page,expedition-motion,gate33c-live-a,gate35a-trust,
       knowledge-detail-media,route-overview-page,expedition-visual,expedition-camera,
       expedition-climb,route-path,route,engine,mariana,mvp,worlds-contract,
       calibration-stage2,calibration-tool,credits-integrity,build-boundary}.test.ts
scripts/calibration/sync-live-calibrations.mjs
scripts/_check-quotes.cjs
```

**`dist/`** 全量重新生成（`npm run build`），无手改。

**未改动**：任何 `assets/**` 字节、任何 WXML/WXSS 视觉、任何引擎逻辑、任何 world data schema。

### 8.1 关于 `git diff --check` 的告警（既有状况，非本次引入）

`git diff --check` 在 8 个文件上报 trailing-whitespace，共 109 行（`miniprogram/app.json`、`dist/miniprogram/app.json`、`components/knowledge-popup/index.ts`、`tests/{engine,mariana,mvp}.test.ts`、`scripts/copy-assets.mjs`、`tsconfig.build.json`）。

**这些文件在 git 里的 HEAD blob 本身就含 CRLF**（`core.autocrlf=true`，工作区与 blob 都是 CRLF）。在 CRLF 存储的文件里新增行，git 会把行尾的 `\r` 当作 trailing whitespace。已逐行核对：这些行结尾是 `\r`（CRLF），**不是空格**。

同一现象的对照证据：`miniprogram/pages/map/index.ts`（HEAD blob 为 LF）本次改了 7 处导航路径，`git diff --check` **零告警**；`tests/ui-bindings.test.ts`（HEAD blob 为 LF）整文件重写，也零告警。

与 Gate 2 §8.4 记录的是同一个仓库既有行尾问题。本 Gate 的主题是包所有权，**没有顺带做全仓 EOL 归一化**（那会让 diff 变成整文件重写）。如需消除：

```bash
git add --renormalize .
```

或在仓库根加 `.gitattributes`（`* text=auto eol=lf`）统一约定。

---

## 9. 最终数据

```
PACKAGE REPORT
limits: per-package 2.00 MiB, total 20.00 MiB

main         pages= 5  files=129  js= 582.3 KB  media=5,522.0 KB  other= 115.1 KB  TOTAL=6,219.4 KB (6.07 MiB)  FAIL
pkg-explore  pages= 4  files= 27  js= 173.2 KB  media=    0.0 KB  other= 120.9 KB  TOTAL=  294.1 KB (0.29 MiB)  PASS
pkg-detail   pages= 4  files= 17  js=  17.4 KB  media=    0.0 KB  other=  29.8 KB  TOTAL=   47.3 KB (0.05 MiB)  PASS

Total: 6,560.8 KB = 6.41 MiB
Main package: 6,219.4 KB = 6.07 MiB  FAIL (limit 2 MiB)
```

**主包最大媒体（全部 ≥130 KB，合计 3,312.3 KB = 主包的 53.3%）**

| KB | 资源 | 为什么留主包 |
| ---: | --- | --- |
| 527.9 | `assets/world/globe-texture-realistic-2048.jpg` | 只有 `map`（tabBar，必须在主包）用 |
| 505.1 | `assets/expeditions/everest/live/live-a-kala-patthar.jpg` | `map` + `home` + `knowledge` 都要 |
| 349.3 | `assets/world/everest-expedition-hero-v1.jpg` | 同上 |
| 302.2 | `assets/world/globe-specular-2048.jpg` | 只有 `map` 用 |
| 189.4 | `assets/content/colorado/c-vishnu-river.jpg` | `map` + `home` 可显示任意 place 封面 |
| 178.6 | `assets/content/fuji/f-forest-lower.jpg` | 同上 |
| 171.9 | `assets/content/colorado/c4-phantom-ranch.jpg` | 同上 |
| 152.3 | `assets/content/colorado/c-indian-garden.jpg` | 同上 |
| 144.3 | `assets/content/colorado/c1-trailhead.jpg` | 同上 |
| 143.4 | `assets/content/colorado/c3-kaibab-fossils.jpg` | 同上 |
| 138.1 | `assets/content/colorado/c-resthouse-15.jpg` | 同上 |
| 130.6 | `assets/world/globe-height-2048.jpg` | 只有 `map` 用 |

**无法迁移的共享依赖**：全部 47 个资源文件。根因是 `data/media/world-manifests.ts` + `getPlaceHeroImage()` 的运行时按 id 查询，被主包页面 `map` / `home` / `knowledge` 共用（§3.2）。

**Remaining release blocker：YES** —— 主包 6.07 MiB > 2 MiB。

---

## 10. Gate 3 判定

| PASS 条件 | 状态 |
| --- | --- |
| Build PASS | ✅ |
| Typecheck PASS | ✅ |
| Vitest PASS | ✅ |
| **Main < 2 MiB** | ❌ 6.07 MiB（3.04×） |
| package ownership clear | ✅ |
| 独占 exploration assets 不再留在主包 | ⚠️ 不存在此类资源（已用数据证明） |
| 独占 detail assets 不再留在主包 | ⚠️ 不存在此类资源 |
| navigation paths valid | ✅ 静态（GUI NOT VERIFIED） |
| runtime asset paths valid | ✅ |
| 不改变 UI | ✅ |
| 不改变图片质量 | ✅（资源字节零变化） |
| 不进行 Gate 4 工作 | ✅ |

**Gate 3 交付了正确的 package ownership，但未达成体积 Hard PASS。** 该目标在"MOVE, DON'T REWRITE + 不上 CDN + 不改视觉"的约束下已被算术证明不可达（§5）；后续需要 Gate 4 的媒体外置决策。

按指令在此停止，不进入 Gate 4，不提交。
