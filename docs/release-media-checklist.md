# 发布媒体清单（Release Media Checklist）

Gate 4B 的发布前检查表。**当前状态：Gate 4B BLOCKED** —— 媒体尚未上传到任何真实存储，`CONFIG.media.remoteBase` 仍为空。

配套工具与文档：

| 用途 | 命令 / 文件 |
| --- | --- |
| 部署清单（确定性） | `deploy/media-manifest.v1.json`、`npm run media:manifest` |
| 上传 | `npm run media:deploy [-- --dry-run]` |
| 远端校验 | `MEDIA_REMOTE_BASE=… npm run media:check [-- --hash]` |
| 生产构建（含硬守卫） | `npm run build:prod` |
| 本地完整视觉开发 | `npm run build:local-media` |
| 迁移方案 | `design/cloudbase-media-migration-plan.md` |
| 架构与所有权 | `docs/media-ownership-gate4.md` |

---

## 0. 三种构建模式的职责

| 命令 | 用途 | 媒体来源 | 何时用 |
| --- | --- | --- | --- |
| `npm run build` | 通用构建 | 远端基址为空时走包内路径 | 日常开发、CI 静态检查 |
| `npm run build:local-media` | **本地完整视觉开发** | 把 `media-remote/**` 叠加进 `dist` | 在开发者工具里跑完整视觉、做视觉回归 |
| `npm run build:prod` | **发布** | 强制要求远端基址已配置 | 出正式包 |

`build:prod` 在下列任一情况下**拒绝出包**（退出码非 0，不产生 release 包）：

- `remoteBase` 为空；
- 不是 `https://` 开头；
- 不以 `/` 结尾（含尾随空格这类粘贴错误）；
- URL 中含凭证（`user:pass@`）。

失败示例：

```
Production media base is not configured.
Refusing to create release build.

  MEDIA_REMOTE_BASE = ""
  - 远端媒体基址为空
```

---

## 1. 发布检查表

- [ ] **存储环境已创建** —— CloudBase 环境名 `geo-explorer-prod`，记录环境 ID（形如 `geo-explorer-prod-xxxxxxxxxx`）
- [ ] **云存储目录已创建** —— `geo-explorer/prod/v1/{content,expeditions,world}/`
- [ ] **权限已设为「公开读取、客户端禁止写入」**
- [ ] **媒体已上传** —— `CLOUDBASE_ENV_ID=<env-id> npm run media:deploy`（上传前可先 `-- --dry-run` 预览）
- [ ] **期望文件数 = 46** —— `deploy/media-manifest.v1.json` 的 `count` 字段
- [ ] **远端健康检查 PASS** —— `MEDIA_REMOTE_BASE=https://<host>/geo-explorer/prod/v1/ npm run media:check -- --hash`（Expected 46 / Reachable 46 / Missing 0 / Size mismatch 0 / Hash mismatch 0）
- [ ] **remoteBase 已配置** —— 见下方「三种配置方式」
- [ ] **仓库中无凭证** —— `npx vitest run tests/media-deploy.test.ts`（含凭证边界用例）
- [ ] **微信 downloadFile 合法域名已配置** —— 见 §3（**MANUAL BLOCKER**）
- [ ] **生产构建 PASS** —— `npm run build:prod`
- [ ] **包体审计 PASS** —— `npm run package:audit`（Main < 1.5 MiB、本地内容媒体 = 0、包内远端媒体 = 0）
- [ ] **Android 真机 smoke PASS** —— 见 `docs/media-ownership-gate4.md` §10.1
- [ ] **iOS 真机 smoke PASS** —— 同上

---

## 2. remoteBase 的三种配置方式

业务代码不感知托管方，全部经 `miniprogram/config/media-remote-base.ts` → `CONFIG.media.remoteBase`
→ `services/media-service.ts` 解析。

| 方式 | 命令 / 操作 | 适用 |
| --- | --- | --- |
| ① 环境变量（推荐） | `MEDIA_REMOTE_BASE=https://<host>/geo-explorer/prod/v1/ npm run build:prod` | CI、批量发布；不需要改源码 |
| ② 直接填写构建输入 | 编辑 `miniprogram/config/media-remote-base.ts` | 一次性固定环境 |
| ③ 仅校验不写入 | `node scripts/check-media-config.mjs` | 发布前预检 |

> 方式 ① 会把值写进 `miniprogram/config/media-remote-base.ts`（构建输入文件），因此
> 正式构建后该文件会出现在 `git diff` 中 —— 这是预期的，值本身就是发布配置的一部分。

**路径契约**：`mediaKey` 与远端对象键一一对应，部署端不做任何逐文件 URL 改写。

```
mediaKey:   content/fuji/f-forest-lower.jpg
remoteBase: https://<host>/geo-explorer/prod/v1/
→ URL:      https://<host>/geo-explorer/prod/v1/content/fuji/f-forest-lower.jpg
```

