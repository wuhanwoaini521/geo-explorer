"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.answeredQuestionIds = answeredQuestionIds;
/** Expedition Mission hub and the existing five-question challenge flow. */
const quizzes_1 = require("../../data/quizzes");
const visual_challenges_1 = require("../../data/visual-challenges");
const quiz_1 = require("../../utils/quiz");
const quiz_store_1 = require("../../services/quiz-store");
const layout_1 = require("../../utils/layout");
const world_manifests_1 = require("../../data/media/world-manifests");
const QUESTIONS_PER_RUN = 5;
const QUIZ_POOL = [...quizzes_1.QUIZZES, ...visual_challenges_1.VISUAL_LANDFORM_QUIZZES];
const QUIZ_BY_ID = new Map(QUIZ_POOL.map((quiz) => [quiz.id, quiz]));
const MISSION_DEFINITIONS = [
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
function difficultyLabel(difficulty) {
    return difficulty === 1 ? "入门" : difficulty === 2 ? "进阶" : "达人";
}
function currentWeekStart(now) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);
    return start.getTime();
}
function currentDayStart(now) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start.getTime();
}
function cardForMission(definition, answeredIds) {
    var _a;
    const questions = definition.questionIds
        .map((id) => QUIZ_BY_ID.get(id))
        .filter((quiz) => Boolean(quiz));
    const done = questions.filter((quiz) => answeredIds.has(quiz.id)).length;
    return {
        ...definition,
        difficultyLabel: difficultyLabel(definition.difficulty),
        done,
        total: questions.length,
        progress: questions.length ? Math.round((done / questions.length) * 100) : 0,
        progressText: `${done} / ${questions.length}`,
        image: (_a = (0, world_manifests_1.getPlaceHeroImage)(definition.id === "everest" ? "p-everest"
            : definition.id === "mariana" ? "p-mariana"
                : definition.id === "fuji" ? "p-fuji" : "p-colorado")) !== null && _a !== void 0 ? _a : "",
    };
}
function missionVisible(mission, activeDifficulty) {
    if (!activeDifficulty)
        return true;
    return mission.difficulty === activeDifficulty;
}
/** Unique completed question IDs support stable task progress across sessions. */
function answeredQuestionIds(attempts) {
    return new Set(attempts.flatMap((attempt) => attempt.questionIds));
}
Page({
    data: {
        headerTop: 80,
        count: quizzes_1.QUIZZES.length + visual_challenges_1.VISUAL_LANDFORM_QUIZZES.length,
        phase: "idle",
        activeDifficulty: 0,
        weekProgress: 0,
        todayPhotoProgress: 0,
        todayComplete: false,
        dailyQuestionCount: visual_challenges_1.VISUAL_LANDFORM_QUIZZES.length,
        dailyImage: (_a = (0, world_manifests_1.getPlaceHeroImage)("p-colorado")) !== null && _a !== void 0 ? _a : "",
        featuredSlides: [],
        featuredIndex: 0,
        missions: [],
        levels: [],
        currentMissionTitle: "每日地貌识别",
        currentMissionId: "daily",
        play: null,
        result: null,
        failedImages: {},
    },
    difficulty: 1,
    activeMissionId: "daily",
    quizzes: [],
    answers: [],
    onLoad() {
        this.setData({ headerTop: (0, layout_1.getHeaderTopOffset)() });
    },
    onShow() {
        var _a, _b;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ hidden: false, selected: 3, theme: "light" });
        if (this.data.phase === "idle")
            this.refreshIdle();
    },
    refreshIdle() {
        var _a;
        const now = Date.now();
        const attempts = (0, quiz_store_1.getQuizAttemptHistory)();
        const answeredIds = answeredQuestionIds(attempts);
        const best = (0, quiz_store_1.getQuizBest)();
        const levels = [1, 2, 3].map((id) => {
            var _a;
            const record = best[id];
            return {
                id,
                stars: "★".repeat(id),
                label: difficultyLabel(id),
                bestText: record
                    ? `最佳 ${record.bestCorrect}/${record.bestTotal} · ${Math.round(record.bestRate * 100)}%`
                    : "暂无记录",
                plays: (_a = record === null || record === void 0 ? void 0 : record.plays) !== null && _a !== void 0 ? _a : 0,
            };
        });
        const weekProgress = attempts.filter((attempt) => attempt.completedAt >= currentWeekStart(now)).length;
        const todayAttempts = attempts.filter((attempt) => attempt.completedAt >= currentDayStart(now));
        const photoIds = new Set(visual_challenges_1.VISUAL_LANDFORM_QUIZZES.map((quiz) => quiz.id));
        const todayPhotoIds = new Set(todayAttempts.flatMap((attempt) => attempt.questionIds).filter((id) => photoIds.has(id)));
        const allMissions = MISSION_DEFINITIONS.map((definition) => cardForMission(definition, answeredIds));
        const missions = allMissions.filter((mission) => missionVisible(mission, this.data.activeDifficulty));
        const featuredSlides = [
            {
                id: "daily",
                kicker: todayPhotoIds.size >= visual_challenges_1.VISUAL_LANDFORM_QUIZZES.length ? "今日任务已完成" : "每日挑战",
                title: "地貌识别任务",
                subtitle: "从实景照片认识不同地形与环境",
                image: (_a = (0, world_manifests_1.getPlaceHeroImage)("p-colorado")) !== null && _a !== void 0 ? _a : "",
                metaItems: [`${visual_challenges_1.VISUAL_LANDFORM_QUIZZES.length} 道题`, "入门", `今日 ${Math.min(todayPhotoIds.size, visual_challenges_1.VISUAL_LANDFORM_QUIZZES.length)}/${visual_challenges_1.VISUAL_LANDFORM_QUIZZES.length}`],
                cta: todayPhotoIds.size >= visual_challenges_1.VISUAL_LANDFORM_QUIZZES.length ? "再挑战" : "开始挑战",
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
            todayPhotoProgress: Math.min(visual_challenges_1.VISUAL_LANDFORM_QUIZZES.length, todayPhotoIds.size),
            todayComplete: visual_challenges_1.VISUAL_LANDFORM_QUIZZES.length > 0 && todayPhotoIds.size >= visual_challenges_1.VISUAL_LANDFORM_QUIZZES.length,
            dailyQuestionCount: visual_challenges_1.VISUAL_LANDFORM_QUIZZES.length,
        });
    },
    onFeaturedChange(e) {
        var _a, _b;
        const featuredIndex = Number((_b = (_a = e.detail) === null || _a === void 0 ? void 0 : _a.current) !== null && _b !== void 0 ? _b : 0);
        if (Number.isFinite(featuredIndex))
            this.setData({ featuredIndex });
    },
    onFeaturedDotTap(e) {
        var _a, _b, _c;
        const featuredIndex = Number((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : 0);
        if (Number.isInteger(featuredIndex) && featuredIndex >= 0 && featuredIndex < this.data.featuredSlides.length) {
            this.setData({ featuredIndex });
        }
    },
    onDifficultyFilter(e) {
        var _a, _b, _c;
        const value = Number((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.difficulty) !== null && _c !== void 0 ? _c : 0);
        const activeDifficulty = value >= 1 && value <= 3 ? value : 0;
        this.setData({ activeDifficulty });
        this.refreshIdle();
    },
    /** Legacy difficulty entry remains available to bindings and deep links. */
    onStart(e) {
        var _a, _b, _c;
        const id = Number((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.level) !== null && _c !== void 0 ? _c : 0);
        this.startRun(id >= 1 && id <= 3 ? id : 1);
    },
    onStartMission(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "daily");
        this.startMission(id);
    },
    startMission(missionId) {
        var _a, _b, _c;
        const definition = MISSION_DEFINITIONS.find((mission) => mission.id === missionId);
        const source = missionId === "daily"
            ? visual_challenges_1.VISUAL_LANDFORM_QUIZZES
            : (_a = definition === null || definition === void 0 ? void 0 : definition.questionIds.map((id) => QUIZ_BY_ID.get(id)).filter((quiz) => Boolean(quiz))) !== null && _a !== void 0 ? _a : [];
        if (!source.length) {
            wx.showToast({ title: "当前任务没有可用题目", icon: "none" });
            return;
        }
        const attempted = answeredQuestionIds((0, quiz_store_1.getQuizAttemptHistory)());
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
        const difficulty = missionId === "daily" ? 1 : (_b = definition === null || definition === void 0 ? void 0 : definition.difficulty) !== null && _b !== void 0 ? _b : 1;
        this.beginRun(selected, difficulty, missionId, missionId === "daily"
            ? "每日地貌识别"
            : (_c = definition === null || definition === void 0 ? void 0 : definition.title) !== null && _c !== void 0 ? _c : "探索任务");
    },
    startRun(difficulty) {
        const picked = (0, quiz_1.pickQuizzesByDifficulty)(QUIZ_POOL, QUESTIONS_PER_RUN, difficulty);
        if (!picked.length) {
            wx.showToast({ title: "题库为空", icon: "none" });
            return;
        }
        this.beginRun(picked, difficulty, "legacy", `${difficultyLabel(difficulty)}知识挑战`);
    },
    beginRun(quizzes, difficulty, missionId, missionTitle) {
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
    renderQuestion(index) {
        var _a, _b;
        const quiz = this.quizzes[index];
        if (!quiz)
            return this.finishRun();
        this.setData({
            play: {
                index,
                total: this.quizzes.length,
                question: quiz.question,
                emoji: quiz.emoji,
                image: (_a = quiz.visualSrc) !== null && _a !== void 0 ? _a : "",
                imageAlt: (_b = quiz.visualAlt) !== null && _b !== void 0 ? _b : "",
                imageFailed: false,
                options: quiz.options,
                selected: -1,
                correct: false,
                revealed: false,
                explanation: quiz.explanation,
            },
        });
    },
    onPick(e) {
        var _a, _b, _c;
        const play = this.data.play;
        if (!play || play.revealed)
            return;
        const quiz = this.quizzes[play.index];
        const index = Number((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1);
        if (!quiz || index < 0 || index >= quiz.options.length)
            return;
        const correct = index === quiz.answerIndex;
        this.answers.push({ quizId: quiz.id, optionIndex: index, correct });
        this.setData({ play: { ...play, selected: index, correct, revealed: true } });
    },
    onVisualError() {
        const play = this.data.play;
        if (play && !play.imageFailed)
            this.setData({ play: { ...play, imageFailed: true } });
    },
    onMissionImageError(e) {
        var _a, _b, _c;
        const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.id) !== null && _c !== void 0 ? _c : "");
        if (id)
            this.setData({ [`failedImages.${id}`]: true });
    },
    onNext() {
        const play = this.data.play;
        if (!play)
            return;
        if (play.index + 1 >= this.quizzes.length)
            this.finishRun();
        else
            this.renderQuestion(play.index + 1);
    },
    finishRun() {
        const score = (0, quiz_1.scoreAnswers)(this.answers);
        const before = (0, quiz_store_1.getQuizBest)()[this.difficulty];
        const after = (0, quiz_store_1.saveQuizResult)({
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
                stars: (0, quiz_1.rateStars)(score.rate),
                isRecord,
                bestText: `最佳 ${after.bestCorrect}/${after.bestTotal} · ${Math.round(after.bestRate * 100)}%`,
            },
        });
    },
    onRetry() {
        if (this.activeMissionId === "legacy")
            this.startRun(this.difficulty);
        else
            this.startMission(this.activeMissionId);
    },
    onBackIdle() {
        this.setData({ phase: "idle", play: null, result: null });
        this.refreshIdle();
    },
    onContinueLearning() {
        wx.switchTab({ url: "/pages/knowledge/index" });
    },
});
