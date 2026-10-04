/**
 * 👤 我的页 —— 探索记录与统计（MVP：本地存储数据）。
 * 挑战统计来自 quiz-store（按难度最佳成绩 + 累计次数）。
 */
import { getRecords } from "../../services/exploration-store";
import { favorites } from "../../services/favorites-store";
import { PLACES } from "../../data/places";
import { PLACE_TYPE_LABEL } from "../../data/places";
import {
  getQuizBest,
  summarizeQuizBest,
  type QuizSummaryLevel,
} from "../../services/quiz-store";
import { EXPLORATIONS } from "../../data/explorations/index";
import { KNOWLEDGE } from "../../data/knowledge";
import type { ExplorationRecord } from "../../services/exploration-store";
import { formatObservationElevation } from "../../engine/expedition-observation";
import { getPlaceHeroImage } from "../../data/media/world-manifests";
import { unlockedLibraryIds } from "../../utils/knowledge-link";
import { getReadKnowledgeIds } from "../../services/knowledge-progress";
import { getHeaderTopOffset } from "../../utils/layout";

interface RecordItem {
  id: string;
  emoji: string;
  title: string;
  completed: boolean;
  reachElevation: number;
  maxElevation: number;
  unitText: string;
  knowledgeCount: number;
  pct: number;
  reachText: string;
  maxText: string;
  image: string;
}

interface FavoriteItem {
  id: string;
  name: string;
  emoji: string;
  typeLabel: string;
  shortDescription: string;
  image: string;
}

interface BadgeItem {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  image: string;
  earned: boolean;
}

const BADGE_CONFIG = [
  { id: "everest", title: "登顶者", subtitle: "珠穆朗玛峰", emoji: "▲", placeId: "p-everest" },
  { id: "mariana", title: "深海探索", subtitle: "马里亚纳海沟", emoji: "▽", placeId: "p-mariana" },
  { id: "colorado", title: "峡谷行者", subtitle: "科罗拉多大峡谷", emoji: "◇", placeId: "p-colorado" },
  { id: "fuji", title: "火山观察者", subtitle: "富士山", emoji: "△", placeId: "p-fuji" },
] as const;

function passportLevel(exp: number): { level: number; current: number; threshold: number } {
  const threshold = 800;
  return { level: Math.floor(exp / threshold) + 1, current: exp % threshold, threshold };
}

/** 难度星级文案（与挑战页 ★~★★★ 对应） */
function difficultyStars(d: number): string {
  if (d <= 1) return "★";
  if (d === 2) return "★★";
  return "★★★";
}

