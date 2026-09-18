# Geo Explorer CloudBase 媒体资源迁移与申请指南

> 状态：待申请云环境后实施
>
> 编制日期：2026-09-15
>
> 关联文档：[2026 微信小程序开发大赛参赛开发基线](./2026-wechat-mini-program-contest-requirements.md)
>
> 目标：在不破坏四世界视觉与核心交互的前提下，将正式发布包控制在微信限制内，并保证赛事评审期稳定运行。

## 1. 结论与推荐方案

Geo Explorer 当前构建产物约 27.8 MiB，其中图片约 26.7 MiB。业务代码和非媒体文件约 1.1 MiB，发布阻塞主要由媒体资源造成，而不是应用代码本身。

本项目采用以下方案：

1. 使用与小程序 AppID 绑定的 CloudBase 环境。
2. 大型地球纹理、探索主视觉、地点照片和知识图片放入 CloudBase 云存储。
3. 云存储资源设置为“公开读取、客户端禁止写入”，文件只由管理员在控制台或部署工具上传。
4. 仓库保存稳定的云文件 ID 和内容哈希，不保存有时效的临时 HTTPS 地址。
5. 小程序启动时初始化 `wx.cloud`，由统一资源服务将资源键解析为可加载地址或本地缓存文件。
6. WebGL/Canvas 纹理先下载为本地临时文件，再交给 `canvas.createImage()`，降低不同真机对远程图片支持差异带来的风险。
7. 发布包仅保留小图标、轻量占位图和必要兜底资源；开发模式仍可使用本地完整资源。
8. 正式上线前升级到能覆盖赛事周期的稳定套餐，至少维持至 2026-12-15。

该方案比立即拆分全部页面风险更低。媒体迁移和发布压缩完成后，主包预计已经接近 1.5 MiB 内部目标；只有复测仍超标时再实施页面分包。

## 2. 当前资源基线

### 2.1 按目录统计

| 目录 | 文件数 | 大小 | 迁移结论 |
| --- | ---: | ---: | --- |
| `miniprogram/assets/world/` | 9 | 19.88 MiB | 大图上云；只保留 SVG 和轻量兜底 |
| `miniprogram/assets/content/` | 36 | 5.46 MiB | 全部正式内容图片上云 |
| `miniprogram/assets/expeditions/` | 9 | 1.35 MiB | 实景和航点图片上云 |
| 合计 | 54 | 约 26.69 MiB | 发布包中只保留轻量白名单 |

### 2.2 优先迁移资源

| 资源 | 当前大小 | 处理方式 |
| --- | ---: | --- |
| `globe-texture-realistic-4096.png` | 10.23 MiB | 上云；仅高画质模式按需下载 |
| `globe-texture-realistic-2048.png` | 3.58 MiB | 上云；地图默认纹理 |
| `everest-expedition-hero-v1.png` | 2.85 MiB | 上云；压缩后作为探索主视觉 |
| `globe-specular-4096.png` | 1.51 MiB | 上云；仅高画质模式按需下载 |
| `globe-height-4096.png` | 0.83 MiB | 上云；仅高画质模式按需下载 |
| `globe-specular-2048.png` | 0.57 MiB | 上云 |
| `globe-height-2048.png` | 0.31 MiB | 上云 |
| `live-a-kala-patthar.jpg` | 0.53 MiB | 上云 |
| `assets/content/**/*.jpg` | 约 5.46 MiB | 上云并保留来源与许可元数据 |
| `assets/expeditions/everest/waypoints/*.jpg` | 约 0.82 MiB | 上云 |

### 2.3 发布包保留内容

发布包只保留：

- `world-map.svg` 等体积很小且首屏必需的资源。
- 自定义 TabBar、小图标和分类占位图。
- 一张经过压缩的低清地球兜底图，建议不超过 100 KiB。
- 每个资源类别一张语义正确的轻量占位图，建议单张不超过 30 KiB。
- 远程加载失败时仍能保持页面可操作所需的资源。

下列文件不进入发布包：

- 4096/2048 正式地球纹理。
- 实景主视觉、内容照片和航点图。
- `globe-texture-source.txt` 等素材说明文件。
- 对照图、制作源文件、评审板、截图和校准工具资源。

## 3. 目标架构

