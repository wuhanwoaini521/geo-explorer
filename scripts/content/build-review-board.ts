/**
 * build-review-board —— 生成 Linux 媒体评审板（纯静态 HTML，file:// 与 http:// 双模式可用）。
 *
 * 输入：miniprogram/data/media/candidates.ts + media-source/_metadata.json
 * 输出：design/content/media-review/index.html（37 候选卡 + 筛选）
 *       design/content/media-review/contact-sheet.html（29 waypoint hero 总览）
 *       design/content/media-review/review-assets.json（评审资产清单）
 *
 * 路径规则（file:// 关键）：
 *   - 所有 <img src> 用 path.relative(输出目录, 图片绝对路径) 生成，绝不手工猜层级；
 *   - 绝不生成以 "/" 开头的绝对根路径（file:// 下解析为文件系统根）；
 *   - 数据内嵌 HTML（无运行时 fetch），file:// 下无 CORS 问题。
 *
 * 用法：npx tsx scripts/content/build-review-board.ts
 *   file:// 直开 index.html / contact-sheet.html；或 npm run media:review（本地 HTTP）。
 */
import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { MEDIA_CANDIDATES } from "../../miniprogram/data/media/candidates";
import { EXPLORATIONS } from "../../miniprogram/data/explorations/index";
import { KNOWLEDGE } from "../../miniprogram/data/knowledge";
import { PLACES } from "../../miniprogram/data/places";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_DIR = join(ROOT, "design/content/media-review");
mkdirSync(OUT_DIR, { recursive: true });

interface MetaItem {
  id: string;
  world: string;
  localPath?: string;
  resolution?: string;
}
const META: MetaItem[] = (
  JSON.parse(readFileSync(join(ROOT, "media-source/_metadata.json"), "utf8")) as MetaItem[]
).filter((m) => m.localPath);
const metaById = (id: string): MetaItem | undefined => META.find((m) => m.id === id);

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile() && statSync(p).size > 0;
  } catch {
    return false;
  }
}

/** 候选 id → 原图绝对路径（media-source，含 localPath 前缀，不再重复拼接） */
function candidateImageAbs(id: string): string | null {
  const m = metaById(id);
  if (!m?.localPath) return null;
  const abs = resolve(ROOT, m.localPath);
  return isFile(abs) ? abs : null;
}

/** file:// 与 http:// 双模式都正确的相对路径（程序计算，不手猜） */
function relFromBoard(abs: string): string {
  return relative(OUT_DIR, abs).split("\\").join("/");
}

/** Everest DEM 兜底图（terrain fallback waypoints 的实际兜底资产） */
const TERRAIN_ABS = new Map(
  [
    "base-camp",
    "khumbu-icefall",
    "camp-i",
    "western-cwm-camp-ii",
    "lhotse-face-camp-iii",
    "south-col-camp-iv",
    "south-summit",
    "summit",
  ].map((id) => {
    const abs = resolve(ROOT, "miniprogram/assets/expeditions/everest/waypoints", `${id}.jpg`);
    return [id, isFile(abs) ? abs : null] as const;
  }),
);

function titleOf(entityType: string, entityId: string): string {
  if (entityType === "waypoint") {
    for (const ex of EXPLORATIONS) {
      const w = ex.route?.waypoints.find((x) => x.id === entityId);
      if (w) return `${w.name}（${ex.meta.placeLabel}）`;
    }
    return entityId;
  }
  if (entityType === "knowledge") {
    return `知识 ${entityId} · ${KNOWLEDGE.find((k) => k.id === entityId)?.title ?? ""}`;
  }
  if (entityType === "place") {
    return `地点 ${PLACES.find((p) => p.id === entityId)?.name ?? entityId}`;
  }
  return entityId;
}

function worldOfCandidate(tags: string[], entityType: string, entityId: string): string {
  const fromTag = tags.find((t) => ["everest", "mariana", "fuji", "colorado"].includes(t));
  if (fromTag) return fromTag;
  if (entityType === "waypoint") {
    for (const ex of EXPLORATIONS) {
      if (ex.route?.waypoints.some((x) => x.id === entityId)) return ex.id;
    }
  }
  if (entityType === "place") {
    return PLACES.find((p) => p.id === entityId)?.explorationId ?? "shared";
  }
  return "shared";
}

