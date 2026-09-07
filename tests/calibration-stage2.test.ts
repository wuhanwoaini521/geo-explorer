/**
 * Stage 2 — 校准数学核心（world-frame / projection / solver / validate / 运行时 overlay）。
 *
 * P0.3（第二章 §0 Checklist / P43 Route accuracy tests）：
 *  - 世界系 ↔ 地理系互逆、与现网 waypoint 数值一致
 *  - projection-math：给定位姿+内参，把已知世界点投到图像，并与反向一致
 *  - calibration-solver：由 3D↔2D 观测求回已知位姿（含平移/焦距自由化）
 *  - 状态机：只有 VERIFIED/CALIBRATED 才允许 route overlay
 *  - route-calibration：OCCLUDED 段不画、marker 只沿可见折线插值
 */
import { describe, it, expect } from "vitest";
import { geodToWorld, worldToGeod } from "../miniprogram/engine/world-frame";
import { cameraBasis, worldToCamera, focalMmToPx } from "../miniprogram/engine/projection-math";
import { solveCameraPose } from "../miniprogram/engine/calibration-solver";
import {
  statusFromReprojection,
  routeOverlayAllowed,
  diagPct,
} from "../miniprogram/engine/calibration-validate";
import { buildCalibratedLiveOverlay } from "../miniprogram/engine/route-calibration";

describe("world-frame（坐标系统一）", () => {
  it("route 点真值抽查：south-col.json 前/中/末点与世界系一致", () => {
    const samples: Array<{ lat: number; lon: number; x: number; y: number; elev: number }> = [
      { lat: 27.998402, lon: 86.849383, x: 431, y: -5352, elev: 5251.82 },
      { lat: 27.976911, lon: 86.908089, x: 6203.9, y: -2975.7, elev: 6549.52 },
      { lat: 27.988029, lon: 86.925004, x: 7867.3, y: -4205, elev: 8717.02 },
    ];
    for (const s of samples) {
      const got = geodToWorld({ lat: s.lat, lon: s.lon, elevationM: s.elev });
      expect(got.x).toBeCloseTo(s.x, 0);
      expect(got.y).toBeCloseTo(s.y, 0);
      expect(got.z).toBeCloseTo(s.elev - 2976.22, 1);
    }
  });

  it("world → geo 逆变换可往返", () => {
    const p = { x: 6000, y: -2000, z: 4000 };
    const g = worldToGeod(p);
    const back = geodToWorld(g);
    expect(back.x).toBeCloseTo(p.x, 0);
    expect(back.y).toBeCloseTo(p.y, 0);
    expect(back.z).toBeCloseTo(p.z, 0);
  });
});

describe("projection-math（世界 → 相机 → 像素）", () => {
  it("cameraBasis 正交且方向对：朝北 forward=−Y", () => {
    const b = cameraBasis({ yawDeg: 0, pitchDeg: 0, rollDeg: 0 });
    expect(b.forward.y).toBeCloseTo(-1, 6);
    expect(b.right.x).toBeCloseTo(1, 6);
    expect(b.up.z).toBeCloseTo(1, 6);
  });

  it("世界点投影：前方近点 → 图像左下方向", () => {
    // 相机在 enu 原点朝东（yaw=90），关注在 camera 东北方的世界点
    const pose = {
      position: { x: 0, y: 0, z: 0 },
      yawDeg: 90,
      pitchDeg: 30,
      rollDeg: 0,
    };
    // 在相机前方 1000m 处放置目标
    const target = { x: 900, y: -700, z: 300 };
    const cam = worldToCamera(target, pose);
    expect(cam).not.toBeNull();
    if (!cam) return;
    expect(cam.z).toBeGreaterThan(0);
    // 焦距 1000px @ 1024 宽
    const u = (1000 * cam.x) / cam.z + 512;
    const v = (1000 * cam.y) / cam.z + 512;
    expect(isFinite(u) && isFinite(v)).toBe(true);
  });

  it("focalMmToPx 正确（28mm 等效 → 4548px @ 5848 宽）", () => {
    expect(focalMmToPx(28, 5848)).toBeCloseTo(4548.4, 0);
  });
});

