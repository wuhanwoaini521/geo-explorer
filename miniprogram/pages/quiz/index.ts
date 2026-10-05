/** Expedition Mission hub and the existing five-question challenge flow. */
import { QUIZZES } from "../../data/quizzes";
import { VISUAL_LANDFORM_QUIZZES } from "../../data/visual-challenges";
import {
  pickQuizzesByDifficulty,
  rateStars,
  scoreAnswers,
  type AnswerResult,
} from "../../utils/quiz";
import {
  getQuizAttemptHistory,
  getQuizBest,
  saveQuizResult,
  type QuizAttemptRecord,
} from "../../services/quiz-store";
import { getHeaderTopOffset } from "../../utils/layout";
import { getPlaceHeroImage } from "../../data/media/world-manifests";
import type { Quiz } from "../../types/models";

const QUESTIONS_PER_RUN = 5;
const QUIZ_POOL: Quiz[] = [...QUIZZES, ...VISUAL_LANDFORM_QUIZZES];
const QUIZ_BY_ID = new Map(QUIZ_POOL.map((quiz) => [quiz.id, quiz]));

interface MissionDefinition {
  id: string;
  title: string;
  subtitle: string;
  difficulty: 1 | 2 | 3;
  questionIds: string[];
}

interface MissionCard extends MissionDefinition {
  difficultyLabel: string;
  done: number;
  total: number;
  progress: number;
  progressText: string;
  image: string;
}

interface FeaturedSlide {
  id: string;
  kicker: string;
  title: string;
  subtitle: string;
  image: string;
  metaItems: string[];
  cta: string;
}

const MISSION_DEFINITIONS: MissionDefinition[] = [
  {
    id: "everest",
    title: "珠穆朗玛峰专题挑战",
    subtitle: "高海拔 · 冰川 · 登山环境",
    difficulty: 2,
    questionIds: ["photo-everest", "photo-icefall", "q04", "q06", "q07", "q08", "q12", "q20"],
  },
  {
    id: "mariana",
    title: "海洋地貌知识挑战",
    subtitle: "海沟 · 深海带 · 地球尺度",
    difficulty: 2,
    questionIds: ["photo-mariana", "q05", "q13", "q17"],
  },
  {
    id: "fuji",
    title: "火山地貌挑战",
    subtitle: "富士山 · 火口 · 喷发历史",
    difficulty: 1,
    questionIds: ["photo-fuji", "q19", "q21", "q22"],
  },
  {
    id: "colorado",
    title: "大峡谷地质历史挑战",
    subtitle: "河流下切 · 岩层 · 地质年代",
    difficulty: 3,
    questionIds: ["photo-colorado", "q15", "q23"],
  },
];

interface PlayState {
  index: number;
  total: number;
  question: string;
  emoji: string;
  image: string;
  imageAlt: string;
  imageFailed: boolean;
  options: string[];
  selected: number;
  correct: boolean;
  revealed: boolean;
  explanation: string;
}

interface ResultState {
  correct: number;
  total: number;
  pct: number;
  stars: number;
  isRecord: boolean;
  bestText: string;
}

interface LevelCard {
  id: number;
  stars: string;
  label: string;
  bestText: string;
  plays: number;
}

function difficultyLabel(difficulty: number): string {
  return difficulty === 1 ? "入门" : difficulty === 2 ? "进阶" : "达人";
}

function currentWeekStart(now: number): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const daysSinceMonday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);
  return start.getTime();
}