const RECOMMEND_RULES: Record<string, { recommendation: string; reason: string }> = {
  "ev-d1-summit": { recommendation: "REJECT", reason: "【用户反馈 2026-09-12】不用这么近的人物特写 → REJECT。D2/D4（自拍/特写）同批否决；D3（中距离人物+经幡环境）留 ALTERNATIVE。峰顶 runtime 维持 DEM 兜底（无人物）" },
  "m2-limiting-factor-bottom": { recommendation: "YES", reason: "【视觉检查】舱内自拍 + 声呐屏（沟壁剖面清晰可见）——真实坐底记录，适合 challenger-bottom/k11 的「人类在场」叙事；海底本身不可见，主视觉建议以 m1 测深图补充" },
  "ev-icefall-ladders": { recommendation: "YES", reason: "【视觉检查】黎明冰瀑 + 铝梯过裂隙 + 队列，无水印，横竖裁切空间充足——khumbu-icefall hero 首选" },
  "ev-c1-yellow-band": { recommendation: "YES", reason: "【视觉检查】深蓝天幕下的长队列雪坡 + 黄色带岩层，氛围与洛子壁节点高度吻合；人像占比小，可竖屏裁切" },
  "f-yoshida-huts": { recommendation: "YES", reason: "Alpsdake 实拍吉田路线山小屋带，与本八合目节点精确对应" },
  "c2-devils-corkscrew": { recommendation: "YES", reason: "NPS 官方照片，主体（螺旋坡）与节点一一对应" },
  "c-indian-garden": { recommendation: "YES", reason: "NPS 官方照片，哈瓦苏派花园绿洲实景" },
  "c-river-nps": { recommendation: "YES", reason: "NPS 官方照片，科罗拉多河实景（黑白纪录风格，1544×1024）" },
  "c4-phantom-ranch": { recommendation: "YES", reason: "NPS 官方照片，幽灵牧场石屋营地" },
  "c1-trailhead": { recommendation: "YES", reason: "明亮天使步道口实景（PD，路牌即地点证据）；构图偏记录感，人工确认后可用" },
  "f3-goraiko": { recommendation: "YES", reason: "【视觉检查】火口缘剪影 + 云海日出（2009 登山季实拍），御来光语义精确成立" },
  "f1-yamanaka-view": { recommendation: "YES", reason: "【视觉检查】雪山冠 + 山中湖 + 枯草前景，无水印——p-fuji place hero 首选（已替换 fuji-card.png）" },
  "f4-hoei-rim": { recommendation: "YES", reason: "【视觉检查】「宝永第二火口縁」路牌 + 红褐色火口锥——路牌即地点证据，k36 教育图首选" },
  "f-osunabashiri": { recommendation: "YES", reason: "大砂走り砂坡实景（CC BY-SA 4.0），k39 休止角知识图（属御殿场路线，仅作知识图不冒充吉田 waypoint）" },
  "f-cross-section": { recommendation: "YES", reason: "四期成山地质剖面（CC BY-SA 3.0，据东大 ERI），k35 diagram" },
  "f-forest-lower": { recommendation: "YES", reason: "富士山麓林带（CC BY 3.0），rokugome「林线」节点的环境代表图" },
  "m4-hadal-snailfish-map": { recommendation: "YES", reason: "【视觉检查】挑战者深渊/塞壬深渊狮子鱼采样分布图（科学图），映射 k33（海洋层带）" },
  "m3-trieste-1960": { recommendation: "YES", reason: "U.S. Navy 历史照（PD，740×580 低清，仅作 historical 尺寸）" },
  "k-pelagic-zones": { recommendation: "YES", reason: "海洋分层 schematic（CC BY-SA 4.0），k33 教育图" },
  "k-marine-snow": { recommendation: "YES", reason: "NOAA 官方海雪照片（PD）" },
  "k-subduction": { recommendation: "YES", reason: "【视觉检查】海沟俯冲带剖面示意图（英文标注清晰），k03 教育图" },
  "k-hillary-tenzing": { recommendation: "YES", reason: "【视觉检查】1953 首登双人照（CC BY-SA 3.0），k31 历史影像——已替换 everest-history-1953.png（来源不明）" },
  "k-condor": { recommendation: "YES", reason: "加州神鹫实拍（CC BY 3.0），k41 教育图" },
  "c3-kaibab-fossils": { recommendation: "YES", reason: "NPS 凯巴布灰岩化石特写（CC BY 2.0），k37 岩层教育图" },
  "c-vishnu-river": { recommendation: "YES", reason: "NPS 内峡维许努片岩（CC BY 2.0），k38/内峡教育图" },
  "ev-a2-ebc-pano": { recommendation: "ALTERNATIVE", reason: "EBC 三峰全景（CC BY-SA 4.0）；base-camp hero 备选或 gallery" },
  "ev-a3-ebc-view": { recommendation: "ALTERNATIVE", reason: "EBC 视角有 GPS（CC BY-SA 4.0）；secondary 池" },
  "ev-b1-western-cwm": { recommendation: "YES", reason: "【视觉检查】西库姆雪谷 + Everest 暗色金字塔面（左中）+ 洛子壁（右）双峰同框——卡片语境可用；全屏 9:16 以 Everest 面为焦点" },
  "ev-c3-balcony-pumori": { recommendation: "ALTERNATIVE", reason: "Balcony ≈8,400 m 日出环境照（CC BY-SA 4.0，无坐标）；人工目检氛围后可用" },
  "f5-navy-climb": { recommendation: "YES", reason: "【视觉检查】火口缘黎明剪影人群 + 鸟居——本八合目「夜爬迎日出」语义（PD）" },
  "f-navy-trail": { recommendation: "ALTERNATIVE", reason: "【视觉检查】黑色火山岩坡登山队列（PD）；七合目 hero，纪实感强但人物特写比例高" },
  "c-resthouse-15": { recommendation: "ALTERNATIVE", reason: "2011 NPS 历史档照（1024×728）；主体是历史设施，作 supporting 更合适" },
  "c-resthouse-3mi": { recommendation: "ALTERNATIVE", reason: "2011 NPS 历史档照（1024×732）；同上" },
  "k-atolla": { recommendation: "ALTERNATIVE", reason: "NOAA 发光水母（CC BY-SA 2.0，600×399 低清）；发光生物实景可用但分辨率低" },
  "k-ifremer-snow": { recommendation: "ALTERNATIVE", reason: "Ifremer 海雪+热液烟囱（CC BY 4.0）；本轮下载受限未取得，候选保留" },
  "k34-noctiluca-glow": { recommendation: "YES", reason: "【用户反馈轮】夜光藻蓝光实拍（CC BY-SA 4.0）——生物发光现象直观可见，替换 k-atolla；说明注明机制同源" },
  "k40-ifremer-snow": { recommendation: "YES", reason: "【用户反馈轮】热液烟囱+清晰海雪颗粒（CC BY 4.0），替换过暗的 NOAA 海雪照" },
  "ev-d3-summit-y": { recommendation: "ALTERNATIVE", reason: "中距离人物+经幡+云海（非特写）；如接受「登顶现场人物」可作峰顶 hero，否则维持 DEM" },
  "ev-d2-summit-portrait": { recommendation: "REJECT", reason: "【用户反馈】举旗特写 → REJECT" },
  "ev-d4-summit-x": { recommendation: "REJECT", reason: "【用户反馈】自拍特写 → REJECT" },
  "k34-firefly-squid": { recommendation: "REJECT", reason: "【用户反馈轮】餐碗标本照，不适合教育语境" },
  "k34-anglerfish-noaa": { recommendation: "REJECT", reason: "【用户反馈轮】甲板标本照主体难辨认" },
  "m6-maug-aerial": { recommendation: "ALTERNATIVE", reason: "真实马里亚纳群岛航拍（海底火山岛，CC BY-SA 4.0），但 1988 胶片扫描泛黄——视觉待人工定夺" },
};

