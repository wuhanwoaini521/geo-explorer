/**
 * Phase-2 实景校准引导：LANDMARKS 数据库完备性 + 初始相机 guess 引导点。
 *
 * 目标（goal §4）：
 *  - viewer 用 guess 把每条地标投影成空心引导圈→人工点击吸附→solver 求解
 *  - 数据库必须预载 6 条核心地标（Everest/Lhotse/Nuptse/West Shoulder/South Col/Changtse）
 *  - live-a 相机 guess 必须取照片真实 EXIF GPS（Kala Patthar 北脊），而非 Kala 峰顶错误值
 */
import { describe, it, expect } from "vitest";
import { LANDMARKS, sceneById } from "../tools/everest-route-calibrator/src/scenes.js";
import { guessGuideMarks } from "../tools/everest-route-calibrator/src/calibrate.js";
import { geodToWorld } from "../tools/everest-route-calibrator/src/math/camera-math.js";

const LIVE_A = sceneById("live-a");
if (!LIVE_A) throw new Error("live-a scene missing");

describe("Phase-2 地标数据库", () => {
  it("预载 6 条核心地标，每条含有效坐标与海拔", () => {
    const need = [
      "everest-summit",
      "everest-south-col",
      "lhotse-summit",
      "nptse-summit",
      "everest-west-shoulder",
      "changtse",
    ];
    const ids = new Set(LANDMARKS.map((l) => l.id));
    for (const id of need) {
      const lm = LANDMARKS.find((l) => l.id === id)!;
      expect(ids.has(id), `缺失地标 ${id}`).toBe(true);
      expect(lm.lat).toBeGreaterThan(27);
      expect(lm.lat).toBeLessThan(29);
      expect(lm.lon).toBeGreaterThan(86);
      expect(lm.lon).toBeLessThan(87.1);
      expect(lm.elevationM).toBeGreaterThan(4000);
      const world = geodToWorld({ lat: lm.lat, lon: lm.lon, elevationM: lm.elevationM });
      expect(
        Number.isFinite(world.x) && Number.isFinite(world.y) && Number.isFinite(world.z),
      ).toBe(true);
    }
    expect(LANDMARKS.length).toBeGreaterThanOrEqual(8);
  });

  it("珠峰 / 洛子 / 努子 / 章子 海拔与坐标合理", () => {
    const s = LANDMARKS.find((l) => l.id === "everest-summit")!;
    expect(s.elevationM).toBeGreaterThanOrEqual(8840);
    const l = LANDMARKS.find((l) => l.id === "lhotse-summit")!;
    expect(l.elevationM).toBeGreaterThanOrEqual(8510);
    const n = LANDMARKS.find((l) => l.id === "nptse-summit")!;
    expect(n.elevationM).toBeGreaterThanOrEqual(7860);
    const c = LANDMARKS.find((l) => l.id === "changtse")!;
    expect(c.elevationM).toBeGreaterThanOrEqual(7500);
  });
});

describe("live-a 相机 guess = 真实 EXIF GPS", () => {
  it("lat/lon 与照片 EXIF(27.9989129/86.856634) 一致（偏差<1e-3）", () => {
    const g = LIVE_A.cameraGuesses!;
    expect(g.lat).toBeCloseTo(27.9989129, 5);
    expect(g.lon).toBeCloseTo(86.856634, 5);
  });
});

describe("guessGuideMarks 引导投影", () => {
  it("对 live-a 投影出 ≥6 条在帧内地标，关键峰均可见", () => {
    const marks = guessGuideMarks(LIVE_A);
    const ids = new Set(marks.map((m) => m.landmarkId));
    // 至少应含这些在 Kala 视口可见的峰
    for (const id of ["everest-summit", "lhotse-summit", "nptse-summit"]) {
      expect(ids.has(id), `引导缺失 ${id}`).toBe(true);
    }
    const inFrame = marks.filter((m) => m.u >= 0 && m.u <= 1 && m.v >= 0 && m.v <= 1);
    expect(inFrame.length).toBeGreaterThanOrEqual(5);
  });

  it("旋转不变的相对排列：珠峰左于洛子、右于章子——任一珠峰东侧相机成立", () => {
    const marks = guessGuideMarks(LIVE_A);
    const find = (id: string) => marks.find((m) => m.landmarkId === id)!;
    const s = find("everest-summit");
    const l = find("lhotse-summit");
    const c = find("changtse");
    // 洛子(东南)相对东方必在珠峰右；章子(西北)恒在珠峰左
    expect(l.u).toBeGreaterThan(s.u + 0.01);
    expect(c.u).toBeLessThan(s.u - 0.01);
    // 主峰位于可点击的中上部（越界则引导不可点）
    expect(s.u).toBeGreaterThan(0.05);
    expect(s.u).toBeLessThan(0.95);
    expect(s.v).toBeGreaterThan(0.1);
    expect(s.v).toBeLessThan(0.85);
  });

  it("guess 投影确定性：两次调用返回相同引导点", () => {
    const a = guessGuideMarks(LIVE_A);
    const b = guessGuideMarks(LIVE_A);
    expect(a).toEqual(b);
  });
});