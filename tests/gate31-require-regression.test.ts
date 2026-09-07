/**
 * Gate 3.1 regression —— 禁止目录级 import / require，且禁止把 .json 当运行时模块。
 *
 * 背景：微信小程序 AppService module loader 不做 Node 式目录 index resolution，
 * 且 require("./x.json") 会被追加 .js 变成寻找 x.json.js。
 * Gate 3 的两处运行时异常：
 *   - pages/exploration 用了 `import ... from "../../data/expeditions"`（裸目录）
 *   - data/routes/everest/index.ts 用了 `import x from "./south-col.json"`
 * 二者都导致真实运行时 `module 'data/...' is not defined`。
 *
 * 本测试保证不复发：
 *  1. 源文件层面：所有相对 import 不得「指向带 index 的目录却未写 /index」，
 *     也不得 import .json（运行时须用编译成 .js 的 .ts 模块承载数据）。
 *  2. 编译产物层面：若 dist/miniprogram 已生成，其所有 .js 的相对 require
 *     必须能直接解析为存在的一个 .js 文件（显式 /index(.js)），禁止裸目录 / .json。
 */
import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { existsSync } from "node:fs";
import { scanDirImports } from "../scripts/check-dir-imports.mjs";
import { checkDistRequires } from "../scripts/check-requires.mjs";
import { SOUTH_COL_ROUTE } from "../miniprogram/data/routes/everest/index";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("Gate 3.1: 无目录级 import（源文件）", () => {
  it("相对 import 禁止「目录带 index 却未写 /index」，也禁止 import .json", () => {
    const roots = ["miniprogram", "tests", "scripts", "tools"]
      .map((d) => join(repoRoot, d))
      .filter(existsSync);
    const { ok, issues } = scanDirImports(roots);
    expect(
      issues.map(
        (i: { file: string; spec: string }) => `${i.file} → "${i.spec}"`,
      ),
      "发现依赖 Node 目录 index resolution 或 .json 的 import",
    ).toEqual([]);
    expect(ok).toBe(true);
  });

  it("路线几何数据以 .ts 模块（south-col，编译为 .js）对外可消费", () => {
    const milestones = (SOUTH_COL_ROUTE as { milestones: Array<{ id: string }> })
      .milestones;
    const ids = milestones.map((m) => m.id);
    expect(ids.length).toBeGreaterThan(5);
    expect(ids).toContain("base-camp");
    expect((SOUTH_COL_ROUTE as { points: unknown[] }).points.length).toBeGreaterThan(100);
  });
});

describe("Gate 3.1: 编译产物 require 可解析（dist）", () => {
  it("dist/miniprogram 下所有相对 require 均解析到显式 .js 文件", () => {
    const distRoot = join(repoRoot, "dist", "miniprogram");
    const { ok, issues, skipped, fileCount } = checkDistRequires(distRoot);
    // dist 若尚未 build 则跳过（build 脚本已串行执行同一检查）；
    // 一旦存在就必须 100% 通过。
    if (!skipped) {
      expect(
        issues.map(
          (i: { file: string; require: string }) =>
            `${i.file} → require("${i.require}")`,
        ),
        "编译产物存在目录级 / .json 的 require，微信 module loader 无法解析",
      ).toEqual([]);
      expect(ok).toBe(true);
      expect(fileCount, "dist 为空？").toBeGreaterThan(0);
    }
  });
});