/* ---------------- 数据组装（含文件级校验，STEP 7） ---------------- */

interface Card {
  id: string;
  world: string;
  entity: string;
  entityLabel: string;
  purpose: string;
  kind: string;
  geographicRole: string;
  license: string;
  credit: string;
  resolution: string;
  sourceUrl: string;
  /** file:// 相对路径（程序计算）；null = 本地无图 → 显示 NO HONEST MEDIA */
  img: string | null;
  recommendation: string;
  reason: string;
}

const genWarnings: string[] = [];
const assetsManifest: Array<Record<string, unknown>> = [];

function buildCards(): Card[] {
  return MEDIA_CANDIDATES.map((c) => {
    const abs = candidateImageAbs(c.id);
    const rec = RECOMMEND_RULES[c.id] ?? { recommendation: "REVIEW", reason: "待人工视觉签核" };
    const m = metaById(c.id);
    if (abs) {
      assetsManifest.push({
        candidateId: c.id,
        sourcePath: abs,
        absoluteExists: true,
        reviewBoardRelativePath: relFromBoard(abs),
        runtimePath: m?.localPath?.replace(/^media-source/, "/assets/content") ?? null,
        resolution: m?.resolution ?? null,
        bytes: statSync(abs).size,
      });
    } else {
      assetsManifest.push({
        candidateId: c.id,
        sourcePath: m?.localPath ?? null,
        absoluteExists: false,
        reviewBoardRelativePath: null,
        runtimePath: null,
        resolution: m?.resolution ?? null,
        bytes: 0,
      });
      genWarnings.push(`candidate ${c.id} 无可用本地图片（${m?.localPath ?? "未下载"}）→ 显示 NO HONEST MEDIA`);
    }
    return {
      id: c.id,
      world: worldOfCandidate(c.tags, c.entityType, c.entityId),
      entity: `${c.entityType}/${c.entityId}`,
      entityLabel: titleOf(c.entityType, c.entityId),
      purpose: c.purpose,
      kind: c.kind,
      geographicRole: c.geographicRole,
      license: c.license ?? "未确认",
      credit: c.credit ?? "",
      resolution: m?.resolution ?? "—",
      sourceUrl: c.sourceUrl,
      img: abs ? relFromBoard(abs) : null,
      recommendation: rec.recommendation,
      reason: rec.reason,
    };
  });
}

