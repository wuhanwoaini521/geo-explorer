# Gate 3.3C.1 · 人工视觉复审 — 4 处呈现层修复 · 验收报告

> 状态：**READY FOR HUMAN RE-REVIEW**（代码 + 回归验证交付 ✅；**不 commit、不 push**，待用户本人人工视觉复核后再谈提交拆分）
> 前置：Gate 3.3C（`gate-3.3c1-everest-hero-acceptance.md`）已 3.3A/B/C 交付并推送；本 Gate 为 3.3C.1 最后一段**受限修复（constrained fix pass）**。
> 需求文档：`D:\Downloads\Geo-Explorer-Gate-3.3-Everest-Dual-Visual-Mode.md`

## 0. 范围纪律（用户明确批准的 4 处，禁止越界）

| # | 缺陷 | 修复 | 状态 |
| --- | --- | --- | --- |
| P0-1 | `实景/实景不可用` 顶部切换与**原生胶囊重叠** | toggle 右缘改由 `capRight` 内联驱动（胶囊左缘外 8px） | ✅ 已修 |
| P0-2 | LIVE 不可用 fallback 呈「米/粉空渐变 + 像素化地形残片」 | 改本地 `everest-hero.jpg` `cover` 铺满 hero，保留「实景·不可用」，**零新增网络依赖** | ✅ 已修 |
| P1-3 | hero→sheet 硬接缝 | 加跨接缝照片暗化渐变 `exp-sheet-fade`（**不挪/不加高 sheet**） | ✅ 已修 |
| P1-4 | Discovery 卡（knowledge-popup）过亮/cyan-heavy | 改暗色半透明玻璃：细边、减阴影、单 accent 图标 | ✅ 已修 |

**红线遵守**：不改业务逻辑；不新建第二套进度；不动 hero 构图 / 进度条 (~75%) / `expedition.pct` / 底部按钮（竖撤/查看路线/攀登）/ 信息层级与层叠顺序；不碰第三方 3.3C 引入代码；不 commit、不 push。

**改动文件（仅 4 个 + dist 构建产物）**：

```text
miniprogram/pages/exploration/index.ts            （capsule/capRight + fallback 文案）
miniprogram/pages/exploration/index.wxml          （toggle 内联定位 / view-fallback / exp-sheet-fade）
miniprogram/pages/exploration/index.wxss          （.view-fallback / .live-info-chip / .exp-sheet-fade 等）
miniprogram/components/knowledge-popup/index.wxss（Discovery 卡暗玻璃重写）
```

`git diff --stat`（仅这 4 文件 + 277 增 / 161 删）：无越界文件。`dist/` 为 `npm run build` 构建产物（非手改）。

## 1. P0-1 胶囊重叠修复

- `index.ts` 新增 `capRight:96`（默认，内联驱动）；`refreshSafeArea()` 用 `getMenuButtonBoundingClientRect()` 计算 `windowWidth - menuRect.left + 8` → `setData({ capRight })`。
- WXML `.vis-toggle` 改内联 `style="top:{{capTop}}px; right:{{capRight}}px"`；WXSS `.vis-toggle` 保留 `right:100rpx` 仅作首帧/缺失兜底。
- 效果：右上角「实景 | DEM」从原生胶囊下方清开，不再重叠；部分 Android 窄款差异为已知可接受（内联驱动已按实测胶囊修正）。

## 2. P0-2 LIVE 不可用 fallback（本地资产铺满）

- WXML 第 21 行新增：`<image wx:if="{{routeMode && visLiveFallback}}" class="plate view view-fallback" mode="aspectFill" src="/assets/world/everest-hero.jpg">`。
- WXSS `.view-fallback`：`top:0; height:100%; transform:none; z-index:5` → 铺满 hero 全区，盖过 DEM view-a/b/c（z2-4）之上，仅在 `routeMode && visLiveFallback` 出现。
- chip 逻辑修正：`wx:if="{{liveInfo}}"`（不依赖 `visLiveSrc`），位于 toggle 下方，fallback 时必显。
- **0 新增网络依赖**：全部素材来自现有 `miniprogram/assets/world/` 本地资产。
- 文案 4 处全局统一：`实景暂不可用 · 已回退科学地形` → `实景暂不可用 · 已回退本地影像`。

## 3. P1-1 hero→sheet 接缝

