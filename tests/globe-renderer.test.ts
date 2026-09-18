import { describe, expect, it } from "vitest";
import { projectGlobePoint } from "../miniprogram/engine/globe-renderer";

describe("globe projection", () => {
  it("places the point at the camera-facing center when longitude matches rotation", () => {
    const point = projectGlobePoint(0, 30, 30 * Math.PI / 180, 0, 100, 120, 60);
    expect(point.visible).toBe(true);
    expect(point.x).toBeCloseTo(100, 5);
    expect(point.y).toBeCloseTo(120, 5);
    expect(point.z).toBeCloseTo(1, 5);
  });

  it("hides a destination on the opposite hemisphere", () => {
    const point = projectGlobePoint(0, 180, 0, 0, 100, 120, 60);
    expect(point.visible).toBe(false);
    expect(point.z).toBeCloseTo(-1, 5);
  });

  it("limits vertical tilt to a stable pitch input without changing geographic longitude", () => {
    const point = projectGlobePoint(45, 0, 0, 0.35, 100, 120, 60);
    expect(point.visible).toBe(true);
    expect(point.x).toBeCloseTo(100, 5);
    expect(point.y).toBeLessThan(120);
  });

  it("moves facing surface in the same direction as touch drag gestures", () => {
    const centerX = 100;
    const centerY = 120;
    const radius = 60;
    let rotation = 0;
    let pitch = 0;

    const initial = projectGlobePoint(0, 0, rotation, pitch, centerX, centerY, radius);
    expect(initial.x).toBeCloseTo(centerX, 5);
    expect(initial.y).toBeCloseTo(centerY, 5);

    // 手指向右滑动 deltaX > 0: rotation 减小，地球正面点向右移动 (x 增加)
    const deltaX = 20;
    rotation -= (deltaX / 300) * 2.2;
    const movedRight = projectGlobePoint(0, 0, rotation, pitch, centerX, centerY, radius);
    expect(movedRight.x).toBeGreaterThan(initial.x);

    // 手指向下滑动 deltaY > 0: pitch 增加，地球正面点向下移动 (y 增加)
    const deltaY = 20;
    pitch += (deltaY / 300) * 1.2;
    const movedDown = projectGlobePoint(0, 0, rotation, pitch, centerX, centerY, radius);
    expect(movedDown.y).toBeGreaterThan(initial.y);
  });
});

