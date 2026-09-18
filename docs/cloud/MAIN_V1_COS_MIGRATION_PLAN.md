# Main V1 媒体资源 COS + EdgeOne 迁移实施计划书

> 编制日期：2026-09-18
> 状态：**PLAN_APPROVED_AWAITING_UPLOAD**（实施工具与预检就绪，等待用户确认执行上传）
> 目标分支：`main` (Legacy Main)

---

## 1. 迁移目标与范围

- **迁移资产**：`media-remote/` 下全量 46 个运行时实景、DEM 裁切及高分辨率地球材质大图（总计 5,112,904 字节，约 4.88 MiB）。
- **目标存储**：腾讯云 COS 私有存储桶 `geo-explore-1300119616`（Region: `ap-guangzhou`）。
- **专属对象前缀**：`geo-media/main-v1/**`（严格隔离，绝不触碰 V2 `geo-media/places/` 与 `geo-media/legacy/v1/`）。
- **交付网络**：EdgeOne 边缘安全加速平台（绑定私有 COS Origin）。
- **终端消费**：统一通过 `resolveMediaSrc(mediaKey)` 经 `GEO_MEDIA_BASE_URL` 解析。

---

## 2. 安全与隔离红线（Strict Guardrails）

1. **凭据安全**：
   - 绝不向终端或日志打印 `COS_SECRET_ID`、`COS_SECRET_KEY`、`Authorization` 或签名字符串；
   - 严禁将密钥写入任何源码、JSON 或提交到 Git；
   - `.env.local` 已纳入 `.gitignore`，仅保存在开发者本地。
2. **前缀物理隔离**：
   - 目标 key 必须以 `geo-media/main-v1/` 开头；
   - 工具内置硬编码拦截器，对 `geo-media/places/`、`geo-media/test/`、`geo-media/legacy/v1/` 实施零容忍拦截（在发送 HTTP 请求前直接抛出 `PrefixIsolationViolationError`）。
3. **权限最小化**：
   - 严禁修改存储桶访问控制列表（ACL），保持私有；
   - 严禁修改 CAM 策略为管理员；
   - 严禁删除云端现有任何对象。
4. **两阶段执行保护**：
   - 默认执行均为 Dry Run（只读计算与防碰撞比对）；
   - 批量上传必须显式附加 `--execute-mass-upload` 参数，杜绝误触。

---

## 3. 标准迁移八步法流程

```
[本地 media-remote/]
       │
       ▼ (Step 1: Dry Run)
 npm run media:cos-main -- --dry-run
       │
       ▼ (Step 2: Smoke Connectivity)
 npm run media:cos-main -- --smoke  ──> [geo-media/main-v1/test/connectivity.txt]
       │
       ▼ (Step 3: Mass Upload - 需显式确认)
 npm run media:cos-main -- --execute-mass-upload ──> [Private COS: geo-media/main-v1/**]
       │
       ▼ (Step 4: Origin Health Check)
 npm run media:check  ──> (COS HeadObject 46/46 校验)
       │
       ▼ (Step 5: EdgeOne Binding)
 在腾讯云控制台将 EdgeOne 站点源站指向私有 COS 桶
       │
       ▼ (Step 6: Public Delivery Check)
 GEO_MEDIA_BASE_URL=https://<edgeone-domain>/geo-media/main-v1/ npm run media:check
       │
       ▼ (Step 7: 微信公众平台配置)
 将 <edgeone-domain> 添加至 downloadFile 合法域名
       │
       ▼ (Step 8: 生产构建发布)
 GEO_MEDIA_BASE_URL=https://<edgeone-domain>/geo-media/main-v1/ npm run build:prod
```

---

## 4. 详细操作指南

### 步骤 1：本地预检与碰撞比对（已通过）

```bash
npm run media:cos-main -- --dry-run
```
- **验证项**：46 个本地文件与目标 COS Key 1:1 映射无重复，字符集均在 `[a-z0-9/_\\-.]` 内。

### 步骤 2：连通性与权限 Smoke 测试

在 `.env.local` 或环境变量中配置密钥后执行：

```bash
npm run media:cos-main -- --smoke
```
- **验证项**：仅向 `geo-media/main-v1/test/connectivity.txt` 发送一个微型探测对象，验证 PutObject、HeadObject 及幂等性；
- 若提示 `CAM_PREFIX_PERMISSION_REQUIRED`，请在 CAM 控制台为 API 密钥补充对 `geo-media/main-v1/*` 的操作权限。

### 步骤 3：批量上传 46 项媒体资源（用户授权后执行）

```bash
npm run media:cos-main -- --execute-mass-upload
```
- **机制**：逐文件通过 HeadObject 检查 `x-cos-meta-sha256`，相同哈希直接 SKIP（零带宽浪费与幂等写入）。

### 步骤 4：源站就绪验证

```bash
npm run media:check
```
- 在未接入 EdgeOne 域名时，工具会自动切换至私有 COS HeadObject 模式，逐一验证 46 个文件在源站的字节数与哈希。状态显示：`ORIGIN_READY, EDGEONE_PENDING`。

### 步骤 5 & 6：EdgeOne 域名接入与公网校验

在 EdgeOne 控制台完成私有 COS 鉴权源站回源配置后：
```bash
GEO_MEDIA_BASE_URL=https://<你的EdgeOne域名>/geo-media/main-v1/ npm run media:check -- --hash
```
- 全量 46 项文件经 EdgeOne 缓存层下载并校验 SHA-256，确保 CDN 回源与缓存正常。

### 步骤 7 & 8：生产构建出包

```bash
GEO_MEDIA_BASE_URL=https://<你的EdgeOne域名>/geo-media/main-v1/ npm run build:prod
```
- `build:prod` 守卫自动校验基址，通过后编译出包（主包体积保持在 1.58 MiB 以下，零内容媒体外溢）。
