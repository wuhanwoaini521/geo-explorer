"""Wrapper: force stdlib zlib for DEFLATE decode (workaround for
imagecodecs/libdeflate LIBDEFLATE_BAD_DATA on Copernicus COG tiles),
then run prepare_everest_dem.main().
"""
import sys
import zlib
from functools import wraps

import imagecodecs
import imagecodecs._deflate as _deflate_mod

_orig = _deflate_mod.deflate_decode


@wraps(_orig)
def _deflate_decode(data, out=None):  # noqa: ANN001, ANN201
    try:
        return _orig(data, out=out)
    except imagecodecs.DeflateError:
        raw = zlib.decompress(data)
        if out is not None:
            out[:] = raw
            return out
        return raw


_deflate_mod.deflate_decode = _deflate_decode
imagecodecs.deflate_decode = _deflate_decode

if __name__ == "__main__":
    import runpy

    sys.argv = [
        "prepare_everest_dem.py",
        "--source",
        "design/world/everest-3d/source",
        "--work",
        "design/world/everest-3d/work",
    ]
    runpy.run_path("scripts/terrain/prepare_everest_dem.py", run_name="__main__")
