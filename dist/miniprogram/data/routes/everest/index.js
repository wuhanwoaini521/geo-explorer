"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SOUTH_COL_ROUTE = void 0;
/**
 * 南坡大本营 → 珠峰峰顶（Everest South Col 经典登顶路线）真实几何。
 *
 * 数据源（原始文件，未做任何距离计算）：
 *   - design/world/everest-3d/route/route-control-points.json（289 控制点）
 *   - design/world/everest-3d/route/waypoints.json（8 里程碑）
 * 由 scripts/routes/sync-everest-route.mjs 同步为运行时模块 south-col.ts
 * （同时产出 south-col.json 供阅读，二者同源同形）。
 *
 * 注意：微信小程序运行时不能 require(.json) 作为模块（module loader 会把
 * `require("./south-col.json")` 解析成寻找 `south-col.json.js`）。
 * 因此运行时数据走 .ts → 编译为 .js 的模块，禁止直接 import .json。
 *
 * 坐标约定：+X 东、+Y 南、+Z 上；z 为局部相对高度，绝对 DEM = z + terrain.baseM。
 * 运行时「距离/进度」全部由 engine/route-index.ts 的 buildRouteIndex() 计算，
 * 本文件只负责类型强化的导出。
 */
const south_col_1 = require("./south-col");
Object.defineProperty(exports, "SOUTH_COL_ROUTE", { enumerable: true, get: function () { return south_col_1.SOUTH_COL_ROUTE; } });
