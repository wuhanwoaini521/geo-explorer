# 🌍 山海探逸 · Geo Explorer

> 用手指把珠穆朗玛峰爬一遍，顺便学点地理。
> （也可以倒着下潜到马里亚纳海沟底部，或者沿着岩层走回 17.5 亿年前 —— 前提是你不恐深、不恐高、不恐时间。）

一个微信小程序：**四个真实世界的沉浸探索 + 知识解锁 + 随堂问答**。滑动屏幕推进海拔/深度/地层，途中点亮知识节点、回答随堂测验，真实地形与真实影像打底，拒绝瞎编。

---

## ✨ 这里面有什么

| 玩法 | 说明 |
|---|---|
| 🌐 **地球主入口** | **启动首屏就是一颗可拖拽、可点选的真实地球**（「探索」tab，WebGL 主渲染 / Canvas 2D 兜底）：从地球上的标记点直接进入四个探索世界；「发现」tab 负责精选目的地与冷知识 |
| 🧗 **珠峰南坳攀登** | 从南坡大本营 5,364m 沿真实 DEM 山体一路到 8,848.86m：昆布冰瀑、西库姆冰谷、洛子壁、南坳、死亡区，路点贴着山体走 |
| 🤿 **马里亚纳海沟下潜** | 从海面沉向 10,935m 挑战者深渊（2021 年压力反演口径）：六个海洋带，越深水压越大，坐底有 EXACT 实拍记录 |
| 🗻 **富士山攀登** | 从车路直达的五合目（2,305m）登上日本最高点剑峰（3,776.24m）：林线、火山砾坡、山小屋带、御来光 |
| 🏜️ **科罗拉多大峡谷下切** | 沿明亮天使步道从南缘下到谷底：HUD 上的「岩层年代」从 2.7 亿年一路跳到 17.5 亿年，读的是一部地质时间之书 |
| 🗺️ **世界图鉴** | 49 个真实地点（山峰/火山/峡谷/沙漠/冰川/河流/湖泊/瀑布/海洋/高原），中英文/区域/标签搜索与 11 类地貌筛选 |
| 📚 **知识库** | 41 条地理知识（100% 可溯源、含跨世界知识图谱关联），探索中解锁的会点亮「已解锁」徽章 |
| 🏅 **挑战问答** | 三档难度，按难度记录最佳成绩（正确率优先，其次正确数），不服就再来一轮 |
| ❤️ **收藏与成就** | 点亮 ♡ 收藏想去的地球角落；登顶后自动推荐「下一站」跨类型目的地 |
| 📊 **实时环境指标** | 温度、气压/水压、含氧量随位置实时变化——数字会说话：越往上越要命，越往下越要命 |

**场景里的画面是真的**：珠峰地形不是画师手绘的示意画，而是用真实卫星高程数据（Copernicus GLO-30 DEM，30m 分辨率）渲染出来的三维地形，攀登路线由 289 个控制点沿山体几何生成。四个世界现在都接入了同一套**路线引擎**（攀登 CLIMB / 下潜 DIVE / 下切 CUTAWAY 三种移动模型），路点、海拔/深度、解密节奏全部由真实数据驱动。

## 🖼️ 视觉与品牌

「暖纸 / 古地图」风：淡黄纸底、墨色文字、琥珀金主色，外加一套克制的编辑排版。没有赛博发光，没有彩虹渐变——我们想让你觉得自己在看一张考究的探险地图，而不是某个儿童早教 App。

Logo（徽章版：雪山/海面/海沟与鲸）与命名物料在 `design/brand/logo/`，头像上传用 `avatar-emblem-1024.png`。

## 🚀 跑起来

```bash
# 环境要求：Node.js + 微信开发者工具（Blender/Python 仅在重渲染地形或媒体管线时需要）

npm install

npm run build     # 编译 TS + 拷贝资源 → dist/miniprogram/
npm run typecheck # TS 严格模式检查
npm test          # 552 个单测 / 50 个测试文件（引擎、数据契约、页面逻辑，Node 环境跑）

# 然后用微信开发者工具打开仓库根目录
# （project.config.json 已配置 miniprogramRoot: dist/miniprogram/，工具加载构建产物）
```

> ⚠️ 改了源码记得 `npm run build`——开发者工具看的是 `dist/`，不是 `miniprogram/`。
> `dist/` 随仓库提交（跨机预览无需本地构建），但**禁止手改**，一切以 build 产物为准。

### 内容与媒体工具链

| 命令 | 用途 |
|---|---|
| `npm run content:validate` | 内容完整性校验：四世界引用 / 知识来源 / 媒体归属 / 资产断链（目标 0 error） |
| `npm run content:report` | 知识/媒体覆盖指标 → `design/content/final/metrics-report.json` |
| `npm run quality:report` | 质检报告组：世界覆盖矩阵 / 知识图谱 / 来源质量 / remaining-work |
| `npm run media:review` | 生成 Linux 媒体评审板（`design/content/media-review/`，file:// 直开） |
| `npm run media:review:serve` | 同上，本地 HTTP 模式（`http://127.0.0.1:4173`） |
| `npm run media:review:verify` | 真实浏览器（Chrome headless）验证评审板图片全部可加载 |
| `npm run release:report` | 发布就绪报告 + Windows QA 机器可读清单 |
| `npm run wechat:screenshot` | 微信自动化截图（需要可用的自动化端点） |
| `npm run everest:viewer` | 珠峰路线校准工具（按需启动） |

