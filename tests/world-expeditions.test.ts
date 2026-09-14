/**
 * 非珠峰世界的 Expedition 接入 —— 结构契约回归。
 *
 * 用户要求：「不能只有珠峰有那种效果，最起码这些也要有，即使后面再继续添加，
 * 也要有真实登山、下潜等效果」。这些断言保证每个接入的世界都**真的具备**珠峰那套
 * 机制的必要构件，而不是只挂了个名字：
 *   真实里程轴 → 连续阶段 → 相机全程推进 → 贴合画面的路线 → 全覆盖的实景场景 → 动作文案。
 * 新增世界若漏掉任何一环，这里会直接失败。
 */
import { describe, expect, it } from "vitest";
import {
  expeditionRegistryCount,
  getExpeditionById,
} from "../miniprogram/data/expeditions/index";
import { WORLD_EXPEDITIONS } from "../miniprogram/data/expeditions/worlds";
import { stagesCoverRoute } from "../miniprogram/engine/expedition-stages";
import {
  validateExpedition,
  validateVisualMode,
} from "../miniprogram/engine/validate-expedition";

const WORLD_IDS = ["mariana", "fuji", "colorado"] as const;

describe("非珠峰世界已接入 Expedition 机制", () => {
  it("三个世界都能取到附件（页面据此进入路线模式）", () => {
    for (const id of WORLD_IDS) {
      const exp = getExpeditionById(id);
      expect(exp, `${id} 未接入 Expedition`).toBeTruthy();
      expect(exp!.routePath, `${id} 缺少 routePath（画不出贴画面的路线）`).toBeTruthy();
      expect(exp!.stageMap.length).toBeGreaterThan(1);
      expect(exp!.camera.segments.length).toBeGreaterThan(1);
    }
    expect(expeditionRegistryCount()).toBe(4);
  });

  it("动作类型正确：登山 / 下潜 / 下切不得混淆", () => {
    expect(getExpeditionById("fuji")!.type).toBe("CLIMB");
    expect(getExpeditionById("mariana")!.type).toBe("DIVE");
    expect(getExpeditionById("colorado")!.type).toBe("CUTAWAY");
  });

  it("里程轴是真实正里程，且里程碑与探索数据一一对应", () => {
    for (const exp of WORLD_EXPEDITIONS) {
      expect(exp.routeIndex.totalDistanceM).toBeGreaterThan(0);
      const waypoints = exp.route?.waypoints ?? [];
      const marks = exp.routeIndex.milestones;
      expect(marks.length).toBe(waypoints.length);
      for (let i = 1; i < marks.length; i += 1) {
        expect(
          marks[i].distanceM,
          `${exp.id} 里程非严格递增`,
        ).toBeGreaterThan(marks[i - 1].distanceM);
      }
      expect(marks[0].distanceM).toBeCloseTo(0, 3);
      expect(marks[marks.length - 1].distanceM).toBeCloseTo(
        exp.routeIndex.totalDistanceM,
        3,
      );
    }
  });

  it("阶段连续且无缝覆盖全程", () => {
    for (const exp of WORLD_EXPEDITIONS) {
      expect(
        stagesCoverRoute(exp.stageMap, exp.routeIndex.totalDistanceM),
        `${exp.id} 阶段未无缝覆盖全程`,
      ).toBe(true);
    }
  });

  it("相机段覆盖 0..1 且首尾相接", () => {
    for (const exp of WORLD_EXPEDITIONS) {
      const segments = exp.camera.segments;
      expect(segments[0].fromProgress).toBeCloseTo(0, 6);
      expect(segments[segments.length - 1].toProgress).toBeCloseTo(1, 6);
      for (let i = 1; i < segments.length; i += 1) {
        expect(segments[i].fromProgress).toBeCloseTo(
          segments[i - 1].toProgress,
          6,
        );
      }
    }
  });

  it("路线 spine 覆盖起终点、坐标在画面内、进度严格升序", () => {
    for (const exp of WORLD_EXPEDITIONS) {
      const spine = exp.routePath!.default.spine;
      expect(spine.length).toBeGreaterThanOrEqual(2);
      expect(spine[0].progress).toBeCloseTo(0, 6);
      expect(spine[spine.length - 1].progress).toBeCloseTo(1, 6);
      spine.forEach((point, i) => {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(1);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(1);
        if (i > 0) expect(point.progress).toBeGreaterThan(spine[i - 1].progress);
      });
    }
  });

  it("spine 落在竖屏 cover 裁切的可见窗口内（否则折线被裁到画面外）", () => {
    // 探索页主视觉铺满竖屏。横图按高度 cover 后只有中部一条可见，
    // 因此路线 x 必须收在 focusX ± 半窗口 之内——大峡谷曾因横向跨度过大而几乎看不见。
    const CONTAINER_ASPECT = 375 / 812;
    for (const exp of WORLD_EXPEDITIONS) {
      const projection = exp.routePath!.default;
      const halfWindow =
        projection.imageAspect > CONTAINER_ASPECT
          ? CONTAINER_ASPECT / projection.imageAspect / 2
          : 0.5;
      const lo = projection.focusX - halfWindow;
      const hi = projection.focusX + halfWindow;
      for (const point of projection.spine) {
        expect(
          point.x,
          `${exp.id} 路线点 x=${point.x} 超出可见窗口 [${lo.toFixed(3)}, ${hi.toFixed(3)}]`,
        ).toBeGreaterThanOrEqual(lo - 0.02);
        expect(point.x).toBeLessThanOrEqual(hi + 0.02);
      }
    }
  });

  it("LIVE 场景覆盖全部阶段，且绑定的是 approved 实景照片", () => {
    for (const exp of WORLD_EXPEDITIONS) {
      const scenes = exp.visualMode.liveScenes;
      expect(scenes.length).toBeGreaterThan(0);
      const covered = new Set(scenes.flatMap((s) => s.stageIds));
      for (const stage of exp.stageMap) {
        expect(covered.has(stage.id), `${exp.id}/${stage.id} 没有 LIVE 场景`).toBe(
          true,
        );
      }
      for (const scene of scenes) {
        const asset = exp.media.assets.find((a) => a.id === scene.assetId);
        expect(asset, `${exp.id} 的 LIVE 资产缺失`).toBeTruthy();
        expect(asset!.kind).toBe("photograph");
        expect(asset!.reviewStatus).toBe("approved");
        // 实景说明必须由本世界声明，否则会回落成引擎里写死的「真实珠峰影像」
        expect(scene.infoText, `${exp.id} 的 LIVE 场景缺少 infoText`).toBeTruthy();
        expect(scene.infoText).not.toContain("珠峰");
      }
    }
  });

  it("主视觉是该世界自己的实景，不得回落别人的画面", () => {
    for (const exp of WORLD_EXPEDITIONS) {
      const image = exp.routePath!.default.image;
      expect(image.startsWith("/assets/")).toBe(true);
      expect(image).not.toContain("everest");
    }
  });

  it("每个世界的附件通过校验（无 error 级问题）", () => {
    for (const exp of WORLD_EXPEDITIONS) {
      const errors = [
        ...validateExpedition(exp).issues,
        ...validateVisualMode(exp).issues,
      ].filter((issue) => issue.level === "error");
      expect(
        errors.map((e) => `${e.path}: ${e.message}`),
        `${exp.id} 附件校验失败`,
      ).toEqual([]);
    }
  });
});
