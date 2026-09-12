/**
 * 首页分类入口 → 地图页「真的能看到筛选结果」—— 跨页面流程回归。
 *
 * 背景（用户实际报告）：「推荐 / 山峰 / 火山…」点了之后跳到一个还在转的地球，
 * 什么都没筛出来。旧测试只断言了「switchTab 到 /pages/map/index」和
 * 「activeType 被置位」，于是这个洞里藏着两个真实缺陷：
 *   - 图鉴抽屉没有自动打开，筛选结果渲染在关着的抽屉里；
 *   - 用户看到的地球照转，视觉上等同于「点了没反应」。
 *
 * 本文件断言的是**用户可见的最终状态**（图鉴打开 + 结果集正确），而不是中间态。
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

describe("首页分类入口 → 地图页展示筛选结果", () => {
  it("点击「峡谷」：跳转地图，且落地后图鉴已打开、只剩峡谷", () => {
    wxCalls.switchTab = [];
    const h = createInstance(home);
    h.onShow();
    tap(h, "onOpenType", { type: "canyon" });
    expect(lastSwitchTabUrl()).toContain("/pages/map/index");

    const m = createInstance(map);
    m.onLoad();
    expect(m.data.atlasOpen, "onLoad 不应自动打开图鉴").toBe(false);
    m.onShow();

    expect(m.data.activeType).toBe("canyon");
    expect(m.data.atlasOpen, "用户必须能看到筛选结果，而不是一个还在转的地球").toBe(true);
    const atlas = m.data.atlas as Array<{ typeLabel: string }>;
    expect(atlas.length).toBeGreaterThan(0);
    for (const place of atlas) expect(place.typeLabel).toBe("峡谷");
  });

  it("点击「推荐」：落地后图鉴打开且为全部类型", () => {
    const h = createInstance(home);
    h.onShow();
    tap(h, "onOpenAtlas", {});

    const m = createInstance(map);
    m.onLoad();
    m.onShow();
    expect(m.data.activeType).toBe("all");
    expect(m.data.atlasOpen).toBe(true);
    expect((m.data.atlas as unknown[]).length).toBe(m.data.atlasTotal);
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

  it("图鉴打开后不再启动地球渲染（避免后台空转）", () => {
    const h = createInstance(home);
    h.onShow();
    tap(h, "onOpenType", { type: "desert" });
    const m = createInstance(map);
    m.onLoad();
    m.onShow();
    // 打开图鉴的分支必须提前 return，不能走到 resumeRotation/start
    expect(m.data.atlasOpen).toBe(true);
    expect(m.data.globeSelectedMode).toBe(false);
  });
});
