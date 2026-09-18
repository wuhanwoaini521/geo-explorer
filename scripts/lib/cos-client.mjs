/**
 * COS Client for Legacy Main Branch (Gate 4B COS Migration).
 *
 * 目标与安全边界：
 *   1. 纯 Node.js 标准库实现（node:crypto, node:https, node:fs），无外部 npm 依赖；
 *   2. 严格的 Prefix 隔离：所有旧 main 对象键必须以 "geo-media/main-v1/" 开头；
 *   3. 绝对禁止访问或覆写 V2 路径（geo-media/places/, geo-media/test/, geo-media/legacy/v1/）；
 *   4. 任何日志、报错或异常输出中，全面遮蔽敏感凭证（SecretId, SecretKey, Signature 等）；
 *   5. 对象键格式白名单：[a-z0-9/_\-.]，严格禁止空格、中文、大写或非法字符；
 *   6. 幂等性：基于 x-cos-meta-sha256 与本地哈希比对。
 */
import { createHash, createHmac } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import https from "node:https";

export const DEFAULT_COS_REGION = "ap-guangzhou";
export const DEFAULT_COS_BUCKET = "geo-explore-1300119616";
export const MAIN_V1_COS_PREFIX = "geo-media/main-v1/";

export const FORBIDDEN_COS_PREFIXES = [
  "geo-media/places/",
  "geo-media/test/",
  "geo-media/legacy/v1/",
];

export const CANONICAL_KEY_REGEX = /^[a-z0-9/_\-.]+$/;

/**
 * 遮蔽敏感凭证，防止在错误输出或日志中泄漏。
 */
export function redactCredentials(text, secrets = []) {
  if (!text || typeof text !== "string") return text;
  let out = text;
  // 掩码显式传入的密钥值
  for (const s of secrets) {
    if (s && typeof s === "string" && s.length >= 4) {
      out = out.split(s).join("[REDACTED]");
    }
  }
  // 掩码常见 COS 凭证格式
  out = out
    .replace(/(q-ak=)[^&]+/gi, "$1[REDACTED]")
    .replace(/(q-signature=)[^&]+/gi, "$1[REDACTED]")
    .replace(/(SecretKey=)[^&]+/gi, "$1[REDACTED]")
    .replace(/(SecretId=)[^&]+/gi, "$1[REDACTED]")
    .replace(/(COS_SECRET_KEY\s*=\s*)[^\r\n]+/gi, "$1[REDACTED]")
    .replace(/(COS_SECRET_ID\s*=\s*)[^\r\n]+/gi, "$1[REDACTED]")
    .replace(/(Authorization:\s*)[^\r\n]+/gi, "$1[REDACTED]");
  return out;
}

/**
 * 校验 COS 对象键。
 * 强制要求以 allowedPrefix 开头，且必须拒绝 V2 保护前缀。
 */
export function validateCosKey(key, allowedPrefix = MAIN_V1_COS_PREFIX) {
  if (typeof key !== "string" || !key) {
    throw new Error("InvalidKeyError: Object key must be a non-empty string.");
  }
  // 检查是否包含路径穿越
  if (key.includes("..") || key.startsWith("/")) {
    throw new Error(`InvalidKeyError: Path traversal or leading slash not allowed: "${key}"`);
  }
  // 必须以前缀开头
  if (!key.startsWith(allowedPrefix)) {
    throw new Error(
      `PrefixIsolationViolationError: Object key must start with "${allowedPrefix}", got "${key}"`,
    );
  }
  // 必须严格拒绝 V2 保护路径
  for (const forbidden of FORBIDDEN_COS_PREFIXES) {
    if (key.startsWith(forbidden)) {
      throw new Error(
        `PrefixIsolationViolationError: Forbidden V2 prefix detected: "${forbidden}". Access to this prefix is strictly blocked!`,
      );
    }
  }
  // 规范字符集检查
  if (!CANONICAL_KEY_REGEX.test(key)) {
    throw new Error(
      `InvalidCanonicalKeyError: Key "${key}" contains invalid characters. Must match ${CANONICAL_KEY_REGEX}`,
    );
  }
  return true;
}

/**
 * 映射本地 mediaKey 到目标 COS Key
 */
