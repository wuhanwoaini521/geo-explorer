/**
 * 格式化纯函数测试（Node / vitest）。
 */
import { describe, expect, it } from "vitest";
import {
  clamp,
  formatElevation,
  formatNumber,
  formatPercent,
  formatTemperature,
  progressPercent,
} from "../miniprogram/utils/format";

describe("formatNumber", () => {
  it("千分位", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("保留小数位", () => {
    expect(formatNumber(8848.86, 2)).toBe("8,848.86");
    expect(formatNumber(1234.5, 1)).toBe("1,234.5");
  });

  it("负值与小值", () => {
    expect(formatNumber(-12)).toBe("-12");
    expect(formatNumber(5)).toBe("5");
  });
});

describe("formatElevation", () => {
  it("米制单位与千分位", () => {
    expect(formatElevation(8848.86)).toBe("8,848.9 m");
    expect(formatElevation(500)).toBe("500 m");
  });

  it(">=10000 自动转 km", () => {
    expect(formatElevation(12000)).toBe("12 km");
  });
});

describe("formatTemperature", () => {
  it("整数不加小数，否则保留一位", () => {
    expect(formatTemperature(26)).toBe("26°C");
    expect(formatTemperature(-30)).toBe("-30°C");
    expect(formatTemperature(6.5)).toBe("6.5°C");
  });
});

describe("formatPercent", () => {
  it("0-1 → 百分比", () => {
    expect(formatPercent(1)).toBe("100%");
    expect(formatPercent(0.331)).toBe("33.1%");
  });
});

describe("progressPercent", () => {
  it("0-100 整数且钳制", () => {
    expect(progressPercent(0, 0, 100)).toBe(0);
    expect(progressPercent(50, 0, 100)).toBe(50);
    expect(progressPercent(100, 0, 100)).toBe(100);
    expect(progressPercent(-5, 0, 100)).toBe(0);
    expect(progressPercent(500, 0, 100)).toBe(100);
  });
});

describe("clamp", () => {
  it("钳制与 NaN 回退", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(NaN, 0, 10)).toBe(0);
  });
});
