/**
 * world-coverage-report —— 世界 × 主题覆盖矩阵 + waypoint 知识密度（代码计算）。
 * 由 scripts/content/report.ts 汇总输出；本文件只导出计算函数。
 */
import { EXPLORATIONS } from "../../miniprogram/data/explorations/index";
import { KNOWLEDGE } from "../../miniprogram/data/knowledge";
import { PLACES } from "../../miniprogram/data/places";

export type Coverage = "COVERED" | "PARTIAL" | "MISSING" | "NOT_APPLICABLE";

/** 知识 → 世界关联（经 relatedPlaceIds.explorationId） */
export function knowledgeWorlds(k: (typeof KNOWLEDGE)[number]): Set<string> {
  const out = new Set<string>();
  for (const pid of k.relatedPlaceIds) {
    const ex = PLACES.find((p) => p.id === pid)?.explorationId;
    if (ex) out.add(ex);
  }
  return out;
}

/** 世界 × 主题 → 支撑知识（全局知识 + 场景节点 + waypoint 结构化字段三路扫描） */
export function themeCoverage(): Record<
  string,
  Record<string, { status: Coverage; support: string[] }>
> {
  const THEMES = [
    "formation",
    "geology",
    "environment",
    "climate",
    "phenomena",
    "ecology",
    "human",
    "measurement",
    "risk",
  ] as const;
  // 主题 → 关键词（不限类目；类目错置不应导致漏报）
  const THEME_RULES: Record<string, RegExp> = {
    formation: /形成|板块|碰撞|造山|抬升|俯冲|成山|喷发|堆积|破火山口|火口|叠|四期|下切|切出/,
    geology: /岩|地层|火口|冰川|断层|剖面|变质|海沟|俯冲|石灰岩|砂岩|页岩|片岩|火山渣|地质/,
    environment: /环境|水温|光照|海雪|压力|层带|分带|林线|逆温|温度|含氧|气温|水压|缺氧|云海|风/,
    climate: /气候|雪线|季风|洋流|直减率|温差|降水|干旱|雨影|高温|寒冷|气温|℃/,
    phenomena: /雪崩|喷发|砂|休止|发光|潮汐|不整合|崩塌|冰塔|崩|旗云|海雾|暴涨|洪水|大砂/,
    ecology: /生态|生物|植被|海豹|神鹫|发光|湿地|林线|树线|端足类|狮子鱼|浮游|珊瑚/,
    human: /登顶|攀登|探险|下潜|登山|遗产|文化|御来光|鲍威尔|首漂|山小屋|合目|潜水器|科考/,
    measurement: /测量|高程|测深|深度|年代|记录|勘测|10,935|8,848|8848|3,776|2021|2020|压力反演|中尼/,
    risk: /危险|死亡|雪崩|缺氧|失温|中毒|压力|风险|高原反应|滑坠|落石|中暑|脱水|热衰竭|极端高温|冰冷|冻|裂隙/,
  };
  const out: Record<string, Record<string, { status: Coverage; support: string[] }>> = {};
  for (const ex of EXPLORATIONS) {
    out[ex.id] = {};
    for (const theme of THEMES) {
      const rule = THEME_RULES[theme];
      const support: string[] = [];
      // (a) 全局知识（关联到该世界）
      for (const k of KNOWLEDGE) {
        if (!knowledgeWorlds(k).has(ex.id)) continue;
        if (rule.test(k.title + k.content)) support.push(k.id);
      }
      // (b) 场景知识节点
      for (const n of ex.knowledgeNodes) {
        if (rule.test(n.title + n.summary + n.detail.slice(0, 120))) support.push(`${ex.id}:${n.id}`);
      }
      // (c) waypoint 结构化字段（risk/environment/history 直接对应主题）
      for (const w of ex.route?.waypoints ?? []) {
        if (theme === "risk" && w.risk && rule.test(w.risk)) support.push(`${ex.id}:${w.id}@risk`);
        if (theme === "environment" && w.environment && rule.test(w.environment))
          support.push(`${ex.id}:${w.id}@env`);
        if (theme === "human" && w.history && rule.test(w.history)) support.push(`${ex.id}:${w.id}@hist`);
        if (theme === "formation" && (w.terrain ?? "") && /火山|冰川|冰瀑|灰岩|砂岩|页岩|片岩|砂/.test(w.terrain ?? ""))
          support.push(`${ex.id}:${w.id}@terrain`);
      }
      const sceneN = support.filter((s) => s.includes(":")).length;
      const globalN = support.length - sceneN;
      // 声明式 N/A：深海世界无「气候」主题（天气概念不适用于水柱环境）
      const NOT_APPLICABLE: Record<string, string[]> = { mariana: ["climate"] };
      let status: Coverage;
      if ((NOT_APPLICABLE[ex.id] ?? []).includes(theme)) {
        status = "NOT_APPLICABLE";
      } else if (sceneN >= 2 || (sceneN >= 1 && globalN >= 1) || globalN >= 3) {
        status = "COVERED";
      } else if (sceneN === 1 || globalN >= 1) {
        status = "PARTIAL";
      } else {
        status = "MISSING";
      }
      out[ex.id][theme] = { status, support };
    }
  }
  return out;
}

/** Waypoint 知识密度（0/1/2/3+ 与明细） */
export function knowledgeDensity(): {
  histogram: Record<string, number>;
  zero: string[];
  perWaypoint: Array<{ world: string; waypoint: string; links: number }>;
} {
  const histogram: Record<string, number> = { "0": 0, "1": 0, "2": 0, "3+": 0 };
  const zero: string[] = [];
  const perWaypoint: Array<{ world: string; waypoint: string; links: number }> = [];
  for (const ex of EXPLORATIONS) {
    for (const w of ex.route?.waypoints ?? []) {
      const uniq = new Set([...(w.knowledgeIds ?? []), ...(w.knowledgeId ? [w.knowledgeId] : [])]).size;
      const key = uniq >= 3 ? "3+" : String(uniq);
      histogram[key] = (histogram[key] ?? 0) + 1;
      perWaypoint.push({ world: ex.id, waypoint: w.id, links: uniq });
      if (uniq === 0) zero.push(`${ex.id}/${w.id}`);
    }
  }
  return { histogram, zero, perWaypoint };
}
