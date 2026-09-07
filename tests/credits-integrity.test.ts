/**
 * 数据溯源完整性（credits-integrity）+ 路线全景数据源（route-overview）。
 *
 * 目标（Phase-2 fallback 阶段可验收项）：
 *  - 正式展示的素材必须“有出处”：author+license+licenseUrl+sourceUrl
 *    全非空、磁盘上真实存在，缺失即红（不许放开了没出处）。
 *  - “查看路线”全景的所有数字都由 routeIndex/stageMap 计算，不手写距离；
 *    里程碑单调、阶段完整覆盖 0..total、首尾分别是起点营地和 summit。
 */
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  buildCredits,
  CREDIT_GROUP_KEYS,
} from "../miniprogram/engine/credits.js";
import { EVEREST_EXPEDITION } from "../miniprogram/data/expeditions/everest.js";

const ROOT = join(__dirname, "..");

describe("credits-integrity：来源/素材必须有出处", () => {
  const groups = buildCredits({
    assets: EVEREST_EXPEDITION.media.assets,
    sources: EVEREST_EXPEDITION.sources,
  });

  it("分组键与 CREDIT_GROUP_KEYS 一致，且四大类都有内容", () => {
    expect(groups.map((g) => g.key)).toEqual([...CREDIT_GROUP_KEYS]);
    expect(groups.filter((g) => g.items.length > 0).length).toBe(
      CREDIT_GROUP_KEYS.length,
    );
  });

  it("影像素材：credit + license + licenseUrl + sourceUrl 全非空", () => {
    const imagery = groups.find((g) => g.key === "imagery");
    expect(imagery).toBeTruthy();
    for (const it of imagery!.items) {
      expect(it.id).toMatch(/^asset-/);
      expect(it.name.trim().length).toBeGreaterThan(0);
      expect((it.credit ?? "").length).toBeGreaterThan(0);
      expect((it.license ?? "").length).toBeGreaterThan(0);
      expect((it.licenseUrl ?? "").length).toBeGreaterThan(0);
      expect(it.url.length).toBeGreaterThan(0);
      expect(it.note === undefined).toBe(true);
    }
  });

  it("登记的本地素材必须真实存在于磁盘（不得有悬空 asset path）", () => {
    for (const a of EVEREST_EXPEDITION.media.assets) {
      if (a.localPath) {
        const abs = join(ROOT, "miniprogram", a.localPath.replace(/^\//, ""));
        expect(existsSync(abs), `${a.id} 缺失：${abs}`).toBe(true);
      }
    }
  });

  it("terrain / geometry / reference 三组各含条目，近似值被诚实标注", () => {
    for (const key of ["terrain", "geometry", "reference"] as const) {
      const g = groups.find((x) => x.key === key);
      expect(g, key).toBeTruthy();
      expect(g!.items.length).toBeGreaterThan(0);
    }
    const dem = groups.find((g) => g.key === "terrain");
    expect(dem!.items[0].note ?? "").toContain("近似");
  });

  it("id 唯一（页面 wx:key 依赖）", () => {
    const ids = groups.flatMap((g) => g.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("route-overview：查看路线 全景视图数据完整", () => {
  const exp = EVEREST_EXPEDITION;
  const idx = exp.routeIndex;
  const ms = idx.milestones;
  const stages = exp.stageMap;

  it("routeIndex 里程全部为计算值，数量正确", () => {
    expect(idx.pointCount).toBeGreaterThan(100);
    expect(idx.totalDistanceM).toBeGreaterThan(0);
    expect(idx.total3dDistanceM).toBeGreaterThanOrEqual(idx.totalDistanceM);
    expect(idx.ascentM).toBeGreaterThan(0);
    expect(ms.length).toBeGreaterThanOrEqual(8);
  });

  it("里程碑单调递增，首尾是起点（营地/地标）与大本营后的 summit", () => {
    const first = ms[0];
    const lastD = ms[ms.length - 1];
    expect(first.kind).toMatch(/camp|landmark/);
    expect(lastD.kind).toBe("summit");
    for (let i = 1; i < ms.length; i++) {
      expect(ms[i].distanceM).toBeGreaterThan(ms[i - 1].distanceM);
    }
  });

  it("阶段覆盖完整 0 → 100%，且各段距离单调合法", () => {
    expect(stages.length).toBeGreaterThanOrEqual(7);
    expect(stages[0].fromDistanceM).toBe(0);
    const lastM = stages[stages.length - 1];
    expect(lastM.toDistanceM).toBeCloseTo(idx.totalDistanceM, 6);
    for (const s of stages) {
      expect(s.toDistanceM).toBeGreaterThan(s.fromDistanceM);
    }
  });
});