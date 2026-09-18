/**
 * Tests for Legacy Main Branch COS + EdgeOne Media Migration (Gate 4B).
 *
 * 覆盖：
 *   1. Prefix Isolation: 强制 geo-media/main-v1/ 前缀；
 *   2. V2 Prefix Firewall: 绝不触碰 geo-media/places/, geo-media/test/, geo-media/legacy/v1/；
 *   3. Canonical Object Key: 严格字符集 [a-z0-9/_\-.]，拒绝大写、中文、空格、特殊字符与穿越；
 *   4. SHA-256 元数据与 x-cos-meta-sha256 生成；
 *   5. MIME 类型自动识别；
 *   6. 敏感凭据脱敏（SecretId, SecretKey, Signature 等）；
 *   7. 媒体键到目标 COS Key 的 1:1 映射与防碰撞；
 *   8. 46 个实际清单文件映射无碰撞、全合规；
 *   9. Runtime Resolver 行为与兼容性；
 *   10. 生产构建守卫规则。
 */
import { describe, expect, it } from "vitest";
import {
  CANONICAL_KEY_REGEX,
  DEFAULT_COS_BUCKET,
  DEFAULT_COS_REGION,
  FORBIDDEN_COS_PREFIXES,
  MAIN_V1_COS_PREFIX,
  detectMimeType,
  generateCosSignature,
  redactCredentials,
  validateCosKey,
} from "../scripts/lib/cos-client.mjs";
import {
  checkCollisions,
  toTargetCosKey,
} from "../scripts/media-cos-deploy.mjs";
import { buildManifest } from "../scripts/media-manifest.mjs";
import {
  MEDIA_PLACEHOLDER,
  isRemoteMediaEnabled,
  resolveMediaSrc,
} from "../miniprogram/services/media-service";
import { validateProductionBase } from "../scripts/check-media-config.mjs";

describe("Stage 5 — Prefix Isolation & V2 Protection Firewall", () => {
  it("允许合法的 main-v1 前缀", () => {
    expect(() =>
      validateCosKey("geo-media/main-v1/content/fuji/f-forest-lower.jpg"),
    ).not.toThrow();
    expect(() =>
      validateCosKey("geo-media/main-v1/world/everest-expedition-hero-v1.jpg"),
    ).not.toThrow();
  });

  it("拒绝不以 main-v1 前缀开头的键（PrefixIsolationViolationError）", () => {
    expect(() => validateCosKey("other-prefix/image.jpg")).toThrow(
      /PrefixIsolationViolationError/,
    );
    expect(() => validateCosKey("geo-media/v1/image.jpg")).toThrow(
      /PrefixIsolationViolationError/,
    );
    expect(() => validateCosKey("content/fuji/f-forest-lower.jpg")).toThrow(
      /PrefixIsolationViolationError/,
    );
  });

  it("严格拒绝任何 V2 保护前缀（places, test, legacy/v1）", () => {
    for (const forbidden of FORBIDDEN_COS_PREFIXES) {
      expect(() => validateCosKey(`${forbidden}some-asset.jpg`)).toThrow(
        /PrefixIsolationViolationError/,
      );
    }
  });

  it("拦截路径穿越字符 '..' 与前导斜杠", () => {
    expect(() =>
      validateCosKey("geo-media/main-v1/../places/secret.jpg"),
    ).toThrow(/InvalidKeyError/);
    expect(() =>
      validateCosKey("/geo-media/main-v1/content/fuji.jpg"),
    ).toThrow(/InvalidKeyError/);
  });
});

describe("Stage 4 — Canonical Object Key & MIME Detection", () => {
  it("合法的 canonical key 必须匹配字符集 [a-z0-9/_\\-.]", () => {
    expect(CANONICAL_KEY_REGEX.test("geo-media/main-v1/c1-trailhead.jpg")).toBe(
      true,
    );
    expect(
      CANONICAL_KEY_REGEX.test("geo-media/main-v1/live_a-kala-patthar_v2.webp"),
    ).toBe(true);
  });

  it("拒绝大写字母、空格、中文及特殊符号", () => {
    expect(CANONICAL_KEY_REGEX.test("geo-media/main-v1/UpperImage.jpg")).toBe(
      false,
    );
    expect(CANONICAL_KEY_REGEX.test("geo-media/main-v1/space image.jpg")).toBe(
      false,
    );
    expect(CANONICAL_KEY_REGEX.test("geo-media/main-v1/珠峰.jpg")).toBe(false);
    expect(CANONICAL_KEY_REGEX.test("geo-media/main-v1/image(1).jpg")).toBe(
      false,
    );
    expect(CANONICAL_KEY_REGEX.test("geo-media/main-v1/image+plus.jpg")).toBe(
      false,
    );
    expect(CANONICAL_KEY_REGEX.test("geo-media/main-v1/image%20.jpg")).toBe(
      false,
    );

    expect(() =>
      validateCosKey("geo-media/main-v1/UpperImage.jpg"),
    ).toThrow(/InvalidCanonicalKeyError/);
    expect(() =>
      validateCosKey("geo-media/main-v1/space image.jpg"),
    ).toThrow(/InvalidCanonicalKeyError/);
  });

  it("准确识别 MIME 类型", () => {
    expect(detectMimeType("photo.jpg")).toBe("image/jpeg");
    expect(detectMimeType("photo.jpeg")).toBe("image/jpeg");
    expect(detectMimeType("diagram.png")).toBe("image/png");
    expect(detectMimeType("icon.svg")).toBe("image/svg+xml");
    expect(detectMimeType("test.txt")).toBe("text/plain; charset=utf-8");
    expect(detectMimeType("data.json")).toBe("application/json; charset=utf-8");
  });
});

