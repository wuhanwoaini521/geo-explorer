#!/usr/bin/env python3
"""
RouteIndex 数据完整性审计（P0.2）。

读取 miniprogram/data/routes/everest/south-col.json（289 控制点），对：
  - lat / lon 范围
  - 距离单调性（世界 x/y 段长 > 0）
  - DEM 高程连续性（相邻段落差 / 短窗口平均增速）
  - 重复点 / 重合段
  - 突变跳点
  - waypoint 在折线上的投影（最近点距离）
做数值审计，输出：design/world/everest-live/route-audit.md

用途：提供 ../route 数据 QA 的可复现依据，不直接改生成结果。
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
ROUTE = ROOT / "miniprogram/data/routes/everest/south-col.json"
WAYPOINTS = ROOT / "design/world/everest-3d/route/waypoints.json"
OUT = ROOT / "design/world/everest-live/route-audit.md"


def main() -> int:
    d = json.loads(ROUTE.read_text(encoding="utf-8"))
    pts = d["points"]
    wps = json.loads(WAYPOINTS.read_text(encoding="utf-8"))
    n = len(pts)
    issues: list[str] = []
    warnings: list[str] = []

    lats = [p["lat"] for p in pts]
    lons = [p["lon"] for p in pts]
    zs = [p["z"] for p in pts]
    dems = [z + 2976.22 for z in zs]

    def dist(x0: float, y0: float, x1: float, y1: float) -> float:
        return math.hypot(x1 - x0, y1 - y0)

    cum = [0.0]
    for i in range(1, n):
        cum.append(cum[-1] + dist(pts[i - 1]["x"], pts[i - 1]["y"], pts[i]["x"], pts[i]["y"]))

    # 1) duplicates / degenerate segments
    degenerates = [i for i in range(1, n)
                   if dist(pts[i - 1]["x"], pts[i - 1]["y"], pts[i]["x"], pts[i]["y"]) < 1e-3]
    if degenerates:
        issues.append(f"重合/退化段（段距<1e-3m）: {degenerates[:20]}")
    else:
        warnings.append("无重合段 — OK")

    # 2) distance monotonic
    mono_bad = [i for i in range(1, n) if cum[i] <= cum[i - 1]]
    if mono_bad:
        issues.append(f"累积距离非严格单调: {mono_bad[:20]}")
    else:
        warnings.append("距离严格单调 — OK")

    # 3) elevation continuity
    seg_dz = [zs[i] - zs[i - 1] for i in range(1, n)]
    big = [(i + 1, round(dz, 1)) for i, dz in enumerate(seg_dz) if abs(dz) > 120.0]
    if big:
        warnings.append(f"{len(big)} 段单段落差>120m: {sorted(big)[:12]}")

    window_grade: list[tuple[int, float]] = []
    for i in range(40, n):
        if cum[i] - cum[i - 40] > 0:
            perc = (zs[i] - zs[i - 40]) / (cum[i] - cum[i - 40])
            if perc > 0.60:
                window_grade.append((i, round(perc, 2)))
    if window_grade:
        warnings.append(f"40 窗平均坡度>0.6（{len(window_grade)} 处）: {sorted(window_grade)[:12]}")

    # 4) waypoint projection onto polyline (world x/y)
    def project_on(px: float, py: float) -> tuple[float, float]:
        best_i, best_t, best_d = -1, 0.0, float("inf")
        for i in range(n - 1):
            x0, y0 = pts[i]["x"], pts[i]["y"]
            x1, y1 = pts[i + 1]["x"], pts[i + 1]["y"]
            dx, dy = x1 - x0, y1 - y0
            l2 = dx * dx + dy * dy
            t = 0.0 if l2 == 0 else max(0.0, min(1.0, ((px - x0) * dx + (py - y0) * dy) / l2))
            cx, cy = x0 + dx * t, y0 + dy * t
            dd = math.hypot(px - cx, py - cy)
            if dd < best_d:
                best_i, best_t, best_d = i, t, dd
        dist_m = cum[best_i] + best_t * (cum[best_i + 1] - cum[best_i])
        return dist_m, best_d

    wp_rows = [(w["id"], w["label"],
                round(project_on(w["world"][0], w["world"][1])[0], 1),
                round(project_on(w["world"][0], w["world"][1])[1], 1))
               for w in wps]

    rng_lat = (min(lats), max(lats))
    rng_lon = (min(lons), max(lons))

    lines = [
        "# Everest RouteIndex — 数据完整性审计（自动生成）",
        "",
        "> 生成命令：`python3 scripts/audit_route.py` · 数据：`miniprogram/data/routes/everest/south-col.json` "
        f"（{n} 控制点）",
        "",
        "## 1. 总览",
        "",
        f"- 控制点：**{n}**；lat ∈ [{rng_lat[0]:.6f}, {rng_lat[1]:.6f}]；lon ∈ [{rng_lon[0]:.6f}, {rng_lon[1]:.6f}]",
        f"- DEM：min {min(dems):.1f} m → max {max(dems):.1f} m",
        f"- 世界折线水平总长：{cum[-1]:.0f} m ≈ {cum[-1] / 1000:.1f} km",
        f"- 终点 (lat/lon): {pts[-1]['lat']:.6f}, {pts[-1]['lon']:.6f}（summit 期望 ~27.9881, 86.9250）",
        f"- 采样间距：max {max(cum[i] - cum[i - 1] for i in range(1, n)):.0f} m · "
        f"mean {cum[-1] / (n - 1):.0f} m",
        "",
        "## 2. 单调性 / 重复 / 退化",
        "",
    ]
    for issue in issues or ["（无硬问题）"]:
        lines.append(f"- ⚠ {issue}")
    for wmsg in warnings:
        lines.append(f"- ✓ {wmsg}")
    lines += [
        "",
        "## 3. 高差 / 坡度统计",
        "",
        f"- 单段最大上升：{max(seg_dz):.1f} m",
        f"- 单段最大下降：{min(seg_dz):.1f} m",
    ]
    if big:
        lines.append(f"- >120m 高差段：{len(big)} 处，前 12：{big[:12]}")
    if window_grade:
        lines.append(f"- 40 点窗平均坡度>0.6：{len(window_grade)} 处")
    lines += [
        "",
        "## 4. Waypoint 折线投影",
        "",
        "| id | label | chainage (m) | cross-track (m) |",
        "| --- | --- | ---: | ---: |",
    ]
    for wid, label, dm, cross in wp_rows:
        lines.append(f"| {wid} | {label} | {dm} | {cross} |")
    lines += [
        "",
        "## 5. 结论",
        "",
        f"- 硬问题（距离不单调 / 重合段）：**{len(issues)}**",
        "- 本报告只标记，不修改 RouteIndex 生成源；发现异常应先追踪生成 pipeline。",
        "",
    ]
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(OUT)
    print("\n".join(lines))
    return 0 if not issues else 1


if __name__ == "__main__":
    sys.exit(main())
