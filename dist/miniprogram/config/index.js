"use strict";
/**
 * 中央配置（设计文档 §24：「配置集中管理」）。
 * 替换正式 AppID / API 地址时只改这一个文件，业务代码不做散落配置。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = void 0;
const media_remote_base_1 = require("./media-remote-base");
exports.CONFIG = {
    /** 小程序 AppID（占位：游客模式） */
    appid: "touristappid",
    /** 运行环境 */
    env: "development",
    api: {
        /** 后端 API 基地址；MVP 阶段使用本地 Mock 数据，保持为空 */
        baseUrl: "",
        timeoutMs: 10000,
    },
    /**
     * 媒体资源来源（Gate 4 媒体所有权解耦；Gate 4B 起由构建输入注入）。
     *
     * 值来自 ./media-remote-base.ts —— 由 `MEDIA_REMOTE_BASE` 环境变量在 `build:prod`
     * 时写入，或在正式发布前一次性填写。业务代码不直接读取本字段，
     * 统一经 services/media-service.ts 解析。
     *
     * 规则（build:prod 强制）：非空、https:// 开头、以 / 结尾、不含凭证。
     */
    media: {
        remoteBase: media_remote_base_1.MEDIA_REMOTE_BASE,
    },
    /** 离线 / Mock 数据开关（MVP 阶段固定为 true） */
    useMockData: true,
    /** 版本信息 */
    version: "0.1.0",
    aboutText: "Geo Explorer 地理探索 · MVP",
};