```text
微信小程序正式包
├── 页面、引擎、数据与样式
├── 资源键和云文件清单
├── 小图标与轻量占位图
└── asset-service
    ├── local 模式：开发期读取仓库资源
    ├── cloud 模式：正式版解析 CloudBase fileID
    ├── image 模式：批量换取可显示 URL
    └── canvas 模式：下载到本地后交给 Canvas/WebGL

CloudBase 生产环境
├── 云存储
│   └── geo-explorer/prod/v1/
│       ├── world/
│       ├── content/everest/
│       ├── content/mariana/
│       ├── content/fuji/
│       ├── content/colorado/
│       └── expeditions/everest/waypoints/
└── 云函数（后续 AI 能力）
    └── geo-guide
```

## 4. 为什么选择 CloudBase

- 与微信小程序 AppID 和用户身份体系直接集成。
- 小程序端可以通过 `wx.cloud` 调用云存储和云函数。
- 云存储底层使用 COS，并集成 CDN，不需要为比赛单独搭建服务器。
- 可以用云文件 ID 表示资源，避免将短期签名 URL 固化进仓库。
- 后续 AI 地理向导可以复用同一环境，通过云函数保存模型密钥。

当前官方规则需要注意：免费体验环境在小程序正式发布后，到期时间会调整为上线后第 15 天。比赛初审和决赛跨越该期限，因此免费环境只适合开发和提审前验证，不能作为整个赛事期的唯一保障。

## 5. 申请前准备

在申请 CloudBase 前确认：

- [ ] 已有可用的微信小程序 AppID。
- [ ] 当前登录微信开发者工具的账号具备该小程序开发权限。
- [ ] 小程序管理员可以扫码完成腾讯云授权。
- [ ] 确定使用哪个腾讯云主账号；避免误绑到以后无法管理的个人账号。
- [ ] 账号已绑定手机和邮箱，可接收账单、到期和用量告警。
- [ ] 准备环境名 `geo-explorer-prod`。
- [ ] 接受赛事期约 40 至 60 元的云服务预算上限，最终价格以购买页为准。

腾讯云账号与小程序的绑定关系需要谨慎选择。官方文档说明，一个腾讯云账号只能关联一个小程序；换绑涉及环境销毁和身份验证，不应先随意创建再迁移。

## 6. CloudBase 申请步骤

### 6.1 从微信开发者工具开通

1. 使用小程序管理员或具备开发权限的微信登录微信开发者工具。
2. 打开 Geo Explorer 项目，确认项目 AppID 正确，不是测试号。
3. 点击开发者工具顶部的“云开发”。
4. 如果尚未开通，点击“开通”，阅读并接受云开发服务条款。
5. 选择与该小程序绑定的腾讯云主账号并完成授权。
6. 创建环境，环境名称填写 `geo-explorer-prod`。
7. 首次可以选择免费体验环境完成接入验证；正式发布前必须检查上线后的到期时间并决定是否升级。
8. 创建完成后，在“设置 → 环境设置”复制环境 ID。

环境 ID 形如：

```text
geo-explorer-prod-xxxxxxxxxx
```

环境 ID 不是模型密钥，可以写入小程序生产配置；腾讯云 SecretId、SecretKey、模型 API Key 和其他密钥绝不能写入仓库或聊天记录。

### 6.2 检查账号与环境

创建完成后记录：

| 字段 | 填写值 |
| --- | --- |
| 小程序 AppID | 由申请人填写 |
| 腾讯云主账号名称/ID | 由申请人填写，不提交到公开仓库 |
| CloudBase 环境名称 | `geo-explorer-prod` |
| CloudBase 环境 ID | 由申请人填写 |
| 环境类型/套餐 | 免费体验版或个人版 |
| 到期时间 | 由申请人填写 |
| 自动续费 | 建议关闭，改用到期提醒 |
| 月预算告警 | 建议 20 元 |
| 总预算上限 | 建议 60 元，覆盖赛事期 |

如果在腾讯云控制台创建了环境但微信开发者工具看不到，应先确认腾讯云账号与小程序绑定一致，再到开发者工具云控制台的“设置 → 环境设置 → 管理我的环境 → 使用已有腾讯云环境”导入。

## 7. 云存储配置步骤

### 7.1 创建目录

在 CloudBase 控制台进入“云存储”，按以下结构创建目录：

