/**
 * Review Board 资产测试（Media Review Board Repair · STEP 9）。
 *
 * 防回归：
 *   - 生成的 index.html / contact-sheet.html 中每个 <img src> 都必须解析为真实存在且非空的文件；
 *   - 禁止绝对根路径（src 以 "/" 开头 → file:// 下解析为文件系统根）；
 *   - 禁止双重 media-source 前缀（历史 bug）；
 *   - 无图占位必须显式（NO HONEST MEDIA），不得出现空 src；
 *   - review-assets.json 与实际文件一致；
 *   - 所有 runtime approved 的 waypoint 资产在 contact-sheet 可见（实景或 TERRAIN FALLBACK）。
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = join(__dirname, "..");
const BOARD = join(ROOT, "design/content/media-review");

/**
 * 前置条件：本文件的断言校验 media-source/ 原图与评审板产物的对应关系，
 * 而 media-source/ 按项目约定不纳入版本控制（见 .gitignore:20），
 * 干净克隆 / CI 上必然缺失。
 *
 * 缺失时显式跳过，而不是长期挂几个固定红灯 —— 固定红灯会让整个套件的
 * 信号价值归零（大家都学会说「那 3 个是既有的」）。本地补回 media-source/
 * 后，这些严格断言会自动恢复执行。
 */
const HAS_MEDIA_SOURCE = existsSync(join(ROOT, "media-source"));
const boardDescribe = HAS_MEDIA_SOURCE ? describe : describe.skip;

function extractSrcs(html: string): string[] {
  const out: string[] = [];
  const re = /<img[^>]*\ssrc="([^"]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
}

function assertEveryImageResolves(file: string): void {
  const html = readFileSync(file, "utf8");
  const srcs = extractSrcs(html);
  expect(srcs.length, `${file} 应包含 <img>`).toBeGreaterThan(0);
  for (const src of srcs) {
    // file:// 模式硬约束
    expect(src.startsWith("/"), `${file}: ${src} 是绝对根路径（file:// 会解析到文件系统根）`).toBe(false);
    expect(src.includes("media-source/media-source"), `${file}: ${src} 双重前缀`).toBe(false);
    expect(src.includes("/assets/content/"), `${file}: ${src} 是绝对 runtime 路径`).toBe(false);
    const abs = resolve(join(file, ".."), src);
    let ok = false;
    try {
      ok = statSync(abs).isFile() && statSync(abs).size > 0;
    } catch {
      ok = false;
    }
    expect(ok, `${file}: ${src} 未解析到真实文件（解析为 ${abs}）`).toBe(true);
  }
  // 无空 src / 无占位 src
  expect(html.match(/src=""/)).toBeNull();
}

boardDescribe("Review Board 生成产物", () => {
  it("contact-sheet.html 所有图片可解析到真实文件", () => {
    assertEveryImageResolves(join(BOARD, "contact-sheet.html"));
  });

  it("index.html 所有图片可解析到真实文件（CARDS 数据源）", () => {
    const html = readFileSync(join(BOARD, "index.html"), "utf8");
    const cards = JSON.parse(
      (html.match(/const CARDS = (\[.*?\]);/s) ?? [])[1] ?? "[]",
    ) as Array<{ id: string; img: string | null }>;
    expect(cards.length).toBeGreaterThan(30);
    for (const c of cards) {
      if (!c.img) continue; // 显式 NO HONEST MEDIA（无本地图的候选）
      expect(c.img.startsWith("/"), `${c.id}: 绝对根路径`).toBe(false);
      const abs = resolve(BOARD, c.img);
      let ok = false;
      try {
        ok = statSync(abs).isFile() && statSync(abs).size > 0;
      } catch {
        ok = false;
      }
      expect(ok, `${c.id}: ${c.img} 未解析到真实文件`).toBe(true);
    }
  });

  it("fallback-only waypoint 有显式占位（NO HONEST MEDIA），不是空 img", () => {
    const html = readFileSync(join(BOARD, "contact-sheet.html"), "utf8");
    expect(html).toContain("NO HONEST MEDIA");
    expect(html).toContain("TERRAIN FALLBACK");
  });

  it("review-assets.json 与文件系统一致", () => {
    const manifest = JSON.parse(readFileSync(join(BOARD, "review-assets.json"), "utf8")) as {
      assets: Array<{ candidateId: string; sourcePath: string | null; absoluteExists: boolean }>;
    };
    expect(manifest.assets.length).toBeGreaterThan(30);
    for (const a of manifest.assets) {
      if (a.absoluteExists && a.sourcePath) {
        let ok = false;
        try {
          ok = statSync(resolve(ROOT, a.sourcePath)).size > 0;
        } catch {
          ok = false;
        }
        expect(ok, `${a.candidateId} 标记存在但文件缺失`).toBe(true);
      }
    }
  });

  it("候选图片与 runtime 溯源一致（promotedRuntimeId 的候选有本地图或显式占位）", () => {
    const cards = JSON.parse(
      (readFileSync(join(BOARD, "index.html"), "utf8").match(/const CARDS = (\[.*?\]);/s) ?? [])[1] ?? "[]",
    ) as Array<{ id: string; img: string | null }>;
    expect(cards.length).toBeGreaterThanOrEqual(37);
    // 唯一允许无图的是未下载候选（k-ifremer-snow），其余 36 张必须有图
    const noImg = cards.filter((c) => !c.img).map((c) => c.id);
    expect(noImg).toEqual(["k-ifremer-snow"]);
  });
});
