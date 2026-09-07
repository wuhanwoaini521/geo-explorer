# Everest LIVE — 实景素材管线（Gate 3.3A 计划 → 3.3B 流程 → 3.3C LIVE-A 绑定）

> 本目录是 **LIVE（实景）媒体资产的权威计划与过程记录**。Gate 3.3C 已把第一条 LIVE 端到端接好：
> **`live-a-kala-patthar`（Kala Patthar 实拍）已 approved 并绑定 `liveScenes[0]`**，
> 探索页 LIVE/TERRAIN 双模式可切换；B/C/D 仍空，运行时自动兜底 TERRAIN，不白屏。

## 0. 为什么需要本目录

Gate 3.3 要求珠峰同时能做「LIVE 实景」与「TERRAIN 科学地形」两种视觉。TERRAIN 已有
Copernicus DEM 与 3D 地形（`design/world/everest-3d/`，数据集记录见其 `SOURCE.md`）。
LIVE 的资产完全另算：**真实授权照片**，先把「出处 / License / 审核 / 本地派生」尘埃落定，
再让 `media.assets` 登记、`EVEREST_EXPEDITION.visualMode.liveScenes[i].assetId` 绑定。

**来源唯一真相在 `MediaManifest`**（`data/expeditions/everest.ts` 的 `media`），本目录是产生它的上游过程记录。

## 1. 4 张 Hero 图的需求（目标视图）

由 Gate 3.3A 场景映射决定（`EVEREST_EXPEDITION.visualMode.liveScenes`）：

| 场景 | 阶段 | 需要的画面 | 方向约束 |
| --- | --- | --- | --- |
| `live-a` | approach + khumbu-icefall | 珠峰 → 大本营 → 昆布冰瀑，远景全景 | 竖屏 portrait；冰瀑/西风谷明显 |
| `live-b` | western-cwm | 西库姆冰谷（C1→C2 方向） | 竖屏；注意“冰谷面”不误导 |
| `live-c` | lhotse-face + south-col + death-zone | 洛子壁/南阿尔卑斯段 | 竖屏；`routeOverlay: current-next` |
| `live-d` | summit-push | 峰顶（SUMMIT 标记） | 竖屏；不画路线折线 |

每张图都是 **1080×1920 portrait 派生**（不覆盖源图），禁止随机 `object-fit` 裁剪 —— crop 由人工按
`LiveCrop`（焦点 + scale）配置（需求 §12/§13）。

## 2. 素材来源与许可（Gate 3.3B 开始执行）

推荐优先渠道（按可信度）：

1. **Wikimedia Commons**（珠峰 North/South col 图众多）—— 以 **CC BY / CC BY-SA / Public Domain** 为可接受许可；**谢绝** `fair use / non-commercial` 类（不能压进生产包）。
2. 明确机构：NASA / ESA / 五田地理等开放图库（同类 License 规则）。
3. 若有自有拍摄/自有建模渲染（如已有 Blender render）→ **可作 LIVE**，但员工须在 `credit` 注明。

硬性规则：

- 每一项候选在**入库前**通过：许可证符合 → 来源可回（`sourceUrl` 指向原始文件页）→ 作者/年份齐全。
- 禁止：hotlink 外部资源；把来源图改名就上线；未注明 License 的“复制图”。
- LIVE 需要有“视角可信”的实景属性，因此：**不要用 DEM 的伪照片化渲染冒充照片**（TERRAIN 已覆盖科学需求，不允许照片化）。

## 3. 候选↔正式流程（review gate}

每张候选图填一张这样的记录（也即未来 `MediaAsset` 的字段骨架）：

```text
id:            live-a-001
stage/scene:   live-a（approach + khumbu-icefall）
title:         珠峰南壁大本营远眺 / 或个性化标题
sourceUrl:     https://commons.wikimedia.org/wiki/File:...jpg
license:       CC BY-SA 4.0
credit/author  <用户名>（可空）
capturedAt:    2006-05-20（拍摄/发布年份）
localPath:     /assets/expeditions/everest/live/live-a.webp   ← 本地派生（1080×1920 portrait）
crop:          { focusX, focusY, scale }（人工，指向核心对象）
overlay:       routeOverlay + (可选) anchors{type, points}
reviewStatus:  review  → human check → approved / rejected
```

**审核闸口**（谁放行？数据责任在项目 + `validateExpedition` 收口）：
只允许 `approved` 进入 `liveScenes[i].assetId`；未 approved 保持 `review`，页面运行时按
`expedition-visual` fallback 落到 TERRAIN，不空屏（需求 §11/§24）。

## 4. 文件与命名约定

- `miniprogram/assets/expeditions/everest/live/live-<scene>.jpg` 本地派生（**3.3C 实测选用 JPG q80**；webp 亦可，同尺寸、同裁剪规则），仓库内（微信能 p）。
- 原始大图（远超 1920）**不放在仓库**：放 `design/world/everest-live/raw/`（gitignored），保证产物可复现。
- portrait 派生管线：`origin → 裁切 + 缩放到 1080×1920`；`review` 里记录 `focus`，允许后续替换（见 `scripts/live/derive_live_a.py`，可复现并记录 sha256）。
- `MediaAsset.kind = "photograph"`；若最终采用渲染则 `"render"`，但必须 `credit` 注明。

## 5. 交付检查（Gate 3.3C：仅 LIVE-A 一条）

- [x] `media.assets` 出现 `approved`（**当前：live-a 一条已就绪**；live-b/c/d 待后续）并各自 `license/sourceUrl`；
- [x] `visualMode.liveScenes[0].assetId` → `live-a-kala-patthar`；
- [x] `validateVisualMode` 通过（0 error）；
- [x] `npx vitest run tests/expedition-visual.test.ts tests/gate33-live-a.test.ts` 看到 live-a 用 `approved` 资产返回 `LIVE` 分支，B/C/D 回 `TERRAIN`；
- [ ] ~~本地测试真机~~（等待微信开发者工具人工视觉签核）

## 6. 当前（Gate 3.3C）状态

- `miniprogram/pages/exploration/*` 已接入 Dual Visual Mode：`syncVisualMode`（纯函数驱动）+ LIVE 图片层 + LIVE/TERRAIN 切换 pill；
- **LIVE-A**（`/assets/expeditions/everest/live/live-a-kala-patthar.jpg`，1080×1920，sha256 见 manifest）已入 `media.assets` 并置 `reviewStatus: approved`，`overlayProjection: CURATED`、`geographicRole: Representative real-world image`；
- **B/C/D** 未收录：页面 LIVE 请求对它们（stageIndex 分别落入 live-b / live-c / live-d 区）走 `no-live-assets` 兜底到 TERRAIN（DEM）—— 预期正确状态；
- anchors 显式 `NOT_AVAILABLE`，待人工视觉签核后补（不对未验证的画面硬摆锚点）。
