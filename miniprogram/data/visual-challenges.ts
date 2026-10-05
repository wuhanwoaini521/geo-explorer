/**
 * Photo-recognition questions assembled from approved, real place/waypoint photos.
 * The source records stay authoritative for the photo, location and landform type.
 */
import { PLACE_TYPE_LABEL, getPlaceById } from "./places";
import { getPlaceHeroImage, getWaypointHeroImage } from "./media/world-manifests";
import type { PlaceType, Quiz } from "../types/models";

interface VisualPromptSource {
  id: string;
  entityType: "place" | "waypoint";
  entityId: string;
  name: string;
  type: PlaceType;
  explanation: string;
  alt: string;
}

const SOURCES: VisualPromptSource[] = [
  {
    id: "photo-everest",
    entityType: "place",
    entityId: "p-everest",
    name: "珠穆朗玛峰",
    type: "mountain",
    explanation: "珠峰是喜马拉雅山脉的高峰，照片来源是该地点登记的实景封面。",
    alt: "从 Kala Patthar 远眺珠穆朗玛峰与昆布冰川",
  },
  {
    id: "photo-icefall",
    entityType: "waypoint",
    entityId: "khumbu-icefall",
    name: "昆布冰瀑",
    type: "glacier",
    explanation: "昆布冰瀑是流动冰川表面形成的冰裂隙与冰塔地形。",
    alt: "登山者在昆布冰瀑实景中穿越冰裂隙",
  },
  {
    id: "photo-mariana",
    entityType: "place",
    entityId: "p-mariana",
    name: "代表性深海环境",
    type: "ocean",
    explanation: "这张 Ifremer 实景照片展示深海热液喷口与悬浮颗粒，仅用于识别深海环境，并非马里亚纳海沟原位影像。",
    alt: "深海热液喷口与海雪的代表性实景照片，不代表马里亚纳海沟原位环境",
  },
  {
    id: "photo-colorado",
    entityType: "place",
    entityId: "p-colorado",
    name: "科罗拉多大峡谷",
    type: "canyon",
    explanation: "科罗拉多河长期下切塑造出层次分明的大峡谷。",
    alt: "科罗拉多大峡谷南缘实景全景",
  },
  {
    id: "photo-fuji",
    entityType: "place",
    entityId: "p-fuji",
    name: "富士山",
    type: "volcano",
    explanation: "富士山是由多期喷发形成的层状火山。",
    alt: "山中湖方向拍摄的富士山实景",
  },
];

const OPTION_TYPES: PlaceType[] = ["mountain", "ocean", "canyon", "volcano", "glacier"];
const OPTION_LABELS = OPTION_TYPES.map((type) => PLACE_TYPE_LABEL[type]);

function imageFor(source: VisualPromptSource): string | undefined {
  return source.entityType === "place"
    ? getPlaceHeroImage(source.entityId)
    : getWaypointHeroImage(source.entityId);
}

function sourceIsApproved(source: VisualPromptSource): boolean {
  if (source.entityType === "place") {
    const place = getPlaceById(source.entityId);
    return Boolean(place && place.type === source.type && imageFor(source));
  }
  return Boolean(imageFor(source));
}

export const VISUAL_LANDFORM_QUIZZES: Quiz[] = SOURCES.filter(sourceIsApproved).map((source) => ({
  id: source.id,
  question: "观察这张实景照片，最符合的地貌类型是？",
  type: "guess-landform",
  options: OPTION_LABELS,
  answerIndex: OPTION_TYPES.indexOf(source.type),
  explanation: `${source.name}：${source.explanation}`,
  category: "地形地貌",
  difficulty: 1,
  emoji: "",
  visualSrc: imageFor(source),
  visualAlt: source.alt,
}));
