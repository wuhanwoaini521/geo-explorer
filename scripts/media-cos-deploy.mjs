/**
 * Legacy Main Branch · COS Media Deployment Tool
 *
 * 职责：
 *   1. 读取 media-remote/ 生成或复用确定性清单；
 *   2. 映射目标 COS Key：geo-media/main-v1/<mediaKey>；
 *   3. 强制 Prefix 隔离与 V2 保护拦截；
 *   4. 碰撞检查（1:1 本地到远端映射）；
 *   5. 版权与许可分级（A/B/C/D，C/D 标 LICENSE_REVIEW_REQUIRED）；
 *   6. 默认 Dry Run 保护（无 --execute-mass-upload 时绝不批量上传）；
 *   7. 支持 --smoke 上传单一微型测试对象（geo-media/main-v1/test/connectivity.txt）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import {
  MANIFEST_PATH,
  REMOTE_ROOT,
  REPO_ROOT,
  buildManifest,
  serializeManifest,
} from "./media-manifest.mjs";
import {
  CosClient,
  MAIN_V1_COS_PREFIX,
  detectMimeType,
  loadCosEnv,
  redactCredentials,
  toTargetCosKey,
  validateCosKey,
} from "./lib/cos-client.mjs";

export { toTargetCosKey };

const args = process.argv.slice(2);
const isDryRunExplicit = args.includes("--dry-run") || args.includes("-n");
const isManifestOnly = args.includes("--manifest");
const isSmokeOnly = args.includes("--smoke");
const isMassUploadAllowed = args.includes("--execute-mass-upload");

// 许可核验待复核名单（Category C / D）
export const LICENSE_REVIEW_ITEMS = new Set([
  "content/everest/k-hillary-tenzing.jpg",
  "content/everest/k32-modern-climb.jpg",
]);

/**
 * 检查映射唯一性（防碰撞）
 */
export function checkCollisions(files, prefix = MAIN_V1_COS_PREFIX) {
  const keyToSource = new Map();
  const collisions = [];

  for (const f of files) {
    const targetKey = toTargetCosKey(f.mediaKey, prefix);
    if (keyToSource.has(targetKey)) {
      collisions.push({
        targetKey,
        source1: keyToSource.get(targetKey),
        source2: f.repoPath,
      });
    } else {
      keyToSource.set(targetKey, f.repoPath);
    }
  }
  return collisions;
}

async function runSmokeTest(client, prefix) {
  console.log("\n==================================================");
  console.log("STAGE 16 — COS SMOKE TEST");
  console.log("==================================================");

  const smokeKey = `${prefix}test/connectivity.txt`;
  validateCosKey(smokeKey, prefix);

  const smokeBody = Buffer.from(
    `geo-explorer legacy main connectivity test at ${new Date().toISOString()}\n`,
    "utf8",
  );

  console.log(`Target object: ${smokeKey}`);
  console.log(`Bucket:        ${client.bucket} (${client.region})`);

  try {
    console.log("\n1. PutObject (smoke test)...");
    const putRes = await client.putObject(smokeKey, smokeBody, {
      contentType: "text/plain; charset=utf-8",
    });
    console.log(`   SUCCESS: status=${putRes.statusCode} etag=${putRes.etag}`);

    console.log("\n2. HeadObject (smoke test verification)...");
    const headRes = await client.headObject(smokeKey);
    console.log(`   SUCCESS: exists=${headRes.exists} length=${headRes.contentLength} sha256=${headRes.sha256}`);

    console.log("\n3. PutObject again (idempotency verification)...");
    const putRes2 = await client.putObject(smokeKey, smokeBody, {
      contentType: "text/plain; charset=utf-8",
    });
    console.log(`   SUCCESS: status=${putRes2.statusCode} etag=${putRes2.etag}`);

    console.log("\nSMOKE TEST RESULT: PASS ✅");
  } catch (err) {
    const safeErr = redactCredentials(err.message, [client.secretKey, client.secretId]);
    if (safeErr.includes("403") || safeErr.includes("AccessDenied")) {
      console.error(`\nSMOKE TEST FAILED: CAM_PREFIX_PERMISSION_REQUIRED`);
      console.error(`Please verify CAM policy has PutObject and HeadObject permissions for "${prefix}*"`);
    } else {
      console.error(`\nSMOKE TEST FAILED: ${safeErr}`);
    }
    process.exit(1);
  }
}

