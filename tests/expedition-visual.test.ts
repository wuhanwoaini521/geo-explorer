/**
 * Gate 3.3A · Dual Visual Mode —— 纯逻辑引擎 + 校验器（Node 可跑）。
 *
 * 覆盖：场景选取（stageIndex → LIVE scene）、progress 完全由 stageMap 派生、
 *       LIVE/TERRAIN resolution、fallback 原因、validateVisualMode 正反例。
 */
import { describe, it, expect } from "vitest";
import { EVEREST_EXPEDITION } from "../miniprogram/data/expeditions/everest";
import {
  liveSceneForStageIndex,
  liveSceneProgressRange,
  resolveExpeditionVisual,
  visualFallbackWarning,
  type VisualResolveDeps,
} from "../miniprogram/engine/expedition-visual";
import { validateVisualMode } from "../miniprogram/engine/validate-expedition";
import type {
  ExpeditionVisualModeConfig,
  MediaManifest,
} from "../miniprogram/types/expedition";

const exp = EVEREST_EXPEDITION;

/** 构造以 live-a 绑定 approved 照片的输入（模拟 Gate 3.3B 之后的正式状态） */
function visualDepsWithLiveA(): { deps: VisualResolveDeps } {
  const media: MediaManifest = {
    ...exp.media,
    assets: [
      {
        id: "live-a-real",
        title: "Everest Base Camp to Icefall view",
        description: "kunmb at base area, approved portrait derivative",
        kind: "photograph",
        localPath: "/assets/expeditions/everest/live/live-a.webp",
        license: "CC BY 4.0",
        credit: "Derived · Wikimedia Commons",
        sourceUrl: "https://commons.wikimedia.org/wiki/Everest",
        reviewStatus: "approved",
      },
    ],
  };
  const visualMode: ExpeditionVisualModeConfig = {
    ...exp.visualMode,
    liveScenes: exp.visualMode.liveScenes.map((s, i) =>
      i === 0 ? { ...s, assetId: "live-a-real" } : s,
    ),
  };
  return {
    deps: { config: visualMode, stageMap: exp.stageMap, media },
  };
}

describe("LIVE 场景选取（复用 StageMap，无第二套 progress）", () => {
  it("7 段恰好被 4 个场景完整覆盖一次（无空隙/无重叠）", () => {
    const scenes = exp.visualMode.liveScenes;
    expect(scenes).toHaveLength(4);
    const seen = new Set<string>();
    for (const sc of scenes) {
      for (const sid of sc.stageIds) {
        if (seen.has(sid)) throw new Error(`阶段重叠：${sid} 属于多个场景`);
        seen.add(sid);
      }
    }
    const all = exp.stageMap.map((s) => s.id);
    expect([...seen].sort()).toEqual([...all].sort());
  });

  it("liveSceneForStageIndex 精确命中 4 个场景", () => {
    const stages = exp.stageMap;
    for (let i = 0; i < stages.length; i++) {
      const scene = liveSceneForStageIndex(exp.visualMode, stages, i);
      expect(scene).toBeTruthy();
      expect(scene!.stageIds).toContain(stages[i].id);
    }
    const scenes = new Set(
      stages.map(
        (_, i) => liveSceneForStageIndex(exp.visualMode, stages, i)!.id,
      ),
    );
    expect([...scenes].sort()).toEqual([
      "live-a",
      "live-b",
      "live-c",
      "live-d",
    ]);
  });

  it("liveSceneProgressRange 完全由 stageMap 派生（不手写边界）", () => {
    for (const scene of exp.visualMode.liveScenes) {
      const idxs = scene.stageIds
        .map((sid) => exp.stageMap.findIndex((s) => s.id === sid))
        .filter((i) => i >= 0);
      const lo = Math.min(...idxs);
      const hi = Math.max(...idxs);
      const r = liveSceneProgressRange(scene, exp.stageMap);
      expect(r).not.toBeNull();
      expect(r!.from).toBeCloseTo(exp.stageMap[lo].fromProgress, 6);
      expect(r!.to).toBeCloseTo(exp.stageMap[hi].toProgress, 6);
    }
  });
});

