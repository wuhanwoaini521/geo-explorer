import type { PlaceType } from "../types/models";

export interface SearchableScene {
  id: string;
  title: string;
  subtitle: string;
  tags: string[];
}

const ALIASES: Record<string, string[]> = {
  everest: ["珠峰", "珠穆朗玛", "珠穆朗玛峰", "everest"],
  mariana: ["马里亚纳", "海沟", "mariana"],
  "p-colorado": ["大峡谷", "峡谷", "colorado"],
  "p-fuji": ["富士", "火山", "fuji"],
};

export function sceneMatches(scene: SearchableScene, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return true;
  const haystack = [scene.id, scene.title, scene.subtitle, ...scene.tags, ...(ALIASES[scene.id] ?? [])]
    .join(" ")
    .toLocaleLowerCase();
  return haystack.includes(needle);
}

export function filterScenes<T extends SearchableScene>(scenes: T[], query: string): T[] {
  return scenes.filter((scene) => sceneMatches(scene, query));
}

export function sceneTypeMatches(type: PlaceType | "all", sceneTags: string[]): boolean {
  return type === "all" || sceneTags.includes(type);
}
