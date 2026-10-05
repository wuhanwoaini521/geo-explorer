/**
 * GlobeTextureSource —— 把「地球贴图档位」解析成实际可加载的 URL。
 *
 * 所有权（Gate 4 媒体解耦）
 * ------------------------
 * - 正式构建优先从 COS 加载 2048 JPEG 颜色贴图；包内 1536 JPEG 在远端失败时兜底，
 *   本地开发则使用 2048 WebP。这样既能保证正式素材由远端统一管理，也不把首屏
 *   地球渲染绑定到网络或设备对 WebP/WebGL 的支持。
 * - **高度图与镜面图走远端**。它们是次要光照线索，远端失败时渲染器保留
 *   1×1 占位贴图 → 地球仍以基础光照正常渲染，交互不受影响。
 * - **4096 档位只在配置了远端基址时才可用**，此时三张图都从远端取；
 *   未配置远端时降级到 2048 档，而不是加载失败。
 *
 * 纯函数，无 wx / Page / Storage / Network 依赖，可在 Node 单测。
 */

import { mediaRemoteBase } from "../services/media-service";

/** 贴图档位：standard = 2048（颜色图在包内）；high = 4096（全部远端） */
export type GlobeTextureTier = "standard" | "high";

/** 贴图种类 → 文件名词干 */
export const GLOBE_TEXTURE_KEYS = ["color", "height", "specular"] as const;
export type GlobeTextureKey = (typeof GLOBE_TEXTURE_KEYS)[number];

const STEM: Record<GlobeTextureKey, string> = {
  color: "globe-texture-realistic",
  height: "globe-height",
  specular: "globe-specular",
};

/** 包内贴图目录（相对小程序根）—— 只承载颜色贴图 */
export const GLOBE_TEXTURE_LOCAL_BASE = "/assets/world/";

/** standard 档位的贴图边长（宽） */
export const GLOBE_TEXTURE_STANDARD_SIZE = 2048;
/** high 档位的贴图边长（宽） */
export const GLOBE_TEXTURE_HIGH_SIZE = 4096;

/** 包内颜色贴图使用 WebP 控制主包体积；远端材质图继续使用 JPEG。 */
export const GLOBE_TEXTURE_LOCAL_COLOR_EXT = ".webp";
/** 低一档分辨率的 JPEG，仅在 Canvas/WebGL 不支持本地 WebP 时回退。 */
export const GLOBE_TEXTURE_LOCAL_COLOR_FALLBACK = "/assets/world/globe-texture-realistic-1536.jpg";
export const GLOBE_TEXTURE_REMOTE_EXT = ".jpg";

/** 远端贴图在媒体根下的子目录 */
const GLOBE_REMOTE_PREFIX = "world/";

export interface GlobeTextureSource {
  key: GlobeTextureKey;
  src: string;
  /** true = 该张贴图不在代码包内 */
  remote: boolean;
}

export interface ResolvedGlobeTextures {
  /** 实际生效的档位 */
  tier: GlobeTextureTier;
  /** 实际生效的贴图边长（uTexel 必须用这个值，不能用手上请求的档位） */
  size: number;
  sources: GlobeTextureSource[];
}

const localSrc = (key: GlobeTextureKey, size: number): string => {
  const ext = key === "color" ? GLOBE_TEXTURE_LOCAL_COLOR_EXT : GLOBE_TEXTURE_REMOTE_EXT;
  return `${GLOBE_TEXTURE_LOCAL_BASE}${STEM[key]}-${size}${ext}`;
};

const remoteSrc = (base: string, key: GlobeTextureKey, size: number): string =>
  `${base}${GLOBE_REMOTE_PREFIX}${STEM[key]}-${size}${GLOBE_TEXTURE_REMOTE_EXT}`;

/**
 * 解析贴图资源列表。
 *
 * @param requested 调用方请求的档位（2048 / 4096）
 * @param remoteBase 远端媒体基址；缺省读配置（services/media-service）
 */
export function resolveGlobeTextures(
  requested: 2048 | 4096,
  remoteBase: string = mediaRemoteBase(),
): ResolvedGlobeTextures {
  const hasRemote = remoteBase.length > 0;
  const wantsHigh = requested === 4096 && hasRemote;

  if (wantsHigh) {
    return {
      tier: "high",
      size: GLOBE_TEXTURE_HIGH_SIZE,
      sources: GLOBE_TEXTURE_KEYS.map((key) => ({
        key,
        src: remoteSrc(remoteBase, key, GLOBE_TEXTURE_HIGH_SIZE),
        remote: true,
      })),
    };
  }

  const size = GLOBE_TEXTURE_STANDARD_SIZE;
  return {
    tier: "standard",
    size,
    sources: GLOBE_TEXTURE_KEYS.map((key) => {
      const remote = hasRemote;
      return {
        key,
        src: remote ? remoteSrc(remoteBase, key, size) : localSrc(key, size),
        remote,
      };
    }),
  };
}

/** Canvas 2D 渲染器使用的颜色贴图：生产远端优先，本地开发读取随包 WebP。 */
export function globeColorTextureSrc(remoteBase: string = mediaRemoteBase()): string {
  return remoteBase
    ? remoteSrc(remoteBase, "color", GLOBE_TEXTURE_STANDARD_SIZE)
    : localSrc("color", GLOBE_TEXTURE_STANDARD_SIZE);
}

/** WebP 解码或纹理上传失败时使用的本地兼容颜色贴图。 */
export function globeColorTextureFallbackSrc(): string {
  return GLOBE_TEXTURE_LOCAL_COLOR_FALLBACK;
}
