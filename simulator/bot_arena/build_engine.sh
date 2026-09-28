#!/usr/bin/env bash
# Rebuilds lorcana-engine.js from TheCardGoat's open-source Lorcana engine (MIT).
# Needs: git, pnpm 10.x, bun 1.3.x.   Usage: ./build_engine.sh [commit]
set -euo pipefail

ENGINE_REPO="https://github.com/TheCardGoat/tcg-engines.git"
ENGINE_COMMIT="${1:-d6dfd697}"   # the commit tested with this page
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "Cloning engine at $ENGINE_COMMIT…"
git clone --quiet --filter=blob:none "$ENGINE_REPO" "$WORK/tcg-engines"
git -C "$WORK/tcg-engines" checkout --quiet "$ENGINE_COMMIT"

LORCANA="$WORK/tcg-engines/submodules/lorcana"
SIM="$LORCANA/packages/lorcana/lorcana-simulator"

echo "Installing dependencies…"
pnpm --dir "$LORCANA" install --frozen-lockfile --ignore-scripts --silent

echo "Bundling…"
cp "$HERE/engine_entry.ts" "$SIM/arena-entry.ts"
(cd "$SIM" && bun build ./arena-entry.ts --target browser --minify --outfile "$HERE/lorcana-engine.js")

cp "$LORCANA/LICENSE" "$HERE/ENGINE_LICENSE.txt"
echo "$ENGINE_COMMIT" > "$HERE/ENGINE_VERSION.txt"
echo "Done: $HERE/lorcana-engine.js"
