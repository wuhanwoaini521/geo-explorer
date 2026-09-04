/**
 * 页面逻辑测试（Node 环境，mock wx / Page 全局）。
 * 覆盖：首页装配（场景/精选/分类/冷知识）、地图页图鉴（搜索/筛选/空态）、
 * 地点详情页（数据组装/收藏/关联/非法 id 兜底）。
 */
import { describe, expect, it, beforeAll, vi } from "vitest";

/* ---------------- wx / Page 全局 mock ---------------- */
const wxCalls: Record<string, unknown[][]> = {};
function record(name: string, args: unknown[]): void {
  (wxCalls[name] ||= []).push(args);
}
/** 简易本地存储（供 defaultStorage 注入） */
const wxStorage = new Map<string, unknown>();
const wxMock = {
  navigateTo: (...args: unknown[]) => record("navigateTo", args),
  switchTab: (...args: unknown[]) => record("switchTab", args),
  navigateBack: (...args: unknown[]) => record("navigateBack", args),
  showToast: (...args: unknown[]) => record("showToast", args),
  showModal: (...args: unknown[]) => record("showModal", args),
  getStorageSync: (key: string) => wxStorage.get(key),
  setStorageSync: (key: string, value: unknown) => void wxStorage.set(key, value),
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

/** 用 Page 定义创建一个可交互实例（setData 合并 data） */
function createInstance(def: PageDef): PageDef & {
  data: Record<string, unknown>;
  setData(patch: Record<string, unknown>): void;
} {
  const inst = Object.create(null) as PageDef;
  inst.data = JSON.parse(JSON.stringify(def.data));
  for (const [key, value] of Object.entries(def)) {
    if (key === "data") continue;
    inst[key] = typeof value === "function" ? (value as () => void).bind(inst) : value;
  }
  inst.setData = (patch: Record<string, unknown>) => {
    Object.assign(inst.data, patch);
  };
  return inst as never;
}

function tap(instance: PageDef, handler: string, dataset: Record<string, unknown>): void {
  const fn = instance[handler] as (e: { currentTarget: { dataset: Record<string, unknown> } }) => void;
  expect(typeof fn, `${handler} 存在`).toBe("function");
  fn.call(instance, { currentTarget: { dataset } });
}

/** 最近一次 navigateTo / switchTab 的目标 url（无调用时为 null） */
function lastNavUrl(name: "navigateTo" | "switchTab"): string | null {
  const calls = wxCalls[name];
  if (!calls?.length) return null;
  const arg = calls[calls.length - 1][0] as { url?: string } | undefined;
  return arg?.url ?? null;
}

let home: PageDef, map: PageDef, place: PageDef;

beforeAll(async () => {
  await import("../miniprogram/pages/home/index");
  home = lastPageDef!;
  await import("../miniprogram/pages/map/index");
  map = lastPageDef!;
  await import("../miniprogram/pages/place/index");
  place = lastPageDef!;
});

/* ---------------- 首页 ---------------- */
describe("首页装配", () => {
  it("onShow 组装场景 / 精选 / 分类 / 冷知识", () => {
    const inst = createInstance(home);
    inst.onShow();
    const data = inst.data as Record<string, any>;
    expect(data.scenes.length).toBeGreaterThanOrEqual(1);
    expect(data.featured.length).toBeGreaterThanOrEqual(6);
    expect(data.types.length).toBe(11);
    expect(data.discovery).toBeTruthy();
    expect(data.placeCount).toBeGreaterThanOrEqual(40);
    // 精选卡带类型标签与高程文案（可探索地点显示「可沉浸探索」）
    for (const f of data.featured) {
      expect(f.name).toBeTruthy();
      expect(f.typeLabel).toBeTruthy();
      expect(f.exploration ? f.explorText : f.explorText).toMatch(/m$|可沉浸探索/);
    }
  });

  it("换一条冷知识：不再返回上一条", () => {
    const inst = createInstance(home);
    inst.onShow();
    const before = (inst.data as Record<string, any>).discovery.id;
    inst.onShuffleDiscovery();
    const after = (inst.data as Record<string, any>).discovery.id;
    expect(after).not.toBe(before);
  });

  it("点击精选卡 → navigateTo 地点详情；点击分类 → switchTab 地图并携带筛选", () => {
    wxCalls.navigateTo = [];
    wxCalls.switchTab = [];
    const inst = createInstance(home);
    tap(inst, "onOpenFeatured", { id: "p-baikal" });
    expect(lastNavUrl("navigateTo")).toContain("/pages/place/index?id=p-baikal");
    tap(inst, "onOpenType", { type: "desert" });
    expect(lastNavUrl("switchTab")).toContain("/pages/map/index");
  });
});

/* ---------------- 地图页（世界图鉴） ---------------- */
describe("地图页图鉴", () => {
  it("onLoad：场景列表与图鉴全量", () => {
    const inst = createInstance(map);
    inst.onLoad();
    const data = inst.data as Record<string, any>;
    expect(data.open.length).toBeGreaterThanOrEqual(1);
    expect(data.atlas.length).toBe(data.atlasTotal);
    expect(data.types[0].label).toBe("全部");
    expect(data.types.length).toBe(12); // 全部 + 11 类
  });

  it("类型筛选：沙漠 → 仅沙漠地点", () => {
    const inst = createInstance(map);
    inst.onLoad();
    tap(inst, "onTypeTap", { type: "desert" });
    const data = inst.data as Record<string, any>;
    expect(data.atlas.length).toBeGreaterThanOrEqual(2);
    for (const p of data.atlas) expect(p.typeLabel).toBe("沙漠");
  });

  it("关键词搜索：中文命中；清空恢复全量", () => {
    const inst = createInstance(map);
    inst.onLoad();
    inst.onQueryInput({ detail: { value: "贝加尔" } });
    let data = inst.data as Record<string, any>;
    expect(data.atlas.map((p: any) => p.id)).toContain("p-baikal");
    expect(data.atlasEmpty).toBe(false);
    inst.onQueryClear();
    data = inst.data as Record<string, any>;
    expect(data.atlas.length).toBe(data.atlasTotal);
  });

  it("搜索无结果 → 空态标志置位", () => {
    const inst = createInstance(map);
    inst.onLoad();
    inst.onQueryInput({ detail: { value: "不存在的地点xyz" } });
    const data = inst.data as Record<string, any>;
    expect(data.atlas.length).toBe(0);
    expect(data.atlasEmpty).toBe(true);
  });

  it("类型 + 关键词组合：交集为空 → 空态", () => {
    const inst = createInstance(map);
    inst.onLoad();
    tap(inst, "onTypeTap", { type: "desert" });
    inst.onQueryInput({ detail: { value: "贝加尔" } });
    const data = inst.data as Record<string, any>;
    expect(data.atlas.length).toBe(0);
    expect(data.atlasEmpty).toBe(true);
  });

  it("点击地点卡 → navigateTo 地点详情", () => {
    wxCalls.navigateTo = [];
    const inst = createInstance(map);
    inst.onLoad();
    tap(inst, "onOpenPlace", { id: "p-everest" });
    expect(lastNavUrl("navigateTo")).toContain("id=p-everest");
  });
});

/* ---------------- 地点详情页 ---------------- */
describe("地点详情页", () => {
  it("珠峰详情：海拔语义/关联场景/关联知识", () => {
    const inst = createInstance(place);
    inst.onLoad({ id: "p-everest" });
    const data = inst.data as Record<string, any>;
    expect(data.place.name).toBe("珠穆朗玛峰");
    expect(data.place.elevLabel).toBe("海拔");
    expect(data.place.elevText).toBe("8,848.86 m");
    expect(data.place.explorationId).toBe("everest");
    expect(data.knowledge.length).toBeGreaterThanOrEqual(1);
    expect(data.related.length).toBeGreaterThan(0);
    expect(data.related.length).toBeLessThanOrEqual(4);
    expect(data.related.some((r: any) => r.id === "p-everest")).toBe(false);
  });

  it("海沟详情：显示深度语义", () => {
    const inst = createInstance(place);
    inst.onLoad({ id: "p-mariana" });
    const data = inst.data as Record<string, any>;
    expect(data.place.elevLabel).toBe("深度");
    expect(data.place.elevText).toBe("10,912 m");
    expect(data.place.explorationId).toBe("mariana");
  });

  it("非法 id：toast + 返回上页兜底", () => {
    wxCalls.showToast = [];
    wxCalls.navigateBack = [];
    vi.useFakeTimers();
    const inst = createInstance(place);
    inst.onLoad({ id: "p-ghost" });
    expect(wxCalls.showToast.length).toBe(1);
    vi.runAllTimers();
    vi.useRealTimers();
    expect(wxCalls.navigateBack.length).toBe(1);
    expect((inst.data as Record<string, unknown>).place).toBeNull();
  });

  it("收藏切换：状态与 toast 联动", () => {
    wxCalls.showToast = [];
    const inst = createInstance(place);
    inst.onLoad({ id: "p-fuji" });
    const before = (inst.data as Record<string, any>).favorited;
    tap(inst, "onToggleFavorite", {});
    const after = (inst.data as Record<string, any>).favorited;
    expect(after).toBe(!before);
    expect(wxCalls.showToast.length).toBe(1);
    // 再切换恢复
    tap(inst, "onToggleFavorite", {});
    expect((inst.data as Record<string, any>).favorited).toBe(before);
  });

  it("相关地点 / 知识条目点击 → 正确跳转", () => {
    wxCalls.navigateTo = [];
    const inst = createInstance(place);
    inst.onLoad({ id: "p-everest" });
    const data = inst.data as Record<string, any>;
    tap(inst, "onOpenRelated", { id: data.related[0].id });
    expect(lastNavUrl("navigateTo")).toContain("/pages/place/index?id=");
    tap(inst, "onOpenKnowledge", { id: data.knowledge[0].id });
    expect(lastNavUrl("navigateTo")).toContain("/pages/knowledge-detail/index?id=");
  });
});
