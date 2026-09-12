# Fuji Media Candidates（Long Run · PHASE 5）

> 状态语义沿用 `design/world/everest-live/media-review.md`：`approved`（记录级：License/地理事实已核）／`review`（仍需人工确认）。
> 本轮遵循既有管线：**只做候选发现与记录，不下载、不入 Manifest、不接页面**；晋升需人工视觉签核（Windows 阶段）。
> 文件名与许可信息经 Commons API（action=query&prop=imageinfo）于 2026-09-11 核验，附 sha1 指纹。

| # | 候选文件 | 映射 entity + purpose | kind | geographicRole | license | 分辨率 | sha1(前12) | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | `File:Mount Fuji and Lake Yamanaka (2015-11-21).jpg` | place/p-fuji · hero | photograph | REPRESENTATIVE（山中湖视角，湖面倒影构图） | CC BY-SA 4.0（Alpsdake） | 5184×3456 | 24c286e8a24b | approved（记录级） |
| F2 | `File:Lake Sai from west end with Mount Fuji.JPG` | place/p-fuji · gallery（或 expedition/fuji hero 备选） | photograph | REPRESENTATIVE（西湖西岸视角） | CC BY-SA 3.0（Amarpreet.singh.in） | 3456×2304 | 10245816ab82 | approved（记录级） |
| F3 | `File:Mt.Fuji Goraiko 2009-8-3.jpg` | waypoint/kengamine · hero（御来光/火口缘日出） | photograph | REPRESENTATIVE（火口缘日出环境，无精确坐标） | Public Domain（osakaosaka，声明释放） | 3648×2056 | a540f68d21bd | approved（记录级） |
| F4 | `File:Second Crater Rim of Hoei.jpg` | knowledge-support（k36 宝永喷发 / waypoint hoei 语境） | photograph | REPRESENTATIVE（宝永火口第二火口缘，Alpsdake 实拍） | CC BY-SA 4.0 | 6000×4000 | 2c135bab9130 | approved（记录级） |
| F5 | `File:CFAY MWR Hosts Mount Fuji Climb (9878965).jpg` | waypoint/hachigome · secondary（攀登队伍/山小屋带环境） | photograph | REPRESENTATIVE（美国海军公用领域照片，登山活动场景） | Public Domain（U.S. Navy） | 5472×3648 | d519084b883d | review（需人工确认画面是否适合 hero 语境） |
| F6 | `File:FujiHoei2078.jpg` | k36 备选 | photograph | REPRESENTATIVE | Public Domain（作者标注缺失 → 需进一步核验署名链） | 1024×768 | e9741915a681 | review（低分辨率 + 作者链不完整） |

## 映射缺口（Waypoint Primary Media Coverage）

| waypoint | primary | fallback |
| --- | --- | --- |
| gogome | F1（REPRESENTATIVE，湖岸观山视角作入口氛围） | 无图/纯色卡 |
| rokugome | — | — |
| nanagome | — | — |
| hachigome | F5（REPRESENTATIVE，待人工目检） | — |
| hon-hachigome | — | — |
| kyugome | — | — |
| kengamine | F3（REPRESENTATIVE，御来光） | — |

> 六合目/七合目/九合目暂无可靠候选：Commons 上「合目级」实景大多非开放授权（游客照版权链不清）。记录为 fallback-only（文字卡），**不硬塞错配图**。

## 采集策略

- 原始素材若下载：存入 `media-source/fuji/`，记录 source/resolution/sha256/license；不 crop/resize original。
- 运行时资产走既有管线（9:16 portrait crop + quality=80 + sha256 记录 → `miniprogram/assets/...` → MediaManifest）。
- 仓库体积策略：原始大图不入 git（.gitignore），只 track 运行时派生图与本文档元数据。不启用 Git LFS。
