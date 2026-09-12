/**
 * content:report —— 知识与媒体覆盖指标自动生成（数字全部由代码计算，不手写）。
 *
 * 输出 design/content/final/metrics-report.json + stdout 摘要：
 *   - Knowledge：total / with source / without / A-B quality / with media / linked place / linked world / quiz
 *   - Media：候选总数（按 world × status）、waypoint primary 覆盖、place hero 覆盖
 *
 * 运行：npx tsx scripts/content/report.mjs
 */
import { writeFileSync } from "node:fs";
import { EXPLORATIONS } from "../../miniprogram/data/explorations/index";
import { KNOWLEDGE } from "../../miniprogram/data/knowledge";
import { QUIZZES } from "../../miniprogram/data/quizzes";
import { PLACES } from "../../miniprogram/data/places";
import { MEDIA_CANDIDATES } from "../../miniprogram/data/media/candidates";

/* ---------------- Knowledge metrics ---------------- */

const A_B_RE = /NOAA|NPS\b|USGS|NSIDC|\.gov|静冈大学|东京大学|avalanche\.org|Ifremer|Nature|Scientific Reports/i;

function knowledgeMetrics() {
  const linkedWorlds = new Map<string, Set<string>>();
  const worldIds = new Set(EXPLORATIONS.map((e) => e.id));
  for (const ex of EXPLORATIONS) {
    for (const w of ex.route?.waypoints ?? []) {
      for (const kid of w.knowledgeIds ?? []) {
        if (!linkedWorlds.has(kid)) linkedWorlds.set(kid, new Set());
        linkedWorlds.get(kid)!.add(ex.id);
      }
    }
  }
  const quizTopicIds = new Set(QUIZZES.map((q) => q.id));
  const perWorld: Record<string, number> = {};
  for (const ex of EXPLORATIONS) {
    perWorld[ex.id] = KNOWLEDGE.filter((k) =>
      k.relatedPlaceIds.some((pid) =>
        PLACES.find((p) => p.id === pid)?.explorationId === ex.id),
    ).length;
  }
  return {
    total: KNOWLEDGE.length,
    withSource: KNOWLEDGE.filter((k) => (k.sources?.length ?? 0) > 0).length,
    withoutSource: KNOWLEDGE.filter((k) => !(k.sources?.length)).length,
    abQualitySourced: KNOWLEDGE.filter((k) =>
      (k.sources ?? []).some((s) =>
        /NOAA|NPS|USGS|NSIDC|\.gov|静冈大学|东京大学|avalanche\.org|Ifremer/.test(s.name)),
    ).length,
    withMedia: KNOWLEDGE.filter((k) => (k.mediaIds?.length ?? 0) > 0).length,
    linkedToPlace: KNOWLEDGE.filter((k) => k.relatedPlaceIds.length > 0).length,
    linkedToWorld: KNOWLEDGE.filter((k) => {
      for (const pid of k.relatedPlaceIds) {
        if (worldIds.has(PLACES.find((p) => p.id === pid)?.explorationId ?? "")) return true;
      }
      return false;
    }).length,
    perWorld,
  };
}

/* ---------------- Media metrics（候选层面） ---------------- */
import { MEDIA_CANDIDATES } from "../../miniprogram/data/media/candidates";

function candidateWorld(c: (typeof MEDIA_CANDIDATES)[number]): string {
  const w = c.tags.find((t) =>
    ["everest", "mariana", "fuji", "colorado"].includes(t),
  );
  return w ?? "shared";
}

function mediaMetrics() {
  const perWorld: Record<
    string,
    { candidates: number; waypointPrimary: number; knowledge: number; placeHero: number }
  > = {};
  for (const c of MEDIA_CANDIDATES) {
    const w = candidateWorld(c);
    perWorld[w] ??= { candidates: 0, waypointPrimary: 0, knowledge: 0, placeHero: 0 };
    perWorld[w].candidates += 1;
    if (c.entityType === "waypoint" && c.purpose === "hero") perWorld[w].waypointPrimary += 1;
    if (c.entityType === "knowledge") perWorld[w].knowledge += 1;
    if (c.entityType === "place" && c.purpose === "hero") perWorld[w].placeHero += 1;
  }
  const waypointCoverage: Array<{
    world: string; waypointId: string; primaryCandidate: string | null; kind: string | null;
  }> = [];
  for (const ex of EXPLORATIONS) {
    for (const w of ex.route?.waypoints ?? []) {
      const primary = MEDIA_CANDIDATES.find(
        (c) => c.entityType === "waypoint" && c.entityId === w.id && c.purpose === "hero",
      );
      waypointCoverage.push({
        world: ex.id,
        waypointId: w.id,
        primaryCandidate: primary?.id ?? null,
        kind: primary?.kind ?? null,
      });
    }
  }
  const placeHero = PLACES.filter((p) => p.explorationId).map((p) => ({
    place: p.id,
    heroCandidate: MEDIA_CANDIDATES.find(
      (c) => c.entityType === "place" && c.entityId === p.id && c.purpose === "hero",
    )?.id ?? null,
  }));
  return {
    totalCandidates: MEDIA_CANDIDATES.length,
    perWorld,
    waypointPrimaryCoverage: waypointCoverage,
    placeHero: placeHeroCandidates(placeHero),
  };
}

function placeHeroCandidates(list: Array<{ place: string; heroCandidate: string | null }>) {
  return list;
}

const report = {
  generatedAt: new Date().toISOString().slice(0, 10),
  knowledge: knowledgeMetrics(),
  media: mediaMetrics(),
  quiz: {
    globalQuizzes: QUIZZES.length,
    sceneQuizNodes: EXPLORATIONS.flatMap((e) => e.knowledgeNodes.filter((n) => n.quiz)).length,
  },
};

writeFileSync(
  new URL("../../design/content/final/metrics-report.json", import.meta.url),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report.knowledge));
console.log(JSON.stringify(report.media.perWorld));
console.log(`quiz: global ${report.quiz.globalQuizzes} / scene ${report.quiz.sceneQuizNodes}`);
