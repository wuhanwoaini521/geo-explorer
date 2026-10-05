/**
 * UI 静态一致性检查 —— WXML 事件绑定 ↔ Page/Component 方案对照。
 * 替代「必须打开开发者工具才能发现绑定丢失」：任何 bindtap/catchtap
 * 引用的处理函数必须真实存在于页面定义中，否则测试失败。
 * （本测试同时 mock wx/Page/Component 以便在 Node 中 import 页面模块。）
 *
 * Gate 3：页面已分布到主包 + pkg-explore + pkg-detail。本文件不再硬编码
 * `miniprogram/pages`，而是从 app.json 解析所有包根，顺带断言：
 *   - 每个 pages / subpackages 条目都真实对应一个页面目录（navigation 路径有效）
 *   - tabBar 的 5 个页面都在主包（微信要求）
 */
import { describe, expect, it, beforeAll } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "miniprogram");
const COMPONENTS_DIR = join(ROOT, "pkg-explore", "components");
const APP_JSON = JSON.parse(readFileSync(join(ROOT, "app.json"), "utf-8")) as {
  pages: string[];
  subpackages?: Array<{ root: string; name: string; pages: string[] }>;
  tabBar: { list: Array<{ pagePath: string }> };
};

/** 包根 → 该包下的页面路径（相对包根） */
interface PageEntry {
  pkg: string;
  /** 相对 miniprogram/ 的页面目录，例如 pkg-explore/pages/exploration */
  dir: string;
  /** app.json 里登记的路径，例如 pkg-explore/pages/exploration/index */
  route: string;
}

const PAGE_ENTRIES: PageEntry[] = [];
/** route 形如 <pkg>/pages/<name>/index → 页面目录 <pkg>/pages/<name> */
function dirOf(route: string): string {
  return route.split("/").slice(0, -1).join("/");
}
for (const route of APP_JSON.pages) {
  PAGE_ENTRIES.push({ pkg: "main", dir: dirOf(route), route });
}
for (const sub of APP_JSON.subpackages ?? []) {
  for (const p of sub.pages) {
    const route = `${sub.root}/${p}`;
    PAGE_ENTRIES.push({ pkg: sub.root, dir: dirOf(route), route });
  }
}

/** 页面短名（app.json 里的最后一段父目录名），与 Page() mock 的栈提取保持一致 */
function shortName(route: string): string {
  const parts = route.split("/");
  return parts[parts.length - 2];
}
const pageDir = (name: string): string => {
  const e = PAGE_ENTRIES.find((x) => shortName(x.route) === name);
  if (!e) throw new Error(`未知页面：${name}`);
  return join(ROOT, e.dir);
};

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
  for (const e of PAGE_ENTRIES) {
    await import(`../miniprogram/${e.dir}/index`);
  }
  // @ts-expect-error —— 组件由全局 Component() 注册，非 ES 模块（仅运行时加载）
  await import("../miniprogram/pkg-explore/components/knowledge-popup/index");
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
  const dir = pageDir(page);
  return readdirSync(dir)
    .filter((f: string) => f.endsWith(".wxml"))
    .map((f) => join(dir, f));
}

describe("Gate 3 包结构", () => {
  it("app.json 的每个页面条目都对应真实页面目录（四件套齐全）", () => {
    expect(PAGE_ENTRIES.length).toBe(13);
    for (const e of PAGE_ENTRIES) {
      for (const ext of [".ts", ".json", ".wxml", ".wxss"]) {
        const f = join(ROOT, `${e.dir}/index${ext}`);
        expect(existsSync(f), `${e.route}${ext} 缺失（app.json 登记但文件不存在）`).toBe(true);
      }
    }
  });

  it("tabBar 的 5 个页面全部留在主包（微信要求）", () => {
    const tabPaths = APP_JSON.tabBar.list.map((i) => i.pagePath);
    for (const p of tabPaths) {
      expect(APP_JSON.pages, `${p} 必须在主包 pages 中`).toContain(p);
    }
    for (const sub of APP_JSON.subpackages ?? []) {
      for (const p of sub.pages) {
        expect(tabPaths, `${sub.root}/${p} 不能是 tabBar 页面`).not.toContain(
          `${sub.root}/${p}`,
        );
      }
    }
  });

  it("分包根目录与主包页面目录不重叠", () => {
    const roots = (APP_JSON.subpackages ?? []).map((s) => s.root);
    expect(roots).toEqual(["pkg-explore", "pkg-detail"]);
    for (const r of roots) {
      expect(APP_JSON.pages.some((p) => p.startsWith(`${r}/`))).toBe(false);
      expect(existsSync(join(ROOT, r))).toBe(true);
    }
  });
});

