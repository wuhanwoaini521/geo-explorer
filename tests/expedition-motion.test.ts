/**
 * Gate 3.4 Phase 2 — 运动不变式（页面级，端到端）。
 *
 * 审计目标（对应 double-easing / double-smoothing 与到达/里程碑不变式）：
 *   1. 攀登会话期间 current 直接取自 climbFrameAt（唯一 interpolation 源），
 *      不再叠一层 MOTION_GAIN 二次平滑 —— 每帧断言 |current − target| < eps。
 *   2. 到达不变式：会话结束后 abs(实际里程 − 请求目标里程) 可证 < 0.5 m
 *      （精确落定）、climbReq 清空、climbPhase 复位 idle。
 *   3. 里程碑 Event-On 不变式：单会话内 forward → retreat → re-climb 跨同一
 *      里程碑「只记一次」；restart（新会话）后才可再次触发。
 */
import { describe, expect, it, beforeAll, afterEach, vi } from "vitest";
import { driveAtProgress } from "../miniprogram/engine/expedition-driver";

/* ---------------- wx / Page 全局 mock（与 expedition-page.test 同构） ---------------- */
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
  setStorageSync: (key: string, value: unknown) =>
    void wxStorage.set(key, value),
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

/** 确定性落位：把 current/target 直接设到某 progress 再渲染一帧（不启动 ticker） */
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

afterEach(() => {
  vi.useRealTimers();
});

/**
 * 以 fake timers 驱动一次完整 climb 会话，逐步 tick 并在会话存活期逐帧校验
 * 「current === target」（无二手平滑）；返回是否发生实际位移。
 */
/** 读 HUD 海拔数字（elevationText 带千分位，如 "5,615" → 5615） */
function parseElevText(s: string | undefined): number {
  return Number(String(s ?? "").replace(/,/g, "")) || 0;
}

function driveClimbSession(
  inst: PageDef,
  deltaM: number,
  onTick?: (inst: PageDef, now: number) => void,
): void {
  vi.setSystemTime(1000000);
  inst.requestClimb(deltaM);
  expect(inst.climbReq).toBeTruthy();
  const req = inst.climbReq;
  const T0 = req.startedAt;
  const endAt = T0 + req.durationMs + 4000; // 覆盖 settling + arrived + 余量
  let t = T0;
  let prev = inst.current;
  while (t <= endAt) {
    vi.setSystemTime(t);
    inst.tickFrame();
    if (inst.climbReq) {
      // 不变式 1（活跃会话）：渲染位置必须紧跟 climbFrame 目标，无滞后
      expect(Math.abs(inst.current - inst.target)).toBeLessThan(1e-9);
    }
    if (deltaM > 0) {
      expect(inst.current).toBeGreaterThanOrEqual(prev - 1e-9); // 升攀单调
    } else {
      expect(inst.current).toBeLessThanOrEqual(prev + 1e-9); // 降攀单调
    }
    prev = inst.current;
    onTick?.(inst, t);
    t += 16;
  }
}

describe("运动不变式 · 攀登会话单一插值源（无 double-smoothing）", () => {
  it("climb 期间每帧 current === target；到达后精确落位目标里程", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    inst.data.intro = false; // 不处于引导等待
    inst.data.visActive = "TERRAIN";
    inst.data.visMode = "TERRAIN";
    inst.visMode = "TERRAIN";
    const core = inst.expeditionCore;
    const totalM = core.routeIndex.totalDistanceM;

    driveClimbSession(inst, 360);

    // 到达不变式：climbReq 已清空、phase 复位、位置精确 = 请求目标（360 m 处）
    expect(inst.climbReq).toBeNull();
    expect(inst.climbPhase).toBe("idle");
    expect(Math.abs(inst.current * totalM - 360)).toBeLessThan(0.5);
    // UI 也不停留在“攀登中”
    expect(inst.data.expClimbing).toBe(false);
    expect(inst.data.expClimbLabel).toBe("攀登");
    expect(inst.motionAudit.markerUpdates).toBeGreaterThan(12);
    expect(inst.motionAudit.cameraUpdates).toBeGreaterThan(4);
    expect(inst.motionAudit.routeGeometryRebuilds).toBeLessThanOrEqual(1);
    expect(inst.motionAudit.setDataCalls).toBeGreaterThan(inst.motionAudit.markerUpdates);
  });

  it("下降会话同样精确落位（反向 delta 对称）", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    inst.data.intro = false;
    const core = inst.expeditionCore;
    const totalM = core.routeIndex.totalDistanceM;
    // 先升到 1000m 再下降 400m
    vi.setSystemTime(1000000);
    inst.requestClimb(1000);
    const up = inst.climbReq;
    let t = up.startedAt;
    while (t <= up.startedAt + up.durationMs + 4000) {
      vi.setSystemTime(t);
      inst.tickFrame();
      t += 16;
    }
    expect(Math.abs(inst.current * totalM - 1000)).toBeLessThan(0.5);
    driveClimbSession(inst, -400);
    expect(inst.climbReq).toBeNull();
    expect(Math.abs(inst.current * totalM - 600)).toBeLessThan(0.5);
  });

  it("目标越界自动钳制到路线 [0, total]（不产生假海拔）", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    inst.data.intro = false;
    driveClimbSession(inst, 1e9); // 请求巨大增量
    expect(inst.climbReq).toBeNull();
    expect(inst.current).toBeCloseTo(1, 9); // progress 顶格，不超 1
    expect(inst.data.expedition.atSummit).toBe(true);
    expect(inst.data.expSummit.show).toBe(true);
  });

  /**
   * Phase 2 出口评审·「变更即路线里程，海拔只随路线」：
   * 从 0 出发爬 1000m 里程后，HUD 海拔必须等于 canonical driver 的 refM
   * （路线真实剖面），绝不等于起步+1000m 伪高程或 ×1.1 型假推进。
   */
  it("海拔只派生自 driver：爬 1000m 里程 ≠ 固定 +1000m，且与 drive.refM 一致", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    inst.data.intro = false;
    const core = inst.expeditionCore;
    const totalM = core.routeIndex.totalDistanceM;
    const startElNum = parseElevText(inst.data.elevationText);

    driveClimbSession(inst, 1000);
    const endM = inst.current * totalM; // ≈1000（由 session 保证）
    expect(Math.abs(endM - 1000)).toBeLessThan(0.5);
    const hudEl = parseElevText(inst.data.elevationText);
    // 海拔 = 真实路线断面对着的值，绝非 start + 1000：
    expect(hudEl).toBeGreaterThan(0);
    expect(Math.abs(hudEl - (startElNum + 1000))).toBeGreaterThan(50);
    // 非 +10% 型假推进：
    if (startElNum > 0) {
      expect(Math.abs(hudEl / startElNum - 1)).toBeGreaterThan(0.05);
    }
    // 页面高度 = canonical driver（进度轴的 refM 剖面）：
    const driven = driveAtProgress(inst.expeditionCore, inst.current);
    expect(Math.abs(hudEl - driven.refM)).toBeLessThan(1.5);
  });
});

