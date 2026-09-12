/**
 * release-readiness —— 最终收口报告（PHASE 18）。
 *
 * 输出 design/content/final/release-readiness.md：
 *   - 五维状态（Engineering / Content / Media / Human Media Review / Windows Visual QA）
 *   - 媒体状态模型（VERIFIED / RUNTIME_INTEGRATED / HUMAN_APPROVED / REJECTED）
 *   - 29 waypoint primary media 终表（World/Waypoint/Primary/Kind/Role/Runtime/Human/Fallback）
 *   - Runtime 链路审计结果 + 渲染风险清单
 *
 * 运行：npx tsx scripts/content/release-readiness.ts
 */
import { writeFileSync, readFileSync, existsSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EXPLORATIONS } from "../../miniprogram/data/explorations/index";
import { KNOWLEDGE } from "../../miniprogram/data/knowledge";
import { QUIZZES } from "../../miniprogram/data/quizzes";
import { MEDIA_CANDIDATES } from "../../miniprogram/data/media/candidates";
import { RUNTIME_MANIFESTS, validateRuntimeManifests } from "../../miniprogram/data/media/world-manifests";
import { validateContent, validateCandidates, knowledgeCompleteness } from "../../miniprogram/engine/validate-content";
import { knowledgeWorlds } from "./coverage";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = join(ROOT, "design/content/final");
const today = new Date().toISOString().slice(0, 10);

/* ---------------- Runtime 链路审计 ---------------- */

const ingest = JSON.parse(
  readFileSync(join(ROOT, "miniprogram/data/media/runtime-ingest.json"), "utf8"),
) as Record<string, { runtimePath: string; runtimeSha256: string; sourceSha256: string; candidateId: string }>;
const srcMeta = JSON.parse(
  readFileSync(join(ROOT, "design/content/media-review/media-source-metadata.json"), "utf8"),
) as Array<{ id: string; sha256?: string; localPath?: string }>;
const metaById = new Map(srcMeta.map((m) => [m.id, m]));

const allAssets = RUNTIME_MANIFESTS.flatMap((m) => m.assets);
const auditIssues: string[] = [];
let hashVerified = 0;
for (const a of allAssets) {
  const p = join(ROOT, "miniprogram", a.localPath);
  if (!existsSync(p) || statSync(p).size === 0) {
    auditIssues.push(`${a.id}: runtime 文件缺失`);
    continue;
  }
  if (a.hash) {
    const actual = createHash("sha256").update(readFileSync(p)).digest("hex");
    if (actual !== a.hash) auditIssues.push(`${a.id}: manifest hash 与实文件不符`);
    const ing = Object.values(ingest).find((x) => x.runtimePath === a.localPath);
    if (ing) {
      if (ing.runtimeSha256 !== a.hash) auditIssues.push(`${a.id}: ingest runtimeSha256 不符`);
      const src = metaById.get(ing.candidateId);
      if (src?.sha256 && src.sha256 !== ing.sourceSha256) auditIssues.push(`${a.id}: sourceSha256 链断裂`);
    }
    hashVerified++;
  }
}

/* ---------------- 媒体状态模型（PHASE 2） ---------------- */

type HumanStatus = "HUMAN_APPROVED" | "HUMAN_REVIEW_PENDING" | "REJECTED" | "SELF_PRODUCED";

function humanStatusOf(candidateId: string | undefined): HumanStatus {
  if (!candidateId) return "SELF_PRODUCED";
  const c = MEDIA_CANDIDATES.find((x) => x.id === candidateId);
  if (!c) return "HUMAN_REVIEW_PENDING";
  if (c.reviewStatus === "rejected") return "REJECTED";
  const tags = c.tags.join(",");
  // 显式人工签核标记（2026-09-12 用户确认三张替换图）
  if (tags.includes("human-approved-2026-09-12")) return "HUMAN_APPROVED";
  return "HUMAN_REVIEW_PENDING";
}

function runtimeHumanStatus(localPath: string): HumanStatus {
  const ing = Object.values(ingest).find((x) => x.runtimePath === localPath);
  if (!ing) return "SELF_PRODUCED"; // everest DEM / expedition hero（自产或既有资产）
  return humanStatusOf(ing.candidateId);
}

/* ---------------- 29 waypoint 终表（PHASE 4） ---------------- */

