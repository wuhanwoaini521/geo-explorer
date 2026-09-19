import type { RouteMilestoneSample } from "../../types/expedition";
import type { ExplorationRouteWaypoint } from "../../types/exploration";

export type JourneyView = "overview" | "focus";

/** A presentation projection of the canonical route; never a second progress store. */
export function journeyAt(
  milestones: RouteMilestoneSample[],
  content: Map<string, ExplorationRouteWaypoint>,
  progress: number,
  view: JourneyView,
  world: string,
) {
  const p = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
  const index = Math.max(0, milestones.filter(m => m.progress <= p + 1e-6).length - 1);
  const current = milestones[index];
  const next = milestones[index + 1];
  const local = next && current ? Math.max(0, Math.min(1, (p-current.progress)/(next.progress-current.progress))) : 0;
  const position = index + local;
  const last = Math.max(1, milestones.length-1);
  const point = current ? content.get(current.id) : undefined;
  const ocean = world === "mariana";
  const canyon = world === "colorado";
  const nodes = milestones.map((m,i) => ({
    id:m.id, name:content.get(m.id)?.shortName || m.name,
    fullName:m.name, number:String(i+1).padStart(2,"0"),
    value:Math.round(canyon ? (content.get(m.id)?.altitude ?? m.refM) : m.refM).toLocaleString("en-US"),
    state:i===index?"current":i<index?"completed":"upcoming",
    top:view==="overview" ? 8 + i/last*84 : 48 + (i-position)*37,
    visible:view==="overview" || Math.abs(i-position)<1.35,
  }));
  return {
    nodes, currentId:current?.id || "", currentName:current?.name || "",
    nextName:next?.name || "旅程完成", index:index+1, count:milestones.length,
    reached:index+1, complete:p>=1, segmentPercent:Math.round(local*100),
    markerTop:view==="overview"?8+position/last*84:48,
    overallPercent:Math.round(p*100),
    stripPercent:Math.round(position/last*1000)/10,
    observation:point?.whatToNotice || point?.desc || "沿路线观察环境的变化。",
    nextPreview:next ? content.get(next.id)?.desc || "下一处发现正在前方。" : "回看沿途发现，或把这次探索留在你的记录里。",
    nextDepth:next ? next.refM : current?.refM ?? 0,
    axisLabel:ocean?"深度":canyon?"海拔":"海拔",
    movement:ocean?"下潜":canyon?"下降":"攀登",
    sceneLabel:ocean?"垂直下潜":canyon?"峡谷地层之旅":"珠峰南坡路线",
    scaleLabel:ocean?"水层与路线示意 · 非等比":canyon?"路线与地层示意 · 非导航":"照片观察路线 · 非导航",
  };
}

export type JourneyState = ReturnType<typeof journeyAt>;