function currentDayStart(now: number): number {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

function cardForMission(
  definition: MissionDefinition,
  answeredIds: Set<string>,
): MissionCard {
  const questions = definition.questionIds
    .map((id) => QUIZ_BY_ID.get(id))
    .filter((quiz): quiz is Quiz => Boolean(quiz));
  const done = questions.filter((quiz) => answeredIds.has(quiz.id)).length;
  return {
    ...definition,
    difficultyLabel: difficultyLabel(definition.difficulty),
    done,
    total: questions.length,
    progress: questions.length ? Math.round((done / questions.length) * 100) : 0,
    progressText: `${done} / ${questions.length}`,
    image: getPlaceHeroImage(
      definition.id === "everest" ? "p-everest"
        : definition.id === "mariana" ? "p-mariana"
          : definition.id === "fuji" ? "p-fuji" : "p-colorado",
    ) ?? "",
  };
}

function missionVisible(mission: MissionCard, activeDifficulty: number): boolean {
  if (!activeDifficulty) return true;
  return mission.difficulty === activeDifficulty;
}

/** Unique completed question IDs support stable task progress across sessions. */
export function answeredQuestionIds(attempts: readonly QuizAttemptRecord[]): Set<string> {
  return new Set(attempts.flatMap((attempt) => attempt.questionIds));
}

Page({
  data: {
    headerTop: 80,
    count: QUIZZES.length + VISUAL_LANDFORM_QUIZZES.length,
    phase: "idle" as "idle" | "play" | "result",
    activeDifficulty: 0,
    weekProgress: 0,
    todayPhotoProgress: 0,
    todayComplete: false,
    dailyQuestionCount: VISUAL_LANDFORM_QUIZZES.length,
    dailyImage: getPlaceHeroImage("p-colorado") ?? "",
    featuredSlides: [] as FeaturedSlide[],
    featuredIndex: 0,
    missions: [] as MissionCard[],
    levels: [] as LevelCard[],
    currentMissionTitle: "每日地貌识别",
    currentMissionId: "daily",
    play: null as PlayState | null,
    result: null as ResultState | null,
    failedImages: {} as Record<string, boolean>,
  },

  difficulty: 1,
  activeMissionId: "daily",
  quizzes: [] as Quiz[],
  answers: [] as AnswerResult[],

  onLoad() {
    this.setData({ headerTop: getHeaderTopOffset() });
  },

  onShow() {
    this.getTabBar?.()?.setData({ hidden: false, selected: 3, theme: "light" });
    if (this.data.phase === "idle") this.refreshIdle();
  },

  refreshIdle() {
    const now = Date.now();
    const attempts = getQuizAttemptHistory();
    const answeredIds = answeredQuestionIds(attempts);
    const best = getQuizBest();
    const levels: LevelCard[] = [1, 2, 3].map((id) => {
      const record = best[id];
      return {
        id,
        stars: "★".repeat(id),
        label: difficultyLabel(id),
        bestText: record
          ? `最佳 ${record.bestCorrect}/${record.bestTotal} · ${Math.round(record.bestRate * 100)}%`
          : "暂无记录",
        plays: record?.plays ?? 0,
      };
    });
    const weekProgress = attempts.filter((attempt) => attempt.completedAt >= currentWeekStart(now)).length;
    const todayAttempts = attempts.filter((attempt) => attempt.completedAt >= currentDayStart(now));
    const photoIds = new Set(VISUAL_LANDFORM_QUIZZES.map((quiz) => quiz.id));
    const todayPhotoIds = new Set(todayAttempts.flatMap((attempt) => attempt.questionIds).filter((id) => photoIds.has(id)));
    const allMissions = MISSION_DEFINITIONS.map((definition) => cardForMission(definition, answeredIds));
    const missions = allMissions.filter((mission) => missionVisible(mission, this.data.activeDifficulty));
    const featuredSlides: FeaturedSlide[] = [
      {
        id: "daily",
        kicker: todayPhotoIds.size >= VISUAL_LANDFORM_QUIZZES.length ? "今日任务已完成" : "每日挑战",
        title: "地貌识别任务",
        subtitle: "从实景照片认识不同地形与环境",
        image: getPlaceHeroImage("p-colorado") ?? "",
        metaItems: [`${VISUAL_LANDFORM_QUIZZES.length} 道题`, "入门", `今日 ${Math.min(todayPhotoIds.size, VISUAL_LANDFORM_QUIZZES.length)}/${VISUAL_LANDFORM_QUIZZES.length}`],
        cta: todayPhotoIds.size >= VISUAL_LANDFORM_QUIZZES.length ? "再挑战" : "开始挑战",
      },
      // The daily slide already uses the Colorado scene; keep the hero carousel
      // to four distinct slides while all four missions remain in the task list.
      ...allMissions.filter((mission) => mission.id !== "colorado").map((mission) => ({
        id: mission.id,
        kicker: `${mission.difficultyLabel}专题`,
        title: mission.title,
        subtitle: mission.subtitle,
        image: mission.image,
        metaItems: [`${mission.total} 道题`, mission.difficultyLabel, `已答 ${mission.done}/${mission.total}`],
        cta: "开始挑战",
      })),
    ];
    this.setData({
      count: QUIZ_POOL.length,
      levels,
      missions,
      featuredSlides,
      featuredIndex: 0,
      weekProgress: Math.min(5, weekProgress),
      todayPhotoProgress: Math.min(VISUAL_LANDFORM_QUIZZES.length, todayPhotoIds.size),
      todayComplete: VISUAL_LANDFORM_QUIZZES.length > 0 && todayPhotoIds.size >= VISUAL_LANDFORM_QUIZZES.length,
      dailyQuestionCount: VISUAL_LANDFORM_QUIZZES.length,
    });
  },

  onFeaturedChange(e: PageEvent) {
    const featuredIndex = Number(e.detail?.current ?? 0);
    if (Number.isFinite(featuredIndex)) this.setData({ featuredIndex });
  },

  onFeaturedDotTap(e: PageEvent) {
    const featuredIndex = Number(e.currentTarget?.dataset?.index ?? 0);
    if (Number.isInteger(featuredIndex) && featuredIndex >= 0 && featuredIndex < this.data.featuredSlides.length) {
      this.setData({ featuredIndex });
    }
  },

  onDifficultyFilter(e: PageEvent) {
    const value = Number(e.currentTarget?.dataset?.difficulty ?? 0);
    const activeDifficulty = value >= 1 && value <= 3 ? value : 0;
    this.setData({ activeDifficulty });
    this.refreshIdle();
  },

  /** Legacy difficulty entry remains available to bindings and deep links. */
  onStart(e: PageEvent) {
    const id = Number(e.currentTarget?.dataset?.level ?? 0);
    this.startRun(id >= 1 && id <= 3 ? id : 1);
  },

  onStartMission(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "daily");
    this.startMission(id);
  },

  startMission(missionId: string) {
    const definition = MISSION_DEFINITIONS.find((mission) => mission.id === missionId);
    const source = missionId === "daily"
      ? VISUAL_LANDFORM_QUIZZES
      : definition?.questionIds.map((id) => QUIZ_BY_ID.get(id)).filter((quiz): quiz is Quiz => Boolean(quiz)) ?? [];
    if (!source.length) {
      wx.showToast({ title: "当前任务没有可用题目", icon: "none" });
      return;
    }
    const attempted = answeredQuestionIds(getQuizAttemptHistory());
    const unseen = source.filter((quiz) => !attempted.has(quiz.id));
    const ordered = [...unseen, ...source.filter((quiz) => attempted.has(quiz.id))];
    const selected = missionId === "daily"
      ? ordered.slice(0, Math.min(QUESTIONS_PER_RUN, source.length))
      : ordered.slice(0, Math.min(QUESTIONS_PER_RUN, source.length));
    if (!selected.length) {
      wx.showToast({ title: "当前任务没有可用题目", icon: "none" });
      return;
    }
    // Mission difficulty is the task's declared level; individual questions may vary.
    const difficulty = missionId === "daily" ? 1 : definition?.difficulty ?? 1;
    this.beginRun(selected, difficulty, missionId, missionId === "daily"
      ? "每日地貌识别"
      : definition?.title ?? "探索任务");
  },

  startRun(difficulty: number) {
    const picked = pickQuizzesByDifficulty(QUIZ_POOL, QUESTIONS_PER_RUN, difficulty);
    if (!picked.length) {
      wx.showToast({ title: "题库为空", icon: "none" });
      return;
    }
    this.beginRun(picked, difficulty, "legacy", `${difficultyLabel(difficulty)}知识挑战`);
  },

  beginRun(quizzes: Quiz[], difficulty: number, missionId: string, missionTitle: string) {
    this.difficulty = difficulty;
    this.activeMissionId = missionId;
    this.quizzes = quizzes;
    this.answers = [];
    this.setData({
      phase: "play",
      currentMissionId: missionId,
      currentMissionTitle: missionTitle,
      result: null,
    });
    this.renderQuestion(0);
  },

  renderQuestion(index: number) {
    const quiz = this.quizzes[index];
    if (!quiz) return this.finishRun();
    this.setData({
      play: {
        index,
        total: this.quizzes.length,
        question: quiz.question,
        emoji: quiz.emoji,
        image: quiz.visualSrc ?? "",
        imageAlt: quiz.visualAlt ?? "",
        imageFailed: false,
        options: quiz.options,
        selected: -1,
        correct: false,
        revealed: false,
        explanation: quiz.explanation,
      },
    });
  },

  onPick(e: PageEvent) {
    const play = this.data.play;
    if (!play || play.revealed) return;
    const quiz = this.quizzes[play.index];
    const index = Number(e.currentTarget?.dataset?.index ?? -1);
    if (!quiz || index < 0 || index >= quiz.options.length) return;
    const correct = index === quiz.answerIndex;
    this.answers.push({ quizId: quiz.id, optionIndex: index, correct });
    this.setData({ play: { ...play, selected: index, correct, revealed: true } });
  },

  onVisualError() {
    const play = this.data.play;
    if (play && !play.imageFailed) this.setData({ play: { ...play, imageFailed: true } });
  },

  onMissionImageError(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id ?? "");
    if (id) this.setData({ [`failedImages.${id}`]: true } as Record<string, unknown>);
  },

  onNext() {
    const play = this.data.play;
    if (!play) return;
    if (play.index + 1 >= this.quizzes.length) this.finishRun();
    else this.renderQuestion(play.index + 1);
  },

  finishRun() {
    const score = scoreAnswers(this.answers);
    const before = getQuizBest()[this.difficulty];
    const after = saveQuizResult({
      difficulty: this.difficulty,
      correct: score.correct,
      total: score.total,
      questionIds: this.answers.map((answer) => answer.quizId),
      correctQuestionIds: this.answers.filter((answer) => answer.correct).map((answer) => answer.quizId),
    });
    const isRecord = score.total > 0 && (!before || score.rate > before.bestRate ||
      (score.rate === before.bestRate && score.correct > before.bestCorrect));
    this.setData({
      phase: "result",
      play: null,
      result: {
        correct: score.correct,
        total: score.total,
        pct: Math.round(score.rate * 100),
        stars: rateStars(score.rate),
        isRecord,
        bestText: `最佳 ${after.bestCorrect}/${after.bestTotal} · ${Math.round(after.bestRate * 100)}%`,
      },
    });
  },

  onRetry() {
    if (this.activeMissionId === "legacy") this.startRun(this.difficulty);
    else this.startMission(this.activeMissionId);
  },

  onBackIdle() {
    this.setData({ phase: "idle", play: null, result: null });
    this.refreshIdle();
  },

  onContinueLearning() {
    wx.switchTab({ url: "/pages/knowledge/index" });
  },
});
