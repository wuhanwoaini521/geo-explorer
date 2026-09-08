# Gate 3.3C · Everest Hero 验收 —— LIVE/TERRAIN 双视觉模式页面接入 · HUD 真实化 · 人工签核清单

> 状态：代码 + 回归验证已交付 ✅（**3.3C.1 提交，待人工视觉签核**）
> 前置：Gate 3.3A（架构/纯逻辑，`9b61b21`）、Gate 3.3B（LIVE 素材 review/推荐集修订，`24dabad`）、第三方 3.3C Stage 2–9 已 fast-forward 到 `99df2a6`。
> 后续：**需用户本人人工签核**（见 §5）→ 合规后提交推送 `origin/main` → （若通过）B/C/D 资产收录。

需求文档：`D:\Downloads\Geo-Explorer-Gate-3.3-Everest-Dual-Visual-Mode.md`
Gate 3.3A 交付：《gate-3.3a-visual-mode.md》（本报告是 3.3A 文档所说的「3.3C — 页面接入 LIVE renderer + 模式切换 UI」）

## 0. 范围纪律（本 Gate 只做页面接入层，代码交付即停）

| 做 ✅ | 不做 ❌ |
| --- | --- |
| 页面消费 `resolveExpeditionVisual()` → LIVE/TERRAIN 双渲染 | ❌ 不新增第二套进度 / 不手写 progress 边界（仍由 stageMap 派生） |
| crop 字段在 WXML 的唯一消费点（`object-position` + `scale`） | ❌ 不做随机 `object-fit` / Ken Burns 二次裁剪（README 第 27 行） |
| 请求模式（visMode）与实际渲染（visActive）分离 + 兜底诚实表现 | ❌ 不改 Route Engine / `data/expeditions/everest.ts` 的视觉配置结构 |
| HUD 对照 `design/reference/expedition-v2` 收敛（主/次/路线三层次） | ❌ 不新收 B/C/D 素材（只保留「无资产 → 兜底」的预期态） |
| LIVE 解码失败会话内回退（§42），toggle 如实显示「实景·不可用」 | ❌ 不擅自拉改第三方 3.3C 代码（本次仅按 #19–#27 授权面改动） |

**验收自检**：源码改动仅限 5 个授权文件（引擎 + 页面 .ts/.wxml/.wxss + 测试）+ 本报告；`dist/` 为构建产物、非手改。

## 1. 本 Gate 做了什么（相对 Gate 3.3A 纯逻辑的「页面接入」）

Gate 3.3A 交付了一个纯函数层的所有结构前提；本 Gate 把它接进探索页运行时：

- **每帧派生**：`syncVisualMode()` 以真实 `ExpeditionDriveState.stageIndex` 为唯一输入调用 `resolveExpeditionVisual()`，输出 `ExpeditionVisualPresentation` 后只做「翻译」——LIVE 就渲染真实图 + overlay，TERRAIN 就保持 DEM。页面自身不做视觉决策。
- **默认模式 = LIVE**（会话内记忆，切 TERRAIN 后不写长期存储）；未配置视觉（Mariana 等）/ 解码失败一律落 DEM，**不留白**。

## 2. 请求 vs 实际分离（§24 的「诚实表现」落成代码）

| 字段 | 含义 | 作用 |
| --- | --- | --- |
| `visMode` | 用户会话内**请求**（默认 LIVE） | 切换 pill 的点击态入口 |
| `visActive` | **实际渲染层**（LIVE 真在渲染才高亮） | toggle 高亮唯一来源；兜底时不高亮「实景」 |
| `visLiveFallback` | LIVE 请求但已兑底 TERRAIN | UI 亮「实景·不可用」，不虚假点亮 |
| `visLiveNoted` | 会话内「不可用」已提示过一次 | 避免每帧重写同一 setData（去花） |

触发点覆盖：

- 无 visual 配置 / visBroken → `visActive=TERRAIN` + `visLiveFallback=false`（未请求 LIVE 不提示）。
- LIVE 呈现成功 → `visActive=LIVE` + `visLiveFallback=false`。
- LIVE 请求但 B/C/D 无图/解码失败 → `visActive=TERRAIN` + `visLiveFallback=true` + `liveInfo="实景暂不可用 · 已回退科学地形"`（只提示一次）。
- `onLiveImageError`（§42）→ 会话内 `visBroken=true`、回退 TERRAIN，togole 如实反映。
- 端到 END：`syncVisualMode()` 的「随后优化」分支严格用 `visMountedSrc ==="" && data.visActive==="TERRAIN"`，避免状态误判。

## 4. crop 消费（§12/§13 的「页面必须完整消费 crop 字段」）

