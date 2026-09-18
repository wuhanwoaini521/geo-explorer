// 媒体部署工具（Gate 4B）。
//
// 职责：扫描 media-remote/ → 校验路径 → 计算哈希 → 上传 → 汇报。
// 没有凭证时**不伪造上传结果**：以 dry-run 输出"将会上传什么"，并打印剩余的人工步骤。
//
// 用法：
//   npm run media:deploy -- --dry-run     只展示将要上传的文件（默认行为）
//   npm run media:deploy                  真实上传（需要 CloudBase 环境与登录态）
//   npm run media:deploy -- --manifest    重新生成 deploy/media-manifest.v1.json
//
// 凭证策略：**仓库不保存任何密钥**。CLI 的登录态由开发者本机的 CloudBase CLI 管理
// （`tcb login`），或通过 CI 的环境变量注入；本脚本不读取也不写出任何凭证。
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  MEDIA_VERSION,
  MANIFEST_PATH,
  REMOTE_ROOT,
  buildManifest,
  serializeManifest,
} from "./media-manifest.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run") || args.includes("-n");
const manifestOnly = args.includes("--manifest");
const envId = process.env.CLOUDBASE_ENV_ID ?? "";
const remoteBase = process.env.MEDIA_REMOTE_BASE ?? "";

/** 远端对象键前缀：<env>/geo-explorer/prod/<version>/ */
const OBJECT_PREFIX = `geo-explorer/prod/${MEDIA_VERSION}/`;

/** mediaKey 的路径安全校验 */
const KEY_RE = /^[a-z0-9][a-z0-9/_-]*\.(jpg|jpeg|png|webp|svg)$/i;

function haveTcbCli() {
  try {
    execFileSync("tcb", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function main() {
  const manifest = buildManifest();

  // 1) 写入清单（确定性）
  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, serializeManifest(manifest), "utf8");

  console.log("MEDIA DEPLOY");
  console.log(`  source     : ${REMOTE_ROOT}`);
  console.log(`  version    : ${MEDIA_VERSION}`);
  console.log(`  manifest   : deploy/media-manifest.v1.json`);
  console.log(`  files      : ${manifest.count}`);
  console.log(`  bytes      : ${manifest.totalBytes} (${(manifest.totalBytes / 1024).toFixed(1)} KB)`);

  // 2) 校验路径
  const bad = manifest.files.filter((f) => !KEY_RE.test(f.mediaKey) || f.mediaKey.includes(".."));
  if (bad.length) {
    console.error(`\nFAIL: ${bad.length} 个 mediaKey 不合法：`);
    for (const f of bad) console.error(`  ${f.mediaKey}`);
    process.exit(1);
  }
  console.log(`  path check : OK (${manifest.count} keys match ${KEY_RE})`);

  if (manifestOnly) {
    console.log("\n--manifest 模式：已生成清单，未上传。");
    return;
  }

  // 3) 上传
  const cli = haveTcbCli();
  const target = envId ? `cloud://${envId}/${OBJECT_PREFIX}` : `(env 未配置) ${OBJECT_PREFIX}`;
  console.log(`  target     : ${target}`);
  console.log(`  remoteBase : ${remoteBase || "(未配置)"}`);

  if (dryRun || !cli || !envId) {
    console.log("\n--- DRY RUN（未上传任何文件）---");
    for (const f of manifest.files) {
      console.log(`  WOULD UPLOAD  ${f.repoPath}  ->  ${OBJECT_PREFIX}${f.mediaKey}  (${f.bytes} B, ${f.sha256.slice(0, 12)}…)`);
    }
    console.log(`\n${manifest.count} file(s) would be uploaded, ${(manifest.totalBytes / 1024).toFixed(1)} KB total.`);

    if (!cli) console.log("\nBLOCKED: 本机没有 CloudBase CLI（tcb）。");
    if (!envId) console.log("BLOCKED: 未设置 CLOUDBASE_ENV_ID。");
    console.log("\n解除步骤见 docs/release-media-checklist.md：");
    console.log("  1. 开通并绑定 CloudBase 环境（环境名 geo-explorer-prod）");
    console.log(`  2. 创建云存储目录 geo-explorer/prod/${MEDIA_VERSION}/（content/ expeditions/ world/）`);
    console.log("  3. 权限设为「公开读取、客户端禁止写入」");
    console.log("  4. tcb login（登录态只留在本机，不入仓库）");
    console.log(`  5. CLOUDBASE_ENV_ID=<env-id> npm run media:deploy`);
    console.log("  6. MEDIA_REMOTE_BASE=https://<host>/geo-explorer/prod/v1/ npm run media:check");
    process.exit(0);
  }

  // 真实上传：逐文件调用 tcb CLI（不使用任何密钥参数，依赖本机登录态）
  let ok = 0;
  const failed = [];
  for (const f of manifest.files) {
    const from = join(REMOTE_ROOT, f.mediaKey);
    const to = `cloud://${envId}/${OBJECT_PREFIX}${f.mediaKey}`;
    try {
      execFileSync("tcb", ["storage", "upload", from, to], { stdio: "pipe" });
      ok++;
      console.log(`  UPLOADED  ${f.mediaKey}`);
    } catch (e) {
      failed.push({ key: f.mediaKey, error: String(e).slice(0, 200) });
      console.error(`  FAILED    ${f.mediaKey}`);
    }
  }

  console.log(`\nDEPLOY SUMMARY: ${ok}/${manifest.count} uploaded, ${failed.length} failed`);
  if (failed.length) {
    for (const f of failed) console.error(`  ${f.key}: ${f.error}`);
    process.exit(1);
  }
  console.log(`\n下一步：把 remeoteBase 配到生产构建并跑健康检查`);
  console.log(`  MEDIA_REMOTE_BASE=${remoteBase || "https://<host>/geo-explorer/prod/v1/"} npm run media:check`);
}

main();