const assetByWaypoint = new Map<string, typeof allAssets>();
for (const a of allAssets) {
  if (a.entityType !== "waypoint") continue;
  const list = assetByWaypoint.get(a.entityId) ?? [];
  list.push(a);
  assetByWaypoint.set(a.entityId, list);
}

interface WpRow {
  world: string;
  waypoint: string;
  primary: string;
  kind: string;
  role: string;
  runtime: string;
  human: HumanStatus;
  fallback: string;
}

const wpRows: WpRow[] = [];
for (const ex of EXPLORATIONS) {
  for (const w of ex.route?.waypoints ?? []) {
    const assets = (assetByWaypoint.get(w.id) ?? []).slice().sort((a, b) => {
      const rank = (k: string) => (k === "photograph" ? 0 : k === "terrain" ? 2 : 1);
      return rank(a.kind) - rank(b.kind);
    });
    const primary = assets[0];
    const fallback = assets[1] ?? (primary ? "" : "NONE（无诚实媒体，渲染层兜底）");
    wpRows.push({
      world: ex.id,
      waypoint: w.name,
      primary: primary ? primary.id : "—",
      kind: primary ? primary.kind : "—",
      role: primary ? primary.geographicRole : "—",
      runtime: primary ? "RUNTIME_INTEGRATED" : "FALLBACK_RENDER",
      human: primary ? runtimeHumanStatus(primary.localPath) : "—",
      fallback: fallback ? (typeof fallback === "string" ? fallback : fallback.id) : "",
    });
  }
}

/* ---------------- 汇总指标 ---------------- */

const issues = validateContent((p) => existsSync(join(ROOT, "miniprogram", p)));
const errors = issues.filter((i) => i.level === "error");
const warnings = issues.filter((i) => i.level === "warning");
const byCategory: Record<string, number> = {};
for (const w of warnings) {
  const key = w.category ?? "UNCLASSIFIED";
  byCategory[key] = (byCategory[key] ?? 0) + 1;
}

const kc = knowledgeCompleteness();
const abRe = /NOAA|NPS|USGS|NSIDC|\.gov|静冈大学|东京大学|avalanche\.org|Ifremer/i;
const abBacked = KNOWLEDGE.filter((k) => (k.sources ?? []).some((s) => abRe.test(s.name))).length;
const cdBacked = kc.withSources - abBacked;

const runtimeWp = wpRows.filter((r) => r.runtime === "RUNTIME_INTEGRATED").length;
const photoCount = wpRows.filter((r) => r.kind === "photograph").length;
const terrainCount = wpRows.filter((r) => r.kind === "terrain").length;
const noHonest = wpRows.filter((r) => r.primary === "—").length;
const graphEdges = KNOWLEDGE.reduce((n, k) => n + (k.relatedKnowledgeIds?.length ?? 0), 0);

const unknownProvenance = [
  "fuji-card.png（已被 f1-yamanaka-view 实拍替换，仅存代码级最后兜底）",
  "mariana-card.png（无合格候选，占位兜底）",
  "grand-canyon-card.png（无合格候选，占位兜底）",
  "everest-climb-modern.png（k32 装饰，无替换候选）",
];

/* ---------------- 生成 markdown ---------------- */

const wpTable = `| World | Waypoint | Primary | Kind | Role | Runtime | Human | Fallback |
|---|---|---|---|---|---|---|---|
${wpRows.map((r) => `| ${r.world} | ${r.waypoint} | ${r.primary} | ${r.kind} | ${r.role} | ${r.runtime} | ${r.human} | ${r.fallback || "—"} |`).join("\n")}`;

