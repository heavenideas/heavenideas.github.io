#!/bin/bash
# Bundle: data + classifier + engine parts into one IIFE exposing window.DojoLab
cd "$(dirname "$0")"
{
  echo "/* Dojo Lab engine — prototype bundle. Card data: LorcanaJSON allCards.json (formatVersion 2.3.5), the two decklists only. */"
  echo "(function (root) {"
  echo "'use strict';"
  printf "const RAW = "; cat cards.json; echo ";"
  sed '/^if (typeof module/d' classify.js
  for f in engine_core.js engine_rules.js engine_lens.js engine_coach.js engine_game.js engine_scen.js engine_ledger.js engine_brief.js engine_view.js engine_api.js; do [ -f "$f" ] && cat "$f"; done
  echo "})(typeof window !== 'undefined' ? window : globalThis);"
} > lab.js
wc -c lab.js
