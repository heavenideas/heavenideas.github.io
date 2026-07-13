# User Test Protocol — Lorcana Ability Editor Redesign

**What you're testing:** `utilities/lorcana_abilities_redux_v2.html` (the redesign)
**A/B baseline:** `utilities/lorcana_abilities_redux.html` (original, untouched)
**Who tests:** you, the user. The implementer does not browser-test — every box below is yours to tick.

**Pass rule:** every behavior that works in the original must work in v2. Any regression = failure, regardless of how nice v2 looks. Note: the original's "Search" button in Custom Regex Card Search is a known dead stub — in v2 it must actually work (Suite F).

---

## Setup

1. Serve the repo locally (fetches may fail from `file://`):
   ```
   python -m http.server 8000
   ```
   Open `http://localhost:8000/utilities/lorcana_abilities_redux_v2.html`, and the original in a second tab for A/B.
2. Keep a copy of `lorcanaUtils_MatchUpAnalyzer/lorcana_abilities_redux.json` handy for manual-load and round-trip tests.
3. Open DevTools console; any red errors during any suite → record as a failure.

---

## Suite A — Startup & data lifecycle

- [ ] A1. Page loads, shows a loading state, then the app. Abilities auto-load from URL; "Last loaded" timestamp visible; ability count visible.
- [ ] A2. Kill your network (DevTools → offline), reload: a warning banner explains auto-load failed and offers manual load. Load the local JSON via the button — app becomes fully functional.
- [ ] A3. Load a deliberately broken file (rename a `.txt` with garbage to `.json`): a clear error message appears, app doesn't break.

## Suite B — Round-trip integrity (most important test)

- [ ] B1. Load the local abilities JSON manually. Immediately click Save with **zero edits**. Diff the downloaded file against the source, e.g.:
  ```
  git diff --no-index lorcanaUtils_MatchUpAnalyzer/lorcana_abilities_redux.json ~/Downloads/lorcana_abilities_redux.json
  ```
  **Expected: no differences.** Any changed value, reordered key, or type change (e.g. `1` becoming `"1"`) = FAIL.
- [ ] B2. Edit one ability's name, save, diff again: only that one field differs.
- [ ] B3. Save with no data loaded: get a message, not a broken/empty download.

## Suite C — Pattern editor

- [ ] C1. Abilities show as collapsed rows: name, category, regex preview, match-count badge. Click a row → expands to the full editor. All fields present: name, category, sub-type, regex, explanation, justification, Variables, Context Modifiers, Scores (3 metrics × value/explanation/condition).
- [ ] C2. Type an invalid regex (e.g. `(unclosed`): field flags red **and shows the actual error message**. Fix it: flag clears.
- [ ] C3. "New Ability": new ability appears at top, scrolled to and highlighted, editable, shows in tree under "Uncategorized".
- [ ] C4. Variables: add one, fill all four fields, remove one. **While doing this your scroll position and input focus must NOT jump** (original bug — must be fixed). Same for Context Modifiers.
- [ ] C5. Category/sub-type/operation/type/targetMetric fields offer suggestions but **accept any typed value** — type a nonsense value like `weirdOp`, save, confirm it survives in the downloaded JSON unchanged.
- [ ] C6. Filter box: type part of an ability name → list narrows; clear → list restores. While a tree category filter is active, typing in an *editor field* must NOT reset the tree selection to "Show All" (original bug — must be fixed).
- [ ] C7. Rename an ability's category → tree updates (may take ~1 s, that's fine) and your active selection is preserved.
- [ ] C8. Duplicate: creates a copy named "… (copy)" right after the original. Delete: requires a second confirming click, then shows an Undo toast — click Undo, ability returns in place.
- [ ] C9. Paste a regex containing a double quote (e.g. `say "hello"`) into the regex field, collapse and re-expand the row: value intact, form not broken (original bug — must be fixed).

## Suite D — Tree navigation

- [ ] D1. "Show All" + categories + sub-types listed with counts; counts match the original file's tree for the same JSON (A/B check).
- [ ] D2. Clicking a category filters the list; clicking a sub-type filters tighter; "Show All" restores everything.

