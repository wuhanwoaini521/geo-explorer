const DEFAULT_MAX_DEPTH_M = 10935;

export type MarianaZoneId =
  | "sunlight"
  | "twilight"
  | "midnight"
  | "abyssal"
  | "hadal";

export interface MarianaPresentation {
  depthM: number;
  progress: number;
  zoneId: MarianaZoneId;
  zoneName: string;
  zoneNameEn: string;
  zoneRange: string;
  pressureText: string;
  lightText: string;
  temperatureText: string;
  remainingBottomText: string;
  waterGradient: string;
  surfaceOpacity: number;
  rayOpacity: number;
  bubbleOpacity: number;
  marineSnowOpacity: number;
  trenchOpacity: number;
  bottomOpacity: number;
  darknessOpacity: number;
  railTopPercent: number;
  /** 海面出发阶段展示经核验的历史任务档案；深水区不把它伪装成环境照片。 */
  surfaceArchiveVisible: boolean;
  atBottom: boolean;
}

interface OceanZone {
  id: MarianaZoneId;
  fromM: number;
  toM: number;
  name: string;
  nameEn: string;
  range: string;
  gradient: string;
}

const OCEAN_ZONES: OceanZone[] = [
  {
    id: "sunlight",
    fromM: 0,
    toM: 200,
    name: "阳光带",
    nameEn: "SUNLIGHT ZONE",
    range: "0–200 m",
    gradient:
      "linear-gradient(180deg, #2ebde5 0%, #0877ae 48%, #06436d 100%)",
  },
  {
    id: "twilight",
    fromM: 200,
    toM: 1000,
    name: "微光带",
    nameEn: "TWILIGHT ZONE",
    range: "200–1,000 m",
    gradient:
      "linear-gradient(180deg, #075a87 0%, #073452 48%, #061f36 100%)",
  },
  {
    id: "midnight",
    fromM: 1000,
    toM: 4000,
    name: "黑暗带",
    nameEn: "MIDNIGHT ZONE",
    range: "1,000–4,000 m",
    gradient:
      "linear-gradient(180deg, #071f35 0%, #041423 52%, #020a14 100%)",
  },
  {
    id: "abyssal",
    fromM: 4000,
    toM: 6000,
    name: "深渊带",
    nameEn: "ABYSSAL ZONE",
    range: "4,000–6,000 m",
    gradient:
      "linear-gradient(180deg, #04121f 0%, #020b14 50%, #01070d 100%)",
  },
  {
    id: "hadal",
    fromM: 6000,
    toM: Number.POSITIVE_INFINITY,
    name: "超深渊带",
    nameEn: "HADAL ZONE",
    range: "6,000–10,935 m",
    gradient:
      "linear-gradient(180deg, #020b13 0%, #01070c 48%, #000306 100%)",
  },
];

const TEMPERATURE_POINTS: Array<[number, number]> = [
  [0, 27],
  [50, 26],
  [200, 16],
  [1000, 5],
  [3000, 2],
  [4500, 1.4],
  [10935, 2.1],
];

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function roundOpacity(value: number): number {
  return Math.round(clamp01(value) * 100) / 100;
}

function groupThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function zoneAt(depthM: number): OceanZone {
  return (
    OCEAN_ZONES.find(
      (zone) => depthM >= zone.fromM && depthM < zone.toM,
    ) ?? OCEAN_ZONES[OCEAN_ZONES.length - 1]
  );
}

function temperatureAtDepth(depthM: number): number {
  for (let index = 0; index < TEMPERATURE_POINTS.length - 1; index += 1) {
    const [fromDepth, fromValue] = TEMPERATURE_POINTS[index];
    const [toDepth, toValue] = TEMPERATURE_POINTS[index + 1];
    if (depthM <= toDepth) {
      const ratio = clamp01((depthM - fromDepth) / (toDepth - fromDepth));
      return fromValue + (toValue - fromValue) * ratio;
    }
  }
  return TEMPERATURE_POINTS[TEMPERATURE_POINTS.length - 1][1];
}

function lightAtDepth(depthM: number): string {
  if (depthM <= 50) {
    return `${Math.round(100 - depthM)}%`;
  }
  if (depthM < 200) {
    return `${Math.max(1, Math.round(50 - ((depthM - 50) / 150) * 49))}%`;
  }
  if (depthM < 1000) return "<1%";
  return "0%";
}

/**
 * 将深度转换成马里亚纳专属展示状态。
 *
 * 这里只生成可验证的物理近似和 UI 参数，不携带任何照片或“实拍”声明。
 * 页面可安全地用这些参数组合水柱、海雪、海沟侧壁和抵底地貌。
 */
export function marianaPresentationAt(
  inputDepthM: number,
  inputMaxDepthM = DEFAULT_MAX_DEPTH_M,
): MarianaPresentation {
  const maxDepthM = Math.max(1, inputMaxDepthM);
  const depthM = Math.min(maxDepthM, Math.max(0, inputDepthM));
  const progress = clamp01(depthM / maxDepthM);
  const zone = zoneAt(depthM);
  const trenchProgress = clamp01((depthM - 5000) / 2500);
  const bottomProgress = clamp01(
    (depthM - 9000) / Math.max(1, maxDepthM - 9000),
  );

  return {
    depthM,
    progress: Math.round(progress * 1000) / 1000,
    zoneId: zone.id,
    zoneName: zone.name,
    zoneNameEn: zone.nameEn,
    zoneRange: zone.range,
    pressureText: `${groupThousands(1 + depthM / 10)} atm`,
    lightText: lightAtDepth(depthM),
    temperatureText: `${temperatureAtDepth(depthM).toFixed(1)}°C`,
    remainingBottomText:
      depthM >= maxDepthM - 0.5
        ? "已抵达"
        : `${groupThousands(maxDepthM - depthM)} m`,
    waterGradient: zone.gradient,
    surfaceOpacity: roundOpacity(1 - depthM / 800),
    rayOpacity: roundOpacity(
      depthM <= 200
        ? 0.9 - (depthM / 200) * 0.48
        : 0.42 * (1 - (depthM - 200) / 800),
    ),
    bubbleOpacity: roundOpacity(0.82 * (1 - depthM / 1200)),
    marineSnowOpacity: roundOpacity((depthM - 650) / 1000),
    trenchOpacity: roundOpacity(trenchProgress),
    bottomOpacity: roundOpacity(bottomProgress),
    darknessOpacity: roundOpacity((depthM - 180) / 3200),
    railTopPercent: Math.round((8 + progress * 84) * 10) / 10,
    surfaceArchiveVisible: depthM <= 120,
    atBottom: depthM >= maxDepthM - 0.5,
  };
}
