// 媒体所有权规则（Gate 4）—— 构建、测试、包体审计共用的**唯一事实来源**。
//
// 背景：主包 tabBar 页面（home / map / knowledge）通过共享运行时清单引用了整个项目的
// 内容媒体，导致主包必须物理持有全部图片（微信规则：主包不能引用分包资源）。
// Gate 4 把这些媒体移出小程序代码包，改由远端（CDN / CloudBase）投递。
//
// 规则默认「本地」：新增的 UI 资源不会被意外推到远端；
// 只有显式列在这里的路径才属于远端媒体，必须放在 media-remote/ 而不是 miniprogram/assets/。
//
// 路径相对 miniprogram/assets/（即 mediaKey）。
export const REMOTE_OWNED_PATTERNS = [
  // 发现页与地图页使用的四世界插画卡片
  "discovery/",
  // 四个世界的内容照片（地点封面 / 知识配图 / 航点图）
  "content/",
  // 珠峰实景与航点裁切
  "expeditions/",
  // 地球颜色贴图及材质图：远端颜色失败时运行时回退到随包 JPEG
  "world/globe-texture-realistic-2048.jpg",
  "world/globe-height-2048.jpg",
  "world/globe-specular-2048.jpg",
  // 珠峰 TERRAIN 主视觉（全屏承载影像）
  "world/everest-expedition-hero-v1.jpg",
];

/** 仓库内保存远端媒体的目录（相对仓库根）——不进入小程序代码包 */
export const REMOTE_MEDIA_DIR = "media-remote";

/** 判定一个媒体键（相对 miniprogram/assets/）是否由远端持有 */
export function isRemoteOwned(mediaKey) {
  const key = mediaKey.replace(/^\/+/, "").replace(/^assets\//, "");
  return REMOTE_OWNED_PATTERNS.some((p) => (p.endsWith("/") ? key.startsWith(p) : key === p));
}

/** 媒体键 → 仓库内该文件的**源码位置**（远端媒体在 media-remote/，其余在 miniprogram/assets/） */
export function mediaSourcePath(mediaKey) {
  const key = mediaKey.replace(/^\/+/, "").replace(/^assets\//, "");
  return isRemoteOwned(key) ? `${REMOTE_MEDIA_DIR}/${key}` : `miniprogram/assets/${key}`;
}

/** 媒体键 → 该文件在构建产物中的位置 */
export function mediaDistPath(mediaKey) {
  const key = mediaKey.replace(/^\/+/, "").replace(/^assets\//, "");
  return `dist/miniprogram/assets/${key}`;
}
