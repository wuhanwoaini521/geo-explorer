/**
 * Gate 3.3C — One-Scene LIVE Prototype（§23 devtest 清单）
 *
 *  1. LIVE-A（Kala Patthar）绑定 approved 实拍 → LIVE 呈现
 *  2. B/C/D 未绑定 assetId → LIVE 请求 fallback 回 TERRAIN（no-live-assets）
 *  3. 用户手动切 TERRAIN（即使在 LIVE-A 阶段）→ TERRAIN（user-selected）
 *  4. load-failed 型回退确定性：解码失败 → 会话内 TERRAIN，不反复重试坏资产
 *  5. LIVE ⇔ TERRAIN 切换前后 progress 完全一致（不建立第二套进度）
 *  6. Mariana 无 Expedition 附件 → 维持旧探索（海拔轴，LIVE 层不装载）
 *
 * 另含 MediaManifest 出处验证（localPath/许可/署名/hash 与磁盘文件一致）。
 */
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { describe, expect, it, beforeAll } from "vitest";
import {
  buildLiveRouteOverlay,
  liveSceneForStageIndex,
  resolveExpeditionVisual,
} from "../miniprogram/engine/expedition-visual";
import { getExpeditionById } from "../miniprogram/data/expeditions/index";

/* ---------------- wx / Page 全局 mock（与 expedition-page.test.ts 同款） ---------------- */
const wxRecord: Record<string, unknown[][]> = {};
const wxStorage = new Map<string, unknown>();
function record(name: string, args: unknown[]): void {
  (wxRecord[name] ||= []).push(args);
}
const wxMock = {
  navigateTo: (...a: unknown[]) => record("navigateTo", a),
  switchTab: (...a: unknown[]) => record("switchTab", a),
  navigateBack: (...a: unknown[]) => record("navigateBack", a),
  showToast: (...a: unknown[]) => record("showToast", a),
  showModal: (...a: unknown[]) => record("showModal", a),
  getStorageSync: (k: string) => wxStorage.get(k),
  setStorageSync: (k: string, v: unknown) => void wxStorage.set(k, v),
  clearStorageSync: () => void wxStorage.clear(),
};
(globalThis as Record<string, unknown>).wx = wxMock;

interface PageDef {
  data: Record<string, any>;
  [key: string]: any;
}
let lastPageDef: PageDef | null = null;
(globalThis as Record<string, unknown>).Page = (def: PageDef) => {
  lastPageDef = def;
};

function createInstance(def: PageDef): PageDef {
  const inst = Object.create(null) as PageDef;
  inst.data = JSON.parse(JSON.stringify(def.data));
  for (const [key, value] of Object.entries(def)) {
    if (key === "data") continue;
    inst[key] =
      typeof value === "function" ? (value as () => void).bind(inst) : value;
  }
  inst.setData = (patch: Record<string, unknown>) => {
    Object.assign(inst.data, patch);
  };
  return inst;
}

/** LIVE-A 运行时资产路径（与 manifest.localPath 一致） */
const HERO_IMG = "/assets/expeditions/everest/live/live-a-kala-patthar.jpg";

let pageDef: PageDef;
beforeAll(async () => {
  await import("../miniprogram/pages/exploration/index");
  pageDef = lastPageDef!;
});

const everest = () => getExpeditionById("everest")!;

/** 推进一帧（current=target 后 tick） */
function driveTo(inst: PageDef, p: number): void {
  inst.current = p;
  inst.target = p;
  inst.tickFrame();
}

/* ---------------- Manifest 出处（§2/§7：MediaManifest 是唯一真相，hash 与磁盘一致） ---------------- */
describe("LIVE-A MediaManifest 出处", () => {
  const exp = everest();
  const asset = exp.media.assets.find((a) => a.id === "live-a-kala-patthar");

  it("资产已登记 approved 且被 liveScenes[0] 引用", () => {
    expect(asset).toBeTruthy();
    expect(asset!.reviewStatus).toBe("approved");
    expect(asset!.localPath).toBe(HERO_IMG);
    expect(exp.visualMode.liveScenes[0].assetId).toBe("live-a-kala-patthar");
  });

  it("出处元数据齐全（作者/许可/许可链接/来源/署名/拍摄日期）", () => {
    expect(asset!.credit).toBeTruthy();
    expect(asset!.license).toContain("CC BY-SA");
    expect(asset!.licenseUrl).toContain("creativecommons.org");
    expect(asset!.sourceUrl).toContain("commons.wikimedia.org");
    expect(asset!.attribution).toContain("CC BY-SA");
    expect(asset!.capturedAt).toBe("2019-04-24");
    expect(asset!.geographicRole).toBe("Representative real-world image");
    expect(asset!.overlayProjection).toBe("CURATED");
    expect(asset!.originalResolution).toBe("5848\u00d74387");
    expect(asset!.dimensions).toEqual({ width: 1080, height: 1920 });
  });

  it("hash == 磁盘派生文件 sha256（可复现、未篡改）", () => {
    const p = join(
      __dirname,
      "..",
      "miniprogram",
      "assets",
      "expeditions",
      "everest",
      "live",
      "live-a-kala-patthar.jpg",
    );
    if (!existsSync(p)) {
      throw new Error(
        "runtime asset missing: miniprogram/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
      );
    }
    const sha = createHash("sha256").update(readFileSync(p)).digest("hex");
    expect(asset!.hash).toBe(sha);
  });
});

