/**
 * 生产构建边界守卫（Gate 2）
 *
 * 只被 vitest 测试与 scripts/content/* 内容流水线使用的模块，不应进入微信 runtime 包。
 * 边界由两处配置共同表达：
 *   - tsconfig.build.json 的 exclude   —— 决定哪些 .ts 不编译进 dist
 *   - scripts/runtime-excludes.mjs      —— 决定哪些资源不被 copy-assets 复制
 * 两者必须一一对应，否则会出现“编译排除了但资源还在复制”这类半吊子状态。
 *
 * 本测试同时做端到端断言：构建产物里不得出现这些模块，且它们也不得被任何生产入口可达。
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as runtimeExcludesModule from "../scripts/runtime-excludes.mjs";

// scripts/*.mjs 不参与 tsc 编译，由 tests/mjs-shims.d.ts 声明为 any，这里补回类型。
const RUNTIME_EXCLUDES: string[] = (
  runtimeExcludesModule as { RUNTIME_EXCLUDES: string[] }
).RUNTIME_EXCLUDES;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "miniprogram");
const DIST = join(ROOT, "dist", "miniprogram");

/** tsconfig.build.json 的 exclude 转成相对 miniprogram/ 的统一写法 */
function tsconfigBuildExcludes(): string[] {
  const cfg = JSON.parse(readFileSync(join(ROOT, "tsconfig.build.json"), "utf8"));
  return (cfg.exclude as string[])
    .filter((p) => p.startsWith("miniprogram/"))
    .map((p) => p.slice("miniprogram/".length));
}

function compiledPathOf(srcRel: string): string {
  return srcRel.replace(/\.ts$/, ".js");
}

describe("Gate 2 生产构建边界", () => {
  it("开发者工具默认审查正式产物并启用 JS 压缩", () => {
    const cfg = JSON.parse(readFileSync(join(ROOT, "project.config.json"), "utf8")) as {
      miniprogramRoot?: string;
      setting?: { minified?: boolean };
    };
    expect(cfg.miniprogramRoot).toBe("dist/miniprogram/");
    expect(cfg.setting?.minified).toBe(true);
  });

  it("本地完整媒体构建写入 dist-local，不污染生产 dist", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const localBuild = pkg.scripts["build:local-media"];
    expect(localBuild).toContain("--out-dir dist-local");
    expect(localBuild).toContain("--outDir dist-local/miniprogram");
    expect(localBuild).not.toMatch(/npm run clean(?:\s|$)/);
  });

  it("tsconfig.build.json exclude 覆盖清单中的全部 .ts 条目", () => {
    const fromTsconfig = tsconfigBuildExcludes().sort();
    const tsOnly = RUNTIME_EXCLUDES.filter((p) => p.endsWith(".ts")).sort();
    expect(fromTsconfig).toEqual(tsOnly);
  });

  it("清单内每个条目都确实存在（避免清单腐化）", () => {
    for (const rel of RUNTIME_EXCLUDES) {
      // project.private.config.json 是本地未跟踪文件，缺失属正常
      if (rel === "project.private.config.json" && !existsSync(join(SRC, rel))) continue;
      expect(existsSync(join(SRC, rel)), `${rel} 不存在，清单已过期`).toBe(true);
    }
  });

  it("构建产物不包含任何 dev-only 条目（.ts 编译物与资源）", () => {
    // dist 尚未构建时不做断言，避免在 clean 之后误报
    if (!existsSync(DIST)) return;
    for (const rel of RUNTIME_EXCLUDES) {
      const compiled = compiledPathOf(rel);
      expect(
        existsSync(join(DIST, compiled)),
        `dist 不应包含 ${compiled} —— 它只被测试/构建脚本使用`,
      ).toBe(false);
      if (compiled !== rel) {
        expect(
          existsSync(join(DIST, rel)),
          `dist 不应包含 ${rel} —— 它只被测试/构建脚本使用`,
        ).toBe(false);
      }
    }
  });

  it("dev-only 模块不被任何生产入口依赖（反向验证：清单漏加就会失败）", () => {
    const pageEntries: string[] = [];
    const appJson = JSON.parse(readFileSync(join(SRC, "app.json"), "utf8")) as {
      pages: string[];
      subpackages?: Array<{ root: string; pages: string[] }>;
    };
    for (const p of appJson.pages) pageEntries.push(join(SRC, `${p}.ts`));
    for (const sub of appJson.subpackages ?? []) {
      for (const p of sub.pages) pageEntries.push(join(SRC, sub.root, `${p}.ts`));
    }
    pageEntries.push(join(SRC, "app.ts"));
    pageEntries.push(join(SRC, "custom-tab-bar", "index.ts"));

    // 从生产入口出发做 import 闭包（只跟随相对 / 绝对路径，忽略 npm 包）
    const visited = new Set<string>();
    const stack = pageEntries.filter((p) => existsSync(p));
    expect(stack.length).toBeGreaterThan(0);

    const importRe =
      /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

    const resolveSpec = (fromFile: string, spec: string): string | null => {
      const base = spec.startsWith("/")
        ? join(SRC, spec.slice(1))
        : spec.startsWith(".")
          ? resolve(dirname(fromFile), spec)
          : null;
      if (!base) return null;
      for (const c of [base, `${base}.ts`, `${base}.js`, join(base, "index.ts")]) {
        if (existsSync(c) && statSync(c).isFile()) return c;
      }
      return null;
    };

    while (stack.length) {
      const file = stack.pop() as string;
      if (visited.has(file)) continue;
      visited.add(file);
      const text = readFileSync(file, "utf8");
      importRe.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = importRe.exec(text))) {
        const spec = m[1] || m[2] || m[3];
        if (!spec) continue;
        const target = resolveSpec(file, spec);
        if (target) stack.push(target);
      }
    }

    const reached = [...visited].map((p) => relative(SRC, p).split("\\").join("/"));
    const violations = RUNTIME_EXCLUDES.filter(
      (rel) => rel.endsWith(".ts") && reached.includes(rel),
    );
    expect(
      violations,
      `以下模块已被生产入口引用，不能继续排除在 runtime 包外：${violations.join(", ")}`,
    ).toEqual([]);
  });
});