- 引擎新增 `LiveCropUi` + `presentationCropUi(crop?)`：把数据层的 0-1 焦点 / scale 换算成 `0-100 object-position` + `zoom(≥1)`。**唯一换算点**，页面/样式层不得再随机裁剪或额外缩放。
- WXML `<image>`：`mode="aspectFill"` + 内联 `object-position: focusX% focusY%` + `transform: scale(zoom)`，binding `visLiveSrc`。
- `.view-live` 改为**全屏盒**（`top:0; height:100%; transform-origin:50% 50%`），覆盖 `.view` 视差顶部留白；仅 opacity 过渡（0.22s），**无 Ken Burns**。
- 默认 crop（未配置）＝ focus 50/40 zoom 1；切换时重置 `liveCropUi`。

## 4. HUD ‖据设计参考收敛（`expedition-v2/README`：「Terrain is the primary visual content, UI is a lightweight overlay」）

- 删除常驻 `.exp-intro`（阶段简介一行）与登顶胶囊的经纬度坐标 → 地形成为主视觉，UI 归轻量。
- 死亡区条带文案去掉尾部口号（只留事实），下撤/查看路线/攀登按钮去 emoji。
- 底面板 `.exp-sheet` 背景更通透（rgba 0.55/0.72 + blur 12rpx），层级仍主（位置/海拔）→ 次（距顶/空/光/温）→ 路线（进度/下一站）。
- LIVE 数据说明一行（`liveSceneInfo`：真实珠峰影像 · 代表性视角等）继续保留，仅在 LIVE 时显示。

## 5. 需人工签核项（用户本人，模型不替代）

| # | 检查项 | 期待结果 | 说明 |
| --- | --- | --- | --- |
| S1 | **Delta hero 1080×1920 裁切**（Kala Patthar，`focus 50/38, zoom 1`） | 珠峰主体第一眼居中可见，无随机裁走主体 | 用微信开发者工具真机预览；如需微调 focus/scale → 改 `everest.ts` 的 crop 后重测 |
| S2 | **LIVE / TERRAIN 切换** | 切换 pill 高亮与实际渲染一致；LIVE 图淡入 0.22s 无白屏；B/C/D 区显示「实景·不可用」且 toggle 不高亮实景 | 检查 `visActive` 高亮正确性 |
| S3 | **LIVE-B/C/D 队列**（recommended-set-v2 的候选） | 当前无 approved 资产 → 预期兜底 TERRAIN；签核结束后按 §review 流程逐条收录 | 不能由模型代签素材合规性 |
| S4 | **HUD 密度与参考对齐** | 地形为主、UI 轻量；底部面板通透；死亡区克制 | 真机查看地形清晰度 |
| S5 | **性能**：`.view-live` 全屏图 + blur(12rpx) 背板 | 上拉/下拉无卡顿；反复退级不闪烁 | 低端真机需再确认 |

> 若 S1–S5 全部通过：告知后可提交推送。若任一不通过：先只改对应局部（crop 值 / 样式），**不可改管线结构**。

## 6. 测试与构建（本次已完成）

- `npx vitest run`：28 文件全通过、1 跳过（29）；`tests/expedition-visual.test.ts` = **20/20 通过**（新增 `presentationCropUi` 4 例：默认值 / 0-100 换算 / 越界聚焦 / LIVE 产物一致性）。
- `npm run typecheck`：0 错误。
- `npm run build` 全套：`[clean] 删除 103 个文件；33 个目录保留`、`[copy-assets] copied 48 resource file(s)`、`[check-requires] OK — 55 个 JS 文件全部通过`。
- `tests/everest-data.test.ts`、`tests/expedition-v2.test.ts` 等触达校验测试全绿（vitest 28 文件级跑过）。

## 7. 范围 / 文件清单（源码 + 测试，`git diff --stat`）

```text
miniprogram/engine/expedition-visual.ts    +LiveCropUi / presentationCropUi（crop → object-position+zoom 唯一换算）
miniprogram/pages/exploration/index.ts     visMode/visActive/visLiveFallback/visLiveNoted/liveCropUi；sync 兜底分支重写；onToggle/onLiveImageError
miniprogram/pages/exploration/index.wxml   LIVE 图消费 crop；toggle 高亮改 visActive +「实景·不可用」；HUD 减负（intro/coords/emoji）
miniprogram/pages/exploration/index.wxss            .view-live 全屏化、toggle 中性高亮/不可用态、exp-sheet 通透、删 .exp-intro/.exp-summit-coords
tests/expedition-visual.test.ts             +4 → 20 例（presentationCropUi）
docs/gates/gate-3.3c1-everest-hero-acceptance.md    ★ 本报告
```

未改（红线）：`data/expeditions/everest.ts`（视觉模型结构）、`express-expedition 第三方 3.3C Stage 2–9`、`dist/`（构建产物）。

## 8. 交给下一阶段

- **人工签核**（§5）→ 通过后 `git add -A && git commit && git push` 推送 `origin/main`（**需用户指令**）。
- **B/C/D 素材收录**：照 `design/world/everest-live/recommended-set-v2.md` 流程（License 核查 → approved → `everest.ts` 绑定），每新增一条都要回归 `expedition-visual` 测试与 3.3C.
- 若签核反馈 HUD 密度过高 → 只改样式/文案，不动视觉决策（engine 稳定）。
