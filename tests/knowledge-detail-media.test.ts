/**
 * 知识详情页配图与大图预览 —— 回归测试。
 *
 * 背景（用户实际报告）：「知识外边有图，点进去里面没有了，我还想进去看看大图」。
 * 详情页此前完全没有图片逻辑（既不查媒体、数据里也没有图片字段），
 * 而测试只覆盖了标题/详解/关联地点，没有任何一条断言详情页有图。
 */
import { describe, expect, it, beforeAll } from "vitest";

/* ---------------- wx / Page 全局 mock ---------------- */
const wxCalls: Record<string, unknown[][]> = {};
function record(name: string, args: unknown[]): void {
  (wxCalls[name] ||= []).push(args);
}
(globalThis as Record<string, unknown>).wx = {
  navigateTo: (...a: unknown[]) => record("navigateTo", a),
  navigateBack: (...a: unknown[]) => record("navigateBack", a),
  switchTab: (...a: unknown[]) => record("switchTab", a),
  setNavigationBarTitle: (...a: unknown[]) => record("setNavigationBarTitle", a),
  previewImage: (...a: unknown[]) => record("previewImage", a),
  getStorageSync: () => undefined,
  setStorageSync: () => undefined,
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

let detail: PageDef;

beforeAll(async () => {
  await import("../miniprogram/pages/knowledge-detail/index");
  detail = lastPageDef!;
});

describe("知识详情页配图", () => {
  it("有 runtime 媒体的知识必须带图（k03）", () => {
    const inst = createInstance(detail);
    inst.onLoad({ id: "k03" });
    const images = inst.data.images as string[];
    expect(images.length).toBeGreaterThan(0);
    expect(images[0]).toBeTruthy();
  });

  it("多图知识实景优先：k11 首张是历史实拍，不是测深图", () => {
    const inst = createInstance(detail);
    inst.onLoad({ id: "k11" });
    const images = inst.data.images as string[];
    expect(images.length).toBeGreaterThanOrEqual(2);
    expect(images[0], "测深图不得占据首位").not.toContain("gebco");
    expect(images.some((p) => p.includes("trieste"))).toBe(true);
  });

  it("无 runtime 媒体但有语义兜底的知识也带图（k02 雪线）", () => {
    const inst = createInstance(detail);
    inst.onLoad({ id: "k02" });
    expect((inst.data.images as string[]).length).toBe(1);
  });

  it("确实无素材的知识返回空图集，且不抛错", () => {
    const inst = createInstance(detail);
    expect(() => inst.onLoad({ id: "k01" })).not.toThrow();
    expect(inst.data.images).toEqual([]);
  });
});

describe("知识详情页大图预览", () => {
  it("点击配图调起全屏预览，urls 覆盖全部图片且 current 为首张", () => {
    wxCalls.previewImage = [];
    const inst = createInstance(detail);
    inst.onLoad({ id: "k11" });
    inst.onPreviewImage();

    expect(wxCalls.previewImage?.length).toBe(1);
    const arg = wxCalls.previewImage[0][0] as { urls: string[]; current: string };
    expect(arg.urls.length).toBeGreaterThanOrEqual(2);
    expect(arg.current).toBe(arg.urls[0]);
    expect(arg.urls).toEqual((inst.data.images as string[]).filter(Boolean));
  });

  it("无图时点击不触发预览（不留空白预览层）", () => {
    wxCalls.previewImage = [];
    const inst = createInstance(detail);
    inst.onLoad({ id: "k01" });
    inst.onPreviewImage();
    expect(wxCalls.previewImage?.length ?? 0).toBe(0);
  });
});