- WXML 第 199 行新增 `<view class="exp-sheet-fade"></view>`；WXSS：`bottom:36vh; height:22vh; z-index:10; pointer-events:none`，渐变 `rgba(8,13,26,0)→rgba(6,9,18,0.86)`。
- **未挪 sheet、未改 36vh、未改进度条/按钮/层级** —— 只在叠缝处加跨接缝暗化。

## 4. P1-1 Discovery 卡暗玻璃

- `miniprogram/components/knowledge-popup/index.wxss` 整体重写：
  - 底 `rgba(15,22,37,0.92)` + `backdrop-filter:blur(26rpx)`（暗色半透明玻璃）
  - `border: 1rpx solid rgba(255,255,255,0.12)`（细边）；`box-shadow: 0 -10rpx 40rpx rgba(0,0,0,0.35)`（减阴影）
  - `max-height: 72vh`（更小占用）
  - 整卡唯一强高亮 = 知识 emoji accent（单 accent 图标）；辅色 `#9fd4ff` 仅用于知识名/链接等极少量元素
  - **否定全绿渐变 / cyan-heavy 风格**

## 5. 验证

| 项 | 结果 |
| --- | --- |
| `npx tsc --noEmit` | ✅ exit 0，无类型错误 |
| `npx vitest run` | ✅ 28 bundles passed / 324 passed / 2 skipped |
| `npm run build` | ✅ clean 103（删除旧产物）→ copy 48 → 55 个 JS check-requires 全通过 |
| dist 与 source 文案一致性复核 | ✅ `grep`：dist 与 source 均为「已回退本地影像」×4（构建前 dist 残留旧文案 → **重新 build 强制重建后已同步**） |
| dist WXML 复核 | ✅ `view-fallback` / `exp-sheet-fade` / `capRight` 内联 / `live-info-chip` 均在 dist 中 |
| 构建后 image 资产 | ✅ `miniprogram/assets/world/everest-hero.jpg` (1100×825) 存在，PIL 亮度栅格：中部山脉中-高亮区、上下暗部 → 适合作为全幅 hero cover 底图（chip/胶囊其上可读） |
| 自动截图 | ⚠️ 见 §6 |

## 6. 自动截图情况（明确说明）

装置本身可跑截图；但本轮**无法自动获取 WeChat DevTools 渲染截图**：

- DevTools 自动化端口 9420 未监听（未启动 `miniprogram-ci` / `cli.auto --auto-port 9420`）；ipadmin/adb 亦未监听。
- 视觉子代理 `zhipu-vision/glm-4.6v-flash` 仍 429 限流（未恢复）。
- 当前轮确认不改 visible UI：按仓库 Headless/无窗口策略，未前台拉起 DevTools。

因此本次验证以**静态复核 + tsc/vitest/build + dist 一致性**为硬证据；**LIVE 可用（截A）/ LIVE 不可用（截B）真机像素级目检需用户人工在两处端（微信开发者工具 + 真机）完成**。

> 若你希望我补做自动截图：请先打开微信开发者工具（或允许我以后台方式启动 `cli.bat auto --auto-port 9420`，等自动化端口就绪后我再跑 `miniprogram-automator` 截 A/B 并贴图）。端口就绪前我不会强制拉起可见窗口。

## 7. 人工复核清单（用户在微信双端目检）

| 检查点 | 期望 |
| --- | --- |
| 右上「实景」切换与原生胶囊 | 不重叠、不遮挡 |
| LIVE 可用场景 | hero 显示真实 Everest 影像（`aspectFill`+crop），toggle 「实景」高亮 |
| LIVE 不可用场景（可在真机断网 / 临时把 `expedition.media.live` 指向不存在资源触发 `bindError`） | hero 显示 `everest-hero.jpg` 默认本地影像全幅铺满，「实景·不可用」chip 出现且贴 toggle 一行下方 |
| hero→sheet 接缝 | 有暗化过渡，无硬接缝 |
| Discovery 卡 | 暗色半透明玻璃、细边、弱阴影、非 cyan 滤色 |
| 进度条 (~75%) / `expedition.pct` / 底部按钮（竖撤/查看路线/攀登） | 与修复前一致（未受影响） |

## 8. 交付物 & 后续

- 本 Gate **只加代码 + 本报告**；未 commit、未 push。
- 人工复核通过后：按承诺拆分 commit（不一次性提交 77+ 文件），分主题（capsule / fallback / 接缝 / 卡玻璃 / dist 同步）提交并推送 `origin/main`。
- 若复核再发现边缘问题：此报告只补（补修部分），并在「Remaining」中记录原因，不扩大范围。
