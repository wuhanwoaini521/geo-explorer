// 媒体部署清单（Gate 4B）—— 从 media-remote/ 的**真实文件**生成，不手工维护。
//
// 设计约束：
//   - 确定性：按 mediaKey 排序、固定缩进、固定字段顺序、行尾统一 LF，重复运行字节一致；
//   - remoteBase 保持路径同构：mediaKey `content/fuji/x.jpg` → `<remoteBase>content/fuji/x.jpg`，
//     部署端不做任何逐文件 URL 改写；
//   - 只记录非敏感信息（键 / 相对路径 / 字节数 / sha256）。
//
// 用法：
//   node scripts/media-manifest.mjs           打印摘要
//   node scripts/media-manifest.mjs --write   写入 deploy/media-manifest.v1.json
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { REMOTE_MEDIA_DIR } from "./media-ownership.mjs";

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const REMOTE_ROOT = join(REPO_ROOT, REMOTE_MEDIA_DIR);
export const MANIFEST_PATH = join(REPO_ROOT, "deploy", "media-manifest.v1.json");
/** 远端版本目录：与 cloudbase 方案一致，内容变化时新建 v2/ 而不是覆盖 v1/ */
export const MEDIA_VERSION = "v1";

/** 递归列出 media-remote/ 下的全部文件（相对路径，正斜杠） */
export function listRemoteFiles(root = REMOTE_ROOT) {
  if (!existsSync(root)) return [];
  const out = [];
  (function walk(d) {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else out.push(relative(root, p).split("\\").join("/"));
    }
  })(root);
  return out.sort();
}

export function sha256File(abs) {
  return createHash("sha256").update(readFileSync(abs)).digest("hex");
}

/**
 * 构建部署清单对象（确定性）。
 *
 * @param root media-remote/ 根目录
 * @param repoRoot 用于计算 manifest 里的 repoPath 字段
 */
export function buildManifest(root = REMOTE_ROOT) {
  const keys = listRemoteFiles(root);
  const files = keys.map((mediaKey) => {
    const abs = join(root, mediaKey);
    const st = statSync(abs);
    return {
      mediaKey,
      repoPath: `${REMOTE_MEDIA_DIR}/${mediaKey}`,
      bytes: st.size,
      sha256: sha256File(abs),
    };
  });
  const totalBytes = files.reduce((s, f) => s + f.bytes, 0);
  return {
    schemaVersion: 1,
    generator: "scripts/media-manifest.mjs",
    version: MEDIA_VERSION,
    // 只放非敏感信息：远端基址由 CONFIG.media.remoteBase 提供，不进清单
    pathContract: "mediaKey 与远端对象键一一对应：<remoteBase><mediaKey>",
    count: files.length,
    totalBytes,
    files,
  };
}

/** 稳定序列化：固定字段顺序 + LF + 末尾换行 */
export function serializeManifest(manifest) {
  return JSON.stringify(manifest, null, 2).replace(/\r\n/g, "\n") + "\n";
}

/** 计算每个文件的期望远端 URL */
export function expectedUrls(manifest, remoteBase) {
  const base = remoteBase.endsWith("/") ? remoteBase : `${remoteBase}/`;
  return manifest.files.map((f) => ({ ...f, url: `${base}${f.mediaKey}` }));
}

const isMain = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("scripts/media-manifest.mjs");
if (isMain) {
  const write = process.argv.includes("--write");
  const m = buildManifest();
  if (write) {
    mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
    writeFileSync(MANIFEST_PATH, serializeManifest(m), "utf8");
    console.log(`[media-manifest] wrote ${relative(REPO_ROOT, MANIFEST_PATH).split("\\").join("/")}`);
  }
  console.log(`[media-manifest] ${m.count} file(s), ${(m.totalBytes / 1024).toFixed(1)} KB, version=${m.version}`);
  if (!write) console.log("(未写入；加 --write 生成清单)");
}
