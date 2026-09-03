/**
 * 🎯 挑战页 —— 占位（题库已就绪，完整挑战模式下一迭代实现）。
 */
import { QUIZZES } from "../../data/quizzes";
import { pickQuizzes } from "../../utils/quiz";

Page({
  data: {
    count: 0,
    levels: [
      { id: 1, stars: "★" },
      { id: 2, stars: "★★" },
      { id: 3, stars: "★★★" },
    ],
  },

  onShow() {
    this.setData({ count: QUIZZES.length });
  },

  /** MVP 占位：先验证抽题逻辑可运行（不落盘） */
  onPreview() {
    const sample = pickQuizzes(QUIZZES, 1);
    const q = sample[0];
    if (q) {
      wx.showModal({
        title: `示例题（难度 ${q.difficulty}）`,
        content: q.question,
        showCancel: false,
        confirmText: "知道了",
      });
    }
  },
});
