/** 探索场景注册表：新增场景只需在此登记数据文件（富士山/撒哈拉/马里亚纳…）。 */
import type { Exploration } from "../../types/exploration";
import { EVEREST } from "./everest";
import { MARIANA } from "./mariana";

export const EXPLORATIONS: Exploration[] = [EVEREST, MARIANA];

export function getExplorationById(id: string): Exploration | undefined {
  return EXPLORATIONS.find((x) => x.id === id);
}
