/**
 * Gate 4 —— 媒体所有权解耦的回归测试。
 *
 * 把「主包不再持有内容媒体」这件事变成可执行的契约：
 *   1. 逻辑键解析：本地模式 → 包内路径；远端模式 → 远端地址；
 *   2. 空键 → 通用占位图（不返回空串，界面不会拿到无效 src）；
 *   3. 只有**一张**通用占位图，不存在"每个世界一份本地兜底"（那会让媒体重回主包）；
 *   4. 清单里的内容媒体：在 dist 中不存在，在 media-remote/ 中存在；
 *   5. 主包体积边界与"本地内容媒体 ≈ 0"；
 *   6. 配置里不含任何密钥。
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MEDIA_PLACEHOLDER,
  isRemoteMediaEnabled,
  mediaFallbackSrc,
  mediaLocalPath,
  mediaRemoteUrl,
  resolveAssetSource,
  resolveMediaSrc,
  stripAssetsPrefix,
} from "../miniprogram/services/media-service";
import { RUNTIME_MANIFESTS } from "../miniprogram/data/media/world-manifests";
import { isRemoteOwned, mediaSourcePath } from "../scripts/media-ownership.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist", "miniprogram");
const CDN = "https://cdn.example.com/geo-explorer/prod/v1/";
const KEY = "content/fuji/f-forest-lower.jpg";

describe("媒体逻辑键解析", () => {
  it("本地模式（未配置远端）→ 包内路径", () => {
    expect(resolveMediaSrc(KEY, "")).toBe(`/assets/${KEY}`);
    expect(mediaLocalPath(KEY)).toBe(`/assets/${KEY}`);
    expect(isRemoteMediaEnabled()).toBe(false);
  });

  it("远端模式 → 远端地址，且不做本地兜底", () => {
    expect(resolveMediaSrc(KEY, CDN)).toBe(`${CDN}${KEY}`);
    expect(mediaRemoteUrl(KEY, CDN)).toBe(`${CDN}${KEY}`);
  });

  it("兼容历史写法：带 /assets/ 前缀的键解析结果一致", () => {
    expect(stripAssetsPrefix(`/assets/${KEY}`)).toBe(KEY);
    expect(resolveMediaSrc(`/assets/${KEY}`, CDN)).toBe(`${CDN}${KEY}`);
    expect(resolveMediaSrc(`/assets/${KEY}`, "")).toBe(`/assets/${KEY}`);
  });

  it("空键 → 通用占位图（而不是空串，避免界面拿到无效 src）", () => {
    expect(resolveMediaSrc("")).toBe(MEDIA_PLACEHOLDER);
    expect(resolveMediaSrc(undefined)).toBe(MEDIA_PLACEHOLDER);
    expect(resolveMediaSrc(null)).toBe(MEDIA_PLACEHOLDER);
  });

  it("远端地址支持可选版本目录，并显式暴露 fallback 链", () => {
    const resolved = resolveAssetSource(KEY, {
      remoteBase: "https://cdn.example.com/geo-explorer/",
      version: "prod/v2",
      localFallback: "world/globe-texture-realistic-2048.webp",
    });
    expect(resolved.src).toBe("https://cdn.example.com/geo-explorer/prod/v2/content/fuji/f-forest-lower.jpg");
    expect(resolved.fallbackSrc).toBe("/assets/world/globe-texture-realistic-2048.webp");
    expect(resolved.placeholderSrc).toBe(MEDIA_PLACEHOLDER);
    expect(resolved.remote).toBe(true);
  });

  it("失败链依次为显式本地兜底 → 设计占位，不产生破图路径", () => {
    const local = "world/globe-texture-realistic-2048.webp";
    const remote = resolveMediaSrc(KEY, CDN);
    const fallback = mediaFallbackSrc(remote, local);
    expect(fallback).toBe(`/assets/${local}`);
    expect(mediaFallbackSrc(fallback, local)).toBe(MEDIA_PLACEHOLDER);
    expect(mediaFallbackSrc(MEDIA_PLACEHOLDER, local)).toBe(MEDIA_PLACEHOLDER);
  });
});

describe("占位图策略（Step 5：只允许一张通用占位图）", () => {
  it("占位图只有一个，且体积很小", () => {
    if (!existsSync(DIST)) return;
    const p = join(DIST, MEDIA_PLACEHOLDER.replace(/^\//, ""));
    expect(existsSync(p), `${MEDIA_PLACEHOLDER} 应存在于包内`).toBe(true);
    expect(statSync(p).size).toBeLessThan(8 * 1024);
  });

  it("占位图路径不在媒体所有权清单里（它是 UI 资源，不是内容媒体）", () => {
    expect(isRemoteOwned("ui/media-placeholder.svg")).toBe(false);
  });

  it("包内不存在任何远端持有的媒体文件", () => {
    if (!existsSync(DIST)) return;
    const assetsDir = join(DIST, "assets");
    if (!existsSync(assetsDir)) return;
    const leaked: string[] = [];
    (function walk(d: string) {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        const p = join(d, e.name);
        if (e.isDirectory()) walk(p);
        else {
          const key = relative(assetsDir, p).split("\\").join("/");
          if (isRemoteOwned(key)) leaked.push(key);
        }
      }
    })(assetsDir);
    expect(leaked, "远端媒体不得出现在代码包中").toEqual([]);
  });
});

describe("媒体清单不再表达包内所有权", () => {
  const assets = RUNTIME_MANIFESTS.flatMap((m) => m.assets);

  it("清单非空，且每项都持逻辑键而非包内绝对路径", () => {
    expect(assets.length).toBeGreaterThan(10);
    for (const a of assets) {
      expect(a.mediaKey, a.id).toBeTruthy();
      expect(a.mediaKey.startsWith("/"), `${a.id} 的键不应带前导 /`).toBe(false);
      expect(a.mediaKey.startsWith("assets/"), `${a.id} 的键不应带 assets/ 前缀`).toBe(false);
    }
  });

  it("远端持有的媒体：源文件在 media-remote/，且不在代码包内", () => {
    const remoteAssets = assets.filter((a) => isRemoteOwned(a.mediaKey));
    expect(remoteAssets.length, "应当存在被远端持有的内容媒体").toBeGreaterThan(20);
    for (const a of remoteAssets) {
      expect(existsSync(join(ROOT, mediaSourcePath(a.mediaKey))), `${a.id} 源文件缺失`).toBe(true);
      if (!existsSync(DIST)) continue;
      expect(
        existsSync(join(DIST, "assets", a.mediaKey)),
        `${a.id} 不应出现在代码包中：assets/${a.mediaKey}`,
      ).toBe(false);
    }
  });

  it("主包页面可枚举任意地点，但不需要包内持有其图片", () => {
    // home/map/knowledge 通过 getPlaceHeroImage/MediaRegistry 拿到的是**解析后的地址**
    const placeHeroes = assets.filter((a) => a.entityType === "place" && a.purpose === "hero");
    expect(placeHeroes.length).toBeGreaterThan(0);
    for (const a of placeHeroes) {
      const src = resolveMediaSrc(a.mediaKey);
      // 本地模式下是 /assets/...，远端模式下是远端地址；两种都不要求"包内存在该文件"这一前提
      expect(typeof src).toBe("string");
      expect(src.length).toBeGreaterThan(0);
    }
  });
});

describe("配置边界", () => {
  /** 去掉注释后再扫描——注释里出现「不得写入 SecretId」这类说明是正常的 */
  const stripped = () => {
    const raw = readFileSync(join(ROOT, "miniprogram/config/index.ts"), "utf8");
    return raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  };

  it("config 中只保存非敏感信息，不含任何密钥字段", () => {
    const cfg = stripped();
    for (const bad of ["secretId", "secretKey", "apiKey", "accessToken", "password"]) {
      expect(cfg.toLowerCase().includes(bad.toLowerCase()), `config 中不应出现 ${bad}`).toBe(false);
    }
  });

  it("远端基址的格式规则由共享校验器统一强制（build:prod 用同一份）", async () => {
    type CfgMod = {
      readBase: (p?: string) => string | null;
      validateProductionBase: (b: string | null) => string[];
    };
    const cfg = (await import("../scripts/check-media-config.mjs")) as unknown as CfgMod;
    const base = cfg.readBase(join(ROOT, "miniprogram/config/media-remote-base.ts"));
    if (base === null || base === "") return; // 未配置是当前合法状态（Gate 4B BLOCKED）
    expect(cfg.validateProductionBase(base), "已配置的基址必须通过生产校验").toEqual([]);
    expect(base.startsWith("https://")).toBe(true);
    expect(base.endsWith("/")).toBe(true);
  });
});

describe("主包体积边界", () => {
  it("主包 < 1.5 MiB，且包内媒体均不超过 200 KB", async () => {
    if (!existsSync(DIST)) return;
    type PkgFile = { path: string; size: number };
    type Pkg = { name: string; isMain: boolean; total: number; localMedia: PkgFile[] };
    type Audit = { missing: boolean; packages: Pkg[] };
    const mod = (await import("../scripts/package-audit.mjs")) as unknown as {
      auditPackage: (d?: string) => Audit;
    };
    const r = mod.auditPackage(DIST);
    expect(r.missing).toBe(false);
    const main = r.packages.find((p) => p.isMain) as Pkg;
    expect(main.total / 1048576, `主包 ${(main.total / 1024).toFixed(1)} KB`).toBeLessThan(1.5);
    const over200 = r.packages
      .flatMap((p) => p.localMedia)
      .filter((f: PkgFile) => f.size > 200 * 1024);
    expect(over200.map((f: PkgFile) => f.path)).toEqual([]);
  });
});
