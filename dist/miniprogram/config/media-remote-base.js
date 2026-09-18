"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEDIA_REMOTE_BASE = void 0;
/**
 * 生产媒体基址（Gate 4B）。
 *
 * 这是**构建输入**，不是运行时代码：业务代码只经 services/media-service.ts 读取它。
 * 默认空值 = 本地开发（内容媒体走包内路径，配合 `npm run build:local-media`）。
 *
 * 生产方式二选一（都不需要手工改本文件）：
 *   MEDIA_REMOTE_BASE=https://<host>/geo-explorer/prod/v1/ npm run build:prod
 * 或直接把值写在这里（一次性配置；`build:prod` 会校验格式）。
 *
 * 规则（由 scripts/check-media-config.mjs 强制）：
 *   - 非空；必须以 https:// 开头；必须以 / 结尾（版本目录）；
 *   - 不得包含任何凭证（user:pass@）。
 *
 * 值必须包含版本目录（如 prod/v1/）：资源内容变化时新建 v2/，不覆盖仍被线上版本
 * 引用的 v1/，这样既能用 CDN 长缓存，也能回滚。
 */
exports.MEDIA_REMOTE_BASE = "";
