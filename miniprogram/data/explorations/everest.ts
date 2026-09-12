/**
 * 珠穆朗玛峰地貌观察 —— 探索场景数据（MVP 核心 Demo）。
 *
 * 数据真实性：山峰高程、关键点位海拔、植被/雪线/含氧量均为**现有公开资料**的近似值；
 * 每个知识节点带来源字段（source/verifiedAt/approximate），无法确认的数值明确标注近似。
 * 随堂题（quiz）全部改写自已有公开知识，来源指向同节点的 DataSource，不引入无法溯源的数据。
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
  title: "观察珠穆朗玛峰地貌",
  subtitle: "从冰川前缘到雪峰顶部 · 认识高山地貌",
  emoji: "🏔️",
  meta: {
    placeLabel: "珠穆朗玛峰",
    region: "喜马拉雅山脉",
    typeLabel: "高山地貌",
    description:
      "世界最高峰（8,848.86 m）。从亚热带林带一路穿过针叶林、草甸、高山荒漠到永久积雪，在一条海拔剖面上看完整个地球的垂直自然带。",
    tags: ["世界屋脊", "垂直分带", "中尼联合测量"],
  },
  palette: ["#2a4a7f", "#7fa8d0", "#cfe0ee"],
  world: { style: "mountain" },
  startElevation: 0,
  maxElevation: 8848.86,
  estimatedMinutes: 10,
  baseTemperatureC: 26,
  lapseRateCPer1000: 6.5,
  seaLevelPressureHpa: 1013.25,
  vegetationTopM: 5200,
  climateSource: SRC_CLIMATE,
  source: SRC_WIKI_EVEREST,
  ui: {
    axisLabel: "海拔",
    axisUnit: "m",
    forwardLabel: "下一个地貌",
    forwardGlyph: "→",
    backLabel: "上一个地貌",
    backGlyph: "←",
    remainingLabel: "观察点",
    advanceHint: "上滑或点底部按钮浏览下一个地貌 · 点击节点查看解释",
    stagesLabel: "地貌主题",
    extentWord: "最高点",
  },
  destination: {
    label: "峰顶",
    title: "完成地貌观察！",
    tagline: "从冰川前缘看到雪峰顶部",
    emoji: "🏔️",
  },
  route: {
    id: "everest-south-col",
    name: "珠峰高山地貌观察序列",
    // 此路线是经典南坡攀登空间的参考表达；progress 映射教学用 0–8848.86m 轴，
    // altitude 只用于标示各营地的真实参考高度，不改变通用 Exploration Axis。
    //
    // Expedition 场景的位置真源：路线模式下，屏幕位置由「山体路径投影」给出
    // （data/routes/everest/visual-route.ts），waypoint 用 RouteIndex 里程碑进度
    // 吸附到路径上；这里的 x/y/progress 只服务于旧海拔轴（rail / 场景路线）。
    //
    // 卡片内容（nameEn/terrain/detail/facts/images）：图片为项目自制珠峰山体渲染
    // 的局部裁切（scripts/waypoints/build-waypoint-images.cjs），真实照片额外标注出处。
    waypoints: [
      {
        id: "base-camp",
        name: "南坡大本营",
        nameEn: "South Base Camp",
        shortName: "BC",
        altitude: 5364,
        progress: 0,
        x: 16,
        y: 79,
        terrain: "冰碛 / 冰川前缘",
        desc: "攀登活动的中枢：帐篷城、物资调度与海拔适应训练都在这里完成，前方就是昆布冰川。",
        detail:
          "南坡大本营驻扎在昆布冰川的冰面上，海拔约 5,364 m，是徒步终点也是攀登起点。登山队在此完成装备检查、冰川行走训练与高原适应；此后所有物资都由牦牛队与人力运抵这里，再向更高营地转运。",
        facts: [
          "海拔约 5,364 m，位于缓慢流动的昆布冰川表面",
          "帐篷区建在冰面上，会随冰体位移而需要重新平整",
          "南坡路线的补给与高原适应中枢",
        ],
        environment:
          "海拔 5,364 m 的冰碛平台上，盛夏白天约 -8 ℃，夜间更低；空气含氧量约为海平面的 53%，多数人到这里的头两天以休息适应为主。",
        risk:
          "高原反应从徒步段就可能出现；大本营的帐篷城随冰川缓慢移动，地面持续变形，须留意帐绳与裂隙。上方冰瀑的崩塌声在夜里清晰可闻。",
        history:
          "1953 年希拉里与丹增首次登顶的远征以此为前进基地；此后 70 余年，南坡大本营一直是喜马拉雅攀登的标志性场景，营地本身建在缓慢流动的昆布冰川冰面上。",
        whatToNotice:
          "看脚下：营地的冰碛石来自冰川沿途搬运；凌晨与傍晚观察冰瀑方向的崩塌声与烟尘，那是冰体在移动的证据。",
        knowledgeIds: ["k01", "k08", "khumbu-glacier"],
        sources: [SRC_WIKI_EVEREST, SRC_GLACIER],
        reviewStatus: "approved",
        mediaIds: ["ev-terrain-base-camp"],
      },
      {
        id: "khumbu-icefall",
        name: "昆布冰瀑",
        nameEn: "Khumbu Icefall",
        shortName: "冰瀑",
        altitude: 5870,
        progress: 0.16,
        x: 27,
        y: 67,
        terrain: "冰川 / 冰瀑",
        knowledgeId: "khumbu-glacier",
        desc: "冰川从山谷倾泻而下的移动冰塔区，攀登者需借铝梯穿越深达数十米的裂隙区。",
        detail:
          "昆布冰川在陡坎处断裂成数百座冰塔、深裂隙与不稳定的冰桥。冰体每天仍在缓慢移动，地形随之改变，因此每个登山季都要由修路队重新架设铝梯与固定绳。这是南坡最危险、也最需要快速通过的一段。",
        facts: [
          "冰川在自重下持续流动，冰塔与裂隙位置不断变化",
          "多数队伍选择凌晨气温最低时通过，降低冰体崩塌风险",
          "跨越裂隙主要依靠铝梯与固定绳",
        ],
        environment:
          "冰川陡坎上的移动冰塔区，海拔 5,400–6,000 m；气温在凌晨最低（约 -10 ℃ 级），此时冰体最稳定。",
        risk:
          "全路线最危险的一段：冰瀑崩塌、冰桥断裂与裂隙坠落构成持续威胁；多数队伍选择凌晨快速通过，不在此恋战。",
        history:
          "1950-51 年霍顿·赖特与夏尔巴向导首次确认可从冰瀑穿越进入西库姆——这条「冰电梯」正是南坡路线成立的前提；每年由「冰瀑医生」团队重新架设铝梯与固定绳。",
        whatToNotice:
          "观察冰塔的「层流」痕迹与裂隙走向：冰体沿基岩陡坎断裂成块，裂隙的排列方向暴露了冰川的流动方向。",
        knowledgeIds: ["k08", "khumbu-glacier", "k24"],
        sources: [SRC_GLACIER, SRC_WIKI_EVEREST],
        reviewStatus: "approved",
        mediaIds: ["ev-icefall-ladders", "ev-terrain-khumbu-icefall"],
      },
      {
        id: "camp-i",
        name: "C1 营地",
        nameEn: "Camp I",
        shortName: "C1",
        altitude: 6065,
        progress: 0.3,
        x: 39,
        y: 59,
        terrain: "冰川谷地 / 雪原",
        desc: "冰瀑之上的第一站，位于昆布冰川顶端的平缓雪原，通常只作短暂停留。",
        detail:
          "C1 位于昆布冰瀑顶端、冰川谷地的缓雪坡上，海拔约 6,065 m。队伍通过冰瀑后在此短暂停留、补充水分，然后继续向珠峰与洛子峰之间的西库姆冰谷推进。",
        facts: [
          "海拔约 6,065 m",
          "位于冰瀑之上、西库姆冰谷入口",
          "通常作为通过冰瀑后的第一个短停点",
        ],
        environment:
          "海拔约 6,065 m 的雪原谷地，含氧量约为海平面的 47%；白天雪面反射强烈，夜间辐射冷却极快。",
        risk: "冰瀑仍在头顶：C1 的危险性主要来自上方冰体；停留时间宜短，物资尽早转运。",
        history:
          "1952 年瑞士远征首次打通冰瀑抵达此处（未登顶）；自那以后 C1 一直是每个攀登季的第一个高海拔宿营点。",
        whatToNotice:
          "看谷地两侧的冰碛：珠峰西南壁与努子峰之间的谷底仍属冰川系统，冰面融水在正午形成小溪流。",
        knowledgeIds: ["k08"],
        sources: [SRC_WIKI_EVEREST],
        reviewStatus: "approved",
        mediaIds: ["ev-terrain-camp-i"],
      },
      {
        id: "western-cwm-camp-ii",
        name: "西库姆 · C2 营地",
        nameEn: "Western Cwm · Camp II",
        shortName: "C2",
        altitude: 6500,
        progress: 0.46,
        x: 54,
        y: 52,
        terrain: "雪谷 / 冰斗",
        desc: "珠峰与洛子峰之间的冰雪谷地，阳光反射令谷内温度骤升，是高山适应与补给的枢纽。",
        detail:
          "西库姆（Western Cwm）是珠峰与洛子峰之间的宽阔冰川盆地，被英国登山者称作「寂静之谷」。谷内积雪强烈反射阳光，白天的体感温度可远高于同海拔的开阔风区；它同时也是南坡适应与补给的关键一站。",
        facts: [
          "海拔约 6,500 m 的宽阔雪谷",
          "两侧分别是珠峰西南壁与洛子峰北壁",
          "强烈日照反射使谷内体感温度偏高",
        ],
        environment:
          "海拔约 6,500 m 的宽阔雪谷：阳光经两侧冰雪强烈反射，谷内白昼体感温度可明显高于同海拔的开阔风区，紫外线几乎无衰减。",
        risk:
          "「雪盲」与脱水是西库姆的隐形风险；洛子壁下缘的雪崩通道需按通行窗口通过；夜间气温可到 -20 ℃ 量级。",
        history:
          "1952 年瑞士远征队率先进入西库姆（Shangri-La 之名即出自他们），这里从此成为南坡适应训练的核心营地。",
        whatToNotice:
          "留意两侧壁的对比：左侧珠峰西南壁陡峻，右侧洛子峰北壁平直高耸——洛子壁就是通往 C3 与南坳的「墙」。",
        knowledgeIds: ["k02"],
        sources: [SRC_WIKI_EVEREST],
        reviewStatus: "approved",
        mediaIds: ["ev-b1-western-cwm", "ev-terrain-western-cwm-camp-ii"],
      },
      {
        id: "lhotse-face-camp-iii",
        name: "洛子壁 · C3 营地",
        nameEn: "Lhotse Face · Camp III",
        shortName: "C3",
        altitude: 7200,
        progress: 0.64,
        x: 63,
        y: 39,
        terrain: "陡峭冰壁 / 固定绳",
        desc: "沿固定绳索攀上洛子峰冰壁，坡度陡哨、冰况多变，技术攀登从这里开始。",
        detail:
          "洛子壁是通往南坳的一段连续冰坡，坡度陡、冰面硬，攀登全程沿固定绳行进。C3 就挂在冰坡上的窄平台，海拔约 7,200 m；再向上便是南坳，以及 8,000 m 死亡区的边缘。",
        facts: [
          "海拔约 7,200 m 的持续陡坡",
          "全程铺设固定绳，需使用冰爪与上升器",
          "进入南坳前最后一个常规营地",
        ],
        environment:
          "连续陡峭冰壁上的窄平台，海拔约 7,200 m；含氧量约为海平面的 42%，气温常在 -15 ℃ 以下。",
        risk:
          "滑坠是最大威胁：硬冰雪坡全程依赖固定绳与上升器；洛子壁亦常有落石与流雪，C3 的帐篷挂在小平台上，暴露感极强。",
        history:
          "1953 年英国远征经此推进至南坳；C3 一带的地形自那以后变化不大，但冰况逐年不同，修路质量直接决定通过速度。",
        whatToNotice:
          "看固定绳的走向：绳路每隔数米打结固定在冰锥上，攀登者以「jumar（上升器）」逐结上移——冰壁的地形决定了绳的位置。",
        knowledgeIds: ["k07"],
        sources: [SRC_WIKI_EVEREST],
        reviewStatus: "approved",
        mediaIds: ["ev-c1-yellow-band", "ev-terrain-lhotse-face-camp-iii"],
      },
      {
        id: "south-col-camp-iv",
        name: "南坳 · C4 营地",
        nameEn: "South Col · Camp IV",
        shortName: "南坳",
        altitude: 7906,
        progress: 0.78,
        x: 76,
        y: 31,
        terrain: "高山鞍部 / 死亡区边缘",
        knowledgeId: "death-zone",
        desc: "冲顶前的最后营地，位于珠峰与洛子峰之间的鞍部；再向上，就进入死亡区。",
        detail:
          "南坳是珠峰与洛子峰之间的鞍部，海拔约 7,906 m，常年强风。冲顶前的最后一晚通常留在这里：队伍在夜色中出发，向上便进入 8,000 m 以上的死亡区，氧气与体能都开始按分钟计算。",
        facts: [
          "海拔约 7,906 m 的鞍部营地",
          "位于珠峰与洛子峰之间，风大而暴露",
          "冲顶通常从此处凌晨出发",
        ],
        environment:
          "海拔约 7,906 m 的鞍部：常年强风，含氧量约为海平面的 40%，体感温度远低于气温——这里被称为「登山者的赌场」。",
        risk:
          "冲顶前最后的宿营点：强风掀翻帐篷、夜间冻结与急性高原反应都在这里发生；冲顶窗口一旦错过，就只能等待下一个周期。",
        history:
          "1952 年瑞士队首抵南坳（未登顶）；1953 年希拉里与丹增从南坳出发完成人类首次登顶。此后南坳成为所有南坡冲顶的起点与退守地。",
        whatToNotice:
          "看两侧：珠峰一侧是「黄色带」的岩层露头，洛子一侧是断崖；风从鞍部横穿而过，帐篷旗绳几乎始终指着同一方向。",
        knowledgeIds: ["k07", "death-zone"],
        sources: [SRC_WIKI_EVEREST],
        reviewStatus: "approved",
        mediaIds: ["ev-terrain-south-col-camp-iv"],
      },
      {
        id: "south-summit",
        name: "南峰 · 最终雪脊",
        nameEn: "South Summit",
        shortName: "南峰",
        altitude: 8749,
        progress: 0.9,
        x: 66,
        y: 19,
        terrain: "雪脊 / 暴露山脊",
        desc: "冲顶前最后一道凸起，翻过南峰后是暴露的雪脊与断崖，峰顶已在眼前。",
        detail:
          "南峰是主峰之前最后一道凸起，海拔约 8,749 m。翻过南峰后是一段暴露的雪脊，两侧皆为陡崖；希拉里台阶就在这段路上。峰顶已经在视野里，但体能与氧气也接近极限，绝大多数事故都发生在这段往返之中。",
        facts: [
          "海拔约 8,749 m，与主峰高差约 100 m",
          "雪脊两侧为陡崖，风大且暴露",
          "希拉里台阶位于南峰与主峰之间",
        ],
        environment:
          "海拔约 8,749 m 的雪脊：含氧量约为海平面的 34%，风速大且暴露感极强；天气窗口极短。",
        risk:
          "雪脊两侧皆为千米断崖，风与缺氧在此叠满；2015 年地震后希拉里台阶地形发生变化，路线难度与风险相应调整。",
        history:
          "南峰是 1953 年首登路线的最后难关之一：希拉里正是在这段岩缝（后称「希拉里台阶」）完成了关键攀爬。",
        whatToNotice:
          "回头看一眼来路：南坳与洛子壁缩成一条线——这也是判断「是否还有体力继续」的最后参照点。",
        knowledgeIds: ["k32", "k31"],
        sources: [SRC_WIKI_EVEREST],
        reviewStatus: "approved",
        mediaIds: ["ev-terrain-south-summit"],
      },
      {
        id: "summit",
        name: "珠峰峰顶",
        nameEn: "Everest Summit",
        shortName: "峰顶",
        altitude: 8848.86,
        progress: 1,
        x: 53,
        y: 9,
        terrain: "雪峰顶部 / 极高山",
        knowledgeId: "summit-height",
        desc: "地球海拔最高点。2020 年中尼联合测量高程 8,848.86 m。",
        detail:
          "地球海拔最高点。2020 年 12 月，中国与尼泊尔联合公布最新高程 8,848.86 m。峰顶气压约 335 hPa，含氧量不足海平面的三分之一，登山者通常只能停留很短时间，随后必须尽快下撤。",
        facts: [
          "2020 年联合公布高程 8,848.86 m",
          "峰顶气压约 335 hPa ≈ 海平面的三分之一",
          "停留时间通常仅数十分钟，天气窗口极短",
        ],
        environment:
          "海拔 8,848.86 m：气压约 335 hPa（海平面约 1/3），含氧量不足海平面的 1/3，盛夏白昼气温也在 -25 ℃ 以下。",
        risk:
          "死亡区的顶端：高原肺水肿/脑水肿、失温与判断力下降随时可能发生；停留时间通常只有数十分钟，随后必须尽快下撤。",
        history:
          "1953-05-29 希拉里与丹增首次登顶；2020-12-08 中尼联合公布最新高程 8,848.86 m——峰顶曾是特提斯海的海底，如今是地球海拔最高的点。",
        whatToNotice:
          "看脚下的石灰岩：峰顶岩石是约 4 亿年前海底沉积的灰岩；向北望去，整个青藏高原在云层之上展开。",
        knowledgeIds: ["k31", "k32", "summit-height"],
        sources: [SRC_ZH_2020, SRC_WIKI_EVEREST],
        reviewStatus: "approved",
        mediaIds: ["ev-terrain-summit"],
      },
    ],
  },
  metrics: [
    {
      key: "temperature",
      label: "气温",
      icon: "🌡️",
      unit: "°C",
      curve: [
        [0, 26],
        [2500, 9.8],
        [5000, -6.5],
        [7500, -22.8],
        [8848, -31.5],
      ],
      source: SRC_CLIMATE,
    },
    {
      key: "pressure",
      label: "大气压",
      icon: "🎈",
      unit: "hPa",
      curve: [
        [0, 1013],
        [1500, 836],
        [3000, 654],
        [5000, 542],
        [7000, 422],
        [8848, 335],
      ],
      source: SRC_O2,
    },
    {
      key: "oxygen",
      label: "含氧量",
      icon: "💨",
      percent: true,
      curve: [
        [0, 1],
        [1500, 0.826],
        [3000, 0.646],
        [5000, 0.535],
        [7000, 0.417],
        [8848, 0.331],
      ],
      source: SRC_O2,
    },
    {
      key: "wind",
      label: "风力",
      icon: "🌀",
      unit: "km/h",
      curve: [
        [0, 10],
        [3000, 40],
        [5000, 60],
        [7000, 85],
        [8848, 110],
      ],
      source: SRC_O2,
    },
  ],
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
      palette: ["#3f5f8f", "#7696b8", "#b9c8d8"],
      terrainTint: ["#3f5a40", "#1b3a26"],
      surfaceKind: "forest",
      flora: ["🌴", "🌿", "🌳", "🦜"],
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
      palette: ["#4a6f9d", "#89b4d4", "#c2d8e8"],
      terrainTint: ["#3d6a45", "#284a35"],
      surfaceKind: "forest",
      flora: ["🌲", "🌳", "🐿️", "🌿"],
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
      palette: ["#5579a6", "#9db9ce", "#c7d2d2"],
      terrainTint: ["#5a7a52", "#3a5235"],
      surfaceKind: "alpine",
      flora: ["🌲", "🌼", "🏡", "🦅"],
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
      palette: ["#5a83ba", "#b5d0e6", "#d3d5bd"],
      terrainTint: ["#6a7455", "#3f4a36"],
      surfaceKind: "meadow",
      flora: ["🌼", "🌾", "🐑", "🦌"],
      description: "树线在此消失，脚下起伏的草甸与灌丛低矮坚韧。",
    },
    {
      id: "alpine-high",
      elevation: 5000,
      name: "高山荒漠带",
      biome: "裸岩 · 针叶稀疏",
      emoji: "🪨",
      temperatureC: -6.5,
      snow: 0.25,
      fog: 0.35,
      wind: 0.35,
      palette: ["#4f74ae", "#9fb0d6", "#cfd9d8"],
      terrainTint: ["#6f6f68", "#454a42"],
      surfaceKind: "barren",
      flora: ["🪨", "⛰️", "🌾"],
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
      palette: ["#47679c", "#9fb8d8", "#cfdbda"],
      terrainTint: ["#7d7f76", "#4a4f44"],
      surfaceKind: "barren",
      flora: ["⛺", "🪨", "🧊"],
      description: "登山者中转营地（5,364m）：前方就是昆布冰川与冰瀑。",
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
      palette: ["#3d5fa8", "#6f9cc4", "#bcd6e4"],
      terrainTint: ["#a9b6c6", "#5e6c82"],
      surfaceKind: "snow",
      flora: ["❄️", "🧊"],
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
      palette: ["#2f5a94", "#8f96c4", "#b6cdea"],
      terrainTint: ["#c9d6e6", "#46607f"],
      surfaceKind: "glacier",
      flora: ["🧊", "🗻", "❄️"],
      description:
        "昆布冰瀑是南坡大本营以上真正的第一道险关，冰川在脚下缓慢流动、不断崩裂。",
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
      palette: ["#1e3d7a", "#4f7cbf", "#a8c4e4"],
      terrainTint: ["#aab6c8", "#4a5870"],
      surfaceKind: "death",
      flora: ["⛰️", "🪨", "❄️"],
      description:
        "约 7,900m 的最后冲顶营地；整装后再向上，才会真正跨入 8,000m 死亡区。",
    },
    {
      id: "death-zone",
      elevation: 8000,
      name: "死亡区",
      biome: "极低压 · 高风速冰岩",
      emoji: "🫁",
      temperatureC: -26,
      snow: 0.88,
      fog: 0.32,
      wind: 0.7,
      palette: ["#193663", "#4777b6", "#a5c1e2"],
      terrainTint: ["#bbc9d9", "#4b5b76"],
      surfaceKind: "death",
      flora: ["🪨", "❄️", "🏔️"],
      description: "8,000m 以上没有长期生存余地；离开南坳后，攀登进入真正的冲顶路段。",
    },
    {
      id: "summit-ridge",
      elevation: 8340,
      name: "最终雪脊",
      biome: "极高山冰岩 · 雪山脊",
      emoji: "🏔️",
      temperatureC: -23.2,
      snow: 0.92,
      fog: 0.28,
      wind: 0.7,
      palette: ["#16345f", "#4f7cbf", "#a8c4e4"],
      terrainTint: ["#cfdcea", "#4a5870"],
      surfaceKind: "snow",
      flora: ["🏔️", "❄️", "🪨"],
      description:
        "跨过南峰，最终雪脊两侧都是千米断崖；风把积雪吹成旗云，峰顶已在前方。",
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
      palette: ["#0e2a54", "#3d5fa8", "#9db8e4"],
      terrainTint: ["#dfe9f2", "#6d80a0"],
      surfaceKind: "summit",
      flora: ["🚩", "❄️", "🏔️"],
      description: "8848.86 米。苍穹之下，云海臣服于你的脚下。",
    },
  ],
  knowledgeNodes: [
    {
      id: "lukla-forest",
      knowledgeId: "k09", // 对应知识库「什么是季风」
      elevation: 2600,
      emoji: "🌲",
      title: "为什么南坡林带这么高？",
      category: "气候",
      summary:
        "印度洋暖湿季风在翻越 7,000m 山峰前，在南坡制造了超长的湿润森林带。",
      detail:
        "喜马拉雅南坡正对着印度洋，夏季风带来大量水汽、受地形抬升成云致雨，因此南坡从山脚直到约 4,000 米都被常绿阔叶林、针叶林和杜鹃灌丛覆盖，而同海拔的北坡（西藏侧）却大都是荒原。",
      facts: [
        {
          label: "南坡林带上限",
          value: "约 4,200 m（热带林到高山草甸的过渡）",
          source: SRC_WIKI_EVEREST,
        },
        {
          label: "北坡同海拔",
          value: "以裸岩与草原为主，对比鲜明",
          source: SRC_WIKI_EVEREST,
        },
      ],
      sources: [SRC_WIKI_EVEREST],
      quiz: {
        id: "qz-lukla-forest",
        lead: "刚看过南坡的森林，答对这一题更透彻：",
        question: "喜马拉雅南坡比北坡湿润得多，主要原因是？",
        options: ["夏季风带来印度洋水汽", "高山冰川融化", "人工大面积灌溉", "湖泊蒸发"],
        answerIndex: 0,
        explanation:
          "南坡面对孟加拉湾与印度洋，夏季风气流被地形强烈抬升、成云致雨，形成高降水带；北坡背风少雨，多为荒原草甸。",
        emoji: "🌧️",
        source: SRC_WIKI_EVEREST,
      },
    },
    {
      id: "lapse-rate",
      knowledgeId: "k01", // 对应知识库「为什么海拔越高气温越低」
      elevation: 3600,
      emoji: "🌡️",
      title: "海拔每上升 1000 米，气温约降 6℃",
      category: "气候",
      summary: "空气越往上越稀薄，膨胀降温，所以山地越高越冷。",
      detail:
        "对流层内的平均温度直减率约 6.5℃/1000m：你每升高一公里，周围空气就冷约 6-7℃。这也就是为什么同一天，山脚可以穿短袖，峰顶却是零下几十度。",
      facts: [
        {
          label: "标准直减率",
          value: "约 6.5 ℃/1000m（对流层平均近似）",
          source: SRC_CLIMATE,
        },
        {
          label: "本场景模型",
          value: "26℃ - 6.5 ℃/km × 海拔(km)（近似）",
          source: SRC_CLIMATE,
        },
      ],
      sources: [SRC_CLIMATE],
      quiz: {
        id: "qz-lapse-rate",
        lead: "你刚亲身体会了一路的变冷：",
        question: "对流层内海拔每上升 1,000 m，气温大约下降多少？",
        options: ["约 6.5 ℃", "约 0.65 ℃", "约 15 ℃", "约 2 ℃"],
        answerIndex: 0,
        explanation: "对流层平均温度直减率约 6.5℃/1000m，这是标准大气模型的常用近似值。",
        emoji: "🌡️",
        source: SRC_CLIMATE,
      },
    },
    {
      id: "alpine-oblue",
      knowledgeId: "k04", // 对应知识库「山体为什么会垂直分带」
      elevation: 4400,
      emoji: "🪵",
      title: "树木去哪？——「树线」",
      category: "地形地貌",
      summary: "再往上是树木存在的极限，草甸与灌丛继续向上，直到连草也长不出。",
      detail:
        "海拔越高，气温越低、风越大、生长季越短，树木首先扛不住，形成树线（南坡约 4,000–4,300m）。树线上方是无林的高山草甸；再往上是裸露的裸岩与冰雪世界——高山乔木变成矮林、灌丛与草甸。",
      facts: [
        {
          label: "南坡树线",
          value: "约 4,200 m，之上只有灌丛与草甸",
          source: SRC_WIKI_EVEREST,
        },
        {
          label: "永久雪线",
          value: "南坡约 5,000–5,500m 之间（近似）",
          source: SRC_WIKI_EVEREST,
        },
      ],
      sources: [SRC_WIKI_EVEREST],
      quiz: {
        id: "qz-tree-line",
        lead: "刚才的“树线”知识，考你一下：",
        question: "喜马拉雅南坡树木生长的最高海拔（树线）大约在？",
        options: ["约 4,200 m", "约 2,200 m", "约 6,600 m", "约 8,000 m"],
        answerIndex: 0,
        explanation:
          "树木受低温、大风与生长季太短限制，南坡树线约在 4,000–4,300m；之上是灌木、草甸最后过渡到裸岩与冰雪。",
        emoji: "🪵",
        source: SRC_WIKI_EVEREST,
      },
    },
    {
      id: "snowline-kzha",
      knowledgeId: "k02", // 对应知识库「雪线是什么」
      elevation: 5700,
      emoji: "❄️",
      title: "雪线：从此便是“永久积雪”",
      category: "地形地貌",
      summary: "这个高度以上，夏季积雪也无法全部融化，年复一年堆积成冰川。",
      detail:
        "雪线是“永久积雪”的下界；雪线上方哪怕在最热的夏季，降雪的量也大于消融，于是积雪年复一年压实成冰。珠峰南坡雪线约在 5,000–5,500m——从这一刻起，脚下失去大部分色彩，变成「冰与岩」的世界。",
      facts: [
        {
          label: "南坡雪线",
          value: "约 5,000–5,500 m（近似，随坡向/季节浮动）",
          source: SRC_WIKI_EVEREST,
        },
      ],
      sources: [SRC_WIKI_EVEREST],
      quiz: {
        id: "qz-snowline",
        lead: "你刚刚跨过雪线：",
        question: "“雪线”指的是？",
        options: [
          "永久积雪区的下界",
          "夏季融雪停止的位置",
          "全年下雪的纬度",
          "冰川形成的上界",
        ],
        answerIndex: 0,
        explanation:
          "雪线是常年积雪的下界，其上方积雪终年不融化、逐年压成冰并形成冰川。",
        emoji: "❄️",
        source: SRC_WIKI_EVEREST,
      },
    },
    {
      id: "khumbu-glacier",
      knowledgeId: "k08", // 对应知识库「冰川其实在流动」
      elevation: 6300,
      emoji: "🧊",
      title: "冰川不是死的——它在流动",
      category: "地质",
      summary: "积雪一年年压实成冰，在自重下像“高压熔岩”一样向下缓慢蠕动。",
      detail:
        "位于大本营与 C1 之间的昆布冰川是珠峰南麓最著名的冰川。积雪在自重下缓慢压实成冰，冰体在重力作用下不断向下流动，几年的时间就能走过公里级别的距离；因此表面布满裂隙与冰塔，地貌随时变化，攀登难度极大。",
      facts: [
        {
          label: "昆布冰川范围",
          value: "从大本营(5,364m）向上延伸至约 6,400m+",
          source: SRC_GLACIER,
        },
        {
          label: "冰流速度",
          value: "数量级缓慢（每年数米~十余米，近似）",
          source: SRC_GLACIER,
        },
      ],
      sources: [SRC_GLACIER],
      quiz: {
        id: "qz-glacier",
        lead: "该冰川其实一直在“动”：",
        question: "昆布冰川的冰体在自身重力下主要表现为？",
        options: ["缓慢向下流动", "原地冻结不动", "向上持续抬升", "整块快速剥落"],
        answerIndex: 0,
        explanation:
          "冰川是高压缩的塑性冰体，在重力驱动下以缓慢速度流动（数年十年走完公里级），因此表面充满裂隙并不断变化。",
        emoji: "🧊",
        source: SRC_GLACIER,
      },
    },
    {
      id: "death-zone",
      knowledgeId: "k07", // 对应知识库「死亡区为何危险」
      elevation: 7950,
      emoji: "🫁",
      title: "为什么要给 8,000m 以上叫「死亡区」",
      category: "气候",
      summary: "空气这么稀薄、氧只剩海平面约 1/3，人体一点一点失去修复能力。",
      detail:
        "在 8,000m 以上的「死亡区（Death Zone）」，气压仅约海平面的三成，人体几乎无法靠自然呼吸维持长期生存——细胞缺氧、判断力下降，甚至各器官衰竭。这就是为什么登顶前后要在“出击窗口”中速战速决。",
      facts: [
        {
          label: "8,848m 峰顶气压",
          value: "约 335 hPa ≈ 海平面 1/3",
          source: SRC_O2,
        },
        {
          label: "死亡区范围",
          value: "约 8,000m 以上（近似）",
          source: SRC_WIKI_EVEREST,
        },
      ],
      sources: [SRC_O2],
      quiz: {
        id: "qz-death-zone",
        lead: "你正走进“死亡区”，考考这道空气题：",
        question: "珠峰峰顶（8,848m）的大气含氧量约为海平面的？",
        options: ["约 1/3", "约 1/2", "约 1/5", "约 2/3"],
        answerIndex: 0,
        explanation:
          "峰顶气压约 335 hPa，约为海平面（1,013 hPa）的 1/3，故 8,000m 以上被称为“死亡区”。",
        emoji: "🫁",
        source: SRC_O2,
      },
    },
    {
      id: "summit-height",
      knowledgeId: "k31", // 对应知识库「1953 年首次登顶」（高程 + 登顶史互为注脚）
      elevation: 8848.86,
      emoji: "🇨🇳🇳🇵",
      title: "8848.86：中尼两国用了同一把尺",
      category: "世界地理",
      summary: "2020 年，中国与尼泊尔联合测量，共同宣布珠峰高度为 8848.86 米。",
      detail:
        "2020 年 12 月 8 日，中尼双方联合发布最新高程：**8848.86 m**，取代此前两队的 8844.43m（中国测）与 8848m（英/尼历）。测量结合卫星定位（GNSS）、微波测距、雪深雷达等方法，并首次统一两国基准换算。",
      facts: [
        {
          label: "官方高程",
          value: "8,848.86 m（2020 年联合公布）",
          source: SRC_ZH_2020,
        },
        {
          label: "首次登顶",
          value: "1953 年（Hillary / Norgay）",
          source: SRC_WIKI_EVEREST,
        },
      ],
      sources: [SRC_ZH_2020],
      quiz: {
        id: "qz-summit-height",
        lead: "最后这一题，值得骄傲：",
        question: "2020 年中尼联合测量公布的世界最高峰海拔是？",
        options: ["8,848.86 m", "8,848 m", "8,844.43 m", "8,798 m"],
        answerIndex: 0,
        explanation: "2020 年 12 月中国与尼泊尔联合公布珠峰最新高程 8,848.86 m。",
        emoji: "🏔️",
        source: SRC_ZH_2020,
      },
    },
  ],
};

/** 珠峰的可选探索区高度范围（供地图/摘要展示） */
export const EVEREST_BAND = {
  from: EVEREST.startElevation,
  to: EVEREST.maxElevation,
};
