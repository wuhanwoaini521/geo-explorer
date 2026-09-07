/**
 * 相机几何 + 位姿求解器（dev 工具自包含版本）。
 *
 * ⚠ 与 miniprogram/engine/{world-frame,projection-math,calibration-solver}.ts 存在
 * 一对一的镜像关系，唯一真相在 coordinate-system.md。若改本文件必须同步三处：
 *   - miniprogram/engine/world-frame.ts（常量/换算）
 *   - miniprogram/engine/projection-math.ts（投影）
 *   - miniprogram/engine/calibration-solver.ts（求解）
 * 数值由 Stage 2 单测背书（route 点抽查、回解真值）。
 *
 * 帧：+X East / +Y South / +Z Up（相对 DEM baseM=2976.22）。
 */
export const WORLD_LAT0 = 27.95;
export const WORLD_LON0 = 86.845;
export const WORLD_M_PER_DEG_LON = 98334.5;
export const WORLD_M_PER_DEG_LAT = 110575.116;
export const WORLD_BASE_ELEV_M = 2976.22;

export interface GeoPoint {
  lat: number;
  lon: number;
  elevationM: number;
}
export interface WorldPt {
  x: number;
  y: number;
  z: number;
}
export function geodToWorld(geo: GeoPoint): WorldPt {
  return {
    x: WORLD_M_PER_DEG_LON * (geo.lon - WORLD_LON0),
    y: -WORLD_M_PER_DEG_LAT * (geo.lat - WORLD_LAT0),
    z: geo.elevationM - WORLD_BASE_ELEV_M,
  };
}
export function worldToGeod(w: WorldPt): GeoPoint {
  return {
    lat: WORLD_LAT0 - w.y / WORLD_M_PER_DEG_LAT,
    lon: WORLD_LON0 + w.x / WORLD_M_PER_DEG_LON,
    elevationM: w.z + WORLD_BASE_ELEV_M,
  };
}

/* ----------------------------- 相机位姿 ----------------------------- */
export interface CameraPose {
  position: WorldPt;
  yawDeg: number;
  pitchDeg: number;
  rollDeg: number;
}
export interface CameraIntrinsics {
  f: number;
  cx: number;
  cy: number;
}
/** 基础三轴：前向 forward（世界 EN），右侧 right，上方 up */
export function cameraBasis(
  pose: Pick<CameraPose, "yawDeg" | "pitchDeg" | "rollDeg">,
): { forward: WorldPt; right: WorldPt; up: WorldPt } {
  const yaw = (pose.yawDeg * Math.PI) / 180;
  const pitch = (pose.pitchDeg * Math.PI) / 180;
  const roll = (pose.rollDeg * Math.PI) / 180;
  const forward: WorldPt = {
    x: Math.sin(yaw) * Math.cos(pitch),
    y: -Math.cos(yaw) * Math.cos(pitch),
    z: Math.sin(pitch),
  };
  const up0: WorldPt = { x: 0, y: 0, z: 1 };
  const right: WorldPt = {
    x: up0.y * forward.z - up0.z * forward.y,
    y: up0.z * forward.x - up0.x * forward.z,
    z: up0.x * forward.y - up0.y * forward.x,
  };
  const up: WorldPt = {
    x: forward.y * right.z - forward.z * right.y,
    y: forward.z * right.x - forward.x * right.z,
    z: forward.x * right.y - forward.y * right.x,
  };
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const rollRight: WorldPt = {
    x: cr * right.x + sr * up.x,
    y: cr * right.y + sr * up.y,
    z: cr * right.z + sr * up.z,
  };
  const rollUp: WorldPt = {
    x: -sr * right.x + cr * up.x,
    y: -sr * right.y + cr * up.y,
    z: -sr * right.z + cr * up.z,
  };
  return { forward, right: rollRight, up: rollUp };
}

