/**
 * 地球贴图档位解析（Gate 2 建立，Gate 4 扩展为媒体所有权解耦）
 *
 * 不变量：
 *   1. **颜色贴图始终从代码包加载** —— 它是地图首屏主视觉，远端化会让冷启动先空一帧、
 *      弱网时退化成纯色球；这是 Gate 4 唯一被论证保留的本地大媒体；
 *   2. 高度图 / 镜面图在配置远端基址后走远端；未配置时走包内（本地开发）；
 *   3. 请求 4096 但没有远端基址时降级到 2048，绝不从包里找 4096；
 *   4. `size` 必须反映**实际加载**的档位（uTexel 用它，避免采样步长错配）；
 *   5. 代码包里不存在任何 4096 贴图，也不存在远端化的 height/specular。
 */
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GLOBE_TEXTURE_HIGH_SIZE,
  GLOBE_TEXTURE_STANDARD_SIZE,
  globeColorTextureSrc,
  resolveGlobeTextures,
} from "../miniprogram/engine/globe-texture-source";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist", "miniprogram");
const DIST_WORLD = join(DIST, "assets", "world");
const CDN = "https://cdn.example.com/geo-explorer/prod/v1/";

describe("resolveGlobeTextures —— 本地模式（未配置远端）", () => {
  it("2048：三张图都在包内", () => {
    const r = resolveGlobeTextures(2048, "");
    expect(r.tier).toBe("standard");
    expect(r.size).toBe(GLOBE_TEXTURE_STANDARD_SIZE);
    expect(r.sources.map((s) => s.key)).toEqual(["color", "height", "specular"]);
    for (const s of r.sources) {
      expect(s.remote).toBe(false);
      expect(s.src.startsWith("/assets/world/")).toBe(true);
      expect(s.src).toContain("-2048.jpg");
    }
  });

  it("请求 4096 但无远端 → 降级 2048，且不出现 4096 路径", () => {
    const r = resolveGlobeTextures(4096, "");
    expect(r.tier).toBe("standard");
    expect(r.size).toBe(GLOBE_TEXTURE_STANDARD_SIZE);
    for (const s of r.sources) {
      expect(s.src).not.toContain("4096");
      expect(s.remote).toBe(false);
    }
  });
});

describe("resolveGlobeTextures —— 远端模式", () => {
  it("2048：颜色图仍在包内，高度/镜面走远端", () => {
    const r = resolveGlobeTextures(2048, CDN);
    expect(r.tier).toBe("standard");
    expect(r.size).toBe(GLOBE_TEXTURE_STANDARD_SIZE);
    const by = Object.fromEntries(r.sources.map((s) => [s.key, s]));
    expect(by.color.remote).toBe(false);
    expect(by.color.src).toBe("/assets/world/globe-texture-realistic-2048.jpg");
    expect(by.height.remote).toBe(true);
    expect(by.height.src).toBe(`${CDN}world/globe-height-2048.jpg`);
    expect(by.specular.remote).toBe(true);
    expect(by.specular.src).toBe(`${CDN}world/globe-specular-2048.jpg`);
  });

  it("4096：三张图都走远端，且 size 反映真实档位（uTexel 依赖它）", () => {
    const r = resolveGlobeTextures(4096, CDN);
    expect(r.tier).toBe("high");
    expect(r.size).toBe(GLOBE_TEXTURE_HIGH_SIZE);
    for (const s of r.sources) {
      expect(s.remote).toBe(true);
      expect(s.src.startsWith(CDN)).toBe(true);
      expect(s.src).toContain("-4096.jpg");
    }
  });

  it("4096 的 size 与 2048 的 size 不同（防止退回旧的采样 bug）", () => {
    expect(resolveGlobeTextures(4096, CDN).size).not.toBe(resolveGlobeTextures(2048, CDN).size);
    expect(resolveGlobeTextures(4096, "").size).toBe(resolveGlobeTextures(2048, "").size);
  });
});

describe("globeColorTextureSrc", () => {
  it("始终指向包内颜色贴图", () => {
    expect(globeColorTextureSrc()).toBe("/assets/world/globe-texture-realistic-2048.jpg");
  });
});

describe("构建产物边界", () => {
  it("包内存在颜色贴图与地图兜底 SVG", () => {
    if (!existsSync(DIST)) return;
    expect(existsSync(join(DIST_WORLD, "globe-texture-realistic-2048.jpg"))).toBe(true);
    expect(existsSync(join(DIST_WORLD, "world-map.svg"))).toBe(true);
  });

  it("包内不存在远端化的地球材质图", () => {
    if (!existsSync(DIST)) return;
    for (const f of ["globe-height-2048.jpg", "globe-specular-2048.jpg"]) {
      expect(existsSync(join(DIST_WORLD, f)), `${f} 应已远端化，不应出现在代码包`).toBe(false);
    }
  });

  it("包内不存在任何 4096 贴图", () => {
    if (!existsSync(DIST)) return;
    for (const stem of ["globe-texture-realistic", "globe-height", "globe-specular"]) {
      expect(existsSync(join(DIST_WORLD, `${stem}-4096.jpg`))).toBe(false);
      expect(existsSync(join(DIST_WORLD, `${stem}-4096.png`))).toBe(false);
    }
  });
});
