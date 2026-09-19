/**
 * Product UI Sprint：微信开发者工具后台截图。
 *
 * 不启动/聚焦 GUI，只连接已存在的 automation WebSocket。每次从探索页起点进入，
 * 依次执行“到下一真实节点”，因此截图状态来自真实路线引擎，不伪造页面 data。
 *
 * Env:
 *   CAPTURE_WORLD=mariana|everest
 *   CAPTURE_STEPS=0..N          从起点前进的 waypoint 次数
 *   CAPTURE_NAME=M01-sunlight   输出文件名（不含扩展名）
 *   CAPTURE_INTRO=1             保留开始引导层
 *   CAPTURE_SET=after|before
 *   WECHAT_AUTOMATION_WS=ws://127.0.0.1:9420
 */
"use strict";

const fs = require("fs");
const path = require("path");
const automator = require("miniprogram-automator");

const ROOT = path.resolve(__dirname, "..");
const world = process.env.CAPTURE_WORLD || "mariana";
const steps = Math.max(0, Number(process.env.CAPTURE_STEPS || 0));
const name = process.env.CAPTURE_NAME || `${world}-${steps}`;
const setName = process.env.CAPTURE_SET || "after";
const keepIntro = process.env.CAPTURE_INTRO === "1";
const wsEndpoint = process.env.WECHAT_AUTOMATION_WS || "ws://127.0.0.1:9420";
const outDir = path.join(ROOT, "artifacts", "visual", "product-ui-sprint", setName);
const outFile = path.join(outDir, `${name}.png`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const mini = await automator.connect({ wsEndpoint });
  try {
    await mini.callWxMethod("reLaunch", {
      url: `/pkg-explore/pages/exploration/index?id=${world}`,
    });
    await sleep(1800);
    const page = await mini.currentPage();
    if (!page || page.path !== "pkg-explore/pages/exploration/index") {
      throw new Error(`探索页未打开，当前页面：${page ? page.path : "(none)"}`);
    }

    if (!keepIntro) {
      await page.callMethod("onStartClimb");
      await sleep(350);
      for (let i = 0; i < steps; i += 1) {
        await page.callMethod("onWaypointCardClose");
        await page.callMethod("onStepUp");
        await sleep(2300);
        await page.callMethod("onWaypointCardClose");
        await sleep(150);
      }
    }

    // 停止 ticker，确保截图不会截到半帧；不改变当前展示状态。
    await page.callMethod("stopTicker");
    await sleep(250);
    await mini.screenshot({ path: outFile, format: "png" });
    if (!fs.existsSync(outFile) || fs.statSync(outFile).size < 1024) {
      throw new Error(`截图未生成或异常过小：${outFile}`);
    }
    console.log(`[product-ui-capture] ${outFile}`);
  } finally {
    await mini.disconnect();
  }
}

main().catch((error) => {
  console.error(`[product-ui-capture] FAILED: ${error && error.message ? error.message : error}`);
  process.exitCode = 1;
});
