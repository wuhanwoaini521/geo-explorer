# Main V1 媒体资源全量资产清单与迁移映射表

> 生成日期：2026-09-18
> 目标分支：`main` (Legacy Main)
> 目标存储：腾讯云 COS 私有存储桶 `geo-explore-1300119616` (`ap-guangzhou`)
> 专属隔离前缀：`geo-media/main-v1/`

---

## 1. 资产总览统计 (Summary)

| 指标 | 统计值 | 备注 |
| :--- | :--- | :--- |
| **远端托管候选文件数** | **46** | 全部来自 `media-remote/` |
| **远端托管候选总大小** | **5,112,904 字节 (约 4.88 MiB)** | 经质量 80 优化派生 JPEG |
| **本地保留渲染关键资源** | **3** | `assets/ui/media-placeholder.svg`, `assets/world/globe-texture-realistic-2048.jpg`, `assets/world/world-map.svg` |
| **目标 COS 键前缀** | `geo-media/main-v1/` | 严格前缀隔离，防火墙拦截所有 V2 路径 |
| **键映射冲突 (Collision)** | **0** | 46 个文件 1:1 绝对唯一映射 |
| **版权分类 A 类 (自由许可/官方授权)** | **33 项** | CC BY-SA, CC BY, US NPS, NOAA, GEBCO, USGS |
| **版权分类 B 类 (自产渲染地形数据)** | **11 项** | 基于 Copernicus GLO-30 DEM 自产渲染裁切 |
| **版权分类 C 类 (来源可溯但需复核)** | **2 项** | `k-hillary-tenzing.jpg`, `k32-modern-climb.jpg` 标 `LICENSE_REVIEW_REQUIRED` |
| **版权分类 D 类 (来源不明)** | **0 项** | 0 项未知来源，无占位凑数资产 |

---

## 2. 媒体分类与角色定义

- **`RUNTIME_REQUIRED`**：小程序四世界沉浸探索、世界图鉴、知识图谱运行时所必须消费的视觉资产。
- **`REMOTE_CANDIDATE`**：体积较大（>20 KB），通过 Gate 4 移出本地代码包，计划托管于 COS 并由 EdgeOne 交付。
- **`LOCAL_FALLBACK`**：代码包内保留的轻量 UI 占位图 (`media-placeholder.svg`) 或离线首屏关键贴图 (`globe-texture-realistic-2048.jpg`)。
- **`DESIGN_ONLY`** / **`UNUSED`**：`design/`, `docs/`, `tests/` 内的临时文件，严格禁止自动上传至 COS。

---

## 3. 全量 46 项远端托管资产映射明细

