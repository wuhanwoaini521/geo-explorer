// ✓ 构建前清理：删除 dist 内容，但允许「目录本身被占用」时保留目录骨架。
//
// 场景：微信开发者工具将 miniprogramRoot 设为 dist/miniprogram/ 并在运行——
// Windows 会锁住该目录项，fs.rmSync(recursive) 会抛 EPERM/EBUSY，导致
// `npm run clean`（进而整个 build）失败。
// 这里改为「文件全部删除 + 目录尽力删除」：文件级删除（tsc/copy-assets 重写）不受锁影响，
// 被占用的空目录保留待下次，发布语义等同全量重建。
import { existsSync, lstatSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
if (!existsSync(dist)) {
  console.log("[clean] dist 不存在，跳过");
  process.exit(0);
}

let removed = 0;
let keptDirs = 0;
const cannotRemove = [];

function walk(p) {
  const st = lstatSync(p);
  if (!st.isDirectory()) {
    try {
      rmSync(p, { force: true });
      removed++;
    } catch {
      cannotRemove.push(p);
    }
    return;
  }
  for (const e of readdirSync(p)) walk(join(p, e));
  try {
    rmSync(p, { force: true });
    if (lstatSync(p).isDirectory()) keptDirs++; // 仍在 => 目录被占用
  } catch {
    keptDirs++;
  }
}

walk(dist);

const summary = `[clean] 删除 ${removed} 个文件${keptDirs ? `；${keptDirs} 个目录被占用已保留` : ""}`;
if (cannotRemove.length) {
  console.warn("[clean] WARN: 以下文件无法删除（可能被占用），依赖覆盖写入：");
  for (const p of cannotRemove.slice(0, 20)) console.warn("  " + p);
  if (cannotRemove.length > 20) console.warn("  …");
}
console.log(summary);