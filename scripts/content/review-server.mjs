/**
 * media-review server —— 本地 HTTP 模式的评审板服务（file:// 的备用/推荐模式）。
 *
 * 用法：npm run media:review:serve
 * 输出：http://127.0.0.1:4173/（contact-sheet.html / index.html）
 *
 * 仅服务仓库根目录下的静态文件，且只监听 127.0.0.1。
 */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = Number(process.env.PORT ?? 4173);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const abs = normalize(join(ROOT, pathname));
    // 防目录穿越：解析后必须仍在仓库根内
    if (!abs.startsWith(ROOT + sep) && abs !== ROOT) {
      res.writeHead(403).end("forbidden");
      return;
    }
    const body = await readFile(abs);
    res.writeHead(200, { "Content-Type": MIME[extname(abs).toLowerCase()] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log("Media Review Board:");
  console.log(`  Contact Sheet : http://127.0.0.1:${PORT}/design/content/media-review/contact-sheet.html`);
  console.log(`  Candidate Board: http://127.0.0.1:${PORT}/design/content/media-review/index.html`);
  console.log("（Ctrl+C 停止）");
});