---

## 3. 微信 downloadFile 合法域名（MANUAL BLOCKER）

微信小程序从网络加载图片，要求域名进入 **mp.weixin.qq.com → 开发 → 开发管理 → 开发设置 → 服务器域名 → downloadFile 合法域名**。

| 项 | 值 |
| --- | --- |
| 需要配置的 hostname | **`<env-id>.tcb.qcloud.la`** —— 其中 `<env-id>` 是 CloudBase 环境 ID |
| 示例（环境 ID 未定，故为占位） | `geo-explorer-prod-abc123.tcb.qcloud.la` |
| 协议 | 必须 https |
| 端口 | 443（默认，不需要额外配置） |
| 配置位置 | 微信公众平台 → 开发管理 → 开发设置 → 服务器域名 |

**为什么这是 MANUAL BLOCKER**：

1. CloudBase 环境尚未开通，环境 ID 未知，因此**无法给出最终 hostname**；
2. 服务器域名只能由**小程序管理员在公众平台手工添加**，无法由代码或 CLI 完成；
3. 未配置时，正式版会拒绝加载远程图片（开发者工具在「不校验合法域名」开启时可能不报错，**因此不能用开发者工具的表现代替真机验证**）。

> 若改用自建 CDN / 其他对象存储，需要把对应 hostname 配置到同一个列表；业务代码无需改动，只改 `remoteBase`。

---

## 4. 当前阻塞与下一步

**Gate 4B BLOCKED** 的确认依据（Gate 4B Step 1）：

- 本机没有 CloudBase CLI（`tcb` 不可执行）；
- 没有 `@cloudbase/cli` 依赖；
- 没有任何 `TENCENTCLOUD_*` / `CLOUDBASE_*` / `SECRET*` 环境变量；
- 没有 `~/.tcbrc`、`~/.cloudbaserc`；
- 仓库内不存在任何真实环境 ID（只有 `design/cloudbase-media-migration-plan.md` 里的 `<env-id>` 占位）。

**剩余人工步骤（按顺序）**：

1. 按 `design/cloudbase-media-migration-plan.md` §5–§7 开通并绑定 CloudBase 环境，创建 `geo-explorer/prod/v1/` 目录，权限设「公开读取、客户端禁止写入」；
2. `tcb login`（登录态只留在本机，**不入仓库**）；
3. `CLOUDBASE_ENV_ID=<env-id> npm run media:deploy`（先 `-- --dry-run` 预览 46 个文件）；
4. `MEDIA_REMOTE_BASE=https://<env-id>.tcb.qcloud.la/geo-explorer/prod/v1/ npm run media:check -- --hash`；
5. 在公众平台把 `<env-id>.tcb.qcloud.la` 加入 **downloadFile 合法域名**；
6. `MEDIA_REMOTE_BASE=… npm run build:prod`；
7. Android / iOS 真机走一遍 `docs/media-ownership-gate4.md` §10.1 的 smoke 流程。

在上述 1–5 完成之前，**不要发布** —— 正式包里没有内容媒体，远端又不可达，用户只会看到占位图。

---

## 5. 本地已完成且已验证的部分

即便没有云端，以下环节已在本机端到端验证：

| 环节 | 验证方式 | 结果 |
| --- | --- | --- |
| 部署清单确定性与哈希正确性 | 重复生成 + 与磁盘比对 | ✅ 19 个用例（`tests/media-deploy.test.ts`） |
| 路径契约 | `expectedUrls()` 断言 `<remoteBase><mediaKey>` | ✅ |
| 远端健康检查真实 HTTP 行为 | 本地回环 HTTP 服务暴露 `media-remote/`（前缀 `/geo-explorer/prod/v1/`） | ✅ Expected 46 / Reachable 46 / Missing 0 / Size mismatch 0 / **PASS** |
| SHA-256 端到端 | 同上 + `-- --hash` | ✅ Hash mismatch 0 / **PASS** |
| 缺失检测与退出码 | 回环服务不可用时 | ✅ 46/46 Missing → **FAIL**（退出码非 0） |
| 生产守卫 | 空基址 / 尾随空格基址 | ✅ 两种都**拒绝出包** |
| 生产构建正向路径 | 合成 https 基址 | ✅ 守卫通过 → 出包，编译产物含该基址，主包 1.21 MiB、包内无远端媒体 |
| 包体不变量 | `npm run package:audit` | ✅ Main 1,234.2 KB < 1.5 MiB；本地内容媒体 0；包内远端媒体 0 |

> 回环验证用的是本机 `127.0.0.1` 静态服务，**只用于验证工具链行为，不代表生产已可达**。生产可达性仍未验证（Gate 4B BLOCKED）。