/** 世界点 → 相机系（x/y/z；null = 相机后方） */
export function worldToCamera(p: WorldPt, pose: CameraPose): { x: number; y: number; z: number } | null {
  const b = cameraBasis(pose);
  const d = { x: p.x - pose.position.x, y: p.y - pose.position.y, z: p.z - pose.position.z };
  const z = d.x * b.forward.x + d.y * b.forward.y + d.z * b.forward.z;
  if (z <= 0) return null;
  return {
    x: d.x * b.right.x + d.y * b.right.y + d.z * b.right.z,
    y: d.x * b.up.x + d.y * b.up.y + d.z * b.up.z,
    z,
  };
}

/** 世界点 → [原图像素]（可用于反向渲染遮罩） */
export function projectWorldToPixel(
  p: WorldPt,
  pose: CameraPose,
  intr: CameraIntrinsics,
): { u: number; v: number; inFront: boolean } | null {
  const cam = worldToCamera(p, pose);
  if (!cam) return null;
  return { u: (intr.f * cam.x) / cam.z + intr.cx, v: (intr.f * cam.y) / cam.z + intr.cy, inFront: true };
}

/* ------------------------- 位姿求解（GN+LM） ------------------------- */
export interface SolverObservation {
  world: WorldPt;
  pixel: { x: number; y: number };
}
export interface SolverFreedom {
  yaw: boolean;
  pitch: boolean;
  roll: boolean;
  x: boolean;
  y: boolean;
  z: boolean;
  f: boolean;
}
export interface SolvedCamera {
  pose: CameraPose;
  focalPx: number;
  converged: boolean;
  medianPx: number;
  maxPx: number;
  perPointPx: number[];
}

function solveLinear(a: number[], b: number[]): number[] {
  const n = b.length;
  const m = a.slice();
  const rhs = b.slice();
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(m[r * n + c]) > Math.abs(m[piv * n + c])) piv = r;
    }
    if (Math.abs(m[piv * n + c]) < 1e-14) continue;
    if (piv !== c) {
      for (let k = 0; k < n; k++) {
        const t = m[c * n + k];
        m[c * n + k] = m[piv * n + k];
        m[piv * n + k] = t;
      }
      const t = rhs[c];
      rhs[c] = rhs[piv];
      rhs[piv] = t;
    }
    const div = m[c * n + c];
    for (let k = 0; k < n; k++) m[c * n + k] /= div;
    rhs[c] /= div;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const factorm = m[r * n + c];
      if (factorm === 0) continue;
      for (let k = 0; k < n; k++) m[r * n + k] -= factorm * m[c * n + k];
      rhs[r] -= factorm * rhs[c];
    }
  }
  return rhs;
}

