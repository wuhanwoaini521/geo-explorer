/**
 * 微信小程序运行时最小 TS 声明（仅声明本项目用到的 API 子集 + ThisType 帮助）。
 * 未引入第三方类型包，保持零网络依赖；后续可替换为官方 miniprogram-api-typings。
 */

/** 任意对象 */
type AnyObject = Record<string, unknown>;

/** 页面/组件实例的运行时形态（框架胶水，宽松类型） */
interface WxInstance {
  data: Record<string, unknown>;
  setData(data: AnyObject, callback?: () => void): void;
  triggerEvent?(name: string, detail?: unknown, options?: unknown): void;
}

/* ---------- 框架入口 ---------- */

/**
 * Page 选项：单泛型方案 —— 泛型 T 覆盖整个页面字面量，
 * ThisType 使每个方法里的 this 类型 = PageInstance<T>（含自定义方法/状态 + data/setData）。
 * 注意：不要加 [key: string] 索引签名，否则自定义方法会被索引签名兜住，this 退化为 unknown。
 */
declare function Page<T extends AnyObject = AnyObject>(
  options: ThisType<PageInstance<T>> & T,
): void;

/** 页面实例：自身方法与状态 ∪ { data, setData } */
type PageInstance<T extends AnyObject = AnyObject> = T & WxInstance;

/** 组件方法 this 上下文：组件必有 triggerEvent */
interface ComponentContext extends WxInstance {
  triggerEvent(name: string, detail?: unknown, options?: unknown): void;
}

/** Component 泛型：this 识别为 ComponentContext（含方法的字段由具体组件补充） */
type ComponentOptions<T extends AnyObject = AnyObject> =
  ThisType<ComponentContext> & {
    properties?: Record<string, unknown>;
    data?: Record<string, unknown>;
    methods?: T;
    observers?: Record<
      string,
      (this: ComponentContext, value: unknown) => void
    >;
    lifetimes?: Record<
      string,
      (this: ComponentContext, ...args: unknown[]) => unknown
    >;
  };

declare function Component<T extends AnyObject = AnyObject>(
  options: ComponentOptions<T>,
): void;

declare function App(
  options: ThisType<{ globalData: Record<string, unknown> }> & AppOptions,
): void;

interface AppOptions {
  globalData?: Record<string, unknown>;
  onLaunch?: () => void;
}

declare function getApp<T = { globalData: Record<string, unknown> }>(): T;

/* ---------- 事件对象（本项目用到的子集） ---------- */

interface PageEvent {
  target?: { dataset?: Record<string, unknown>; id?: string };
  currentTarget?: { dataset?: Record<string, unknown>; id?: string };
  touches?: Array<{ clientX: number; clientY: number }>;
  changedTouches?: Array<{ clientX: number; clientY: number }>;
  detail?: Record<string, unknown> & { value?: unknown; index?: number };
}

/* ---------- 定时器（wx 运行时提供） ---------- */
declare function setInterval(handler: () => void, timeout?: number): number;
declare function clearInterval(handle: number): void;
declare function setTimeout(handler: () => void, timeout?: number): number;
declare function clearTimeout(handle: number): void;

/* ---------- wx API（本项目实际使用的子集） ---------- */

declare interface WxApi {
  navigateTo(opts: {
    url: string;
    success?: () => void;
    fail?: (e: unknown) => void;
  }): void;
  switchTab(opts: { url: string }): void;
  redirectTo(opts: { url: string }): void;
  navigateBack(opts?: { delta?: number }): void;
  setStorageSync(key: string, data: unknown): void;
  getStorageSync<T = unknown>(key: string): T;
  removeStorageSync(key: string): void;
  clearStorageSync(): void;
  showToast(opts: {
    title: string;
    icon?: "success" | "error" | "loading" | "none";
    duration?: number;
    mask?: boolean;
  }): void;
  showLoading(opts: { title: string; mask?: boolean }): void;
  hideLoading(): void;
  showModal(opts: {
    title: string;
    content: string;
    showCancel?: boolean;
    confirmText?: string;
    cancelText?: string;
    success?: (res: { confirm: boolean; cancel: boolean }) => void;
  }): void;
  setNavigationBarTitle(opts: { title: string }): void;
  getSystemInfoSync(): {
    platform: string;
    screenWidth: number;
    screenHeight: number;
    windowWidth: number;
    windowHeight: number;
    pixelRatio: number;
  };
  getStorageInfoSync(): {
    keys: string[];
    currentSize: number;
    limitSize: number;
  };
}
declare const wx: WxApi;
