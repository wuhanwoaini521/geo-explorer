# Everest LIVE — Recommended Set v2（Gate 3.3B 修订）

> 依据 `media-review.md`（v1.1）整理。**推荐集 change log** 与**当前推荐配置**。
> 本文只做候选与配置建议：不下载资产、不生成 WebP、不改 MediaManifest、不接入 App —— 全部等人工视觉签核通过后，才进入 3.3C 绑定。

状态语义沿用 media-review：

- `approved`（记录级）＝ License / 地理事实已按 GPS / 官方描述 / Commons 授权页核实；最终仍需人工视觉签核。
- `review` ＝ 版权或地理定位仍需人工确认，不猜。
- `rejected` ＝ 已排除。

---

## 1. 相对 v1 的变化（验收 4 点）

| 场景 | v1 默认 | v2 新推荐 | 变化理由 |
| --- | --- | --- | --- |
| **LIVE-A** Hero | `7ST 7264.jpg` | **`Mount Everest from Kala Patthar.jpg`**（Kala Patthar，2019） | 原图 Everest 只占侧角，第一眼先见 West Shoulder/Lhotse；新图满足「第一眼认清 Everest 本体」 |
| **LIVE-A** 辅助 | — | `7ST 7264.jpg` 降级：EBC / Khumbu Icefall 知识图 / 第二参照 | 保留其 EBC 上下文价值，不再抢 HERO |
| **LIVE-B** | `Western Cwm - 14th May 2011.jpg` | **保持**，附带 9:16 双峰保留校验 | Everest(左)+Lhotse(右) 都在，绑定时必须出 cut preview 确认 |
| **LIVE-C** | `Hillary Step（2010, retouched）` | **Traffic near Yellow Band Rock.jpg**（2026，首选）＋ C2 `Struggle in the death zone`（2022）＋ C3 `Mt. Pumori with sunrise`（2022） | Hillary Step 降 review（2010+retouch+2015 后地形讨论）；新候选 ≥2022 实拍、SE route、高清 |
| **LIVE-D** | `Everest Summit.jpg`（CC0, GPS→峰顶） | 保持；若 9:16 裁后人物占据 → **D2** `Everest summit picture 2.jpg` | D1 理由最强（CC0+峰顶 GPS）；人像特写则切竖屏候选 |

> 若 C1–C3 均不被你认可 → **LIVE-C = “No approved candidate yet → TERRAIN fallback”**，不硬塞素材。

---

## v2 推荐配置（每场景首选）

### LIVE-A — Base Camp / Approach（Hero）

- **首选 HERO**：`Mount Everest from Kala Patthar.jpg`
  - licence CC BY-SA 4.0 · 5848×4387 · 2019-04-24 · camera GPS 27.998912N/86.856634E（Kala Patthar）
  - geographicRole = `Representative real-world image`，**不标 Exact viewpoint**
  - overlayProjection = `CURATED`（珠峰尖 + 冰川走向可人工 anchor）
  - 竖屏 9:16：尖顶中上部，上 1/3 供 Header → GOOD
  - Preview: <https://commons.wikimedia.org/wiki/Special:FilePath/Mount%20Everest%20from%20Kala%20Patthar.jpg?width=760>

- 备选：`Everest Lhotse, Nuptse and Khumbu glacier.jpg`（secondary；9:16 保留三峰关系）
- 知识/B：`7ST 7264.jpg` 与 `Everest Base Camp view.jpg`（EBC 角落镜头）

### LIVE-B — Western Cwm / Camp II

- **首选**：`Western Cwm - 14th May 2011.jpg`（CC BY 2.0 · 4000×3000）
  - ⚠️ 绑定前必出 **9:16 crop preview**：确认 Everest(左)与 Lhotse(右) **都不被切掉**；任一被切 → 换备选「B2 或 TERRAIN」
- 备选：`Lenticular over Everest summit.jpg`（低清 800×600，review）
- fallback：`ISS022-E-37302 …Western Cwm…（NASA, PD）`（review，空中视角）

### LIVE-C — 死亡地带 / Summit Push

- **首选**：`Traffic near Yellow Band Rock.jpg`（2026-05-19 · 4608×3072 · CC BY-SA 4.0 · desc「Yellow Band ≈7500m SE route」）
  - geographic confidence HIGH，overlay CURATED；`approved`（记录级）
- 备选1：`Struggle in the death zone.jpg`（2022 · 1800×1200 · CC BY-SA 4.0 · “pushing summit”）→ `review`
- 备选2：`Mt. Pumori with sunrise.jpg`（2022 · 1800×1200 · CC BY-SA 4.0 · Balcony ≈8400m）→ `review`
- 若三个都不被认可 → **TERRAIN fallback，不硬塞**

### LIVE-D — Summit

- **首选（保持）**：`Everest Summit.jpg`（CC0 · 4096×3072 · EXIF GPS **27.987956N/86.925111E = 主峰**）
  - **需人工确认**：9:16 裁后人物不能占主面积；
  - 若是人物特写 → **改用 D2** `Everest summit picture 2.jpg`
  - 若峰顶 Himalaya 全景清楚 → 批准 D1
- 备选：`Everest summit picture y.jpg`（5184×3888，CC BY-SA 4.0，GPS 相同 → `review`）、`At the top of the Mount Everest.jpg`（Jyoti Ratre, 2886×4032，2024）

---

## 待你人工视觉签核（浏览器 4 项）

1. **LIVE-A** Kala Patthar Preview：确认 **Everest 尖在天顶**、清晰、非 fake。
2. **LIVE-B**：9:16 裁切后 **Everest 左 + Lhotse 右都在**。
3. **LIVE-C**：C1–C3 三张 Preview：2026 C1 队列 vs 雪坡；C3/C 氛围。
4. **LIVE-D**：D1 裁切后人物占比判断（→D2 备份）。

确认后，我再把你选定的一 scene 与其余场景写入 **3.3C 绑定**（D 仍会在人工最终确认后再动）。

---

## 备注

- 全部仍以 Wikimedia `Special:FilePath` 外链缩略图呈现；正式转码入 `miniprogram/assets/` 属后续 Gate（3.3 收尾）。
- 若你希望调整优先级顺序或排除某张，直接说明 → 我更新本文并同步 `media-review.md`。
