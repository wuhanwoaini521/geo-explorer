// 将 miniprogram/ 下的非 TS 资源（wxml / wxss / json / 图片）复制到构建产物
// dist/miniprogram/，保留相对目录结构。.ts 源码由 tsc 单独编译为 .js。
//
// 三条边界：
//   1. Gate 2 —— 只被测试 / 内容脚本使用的源码不进 runtime 包（RUNTIME_EXCLUDES）。
//   2. Gate 4 —— CONTENT_REMOTE 类媒体不由代码包持有（media-ownership.mjs）。
//      它们保存在仓库的 media-remote/，正式构建**不复制**；构建后会断言产物中没有它们。
//   3. Gate 4 —— 本地开发需要完整媒体时用 `--with-local-media`
//      （对应 `npm run build:local-media`），把 media-remote/ 叠加进产物。
//
// 绝不"先正常构建、再手工删 dist 文件"：产物必须由构建规则直接得到。
import { cp, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, dirname, extname, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { RUNTIME_EXCLUDES } from "./runtime-excludes.mjs";
import { REMOTE_MEDIA_DIR, isRemoteOwned } from "./media-ownership.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "miniprogram");
const out = join(root, "dist", "miniprogram");
const remoteSrc = join(root, REMOTE_MEDIA_DIR);

const withLocalMedia = process.argv.includes("--with-local-media");

const ASSET_EXT = new Set([
  ".wxml",
  ".wxss",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
]);

const EXCLUDED = new Set(RUNTIME_EXCLUDES);

async function walk(dir) {
  const entries = await readdir(dir);
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    if ((await stat(full)).isDirectory()) {
      files.push(...(await walk(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function copyOne(from, rel) {
  const dest = join(out, rel);
  await mkdir(dirname(dest), { recursive: true });
  await cp(from, dest);
}

let copied = 0;
let skipped = 0;
for (const file of await walk(src)) {
  if (!ASSET_EXT.has(extname(file))) continue;
  const rel = file.slice(src.length + 1);
  if (EXCLUDED.has(rel.split(sep).join("/"))) {
    skipped++;
    continue;
  }
  await copyOne(file, rel);
  copied++;
}

let localMedia = 0;
if (withLocalMedia) {
  if (!existsSync(remoteSrc)) {
    console.warn(`[copy-assets] media-remote/ 不存在，本地媒体模式无内容可叠加`);
  } else {
    for (const file of await walk(remoteSrc)) {
      if (!ASSET_EXT.has(extname(file))) continue;
      const rel = join("assets", relative(remoteSrc, file));
      await copyOne(file, rel);
      localMedia++;
    }
  }
}

// 边界守卫：正式产物中不得出现远端媒体（本地开发 --with-local-media 模式除外）
let leaked = 0;
if (!withLocalMedia) {
  const assetsOut = join(out, "assets");
  if (existsSync(assetsOut)) {
    for (const file of await walk(assetsOut)) {
      const key = relative(assetsOut, file).split(sep).join("/");
      if (!isRemoteOwned(key)) continue;
      leaked++;
      console.error(`[copy-assets] ERROR 远端媒体出现在代码包中：assets/${key}`);
    }
  }
}

console.log(
  `[copy-assets] copied ${copied} resource file(s) → ${out}` +
    (skipped ? ` (skipped ${skipped} dev-only file(s))` : "") +
    (withLocalMedia ? ` (+${localMedia} local media for dev)` : ""),
);

if (!withLocalMedia && leaked > 0) {
  console.error(
    `[copy-assets] FAIL — ${leaked} 个远端媒体泄漏进代码包。` +
      `对外发布请确认 media-remote/ 只被 --with-local-media 使用。`,
  );
  process.exit(1);
}
