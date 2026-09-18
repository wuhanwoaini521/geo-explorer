/**
 * 包所有权守卫（Gate 3）
 *
 * 微信分包的两条硬规则，靠测试而不是靠人肉 review 来保证：
 *   1. 主包**不能**引用分包内的文件（分包可以引用主包）；
 *   2. 分包之间**不能**互相引用。
 *
 * 违反任一条件，开发者工具在真机上才报错（预览时可能看不出），所以这里做静态全扫：
 * 解析 app.json 的 pages + subpackages 得到包划分，再遍历所有
 * import / require / usingComponents 解析到的目标文件，判断包的归属。
 *
 * 同时断言：页面迁移后，每个页面的 index.{ts,json,wxml,wxss} 都真实存在且在正确的包内。
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "miniprogram");

interface AppJson {
  pages: string[];
  subpackages?: Array<{ root: string; name: string; pages: string[] }>;
}

const appJson = JSON.parse(readFileSync(join(SRC, "app.json"), "utf8")) as AppJson;
const SUB_ROOTS = (appJson.subpackages ?? []).map((s) => s.root);

/** 文件相对 miniprogram/ 的路径 → 所属包名（主包为 "main"） */
function packageOf(rel: string): string {
  const r = rel.split("\\").join("/");
  const hit = SUB_ROOTS.find((x) => r === x || r.startsWith(`${x}/`));
  return hit ?? "main";
}

const TEXT_EXTS = new Set([".ts", ".js", ".json", ".wxml", ".wxss"]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (TEXT_EXTS.has(p.slice(p.lastIndexOf(".")))) out.push(p);
  }
  return out;
}

const IMPORT_RE =
  /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function resolveTarget(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("/")) base = join(SRC, spec.slice(1));
  else if (spec.startsWith(".")) base = resolve(dirname(fromFile), spec);
  else return null;
  for (const c of [
    base,
    `${base}.ts`,
    `${base}.js`,
    `${base}.json`,
    join(base, "index.ts"),
    join(base, "index.js"),
    join(base, "index.json"),
    join(base, "index.wxss"),
    join(base, "index.wxml"),
  ]) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

interface Ref {
  from: string;
  fromPkg: string;
  spec: string;
  to: string;
  toPkg: string;
}

const violations: Ref[] = [];
const crossPkg: Ref[] = [];

for (const abs of walk(SRC)) {
  const rel = relative(SRC, abs);
  const fromPkg = packageOf(rel);
  const text = readFileSync(abs, "utf8");
  const specs: string[] = [];

  if (abs.endsWith(".json")) {
    try {
      const j = JSON.parse(text) as { usingComponents?: Record<string, string> };
      for (const v of Object.values(j.usingComponents ?? {})) specs.push(v);
    } catch {
      /* 非 JSON 语义的 .json 跳过 */
    }
  } else if (!abs.endsWith(".wxml") && !abs.endsWith(".wxss")) {
    IMPORT_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = IMPORT_RE.exec(text))) specs.push(m[1] || m[2] || m[3]);
  }

  for (const spec of specs) {
    if (!spec) continue;
    const target = resolveTarget(abs, spec);
    if (!target) continue;
    const toPkg = packageOf(relative(SRC, target));
    if (toPkg === fromPkg) continue;
    const rec: Ref = {
      from: rel.split("\\").join("/"),
      fromPkg,
      spec,
      to: relative(SRC, target).split("\\").join("/"),
      toPkg,
    };
    crossPkg.push(rec);
    if (fromPkg === "main") violations.push(rec);
    else if (toPkg !== "main") violations.push(rec); // 分包 ← 分包 同样禁止
  }
}

describe("Gate 3 分包所有权", () => {
  it("主包不引用任何分包文件（微信硬规则）", () => {
    const bad = violations.filter((v) => v.fromPkg === "main");
    expect(
      bad.map((v) => `${v.from} --${v.spec}--> ${v.to}`),
      "主包引用了分包文件，真机会加载失败",
    ).toEqual([]);
  });

  it("分包之间不互相引用（微信硬规则）", () => {
    const bad = violations.filter((v) => v.fromPkg !== "main" && v.toPkg !== "main");
    expect(
      bad.map((v) => `${v.from} --${v.spec}--> ${v.to}`),
      "分包之间互相引用，真机会加载失败",
    ).toEqual([]);
  });

  it("分包引用主包是允许的，且确实存在（证明切分不是空的）", () => {
    const ok = crossPkg.filter((v) => v.fromPkg !== "main" && v.toPkg === "main");
    expect(ok.length).toBeGreaterThan(0);
  });

  it("每个页面四件套都在其 app.json 声明的包内", () => {
    const entries: Array<{ pkg: string; dir: string }> = [];
    const dirOf = (p: string) => p.split("/").slice(0, -1).join("/");
    for (const p of appJson.pages) entries.push({ pkg: "main", dir: dirOf(p) });
    for (const sub of appJson.subpackages ?? []) {
      for (const p of sub.pages) entries.push({ pkg: sub.root, dir: dirOf(`${sub.root}/${p}`) });
    }
    expect(entries.length).toBe(13);
    for (const e of entries) {
      for (const ext of [".ts", ".json", ".wxml", ".wxss"]) {
        const f = join(SRC, `${e.dir}/index${ext}`);
        expect(existsSync(f), `${e.dir}/index${ext} 缺失`).toBe(true);
        expect(packageOf(`${e.dir}/index${ext}`), `${e.dir} 不在声明的包内`).toBe(e.pkg);
      }
    }
  });

  it("tabBar 五个页面都在主包", () => {
    const tab = JSON.parse(readFileSync(join(SRC, "app.json"), "utf8")).tabBar.list as Array<{
      pagePath: string;
    }>;
    for (const t of tab) {
      expect(appJson.pages).toContain(t.pagePath);
    }
  });
});
