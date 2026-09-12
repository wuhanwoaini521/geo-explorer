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
import { deriveState } from "../miniprogram/engine/exploration-engine";

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

  it("LIVE 回退 TERRAIN 后仍会挂载真实山体路线（路线/waypoint/marker 同一投影）", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    // 模拟实景资源解码失败后的会话状态：当前应诚实回退 DEM，但不能丢路线。
    inst.visBroken = true;
    inst.visMode = "TERRAIN";
    inst.data.visActive = "TERRAIN";
    driveTo(inst, 0.67);
    const data = inst.data as Record<string, any>;
    // 山体路径几何（Terrain-Conforming Route）：已走段 + 全部 8 个真实节点
    expect(data.conceptRoute?.segments.length).toBeGreaterThan(2);
    expect(data.conceptRoute?.completedSegments.length).toBeGreaterThan(2);
    expect(data.conceptRoute?.points).toHaveLength(8);
    // waypoint 由路径吸附定位（同一投影函数），坐标为山体图层内的百分比
    for (const point of data.conceptRoute.points as Array<{ style: string }>) {
      expect(point.style).toMatch(/^left:[\d.]+%;top:[\d.]+%;$/);
    }
    // Explorer Marker 沿路径插值（不是节点瞬移），位置随进度连续
    expect(data.conceptRouteMarker).toEqual(
      expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
    );
    const at67 = { ...data.conceptRouteMarker };
    driveTo(inst, 0.69);
    expect(
      (inst.data as Record<string, any>).conceptRouteMarker.x,
    ).not.toBe(at67.x);
  });

  it("点击山体途经点：未到达只给名称/海拔，到达后解锁实景图与知识", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    inst.onTapExpeditionWaypoint({ currentTarget: { dataset: { id: "camp-i" } } });
    const locked = inst.data.waypointCard as Record<string, any>;
    expect(locked).toEqual(
      expect.objectContaining({ show: true, title: "C1 营地", unlocked: false }),
    );
    expect(locked.image).toBeUndefined();

    driveTo(inst, 0.3); // 越过 C1（里程碑进度 0.28766）
    inst.onTapExpeditionWaypoint({ currentTarget: { dataset: { id: "camp-i" } } });
    const card = inst.data.waypointCard as Record<string, any>;
    expect(card.unlocked).toBe(true);
    expect(card.title).toBe("C1 营地");
    expect(card.titleEn).toBe("Camp I");
    expect(card.altitudeText).toBe("6,065 m");
    expect(card.landform).toBe("冰川谷地");
    expect(card.terrain).toBeTruthy();
    expect(card.facts.length).toBeGreaterThan(0);
    expect(card.image).toBe("/assets/expeditions/everest/waypoints/camp-i.jpg");
    expect(card.images.length).toBe(1);
    // 点击旧节点只回看知识，不改变当前攀登位置
    expect(inst.current).toBeCloseTo(0.3, 3);
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
    expect(Number(v.remainingVerticalText.replace(/,/g, ""))).toBeGreaterThan(
      0,
    );
    // C1 → 下一站为 C2（西库姆冰谷段）
    expect(v.currentName).toContain("C1");
    expect(v.nextName).toContain("C2");
    // 环境三指标均由 MODEL/REFERENCE 解析出文本
    expect(v.pressText).toContain("hPa");
    expect(v.tempText).toContain("°");
    expect(v.oxygenText).toMatch(/^\d/);
    expect(v.deathZone).toBe(false);
  });

  it("到达提示优先于阶段提示：同一时刻不渲染两张重叠横幅", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    inst.data.milestoneBanner = { show: true, title: "南坳", biome: "段 5/7", emoji: "" };
    inst.showStageBanner({
      id: "stage-4",
      name: "陡峭冰壁",
      biome: "段 4/7",
      emoji: "",
    });
    expect(inst.data.stageBanner.show).toBe(false);
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
    // 同一帧跨过里程碑时，到达提示优先，阶段提示不再与它重叠。
    expect(data.stageBanner.show).toBe(false);
    expect(data.milestoneBanner.show).toBe(true);
    expect(inst.visitedStageIds.indexOf("western-cwm") >= 0).toBe(true);
    driveTo(inst, 0.99); // 冲顶（index 6 / 段 7）
    data = inst.data as Record<string, any>;
    expect(data.stageBanner.show).toBe(false);
    expect(data.milestoneBanner.show).toBe(true);
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

  it("查看路线：真实全景 sheet（不再仅 toast）", () => {
    wxCalls.showToast = [];
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    inst.onViewRoute();
    expect(wxCalls.showToast.length).toBe(0);
    const ov = inst.data.routeOverview;
    expect(ov && ov.show).toBe(true);
    expect(ov.totalKmText).toMatch(/km/);
    expect(ov.stages.length).toBeGreaterThanOrEqual(7);
    expect(ov.milestones.length).toBeGreaterThanOrEqual(8);
  });

  it("攀登动画期间锁定手势，避免滑动与按钮同时改写路线位置", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    inst.data.intro = false;
    inst.requestClimb(360);

    expect(inst.data.expClimbing).toBe(true);
    inst.onTouchStart({ touches: [{ clientY: 300 }] });
    expect(inst.touching).toBe(false);
    inst.onTouchMove({ touches: [{ clientY: 120 }] });
    expect(inst.climbReq).toBeTruthy();
  });

  it("背景与路线同一相机视图：transform 同源、锚点=marker、zoom 随攀登持续推近", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    inst.data.intro = false;
    inst.data.visActive = "TERRAIN";
    inst.visMode = "TERRAIN";
    inst.visBroken = true;

    const parseScale = (t: string | undefined): number => {
      const m = String(t ?? "").match(/scale\(([\d.]+)\)/);
      return m ? Number(m[1]) : 0;
    };

    // 起步段：路线变换 = 相机位移 + 缩放（与 hero/LIVE 背景同一 transform 结构）
    driveTo(inst, 0.03);
    let data = inst.data as Record<string, any>;
    expect(data.routeLayerTransform).toMatch(/^translate3d\(.+\) scale\(/);
    const baseScale = parseScale(data.routeLayerTransform);
    expect(baseScale).toBeGreaterThan(1.2);
    // 锚点与 marker 同源：背景以当前攀登位置为原点缩放
    expect(data.routeAnchorX).toBe(data.conceptRouteMarker.x);
    expect(data.routeAnchorY).toBe(data.conceptRouteMarker.y);
    expect(Number(data.routeAnnotationScale)).toBeCloseTo(1 / baseScale, 2);

    // 向峰顶推进：zoom 单调增大（1.30 → 2.56），背景持续向山体推近
    const prevY = data.conceptRouteMarker.y;
    driveTo(inst, 0.97);
    data = inst.data as Record<string, any>;
    const topScale = parseScale(data.routeLayerTransform);
    expect(topScale).toBeGreaterThan(baseScale + 0.4);
    expect(topScale).toBeLessThanOrEqual(1.92);
    expect(Number(data.routeAnnotationScale)).toBeCloseTo(1 / topScale, 2);
    // 攀登推进后 marker 向上移动（y 减小）——背景/路线一起动，不脱节
    expect(data.conceptRouteMarker.y).toBeLessThan(prevY);
    expect(data.routeAnchorY).toBe(data.conceptRouteMarker.y);
  });

  it("LIVE 实景模式：路线层=相机 zoom×实景 crop 缩放，锚点与 marker 保持一致", () => {
    const inst = createInstance(pageDef);
    inst.onLoad({ id: "everest" });
    inst.data.intro = false;
    // 模拟 LIVE 可用（crop zoom 1）且已挂载实景
    inst.data.visActive = "LIVE";
    inst.visMode = "LIVE";
    inst.data.liveCropUi = { focusX: 50, focusY: 38, zoom: 1.35 };
    inst.visLiveSrc = "/assets/expeditions/everest/live/live-a-kala-patthar.jpg";
    inst.visMountedSrc = inst.visLiveSrc;
    inst.data.visLiveReady = true;

    driveTo(inst, 0.1);
    // tickFrame 会按场景数据刷新 crop；这里再注入非 1 的合成 crop，直接重绘一帧验证
    // viewScale = camZoomB × cropScale，避免把“crop 已经生效”误测成固定默认值。
    inst.data.liveCropUi = { focusX: 50, focusY: 38, zoom: 1.35 };
    inst.renderFrame(
      inst.exploration,
      deriveState(inst.exploration, inst.current, []),
      inst.current,
    );
    const data = inst.data as Record<string, any>;
    const scale = Number(
      String(data.routeLayerTransform).match(/scale\(([\d.]+)\)/)?.[1] ?? 0,
    );
    // LIVE camera 推近 + 实景 crop 缩放叠加；crop 已进入同一 image transform，不能再单独缩放一次。
    expect(scale).toBeCloseTo(Number(data.viewZoom.b) * 1.35, 3);
    expect(data.liveCropUi.zoom).toBe(1.35);
    expect(data.routeAnchorX).toBe(data.conceptRouteMarker.x);
    expect(data.routeAnchorY).toBe(data.conceptRouteMarker.y);
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
