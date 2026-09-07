/**
 * V2 数据层：Everest Expedition 组合 + 校验器。
 */
import { describe, it, expect } from "vitest";
import { EVEREST_EXPEDITION } from "../miniprogram/data/expeditions/everest";
import { stageIndexAtDistance } from "../miniprogram/engine/expedition-stages";
import {
  validateExpedition,
  validateRouteGeometryData,
  validateMediaManifest,
  validateCamera,
} from "../miniprogram/engine/validate-expedition";
import { SOUTH_COL_ROUTE } from "../miniprogram/data/routes/everest/index";
import type { MediaManifest } from "../miniprogram/types/expedition";

describe("EVEREST_EXPEDITION 结构", () => {
  const exp = EVEREST_EXPEDITION;

  it("保留原 Exploration 且追加 V2 能力（无第二套顶层模型）", () => {
    expect(exp.id).toBe("everest");
    expect(exp.stages.length).toBeGreaterThan(0);
    expect(exp.type).toBe("CLIMB");
    expect(exp.routeIndex.pointCount).toBe(289);
    expect(exp.elevationPolicy.model).toBe("reference-anchored");
    expect(exp.sources.length).toBeGreaterThan(0);
  });

  it("7 段阶段：连续、覆盖 [0,total]、边界全部计算", () => {
    const st = exp.stageMap;
    expect(st).toHaveLength(7);
    expect(st[0].fromDistanceM).toBe(0);
    expect(st[st.length - 1].toDistanceM).toBeCloseTo(
      exp.routeIndex.totalDistanceM,
      1,
    );
    for (let i = 1; i < st.length; i++) {
      expect(st[i].fromDistanceM).toBeCloseTo(st[i - 1].toDistanceM, 2);
      expect(st[i].fromDistanceM).toBeGreaterThan(st[i - 1].fromDistanceM);
    }
  });

  it("death-zone 由「参考海拔跨 8000m」切入（无手写距离）", () => {
    const st = exp.stageMap;
    const dz = st.find((s) => s.id === "death-zone")!;
    const sc = st.find((s) => s.id === "south-col")!;
    expect(dz.from.kind).toBe("cross-ref-m");
    expect(sc.to.kind).toBe("cross-ref-m");
    expect(sc.toDistanceM).toBeCloseTo(dz.fromDistanceM, 2);
    expect(dz.toDistanceM).toBeGreaterThan(dz.fromDistanceM);
  });

  it("stageIndexAtDistance 可定位（起点/中段/终点）", () => {
    const st = exp.stageMap;
    expect(stageIndexAtDistance(st, 0)).toBe(0);
    const mid = st[3].fromDistanceM;
    expect(stageIndexAtDistance(st, mid)).toBeGreaterThan(0);
    expect(stageIndexAtDistance(st, exp.routeIndex.totalDistanceM)).toBe(
      st.length - 1,
    );
  });

  it("相机段覆盖 [0,1] 且不重叠", () => {
    const segs = exp.camera.segments;
    expect(segs[0].fromProgress).toBe(0);
    expect(segs[segs.length - 1].toProgress).toBe(1);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].fromProgress).toBeGreaterThanOrEqual(
        segs[i - 1].toProgress,
      );
    }
  });

  it("Dual Visual Mode（Gate 3.3A）：默认 LIVE，兜底 TERRAIN，4 Hero 场景", () => {
    const vm = exp.visualMode;
    expect(vm.defaultMode).toBe("LIVE");
    expect(vm.fallback).toBe("TERRAIN");
    expect(vm.liveScenes).toHaveLength(4);
    for (const sc of vm.liveScenes) {
      expect(sc.stageIds.length).toBeGreaterThan(0);
      expect(sc.id).toMatch(/^live-[a-d]$/);
    }
  });
});

describe("validate-* 校验器", () => {
  it("真实数据整体合规（含三类海拔分离）", () => {
    const r = validateExpedition(EVEREST_EXPEDITION);
    expect(r.ok).toBe(true);
    expect(r.issues.filter((i) => i.level === "error")).toHaveLength(0);
  });

  it("validateRouteGeometryData 对生成 JSON 合规", () => {
    const r = validateRouteGeometryData(SOUTH_COL_ROUTE);
    expect(r.ok).toBe(true);
    expect(r.issues).toHaveLength(0);
  });

  it("validateMediaManifest 拒绝缺 license 的资产", () => {
    const m: MediaManifest = {
      schemaVersion: 1,
      id: "x",
      sceneId: "everest",
      assets: [
        {
          id: "a",
          title: "t",
          description: "d",
          kind: "render",
          localPath: "a.png",
          reviewStatus: "draft",
        } as unknown as MediaManifest["assets"][number],
      ],
    };
    const r = validateMediaManifest(m);
    expect(r.ok).toBe(false);
    const lic = r.issues.find((i) => i.path.includes("license"));
    expect(lic).toBeTruthy();
    const approve = r.issues.some((i) => i.path.includes("reviewStatus"));
    expect(approve).toBe(true); // draft 非批准 → warning
  });

  it("validateCamera 拒绝区间重叠", () => {
    const cam = {
      segments: [
        { id: "a", fromProgress: 0, toProgress: 0.6, asset: "x" },
        { id: "b", fromProgress: 0.5, toProgress: 1, asset: "y" },
      ],
    };
    const r = validateCamera(cam);
    expect(r.ok).toBe(false);
  });

  it("validateExpedition 捕获坏数据（阶段不连续）", () => {
    const bad = {
      ...EVEREST_EXPEDITION,
      stageMap: EVEREST_EXPEDITION.stageMap.map((s, i) =>
        i === 2 ? { ...s, fromDistanceM: s.fromDistanceM + 100 } : s,
      ),
    };
    const r = validateExpedition(bad);
    expect(r.ok).toBe(false);
  });
});
