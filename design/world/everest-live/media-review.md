# Everest LIVE Media Review — v1.1（Gate 3.3B 修订）

用途：Gate 3.3B 候选发现与核查。本文件只做候选发现与核查：**不下载正式资产、不生成 WebP、不修改 MediaManifest、不接入 App**。
任何一张最终采用都需人工复核（美观度 / 与 visual reference 的契合度 / 画面确为珠峰 / 版权安全 / 竖屏裁切 / 裁切后主体保留），通过后才进入 3.3C 绑定。

状态语义（Gate 3.3B §3 / §11）：

- `review` —— 版权或地理定位仍需人工进一步确认；不猜，先保留。
- `approved` —— License 与地理事实在**记录层面**已被本文核实（GPS / 官方描述 / Commons 授权页）；**不代表**可直接上架，最终需人工视觉签核。
- `rejected` —— 已排除（版权瑕疵 / 地理不符 / 内容未达标）。

地理/叠加字段：

- `geographicRole` —— `Exact current viewpoint`（能证明精确点位）｜`Representative real-world image`（确为珠峰/该区域，但点位是代表性而非精确当前视角）。
- `overlayProjection` —— EXACT（有 camera/GPS/投影完整信息）｜CURATED（可人工辨识并建立审核过 anchor）｜NOT_AVAILABLE（角度不适合，不强行标）。

> 每张候选都附官方缩略图 `Preview`（Wikimedia Commons `Special:FilePath`），浏览器打开即可肉眼复核。
> 缩略图仅供 review；正式资产待 3.3B 收尾后按 `miniprogram/assets` 管线下载并转码。

---

## LIVE-A — Base Camp / Approach

产品目标：**用户第一眼必须明确看到并认出 Mount Everest 本体**（massif 中最亮眼的尖顶），再有其上下文（Khumbu 冰川 / Nuptse / 尺度感）。

### Candidate A1 — LIVE-A HERO CANDIDATE（本轮新增）

- **File:** `Mount Everest from Kala Patthar.jpg`
- **Preview:** <https://commons.wikimedia.org/wiki/Special:FilePath/Mount%20Everest%20from%20Kala%20Patthar.jpg?width=760>
- **File page:** <https://commons.wikimedia.org/wiki/File:Mount_Everest_from_Kala_Patthar.jpg>
- **Author:** Matheus Hobold Sovernigo
- **License / URL:** CC BY-SA 4.0 · <https://creativecommons.org/licenses/by-sa/4.0>
- **Attribution / Commercial / Modify:** 是 / 是 / 是
- **Resolution:** 5848 × 4387 px（AR≈0.75）
- **Photographed:** 2019-04-24（真实照片）
- **Camera location（EXIF GPS）:** 27.998912N, 86.856634E —— Kala Patthar（约 5545 m）观景点一带
- **Description（官方）:** “Mount Everest, Khumbu Glacier and surrounding mountains seen with clear sky from Kala Patthar”
- **geographicRole:** `Representative real-world image`（Kala Patthar 视角，不是 EBC 精确当前视角，**不标 Exact current viewpoint**）
- **overlayProjection:** `CURATED`（Everest 金字塔尖 + Khumbu 冰川走向可人工 anchor）
- **Portrait suitability:** GOOD —— 0.75 横图；9:16 裁后 Everest 尖顶保持在中上部，主体清楚；上 1/3 天空供 Header。
- **Intended role:** LIVE-A 主画面（hero）：一眼认清 Everest。
- **Why selected:** 完整清晰的 Everest 主体 + Khumbu 冰川上下文；CC BY-SA 4.0；有 camera location；2019 在 Kala Patthar 拍摄，足以作为首图。
- **Review status:** `approved`（记录级：license/GPS/desc 已核）＋人工目检（画面好看 + 与参考图对齐）。

### Candidate A2（secondary representative）

