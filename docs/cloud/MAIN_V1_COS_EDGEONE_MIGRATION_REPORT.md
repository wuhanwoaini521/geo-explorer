# Legacy Main Branch · COS + EdgeOne 媒体迁移全阶段实施报告

> 编制日期：2026-09-18  
> 目标分支：`main` (Legacy Main)  
> 执行状态：**STAGE 1 ~ 18 全部完成，基础设施与门禁测试就绪，保持未批量上传（WAITING_MASS_UPLOAD_APPROVAL）**  
> 安全级别：**STRICT CONFIDENTIAL（零凭证输出、私有存储桶、前缀硬隔离）**

---

## 1. 架构总览 (Architecture Overview)

本项目基于微信小程序的 2MB 主包包体限制，完成了 Legacy Main 分支全量大型静态资源的远程托管基础设施演进。

```
[Legacy Main Runtime UI] (home / map / knowledge / exploration / place)
              │
              ▼
   [MediaRegistry / Helpers] (approved-only 契约)
              │
              ▼
    [resolveMediaSrc(mediaKey)] (miniprogram/services/media-service.ts)
              │
      ┌───────┴──────────────────────┐
      ▼                              ▼
 [本地模式 (空基址)]            [正式生产环境]
  /assets/<mediaKey>           GEO_MEDIA_BASE_URL (EdgeOne CDN 交付)
 (开发调试与单测)             https://<edgeone-domain>/geo-media/main-v1/
                                     │
                                     ▼
                        [EdgeOne 边缘安全加速与缓存]
                                     │ (私有鉴权回源)
                                     ▼
                        [腾讯云 Private COS Origin]
                        Bucket: geo-explore-1300119616
                        Region: ap-guangzhou
                        Prefix: geo-media/main-v1/**
```

---

## 2. 旧 CloudBase 体系审计与收敛 (Retirement of CloudBase)

- **历史现状**：此前项目中存在基于 `tcb` CLI 的 `scripts/media-deploy.mjs`，依赖已废弃的微信云开发环境占位。该 CLI 在本地开发环境未配置且无凭证，导致一直处于 `Gate 4B BLOCKED`。
- **收敛决策**：**绝不维护双套上传体系**。
  - 废弃并替换 `scripts/media-deploy.mjs` 中的 `tcb` 代码；
  - 统一由 `scripts/media-cos-deploy.mjs` 承接所有部署、防碰撞检查、清单生成与批量上传能力；
  - `npm run media:deploy` 与 `npm run media:cos-main` 统一绑定至 COS 基础设施。

---

## 3. 环境变量与配置设计 (Configuration Design)

统一使用腾讯云 COS 标准环境命名规范，并通过平滑兼容策略支持现有体系：

| 配置项 | 变量名 | 默认值 / 来源 | 作用说明 |
| :--- | :--- | :--- | :--- |
| **存储桶** | `COS_BUCKET` | `geo-explore-1300119616` | 用户已申请的专属私有存储桶 |
| **地域** | `COS_REGION` | `ap-guangzhou` | 华南广州地域 |
| **专属前缀** | `COS_PREFIX` | `geo-media/main-v1/` | **旧 main 分支独占前缀** |
| **API 身份** | `COS_SECRET_ID` | `env` / `.env.local` | 腾讯云 CAM API 凭据，不输出、不入库 |
| **API 密钥** | `COS_SECRET_KEY` | `env` / `.env.local` | 腾讯云 CAM API 凭据，不输出、不入库 |
| **交付基址** | `GEO_MEDIA_BASE_URL` | `env` / `.env.local` | EdgeOne 公网 HTTPS 交付地址 |
| **兼容别名** | `MEDIA_REMOTE_BASE` | 同上 | 旧代码与构建命令的平滑兼容别名 |

---

## 4. 前缀物理隔离与安全防火墙 (Prefix Isolation Firewall)

为保护 V2 分支（`redesign/china-landform-v2`）及其他共享环境的云端资产，`scripts/lib/cos-client.mjs` 构建了不可逾越的代码级前缀防火墙：

1. **白名单强制**：
   所有旧 main 分支发起的 COS 请求（HeadObject / PutObject / ListObjects），目标 key **必须**以 `geo-media/main-v1/` 开头；
2. **黑名单强制阻断**：
   内置对以下 V2 活跃前缀的即时阻断：
   - `geo-media/places/**` ❌ 严格禁止
   - `geo-media/test/**` ❌ 严格禁止
   - `geo-media/legacy/v1/**` ❌ 严格禁止
3. **前置拦截**：
   任何非法前缀在建立网络连接或计算签名之前直接抛出 `PrefixIsolationViolationError`。

---

## 5. 迁移资产全量审计结果 (Baseline & Inventory)

