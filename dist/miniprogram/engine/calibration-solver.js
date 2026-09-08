"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.solveCameraPose = solveCameraPose;
const projection_math_1 = require("./projection-math");
/** 把观测点投影到图像坐标（未做裁剪判断） */
function rawPixel(world, pose, focalPx, cx, cy) {
    const cam = (0, projection_math_1.worldToCamera)(world, pose);
    if (!cam)
        return null;
    return { x: (focalPx * cam.x) / cam.z + cx, y: (focalPx * cam.y) / cam.z + cy };
}
function buildFromParams(params, free, base) {
    const pose = {
        position: { ...base.pose.position },
        yawDeg: base.pose.yawDeg,
        pitchDeg: base.pose.pitchDeg,
        rollDeg: base.pose.rollDeg,
    };
    let focalPx = base.focalPx;
    for (let i = 0; i < free.length; i++) {
        const n = free[i];
        switch (n) {
            case "yaw":
                pose.yawDeg = params[i];
                break;
            case "pitch":
                pose.pitchDeg = params[i];
                break;
            case "roll":
                pose.rollDeg = params[i];
                break;
            case "x":
                pose.position.x = params[i];
                break;
            case "y":
                pose.position.y = params[i];
                break;
            case "z":
                pose.position.z = params[i];
                break;
            case "f":
                focalPx = params[i];
                break;
        }
    }
    return { pose, focalPx };
}
/** 解线性方程组 a x = b（高斯消元，行主序方阵） */
function solveLinear(a, b) {
    const n = b.length;
    const m = a.slice();
    const rhs = b.slice();
    for (let c = 0; c < n; c++) {
        let piv = c;
        for (let r = c + 1; r < n; r++) {
            if (Math.abs(m[r * n + c]) > Math.abs(m[piv * n + c]))
                piv = r;
        }
        if (Math.abs(m[piv * n + c]) < 1e-14)
            continue;
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
        for (let k = 0; k < n; k++)
            m[c * n + k] /= div;
        rhs[c] /= div;
        for (let r = 0; r < n; r++) {
            if (r === c)
                continue;
            const factor = m[r * n + c];
            if (factor === 0)
                continue;
            for (let k = 0; k < n; k++)
                m[r * n + k] -= factor * m[c * n + k];
            rhs[r] -= factor * rhs[c];
        }
    }
    return rhs;
}
/**
 * 求解相机位姿（含可选平移/焦距自由化）。
 *
 * @param observations 3D↔2D 观测（每个 landmark 一条）
 * @param init 初始位姿 + 焦距 + 主点
 * @param imageWidth / imageHeight 观测图尺寸（误差归一化与 jacobian 尺度）
 * @param freedom 自由度开关；默认全部为 true（yaw/pitch/roll + x/y/z + f）
 */
