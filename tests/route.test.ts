import { describe, expect, it } from "vitest";
import { EVEREST } from "../miniprogram/data/explorations/everest";
import { MARIANA } from "../miniprogram/data/explorations/mariana";
import {
  currentRouteWaypoint,
  nextRouteWaypoint,
  routePositionAt,
} from "../miniprogram/utils/route";

describe("场景路线", () => {
  const route = EVEREST.route!;

  it("珠峰南坡路线有 6–8 个严格递进的途经点", () => {
    expect(route.waypoints.length).toBeGreaterThanOrEqual(6);
    expect(route.waypoints.length).toBeLessThanOrEqual(8);
    expect(route.waypoints[0].progress).toBe(0);
    expect(route.waypoints[route.waypoints.length - 1].progress).toBe(1);
    for (let index = 1; index < route.waypoints.length; index++) {
      expect(route.waypoints[index].progress).toBeGreaterThan(
        route.waypoints[index - 1].progress,
      );
    }
  });

  it("0%、50%、100% 均映射到路线正确位置", () => {
    const start = routePositionAt(route, 0);
    const middle = routePositionAt(route, 0.5);
    const end = routePositionAt(route, 1);
    expect(start).toMatchObject({ x: 16, y: 79, segmentIndex: 0 });
    expect(middle.x).toBeGreaterThan(start.x);
    expect(middle.y).toBeLessThan(start.y);
    expect(end).toMatchObject({ x: 53, y: 9 });
  });

  it("当前站、下一站与完成状态在峰顶收束", () => {
    expect(currentRouteWaypoint(route, 0)?.id).toBe("base-camp");
    expect(nextRouteWaypoint(route, 0)?.id).toBe("khumbu-icefall");
    expect(currentRouteWaypoint(route, 1)?.id).toBe("summit");
    expect(nextRouteWaypoint(route, 1)).toBeNull();
  });

  it("路线知识关联均指向场景内节点，峰顶知识绑定终点", () => {
    const nodeIds = new Set(EVEREST.knowledgeNodes.map((node) => node.id));
    for (const waypoint of route.waypoints) {
      if (waypoint.knowledgeId) expect(nodeIds.has(waypoint.knowledgeId)).toBe(true);
    }
    expect(route.waypoints[route.waypoints.length - 1].knowledgeId).toBe(
      "summit-height",
    );
  });

  it("路线为可选 Scene Data，不影响无路线场景", () => {
    expect(MARIANA.route).toBeUndefined();
  });
});
