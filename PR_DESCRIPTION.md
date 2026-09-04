# PR: feat/geo-explorer-product-polish → main

## 标题

feat: 世界图鉴层落地——49 个真实地点/详情/收藏/搜索 + Everest 途经点介绍卡 + 首页重设计

## 概述（可直接粘贴）

把 Geo Explorer 从「两个探索场景的技术 Demo」推进为带世界图鉴层的地理探索产品：

- **数据层**：Place 模型升级（nameEn/shortDescription/facts/tags/climate/geologicalAge/featured/explorationId），20 → 49 条真实地点，覆盖山峰/火山/峡谷/沙漠/冰川/河流/湖泊/瀑布/海洋/海岸/高原全部 11 类；新增 12 条可溯源冷知识；全部带来源与「近似」标注，未编造任何数据。
- **UI**：首页重设计（精选目的地/按地貌探索/你知道吗）；地图页升级为「探索地图 + 世界图鉴」（搜索 + 11 类筛选 + 卡片网格 + 空态）；新增地点详情页（概览/成因/气候/冷知识/相关地点/关联知识/沉浸探索 CTA）；我的页收藏夹；知识详情关联地点。
- **Everest**：8 个途经点补充真实介绍，点击路线点/Rail 展示「名称+海拔+介绍」卡片（已解锁关联知识则直接开知识卡）；登顶总结新增跨类型「下一站」推荐。
- **闭环**：首页分类 → 图鉴筛选 → 详情 → 收藏（本地存储，可注入测试）→ 沉浸探索 → 登顶 → 下一站 → 新详情。
- **质量**：测试 131 → 196（数据完整性/搜索/收藏/页面逻辑/途经点）；新增 **WXML↔TS 绑定一致性静态检查**（8 页面 + 组件，防绑定丢失）；typecheck/build 全绿；清理 debug 代码；修复知识库 relatedPlaceIds 3 处重命名断链。

## 验证

- `npm run typecheck` ✓（严格模式）
- `npm run build` ✓（产物含新页面 `dist/miniprogram/pages/place`）
- `npm run test` ✓ 196/196
- ⚠️ 未见真机/开发者工具实测（本环境无 GUI），详见 OVERNIGHT_REPORT.md §7

## 风险与后续

- 低风险点与 Next Steps 见 `OVERNIGHT_REPORT.md`
- 建议合并前在微信开发者工具人工过一遍：首页 → 图鉴 → 详情 → 收藏 → Everest 全流程

---

## 本地分支状态

- 分支：`feat/geo-explorer-product-polish`（14 commits，领先 main）
- 推送命令（在本机凭据可用的终端执行）：

```bash
git push -u origin feat/geo-explorer-product-polish
gh pr create --base main --head feat/geo-explorer-product-polish \
  --title "feat: 世界图鉴层落地——49 个真实地点/详情/收藏/搜索 + Everest 途经点介绍卡 + 首页重设计" \
  --body-file PR_DESCRIPTION.md
```

（本开发环境无 GitHub 凭据，推送被阻塞：`could not read Username for 'https://github.com'`。所有提交已就绪，仅差 push。）
