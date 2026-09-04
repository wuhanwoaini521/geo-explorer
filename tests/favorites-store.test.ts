/**
 * 收藏服务测试 —— 内存存储注入，验证行为与持久化语义。
 */
import { describe, expect, it } from "vitest";
import { createFavoritesService } from "../miniprogram/services/favorites-store";
import { createMemoryStorage } from "../miniprogram/services/exploration-store";
import { PLACES, getPlaceById } from "../miniprogram/data/places";

describe("favorites（收藏夹）", () => {
  it("初始为空", () => {
    const svc = createFavoritesService(createMemoryStorage());
    expect(svc.getIds()).toEqual([]);
    expect(svc.count()).toBe(0);
  });

  it("toggle 添加 → isFavorite true → 再 toggle 移除", () => {
    const svc = createFavoritesService(createMemoryStorage());
    expect(svc.toggle("p-everest")).toBe(true);
    expect(svc.isFavorite("p-everest")).toBe(true);
    expect(svc.count()).toBe(1);
    expect(svc.toggle("p-everest")).toBe(false);
    expect(svc.isFavorite("p-everest")).toBe(false);
    expect(svc.count()).toBe(0);
  });

  it("重复 toggle 不产生重复 id", () => {
    const svc = createFavoritesService(createMemoryStorage());
    svc.toggle("p-fuji");
    svc.toggle("p-fuji");
    svc.toggle("p-fuji");
    expect(svc.getIds()).toEqual(["p-fuji"]);
  });

  it("getPlaces 只返回仍存在的地点（跳过已下架 id）", () => {
    const storage = createMemoryStorage();
    const svc = createFavoritesService(storage);
    svc.toggle("p-everest");
    // 模拟数据更新后某 id 消失
    storage.set("geoexplorer.favorites.v1", ["p-everest", "p-ghost"]);
    const places = svc.getPlaces(PLACES);
    expect(places.map((p) => p.id)).toEqual(["p-everest"]);
  });

  it("持久化：两个实例共享同一存储视图", () => {
    const storage = createMemoryStorage();
    const a = createFavoritesService(storage);
    const b = createFavoritesService(storage);
    a.toggle("p-mariana");
    expect(b.isFavorite("p-mariana")).toBe(true);
  });

  it("存储中的非字符串脏数据被过滤且去重", () => {
    const storage = createMemoryStorage();
    storage.set("geoexplorer.favorites.v1", ["p-everest", 42, null, "p-everest"]);
    const svc = createFavoritesService(storage);
    expect(svc.getIds()).toEqual(["p-everest"]);
  });

  it("getPlaces 返回的是完整 Place 对象", () => {
    const svc = createFavoritesService(createMemoryStorage());
    svc.toggle("p-baikal");
    const [place] = svc.getPlaces(PLACES);
    expect(place).toEqual(getPlaceById("p-baikal"));
  });
});
