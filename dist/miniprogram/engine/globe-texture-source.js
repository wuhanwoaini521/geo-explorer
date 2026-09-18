"use strict";
/**
 * GlobeTextureSource —— 把「地球贴图档位」解析成实际可加载的 URL。
 *
 * 所有权（Gate 4 媒体解耦）
 * ------------------------
 * - **颜色贴图始终留在包内**（2048）。它是地图 tabBar 页面的首屏主视觉，也是
 *   WebGL/Canvas 两条渲染路径的共同输入：走远端会让小球在冷启动时先空一帧、
 *   并在弱网/失败时退化成纯色球。它是 Gate 4 唯一被论证保留的本地大媒体
 *   （527.9 KB），量化理由见 docs/media-ownership-gate4.md §渲染器关键例外。
 * - **高度图与镜面图走远端**。它们是次要光照线索，远端失败时渲染器保留
 *   1×1 占位贴图 → 地球仍以基础光照正常渲染，交互不受影响。
 * - **4096 档位只在配置了远端基址时才可用**，此时三张图都从远端取；
 *   未配置远端时降级到 2048 档，而不是加载失败。
 *
 * 纯函数，无 wx / Page / Storage / Network 依赖，可在 Node 单测。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBE_TEXTURE_EXT = exports.GLOBE_TEXTURE_HIGH_SIZE = exports.GLOBE_TEXTURE_STANDARD_SIZE = exports.GLOBE_TEXTURE_LOCAL_BASE = exports.GLOBE_TEXTURE_KEYS = void 0;
exports.resolveGlobeTextures = resolveGlobeTextures;
exports.globeColorTextureSrc = globeColorTextureSrc;
const media_service_1 = require("../services/media-service");
/** 贴图种类 → 文件名词干 */
exports.GLOBE_TEXTURE_KEYS = ["color", "height", "specular"];
const STEM = {
    color: "globe-texture-realistic",
    height: "globe-height",
    specular: "globe-specular",
};
/** 包内贴图目录（相对小程序根）—— 只承载颜色贴图 */
exports.GLOBE_TEXTURE_LOCAL_BASE = "/assets/world/";
/** standard 档位的贴图边长（宽） */
exports.GLOBE_TEXTURE_STANDARD_SIZE = 2048;
/** high 档位的贴图边长（宽） */
exports.GLOBE_TEXTURE_HIGH_SIZE = 4096;
/** 贴图统一使用 JPEG：PNG 对照片型内容几乎无法压缩（改造前 1748 KB/MP）。 */
exports.GLOBE_TEXTURE_EXT = ".jpg";
/** 远端贴图在媒体根下的子目录 */
const GLOBE_REMOTE_PREFIX = "world/";
const localSrc = (key, size) => `${exports.GLOBE_TEXTURE_LOCAL_BASE}${STEM[key]}-${size}${exports.GLOBE_TEXTURE_EXT}`;
const remoteSrc = (base, key, size) => `${base}${GLOBE_REMOTE_PREFIX}${STEM[key]}-${size}${exports.GLOBE_TEXTURE_EXT}`;
/**
 * 解析贴图资源列表。
 *
 * @param requested 调用方请求的档位（2048 / 4096）
 * @param remoteBase 远端媒体基址；缺省读配置（services/media-service）
 */
function resolveGlobeTextures(requested, remoteBase = (0, media_service_1.mediaRemoteBase)()) {
    const hasRemote = remoteBase.length > 0;
    const wantsHigh = requested === 4096 && hasRemote;
    if (wantsHigh) {
        return {
            tier: "high",
            size: exports.GLOBE_TEXTURE_HIGH_SIZE,
            sources: exports.GLOBE_TEXTURE_KEYS.map((key) => ({
                key,
                src: remoteSrc(remoteBase, key, exports.GLOBE_TEXTURE_HIGH_SIZE),
                remote: true,
            })),
        };
    }
    const size = exports.GLOBE_TEXTURE_STANDARD_SIZE;
    return {
        tier: "standard",
        size,
        sources: exports.GLOBE_TEXTURE_KEYS.map((key) => {
            // 颜色贴图是渲染器关键资源，始终从包内取
            const remote = hasRemote && key !== "color";
            return {
                key,
                src: remote ? remoteSrc(remoteBase, key, size) : localSrc(key, size),
                remote,
            };
        }),
    };
}
/** Canvas 2D 兜底渲染器使用的单张颜色贴图地址（始终在包内） */
function globeColorTextureSrc() {
    return localSrc("color", exports.GLOBE_TEXTURE_STANDARD_SIZE);
}