## 🏗️ 项目结构

```
├── miniprogram/               # 源码（TypeScript，引擎全部可在 Node 单测）
│   ├── app.json / app.wxss    # 全局配置 & 暖纸视觉基调
│   ├── custom-tab-bar/        # 自定义底部导航（浮动胶囊 + 滑动指示器）
│   ├── pages/                 # home / map(地球+图鉴) / place / exploration / knowledge / quiz / profile …
│   ├── components/            # knowledge-popup（探索中的知识发现卡）等
│   ├── data/
│   │   ├── explorations/      # 四个世界的场景数据（stages / knowledgeNodes / route）
│   │   ├── expeditions/       # 路线引擎附件（289 点真实路线、阶段映射、相机、视觉模式）
│   │   ├── media/             # 媒体候选清单 + 各世界 MediaManifest（approved-only）
│   │   ├── routes/            # 珠峰真实路线几何（控制点 + 里程碑 GPS）
│   │   └── places / knowledge / quizzes / landforms / processes / discoveries
│   ├── engine/                # 探索引擎、路线投影、媒体注册表、内容校验、地球渲染器
│   ├── services/              # exploration-store / quiz-store / favorites（本地持久化）
│   ├── utils/                 # 纯函数工具（全部可 Node 单测）
│   └── assets/                # world（地球纹理/主视觉）/ content（各世界运行时媒体）/ expeditions
├── design/
│   ├── reference/             # 视觉规格（expedition-v2，实现以此为准）
│   ├── world/                 # DEM 渲染预览、路线控制点、LIVE 校准
│   ├── brand/                 # Logo、头像导出、品牌提案
│   └── content/               # 内容审计 / 覆盖报告 / 媒体评审板 / 发布就绪报告
├── scripts/                   # 构建与内容工具链（terrain 渲染管线 / content 媒体与报告）
├── tests/                     # vitest：552 个用例（数据契约 / 回归 / 发布冻结）
└── dist/                      # 构建产物（随仓库提交，开发者工具加载这里）
```

## 🗻 那 3D 地形是怎么来的

简短版：**我们让山自己长出来。**

1. 下载 Copernicus GLO-30 的两个 1° DEM 瓦片（珠峰刚好骑在 N27/N28 边界上，命运多舛）
2. `scripts/terrain/prepare_everest_dem.py` 裁剪出 86.70°E–86.99°E × 27.80°N–28.10°N，生成高程网格 + 雪线掩膜
3. Blender 把高程网格变成实体地形（Workbench 渲染，顶点着色：雪线以上白、以下岩石棕）
4. 相机机位各自渲染，再裁成小程序用的竖幅；八张 waypoint 局部图同样来自这套 DEM
5. 南坳路线由 8 个 GPS 路点 + Catmull-Rom 平滑生成 289 个控制点，贴着地形走，不穿山不悬空

## 🧪 数据可信度与媒体规则

- 四个世界的每个 waypoint 都带 `sources`（可溯源），近似值显式标记「近似」；知识库 41 条 100% 有来源，其中 12 条为 A/B 级机构来源（NOAA / NPS / USGS / NSIDC / 大学与研究所）
- 媒体走**候选 → 人工评审 → 运行时**三级管线：`data/media/candidates.ts` 登记候选（来源/许可/地理角色三证核验），评审板人工过目后晋升进 `MediaManifest`，`MediaRegistry` 只承认 approved 资产
- **诚实 fallback 政策**：找不到可信现场照片的节点（如马里亚纳的中层水柱）宁可留白或用地形渲染，也不用无关图片凑覆盖率；来源不明的历史占位图已全部退役
- 内容质量由自动化门禁把关：知识图谱引用 / 媒体归属 / 资产断链 / 路线进度 / Quiz 答案合法性，`npm run content:validate` 目标 0 error

## 🗺️ Roadmap

- [x] 世界图鉴：49 个真实地点的搜索/筛选/详情/收藏
- [x] 四个探索世界：珠峰 / 马里亚纳 / 富士山 / 大峡谷，全部接入路线引擎
- [x] 地球主入口 + 真实影像与知识图谱（41 条知识、跨世界关联、随堂题全接通）
- [ ] Windows 微信开发者工具逐世界视觉验收（当前 Linux 基线已就绪，见 `design/content/final/windows-visual-qa-checklist.md`）
- [ ] 真·可交互 3D 模型（threejs-miniprogram + draco 压缩网格，分包加载）
- [ ] 成就系统（现在只有「登顶成功」和你的求胜欲）
- [ ] 账号同步（目前进度存在本地，清缓存=下山重来）

## 📄 License

MIT —— 拿去玩，别把珠峰移走。

---

<div align="center">
  <sub>🧗 本项目不提供氧气瓶。缺氧请上滑离开死亡区。</sub>
</div>