- **File:** `Everest Lhotse, Nuptse and Khumbu glacier.jpg`
- **Preview:** <https://commons.wikimedia.org/wiki/Special:FilePath/Everest%20Lhotse%2C%20Nuptse%20and%20Khumbu%20glacier.jpg?width=720>
- **File page:** <https://commons.wikimedia.org/wiki/File:Everest_Lhotse,_Nuptse_and_Khumbu_glacier.jpg>
- **Author:** Nirojsedhai
- **License / URL:** CC BY-SA 4.0 · <https://creativecommons.org/licenses/by-sa/4.0>
- **Resolution:** 6911 × 4443 px
- **Description:** 三峰（Everest / Lhotse / Nuptse）+ Khumbu 冰川，来自 EBC 一带
- **geographicRole:** Representative real-time image
- **overlayProjection:** CURATED
- **Portrait:** ACCEPTABLE（0.64，可裁 9:16 保留三峰关系）
- **Role:** LIVE-A 备选（同 A1 路线：第一眼 Everest，但更贴近冰川/三峰关系）
- **Review status:** `approved`（记录级）＋预览确认。

### Candidate A3（辅助 / knowledge 图，不入 HERO）

- `7ST 7264.jpg`（CC BY-SA 4.0, 7360×4912, 拍摄于 EBC）——
  画面评估：画面以 West Shoulder / Lhotse 为主角，Everest 金字塔尖只占侧面一小块，**不满足 LIVE-A 核心目标**（第一眼看到的是 West Shoulder / Lhotse，不是 Everest 本体）。
  → 保留为：**Base Camp / Khumbu Icefall knowledge image** 或 **secondary representative media**（例如：进入 EBC 的补充镜头、教学知识镜头、A级 备选），不作为 LIVE-A Hero。
- `Everest Base Camp view.jpg`（CC BY-SA 4.0, 5184×3456, **GPS 28.004263N / 86.857116E**）—— 有第三方佐证；同上，作为 EBC 知识/B 备选，不抢 HERO。
- （其余 EBC 相关备注，继续保持 v1 不变。）

---

## LIVE-B — Western Cwm / Camp II

确认目标：已「进入山体内部」，呈现 Everest（左）+ Lhotse（右）+ 冰川逐步收窄的世界。

### Candidate B1 — RECOMMENDED

- **File:** `Western Cwm - 14th May 2011.jpg`
- **Preview:** <https://commons.wikimedia.org/wiki/Special:FilePath/Western%20Cwm%20-%2014th%20May%202011.jpg?width=760>
- **File page:** <https://commons.wikimedia.org/wiki/File:Western_Cwm_-_14th_May_2011.jpg>
- **Author:** Moving Mountains Trust（Flickr → Commons）
- **License / URL:** CC BY 2.0 · <https://creativecommons.org/licenses/by/2.0>
- **Resolution:** 4000 × 3000 px
- **Description:** “The Western Cwm below Mount Everest (left) and Lhotse (right)”
- **geographicRole:** Representative real-time image（Cwm 内真实视角，无精确坐标）
- **overlayProjection:** CURATED（Everest 中/L 可人工 anchor）
- **Review status:** `approved`（记录级）＋目检。
- **⚠️ 3.3C/D 前置必做：** 进入绑定前必须出 **9:16 portrait crop preview**，确认 **Everest 与 Lhotse 同时没有被裁掉**（两张峰体都必须保留在裁切区内）。若裁后任一被切开 → 换备选或走 TERRAIN 兜底。

### Candidate B2（低清氛围）

- **File:** `Lenticular over Everest summit.jpg`（800×600）
  800×600，CC BY 2.0，低清 → **review**（不作正式推荐）。

### B3（Institution fallback）

- **File:** `ISS022-E-37302 - View of Earth - Mount Everest - Lhotse - Nuptse - Western Cwm - Everest West Shoulder (cropped).jpg`
  NASA/JSC，Public domain，3983×2813。**review**（备用通道，需标注 `Representative real-time image`，且空中视角空间感与「内部」不同）。

---

## LIVE-C — Death Zone / Summit Push（本轮重做）

