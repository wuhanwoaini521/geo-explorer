import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const mapDir = join(__dirname, "..", "miniprogram", "pages", "map");
const pageSource = readFileSync(join(mapDir, "index.ts"), "utf8");
const template = readFileSync(join(mapDir, "index.wxml"), "utf8");
const styles = readFileSync(join(mapDir, "index.wxss"), "utf8");
const layoutSource = readFileSync(join(mapDir, "..", "..", "utils", "layout.ts"), "utf8");

describe("地图地球交互与覆盖层契约", () => {
  it("标题按系统胶囊底部动态下移，地图页不再渲染搜索框", () => {
    expect(template).toMatch(/class="map-head" style="top:\{\{headerTop\}\}px"/);
    expect(template).toContain("Geo Explorer");
    expect(template).toContain("探索地球 · 发现世界 · 理解自然");
    expect(template).not.toMatch(/class="map-search"/);
    expect(pageSource).toMatch(/getHeaderTopOffset/);
    expect(layoutSource).toMatch(/getMenuButtonBoundingClientRect/);
  });

  it("WebGL 上方使用透明 2D Canvas 同时承载标签和拖动手势", () => {
    expect(template).toMatch(/id="globeLabelCanvas"[^>]*type="2d"[^>]*class="globe-label-canvas"/);
    expect(template).toMatch(/id="globeLabelCanvas"[^>]*bindtouchstart="onGlobeTouchStart"/);
    expect(template).toMatch(/id="globeLabelCanvas"[^>]*catchtouchmove="onGlobeTouchMove"/);
    expect(template).toMatch(/id="globeLabelCanvas"[^>]*bindtouchcancel="onGlobeTouchCancel"/);
    expect(pageSource).toMatch(/onGlobeTouchCancel\(\)/);
  });

  it("慢速连续拖动按总位移识别，不会误判为点击", () => {
    expect(pageSource).toMatch(/startX: point\.x/);
    expect(pageSource).toMatch(/Math\.hypot\(point\.x - globeTouch\.startX, point\.y - globeTouch\.startY\) > 6/);
  });

  it("WebGL 标签 Canvas 绘制地点名、类型和高度或深度摘要", () => {
    expect(pageSource).toMatch(/const title = marker\.name/);
    expect(pageSource).toMatch(/const meta = `\$\{marker\.typeLabel\} · \$\{marker\.metricText\}`/);
    expect(pageSource).toMatch(/context\.fillText\(title/);
    expect(pageSource).toMatch(/context\.fillText\(meta/);
    expect(styles).toMatch(/\.globe-label-canvas \{[^}]*z-index: 24/);
  });

  it("默认地球留出顶部简介空间，不再铺满整个页面宽度", () => {
    const webgl = readFileSync(join(mapDir, "..", "..", "engine", "webgl-globe-renderer.ts"), "utf8");
    expect(webgl).toMatch(/height \* 0\.72/);
    expect(webgl).toMatch(/width \* 0\.45/);
    expect(styles).toMatch(/\.globe-webgl-canvas, \.globe-canvas \{[^}]*height: 800rpx/);
    expect(styles).toMatch(/\.globe-label-canvas \{[^}]*height: 800rpx/);
    expect(template).toMatch(/id="globeWebglCanvas"[^>]*style="height:\{\{globeCanvasHeight\}\}"/);
    expect(template).toMatch(/wx:if="\{\{[^}]*recommendationsVisible[^}]*\}\}" class="recommendation-rail"/);
    expect(pageSource).toMatch(/railRect\.top - canvasRect\.top - 12/);
    expect(pageSource).toMatch(/setData\(\{ globeCanvasHeight: `\$\{Math\.round\(nextHeight\)\}px` \}/);
    expect(pageSource).toMatch(/if \(availableHeight < 140\)[\s\S]*recommendationsVisible: false/);
  });

  it("屏幕尺寸变化和关闭图鉴时重建并重新测量 Canvas", () => {
    expect(pageSource).toMatch(/onResize\(\)[\s\S]*globeRendererReady: false[\s\S]*fitGlobeCanvasToRecommendationRail\(\)/);
    expect(pageSource).toMatch(/onToggleAtlas\(\)[\s\S]*recommendationsVisible: true[\s\S]*fitGlobeCanvasToRecommendationRail\(\)/);
    expect(template).toMatch(/globeRendererReady && !atlasOpen && !webglFailed/);
  });

  it("密集地点标签会优先选择不与已有标签重叠的位置", () => {
    expect(pageSource).toMatch(/const occupiedLabels: Array<\{ left: number; top: number; right: number; bottom: number \}>/);
    expect(pageSource).toMatch(/projection\.visible && projection\.opacity > 0\.2[\s\S]*projection\.id === this\.data\.selectedMarkerId \|\| HOME_MAP_LABEL_PRIORITY\[projection\.id\] !== undefined/);
    expect(pageSource).toMatch(/const overlapArea = \(candidate:/);
    expect(pageSource).toMatch(/const labelRect = rects\.find\(\(candidate\) => overlapArea\(candidate\) === 0\);/);
    expect(pageSource).toMatch(/if \(!labelRect\) \{\s*context\.restore\(\);\s*return;/);
    expect(pageSource).not.toContain("rects.reduce((best, candidate)");
    expect(pageSource).toMatch(/HOME_MAP_LABEL_PRIORITY\[a\.id\] \?\? Number\.MAX_SAFE_INTEGER[\s\S]*HOME_MAP_LABEL_PRIORITY\[b\.id\] \?\? Number\.MAX_SAFE_INTEGER/);
  });

  it("Explore 默认只显示三个主地点，搜索或分类筛选仍可展示其他结果", () => {
    expect(pageSource).toMatch(/const defaultExplorePlaces = !this\.data\.query\.trim\(\) && this\.data\.activeType === ALL_TYPE[\s\S]*HOME_MAP_LABEL_PRIORITY\[place\.id\] !== undefined[\s\S]*: worldPlaces/);
    expect(pageSource).toMatch(/worldMarkers: defaultExplorePlaces\.map\(worldMarker\)/);
  });

  it("选中简介与 Canvas 位于同一个地图容器内，且使用不透明覆盖层", () => {
    const mapEnd = template.indexOf("</view>", template.indexOf('class="destination-preview"'));
    const destination = template.indexOf('class="destination-preview"');
    expect(destination).toBeGreaterThan(template.indexOf('class="world-map"'));
    expect(destination).toBeLessThan(mapEnd);
    expect(template).toMatch(/<cover-view[^>]*class="destination-preview"/);
    expect(styles).toMatch(/\.destination-preview \{[^}]*z-index: 80[^}]*background: rgba\(4,25,39,\.96\)/);
  });
});
