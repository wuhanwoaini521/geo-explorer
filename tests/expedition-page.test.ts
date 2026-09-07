/**
 * Gate 3 页面级测试：探索页「路线模式」（Expedition 附件 → 真实路线驱动）。
 * Node 环境 mock wx / Page；直接调用页面方法（不启动 ticker）验证：
 *   - Everest V2 → routeMode 开启、真实路线 HUD 起飞于南坡大本营
 *   - Mariana（无 V2 附件）→ 回落旧海拔轴
 *   - 中间里程：current/next 途经点、剩余里程、阶段/死亡区/环境指标
 *   - 终点：progress=1 → 峰顶 8,848.86、轻提示（无旧庆祝大层）、死亡区关闭
 *   - 重制 / 查看路线占位
 */
import { describe, expect, it, beforeAll } from "vitest";
import { getExpeditionById } from "../miniprogram/data/expeditions/index";

/* ---------------- wx / Page 全局 mock ---------------- */
const wxCalls: Record<string, unknown[][]> = {};
function record(name: string, args: unknown[]): void {
  (wxCalls[name] ||= []).push(args);
}
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

/** 用 Page 定义创建实例（setData 合并 data；方法绑定实例） */
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

/** 确定性推进：设 current=target 并渲染一帧 */
function driveTo(inst: PageDef, p: number): void {
  inst.current = p;
  inst.target = p;
  inst.tickFrame();
}

let pageDef: PageDef;

beforeAll(async () => {
  await import("../miniprogram/pages/exploration/index");
  pageDef = lastPageDef!;
});

