# Geo Explorer Map · 左右构图视觉验收

## Latest QA · Native layer occlusion repair · 2026-09-11

- Source visual truth：`C:\Users\admin\AppData\Local\Temp\codex-clipboard-4d3781dd-76a1-4b19-a773-af7ac1d23f58.png`（用户提供的图鉴与选中态遮挡截图）。
- Visual review：视觉审查代理确认 P0 遮挡存在；右侧控制按钮仍在地球上方，而图鉴抽屉和地点弹窗被地球原生层截断，符合 Canvas 与普通 `view` 的分层冲突特征。
- Implementation：图鉴打开时通过 `wx:if` 移除 WebGL/2D Canvas，并停止渲染器；同时隐藏地图标记、右侧罗盘和地图工具，避免它们残留在图鉴上方。地点弹窗移动到页面根层独立 `cover-view` 覆盖层，使用固定定位和更高层级。
- Runtime capture：当前微信开发者工具自动化端口在重新编译后 RPC 无响应（`reLaunch` / `pageStack` timeout），因此本轮未将未生成的截图标记为视觉通过。

### Result

- P0 原因已针对性修复并完成源码、构建产物检查。
- Final result：`runtime screenshot pending`

## Latest QA · Selected destination overlay · 2026-09-11

- Source visual truth：`C:\Users\admin\AppData\Local\Temp\codex-clipboard-52a15a28-dbe3-4f3c-a58d-be5c280bd3f2.png`（507 × 449，用户提供的选中态截图）。
- Implementation screenshot：`D:\code\self-github\geo-explorer\artifacts\visual\selected-popup-fixed.png`（455 × 983，微信小程序无头截图）。
- State：选中 `p-everest`，弹窗显示，地球与推荐区可见。
- Focused region：弹窗与原生 Canvas 的层级关系、标题/关闭按钮/海拔指标可读性、底部导航和推荐卡片完整性。

### Result

- P0：无。
- Core fix：通过；弹窗已完整浮在地球上方，地球纹理不再穿透弹窗。
- Regression check：推荐卡片、底部导航和地球主体未被弹窗意外遮挡。
- Remaining P1/P2：地点标签密度、球体比例和云层细节仍有进一步视觉优化空间，但不属于本次“弹窗被压到后面”的阻塞问题。
- Final result：`passed`

## Latest QA · Globe edge repair · 2026-09-11

本轮目标是修复用户截图中地球左右和底部像被矩形裁切的割裂感。

- Source visual truth：用户提供的 Map 截图（`C:\Users\admin\AppData\Local\Temp\codex-clipboard-caa463f0-159e-41e6-8cd1-978a2ab274d4.png`，当前环境未保留附件文件，以对话内截图为准）。
- Implementation screenshots：`D:\code\self-github\geo-explorer\artifacts\visual\webgl-fade-large-fullui-2.png`（完整页面）与 `D:\code\self-github\geo-explorer\artifacts\visual\webgl-edge-final.png`（最终 HUD/边缘聚焦截图）。
- Viewport：微信小程序模拟器手机视口；实现截图 455 × 983 px。源图按对话内手机截图进行同构图比较，未将设备外框差异计入问题。完整页面截图使用同一球体几何，最终只增加 HUD 对比度 token。
- State：Map 默认世界视图，WebGL active，推荐区可见，未选中地点。
- Focused regions：地球左右边缘、底部渐隐、右侧 HUD、地球与 caption/recommendation 的衔接。

### Comparison history

1. Initial finding（P1）：Canvas fallback 的球体尺寸超出原生 Canvas，右侧和底部被 Canvas 矩形边界硬切。
2. Fix：修复 WebGL fragment shader 缺失的 `uResolution` 以及顶点/片元 uniform 精度不一致，恢复默认视图的 WebGL 渲染；使用片元 alpha 对左右与底部做渐隐。
3. Follow-up finding（P1/P2）：首轮渐隐后球体偏小、右侧 HUD 对比度不足。
4. Fix：放大并微调球体位置；提高 HUD 层级、颜色和文字阴影。
5. Final evidence：左右和底部保持自然渐隐，无矩形收口；球体比例接近参考；HUD 可辨识；完整页面证据中的 caption 与推荐区未被球体遮挡。

