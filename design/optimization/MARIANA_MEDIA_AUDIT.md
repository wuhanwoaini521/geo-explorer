# Mariana 媒体语义审计

审计日期：2026-09-18
范围：`MARIANA_MANIFEST` 的全部运行时资产、Mariana route/Expedition 绑定，以及 `m2-limiting-factor-bottom` 候选记录。

判定原则：照片只能表达画面中可见或来源页可证明的事实；`REPRESENTATIVE` 资产必须明确“非原位”，科研图只能作为知识/科学支撑，不充当地点封面或环境实拍。

| assetId | file | currentlyUsedAs | actualContent | semanticMatch | action | source | license | replacementNeeded |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `m8-mariana-deep-photo` | `content/mariana/k40-ifremer-snow.jpg` | `place/p-mariana` hero | Ifremer 深海热液喷口与悬浮颗粒实拍；不是马里亚纳原位照 | true（代表性，已明确边界） | 标题/描述增加“非马里亚纳原位照”，禁止作为海沟地貌证据 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cheminée_hydrothermale_sous_une_pluie_de_neige_marine_(Ifremer_00401-51200).jpg) | CC BY 4.0 | yes：长期应换成来源可核验的马里亚纳原位实景封面 |
| `m2-limiting-factor-bottom` | `content/mariana/m2-limiting-factor-bottom.jpg` | `waypoint/challenger-bottom` secondary | Dr. Dawn Wright 在 DSV Limiting Factor 载人舱内查看任务设备；画面没有海床、沟壁或沉积物 | false → true | 从 hero 降为 secondary；只表达舱内任务/操作员/深潜任务；移除整场背景与 `trench-rim` 用法，署名行明确“非海床影像” | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Photo_of_Dr._Dawn_Wright_with_Snoopy_at_Challenger_Deep_071222_in_the_submersible_DSV_Limiting_Factor.jpg) | CC0 | yes：若要展示沟底/沟壁，需另找已授权原位素材 |
| `m5-hirondellea` | `content/mariana/m5-hirondellea.jpg` | `waypoint/bottom-approach` secondary | 从马里亚纳海沟采集的端足类 `Hirondellea gigas` 标本/个体照，不是沟底原位场景 | true（物种支撑） | 保持 secondary；不描述成探照灯下原位拍摄 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Hirondellea_gigas.jpg) | CC BY-SA 2.5 | yes：未来可补已授权原位生物影像 |
| `m1-gebco-bathymetry` | `content/mariana/m1-gebco-bathymetry.jpg` | `knowledge/k11` knowledge-support | Challenger Deep / Sirena Deep 测深图与剖面 | true | 保持知识科学图；不得升为地点封面 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:GEBCO_2019_bathymetry_Challenger_Deep_and_Sirena_Deep.jpg) | CC BY 4.0 | no |
| `m4-hadal-snailfish-map` | `content/mariana/m4-hadal-snailfish-map.jpg` | `knowledge/k33` secondary | 马里亚纳海沟狮子鱼观测分布与测深底图，不是通用海洋分层图 | true（超深渊案例） | 描述中限定为 hadal-zone 案例；通用分层仍由 `k-pelagic-zones` 承担 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Pseudoliparis_swirei_in_Mariana_Trench_map.jpg) | CC BY 3.0 | no |
| `m3-trieste-1960` | `content/mariana/m3-trieste-1960.jpg` | `knowledge/k11` secondary | 1960 年的里雅斯特号下潜前海面历史照 | true | 保持历史支撑图 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bathyscaphe_Trieste_beforedive.jpg) | Public Domain | no |
| `k-pelagic-zones` | `content/mariana/k-pelagic-zones.jpg` | `knowledge/k33` secondary | 海洋水层/底栖带按深度划分的示意图 | true | 保持知识图，不进入地点封面 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Schematic_representation_of_pelagic_and_benthic_zones.jpg) | CC BY-SA 4.0 | no |
| `k34-noctiluca-glow` | `content/mariana/k34-noctiluca-glow.jpg` | `knowledge/k34` knowledge-support | 表层夜光藻发光实拍，不是深海生物或马里亚纳原位场景 | false → true（现象示例） | 描述明确物种与地点边界；移除 `twilight-end` 伪现场绑定 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Sea_Sparkle_Kavaru_(Noctiluca_scintillans).jpg) | CC BY-SA 4.0 | yes：未来可用已授权深海发光生物原位照替换主图 |
| `k40-ifremer-snow` | `content/mariana/k40-ifremer-snow.jpg` | `knowledge/k40` knowledge-support；Mariana Expedition 代表性背景 | 热液喷口周围悬浮颗粒的深海实拍；不是开放水柱温跃层，也不是马里亚纳原位照 | false → true（代表性） | 描述限定为代表性教育媒体；移除 `thermocline` / `deep-water` 伪现场绑定；Expedition 明示“非马里亚纳原位照” | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Cheminée_hydrothermale_sous_une_pluie_de_neige_marine_(Ifremer_00401-51200).jpg) | CC BY 4.0 | yes：Expedition 背景后续应换成确切原位素材；知识卡本身无需替换 |
| `wp-surface-start` | `content/mariana/m3-trieste-1960.jpg` | `waypoint/surface-start` hero | 里雅斯特号在海面准备下潜的历史照 | true（历史代表） | 保留，补齐 sourceUrl；不宣称是本次虚拟航程或 2020/2022 任务 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Bathyscaphe_Trieste_beforedive.jpg) | Public Domain | no |
| `m7-challenger-sonar` | `content/mariana/m7-challenger-sonar.jpg` | `place/p-mariana` secondary | Challenger Deep 三个池与 1960/2012/2019 下潜点的 EM124 声呐测深图 | true（科学支撑） | 保持 secondary；禁止作为地点 hero | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Challenger_Deep_EM124_Sonar_Map_and_Diving_History_101119.jpg) | CC BY-SA 4.0 | no |

## 已移除的错误运行时绑定

- `m2` → Mariana Expedition hero/live：删除。照片不是深海环境、海沟或海床。
- `m2` → `trench-rim` hero：删除。照片不能证明沟坡地貌。
- `k40` → `thermocline` hero：删除。热液喷口照片不是开放大洋温跃层。
- `k34` → `twilight-end` hero：删除。夜光藻是表层生物，不是微光带下界原位生物。
- `k40` → `deep-water` hero：删除。热液喷口照片不能冒充 1,000–4,000 m 开放水柱。

这四个无合格原位照片的水柱/沟坡节点改由程序化深海环境表达。没有下载或新增任何未核验资源。