/* ---------------- HTML 模板 ---------------- */

const STYLE = `
:root { --bg:#0e1420; --card:#171f2e; --line:#2a3550; --fg:#dbe4f5; --dim:#8fa0c0; }
* { box-sizing: border-box; }
body { margin:0; background:var(--bg); color:var(--fg); font: 14px/1.55 system-ui, "PingFang SC", sans-serif; }
header { padding: 16px 22px; border-bottom: 1px solid var(--line); position: sticky; top:0; background:var(--bg); z-index:1 }
h1 { font-size: 17px; margin: 0 0 10px; }
label { margin-right: 14px; color: var(--dim); }
select { background:#101828; color:var(--fg); border:1px solid var(--line); border-radius:6px; padding:4px 8px; }
.grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:14px; padding:16px 22px; }
.card { background:var(--card); border:1px solid var(--line); border-radius:10px; overflow:hidden; }
.card img { width:100%; height:200px; object-fit:contain; background:#0a0f18; display:block; }
.body { padding:10px 12px 12px; }
.meta { color:var(--dim); font-size:12px; margin-top:2px; }
.reco { display:inline-block; font-weight:700; font-size:12px; border-radius:99px; padding:2px 10px; margin-top:6px; }
.YES { color:#7fd8a0; border:1px solid #7fd8a0; }
.ALTERNATIVE { color:#f0d08a; border:1px solid #f0d08a; }
.REVIEW, .REJECT { color:#ef8a8a; border:1px solid #ef8a8a; }
.noimg { padding:70px 10px; text-align:center; color:#ef8a8a; background:#0a0f18; }
a { color:#8ec1ff; text-decoration:none; }
.badge { display:inline-block; padding:1px 7px; border:1px solid var(--line); border-radius:99px; font-size:11px; color:var(--dim); }
`;

