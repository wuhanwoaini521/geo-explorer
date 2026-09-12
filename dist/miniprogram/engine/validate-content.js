"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateContent = validateContent;
exports.validateMedia = validateMedia;
exports.validateCandidates = validateCandidates;
exports.summarizeIssues = summarizeIssues;
exports.knowledgeCompleteness = knowledgeCompleteness;
/**
 * Content Validation —— 四世界内容完整性校验（纯函数，可在 Node 单测）。
 *
 * 职责（Long Run PHASE 8）：
 *   - 实体唯一性：exploration / place / knowledge / waypoint / media id 重复检测；
 *   - 关系完整性：place ↔ exploration ↔ waypoint ↔ knowledge ↔ quiz ↔ media 引用合法性；
 *   - 内容完整性：waypoint 必备内容、knowledge 节点来源、随堂题合法性；
 *   - 资产完整性：waypoint legacy images 与运行时媒体路径必须真实存在（防 dist 掩盖断链）；
 *   - 审核字段：reviewStatus / GeographicRole 合法值校验。
 *
 * 输出结构化 Issue（error = 阻塞发布；warning = 记录债务），不做 UI / wx 依赖。
 */
const index_1 = require("../data/explorations/index");
const places_1 = require("../data/places");
const knowledge_1 = require("../data/knowledge");
const quizzes_1 = require("../data/quizzes");
const world_manifests_1 = require("../data/media/world-manifests");
const candidates_1 = require("../data/media/candidates");
const REVIEW_STATUS_VALUES = [
    "draft",
    "review",
    "approved",
    "rejected",
];
function uniqueIds(ids, scope, issues) {
    const seen = new Set();
    for (const id of ids) {
        if (seen.has(id)) {
            issues.push({
                level: "error",
                code: "duplicate-id",
                message: `${scope} 存在重复 id：${id}`,
            });
        }
        seen.add(id);
    }
}
function validateRouteWaypoints(ex, issues) {
    const route = ex.route;
    if (!route)
        return;
    const ids = route.waypoints.map((w) => w.id);
    uniqueIds(ids, `${ex.id}.route`, issues);
    let lastProgress = -1;
    for (const w of route.waypoints) {
        if (w.progress < 0 || w.progress > 1) {
            issues.push({
                level: "error",
                code: "invalid-progress",
                message: `${ex.id}.${w.id} 的 progress 越界（0-1）：${w.progress}`,
            });
        }
        if (w.progress <= lastProgress) {
            issues.push({
                level: "error",
                code: "invalid-progress",
                message: `${ex.id}.${w.id} 的 progress 必须严格递增：${w.progress} ≤ ${lastProgress}`,
            });
        }
        lastProgress = w.progress;
        validateWaypoint(ex, w, issues);
    }
    const first = route.waypoints[0];
    const lastWp = route.waypoints[route.waypoints.length - 1];
    if (first && first.progress !== 0) {
        issues.push({
            level: "warning",
            code: "route-start",
            message: `${ex.id}.route 首个 waypoint 的 progress 应为 0（当前 ${first.progress}）`,
        });
    }
    if (lastWp && lastWpProgress(lastWp) !== 1) {
        issues.push({
            level: "error",
            code: "route-end",
            message: `${ex.id}.route 末个 waypoint 的 progress 应为 1（当前 ${lastWp.progress}）`,
        });
    }
}
function lastWpProgress(w) {
    return w.progress;
}
function validateWaypoint(ex, w, issues) {
    var _a;
    const at = `${ex.id}.waypoint:${w.id}`;
    // Journey 内容：desc 必填；detail/facts 属完整度（缺失计 warning）
    if (!w.desc || w.desc.length < 8) {
        issues.push({
            level: "error",
            code: "missing-waypoint-content",
            message: `${at} 缺少 desc（一句话简介）`,
        });
    }
    if (!w.detail || w.detail.length < 20) {
        issues.push({
            level: "warning",
            code: "missing-waypoint-content",
            message: `${at} 缺少 detail（详细说明）`,
        });
    }
    if (!w.facts || w.facts.length === 0) {
        issues.push({
            level: "warning",
            code: "missing-waypoint-content",
            message: `${at} 缺少 facts（知识要点）`,
        });
    }
    // 来源：Long Run 起新内容必须可溯源
    if (!w.sources || w.sources.length === 0) {
        issues.push({
            level: "error",
            code: "missing-source",
            message: `${at} 缺少 sources`,
        });
    }
    // 审核状态：新内容必须声明
    if (!w.reviewStatus) {
        issues.push({
            level: "warning",
            code: "missing-review-status",
            message: `${at} 缺少 reviewStatus（历史节点可缺省，新内容需标注）`,
        });
    }
    else if (!REVIEW_STATUS_VALUES.includes(w.reviewStatus)) {
        issues.push({
            level: "error",
            code: "illegal-review-status",
            message: `${at} 的 reviewStatus 非法：${String(w.reviewStatus)}`,
        });
    }
    // 空间位置：旧海拔轴场景需要 x/y 画布坐标
    if (w.x == null || w.y == null || w.x < 0 || w.x > 100 || w.y < 0 || w.y > 100) {
        issues.push({
            level: "error",
            code: "invalid-position",
            message: `${at} 的画布坐标 x/y 越界（0-100）：${w.x},${w.y}`,
        });
    }
    // 海拔/深度二选一（两者皆缺仅当场景无轴语义时允许）
    if (w.altitude == null && w.depth == null) {
        issues.push({
            level: "warning",
            code: "missing-elevation",
            message: `${at} 既无 altitude 也无 depth（展示层无高程可读）`,
        });
    }
    // knowledgeIds 引用合法性（场景节点 + 全局知识库）
    for (const kid of (_a = w.knowledgeIds) !== null && _a !== void 0 ? _a : []) {
        const okScene = ex.knowledgeNodes.some((n) => n.id === kid);
        const okGlobal = knowledge_1.KNOWLEDGE.some((k) => k.id === kid);
        if (!okScene && !okGlobal) {
            issues.push({
                level: "error",
                code: "invalid-ref",
                message: `${at}.knowledgeIds 引用不存在：${kid}`,
            });
        }
    }
    // knowledgeId（单链）合法性
    if (w.knowledgeId && !ex.knowledgeNodes.some((n) => n.id === w.knowledgeId)) {
        issues.push({
            level: "error",
            code: "invalid-ref",
            message: `${at}.knowledgeId 引用不存在的场景知识节点：${w.knowledgeId}`,
        });
    }
}
function validateKnowledgeNodes(ex, issues) {
    uniqueIds(nodeIdsOf(ex), `${ex.id}.knowledgeNode`, issues);
    for (const n of ex.knowledgeNodes) {
        const at = `${ex.id}.node:${n.id}`;
        if (!n.summary || !n.detail || !n.title) {
            issues.push({
                level: "error",
                code: "missing-node-content",
                message: `${at} 缺少 title/summary/detail`,
            });
        }
        if (!n.sources || n.sources.length === 0) {
            issues.push({
                level: "error",
                code: "missing-source",
                message: `${at} 缺少 sources`,
            });
        }
        const q = n.quiz;
        if (q) {
            if (q.answerIndex < 0 || q.answerIndex >= q.options.length) {
                issues.push({
                    level: "error",
                    code: "invalid-quiz",
                    message: `${at}.quiz.answerIndex 越界`,
                });
            }
            if (!q.explanation) {
                issues.push({
                    level: "error",
                    code: "invalid-quiz",
                    message: `${at}.quiz 缺少 explanation`,
                });
            }
        }
        if (n.knowledgeId && !knowledge_1.KNOWLEDGE.some((k) => k.id === n.knowledgeId)) {
            issues.push({
                level: "error",
                code: "invalid-ref",
                message: `${at}.knowledgeId 引用不存在的全局知识：${n.knowledgeId}`,
            });
        }
    }
}
function nodeIdsOf(ex) {
    return ex.knowledgeNodes.map((n) => n.id);
}
/** 校验四世界全部内容 + 跨实体关系；返回结构化问题清单。 */
function validateContent(assetsExist) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const issues = [];
    /* 实体唯一性 */
    uniqueIds(index_1.EXPLORATIONS.map((e) => e.id), "exploration", issues);
    uniqueIds(places_1.PLACES.map((p) => p.id), "place", issues);
    uniqueIds(knowledge_1.KNOWLEDGE.map((k) => k.id), "knowledge", issues);
    uniqueIds(quizzes_1.QUIZZES.map((q) => q.id), "quiz", issues);
    /* place.explorationId ↔ EXPLORATIONS 双向关系 */
    const explorationIds = new Set(index_1.EXPLORATIONS.map((e) => e.id));
    for (const p of places_1.PLACES) {
        if (p.explorationId && !explorationIds.has(p.explorationId)) {
            issues.push({
                level: "error",
                code: "invalid-ref",
                message: `place:${p.id}.explorationId 引用不存在的场景：${p.explorationId}`,
            });
        }
    }
    // 每个场景应至少被一个 Place 承接（orphan exploration）
    for (const ex of index_1.EXPLORATIONS) {
        if (!places_1.PLACES.some((p) => p.explorationId === ex.id)) {
            issues.push({
                level: "warning",
                code: "orphan-exploration",
                message: `exploration:${ex.id} 未被任何 place.explorationId 引用`,
            });
        }
    }
    /* 全局知识库引用完整性（place/landform 反链 + 知识图谱边） */
    const knowledgeIds = new Set(knowledge_1.KNOWLEDGE.map((k) => k.id));
    for (const k of knowledge_1.KNOWLEDGE) {
        for (const pid of k.relatedPlaceIds) {
            if (!places_1.PLACES.some((p) => p.id === pid)) {
                issues.push({
                    level: "error",
                    code: "invalid-ref",
                    message: `knowledge:${k.id}.relatedPlaceIds 引用不存在的地点：${pid}`,
                });
            }
        }
        for (const rid of (_a = k.relatedKnowledgeIds) !== null && _a !== void 0 ? _a : []) {
            if (rid === k.id) {
                issues.push({
                    level: "error",
                    code: "invalid-ref",
                    message: `knowledge:${k.id}.relatedKnowledgeIds 自引用`,
                });
            }
            else if (!knowledgeIds.has(rid)) {
                issues.push({
                    level: "error",
                    code: "invalid-ref",
                    message: `knowledge:${k.id}.relatedKnowledgeIds 引用不存在的知识：${rid}`,
                });
            }
        }
        if (k.reviewStatus && !REVIEW_STATUS_VALUES.includes(k.reviewStatus)) {
            issues.push({
                level: "error",
                code: "illegal-review-status",
                message: `knowledge:${k.id} 的 reviewStatus 非法`,
            });
        }
    }
    /* Quiz 静态合法性 + 类别合法性 */
    const categories = new Set(knowledge_1.KNOWLEDGE.map((k) => k.category));
    for (const q of quizzes_1.QUIZZES) {
        if (q.answerIndex < 0 || q.answerIndex >= q.options.length) {
            issues.push({
                level: "error",
                code: "invalid-quiz",
                message: `quiz:${q.id}.answerIndex 越界`,
            });
        }
        if (!categories.has(q.category)) {
            issues.push({
                level: "error",
                code: "invalid-quiz",
                message: `quiz:${q.id}.category 不在知识分类体系内：${q.category}`,
            });
        }
    }
    /* 场景（四世界）逐个校验 */
    for (const ex of index_1.EXPLORATIONS) {
        validateKnowledgeNodes(ex, issues);
        validateRouteWaypoints(ex, issues);
        // 主题/世界样式：非 mountain 的场景不渲染珠峰 DEM（数据侧防串景）
        if (ex.world && ex.world.style === "mountain" && ex.id !== "everest") {
            issues.push({
                level: "error",
                code: "world-style-reserved",
                message: `exploration:${ex.id} 不得声明 mountain 样式（珠峰 DEM 渲染为 Everest 专属）`,
            });
        }
    }
    /* 资产存在性（调用方注入扫描器；缺省跳过具体路径） */
    if (assetsExist) {
        for (const ex of index_1.EXPLORATIONS) {
            for (const w of (_c = (_b = ex.route) === null || _b === void 0 ? void 0 : _b.waypoints) !== null && _c !== void 0 ? _c : []) {
                for (const img of (_d = w.images) !== null && _d !== void 0 ? _d : []) {
                    if (!assetsExist(img)) {
                        issues.push({
                            level: "error",
                            code: "broken-asset",
                            message: `${ex.id}.waypoint:${w.id} 引用的图片不存在：${img}`,
                        });
                    }
                }
            }
        }
    }
    /* ---------------- 媒体校验（Long Run 2 · PHASE 11） ---------------- */
    issues.push(...validateMedia(world_manifests_1.RUNTIME_MANIFESTS, assetsExist));
    /* mediaIds 引用合法性：waypoint / knowledge 必须只引用 runtime 资产 */
    const assetById = new Map(world_manifests_1.RUNTIME_MANIFESTS.flatMap((m) => m.assets).map((a) => [a.id, a]));
    for (const ex of index_1.EXPLORATIONS) {
        for (const w of (_f = (_e = ex.route) === null || _e === void 0 ? void 0 : _e.waypoints) !== null && _f !== void 0 ? _f : []) {
            for (const mid of (_g = w.mediaIds) !== null && _g !== void 0 ? _g : []) {
                const a = assetById.get(mid);
                if (!a) {
                    issues.push({
                        level: "error",
                        code: "invalid-media-ref",
                        message: `${ex.id}.waypoint:${w.id}.mediaIds 引用不存在的 runtime 媒体：${mid}`,
                    });
                }
                else if (a.entityType !== "waypoint" || a.entityId !== w.id) {
                    issues.push({
                        level: "error",
                        code: "media-ownership-violation",
                        message: `${ex.id}.waypoint:${w.id}.mediaIds 引用不属于该 waypoint 的资产：${mid}（归属 ${a.entityType}/${a.entityId}）`,
                    });
                }
            }
        }
    }
    for (const k of knowledge_1.KNOWLEDGE) {
        for (const mid of (_h = k.mediaIds) !== null && _h !== void 0 ? _h : []) {
            const a = assetById.get(mid);
            if (!a) {
                issues.push({
                    level: "error",
                    code: "invalid-media-ref",
                    message: `knowledge:${k.id}.mediaIds 引用不存在的 runtime 媒体：${mid}`,
                });
            }
            else if (a.entityType !== "knowledge" || a.entityId !== k.id) {
                issues.push({
                    level: "error",
                    code: "media-ownership-violation",
                    message: `knowledge:${k.id}.mediaIds 引用不属于该知识的资产：${mid}（归属 ${a.entityType}/${a.entityId}）`,
                });
            }
        }
    }
    /* Waypoint primary media 缺失：按世界汇总为一条警告（债务记录，不逐点刷屏） */
    for (const ex of index_1.EXPLORATIONS) {
        const covered = (w) => world_manifests_1.RUNTIME_MANIFESTS.some((m) => m.assets.some((a) => a.entityType === "waypoint" && a.entityId === w.id));
        const wps = (_k = (_j = ex.route) === null || _j === void 0 ? void 0 : _j.waypoints) !== null && _k !== void 0 ? _k : [];
        const missing = wps.filter((w) => !covered(w));
        const withPhotoCandidate = wps.filter((w) => !covered(w) &&
            candidates_1.MEDIA_CANDIDATES.some((c) => c.entityType === "waypoint" && c.entityId === w.id && c.kind === "photograph"));
        if (missing.length) {
            issues.push({
                level: "info",
                category: "KNOWN_FALLBACK",
                code: "waypoint-primary-missing",
                message: `${ex.id}：${missing.length} 个 waypoint 无运行时图片（诚实 fallback 政策；${withPhotoCandidate.length} 个已有实景候选在册待签核）`,
            });
        }
    }
    /* Place hero 缺失：四世界 place 各一条警告 */
    for (const ex of index_1.EXPLORATIONS) {
        const place = places_1.PLACES.find((p) => p.explorationId === ex.id);
        if (!place)
            continue;
        const hasHero = world_manifests_1.RUNTIME_MANIFESTS.some((m) => m.assets.some((a) => a.entityType === "place" && a.entityId === place.id));
        if (!hasHero) {
            // p-everest 使用 expedition hero（live-a-kala-patthar，视为已覆盖）
            const usingExpeditionHero = ex.id === "everest" &&
                world_manifests_1.RUNTIME_MANIFESTS.some((m) => m.assets.some((a) => a.entityType === "expedition" && a.entityId === ex.id && a.purpose === "hero"));
            if (usingExpeditionHero)
                continue;
            issues.push({
                level: "warning",
                category: "HUMAN_MEDIA_REVIEW",
                code: "place-hero-missing",
                message: `place:${place.id}（${ex.id}）无 runtime hero 图（占位卡兜底为 UNKNOWN_PROVENANCE / DO_NOT_PROMOTE；候选池待人工签核）`,
            });
        }
    }
    return issues;
}
/**
 * 媒体清单校验（Long Run 2 · PHASE 11）：
 *   - duplicate Media ID → ERROR（正式内容冲突不允许静默首声明胜出）；
 *   - approved 资产缺 attribution / license / localPath → ERROR；
 *   - localPath 文件不存在 → ERROR（需注入 fileExists）；
 *   - EXACT 无来源链接 → ERROR；EXACT 无地理证据说明 → WARNING；
 *   - unknown purpose → WARNING（vocabulary 仍在演进，保持 string + validator）。
 */
