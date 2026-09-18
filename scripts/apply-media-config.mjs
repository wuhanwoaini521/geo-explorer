// 生产媒体基址的构建期注入（Gate 4B · Step 5 · 支持 GEO_MEDIA_BASE_URL 与 MEDIA_REMOTE_BASE）。
//
// 目的：生产构建不需要开发者手工改源码。CI / 本地发布时设
//   GEO_MEDIA_BASE_URL=https://<host>/geo-media/main-v1/
//   （或兼容别名 MEDIA_REMOTE_BASE=...）
// 本脚本把它写进构建输入文件 miniprogram/config/media-remote-base.ts。
//
// 环境变量未设置时**不做任何修改**（本地开发保持空值）。
// 仓库不保存任何凭证：本脚本只处理一个公开的 HTTPS 基址。
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = join(ROOT, "miniprogram", "config", "media-remote-base.ts");

export function readCurrentBase() {
  const src = readFileSync(TARGET, "utf8");
  const m = src.match(/export const MEDIA_REMOTE_BASE = "([^"]*)";/);
  return m ? m[1] : null;
}

function writeBase(value) {
  const src = readFileSync(TARGET, "utf8");
  const next = src.replace(
    /export const MEDIA_REMOTE_BASE = "[^"]*";/,
    `export const MEDIA_REMOTE_BASE = "${value}";`,
  );
  if (next === src) return false;
  writeFileSync(TARGET, next, "utf8");
  return true;
}

function getEnvBase() {
  if (process.env.GEO_MEDIA_BASE_URL) return process.env.GEO_MEDIA_BASE_URL;
  if (process.env.MEDIA_REMOTE_BASE) return process.env.MEDIA_REMOTE_BASE;

  // 尝试从 .env.local 读取
  const envLocal = join(ROOT, ".env.local");
  if (existsSync(envLocal)) {
    try {
      const content = readFileSync(envLocal, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx > 0) {
          const k = trimmed.slice(0, eqIdx).trim();
          let v = trimmed.slice(eqIdx + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.slice(1, -1);
          }
          if (k === "GEO_MEDIA_BASE_URL" && v) return v;
          if (k === "MEDIA_REMOTE_BASE" && v) return v;
        }
      }
    } catch {
      // 忽略
    }
  }
  return "";
}

const env = getEnvBase();
if (env === undefined || env === "") {
  const cur = readCurrentBase();
  console.log(
    `[media-config] 媒体基址未设置，保持当前值 ${cur === "" ? "(空 → 本地开发模式)" : cur}`,
  );
} else {
  const changed = writeBase(env);
  console.log(
    `[media-config] 写入 miniprogram/config/media-remote-base.ts：${env}` +
      (changed ? "" : "（值未变化）"),
  );
}
