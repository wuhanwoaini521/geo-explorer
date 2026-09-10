"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 🎯 挑战页 —— 地理挑战完整模式。
 *
 * 流程：选择难度（★~★★★）→ 随机抽 5 题（优先该难度，不足补齐）
 * → 逐题作答（即时判分 + 解析，不可回退）→ 结算（星级/正确率/最佳成绩）。
 * 最佳成绩按难度落盘（quiz-store，更优者胜），抽题/计分为纯函数（utils/quiz）。
 */
const quizzes_1 = require("../../data/quizzes");
const quiz_1 = require("../../utils/quiz");
const quiz_store_1 = require("../../services/quiz-store");
const QUESTIONS_PER_RUN = 5;
Page({
    data: {
        count: 0,
        phase: "idle",
        levels: [],
        play: null,
        result: null,
    },
    // 内部状态（不参与渲染）
    difficulty: 1,
    quizzes: [],
    answers: [],
    onShow() {
        var _a, _b, _c, _d;
        (_b = (_a = this.getTabBar) === null || _a === void 0 ? void 0 : _a.call(this)) === null || _b === void 0 ? void 0 : _b.setData({ hidden: false });
        (_d = (_c = this.getTabBar) === null || _c === void 0 ? void 0 : _c.call(this)) === null || _d === void 0 ? void 0 : _d.setData({ selected: 3 });
        this.refreshIdle();
    },
    /* ---------------- 首页（难度选择） ---------------- */
    refreshIdle() {
        const best = (0, quiz_store_1.getQuizBest)();
        const levels = [1, 2, 3].map((id) => {
            const rec = best[id];
            return {
                id,
                stars: "★".repeat(id),
                label: id === 1 ? "入门" : id === 2 ? "进阶" : "达人",
                bestText: rec
                    ? `最佳 ${rec.bestCorrect}/${rec.bestTotal} · ${Math.round(rec.bestRate * 100)}%`
                    : "暂无记录",
                plays: rec ? rec.plays : 0,
            };
        });
        this.setData({
            count: quizzes_1.QUIZZES.length,
            phase: "idle",
            levels,
            play: null,
            result: null,
        });
    },
    onStart(e) {
        var _a, _b, _c;
        const id = Number((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.level) !== null && _c !== void 0 ? _c : 0);
        this.startRun(id >= 1 && id <= 3 ? id : 1);
    },
    startRun(difficulty) {
        const picked = (0, quiz_1.pickQuizzesByDifficulty)(quizzes_1.QUIZZES, QUESTIONS_PER_RUN, difficulty);
        if (!picked.length) {
            wx.showToast({ title: "题库为空", icon: "none" });
            return;
        }
        this.difficulty = difficulty;
        this.quizzes = picked;
        this.answers = [];
        this.setData({ phase: "play", result: null });
        this.renderQuestion(0);
    },
    /* ---------------- 答题 ---------------- */
    renderQuestion(index) {
        const q = this.quizzes[index];
        if (!q)
            return this.finishRun();
        this.setData({
            play: {
                index,
                total: this.quizzes.length,
                question: q.question,
                emoji: q.emoji,
                options: q.options,
                selected: -1,
                correct: false,
                revealed: false,
                explanation: q.explanation,
            },
        });
    },
    onPick(e) {
        var _a, _b, _c;
        const play = this.data.play;
        if (!play || play.revealed)
            return;
        const q = this.quizzes[play.index];
        const index = Number((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1);
        if (!q || index < 0 || index >= q.options.length)
            return;
        const correct = index === q.answerIndex;
        this.answers.push({ quizId: q.id, optionIndex: index, correct });
        this.setData({
            play: { ...play, selected: index, correct, revealed: true },
        });
    },
    onNext() {
        const play = this.data.play;
        if (!play)
            return;
        if (play.index + 1 >= this.quizzes.length) {
            this.finishRun();
        }
        else {
            this.renderQuestion(play.index + 1);
        }
    },
    /* ---------------- 结算 ---------------- */
    finishRun() {
        const score = (0, quiz_1.scoreAnswers)(this.answers);
        const before = (0, quiz_store_1.getQuizBest)()[this.difficulty];
        const after = (0, quiz_store_1.saveQuizResult)({
            difficulty: this.difficulty,
            correct: score.correct,
            total: score.total,
        });
        // 是否刷新纪录：以保存前的旧纪录为基准（同率比正确数）
        const isRecord = score.total > 0 &&
            (!before ||
                score.rate > before.bestRate ||
                (score.rate === before.bestRate && score.correct > before.bestCorrect));
        const pct = Math.round(score.rate * 100);
        this.setData({
            phase: "result",
            play: null,
            result: {
                correct: score.correct,
                total: score.total,
                pct,
                stars: (0, quiz_1.rateStars)(score.rate),
                isRecord,
                bestText: `最佳 ${after.bestCorrect}/${after.bestTotal} · ${Math.round(after.bestRate * 100)}%`,
            },
        });
    },
    onRetry() {
        this.startRun(this.difficulty);
    },
    onBackIdle() {
        this.refreshIdle();
    },
    /** 结算后给出明确的学习回路，而不是把用户留在结果页。 */
    onContinueLearning() {
        wx.switchTab({ url: "/pages/knowledge/index" });
    },
});
