"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPLORATIONS = void 0;
exports.getExplorationById = getExplorationById;
const everest_1 = require("./everest");
const mariana_1 = require("./mariana");
exports.EXPLORATIONS = [everest_1.EVEREST, mariana_1.MARIANA];
function getExplorationById(id) {
    return exports.EXPLORATIONS.find((x) => x.id === id);
}
