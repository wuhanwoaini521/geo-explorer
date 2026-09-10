import { EVEREST_EXPEDITION } from "../../data/expeditions/everest";
import {
  buildObservationPoints,
  formatObservationElevation,
  observationLabel,
} from "../../engine/expedition-observation";

interface RouteRow {
  id: string;
  title: string;
  elevation: string;
  image: string;
  state: "completed" | "current" | "upcoming";
  stateLabel: string;
}

const DISPLAY_IDS = new Set([
  "base-camp",
  "khumbu-icefall",
  "lhotse-face-camp-iii",
  "south-col-camp-iv",
  "summit",
]);

function rows(progress: number): RouteRow[] {
  const ordered = EVEREST_EXPEDITION.routeIndex.milestones
    .filter((m) => DISPLAY_IDS.has(m.id))
    .slice();
  const points = buildObservationPoints(EVEREST_EXPEDITION, progress);
  const byId = new Map(points.map((point) => [point.id, point]));
  return ordered.reverse().map((m) => {
    const point = byId.get(m.id);
    return {
      id: m.id,
      title: observationLabel(m.id, m.name),
      elevation: `${formatObservationElevation(m.refM, EVEREST_EXPEDITION.maxElevation)} m`,
      image: "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
      state: point?.state ?? "upcoming",
      stateLabel: point?.stateLabel ?? "待观察",
    };
  });
}

Page({
  data: { rows: [] as RouteRow[], progressText: "已观察 1/5" },

  onLoad(query: Record<string, string>) {
    const progress = Math.max(0, Math.min(1, Number(query.progress || 0)));
    const routeRows = rows(progress);
    const completed = routeRows.filter((row) => row.state === "completed" || row.state === "current").length;
    this.setData({ rows: routeRows, progressText: `已观察 ${completed}/5` });
  },

  onRowTap(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id || "");
    if (id) wx.navigateTo({ url: `/pages/camp-detail/index?id=${id}` });
  },

  onContinue() {
    wx.navigateBack({ delta: 1 });
  },

  onBack() { wx.navigateBack({ delta: 1 }); },
});
