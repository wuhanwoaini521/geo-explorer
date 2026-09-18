"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVEREST_LIVE_CALIBRATIONS = void 0;
exports.calibrationForScene = calibrationForScene;
const live_a_calibration_1 = require("./live-a-calibration");
/** 全部已同步校准（key = LIVE scene id） */
exports.EVEREST_LIVE_CALIBRATIONS = {
    "live-a": live_a_calibration_1.CALIBRATION,
};
/** 取某 LIVE 场景的校准（未校准/无校准 → null，调用方据此降级） */
function calibrationForScene(sceneId) {
    var _a;
    return (_a = exports.EVEREST_LIVE_CALIBRATIONS[sceneId]) !== null && _a !== void 0 ? _a : null;
}
