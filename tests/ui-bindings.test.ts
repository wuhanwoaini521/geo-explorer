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
  navigateTo: () => {}, switchTab: () => {}, navigateBack: () => {},
  showToast: () => {}, showModal: () => {}, request: () => {},
  getStorageSync: () => undefined, setStorageSync: () => {},
  createIntersectionObserver: () => ({ observe: () => {} }),
};
const pageDefs = new Map<string, Record<string, any>>();
(globalThis as Record<string, unknown>).Page = (def: Record<string, any>) => {
  const stack = new Error().stack ?? "";
  const match = stack.match(/pages[/\\]([a-z-]+)[/\\]/i);
  pageDefs.set(match ? match[1] : `__page_${pageDefs.size}`, def);
};
const componentDefs: Array<{ tag: string; def: Record<string, any> }> = [];
(globalThis as Record<string, unknown>).Component = (def: Record<string, any>) => {
  componentDefs.push({ tag: componentDefs.length === 0 ? "knowledge-popup" : "unknown", def });
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
  it("页面模块均已注册（8 页 + 1 组件）", () => {
    expect(pageDefs.size).toBe(8);
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
          expect(typeof def![handler], `${name} ← ${handler} (${file})`).toBe("function");
        }
      }
    });
  }

  it("knowledge-popup：组件 WXML 触发的事件都有 triggerEvent 定义或处理函数", () => {
    const comp = componentDefs[0];
    expect(comp).toBeTruthy();
    const wxml = readFileSync(join(COMPONENTS_DIR, "knowledge-popup", "index.wxml"), "utf-8");
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
    const ts = readFileSync(join(COMPONENTS_DIR, "knowledge-popup", "index.ts"), "utf-8");
    const triggers = [...ts.matchAll(/triggerEvent\(["']([\w-]+)["']/g)].map((m) => m[1]);
    expect(triggers.length).toBeGreaterThanOrEqual(2);
    for (const t of triggers) expect(["close", "continue"]).toContain(t);
  });
});
