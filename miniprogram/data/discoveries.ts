/**
 * 「你知道吗」地理冷知识卡数据 —— 短、准确、可溯源。
 * 随机展示一条（utils/discovery.ts 提供 shuffle 纯函数）。
 */
import type { DataSource } from "../types/exploration";

export interface Discovery {
  id: string;
  emoji: string;
  /** 一句话事实（卡片正文） */
  fact: string;
  /** 可选补充（详情/来源说明） */
  note?: string;
  source: DataSource;
}

const W = (title: string): DataSource => ({
  name: `Wikipedia — ${title}`,
  url: `https://en.wikipedia.org/wiki/${title.replace(/ /g, "_")}`,
  approximate: true,
});

export const DISCOVERIES: Discovery[] = [
  {
    id: "d-mid-ocean-ridge",
    emoji: "🌊",
    fact: "地球上最长的山脉不在陆地上——全球洋中脊总长约 65,000 km。",
    note: "它像棒球缝线一样环绕地球，大部分深藏在海面之下。",
    source: W("Mid-ocean ridge"),
  },
  {
    id: "d-antarctica-desert",
    emoji: "🐧",
    fact: "按降水量标准，南极洲是地球上最大的荒漠。",
    note: "内陆许多区域年降水不足 50 mm，比撒哈拉更「干」。",
    source: W("Desert"),
  },
  {
    id: "d-baikal-water",
    emoji: "💧",
    fact: "贝加尔湖一湖之水，约占全球液态淡水的五分之一。",
    note: "它是世界最深的湖泊（约 1,642 m），也是最大的淡水湖（按水量）。",
    source: W("Lake Baikal"),
  },
  {
    id: "d-everest-limestone",
    emoji: "🏔️",
    fact: "珠峰峰顶的岩石是约 4 亿年前海底沉积的石灰岩。",
    note: "世界之巅曾经是特提斯洋的海底。",
    source: W("Mount Everest"),
  },
  {
    id: "d-mauna-loa-height",
    emoji: "🌋",
    fact: "从海底山脚量起，冒纳罗亚火山比珠峰「更高」。",
    note: "总高差约 9,170 m——但海拔（相对海平面）只有 4,169 m。",
    source: W("Mauna Loa"),
  },
  {
    id: "d-greenland-rise",
    emoji: "🧊",
    fact: "若格陵兰冰盖全部融化，全球海平面将上升约 7 m。",
    note: "冰盖面积约 180 万 km²，是北半球最大的冰体。",
    source: W("Greenland ice sheet"),
  },
  {
    id: "d-krakatoa-sound",
    emoji: "🔊",
    fact: "1883 年喀拉喀托火山的喷发巨响，传到了约 4,800 km 外。",
    note: "它被认为是有记录以来最响的声音之一，随后一年全球气温明显下降。",
    source: W("1883 eruption of Krakatoa"),
  },
  {
    id: "d-namib-beetle",
    emoji: "🐞",
    fact: "纳米布沙漠的甲虫会倒立「饮雾」取水。",
    note: "那是世界上最古老的沙漠之一，沿海浓雾是生物的重要水源。",
    source: W("Namib"),
  },
  {
    id: "d-sahara-greens",
    emoji: "🌿",
    fact: "撒哈拉并非一直如此干燥——数千年前这里曾有湖泊与草原。",
    note: "史前岩画里的河马与渔夫，记录了「绿色撒哈拉」时期。",
    source: W("African humid period"),
  },
  {
    id: "d-baikal-seal",
    emoji: "🦭",
    fact: "贝加尔湖里生活着世界上唯一一种纯淡水海豹。",
    note: "它们如何从北冰洋来到内陆深湖，仍是演化谜题。",
    source: W("Baikal seal"),
  },
  {
    id: "d-great-wall-space",
    emoji: "🛰️",
    fact: "大堡礁长约 2,300 km，是太空中肉眼可见的少数生命结构之一。",
    note: "它由数十亿珊瑚虫用碳酸钙骨骼世代堆积而成。",
    source: W("Great Barrier Reef"),
  },
  {
    id: "d-depth-pressure",
    emoji: "🤿",
    fact: "在挑战者深渊底部，水压超过 1,000 个大气压。",
    note: "相当于一根手指上站着一头大象的重量（公开科普类比）。",
    source: W("Challenger Deep"),
  },
];
