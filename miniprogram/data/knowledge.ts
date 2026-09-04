/**
 * Knowledge(地理知识) Mock 数据 —— 30 条，覆盖六大类（设计文档 §7 体系）。
 * 每条均含：内容、关联地点/地貌、分类；不硬编码在页面代码里（§28）。
 */
import type { Knowledge } from "../types/models";

const DATA: Array<Omit<Knowledge, "id"> & { id: string }> = [
  {
    id: "k01",
    title: "为什么海拔越高气温越低？",
    summary: "空气对流层靠地面加热",
    content:
      "大气主要靠地面辐射增温而非太阳直接加热，因此海拔越高、离热源越远气温越低；对流层平均直减率约 6.5℃/1000m。",
    category: "气候",
    emoji: "🌡️",
    relatedPlaceIds: ["p-everest", "p-fuji"],
    relatedLandformIds: ["lf-mountain"],
  },
  {
    id: "k02",
    title: "雪线是什么？",
    summary: "永久积雪的下界",
    content:
      "雪线是常年积雪区的最低界限：更高之处，夏季也无法融尽积雪，年复一年将雪压实成冰，最终形成冰川。",
    category: "地形地貌",
    emoji: "❄️",
    relatedPlaceIds: ["p-everest"],
    relatedLandformIds: ["lf-glacial"],
  },
  {
    id: "k03",
    title: "喜马拉雅是怎么长出来的？",
    summary: "板块碰撞成就世界屋脊",
    content:
      "约 5,000 万年以来，印度板块持续向北挤压欧亚板块，岩层褶皱抬升，形成青藏高原与喜马拉雅山脉，至今仍在缓慢升高。",
    category: "地质",
    emoji: "⛰️",
    relatedPlaceIds: ["p-himalaya", "p-qinghai", "p-everest"],
    relatedLandformIds: ["lf-mountain", "lf-plateau"],
  },
  {
    id: "k04",
    title: "山体为什么会「垂直分带」？",
    summary: "温度与降水随海拔分段",
    content:
      "气温随海拔递减、降水随坡向变化，使植被按带分布：阔叶林→针叶林→草甸→裸岩→冰雪，这是山区最直观的景观序。",
    category: "气候",
    emoji: "🌲",
    relatedPlaceIds: ["p-everest", "p-fuji", "p-kilimanjaro"],
    relatedLandformIds: ["lf-mountain"],
  },
  {
    id: "k05",
    title: "沙漠为什么会这么干？",
    summary: "副热带高压 + 远离海洋",
    content:
      "副热带高压的下沉气流抑制成云致雨，加上深处内陆水汽远、植被稀疏，多数沙漠年降水不足 250mm。",
    category: "气候",
    emoji: "🏜️",
    relatedPlaceIds: ["p-sahara", "p-taklimakan"],
    relatedLandformIds: ["lf-desert"],
  },
  {
    id: "k06",
    title: "峡谷为何深如“刀劈”？",
    summary: "河流下切 vs 地壳抬升",
    content:
      "河流不断向下侵蚀，同时地壳持续抬升，两者“赛跑”数百万年，便在高原上切出万米级深谷。",
    category: "地形地貌",
    emoji: "🏞️",
    relatedPlaceIds: ["p-yarlung", "p-colorado"],
    relatedLandformIds: ["lf-canyon"],
  },
  {
    id: "k07",
    title: "“死亡区”为何危险？",
    summary: "低压缺氧",
    content:
      "约 8,000m 以上气压仅剩海平面约 1/3，人体无法自然供氧，出现判断力下降、器官衰竭，因此攀登必须卡窗口速战速决。",
    category: "气候",
    emoji: "🫁",
    relatedPlaceIds: ["p-everest"],
    relatedLandformIds: ["lf-mountain"],
  },
  {
    id: "k08",
    title: "冰川其实在“流动”？",
    summary: "厚冰=塑性流",
    content:
      "冰川是多年的积雪加权成冰，在巨大自重下像黏稠流体一样缓慢流动，从而“雕”出 U 形谷、角峰等冰蚀地形。",
    category: "地质",
    emoji: "🧊",
    relatedPlaceIds: ["p-everest", "p-antarct"],
    relatedLandformIds: ["lf-glacial", "lf-canyon"],
  },
  {
    id: "k09",
    title: "什么是季风？",
    summary: "海陆季节性热力差",
    content:
      "夏季大陆比海洋更热形成低压、冬季相反，于是风向随季节反转，带来雨季与旱季交替，南亚与东亚最典型。",
    category: "气候",
    emoji: "🌬️",
    relatedPlaceIds: ["p-himalaya"],
    relatedLandformIds: ["lf-plain"],
  },
  {
    id: "k10",
    title: "洋流也会给气候“送温暖”？",
    summary: "表层风带 + 科氏力",
    content:
      "风吹动表层海水并受科氏力偏转，形成洋流；暖流使沿岸增温增湿，寒流使沿岸变干变凉。",
    category: "水文",
    emoji: "🌊",
    relatedPlaceIds: ["p-reef"],
    relatedLandformIds: ["lf-coast"],
  },
  {
    id: "k11",
    title: "地球最深的水在哪？",
    summary: "马里亚纳海沟探底",
    content:
      "大洋板块俯冲进地幔的区域形成海沟，马里亚纳海沟最深处（挑战者深渊）约 11,000m，比珠峰高度还大。",
    category: "世界地理",
    emoji: "🌊",
    relatedPlaceIds: ["p-mariana"],
    relatedLandformIds: [],
  },
  {
    id: "k12",
    title: "什么是植被带？",
    summary: "气候画出的“地图”",
    content:
      "温度与降水组合，决定了赤道雨林、草原、热带荒漠、温带落叶林与寒带针叶林等地带在地表上呈带状分布。",
    category: "生态",
    emoji: "🌳",
    relatedPlaceIds: [],
    relatedLandformIds: [],
  },
  {
    id: "k13",
    title: "河流为什么会弯弯曲曲？",
    summary: "冲蚀 vs 淤积",
    content:
      "水流在高处冲刷凹岸，低处堆积凸岸，河曲不断摆动，甚至切出牛轭湖，形成蜿蜒河道。",
    category: "水文",
    emoji: "🏞️",
    relatedPlaceIds: ["p-huanghe", "p-nile"],
    relatedLandformIds: ["lf-delta", "lf-alluvial-fan"],
  },
  {
    id: "k14",
    title: "溶洞、钟乳石怎么来的？",
    summary: "水溶解碳酸钙",
    content:
      "含二氧化碳的雨水缓慢溶解石灰岩，蚀出溶洞、石林；碳酸钙再析出形成钟乳石，速度以百年计。",
    category: "地形地貌",
    emoji: "🕳️",
    relatedPlaceIds: [],
    relatedLandformIds: ["lf-karst"],
  },
  {
    id: "k15",
    title: "大陆漂移的证据“。”",
    summary: "海岸线、化石、岩层",
    content:
      "大西洋两岸的海岸线形状、植物化石、岩层序比与古气候分布高度吻合，正是魏格纳大陆漂移学说的关键证据。",
    category: "地质",
    emoji: "🧭",
    relatedLandformIds: ["lf-mountain"],
    relatedPlaceIds: [],
  },
  {
    id: "k16",
    title: "等高线怎么读？",
    summary: "把立体地形画上平面",
    content:
      "等高线连接同一海拔的点，线越密坡度越陡，线越疏坡度越缓；闭合的等高线表示山顶或洼地。",
    category: "地形地貌",
    emoji: "🗺️",
    relatedPlaceIds: [],
    relatedLandformIds: ["lf-mountain"],
  },
  {
    id: "k17",
    title: "沙漠里也有绿洲？",
    summary: "地下水与河川供给",
    content:
      "荒漠中凡有地下水或河流穿过之处，便会形成可供人类聚落的绿洲，是丝绸之路上驼队的生命站。",
    category: "世界地理",
    emoji: "🌴",
    relatedPlaceIds: ["p-sahara", "p-taklimakan"],
    relatedLandformIds: ["lf-desert"],
  },
  {
    id: "k18",
    title: "南极是“冷沙漠”？",
    summary: "降水极少的冰原",
    content:
      "南极严寒而干燥，固态降水少，全年净蒸发近零，按干旱程度计算，是全球最大的（冷）沙漠。",
    category: "气候",
    emoji: "🧊",
    relatedPlaceIds: ["p-antarct"],
    relatedLandformIds: ["lf-glacial"],
  },
  {
    id: "k19",
    title: "“黄”土高原为何千沟万壑？",
    summary: "风成黄土 + 水流侵蚀",
    content:
      "风带来极厚黄土覆盖，随后流水将其雕刻成塬、梁、峁与深沟，形成独特黄土地貌与沟壑纵横。",
    category: "地形地貌",
    emoji: "🟡",
    relatedPlaceIds: ["p-huanghe"],
    relatedLandformIds: ["lf-loess"],
  },
  {
    id: "k20",
    title: "海岸为什么有的崖壁有的沙滩？",
    summary: "侵蚀 vs 堆积",
    content:
      "波浪不断拍刷陡岸成海蚀崖，泥沙则在缓坡沉积成沙嘴与海滩——同一条海岸线，分工各不同。",
    category: "水文",
    emoji: "🌊",
    relatedPlaceIds: ["p-reef"],
    relatedLandformIds: ["lf-coast"],
  },
  {
    id: "k21",
    title: "大气层分几层？",
    summary: "对流层→平流层→高层",
    content:
      "贴近地面的对流层聚集绝大多数天气；其上平流层含臭氧层；再往上为中间层、热层，直到湍流层际。",
    category: "气候",
    emoji: "☁️",
    relatedPlaceIds: [],
    relatedLandformIds: [],
  },
  {
    id: "k22",
    title: "雅丹与丹霞怎么区分？",
    summary: "风蚀 vs 流水剥蚀",
    content:
      "丹霞是红色砂岩被流水切割，雅丹则是干旱区的风蚀垄槽；一个像“城堡”，一个像“迷宫”。",
    category: "地形地貌",
    emoji: "🧱",
    relatedPlaceIds: [],
    relatedLandformIds: ["lf-danxia", "lf-yadan"],
  },
  {
    id: "k23",
    title: "沙漠日温差为什么很大？",
    summary: "少云少水份",
    content:
      "沙漠云量极低，白天日照加热地面、夜里无云保暖，散热极快，日温差常超过 40℃。",
    category: "气候",
    emoji: "🌡️",
    relatedPlaceIds: ["p-sahara", "p-taklimakan"],
    relatedLandformIds: ["lf-desert"],
  },
  {
    id: "k24",
    title: "什么是雪崩？",
    summary: "积层失稳下坠",
    content:
      "陡坡上的积雪层因温度或震动失去稳定而整体快速下滑，速度可达数百公里每小时，是山区最危险的灾害之一。",
    category: "地形地貌",
    emoji: "🏔️",
    relatedPlaceIds: ["p-everest"],
    relatedLandformIds: ["lf-mountain"],
  },
  {
    id: "k25",
    title: "火山岛是怎么长出来的？",
    summary: "热点 vs 板块漂移",
    content:
      "地幔深处的热点上涌岩浆，板块在其上方缓慢漂移，于是形成一串年龄递增的火山岛链，如夏威夷群岛。",
    category: "地质",
    emoji: "🌋",
    relatedPlaceIds: ["p-kilauea"],
    relatedLandformIds: ["lf-volcanic"],
  },
  {
    id: "k26",
    title: "湿地为什么叫“地球之肾”？",
    summary: "天然净水、蓄洪、育生物",
    content:
      "湿地吸纳并净化水流、调蓄洪水，为动植物提供栖息地，就像肾脏过滤血液一样净化环境系统。",
    category: "生态",
    emoji: "💧",
    relatedPlaceIds: [],
    relatedLandformIds: ["lf-delta"],
  },
  {
    id: "k27",
    title: "高山湖为什么多为“火山湖”？",
    summary: "火山口积水成湖",
    content:
      "火山喷发后山口塌陷成漏斗洼地，降水与地下补给不排而出，积成如长白山天池般的高山湖泊。",
    category: "地形地貌",
    emoji: "🏞️",
    relatedPlaceIds: ["p-baishan"],
    relatedLandformIds: ["lf-volcanic"],
  },
  {
    id: "k28",
    title: "潮汐是谁“拉”动的？",
    summary: "月球引力＋自转",
    content:
      "月球引潮力为主、太阳辅助，加上地球自转，使海洋周期性涨落，形成每日两次涨落潮。",
    category: "水文",
    emoji: "🌗",
    relatedPlaceIds: [],
    relatedLandformIds: ["lf-coast"],
  },
  {
    id: "k29",
    title: "火山喷发为什么会有“烟雾”？",
    summary: "岩浆气体＋碎屑",
    content:
      "喷发时释放大量气体、火山灰与碎屑，形成落在数千米上空的“汽柱”，会改变区域气候数月甚至数年。",
    category: "地质",
    emoji: "🌋",
    relatedPlaceIds: ["p-kilauea", "p-fuji"],
    relatedLandformIds: ["lf-volcanic"],
  },
  {
    id: "k30",
    title: "生态系统为什么重要？",
    summary: "气候、水源、物种",
    content:
      "从雨林到珊瑚礁，生态系统调节气候、涵养水源、守护生物多样性，是人类赖以生存的基础。",
    category: "生态",
    emoji: "🌍",
    relatedPlaceIds: ["p-reef"],
    relatedLandformIds: [],
  },
];

export const KNOWLEDGE: Knowledge[] = DATA;

export function getKnowledgeById(id: string): Knowledge | undefined {
  return KNOWLEDGE.find((k) => k.id === id);
}

export function knowledgeByCategory(category: string): Knowledge[] {
  return KNOWLEDGE.filter((k) => k.category === category);
}

export const KNOWLEDGE_CATEGORIES: string[] = [
  ...new Set(KNOWLEDGE.map((k) => k.category)),
];
