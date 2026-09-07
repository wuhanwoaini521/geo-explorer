"use strict";
/**
 * 探索汇总 / 成就纯逻辑（Node 可单测，无 wx 依赖）。
 * 负责把一次攀登会话的原始数据（解锁、答题、途经自然带、时长）
 * 归纳为可供“登顶总结 - 摘要”渲染的结构化结果。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeRun = summarizeRun;
exports.quizAccuracy = quizAccuracy;
exports.computeAchievements = computeAchievements;
/** 根据会话原始数据计算统计指标（纯函数） */
function summarizeRun(input) {
    const acc = (arr) => arr.length === 0
        ? 0
        : arr.filter((a) => a.correct).length / arr.length;
    const visited = input.stageIds.length === 0
        ? []
        : input.stageIds
            .filter((id, i, self) => self.indexOf(id) === i)
            .map((id) => {
            const s = input.exploration.stages.find((st) => st.id === id);
            return s ? s.name : id;
        });
    return {
        maxReached: input.maxReached,
        summitted: input.maxReached >=
            input.exploration.maxElevation - 1e-6,
        discoveredIds: [...input.discoveredIds],
        unlockedCount: input.discoveredIds.length,
        nodeTotal: input.exploration.knowledgeNodes.length,
        quizCorrect: input.answers.filter((a) => a.correct).length,
        quizTotal: input.answers.length,
        accuracy: acc(input.answers),
        visitedStages: visited,
        stageTotal: input.exploration.stages.length,
        durationSec: Math.max(0, Math.round(input.durationSec)),
    };
}
/** 正确率 0-1（未作答为 0） */
function quizAccuracy(answers) {
    if (!answers.length)
        return 0;
    return answers.filter((a) => a.correct).length / answers.length;
}
/** 依据会话统计判断解锁的成就（纯函数） */
function computeAchievements(input) {
    const acc = [];
    if (input.summitted) {
        acc.push({
            id: "summit",
            emoji: "🧗",
            title: "抵达终点",
            desc: "抵达场景之最，完成整段探索",
        });
    }
    if (input.nodeTotal > 0 &&
        input.unlockedCount >= input.nodeTotal) {
        acc.push({
            id: "sage",
            emoji: "📚",
            title: "全知探索者",
            desc: "解锁了这个场景的全部知识节点",
        });
    }
    if (input.quizAnswerCount > 0 && input.quizAccuracy >= 0.8) {
        acc.push({
            id: "quiz-sharp",
            emoji: "🎯",
            title: "随堂高手",
            desc: "路上随堂题正确率达到 80% 以上",
        });
    }
    if (input.stageTotal > 0 &&
        input.visitedStageCount >= Math.min(5, input.stageTotal)) {
        acc.push({
            id: "trail",
            emoji: "🥾",
            title: "深厚跋涉",
            desc: `一路上穿过了 ${Math.min(5, input.stageTotal)} 个以上自然带`,
        });
    }
    return acc;
}
