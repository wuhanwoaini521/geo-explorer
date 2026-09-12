/**
 * UI 静态一致性检查 —— WXML 事件绑定 ↔ Page/Component 方案对照。
 * 替代「必须打开开发者工具才能发现绑定丢失」：任何 bindtap/catchtap
 * 引用的处理函数必须真实存在于页面定义中，否则测试失败。
 * （本测试同时 mock wx/Page/Component 以便在 Node 中 import 页面模块。）
 */
import { describe, expect, it, beforeAll } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "miniprogram");
const PAGES_DIR = join(ROOT, "pages");
const COMPONENTS_DIR = join(ROOT, "components");

/* ---------------- 全局 mock ---------------- */
(globalThis as Record<string, unknown>).wx = {
  navigateTo: () => {},
  switchTab: () => {},
  navigateBack: () => {},
  showToast: () => {},
  showModal: () => {},
  request: () => {},
  getStorageSync: () => undefined,
  setStorageSync: () => {},
  createIntersectionObserver: () => ({ observe: () => {} }),
};
const pageDefs = new Map<string, Record<string, any>>();
(globalThis as Record<string, unknown>).Page = (def: Record<string, any>) => {
  const stack = new Error().stack ?? "";
  const match = stack.match(/pages[/\\]([a-z-]+)[/\\]/i);
  pageDefs.set(match ? match[1] : `__page_${pageDefs.size}`, def);
};
const componentDefs: Array<{ tag: string; def: Record<string, any> }> = [];
(globalThis as Record<string, unknown>).Component = (
  def: Record<string, any>,
) => {
  componentDefs.push({
    tag: componentDefs.length === 0 ? "knowledge-popup" : "unknown",
    def,
  });
};
(globalThis as Record<string, unknown>).App = () => {};
(globalThis as Record<string, unknown>).getApp = () => ({ globalData: {} });

beforeAll(async () => {
  for (const name of readdirSync(PAGES_DIR) as string[]) {
    const dir = join(PAGES_DIR, name);
    if (!statSync(dir).isDirectory()) continue;
    await import(`../miniprogram/pages/${name}/index`);
  }
  // @ts-expect-error —— 组件由全局 Component() 注册，非 ES 模块（仅运行时加载）
  await import("../miniprogram/components/knowledge-popup/index");
});

