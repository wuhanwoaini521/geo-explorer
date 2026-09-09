Page({
  data: {
    terrain: false,
    hero: "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
    peaks: [
      { name: "洛子峰", elevation: "8,516 m", left: 18, top: 35 },
      { name: "珠穆朗玛峰", elevation: "8,848 m", left: 50, top: 19 },
      { name: "努子峰", elevation: "7,861 m", left: 77, top: 34 },
    ],
  },
  onToggleTerrain(e: PageEvent) {
    const mode = String(e.currentTarget?.dataset?.mode || "terrain");
    const terrain = mode === "terrain";
    this.setData({
      terrain,
      hero: terrain ? "/assets/world/everest-view-a.jpg" : "/assets/expeditions/everest/live/live-a-kala-patthar.jpg",
    });
  },
  onBack() { wx.navigateBack({ delta: 1 }); },
});
