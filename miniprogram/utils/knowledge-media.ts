/**
 * 知识配图解析（知识列表页与知识详情页共用）。
 *
 * 2026-09-12 用户反馈修正：
 *   - 列表页 41 条知识曾把 29 条无媒体条目全部回退到同一张珠峰主视觉 → 改为逐条语义兜底；
 *   - 详情页原先完全没有配图 → 复用同一套解析，并支持点击看大图。
 *
 * 优先级：approved-only（MediaRegistry）→ 实景照片优先 → 语义兜底 → 无图返回空。
 */
import { RUNTIME_MANIFESTS } from "../data/media/world-manifests";
import { resolveRegistryAsset } from "../engine/asset-resolver";
import { getMediaForEntity } from "../engine/media-registry";
import { resolveMediaSrc } from "../services/media-service";
import type { Knowledge } from "../types/models";

/**
 * 无 runtime 媒体时的语义兜底图：按知识主题关联到对应世界的真实照片。
 * 映射不到的条目返回空数组，由页面显示该条目的分类 emoji 占位，不拿无关照片冒充。
 * 键为逻辑资源键（相对 assets/），地址解析统一走 resolveMediaSrc。
 */
const KNOWLEDGE_FALLBACK_IMAGE: Record<string, string> = {
  k02: "expeditions/everest/live/live-a-kala-patthar.jpg", // 雪线 · 珠峰南坡实景
  k04: "content/fuji/f-forest-lower.jpg", // 垂直分带 · 富士山林带
  k06: "content/colorado/c2-devils-corkscrew.jpg", // 峡谷下切 · 大峡谷河谷
  k07: "expeditions/everest/live/live-a-kala-patthar.jpg", // 死亡区 · 高海拔实景
  k08: "content/everest/ev-icefall-ladders.jpg", // 冰川流动 · 昆布冰瀑
  k15: "content/everest/k-subduction.jpg", // 大陆漂移 · 俯冲对照
  k25: "content/everest/k-subduction.jpg", // 热点 · 俯冲对照
  k27: "content/fuji/f3-goraiko.jpg", // 火山湖 · 富士山火口
  k29: "content/fuji/f4-hoei-rim.jpg", // 火山灰 · 宝永火口
};

/**
 * 该知识可展示的全部图片。
 *
 * 同一知识有多张已核验媒体时，实景照片排前（如 k11 深潜历史优先展示的里雅斯特号
 * 历史照片，而不是测深图），其余按清单声明顺序跟随——详情页可左右滑动看全部。
 */
export function knowledgeImages(item: Knowledge): string[] {
  const media = getMediaForEntity(RUNTIME_MANIFESTS, "knowledge", item.id);
  if (media.length) {
    const photos = media.filter((a) => a.kind === "photograph");
    const rest = media.filter((a) => a.kind !== "photograph");
    return [...photos, ...rest].map(
      (asset) => resolveRegistryAsset(RUNTIME_MANIFESTS, asset.id).src,
    );
  }
  const fallback = KNOWLEDGE_FALLBACK_IMAGE[item.id];
  return fallback ? [resolveMediaSrc(fallback)] : [];
}

/** 列表卡片主图（首张；无图返回空串，页面用 emoji 占位）。 */
export function knowledgeImage(item: Knowledge): string {
  return knowledgeImages(item)[0] ?? "";
}
