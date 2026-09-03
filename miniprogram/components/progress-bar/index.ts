/** 海拔/进度条组件：展示 0-1 进度与百分比，纯展示组件。 */
Component({
  properties: {
    /** 进度 0-1 */
    progress: { type: Number, value: 0 },
    /** 条高 rpx */
    height: { type: Number, value: 8 },
    showPct: { type: Boolean, value: true },
    /** 附加文案（如 "8848.86 m · 距峰顶 …"） */
    caption: { type: String, value: "" },
  },
  data: {
    pctText: "0%",
  },
  observers: {
    progress(this: ComponentContext, value: unknown) {
      const v = Math.max(0, Math.min(1, Number(value)));
      this.setData({ pctText: `${Math.round(v * 100)}%` });
    },
  },
});
