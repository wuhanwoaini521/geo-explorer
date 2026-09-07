/**
 * 数据来源与许可页 —— 把 expedition 的「材料出处」透明地交给用户。
 *
 * 只读 `buildCredits()`（纯函数，tests/credits-integrity.test.ts 锁定）。
 * 展示：实景影像与许可 / 科学地形（DEM）/ 路线与坐标 / 参考数据 四组；
 * 每条可复制出处链接（小程序无法直接打开外链 → 剪贴板）。
 */
import { buildCredits, type CreditGroup } from "../../engine/credits";
import { EVEREST_EXPEDITION } from "../../data/expeditions/everest";

interface ItemVM {
  id: string;
  name: string;
  role: string;
  credit: string;
  license: string;
  hasLicense: boolean;
  url: string;
  hasUrl: boolean;
  note: string;
  kind: "asset" | "source";
}

interface GroupVM {
  key: string;
  title: string;
  items: ItemVM[];
}

function toItems(group: CreditGroup): ItemVM[] {
  return group.items.map((it) => ({
    id: it.id,
    name: it.name,
    role: it.role,
    credit: it.credit ?? "",
    license: it.license ?? "",
    hasLicense: Boolean(it.license),
    url: it.url ?? "",
    hasUrl: Boolean(it.url),
    note: it.note ?? "",
    kind: it.kind,
  }));
}

Page({
  data: {
    groups: [] as GroupVM[],
    total: 0,
  },

  onLoad() {
    const groups = buildCredits({
      assets: EVEREST_EXPEDITION.media.assets,
      sources: EVEREST_EXPEDITION.sources,
      liveStatus:
        "首页 LIVE-A 当前为 REPRESENTATIVE（routeOverlay=false）：真像素标点由真人标注后升 CALIBRATED/VERIFIED，届时实景叠加才会启用；在此之前实景只展示照片本身（不做假路线）。",
    });
    const vm = groups.reduce((acc, g) => {
      if (g.items.length > 0) {
        acc.push({ key: g.key, title: g.title, items: toItems(g) });
      }
      return acc;
    }, [] as { key: string; title: string; items: ItemVM[] }[]);
    this.setData({
      groups: vm,
      total: vm.reduce((n, g) => n + g.items.length, 0),
    });
  },

  /** 复制出处链接到剪贴板 */
  onCopyUrl(e: PageEvent) {
    const url = String(e.currentTarget?.dataset?.url || "");
    if (!url) return;
    wx.setClipboardData({ data: url, success: () => void 0 });
  },
});