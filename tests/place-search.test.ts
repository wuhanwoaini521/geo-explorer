/**
 * 地点搜索 / 筛选纯函数测试 —— 全局搜索底线行为。
 */
import { describe, expect, it } from "vitest";
import { PLACES } from "../miniprogram/data/places";
import {
  filterByType,
  queryPlaces,
  searchPlaces,
} from "../miniprogram/utils/place-search";

describe("searchPlaces 关键词搜索", () => {
  it("空关键词 / 纯空白返回全部", () => {
    expect(searchPlaces(PLACES, "")).toBe(PLACES);
    expect(searchPlaces(PLACES, "   ")).toBe(PLACES);
  });

  it("匹配中文名", () => {
    const result = searchPlaces(PLACES, "珠穆朗玛");
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.some((p) => p.id === "p-everest")).toBe(true);
  });

  it("匹配英文名且不区分大小写", () => {
    expect(searchPlaces(PLACES, "everest").some((p) => p.id === "p-everest")).toBe(true);
    expect(searchPlaces(PLACES, "KILIMANJARO").some((p) => p.id === "p-kilimanjaro")).toBe(true);
  });

  it("匹配国家 / 区域", () => {
    const japan = searchPlaces(PLACES, "日本");
    expect(japan.some((p) => p.id === "p-fuji")).toBe(true);
    const tibet = searchPlaces(PLACES, "西藏");
    expect(tibet.some((p) => p.id === "p-yarlung")).toBe(true);
  });

  it("匹配标签", () => {
    const results = searchPlaces(PLACES, "世界之最");
    expect(results.length).toBeGreaterThanOrEqual(5);
  });

  it("搜索不存在的内容返回空数组", () => {
    expect(searchPlaces(PLACES, "不存在的地方xyz")).toEqual([]);
  });
});

describe("filterByType 类型筛选", () => {
  it('"all" 返回全部引用', () => {
    expect(filterByType(PLACES, "all")).toBe(PLACES);
  });

  it("按类型筛选", () => {
    const mountains = filterByType(PLACES, "mountain");
    expect(mountains.length).toBeGreaterThanOrEqual(5);
    expect(mountains.every((p) => p.type === "mountain")).toBe(true);
  });
});

describe("queryPlaces 组合筛选", () => {
  it("类型 + 关键词交集", () => {
    const result = queryPlaces(PLACES, "沙漠", "desert");
    expect(result.every((p) => p.type === "desert")).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it("交集为空时返回空数组", () => {
    expect(queryPlaces(PLACES, "贝加尔", "desert")).toEqual([]);
  });

  it("空关键词 + all = 全部", () => {
    expect(queryPlaces(PLACES, "", "all")).toBe(PLACES);
  });
});
