/** 探索场景注册表：新增场景只需在此登记数据文件。 */
import type { Exploration } from "../../types/exploration";
import { EVEREST } from "./everest";
import { MARIANA } from "./mariana";
import { FUJI } from "./fuji";
import { COLORADO } from "./colorado";

export const EXPLORATIONS: Exploration[] = [EVEREST, MARIANA, FUJI, COLORADO];

export function getExplorationById(id: string): Exploration | undefined {
  return EXPLORATIONS.find((x) => x.id === id);
}