export function toTargetCosKey(mediaKey, prefix = MAIN_V1_COS_PREFIX) {
  const normPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  const cleanKey = mediaKey.replace(/^\/+/, "").replace(/^assets\//, "");
  const target = `${normPrefix}${cleanKey}`;
  validateCosKey(target, normPrefix);
  return target;
}

/**
 * 探测 MIME 类型
 */
export function detectMimeType(key) {
  const lower = key.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".txt")) return "text/plain; charset=utf-8";
  if (lower.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

/**
 * 计算 COS V5 签名（Q-Sign-Algorithm=sha1）。
 * 参考腾讯云 COS XML API 签名规范：
 * https://cloud.tencent.com/document/product/436/7778
 */
export function generateCosSignature({
  method = "GET",
  pathname = "/",
  query = {},
  headers = {},
  secretId,
  secretKey,
  signTimeSeconds = 3600,
}) {
  if (!secretId || !secretKey) {
    throw new Error("MissingCredentialsError: secretId and secretKey are required for COS signature.");
  }

  const now = Math.floor(Date.now() / 1000);
  const qSignTime = `${now};${now + signTimeSeconds}`;
  const qKeyTime = qSignTime;

  // 1. 计算 SignKey
  const signKey = createHmac("sha1", secretKey).update(qKeyTime).digest("hex");

  // 2. 格式化参数
  const queryKeys = Object.keys(query)
    .map((k) => k.toLowerCase())
    .sort();
  const qUrlParamList = queryKeys.join(";");
  const urlParamString = queryKeys
    .map((k) => `${k}=${encodeURIComponent(query[k] ?? "")}`)
    .join("&");

  // 3. 格式化 Headers（小写键，按字母排序）
  const headerKeys = Object.keys(headers)
    .map((k) => k.toLowerCase())
    .sort();
  const qHeaderList = headerKeys.join(";");
  const headerString = headerKeys
    .map((k) => {
      const origKey = Object.keys(headers).find((orig) => orig.toLowerCase() === k);
      return `${k}=${encodeURIComponent(headers[origKey] ?? "")}`;
    })
    .join("&");

  // 4. 计算 HttpString
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const httpString = `${method.toLowerCase()}\n${normalizedPath}\n${urlParamString}\n${headerString}\n`;

  // 5. 计算 StringToSign
  const httpStringSha1 = createHash("sha1").update(httpString).digest("hex");
  const stringToSign = `sha1\n${qSignTime}\n${httpStringSha1}\n`;

  // 6. 计算 Signature
  const signature = createHmac("sha1", signKey).update(stringToSign).digest("hex");

  return [
    "q-sign-algorithm=sha1",
    `q-ak=${secretId}`,
    `q-sign-time=${qSignTime}`,
    `q-key-time=${qKeyTime}`,
    `q-header-list=${qHeaderList}`,
    `q-url-param-list=${qUrlParamList}`,
    `q-signature=${signature}`,
  ].join("&");
}

/**
 * 安全加载 COS 环境变量，包括检查项目根目录的 .env.local（如存在）。
 * 绝不向控制台打印密钥值。
 */
export function loadCosEnv(cwd = process.cwd()) {
  const env = { ...process.env };
  const envLocalPath = join(cwd, ".env.local");

  if (existsSync(envLocalPath)) {
    try {
      const content = readFileSync(envLocalPath, "utf8");
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
          if (!(k in env) || !env[k]) {
            env[k] = v;
          }
        }
      }
    } catch {
      // 忽略读取异常
    }
  }

  const region = env.COS_REGION || DEFAULT_COS_REGION;
  const bucket = env.COS_BUCKET || DEFAULT_COS_BUCKET;
  let prefix = env.COS_PREFIX || MAIN_V1_COS_PREFIX;
  if (!prefix.endsWith("/")) prefix += "/";

  const secretId = env.COS_SECRET_ID || "";
  const secretKey = env.COS_SECRET_KEY || "";
  const deliveryBaseUrl = env.GEO_MEDIA_BASE_URL || env.MEDIA_REMOTE_BASE || "";

  return {
    region,
    bucket,
    prefix,
    deliveryBaseUrl,
    hasCredentials: Boolean(secretId && secretKey),
    secretId,
    secretKey,
  };
}

/**
 * COS 客户端实现
 */
export class CosClient {
  constructor(options = {}) {
    this.region = options.region || DEFAULT_COS_REGION;
    this.bucket = options.bucket || DEFAULT_COS_BUCKET;
    this.prefix = options.prefix || MAIN_V1_COS_PREFIX;
    if (!this.prefix.endsWith("/")) this.prefix += "/";
    this.secretId = options.secretId || "";
    this.secretKey = options.secretKey || "";
    this.host = `${this.bucket}.cos.${this.region}.myqcloud.com`;
  }

