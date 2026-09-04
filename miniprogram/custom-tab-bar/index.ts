/**
 * 自定义 tabBar —— 浮动胶囊条 + 滑动琥珀指示器 + 图标弹跳动效。
 * 由 app.json tabBar.custom 启用；各 tab 页在 onShow 里通过
 * getTabBar().setData({ selected }) 同步高亮（微信官方约定）。
 */
Component({
  data: {
    selected: 0,
    tabs: [
      { pagePath: "/pages/home/index", text: "探索", icon: "🧭" },
      { pagePath: "/pages/map/index", text: "地图", icon: "🗺️" },
      { pagePath: "/pages/knowledge/index", text: "知识", icon: "📚" },
      { pagePath: "/pages/quiz/index", text: "挑战", icon: "🏅" },
      { pagePath: "/pages/profile/index", text: "我的", icon: "🎒" },
    ],
  },
  methods: {
    onTap(e: PageEvent) {
      const index = Number(e.currentTarget?.dataset?.index ?? -1);
      if (index < 0 || index === Number(this.data.selected)) return;
      const tabs = this.data.tabs as { pagePath: string }[];
      wx.switchTab({ url: tabs[index].pagePath });
      // selected 由目标页 onShow 同步，这里不提前置位（避免回退闪烁）
    },
  },
});
