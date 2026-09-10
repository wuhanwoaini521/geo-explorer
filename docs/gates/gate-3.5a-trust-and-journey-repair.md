# Gate 3.5A — Trust & Journey Repair

## 结论

**READY FOR HUMAN UX REVIEW**

本轮已按 P0 → P1 顺序完成代码修复、纯逻辑测试、构建和一轮 WeChat 后台截图回归。没有提交、没有推送，也没有覆盖工作区中原有的用户修改。

本轮保护并继续使用：

- `ExpeditionDriver`
- `miniprogram/data/routes/everest/south-col.ts` 的 South Col canonical route
- Gate 3.4 的 2.5D / terrain projection 架构

没有新增第二套可独立维护的路线、海拔或当前位置数据源。

## 修复内容

### P0：信任与安全

1. 新增 `engine/expedition-observation.ts` 作为派生观察视图适配器。地图、路线索引和探索页的观察点状态、地貌名称、状态文案和峰顶高程由 canonical `RouteIndex + ExpeditionDriver` 派生。
2. 统一峰顶展示规则：`8,848.86 m`，不再将 canonical 峰顶显示为 `8,849 m`。
3. 探索页把原本容易误解的“当前营地”语义改为“当前观察区 / 下一观察点”，并显示到下一观察点的距离；里程碑提示改为“已到达：……”。
4. 知识浮窗接收当前探索上下文，展示当前观察区和当前 canonical 海拔，不再单独使用知识节点阈值冒充当前位置。
5. 地图路线和节点统一使用同一组 canonical milestone projection；路线线段按竖屏宽高比换算，节点不再由旧 waypoints 和手写纵向间距生成。
6. “我的”页补齐完成探索和已获知识的分母，并限制完成度不超过 100%；清空动作改为低强调危险按钮，确认文案明确说明会删除进度、收藏和挑战成绩且不可恢复。

### P1：流程与可发现性

1. 首页搜索输入会即时过滤场景，支持“珠峰”等常用别名，并增加无结果和清除搜索状态。
2. 首页缩短 Hero 并增加底部安全空间；地图预览卡上移到 TabBar 之上。
3. 地图路线节点增加“已观察 / 当前观察 / 待观察”状态、选中高亮和随节点变化的预览图；图鉴抽屉和知识页内容为 TabBar 预留滚动空间。
4. 地图、知识、挑战三个根页面恢复可见自定义 TabBar，TabBar 顺序仍与 `app.json` 五项配置一致。
5. 探索页将“按钮点击前进”作为唯一主指令，移除首要提示中的滑动操作歧义；攀登后继续保留明确的到达反馈。
6. 地点详情页将“开始地貌观察” CTA 移到详情内容首屏。
7. 路线索引增加“已观察 x/5”和“继续观察”入口，并为每行显示当前/已观察/待观察状态。
8. 知识详情页增加明确的“返回知识”和“继续浏览知识”出口。
9. 挑战结果页增加“继续学习”，把挑战结果接回知识页，避免停在无下一步的结算页。

## 测试

新增 `tests/gate35a-trust.test.ts`，覆盖：

- canonical 观察点状态从 driver 进度派生；
- 峰顶格式不超过 `8,848.86`；
- 地图节点与路线线段使用同一投影端点；
- 首页搜索别名和空结果；
- 探索、个人页、挑战页关键控件和文案确实出现在 WXML。

结果：

- `npm run typecheck`：通过
- `npm test`：34 个测试文件通过，1 个文件中 2 个既有 smoke case 跳过；385 passed / 2 skipped
- `npm run build`：通过
- `scripts/check-requires.mjs`：65 个 JS 文件通过
- `git diff --check`：无 diff 错误（仅有 Windows 换行提示）

构建已重新生成 `dist/miniprogram`，源码和实际加载目录同步。

## 截图回归

截图全部使用 `miniprogram-automator` 连接 `ws://127.0.0.1:9420` 在后台执行，未打开可见浏览器或微信窗口。证据目录：

`artifacts/visual/usability-review-3.5a/`

已生成：

```text
01-home-entry.png
01a-home-search.png
02-map-discovery.png
03-place-preview.png
03a-map-atlas.png
04-place-detail.png
05-exploration-entry.png
06-climb-action.png
07-route-overview.png
08a-knowledge-index.png
08b-knowledge-detail.png
09-challenge.png
09a-challenge-question.png
10-challenge-result.png
11-my-progress.png
```

截图检查重点：

- 首页搜索结果已进入可见内容区；
- 地图节点有选中态，路线线段与节点共用投影；
- 探索页显示当前观察区、下一观察点和攀登操作；
- 路线索引显示观察进度和状态；
- 知识页、挑战页和我的页的根 TabBar 可见；
- 我的页显示 `完成探索 x/y`、`已获知识 x/y`。

## 未完成的运行时证据与限制

以下内容没有被标记为运行时 PASS：

1. `04a-place-related-tab.png`：地点详情标签切换在连续 WeChat RPC 会话中发生响应超时，已有静态绑定测试，但没有稳定的本轮标签切换截图。
2. `08-contextual-knowledge.png`：探索页知识浮窗的自动点击在本轮连续会话中未稳定完成，浮窗上下文绑定由 WXML/类型检查覆盖，但尚缺本轮截图证据。
3. WeChat 自动化多次连续 `reLaunch` / 页面切换偶发 `timeout waiting for automator response`。独立页面截图大多数成功，不能据此宣称所有跨页动作已完整通过。
4. 未清理 WeChat 共享运行时的本地存储。原因是该运行时可能包含用户已有的进度、收藏和挑战数据；本轮没有执行不可逆的 `clearStorage`。因此 `11-my-progress.png` 是带已有本地状态的回归截图，不是干净存储下的首次用户截图。
5. 路线索引和知识详情的最终截图已更新；其余截图对应最后一次成功的后台渲染会话。最终仍需要人工在干净存储和真实触控设备上确认视觉节奏、字体尺寸、点击热区和返回栈行为。

## 建议的人审重点

1. 在干净存储下确认首页 → 地图 → 地点 → 探索的首个主动作是否一眼可见。
2. 连续点击“攀登”确认每个观察点的当前/下一状态、海拔、路线 marker 和到达反馈同步变化。
3. 在探索中打开知识浮窗，确认浮窗海拔与 HUD 当前观察区一致，且“继续探索 / 查看详情 / 关闭”三个出口都不遮挡关键路线。
4. 从 TabBar 逐项进入地图、知识、挑战、我的，确认页面返回和 TabBar 高亮不跳变。
5. 在“我的”页点击清空，确认危险提示内容与实际删除范围一致。

## Git 状态

本轮严格 **NO COMMIT / NO PUSH**。工作区原有的 `AGENTS.md`、`.pi/agents/vision-reviewer.md`、Gate 3.4/3.5 文档和临时设计文件均未回退、未覆盖。
