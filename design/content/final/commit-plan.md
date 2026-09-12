# Commit Plan（Final Acceptance · 2026-09-12）

> 遵循约定：本仓库工作区**未 commit、未 push**。以下为建议分组，供人工执行。
>
> 说明：三个 Long Run 的改动高度耦合（数据模型 → 媒体管线 → 页面接线 → 测试互相咬合，
> 例如 `mediaIds` 同时涉及 types/data/pages/tests；中间态无法独立编译通过全部测试）。
> 因此推荐 **方案 A（single release commit）**；若坚持分组，方案 B 的顺序可保证每一步可编译。

## 方案 A — Single Release Commit（推荐）

```bash
git add -A
git commit -m "release: four exploration worlds with verified media, knowledge graph, and quality gates

- Four worlds complete: Everest / Mariana / Fuji / Colorado (29 waypoints,
  journeys, sources, quizzes, honest fallback policy)
- Knowledge base: 41 entries, 100% sourced (12 A/B), cross-world graph
  (61 edges), educational media on 12 core entries
- Media: 47 runtime assets (hash-verified, ownership-checked), review board
  with browser-verified file:// + http modes, unknown-provenance usage = 0
- Quality gates: content:validate (0 error / 0 warning / 2 info),
  release contract tests (504 total), reports under design/content/final"
```

## 方案 B — 分组提交（每步可编译）

1. `feat(content): knowledge source completion, graph, quality expansion`
   - `miniprogram/data/knowledge.ts`、`miniprogram/types/models.ts`、`miniprogram/types/expedition.ts`（promotedRuntimeId）
2. `feat(worlds): fuji + colorado explorations, mariana route, everest waypoint content`
   - `miniprogram/data/explorations/*`、`miniprogram/data/places.ts`、`miniprogram/data/quizzes.ts`
3. `feat(media): registry manifests, runtime assets, review board tooling`
   - `miniprogram/data/media/*`、`miniprogram/engine/media-registry.ts`、`miniprogram/engine/validate-content.ts`、`miniprogram/assets/content/**`、`scripts/content/*`、退役的 5 张 PNG（D 状态）
4. `feat(pages): registry-first media binding on home/map/place/knowledge/exploration`
   - `miniprogram/pages/{home,map,place,knowledge,exploration}/index.ts`
5. `test: world contracts, hardening, release freeze, review board assets`
   - `tests/*` 新增与修改
6. `docs: reports, authoring guides, windows QA package`
   - `design/content/**`、`README.md`、`AGENTS.md`、`.gitignore`、`package.json`、`package-lock.json`
7. `chore(dist): rebuild dist` — `dist/**`（或并入每步对应提交）

## 提交前检查清单

- [ ] `git status` 无意外文件（`media-source/` 已 gitignore；`artifacts/windows-qa/` 已 gitignore）
- [ ] `git diff --check` 仅剩 `types/exploration.ts` 既有行尾提示（用户改动，勿动）
- [ ] dist 为 `npm run build` 产物（禁止手改）
- [ ] 远端分支确认后 `git push`