/* ---------------- §23 场景：LIVE-A 呈现 / B·C·D 兜底 / 手动 TERRAIN ---------------- */
describe("Gate 3.3C LIVE / TERRAIN 解析", () => {
  const exp = everest();

  it("LIVE-A（approach / 昆布冰瀑阶段）→ LIVE 呈现", () => {
    const p = resolveExpeditionVisual(
      { config: exp.visualMode, stageMap: exp.stageMap, media: exp.media },
      { mode: "LIVE", stageIndex: 0 },
    );
    expect(p.kind).toBe("LIVE");
    if (p.kind === "LIVE") {
      expect(p.image).toBe(HERO_IMG);
      expect(p.scene.id).toBe("live-a");
      // CURATED 示意锚点（待视觉校准）；点数>1 才可能画折线
      expect(p.anchors?.projectionType).toBe("CURATED");
      expect(Object.keys(p.anchors?.points ?? {}).length).toBeGreaterThan(1);
      expect(p.routeOverlay).toBe("full-route");
    }
  });

  it("B/C/D 无 assetId → 一律兜底 TERRAIN（no-live-assets）", () => {
    for (let i = 0; i < exp.stageMap.length; i++) {
      const scene = liveSceneForStageIndex(exp.visualMode, exp.stageMap, i);
      if (!scene || scene.id === "live-a") continue;
      const p = resolveExpeditionVisual(
        { config: exp.visualMode, stageMap: exp.stageMap, media: exp.media },
        { mode: "LIVE", stageIndex: i },
      );
      expect(p.kind).toBe("TERRAIN");
      if (p.kind === "TERRAIN") expect(p.reason).toBe("no-live-assets");
    }
  });

  it("手动 TERRAIN（即使位于 LIVE-A 阶段）→ TERRAIN（user-selected）", () => {
    const p = resolveExpeditionVisual(
      { config: exp.visualMode, stageMap: exp.stageMap, media: exp.media },
      { mode: "TERRAIN", stageIndex: 0 },
    );
    expect(p.kind).toBe("TERRAIN");
    if (p.kind === "TERRAIN") expect(p.reason).toBe("user-selected");
  });
});

/* ---------------- 页面级：LIVE 不可用 → TERRAIN 回退（不白屏） ---------------- */
describe("页面级：LIVE 图片装载 / 失败回退", () => {
  it("LIVE-A 阶段装载实图：visLiveSrc 被设置、ready 待命", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    driveTo(inst, 0.02);
    const d = inst.data as Record<string, any>;
    expect(d.visLiveSrc).toBe(HERO_IMG);
  });

  it("解码成功 → visLiveReady=true（淡入）", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    driveTo(inst, 0.02);
    inst.onLiveImageLoad();
    const d = inst.data as Record<string, any>;
    expect(d.visLiveReady).toBe(true);
  });

  it("解码失败 → 会话内 TERRAIN：清空 visLiveSrc、之后不再重试坏资产", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    driveTo(inst, 0.02);
    const d = inst.data as Record<string, any>;
    expect(d.visLiveSrc).toBe(HERO_IMG);

    inst.onLiveImageError(); // 模拟 binderror
    expect(d.visMode).toBe("TERRAIN");
    expect(d.visLiveSrc).toBe("");
    expect(d.visLiveReady).toBe(false);
    expect(inst.visBroken).toBe(true);

    // 之后的 tick 仍位于 LIVE-A 范围，但不再重试 LIVE
    driveTo(inst, 0.06);
    expect(d.visLiveSrc).toBe("");
    expect(d.visLiveReady).toBe(false);
  });
});