describe("里程碑 Event-Once 不变式（会话内唯一，重开后重置）", () => {
  it("forward → retreat → re-climb：同一里程碑整会话只记一次；restart 后才可再触发", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    const core = inst.expeditionCore;
    const totalM = core.routeIndex.totalDistanceM;

    // 起点（大本营）视为已到，先静态就位
    driveTo(inst, 0);
    expect(inst.crossedMilestoneIds.length).toBe(1); // 仅 base-camp 预置

    // forward：0 → 4400m（progress 0.34）跨过 昆布冰瀑(2012) 与 C1(3727)
    driveTo(inst, 4400 / totalM);
    let crossed = inst.crossedMilestoneIds;
    expect(crossed.includes("khumbu-icefall")).toBe(true);
    expect(crossed.includes("camp-i")).toBe(true);
    expect(crossed.filter((id: string) => id === "khumbu-icefall").length).toBe(
      1,
    );
    expect(crossed.filter((id: string) => id === "camp-i").length).toBe(1);
    // 瀑布横幅出现过
    expect(inst.data.milestoneBanner && inst.data.milestoneBanner.show).toBe(
      true,
    );

    // retreat：4500 → 500m（一路回撤，icefall/C1 再次进入区间，但已触发过 → 不重复）
    driveTo(inst, 500 / totalM);
    crossed = inst.crossedMilestoneIds;
    expect(crossed.filter((id: string) => id === "khumbu-icefall").length).toBe(
      1,
    );
    expect(crossed.filter((id: string) => id === "camp-i").length).toBe(1);

    // re-climb：500 → 8000m 再次经过 icefall/C1，并新跨越 C2(7319) —— ice/C1 只记首次
    driveTo(inst, 8000 / totalM);
    crossed = inst.crossedMilestoneIds;
    expect(crossed.includes("khumbu-icefall")).toBe(true);
    expect(crossed.includes("camp-i")).toBe(true);
    expect(crossed.includes("western-cwm-camp-ii")).toBe(true); // 新越过 C2(7319)
    expect(crossed.filter((id: string) => id === "khumbu-icefall").length).toBe(
      1,
    );
    expect(crossed.filter((id: string) => id === "camp-i").length).toBe(1);
    expect(
      crossed.filter((id: string) => id === "western-cwm-camp-ii").length,
    ).toBe(1);

    // restart：新会话重置记账 → 再攀 C1 可再次触发（新会话 Event Once 重置）
    inst.onRestart();
    expect(inst.crossedMilestoneIds.length).toBe(1); // 仅 base-camp
    driveTo(inst, 4400 / totalM);
    crossed = inst.crossedMilestoneIds;
    expect(crossed.includes("khumbu-icefall")).toBe(true);
    expect(crossed.includes("camp-i")).toBe(true);
    expect(crossed.filter((id: string) => id === "khumbu-icefall").length).toBe(
      1,
    );
    expect(crossed.filter((id: string) => id === "camp-i").length).toBe(1);
  });

  it("率先越岭（回到大本营边缘）不产生新事件，再越 C1 仍只记一次", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    const totalM = inst.expeditionCore.routeIndex.totalDistanceM;
    driveTo(inst, 0);
    driveTo(inst, 4000 / totalM); // 跨 C1（3727m）
    expect(inst.crossedMilestoneIds.includes("camp-i")).toBe(true);
    driveTo(inst, 0); // 回到大本营（base-camp 已预置，不重复）
    const countAtCamp = () =>
      inst.crossedMilestoneIds.filter((id: string) => id === "camp-i").length;
    expect(countAtCamp()).toBe(1);
    driveTo(inst, 4000 / totalM); // 再越 C1 → 仍只记一次
    expect(countAtCamp()).toBe(1);
  });
});
