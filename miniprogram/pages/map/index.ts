/**
 * 🗺️ 地图页 —— 场景选择（MVP v1）。
 * 场景来自 data/explorations 注册表（“开放”即数据就绪），“即将开放”为预告位；
 * 完成度直接从探索进度存储（exploration-store）读取，两者均为纯数据。
 */
import { EXPLORATIONS } from "../../data/explorations/index";
import { getRecords } from "../../services/exploration-store";
import type { ExplorationRecord } from "../../services/exploration-store";

/** 预告场景（尚未提供体验数据的路线占位） */
interface ComingScene {
  id: string;
  emoji: string;
  title: string;
  region: string;
  basis: string;
  desc: string;
}

interface OpenCard {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  place: string;
  region: string;
  elevText: string;
  estMin: number;
  desc: string;
  progress: number; // 0-100
  reachedText: string;
  axisGlyph: string;
  completed: boolean;
  record: ExplorationRecord | null;
}

const COMING: ComingScene[] = [
  {
    id: "fuji",
    emoji: "🗻",
    title: "富士山",
    region: "日本 · 本州",
    basis: "海拔 3,776 m · 休眠火山",
    desc: "雪线之上的火山锥与五合目带，从草原到火山砂砾的垂直剖面。",
  },
  {
    id: "sahara",
    emoji: "🏜️",
    title: "撒哈拉沙漠",
    region: "北非 · 阿尔及利亚 / 利比亚",
    basis: "热沙漠 · 昼夜温差极大",
    desc: "从海岸绿洲深入内陆，体验极端干旱气候与风成地貌。",
  },
];

Page({
  data: {
    open: [] as OpenCard[],
    coming: COMING,
  },

  onLoad() {
    this.refresh();
  },

  onShow() {
    // 从探索返回后刷新完成度
    this.refresh();
  },

  refresh() {
    const records = getRecords();
    const open: OpenCard[] = EXPLORATIONS.map((ex) => {
      const record = records.find((r) => r.id === ex.id) || null;
      const reached = record ? record.reachElevation : 0;
      const progress = Math.min(
        100,
        Math.round((reached / Math.max(1, ex.maxElevation)) * 100),
      );
      return {
        id: ex.id,
        emoji: ex.emoji,
        title: ex.title,
        subtitle: ex.subtitle,
        place: ex.meta.placeLabel,
        region: ex.meta.region,
        elevText: `${Math.round(ex.maxElevation).toLocaleString()} m`,
        estMin: ex.estimatedMinutes,
        desc: ex.meta.description,
        progress,
        reachedText: `${progress}% · ${ex.ui?.extentWord ?? "已至"} ${Math.round(reached).toLocaleString()} ${ex.ui?.axisUnit ?? "m"}`,
        axisGlyph: ex.ui?.forwardGlyph ?? "▲",
        completed: Boolean(record && record.completed),
        record,
      };
    });
    this.setData({ open });
  },

  /** 进入探索（场景数据已就绪） */
  onGo(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pages/exploration/index?id=${id}` });
  },

  onComing() {
    wx.showToast({ title: "该路线即将开放，敬请期待", icon: "none" });
  },
});