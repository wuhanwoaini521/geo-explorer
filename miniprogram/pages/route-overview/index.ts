import { EVEREST_EXPEDITION } from "../../data/expeditions/everest";

interface RouteRow {
  id: string;
  title: string;
  elevation: string;
  image: string;
  state: "completed" | "current" | "upcoming";
}

const IMAGES = [
  "/assets/world/everest-view-c.jpg",
  "/assets/world/everest-view-b.jpg",
  "/assets/world/everest-view-a.jpg",
  "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
];

function rows(progress: number): RouteRow[] {
  const ordered = EVEREST_EXPEDITION.routeIndex.milestones
    .filter((m) => m.id !== "south-summit")
    .slice();
  const current = ordered.find((m) => m.progress >= progress) ?? ordered[ordered.length - 1];
  return ordered.reverse().map((m) => ({
    id: m.id,
    title: m.id === "summit" ? "珠穆朗玛峰 Summit" : m.name,
    elevation: `${Math.round(m.refM).toLocaleString()} m`,
    image: IMAGES[ordered.indexOf(m) % IMAGES.length],
    state: m.progress < progress ? "completed" : m.id === current.id ? "current" : "upcoming",
  }));
}

Page({
  data: { rows: [] as RouteRow[] },

  onLoad(query: Record<string, string>) {
    const progress = Math.max(0, Math.min(1, Number(query.progress || 0)));
    this.setData({ rows: rows(progress) });
  },

  onRowTap(e: PageEvent) {
    const id = String(e.currentTarget?.dataset?.id || "");
    if (id) wx.navigateTo({ url: `/pages/camp-detail/index?id=${id}` });
  },

  onBack() { wx.navigateBack({ delta: 1 }); },
});
