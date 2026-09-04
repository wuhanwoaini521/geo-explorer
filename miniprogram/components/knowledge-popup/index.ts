/**
 * knowledge-popup —— 探索中“轻量标记 → 点击展开”的知识卡片（设计文档 §8）。
 * 面板由父级传入 node（ExplorationKnowledgeNode），本组件只负责渲染与事件透传。
 */
Component({
  properties: {
    visible: { type: Boolean, value: false },
    node: { type: Object, value: null },
  },
  data: {
    expanded: false,
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
    noop() {
      /* 阻止 touch 冒泡传给滑动层 */
    },
  },
});
