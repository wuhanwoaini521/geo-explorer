"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shuffle = shuffle;
exports.pickQuizzes = pickQuizzes;
exports.pickQuizzesByDifficulty = pickQuizzesByDifficulty;
exports.isCorrectAnswer = isCorrectAnswer;
exports.gradeAnswer = gradeAnswer;
exports.scoreAnswers = scoreAnswers;
exports.rateStars = rateStars;
/** Fisher–Yates 洗牌（纯函数，可注入 rng 便于测试） */
function shuffle(items, random = Math.random) {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        const tmp = arr[i];
        arr[i] = arr[j];
        arr[j] = tmp;
    }
    return arr;
}
/** 从题库随机抽取 count 道题（不重复；超出则取全部） */
function pickQuizzes(quizzes, count, random = Math.random) {
    if (count <= 0 || quizzes.length === 0)
        return [];
    return shuffle(quizzes, random).slice(0, Math.min(count, quizzes.length));
}
/**
 * 按难度抽题：优先从指定难度的题目中抽；不足 count 时用其他难度补齐。
 * difficulty 缺省 / 题库为空时退化为普通抽题。
 */
function pickQuizzesByDifficulty(quizzes, count, difficulty, random = Math.random) {
    if (count <= 0 || quizzes.length === 0)
        return [];
    if (difficulty === undefined)
        return pickQuizzes(quizzes, count, random);
    const matched = quizzes.filter((q) => q.difficulty === difficulty);
    if (matched.length === 0)
        return pickQuizzes(quizzes, count, random);
    if (matched.length >= count)
        return pickQuizzes(matched, count, random);
    const rest = quizzes.filter((q) => q.difficulty !== difficulty);
    return [...pickQuizzes(matched, matched.length, random), ...pickQuizzes(rest, count - matched.length, random)];
}
/** 判断某选项是否正确答案 */
function isCorrectAnswer(quiz, selectedIndex) {
    return selectedIndex === quiz.answerIndex;
}
/** 判断一次选择，产出标准化结果 */
function gradeAnswer(quiz, optionIndex) {
    return {
        quizId: quiz.id,
        optionIndex,
        correct: isCorrectAnswer(quiz, optionIndex),
    };
}
/** 对一组作答计分 */
function scoreAnswers(answers) {
    const correct = answers.filter((a) => a.correct).length;
    return {
        total: answers.length,
        correct,
        rate: answers.length === 0 ? 0 : correct / answers.length,
    };
}
/** 成绩文案等级（结算页用）：≥80% 三星 / ≥60% 两星 / >0 一星 / 未答无星 */
function rateStars(rate) {
    if (rate >= 0.8)
        return 3;
    if (rate >= 0.6)
        return 2;
    if (rate > 0)
        return 1;
    return 0;
}
