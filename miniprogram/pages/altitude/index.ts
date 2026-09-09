import { getExplorationById } from "../../data/explorations/index";
import { EVEREST_EXPEDITION } from "../../data/expeditions/everest";
import { pressureAt, pressureRatioAt, temperatureAt } from "../../engine/exploration-engine";
import { formatTemperature } from "../../utils/format";

type MetricKey = "elevation" | "pressure" | "oxygen" | "temperature";
interface MetricPoint { x: number; y: number; label: string; value: string }
interface MetricSegment { x: number; y: number; width: number; rotate: number }

const EXP = getExplorationById("everest")!;
const TABS = [
  {key: "elevation", label: "海拔"},
  {key: "pressure", label: "气压"},
  {key: "oxygen", label: "氧气"},
  {key: "temperature", label: "温度"},
];

function metricValue(m: (typeof EVEREST_EXPEDITION.routeIndex.milestones)[number], key: MetricKey): number {
  if (key === "elevation") return m.refM;
  if (key === "pressure") return pressureAt(EXP, m.refM);
  if (key === "oxygen") return pressureRatioAt(m.refM);
  return temperatureAt(EXP, m.refM);
}

function metricText(value: number, key: MetricKey): string {
  if (key === "elevation") return Math.round(value).toLocaleString();
  if (key === "pressure") return `${(value / 10).toFixed(1)} kPa`;
  if (key === "oxygen") return `${Math.round(value * 100)}%`;
  return formatTemperature(value);
}

function chart(key: MetricKey): { points: MetricPoint[]; segments: MetricSegment[]; min: string; max: string } {
  const source = EVEREST_EXPEDITION.routeIndex.milestones.filter((m) => m.id !== "south-summit");
  const values = source.map((m) => metricValue(m, key));
  const lo = Math.min(...values); const hi = Math.max(...values); const span = Math.max(1, hi - lo);
  const points = values.map((value, i) => ({
    x: 8 + i * (84 / Math.max(1, values.length - 1)),
    y: key === "elevation" ? 78 - (value / 9000) * 60 : 78 - ((value - lo) / span) * 60,
    label: source[i].id === "base-camp" ? "大本营" : source[i].id === "summit" ? "顶峰" : source[i].name.replace("营地", ""),
    value: metricText(value, key),
  }));
  const segments: MetricSegment[] = points.slice(0, -1).map((p, i) => {
    const n = points[i + 1]; const dx = n.x - p.x; const dy = n.y - p.y;
    return { x: (p.x + n.x) / 2, y: (p.y + n.y) / 2, width: Math.hypot(dx, dy), rotate: Math.atan2(dy, dx) * 180 / Math.PI };
  });
  return { points, segments, min: key === "elevation" ? "0" : metricText(lo, key), max: key === "elevation" ? "9,000" : metricText(hi, key) };
}

Page({
  data: { tabs: TABS, active: "elevation" as MetricKey, chart: chart("elevation") },
  onMetricTap(e: PageEvent) {
    const key = String(e.currentTarget?.dataset?.key || "elevation") as MetricKey;
    this.setData({ active: key, chart: chart(key) });
  },
  onBack() { wx.navigateBack({ delta: 1 }); },
});
