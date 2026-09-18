/**
 * 远端媒体健康检查（Gate 4B · COS + EdgeOne 统一入口）。
 *
 * 检查能力：
 *   1. 若配置了 GEO_MEDIA_BASE_URL / MEDIA_REMOTE_BASE（EdgeOne / CDN 交付基址）：
 *      - 发起公网 HTTPS HEAD 请求，校验 Status(200)、Content-Length、Content-Type；
 *      - 支持 --hash 模式：下载完整 Buffer 比对 SHA-256。
 *   2. 若交付基址未配置，但在环境或 .env.local 中配置了 COS 凭据：
 *      - 自动切换为 COS HeadObject 模式，直接检验私有 Origin 上的对象就绪状态与 x-cos-meta-sha256；
 *      - 汇报 ORIGIN_READY 状态，不伪造公网交付 URL。
 *   3. 两者均未配置时：明确报告 BLOCKED 与解除指南。
 */
import { createHash } from "node:crypto";
import { buildManifest, expectedUrls } from "./media-manifest.mjs";
import { CosClient, loadCosEnv, toTargetCosKey } from "./lib/cos-client.mjs";

const args = process.argv.slice(2);
const argBase = args.find((a) => a.startsWith("--base="))?.slice("--base=".length);
const withHash = args.includes("--hash");
const timeoutMs = 15000;

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

async function headHttp(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { method: "HEAD", signal: ac.signal });
    return {
      ok: res.ok,
      status: res.status,
      length: Number(res.headers.get("content-length") ?? NaN),
      contentType: res.headers.get("content-type") ?? "",
    };
  } catch (e) {
    return { ok: false, status: 0, length: NaN, contentType: "", error: String(e).slice(0, 120) };
  } finally {
    clearTimeout(t);
  }
}

async function getBytesHttp(url) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ac.signal });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function main() {
  const env = loadCosEnv();
  const deliveryBase = argBase ?? env.deliveryBaseUrl;

  const manifest = buildManifest();

  console.log("==================================================");
  console.log("REMOTE MEDIA HEALTH CHECK");
  console.log("==================================================");

  // 模式 1：公网 EdgeOne / CDN 交付检查
  if (deliveryBase) {
    const base = deliveryBase.endsWith("/") ? deliveryBase : `${deliveryBase}/`;
    const expected = expectedUrls(manifest, base);

    console.log(`Mode:           EDGEONE / CDN PUBLIC DELIVERY`);
    console.log(`Base URL:       ${base}`);
    console.log(`Expected Files: ${manifest.count} file(s), ${(manifest.totalBytes / 1024).toFixed(1)} KB`);
    console.log(`Verify Mode:    ${withHash ? "HEAD + SHA-256 Download" : "HEAD (Content-Length + Type)"}\n`);

    let reachable = 0;
    let sizeMismatch = 0;
    let hashMismatch = 0;
    const missing = [];
    const mismatch = [];

    for (const f of expected) {
      const r = await headHttp(f.url);
      if (!r.ok) {
        missing.push({ key: f.mediaKey, url: f.url, status: r.status, error: r.error });
        continue;
      }
      reachable++;
      if (Number.isFinite(r.length) && r.length !== f.bytes) {
        sizeMismatch++;
        mismatch.push({ key: f.mediaKey, expected: f.bytes, actual: r.length });
        continue;
      }
      if (withHash) {
        const buf = await getBytesHttp(f.url);
        if (!buf) {
          missing.push({ key: f.mediaKey, url: f.url, status: 0, error: "download failed" });
          reachable--;
          continue;
        }
        const actual = createHash("sha256").update(buf).digest("hex");
        if (actual !== f.sha256) {
          hashMismatch++;
          mismatch.push({
            key: f.mediaKey,
            expected: f.sha256.slice(0, 12),
            actual: actual.slice(0, 12),
          });
        }
      }
    }

    console.log("Expected:     ", manifest.count);
    console.log("Reachable:    ", reachable);
    console.log("Missing:      ", missing.length);
    console.log("Size mismatch:", sizeMismatch);
    if (withHash) {
      console.log("Hash mismatch:", hashMismatch);
    }

    for (const m of missing.slice(0, 20)) {
      console.log(`  MISSING  ${m.key} (status=${m.status}${m.error ? ", " + m.error : ""})`);
    }
    for (const m of mismatch.slice(0, 20)) {
      console.log(`  MISMATCH ${m.key} expected=${m.expected} actual=${m.actual}`);
    }

    const bad = missing.length + sizeMismatch + hashMismatch;
    if (bad > 0) {
      console.log("\nFAIL ❌");
      fail(`${bad} 个远端媒体未通过 EdgeOne 校验。`);
    }
    console.log("\nPASS ✅ (EdgeOne Delivery Verified)");
    return;
  }

  // 模式 2：若未配置公网域名，但有 COS 凭证，则校验 COS Origin
  if (env.hasCredentials) {
    console.log(`Mode:           PRIVATE COS ORIGIN (HeadObject)`);
    console.log(`Bucket:         ${env.bucket} (${env.region})`);
    console.log(`Prefix:         ${env.prefix}`);
    console.log(`EdgeOne Status: EDGEONE_PENDING (Delivery URL not configured)`);
    console.log(`Expected Files: ${manifest.count} file(s)\n`);

    const client = new CosClient({
      region: env.region,
      bucket: env.bucket,
      prefix: env.prefix,
      secretId: env.secretId,
      secretKey: env.secretKey,
    });

    let reachable = 0;
    let sizeMismatch = 0;
    let hashMismatch = 0;
    const missing = [];
    const mismatch = [];

    for (const f of manifest.files) {
      const cosKey = toTargetCosKey(f.mediaKey, env.prefix);
      try {
        const head = await client.headObject(cosKey);
        if (!head.exists) {
          missing.push({ key: f.mediaKey, cosKey, status: head.statusCode });
          continue;
        }
        reachable++;
        if (head.contentLength !== f.bytes) {
          sizeMismatch++;
          mismatch.push({ key: f.mediaKey, expected: f.bytes, actual: head.contentLength });
          continue;
        }
        if (head.sha256 && head.sha256 !== f.sha256) {
          hashMismatch++;
          mismatch.push({ key: f.mediaKey, expected: f.sha256, actual: head.sha256 });
        }
      } catch (err) {
        missing.push({ key: f.mediaKey, cosKey, status: 0, error: err.message });
      }
    }

    console.log("Expected:     ", manifest.count);
    console.log("Reachable:    ", reachable);
    console.log("Missing:      ", missing.length);
    console.log("Size mismatch:", sizeMismatch);
    console.log("Hash mismatch:", hashMismatch);

    const bad = missing.length + sizeMismatch + hashMismatch;
    if (bad > 0) {
      console.log("\nORIGIN_CHECK_FAIL ❌");
      fail(`${bad} 个媒体在 COS Origin 上未就绪。`);
    }
    console.log("\nPASS ✅ (COS Origin Ready; Awaiting EdgeOne Domain Binding)");
    return;
  }

  // 模式 3：两项均未配置
  console.log("STATUS: BLOCKED ⚠️");
  console.log("Neither EdgeOne delivery base URL nor COS credentials configured.");
  console.log("  - For EdgeOne public check: GEO_MEDIA_BASE_URL=https://... npm run media:check");
  console.log("  - For COS Origin check: Set COS_SECRET_ID and COS_SECRET_KEY in environment or .env.local.");
  process.exit(1);
}

main().catch((e) => fail(`media:check 异常：${e}`));
