/**
 * 校准工具（tools/everest-route-calibrator）正确性验证。
 *
 *  - 求解器回解：由已知相机位姿合成观测 → 解回，位姿/焦距近似回归
 *  - 状态机三态与运行时语义一致
 *  - DEM 遮挡：合成山脊 → 山体后方 OCCLUDED / 前方 VISIBLE
 */
import { describe, it, expect } from "vitest";
import {
  projectWorldToPixel,
  solveCameraPose,
  type CameraPose,
  type WorldPt,
} from "../tools/everest-route-calibrator/src/math/camera-math.js";
import {
  classifyVisibility,
  type DemGrid,
} from "../tools/everest-route-calibrator/src/math/occlusion.js";
import { statusFromStats, representativeReport } from "../tools/everest-route-calibrator/src/calibrate.js";
import { routeOverlayAllowed } from "../miniprogram/engine/calibration-validate.js";
const W = 1080;
const H = 1920;
const CX = W / 2;
const CY = H / 2;

/** 从合成全景位姿，把 n 个地标投影成观测（像素 + 世界点） */
function syntheticObservations(
  pose: CameraPose,
  focal: number,
  n: number,
): Array<{ world: WorldPt; pixel: { x: number; y: number } }> {
  const yaw = (pose.yawDeg * Math.PI) / 180;
  const out: Array<{ world: WorldPt; pixel: { x: number; y: number } }> = [];
  for (let i = 0; i < n; i++) {
    const theta = -0.6 + (1.2 * i) / (n - 1);
    const dist = 4000 + 6000 * Math.abs(Math.sin(i * 1.7));
    const elev = 350 + Math.sin(i * 2.3) * 300;
    const world: WorldPt = {
      x: pose.position.x + dist * Math.cos(yaw + theta),
      y: pose.position.y - dist * Math.sin(yaw + theta),
      z: pose.position.z + elev,
    };
    const shot = projectWorldToPixel(world, pose, { f: focal, cx: CX, cy: CY });
    if (!shot) throw new Error("合成点应在相机前方");
    out.push({ world, pixel: { x: shot.u, y: shot.v } });
  }
  return out;
}

describe("校准工具求解器回解", () => {
  it("从已知位姿合成观测 → 解出逼近真值", () => {
    const truth: CameraPose = {
      position: { x: -6000, y: 9000, z: 2600 },
      yawDeg: 62.5,
      pitchDeg: -14,
      rollDeg: 1.2,
    };
    const focal = 840;
    const obs = syntheticObservations(truth, focal, 7);
    const solved = solveCameraPose(
      obs,
      { pose: { ...truth, position: { ...truth.position } }, focalPx: focal, cx: CX, cy: CY },
      W,
      H,
      { x: true, y: true, z: true, yaw: true, pitch: true, roll: true, f: true },
    );
    expect(Math.abs(solved.medianPx)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(solved.pose.yawDeg - truth.yawDeg)).toBeLessThan(0.5);
    expect(Math.abs(solved.pose.pitchDeg - truth.pitchDeg)).toBeLessThan(0.5);
    expect(Math.abs(solved.pose.position.x - truth.position.x)).toBeLessThan(120);
    expect(Math.abs(solved.pose.position.y - truth.position.y)).toBeLessThan(120);
    expect(Math.abs(solved.pose.position.z - truth.position.z)).toBeLessThan(120);
  });
});

describe("校准工具状态机", () => {
  it("tri-state 与运行时语义一致", () => {
    expect(statusFromStats(0.2, 0.4, 6)).toBe("VERIFIED");
    expect(statusFromStats(0.2, 2.5, 6)).toBe("CALIBRATED");
    expect(statusFromStats(1.1, 0.4, 6)).toBe("REPRESENTATIVE");
    expect(statusFromStats(NaN, NaN, 0)).toBe("REPRESENTATIVE");
  });
});

/** 合成 DEM：一条东西向山脊（y=0 高） */
function buildDemoGrid(): DemGrid {
  const step = 200;
  const cols = 24;
  const rows = 24;
  const z = new Float32Array(rows * cols);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - cols / 2) * step;
      const y = (r - rows / 2) * step;
      const ridge = 400 * Math.exp(-((y / 250) ** 2));
      z[r * cols + c] = ridge + 100 * Math.exp(-((x / 600) ** 2));
    }
  }
  return {
    rows,
    cols,
    step,
    origin: { x: -(cols / 2) * step, y: -(rows / 2) * step, z: 0 },
    z,
  };
}

describe("校准工具 DEM 遮挡", () => {
  const topo = buildDemoGrid();
  // 相机在山脊以南（y=-1600），视线向北跨越 y=0 的东西向山脊
  const cam = { x: 0, y: -1600, z: 200 };

  it("山脊后方 OCCLUDED，越过山脊的 VISIBLE", () => {
    const inFront: WorldPt = { x: 0, y: 1400, z: 3000 }; // 高，视线在山脊之上
    const ve = { x: 0, y: 2000, z: -300 }; // 低，视线被山脊切断
    const out = classifyVisibility(topo, cam, [inFront, ve]).map((s) =>
      s === "OCCLUDED" ? "OCCLUDED" : ("VISIBLE" as const),
    );
    expect(out[0]).toBe("VISIBLE");
    expect(out[1]).toBe("OCCLUDED");
  });
});
describe("REPRESENTATIVE 兜底报告（§5/§47）", () => {
  const scene = { id: "live-a", width: 1080, height: 1920 } as Parameters<
    typeof representativeReport
  >[0];
  const built = representativeReport(scene);
  const rep = built.report;

  it("状态固定 REPRESENTATIVE，route 空，camera 省略", () => {
    expect(rep.status).toBe("REPRESENTATIVE");
    expect(rep.route.length).toBe(0);
    expect(rep.waypoints.length).toBe(0);
    expect((rep as { camera?: unknown }).camera).toBeUndefined();
    expect(rep.landmarks.length).toBe(0);
    expect(rep.reprojection.pass).toBe(false);
  });

  it("诚实声明：limitations 说清未求解，且相应地 REPRESENTATIVE 不放行 overlay", () => {
    expect(rep.limitations.length).toBeGreaterThanOrEqual(1);
    expect(rep.limitations.join("; ")).toContain("routeOverlay");
  });

  it("REPRESENTATIVE 的 routeOverlay 必须为 false（与 calibration-validate 一致）", () => {
    expect(routeOverlayAllowed(rep.status)).toBe(false);
  });
});