function indexHtml(cards: Card[]): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>Geo Explorer · Linux Media Review Board</title>
<style>${STYLE}</style>
</head>
<body>
<header>
  <h1>🗺️ Geo Explorer · 媒体评审板（${cards.length} 候选 · 本地原图直接加载）</h1>
  <div>
    <label>World <select id="f-world"><option value="">全部</option><option>everest</option><option>mariana</option><option>fuji</option><option>colorado</option><option>shared</option></select></label>
    <label>类型 <select id="f-entity"><option value="">全部</option><option value="waypoint">waypoint</option><option value="knowledge">knowledge</option><option value="place">place</option></select></label>
    <label>角色 <select id="f-role"><option value="">全部</option><option>EXACT</option><option>REPRESENTATIVE</option></select></label>
    <label>建议 <select id="f-rec"><option value="">全部</option><option>YES</option><option>ALTERNATIVE</option><option>REVIEW</option></select></label>
  </div>
</header>
<main class="grid" id="grid"></main>
<script>
const CARDS = ${JSON.stringify(cards)};
const grid = document.getElementById("grid");
function render() {
  const w = document.getElementById("f-world").value;
  const t = document.getElementById("f-entity").value;
  const r = document.getElementById("f-role").value;
  const c = document.getElementById("f-rec").value;
  grid.innerHTML = "";
  for (const card of CARDS) {
    if (w && card.world !== w) continue;
    if (t && !card.entity.startsWith(t + "/")) continue;
    if (r && card.geographicRole !== r) continue;
    if (c && card.recommendation !== c) continue;
    const el = document.createElement("div");
    el.className = "card";
    const media = card.img
      ? '<img loading="lazy" src="' + card.img + '">'
      : '<div class="noimg">NO HONEST MEDIA<br><span style="font-size:11px;color:#8fa0c0">本地无该候选图片（未下载或下载失败）</span></div>';
    el.innerHTML = media +
      '<div class="body">' +
      '<strong>' + card.world + ' · ' + card.entityLabel + '</strong>' +
      '<div class="meta">' + card.entity + ' · purpose=' + card.purpose + ' · kind=' + card.kind + '</div>' +
      '<div class="meta">角色 <span class="badge">' + card.geographicRole + '</span> · ' + card.resolution + '</div>' +
      '<div class="meta">许可 ' + card.license + ' · ' + card.credit + '</div>' +
      '<div class="meta"><a href="' + card.sourceUrl + '" target="_blank" rel="noreferrer">来源页面 ↗</a></div>' +
      '<div class="meta" style="margin-top:4px">' + card.reason + '</div>' +
      '<span class="reco ' + card.recommendation + '">Recommended: ' + card.recommendation + '</span>' +
      '</div>';
    grid.appendChild(el);
  }
}
document.querySelectorAll("#f-world,#f-entity,#f-role,#f-rec").forEach(el => el.onchange = render);
render();
</script>
</body>
</html>`;
}

/* ---------------- contact-sheet.html（waypoint hero 总览） ---------------- */

interface Row {
  world: string;
  name: string;
  img: string | null;
  label: string;
  caption: string;
  tag: "REAL PHOTO" | "TERRAIN FALLBACK" | "NO HONEST MEDIA";
}

function contactRows(): Row[] {
  const rows: Row[] = [];
  for (const ex of EXPLORATIONS) {
    for (const w of ex.route?.waypoints ?? []) {
      const hero = MEDIA_CANDIDATES.find(
        (c) => c.entityType === "waypoint" && c.entityId === w.id && c.purpose === "hero",
      );
      let abs = hero ? candidateImageAbs(hero.id) : null;
      let label = hero?.title ?? "";
      let caption = hero ? `${hero.license ?? ""} · ${hero.geographicRole}` : "";
      let tag: Row["tag"] = "REAL PHOTO";
      if (!abs) {
        // 实际 runtime 兜底：Everest DEM 裁切（真实存在的兜底资产）
        const terrain = TERRAIN_ABS.get(w.id);
        if (terrain) {
          abs = terrain;
          label = "DEM 渲染裁切（Copernicus GLO-30，已入 MediaManifest）";
          caption = "Geo Explorer · 自产 terrain 资产";
          tag = "TERRAIN FALLBACK";
        } else {
          label = "无实景且无兜底资产（不硬塞错配图）";
          caption = "";
          tag = "NO HONEST MEDIA";
        }
      }
      rows.push({
        world: ex.id,
        name: w.name,
        img: abs ? relFromBoard(abs) : null,
        label,
        caption,
        tag,
      });
    }
  }
  return rows;
}

function contactSheetHtml(rows: Row[]): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>Waypoint Hero Review · Contact Sheet</title>
<style>
body{margin:0;background:#0e1420;color:#dbe4f5;font:14px/1.5 system-ui,"PingFang SC",sans-serif}
header{padding:16px 22px;border-bottom:1px solid #2a3550}
h1{font-size:17px;margin:0 0 6px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px;padding:18px 22px}
.c{background:#171f2e;border:1px solid #2a3550;border-radius:8px;overflow:hidden}
.c img{width:100%;height:160px;object-fit:cover;background:#0a0f18;display:block}
.b{padding:8px 10px}
.w{color:#8fa0c0;font-size:11px;letter-spacing:1px;text-transform:uppercase}
.t{font-weight:600}
.l{color:#8fa0c0;font-size:12px}
.tag{display:inline-block;margin-top:4px;padding:1px 8px;border-radius:99px;font-size:11px;border:1px solid #4a5a7a;color:#b9c8e0}
.noimg{padding:64px 8px;text-align:center;color:#8fa0c0;background:#0a0f18;font-size:12px}
</style></head><body>
<header><h1>Waypoint Hero Review —— 四世界 ${rows.length} 个 waypoint 的 primary 展示</h1>
<p style="color:#8fa0c0;margin:4px 0 0">TERRAIN FALLBACK = 真实存在的 DEM 兜底资产；NO HONEST MEDIA = 无实景且无兜底（不硬塞错配图）。</p></header>
<div class="g">
${rows
  .map(
    (r) =>
      `<div class="c">${r.img ? `<img loading="lazy" src="${r.img}">` : `<div class="noimg">NO HONEST MEDIA</div>`}<div class="b"><div class="w">${r.world}</div><div class="t">${r.name}</div><div class="l">${r.label}</div><div class="l">${r.caption}</div><span class="tag">${r.tag}</span></div></div>`,
  )
  .join("\n")}
</div></body></html>`;
}

