# Everest Terrain Preview — Source Record

- **Dataset:** Copernicus DEM GLO-30 Public (Copernicus DEM 2021 release)
- **Provider:** Copernicus Programme
- **Distribution:** AWS Open Data, bucket `s3://copernicus-dem-30m/` (`eu-central-1`)
- **Registry:** https://registry.opendata.aws/copernicus-dem/
- **Resolution:** 1 arc-second / approximately 30 m; Cloud Optimized GeoTIFF
- **Release:** Copernicus DEM 2021 release (as stated by the AWS Open Data registry)
- **License:** Free for the general public under the Copernicus DEM licence terms: https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM
- **Attribution:** `Copernicus Digital Elevation Model (DEM) was accessed on 2026-09-04 from https://registry.opendata.aws/copernicus-dem.`
- **Everest area (WGS84 bbox):** west 86.70, south 27.80, east 86.99, north 28.10
- **Tiles:**
  - `Copernicus_DSM_COG_10_N27_00_E086_00_DEM.tif` (43,039,634 bytes)
  - `Copernicus_DSM_COG_10_N28_00_E086_00_DEM.tif` (38,212,170 bytes)
- **Downloaded:** 2026-09-04
- **Original format:** Cloud Optimized GeoTIFF (COG)

Raw GeoTIFF files are deliberately untracked. The reproducible download and processing steps live in `scripts/terrain/`.

## Route (South Col classic, Alan Arnette guide elevations)

- **Reference:** Alan Arnette's Everest South Col route elevations (camp altitudes), cross-checked to OSM / Wikipedia node coordinates where available (EBC node, South Col, Summit).
  https://www.alanarnette.com/blog/everest-south-col-route/
- **Waypoints (8):** base-camp 5364 m → khumbu-icefall 5870 m → camp-i 6065 m → cwm-c2 6400 m → lhotse-c3 7162/7200 m → south-col-c4 7906 m → south-summit 8749 m → summit 8848.86 m.
- **Grid samplings used** to anchor the corridor: Western Cwm floor, Lhotse Face, Geneva/South Col, summit ridge (see `route/waypoints.json` for GPS + alt_refs).
- **Elevations in `waypoints.json`:** public/reference altitudes (`alt_ref_m`); actual terrain (DEM) differs (e.g. summit DEM reads ~8709 m vs true 8848.86 m — never use DEM-derived heights for the waypoint labels).
- Route geometry is an **educational approximation** (trained to the DEM valley/face), not a survey-grade GPS track.
