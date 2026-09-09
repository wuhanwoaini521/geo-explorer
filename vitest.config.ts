import { defineConfig } from "vitest/config";

/*
 * Gate 3.4 Phase 2 audit — Vitest harness race fix.
 *
 * 现象：全量并行（threads/forks 均会）偶发
 *   「Unhandled Error: UNKNOWN: unknown error, open <OS-Temp>/…/ssr/…」
 *   （Vitest 把工作区临时目录 + SSR 模块缓存放在 os.tmpdir() 下），
 *   多 worker 并行写同一临时目录 → 偶发 write 失败；极少 run 还会因此
 *   漏跑一整个 test file（假阴：348→309）。
 *
 * 处置：使用 Vitest 原生的「文件串行」能力（fileParallelism:false）——
 *   这是审计文档认可的方式（“使用现有 Vitest 能力降低测试文件并发”）。
 *   同一时刻只有一个测试文件做 transform/run，杜绝与共享临时目录的
 *   并行写冲突；代价仅是 5s→~20s，换来确定性（348 全绿 + 0 unhandled）。
 * 生产代码不受影响（问题发生在 harness 自身 transform 缓存层）。
 */
export default defineConfig({
   test: {
      include: ["tests/**/*.test.ts"],
      environment: "node",
      fileParallelism: false,
   },
});