/* ---------------- Everest V2：进入真实路线模式 ---------------- */
describe("探索页路线模式（Everest V2）", () => {
  it("onLoad(id=everest)：进入 routeMode；HUD 起飞于路线起点（大本营）", () => {
    const exp = getExpeditionById("everest");
    expect(exp).toBeTruthy();
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    expect(inst.routeMode).toBe(true);
    expect(inst.expeditionCore).toBeTruthy();
    const data = inst.data as Record<string, any>;
    expect(data.routeMode).toBe(true);

    // 首帧（rebase 到起点）
    driveTo(inst, 0);
    const v = data.expedition as Record<string, any>;
    expect(v.progress).toBe(0);
    expect(v.pct).toBe(0);
    expect(v.currentName).toBe("南坡大本营");
    expect(v.distanceText).toBe("0 m");
    expect(v.remainingRouteText).toBe("13.0 km");
    expect(v.deathZone).toBe(false);
    expect(v.atSummit).toBe(false);
  });

  it("途中（progress=0.5）：真实里程 / 当前·下一站 / 剩余垂直参考差", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    driveTo(inst, 0.5);
    const data = inst.data as Record<string, any>;
    const v = data.expedition as Record<string, any>;
    // 0.5 × 12,955.8 m ≈ 6,478 m
    expect(v.progress).toBeCloseTo(0.5, 2);
    expect(v.pct).toBe(50);
    expect(v.distanceText).toBe("6,478 m");
    expect(v.remainingRouteText).toBe("6.5 km");
    expect(v.currentName).toBeTruthy();
    expect(v.prevName).toBeTruthy();
    expect(v.nextName).toBeTruthy();
    expect(Number(v.remainingVerticalText.replace(/,/g, ""))).toBeGreaterThan(0);
    // C1 → 下一站为 C2（西库姆冰谷段）
    expect(v.currentName).toContain("C1");
    expect(v.nextName).toContain("C2");
    // 环境三指标均由 MODEL/REFERENCE 解析出文本
    expect(v.pressText).toContain("hPa");
    expect(v.tempText).toContain("°");
    expect(v.oxygenText).toMatch(/^\d/);
    expect(v.deathZone).toBe(false);
  });

  it("死亡区：ref≥8000 且未到顶 → expDeathZone=true、氧气文案压制", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    driveTo(inst, 0.89); // ≈11,531 m、ref≈8,045（南坳上方，越过 8000）
    const data = inst.data as Record<string, any>;
    const v = data.expedition as Record<string, any>;
    expect(data.expDeathZone).toBe(true);
    expect(v.deathZone).toBe(true);
    expect(v.oxygenText).toBe("≤ 30%");
    expect(v.atSummit).toBe(false);
  });

  it("七大阶段：跨段触发阶段横幅（克制，首过记录）", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    inst.onStartClimb(); // 关闭引导页后横幅才出现（与旧模式一致）
    driveTo(inst, 0.5); // 西库姆冰谷（index 2 / 段 3）
    let data = inst.data as Record<string, any>;
    expect(data.stageBanner.show).toBe(true);
    expect(data.stageBanner.title).toContain("西库姆");
    expect(inst.visitedStageIds.indexOf("western-cwm") >= 0).toBe(true);
    driveTo(inst, 0.99); // 冲顶（index 6 / 段 7）
    data = inst.data as Record<string, any>;
    expect(data.stageBanner.title).toContain("冲顶");
    expect(inst.visitedStageIds.indexOf("summit-push") >= 0).toBe(true);
  });

  it("登顶：progress=1 → 8,848.86、轻提示卡片、不触发旧庆祝/登顶大屏", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    driveTo(inst, 1);
    const data = inst.data as Record<string, any>;
    const v = data.expedition as Record<string, any>;
    expect(v.atSummit).toBe(true);
    expect(v.deathZone).toBe(false);
    expect(v.currentElevText).toBe("8,848.86");
    expect(v.remainingVerticalText).toBe("0");
    expect(v.remainingRouteText).toBe("0.0 km");
    // 轻提示卡片：唯一峰顶展示高程 + 坐标 + 文案
    expect(data.expSummit).toBeTruthy();
    expect(data.expSummit.show).toBe(true);
    expect(data.expSummit.altitudeText).toBe("8,848.86");
    expect(data.expSummit.latText.length).toBeGreaterThan(3);
    expect(data.expSummit.lonText.length).toBeGreaterThan(3);
    expect(data.expSummit.note).toContain("世界最高点");
    // 旧大屏/庆祝标志绝不被置起（峰顶地形优先）
    expect(data.summit).toBe(false);
    expect(data.celebration).toBe(false);
    expect(inst.celebrated).toBe(true);
  });

  it("重制：回到起点并清空登顶 / 死亡状态", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    driveTo(inst, 1);
    expect((inst.data as Record<string, any>).expSummit).toBeTruthy();
    inst.onRestart();
    const data = inst.data as Record<string, any>;
    expect(data.expSummit).toBeNull();
    expect(data.expDeathZone).toBe(false);
    expect(data.expedition.pct).toBe(0);
    expect(inst.current).toBe(0);
    expect(inst.target).toBe(0);
    expect(inst.celebrated).toBe(false);
    expect(inst.hudElevation).toBe(5364);
  });

  it("查看路线占位：仅 toast（Gate 4+ 视觉延后）", () => {
    wxCalls.showToast = [];
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    inst.onViewRoute();
    expect(wxCalls.showToast.length).toBe(1);
  });
});

/* ---------------- Mariana（无 Expedition 附件）：旧探索兼容 ---------------- */
describe("Mariana 兼容（无 V2 附件）", () => {
  it("onLoad(id=mariana)：停留在旧海拔模式", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "mariana" });
    expect(inst.routeMode).toBe(false);
    expect(inst.expeditionCore).toBeNull();
    expect((inst.data as Record<string, any>).routeMode).toBe(false);
  });

  it("旧模式 tickFrame 仍走海拔轴（不产出 Exhibition HUD 派生）", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "mariana" });
    inst.current = 8000;
    inst.target = 8000;
    inst.tickFrame();
    const data = inst.data as Record<string, any>;
    expect(data.routeMode).toBe(false);
    expect(data.maxElevation).toBeGreaterThan(8000);
    // Expedition HUD 派生保持空态
    expect(data.expedition.currentName).toBe("");
    expect(data.expDeathZone).toBe(false);
  });
});