### Final result

`passed`

## 历史验收结论（已被 Latest QA 更新）

`passed`

本轮只调整 Map Hero Layout，保留 Globe Renderer 的球面、离线纹理、Marker Projection、自动旋转、拖拽、聚焦和 Back-face Occlusion。首屏现在呈现 `Oversized Left Globe + Compact Right Destination Panel`，不再是“地球在上、详情卡在下”。

## Final Report

- 旧布局：Vertical / Top-Bottom；选中后出现底部全宽白色 Destination Card。
- 新布局：Asymmetric Split Scene；左侧 Globe Hero，右侧紧凑深色 Destination Panel，Featured Explorations 独立保留在 Hero 下方。
- Globe Position：Canvas 固定为 Hero 左侧约 70% 视觉区域，顶部上提，球体在左侧形成半球式主视觉。
- Panel Position：`position: absolute` / `cover-view`，右侧约 30%～38% 信息轨道；不占整页宽度、不推动 Globe 高度、不触发 flex wrap。
- Variant A：Globe Left + Panel Right；作为结构基线，验证了左右关系。
- Variant B：Oversized Left Globe + Floating Right Panel；当前默认实现，采用无图片、暗色半透明、轻量入场动画的紧凑面板。
- Selected Marker / Panel Sync：PASS；点击或搜索地点后，Marker 高亮、Globe 聚焦、Panel 显示同一地点。
- Small Screen：PASS；采用百分比宽度与 `min-width` / `max-width` 约束，375 / 390 / 430 宽度下不会因为 `flex-wrap` 掉到 Globe 下方。
- Visual：PASS（本轮边缘修复目标）；更早的 1:1 字体与设备外框差异仍属于历史记录，不影响本轮边缘验收。

## 实现证据

- Map WXML：`D:\code\self-github\geo-explorer\miniprogram\pages\map\index.wxml`
- Map WXSS：`D:\code\self-github\geo-explorer\miniprogram\pages\map\index.wxss`
- Map interaction：`D:\code\self-github\geo-explorer\miniprogram\pages\map\index.ts`
- Headless capture helper：`D:\code\self-github\geo-explorer\scripts\globe-state-capture.cjs`
- World：`D:\code\self-github\geo-explorer\artifacts\visual\map-layout-world.png`
- Everest：`D:\code\self-github\geo-explorer\artifacts\visual\map-layout-everest.png`
- Mariana：`D:\code\self-github\geo-explorer\artifacts\visual\map-layout-mariana.png`
- Sahara search：`D:\code\self-github\geo-explorer\artifacts\visual\map-layout-sahara.png`

## 重点检查

- Default World：无 Selected Panel；左侧球体、顶部 Header/Search、下方 Featured Explorations 同时可见。
- Everest：选中标记与右侧 Everest Panel 对应，Panel 包含类型、地点、英文名、核心指标和入口动作，无图片、无底部白卡。
- Mariana：Globe 聚焦海沟位置，Panel 与 Mariana Marker 同步。
- Sahara：通过 `?q=Sahara` 搜索，Globe 聚焦 Africa，Sahara Marker 与 Sahara Panel 同时出现；不再出现“亚洲视角 + Sahara 详情”的空间错位。
- Canvas 层：右侧面板使用 `cover-view`，避免被微信小程序 2D Canvas 原生层覆盖。
- Panel 选中前后均为绝对定位，未改变 Globe/page height；关闭后恢复无面板状态。

## 验证

- `npm run typecheck`：passed
- `npm test`：passed；36 个测试文件通过，1 个跳过；404 个测试通过，2 个跳过
- `npm run build`：passed；资源复制与 require 检查通过
- 微信小程序自动化截图：4 个最终状态均已生成，使用后台/无界面模式。
- 截图生成包含 `GLOBE_PAUSE=1`，只暂停截图时 Canvas 定时器以避免模拟器 RPC 竞争，不改变用户运行时行为。