```text
geo-explorer/prod/v1/world/
geo-explorer/prod/v1/content/everest/
geo-explorer/prod/v1/content/mariana/
geo-explorer/prod/v1/content/fuji/
geo-explorer/prod/v1/content/colorado/
geo-explorer/prod/v1/expeditions/everest/live/
geo-explorer/prod/v1/expeditions/everest/waypoints/
```

路径必须包含版本号。资源内容发生变化时创建 `v2/`，不能覆盖仍被线上版本引用的 `v1/` 文件。这样可以利用 CDN 长缓存，同时支持回滚。

### 7.2 设置权限

这些文件是公开展示的应用素材，不包含用户隐私。推荐设置为公开读取、客户端禁止写入：

```json
{
  "read": true,
  "write": false
}
```

含义：

- 所有用户可以读取图片。
- 小程序客户端不能上传、覆盖或删除文件。
- 管理员仍可通过云控制台或服务端管理文件。

设置入口：CloudBase 控制台 → 云存储 → 权限设置 → 自定义安全规则。修改后可能需要 1 至 3 分钟生效。

不要设置“公共读写”。本项目不需要用户上传媒体，开放客户端写权限只会增加滥用和费用风险。

### 7.3 上传资源

首次迁移建议使用云控制台上传，避免在本地保存腾讯云管理密钥：

1. 上传前保持当前文件名不变，降低代码映射错误。
2. 按第 7.1 节目录逐批上传。
3. 上传完成后抽查文件大小、图片尺寸和预览结果。
4. 复制每个文件的 `cloud://` 文件 ID。
5. 导出或人工整理为资源清单，交给后续代码迁移使用。

资源清单建议格式：

```json
{
  "version": "v1",
  "environment": "geo-explorer-prod-xxxxxxxxxx",
  "assets": {
    "world.globe.color.2048": {
      "fileId": "cloud://geo-explorer-prod-xxxxxxxxxx/geo-explorer/prod/v1/world/globe-texture-realistic-2048.png",
      "sha256": "上传前文件哈希",
      "bytes": 3754025
    }
  }
}
```

仓库中可以保存环境 ID、fileID、文件字节数和 SHA-256；不要保存控制台登录信息、SecretId、SecretKey 或模型密钥。

## 8. 代码迁移设计

本节描述后续需要实施的代码变更，本次只建立方案，不直接修改运行代码。

### 8.1 增加环境配置

在 `miniprogram/config/index.ts` 中增加：

```ts
export const CONFIG = {
  env: "production" as "development" | "production",
  cloud: {
    enabled: true,
    environmentId: "geo-explorer-prod-xxxxxxxxxx",
    assetVersion: "v1",
  },
};
```

开发环境使用本地资源，正式构建使用 CloudBase 资源。环境切换必须是显式配置，不能根据开发者工具状态猜测。

### 8.2 初始化 CloudBase

在 `miniprogram/app.ts` 的 `onLaunch` 中初始化：

```ts
if (wx.cloud && CONFIG.cloud.enabled) {
  wx.cloud.init({
    env: CONFIG.cloud.environmentId,
    traceUser: true,
  });
}
```

当前基础库版本高于 CloudBase 小程序端最低要求，但仍需验证正式版基础库兼容性。

### 8.3 建立统一资源服务

新增 `miniprogram/services/asset-service.ts`，职责限定为：

- 接收稳定资源键，不让页面自行拼接云路径。
- 本地开发模式返回 `/assets/...`。
- 云模式根据版本化清单返回 fileID。
- 批量调用 `wx.cloud.getTempFileURL` 解析普通图片地址。
- 调用 `wx.cloud.downloadFile` 为 WebGL/Canvas 获得本地临时路径。
- 按 fileID 和 SHA-256 做运行期缓存和失效处理。
- 云资源失败时返回语义正确的本地占位图。

建议接口：

```ts
type AssetKey = string;

interface ResolvedAsset {
  key: AssetKey;
  src: string;
  source: "local" | "cloud" | "cache" | "fallback";
}

resolveImage(key: AssetKey): Promise<ResolvedAsset>;
resolveCanvasImage(key: AssetKey): Promise<ResolvedAsset>;
preload(keys: AssetKey[]): Promise<void>;
clearStaleCache(version: string): Promise<void>;
```

### 8.4 调整媒体模型