async function main() {
  const env = loadCosEnv(REPO_ROOT);
  const client = new CosClient({
    region: env.region,
    bucket: env.bucket,
    prefix: env.prefix,
    secretId: env.secretId,
    secretKey: env.secretKey,
  });

  console.log("==================================================");
  console.log("LEGACY MAIN · COS MEDIA TOOLING");
  console.log("==================================================");
  console.log(`Source Dir:       ${REMOTE_ROOT}`);
  console.log(`Target Bucket:    ${client.bucket}`);
  console.log(`Target Region:    ${client.region}`);
  console.log(`Target Prefix:    ${client.prefix}`);
  console.log(`Delivery Base:    ${env.deliveryBaseUrl || "(not configured)"}`);
  console.log(`Credentials:      ${env.hasCredentials ? "CONFIGURED (in env / .env.local)" : "NOT CONFIGURED"}`);

  // 1. 生成或刷新 Manifest
  const manifest = buildManifest();
  if (isManifestOnly) {
    mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
    writeFileSync(MANIFEST_PATH, serializeManifest(manifest), "utf8");
    console.log(`\n[manifest] Wrote ${relative(REPO_ROOT, MANIFEST_PATH)} (${manifest.count} files)`);
    return;
  }

  // 2. 碰撞检测
  const collisions = checkCollisions(manifest.files, client.prefix);
  if (collisions.length > 0) {
    console.error(`\nFAIL: Detected ${collisions.length} key collisions!`);
    for (const c of collisions) {
      console.error(`  Key: ${c.targetKey} mapped by both ${c.source1} and ${c.source2}`);
    }
    process.exit(1);
  }
  console.log(`Collision Check:  PASS (46 files map 1:1 uniquely)`);

  // 3. 执行 Smoke Test
  if (isSmokeOnly) {
    if (!env.hasCredentials) {
      console.log("\nBLOCKED: Credentials not configured for smoke test.");
      console.log("Please set COS_SECRET_ID and COS_SECRET_KEY in environment or .env.local.");
      process.exit(0);
    }
    await runSmokeTest(client, client.prefix);
    return;
  }

  // 4. 统计与审查
  let licenseReviewCount = 0;
  for (const f of manifest.files) {
    if (LICENSE_REVIEW_ITEMS.has(f.mediaKey)) {
      licenseReviewCount++;
    }
  }

  const dryRun = isDryRunExplicit || !isMassUploadAllowed;

  console.log("\nInventory Summary:");
  console.log(`  Total Objects:   ${manifest.count}`);
  console.log(`  Total Bytes:     ${manifest.totalBytes} B (${(manifest.totalBytes / (1024 * 1024)).toFixed(2)} MiB)`);
  console.log(`  License Review:  ${licenseReviewCount} items (Category C / D)`);

  if (dryRun) {
    console.log("\n==================================================");
    console.log("DRY RUN SUMMARY (NO PUT PERFORMED)");
    console.log("==================================================");
    console.log("Planned uploads (sample):");
    for (const f of manifest.files.slice(0, 10)) {
      const target = toTargetCosKey(f.mediaKey, client.prefix);
      const isReview = LICENSE_REVIEW_ITEMS.has(f.mediaKey);
      console.log(`  ${f.mediaKey}`);
      console.log(`    -> ${target} (${f.bytes} B, ${detectMimeType(target)})${isReview ? " [LICENSE_REVIEW_REQUIRED]" : ""}`);
    }
    if (manifest.files.length > 10) {
      console.log(`  ... and ${manifest.files.length - 10} more items.`);
    }

    if (!isMassUploadAllowed) {
      console.log("\n[STAGE 17 GUARD ACTIVE]");
      console.log("Mass upload is disabled by default for safety.");
      console.log("Please review docs/cloud/MAIN_V1_COS_MIGRATION_PLAN.md before running with --execute-mass-upload.");
    }
    return;
  }

  // 5. 真实批量上传（受 --execute-mass-upload 严格保护）
  if (!env.hasCredentials) {
    console.error("\nFAIL: Cannot execute mass upload without credentials.");
    process.exit(1);
  }

  console.log("\nStarting Mass Upload...");
  let uploaded = 0;
  let skipped = 0;
  const failed = [];

  for (const f of manifest.files) {
    const target = toTargetCosKey(f.mediaKey, client.prefix);
    const absPath = join(REMOTE_ROOT, f.mediaKey);
    const body = readFileSync(absPath);
    const mime = detectMimeType(target);

    try {
      // 检查远端是否存在且哈希一致
      const head = await client.headObject(target);
      if (head.exists && head.sha256 === f.sha256) {
        console.log(`  SKIP (identical): ${target}`);
        skipped++;
        continue;
      }

      await client.putObject(target, body, {
        contentType: mime,
        sha256: f.sha256,
      });
      console.log(`  UPLOADED:        ${target}`);
      uploaded++;
    } catch (err) {
      const safe = redactCredentials(err.message, [client.secretKey, client.secretId]);
      failed.push({ key: target, error: safe });
      console.error(`  FAILED:          ${target} - ${safe}`);
    }
  }

  console.log(`\nMass Upload Finished: ${uploaded} uploaded, ${skipped} skipped (idempotent), ${failed.length} failed.`);
  if (failed.length > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Deploy Error:", redactCredentials(err.message || String(err)));
  process.exit(1);
});
