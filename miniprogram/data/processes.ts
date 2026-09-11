/**
 * 地貌课堂的渐进过程数据。
 * 每个过程保持同一个视觉空间，只改变当前阶段，避免把教学做成互不相关的 PPT 页面。
 */
import type { DataSource } from "../types/models";

export interface ProcessStep {
  id: string;
  label: string;
  title: string;
  explanation: string;
  visual: string;
}

export interface KnowledgeProcess {
  id: string;
  topicId: string;
  kicker: string;
  title: string;
  question: string;
  summary: string;
  steps: ProcessStep[];
  source: DataSource;
}

const NOAA: DataSource = {
  name: "USGS / NOAA 公共地学资料",
  url: "https://www.usgs.gov/programs/earthquake-hazards/plate-tectonics",
  verifiedAt: "2025-01-10",
  approximate: false,
};

export const KNOWLEDGE_PROCESSES: KnowledgeProcess[] = [
  {
    id: "mountain-formation",
    topicId: "k03",
    kicker: "地质成因 · 山脉",
    title: "山脉为什么会不断升高？",
    question: "从海洋沉积到世界屋脊，抬升与侵蚀如何同时塑造山脉？",
    summary: "板块碰撞提供抬升力量，风化与河流侵蚀则持续重塑山脊。",
    steps: [
      { id: "sediment", label: "01", title: "海底沉积", explanation: "古海洋中的泥沙与生物碎屑，先沉积成一层层岩石。", visual: "🌊  ·  ─────" },
      { id: "collision", label: "02", title: "板块接近", explanation: "印度板块向北移动，逐渐靠近欧亚板块，沉积岩层开始受挤压。", visual: "◀  板块  ▶" },
      { id: "uplift", label: "03", title: "岩层抬升", explanation: "碰撞让地壳褶皱、加厚并抬升，形成高原与山脉。", visual: "╱╲  ╱╲  ╱╲" },
      { id: "erosion", label: "04", title: "侵蚀塑形", explanation: "冰川、河流和风把山体削低，也刻出尖峰、山谷和雪脊。", visual: "▲  ·  ╲  ≋" },
    ],
    source: NOAA,
  },
  {
    id: "glacier-formation",
    topicId: "k08",
    kicker: "冰川地貌 · 冰",
    title: "雪是怎样变成冰川的？",
    question: "为什么一场降雪，经过多年会变成能流动的巨大冰体？",
    summary: "积雪在无法融尽的地方逐年压实，最终形成会缓慢流动的冰川。",
    steps: [
      { id: "snow", label: "01", title: "新雪堆积", explanation: "冬季降雪超过夏季融化量，雪层开始逐年加厚。", visual: "❄ ❄ ❄  ·  白雪" },
      { id: "firn", label: "02", title: "粒雪压实", explanation: "上层重量压迫下层，雪粒失去空气，变成致密的粒雪。", visual: "❄  →  ◌◌◌" },
      { id: "ice", label: "03", title: "形成冰体", explanation: "持续压实让粒雪变成蓝色冰体，内部气泡越来越少。", visual: "◌◌  →  ▰▰" },
      { id: "flow", label: "04", title: "冰川流动", explanation: "巨大自重让冰体像黏稠流体一样向低处缓慢移动。", visual: "▰▰▰  ↓  ≋" },
    ],
    source: NOAA,
  },
  {
    id: "trench-formation",
    topicId: "k11",
    kicker: "海洋地质 · 海沟",
    title: "海沟为什么会这么深？",
    question: "海洋板块如何把海底拉进地幔，形成地球最深的凹陷？",
    summary: "冷而密的海洋板块在俯冲带下沉，板块边界因此形成狭长海沟。",
    steps: [
      { id: "ocean-crust", label: "01", title: "海洋板块生成", explanation: "洋中脊不断生成新的海洋地壳，板块向两侧扩张。", visual: "←  新海底  →" },
      { id: "cooling", label: "02", title: "板块冷却变密", explanation: "海洋板块离开洋中脊后冷却收缩，密度逐渐增加。", visual: "热  →  冷  →  密" },
      { id: "subduction", label: "03", title: "发生俯冲", explanation: "更密的板块在汇聚边界弯曲下沉，海底被拉出深槽。", visual: "→  ╲  ↓" },
      { id: "trench", label: "04", title: "海沟形成", explanation: "俯冲带持续活动，形成马里亚纳海沟这样的深海地貌。", visual: "海面  ╲___╱  深渊" },
    ],
    source: NOAA,
  },
  {
    id: "canyon-erosion",
    topicId: "k06",
    kicker: "流水地貌 · 峡谷",
    title: "峡谷是怎样被河流切出来的？",
    question: "为什么一条河流能在岩石高原上留下数百万年的剖面？",
    summary: "高原抬升提供落差，流水携带砂砾持续下切，地层便逐层显露。",
    steps: [
      { id: "plateau", label: "01", title: "高原抬升", explanation: "地壳抬升让河流获得更大的落差和下切动力。", visual: "────────  高原" },
      { id: "cut", label: "02", title: "河流下切", explanation: "水流和砂砾像锯子一样磨蚀河床，切出狭窄的 V 形谷。", visual: "───╲  ≋  ╱───" },
      { id: "layers", label: "03", title: "岩层暴露", explanation: "河谷加深，原本埋在地下的不同岩层逐渐暴露出来。", visual: "═╦═╦═╦═" },
      { id: "canyon", label: "04", title: "峡谷展开", explanation: "侧向崩塌与支流加入，峡谷形成宽阔、层次分明的地貌。", visual: "╲  ≋≋≋  ╱" },
    ],
    source: NOAA,
  },
  {
    id: "volcano-formation",
    topicId: "k25",
    kicker: "火山地貌 · 岩浆",
    title: "火山为什么会喷发？",
    question: "地下的岩浆、气体和压力，如何把火山锥一点点建起来？",
    summary: "岩浆上升时压力下降，溶解气体膨胀，最终沿通道喷出地表。",
    steps: [
      { id: "magma", label: "01", title: "岩浆形成", explanation: "地幔局部熔融，产生密度较小的岩浆。", visual: "地幔  ·  ◉" },
      { id: "rise", label: "02", title: "岩浆上升", explanation: "岩浆沿裂隙和通道上升，在地壳中聚集。", visual: "◉  ↑  │  ↑" },
      { id: "pressure", label: "03", title: "压力增加", explanation: "岩浆中的水汽与二氧化碳在浅部膨胀，推动压力上升。", visual: "│  ↑↑  ╱╲" },
      { id: "eruption", label: "04", title: "喷发与堆积", explanation: "熔岩和火山灰反复堆积，塑造出不同形态的火山。", visual: "╱╲  ✦  ╱╲" },
    ],
    source: NOAA,
  },
  {
    id: "karst-formation",
    topicId: "k14",
    kicker: "喀斯特 · 地下水",
    title: "洞穴和钟乳石怎么来的？",
    question: "一滴含二氧化碳的雨水，怎样在石灰岩中开出地下世界？",
    summary: "弱酸性雨水溶蚀石灰岩，地下水通道扩大后，碳酸钙再沉积成钟乳石。",
    steps: [
      { id: "rain", label: "01", title: "雨水入土", explanation: "雨水吸收土壤中的二氧化碳，形成弱酸性溶液。", visual: "☁  ↓  ·  雨水" },
      { id: "dissolve", label: "02", title: "溶蚀裂隙", explanation: "酸性水沿石灰岩裂隙流动，把裂隙一点点溶解扩大。", visual: "────╲  ·  ╱────" },
      { id: "cave", label: "03", title: "洞穴贯通", explanation: "地下水通道相互连接，形成洞穴、落水洞和地下河。", visual: "地表  ╲___╱  河" },
      { id: "deposit", label: "04", title: "滴水沉积", explanation: "水滴失去二氧化碳，碳酸钙从洞顶沉积，钟乳石逐渐生长。", visual: "╲│╱  ↓  ╲│╱" },
    ],
    source: NOAA,
  },
];

export function getKnowledgeProcess(id: string): KnowledgeProcess | undefined {
  return KNOWLEDGE_PROCESSES.find((process) => process.id === id);
}

export function processForTopic(topicId: string): KnowledgeProcess | undefined {
  return KNOWLEDGE_PROCESSES.find((process) => process.topicId === topicId);
}
