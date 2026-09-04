"""Detached segmented downloader for the N28 Copernicus tile (slow-link workaround).

8 threads fetch HTTP ranges in parallel and write part-*.bin; the caller
verifies sizes and concatenates. Marker file _parts_done is written on success.
"""
import os
import sys
import threading
import urllib.request

URL = (
    "https://copernicus-dem-30m.s3.amazonaws.com/"
    "Copernicus_DSM_COG_10_N28_00_E086_00_DEM/Copernicus_DSM_COG_10_N28_00_E086_00_DEM.tif"
)
SIZE = 38_212_170
PARTS = 8
OUT_DIR = sys.argv[1]

CHUNK = (SIZE + PARTS - 1) // PARTS


def fetch(idx: int, start: int, end: int) -> None:
    part = os.path.join(OUT_DIR, f"part-{idx}.bin")
    have = os.path.getsize(part) if os.path.exists(part) else 0
    want = end - start + 1
    if have >= want:
        return
    req = urllib.request.Request(URL, headers={"Range": f"bytes={start + have}-{end}"})
    with urllib.request.urlopen(req, timeout=60) as resp, open(part, "ab") as f:
        while True:
            block = resp.read(1 << 16)
            if not block:
                break
            f.write(block)


def main() -> None:
    threads = []
    for i in range(PARTS):
        start = i * CHUNK
        end = min(start + CHUNK - 1, SIZE - 1)
        t = threading.Thread(target=fetch, args=(i, start, end))
        t.start()
        threads.append(t)
    for t in threads:
        t.join()
    ok = all(
        os.path.getsize(os.path.join(OUT_DIR, f"part-{i}.bin")) > 0 for i in range(PARTS)
    )
    expected = [
        min(CHUNK, SIZE - i * CHUNK) for i in range(PARTS)
    ]
    ok = all(
        os.path.getsize(os.path.join(OUT_DIR, f"part-{i}.bin")) == expected[i]
        for i in range(PARTS)
    )
    with open(os.path.join(OUT_DIR, "_parts_done"), "w", encoding="utf-8") as f:
        f.write("ok" if ok else "incomplete")


if __name__ == "__main__":
    main()