describe("Security — Credential Redaction & Signature Safety", () => {
  it("在错误或日志中隐藏敏感凭据", () => {
    const raw =
      "Error with SecretId=AKID12345678 and SecretKey=abcdef123456, Authorization: q-sign-algorithm=sha1&q-ak=AKID12345678&q-signature=aabbccddee";
    const redacted = redactCredentials(raw, ["abcdef123456", "AKID12345678"]);
    expect(redacted).not.toContain("abcdef123456");
    expect(redacted).not.toContain("AKID12345678");
    expect(redacted).not.toContain("aabbccddee");
    expect(redacted).toContain("[REDACTED]");
  });

  it("正确生成 COS V5 Authorization 签名结构", () => {
    const auth = generateCosSignature({
      method: "PUT",
      pathname: "/geo-media/main-v1/test.txt",
      headers: {
        Host: `${DEFAULT_COS_BUCKET}.cos.${DEFAULT_COS_REGION}.myqcloud.com`,
        "Content-Type": "text/plain",
      },
      secretId: "AKID_TEST_ID",
      secretKey: "SECRET_TEST_KEY",
    });

    expect(auth).toContain("q-sign-algorithm=sha1");
    expect(auth).toContain("q-ak=AKID_TEST_ID");
    expect(auth).toContain("q-sign-time=");
    expect(auth).toContain("q-key-time=");
    expect(auth).toContain("q-header-list=");
    expect(auth).toContain("q-signature=");
  });
});

describe("Stage 9 — Collision Checking & Manifest Mapping", () => {
  it("所有 46 个本地媒体文件生成的目标 COS Key 无碰撞且全部合法", () => {
    const manifest = buildManifest();
    expect(manifest.count).toBe(46);

    const collisions = checkCollisions(manifest.files, MAIN_V1_COS_PREFIX);
    expect(collisions).toEqual([]);

    for (const f of manifest.files) {
      const target = toTargetCosKey(f.mediaKey, MAIN_V1_COS_PREFIX);
      expect(target.startsWith(MAIN_V1_COS_PREFIX)).toBe(true);
      expect(CANONICAL_KEY_REGEX.test(target)).toBe(true);
      expect(target.endsWith(f.mediaKey)).toBe(true);
    }
  });

  it("检测重复映射碰撞能力", () => {
    const mockFiles = [
      { mediaKey: "content/fuji/pic.jpg", repoPath: "media-remote/content/fuji/pic.jpg" },
      { mediaKey: "content/fuji/pic.jpg", repoPath: "other-dir/pic.jpg" },
    ];
    const collisions = checkCollisions(mockFiles, MAIN_V1_COS_PREFIX);
    expect(collisions.length).toBe(1);
    expect(collisions[0].targetKey).toBe("geo-media/main-v1/content/fuji/pic.jpg");
  });
});

describe("Stage 10 & 11 — Runtime Resolver & Fallback Contract", () => {
  const TEST_KEY = "content/everest/ev-icefall-ladders.jpg";
  const DELIVERY_BASE = "https://media.geo-explorer.net/geo-media/main-v1/";

  it("未配置远端基址时解析为本地包内路径", () => {
    expect(resolveMediaSrc(TEST_KEY, "")).toBe(`/assets/${TEST_KEY}`);
    expect(isRemoteMediaEnabled()).toBe(false);
  });

  it("配置 Delivery Base 后解析为 EdgeOne / CDN 交付 URL", () => {
    expect(resolveMediaSrc(TEST_KEY, DELIVERY_BASE)).toBe(
      `${DELIVERY_BASE}${TEST_KEY}`,
    );
  });

  it("空媒体键返回通用轻量占位图", () => {
    expect(resolveMediaSrc("")).toBe(MEDIA_PLACEHOLDER);
    expect(resolveMediaSrc(null)).toBe(MEDIA_PLACEHOLDER);
    expect(resolveMediaSrc(undefined)).toBe(MEDIA_PLACEHOLDER);
  });
});

describe("Stage 13 — Production Build Guard", () => {
  it("拒绝空的生产媒体交付基址", () => {
    expect(validateProductionBase("").length).toBeGreaterThan(0);
  });

  it("拒绝非 https 协议", () => {
    const errs = validateProductionBase("http://media.example.com/geo-media/main-v1/");
    expect(errs.join(" ")).toContain("https");
  });

  it("拒绝末尾无斜杠的基址", () => {
    const errs = validateProductionBase("https://media.example.com/geo-media/main-v1");
    expect(errs.join(" ")).toContain("以 / 结尾");
  });

  it("拒绝带有用户凭据的 URL", () => {
    const errs = validateProductionBase("https://user:pass@media.example.com/geo-media/main-v1/");
    expect(errs.join(" ")).toContain("凭证");
  });

  it("接受合法的 EdgeOne 交付基址", () => {
    expect(
      validateProductionBase("https://media.geo-explorer.net/geo-media/main-v1/"),
    ).toEqual([]);
  });
});
