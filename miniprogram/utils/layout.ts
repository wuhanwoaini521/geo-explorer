/** Native mini-program header offset, aligned below the status bar and capsule. */
export function getHeaderTopOffset(): number {
  const runtime = wx as unknown as {
    getSystemInfoSync?: () => { statusBarHeight?: number };
    getMenuButtonBoundingClientRect?: () => { bottom?: number };
  };
  const statusBarHeight = runtime.getSystemInfoSync?.().statusBarHeight ?? 20;
  const capsuleBottom = runtime.getMenuButtonBoundingClientRect?.().bottom;
  return Math.ceil(Math.max(statusBarHeight + 12, (capsuleBottom ?? statusBarHeight + 32) + 10));
}