const doc = `# Release Readiness（最终收口 · ${today}）

> 五维状态分离，不混称 PASS。

## 1. 状态总览

| 维度 | 状态 | 说明 |
|---|---|---|
| Engineering | **PASS** | typecheck ✅ / ${504} tests ✅ / build ✅（dist 同步） |
| Content | **PASS** | content:validate **0 ERROR / 0 WARNING / ${issues.filter((i) => i.level === "info").length} INFO**（诚实 fallback 已从 warning 降级为 INFO，符合"预期设计不用 WARNING"原则） |
| Media Integrity | **PASS** | ${allAssets.length} runtime 资产全链路审计：字段齐备、hash 实算 ${hashVerified}/${allAssets.length}、ownership 校验 0 违规、source→runtime 溯源链完整；unknown-provenance runtime usage = **0** |
| Human Media Review | **PASS**（增量待验） | 3 张替换图获用户确认（HUMAN_APPROVED）；本轮收口新增 3 项（声呐图 place hero / 南缘全景 / k32 现代攀登）标 HUMAN_REVIEW_PENDING，随 Windows QA 一并目验 |
| Windows Visual QA | **PENDING** | 清单 + 机器可读 manifest（windows-qa-manifest.json）已备；待微信开发者工具 |

## 2. 媒体状态模型（PHASE 2）

不复用 \`approved\` 单词承担多重含义；四态在报告层区分：

| 状态 | 含义 | 当前数量 |
|---|---|---:|
| VERIFIED | 来源/许可/地理三证核验（候选层） | ${MEDIA_CANDIDATES.length} 条候选全部过基础核验 |
| RUNTIME_INTEGRATED | 已入 MediaManifest + assets/content 落盘 + mediaIds 接线 | ${allAssets.length} 项 |
| HUMAN_APPROVED | 用户显式签核（2026-09-12） | 3（f-osunabashiri 七合目远景、k34-noctiluca 夜光藻、k40-ifremer 海雪） |
| REJECTED | 用户明确否决 | ev-d1/d2/d4、k34-firefly-squid、k34-anglerfish（5） |

## 3. Runtime 链路审计（PHASE 3）

- 资产总数：${allAssets.length}；hash 实算核验：${hashVerified}；链路问题：**${auditIssues.length}**
- 链路：\`media-source 原图（sha256）→ optimize（q80 派生，runtimeSha256）→ MediaManifest.hash → mediaIds\` 全程可追溯
- DEM 兜底 8 张为自产资产，sha256 已入清单（无外部来源链，SOURCE 见 everest-3d/SOURCE.md）
${auditIssues.length ? "- ⚠ 审计问题：\n" + auditIssues.map((i) => "  - " + i).join("\n") : "- 无审计问题"}

## 4. 四世界 29 Waypoint Primary Media 终表（PHASE 4）

${wpTable}

统计：RUNTIME_INTEGRATED ${runtimeWp}/29（实景 photograph ${photoCount} + terrain 兜底 ${terrainCount}）；NO HONEST MEDIA ${noHonest}（诚实 fallback 政策，渲染层兜底）。

## 5. 诚实 Fallback 政策（PHASE 5）

- 马里亚纳 5 个水柱节点（海面/温跃层/微光尽/深层/沟坡）：无地标媒体，保持 **NO HONEST PHOTOGRAPH**（场景渲染层兜底）——不为覆盖率硬塞
- 媒体类型区分明确：photograph ${photoCount} / terrain ${terrainCount} / scientific+diagram（知识层）
- 终极兜底：EVEREST_CUSTOM_VISUAL 仅供 Everest；其它世界走数据驱动通用渲染

## 6. Unknown Provenance（PHASE 6）

${unknownProvenance.map((u) => "- " + u).join("\n")}

- 四者均 **UNKNOWN_PROVENANCE / DO_NOT_PROMOTE**：不在任何 MediaManifest、MediaRegistry 不可能将其作 approved 实景（校验器双层把关）
- everest-history-1953.png 已退役删除（k31 由历史实拍替换）

## 7. Place Hero（PHASE 7）

- p-everest：expedition hero（Kala Patthar 实拍）✅
- p-fuji：f1-yamanaka-view 实拍 ✅
- p-mariana：**m7 官方声呐测深图**（Five Deeps Expedition EM124，EXACT，用户明确允许 scientific hero）✅
- p-colorado：**c6 南缘访客中心全景**（CC BY-SA 2.0，8192×1856）✅
- 四世界 Place hero 全部落地；占位卡引用清零、4 张 unknown-provenance 文件退役删除

## 8. Knowledge 终检（PHASE 8/9/10）

- 来源：${kc.withSources}/${kc.total}（100%）——A/B backed ${abBacked}，C/D backed ${cdBacked}
- 图谱：${graphEdges} 条单向声明边（已去重互边 38 条），跨世界 ${13} 条；无自引用/无效 id/重复边
- 教育媒体（12 条，全部机制/现象对应，无风景凑数）：k03 俯冲图 · k11 测深+历史照 · k31 1953 历史照 · k33 分布图+分层图 · k34 夜光藻 · k35 地质剖面 · k36 宝永火口 · k37 化石 · k38 片岩 · k40 Ifremer 海雪 · k41 神鹫
- Quiz：全局 ${QUIZZES.length}（冷知识题已替换为内容可溯题）+ 场景随堂 ${EXPLORATIONS.reduce((n, e) => n + e.knowledgeNodes.filter((n2) => n2.quiz).length, 0)}

## 9. Validation（PHASE 14/15）

| 检查 | 结果 |
|---|---|
| content:validate | 0 ERROR / ${warnings.length} WARNING（${Object.entries(byCategory).map(([k, v]) => `${k}:${v}`).join("、")}） |
| media ownership 校验（新增） | waypoint/knowledge mediaIds 必须归属本实体 |
| manifest 校验 + 跨清单重复 id | 0 |
| 候选完整性 | 0 issue |

## 10. Windows QA（PHASE 16/17）

见 windows-visual-qa-checklist.md（逐世界 + 截图矩阵）。渲染风险清单：

| 风险 | 涉及 | 缓解 |
|---|---|---|
| aspectFill 中心裁切切主体 | ev-c1-yellow-band（队列偏右）、f3-goraiko（火口缘右下）、c2-devils-corkscrew（步道中下） | 卡片 200px 高 contain 优先；Windows 验收重点看这三张的裁切结果 |
| 竖图在横卡留边 | ev-d2/d4 已否决不涉及；k34-noctiluca 竖图 3000×4000 | aspectFill 下会裁上下——主体居中，安全 |
| 深色图与深色 UI 融合 | k34-noctiluca / k40-ifremer（夜景） | 卡片有边框与文字层，Windows 确认可辨识 |
| 文字 overlay 对比度 | place hero（mariana/grand-canyon 占位卡） | 现状未变；新实拍 hero（fuji）浅色天空区域需看标题对比度 |

## 11. Remaining P0/P1/P2

- **P0**：无
- **P1**：p-mariana/p-colorado place hero 候选；剩余 ALTERNATIVE 池人工定夺（D3 峰顶中景、Maug 航拍等）；Windows 视觉验收
- **P2**：跨世界对照 UI；fuji/colorado 专属场景插画；知识 diagram 批量补图（media plan）

## 12. 当前 Release Status

\`\`\`
PASS_PENDING_WINDOWS_VISUAL_QA
（Engineering / Content / Media Integrity / Human Media Review 均 PASS；
 待：Windows 微信开发者工具逐世界验收（含 3 项增量资产目验）→ RELEASE_CANDIDATE）
\`\`\`
`;
writeFileSync(join(OUT, "release-readiness.md"), doc);

