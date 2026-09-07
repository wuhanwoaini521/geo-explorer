# Everest 视线遮挡 DEM（Stage 4）

真实 Copernicus DEM GLO-30 视线遮挡网格 —— 通过`occlusion.ts`在浏览器工具里做
**沿视线步进**判定：DEM 高于视线 → 标记 OCCLUDED，禁止后山脊线（"看起来合理"的假折线）冒充实景。

## 产物（committed）

| 文件 | 说明 |
| --- | --- |
| `occlusion-30m.raw.json` | 元数据（schema、rows/cols/step、world-origin、bbox、rawUrl）——**运行时唯一数据源** |
| `.gitignore` | `*.raw` 不入仓（~2.6 MB 二进制，可运行脚本重物权） |

`.raw` 为 Float32 行优先（row0 = 北缘），`z = 海拔 − 2976.22`（world-frame 相对高程），
网格在当前世界投影（`x=(lon−86.845)·98334.5`、`y=−(lat−27.95)·110575.116`）下取 30m 正方形，
cell `(r,c)` 中心即其地理中心 —— 与 `occlusion.ts` 的 `world→cell` 约定一一对应。

## 覆盖

`lat 27.90–28.10 × lon 86.75–87.00`（737 × 819 格，30 m）：Kala Patthar 相机到整条
south-col route 的全部视线楔（含珠峰、洛子峰、Nuptse、South Col）。

## 重物权

```bash
python3 -m pip install rasterio numpy          # 仅需一次
python3 scripts/live/build_occlusion_dem.py    # 默认 --out design/world/everest-live/dem
```

Copernicus 瓦片从 `~/.cache/everest-dem/`（COG，源 license：Copernicus Programme）读取；
构建脚本自带自检（对 289 个 route 点，网格近邻 `z` 与 route `z` 中位差 < 10 m）。

## 验证

- `tests/occlusion-pair.test.ts` —— Python oracle ↔ TypeScript 100% 一致性（192 queries，157 遮挡）
- `tests/occlusion-grid-smoke.test.ts` —— 真实网格穿过 `classifyVisibility`：Kala Patthar 相机对
  route 点可见与遮挡并存； Everest 峰顶区可见（真实遮挡存在，网格既不空泛也不极端）
- 浏览器：`tools/everest-route-calibrator` viewer 启动后左上拖动相机，DEM 会自动加载
  （`/design/world/everest-live/dem/occlusion-30m.raw.json`）。DEM 未加载时全部按 VISIBLE。
