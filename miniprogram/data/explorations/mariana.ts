/**
 * 🌊 潜入马里亚纳海沟 —— 探索场景数据（第二场景·架构压力测试）。
 *
 * 数据真实性：
 *   - 挑战者深渊深度取 2021 年压力反演测量 10,935 ± 6 m（Greenaway et al. 2021，
 *     亦为 Wikipedia / Britannica 现行采用的数值；2020 年 Vescovo 测得 10,935 m）。
 *   - 海洋分层（阳光带 0–200m / 微光带 200–1,000m / 黑暗带 1,000–4,000m /
 *     深渊带 4,000–6,000m / 超深渊带 6,000m 以下）依据 NOAA《Layers of the Ocean》等公开资料。
 *   - 水压约每 10m +1 大气压（~1,086 atm @ 11,000m）；深海近底水温约 1.5–2°C
 *     （温度极小值层 ~1.45°C @ ~4,000–4,800m，再往下因绝热压缩略升）。光照在 ~200m 后所剩无多、~1,000m 全黑。
 *   - 名称/数值如有“近似”，在对应 DataSource 标注 approximate。
 *
 * 与珠峰共用的抽象：同一套 Exploration 模型/引擎。视觉、指标全部由本数据文件定义，
 * UI 不含任何 mariana 专属判断。
 */
import type { DataSource, Exploration } from "../../types/exploration";

const SRC_WIKI_MARIANA: DataSource = {
  name: "Wikipedia — Mariana Trench",
  url: "https://zh.wikipedia.org/wiki/%E9%A9%AC%E9%87%8C%E4%BA%9A%E7%BA%B3%E6%B5%B7%E6%B2%9F",
  verifiedAt: "2025-01-10",
  approximate: false,
};

const SRC_CHALLENGER: DataSource = {
  name: "Wikipedia — Challenger Deep（最深点 10,935±6 m，2021 年测量）",
  url: "https://en.wikipedia.org/wiki/Challenger_Deep",
  verifiedAt: "2025-01-10",
  approximate: true,
};

const SRC_NOAA_ZONES: DataSource = {
  name: "NOAA — Layers of the Ocean（海洋五带：0–200/200–1000/1000–4000/4000–6000/>6000）",
  url: "https://www.noaa.gov/jetstream/ocean/layers-of-ocean",
  verifiedAt: "2025-01-10",
  approximate: false,
};

const SRC_TEMP: DataSource = {
  name: "Scientific Reports 2018 — Seasonal variability in Challenger Deep（近底 ~2°C，极小值层 ~1.45°C）",
  url: "https://doi.org/10.1038/s41598-018-30176-4",
  verifiedAt: "2025-01-10",
  approximate: true,
};

const SRC_PRESSURE: DataSource = {
  name: "NOAA — Ocean pressure（每下潜 10m 约增 1 个大气压；万米下 >1000 atm）",
  url: "https://oceanservice.noaa.gov/facts/pressure.html",
  verifiedAt: "2025-01-10",
  approximate: true,
};

const SRC_BIO: DataSource = {
  name: "Wikipedia — Bioluminescence（深海生物发光：诱饵/伪装/警告/寻找同伴）",
  url: "https://zh.wikipedia.org/wiki/%E7%94%9F%E7%89%A9%E8%87%AA%E5%85%89",
  verifiedAt: "2025-01-10",
  approximate: false,
};

const SRC_1960: DataSource = {
  name: "Wikipedia — Bathyscaphe Trieste（1960 首航载人下潜，深约 10,916 m）",
  url: "https://en.wikipedia.org/wiki/Trieste_(bathyscaphe)",
  verifiedAt: "2025-01-10",
  approximate: false,
};

const SRC_CAMERON: DataSource = {
  name: "BBC News — 卡梅隆 2012 首单程下潜挑战者深渊（深约 10,908 m）",
  url: "https://www.bbc.co.uk/news/science-environment-17503395",
  verifiedAt: "2025-01-10",
  approximate: true,
};

const SRC_FENDOUZHE: DataSource = {
  name: "新华网 —2020“奋斗者”号在马里亚纳海沟坐底 10,909 m（中国载人深潜纪录）",
  url: "https://www.xinhuanet.com/politics/2020-11/28/c_1126798286.htm",
  verifiedAt: "2025-01-10",
  approximate: false,
};