Page({
  data: {
    stats: { completed: 0, totalFound: 0, totalExplorations: EXPLORATIONS.length, totalKnowledge: KNOWLEDGE.length, challenges: 0, places: PLACES.length },
    records: [] as RecordItem[],
    empty: false,
    badges: [] as BadgeItem[],
    earnedBadgeCount: 0,
    passport: { level: 1, current: 0, threshold: 800, exp: 0, percent: 0 },
    headerTop: 12,
    failedImages: {} as Record<string, boolean>,
    quiz: {
      totalPlays: 0,
      levels: [] as (QuizSummaryLevel & { stars: string; bestText: string })[],
    },
    quizEmpty: true,
    favoritesList: [] as FavoriteItem[],
    favoritesEmpty: true,
    profileHero: getPlaceHeroImage("p-everest") ?? "",
  },

  onShow() {
    this.getTabBar?.()?.setData({ selected: 4 });
    this.getTabBar?.()?.setData({ hidden: false });
    this.getTabBar?.()?.setData({ theme: "dark" });
    const headerTop = getHeaderTopOffset();
    const allRecords = getRecords();
    const records: RecordItem[] = allRecords.map((r: ExplorationRecord) => {
      const ex = EXPLORATIONS.find((e) => e.id === r.id);
      const place = PLACES.find((item) => item.explorationId === r.id);
      return {
        id: r.id,
        emoji: r.emoji,
        title: r.title,
        completed: r.completed,
        reachElevation: r.reachElevation,
        maxElevation: r.maxElevation,
        unitText: ex?.ui?.axisUnit ?? "m",
        knowledgeCount: r.knowledgeIds.length,
        pct: Math.min(100, Math.round((Math.abs(r.reachElevation) / Math.max(1, Math.abs(r.maxElevation))) * 100)),
        reachText: formatObservationElevation(r.reachElevation, r.maxElevation),
        maxText: formatObservationElevation(r.maxElevation, r.maxElevation),
        image: place ? getPlaceHeroImage(place.id) ?? "" : "",
      };
    });
    const best = getQuizBest();
    const summary = summarizeQuizBest(best);
    const quizLevels = summary.levels.map((l) => ({
      ...l,
      stars: difficultyStars(l.difficulty),
      bestText: `最佳 ${l.bestCorrect}/${l.bestTotal} · ${Math.round(l.bestRate * 100)}%`,
    }));
    const unlocked = unlockedLibraryIds(allRecords, EXPLORATIONS);
    const readIds = getReadKnowledgeIds();
    const learned = new Set([...unlocked, ...readIds].filter((id) => KNOWLEDGE.some((item) => item.id === id)));
    const completedCount = new Set(allRecords.filter((record) => record.completed).map((record) => record.id)).size;
    // 进度经验由已完成探索、已获知识和挑战次数推导；每项采用固定分值。
    const exp = completedCount * 250 + learned.size * 12 + summary.totalPlays * 30;
    const threshold = 800;
    const level = passportLevel(exp);
    const badges: BadgeItem[] = BADGE_CONFIG.map((badge) => ({
      ...badge,
      image: getPlaceHeroImage(badge.placeId) ?? "",
      earned: allRecords.some((record) => record.id === badge.id && record.completed),
    }));
    this.setData({
      headerTop,
      profileHero: getPlaceHeroImage("p-everest") ?? "",
      stats: {
        completed: completedCount,
        totalFound: learned.size,
        totalExplorations: EXPLORATIONS.length,
        totalKnowledge: KNOWLEDGE.length,
        challenges: summary.totalPlays,
        places: PLACES.length,
      },
      badges,
      earnedBadgeCount: badges.filter((badge) => badge.earned).length,
      passport: { ...level, exp, percent: Math.round((level.current / threshold) * 100) },
      records,
      empty: records.length === 0,
      quiz: { totalPlays: summary.totalPlays, levels: quizLevels },
      quizEmpty: quizLevels.length === 0,
      favoritesList: favorites.getPlaces(PLACES).map((p) => ({
        id: p.id,
        name: p.name,
        emoji: p.emoji,
        typeLabel: PLACE_TYPE_LABEL[p.type],
        shortDescription: p.shortDescription,
        image: getPlaceHeroImage(p.id) ?? "",
      })),
      favoritesEmpty: favorites.count() === 0,
    });
  },

  /** 打开收藏的地点详情 */
  onOpenFavorite(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pkg-detail/pages/place/index?id=${id}` });
  },

  onOpenRecord(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    wx.navigateTo({ url: `/pkg-explore/pages/exploration/index?id=${id}` });
  },

  onImageError(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (id) this.setData({ [`failedImages.${id}`]: true } as Record<string, unknown>);
  },

  /** 从列表快速取消收藏 */
  onRemoveFavorite(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (!id) return;
    favorites.toggle(id);
    this.onShow();
  },

  /** 数据来源与许可页 */
  onOpenCredits() {
    wx.navigateTo({ url: "/pkg-detail/pages/credits/index" });
  },

  onOpenSettings() {
    wx.showActionSheet({
      itemList: ["数据来源与许可", "清空本地数据"],
      success: ({ tapIndex }) => {
        if (tapIndex === 0) this.onOpenCredits();
        if (tapIndex === 1) this.onClear();
      },
    });
  },

  onClear() {
    wx.showModal({
      title: "清空探索记录",
      content: "会删除探索进度、收藏和挑战成绩，仅影响本机数据，且不能恢复。确定清空？",
      confirmText: "清空本地数据",
      cancelText: "保留数据",
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          this.onShow();
        }
      },
    });
  },
});
