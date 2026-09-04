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
  },
  data: {
    expanded: false,
  },
  observers: {
    node(this: ComponentContext) {
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
    onOpenLibrary(e: PageEvent) {
      const id = String(e.currentTarget?.dataset?.kid ?? "");
      if (!id) return;
      wx.navigateTo({ url: `/pages/knowledge-detail/index?id=${id}` });
    },
    noop() {
      /* 阻止 touch 冒泡传给滑动层 */
    },
  },
});