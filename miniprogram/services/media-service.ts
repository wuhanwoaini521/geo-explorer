/**
 * MediaService —— 媒体资源的**唯一解析边界**。
 *
 * 背景（Gate 4 媒体所有权解耦）
 * ------------------------------
 * 改造前，主包 tabBar 页面（home / map / knowledge）通过共享的运行时媒体清单
 * 直接引用 `/assets/content/...` 这类包内路径，导致**整个项目的内容媒体都必须
 * 由主包物理持有**（微信规则：主包不能引用分包资源，因此资源只能全留主包）。
 *
 * 改造后，媒体清单只保存**逻辑资源键**（例如 `content/fuji/f-forest-lower.jpg`），
 * 由本模块解析成实际可加载地址：
 *
 *   清单（逻辑键）
 *        ↓
 *   resolveMediaSrc(key)
 *        ↓
 *   远端 URL（正式） 或 包内 /assets/<key>（本地开发）
 *
 * 页面与引擎**只依赖解析结果**，不再关心资源在哪。
 *
 * 为什么是一个 provider-neutral 的基址而不是直接写 CloudBase
 * --------------------------------------------------------
 * 业务代码不感知托管方。`MEDIA_REMOTE_BASE` 由 `config/index.ts` 提供，今天可以指向
 * CloudBase 云存储（或它签发的 CDN 域名），明天换成任何 HTTPS 源都不需要改业务代码。
 * 仓库里不保存任何密钥；CloudBase 环境 ID 与文件清单属于非敏感信息，可入库。
 *
 * 纯函数，无 wx / Page / Storage 依赖，可在 Node 单测。
 */

import { CONFIG } from "../config/index";

/** 包内资源的实际挂载目录（相对小程序根） */
const LOCAL_ASSET_PREFIX = "/assets/";

/**
 * 通用轻量占位图 —— 远端加载失败时使用。
 *
 * 刻意只保留**一张**通用占位图（而不是每个世界一张本地兜底副本）：后者会让
 * 内容媒体以"兜底"名义重新回到主包，正好抵消本 Gate 的目的。
 */
export const MEDIA_PLACEHOLDER = "/assets/ui/media-placeholder.svg";

/** 逻辑资源键：相对 assets/ 的路径，例如 "content/fuji/f-forest-lower.jpg" */
export type MediaKey = string;

/** 远端媒体基址（以 "/" 结尾）。为空表示未配置远端，走包内路径（本地开发）。 */
export function mediaRemoteBase(): string {
  return CONFIG.media.remoteBase;
}

/** 是否已配置远端媒体源 */
export function isRemoteMediaEnabled(): boolean {
  return mediaRemoteBase().length > 0;
}

/** 逻辑键 → 包内路径 */
export function mediaLocalPath(key: MediaKey): string {
  return `${LOCAL_ASSET_PREFIX}${stripAssetsPrefix(key)}`;
}

/** 逻辑键 → 远端地址 */
export function mediaRemoteUrl(key: MediaKey, remoteBase: string = mediaRemoteBase()): string {
  return `${remoteBase}${stripAssetsPrefix(key)}`;
}

/**
 * 逻辑键 → 实际可加载地址。
 *
 * 远端未配置时返回包内路径（本地开发与 `build:local-media` 使用）；
 * 远端已配置时返回远端地址。**不做本地兜底**：内容媒体在正式包里不存在，
 * 因此"找不到本地文件"不能靠回退路径掩盖，而应由 `<image binderror>` 走占位图。
 *
 * @param key 逻辑资源键（相对 assets/；也接受历史 `/assets/...` 写法）
 * @param remoteBase 覆盖远端基址（缺省读配置）；单测用
 */
export function resolveMediaSrc(
  key: MediaKey | undefined | null,
  remoteBase: string = mediaRemoteBase(),
): string {
  if (!key) return MEDIA_PLACEHOLDER;
  return remoteBase.length > 0 ? mediaRemoteUrl(key, remoteBase) : mediaLocalPath(key);
}

/**
 * 兼容入口：清单历史值曾带 `/assets/` 前缀。两种写法都接受，
 * 便于渐进迁移与外部调用方（测试、脚本）使用。
 */
export function stripAssetsPrefix(key: string): string {
  return key.startsWith(LOCAL_ASSET_PREFIX) ? key.slice(LOCAL_ASSET_PREFIX.length) : key.replace(/^\/+/, "");
}

/**
 * `<image binderror>` 的统一处理器工厂。
 *
 * 远端媒体引入了新的失败模式（弱网、404、域名未配置）。既有页面已经有各自的
 * 降级视觉（渐变兜底 / emoji 位），这里只负责把失败暴露成数据状态，
 * 不改变任何现有视觉语言。
 */
export function mediaFallbackSrc(current: string): string {
  return current === MEDIA_PLACEHOLDER ? current : MEDIA_PLACEHOLDER;
}