describe("WXML 事件绑定 ↔ 页面方法一致性", () => {
  it("页面模块均已注册（13 页 + 1 组件）", () => {
    expect(pageDefs.size).toBe(13);
    expect(componentDefs.length).toBe(1);
  });

  for (const entry of PAGE_ENTRIES) {
    const name = shortName(entry.route);
    it(`${entry.pkg}:${name}：WXML 引用的处理函数都存在`, () => {
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
    const wxml = readFileSync(join(pageDir("exploration"), "index.wxml"), "utf-8");
    const wxss = readFileSync(join(pageDir("exploration"), "index.wxss"), "utf-8");
    expect(wxml).not.toMatch(/climber|hillman|🧗|🤿/);
    expect(wxss).not.toMatch(/\.climber|\.hillman|\.m-climber/);
  });

  it("探索进度 HUD 保留路线核心信息，不用长文案/链接堆满底部视野", () => {
    const wxml = readFileSync(join(pageDir("exploration"), "index.wxml"), "utf-8");
    expect(wxml).not.toMatch(/class="exp-current-copy"/);
    expect(wxml).not.toMatch(/class="exp-links"/);
    expect(wxml).not.toMatch(/class="exp-step"/);
    expect(wxml).toMatch(/class="concept-route/);
    expect(wxml).toMatch(/conceptRoute\.segments/);
    expect(wxml).toMatch(/conceptRoute\.completedSegments/);
    expect(wxml).toMatch(/liveOverlay && !routeMode/);
    expect(wxml).toMatch(/bindtap="onTapExpeditionWaypoint"/);
    expect(wxml).toMatch(/waypointCard\.image/);
    expect(wxml).toMatch(/view-fallback.*scene\.plates\.hero/);
    expect(wxml).not.toMatch(/view-fallback[^\n]*live-a-kala-patthar/);
    const dock = readFileSync(join(pageDir("exploration"), "journey-dock.wxml"), "utf-8");
    expect(wxml).toContain('include src="journey-dock.wxml"');
    expect(dock).toContain("journey.currentName");
    expect(dock).toContain("journey.nextName");
    expect(dock).toContain('catchtap="onContinueJourney"');
    expect(dock).not.toContain('catchtouchstart="noop"');
  });
});

describe("核心页面交互控件确实渲染", () => {
  it("app.json、custom-tab-bar、页面 selected 使用同一套五项索引", () => {
    const app = JSON.parse(readFileSync(join(ROOT, "app.json"), "utf-8"));
    const tabPaths = app.tabBar.list.map((item: { pagePath: string }) => item.pagePath);
    expect(tabPaths).toEqual([
      "pages/map/index", "pages/home/index", "pages/knowledge/index",
      "pages/quiz/index", "pages/profile/index",
    ]);
    expect(app.pages[0]).toBe("pages/map/index");
    const tabWxml = readFileSync(join(ROOT, "custom-tab-bar", "index.wxml"), "utf-8");
    const tabTs = readFileSync(join(ROOT, "custom-tab-bar", "index.ts"), "utf-8");
    expect((tabTs.match(/pagePath: \"\/pages\//g) ?? []).length).toBe(5);
    expect(tabWxml).toContain("selected * 20");
    expect(readFileSync(join(pageDir("map"), "index.ts"), "utf-8")).toContain("selected: 0");
    expect(readFileSync(join(pageDir("home"), "index.ts"), "utf-8")).toContain("selected: 1");
    expect(readFileSync(join(pageDir("quiz"), "index.ts"), "utf-8")).toContain("selected: 3");
    expect(readFileSync(join(pageDir("profile"), "index.ts"), "utf-8")).toContain("selected: 4");
  });

  it("首页/地图/知识/地点详情的关键控件都有实际绑定", () => {
    const home = readFileSync(join(pageDir("home"), "index.wxml"), "utf-8");
    const map = readFileSync(join(pageDir("map"), "index.wxml"), "utf-8");
    const knowledge = readFileSync(join(pageDir("knowledge"), "index.wxml"), "utf-8");
    const place = readFileSync(join(pageDir("place"), "index.wxml"), "utf-8");
    expect(home).toMatch(/bindinput="onQueryInput"/);
    expect(home).toMatch(/bindtap="onOpenType"/);
    expect(home).toMatch(/onRandomExplore/);
    expect(home).toMatch(/class="discovery-hero"/);
    expect(home).toMatch(/bindtap="onToggleSearch"/);
    expect(home).toMatch(/discovery.content/);
    expect(map).toMatch(/bindtap="onToggleAtlas"/);
    expect(map).not.toMatch(/bindinput="onQueryInput"/);
    expect(map).toMatch(/class="map-header-actions"/);
    expect(map).toMatch(/data-id="\{\{item\.id\}\}" bindtap="onMapPointTap"/);
    expect(map).toMatch(/wx:for="\{\{atlas\}\}"/);
    expect(knowledge).toMatch(/bindinput="onQueryInput"/);
    expect(knowledge).toMatch(/bindtap="onCategoryTap"/);
    expect(place).toMatch(/bindtap="onDetailTabTap"/);
    expect(place).toMatch(/activeDetailTab === 'environment'/);
  });

  it("发现列表没有地点照片时收敛为目录行，挑战筛选和任务等级一致", () => {
    const home = readFileSync(join(pageDir("home"), "index.wxml"), "utf-8");
    const homeStyles = readFileSync(join(pageDir("home"), "index.wxss"), "utf-8");
    const quizTemplate = readFileSync(join(pageDir("quiz"), "index.wxml"), "utf-8");
    const quizStyles = readFileSync(join(pageDir("quiz"), "index.wxss"), "utf-8");
    const quiz = pageDefs.get("quiz")!;
    expect(home).toMatch(/item\.image && !failedImages\[item\.id\]/);
    expect(home).toContain("destination-catalog-row");
    expect(home).not.toContain("destination-image-fallback");
    expect(homeStyles).toMatch(/\.destination \{[^}]*height: 220rpx/);
    expect(homeStyles).toMatch(/\.destination-card-0 \{ height: 245rpx/);
    expect(home).toMatch(/class="discovery-title-block"[\s\S]*class="discovery-title"[\s\S]*class="discovery-subtitle"/);
    expect(homeStyles).not.toMatch(/\.discovery-title-block \{[^}]*position: absolute/);
    expect(quizTemplate).toMatch(/class="challenge-heading"/);
    expect(quizStyles).toMatch(/\.challenge-heading > view:first-child \{[^}]*flex-direction: column/);

    const context: {
      data: { activeDifficulty: number };
      update?: Record<string, any>;
      setData(patch: Record<string, any>): void;
    } = {
      data: { activeDifficulty: 1 },
      setData(patch: Record<string, any>) { this.update = patch; },
    };
    quiz.refreshIdle.call(context);
    expect(context.update?.missions.map((mission: { id: string }) => mission.id)).toContain("fuji");
    expect(context.update?.missions.every((mission: { difficulty: number }) => mission.difficulty === 1)).toBe(true);

    let recordedDifficulty = 0;
    const missionContext = {
      data: {},
      beginRun(_questions: unknown[], difficulty: number) { recordedDifficulty = difficulty; },
    };
    quiz.startMission.call(missionContext, "fuji");
    expect(recordedDifficulty).toBe(1);
  });

  it("知识图谱掌握状态要求该节点的显式关联题全部答对", () => {
    const knowledge = readFileSync(join(pageDir("knowledge"), "index.ts"), "utf-8");
    expect(knowledge).toContain("topicId: \"k12\", worldIds: [\"everest\", \"fuji\"], masteryQuizIds: [\"q19\"]");
    expect(knowledge).toContain("topicId: \"k36\", worldIds: [\"fuji\"], masteryQuizIds: [\"q21\"]");
    expect(knowledge).toMatch(/relevantQuizIds\.length > 0 && relevantQuizIds\.every\(\(id\) => correctIds\.has\(id\)\)/);
    expect(knowledge).toMatch(/const exploredWorlds = new Set\(getRecords\(\)\.map\(\(record\) => record\.id\)\)/);
    expect(knowledge).toMatch(/config\.worldIds\.some\(\(worldId\) => exploredWorlds\.has\(worldId\)\)/);
    expect(knowledge).not.toContain("categoryQuizIds.some");
  });
});
