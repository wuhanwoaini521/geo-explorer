/**
 * 🌊 潜入马里亚纳海沟 —— 探索场景数据（第二场景·架构压力测试）。
 *
 * 数据真实性：
 *   - 挑战者深渊深度取 2021 年压力反演测量 10,935 ± 6 m（Greenaway et al. 2021，
 *     亦为 Wikipedia / Britannica 现行采用的数值）。
 *   - 海洋分层（阳光带 0–200m / 微光带 200–1,000m / 黑暗带 1,000–4,000m /
 *     深渊带 4,000–6,000m / 超深渊带 6,000m 以下）依据 NOAA《Layers of the Ocean》等公开资料。
 *   - 水压约每 10m +1 大气压（~1,086 atm @ 11,000m）；深海近底水温约 1.5–2°C
 *     （温度极小值层 ~1.45°C @ ~4,000–4,800m，再往下因绝热压缩略升）。光照在 ~200m 后所剩无多、~1,000m 全黑。
 *   - 名称/数值如有“近似”，在对应 DataSource 标注 approximate。
 *
 * Journey（PHASE 2 补全）：垂直下潜水柱的 7 个里程碑——海面出发 → 温跃层 →
 * 微光带下界 → 深层带 → 深渊平原 → 海沟坡 → 挑战者深渊底。
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
  name: "新华网 — 2020“奋斗者”号在马里亚纳海沟坐底 10,909 m（中国载人深潜纪录）",
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
  world: { style: "ocean", placeId: "p-mariana" },
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
  route: {
    id: "mariana-descent",
    name: "挑战者深渊下潜序列",
    // 垂直下潜的里程碑：从支援船放下潜水器，到坐底挑战者深渊。
    // progress 映射教学轴「深度 0–10,935 m」，depth 为各点的真实参考深度。
    waypoints: [
      {
        id: "surface-start",
        name: "海面 · 出发",
        nameEn: "Launch Point",
        shortName: "海面",
        depth: 0,
        progress: 0,
        x: 50,
        y: 78,
        terrain: "开放海域 / 支援船",
        desc: "支援船在挑战者深渊正上方海面放下潜水器，下潜从这里开始。",
        detail:
          "马里亚纳海沟远离陆地，最近的关岛也在西南约 300 km 外。载人下潜通常以科考母船为基地：清晨完成气象与海流评估后，潜水器（如「奋斗者」号、Limiting Factor）经起重机放入海中，随后脱离母船自主下沉。海面到万米深渊没有任何「台阶」——一路都是水，这也是深海探索最难的地方：所有保护都来自潜水器本身。",
        facts: [
          "挑战者深渊位于马里亚纳群岛东南约 300 km（近似）",
          "潜水器从母船放入海中后独立下潜，全程约需 4 小时级",
          "海面水温约 27–29 ℃（热带西太平洋）",
        ],
        environment: "热带海面，阳光透亮，水温近 28 ℃；表层浮游生物最密集。",
        history:
          "挑战者深渊得名于 1872–76 年英国「挑战者号」科考船的首次系统测深；此后的每一次深潜（1960 / 2012 / 2020）都以这样的母船—潜水器接力开场。",
        whatToNotice: "看一眼水线：从这里开始，深度每增加 10 m，压力就增加一个大气压。",
        knowledgeIds: ["pressure", "k33"],
        sources: [SRC_WIKI_MARIANA, SRC_FENDOUZHE],
        reviewStatus: "approved",
      },
      {
        id: "thermocline",
        name: "温跃层",
        nameEn: "Thermocline",
        shortName: "温跃层",
        depth: 200,
        progress: 0.13,
        x: 44,
        y: 68,
        terrain: "阳光带底部 / 密度跃层",
        desc: "约 200 m：水温从 20 ℃ 级骤降到 10 ℃ 级，光照只剩表层的百分之一。",
        detail:
          "温跃层是海水温度随深度急剧变化的薄层，也是阳光带（0–200 m）的底界。热带海域温跃层通常在 100–200 m 之间；穿过它，水温和密度同步骤变，声波传播路径也随之弯折——这也是潜艇「躲」进温跃层的原因。阳光到 200 m 处只剩不到 1%，浮游植物的光合作用在此基本停摆。",
        facts: [
          "温跃层：热带海域通常在 100–200 m（NOAA）",
          "200 m 处光照不足表层的 1%（NOAA）",
        ],
        environment: "水温从 20 ℃ 级降到 10 ℃ 级；阳光迅速变暗，颜色从蓝绿转向深蓝。",
        history:
          "温跃层是海军声学与潜艇战术的经典课题：声速在跃层两侧突变，声呐波束会在此弯折甚至形成「阴影区」。",
        whatToNotice: "注意水色变化：越过温跃层，海水从透亮的蓝变成近乎墨色的深蓝。",
        knowledgeIds: ["k33", "midnight-zone"],
        sources: [SRC_NOAA_ZONES, SRC_WIKI_MARIANA],
        reviewStatus: "approved",
      },
      {
        id: "twilight-end",
        name: "微光带下界",
        nameEn: "Bottom of Twilight Zone",
        shortName: "微光尽",
        depth: 1000,
        progress: 0.35,
        x: 56,
        y: 54,
        terrain: "中层带底 / 无光界",
        desc: "约 1,000 m：最后一点阳光消失，海洋进入完全的黑暗。",
        detail:
          "微光带（200–1,000 m）是阳光的「余晖区」：光量随深度指数衰减，到 1,000 m 彻底归零。这条无光界也是深海生态的分水岭——以上的动物靠视觉与昼夜垂直迁移谋生，以下的居民只能靠化学发光与「海雪」。世界上最大的动物迁徙（垂直迁移）每晚就发生在这一带：数百万吨的中层鱼类夜里上浮到表层觅食，天亮前退回黑暗。",
        facts: [
          "无光界：约 1,000 m（阳光完全消失，NOAA）",
          "中层带多数动物具备自体发光能力（近似）",
        ],
        environment: "水温约 4–5 ℃；水压约 100 个大气压；窗外已看不到任何自然光。",
        history:
          "1950 年代以来，「声呐层」探明的中层带鱼类垂直迁移被称为地球上最大规模的动物迁徙——直到 20 世纪中叶，科学界才确认这片黑暗水柱里藏着如此巨大的生物量。",
        whatToNotice: "关掉潜水器灯光几秒：眼睛适应后，窗外的「星点」全是生物在发光。",
        knowledgeIds: ["midnight-zone", "bioluminescence"],
        sources: [SRC_NOAA_ZONES, SRC_BIO],
        reviewStatus: "approved",
      },
      {
        id: "deep-water",
        name: "深层带水柱",
        nameEn: "Bathypelagic Water Column",
        shortName: "深层",
        depth: 4000,
        progress: 0.55,
        x: 46,
        y: 38,
        terrain: "深层水 / 海雪带",
        desc: "约 4,000 m：水温接近极小值（约 1.4 ℃），上方飘落的「海雪」是这里唯一的食物。",
        detail:
          "深层带（1,000–4,000 m）的水温已接近极小值层（约 1.4–2 ℃）：这是表层冷水下沉、深海环流的「水龄」最老的水团之一。阳光完全缺席，食物全部依赖上层的「海雪」——浮游生物尸体、粪粒与碎屑缓慢下沉，为这里的零星居民（章鱼、灯笼鱼、端足类）提供能量。全球深渊平原约四分之三的洋底都在这个深度附近。",
        facts: [
          "水温约 1.4–2 ℃（温度极小值层）",
          "水压约 400 个大气压",
        ],
        environment: "完全黑暗，水温约 1.4–2 ℃，接近海水冰点；食物供给全球海洋最低。",
        history:
          "「深层水」是海洋环流的终点站：北大西洋与南极底层水下沉后，要在这里「住」上千年量级才会重新回到表层——深海环流研究的钥匙就在这段水柱里。",
        whatToNotice: "留意舷窗外的白色「雪片」：海雪的下沉速度极慢，从表层落到这里可能要数周。",
        knowledgeIds: ["abyss-zone", "k40"],
        sources: [SRC_TEMP, SRC_NOAA_ZONES],
        reviewStatus: "approved",
      },
      {
        id: "trench-rim",
        name: "海沟坡",
        nameEn: "Trench Slope",
        shortName: "沟坡",
        depth: 6500,
        progress: 0.68,
        x: 58,
        y: 30,
        terrain: "俯冲带斜坡 / 超深渊界",
        desc: "约 6,500 m：跨过超深渊带门槛，海底开始向下俯冲收窄。",
        detail:
          "6,000 m 是超深渊带（Hadal zone）的门槛——只有海沟能到达这个深度。从深渊平原继续下潜，海底坡度明显变陡：太平洋板块正在菲律宾海板块之下俯冲，海沟的内壁就是俯冲带的斜坡。这里的居民进一步特化：狮子鱼（hadal snailfish）等顶住了 600 多个大气压。",
        facts: [
          "超深渊门槛：6,000 m（仅海沟能到达）",
          "水压约 650 个大气压",
        ],
        environment: "水温约 1.6–2 ℃；斜坡沉积物松软，随时有小型滑坡把泥沙送进沟底。",
        history:
          "海沟斜坡也是地震的舞台：俯冲带在此把太平洋板块拉入地幔，历史上多次深海地震的震源就分布在两侧坡体之内。",
        whatToNotice: "看声呐屏上的海底剖面：从这里开始，地形从「平原」变成俯冲下去的斜坡。",
        knowledgeIds: ["hadal-zone", "pressure"],
        sources: [SRC_NOAA_ZONES, SRC_TRENCH],
        reviewStatus: "approved",
      },
      {
        id: "bottom-approach",
        name: "沟底接近段",
        nameEn: "Final Descent",
        shortName: "临底",
        depth: 10000,
        progress: 0.87,
        x: 50,
        y: 20,
        terrain: "海沟内脊 / 沉积物",
        desc: "约 10,000 m：海沟两侧的陡壁合拢，探照灯下只有浮游的端足类。",
        detail:
          "接近万米时，潜水器抛下压载后下潜速度放缓，探照灯打进一片死寂的浑浊水中。海沟底部的沉积物厚达公里级（由上层滑落与远洋沉积堆积），灯光常被海底雾（benthic storm 掀起的沉积物云）遮挡。这里的水压已超过 970 个大气压——任何气泡空腔都会被压扁到极限。",
        facts: [
          "水压约 970+ 个大气压",
          "水温约 2 ℃（近底略有回升）",
        ],
        environment: "近底水温因绝热压缩略有回升（约 2 ℃）；声呐上沟底地形起伏复杂。",
        history:
          "2019 年 Victor Vescovo 驾驶 Limiting Factor 下潜至此深度带并继续坐底——这是人类首次以可重复载人潜水器抵达万米沟底，此后该船又完成多次万米科考下潜。",
        whatToNotice: "看压舱铁球的读数：下潜全程的压载调整都在为最后的「坐底」做准备。",
        knowledgeIds: ["pressure"],
        sources: [SRC_PRESSURE, SRC_TEMP],
        reviewStatus: "approved",
      },
      {
        id: "challenger-bottom",
        name: "挑战者深渊 · 坐底",
        nameEn: "Challenger Deep Bottom",
        shortName: "坐底",
        depth: 10935,
        progress: 1,
        x: 52,
        y: 10,
        terrain: "超深渊海底 / 白色沉积",
        desc: "深度 10,935 m：地球最深处。水压约 1,086 个大气压，温度约 2 ℃。",
        detail:
          "挑战者深渊是马里亚纳海沟最深处的盆地，2021 年基于压力计与声学测量深度为 10,935 ± 6 m（Greenaway et al. 2021），是目前公认的地球海洋最深点。海底铺着极细的乳白色沉积（远处漂浮的硅藻软泥），水压约 1,086 个大气压——相当于每平方厘米压着约 1.1 吨的重量。即便如此，这里仍有生命：端足类在探照灯前游动，海沟狮群鱼在 8,000 m 以下仍有记录。",
        facts: [
          "深度 10,935 ± 6 m（2021 年测量）",
          "水压约 1,086 atm / ~110 MPa",
          "位于马里亚纳群岛东南约 300 km",
        ],
        environment: "水温约 2 ℃；完全黑暗，水压约为海面的一千倍。",
        history:
          "1960 年的里雅斯特号首次在此坐底；2020 年 11 月中国「奋斗者」号坐底 10,909 m——两次跨越 60 年的坐底，见证深潜技术从铆接钢球到钛合金载人舱的整整一代技术更替。",
        whatToNotice: "看一眼沉积物上的「足迹」：哪怕在万米海底，小型生物的爬痕仍清晰可见。",
        knowledgeIds: ["challenger-deep", "diving-history", "k11"],
        sources: [SRC_CHALLENGER, SRC_WIKI_MARIANA, SRC_FENDOUZHE],
        reviewStatus: "approved",
        mediaIds: ["m2-limiting-factor-bottom"],
      },
    ],
  },
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
      description: "完全黑暗。光合作用停止，靠「海雪」——自上而下的有机碎屑供养零星生命。",
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
      description: "接近冰点的海水、巨大的水压；深渊底栖生物稀疏而特化，靠海雪碎屑维生。",
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
      description: "海沟之下，水压已超过 600 个大气压；只有少数「极限物种」仍能住下来。",
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
      id: "bioluminescence",
      knowledgeId: "k34", // 对应知识库「深海的自发光」
      elevation: 600,
      emoji: "✨",
      title: "深海的自发光",
      category: "生态",
      summary: "许多深海生物能自己发光，用作诱饵、伪装、警告与寻找同伴。",
      detail:
        "微光带开始，生物发光逐渐成为主流。深海动物大多依靠体内的荧光素-荧光素酶反应发出蓝绿色光（这种波长在水中传播最远），用来吸引猎物、警示天敌或与同类交流——在阳光到不了的世界里，光就是语言。公开研究的统计显示，0–4,000 m 水层的浮游与游泳动物中约四分之三具备发光能力（近似）。",
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
      id: "midnight-zone",
      knowledgeId: "k33", // 对应知识库「海洋的五个层带」
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
      id: "abyss-zone",
      elevation: 4000,
      emoji: "🛜",
      title: "深渊带：海床全球 75%",
      category: "地形",
      summary: "深渊带（4,000–6,000 m）覆盖地球表面约 3/4 的洋底，是生物最稀疏的深度之一。",
      detail:
        "深渊带水温接近冰点（约 1–4 ℃），食物供给极低，深海生命只能靠极稀薄的食物碎屑维持。这里没有光合作用，许多鱼类的眼睛退化或消失，仅靠触觉与嗅觉在永恒的黑暗中猎食。",
      facts: [
        { label: "面积", value: "约占洋底的 75%", source: SRC_NOAA_ZONES },
        { label: "水温", value: "约 1–4 ℃（近冰点）", source: SRC_TEMP },
      ],
      sources: [SRC_NOAA_ZONES, SRC_TEMP],
      quiz: {
        id: "qz-abyss",
        emoji: "🛜",
        lead: "深渊带小测验：",
        question: "深渊带水温大约在什么范围？",
        options: ["25–30 ℃", "约 10–20 ℃", "约 1–4 ℃", "−5 ℃ 以下"],
        answerIndex: 2,
        explanation: "深渊带海水近乎冰点，实测多在 1–4 ℃，甚至更低。",
        source: SRC_TEMP,
      },
    },
    {
      id: "pressure",
      elevation: 2000,
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
      id: "hadal-zone",
      elevation: 6000,
      emoji: "🕳️",
      title: "超深渊带 · 海沟",
      category: "地理",
      summary: "只有海沟（>6,000 m）里才存在超深渊带（Hadal zone），马里亚纳是其中之最。",
      detail:
        "超深渊带只见于大洋里最深的海沟。马里亚纳海沟形成于太平洋板块向菲律宾海板块之下俯冲，是全球最深的海沟；挑战者深渊在其南端，深达约 10,935 m。",
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
        explanation: "国际通行的界定是 6,000 m 以下的海沟区才属于超深渊带（Hadal zone）。",
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
        "1960 年的里雅斯特号首度载人抵达挑战者深渊；2012 卡梅隆独自下潜；2020 中国「奋斗者」号坐底 10,909 m。",
      detail:
        "1960 年 1 月 23 日，瑞士造的「的里雅斯特号」载人潜水器由皮卡德与沃尔什驾驶，下潜至约 10,916 m，第一次把人类带入深渊。\n\n2012 年《泰坦尼克》导演詹姆斯·卡梅隆独自驾驶「深海挑战者」号抵达约 10,908 m。\n\n2020 年 11 月，中国「奋斗者」号在挑战者深渊成功坐底（深度 10,909 m），创下中国载人深潜纪录。",
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
        explanation: "1960 年 1 月 23 日，Trieste 号（的里雅斯特号）载人首次抵达挑战者深渊。",
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
        "马里亚纳海沟东南一隅（挑战者深渊）约 10,935 m，是目前地球海洋中的最深点。",
      detail:
        "挑战者深渊是马里亚纳海沟最深处的一个盆地，位于马里亚纳群岛东南约 300 km。\n\n2021 年基于压力计与声学测量的深度为 10,935 ± 6 m（Greenaway et al.）——这也是维基百科 / 大英百科等现行采用的最深点数值。正因如此，本场景选择 10,935 m 作为终点深度。",
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
        explanation: "2021 年测量为 10,935 ± 6 m，是目前地球最深点的公认数值。",
        source: SRC_CHALLENGER,
      },
    },
  ],
};
