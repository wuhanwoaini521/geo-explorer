# Knowledge Authoring Guide —— 知识库增补与维护标准

> 目标：防止知识库再次变成「无来源、薄内容、重复条目」的堆放场。
> 现状基线：41 条、来源 100%、A/B 级 12 条、跨世界图谱 93 边——新增时不得拉低这些数字。

---

## 1. 什么时候新增 Knowledge

**只有**满足全部条件才新增：

- 覆盖矩阵（`npm run quality:report` → world-coverage-report.md）出现 **MISSING 或 PARTIAL** 缺口，且无法通过扩展现有条目解决；
- 有明确教育价值，且与至少 1 个 Place / Waypoint / 世界主题相关；
- 能提供至少 1 条**实际访问核验过**的来源；
- 不是现有条目的改写（先全文搜索关键词，k01–k41 每条都读一遍再决定）。

**优先扩展，而不是新增**：同一机制在不同世界的表现（如「板块运动」在珠峰=碰撞、马里亚纳=俯冲、富士=火山弧）→ 一条核心知识 + 各世界场景节点各自展开，**不要**每世界复制一条。

## 2. 什么时候扩展旧条目

- 主题相同但缺少「为什么 / 在哪里观察到」；
- 数值过时（如 k11 曾停在约 11,000 m，后对齐 10,935 ± 6 m）;
- 内容 <60 字（tests/overnight-hardening 会拦）；
- 扩展时补：机制（why）→ 典型地点（where）→ 探索中的观察点（observe）。

## 3. Source 标准

| 等级 | 来源 | 用法 |
| --- | --- | --- |
| A | NOAA / NPS / USGS / NSIDC / 政府机构 | 关键科学知识首选 |
| B | 大学 / 研究机构（东大 ERI、静冈大学）/ 带 DOI 论文 | 关键科学知识 |
| C | 权威百科 / 专业组织 | 通识类可接受 |
| D | Wikipedia | 兜底；必须 `approximate: true` |

- **每个 URL 必须实际访问**：确认页面存在、内容支持对应事实。本环境 Wikipedia 主站不可达时，用 `api.wikimedia.org/core/v1/wikipedia/en/page/<title>` 同页镜像核验，URL 仍写标准地址。
- `verifiedAt` 写真实核验日期；近似值标 `approximate`；跨源冲突写「约 / 公开资料」，不拍脑袋定值。
- 来源要与**具体数字**匹配：来源只证明海沟存在 ≠ 证明 10,935 m。

## 4. 内容长度与结构

- `content` 60–200 字：一句话定义 + 机制（为什么）+ 典型地点或观察点；
- `summary` 是卡片第一层，不要与 content 首句完全重复；
- 禁 AI 套话（令人惊叹/鬼斧神工/叹为观止/神秘莫测…——tests/overnight-hardening 扫全库）；
- 语言：具体、科学、可观察、有因果。

## 5. 关联字段

- `relatedPlaceIds`：至少 1 个（通识条目可仅 `relatedLandformIds`，但记录 P2 债务）；
- `relatedKnowledgeIds`：图谱边，**单向声明**（小 id 声明即可），不自引用、只指向存在的 id；
- `mediaIds`：只允许填 runtime 资产 id（MediaRegistry approved）；候选期写入 `knowledge-media-plan.md`，**不要**拿 candidate id 冒充；
- `reviewStatus: "approved"`：新内容来源核验后标注。

## 6. Quiz 标准

- 答案必须能从**本条 content 或场景节点内容**推出（tests/overnight-hardening 的可溯性扫描）；
- 优先考理解/因果/观察/对比；少考无上下文的精确数字；
- 选项互相排斥、只有一个正确；干扰项合理但不荒谬；
- 与既有题（全局 + 四世界随堂）题面无 ≥10 字重复。

## 7. Media 标准

- 见 `design/content/media-review/knowledge-media-plan.md`（每条的应有形态）；
- 教育优先：机制类 → diagram/scientific；现象类 → photograph；历史类 → historical photograph（可低清）；
- 候选先入 `candidates.ts`（sourceUrl 必填、license 未核留空），经评审板签核后走 optimize → manifest → mediaIds。

## 8. 提交前自检

```
npm run content:validate   # 0 error
npm run quality:report     # 看覆盖矩阵与图谱指标是否被拉低
npm test                   # overnight-hardening 全绿
```