## 已知边界

- 当前微信模拟器的 2D Canvas 是原生层，不能让普通 `view` 稳定覆盖在球体实心区域上；因此采用左侧专用 Canvas 区域 + 右侧 `cover-view` 信息轨道，优先保证真机可读性和布局稳定性。
- Globe 使用离线 2:1 写实卫星风格纹理，并已按 GlobeRenderer 的经度公式做水平包裹校准；切片渲染在小屏上仍可能出现轻微采样纹理，这是 Canvas 性能与离线运行的取舍。
- 参考图与当前实现仍存在差异：底部导航主题、字体字形、部分文案、球体云层/海岸线细节，以及选中态面板的精确覆盖关系尚未完全一致。

---

# Geo Explorer 参赛版 UI/UX 回归记录

**更新日期：** 2026-10-04
**视觉复审：** P0 0 项，P1 0 项；仍有逐页 P2 差异
**工程回归：** 类型检查、构建、单元测试通过
**运行时交互回归：** 部分完成；知识节点之后自动化路由调用失效，详见“交互与运行限制”

## 参考与截图

- 五张参考图：`D:\Downloads\01-explore.png`、`02-discover.png`、`03-knowledge.png`、`04-challenge.png`、`05-profile.png`。
- 最终实际截图：`C:\Users\admin\AppData\Local\Temp\geo-explorer-visual-check-20261004-final\`。
- 微信开发者工具 CSS 视口为 390 × 844，DPR 3；输出截图为 455 × 983。状态栏、刘海、微信胶囊和设备边框属于模拟器呈现差异。
- 通过 `ws://localhost:9420` 成功连接，并在视觉改动完成后真实截取了五页。截图不是编译结果推测。

| 页面 | 参考图 | 实际截图 |
|---|---|---|
| 探索 | `D:\Downloads\01-explore.png` | `01-explore-final.png` |
| 发现 | `D:\Downloads\02-discover.png` | `02-discover-final.png` |
| 知识 | `D:\Downloads\03-knowledge.png` | `03-knowledge-final.png` |
| 挑战 | `D:\Downloads\04-challenge.png` | `04-challenge-final.png` |
| 我的 | `D:\Downloads\05-profile.png` | `05-profile-final.png` |

