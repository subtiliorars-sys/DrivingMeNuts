#!/usr/bin/env bash
# Build browser build and zip for itch.io (free HTML embed).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
mkdir -p "$ROOT/release"

npm run build

OUT="$ROOT/release/driving-me-nuts-browser-v${VERSION}.zip"
python3 - "$OUT" <<'PY'
import sys, zipfile
from pathlib import Path
out = Path(sys.argv[1])
root = out.parent.parent
dist = root / "dist"
if not dist.is_dir():
    raise SystemExit(f"dist/ missing after build: {dist}")
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
    for p in sorted(dist.rglob("*")):
        if p.is_file():
            zf.write(p, p.relative_to(dist).as_posix())
print(f"Wrote {out} ({out.stat().st_size} bytes)")
print("itch.io: Kind=HTML, Main file=index.html, Price=$0")
PY

echo "Upload zip or: ITCH_PUSH_DMN=1 bash ../PixelSports/scripts/push-itch.sh"
