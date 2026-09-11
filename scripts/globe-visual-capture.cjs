/**
 * 后台捕获 Map Globe 原型的关键交互状态。
 * 依赖 WeChat Developer Tools 已通过自动化端口 9420 运行。
 */
"use strict";

const fs = require("fs");
const path = require("path");
const automator = require("miniprogram-automator");

const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "artifacts", "visual");
const WS = process.env.WECHAT_AUTOMATION_WS || "ws://127.0.0.1:9420";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const mini = await automator.connect({ wsEndpoint: WS });
  try {
    async function launch(query = "") {
      const url = `/pages/map/index${query}`;
      await mini.callWxMethod("reLaunch", { url });
      await sleep(1100);
      return mini.currentPage();
    }

    async function capture(page, name) {
      await sleep(180);
      await mini.screenshot({ path: path.join(OUT_DIR, name) });
      console.log(`[globe-capture] ${name} ${page.path}`);
    }

    let page = await launch();
    await capture(page, "map-globe-default.png");

    page = await launch();
    await page.callMethod("onGlobeTouchStart", { detail: { x: 120, y: 260 } });
    await page.callMethod("onGlobeTouchMove", { detail: { x: 300, y: 230 } });
    await page.callMethod("onGlobeTouchEnd", { detail: { x: 300, y: 230 } });
    await capture(page, "map-globe-dragged.png");

    page = await launch();
    await page.callMethod("openGlobeMarker", "p-everest");
    await sleep(900);
    await capture(page, "map-globe-everest-selected.png");

    page = await launch();
    await page.callMethod("openGlobeMarker", "p-mariana");
    await sleep(900);
    await capture(page, "map-globe-mariana-selected.png");

    page = await launch();
    await page.callMethod("onQueryInput", { detail: { value: "Everest" } });
    await sleep(900);
    await capture(page, "map-globe-search.png");

    page = await launch();
    await page.callMethod("onTypeTap", { currentTarget: { dataset: { type: "ocean" } } });
    await capture(page, "map-globe-filter.png");

    page = await launch();
    await page.callMethod("onGlobeTouchStart", { detail: { x: 120, y: 260 } });
    await page.callMethod("onGlobeTouchMove", { detail: { x: 390, y: 260 } });
    await page.callMethod("onGlobeTouchEnd", { detail: { x: 390, y: 260 } });
    await capture(page, "marker-backface.png");

    page = await launch();
    await page.callMethod("onQueryInput", { detail: { value: "Everest" } });
    await sleep(380);
    await capture(page, "search-focus-mid.png");
  } finally {
    await mini.disconnect();
  }
}

main().catch((error) => {
  console.error(`[globe-capture] FAILED: ${error && error.message ? error.message : error}`);
  process.exitCode = 1;
});

