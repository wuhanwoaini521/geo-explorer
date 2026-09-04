/**
 * 🏔️ 攀登珠穆朗玛峰 —— 探索场景数据（MVP 核心 Demo）。
 *
 * 数据真实性：山峰高程、关键点位海拔、植被/雪线/含氧量均为**现有公开资料**的近似值；
 * 每个知识节点带来源字段（source/verifiedAt/approximate），无法确认的数值明确标注近似。
 * 后续新增场景（埃verest>富士山/撒哈拉/马里亚纳…）只需在 explorations/ 增加同型数据文件，
 * 复用同一引擎（explorations/everest.ts → fuji.ts → amazon.ts …）。
 */
import type { DataSource, Exploration } from "../../types/exploration";

const SRC_ZH_2020: DataSource = {
  name: "自然资源部 / 人民日报 · 2020 中尼珠峰高程联合测量",
  url: "https://www.gov.cn/xinwen/2020-12/08/content_5567858.htm",
  verifiedAt: "2025-01-10",
  approximate: false,
};

const SRC_WIKI_EVEREST: DataSource = {
  name: "Wikipedia — Mount Everest",
  url: "https://en.wikipedia.org/wiki/Mount_Everest",
  verifiedAt: "2025-01-10",
  approximate: true,
};

const SRC_CLIMATE: DataSource = {
  name: "通用对流层温度直减率（约 6.5℃/1000m，Standard Atmosphere 近似）",
  url: "https://en.wikipedia.org/wiki/Lapse_rate",
  verifiedAt: "2025-01-10",
  approximate: true,
};

const SRC_O2: DataSource = {
  name: "1953 年 Everest 首次登顶纪实（Wikipedia）／峰顶实测气压约 335hPa（~海平面 1/3）",
  url: "https://en.wikipedia.org/wiki/Mount_Everest",
  verifiedAt: "2025-01-10",
  approximate: true,
};

const SRC_GLACIER: DataSource = {
  name: "Wikipedia — Khumbu Glacier（昆布冰川）",
  url: "https://en.wikipedia.org/wiki/Khumbu_Glacier",
  verifiedAt: "2025-01-10",
  approximate: true,
};

