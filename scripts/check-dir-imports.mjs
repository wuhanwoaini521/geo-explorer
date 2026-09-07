// Gate 3.1 source-level scan — 源文件里的「目录级 import」。
//
// 目标：禁止依赖 Node directory index resolution 的 import（目录带 index.ts，
// 却写成裸目录路径）。微信小程序 module loader 不做这种解析，必须显式 /index。
// 既可被 CLI 直接执行，也可被 vitest import（回归测试复用同一逻辑）。
import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SELF_DIR = dirname(fileURLToPath(import.meta.url));

/**
 * 递归收集目录下源码文件（ts / mjs / js）。
 * @param {string} dir
 * @param {string[]} [out]
 */
function collectSources(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) collectSources(p, out);
    else if (/\.(ts|mjs|js)$/.test(e)) out.push(p);
  }
  return out;
}

/**
 * 扫描 roots 下所有 import 语句，找出两类不可运行的引用：
 *  ① 目录级 import：目标为带 index 的目录但未写 /index
 *  ② import .json：微信运行时不能 require .json 模块（会找 .json.js）
 * @param {string[]} roots
 * @returns {{ok: boolean; issues: Array<{file: string; spec: string; reason: string}>}}
 */
export function scanDirImports(roots) {
  const files = [];
  for (const base of roots) {
    if (!existsSync(base)) continue;
    collectSources(base, files);
  }
  files.sort();

  const rx = /(?:from\s+|import\s*\()\s*["'](\.[^"']+)["']/g;
  const issues = [];
  for (const f of files) {
    // 先去除注释（块注释 + 行注释），避免把注释里的示例 import 当成真引用
    const raw = readFileSync(f, "utf8");
    const src = raw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    let m;
    while ((m = rx.exec(src))) {
      const spec = m[1];
      if (spec.endsWith(".js")) continue;
      // ② .json 目标：运行时不可加载 → 一律判不合法，须改为 .ts 模块
      if (spec.endsWith(".json")) {
        issues.push({
          file: "./" + f.replace(/\\/g, "/"),
          spec,
          reason: "import 指向 .json —— 微信运行时只能加载编译的 .js 模块，需改为 .ts 模块",
        });
        continue;
      }
      const abs = join(dirname(f), spec);
      if (!existsSync(abs) || !statSync(abs).isDirectory()) continue;
      const hasIndex =
        existsSync(join(abs, "index.ts")) || existsSync(join(abs, "index.js"));
      if (hasIndex) {
        issues.push({
          file: "./" + f.replace(/\\/g, "/"),
          spec,
          reason: "目录级 import：需显式 /index",
        });
      }
    }
  }
  return { ok: issues.length === 0, issues, fileCount: files.length };
}

/* ---------------- CLI 入口 ---------------- */
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("check-dir-imports.mjs");

if (isMain) {
  const repoRoot = join(SELF_DIR, "..");
  const roots = ["miniprogram", "tests", "scripts", "tools"]
    .map((d) => join(repoRoot, d))
    .filter(existsSync);
  const { ok, issues, fileCount } = scanDirImports(roots);
  if (!ok) {
    console.error("FAIL: 检测到不可运行的 import（目录级 / .json 目标）：");
    for (const p of issues) {
      console.error(
        `  ${p.file}  →  import ... from "${p.spec}"  （${p.reason}）`,
      );
    }
    process.exit(1);
  }
  console.log(`[check-dir-imports] OK — ${fileCount} 个源文件全部通过（无目录级 import / 无 .json import）`);
}