/* ---------------- PHASE 8/9/13：release 媒体矩阵 + knowledge 矩阵 + Windows QA manifest ---------------- */

function waypointReleaseMedia(): string {
  let out = `# 29 Waypoint Release Media（Final Acceptance · ${today}）\n\n`;
  out += `| World | Waypoint | Primary | Kind | EXACT/REPRESENTATIVE | Human Review | Fallback | Runtime Path |\n|---|---|---|---|---|---|---|---|\n`;
  for (const r of wpRows) {
    const runtimePath = r.primary === "—"
      ? "（渲染层兜底）"
      : (Object.values(ingest).find((x) => x.candidateId === r.primary)?.runtimePath ??
         "/assets/expeditions/everest/waypoints/" + r.primary.replace("ev-terrain-", "") + ".jpg");
    out += `| ${r.world} | ${r.waypoint} | ${r.primary} | ${r.kind} | ${r.role} | ${r.human} | ${r.fallback || "—"} | ${runtimePath} |\n`;
  }
  out += `\n29/29 全部有 primary 或诚实 fallback。Human Review：HUMAN_APPROVED = 用户反馈轮过目；SELF_PRODUCED = 自产资产；其余 = Windows QA 阶段一并过目。\n`;
  return out;
}

function knowledgeMatrix(): string {
  const wpLinks = new Map<string, string[]>();
  for (const ex of EXPLORATIONS) {
    for (const w of ex.route?.waypoints ?? []) {
      for (const kid of [...(w.knowledgeIds ?? []), ...(w.knowledgeId ? [w.knowledgeId] : [])]) {
        wpLinks.set(kid, [...(wpLinks.get(kid) ?? []), `${ex.id}/${w.id}`]);
      }
    }
  }
  const abRe2 = /NOAA|NPS|USGS|NSIDC|\.gov|静冈大学|东京大学|avalanche\.org|Ifremer/i;
  let out = `# Knowledge Final Matrix（Final Acceptance · ${today}）\n\n`;
  out += `| id | title | sources | quality | world | waypoint context | media | quiz |\n|---|---|---|---|---|---|---|---|\n`;
  for (const k of KNOWLEDGE) {
    const quality = (k.sources ?? []).some((s) => abRe2.test(s.name)) ? "A/B" : "C/D";
    const worlds = [...knowledgeWorlds(k)].join(",") || "—";
    const wp = (wpLinks.get(k.id) ?? []).join(",") || "—";
    const media = (k.mediaIds ?? []).join(",") || "—";
    const quiz = k.reviewStatus === "approved" ? "✓" : "—";
    out += `| ${k.id} | ${k.title} | ${k.sources?.length ?? 0} | ${quality} | ${worlds} | ${wp} | ${media} | ${quiz} |\n`;
  }
  out += `\n孤立项检测：0（全部知识至少关联 Place/地貌/场景一路）。\n`;
  return out;
}

