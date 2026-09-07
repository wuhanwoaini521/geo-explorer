// Gate 3.1 regression check — 编译产物（dist/miniprogram）。
//
// 微信小程序 AppService module loader 不做 Node 式目录 index resolution，
// 因此编译后的每个「相对 require」都必须直接解析到：
//   - 存在的 .js
//   - 存在的 .json
//   - 或显式 /index(.js)（目录级必须写全 /index，禁止裸目录引用）
//
// 既可被 CLI 直接执行（npm run build 后校验），也可被 vitest import（回归测试复用同一逻辑）。
import { existsSync, readdirSync, statSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";

/** 递归收集目录下全部 .js 文件 */
function walkJsFiles(distRoot) {
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      if (statSync(p).isDirectory()) walk(p);
      else if (p.endsWith(".js")) out.push(p);
    }
  })(distRoot);
  return out;
}

/**
 * 对一份编译产物目录里的所有 .js 做相对 require 合法性检查。
 *
 * 规则（微信小程序 module loader 语义）：
 *   - 相对 require 必须解析到已编译的 .js 模块（含显式 /index 或 /index.js）；
 *   - 禁止解析为裸 .json（loader 会把 require("./x.json") 变成寻找 x.json.js）；
 *   - 禁止依赖 Node 式目录 index resolution（找 xxx.js 而非 xxx/index.js）。
 * @param {string} distRoot 编译产物根目录（如 dist/miniprogram）
 * @returns {{ok: boolean; issues: Array<{file: string; require: string; reason: string}>; fileCount: number; skipped: boolean}}
 */
export function checkDistRequires(distRoot) {
  if (!existsSync(distRoot)) {
    return { ok: true, issues: [], fileCount: 0, skipped: true };
  }
  const jsFiles = walkJsFiles(distRoot);
  const issues = [];
  const rx = /require\(["'](\.[^"']+)["']\)/g;

    for (const file of jsFiles) {
    // 先去除注释（块注释 + 行注释），避免把注释里的示例 require 当成真引用
    const raw = readFileSync(file, "utf8");
    const src = raw
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    let m;
    while ((m = rx.exec(src))) {
      const req = m[1];
      // .json 目标：微信运行时不可 require .json 模块（会找 .json.js）→ 直接判不合法
      if (req.endsWith(".json")) {
        issues.push({
          file: "./" + file.slice(distRoot.length + 1).replace(/\\/g, "/"),
          require: req,
          reason: "require 指向 .json —— 微信运行时只能加载编译的 .js 模块，需改为 .ts 模块",
        });
        continue;
      }
      const base = join(dirname(file), req);
      // 微信 loader 语义：require("p") 只会尝试 p 本身与 p+".js"（不会做 p/index 目录解析）。
      const candidates = [base, base + ".js"];
      const exists = candidates.some(
        (c) => existsSync(c) && statSync(c).isFile(),
      );
      // 命中显式 .js 文件 => 合法；否则视为「依赖目录 index」或拼写错误的悬空引用
      if (exists) continue;
      issues.push({
        file: "./" + file.slice(distRoot.length + 1).replace(/\\/g, "/"),
        require: req,
        reason: "unresolved / directory-index relative require",
      });
    }
  }
  return { ok: issues.length === 0, issues, fileCount: jsFiles.length, skipped: false };
}

/* ---------------- CLI 入口（npm run build 后执行） ---------------- */
const isMain =
  typeof process !== "undefined" &&
  process.argv[1] &&
  process.argv[1].replace(/\\/g, "/").endsWith("check-requires.mjs");

if (isMain) {
  const { fileURLToPath } = await import("node:url");
  const root = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "dist",
    "miniprogram",
  );
  const { ok, issues, fileCount, skipped } = checkDistRequires(root);
  if (!ok) {
    console.error("FAIL: 以下 require 无法在微信 module loader 下解析（裸目录引用）：");
    for (const it of issues) {
      console.error(`  ${it.file}`);
      console.error(`    require("${it.require}")  ${it.reason}`);
    }
    process.exit(1);
  }
  if (skipped) {
    console.warn("[check-requires] dist/miniprogram 不存在，已跳过（应在 build 后校验）");
  } else {
    console.log(
      `[check-requires] OK — ${fileCount} 个 JS 文件全部通过（无目录级 require / 无悬空引用）`,
    );
  }
}