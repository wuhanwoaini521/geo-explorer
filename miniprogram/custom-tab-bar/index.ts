/**
 * 自定义 tabBar —— 浮动胶囊条 + 滑动琥珀指示器 + 图标弹跳动效。
 * 由 app.json tabBar.custom 启用；各 tab 页在 onShow 里通过
 * getTabBar().setData({ selected }) 同步高亮（微信官方约定）。
 */
Component({
  data: {
    selected: 0,
    hidden: false,
    theme: "dark" as "dark" | "light",
    tabs: [
      { pagePath: "/pages/map/index", text: "探索", icon: "/assets/icons/nav-explore-idle.svg", activeDark: "/assets/icons/nav-explore-active-dark.svg", activeLight: "/assets/icons/nav-explore-active-light.svg" },
      { pagePath: "/pages/home/index", text: "发现", icon: "/assets/icons/nav-discover-idle.svg", activeDark: "/assets/icons/nav-discover-active-dark.svg", activeLight: "/assets/icons/nav-discover-active-light.svg" },
      { pagePath: "/pages/knowledge/index", text: "知识", icon: "/assets/icons/nav-knowledge-idle.svg", activeDark: "/assets/icons/nav-knowledge-active-dark.svg", activeLight: "/assets/icons/nav-knowledge-active-light.svg" },
      { pagePath: "/pages/quiz/index", text: "挑战", icon: "/assets/icons/nav-challenge-idle.svg", activeDark: "/assets/icons/nav-challenge-active-dark.svg", activeLight: "/assets/icons/nav-challenge-active-light.svg" },
      { pagePath: "/pages/profile/index", text: "我的", icon: "/assets/icons/nav-profile-idle.svg", activeDark: "/assets/icons/nav-profile-active-dark.svg", activeLight: "/assets/icons/nav-profile-active-light.svg" },
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