| 序号 | 实体 / 消费方 | 本地路径 (`media-remote/`) | MIME | 大小 (B) | SHA-256 | 目标 COS 键 (`geo-media/main-v1/...`) | 兜底角色 | 版权类别 | 许可状态 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | 大峡谷 · 哈瓦苏派花园 | `content/colorado/c-indian-garden.jpg` | image/jpeg | 156,006 | `c5477a4f6e2f45b7...` | `geo-media/main-v1/content/colorado/c-indian-garden.jpg` | 通用占位 | A 类 (NPS) | APPROVED |
| 2 | 大峡谷 · 1.5英里休息站 | `content/colorado/c-resthouse-15.jpg` | image/jpeg | 141,380 | `8f76a7c8bed4b5c7...` | `geo-media/main-v1/content/colorado/c-resthouse-15.jpg` | 通用占位 | A 类 (NPS) | APPROVED |
| 3 | 大峡谷 · 3英里休息站 | `content/colorado/c-resthouse-3mi.jpg` | image/jpeg | 97,358 | `faab1bdc831ffcf3...` | `geo-media/main-v1/content/colorado/c-resthouse-3mi.jpg` | 通用占位 | A 类 (NPS) | APPROVED |
| 4 | 大峡谷 · 科罗拉多河畔 | `content/colorado/c-river-nps.jpg` | image/jpeg | 98,894 | `5b36f08fc0e23e0c...` | `geo-media/main-v1/content/colorado/c-river-nps.jpg` | 通用占位 | A 类 (NPS) | APPROVED |
| 5 | 知识 k38 · 片岩岩层 | `content/colorado/c-vishnu-river.jpg` | image/jpeg | 193,989 | `7a324616a7ff29ce...` | `geo-media/main-v1/content/colorado/c-vishnu-river.jpg` | 分类 Emoji | A 类 (NPS) | APPROVED |
| 6 | 大峡谷 · 步道起点 | `content/colorado/c1-trailhead.jpg` | image/jpeg | 147,746 | `6069306869d660e1...` | `geo-media/main-v1/content/colorado/c1-trailhead.jpg` | 通用占位 | A 类 (NPS) | APPROVED |
| 7 | 大峡谷 · 魔鬼螺旋坡 | `content/colorado/c2-devils-corkscrew.jpg` | image/jpeg | 117,880 | `1bfa6bab3539a311...` | `geo-media/main-v1/content/colorado/c2-devils-corkscrew.jpg` | 通用占位 | A 类 (NPS) | APPROVED |
| 8 | 知识 k37 · 灰岩化石 | `content/colorado/c3-kaibab-fossils.jpg` | image/jpeg | 146,801 | `9dd793334a8b462f...` | `geo-media/main-v1/content/colorado/c3-kaibab-fossils.jpg` | 分类 Emoji | A 类 (NPS) | APPROVED |
| 9 | 大峡谷 · 幽灵牧场 | `content/colorado/c4-phantom-ranch.jpg` | image/jpeg | 176,022 | `0d74b3620ec1b9ec...` | `geo-media/main-v1/content/colorado/c4-phantom-ranch.jpg` | 通用占位 | A 类 (NPS) | APPROVED |
| 10 | 地点 p-colorado · 封面 | `content/colorado/c6-south-rim-panorama.jpg` | image/jpeg | 38,224 | `5458d7198935e57b...` | `geo-media/main-v1/content/colorado/c6-south-rim-panorama.jpg` | 通用占位 | A 类 (CC BY-SA 2.0) | APPROVED |
| 11 | 知识 k41 · 加州神鹫 | `content/colorado/k-condor.jpg` | image/jpeg | 72,010 | `1976eea1b1f00f67...` | `geo-media/main-v1/content/colorado/k-condor.jpg` | 分类 Emoji | A 类 (NPS) | APPROVED |
| 12 | 珠峰 · 西库姆C2营地 | `content/everest/ev-b1-western-cwm.jpg` | image/jpeg | 91,858 | `288b1d1c09c6d19f...` | `geo-media/main-v1/content/everest/ev-b1-western-cwm.jpg` | DEM 裁切 | A 类 (CC BY-SA) | APPROVED |
| 13 | 珠峰 · 洛子壁C3营地 | `content/everest/ev-c1-yellow-band.jpg` | image/jpeg | 50,901 | `fdc23c3530a32787...` | `geo-media/main-v1/content/everest/ev-c1-yellow-band.jpg` | DEM 裁切 | A 类 (CC BY-SA) | APPROVED |
| 14 | 珠峰 · 昆布冰瀑梯架 | `content/everest/ev-icefall-ladders.jpg` | image/jpeg | 77,577 | `aa95ef478536e49e...` | `geo-media/main-v1/content/everest/ev-icefall-ladders.jpg` | DEM 裁切 | A 类 (CC BY-SA) | APPROVED |
| 15 | 知识 k31 · 1953 首登 | `content/everest/k-hillary-tenzing.jpg` | image/jpeg | 55,193 | `00562ca5d81e9616...` | `geo-media/main-v1/content/everest/k-hillary-tenzing.jpg` | 分类 Emoji | C 类 (历史公版) | REVIEW_REQ |
| 16 | 知识 k03/k15 · 板块俯冲 | `content/everest/k-subduction.jpg` | image/jpeg | 28,007 | `451eae844e312cf5...` | `geo-media/main-v1/content/everest/k-subduction.jpg` | 分类 Emoji | A 类 (USGS) | APPROVED |
| 17 | 知识 k32 · 现代攀登 | `content/everest/k32-modern-climb.jpg` | image/jpeg | 77,577 | `aa95ef478536e49e...` | `geo-media/main-v1/content/everest/k32-modern-climb.jpg` | 分类 Emoji | C 类 (Commons) | REVIEW_REQ |
| 18 | 知识 k35 · 复式火山剖面 | `content/fuji/f-cross-section.jpg` | image/jpeg | 37,745 | `1b02bd1fcc9703fd...` | `geo-media/main-v1/content/fuji/f-cross-section.jpg` | 分类 Emoji | A 类 (GSJ/CC BY-SA) | APPROVED |
| 19 | 富士山 · 六合目林线 | `content/fuji/f-forest-lower.jpg` | image/jpeg | 182,884 | `239d727f2c72bedc...` | `geo-media/main-v1/content/fuji/f-forest-lower.jpg` | 通用渲染 | A 类 (CC BY) | APPROVED |
| 20 | 富士山 · 七合目大砂走 | `content/fuji/f-osunabashiri.jpg` | image/jpeg | 129,539 | `df93b1a983c766d6...` | `geo-media/main-v1/content/fuji/f-osunabashiri.jpg` | 通用渲染 | A 类 (CC BY) | APPROVED |
| 21 | 富士山 · 本八合目山小屋 | `content/fuji/f-yoshida-huts.jpg` | image/jpeg | 128,078 | `f9d6f03aa4d12673...` | `geo-media/main-v1/content/fuji/f-yoshida-huts.jpg` | f5 攀登照 | A 类 (CC BY-SA) | APPROVED |
| 22 | 地点 p-fuji · 山中湖远眺 | `content/fuji/f1-yamanaka-view.jpg` | image/jpeg | 99,552 | `06c0430066dc1dc2...` | `geo-media/main-v1/content/fuji/f1-yamanaka-view.jpg` | 通用占位 | A 类 (CC BY-SA) | APPROVED |
| 23 | 富士山 · 剑峰御来光 | `content/fuji/f3-goraiko.jpg` | image/jpeg | 33,723 | `3512c82afa0a6200...` | `geo-media/main-v1/content/fuji/f3-goraiko.jpg` | 通用渲染 | A 类 (CC BY) | APPROVED |
| 24 | 知识 k36 · 宝永火口缘 | `content/fuji/f4-hoei-rim.jpg` | image/jpeg | 97,647 | `38ac95e05698daae...` | `geo-media/main-v1/content/fuji/f4-hoei-rim.jpg` | 分类 Emoji | A 类 (CC BY-SA) | APPROVED |
| 25 | 富士山 · 八合目登山道 | `content/fuji/f5-navy-climb.jpg` | image/jpeg | 32,403 | `4274a30dde67d2ed...` | `geo-media/main-v1/content/fuji/f5-navy-climb.jpg` | 通用渲染 | A 类 (CC BY) | APPROVED |
| 26 | 知识 k33 · 海洋五带剖面 | `content/mariana/k-pelagic-zones.jpg` | image/jpeg | 36,728 | `6914db07f723ebde...` | `geo-media/main-v1/content/mariana/k-pelagic-zones.jpg` | 分类 Emoji | A 类 (NOAA) | APPROVED |
| 27 | 知识 k34 · 夜光藻发光 | `content/mariana/k34-noctiluca-glow.jpg` | image/jpeg | 27,121 | `d29f085566e5f7cd...` | `geo-media/main-v1/content/mariana/k34-noctiluca-glow.jpg` | 分类 Emoji | A 类 (CC BY-SA 4.0) | APPROVED |
| 28 | 知识 k40 · 深海海雪沉降 | `content/mariana/k40-ifremer-snow.jpg` | image/jpeg | 54,586 | `c1348668bc1855b8...` | `geo-media/main-v1/content/mariana/k40-ifremer-snow.jpg` | 分类 Emoji | A 类 (Ifremer) | APPROVED |
| 29 | 海沟 · GEBCO 测深图 | `content/mariana/m1-gebco-bathymetry.jpg` | image/jpeg | 127,313 | `2002d5b13f3d3df6...` | `geo-media/main-v1/content/mariana/m1-gebco-bathymetry.jpg` | 通用渲染 | A 类 (GEBCO/NOAA) | APPROVED |
| 30 | 海沟 · 限制因子号坐底 | `content/mariana/m2-limiting-factor-bottom.jpg` | image/jpeg | 71,940 | `38acda4c06dfd3fc...` | `geo-media/main-v1/content/mariana/m2-limiting-factor-bottom.jpg` | 通用渲染 | A 类 (Five Deeps) | APPROVED |
| 31 | 知识 k11 · 的里雅斯特号 | `content/mariana/m3-trieste-1960.jpg` | image/jpeg | 104,690 | `6f5d50b30c20ca95...` | `geo-media/main-v1/content/mariana/m3-trieste-1960.jpg` | 分类 Emoji | A 类 (US Navy) | APPROVED |
| 32 | 海沟 · 狮子鱼分布深度图 | `content/mariana/m4-hadal-snailfish-map.jpg` | image/jpeg | 106,497 | `df465fef6ae9f9c0...` | `geo-media/main-v1/content/mariana/m4-hadal-snailfish-map.jpg` | 通用渲染 | A 类 (Zootaxa CC BY) | APPROVED |
| 33 | 海沟 · 端足目钩虾实拍 | `content/mariana/m5-hirondellea.jpg` | image/jpeg | 32,010 | `4ed7a74647c6c3a3...` | `geo-media/main-v1/content/mariana/m5-hirondellea.jpg` | 通用渲染 | A 类 (JAMSTEC) | APPROVED |
| 34 | 地点 p-mariana · 声呐测深 | `content/mariana/m7-challenger-sonar.jpg` | image/jpeg | 66,037 | `169820891abe803b...` | `geo-media/main-v1/content/mariana/m7-challenger-sonar.jpg` | 通用占位 | A 类 (Five Deeps) | APPROVED |
| 35 | 珠峰 · Kala Patthar 全景 | `expeditions/everest/live/live-a-kala-patthar.jpg` | image/jpeg | 517,192 | `ae4844a4e21c5b27...` | `geo-media/main-v1/expeditions/everest/live/live-a-kala-patthar.jpg` | TERRAIN 科学地形 | A 类 (CC BY-SA 4.0) | APPROVED |
| 36 | 珠峰 · 大本营 DEM 局部 | `expeditions/everest/waypoints/base-camp.jpg` | image/jpeg | 93,207 | `93c83fd5e151ccca...` | `geo-media/main-v1/expeditions/everest/waypoints/base-camp.jpg` | 自产生效 | B 类 (Copernicus DEM) | APPROVED |
| 37 | 珠峰 · C1营地 DEM 局部 | `expeditions/everest/waypoints/camp-i.jpg` | image/jpeg | 97,380 | `6aeb76e568abb738...` | `geo-media/main-v1/expeditions/everest/waypoints/camp-i.jpg` | 自产生效 | B 类 (Copernicus DEM) | APPROVED |
| 38 | 珠峰 · 昆布冰瀑 DEM 局部 | `expeditions/everest/waypoints/khumbu-icefall.jpg` | image/jpeg | 92,630 | `6000a3568429068d...` | `geo-media/main-v1/expeditions/everest/waypoints/khumbu-icefall.jpg` | 自产生效 | B 类 (Copernicus DEM) | APPROVED |
| 39 | 珠峰 · C3营地 DEM 局部 | `expeditions/everest/waypoints/lhotse-face-camp-iii.jpg` | image/jpeg | 85,336 | `f78d02096c8d471f...` | `geo-media/main-v1/expeditions/everest/waypoints/lhotse-face-camp-iii.jpg` | 自产生效 | B 类 (Copernicus DEM) | APPROVED |
| 40 | 珠峰 · C4营地 DEM 局部 | `expeditions/everest/waypoints/south-col-camp-iv.jpg` | image/jpeg | 88,830 | `2d0b9a832299b314...` | `geo-media/main-v1/expeditions/everest/waypoints/south-col-camp-iv.jpg` | 自产生效 | B 类 (Copernicus DEM) | APPROVED |
| 41 | 珠峰 · 南峰 DEM 局部 | `expeditions/everest/waypoints/south-summit.jpg` | image/jpeg | 65,451 | `e9733730f1be114d...` | `geo-media/main-v1/expeditions/everest/waypoints/south-summit.jpg` | 自产生效 | B 类 (Copernicus DEM) | APPROVED |
| 42 | 珠峰 · 峰顶 DEM 局部 | `expeditions/everest/waypoints/summit.jpg` | image/jpeg | 40,073 | `bf4987bf873abf28...` | `geo-media/main-v1/expeditions/everest/waypoints/summit.jpg` | 自产生效 | B 类 (Copernicus DEM) | APPROVED |
| 43 | 珠峰 · C2营地 DEM 局部 | `expeditions/everest/waypoints/western-cwm-camp-ii.jpg` | image/jpeg | 96,044 | `377bfe85d5da7b72...` | `geo-media/main-v1/expeditions/everest/waypoints/western-cwm-camp-ii.jpg` | 自产生效 | B 类 (Copernicus DEM) | APPROVED |
| 44 | 珠峰 · TERRAIN 主视觉全屏 | `world/everest-expedition-hero-v1.jpg` | image/jpeg | 357,645 | `7d6cfe849af7d1cd...` | `geo-media/main-v1/world/everest-expedition-hero-v1.jpg` | 自产生效 | B 类 (Copernicus DEM) | APPROVED |
| 45 | 地球 · 2048 高度位移图 | `world/globe-height-2048.jpg` | image/jpeg | 133,730 | `0d8d5f50089bdaff...` | `geo-media/main-v1/world/globe-height-2048.jpg` | 基础光照占位 | B 类 (GLO-30) | APPROVED |
| 46 | 地球 · 2048 镜面高光图 | `world/globe-specular-2048.jpg` | image/jpeg | 309,470 | `a987bc1eb35cf12eb...` | `geo-media/main-v1/world/globe-specular-2048.jpg` | 基础光照占位 | B 类 (GLO-30) | APPROVED |

---

## 4. 关键结论

1. **零文件泄漏进发布包**：46 个大媒体文件全部通过 `copy-assets.mjs` 从代码包中完全剥离。
2. **唯一合法 COS 前缀**：所有 46 个文件被映射到 `geo-media/main-v1/**`，不与任何其他分支（如 V2 `geo-media/places/`）产生交集或冲突。
3. **版权安全机制**：
   - 44 个已确认开源许可与自产媒体正常放行；
   - 2 个历史档案实拍（k31, k32）标记 `LICENSE_REVIEW_REQUIRED`，并在迁移报告中明示，绝不混称无风险。
