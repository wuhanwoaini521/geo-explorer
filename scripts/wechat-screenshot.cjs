/**
 * scripts/wechat-screenshot.cjs
 *
 * Capture a screenshot of the geo-explorer WeChat Mini Program running in
 * WeChat Developer Tools (simulator) via miniprogram-automator.
 *
 * AGENTS.md requirements:
 *   - background / non-interactive only; no visible window focus stealing
 *   - does NOT launch WeChat DevTools; requires the automation WebSocket to
 *     already be listening (WeChat DevTools already running with CLI/automation,
 *     e.g. cli.bat auto --project <project> --auto-port 9420)
 *
 * Env overrides:
 *   WECHAT_AUTOMATION_WS  automation websocket (default ws://127.0.0.1:9420)
 *   WECHAT_PAGE           page path to capture, e.g. pages/map/index
 *                         (when set, uses miniProgram.reLaunch(page))
 *
 * Output:
 *   artifacts/visual/current.png
 *
 * Robustness:
 *   - All steps are timeout-wrapped + a watchdog aborts the process, so the
 *     script never hangs silently.
 *   - After connecting it polls until the app runtime responds (a fresh
 *     `cli auto` session needs ~15-20s before App.* commands answer), then
 *     screenshots via miniProgram.screenshot() (full window) per spec, NOT
 *     page.screenshot().
 */
"use strict";

const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(PROJECT_ROOT, "artifacts", "visual");
const OUT_IMG = path.join(OUT_DIR, "current.png");

const WS_DEFAULT = "ws://127.0.0.1:9420";
const wsUrl = process.env.WECHAT_AUTOMATION_WS || WS_DEFAULT;
const pagePath = (process.env.WECHAT_PAGE || "").trim();
const targetPage = pagePath || "pages/home/index";

// Timeouts (ms). Env-overridable, bounded so tests can never hang forever.
const CONNECT_MS = Math.min(
  Number(process.env.WECHAT_CONNECT_MS) || 30000,
  120000,
);
const READY_MS = Math.min(Number(process.env.WECHAT_READY_MS) || 60000, 120000);
const RENDER_MS = Math.min(Number(process.env.WECHAT_RENDER_MS) || 2500, 30000);
const STEP_MS = Math.min(Number(process.env.WECHAT_STEP_MS) || 60000, 120000);
const WATCH_MS = Math.min(
  CONNECT_MS + READY_MS + RENDER_MS + STEP_MS + 15000,
  Number(process.env.WECHAT_WATCH_MS) || 150000,
);

let watchdog = null;

function log(line) {
  // stderr = unbuffered; visible even when stdout is piped/tail'ed.
  process.stderr.write(`[wechat-screenshot] ${line}\n`);
}

function arm() {
  watchdog = setTimeout(() => {
    process.stderr.write(
      `[wechat-screenshot] WATCHDOG: no completion in ${WATCH_MS}ms; aborting.\n`,
    );
    process.exit(2);
  }, WATCH_MS);
}
function disarm() {
  if (watchdog) clearTimeout(watchdog);
  watchdog = null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, ms, what) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      const t = setTimeout(
        () => reject(new Error(`${what} timed out after ${ms}ms`)),
        ms,
      );
      if (t && t.unref) t.unref();
    }),
  ]);
}

/**
 * Poll until the mini program runtime answers page-level RPCs. A freshly opened
 * `cli auto` automation session answers Tool.* immediately but the app runtime
 * (App.getCurrentPage / App.getPageStack / App.captureScreenshot) only becomes
 * responsive after the simulator finishes compiling + launching the app.
 */
async function waitAppReady(mini, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  while (Date.now() < deadline) {
    attempt += 1;
    try {
      const stack = await withTimeout(
        mini.pageStack(),
        3000,
        "App.getPageStack probe",
      );
      const paths = (stack || []).map((p) => p.path).join(", ");
      log(
        `app ready after attempt ${attempt} (page stack: ${paths || "(empty)"})`,
      );
      if (stack && stack.length > 0) {
        log(`current route: ${paths}`);
        return;
      }
    } catch (err) {
      log(
        `app not ready yet (attempt ${attempt}): ${err && err.message ? err.message : err}`,
      );
    }
    await sleep(2500);
  }
  throw new Error(`WeChat app did not become ready within ${timeoutMs}ms`);
}

function fail(msg) {
  console.error(`[wechat-screenshot] FAILED: ${msg}`);
  process.exitCode = 1;
}

(async () => {
  let mini = null;
  try {
    arm();
    log(`target page: ${targetPage}`);
    log(`connecting to ${wsUrl} ...`);

    const automator = require("miniprogram-automator");
    mini = await withTimeout(
      automator.connect({ wsEndpoint: wsUrl }),
      CONNECT_MS,
      `connect ${wsUrl}`,
    );
    log("connected to WeChat DevTools automation");

    await waitAppReady(mini, READY_MS);

    const relaunchTo = pagePath || null;
    if (relaunchTo) {
      log(`reLaunch -> ${relaunchTo}`);
      try {
        await withTimeout(
          mini.reLaunch({ url: `/${relaunchTo}` }),
          STEP_MS,
          "reLaunch",
        );
      } catch (err) {
        throw new Error(
          `WECHAT_PAGE=${relaunchTo}: navigation failed (${err.message}). ` +
            "The app stayed on the current page; screenshots of the currently " +
            "displayed page still work (omit WECHAT_PAGE to capture the active page).",
        );
      }
      await sleep(RENDER_MS);
    } else {
      log(`capturing ${targetPage}`);
      await sleep(RENDER_MS);
    }

    log("capturing miniProgram.screenshot() ...");
    const res = await withTimeout(
      mini.screenshot({ path: OUT_IMG, format: "png" }),
      STEP_MS,
      "mini.screenshot",
    );

    if (fs.existsSync(OUT_IMG)) {
      const st = fs.statSync(OUT_IMG);
      log(`saved ${OUT_IMG} (${st.size} bytes)`);
      log(`screenshot result: ${res && res.path ? res.path : "(inline)"}`);
      console.log("SUCCESS");
    } else {
      throw new Error(
        "screenshot returned but file was not written to the expected path",
      );
    }
  } catch (err) {
    fail(err && err.message ? err.message : String(err));
  } finally {
    disarm();
    if (mini) {
      try {
        await mini.disconnect();
      } catch {
        /* ignore */
      }
    }
  }
})();
