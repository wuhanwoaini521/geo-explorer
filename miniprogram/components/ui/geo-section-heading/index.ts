Component({
  properties: {
    kicker: { type: String, value: "" },
    title: { type: String, value: "" },
    caption: { type: String, value: "" },
    action: { type: String, value: "" },
  },
  methods: {
    onAction() {
      this.triggerEvent("action");
    },
  },
});