/** 求解相机位姿（含可选平移/焦距自由化）。参数用像素归一化残差。 */
export function solveCameraPose(
  observations: SolverObservation[],
  init: { pose: CameraPose; focalPx: number; cx: number; cy: number },
  imageWidth: number,
  imageHeight: number,
  freedom?: Partial<SolverFreedom>,
): SolvedCamera {
  const free: Array<keyof SolverFreedom> = [
    "yaw",
    "pitch",
    "roll",
    ...(freedom?.x === false ? [] : ["x" as const]),
    ...(freedom?.y === false ? [] : ["y" as const]),
    ...(freedom?.z === false ? [] : ["z" as const]),
    ...(freedom?.f === false ? [] : ["f" as const]),
  ];
  const scale = 200 / Math.max(imageWidth, imageHeight);
  const project = (
    p: WorldPt,
    pose: CameraPose,
    f: number,
  ): { x: number; y: number } | null => {
    const cam = worldToCamera(p, pose);
    if (!cam) return null;
    return { x: (f * cam.x) / cam.z + init.cx, y: (f * cam.y) / cam.z + init.cy };
  };
  const build = (params: number[]) => {
    const pose: CameraPose = {
      position: { ...init.pose.position },
      yawDeg: init.pose.yawDeg,
      pitchDeg: init.pose.pitchDeg,
      rollDeg: init.pose.rollDeg,
    };
    let f = init.focalPx;
    for (let i = 0; i < free.length; i++) {
      const n = free[i];
      if (n === "yaw") pose.yawDeg = params[i];
      else if (n === "pitch") pose.pitchDeg = params[i];
      else if (n === "roll") pose.rollDeg = params[i];
      else if (n === "x") pose.position.x = params[i];
      else if (n === "y") pose.position.y = params[i];
      else if (n === "z") pose.position.z = params[i];
      else if (n === "f") f = params[i];
    }
    return { pose, f };
  };
  const residual = (params: number[]): number[] => {
    const m = build(params);
    const out: number[] = [];
    for (const o of observations) {
      const pr = project(o.world, m.pose, m.f);
      if (!pr || !isFinite(pr.x)) {
        out.push(0, 0);
        continue;
      }
      out.push(scale * (pr.x - o.pixel.x), scale * (pr.y - o.pixel.y));
    }
    return out;
  };

  const params = free.map((n) => {
    if (n === "yaw") return init.pose.yawDeg;
    if (n === "pitch") return init.pose.pitchDeg;
    if (n === "roll") return init.pose.rollDeg;
    if (n === "x") return init.pose.position.x;
    if (n === "y") return init.pose.position.y;
    if (n === "z") return init.pose.position.z;
    return init.focalPx;
  });
  const deltas = free.map((n) =>
    n === "yaw" || n === "pitch" || n === "roll" ? 1e-4 : 1e-2,
  );

  let p = params.slice();
  let lambda = 1e-2;
  const maxIter = 150;
  for (let iter = 0; iter < maxIter; iter++) {
    const r = residual(p);
    const norm = r2norm(r);
    if (norm < 1e-10) break;
    const nF = free.length;
    const J: number[][] = [];
    for (let j = 0; j < nF; j++) {
      const row: number[] = [];
      const saved = p[j];
      p[j] += deltas[j];
      const rp = residual(p);
      for (let k = 0; k < r.length; k++) row.push((rp[k] - r[k]) / deltas[j]);
      p[j] = saved;
      J.push(row);
    }
    const A = new Array<number>(nF * nF).fill(0);
    const g = new Array<number>(nF).fill(0);
    for (let a = 0; a < nF; a++) {
      for (let b = 0; b < nF; b++) {
        let s = 0;
        for (let k = 0; k < r.length; k++) s += J[a][k] * J[b][k];
        A[a * nF + b] = s;
      }
      for (let k = 0; k < r.length; k++) g[a] += J[a][k] * r[k];
    }
    const damped = A.slice();
    for (let a = 0; a < nF; a++) damped[a * nF + a] *= 1 + lambda;
    const dx = solveLinear(damped, g.map((v) => -v));
    const next = p.map((v) => v);
    for (let i = 0; i < nF; i++) next[i] += dx[i];
    const norm2 = r2norm(residual(next));
    if (norm2 < norm) {
      p = next;
      lambda = Math.max(lambda * 0.5, 1e-10);
    } else {
      lambda = Math.min(lambda * 4, 1e6);
    }
  }

  const final = build(p);
  const perPointPx: number[] = [];
  for (const o of observations) {
    const pr = project(o.world, final.pose, final.f);
    perPointPx.push(pr ? Math.hypot(pr.x - o.pixel.x, pr.y - o.pixel.y) : Infinity);
  }
  const finite = perPointPx.filter((v) => isFinite(v));
  const sortedPx = [...finite].sort((a, b) => a - b);
  return {
    pose: final.pose,
    focalPx: final.f,
    converged: true,
    medianPx: sortedPx.length ? sortedPx[Math.floor(sortedPx.length / 2)] : NaN,
    maxPx: sortedPx.length ? sortedPx[sortedPx.length - 1] : NaN,
    perPointPx,
  };
}

function r2norm(arr: number[]): number {
  let s = 0;
  for (const x of arr) s += x * x;
  return Math.sqrt(s);
}
