// 将 miniprogram/ 下的非 TS 资源（wxml / wxss / json / 图片）复制到构建产物
// dist/miniprogram/，保留相对目录结构。.ts 源码由 tsc 单独编译为 .js。
import { cp, mkdir, readdir, stat } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "miniprogram");
const out = join(root, "dist", "miniprogram");

const ASSET_EXT = new Set([
  ".wxml",
  ".wxss",
  ".json",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
]);

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

let copied = 0;
for (const file of await walk(src)) {
  if (!ASSET_EXT.has(extname(file))) continue;
  const rel = file.slice(src.length + 1);
  const dest = join(out, rel);
  await mkdir(dirname(dest), { recursive: true });
  await cp(file, dest);
  copied++;
}
console.log(`[copy-assets] copied ${copied} resource file(s) → ${out}`);