/* ---------------- 生成与文件级校验 ---------------- */

const cards = buildCards();
const rows = contactRows();
writeFileSync(join(OUT_DIR, "index.html"), indexHtml(cards));
writeFileSync(join(OUT_DIR, "contact-sheet.html"), contactSheetHtml(rows));
writeFileSync(
  join(OUT_DIR, "review-assets.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), assets: assetsManifest }, null, 2),
);

for (const w of genWarnings) console.warn("WARN:", w);

// STEP 7：任何 <img> 指向不存在的文件 → 生成失败（不发布坏板子）
const referenced: string[] = [
  ...cards.filter((c) => c.img).map((c) => c.img as string),
  ...rows.filter((r) => r.img).map((r) => r.img as string),
];
const broken = referenced.filter((rel) => !isFile(resolve(OUT_DIR, rel)));
if (broken.length) {
  console.error(`FATAL: ${broken.length} 个 <img> 指向不存在的文件，评审板不得发布：`);
  for (const b of broken.slice(0, 10)) console.error("  -", b);
  process.exit(1);
}
console.log(`review board  → design/content/media-review/index.html（${cards.length} 候选，${cards.filter((c) => c.img).length} 有本地图）`);
console.log(`contact sheet → design/content/media-review/contact-sheet.html（${rows.length} waypoints，${rows.filter((r) => r.img).length} 有图）`);
console.log(`assets manifest → design/content/media-review/review-assets.json`);
