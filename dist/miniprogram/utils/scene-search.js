"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sceneMatches = sceneMatches;
exports.filterScenes = filterScenes;
exports.sceneTypeMatches = sceneTypeMatches;
const ALIASES = {
    everest: ["珠峰", "珠穆朗玛", "珠穆朗玛峰", "everest"],
    mariana: ["马里亚纳", "海沟", "mariana"],
    "p-colorado": ["大峡谷", "峡谷", "colorado"],
    "p-fuji": ["富士", "火山", "fuji"],
};
function sceneMatches(scene, query) {
    var _a;
    const needle = query.trim().toLocaleLowerCase();
    if (!needle)
        return true;
    const haystack = [scene.id, scene.title, scene.subtitle, ...scene.tags, ...((_a = ALIASES[scene.id]) !== null && _a !== void 0 ? _a : [])]
        .join(" ")
        .toLocaleLowerCase();
    return haystack.includes(needle);
}
function filterScenes(scenes, query) {
    return scenes.filter((scene) => sceneMatches(scene, query));
}
function sceneTypeMatches(type, sceneTags) {
    return type === "all" || sceneTags.includes(type);
}
