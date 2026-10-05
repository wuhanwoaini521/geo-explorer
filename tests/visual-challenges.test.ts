import { describe, expect, it } from "vitest";
import { VISUAL_LANDFORM_QUIZZES } from "../miniprogram/data/visual-challenges";

describe("实景地貌识别题", () => {
  it("每道题都有照片和对应的辅助说明", () => {
    expect(VISUAL_LANDFORM_QUIZZES.length).toBeGreaterThanOrEqual(4);
    for (const quiz of VISUAL_LANDFORM_QUIZZES) {
      expect(quiz.visualSrc, quiz.id).toBeTruthy();
      expect(quiz.visualAlt?.trim(), quiz.id).not.toBe("");
    }
  });

  it("代表性深海照片不会被表述为马里亚纳海沟原位影像", () => {
    const quiz = VISUAL_LANDFORM_QUIZZES.find((item) => item.id === "photo-mariana");
    expect(quiz).toBeTruthy();
    expect(quiz!.visualAlt).toContain("不代表马里亚纳海沟原位环境");
    expect(quiz!.explanation).toContain("并非马里亚纳海沟原位影像");
  });
});
