"use strict";
/**
 * knowledge-popup —— 探索中的知识发现卡（§3 分层设计）。
 * 第一层仅展示：标题 / 一句话事实 / 当前海拔 / 类型标签 / “查看详情”；
 * 用户主动展开后才出现完整背景、数据、来源（含近似值标注）。
 * 面板由父级传入 node（ExplorationKnowledgeNode），本组件只负责渲染与事件透传；
 * 若节点关联全局知识库条目（node.knowledgeId），可跳转 /pages/knowledge-detail。
 */
Component({
    properties: {
        visible: { type: Boolean, value: false },
        node: { type: Object, value: null },
        axisLabel: { type: String, value: "海拔" },
        axisUnit: { type: String, value: "m" },
        contextName: { type: String, value: "" },
        contextElevation: { type: String, value: "" },
    },
    data: {
        expanded: false,
    },
    observers: {
        node() {
            // 切换节点时重置展开态，避免上个节点残留
            this.setData({ expanded: false });
        },
    },
    methods: {
        onClose() {
            this.triggerEvent("close");
        },
        onContinue() {
            this.triggerEvent("continue");
        },
        onToggleExpand() {
            this.setData({ expanded: !this.data.expanded });
        },
        onOpenLibrary(e) {
            var _a, _b, _c;
            const id = String((_c = (_b = (_a = e.currentTarget) === null || _a === void 0 ? void 0 : _a.dataset) === null || _b === void 0 ? void 0 : _b.kid) !== null && _c !== void 0 ? _c : "");
            if (!id)
                return;
            wx.navigateTo({ url: `/pages/knowledge-detail/index?id=${id}` });
        },
        noop() {
            /* 阻止 touch 冒泡传给滑动层 */
        },
    },
});