const SRC_TRENCH: DataSource = {
  name: "Wikipedia — Mariana Trench（海沟=太平洋板块俯冲带的深海沟）",
  url: "https://zh.wikipedia.org/wiki/%E9%A9%AC%E9%87%8C%E4%BA%9A%E7%BA%B3%E6%B5%B7%E6%B2%9F",
  verifiedAt: "2025-01-10",
  approximate: false,
};

export const MARIANA: Exploration = {
  id: "mariana",
  slug: "mariana",
  title: "潜入马里亚纳海沟",
  subtitle: "从海面沉向深渊 · 深度 10,935 m",
  emoji: "🌊",
  meta: {
    placeLabel: "马里亚纳海沟",
    region: "西太平洋 · 马里亚纳群岛",
    typeLabel: "超深渊 / 海洋",
    description:
      "地球海洋最深处（挑战者深渊，约 10,935 m）。从明亮的海面一路沉入微光、黑暗与超深渊——6 个海洋带，每 10m 水压增加一个大气压。",
    tags: ["地球最深点", "万米海沟", "生物发光"],
  },
  palette: ["#3fa9ee", "#0b5fa3", "#05182f"],
  world: { style: "ocean" },
  startElevation: 0,
  maxElevation: 10935,
  estimatedMinutes: 11,
  baseTemperatureC: 27,
  lapseRateCPer1000: 2.34,
  seaLevelPressureHpa: 1013.25,
  vegetationTopM: 200,
  ui: {
    axisLabel: "深度",
    axisUnit: "m",
    forwardLabel: "下潜",
    forwardGlyph: "▼",
    backLabel: "上浮",
    backGlyph: "▲",
    remainingLabel: "距海底",
    advanceHint: "持续下滑或点下方「下潜 ▼」加深深度 · 途中遇到「查看详情」别错过",
    stagesLabel: "穿越海洋带",
    extentWord: "最深",
  },
  destination: {
    label: "挑战者深渊",
    title: "抵达挑战者深渊！",
    tagline: "地球最深处 · 深度 10,935 m",
    emoji: "🐋",
  },
  metrics: [
    {
      key: "temperature",
      label: "水温",
      icon: "🌡️",
      unit: "°C",
      digits: 1,
      curve: [
        [0, 27],
        [50, 26],
        [200, 16],
        [1000, 5],
        [3000, 2],
        [4500, 1.4],
        [10935, 2.1],
      ],
      source: SRC_TEMP,
    },
    {
      key: "pressure",
      label: "水压",
      icon: "🌀",
      unit: "atm",
      curve: [
        [0, 1],
        [10935, 1086],
      ],
      source: SRC_PRESSURE,
    },
    {
      key: "light",
      label: "光照",
      icon: "🔆",
      percent: true,
      curve: [
        [0, 1],
        [50, 0.5],
        [100, 0.12],
        [200, 0.008],
        [500, 0.0001],
        [1000, 0],
        [10935, 0],
      ],
      source: SRC_NOAA_ZONES,
    },
    {
      key: "salinity",
      label: "盐度",
      icon: "🧂",
      unit: "‰",
      digits: 1,
      constValue: 34.6,
      source: SRC_WIKI_MARIANA,
    },
    {
      key: "life",
      label: "海洋生物",
      icon: "🐋",
      percent: true,
      curve: [
        [0, 0.9],
        [200, 0.6],
        [1000, 0.25],
        [4000, 0.08],
        [6000, 0.05],
        [10000, 0.04],
        [10935, 0.04],
      ],
      source: SRC_NOAA_ZONES,
    },
  ],
  source: SRC_WIKI_MARIANA,
  stages: [
    {
      id: "epipelagic",
      elevation: 0,
      name: "海面带",
      biome: "阳光表层 · 0–200 m",
      emoji: "🌞",
      temperatureC: 27,
      snow: 0,
      fog: 0.15,
      wind: 0.15,
      palette: ["#39a5ee", "#8ed5f7", "#e8f8ff"],
      terrainTint: ["#cfe3e6", "#7fa3ab"],
      flora: ["🐠", "🐳", "🪸", "🐬", "🦋"],
      description: "日光透亮，浮游繁盛，近九成海洋生物生活在水面下 200 m 之内。",
    },
    {
      id: "mesopelagic",
      elevation: 200,
      name: "中层带",
      biome: "微光带 · 200–1,000 m",
      emoji: "🪼",
      temperatureC: 16,
      snow: 0.35,
      fog: 0.5,
      wind: 0.2,
      palette: ["#1b6cb5", "#0d4c8e", "#052c66"],
      terrainTint: ["#2a5a6e", "#153441"],
      flora: ["🪼", "🦑", "🐠", "🐙"],
      description: "光线迅速衰减；大量生物开始自学发光——诱饵、伪装、求偶、警告。",
    },
    {
      id: "bathypelagic",
      elevation: 1000,
      name: "深层带",
      biome: "黑暗带 · 1,000–4,000 m",
      emoji: "🐙",
      temperatureC: 5,
      snow: 0.75,
      fog: 0.85,
      wind: 0.3,
      palette: ["#0a2f52", "#061e3a", "#010e1f"],
      terrainTint: ["#123042", "#081b2a"],
      flora: ["🦑", "🪼", "🐡", "🦞"],
      description: "完全黑暗。呼吸无法，靠“海雪”——由上而下的有机碎屑供养零星生命。",
    },
    {
      id: "abyssopelagic",
      elevation: 4000,
      name: "深渊带",
      biome: "深渊 · 4,000–6,000 m",
      emoji: "🦐",
      temperatureC: 1.6,
      snow: 0.85,
      fog: 0.9,
      wind: 0.35,
      palette: ["#051b31", "#031222", "#01060e"],
      terrainTint: ["#0e2330", "#06141e"],
      flora: ["🦐", "🦀", "🐋", "🪱"],
      description: "接近冰点的海水、巨大的水压；深渊底栖生物稀疏而特化。海底渔业？唯独此处无缝。",
    },
    {
      id: "hadal",
      elevation: 6000,
      name: "超深渊带",
      biome: "海沟 · 6,000 m 以下",
      emoji: "🦑",
      temperatureC: 1.8,
      snow: 0.95,
      fog: 0.92,
      wind: 0.4,
      palette: ["#031c3a", "#021224", "#010a16"],
      terrainTint: ["#0c1f2c", "#070f16"],
      flora: ["🦑", "🐡", "🦞", "🐍"],
      description: "海沟之下，水压已达数十个大气压；只有少数“极限物种”仍能住下来。",
    },
    {
      id: "challenger",
      elevation: 10000,
      name: "挑战者深渊",
      biome: "最深区 · 10,000–10,935 m",
      emoji: "🪸",
      temperatureC: 2.1,
      snow: 1,
      fog: 0.96,
      wind: 0.4,
      palette: ["#021a33", "#010b1c", "#00050b"],
      terrainTint: ["#0a1d2e", "#040d18"],
      flora: ["🪸", "🦞", "🐚", "🌋"],
      description: "万米之下近 1,100 个大气压——地球表面距离阳光最远的地方。",
    },
  ],
  knowledgeNodes: [
    {
      id: "midnight-zone",
      elevation: 1000,
      emoji: "🕳️",
      title: "没有光的黑暗带",
      category: "生态",
      summary: "大约 1,000 m 以下，阳光完全消失，海洋进入「黑暗带」。",
      detail:
        "阳光在表层耗光殆尽：约 200 m 处仅余 1% 光量，约 1,000 m 以下完全无光。\n" +
        "这片黑暗的深层海（1,000–4,000 m）没有植物、没有光合作用，生物依靠上方飘落的「海雪」（海洋雪）为生。",
      facts: [
        { label: "终年不见阳光", value: "约 1,000 m 以深", source: SRC_NOAA_ZONES },
        { label: "海雪", value: "微粒有机物下沉，成为深处食物的来源", source: SRC_WIKI_MARIANA },
      ],
      sources: [SRC_NOAA_ZONES, SRC_WIKI_MARIANA],
      quiz: {
        id: "qz-dark-zone",
        emoji: "🪳",
        lead: "刚学过黑暗带，试试这一题：",
        question: "阳光大约在多深以下就几乎完全消失了？",
        options: ["100 m 左右", "约 1,000 m", "5,000 m", "10,000 m 以上"],
        answerIndex: 1,
        explanation: "约 200 m 仅剩 1% 光，到约 1,000 m 便完全无光——这也是黑暗带（Bathypelagic）之名的来由。",
        source: SRC_NOAA_ZONES,
      },
    },
    {
      id: "bioluminescence",
      elevation: 600,
      emoji: "✨",
      title: "深海的自发光",
      category: "生态",
      summary: "许多深海生物能自己发光，用作诱饵、伪装、警告与寻找同伴。",
      detail:
        "微光带开始，生物发光逐渐成为主流。约 90% 的微光与深海动物可通过自身体内的化学发光（荧光素酶）发出蓝绿色光，用来吸引猎物、警示敌人，或向同类求偶——深海几乎是「LED 的世界」。",
      facts: [
        { label: "常见颜色", value: "蓝绿色（在水中传播最远）", source: SRC_BIO },
        { label: "常见用途", value: "诱饵 / 伪装 / 警告 / 求偶", source: SRC_BIO },
      ],
      sources: [SRC_BIO, SRC_NOAA_ZONES],
      quiz: {
        id: "qz-bio",
        emoji: "✨",
        lead: "刚看完「深海自发光」，考考你：",
        question: "深海生物自发光最主要目的通常是什么？",
        options: ["照明", "装饰", "诱饵 / 伪装 / 求偶交流", "取暖"],
        answerIndex: 2,
        explanation: "生物发光可用于诱捕、伪装、警告，以及寻找同伴——是黑暗中最高效的通讯方式。",
        source: SRC_BIO,
      },
    },
    {
      id: "pressure",
      elevation: 4200,
      emoji: "💢",
      title: "每 10 m +1 个大气压",
      category: "物理环境",
      summary: "水压随深度线性增大：每下潜约 10 m 增加 1 atm，4 千米深处已远超 400 atm。",
      detail:
        "大气压按每 10 m ~1 个大气压线性累积。到 4,000 m 时已约 400+ 个大气压，挑战者深渊处超过 1,000 个大气压（约 1,086 atm / 15,750 psi），远超地面上的任何极限。",
      facts: [
        { label: "增长率", value: "约每 10 m +1 atm（线性）", source: SRC_PRESSURE },
        { label: "挑战者深渊", value: "约 1,086 atm / ~110 MPa", source: SRC_PRESSURE },
      ],
      sources: [SRC_PRESSURE],
      quiz: {
        id: "qz-pressure",
        emoji: "💢",
        lead: "压力题来了：",
        question: "下潜约多少米，水压会增加一个大气压量级？",
        options: ["1 m", "10 m", "100 m", "1,000 m"],
        answerIndex: 1,
        explanation: "每下潜约 10 m，水压便增加约 1 个大气压——所以在 10,900 m 处是≈1,090 atm。",
        source: SRC_PRESSURE,
      },
    },
    {
      id: "abyss-zone",
      elevation: 4000,
      emoji: "🛜",
      title: "深渊带：海床全球 75%",
      category: "地形",
      summary: "深渊带（4,000–6,000 m）覆盖地球表面约 3/4 的洋底，是生物最稀疏的深度之一。",
      detail:
        "深渊与接近冰点的水温、硫深海生命只能靠极低的食物供给维持。这里没有光合作用，许多鱼类的眼睛退化或消失，仅靠触觉与嗅觉在永恒的黑暗中猎食。",
      facts: [
        { label: "面积", value: "约占洋底的 75%", source: SRC_NOAA_ZONES },
        { label: "水温", value: "约 1–4°C（近冰点）", source: SRC_TEMP },
      ],
      sources: [SRC_NOAA_ZONES, SRC_TEMP],
      quiz: {
        id: "qz-abyss",
        emoji: "🛜",
        lead: "深渊带小测验：",
        question: "深渊带水温大约在什么范围？",
        options: ["25–30°C", "约 10–20°C", "约 1–4°C", "−5°C 以下"],
        answerIndex: 2,
        explanation: "深渊带海水近乎冰点，实测多在 1–4°C，甚至更低。",
        source: SRC_TEMP,
      },
    },
    {
      id: "hadal-zone",
      elevation: 6000,
      emoji: "🕳️",
      title: "超深渊带 · 海沟",
      category: "地理",
      summary: "只有海沟（>6,000 m）里才存在超深渊带（Hadopelic），马里亚纳是其中之最。",
      detail:
        "超深渊带只见于大洋里最深的海沟。马里亚纳海沟形成于太平洋板块向马里亚纳-岛弧之下俯冲，是全球最深的海沟；挑战者深渊在其南端，深达约 10,935 m。",
      facts: [
        { label: "分布", value: "超深渊只出现在海洋沟槽（>6,000 m）", source: SRC_WIKI_MARIANA },
      ],
      sources: [SRC_WIKI_MARIANA, SRC_TRENCH],
      quiz: {
        id: "qz-hadal",
        emoji: "🕳️",
        lead: "超深渊带：",
        question: "超深渊带（Hadal zone）通常在哪个深度以下？",
        options: ["100 m", "1,000 m", "6,000 m", "10,000 m"],
        answerIndex: 2,
        explanation: "界宇宙共识为 6,000 m 以下的海沟区才属于超深渊带（Hadal zone）。",
        source: SRC_NOAA_ZONES,
      },
    },
    {
      id: "diving-history",
      elevation: 10500,
      emoji: "🛢️",
      title: "人类下潜史：从 1960 到 2020",
      category: "历史",
      summary:
        "1960 年的里雅斯特号首度载人抵达挑战者深渊；2012 卡梅隆独自下潜；2020 中国奋斗号下潜 10,909 m。",
      detail:
        "1960 年 1 月 23 日，瑞士造“的里雅斯特号”载人潜水器，由皮卡德与沃尔什下潜至约 10,916 m，第一次把人类带入深渊。\n\n2012 年《泰坦尼克》导演詹姆斯·卡梅隆独自驾驶“深海挑战者”号抵达约 10,908 m。\n\n2020 年 11 月，中国“奋斗者”号在 10,909 m 成功坐底，多人再创我国载人深潜纪录。",
      facts: [
        { label: "1960 Trieste", value: "~10,916 m（首次载人）", source: SRC_1960 },
        { label: "2012 Cameron", value: "~10,908 m（首次单人）", source: SRC_CAMERON },
        { label: "2020 奋斗者号", value: "10,909 m（中国纪录）", source: SRC_FENDOUZHE },
      ],
      sources: [SRC_1960, SRC_CAMERON, SRC_FENDOUZHE],
      quiz: {
        id: "qz-history",
        emoji: "🛢️",
        lead: "深潜史小测验：",
        question: "1960 年首次把人类送入挑战者深渊的是哪艘潜水器？",
        options: ["深海挑战者号（Cameron）", "的里雅斯特号（Trieste）", "奋斗者号", "蛟龙号"],
        answerIndex: 1,
        explanation: "1960 年 1 月 23 日，Trieste 号（里雅斯特号）载人首次抵达挑战者深渊。",
        source: SRC_1960,
      },
    },
    {
      id: "challenger-deep",
      knowledgeId: "k11", // 对应知识库「地球最深的水在哪」
      elevation: 10935,
      emoji: "🐋",
      title: "挑战者深渊 · 地球最深点",
      category: "世界地理",
      summary:
        "马里亚纳海沟东南一角（挑战者深渊）约 10,935 m，是目前地球海中的最深点。",
      detail:
        "挑战者深渊是马里亚纳海沟最深处的一个盆地，位于马里亚纳群岛东南约 300 km。\n\n2021 年基于压力计与新型声学测量的深度为 10,935 ± 6 m（另有 2020 年 Vescovo 测得 10,935 m）——这也是目前在维基百科 / 大英百科等现行采用的 max 深度数值。正因如此，这段视频选择“10,935 m”作为本场景的终点深度。",
      facts: [
        { label: "最深处深度", value: "约 10,935 ± 6 m", source: SRC_CHALLENGER },
        { label: "位置", value: "马里亚纳群岛东南约 300 km", source: SRC_WIKI_MARIANA },
      ],
      sources: [SRC_CHALLENGER, SRC_WIKI_MARIANA],
      quiz: {
        id: "qz-max",
        emoji: "🐋",
        lead: "最深的最后一道题：",
        question: "目前公认的挑战者深渊最深处约为？",
        options: ["约 7,000 m", "约 9,000 m", "约 10,935 m", "超过 12,000 m"],
        answerIndex: 2,
        explanation: "2021 年测量约 10,935 ±6 m（2020 年 Vescovo 亦为 10,935/10,984 m），是目前地球最深点公认数值。",
        source: SRC_CHALLENGER,
      },
    },
  ],
};