  /**
   * 执行原生 HTTPS 请求并安全处理凭证与错误
   */
  async _request({ method, path, query = {}, headers = {}, body = null }) {
    const secrets = [this.secretKey, this.secretId].filter(Boolean);

    // 格式化查询参数
    const queryParts = Object.entries(query)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .filter(Boolean);
    const queryString = queryParts.length ? `?${queryParts.join("&")}` : "";
    const fullPath = (path.startsWith("/") ? path : `/${path}`) + queryString;

    const reqHeaders = {
      Host: this.host,
      ...headers,
    };

    if (this.secretId && this.secretKey) {
      reqHeaders.Authorization = generateCosSignature({
        method,
        pathname: path,
        query,
        headers: reqHeaders,
        secretId: this.secretId,
        secretKey: this.secretKey,
      });
    }

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: this.host,
          port: 443,
          path: fullPath,
          method,
          headers: reqHeaders,
          timeout: 15000,
        },
        (res) => {
          const chunks = [];
          res.on("data", (d) => chunks.push(d));
          res.on("end", () => {
            const resBody = Buffer.concat(chunks);
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              body: resBody,
            });
          });
        },
      );

      req.on("error", (err) => {
        const safeMessage = redactCredentials(err.message || String(err), secrets);
        reject(new Error(`COS Network Error: ${safeMessage}`));
      });

      req.on("timeout", () => {
        req.destroy();
        reject(new Error("COS Request Timeout (15s)"));
      });

      if (body) {
        req.write(body);
      }
      req.end();
    });
  }

  /**
   * HeadObject: 检查对象是否存在、长度及 sha256 元数据
   */
  async headObject(key) {
    validateCosKey(key, this.prefix);
    const res = await this._request({
      method: "HEAD",
      path: `/${key}`,
    });

    if (res.statusCode === 200) {
      return {
        exists: true,
        statusCode: 200,
        contentLength: Number(res.headers["content-length"] ?? NaN),
        contentType: res.headers["content-type"] || "",
        etag: (res.headers["etag"] || "").replace(/^"|"$/g, ""),
        sha256: res.headers["x-cos-meta-sha256"] || null,
      };
    }
    if (res.statusCode === 404 || res.statusCode === 403) {
      return {
        exists: false,
        statusCode: res.statusCode,
        contentLength: 0,
        contentType: "",
        etag: "",
        sha256: null,
      };
    }
    throw new Error(`COS HeadObject failed with status ${res.statusCode} for key "${key}"`);
  }

  /**
   * PutObject: 上传对象，带 Content-Type 和 x-cos-meta-sha256
   */
  async putObject(key, body, options = {}) {
    validateCosKey(key, this.prefix);
    const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
    const sha256 = options.sha256 || createHash("sha256").update(buf).digest("hex");
    const contentType = options.contentType || detectMimeType(key);

    const headers = {
      "Content-Type": contentType,
      "Content-Length": String(buf.length),
      "x-cos-meta-sha256": sha256,
    };

    const res = await this._request({
      method: "PUT",
      path: `/${key}`,
      headers,
      body: buf,
    });

    if (res.statusCode === 200) {
      return {
        ok: true,
        statusCode: 200,
        etag: (res.headers["etag"] || "").replace(/^"|"$/g, ""),
        sha256,
        key,
      };
    }

    const secrets = [this.secretKey, this.secretId].filter(Boolean);
    const errBody = redactCredentials(res.body.toString("utf8"), secrets);
    throw new Error(`COS PutObject failed with status ${res.statusCode} for "${key}": ${errBody}`);
  }

  /**
   * ListObjects: 列出对象（带 prefix 隔离检查）
   */
  async listObjects({ prefix = this.prefix, maxKeys = 100, marker = "" } = {}) {
    validateCosKey(prefix, this.prefix);
    const query = {
      prefix,
      "max-keys": String(maxKeys),
    };
    if (marker) query.marker = marker;

    const res = await this._request({
      method: "GET",
      path: "/",
      query,
    });

    if (res.statusCode !== 200) {
      const secrets = [this.secretKey, this.secretId].filter(Boolean);
      const errBody = redactCredentials(res.body.toString("utf8"), secrets);
      throw new Error(`COS ListObjects failed with status ${res.statusCode}: ${errBody}`);
    }

    const xml = res.body.toString("utf8");
    const contents = [];
    const contentsRegex = /<Contents>([\s\S]*?)<\/Contents>/g;
    let match;
    while ((match = contentsRegex.exec(xml)) !== null) {
      const cBlock = match[1];
      const keyM = cBlock.match(/<Key>([\s\S]*?)<\/Key>/);
      const sizeM = cBlock.match(/<Size>([\s\S]*?)<\/Size>/);
      const etagM = cBlock.match(/<ETag>([\s\S]*?)<\/ETag>/);
      const lastModM = cBlock.match(/<LastModified>([\s\S]*?)<\/LastModified>/);
      if (keyM) {
        contents.push({
          key: keyM[1].trim(),
          size: sizeM ? Number(sizeM[1]) : 0,
          etag: etagM ? etagM[1].trim().replace(/^"|"$/g, "") : "",
          lastModified: lastModM ? lastModM[1].trim() : "",
        });
      }
    }

    const isTruncated = /<IsTruncated>true<\/IsTruncated>/i.test(xml);
    const nextMarkerM = xml.match(/<NextMarker>([\s\S]*?)<\/NextMarker>/);

    return {
      contents,
      isTruncated,
      nextMarker: nextMarkerM ? nextMarkerM[1].trim() : "",
    };
  }
}
