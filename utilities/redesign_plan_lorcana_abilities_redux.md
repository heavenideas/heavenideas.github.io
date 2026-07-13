# Implementation Plan — GUI Redesign of `utilities/lorcana_abilities_redux.html`

**Audience:** an implementing model/engineer. This document is self-contained: follow it top to bottom.
**Goal:** redesign the GUI of the Lorcana Ability Editor & Analyzer for usability. **Zero functionality may be removed.** Removing or breaking any behavior listed in §2 is complete failure.
**Scope:** build the redesign as a **NEW file** — `utilities/lorcana_abilities_redux_v2.html`. Do **not** modify `utilities/lorcana_abilities_redux.html`; it stays untouched as the A/B baseline. The calculation engine and data model are ported verbatim from the original.
**Testing:** you (the implementer) must **NOT open or test the result in a browser yourself** — no browser automation, no screenshots, no headless checks. The user performs all testing, following `utilities/redesign_testing_lorcana_abilities_redux.md`. Your verification is limited to code-level review (re-reading your output against this plan and the parity checklist).

---

## 1. Hard constraints

1. **Single self-contained HTML file** at `utilities/lorcana_abilities_redux_v2.html` (new file; original left untouched for A/B testing). Dependencies stay CDN-based: Tailwind CDN, Fuse.js CDN, Google Fonts. No build step, no modules, no frameworks.
2. **Engine functions ported verbatim (no logic changes):** `getNumberFromText`, `evaluateFormula`, `calculateCardMetrics`, the regex-compile routine (`/pattern/flags` parsing with bare-pattern → `gi` fallback), and the `WILL_NOT_MATCH_TEXT` sentinel handling. These live at lines 299–460 and 503–513 of the current file.
3. **Data model unchanged.** The in-memory shape of `ABILITIES_CONFIG` (`@constants`, `abilities[]` with `name`, `category`, `sub_type`, `regex`, `explanation`, `justification`, `calculation.{variables[], contextModifiers[], scores{}}`) is never restructured. Edits write string values exactly as today (`target.value` semantics — do not coerce types).
4. **Save format identical:** download named `lorcana_abilities_redux.json`, `JSON.stringify(config, null, 2)`, with `regexObject` stripped from every ability. **Round-trip test:** load the JSON, immediately save without edits — output must be byte-identical to input (modulo the `regexObject` strip). This is the parity guard; verify it.
5. **Data sources unchanged:** cards from `https://raw.githubusercontent.com/heavenideas/similcana/refs/heads/main/database/allCards.json`; abilities auto-loaded from `https://raw.githubusercontent.com/heavenideas/heavenideas.github.io/refs/heads/main/lorcanaUtils_MatchUpAnalyzer/lorcana_abilities_redux.json`, with fallback warning banner + manual file load on failure.
6. **Never use a plain `<select>` for any field whose stored value set is open.** A `<select>` silently coerces unknown existing values and would corrupt data on round-trip. Use `<input>` + `<datalist>` (suggestions, any value allowed) for: variable `source`, variable `type`, modifier `operation`, modifier `targetMetric`, `category`, `sub_type`. Suggested datalist values: type → `numeric`, `textOrNumber`; operation → `multiply`, `add`, `set`; targetMetric → `lvi`, `bcr`, `rds`; source → `regex`, `card.cost`, `card.strength`, `card.willpower`, `card.lore`; category/sub_type → distinct values currently present in the loaded config.
7. **Mobile is a hard requirement:** fully usable at 360 px wide. Not a degraded afterthought — design mobile and desktop together (§6).
8. **Escape all HTML** interpolated into templates (`&`, `<`, `>`, `"`). The current `createField` helper injects raw values into `value="…"`; a regex containing `"` breaks the form today. Provide one `esc()` helper and use it everywhere user/JSON data enters markup.

## 2. Functionality inventory — the parity checklist

Every item below exists today (or exists as dead UI that must be brought to life, marked ⚠). Each must work in the redesign. Use this as the acceptance checklist at the end.

