/**
 * 地图标记投影换算 —— 回归测试。
 *
 * 背景（用户实际报告）：地球上的地点标记飘到球体外的太空里，左侧选中标记被挤到
 * 屏幕外、标签只剩「科罗」两字。根因是这段换算内联在 canvas 回调闭包里，X 用
 * 画布宽度、Y 用整屏高度，两个基准不一致；当时 499 条测试里 screenTop/screenLeft
 * 一次都没出现，等于零覆盖。
 *
 * 本文件把换算锁在纯函数上，并加一条源码契约，防止再次退回整屏基准。
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { markerScreenPercent } from "../miniprogram/engine/globe-marker-projection";

describe("markerScreenPercent：画布内坐标 → 容器百分比", () => {
  // 典型场景：画布从容器顶部偏移 104px（208rpx），容器高 744px（窗口高），
  // 屏幕高 844px（含状态栏/底部区域）——两者不同正是线上 bug 的触发条件。
  const view = { width: 375, height: 744, offsetX: 0, offsetY: 104 };

  it("叠加画布偏移后按容器尺寸换算，X/Y 同基准", () => {
    const p = markerScreenPercent(187.5, 268, view);
    expect(p.left).toBeCloseTo(50, 6);
    expect(p.top).toBeCloseTo(((268 + 104) / 744) * 100, 6);
  });

  it("百分比可反算回容器像素坐标（投影不失真）", () => {
    const p = markerScreenPercent(100, 200, view);
    expect((p.left / 100) * view.width).toBeCloseTo(100 + view.offsetX, 6);
    expect((p.top / 100) * view.height).toBeCloseTo(200 + view.offsetY, 6);
  });

  it("容器高与屏幕高不同时，结果跟随容器高度", () => {
    const byContainer = markerScreenPercent(0, 300, { ...view, height: 744 });
    const byScreen = ((300 + 104) / 844) * 100;
    expect(byContainer.top).toBeCloseTo(((300 + 104) / 744) * 100, 6);
    // 若有人改回整屏高度，数值会落到 byScreen —— 这里直接拦住。
    expect(byContainer.top).not.toBeCloseTo(byScreen, 3);
  });

  it("容器尺寸为 0 时按 1 处理，不产生 Infinity / NaN", () => {
    const p = markerScreenPercent(10, 20, {
      width: 0,
      height: 0,
      offsetX: 0,
      offsetY: 0,
    });
    expect(Number.isFinite(p.left)).toBe(true);
    expect(Number.isFinite(p.top)).toBe(true);
  });

  it("画布偏移为 0（全屏画布）时退化为纯归一化", () => {
    const p = markerScreenPercent(180, 400, {
      width: 360,
      height: 800,
      offsetX: 0,
      offsetY: 0,
    });
    expect(p.left).toBeCloseTo(50, 6);
    expect(p.top).toBeCloseTo(50, 6);
  });
});

describe("地图页标记投影契约（源码级回归）", () => {
  const source = readFileSync(
    join(__dirname, "..", "miniprogram", "pages", "map", "index.ts"),
    "utf8",
  );

  it("标记归一化委托给纯函数", () => {
    expect(source).toMatch(/markerScreenPercent\(/);
  });

  it("地图页不得再用整屏高度参与标记换算（历史 bug 的写法）", () => {
    // 地图容器是 fixed inset:0，标记层的定位基准就是容器尺寸。
    // 一旦有人把 windowHeight 改回 screenHeight，标记会再次整体上移脱离球面。
    expect(source).not.toMatch(/screenHeight/);
  });
});
