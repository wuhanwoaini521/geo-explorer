#!/usr/bin/env python3
"""续传缺失的媒体候选（限流友好：每次请求间 sleep 可调）。

用法：python3 scripts/content/download-candidates.py [--sleep 15]
输入：miniprogram/data/media/candidates.ts（经 tsx 导出 /tmp/ge-research/download-list.json）
输出：media-source/<world>/<id>.<ext> + media-source/_metadata.json
"""
import json, urllib.request, urllib.parse, hashlib, os, time, sys

SLEEP = 15
if "--sleep" in sys.argv:
    SLEEP = float(sys.argv[sys.argv.index("--sleep") + 1])

meta = json.load(open("media-source/_metadata.json"))

def world_of(cid):
    m = {"k-pelagic": "mariana", "k-atolla": "mariana", "k-marine": "mariana",
         "k-ifremer": "mariana", "k-sub": "everest", "k-hillary": "everest", "k-condor": "colorado"}
    if cid in m:
        return m[cid]
    if cid.startswith("ev"):
        return "everest"
    if cid.startswith("c"):
        return "colorado"
    if cid.startswith("f"):
        return "fuji"
    return "mariana"

for x in meta:
    if "sha256" in x:
        continue
    title = x["sourceUrl"].split("/wiki/")[-1]
    api = f"https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=url|size|sha1&titles={urllib.parse.quote(title)}"
    try:
        with urllib.request.urlopen(urllib.request.Request(api, headers={"User-Agent": "GeoExplorerContentReview/1.0"}), timeout=40) as r:
            d = json.load(r)
        page = next(iter(d["query"]["pages"].values()))
        if "missing" in page:
            raise RuntimeError("page missing")
        info = (page.get("imageinfo") or [{}])[0]
        direct = info["url"]
        wname = world_of(x["id"])
        wdir = f"media-source/{wname}"
        os.makedirs(wdir, exist_ok=True)
        path = os.path.join(wdir, x["id"] + os.path.splitext(title)[1].lower())
        # 限流策略：走 curl（--max-time 120），preview 级候选用 1600px 缩略（不算 original）
        import subprocess
        variant = "original"
        url = direct
        if os.path.exists("/tmp/ge-research/recommendations.json"):
            recs = json.load(open("/tmp/ge-research/recommendations.json"))
            if recs.get(x["id"], "REVIEW") in ("ALTERNATIVE", "REVIEW"):
                variant = "preview-1600"
                fp = title.replace("File:", "Special:FilePath/")
                url = f"https://commons.wikimedia.org/wiki/{urllib.parse.quote(fp)}?width=1600"
        result = subprocess.run(
            ["curl", "-sL", "--max-time", "300", "-A", "GeoExplorerContentReview/1.0", "-o", path, url],
            capture_output=True, text=True, timeout=150,
        )
        if result.returncode != 0 or not os.path.exists(path) or os.path.getsize(path) < 1000:
            raise RuntimeError(f"curl failed rc={result.returncode} size={os.path.getsize(path) if os.path.exists(path) else 0}")
        data = open(path, "rb").read()
        x.update({"variant": variant, "directAssetUrl": direct, "resolution": f"{info.get('width')}x{info.get('height')}",
                  "width": info.get("width"), "height": info.get("height"),
                  "sha1_12": info.get("sha1", "")[:12], "fileSize": len(data),
                  "sha256": hashlib.sha256(data).hexdigest(), "localPath": path, "world": wname})
        x.pop("error", None)
        print("OK", x["id"], f"{len(data)/1e6:.1f}MB", flush=True)
    except Exception as e:
        x["error"] = str(e)
        print("ERR", x["id"], str(e)[:70], flush=True)
    time.sleep(SLEEP)

json.dump(meta, open("media-source/_metadata.json", "w"), ensure_ascii=False, indent=2)
# 追踪副本（media-source/ 整目录被 gitignore；元数据须入仓）
import shutil
os.makedirs("design/content/media-review", exist_ok=True)
shutil.copy("media-source/_metadata.json", "design/content/media-review/media-source-metadata.json")
ok = [m for m in meta if "sha256" in m]
print(f"total ok: {len(ok)} / {len(meta)}", flush=True)
