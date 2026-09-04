/* 把 design/world/*.svg 栅格化为 miniprogram/assets/world/*.png（750x1334，含透明）。
 * 依赖本机 Chrome/Edge headless。
 * 用法： node scripts/rasterize-world.mjs [name.svg ...]   （默认全部）
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IN = join(ROOT, "design", "world");
const OUT = join(ROOT, "miniprogram", "assets", "world");
mkdirSync(OUT, { recursive: true });

let chrome =
  "C:/Program Files/Google/Chrome/Application/chrome.exe";
if (!existsSync(chrome))
  chrome = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
if (!existsSync(chrome))
  chrome = "C:/Program Files/Microsoft/Edge/Application/msedge.exe";

const targets = process.argv.slice(2);
const files = (targets.length
  ? targets
  : readdirSync(IN).filter((f) => f.endsWith(".svg"))
).filter((f) => f.endsWith(".svg"));

for (const svg of files) {
  const src = join(IN, svg);
  const png = join(OUT, svg.replace(/\.svg$/, ".png"));
  // 只有源或目标变更时才重渲染
  if (existsSync(png) && statSync(png).mtimeMs > statSync(src).mtimeMs) {
    console.log(`skip  ${svg}`);
    continue;
  }
  const url = "file:///" + src.replace(/\\/g, "/");
  const r = spawnSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--window-size=750,1334`,
      "--force-device-scale-factor=1",
      "--default-background-color=00000000",
      `--screenshot=${png}`,
      url,
    ],
    { stdio: "ignore", timeout: 45000 },
  );
  if (!existsSync(png)) {
    console.log(`FAIL  ${svg}`);
  } else {
    const kb = Math.round(statSync(png).size / 1024);
    console.log(`ok    ${svg}  ${kb} KB`);
  }
}
console.log("done");