**Data lifecycle**
- [ ] Auto-load abilities JSON from URL on startup; timestamped "Last loaded" indicator.
- [ ] On URL failure: warning banner instructing manual load; app still functions after manual load.
- [ ] Load abilities from local `.json` file (file picker); JSON parse errors reported to user.
- [ ] Save JSON as download per constraint §1.4; attempting save with no data loaded shows a message instead of downloading.
- [ ] Card DB fetched on startup; loader shown while fetching; fetch failure shows error with message.

**Pattern editor**
- [ ] Every ability editable: name, category, sub_type, regex, explanation, justification.
- [ ] Regex validated live on edit; invalid regex flagged visually; valid regex recompiled into `regexObject` immediately.
- [ ] "New Ability" creates the exact default object used today (name "New Ability", category "Uncategorized", regex `//gi`, empty calculation), inserts at top, scrolls to it, highlights it.
- [ ] Calculation → Variables: list, add (default `{name:"", source:"regex", group:1, type:"textOrNumber"}`), remove, edit all four fields.
- [ ] Calculation → Context Modifiers: list, add (default `{targetMetric:"lvi", name:"survivability", operation:"multiply", value:"1.0"}`), remove, edit all five fields (targetMetric, name, operation, value, condition).
- [ ] Calculation → Scores: for each of `resource_dominance`, `lore_velocity`, `board_control`: value, explanation, condition editable.
- [ ] Deep-path writes create missing intermediate objects/arrays (current `data-path` setter behavior).
- [ ] Filter abilities by name via text input.
- [ ] Category/sub-type tree navigation with counts: "Show All", category rows, sub-type rows (sub-types hidden when a category has only the implicit "General" group — current rule at line 875); clicking filters the list.
- [ ] Tree rebuilds when names/categories change.

**Card analysis**
- [ ] Fuzzy card search (Fuse.js, keys `fullName`/`simpleName`, threshold 0.3, limit 10) with thumbnail dropdown; click selects card; dropdown closes on outside click; refocus with text re-opens results.
- [ ] Selected card shows RDS / LVI / BCR totals (3 decimals) and full breakdown table: ability name, metric, per-cost score, explanation string in the exact current format `${explanation} (Raw: X / Cost: Y = Z)`.
- [ ] **Live re-analysis:** any edit in the pattern editor re-runs analysis of the selected card.
- [ ] Analyzing with no abilities loaded prompts the user to load abilities.

**Custom regex card search — ⚠ currently a dead stub (line 812) that must be RESTORED**
The redux file has the full UI (input, flags, Search, error, stats, results, Copy Names) but an empty click handler. The complete working logic exists in `utilities/lorcana_abilities.html` lines **1639–1804** (`customRegexBtn` handler, `displayRegexStats`, `copyResultsBtn` handler). Port it:
- [ ] Pattern + flags inputs; invalid regex → inline error message + error styling on input.
- [ ] Searches every card's full text (newlines flattened); zero-length-match guard; non-global regex handled.
- [ ] Results list: card thumbnail, name, RDS/LVI/BCR (and CTL = sum) chips, full card text with **all matches highlighted**; clicking a result selects that card in the analyzer.
- [ ] Stats block: ink-color distribution and card-type distribution with counts + percentages (ink order and type order arrays from the source file).
- [ ] "Copy Names" button (hidden when no results): copies `Name: full text` blocks to clipboard, shows "Copied!" confirmation state for 2 s.
- [ ] Format filter checkboxes **Core** and **Infinity** (filter on `card.allowedInFormats.Core` / `.Infinity`) — present in the source logic; add the two checkboxes to the tester UI.
- Note: the source uses `UnifiedWinProbabiliyCalculation.calculateCardMetrics`; in this file call the local `calculateCardMetrics` instead. The source reads `card.fullText`; keep that with fallback to `(card.fullTextSections || []).join(' ')`.

## 3. Known defects to fix during the redesign (bugs, not features — fixing them is required)