function solveCameraPose(observations, init, imageWidth, imageHeight, freedom) {
    const free = [
        "yaw",
        "pitch",
        "roll",
        ...((freedom === null || freedom === void 0 ? void 0 : freedom.x) === false ? [] : ["x"]),
        ...((freedom === null || freedom === void 0 ? void 0 : freedom.y) === false ? [] : ["y"]),
        ...((freedom === null || freedom === void 0 ? void 0 : freedom.z) === false ? [] : ["z"]),
        ...((freedom === null || freedom === void 0 ? void 0 : freedom.f) === false ? [] : ["f"]),
    ];
    const scale = 200 / Math.max(imageWidth, imageHeight);
    const maxIterations = 150;
    const tol = 1e-5;
    const params = free.map((n) => {
        if (n === "yaw")
            return init.pose.yawDeg;
        if (n === "pitch")
            return init.pose.pitchDeg;
        if (n === "roll")
            return init.pose.rollDeg;
        if (n === "x")
            return init.pose.position.x;
        if (n === "y")
            return init.pose.position.y;
        if (n === "z")
            return init.pose.position.z;
        return init.focalPx;
    });
    const deltas = free.map((n) => n === "yaw" || n === "pitch" || n === "roll" ? 1e-4 : 1e-2);
    const residual = (p) => {
        const m = buildFromParams(p, free, init);
        const out = [];
        for (const o of observations) {
            const pr = rawPixel(o.world, m.pose, m.focalPx, init.cx, init.cy);
            if (!pr || !isFinite(pr.x) || !isFinite(pr.y)) {
                out.push(0, 0);
                continue;
            }
            out.push(scale * (pr.x - o.pixel.x), scale * (pr.y - o.pixel.y));
        }
        return out;
    };
    let p = params.slice();
    let lambda = 1e-2;
    let iterations = 0;
    let converged = false;
    for (; iterations < maxIterations; iterations++) {
        const r = residual(p);
        let norm = 0;
        for (const x of r)
            norm += x * x;
        if (norm < tol * tol * r.length) {
            converged = true;
            break;
        }
        // 数值 Jacobian
        const nF = free.length;
        const J = [];
        for (let j = 0; j < nF; j++) {
            const row = new Array(r.length).fill(0);
            const saved = p[j];
            p[j] += deltas[j];
            const rp = residual(p);
            for (let k = 0; k < r.length; k++)
                row[k] = (rp[k] - r[k]) / deltas[j];
            p[j] = saved;
            J.push(row);
        }
        // 正规方程 (J^T J + λ diag) dx = -J^T r
        const A = new Array(nF * nF).fill(0);
        const g = new Array(nF).fill(0);
        for (let a = 0; a < nF; a++) {
            for (let b = 0; b < nF; b++) {
                let s = 0;
                for (let k = 0; k < r.length; k++)
                    s += J[a][k] * J[b][k];
                A[a * nF + b] = s;
            }
            for (let k = 0; k < r.length; k++)
                g[a] += J[a][k] * r[k];
        }
        const damped = A.slice();
        for (let a = 0; a < nF; a++)
            damped[a * nF + a] *= 1 + lambda;
        const dx = solveLinear(damped, g.map((v) => -v));
        const next = p.map((v) => v);
        for (let i = 0; i < nF; i++)
            next[i] += dx[i];
        const r2 = residual(next);
        let norm2 = 0;
        for (const x of r2)
            norm2 += x * x;
        if (norm2 < norm) {
            p = next;
            lambda = Math.max(lambda * 0.5, 1e-10);
            if (norm - norm2 < tol * tol * r.length) {
                converged = true;
                break;
            }
        }
        else {
            lambda = Math.min(lambda * 4, 1e6);
            if (lambda >= 1e6 && norm > 0) {
                converged = false;
                break;
            }
        }
    }
    // 评估最终
    const final = buildFromParams(p, free, init);
    const perPointPx = [];
    for (const o of observations) {
        const pr = rawPixel(o.world, final.pose, final.focalPx, init.cx, init.cy);
        perPointPx.push(pr ? Math.hypot(pr.x - o.pixel.x, pr.y - o.pixel.y) : Infinity);
    }
    const finite = perPointPx.filter((v) => isFinite(v));
    const sortedPx = [...finite].sort((a, b) => a - b);
    const medianPx = sortedPx.length ? sortedPx[Math.floor(sortedPx.length / 2)] : NaN;
    const maxPx = sortedPx.length ? sortedPx[sortedPx.length - 1] : NaN;
    const meanPx = finite.length ? finite.reduce((a, b) => a + b, 0) / finite.length : NaN;
    const rvec = residual(p);
    const rms = Math.sqrt(rvec.reduce((a, b) => a + b * b, 0) / Math.max(1, rvec.length));
    return {
        pose: final.pose,
        focalPx: final.focalPx,
        converged,
        iterations,
        perPointPx,
        medianPx,
        meanPx,
        maxPx,
        rms,
    };
}
