import { readFileSync, readdirSync, existsSync } from "node:fs";
import { inflateSync } from "node:zlib";
const dir = "miniprogram/assets/world";
const files = readdirSync(dir).filter((f) => f.endsWith(".png"));
for (const f of files) {
  const buf = readFileSync(dir + "/" + f);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  const ct = buf[25];
  const chunks = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.slice(off + 4, off + 8).toString();
    if (type === "IDAT") chunks.push(buf.slice(off + 8, off + 8 + len));
    off += 12 + len;
    if (type === "IEND") break;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 1;
  const stride = w * bpp + 1;
  const px = (x, y, b) => raw[y * stride + 1 + x * bpp + b];
  const alphaAt = ct === 6 ? (x, y) => px(x, y, 3) : () => 255;
  const midA = alphaAt(120, 400);
  const botA = alphaAt(200, 1100);
  console.log(
    `${f.padEnd(22)} dims=${w}x${h} ct=${ct} topMidA=${alphaAt(120, 40)} midA=${midA} botA=${botA}`,
  );
}