"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHeaderTopOffset = getHeaderTopOffset;
/** Native mini-program header offset, aligned below the status bar and capsule. */
function getHeaderTopOffset() {
    var _a, _b, _c;
    const runtime = wx;
    const statusBarHeight = (_b = (_a = runtime.getSystemInfoSync) === null || _a === void 0 ? void 0 : _a.call(runtime).statusBarHeight) !== null && _b !== void 0 ? _b : 20;
    const capsuleBottom = (_c = runtime.getMenuButtonBoundingClientRect) === null || _c === void 0 ? void 0 : _c.call(runtime).bottom;
    return Math.ceil(Math.max(statusBarHeight + 12, (capsuleBottom !== null && capsuleBottom !== void 0 ? capsuleBottom : statusBarHeight + 32) + 10));
}
