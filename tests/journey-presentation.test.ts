import { describe, expect, it } from "vitest";
import { getExpeditionById } from "../miniprogram/data/expeditions/index";
import { journeyAt } from "../miniprogram/pkg-explore/presentation/journey-presentation";

describe("探索旅程投影", () => {
  it.each(["mariana", "everest", "colorado"])("%s 总览和局部共享真实站点与进度", world => {
    const ex = getExpeditionById(world)!;
    const milestones = ex.routeIndex.milestones;
    const content = new Map(ex.route!.waypoints.map(w => [w.id,w]));
    for (const m of milestones) {
      const whole = journeyAt(milestones,content,m.progress,"overview",world);
      const focus = journeyAt(milestones,content,m.progress,"focus",world);
      expect(whole.currentId).toBe(m.id);
      expect(focus.currentId).toBe(whole.currentId);
      expect(focus.overallPercent).toBe(whole.overallPercent);
      expect(focus.nodes.filter(n=>n.visible).length).toBeLessThanOrEqual(3);
      expect(whole.nodes.every(n=>n.visible && n.top>=8 && n.top<=92)).toBe(true);
      expect(focus.markerTop).toBe(48);
    }
  });
  it("连续推进保持探测器和站点相对位置，不按节点瞬移", () => {
    const ex=getExpeditionById("mariana")!;
    const [a,b] = ex.routeIndex.milestones;
    const content=new Map(ex.route!.waypoints.map(w=>[w.id,w]));
    const state=journeyAt(ex.routeIndex.milestones,content,(a.progress+b.progress)/2,"focus","mariana");
    expect(state.segmentPercent).toBe(50);
    expect(state.nodes[0].top).toBeLessThan(state.markerTop);
    expect(state.nodes[1].top).toBeGreaterThan(state.markerTop);
    expect(state.nextDepth).toBe(200);
    expect(state.complete).toBe(false);
  });
  it("大峡谷展示实际海拔，不能把下降量标成海拔", () => {
    const ex=getExpeditionById("colorado")!;
    const state=journeyAt(ex.routeIndex.milestones,new Map(ex.route!.waypoints.map(w=>[w.id,w])),1,"focus","colorado");
    expect(state.nodes[0].value).toBe("2,114");
    expect(state.nodes.at(-1)?.value).toBe("725");
    expect(state.complete).toBe(true);
    expect(state.canyonLayer?.name).toBe("内峡基底岩");
    expect(state.canyonLayer?.age).toContain("17–18 亿");
  });
});