/** 从 WXML 抽取事件处理器名（bind / catch / bind:xxx / catch:xxx） */
function extractHandlers(wxml: string): string[] {
  const handlers = new Set<string>();
  const re = /(?:bind|catch)(?::|\b)[\w-]*?=?["']([A-Za-z_][\w]*)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(wxml))) handlers.add(m[1]);
  return [...handlers];
}

/** 列出某页面目录下全部 wxml（含组件引用 wxml 不在本页 —— 仅本页 wxml） */
function pageWxmlFiles(page: string): string[] {
  const dir = join(PAGES_DIR, page);
  return readdirSync(dir)
    .filter((f: string) => f.endsWith(".wxml"))
    .map((f) => join(dir, f));
}

describe("WXML 事件绑定 ↔ 页面方法一致性", () => {
  it("页面模块均已注册（13 页 + 1 组件）", () => {
    expect(pageDefs.size).toBe(13);
    expect(componentDefs.length).toBe(1);
  });

  for (const name of readdirSync(PAGES_DIR) as string[]) {
    if (!statSync(join(PAGES_DIR, name)).isDirectory()) continue;
    it(`pages/${name}：WXML 引用的处理函数都存在`, () => {
      const def = pageDefs.get(name);
      expect(def, `页面 ${name} 已注册`).toBeTruthy();
      for (const file of pageWxmlFiles(name)) {
        const wxml = readFileSync(file, "utf-8");
        for (const handler of extractHandlers(wxml)) {
          expect(typeof def![handler], `${name} ← ${handler} (${file})`).toBe(
            "function",
          );
        }
      }
    });
  }

  it("knowledge-popup：组件 WXML 触发的事件都有 triggerEvent 定义或处理函数", () => {
    const comp = componentDefs[0];
    expect(comp).toBeTruthy();
    const wxml = readFileSync(
      join(COMPONENTS_DIR, "knowledge-popup", "index.wxml"),
      "utf-8",
    );
    for (const handler of extractHandlers(wxml)) {
      const ok =
        typeof comp.def.methods?.[handler] === "function" ||
        typeof comp.def[handler] === "function";
      expect(ok, `knowledge-popup ← ${handler}`).toBe(true);
    }
  });
});

/** 防止误报：如果某个页面 wxml 引用了组件的自定义事件（bind:xxx），
 *  该事件名应出现在页面 ts 的对应组件标签或被组件 triggerEvent —— 抽查 */
describe("自定义组件事件命名", () => {
  it("knowledge-popup 触发的事件（triggerEvent）均为 close/continue", () => {
    const ts = readFileSync(
      join(COMPONENTS_DIR, "knowledge-popup", "index.ts"),
      "utf-8",
    );
    const triggers = [...ts.matchAll(/triggerEvent\(["']([\w-]+)["']/g)].map(
      (m) => m[1],
    );
    expect(triggers.length).toBeGreaterThanOrEqual(2);
    for (const t of triggers) expect(["close", "continue"]).toContain(t);
  });
});

describe("探索页视觉约束", () => {
  it("不再渲染与当前界面不匹配的人形装饰", () => {
    const wxml = readFileSync(join(PAGES_DIR, "exploration", "index.wxml"), "utf-8");
    const wxss = readFileSync(join(PAGES_DIR, "exploration", "index.wxss"), "utf-8");
    expect(wxml).not.toMatch(/climber|hillman|🧗|🤿/);
    expect(wxss).not.toMatch(/\.climber|\.hillman|\.m-climber/);
  });

  it("探索进度 HUD 保留路线核心信息，不用长文案/链接堆满底部视野", () => {
    const wxml = readFileSync(join(PAGES_DIR, "exploration", "index.wxml"), "utf-8");
    expect(wxml).not.toMatch(/class="exp-current-copy"/);
    expect(wxml).not.toMatch(/class="exp-links"/);
    expect(wxml).not.toMatch(/class="exp-step"/);
    expect(wxml).toMatch(/class="concept-route"/);
    expect(wxml).toMatch(/conceptRoute\.segments/);
    expect(wxml).toMatch(/conceptRoute\.completedSegments/);
    expect(wxml).toMatch(/liveOverlay && !routeMode/);
    expect(wxml).toMatch(/bindtap="onTapExpeditionWaypoint"/);
    expect(wxml).toMatch(/waypointCard\.image/);
    expect(wxml).toMatch(/view-fallback.*scene\.plates\.hero/);
    expect(wxml).not.toMatch(/view-fallback[^\n]*live-a-kala-patthar/);
    expect(wxml).toMatch(/class="exp-route-hint"/);
  });
});

describe("核心页面交互控件确实渲染", () => {
  it("app.json、custom-tab-bar、页面 selected 使用同一套五项索引", () => {
    const app = JSON.parse(readFileSync(join(ROOT, "app.json"), "utf-8"));
    const tabPaths = app.tabBar.list.map((item: { pagePath: string }) => item.pagePath);
    expect(tabPaths).toEqual([
      "pages/home/index", "pages/map/index", "pages/knowledge/index",
      "pages/quiz/index", "pages/profile/index",
    ]);
    const tabWxml = readFileSync(join(ROOT, "custom-tab-bar", "index.wxml"), "utf-8");
    const tabTs = readFileSync(join(ROOT, "custom-tab-bar", "index.ts"), "utf-8");
    expect((tabTs.match(/pagePath: \"\/pages\//g) ?? []).length).toBe(5);
    expect(tabWxml).toContain("selected * 20");
    expect(readFileSync(join(PAGES_DIR, "quiz", "index.ts"), "utf-8")).toContain("selected: 3");
    expect(readFileSync(join(PAGES_DIR, "profile", "index.ts"), "utf-8")).toContain("selected: 4");
  });

  it("首页/地图/知识/地点详情的关键控件都有实际绑定", () => {
    const home = readFileSync(join(PAGES_DIR, "home", "index.wxml"), "utf-8");
    const map = readFileSync(join(PAGES_DIR, "map", "index.wxml"), "utf-8");
    const knowledge = readFileSync(join(PAGES_DIR, "knowledge", "index.wxml"), "utf-8");
    const place = readFileSync(join(PAGES_DIR, "place", "index.wxml"), "utf-8");
    expect(home).toMatch(/bindinput="onQueryInput"/);
    expect(home).toMatch(/bindtap="onOpenType"/);
    expect(home).toMatch(/stats.completed/);
    expect(home).toMatch(/featured/);
    expect(home).toMatch(/discovery.content/);
    expect(map).toMatch(/bindtap="onToggleAtlas"/);
    expect(map).toMatch(/bindinput="onQueryInput"/);
    expect(map).toMatch(/data-id="\{\{item\.id\}\}" bindtap="onMapPointTap"/);
    expect(map).toMatch(/wx:for="\{\{atlas\}\}"/);
    expect(knowledge).toMatch(/bindinput="onQueryInput"/);
    expect(knowledge).toMatch(/bindtap="onCategoryTap"/);
    expect(place).toMatch(/bindtap="onDetailTabTap"/);
    expect(place).toMatch(/activeDetailTab === 'environment'/);
  });
});
