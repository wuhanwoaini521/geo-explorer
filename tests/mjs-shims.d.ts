/**
 * Gate 3.1 test shims —— 让 tests 能以严格 TS 导入 scripts/*.mjs 校验器。
 * 校验器本身是 Node ESM 脚本（不参与 tsc 编译），此处仅声明为 any 以便类型检查通过。
 */
declare module "*.mjs";