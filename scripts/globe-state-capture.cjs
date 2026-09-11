"use strict";

const fs = require("fs");
const path = require("path");
const automator = require("miniprogram-automator");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "artifacts", "visual");
const state = process.env.GLOBE_STATE || "default";
const WS = process.env.WECHAT_AUTOMATION_WS || "ws://127.0.0.1:9420";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const mini = await automator.connect({ wsEndpoint: WS });
  try {
    const query = {
      "current-canvas": "?globe=canvas",
      "earth-only": "?globe=earth-only",
      "no-bump": "?globe=no-bump",
      "with-bump": "?globe=with-bump",
      "no-atmosphere": "?globe=no-atmosphere",
      "subtle-atmosphere": "?globe=subtle-atmosphere",
      "variant-a": "?globe=variant-a&bump=1&atmosphere=1&texture=2048",
      "variant-b": "?globe=variant-b&bump=1&atmosphere=1&texture=2048",
      "variant-c": "?globe=variant-c&bump=1&atmosphere=1&texture=4096",
      everest: "?selected=p-everest",
      mariana: "?selected=p-mariana",
      sahara: "?q=Sahara",
      search: "?q=Everest",
      "search-mid": "?q=Everest",
      filter: "?type=ocean",
      world: "?q=__world__",
    }[state] || "";
    const page = await mini.callWxMethod("reLaunch", { url: `/pages/map/index${query}` }).then(async () => {
      await sleep(1200);
      return mini.currentPage();
    });
    if (!page) throw new Error("Map page unavailable");
    if (state === "world") {
      await page.callMethod("onQueryClear");
      await sleep(300);
    }
    if (process.env.GLOBE_PAUSE === "1") {
      // 截图前暂停 Canvas 定时器，避免首次纹理解码与截图 RPC 同时争用
      // 微信模拟器主线程；不改变页面代码或用户运行时行为。
      await page.callMethod("onHide");
    }

    if (state === "dragged" || state === "backface") {
      const endX = state === "backface" ? 390 : 300;
      await page.callMethod("onGlobeTouchStart", { detail: { x: 120, y: 260 } });
      await page.callMethod("onGlobeTouchMove", { detail: { x: endX, y: state === "dragged" ? 230 : 260 } });
      await page.callMethod("onGlobeTouchEnd", { detail: { x: endX, y: state === "dragged" ? 230 : 260 } });
    } else if (state === "everest" || state === "mariana" || state === "sahara") {
      await sleep(900);
    } else if (state === "search" || state === "search-mid") {
      await sleep(state === "search-mid" ? 380 : 900);
    } else if (state === "filter") {
      await sleep(450);
    }

    const filename = {
      default: "map-globe-default.png",
      dragged: "map-globe-dragged.png",
      backface: "marker-backface.png",
      sahara: "map-layout-sahara.png",
      search: "map-globe-search.png",
      "search-mid": "search-focus-mid.png",
      filter: "map-globe-filter.png",
      "variant-b": "globe-b.png",
      "variant-c": "globe-c.png",
      "current-canvas": "globe-current-canvas.png",
      "earth-only": "globe-earth-only.png",
      "no-bump": "globe-no-bump.png",
      "with-bump": "globe-with-bump.png",
      "no-atmosphere": "globe-no-atmosphere.png",
      "subtle-atmosphere": "globe-subtle-atmosphere.png",
      "variant-a": "globe-variant-a.png",
      "variant-b": "globe-variant-b.png",
      "variant-c": "globe-variant-c.png",
      final: "globe-final.png",
      world: "map-layout-world.png",
      everest: "globe-everest.png",
      mariana: "globe-mariana.png",
    }[state];
    if (!filename) throw new Error(`Unknown GLOBE_STATE=${state}`);
    await mini.screenshot({ path: path.join(OUT_DIR, filename) });
    console.log(`[globe-state] ${filename}`);
  } finally {
    await mini.disconnect();
  }
}

main().catch((error) => {
  console.error(`[globe-state] FAILED: ${error && error.message ? error.message : error}`);
  process.exitCode = 1;
});
