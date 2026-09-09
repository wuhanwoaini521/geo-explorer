/**
 * Gate 3.4 · 相机派生层测试。
 *
 * 语义断言：
 *   - 相机 = CameraConfig + progress 的纯派生，无状态、无第二套进度；
 *   - 段边界 zoom 平滑（不允许跳变）；
 *   - 空/缺配置 → emptyCameraFrame（UI 不渲染）。
 */
import { describe, expect, it } from "vitest";
import { EVEREST_EXPEDITION } from "../miniprogram/data/expeditions/everest";
import {
  cameraFrameAt,
  emptyCameraFrame,
} from "../miniprogram/engine/expedition-camera";

const camera = EVEREST_EXPEDITION.camera;

describe("相机 = 配置 + progress 纯派生", () => {
  it("八个真实里程碑各自拥有一个镜头场景并覆盖 [0,1]", () => {
    const a = cameraFrameAt(camera, 0);
    const end = cameraFrameAt(camera, 1);
    expect(camera.segments).toHaveLength(8);
    expect(camera.segments[0].fromProgress).toBe(0);
    expect(camera.segments.at(-1)?.toProgress).toBe(1);
    expect(new Set(camera.segments.map((segment) => segment.id)).size).toBe(8);
    expect(a.segmentIndex).toBe(0);
    expect(a.asset).toBe("everest-expedition-hero-v1");
    expect(end.segmentIndex).toBe(camera.segments.length - 1);
    expect(end.progress).toBe(1);
  });

  it("zoom 跨段连续（前段末 ≈ 后段首），不跳变", () => {
    // 取段0右边界处 zoom 与段1左边界处 zoom 做比较
    const boundary0 = camera.segments[1].fromProgress;
    const left = cameraFrameAt(camera, boundary0 - 1e-3);
    const right = cameraFrameAt(camera, boundary0 + 1e-3);
    // 连续：两侧 zoom 差必须远小于段内 scale 跨度
    expect(Math.abs(right.zoom - left.zoom)).toBeLessThan(0.02);
  });

  it("zoom 恒 ≥1，段内局部进度 0..1", () => {
    for (let p = 0; p <= 1; p += 0.05) {
      const f = cameraFrameAt(camera, p);
      expect(f.zoom).toBeGreaterThanOrEqual(1);
      expect(f.segmentLocal).toBeGreaterThanOrEqual(0);
      expect(f.segmentLocal).toBeLessThanOrEqual(1);
    }
  });

  it("blendNext 指示是否接近下一段", () => {
    const firstSegment = camera.segments[0];
    const mid = cameraFrameAt(camera, (firstSegment.fromProgress + firstSegment.toProgress) / 2);
    const nearEnd = cameraFrameAt(camera, firstSegment.toProgress - 1e-3);
    expect(mid.blendNext).toBeLessThan(0.6);
    expect(nearEnd.blendNext).toBeGreaterThan(0.9);
  });

  it("offsetX/offsetY/focus 随相机段连续派生，不只消费 zoom", () => {
    const early = cameraFrameAt(camera, 0.35);
    const late = cameraFrameAt(camera, 0.7);
    expect(early.offsetY).not.toBe(late.offsetY);
    expect(early.focus?.y).not.toBe(late.focus?.y);
    const boundary = camera.segments[3].fromProgress;
    expect(Math.abs(cameraFrameAt(camera, boundary + 1e-3).offsetY - cameraFrameAt(camera, boundary - 1e-3).offsetY)).toBeLessThan(0.01);
  });
});

describe("空/缺相机容错", () => {
  it("无相机 → emptyCameraFrame（不可见）", () => {
    const f = cameraFrameAt(undefined, 0.5);
    expect(f.segmentIndex).toBe(-1);
    expect(f.asset).toBe("");
  });

  it("空段数组 → emptyCameraFrame", () => {
    expect(cameraFrameAt({ segments: [] }, 0.5).segmentIndex).toBe(-1);
    expect(emptyCameraFrame().segmentIndex).toBe(-1);
  });
});