const KNOWN_PURPOSES = new Set([
    "hero",
    "gallery",
    "terrain-fallback",
    "knowledge-support",
    "secondary",
    "live-scene",
]);
function validateMedia(manifests, fileExists) {
    const issues = [];
    const seenId = new Map();
    for (const m of manifests) {
        for (const a of m.assets) {
            const at = `${m.id}:${a.id}`;
            if (seenId.has(a.id)) {
                issues.push({
                    level: "error",
                    code: "duplicate-media-id",
                    message: `媒体 id 重复声明：${a.id}（${seenId.get(a.id)} 与 ${at}）`,
                });
            }
            else {
                seenId.set(a.id, m.id);
            }
            if (a.reviewStatus !== "approved")
                continue; // 非 approved 由 MediaRegistry 挡在运行时之外
            if (!a.license) {
                issues.push({
                    level: "error",
                    code: "missing-license",
                    message: `${at} 缺少 license`,
                });
            }
            if (!a.attribution) {
                issues.push({
                    level: "error",
                    code: "missing-attribution",
                    message: `${at} 缺少 attribution`,
                });
            }
            if (!a.localPath) {
                issues.push({
                    level: "error",
                    code: "missing-local-path",
                    message: `${at} 缺少 localPath`,
                });
            }
            else if (fileExists && !fileExists(a.localPath)) {
                issues.push({
                    level: "error",
                    code: "broken-asset",
                    message: `${at} 的 localPath 不存在：${a.localPath}`,
                });
            }
            if (a.geographicRole === "EXACT") {
                if (!a.sourceUrl) {
                    issues.push({
                        level: "error",
                        code: "exact-without-source",
                        message: `${at} 声明 EXACT 但无来源链接`,
                    });
                }
                if (!a.description && !a.hash) {
                    issues.push({
                        level: "warning",
                        code: "exact-without-evidence",
                        message: `${at} 声明 EXACT 但无地理证据描述/hash`,
                    });
                }
            }
            if (a.purpose && !KNOWN_PURPOSES.has(a.purpose)) {
                issues.push({
                    level: "warning",
                    code: "unknown-purpose",
                    message: `${at} 的 purpose 不在已知词汇表：${a.purpose}`,
                });
            }
        }
    }
    return issues;
}
/** 候选清单完整性：sourceUrl 必填；approved 不得出现在候选区（PHASE 8 边界）。 */
function validateCandidates() {
    const issues = [];
    for (const c of candidates_1.MEDIA_CANDIDATES) {
        if (!c.sourceUrl) {
            issues.push({
                level: "error",
                code: "candidate-without-source",
                message: `候选 ${c.id} 缺少 sourceUrl`,
            });
        }
        // 类型系统已保证 CandidateMediaAsset.reviewStatus ≠ approved（晋升即离开候选区）
        void c;
    }
    return issues;
}
/** 汇总：错误 / 警告计数（供报告与测试断言）。 */
function summarizeIssues(issues) {
    return {
        errors: issues.filter((i) => i.level === "error"),
        warnings: issues.filter((i) => i.level === "warning"),
        infos: issues.filter((i) => i.level === "info"),
    };
}
/** 知识完整度统计（Long Run §30：Knowledge Completeness Validator 输出）。 */
function knowledgeCompleteness() {
    return {
        total: knowledge_1.KNOWLEDGE.length,
        withSources: knowledge_1.KNOWLEDGE.filter((k) => { var _a, _b; return ((_b = (_a = k.sources) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0; }).length,
        withMedia: knowledge_1.KNOWLEDGE.filter((k) => { var _a, _b; return ((_b = (_a = k.mediaIds) === null || _a === void 0 ? void 0 : _a.length) !== null && _b !== void 0 ? _b : 0) > 0; }).length,
        linkedToPlace: knowledge_1.KNOWLEDGE.filter((k) => k.relatedPlaceIds.length > 0).length,
        linkedToLandform: knowledge_1.KNOWLEDGE.filter((k) => k.relatedLandformIds.length > 0)
            .length,
    };
}
