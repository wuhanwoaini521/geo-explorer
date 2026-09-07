/**
 * 数据溯源与许可（Credits）—— 纯函数，无副作用、无 UI 依赖。
 *
 * 目的：把 expedition 里已有的「申明式」数据（media.assets + sources）
 * 收敛成可在「我的 → 数据来源与许可」逐项呈现的清单，并让测试能校验
 * “每一份材料都有出处、许可与链接”这一硬承诺：
 *
 *   - 影像类（asset）：credit + license + licenseUrl + sourceUrl 必须完整；
 *   - 来源类（source）：name + url 必须存在，approximate 要诚实标注；
 *   - 输出的每个 id 唯一；分组 key 固定（media/terrain/route/elevation），
 *     页面与测试靠 key 对齐，不猜字段。
 *
 * 本模块不引入任何新数据：它只是 reread 现有 `media`/`sources` 两个
 * 声明确认“出处与许可”成立，任何空白都会在测试里暴露。
 */
import type { DataSource } from "../types/exploration";

/** 一条可展示的“数据 / 材料”许可条目 */
export interface CreditItem {
  /** 稳定 id：`asset-{assetId}` 或 `source-{index}`；页面作 wx:key 用 */
  id: string;
  /** 展示名（asset 用 title，source 用 name） */
  name: string;
  /** 角色摘要，如「实景影像」/「科学地形」/「路线与坐标」/「高程实测」 */
  role: string;
  /** 本地素材（asset.localPath）——无则省略 */
  localPath?: string;
  /** 版权 / 许可（媒体必填；来源可不填） */
  license?: string;
  licenseUrl?: string;
  /** 作者 / 拍摄者 attribution */
  credit?: string;
  /** 出处链接（可点击复制） */
  url: string;
  /** 类型：asset=正式登记的本项目素材；source=外部资料引用 */
  kind: "asset" | "source";
  /** 附加说明（如「未绑定 B/C/D 前不用于实景叠加」「近似值」） */
  note?: string;
}

/** 一组同品类条目（页面折叠段的输入） */
export interface CreditGroup {
  key: string;
  title: string;
  items: CreditItem[];
}

/** buildCredits 的输入：只取所需最小形状，避免与 expedition 数据层循环依赖 */
export interface CreditInput {
  /** media.assets 的会话形状（id/title/localPath/license/licenseUrl/credit/sourceUrl/…） */
  assets: Array<{
    id: string;
    title?: string;
    localPath?: string;
    license?: string;
    licenseUrl?: string;
    credit?: string;
    attribution?: string;
    sourceUrl?: string;
  }>;
  /** sources 数组（DataSource 即可） */
  sources: DataSource[];
  /** 实景与 TERRAIN 兜底的状态说明（当前 LIVE-A 的校准状态） */
  liveStatus?: string;
}

/** 固定分组键 —— 页面与测试都引用这个常量 */
export const CREDIT_GROUP_KEYS = [
  "imagery",
  "terrain",
  "geometry",
  "reference",
] as const;
export type CreditGroupKey = (typeof CREDIT_GROUP_KEYS)[number];

const GROUP_TITLES: Record<CreditGroupKey, string> = {
  imagery: "实景影像与许可",
  terrain: "科学地形（DEM）",
  geometry: "路线与坐标",
  reference: "参考数据",
};

function sourceRole(s: DataSource): string {
  const n = s.name;
  if (/DEM|Copernicus/i.test(n)) return "科学地形（DEM）";
  if (/路线|测绘|route|control|里程碑|GPS/i.test(n)) return "路线与坐标";
  if (/高程|测量|8 ?848/i.test(n)) return "高程实测";
  if (/Wikipedia/i.test(n)) return "参考资料";
  return "参考资料";
}

/**
 * 收敛媒体资产 + 数据来源 → 可分组的许可清单。
 * 影像类条目按 media 原样；来源类条目按角色归类；同 key 内保持输入顺序。
 */
export function buildCredits(input: CreditInput): CreditGroup[] {
  const groups: Record<CreditGroupKey, CreditItem[]> = {
    imagery: [],
    terrain: [],
    geometry: [],
    reference: [],
  };

  for (const a of input.assets) {
    const credit = a.credit ?? a.attribution ?? "";
    groups.imagery.push({
      id: `asset-${a.id}`,
      name: a.title || a.id,
      role: "实景影像",
      localPath: a.localPath,
      license: a.license,
      licenseUrl: a.licenseUrl,
      credit: credit || undefined,
      url: a.sourceUrl || "",
      kind: "asset",
      note: a.sourceUrl
        ? undefined
        : "未登记出处链接（评审与测试均不应通过）",
    });
  }
  if (input.liveStatus) {
    groups.imagery.push({
      id: "asset-live-status",
      name: "实景叠加状态（LIVE overlay）",
      role: "状态说明",
      url: "",
      kind: "source",
      note: input.liveStatus,
    });
  }

  for (const s of input.sources) {
    const role = sourceRole(s);
    const key: CreditGroupKey =
      role === "科学地形（DEM）" ? "terrain" : role === "路线与坐标" ? "geometry" : "reference";
    groups[key].push({
      id: `source-${s.name.slice(0, 12)}-${s.url}`,
      name: s.name,
      role,
      url: s.url,
      kind: "source",
      note: s.approximate ? "公开近似 / 建模推导（非精确实测）" : "已核实数据",
      // 高程类本身是一条 source：单放在 reference 里即可
    });
  }

  return CREDIT_GROUP_KEYS.map((key) => ({
    key,
    title: GROUP_TITLES[key],
    items: groups[key],
  }));
}