当前 `MediaAsset.localPath` 被视为正式运行资产的必填字段。迁移时应改为明确的双来源结构，例如：

```ts
interface MediaLocation {
  key: string;
  localFallback?: string;
  cloudFileId?: string;
}
```

页面和渲染引擎只依赖资源键或解析后的 `src`，不再直接依赖 `localPath`。来源、许可、credit、SHA-256 等现有元数据继续保留。

### 8.5 普通图片加载

首页、发现页、知识卡和地点页通过 `asset-service` 批量解析资源，再把 HTTPS 地址交给 `<image>`。批量解析应去重，并遵守 `getTempFileURL` 单次文件数量限制。

公开只读资源可以获得长期可访问地址，但仓库仍保存 fileID；这样将来更换域名或存储策略时不需要改写全部业务数据。

### 8.6 WebGL 和 Canvas 纹理加载

当前 WebGL 渲染器动态拼接 2048/4096 本地路径，Canvas 2D 渲染器固定读取 2048 本地纹理。迁移后：

1. 页面根据画质选择确定资源键。
2. `asset-service.resolveCanvasImage()` 调用 `wx.cloud.downloadFile`。
3. 下载成功后将 `tempFilePath` 赋值给 `canvas.createImage().src`。
4. 下载或解码失败时保留现有基础光照和交互，并使用低清本地兜底。
5. 4096 资源默认不预加载，仅在用户显式选择高画质时下载。
6. 2048 纹理可在进入地图后预加载；不能阻塞小程序首屏结构渲染。

### 8.7 调整构建脚本

当前 `scripts/copy-assets.mjs` 会把 `miniprogram/` 内所有 PNG/JPG/WebP/SVG 复制到 `dist/miniprogram/`。迁移后应改为发布白名单：

- 始终复制 WXML、WXSS、JSON 和必要 SVG。
- 图片只复制 `assets/runtime/` 白名单目录。
- 本地完整媒体保留在源码或素材源目录供开发、验证和重新上传，不进入 production 构建。
- 构建结束后检查发布产物中不存在大于预算的媒体文件。

建议提供两个显式构建模式：

```text
npm run build              # production：云资源 + 轻量本地兜底
npm run build:local-media  # development：完整本地媒体，仅供开发者工具验证
```

禁止通过手工删除 `dist/` 图片生成一次性发布包；构建结果必须可重复。

## 9. AI 云函数预留

CloudBase 环境申请完成后，可以复用同一环境实现 `geo-guide` 云函数：

- 模型 API Key 只保存在云函数环境变量或密钥管理中。
- 小程序通过 `wx.cloud.callFunction` 调用。
- 云函数限制单次输入长度、输出长度、调用频率和超时时间。
- 回答上下文来自项目已核验知识库，模型不可用时回退到知识卡。
- 函数权限只允许小程序已识别用户调用；按 OpenID 做频率限制。

赛事赠送的 Coding Plan Token 是否允许生产调用尚未确认，不能在申请 CloudBase 时把它当作唯一运行依赖。

## 10. 实施阶段

### 阶段 A：申请与人工配置

负责人：用户。

- [ ] 开通并绑定正确的 CloudBase 环境。
- [ ] 记录环境 ID、套餐、到期时间和预算设置。
- [ ] 创建云存储目录。
- [ ] 设置公开读取、客户端禁止写入。
- [ ] 将环境 ID 提供给代码实施阶段。

完成标志：开发者工具能看到环境，云存储测试图片可以被当前小程序读取。

### 阶段 B：资源清单与上传

负责人：代码实施者与用户共同完成。

- [ ] 生成正式资源清单、SHA-256 和大小报告。
- [ ] 上传所有远程资源。
- [ ] 校验云文件数量、文件大小和哈希。
- [ ] 将 cloud fileID 写入版本化清单。

完成标志：本地清单与云端对象一一对应，无缺失和错误版本。

### 阶段 C：客户端迁移

负责人：代码实施者。

- [ ] 初始化 `wx.cloud`。
- [ ] 增加资源服务和缓存。
- [ ] 迁移媒体数据模型。
- [ ] 修改普通图片、WebGL 和 Canvas 2D 加载链路。
- [ ] 保留轻量本地兜底。

完成标志：本地模式和云模式都可运行，云资源失败不阻断核心交互。

### 阶段 D：生产构建瘦身

负责人：代码实施者。