1. **Focus/scroll loss on add/remove variable/modifier.** Today the whole list re-renders (and re-filters by category as a side effect, changing what's visible). Fix: re-render only the affected rows container inside the open editor, exactly like `renderVariables`/`renderModifiers` in `utilities/lorcana_abilities.html` (see lines 1106–1131 there).
2. **Tree filter reset on every keystroke.** `buildAndRenderTree` runs on every `input` event and resets the active item to "Show All". Fix: debounce tree rebuild (~500 ms) and preserve the active filter selection across rebuilds.
3. **Unescaped attribute injection** (§1.8).
4. **`alert()` dialogs** for routine messages. Replace every `alert` with a non-blocking toast or inline banner carrying the same information.
5. **No unsaved-changes protection.** Add: dirty-state indicator, `beforeunload` guard when dirty, and localStorage draft autosave (debounced ~2 s) with a "Restore draft from <time>? / Discard" banner on next load. Saving or loading a file clears dirty + draft.
6. **Re-analysis on literally every keystroke.** Debounce live re-analysis ~250 ms.

## 4. Design system

Aesthetic thesis: a **scribe's workbench for magical ink**. The page keeps a dark, long-session-friendly ground, but every color in the UI is one of Lorcana's six inks doing a *functional* job — the palette is the game's own color system, not decoration. One storybook display face appears only in headings; everything mechanical (regex, formulas, scores) is strict mono.

### 4.1 Color tokens (define as CSS custom properties on `:root`)

| Token | Hex | Role |
|---|---|---|
| `--inkwell` | `#0A0F1E` | page background |
| `--vellum` | `#121A2E` | panel surface |
| `--vellum-2` | `#1A2440` | raised surface (rows, inputs) |
| `--rule` | `#2A3654` | borders, dividers |
| `--text` | `#E7ECF6` | primary text |
| `--text-dim` | `#93A0BC` | labels, secondary |
| `--text-faint` | `#5C6A8A` | placeholders, counts |
| `--ink-amber` | `#E9B44C` | **primary accent** — actions, active nav, focus rings, LVI metric |
| `--ink-sapphire` | `#59A7F2` | info, links, RDS metric |
| `--ink-ruby` | `#EF6070` | destructive, errors, BCR metric |
| `--ink-emerald` | `#4CC38A` | success, valid-regex state, match highlights (on dark: text `#4CC38A`; highlight fill `rgba(76,195,138,.22)`) |
| `--ink-amethyst` | `#A78BFA` | regex/formula/code text |
| `--ink-steel` | `#94A3B8` | neutral chrome, icons |

Rules: primary buttons are `--ink-amber` on `--inkwell` text `#1A1305`; destructive actions `--ink-ruby`; never introduce colors outside this table. Check contrast ≥ 4.5:1 for text (the values above pass on their assigned grounds).

### 4.2 Typography

- **Display — `Marcellus`** (Google Fonts, weight 400 only): app title, the three panel titles, selected card name. Nothing else. Letter-spacing `0.02em`.
- **Body/UI — `Inter`** 400/500/600: labels, buttons, prose.
- **Mono — `JetBrains Mono`** 400/600: regex inputs and previews, formula/value/condition inputs, scores, counts, timestamps.
- Scale (px): 12 (counts/meta), 13 (labels, mono inputs), 14 (body, inputs), 16 (row titles), 18 (section heads), 22 (panel titles), 28 (app title). Line-height 1.5 body, 1.3 headings.

### 4.3 Components

- **Inputs:** `--vellum-2` fill, 1 px `--rule` border, 8 px radius, 8×12 px padding; focus = 2 px `--ink-amber` ring (`:focus-visible` everywhere). Regex/formula inputs use mono + `--ink-amethyst` text. Invalid state: `--ink-ruby` border **plus an inline message line under the field with the actual regex error message** (today it's border-only — surface `err.message`).
- **Buttons:** primary (amber, solid), secondary (transparent, `--rule` border), destructive (ruby outline → solid on confirm step), icon buttons ≥ 40×40 px hit area (44 px on mobile).
- **Chips/badges:** category chips (steel outline), match-count badges (mono, emerald when >0, faint when 0, ruby when regex invalid).
- **Toasts:** bottom center, `--vellum-2`, auto-dismiss 4 s, may carry one action ("Undo").
- **Motion:** 150–200 ms ease-out transitions on expand/collapse and tab switches; the Ink Ledger delta flash (§5.4) is the only choreographed animation. Wrap all motion in `@media (prefers-reduced-motion: reduce)` → disabled.
- Keep the custom scrollbar styling idea (thin, `--rule` thumb).

## 5. Layout & interaction design

### 5.1 Desktop (≥ 1024 px)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ✒ Lorcana Ability Editor        [Load JSON] [Save ●] [+ New Ability]     │ ← app bar 56px
│                                  last loaded: 12:04:33 · 214 abilities   │
├─────────────┬──────────────────────────────────┬─────────────────────────┤
│ CATEGORIES  │  [filter abilities…        🔍]   │ ┌─[Card Analysis]─[Regex│
│ Show All 214│ ┌──────────────────────────────┐ │ │        Tester]───────┐│
│ ▸ Draw   38 │ │ ▸ Card Draw Engine   (12) ●  │ │ │ [search card…      ] ││
│ ▾ Removal 41│ │   /draws? (\d+) cards?/gi    │ │ │  Elsa — Snow Queen   ││
│    Banish 22│ ├──────────────────────────────┤ │ │ ┌─── INK LEDGER ───┐ ││
│    Damage 19│ │ ▾ Banish Chosen       (31) ● │ │ │ │RDS ▓▓▓▓░░ 0.412  │ ││
│ ▸ Lore   27 │ │ ┌──────────────────────────┐ │ │ │ │LVI ▓▓░░░░ 0.238  │ ││
│  …          │ │ │ Name  [Banish Chosen  ]  │ │ │ │ │BCR ▓▓▓▓▓░ 0.551  │ ││
│             │ │ │ Cat [Removal] Sub [Ban.] │ │ │ │ └──────────────────┘ ││
│             │ │ │ Regex [/banish chosen/gi]│ │ │ │ Breakdown table…     ││
│             │ │ │  ✓ valid · matches 31 ▸  │ │ │ │ (rows link back to   ││
│             │ │ │ Explanation […………………]    │ │ │ │  their pattern)      ││
│             │ │ │ ─ Calculation ─────────  │ │ │ └──────────────────────┘│
│             │ │ │ Variables / Modifiers /  │ │ │                         │
│             │ │ │ Scores editors…          │ │ │                         │
│             │ │ │ [Test in card search]    │ │ │                         │
│             │ │ │ [Duplicate] [Delete]     │ │ │                         │
│             │ │ └──────────────────────────┘ │ │                         │
│             │ └──────────────────────────────┘ │                         │
└─────────────┴──────────────────────────────────┴─────────────────────────┘
  240px fixed        flexible                        480px fixed
```

Three panels under a slim app bar; each panel scrolls independently (full-height app, `100dvh`, no page scroll).

**App bar:** Marcellus title; Load / Save / New Ability; Save shows a `--ink-amber` dot when dirty ("Save ●", tooltip "Unsaved changes"); meta line with last-loaded timestamp and ability count. `Ctrl/Cmd+S` triggers Save (preventDefault).

**Left rail — category tree.** Same data/behavior as today (Show All / categories / sub-types with counts, same "General-only" hiding rule). Active item = amber left bar + amber text. Counts in mono, faint.

**Center — pattern workspace.** The core usability change: ability cards are **collapsed rows by default** instead of ~40 always-open form cards.
- Collapsed row: name (16 px, 500), category·sub_type chip, regex preview in mono amethyst (single line, ellipsized), match-count badge, invalid-regex ruby dot when applicable, and a small emerald ink-drop dot when the pattern matched the currently selected card.
- Click row → expands **in place** to the full editor (all fields from §2). Multiple rows may be open simultaneously; state survives filtering/re-render (track open-set by ability object identity or stable index).
- Filter input above the list (name filter, as today — additionally match against regex source text and explanation; this is an addition, name matching must still work).
- The editor form: identity fields (Name; Category + Sub-type side by side with datalists; Regex full-width mono with live validity line "✓ valid · matches N cards" or "✕ <error message>"; Explanation and Justification as **auto-growing textareas**), then a "Calculation" section with three subsections — Variables (rows: name / source / group / type + remove), Context Modifiers (rows: targetMetric / name / operation / value / condition + remove), Scores (three labeled columns: Resource Dominance / Lore Velocity / Board Control, each with value / explanation / condition, column header tinted with its ink color). All field-level suggestions via datalist per §1.6. Each mono value/condition input keeps its current placeholder examples (`@constants.lvi.wardModifier`, `@card.willpower > 5`, etc.).
- Editor footer buttons: **Test in card search** (copies this pattern's regex + flags into the Regex Tester tab, switches to it, runs the search — this restores/improves the old undiscoverable label-click feature from `lorcana_abilities.html` line 1134), **Duplicate** (deep-clone minus `regexObject`, insert after, name suffixed " (copy)"), **Delete** (two-step inline confirm: first click turns the button into "Confirm delete" for 3 s; after deletion show toast "Ability deleted — Undo" for 5 s that reinserts at the same index). Duplicate/Delete are additions; they must not disturb any existing behavior.

**Right panel — inspector with two tabs:** `Card Analysis` and `Regex Tester`. Tabs, not stacked sections, so each gets full height; switching preserves both tabs' state (keep both in DOM, toggle visibility).
- *Card Analysis tab:* card search box + results dropdown (behavior per §2); selected card header (Marcellus name, thumbnail, cost/type meta); the **Ink Ledger** (§5.4); breakdown table (sticky header, zebra rows; ability-name cells are links — click scrolls to that pattern in the center list, expands it, and applies the existing focus-highlight animation).
- *Regex Tester tab:* pattern + flags inputs (mono), Core/Infinity checkboxes, Search + Copy Names buttons, error line, stats block, results list — all behaviors per §2 restore spec. Render the ink-distribution stats as small horizontal bars tinted with the actual ink colors (Amber/Amethyst/Emerald/Ruby/Sapphire/Steel from §4.1; dual-ink rows split the bar) with counts + % in mono. Type distribution as a plain count list.

### 5.2 Match-count badges (addition; must not degrade performance)

- Precompute a flattened text (`(card.fullTextSections||[]).join(' ')` newline-stripped) per card **once** after the card DB loads.
- Compute per-pattern match counts in idle chunks (`requestIdleCallback` or `setTimeout` batches of ~10 patterns) after abilities load; render badges as they arrive (skeleton "–" before).
- On regex edit, recompute **only that pattern's** count, debounced 400 ms.
- `WILL_NOT_MATCH_TEXT` and invalid regexes show "—".

### 5.3 Live-edit loop (preserved, tightened)

Any editor input → write to `ABILITIES_CONFIG` immediately (exact current `data-field` / `data-path` semantics) → mark dirty → debounced (250 ms): recompile regex if regex field, re-analyze selected card, update this pattern's collapsed-row preview + badge; debounced (500 ms): rebuild tree preserving active filter.

### 5.4 Signature element — the Ink Ledger

The three metric totals rendered as horizontal ink-fill meters (RDS sapphire, LVI amber, BCR ruby): mono value right-aligned, bar filled proportionally (scale: max of the three values in view, min bar 2 px when nonzero). When a live edit changes a value, the bar animates to its new width (200 ms) and a small mono delta (`+0.12` emerald / `−0.08` ruby) fades in beside the value for 1.5 s. This makes the editor's core loop — "tweak regex, watch the score move" — visible. Respect reduced-motion (jump cut, delta still shown).

### 5.5 Empty/error states (write real copy)

- No abilities loaded (center): "No abilities loaded. Load a JSON file or wait for auto-load." + Load button.
- No card selected (analysis tab): "Search for a card to see how the loaded patterns score it. Edits update this analysis live."
- Filter with zero hits: "No abilities match '<query>'." + "Clear filter" action.
- Tester with zero hits: "No cards matched this regex."
- URL auto-load failure banner: keep current wording intent; add a "Load file" button inline in the banner.

## 6. Mobile (< 1024 px, designed to 360 px)

```
┌──────────────────────────────┐
│ ✒ Ability Editor    [⬆][💾●][+]│  ← app bar: icon buttons, 44px targets
├──────────────────────────────┤
│ [filter…            ] [☰ Cat]│  ← Cat opens bottom-sheet with the tree
│ ┌──────────────────────────┐ │
│ │ ▸ Card Draw Engine  (12)●│ │
│ │ ▸ Banish Chosen     (31) │ │
│ │   …collapsed rows…       │ │
│ └──────────────────────────┘ │
├──────────────────────────────┤
│ [ Patterns ] [ Analyze ] [ Tester ] │ ← bottom tab bar, fixed
└──────────────────────────────┘
```

- Bottom tab bar (fixed, 56 px + safe-area inset) switches between the three panels: **Patterns**, **Analyze**, **Tester**. All three stay mounted; visibility toggled. This replaces the desktop 3-column grid below `lg:`.
- Category tree becomes a bottom sheet opened from a "Categories" button next to the filter input; selecting a filter closes the sheet and shows the active filter as a dismissible chip above the list.
- Editor forms stack to one column; Variables/Modifiers rows wrap to 2-column grids; touch targets ≥ 44 px; remove buttons are labeled icon buttons, not bare "X".
- "Test in card search" and breakdown-row links also switch the active bottom tab.
- Score columns (3-up on desktop) stack vertically.
- No fixed `h-[85vh]` anywhere; use `100dvh` app frame with internal scroll areas. Verify no horizontal scroll at 360 px (breakdown table gets `overflow-x: auto` on its own container).

## 7. Implementation order

1. **Scaffold:** app frame (app bar, 3 panels, tabs, bottom tab bar), CSS tokens (§4), fonts. Static, no data.
2. **Port state + engine verbatim** (§1.2–1.5): loaders, `processLoadedAbilities`, save, Fuse search. Verify round-trip parity (§1.4) now.
3. **Pattern workspace:** collapsed rows, expand-in-place editor, all fields + datalists, targeted row re-render for variables/modifiers (§3.1), tree rail with preserved active state, filter.
4. **Analysis tab:** card search, Ink Ledger, breakdown table + pattern links, live-edit loop with debounces (§5.3).
5. **Regex Tester tab:** port full logic from `utilities/lorcana_abilities.html` 1639–1804 per §2 restore spec, incl. format checkboxes, stats bars, Copy Names, Test-in-card-search wiring.
6. **Additions:** match-count badges (§5.2), dirty state + Ctrl+S + beforeunload + localStorage draft (§3.5), duplicate/delete with undo toast, toasts replacing alerts.
7. **Mobile pass at 360 px** (§6) and a11y floor: `:focus-visible` rings, `aria-expanded` on rows, `aria-selected` on tabs, labels bound to inputs, reduced-motion media query.
8. **Handoff — no browser testing by the implementer.** Re-read the finished file against §2 and §1 (code review only), then stop and hand off. The user runs the full test protocol in `utilities/redesign_testing_lorcana_abilities_redux.md`, A/B against the untouched original. Do not launch a browser, take screenshots, or run headless checks.

## 8. Non-goals

- No framework migration, no build tooling, no TypeScript.
- No changes to the JSON schema or to score math.
- No dark/light theming toggle (single dark theme, as today).
- No server/persistence beyond the localStorage draft.
