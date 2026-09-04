/**
 * GeoPlace 数据集完整性测试 —— 真实性/一致性底线。
 */
import { describe, expect, it } from "vitest";
import {
  PLACES,
  PLACE_TYPE_META,
  PLACE_TYPE_LABEL,
  featuredPlaces,
  getPlaceById,
  placesByType,
} from "../miniprogram/data/places";
import type { PlaceType } from "../miniprogram/types/models";

const VALID_TYPES: PlaceType[] = [
  "mountain", "river", "lake", "desert", "plateau", "canyon",
  "volcano", "glacier", "ocean", "coast", "waterfall",
];

describe("数据集基本完整性", () => {
  it("覆盖 40+ 地点且 id 唯一", () => {
    expect(PLACES.length).toBeGreaterThanOrEqual(40);
    const ids = PLACES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("覆盖所有 PlaceType，且每个类型 ≥2 条（单条不足以支撑分类浏览）", () => {
    const types = new Set(PLACES.map((p) => p.type));
    for (const t of VALID_TYPES) {
      expect(types.has(t), `缺少类型 ${t}`).toBe(true);
      expect(PLACES.filter((p) => p.type === t).length).toBeGreaterThanOrEqual(2);
    }
    // 数据集内不出现未注册类型
    for (const p of PLACES) expect(VALID_TYPES).toContain(p.type);
  });

  it("每条数据字段完整：中英文名/摘要/描述/成因/事实/标签/来源", () => {
    for (const p of PLACES) {
      expect(p.name, p.id).toBeTruthy();
      expect(p.nameEn, p.id).toBeTruthy();
      expect(p.shortDescription, p.id).toBeTruthy();
      expect(p.description?.length ?? 0, p.id).toBeGreaterThan(10);
      expect(p.formation?.length ?? 0, p.id).toBeGreaterThan(4);
      expect(p.facts.length, p.id).toBeGreaterThanOrEqual(1);
      expect(p.tags.length, p.id).toBeGreaterThanOrEqual(1);
      expect(p.sources.length, p.id).toBeGreaterThanOrEqual(1);
      expect(p.emoji, p.id).toBeTruthy();
    }
  });

  it("坐标在合法范围内", () => {
    for (const p of PLACES) {
      expect(Math.abs(p.latitude), p.id).toBeLessThanOrEqual(90);
      expect(Math.abs(p.longitude), p.id).toBeLessThanOrEqual(180);
    }
  });

  it("高程符号约定：海沟为负，山峰/火山为正", () => {
    for (const p of PLACES) {
      if (p.type === "ocean") expect(p.elevationM, p.id).toBeLessThan(0);
      if (p.type === "mountain" || p.type === "volcano") {
        expect(p.elevationM, p.id).toBeGreaterThan(0);
      }
    }
  });

  it("珠峰是世界最高海拔的山峰条目", () => {
    const everest = getPlaceById("p-everest")!;
    expect(everest).toBeTruthy();
    const maxMountain = Math.max(
      ...PLACES.filter((p) => p.type === "mountain").map((p) => p.elevationM),
    );
    expect(everest.elevationM).toBe(maxMountain);
    expect(everest.elevationM).toBe(8848.86);
  });

  it("每个 PlaceType 都有类型元数据（label + emoji），供筛选 UI 使用", () => {
    for (const t of VALID_TYPES) {
      const meta = PLACE_TYPE_META.find((m) => m.type === t);
      expect(meta, t).toBeTruthy();
      expect(meta!.label).toBeTruthy();
      expect(meta!.emoji).toBeTruthy();
      expect(PLACE_TYPE_LABEL[t]).toBe(meta!.label);
    }
  });
});

describe("精选 / 查询辅助", () => {
  it("精选地点 ≥ 6 个且字段完整", () => {
    const featured = featuredPlaces();
    expect(featured.length).toBeGreaterThanOrEqual(6);
    for (const p of featured) expect(p.featured).toBe(true);
  });

  it("getPlaceById / placesByType 行为正确", () => {
    expect(getPlaceById("p-everest")?.name).toBe("珠穆朗玛峰");
    expect(getPlaceById("p-nope")).toBeUndefined();
    const mountains = placesByType("mountain");
    expect(mountains.length).toBeGreaterThanOrEqual(5);
    expect(mountains.every((p) => p.type === "mountain")).toBe(true);
  });

  it("已开放探索的场景（explorationId）只指向真实存在的探索场景", () => {
    for (const p of PLACES) {
      if (p.explorationId) {
        expect(["everest", "mariana"]).toContain(p.explorationId);
      }
    }
  });

  it("everest 与 mariana 两个可探索地点已挂接场景", () => {
    expect(getPlaceById("p-everest")?.explorationId).toBe("everest");
    expect(getPlaceById("p-mariana")?.explorationId).toBe("mariana");
  });
});
