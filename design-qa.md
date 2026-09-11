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
