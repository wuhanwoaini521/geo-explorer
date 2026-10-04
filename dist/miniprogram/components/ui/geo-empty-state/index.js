"use strict";
Component({
    properties: {
        mark: { type: String, value: "▦" },
        title: { type: String, value: "" },
        description: { type: String, value: "" },
        action: { type: String, value: "" },
    },
    methods: {
        onAction() {
            this.triggerEvent("action");
        },
    },
});