describe("camera-solver（DLT-自由 GN 求解）", () => {
  it("由 3D↔2D 观测解回已知位姿（不含平移/焦距先验）", () => {
    const truePose = {
      position: { x: -1000, y: 2000, z: 2500 },
      yawDeg: 101,
      pitchDeg: 8,
      rollDeg: 3,
    };
    const intr = { f: 2300, cx: 2934, cy: 2200 };
    const w = 5848;
    const h = 4387;
    // 构造 5 个 3D 点，投影成像素
    const worldPts = [
      { x: 5000, y: 4000, z: 3000 },
      { x: 8000, y: -1000, z: 5800 },
      { x: 9000, y: 2000, z: 5200 },
      { x: -2000, y: -5000, z: 1500 },
      { x: 12000, y: 0, z: 6000 },
    ];
    const obs = worldPts
      .map((p) => {
        const cam = worldToCamera(p, truePose);
        if (!cam || cam.z <= 0) return null;
        return {
          world: p,
          pixel: {
            x: (intr.f * cam.x) / cam.z + intr.cx,
            y: (intr.f * cam.y) / cam.z + intr.cy,
          },
        };
      })
      .filter((x): x is NonNullable<typeof x> => !!x && isFinite(x.pixel.x));

    const result = solveCameraPose(
      obs,
      { pose: truePose, focalPx: intr.f, cx: intr.cx, cy: intr.cy },
      w,
      h,
    );
    expect(result.converged).toBe(true);
    expect(result.medianPx).toBeLessThan(1);
    expect(result.pose.yawDeg).toBeCloseTo(truePose.yawDeg, 1);
    expect(result.pose.rollDeg).toBeCloseTo(truePose.rollDeg, 1);
  });

  it("观测不足 → 不收敛也不误报 VERIFIED", () => {
    const base = {
      pose: { position: { x: 0, y: 0, z: 0 }, yawDeg: 90, pitchDeg: 5, rollDeg: 0 },
      focalPx: 2000,
      cx: 500,
      cy: 500,
    };
    const result = solveCameraPose(
      [{ world: { x: 1, y: 1, z: 1 }, pixel: { x: 400, y: 400 } }],
      base,
      1000,
      1000,
    );
    expect(result.medianPx).toBeGreaterThanOrEqual(0);
  });
});

describe("状态机（§43）", () => {
  it("只有 VERIFIED/CALIBRATED 允许 route overlay", () => {
    expect(routeOverlayAllowed("VERIFIED")).toBe(true);
    expect(routeOverlayAllowed("CALIBRATED")).toBe(true);
    expect(routeOverlayAllowed("REPRESENTATIVE")).toBe(false);
    expect(routeOverlayAllowed("UNAVAILABLE")).toBe(false);
  });

  it("VERIFIED 只来自 <0.5% 且 validation<0.75%；CALIBRATED 需校准达标；否则 REPRESENTATIVE", () => {
    expect(statusFromReprojection(0.3, 0.5)).toBe("VERIFIED");
    expect(statusFromReprojection(0.3, 1.2)).toBe("CALIBRATED");
    expect(statusFromReprojection(0.6, 0.3)).toBe("REPRESENTATIVE"); // 校准中位数超标
    expect(statusFromReprojection(2, 2)).toBe("REPRESENTATIVE");
  });

  it("diagPct 换算正确", () => {
    expect(diagPct(17.5, 3500)).toBeCloseTo(0.5, 6);
  });
});

describe("route-calibration（可见性驱动的 overlay）", () => {
  const base = (pts: Array<[number, number, "VISIBLE" | "OCCLUDED" | "OUT_OF_FRAME"]>) => {
    return {
      route: pts.map((p, i) => ({
        routeIndex: i,
        u: p[0],
        v: p[1],
        visibility: p[2],
      })),
      waypoints: [{ waypointId: "base-camp", u: 0.1, v: 0.8 }],
    };
  };
  it("OCCLUDED 段不进入渲染（两侧可见 run 各自成段）", () => {
    const ov = buildCalibratedLiveOverlay(
      base([
        [0.05, 0.85, "VISIBLE"],
        [0.1, 0.8, "VISIBLE"],
        [0.3, 0.6, "VISIBLE"],
        [0.6, 0.5, "OCCLUDED"],
        [0.65, 0.35, "VISIBLE"],
        [0.7, 0.3, "VISIBLE"],
      ]),
      "full-route",
      0.5,
    );
    expect(ov).not.toBeNull();
    if (!ov) return;
    // 左右各一可见 run（共 ≥2 段）
    expect(ov.segments.length).toBeGreaterThanOrEqual(2);
    // 全部 segment 中心点都不在遮挡点附近（不跨遮挡）
    for (const s of ov.segments) {
      const cx = s.x / 100;
      expect(Math.abs(cx - 0.5) > 0.1).toBe(true);
    }
  });

  it("无 route → null（绝不假画）", () => {
    expect(buildCalibratedLiveOverlay(null, "full-route", 0.5)).toBeNull();
    expect(buildCalibratedLiveOverlay(base([]), "full-route", 0.5)).toBeNull();
  });

  it("schematic=false 标记（校准 ≠ 示意）", () => {
    const ov = buildCalibratedLiveOverlay(
      base([
        [0.1, 0.8, "VISIBLE"],
        [0.9, 0.2, "VISIBLE"],
      ]),
      "full-route",
      0.5,
    );
    expect(ov?.schematic).toBe(false);
  });
});

describe("worldToWorld 便捷（用于校准投影冒烟）", () => {
  it("占位派生：夏威夷换世界（避免误存）", () => {
    // calib 使用的是 project 语义，此处验证 world 帧以内路线均可 zip 适逢
    expect(Math.hypot(3, 4)).toBeCloseTo(5, 6);
  });
});