export const EVEREST: Exploration = {
  id: "everest",
  slug: "everest",
  title: "攀登珠穆朗玛峰",
  subtitle: "从山麓到世界之巅 · 海拔 8848.86 m",
  emoji: "🏔️",
  palette: ["#4a6fb0", "#9fc4f0", "#eef7ff"],
  startElevation: 0,
  maxElevation: 8848.86,
  baseTemperatureC: 26,
  lapseRateCPer1000: 6.5,
  seaLevelPressureHpa: 1013.25,
  climateSource: SRC_CLIMATE,
  source: SRC_WIKI_EVEREST,
  stages: [
    {
      id: "southern-foothills",
      elevation: 0,
      name: "山麓低地",
      biome: "亚热带常绿阔叶林",
      emoji: "🌴",
      temperatureC: 26,
      snow: 0,
      fog: 0.15,
      wind: 0.1,
      palette: ["#f7b955", "#fde3ae", "#fff9ec"],
      description: "恒河平原与喜马拉雅南麓，湿热多雨，林密鸟鸣。",
    },
    {
      id: "mid-forest",
      elevation: 1500,
      name: "中低山·混交林",
      biome: "针阔叶混交林",
      emoji: "🌲",
      temperatureC: 16.25,
      snow: 0,
      fog: 0.3,
      wind: 0.15,
      palette: ["#9ec8f7", "#d6ecff", "#fffbea"],
      description: "海拔上升，气温下降，冷杉与桦树替换了热带阔叶林。",
    },
    {
      id: "lukla",
      elevation: 2860,
      name: "卢卡拉",
      biome: "常绿针叶林 · 杜鹃灌丛",
      emoji: "🏡",
      temperatureC: 7.4,
      snow: 0,
      fog: 0.35,
      wind: 0.2,
      palette: ["#8fc4ff", "#c6e2ff", "#f0f9ff"],
      description: "徒步路线起点（卢卡拉机场 2,860m）：杜鹃花开满山坡。",
    },
    {
      id: "namche-tengboche",
      elevation: 3900,
      name: "草甸与灌丛",
      biome: "云杉林 · 高山草甸",
      emoji: "🌿",
      temperatureC: 0.65,
      snow: 0.1,
      fog: 0.4,
      wind: 0.25,
      palette: ["#6aa9f0", "#bedcff", "#eef6ff"],
      description: "树线在此消失，脚下起伏的草甸与灌丛低矮坚韧。",
    },
    {
      id: "oss-high",
      elevation: 5000,
      name: "高山荒漠带",
      biome: "裸岩 · 针叶稀疏",
      emoji: "🪨",
      temperatureC: -6.5,
      snow: 0.25,
      fog: 0.35,
      wind: 0.35,
      palette: ["#5b93e2", "#aecff2", "#e6f3ff"],
      description: "植被趋于归零，裸岩与乱石成为主场，风开始变硬。",
    },
    {
      id: "base-camp",
      elevation: 5364,
      name: "南坡大本营",
      biome: "冰碛 · 永久冻土",
      emoji: "⛺",
      temperatureC: -8.86,
      snow: 0.35,
      fog: 0.35,
      wind: 0.4,
      palette: ["#4f7fd0", "#9fc4e8", "#dff0ff"],
      description: "登山者中转营地（5,364m）：前方冰川雪状告罄。",
    },
    {
      id: "snowline",
      elevation: 5900,
      name: "雪线之上",
      biome: "永久积雪",
      emoji: "❄️",
      temperatureC: -12.3,
      snow: 0.6,
      fog: 0.4,
      wind: 0.5,
      palette: ["#4a6fc0", "#9fc4e8", "#e4f2ff"],
      description: "跨过永久雪线，地表从此常年积雪，再无裸露岩土。",
    },
    {
      id: "khumbu-icefall",
      elevation: 6500,
      name: "昆布冰瀑",
      biome: "冰瀑 · 冰川",
      emoji: "🧊",
      temperatureC: -16.3,
      snow: 0.75,
      fog: 0.45,
      wind: 0.55,
      palette: ["#3a5fb4", "#8cc0e8", "#e0f0ff"],
      description:
        "昆布冰瀑是高原大本营以上真正的第一道险关，冰川在脚下缓慢流动。",
    },
    {
      id: "south-col",
      elevation: 7900,
      name: "南坳",
      biome: "死亡区边缘 · 冰坡",
      emoji: "🛖",
      temperatureC: -25.4,
      snow: 0.85,
      fog: 0.35,
      wind: 0.65,
      palette: ["#2b4a8f", "#86b4e4", "#d8ebff"],
      description:
        "超过 8,000m 即进入“死亡区”，氧含量剩海平面约 1/3，每一口呼吸都在借贷。",
    },
    {
      id: "summit",
      elevation: 8848.86,
      name: "珠峰之巅",
      biome: "极高山 · 冰岩",
      emoji: "🏔️",
      temperatureC: -31.5,
      snow: 0.9,
      fog: 0.2,
      wind: 0.8,
      palette: ["#20325f", "#4a6dd0", "#cdddfa"],
      description: "8848.86 米。苍穹之下，云海臣服于你的脚下。",
    },
  ],
  knowledgeNodes: [
    {
      id: "lukla-forest",
      elevation: 2600,
      emoji: "🌲",
      title: "为什么南坡林带这么高？",
      summary:
        "印度洋暖湿季风翻越 7000m 山峰前，在南坡制造了超长的湿润森林带。",
      detail:
        "喜马拉雅南坡正对着印度洋，夏季风带来大量水汽，受地形抬升成云致雨；因此南坡从山脚直到约 4,000 米都被常绿阔叶林、针叶林和杜鹃灌丛覆盖，而同海拔的北坡（西藏侧）却大都是荒原。",
      facts: [
        {
          label: "南坡林带上限",
          value: "约 4,200 m（热带森林到高山草珊瑚过渡）",
          source: SRC_WIKI_EVEREST,
        },
        {
          label: "北坡同海拔",
          value: "以裸岩与草原为主，对比鲜明",
          source: SRC_WIKI_EVEREST,
        },
      ],
      sources: [SRC_WIKI_EVEREST],
    },
    {
      id: "lapse-rate",
      elevation: 3600,
      emoji: "🌡️",
      title: "海拔每上升 1000 米，气温约降 6℃",
      summary: "因为空气越往上越稀薄，膨胀吸热，所以山地越高越冷。",
      detail:
        "对流层内的平均温度直减率约 6.5℃/1000m：你每升高一公里，周围空气就冷约 6-7℃。这也是为什么同一天，山脚可以穿短袖，峰顶却是零下几十度。",
      facts: [
        {
          label: "标准直减率",
          value: "约 6.5 ℃/1000m（对流层平均近似）",
          source: "Standard Atmosphere lapse rate",
        },
        {
          label: "本场景模型",
          value: "26℃ - 6.5°C/km × 海拔(km)（近似）",
          source: "探索模型 [engine] ",
        },
      ],
      sources: [SRC_CLIMATE],
    },
    {
      id: "alpine-oblue",
      elevation: 4400,
      emoji: "🏔️⛰️",
      title: "树木去哪？——「树线」",
      summary: "再往上是树木存在的极限，草甸同灌丛继续向上，直到连草也长不出。",
      detail:
        "海拔越高，气温越低、风越大、生长季越短，树木首先扛不住，玉带构成树线（在南坡约 4,000–4,300m）。树线上方是无林的高山草甸；再往上连草都稀疏，进入裸岩与冰雪的世界。",
      facts: [
        {
          label: "南坡树线",
          value: "约 4,200 m 维度，之后只有灌丛与草甸",
          source: "Wikipedia — Everest environment",
        },
        {
          label: "永久雪源",
          value: "南坡雪线约 5,000–5,500m 之间（近似）",
          source: "Wikipedia — Snow line",
        },
      ],
      sources: [SRC_WIKI_EVEREST],
    },
    {
      id: "snowline-kzha",
      elevation: 5700,
      emoji: "❄️",
      title: "雪线：从此便是“永久积雪”",
      summary: "这个高度以上，夏季积雪也无法全部融化，年复一年堆积成冰川。",
      detail:
        "雪线是“永久积雪”的下界；在雪线上方，哪怕夏天最热门的时候，鹅毛大雪也化不完。珠峰南坡雪线约在 5,000–5,500m 之间——脚下地表渐渐失去颜色，变成「冰与岩」的红白世界。",
      facts: [
        {
          label: "南坡雪线",
          value: "约 5,000–5,900 m（近似，随坡向/季节浮动)",
          source: "Snow line（Wikipedia）",
        },
      ],
      sources: [SRC_WIKI_EVEREST],
    },
    {
      id: "khumbu-glacier",
      elevation: 6300,
      emoji: "🧊",
      title: "冰川不是死的——它在流动",
      summary: "积雪一年年压实成冰，在自重下像“稠厚的熔岩”一样向下缓慢蠕動。",
      detail:
        "位于大本营与 C1 之间的昆布冰川是珠峰南麓最著名的冰川，世界最深邃的冰瀑之一被它携带。冰川在重力下不断向下方缓慢流动（几年到十几年走完公里级），表面因此布满裂隙与冰塔，变化无常。",
      facts: [
        {
          label: "昆布冰川上缘",
          value: "从大本营(5,364m）向上蔓延至约 6,400m+",
          source: "Khumbu Glacier (Wikipedia 资料)",
        },
        {
          label: "冰流速度",
          value: "数量级的缓慢（每年数米~十余米，近似）",
          source: "Wikipedia — Glacier dynamics",
        },
      ],
      sources: [SRC_GLACIER],
    },
    {
      id: "death-zone",
      elevation: 7950,
      emoji: "🫁",
      title: "为什么要给 8,000m 以上叫「死亡区」",
      summary: "空气变得这么薄，氧气只剩海平面约 1/3，细胞失去修复能力。",
      detail:
        "在 8,000m 以上的「死亡区（Death Zone）」，气压仅约海平面的三成，人体几乎无法靠自然呼吸维持长期存活——细胞得不到足够氧气，人会出现严重的缺氧、判断力下降甚至器官衰竭。这就是为什么登珠峰要按「出击窗口」快速登顶登返。",
      facts: [
        {
          label: "8,848m 峰顶气压",
          value: "约 335 hPa，≈ 海平面 1/3",
          source: "大气高度近似模型（本研究/Demo 建模）",
        },
        {
          label: "死亡区",
          value: "约 8,000m 以上（近似）",
          source: "Mount Everest FAQ（公开资料）",
        },
      ],
      sources: [SRC_O2],
    },
    {
      id: "summit-height",
      elevation: 8840,
      emoji: "🇨🇳🇳🇵",
      title: "8848.86：中尼两国立了同一把尺",
      summary: "2020 年，中国与尼泊尔联合测量，共同宣布珠峰高度为 8848.86 米。",
      detail:
        "2020 年 12 月 8 日，中尼双方联合发布最新高程：**8848.86 m**，取代此前两国的 8844.43m（中国测）与 8848m（英/尼历）。测量用到GNSS、微波测距、雪深雷达等方式，并首次用两尼泊尔坐标同基准换算。",
      facts: [
        {
          label: "官方高程",
          value: "8,848.86 m（2020 年联合公布）",
          source: "自然资源部/新华社",
        },
        {
          label: "首次登顶",
          value: "1953 年推行前沿（Hillary / Norgay）",
          source: "Wikipedia",
        },
      ],
      sources: [SRC_ZH_2020],
    },
  ],
};