- [ ] 构建脚本改为资源白名单。
- [ ] 开启 JS、WXML、WXSS 压缩。
- [ ] 删除未使用的 `progress-bar` 自定义组件引用和组件文件。
- [ ] 生成并检查 `dist/miniprogram/`。

完成标志：主包低于微信硬限制，目标不超过 1.5 MB；没有临时文件或完整大图进入发布产物。

### 阶段 E：上线验证

负责人：代码实施者与用户。

- [ ] iOS 真机验证。
- [ ] Android 真机验证。
- [ ] Wi-Fi、移动网络和弱网验证。
- [ ] WebGL 主路径和 Canvas 2D 兜底验证。
- [ ] 四世界主视觉、知识图和航点图完整。
- [ ] 开发者工具代码质量、依赖分析和包体分析通过。
- [ ] 提交审核后验证正式版本，而不是只验证开发版。

完成标志：线上扫码可完成四世界核心流程，监控无持续 403、404 或云资源超限。

## 11. 验收标准

### 11.1 包体

- `dist/miniprogram/` 不包含完整地球纹理、内容照片或航点图。
- 主包目标不超过 1.5 MB。
- 主包和任何分包不超过微信当前硬限制。
- 发布产物内没有单张超过 200 KiB 的图片；如有例外，必须记录原因。

### 11.2 功能

- 地图默认态、选中态、拖拽和地点点击正常。
- 2048 地球贴图正常加载，4096 高画质按需加载。
- WebGL 失败时 Canvas 2D 能继续工作。
- 地点封面、知识卡和探索航点图片不串图、不出现同一无关占位图。
- 网络失败时显示对应分类占位，并提供重试机会。

### 11.3 安全与成本

- 客户端无法向云存储写入、覆盖或删除文件。
- 仓库和构建产物中不存在云管理密钥或模型密钥。
- 用量告警、到期提醒和预算边界已配置。
- 云环境有效期覆盖赛事评审期。

### 11.4 工程质量

- `npm run typecheck` 通过。
- `npm run build` 通过。
- `npm test` 通过。
- `npm run content:validate` 通过。
- 云资源清单校验通过。
- 微信开发者工具真机截图验证完成。

## 12. 回滚方案

迁移过程中必须保持可回滚：

1. 不覆盖或删除 `v1` 云文件，升级资源使用新的版本目录。
2. 资源清单随代码版本控制；回滚代码即可恢复上一组 fileID。
3. 在云模式真机验证完成前保留本地完整媒体源文件。
4. 正式发布包只保留轻量兜底，云服务故障时保证页面可进入和文字知识可阅读。
5. 如果 CloudBase 接入在首次提审前仍不稳定，优先关闭 4096 模式和非核心图片，不能恢复当前 27.8 MiB 全量打包方式。

## 13. 申请完成后需要提供的信息

完成第 6、7 节后，只需提供以下非敏感信息，即可开始代码迁移：

- CloudBase 环境 ID。
- 环境套餐类型和到期时间。
- 云存储权限已经设置为公开读取、客户端禁止写入的确认。
- 一张测试图片的 cloud fileID，用于验证加载链路。
- 是否允许使用控制台手工上传第一批资源，或希望后续建立自动上传脚本。

不要提供腾讯云账号密码、SecretId、SecretKey、短信验证码、模型 API Key 或其他管理凭证。

## 14. 官方文档

以下官方页面于 2026-09-15 核对：

- CloudBase 快速开始：<https://cloud.tencent.com/document/product/876/121103>
- 微信小程序 CloudBase 快速开始：<https://docs.cloudbase.net/quick-start/frameworks/wechat-miniprogram>
- CloudBase 环境与账号关联：<https://cloud.tencent.com/document/product/876/18438>
- CloudBase 账号与小程序绑定：<https://cloud.tencent.com/document/faq/876/57380>
- CloudBase 云存储介绍：<https://docs.cloudbase.net/storage/introduce>
- 云存储文件管理：<https://docs.cloudbase.net/storage/manage>
- 云存储安全规则：<https://docs.cloudbase.net/storage/security-rules>
- CloudBase 价格与免费环境限制：<https://cloud.tencent.com/document/product/876/75213>

控制台名称和入口可能随版本调整。实际申请时若界面与文档不同，以当前控制台显示为准，并记录差异后更新本文档。