/* ---------------- 切换不建立第二套进度 ---------------- */
describe("LIVE ⇔ TERRAIN 切换不动进度", () => {
  it("切换前后 current/target/百分比/当前高程完全一致", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    driveTo(inst, 0.5);
    const d0 = inst.data as Record<string, any>;
    const before = {
      current: inst.current,
      target: inst.target,
      pct: d0.expedition.pct,
      elev: d0.expedition.currentElevText,
    };

    inst.onToggleVisualMode({
      currentTarget: { dataset: { mode: "TERRAIN" } },
    } as any);
    inst.onToggleVisualMode({
      currentTarget: { dataset: { mode: "LIVE" } },
    } as any);
    driveTo(inst, 0.5);

    const d1 = inst.data as Record<string, any>;
    expect(inst.current).toBe(before.current);
    expect(inst.target).toBe(before.target);
    expect(d1.expedition.pct).toBe(before.pct);
    expect(d1.expedition.currentElevText).toBe(before.elev);
  });
});

/* ---------------- Mariana：无 Expedition 附件 → 保持旧探索 ---------------- */
describe("Mariana（无 V2 附件）保持旧模式", () => {
  it("onLoad(id=mariana)：routeMode=false、无视觉配置、LIVE 层不装载", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "mariana" });
    expect(inst.routeMode).toBe(false);
    expect(inst.visualConfig).toBeNull();
    expect(inst.visualMedia).toBeNull();
    const d = inst.data as Record<string, any>;
    // 非 routeMode：即使误设 visLiveSrc 也没有 LIVE 层可渲染；这里应保持空
    expect(d.visLiveSrc).toBe("");
  });

  it("旧 tickFrame 仍走海拔轴（不产出 Expedition 派生）", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "mariana" });
    inst.current = 4000;
    inst.target = 4000;
    inst.tickFrame();
    const d = inst.data as Record<string, any>;
    expect(d.routeMode).toBe(false);
    expect(d.expedition.currentName).toBe("");
  });
});

/* ---------------- LIVE overlay 折线几何（纯函数） ---------------- */
describe("buildLiveRouteOverlay（锚点 → 渲染几何）", () => {
  const anchors = {
    projectionType: "CURATED" as const,
    points: {
      "base-camp": { x: 0, y: 1 },
      iceslope: { x: 1, y: 0.5 },
    },
  };

  it("两点 → 一条线段（水平 +45°，起点/终点标）", () => {
    const ov = buildLiveRouteOverlay(anchors, "full-route", 0.5);
    expect(ov).not.toBeNull();
    if (!ov) return;
    expect(ov.segments).toHaveLength(1);
    expect(ov.origins.map((o) => o.label)).toEqual(["大本营", "峰顶"]);
    expect(ov.schematic).toBe(true);
    // 中点应在 (9/2%, (1+0.5)/2*100%?) → 只验证范围与正负坐标
    const s = ov.segments[0];
    expect(s.x).toBeGreaterThan(0);
    expect(s.y).toBeGreaterThan(0);
    expect(s.lengthX).toBeGreaterThan(0);
  });

  it("进度从盒子底部 → 峰顶：marker 沿折线移动（0 在起点、1 在终点）", () => {
    const ov0 = buildLiveRouteOverlay(anchors, "full-route", 0);
    const ov1 = buildLiveRouteOverlay(anchors, "full-route", 1);
    expect(ov0).not.toBeNull();
    expect(ov1).not.toBeNull();
    if (!ov0 || !ov1) return;
    // marker 应落在起点锚点(0,1) 与终点锚点(1,0.5) 的归一坐标附近
    expect(ov0.marker.x).toBeCloseTo(0, 1);
    expect(ov0.marker.y).toBeCloseTo(100, 1);
    expect(ov1.marker.x).toBeCloseTo(100, 1);
    expect(ov1.marker.y).toBeCloseTo(50, 1);
  });

  it("anchors 缺失 / 点数<2 → null（不画无据折线）", () => {
    expect(buildLiveRouteOverlay(null, "full-route", 0.5)).toBeNull();
    expect(
      buildLiveRouteOverlay(
        { projectionType: "CURATED" as const, points: {} },
        "full-route",
        0.5,
      ),
    ).toBeNull();
  });

  it("页面级：LIVE-A 阶段 dig workspace 骨架段存在", () => {
    const exp = everest();
    const ov = buildLiveRouteOverlay(exp.visualMode.liveScenes[0].anchors, "full-route", 0.5);
    expect(ov).not.toBeNull();
    if (!ov) return;
    expect(ov.segments.length).toBe(3); // 4 锚点 → 3 段
  });
});