实际截图目录：`C:\Users\admin\AppData\Local\Temp\geo-explorer-visual-check-20261004-final\`。

## 修复前主要差距

- **探索：** 地球主体偏低，标记没有地点照片，续探索卡的图片挤压文案。
- **发现：** 头部有多余标题/搜索占位，地点照片卡和筛选没有按参考图排布，底部导航附近会露出正文。
- **知识：** 图谱中心与推荐区比例不足，节点亮度和标签层级偏弱。
- **挑战：** 难度筛选放错位置，主图不是可滑动轮播，样图轮播指示数不一致。
- **我的：** 护照头像是通用标识，空挑战/收藏占据首屏，统计与探索记录没有按本机实际进度展示。

## 本轮变更

### 01 探索

- 调整 WebGL 与 Canvas 地球默认角度，保持真实投影和交互；默认首屏优先展示珠峰、科罗拉多大峡谷、马里亚纳海沟三个地点。
- Canvas 地点标签加入已审核实景缩略图并提高文字对比度；续探索卡缩小缩略图并拉开文字间距。
- 保留右侧图层/定位控件、真实海拔与进度，不按参考图硬写地点数值。

### 02 发现

- 收拢页头、默认隐藏搜索框，保留搜索开关和搜索事件；分类、地点卡、随机探索顺序靠近参考图。
- 首屏照片使用真实地点素材；缺少照片时使用目录行，避免同一张占位图冒充多个地点。
- 调整头图高度，并为固定底部导航遮住下方滚动内容。

### 03 知识

- 将真实地球渲染放回图谱中心，节点与推荐卡继续使用媒体清单中的实景素材。
- 节点学习状态仍由本机探索、阅读和答题进度推导；没有伪造解锁状态。

### 04 挑战

- 顺序调整为周进度、难度筛选、任务轮播、专题任务列表。
- 轮播收为四页：每日挑战与三个不同世界；四个真实世界任务仍全部留在下方列表。
- `0/5`、每日完成数、答题数和专题完成度继续读取本地真实记录。

### 05 我的

- 增加像素探险者头像、护照/邮戳视觉、真实统计、实景徽章。
- 隐藏没有真实数据的挑战成绩和收藏区块。唯一一条进行中的珠峰记录改为进度照片卡，卡内只显示真实到达高度、目标高度、知识数和 61% 进度。
- 设置菜单保留“数据来源与许可”和“清空本地数据”，设置入口增加无障碍说明。

## 视觉复审与竞争力审查

独立只读复审两次。最后一轮结论：**视觉 P0 0 项、P1 0 项**，可作为参赛展示稿；仍有 P2 级差异：

- 探索地点标签仍比参考图小，峡谷高度展示按项目数据，和样图数值不同。
- 发现头图/随机探索卡靠近屏幕边界。
- 知识页星空氛围、部分节点图文直觉对应和推荐卡文字层级仍可加强。
- 挑战主图仍较参考图灰暗。
- 我的页在只有一条真实进行中记录时仍有留白；未补造样图中的两条完成记录。

这些 P2 不妨碍当前视觉结构展示。模拟器只验证 390 CSS px；375、393、414、430 和实体机尚未验收。

## 交互与运行限制

- 已连接 9420，并完成五页截图。自动化交互中确认：探索页启动、发现 Tab、发现分类筛选、知识 Tab 可运行。
- 搜索断言没有通过自动化脚本验证；知识节点打开详情也未在脚本等待窗口内确认。脚本之后错误调用了 `miniprogram-automator` 的 `navigateBack()` 包装方法（该方法传递了无效的 `{url: undefined}` 参数），随后页面路由 RPC 超时，当前连接截图为知识页白屏，仅剩中心地球。**这是本轮自动化操作造成的状态，不能归咎为已确认的应用缺陷；我也不能声称自动化交互全量通过。**
- 交互脚本先备份了 1 个小程序本地存储键，并在退出前恢复。恢复日志显示键值已写回；路由恢复请求同样超时。为遵守“不自动前台化微信开发者工具”的项目要求，本轮没有强行关闭或重启用户的 DevTools 窗口。
- 挑战选项反馈、地图 Canvas 实际点位点击、收藏加/删、探索路线前进/返回仍未完成运行时点击验收。

## 构建、媒体和测试

- `npm run typecheck`：通过。
- `npm run build`：通过；79 个 JavaScript 文件可达，悬空引用为 0。
- `npm test`：59 个测试文件通过、2 个跳过；665 项通过、7 项跳过。
- `git diff --check`：退出码 0；输出仅有仓库现存的 LF/CRLF 提示。
- 没有配置 lint 命令。
- 常规构建按媒体所有权约束不把 `media-remote/` 中 46 张图片塞进代码包；当前 `MEDIA_REMOTE_BASE` 为空，所以干净构建里的这些远端媒体不显示。截图验证使用项目支持的 `node scripts/copy-assets.mjs --with-local-media` 开发预览覆盖层；测试在无该覆盖层的常规构建上通过。没有上传或部署媒体。

## Git 与交付边界

本轮没有 commit、push、reset 或清理用户文件。仓库开始时已有大量用户修改；现有 `dist/miniprogram/` 变化和新增资源由原有工作区变更、当前构建及本地媒体预览共同构成，提交前必须按任务文件逐项审查。

**本轮结论：** 五页视觉重构、构建、类型检查和单元测试已完成，独立审阅未发现视觉 P0/P1。运行时交互仍不完整；WeChat DevTools 页面在本轮自动化返回调用后没有恢复，最终截图不能替代健康运行时状态。干净发布包还需配置并验证媒体 CDN。
