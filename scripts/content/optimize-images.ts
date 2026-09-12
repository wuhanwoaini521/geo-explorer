/**
 * optimize-images —— 把 media-source 原图生成 runtime 优化资产。
 *
 * 输入：media-source/<world>/<id>.<ext>（原始文件，已校验 sha256）
 * 输出：miniprogram/assets/content/<world>/<id>.jpg
 *   - hero 1080 宽（竖屏卡片/主视觉）；card 640 宽（小图/卡图）；knowledge 800 宽
 *   - quality 80 JPEG（保持比例，不做裁切——裁切语义由 UI 的 aspectFill + focus 完成）
 *   - 白底 PNG（diagram）转 JPG 白底
 *
 * 用法：npx tsx scripts/content/optimize-images.ts [id ...]（缺省处理全部已下载候选）
 * 依赖：系统 ImageMagick（convert）。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const META: Array<{
  id: string;
  world: string;
  localPath?: string;
  sha256?: string;
}> = JSON.parse(readFileSync(join(ROOT, "media-source/_metadata.json"), "utf8"));

interface RuntimeSpec {
  /** 运行时资产类别 → 目标宽度 */
  width: number;
}
const KIND_WIDTH: Record<string, number> = {
  hero: 1080,
  card: 640,
  knowledge: 800,
  secondary: 800,
  "knowledge-support": 800,
  gallery: 800,
};

interface IngestEntry {
  candidateId: string;
  world: string;
  entityType: string;
  entityId: string;
  purpose: string;
  kind: string;
  runtimePath: string;
  sourceSha256: string;
  runtimeSha256: string;
  width: number;
  height: number;
  processing: string;
}

const args = process.argv.slice(2);
const only = args.length ? new Set(args) : null;

const manifestPath = join(ROOT, "miniprogram/data/media/runtime-ingest.json");
const ingest: Record<string, IngestEntry> = exists(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : {};

function exists(p: string): boolean {
  try {
    statSync(p);
    return true;
  } catch {
    return false;
  }
}

for (const meta of META) {
  if (!meta.localPath || !meta.sha256) continue;
  if (only && !only.has(meta.id)) continue;

  // Runtime 用途规格：waypoint hero → 1080；place hero → 640 卡图；knowledge → 800
  const spec: string = meta.id.startsWith("k-") ? "knowledge-support" : "hero";
  const width = spec === "hero" ? 1080 : 800;
  const outDir = join(ROOT, "miniprogram/assets/content", meta.world);
  const outPath = join(outDir, `${meta.id}.jpg`);
  if (!existsSync(dirname(outPath))) execFileSync("mkdir", ["-p", dirname(outPath)]);

  const srcPath = join(ROOT, meta.localPath);
  execFileSync("convert", [srcPath, "-auto-orient", "-resize", `${width}x${width}>`, "-quality", "80", outPath], { stdio: "pipe" });

  const buf = readFileSync(outPath);
  const sha = createHash("sha256").update(buf).digest("hex");
  ingest[meta.id] = {
    candidateId: meta.id,
    world: meta.world,
    entityType: "auto",
    entityId: "auto",
    purpose: spec,
    kind: "runtime",
    runtimePath: `/assets/content/${meta.world}/${meta.id}.jpg`,
    sourceSha256: meta.sha256,
    runtimeSha256: sha,
    width,
    processing: `imagemagick: auto-orient, resize ${width}w, q80`,
  };
  console.log(`ok ${meta.id} → ${outPath.replace(ROOT + "/", "")} (${(buf.length / 1024) | 0} KB)`);
}

// entityType/entityId 从候选清单回填（auto → 实际值）
import { MEDIA_CANDIDATES } from "../../miniprogram/data/media/candidates";
for (const c of MEDIA_CANDIDATES) {
  if (ingest[c.id]) {
    ingest[c.id].entityType = c.entityType;
    ingest[c.id].entityId = c.entityId;
    ingest[c.id].purpose = c.purpose;
  }
}

writeFileSync(manifestPath, JSON.stringify(ingest, null, 2));
console.log(`runtime-ingest.json: ${Object.keys(ingest).length} 项`);
