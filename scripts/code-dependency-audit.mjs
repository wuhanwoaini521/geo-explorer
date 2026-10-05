#!/usr/bin/env node
// 从微信运行时入口遍历构建产物的 require / usingComponents 依赖，列出无入口依赖的 JS。
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist", "miniprogram");

const slash = (value) => value.replace(/\\/g, "/");

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(slash(relative(DIST, full)));
  }
  return files;
}

function normalizeModule(spec, from = "") {
  const raw = spec.startsWith("/")
    ? spec.slice(1)
    : posix.normalize(posix.join(posix.dirname(from), spec));
  const candidates = extname(raw) ? [raw] : [`${raw}.js`, `${raw}/index.js`];
  return candidates.find((candidate) => existsSync(join(DIST, ...candidate.split("/")))) ?? null;
}

export function auditCodeDependencies(distRoot = DIST) {
  if (distRoot !== DIST) throw new Error("auditCodeDependencies 当前只接受默认 dist/miniprogram");
  if (!existsSync(DIST)) return { missing: true, reachable: [], unreachable: [] };

  const app = JSON.parse(readFileSync(join(DIST, "app.json"), "utf8"));
  const queue = [];
  const reachable = new Set();

  const enqueue = (rel) => {
    const normalized = slash(rel).replace(/^\.\//, "");
    if (reachable.has(normalized) || !existsSync(join(DIST, ...normalized.split("/")))) return;
    reachable.add(normalized);
    queue.push(normalized);
  };

  const enqueueEntry = (base) => {
    enqueue(`${base}.js`);
    const json = `${base}.json`;
    if (existsSync(join(DIST, ...json.split("/")))) inspectJson(json);
  };

  const inspectJson = (rel) => {
    const value = JSON.parse(readFileSync(join(DIST, ...rel.split("/")), "utf8"));
    for (const spec of Object.values(value.usingComponents ?? {})) {
      const target = normalizeModule(String(spec), rel);
      if (target) enqueue(target);
    }
  };

  enqueue("app.js");
  if (existsSync(join(DIST, "custom-tab-bar", "index.js"))) enqueueEntry("custom-tab-bar/index");
  for (const page of app.pages ?? []) enqueueEntry(page);
  for (const sub of app.subpackages ?? app.subPackages ?? []) {
    for (const page of sub.pages ?? []) enqueueEntry(`${sub.root}/${page}`);
  }
  inspectJson("app.json");

  const requireRe = /require\(["']([^"']+)["']\)/g;
  while (queue.length) {
    const rel = queue.pop();
    const text = readFileSync(join(DIST, ...rel.split("/")), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    requireRe.lastIndex = 0;
    let match;
    while ((match = requireRe.exec(text))) {
      const spec = match[1];
      if (!spec.startsWith(".") && !spec.startsWith("/")) continue;
      const target = normalizeModule(spec, rel);
      if (target) enqueue(target);
    }
    const json = rel.replace(/\.js$/, ".json");
    if (existsSync(join(DIST, ...json.split("/")))) inspectJson(json);
  }

  const allJs = walk(DIST).filter((file) => file.endsWith(".js"));
  const unreachable = allJs.filter((file) => !reachable.has(file)).sort();
  return { missing: false, reachable: [...reachable].sort(), unreachable };
}

const isMain = process.argv[1] && slash(process.argv[1]).endsWith("scripts/code-dependency-audit.mjs");
if (isMain) {
  const result = auditCodeDependencies();
  if (result.missing) {
    console.error("dist/miniprogram 不存在，请先运行 npm run build");
    process.exit(1);
  }
  console.log(`reachable JS: ${result.reachable.length}`);
  console.log(`unreachable JS: ${result.unreachable.length}`);
  for (const file of result.unreachable) {
    const bytes = statSync(join(DIST, ...file.split("/"))).size;
    console.log(`  ${String(bytes).padStart(7)} B  ${file}`);
  }
  process.exit(result.unreachable.length ? 1 : 0);
}
