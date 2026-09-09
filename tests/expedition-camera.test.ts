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
  it("三相机段覆盖 [0,1]、边界元素正确", () => {
    const a = cameraFrameAt(camera, 0);
    const b = cameraFrameAt(camera, 0.4);
    const c = cameraFrameAt(camera, 0.66);
    const end = cameraFrameAt(camera, 1);
    expect(a.segmentIndex).toBe(0);
    expect(a.asset).toBe("everest-view-a");
    expect(b.asset).toBe("everest-view-b");
    expect(c.asset).toBe("everest-view-c");
    expect(end.segmentIndex).toBe(camera.segments.length - 1);
    expect(end.progress).toBe(1);
  });

  it("zoom 跨段连续（前段末 ≈ 后段首），不跳变", () => {
    // 取段0右边界处 zoom 与段1左边界处 zoom 做比较
    const boundary0 = 0.4;
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
    const mid = cameraFrameAt(camera, 0.2);
    const nearEnd = cameraFrameAt(camera, 0.39);
    expect(mid.blendNext).toBeLessThan(0.6);
    expect(nearEnd.blendNext).toBeGreaterThan(0.9);
  });

  it("offsetX/offsetY/focus 随相机段连续派生，不只消费 zoom", () => {
    const early = cameraFrameAt(camera, 0.42);
    const late = cameraFrameAt(camera, 0.62);
    expect(early.offsetY).not.toBe(late.offsetY);
    expect(early.focus?.y).not.toBe(late.focus?.y);
    expect(Math.abs(cameraFrameAt(camera, 0.4 + 1e-3).offsetY - cameraFrameAt(camera, 0.4 - 1e-3).offsetY)).toBeLessThan(0.01);
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