## Suite E — Card analysis & live loop

- [ ] E1. Search "Elsa": dropdown with thumbnails appears; click one → card analysis renders: RDS/LVI/BCR totals (Ink Ledger meters) + breakdown table. **A/B: totals and breakdown values must be IDENTICAL to the original file for the same card and same JSON** (to 3 decimals).
- [ ] E2. Click outside the dropdown → it closes. Click back into the search box with text → results reappear.
- [ ] E3. Live loop: with a card selected, find an ability that matches it (emerald dot on its row), change a score value → within ~1 s the Ink Ledger updates and shows a small +/− delta. Revert the edit → values return.
- [ ] E4. Click an ability name in the breakdown table → the pattern list scrolls to that ability and expands it, briefly highlighted.
- [ ] E5. Clear abilities state (reload page offline, don't load JSON), pick a card: a message asks you to load abilities first — no crash.

## Suite F — Regex Tester (restored functionality — original's is a dead button)

- [ ] F1. Open the Regex Tester tab. Enter `draw 2 cards`, flags `gi`, Search: results list with card thumbnails, names, CTL/RDS/LVI/BCR chips, and full card text with **matches highlighted**.
- [ ] F2. Stats show ink-color distribution (colored bars) and card-type distribution with counts + percentages, summing to the total.
- [ ] F3. Toggle Core / Infinity checkboxes and re-search: result counts change accordingly.
- [ ] F4. Invalid regex → inline error, no crash. Regex with zero matches → "no cards matched" message, stats cleared.
- [ ] F5. "Copy Names" appears only with results; clicking it shows "Copied!" and your clipboard contains `Name: card text` blocks.
- [ ] F6. Click a result card → switches to Card Analysis tab with that card analyzed.
- [ ] F7. In a pattern's editor, click "Test in card search" → tester tab opens pre-filled with that regex, search already run.

## Suite G — Unsaved changes protection (new)

- [ ] G1. Edit anything → dirty indicator appears on Save. Save → indicator clears.
- [ ] G2. With unsaved edits, try closing the tab → browser warns.
- [ ] G3. With unsaved edits, wait ~5 s, force-reload ignoring the warning → on load, a banner offers to restore your draft. Restore → edits are back. Also test Discard.
- [ ] G4. `Ctrl+S` (Cmd+S on Mac) triggers Save instead of the browser save dialog.

## Suite H — Mobile (360 px) — hard requirement

DevTools device toolbar → 360 × 800 (or a real phone).

- [ ] H1. Bottom tab bar with Patterns / Analyze / Tester; all three panels reachable; **no horizontal page scrolling anywhere**.
- [ ] H2. Categories open as a bottom sheet from the Patterns view; picking one filters and shows a dismissible chip.
- [ ] H3. Expand an ability and edit every field type, including adding/removing a variable — all inputs reachable and tappable (no tiny targets), keyboard doesn't cover the active input hopelessly.
- [ ] H4. Full analysis flow on mobile: search card → Ink Ledger + breakdown readable (table scrolls within itself, not the page).
- [ ] H5. Full tester flow on mobile: search, stats, results, Copy Names.
- [ ] H6. "Test in card search" and breakdown links correctly switch bottom tabs.

## Suite I — A/B side-by-side verdict

Same JSON loaded in both tabs:

- [ ] I1. Every task you actually do with this tool (your real workflow) is possible in v2.
- [ ] I2. Time yourself: find a specific ability, tweak its regex, confirm the effect on a card. v2 should be faster or equal — note your impression.
- [ ] I3. Anything the original does that v2 doesn't? List it — each item is a blocking regression.

---

## Reporting results

Reply with:
1. Failed checkbox IDs (e.g. "B1 FAIL — diff shows group fields became strings") with what you saw vs expected.
2. Console errors (copy the first line of each).
3. Suite I impressions — freeform.

Failures go back to the implementer as fixes; do not accept the redesign until Suite B and Suite I3 are clean.