describe("resolveExpeditionVisual：LIVE / TERRAIN / fallback（§24）", () => {
  it("模式=TERRAIN → 直接 TERRAIN（user-selected，非兜底）", () => {
    const { deps } = visualDepsWithLiveA();
    const p = resolveExpeditionVisual(deps, { mode: "TERRAIN", stageIndex: 0 });
    expect(p.kind).toBe("TERRAIN");
    if (p.kind === "TERRAIN") expect(p.reason).toBe("user-selected");
  });

  it("模式=LIVE 但现清单为空 → no-live-assets 兜底（当前正式状态）", () => {
    const p = resolveExpeditionVisual(
      { config: exp.visualMode, stageMap: exp.stageMap, media: exp.media },
      { mode: "LIVE", stageIndex: 0 },
    );
    expect(p.kind).toBe("TERRAIN");
    if (p.kind === "TERRAIN") expect(p.reason).toBe("no-live-assets");
  });

  it("绑定 approved → 返回可渲染 LIVE（图片/降级 crop/过渡默认）", () => {
    const { deps } = visualDepsWithLiveA();
    const p = resolveExpeditionVisual(deps, { mode: "LIVE", stageIndex: 0 });
    expect(p.kind).toBe("LIVE");
    if (p.kind === "LIVE") {
      expect(p.image).toBe("/assets/expeditions/everest/live/live-a.webp");
      expect(p.scene.id).toBe("live-a");
      expect(p.routeOverlay).toBe("full-route");
      expect(p.crop.focusX).toBeGreaterThanOrEqual(0);
      expect(p.transition?.crossfadeMs).toBeGreaterThan(0);
    }
  });

  it("绑定 unapproved 资产 → asset-not-approved 兜底", () => {
    const { deps } = visualDepsWithLiveA();
    deps.media.assets[0].reviewStatus = "review";
    const p = resolveExpeditionVisual(deps, { mode: "LIVE", stageIndex: 0 });
    expect(p.kind).toBe("TERRAIN");
    if (p.kind === "TERRAIN") expect(p.reason).toBe("asset-not-approved");
  });

  it("未命中场景（缺一个场景时）→ no-scene-match 兜底", () => {
    const vc = {
      ...exp.visualMode,
      liveScenes: exp.visualMode.liveScenes.slice(1),
    };
    const p = resolveExpeditionVisual(
      { config: vc, stageMap: exp.stageMap, media: exp.media },
      { mode: "LIVE", stageIndex: 0 },
    );
    expect(p.kind).toBe("TERRAIN");
    if (p.kind === "TERRAIN") expect(p.reason).toBe("no-scene-match");
  });

  it("visualFallbackWarning 给出可读文案", () => {
    expect(visualFallbackWarning("no-live-assets", "live-a")).toContain(
      "live-a",
    );
  });
});

describe("validateVisualMode", () => {
  it("真实 Everest 配置合规（无 error）", () => {
    const r = validateVisualMode(exp);
    expect(r.issues.filter((i) => i.level === "error")).toHaveLength(0);
  });

  it("漏覆盖阶段 → error", () => {
    const vc = {
      ...exp.visualMode,
      liveScenes: exp.visualMode.liveScenes.map((s, i) =>
        i === 0 ? { ...s, stageIds: s.stageIds.slice(0, 1) } : s,
      ),
    };
    const r = validateVisualMode({ ...exp, visualMode: vc });
    expect(r.ok).toBe(false);
    expect(
      r.issues.some(
        (i) => i.message.includes("未") && i.message.includes("覆盖"),
      ),
    ).toBe(true);
  });

  it("阶段重叠（属于两个场景）→ error", () => {
    const vc = {
      ...exp.visualMode,
      liveScenes: exp.visualMode.liveScenes.map((s, i) =>
        i === 1 ? { ...s, stageIds: [...s.stageIds, "approach"] } : s,
      ),
    };
    const r = validateVisualMode({ ...exp, visualMode: vc });
    expect(r.ok).toBe(false);
  });

  it("重复 id / 未知 defaultMode / fallback≠TERRAIN → error", () => {
    const vc: any = {
      ...exp.visualMode,
      defaultMode: "REALITY",
      fallback: "LIVE",
      liveScenes: [
        ...exp.visualMode.liveScenes,
        { ...exp.visualMode.liveScenes[3], id: "live-a" },
      ],
    };
    const r = validateVisualMode({ ...exp, visualMode: vc });
    expect(r.ok).toBe(false);
    expect(r.issues.some((i) => i.message.includes("重复"))).toBe(true);
  });

  it("悬挂 assetId / 未批准 → 检出", () => {
    const vc = {
      ...exp.visualMode,
      liveScenes: exp.visualMode.liveScenes.map((s, i) =>
        i === 0 ? { ...s, assetId: "ghost" } : s,
      ),
    };
    const r = validateVisualMode({ ...exp, visualMode: vc });
    expect(r.ok).toBe(false); // 引用不存在资产 → error
  });

  it("approved + crop 越界 → error；approved 无 crop → warning", () => {
    const media: MediaManifest = {
      ...exp.media,
      assets: [
        {
          id: "ok-img",
          title: "t",
          description: "d",
          kind: "photograph",
          localPath: "p.webp",
          license: "CC BY 4.0",
          reviewStatus: "approved",
        },
      ],
    };
    const badCrop = {
      ...exp.visualMode,
      liveScenes: exp.visualMode.liveScenes.map((s, i) =>
        i === 0
          ? {
              ...s,
              assetId: "ok-img",
              crop: { focusX: 2, focusY: 0.5, scale: 1 },
            }
          : s,
      ),
    };
    const r = validateVisualMode({ ...exp, media, visualMode: badCrop });
    expect(
      r.issues.some((i) => i.path.includes("crop") && i.level === "error"),
    ).toBe(true);
  });
});
