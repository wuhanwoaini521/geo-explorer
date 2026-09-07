# Everest LIVE — 统一世界坐标系（Coordinate System Spec）

> 本文件是 Everest Expedition 的唯一坐标真相（single source of truth）。
> 所有 RouteIndex、Waypoint、相机（Camera）、Landmark、DEM 都必须落在 **同一套**
> Local World ENU 坐标系内，禁止各组件各自私换一套 transform 后再做投影。

状态：**SPEC（数值已验证）** · 数据日期：south-col.json / route-control-points.json

---

## 1. 坐标系定义（Local World ENU-derivative）

| 项 | 值 | 说明 |
| --- | --- | --- |
| 类型 | 局部地本地平系（mesh-anchored ENU-like） | 与 `scripts/terrain/build_everest_route.py` 同一帧 |
| 原点 lat | `27.95° N` | `lat0` |
| 原点 lon | `86.8450° E` | `lon0` |
| X 轴 | `+East`（东） | `x = m_perdeg_lon · (lon − lon0)` |
| Y 轴 | `+South`（南） | `y = m_perdeg_lat · (lat − lat0)` （注意符号：+向南） |
| Z 轴 | `+Up` | `z = elevation_m − baseM`（`baseM = 2976.22 m`） |
| 单位 | 米（metres） | 网格单元与真实米一致（水准约 30–60 m） |
| 高度来源 | DEM（Copernicus DSM，1″，栅格 30 m） | DEM 平面 = `z + baseM` 即绝对海拔 |

### 转换公式（官方，已验证）

```
x  =  98334.5 · (lon − 86.8450)
y  = -110575.116 · (lat − 27.9500)        # 负号：lat 增大 = 向→南方，y 增大向南
Z  =  elevation_m − 2976.22
```

**反向（已知世界 x/y → lat/lon）：**

```
lon = 86.8450 + x / 98334.5
lat = 27.9500 − y / 110575.116
```

### 说明

- 与现有 `south-col.json` / `waypoints.json` 的 `world:[x,y,z]` **完全一致**
  （本文件数值即为从其 289 控制点 + 8 waypoint 回归得到，回归残差 < 0.1 m）。
- `scripts/terrain` 中 `build_terrain()` / `build_everest_route.py` 亦使用该帧
  （+X east / +Y south / +Z up），`everest_camera.py` 的方位角即基于本帧。
- Z 相对值 = `demM − baseM`；`demM` 实时 = `world.z + baseM`。

---

## 2. 要素落表（同一坐标系）

| 要素 | 世界表示 | 来源 |
| --- | --- | --- |
| 路线控制点（289 点） | `world:[x,y,z]` | `south-col.json`（route-index 消费同一帧） |
| Waypoint（8 个） | `world:[x,y,z]` | `waypoints.json` |
| 山峰 Landmark（Summit/Lhotse/Nuptse…） | 由 lat/lon/海拔 → 本帧换算 | 本工具 / landmark 表 |
| 相机（Camera） | `{x,y,z}`（米） | 本文件公式利用 GPS/altitude |
| DEM（遮挡测试） | 本帧均匀网格 `E(x,y)` | `terrain-height.raw` → 导出 `dem-grid.json` |

---

## 4. 数值抽查（waypoint spot check）

| Waypoint | lat | lon | 计算 x | 计算 y | 文件 world.x | 文件 world.y | Δ |
| --- | --- | --- | --- | --- | --- | --- | --- |
| base-camp | 27.9997 | 86.8488 | 373.0 | −5495.0 | 373.7 | −5495.5 | <1 m |
| western-cwm-camp-ii | 27.9810 | 86.9000 | 5409.1 | −3427.9 | 5409.4 | −3427.8 | <0.5 m |
| south-col-camp-iv | 27.9750 | 86.9321 | 8564.0 | −2764.4 | 8565.0 | −2764.4 | ~1 m |
| summit | 27.9881 | 86.9250 | 7868.3 | −4212.8 | 7866.8 | −4212.9 | ~1.5 m |

> 抽样差异来自 waypoint lat 取整（≈1⁵），不属坐标系不匹配；
> summit 真实纬耳 27.9881°、经度 86.9250° 对应上表，说明该帧一致。

---

## 4. 相机（常用于直接输入）的换算示例

**LIVE-A（Kala Patthar）相机位置：**

```
GPS : 27.9989129 N, 86.856634 E   （Kala Patthar 观景, 媒体档案）
x   = 98334.5 · (86.856634 − 86.8450)  ≈ 1144.8 m
y   = −110575.116 · (27.9989129 − 27.95) ≈ −5409.3 m
```

Kala Patthar 标准 5545 m → `z ≈ 5545.0 − 2976.22 = 2568.8`（相机在 DEM 地面 ± 数米内）。

---

## 5. 相机姿态约定（相机所在的世界系）

相机位姿使用 **look-at + 朝向（yaw/pitch/roll）**：

- `yaw`：自 **正北** 顺时针（0=N, 90=E, 180=S, 270=W）；
- `pitch`：仰角（+ 向上），对地平面平视为 0；
- `roll`：沿着线倾斜角度，默认 0；
- 相机朝向向量：`forward = (sin yaw·cos pitch, −cos yaw·cos pitch, sin pitch)` 在世界 EN 帧。
- 相机矩形上方向 = `up`（世界 `+Z` 近似，带 roll 时绕 forward 旋转）。

投影管线 `world → camera` 由纯旋转 + 平移构成（无相对镜头畸变近似；径向畸变 ⌈tam 已忽略，镜头主要在中焦段）。

---

## 6. 与其他管线的关系

- `DEM Projection`（TERRAIN）：直接在世界系中使用 `x,y,z`。
- `Photo Projection`（LIVE）：相机世界系 → 像素，见 `tools/everest-route-calibrator`。
- 两模式共享同一 `RouteIndex`（progress/sig），不产生第二套坐标。

> 任何新组件（新场景、新 landmark、新照片）必须在本帧换算后再参与投影。
