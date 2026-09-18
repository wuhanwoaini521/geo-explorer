#!/usr/bin/env node
// package-audit —— 按微信分包结构统计构建产物体积。
//
// 为什么不直接统计 dist/miniprogram 总和：微信是按 app.json 声明的 subpackages
// 划分包的，主包 = 除分包根目录以外的全部文件。把所有文件算成主包会得出错误结论。
//
// 用法：
//   node scripts/package-audit.mjs            人类可读报告
//   node scripts/package-audit.mjs --json     机器可读（供 package:verify 消费）
//
// 退出码：0 = 全部在限额内；1 = 有包超限（供 CI / package:verify 使用）
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { REMOTE_MEDIA_DIR } from "./media-ownership.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist", "miniprogram");
const JSON_OUT = process.argv.includes("--json");

const KB = 1024;
const MIB = 1024 * 1024;

/** 微信小程序限额 */
export const LIMITS = {
  /** 单个分包 / 主包上限 */
  perPackage: 2 * MIB,
  /** 所有分包（含主包）合计上限 */
  total: 20 * MIB,
};

const MEDIA_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".mp3", ".m4a", ".aac", ".wav"]);

function walk(dir) {
  const out = [];
  (function w(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) w(p);
      else {
        const st = statSync(p);
        out.push({ path: relative(DIST, p).split("\\").join("/"), size: st.size });
      }
    }
  })(dir);
  return out;
}

function classify(rel) {
  const ext = rel.slice(rel.lastIndexOf(".")).toLowerCase();
  if (ext === ".js") return "js";
  if (MEDIA_EXT.has(ext)) return "media";
  return "other";
}

export function auditPackage(distRoot = DIST) {
  if (!existsSync(distRoot)) return { ok: false, missing: true };
  const appJson = JSON.parse(readFileSync(join(distRoot, "app.json"), "utf8"));
  const subRoots = (appJson.subpackages ?? appJson.subPackages ?? []).map((s) => s.root);

  const all = walk(distRoot);

  const buckets = new Map(); // name -> files[]
  buckets.set("main", []);
  for (const r of subRoots) buckets.set(r, []);

  for (const f of all) {
    const owner = subRoots.find((r) => f.path === r || f.path.startsWith(`${r}/`));
    buckets.get(owner ?? "main").push(f);
  }

  const packages = [];
  for (const [name, files] of buckets) {
    const sums = { js: 0, media: 0, other: 0 };
    const localMedia = [];
    for (const f of files) {
      const c = classify(f.path);
      sums[c] += f.size;
      if (c === "media") localMedia.push(f);
    }
    const total = sums.js + sums.media + sums.other;
    packages.push({
      name,
      isMain: name === "main",
      pageCount: (name === "main"
        ? appJson.pages
        : (appJson.subpackages ?? []).find((s) => s.root === name)?.pages ?? []
      ).length,
      fileCount: files.length,
      js: sums.js,
      media: sums.media,
      other: sums.other,
      total,
      /** 包内本地媒体（按大小降序）——用于核对"本地内容媒体≈0" */
      localMedia: localMedia.sort((a, b) => b.size - a.size),
      // 小程序单包上限对所有包一致
      overLimit: total > LIMITS.perPackage,
      top: [...files].sort((a, b) => b.size - a.size).slice(0, 20),
    });
  }

  const grandTotal = packages.reduce((s, p) => s + p.total, 0);
  const main = packages.find((p) => p.isMain);

  // 远端媒体统计（按所有权规则，统计仓库里 media-remote/ 的内容）
  const remote = remoteMediaStats();

  return {
    ok: !packages.some((p) => p.overLimit) && grandTotal <= LIMITS.total,
    missing: false,
    limits: LIMITS,
    packages,
    grandTotal,
    main,
    totalOverLimit: grandTotal > LIMITS.total,
    remote,
  };
}

/** 统计由远端持有的媒体（仓库 media-remote/ 目录） */
export function remoteMediaStats(repoRoot = join(DIST, "..", "..")) {
  const dir = join(repoRoot, REMOTE_MEDIA_DIR);
  if (!existsSync(dir)) return { count: 0, bytes: 0, dir: REMOTE_MEDIA_DIR };
  let count = 0;
  let bytes = 0;
  (function w(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) w(p);
      else {
        count++;
        bytes += statSync(p).size;
      }
    }
  })(dir);
  return { count, bytes, dir: REMOTE_MEDIA_DIR };
}

/* ---------------- 报告 ---------------- */

const k = (n) => (n / KB).toFixed(1);
const mib = (n) => (n / MIB).toFixed(2);

function printPackage(p) {
  console.log(`\n${p.name === "main" ? "MAIN" : p.name}  (${p.pageCount} pages, ${p.fileCount} files)`);
  console.log(`  JS      ${k(p.js).padStart(10)} KB`);
  console.log(`  Media   ${k(p.media).padStart(10)} KB   (${p.localMedia.length} local file(s))`);
  console.log(`  Other   ${k(p.other).padStart(10)} KB`);
  console.log(
    `  TOTAL   ${k(p.total).padStart(10)} KB  = ${mib(p.total)} MiB   ${p.overLimit ? "FAIL (>2 MiB)" : "PASS"}`,
  );
  if (p.localMedia.length) {
    console.log(`  local media by size:`);
    for (const f of p.localMedia.slice(0, 10)) console.log(`    ${k(f.size).padStart(8)} KB  ${f.path}`);
  }
  console.log(`  top 20 largest:`);
  for (const f of p.top) console.log(`    ${k(f.size).padStart(8)} KB  ${f.path}`);
}

function main() {
  const r = auditPackage();
  if (r.missing) {
    console.error("dist/miniprogram 不存在 —— 请先 npm run build");
    process.exit(1);
  }
  if (JSON_OUT) {
    console.log(JSON.stringify(r, null, 2));
    process.exit(r.ok ? 0 : 1);
  }

  console.log("PACKAGE REPORT");
  console.log(`limits: per-package ${mib(LIMITS.perPackage)} MiB, total ${mib(LIMITS.total)} MiB`);
  for (const p of r.packages) printPackage(p);
  console.log(`\nTotal: ${k(r.grandTotal)} KB = ${mib(r.grandTotal)} MiB  ${r.totalOverLimit ? "FAIL" : "PASS"}`);
  console.log(
    `\nMain package: ${k(r.main.total)} KB = ${mib(r.main.total)} MiB  ${r.main.overLimit ? "FAIL" : "PASS"} (limit 2 MiB)`,
  );
  console.log(
    `\nRemote-owned media (${r.remote.dir}/): ${r.remote.count} file(s), ${k(r.remote.bytes)} KB — 不在任何代码包内`,
  );
  const localOver200 = r.packages.flatMap((p) => p.localMedia).filter((f) => f.size > 200 * KB);
  console.log(`Local media >200 KB: ${localOver200.length}`);
  for (const f of localOver200) console.log(`  ${k(f.size).padStart(8)} KB  ${f.path}`);
  process.exit(r.ok ? 0 : 1);
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/package-audit.mjs");
if (isMain) main();
