# Colorado Media Candidates（Long Run · PHASE 5）

> 状态语义沿用 `design/world/everest-live/media-review.md`。本轮只做候选记录，不下载/不入 Manifest；晋升需人工视觉签核（Windows 阶段）。
> 文件名与许可经 Commons API 于 2026-09-11 核验，附 sha1 指纹。

| # | 候选文件 | 映射 entity + purpose | kind | geographicRole | license | 分辨率 | sha1(前12) | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C1 | `File:Bright Angel Trailhead.jpg` | waypoint/rim-trailhead · hero | photograph | REPRESENTATIVE（步道口实景，无 GPS 断言） | Public Domain（Mrmcdonnell） | 3008×2000 | afc121deb967 | approved（记录级） |
| C2 | `File:Grand Canyon NP- Bright Angel Trail - Devil's Corkscrew 50247 (52028292714).jpg` | waypoint/devils-corkscrew · hero | photograph | REPRESENTATIVE（NPS 官方 Flickr 发布） | Public Domain（Grand Canyon NPS） | 6000×3219 | d1115070392c | approved（记录级） |
| C3 | `File:Grand Canyon National Park- Fossils in Kaibab Limestone 0369 (7706174560).jpg` | knowledge-support（kaibab-age / k37：灰岩海相化石特写） | photograph | REPRESENTATIVE | CC BY 2.0（Grand Canyon National Park） | 3872×2592 | 2c9619ec2829 | approved（记录级） |
| C4 | `File:Grand Canyon Phantom Ranch 0223 (5951183751).jpg` | waypoint/phantom-ranch · hero | photograph | REPRESENTATIVE（NPS 官方照片） | CC BY 2.0（Grand Canyon National Park） | 3008×2000 | c00ed9cd60ac | approved（记录级） |
| C5 | `File:Grand Canyon (Arizona, USA), South Rim nahe Tusayan -- 2012 -- 5893.jpg` 系列（5844/5848/5892/5895） | place/p-colorado · hero 候选（南缘全景） | photograph | REPRESENTATIVE（Tusayan 一带南缘视角） | 待核（系列图作者许可链需逐张确认） | — | — | review |

## 映射缺口（Waypoint Primary Media Coverage）

| waypoint | primary | fallback |
| --- | --- | --- |
| rim-trailhead | C1 | — |
| mile-and-half | — | — |
| three-mile | — | — |
| havasupai-gardens | — | — |
| devils-corkscrew | C2 | — |
| river-side | — | — |
| phantom-ranch | C4 | — |

> 谷中段（1.5 mi / 3 mi / 花园 / 河畔）的开放授权候选本轮未锁定：Commons 检索到的步道实景多属私人上传且许可链不清。记录 fallback-only；同上「不硬塞错配图」。
> NPS 官方 Flickr（账号 `Grand Canyon NPS`）是后续补图的首选来源（PD / CC BY 2.0，量级充足）。

## 采集策略

同 fuji：原始素材入 `media-source/colorado/`（gitignore，仅元数据入仓），运行时资产走既有管线；不启用 Git LFS。