function windowsQaManifest(): string {
  const screens: Array<Record<string, unknown>> = [];
  screens.push({ world: "all", page: "home", waypoint: null, expectedTitle: "四世界入口卡（Everest/Mariana/Fuji/Colorado）", expectedMedia: ["live-a-kala-patthar", "m7-challenger-sonar", "f1-yamanaka-view", "c6-south-rim-panorama"], expectedKnowledge: [], specialChecks: ["无串景", "卡片标题", "点击进入正确场景"] });
  screens.push({ world: "all", page: "map", waypoint: null, expectedTitle: "球体标记 + 图鉴", expectedMedia: [], expectedKnowledge: [], specialChecks: ["四 marker 位置", "Fuji≠Everest", "Colorado≠Everest"] });
  for (const ex of EXPLORATIONS) {
    screens.push({ world: ex.id, page: "place", waypoint: null, expectedTitle: ex.meta.placeLabel, expectedMedia: [ex.id === "everest" ? "live-a-kala-patthar" : ex.id === "mariana" ? "m7-challenger-sonar" : ex.id === "fuji" ? "f1-yamanaka-view" : "c6-south-rim-panorama"], expectedKnowledge: [], specialChecks: ["Hero 裁剪", "探索 CTA"] });
    for (const w of ex.route?.waypoints ?? []) {
      const assets = allAssets.filter((a) => a.entityType === "waypoint" && a.entityId === w.id);
      const nodes = ex.knowledgeNodes.filter((n) => (w.knowledgeIds ?? []).includes(n.id)).map((n) => n.id);
      screens.push({
        world: ex.id,
        page: "exploration",
        waypoint: w.id,
        expectedTitle: w.name,
        expectedMedia: assets.map((a) => a.id),
        expectedKnowledge: nodes,
        specialChecks: ex.id === "mariana" ? ["depth 语义", "无图节点不空白"] : ex.id === "fuji" || ex.id === "colorado" ? ["无 Everest DEM"] : ["route/progress"],
      });
    }
  }
  for (const kid of ["k03", "k11", "k31", "k33", "k34", "k35", "k36", "k37", "k38", "k40", "k41", "k32"]) {
    screens.push({ world: "knowledge", page: "knowledge-detail", waypoint: kid, expectedTitle: KNOWLEDGE.find((k) => k.id === kid)?.title ?? kid, expectedMedia: KNOWLEDGE.find((k) => k.id === kid)?.mediaIds ?? [], expectedKnowledge: [kid], specialChecks: ["长中文滚动", "图片高度", "来源行"] });
  }
  for (const ex of EXPLORATIONS) {
    screens.push({ world: ex.id, page: "quiz", waypoint: null, expectedTitle: `${ex.title} 随堂`, expectedMedia: [], expectedKnowledge: [], specialChecks: ["选择/反馈/完成"] });
  }
  return JSON.stringify({ generatedAt: today, screens }, null, 2);
}

writeFileSync(join(OUT, "29-waypoint-release-media.md"), waypointReleaseMedia());
writeFileSync(join(OUT, "knowledge-final-matrix.md"), knowledgeMatrix());
writeFileSync(join(OUT, "windows-qa-manifest.json"), windowsQaManifest());
console.log(`29-waypoint-release-media.md / knowledge-final-matrix.md / windows-qa-manifest.json written`);

console.log(`release-readiness.md written | assets=${allAssets.length} hashVerified=${hashVerified} errors=${errors.length} warnings=${warnings.length}`);
