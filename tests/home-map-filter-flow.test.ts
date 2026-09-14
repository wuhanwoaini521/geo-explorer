/**
 * 首页分类 Tab 原地筛选；只有明确的图鉴/搜索入口才切换地图页。
 *
 * 回归重点：点推荐/山峰/火山等分类时不允许 switchTab，列表必须在首页立即变化。
 */
import { describe, expect, it, beforeAll } from "vitest";

/* ---------------- wx / Page 全局 mock ---------------- */
const wxCalls: Record<string, unknown[][]> = {};
function record(name: string, args: unknown[]): void {
  (wxCalls[name] ||= []).push(args);
}
const wxStorage = new Map<string, unknown>();
(globalThis as Record<string, unknown>).wx = {
  navigateTo: (...a: unknown[]) => record("navigateTo", a),
  switchTab: (...a: unknown[]) => record("switchTab", a),
  navigateBack: (...a: unknown[]) => record("navigateBack", a),
  showToast: (...a: unknown[]) => record("showToast", a),
  setNavigationBarTitle: (...a: unknown[]) => record("setNavigationBarTitle", a),
  getStorageSync: (key: string) => wxStorage.get(key),
  setStorageSync: (key: string, value: unknown) => void wxStorage.set(key, value),
};

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
    inst[key] = typeof value === "function" ? (value as () => void).bind(inst) : value;
  }
  inst.setData = (patch: Record<string, unknown>) => Object.assign(inst.data, patch);
  return inst;
}

function tap(instance: PageDef, handler: string, dataset: Record<string, unknown>): void {
  const fn = instance[handler] as (e: {
    currentTarget: { dataset: Record<string, unknown> };
  }) => void;
  expect(typeof fn, `${handler} 存在`).toBe("function");
  fn.call(instance, { currentTarget: { dataset } });
}

function lastSwitchTabUrl(): string | null {
  const calls = wxCalls.switchTab;
  if (!calls?.length) return null;
  return (calls[calls.length - 1][0] as { url?: string })?.url ?? null;
}

let home: PageDef;
let map: PageDef;

beforeAll(async () => {
  await import("../miniprogram/pages/home/index");
  home = lastPageDef!;
  await import("../miniprogram/pages/map/index");
  map = lastPageDef!;
});

describe("首页分类 Tab 原地筛选", () => {
  it("点击「峡谷」：不跳页，首页列表立即只显示峡谷", () => {
    wxCalls.switchTab = [];
    const h = createInstance(home);
    h.onShow();
    tap(h, "onOpenType", { type: "canyon" });
    expect(lastSwitchTabUrl()).toBeNull();
    expect(h.data.activeType).toBe("canyon");
    expect(h.data.activeTypeLabel).toBe("峡谷地点");
    const scenes = h.data.scenes as Array<{ type: string }>;
    expect(scenes.length).toBeGreaterThan(0);
    for (const scene of scenes) expect(scene.type).toBe("canyon");
  });

  it("从分类切回「推荐」：不跳页，恢复四个推荐探索", () => {
    wxCalls.switchTab = [];
    const h = createInstance(home);
    h.onShow();
    tap(h, "onOpenType", { type: "mountain" });
    tap(h, "onOpenType", { type: "all" });
    expect(lastSwitchTabUrl()).toBeNull();
    expect(h.data.activeType).toBe("all");
    expect(h.data.activeTypeLabel).toBe("推荐探索");
    expect((h.data.scenes as unknown[]).length).toBe(4);
  });

  it("首页搜索确认：落地后图鉴打开并应用关键词", () => {
    const h = createInstance(home);
    h.onShow();
    h.setData({ query: "贝加尔" });
    h.onQueryConfirm();

    const m = createInstance(map);
    m.onLoad();
    m.onShow();
    expect(m.data.query).toBe("贝加尔");
    expect(m.data.atlasOpen).toBe(true);
    const ids = (m.data.atlas as Array<{ id: string }>).map((p) => p.id);
    expect(ids).toContain("p-baikal");
  });

  it("普通进入地图页（无 pending）：不得自动打开图鉴", () => {
    const m = createInstance(map);
    m.onLoad();
    m.onShow();
    expect(m.data.atlasOpen).toBe(false);
  });

  it("点击明确的『在地球上查看』：才切到地图并打开完整图鉴", () => {
    const h = createInstance(home);
    h.onShow();
    tap(h, "onOpenAtlas", {});
    expect(lastSwitchTabUrl()).toContain("/pages/map/index");
    const m = createInstance(map);
    m.onLoad();
    m.onShow();
    expect(m.data.atlasOpen).toBe(true);
    expect(m.data.activeType).toBe("all");
    expect((m.data.atlas as unknown[]).length).toBe(m.data.atlasTotal);
  });
});
