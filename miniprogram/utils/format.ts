/**
 * 通用格式化与数值辅助（纯函数，可单测，无 wx 依赖）。
 */

/** 将数值钳制到 [min, max]。 */
export function clamp(value: number, min: number, max: number): number {
 if (Number.isNaN(value)) return min;
 return Math.min(max, Math.max(min, value));
}

/** 千分位格式化：123456.7 -> "123,456.7" */
export function formatNumber(value: number, digits = 0): string {
 const fixed = value.toFixed(digits);
 const [int, frac] = fixed.split(".");
 const withSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
 return frac === undefined ? withSep : `${withSep}.${frac}`;
}

/** 以米为单位的海拔 → 人性化字符串，如 8848.86 -> "8,848.86 m"；≥10000 自动转 km 显示。 */
export function formatElevation(meters: number): string {
 if (meters >= 10000) {
  return `${stripDotZero(formatNumber(meters / 1000, 1))} km`;
 }
 return `${stripDotZero(formatNumber(meters, meters >= 1000 ? 1 : 0))} m`;
}

/** 温度 → 字符串，如 -12 -> "-12°C" */
export function formatTemperature(celsius: number): string {
 return `${celsius.toFixed(celsius % 1 === 0 ? 0 : 1)}°C`;
}

/** 0-1 比值 → 百分比，如 0.331 -> "33.1%" */
export function formatPercent(ratio: number, digits = 1): string {
 return `${stripDotZero(formatNumber(ratio * 100, digits))}%`;
}

/** 去掉格式化结果末尾的 ".0"（如 "12.0" -> "12"），避免整数也带小数点。 */
function stripDotZero(s: string): string {
 return s.includes(".") && s.endsWith(".0") ? s.slice(0, -2) : s;
}

/** 海拔 → “当前海拔 / 总海拔” 进度百分比（0-100 整数） */
export function progressPercent(
 elevation: number,
 start: number,
 max: number,
): number {
 return Math.round(
  clamp((elevation - start) / Math.max(1, max - start), 0, 1) * 100,
 );
}
