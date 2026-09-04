/**
 * 中央配置（设计文档 §24：「配置集中管理」）。
 * 替换正式 AppID / API 地址时只改这一个文件，业务代码不做散落配置。
 */

export const CONFIG = {
 /** 小程序 AppID（占位：游客模式） */
 appid: "touristappid",
 /** 运行环境 */
 env: "development" as "development" | "production",
 api: {
  /** 后端 API 基地址；MVP 阶段使用本地 Mock 数据，保持为空 */
  baseUrl: "",
  timeoutMs: 10000,
 },
 /** 离线 / Mock 数据开关（MVP 阶段固定为 true） */
 useMockData: true,
 /** 版本信息 */
 version: "0.1.0",
 aboutText: "Geo Explorer 地理探索 · MVP",
} as const;

export type AppConfig = typeof CONFIG;
