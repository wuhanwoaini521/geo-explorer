import { describe, expect, it } from "vitest";
import { marianaPresentationAt } from "../miniprogram/pkg-explore/presentation/mariana-presentation";

describe("马里亚纳垂直下潜展示", () => {
  it.each([
    [0, "sunlight", "阳光带"],
    [199.9, "sunlight", "阳光带"],
    [200, "twilight", "微光带"],
    [1000, "midnight", "黑暗带"],
    [4000, "abyssal", "深渊带"],
    [6000, "hadal", "超深渊带"],
    [10935, "hadal", "超深渊带"],
  ] as const)("%s m 映射到 %s", (depth, zoneId, zoneName) => {
    const state = marianaPresentationAt(depth);
    expect(state.zoneId).toBe(zoneId);
    expect(state.zoneName).toBe(zoneName);
  });

  it("随深度连续削弱表层光照，并增强深海地貌", () => {
    const surface = marianaPresentationAt(0);
    const twilight = marianaPresentationAt(700);
    const midnight = marianaPresentationAt(2500);
    const hadal = marianaPresentationAt(8000);
    const nearBottom = marianaPresentationAt(10000);

    expect(surface.rayOpacity).toBeGreaterThan(twilight.rayOpacity);
    expect(twilight.rayOpacity).toBeGreaterThan(midnight.rayOpacity);
    expect(midnight.rayOpacity).toBe(0);
    expect(hadal.trenchOpacity).toBeGreaterThan(midnight.trenchOpacity);
    expect(nearBottom.bottomOpacity).toBeGreaterThan(0);
  });

  it("生成深海专属 HUD 指标", () => {
    const state = marianaPresentationAt(6000);

    expect(state.pressureText).toBe("601 atm");
    expect(state.lightText).toBe("0%");
    expect(state.temperatureText).toBe("1.6°C");
    expect(state.remainingBottomText).toBe("4,935 m");
    expect(state.railTopPercent).toBeGreaterThan(50);
  });

  it("抵底时固定在 10,935m，给出清晰完成态", () => {
    const state = marianaPresentationAt(20000);

    expect(state.depthM).toBe(10935);
    expect(state.progress).toBe(1);
    expect(state.railTopPercent).toBe(92);
    expect(state.remainingBottomText).toBe("已抵达");
    expect(state.atBottom).toBe(true);
    expect(state.bottomOpacity).toBe(1);
  });

  it("负深度安全回落到海面", () => {
    const state = marianaPresentationAt(-500);

    expect(state.depthM).toBe(0);
    expect(state.progress).toBe(0);
    expect(state.pressureText).toBe("1 atm");
    expect(state.atBottom).toBe(false);
    expect(state.surfaceArchiveVisible).toBe(true);
  });

  it("只在海面出发阶段展示历史任务档案", () => {
    expect(marianaPresentationAt(120).surfaceArchiveVisible).toBe(true);
    expect(marianaPresentationAt(121).surfaceArchiveVisible).toBe(false);
    expect(marianaPresentationAt(6000).surfaceArchiveVisible).toBe(false);
  });
});
