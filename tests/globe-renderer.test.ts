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
});

