import { beforeAll, describe, expect, it } from "vitest";

interface PageDef {
  data: Record<string, any>;
  [key: string]: any;
}

let pageDef: PageDef | null = null;
const navigateCalls: Array<{ url?: string }> = [];

(globalThis as Record<string, unknown>).wx = {
  navigateTo: (arg: { url?: string }) => navigateCalls.push(arg),
  navigateBack: () => undefined,
};
(globalThis as Record<string, unknown>).Page = (def: PageDef) => {
  pageDef = def;
};

function createInstance(): PageDef {
  const source = pageDef!;
  const instance = Object.create(null) as PageDef;
  instance.data = JSON.parse(JSON.stringify(source.data));
  for (const [key, value] of Object.entries(source)) {
    if (key === "data") continue;
    instance[key] = typeof value === "function" ? value.bind(instance) : value;
  }
  instance.setData = (patch: Record<string, unknown>) => Object.assign(instance.data, patch);
  return instance;
}

beforeAll(async () => {
  await import("../miniprogram/pages/route-overview/index");
});

describe("路线概览页", () => {
  it("登顶后展示完整路线、真实地点名和节点专属图片", () => {
    const instance = createInstance();
    instance.onLoad({ id: "everest", progress: "1" });

    expect(instance.data.routeTitle).toBe("珠峰南坡路线");
    expect(instance.data.progressText).toBe("路线已完成 · 8/8 个节点");
    expect(instance.data.rows).toHaveLength(8);
    expect(instance.data.rows[0].title).toBe("珠峰峰顶");
    expect(instance.data.rows[7].title).toContain("大本营");
    expect(instance.data.rows.some((row: any) => row.title.includes("C1"))).toBe(true);
    expect(new Set(instance.data.rows.map((row: any) => row.image)).size).toBeGreaterThan(4);
  });

  it("点击节点进入对应地点详情", () => {
    navigateCalls.length = 0;
    const instance = createInstance();
    instance.onLoad({ progress: "0.5" });
    instance.onRowTap({ currentTarget: { dataset: { id: "camp-i" } } });
    expect(navigateCalls[navigateCalls.length - 1]?.url).toBe(
      "/pages/camp-detail/index?id=camp-i",
    );
  });
});
