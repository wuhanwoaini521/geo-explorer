# World Authoring Guide —— 新增第五个世界的标准流程

> 适用：在 Geo Explorer 新增一个探索世界（如乞力马扎罗、死海、贝加尔湖）。
> 原则：数据驱动、引擎无场景分支、来源可溯、不复制其它世界内容。

---

## 1. Create Place（`miniprogram/data/places.ts`）

- 新增 Place 条目：`id`（`p-xxx`）、name/nameEn、type（用现有 PlaceType，不新增枚举）、坐标、`elevationM`（语义见 models.ts 注释：山=海拔、海沟=负深度、峡谷=谷底高程）、description/formation/facts（2-3 条真实冷知识）。
- `explorationId: "xxx"`（与 Exploration id 一致）。
- `sources`：至少 1 条实际访问核验过的来源（verifiedAt 写真实核验日期）。
- **DO NOT**：不编造高程小数；与 Exploration 数值必须一致（校验器 + tests/overnight-hardening 会抓）。

## 2. Create Exploration（`miniprogram/data/explorations/xxx.ts`）

- 参考 `fuji.ts`（火山/攀登类）或 `colorado.ts`（下切/谷深类）作为模板。
- 必填：id/slug/title/subtitle/meta/palette/ui/destination/metrics/stages/knowledgeNodes/route/source。
- **轴语义**：攀登类用 altitude（startElevation=起点海拔）；下潜/下切类用 depth 或谷深（startElevation=0，maxElevation=总深）。mariana 的 depth 语义有测试保护，别改错。
- `world.style`：只有 `mountain`（Everest 专属 DEM）与 `ocean` 有专属视觉层；新世界用自定义字符串（如 `"volcano"`），页面走通用世界——**禁止**给非珠峰场景声明 `mountain`（校验器 world-style-reserved 会报 ERROR）。
- `metrics`：每条必须带 source；曲线点位按轴升序；温度方向要与轴一致（攀登类递减、下切类递增）。
- `stages`：≥5 段，首段 elevation=startElevation，全段递增，palette/terrainTint/flora 齐全。

## 3. Create Route + Waypoints

- `route.waypoints` ≥7 个：id 唯一、progress 严格递增、首=0、末=1。
- 每个 waypoint：`desc`（ERROR 级必填）/ `detail` / `facts` / `environment` / `risk` / `history` / `whatToNotice` / `knowledgeIds` / `sources` / `reviewStatus: "approved"`。
- 攀登类填 `altitude`（真实参考海拔），下潜/下切类填 `depth`；两者互斥（mariana 测试强制）。
- `x/y` 画布百分比：路线在画面上从起点到终点大致连贯（y 递增或递减，别折返穿越）。

## 4. Link Knowledge（知识关联）

- 每个 waypoint 1–3 条知识（关键节点可 3+，**不要超过 4**——探索节奏）。
- `knowledgeIds` 可同时引用：场景知识节点 id + 全局知识库条目（`kXX`）。
- 场景 `knowledgeNodes` ≥7 条：每条带 summary/detail/facts/sources/quiz；末节点 elevation 必须 = maxElevation（终点解锁）；优先 `knowledgeId` 链回全局知识库。
- 新全局知识见 `design/content/knowledge/authoring-guide.md`。

## 5. Add Sources

- 场景级 `source` + 每个节点/waypoint 的 `sources`，等级优先 A/B（政府/科研机构）。
- 每条 URL **必须实际访问核验**：页面存在、内容支持对应事实、非首页/搜索页。
- 近似值标 `approximate: true`；verifiedAt 写真实核验日期，不伪造。

## 6. Add Quiz

- 场景节点随堂题：答案必须能从本节点内容 + 解析推出（tests/overnight-hardening 会扫）。
- 优先考理解/因果/观察，少考精确数字；与全局 QUIZZES 题面不得有 ≥10 字重复片段。
- 全局题（`data/quizzes.ts`）：category 必须在知识分类体系内。

## 7. Add Candidate Media

- 在 `miniprogram/data/media/candidates.ts` 登记（CandidateMediaAsset）：sourceUrl 必填、license 未确认留空、status 用 `review`。
- **运行时图（`runtimePath`）** 与候选 id 空间分离；晋升走第 8 步。
- Commons 检索用 API（`action=query&prop=imageinfo&iiprop=extmetadata|sha1`）核验许可与指纹，别凭文件名猜。

## 8. Media Runtime Ingest（可选，需人工签核）

```
python3 scripts/content/download-candidates.py   # 原图 → media-source/<world>/（gitignore）
npx tsx scripts/content/optimize-images.ts <id>  # → assets/content/<world>/<id>.jpg
# 在 world-manifests.ts 登记 approved MediaAsset（license/attribution/sourceUrl/hash 齐全）
# waypoint.mediaIds 关联 runtime 资产 id
npx tsx scripts/content/build-review-board.ts    # 更新评审板供人工复核
```

- 晋升四项 PASS：source / license / geography / visual（人工）。
- 候选保留记录并打 `promotedRuntimeId`（可追溯，测试会查）。

## 9. Validate

```
npm run content:validate   # 0 error 才算过；warning 是债务记录
npm run content:report     # 指标落盘 metrics-report.json
npm run quality:report     # 覆盖矩阵/图谱/来源/remaining-work 四份报告
```

## 10. Build & Register

- `data/explorations/index.ts` 注册新场景；`pages/home/index.ts` SCENE_CATALOG 加卡（image 用 `getPlaceHeroImage` 或既有占位）。
- `npm run typecheck && npm test && npm run build`——dist 由 build 生成，**禁止手改**。

## DO NOT（历史踩坑）

- ❌ 硬编码页面图片路径（用 MediaRegistry / getPlaceHeroImage）
- ❌ 假 source / 根据 URL 名猜内容 / 伪造 verifiedAt
- ❌ 使用 unknown provenance 媒体（fuji-card 等 4 张只允许作最后兜底，见 unknown-provenance-cleanup.md）
- ❌ 复制其它世界的 waypoint 文案（去重测试抓 ≥12 字重复片段）
- ❌ 为了指标灌水新增薄知识（扩展优先于新增）
- ❌ 手改 dist/
