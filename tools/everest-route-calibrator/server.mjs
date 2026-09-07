/* 本地静态服务器：把整个仓库根作为站点根（这样 web/index.html 可直接引用
   /miniprogram/assets/... 图片、/miniprogram/data/... 与 /design/world/... 数据）。
   用法：npm run everest:viewer  （等价 node server.mjs）或
        node server.mjs --port 8787 --root .
   然后开 http://localhost:8787/tools/everest-route-calibrator/web/ */
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : undefined;
};
const ROOT = resolve(arg("--root") ?? join(__dirname, "..", "..")); // 仓库根
const PORT = Number(arg("--port") ?? 8787);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".raw": "application/octet-stream",
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    let p = decodeURIComponent(url.pathname);
    if (p === "/") p = "/tools/everest-route-calibrator/web/index.html";
    else if (p.endsWith("/")) p += "index.html";
    const file = resolve(join(ROOT, p));
    if (!file.startsWith(ROOT)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    let data;
    try {
      data = await readFile(file);
    } catch (err) {
      if (err && err.code === "ENOENT" && p.includes("/tools/everest-route-calibrator/")) {
        // web/viewer.ts 编译到 dist/：src/…js 与 web/viewer.js 都从 dist 回退
        const compiled = resolve(
          join(ROOT, p.replace("/tools/everest-route-calibrator/", "/tools/everest-route-calibrator/dist/")),
        );
        if (compiled.startsWith(ROOT)) {
          try {
            data = await readFile(compiled);
          } catch {
            res.writeHead(404);
            res.end("404 未编译产物：先 npm --prefix tools/everest-route-calibrator run build");
            return;
          }
          res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" });
          res.end(data);
          return;
        }
      }
      res.writeHead(404);
      res.end(`404 ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    res.writeHead(200, { "content-type": MIME[extname(file)] ?? "application/octet-stream" });
    res.end(data);
  } catch (err) {
    res.writeHead(404);
    res.end(`404 ${err && err.code === "ENOENT" ? "" : String(err)}`);
  }
}).listen(PORT, () => {
  console.log(`Everest Calibrator 本地工具已启动：http://localhost:${PORT}/tools/everest-route-calibrator/web/`);
  console.log(`站点根目录：${ROOT}`);
});

function extname(f) {
  const i = f.lastIndexOf(".");
  return i < 0 ? "" : f.slice(i).toLowerCase();
}