产品目标：**现代高海拔 Summit Push**（death zone 之上），真实、较新、开放授权；不作「古代 2010 老图当默认背景」。

> 重搜范围：Southeast Ridge / Death Zone / Summit Push / South Summit approach。
> 全部候选都满足：
> CC BY-SA 4.0，实拍年份 >=2022，description 明确描述路段/高度。候选数量 <= 3 个。

### Candidate C1 — RECOMMENDED（新）

- **File:** `Traffic near Yellow Band Rock.jpg`
- **Preview:** <https://commons.wikimedia.org/wiki/Special:FilePath/Traffic%20near%20Yellow%20Band%20Rock.jpg?width=720>
- **File page:** <https://commons.wikimedia.org/wiki/File:Traffic_near_Yellow_Band_Rock.jpg>
- **Author:** AngeliSherpa（登山者本人，2022/2026）
- **License / URL:** CC BY-SA 4.0 · <https://creativecommons.org/licenses/by-sa/4.0>
- **Resolution:** 4608 × 3072 px
- **Photographed:** 2026-05-19（2026 攀登季，实拍）
- **Description（官方）:** “A queue of expedition climbers ascending the Yellow Band (approx. 7500m) on the SE route of Mount Everest, in Sagarmatha National Park”
- **geographicRole:** Representative real-time image（但明确标注「Yellow Band ≈7500 m，SE route」）
- **geographic confidence:** HIGH（点明 Yellow Band / 高度 / 路线）
- **overlayProjection:** CURATED（Yellow Band 岩带可作人工 anchor）
- **Portrait suitability:** ACCEPTABLE（横图 1.5；9:16 裁居中保留攀爬队列）
- **Why:** 现代真实「summit push 排队」视觉，2026 拍摄，高清，授权干净。
- **Review status:** **approved**（记录级）＋人工目测。

### Candidate C2 — （新）

- **File:** `Struggle in the death zone.jpg`
- **Preview:** <https://commons.wikimedia.org/wiki/Special:FilePath/Struggle%20in%20the%20death%20zone.jpg?width=720>
- **File page:** <https://commons.wikimedia.org/wiki/File:Struggle_in_the_death_zone.jpg>
- **Author:** AngeliSherpa
- **License / URL:** CC BY-SA 4.0
- **Resolution / date:** 1800×1200 · 2022-05-14
- **Description:** “This photo was taken while pushing summit of Mt. Everest”
- **geographicRole:** Representative real-world image（Death Zone 代表）｜地理信心 MEDIUM（无精确坐标点位）
- **overlayProjection:** NOT_AVAILABLE
- **Portrait:** ACCEPTABLE
- **Review status:** `review`（真实死亡带但无连影坐标细证，先保留，不硬推）

### Candidate C3（新，Summit Push 环境）

- **File:** `Mt. Pumori with sunrise.jpg`
- **Preview:** <https://commons.wikimedia.org/wiki/Special:FilePath/Mt.%20Pumori%20with%20sunrise.jpg?width=720>
- **File page:** <https://commons.wikimedia.org/wiki/File:Mt._Pumori_with_sunrise.jpg>
- **Author:** AngeliSherpa
- **License / URL:** CC BY-SA 4.0
- **Resolution / Date:** 1800×1200 · 2022-05-14
- **Description:** “This picture was taken from Mt. Everest Balcony in Sagarmatha National Park”
- **geographicRole:** `Representative real-time image`（登顶路线 Balcony ≈8400 m 环境, 无坐标）
- **overlayProjection:** NOT_AVAILABLE
- **Portrait:** ACCEPTABLE
  - **Review status:** `review`（环境镜，看人工对「日出 + 远处山峦」的氛围是否顺眼）。

