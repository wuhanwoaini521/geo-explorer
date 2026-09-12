/**
 * verify-review-board-browser —— 用真实浏览器（系统 Chrome headless）验证评审板图片加载。
 *
 * 检查（STEP 10）：
 *   - file:// 与 http:// 两种模式；
 *   - document.images 总数；
 *   - 每张图 img.complete && naturalWidth > 0 && naturalHeight > 0；
 *   - 失败图片列表（如有 → 退出码 1）。
 *
 * 用法：node scripts/content/verify-review-board-browser.mjs
 */
import { chromium } from "playwright-core";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BOARD = "design/content/media-review";
const EXECUTABLE = "/usr/sbin/google-chrome";

async function serve() {
  const MIME = { ".html": "text/html", ".jpg": "image/jpeg", ".png": "image/png", ".json": "application/json" };
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      const abs = normalize(join(ROOT, p));
      if (!abs.startsWith(ROOT + sep)) throw new Error("forbidden");
      const body = await readFile(abs);
      res.writeHead(200, { "Content-Type": MIME[extname(abs)] ?? "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((r) => server.listen(4173, "127.0.0.1", r));
  return {
    url: (p) => `http://127.0.0.1:4173/${p}`,
    close: () => new Promise((r) => server.close(() => r())),
  };
}

async function checkPage(browser, url, mode, page) {
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 2400 } });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: "load" });
  // 滚到底触发懒加载，再回顶
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await p.waitForTimeout(1200);
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(800);
  const result = await p.evaluate(() => {
    const imgs = [...document.images];
    return {
      total: imgs.length,
      loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0 && i.naturalHeight > 0).length,
      failed: imgs
        .filter((i) => !(i.complete && i.naturalWidth > 0))
        .map((i) => i.getAttribute("src") || "(empty)"),
    };
  });
  await ctx.close();
  return { mode, page, ...result };
}

const http = await serve();
const browser = await chromium.launch({ executablePath: EXECUTABLE, headless: true });
try {
  const results = [];
  for (const page of ["contact-sheet.html", "index.html"]) {
    results.push(await checkPage(browser, `file://${ROOT}/${BOARD}/${page}`, "file://", page));
    results.push(await checkPage(browser, http.url(`${BOARD}/${page}`), "http://", page));
  }
  let ok = true;
  for (const r of results) {
    const pass = r.total > 0 && r.loaded === r.total;
    if (!pass) ok = false;
    console.log(
      `${pass ? "PASS" : "FAIL"} [${r.mode}] ${r.page}: images=${r.total} loaded=${r.loaded}` +
        (r.failed.length ? ` failed=[${r.failed.slice(0, 3).join(", ")}${r.failed.length > 3 ? "…" : ""}]` : ""),
    );
  }
  if (!ok) process.exit(1);
  console.log("BROWSER VERIFICATION PASS（全部图片 naturalWidth>0）");
} finally {
  await browser.close();
  await http.close();
}
