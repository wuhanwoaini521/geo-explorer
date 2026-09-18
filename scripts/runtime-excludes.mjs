// Production build boundary —— 不应该进入微信 runtime 包的主包源码清单。
//
// 这些模块只被 vitest 测试与 scripts/content/* 内容流水线使用，生产页面从不引用它们
// （依据 Gate 1 可达性审计：以 app.json 的 pages + app.ts + custom-tab-bar 为入口做
// import/require/usingComponents 遍历，这些模块全部不可达）。
//
// 它们此前之所以进包，是因为构建链路有两处“无条件”步骤：
//   - tsconfig.build.json 的 include: ["miniprogram/**/*.ts"] 全量编译；
//   - scripts/copy-assets.mjs 无条件复制全部 .json/.png/.jpg/...
// 本清单同时被 copy-assets.mjs 消费，并与 tsconfig.build.json 的 exclude 保持一一对应
// （由 tests/build-boundary.test.ts 断言，避免两处清单漂移）。
//
// 路径相对 miniprogram/。模块被移出本清单前，必须先确认它已被生产入口引用。
//
// 说明：本清单同时包含 .ts 与资源文件。tsconfig.build.json 的 exclude 只列其中的
// .ts 条目（.json 不参与 tsc 编译），tests/build-boundary.test.ts 断言两者一致。
export const RUNTIME_EXCLUDES = [
  // 内容流水线数据：只被 scripts/content/* 读取，不参与运行时渲染
  "data/media/candidates.ts",
  "data/media/runtime-ingest.json",
  // 离线校准/地形投影工具：只被 tests/* 使用
  "engine/calibration-solver.ts",
  "engine/expedition-planner.ts",
  "engine/projection-math.ts",
  "engine/terrain-projection.ts",
  "engine/world-frame.ts",
  // 内容校验器：只被 scripts/content/* 与 tests/* 使用
  "engine/validate-content.ts",
  // 开发者工具工程配置：打包根由顶层 project.config.json 的 miniprogramRoot 指定，
  // 这里的副本只会被打进代码包，不被任何构建步骤读取
  "project.config.json",
  "project.private.config.json",
];