> **历史回溯（已降级）:**
> `Hillary Step near Everest top (retouched).jpg`（CC BY-SA 4.0, 2816×2112, 2010-05-17, Debasish biswas kolkata；retouch MagentaGreen）
> **从 approved 降为 review**。原因：2010 拍摄 + retouched derivative；Hillary Step 本身在 2015 后存在 landscape 变化讨论（Commons 描述也已注明）。→ 仅可作 `historical representative image`（如「登顶前的时代照」），**不作现代 Death Zone 默认背景**。
>
> 旧 `Everest, South Col`（Argenberg）与 `Cloud inversion viewed from Everest Camp IV`（AngeliSherpa）均 `review`，仅在 C1-C3 都不合适时作为进阶氛围备选；若三个新候选全部被否定 → **LIVE-C = No approved candidate yet → TERRAIN fallback，不硬塞素材。**

---

## LIVE-D — Summit

- **D1（优先）:** `Everest Summit.jpg`（**CC0**，4096×3072，EXIF GPS **27.987956N / 86.925111E = 主峰**，Alfonso.mnr）
  → **已是**优先候选，理由最强（CC0 + 峰顶 GPS）。
  - **额外必做 Before approval/crop**：出 `9:16 crop preview` 实际查看，**确认人物不会占据画面主要面积**。
  - 若裁剪后是 人像特写 → **改用 D2**。
  - 若周围 Himalayan panorama / summit environment 足够明显 → **可批准 D1**。
- **D2（竖屏候选）:** `Everest summit picture 2.jpg`（1440×1800 原生竖幅，CC BY-SA 4.0，同系列 GPS 27.9881/86.9252）
  → 人物边少时优先作为竖屏显示。
- **D3:** `Everest summit picture y.jpg`（5184×3888，CC BY-SA 4.0，GPS 同上）→ `review`，供横向全景源。
- 附带：`At the top of the Mount Everest.jpg`（Jyoti Ratre, 2886×4032, CC BY-SA 4.0, 2024）→ 第 4 位候选池，人工看预览。

---

## Recommended Set v1 → v2 的差异

- **LIVE-A Hero:** `7ST 7264.jpg`（原首选）**换为** `Mount Everest from Kala Patthar.jpg` —— 让第一眼看到 Everest 本体。
- **LIVE-A**：`7ST 7264.jpg` 降为 **EBC / Khumbu Icefall 知识图 / 第二参照**。
- **LIVE-B**：保留 `Western Cwm - 14th May 2011.jpg`，绑定 **9:16 双峰保留检查**。
- **LIVE-C**：`Hillary Step (2010)` **降级 review**（历史），换**现代候选**（≥2022）：`Traffic near Yellow Band Rock`（2026 首选）+ `Struggle in the death zone`（2022）+ `Mt Pumori sunrise`（2022）。若无合适 → `No approved candidate yet → TERRAIN`。
- **LIVE-D**：`Everest Summit.jpg` 保持首选；人像特写则 D2。

详见单独一页 → `recommended-set-v2.md`（本目录）。

---

## 人为确认清单（请在浏览器做，视觉需你本人）

1. **LIVE-A** Kala Patthar：打开 Preview，确认 **Everest 尖顶清晰、既不是无人机/非真实**；OK。
2. **LIVE-B**：打开 Preview 后做 **9:16 裁切**（Everest 左 + Lhotse 右 必须都在）。
3. **LIVE-C**：打开 3 张 Preview，确认：2026 C1 队列是否为人群特写 vs 壮阔雪坡；是否有风雪/光线可用；C2/C3 文档感。
4. **LIVE-D**：打开 D1，确认 **人物是否占据主要面积**（若占 → 换 D2）。
5. 凡 `review` 不猜；凡 `confirmed` 均按记录近核。

---

## 交付状态

- ✅ 四个场景每场景 3 候选（A:3 / B:3 / C:3 / D:3）。
- ✅ **未下载/未入库**：全部以 `Special:FilePath` 外链呈现；未写 `miniprogram/assets/`、未生成 WebP、未改 MediaManifest。
- 🚦 尚未接入 App/页面；完成即 STOP —— 等你对 Kala Patthar / Western Cwm / C1 / D1 的 Preview 做最终视觉确认，再选定 LIVE-A one-scene，进入 3.3C。
