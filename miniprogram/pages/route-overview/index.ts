import { EVEREST_EXPEDITION } from "../../data/expeditions/everest";
import { RUNTIME_MANIFESTS } from "../../data/media/world-manifests";
import { getMediaForEntity } from "../../engine/media-registry";
import {
  buildObservationPoints,
  formatObservationElevation,
  observationLabel,
} from "../../engine/expedition-observation";

interface RouteRow {
  id: string;
  title: string;
  landform: string;
  elevation: string;
  image: string;
  imageLabel: string;
  roleLabel: string;
  state: "completed" | "current" | "upcoming";
  stateLabel: string;
}

const FALLBACK_HERO = "/assets/expeditions/everest/live/live-a-kala-patthar.jpg";

function formatKm(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

function imageForWaypoint(id: string): { path: string; label: string } {
  const assets = getMediaForEntity(RUNTIME_MANIFESTS, "waypoint", id);
  const asset = assets.find((item) => item.kind === "photograph") ?? assets[0];
  if (!asset) return { path: FALLBACK_HERO, label: "路线参考图" };
  return {
    path: asset.localPath,
    label: asset.kind === "photograph" ? "现场照片" : "地形示意",
  };
}

function rows(progress: number): RouteRow[] {
  const ordered = EVEREST_EXPEDITION.routeIndex.milestones;
  const points = buildObservationPoints(EVEREST_EXPEDITION, progress);
  const byId = new Map(points.map((point) => [point.id, point]));
  const lastIndex = ordered.length - 1;

  return ordered
    .map((milestone, index) => {
      const point = byId.get(milestone.id);
      const state = point?.state ?? "upcoming";
      const media = imageForWaypoint(milestone.id);
      return {
        id: milestone.id,
        // 路线页优先展示真实地点名；地貌归类作为解释，不能反客为主。
        title: milestone.name,
        landform: observationLabel(milestone.id, milestone.name),
        elevation: `${formatObservationElevation(milestone.refM, EVEREST_EXPEDITION.maxElevation)} m`,
        image: media.path,
        imageLabel: media.label,
        roleLabel:
          index === 0 ? "起点" : index === lastIndex ? "终点" : `第 ${index + 1} 站`,
        state,
        stateLabel:
          state === "current" ? "当前位置" : state === "completed" ? "已抵达" : "未抵达",
      } as RouteRow;
    })
    .reverse();
}

Page({
  data: {
    rows: [] as RouteRow[],
    heroImage: FALLBACK_HERO,
    routeTitle: "珠峰南坡路线",
    routeSubtitle: "南坡大本营 → 珠穆朗玛峰顶",
    progressText: "已抵达 1/8 个节点",
    progressPct: 0,
    distanceText: formatKm(EVEREST_EXPEDITION.routeIndex.totalDistanceM),
    elevationSpanText: `${formatObservationElevation(
      EVEREST_EXPEDITION.maxElevation - EVEREST_EXPEDITION.routeIndex.milestones[0].refM,
      Number.POSITIVE_INFINITY,
    )} m`,
    nodeCountText: `${EVEREST_EXPEDITION.routeIndex.milestones.length} 个`,
  },

  onLoad(query: Record<string, string>) {
    const progress = Math.max(0, Math.min(1, Number(query.progress || 0)));
    const routeRows = rows(progress);
    const completed = routeRows.filter(
      (row) => row.state === "completed" || row.state === "current",
    ).length;
    const total = routeRows.length;
    this.setData({
      rows: routeRows,
      progressPct: Math.round(progress * 100),
      progressText:
        progress >= 0.999
          ? `路线已完成 · ${completed}/${total} 个节点`
          : `已抵达 ${completed}/${total} 个节点`,
    });
  },

  onRowTap(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id || "");
    if (id) wx.navigateTo({ url: `/pages/camp-detail/index?id=${id}` });
  },

  onContinue() {
    wx.navigateBack({ delta: 1 });
  },

  onBack() {
    wx.navigateBack({ delta: 1 });
  },
});
