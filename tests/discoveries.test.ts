/**
 * 「你知道吗」冷知识数据完整性 + 随机抽取测试。
 */
import { describe, expect, it } from "vitest";
import { DISCOVERIES } from "../miniprogram/data/discoveries";
import { randomDiscovery } from "../miniprogram/utils/discovery";

describe("discoveries 数据完整性", () => {
  it("≥ 10 条且 id 唯一", () => {
    expect(DISCOVERIES.length).toBeGreaterThanOrEqual(10);
    const ids = DISCOVERIES.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("每条有 emoji / fact / 来源，fact 为单句短文", () => {
    for (const d of DISCOVERIES) {
      expect(d.emoji, d.id).toBeTruthy();
      expect(d.fact.length, d.id).toBeGreaterThan(8);
      expect(d.fact.length, d.id).toBeLessThan(80);
      expect(d.source?.url, d.id).toMatch(/^https:/);
      expect(d.source?.name, d.id).toBeTruthy();
    }
  });
});

describe("randomDiscovery", () => {
  it("返回数据集内的条目", () => {
    const d = randomDiscovery();
    expect(DISCOVERIES).toContain(d);
  });

  it("指定 excludeId 时不再返回该条目", () => {
    const first = DISCOVERIES[0];
    for (let i = 0; i < 20; i++) {
      expect(randomDiscovery(first.id).id).not.toBe(first.id);
    }
  });
});
