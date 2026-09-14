/**
 * 📄 知识详情页 —— 单条知识完整内容 + 关联地点（知识 → 图鉴闭环）。
 */
import { KNOWLEDGE } from "../../data/knowledge";
import { getKnowledgeProcess, processForTopic, type KnowledgeProcess } from "../../data/processes";
import { getPlaceById, PLACE_TYPE_LABEL } from "../../data/places";
import { knowledgeImages } from "../../utils/knowledge-media";
import type { Knowledge } from "../../types/models";

interface RelatedPlace {
  id: string;
  name: string;
  emoji: string;
  typeLabel: string;
  shortDescription: string;
}

Page({
  data: {
    item: null as Knowledge | null,
    relatedPlaces: [] as RelatedPlace[],
    process: null as KnowledgeProcess | null,
    processIndex: 0,
    currentStep: null as KnowledgeProcess["steps"][number] | null,
    /** 该知识的配图（实景优先）；点击可全屏预览，多图左右滑动看大图 */
    images: [] as string[],
    /** 主图解码失败 → 退回分类 emoji 占位 */
    imageFailed: false,
  },

  onLoad(query: Record<string, string>) {
    const id = query.id || "";
    const item = KNOWLEDGE.find((k) => k.id === id) || KNOWLEDGE[0] || null;
    const process = query.process
      ? getKnowledgeProcess(query.process) || null
      : item ? processForTopic(item.id) || null : null;
    const relatedPlaces: RelatedPlace[] = item
      ? item.relatedPlaceIds
          .map((pid) => getPlaceById(pid))
          .filter((p): p is NonNullable<typeof p> => Boolean(p))
          .map((p) => ({
            id: p.id,
            name: p.name,
            emoji: p.emoji,
            typeLabel: PLACE_TYPE_LABEL[p.type],
            shortDescription: p.shortDescription,
          }))
      : [];
    this.setData({
      item,
      relatedPlaces,
      process,
      processIndex: 0,
      currentStep: process?.steps[0] || null,
      images: item ? knowledgeImages(item) : [],
      imageFailed: false,
    });
    if (item) {
      wx.setNavigationBarTitle({ title: item.title });
    }
  },

  onShow() {
    this.getTabBar?.()?.setData({ hidden: true });
  },

  /** 点击配图 → 全屏看大图（多张时可左右滑动切换）。 */
  onPreviewImage() {
    const urls = this.data.images.filter(Boolean);
    if (!urls.length) return;
    // SAFETY: 官方类型只覆盖本页用到的子集，先按方法名守卫再调用（同探索页地点卡）。
    const preview = (wx as unknown as Record<string, unknown>)["previewImage"];
    if (typeof preview === "function") {
      (preview as (opts: { current: string; urls: string[] }) => void)({
        current: urls[0],
        urls,
      });
    }
  },

  onImageError() {
    if (this.data.imageFailed) return;
    this.setData({ imageFailed: true });
  },

  onOpenPlace(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pages/place/index?id=${id}` });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },

  onContinueLearning() {
    wx.switchTab({ url: "/pages/knowledge/index" });
  },

  onProcessNext() {
    const process = this.data.process;
    if (!process) return;
    const processIndex = Math.min(process.steps.length - 1, this.data.processIndex + 1);
    this.setData({ processIndex, currentStep: process.steps[processIndex] });
  },

  onProcessPrev() {
    const process = this.data.process;
    if (!process) return;
    const processIndex = Math.max(0, this.data.processIndex - 1);
    this.setData({ processIndex, currentStep: process.steps[processIndex] });
  },
});
