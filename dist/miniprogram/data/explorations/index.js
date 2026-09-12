"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EXPLORATIONS = void 0;
exports.getExplorationById = getExplorationById;
const everest_1 = require("./everest");
const mariana_1 = require("./mariana");
const fuji_1 = require("./fuji");
const colorado_1 = require("./colorado");
exports.EXPLORATIONS = [everest_1.EVEREST, mariana_1.MARIANA, fuji_1.FUJI, colorado_1.COLORADO];
function getExplorationById(id) {
    return exports.EXPLORATIONS.find((x) => x.id === id);
}
