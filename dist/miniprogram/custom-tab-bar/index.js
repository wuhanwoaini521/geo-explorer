"use strict";
/**
 * 自定义 tabBar —— 浮动胶囊条 + 滑动琥珀指示器 + 图标弹跳动效。
 * 由 app.json tabBar.custom 启用；各 tab 页在 onShow 里通过
 * getTabBar().setData({ selected }) 同步高亮（微信官方约定）。
 */
Component({
    data: {
        selected: 0,
        hidden: false,
        tabs: [
            { pagePath: "/pages/home/index", text: "探索" },
            { pagePath: "/pages/map/index", text: "地图" },
            { pagePath: "/pages/knowledge/index", text: "知识" },
            { pagePath: "/pages/quiz/index", text: "挑战" },
            { pagePath: "/pages/profile/index", text: "我的" },
        ],
    },
    methods: {
        onTap(e) {
            var _a, _b, _c;
            const index = Number((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.index) !== null && _c !== void 0 ? _c : -1);
            if (index < 0 || index === Number(this.data.selected))
                return;
            const tabs = this.data.tabs;
            wx.switchTab({ url: tabs[index].pagePath });
            // selected 由目标页 onShow 同步，这里不提前置位（避免回退闪烁）
        },
    },
});
