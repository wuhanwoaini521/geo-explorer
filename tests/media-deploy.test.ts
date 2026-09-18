/**
 * Gate 4B —— 生产媒体投递链路的回归测试。
 *
 * 覆盖：
 *   1. 部署清单由**真实文件**生成且确定性（重复生成字节一致）；
 *   2. 路径契约：mediaKey 与远端对象键一一对应，不需要逐文件改写 URL；
 *   3. 生产基址校验：空 / 非 https / 不以 / 结尾 / 含凭证都必须被拒绝；
 *   4. 仓库当前状态如实反映 Gate 4B BLOCKED（基址为空）；
 *   5. 仓库内不出现任何凭证；
 *   6. 媒体清单与 media-remote/ 实际内容一致。
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as manifestMod from "../scripts/media-manifest.mjs";
import * as configMod from "../scripts/check-media-config.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

type ManifestFile = { mediaKey: string; repoPath: string; bytes: number; sha256: string };
type Manifest = { version: string; count: number; totalBytes: number; files: ManifestFile[] };
const MM = manifestMod as unknown as {
  buildManifest: () => Manifest;
  serializeManifest: (m: Manifest) => string;
  expectedUrls: (m: Manifest, base: string) => Array<ManifestFile & { url: string }>;
  listRemoteFiles: () => string[];
  MEDIA_VERSION: string;
};
const CM = configMod as unknown as {
  readBase: (p?: string) => string | null;
  validateProductionBase: (b: string | null) => string[];
};

describe("部署清单（Step 2）", () => {
  it("由真实文件生成，且确定性（两次序列化字节一致）", () => {
    const a = MM.serializeManifest(MM.buildManifest());
    const b = MM.serializeManifest(MM.buildManifest());
    expect(a).toBe(b);
    expect(a.endsWith("\n")).toBe(true);
    expect(a).not.toContain("\r\n");
  });

  it("每个文件的 bytes / sha256 与磁盘一致", () => {
    const m = MM.buildManifest();
    expect(m.count).toBeGreaterThan(0);
    expect(m.count).toBe(MM.listRemoteFiles().length);
    for (const f of m.files) {
      const st = statSync(join(ROOT, f.repoPath));
      expect(f.bytes, f.mediaKey).toBe(st.size);
      expect(f.sha256, f.mediaKey).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("清单里的 mediaKey 集合 == media-remote/ 实际文件集合", () => {
    const onDisk = MM.listRemoteFiles().sort();
    const inManifest = MM.buildManifest().files.map((f) => f.mediaKey).sort();
    expect(inManifest).toEqual(onDisk);
  });

  it("已提交的清单文件与当前生成结果一致（防止手改哈希）", () => {
    const committed = readFileSync(join(ROOT, "deploy/media-manifest.v1.json"), "utf8");
    expect(committed).toBe(MM.serializeManifest(MM.buildManifest()));
  });
});

describe("路径契约（Step 1）", () => {
  it("mediaKey → <remoteBase><mediaKey>，不需要逐文件改写", () => {
    const m = MM.buildManifest();
    const base = "https://media.example.com/geo-explorer/prod/v1/";
    for (const f of MM.expectedUrls(m, base)) {
      expect(f.url).toBe(base + f.mediaKey);
      expect(f.url).not.toContain("//content");
      expect(f.url).not.toContain("//world");
      expect(f.url.slice(base.length)).toBe(f.mediaKey);
    }
  });

  it("基址缺少结尾斜杠时也不会拼出双斜杠或丢路径", () => {
    const m = MM.buildManifest();
    const f = MM.expectedUrls(m, "https://media.example.com/geo-explorer/prod/v1")[0];
    expect(f.url).toBe(`https://media.example.com/geo-explorer/prod/v1/${f.mediaKey}`);
  });

  it("版本目录符合 vN 约定，且清单版本与之相符", () => {
    expect(MM.MEDIA_VERSION).toMatch(/^v\d+$/);
    expect(MM.buildManifest().version).toBe(MM.MEDIA_VERSION);
  });
});

describe("生产基址校验（Step 5/6）", () => {
  it("拒绝空基址", () => {
    expect(CM.validateProductionBase("")).not.toEqual([]);
  });

  it("拒绝非 https", () => {
    const p = CM.validateProductionBase("http://media.example.com/geo/prod/v1/");
    expect(p.join(" ")).toContain("https");
  });

  it("拒绝不以 / 结尾（含尾随空格这种常见粘贴错误）", () => {
    expect(CM.validateProductionBase("https://media.example.com/geo/prod/v1").length).toBeGreaterThan(0);
    expect(CM.validateProductionBase("https://media.example.com/geo/prod/v1/ ").length).toBeGreaterThan(0);
  });

  it("拒绝含凭证的 URL", () => {
    const p = CM.validateProductionBase("https://user:pass@media.example.com/geo/prod/v1/");
    expect(p.join(" ")).toContain("凭证");
  });

  it("接受合法的生产基址", () => {
    expect(CM.validateProductionBase("https://media.example.com/geo-explorer/prod/v1/")).toEqual([]);
  });

  it("读取失败（找不到声明）时也判为未配置", () => {
    expect(CM.validateProductionBase(null).length).toBeGreaterThan(0);
  });
});

describe("仓库当前状态（Gate 4B BLOCKED 如实反映）", () => {
  it("构建输入的 remoteBase 为空 —— 生产未投递", () => {
    const base = CM.readBase(join(ROOT, "miniprogram/config/media-remote-base.ts"));
    expect(base).toBe("");
  });

  it("空基址下生产校验必然失败（build:prod 会拒绝出包）", () => {
    const base = CM.readBase(join(ROOT, "miniprogram/config/media-remote-base.ts"));
    expect(CM.validateProductionBase(base).length).toBeGreaterThan(0);
  });
});

describe("凭证边界（PASS 条件 9）", () => {
  const CRED = /(secretid|secretkey|api[_-]?key|access[_-]?token|password|passwd)\s*[:=]\s*["'][^"']+["']/i;

  it("deploy/ 与新增脚本中不出现任何凭证赋值", () => {
    const targets = [
      "deploy/media-manifest.v1.json",
      "scripts/media-manifest.mjs",
      "scripts/media-deploy.mjs",
      "scripts/media-check.mjs",
      "scripts/media-ownership.mjs",
      "scripts/apply-media-config.mjs",
      "scripts/check-media-config.mjs",
      "miniprogram/config/media-remote-base.ts",
    ];
    for (const t of targets) {
      const src = readFileSync(join(ROOT, t), "utf8");
      expect(CRED.test(src), `${t} 出现疑似凭证`).toBe(false);
    }
  });

  it("脚本不读取常见密钥环境变量（只读公开基址与环境 ID）", () => {
    for (const t of ["scripts/media-deploy.mjs", "scripts/media-check.mjs"]) {
      const src = readFileSync(join(ROOT, t), "utf8");
      for (const bad of ["SECRET_ID", "SECRET_KEY", "TENCENTCLOUD_SECRET", "ACCESS_TOKEN"]) {
        expect(src.includes(bad), `${t} 引用了 ${bad}`).toBe(false);
      }
    }
  });
});

describe("媒体规模（PASS 条件 1 的静态侧）", () => {
  it("远端媒体 46 个文件，且全部落在 content/ expeditions/ world/ 三个前缀下", () => {
    const files = MM.listRemoteFiles();
    expect(files.length).toBe(46);
    const allowed = ["content/", "expeditions/", "world/"];
    for (const f of files) {
      expect(allowed.some((p) => f.startsWith(p)), `${f} 不在允许的远端前缀下`).toBe(true);
    }
  });

  it("media-remote/ 下没有空目录残留干扰计数", () => {
    const dirs: string[] = [];
    const root = join(ROOT, "media-remote");
    (function walk(d: string) {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (!e.isDirectory()) continue;
        const p = join(d, e.name);
        dirs.push(p);
        walk(p);
      }
    })(root);
    for (const d of dirs) expect(readdirSync(d).length, d).toBeGreaterThan(0);
  });
});
