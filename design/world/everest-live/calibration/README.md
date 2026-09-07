# calibration — 运行时校准产物

运行时唯一数据源。真实像素标注得到的 `CalibrationReportV1` JSON 落在本目录：

- 用 `web/viewer` 标注实景 → 导出 pixels → 终端 `cli.ts solve` 生成（见 `tools/README.md`）
- 或模型兜底：Stage 5 导出仅坐标 guess 的 **REPRESENTATIVE** 报告（`routeOverlay=false`）

提交到此处即在运行时生效（`routeOverlay` 仅 `VERIFIED`/`CALIBRATED` 为 true；REPRESENTATIVE 一律禁止假折线）。