详见完整资产清单：[MAIN_V1_MEDIA_INVENTORY.md](file:///d:/code/self-github/geo-explorer/docs/cloud/MAIN_V1_MEDIA_INVENTORY.md)。

- **远端对象总数**：46 项（全部位于 `media-remote/`）
- **远端总字节数**：5,112,904 字节（4.88 MiB）
- **本地保留包内资产**：
  - `assets/ui/media-placeholder.svg` (626 B)
  - `assets/world/globe-texture-realistic-2048.jpg` (528 KB，首屏离线渲染关键贴图)
  - `assets/world/world-map.svg` (1,076 B)
- **碰撞检查 (Collision Check)**：**0 冲突**，46 个本地文件映射到 46 个独立合规的 COS 键。
- **版权与许可分类**：
  - **A 类（公版 / 机构开源许可）**：33 项（NPS, NOAA, GEBCO, CC BY-SA 等）
  - **B 类（项目自制 Copernicus DEM 渲染）**：11 项（珠峰航点与地形图）
  - **C 类（需后续人工复核许可）**：2 项（`k-hillary-tenzing.jpg`, `k32-modern-climb.jpg` 明确标注 `LICENSE_REVIEW_REQUIRED`）
  - **D 类（来源未知）**：0 项

---

## 6. 运行时解析器与兜底体系 (Runtime Resolver & Fallback)

- **单点解析**：整个前端业务层（`pages/home`, `pages/map`, `pkg-explore/pages/exploration`, `pkg-detail/pages/knowledge-detail` 等）**100% 通过 `resolveMediaSrc(mediaKey)` 解析**，没有任何页面写死 CDN 或 COS 域名；
- **分层兜底**：
  - 空键 / 异常值：直接返回通用轻量占位图 `/assets/ui/media-placeholder.svg`；
  - 网络错误：WXML 统一绑定 `binderror` 触发降级；
  - 知识库：未绑定媒体项走各知识主题分类语义兜底，无图项显示主题分类 Emoji，不出现破图或无关占位；
  - 地球渲染：次要光照图（高光/高度）加载失败时自动保持基础光照渲染，不阻塞主场景交互。

---

## 7. 生产构建守卫 (Production Build Guard)

- `scripts/check-media-config.mjs` 作为 `npm run build:prod` 的第一道闸门：
  - 校验 `GEO_MEDIA_BASE_URL` 或 `MEDIA_REMOTE_BASE` 是否配置；
  - 强制要求协议必须为 `https://`；
  - 强制要求必须以 `/` 结尾（防止路径拼接错误）；
  - 强制要求 URL 中不得包含用户名/密码凭据（`user:pass@`）；
  - 若不满足要求，**直接阻断生产出包**，防止生产环境出现大面积白屏或占位图。

---

## 8. 自动化测试套件 (Automated Verification)

新增专用单元测试套件 [tests/cos-media-migration.test.ts](file:///d:/code/self-github/geo-explorer/tests/cos-media-migration.test.ts)，涵盖：

1. **Prefix 隔离性测试**：正向验证 `geo-media/main-v1/`，逆向阻断非法前缀；
2. **V2 保护防火墙测试**：严格阻断 `geo-media/places/`、`geo-media/test/`、`geo-media/legacy/v1/`；
3. **Canonical Key 字符集测试**：严格只允许 `[a-z0-9/_\-.]`，阻断大写、空格、中文、特殊字符与路径穿越；
4. **MIME 探测测试**：准确识别 `.jpg`, `.png`, `.webp`, `.svg`, `.txt`, `.json`；
5. **凭证脱敏函数测试**：验证各类 Secret、Signature、Auth Header 在字符串中被安全替换为 `[REDACTED]`；
6. **COS 签名生成测试**：验证 Q-Sign-Algorithm=sha1 规范签名结构；
7. **碰撞检测算法测试**：验证 46 项资产 1:1 映射，并能准确识别模拟冲突；
8. **解析器解析与回退测试**：验证本地、远端、空键与 EdgeOne 交付拼接逻辑；
9. **生产构建守卫测试**：验证安全协议、结尾斜杠与非法字符拦截。

---

## 9. 当前状态与下一步行动 (Status & Next Steps)

- **当前状态**：`ORIGIN_READY` / `EDGEONE_PENDING` / `WAITING_MASS_UPLOAD_APPROVAL`
- **尚未执行的操作（严格按红线把控）**：
  - ❌ **未执行批量上传**（46 项资产安全保留在本地 `media-remote/`，仅待用户确认后执行）；
  - ❌ **未删除任何旧本地资产**；
  - ❌ **未修改任何云端存储桶 ACL 或 CAM 权限**；
  - ❌ **未修改 EdgeOne 任何在线配置**。

### 用户后续执行指南（当准备好上传时）：

1. **配置本地凭证**：
   在根目录创建 `.env.local`（已自动被 `.gitignore` 忽略，安全不入库）：
   ```env
   COS_REGION=ap-guangzhou
   COS_BUCKET=geo-explore-1300119616
   COS_PREFIX=geo-media/main-v1/
   COS_SECRET_ID=your_secret_id_here
   COS_SECRET_KEY=your_secret_key_here
   ```
2. **执行连通性微型 Smoke 测试**：
   ```bash
   npm run media:cos-main -- --smoke
   ```
3. **执行批量上传**：
   ```bash
   npm run media:cos-main -- --execute-mass-upload
   ```
4. **配置 EdgeOne 域名并完成健康检查**：
   ```bash
   GEO_MEDIA_BASE_URL=https://<your-edgeone-domain>/geo-media/main-v1/ npm run media:check -- --hash
   ```
