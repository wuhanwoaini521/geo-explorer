// 生产构建守卫（Gate 4B · Step 6）。
//
// 关键风险：`npm run build` 在 remoteBase 为空时会照常成功 —— 这对开发可接受，
// 但对**发布**不可接受：正式包里没有内容媒体，远端又没配，用户只会看到占位图。
//
// 本脚本是 `build:prod` 的第一道闸：基址为空 / 非 https / 不以 / 结尾 / 含凭证 → 拒绝出包。
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = join(ROOT, "miniprogram", "config", "media-remote-base.ts");

export function readBase(path = TARGET) {
  const m = readFileSync(path, "utf8").match(/export const MEDIA_REMOTE_BASE = "([^"]*)";/);
  return m ? m[1] : null;
}

/** 校验生产媒体基址；返回问题列表（空数组 = 通过） */
export function validateProductionBase(base) {
  const problems = [];
  if (base === null) return ["无法从 miniprogram/config/media-remote-base.ts 读取 MEDIA_REMOTE_BASE"];
  if (base.length === 0) {
    problems.push("远端媒体基址为空");
    return problems;
  }
  if (!base.startsWith("https://")) problems.push("必须以 https:// 开头（微信要求安全域名）");
  if (!base.endsWith("/")) problems.push("必须以 / 结尾（否则路径拼接会出错）");
  try {
    const u = new URL(base);
    if (u.username || u.password) problems.push("URL 中不得包含任何凭证（user:pass@）");
    if (!u.hostname) problems.push("缺少 hostname");
  } catch {
    problems.push("不是合法 URL");
  }
  return problems;
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/check-media-config.mjs");
if (isMain) {
  const base = readBase();
  const problems = validateProductionBase(base);
  if (problems.length) {
    console.error("Production media base is not configured.");
    console.error("Refusing to create release build.\n");
    console.error(`  MEDIA_REMOTE_BASE = ${base === null ? "(读取失败)" : JSON.stringify(base)}`);
    for (const p of problems) console.error(`  - ${p}`);
    console.error("\n解除方式（二选一）：");
    console.error("  1) MEDIA_REMOTE_BASE=https://<host>/geo-explorer/prod/v1/ npm run build:prod");
    console.error("  2) 在 miniprogram/config/media-remote-base.ts 中填写该值");
    console.error("\n完整步骤见 docs/release-media-checklist.md。");
    console.error("本地完整视觉开发请用：npm run build:local-media");
    process.exit(1);
  }
  console.log(`[media-config] 生产基址校验通过：${base}`);
}
