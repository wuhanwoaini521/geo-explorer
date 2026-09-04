import { CONFIG } from "./config/index";

App({
  globalData: {
    config: CONFIG,
    /** 本次运行已完成的探索（轻量缓存） */
    lastSummary: null as unknown | null,
  },
  onLaunch() {
    // MVP 阶段：无需登录/授权。预留获取用户信息或启动参数的位置。
  },
});
