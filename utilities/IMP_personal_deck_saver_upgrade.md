# IMP: Personal Deck Saver — Performance Overhaul + "Ink & Lore" Redesign

**Target:** `utilities/personal_deck_saver.html` (originally a single 2883-line file)
**Deliverables (built):** `utilities/personal_deck_saver.html` (shell) + `utilities/personal_deck_saver.css` + `utilities/personal_deck_saver.js`, plus small edits to the shared modules `unified_win_probability_utilities.js`, `card_stat_analysis_module.js`, `CardThreatLevelInspector.js` (see §7).
**Status:** ✅ Implemented and verified in-browser (desktop + 390px). §§1–6 describe the original plan; **§7 records what was actually done differently** — read §7 before treating any earlier statement as current.

> Implementing agent: before starting Phase 4, invoke the `frontend-design` skill. Mobile (360px) is a **hard requirement**, designed together with desktop — not a later pass. Verify visuals in a real browser at 360×740 and desktop width before declaring any UI phase done.

---

## 1. Context & mission

The Deck Saver is a Lorcana deck manager: Supabase-backed deck CRUD, decklist editor with fuzzy card search, visual card grid with probability/CTL overlays, mulligan probability helper, 5 Chart.js charts with click-to-highlight, a draw/shuffle simulator, and a batch simulator.

Two problems:

1. **Slow deck load.** Clicking a deck in "My Decks" takes seconds before the card grid appears. Root causes are enumerated in §3 — they are all in the deck-select path and startup path, and all fixable without changing behavior.
2. **Dated UI.** Generic gray-900/purple Tailwind look, no mobile layout (two-column flex collapses poorly, tabs overflow, charts unusable on a phone), `alert()` for errors, no loading feedback after the initial overlay.

## 2. Goals & non-goals

**Goals**
- Deck click → full rendered grid feels instant (< 100 ms for a previously viewed deck, no network request; < 400 ms first view of a deck on warm card DB).
- Warm page loads skip the multi-MB card DB download (Cache API, stale-while-revalidate).
- New app-shell UI ("Ink & Lore" direction, §5) that is genuinely good on a 360px phone.
- Split into HTML/CSS/JS files.

**Non-goals — do NOT do these**
- No framework, no bundler, no build step. Plain HTML/CSS/JS, GitHub Pages static hosting.
- Keep existing CDN deps: Tailwind Play CDN, `@supabase/supabase-js@2`, `chart.js@4.4.2`, `fuse.js@7`.
- Keep all existing features and math. The mulligan inclusion–exclusion probability (`updateCombinedProbability`), hand-quality scoring, shuffle analysis, batch sim, and LLM prompt generator are **behaviorally frozen** — restyle their containers only.
- **Paste/copy of the full decklist is a first-class workflow — protect it.** The raw decklist `<textarea>` stays (Editor tab), accepts a full pasted list in the existing formats (`4 Card Name`, `4x Card Name`, bare `Card Name`) and re-renders via the existing debounced input handler. The "Copy Decklist" button stays (including its non-secure-context `execCommand` fallback) and always copies the **entire** raw text. Both must work on mobile with the native clipboard (long-press paste into textarea; copy button ≥44px, visible without scrolling past the fold of the Editor tab). A pasted 60-card list must parse + render within the same perf budget as a deck click (the §3-P2 Map lookup makes this cheap).
- Do not change the Supabase schema, URL, or anon key.
- ~~Do not modify `card_stat_analysis_module.js` or `CardThreatLevelInspector.js`.~~ **Superseded by §7-P7:** a follow-up performance pass (the inspector popup + Stat Comparisons tab were extremely slow) required backwards-compatible edits to all three shared modules. All changes are additive/behavior-preserving; other pages that use these modules are unaffected. See §7-P7.

## 3. Performance fixes (the deck-select lag, diagnosed)

Line numbers refer to the current `personal_deck_saver.html`. After the Phase-1 file split they live in `personal_deck_saver.js` — the function names are the stable anchors.

### P1 — Kill the per-click Supabase round-trip
`populateForm(deckId)` (~line 2537) runs `supabaseClient.from('decks').select('*').eq('id', deckId).single()` on every deck click. But `loadAndRenderDecks()` (~line 2519) already fetched **all** decks with `select('*')` into `allDecks`.

**Fix:** `const deck = allDecks.find(d => d.id === deckId);` — use it directly. Only fall back to the network fetch if not found (shouldn't happen). This removes 200–600 ms of network latency per click.

### P2 — Replace per-line Fuse search with an exact-match Map
`parseAndRenderDeck()` (~line 2062) calls `cardFuse.search(cardName)` for **every decklist line** (30–45 lines × fuzzy scan over the whole card DB ≈ hundreds of ms of blocking CPU). This runs on every deck click and on every debounced textarea edit.

**Fix:**
1. After loading `allCards`, build once:
   ```js
   const normalize = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
   const cardByName = new Map();
   for (const c of allCards) {
       cardByName.set(normalize(c.fullName), c);
       if (c.simpleName) cardByName.set(normalize(c.simpleName), c);
   }
   ```
2. In `parseAndRenderDeck()`, resolve each line via `cardByName.get(normalize(cardName))` first; fall back to `cardFuse.search()` **only on a miss** (typos, partial names — keep this, it's a feature of the textarea editor).
3. Memoize fallback results: `const fuseResolveCache = new Map(); // normalized line -> card|null` so re-renders never repeat a fuzzy search.

`addCardToDecklist()` (~line 2387) has the same pattern in its second loop — apply the same Map-first lookup there.

### P3 — Thumbnails in grids, full images only on demand
- `renderVisualDeck()` (~line 2144): card stacks are 150px wide but load `card.images.full`. Use `card.images.thumbnail` (fallback chain: `thumbnail || full || placeholder`).
- `renderSearchResults()` (~line 2340): 40×56px dropdown thumbs load `card.images.full`. Use `thumbnail`.
- Full image is reserved for: `CardThreatLevelInspector` popup and the timeline hover tooltip (already `images.full`, fine — it's on-demand).
- On every grid `<img>`: keep `loading="lazy"`, add `decoding="async"`, and set `width`/`height` attributes matching the CSS box to prevent layout shift.

### P4 — Memoize CTL metrics; stop rebuilding the grid on scenario toggle
- `renderVisualDeck()` calls `UnifiedWinProbabiliyCalculation.calculateCardMetrics(card)` (regex passes over the abilities config) for every stack on every render.
  **Fix:** module-level `const metricsCache = new Map(); // card.fullName -> {rds,lvi,bcr}` wrapper; each unique card computes once per session.
- The **On the Play / On the Draw** buttons (~line 2624) call `renderVisualDeck(currentDeck)` — a full grid teardown — when the only thing that changes is the probability text.
  **Fix:** new `updateProbabilityOverlays()` that recomputes `probMiss(...)` per stack and writes `textContent` of each existing `.card-prob-overlay`. Scenario buttons call that + `updateCombinedProbability()` only.
- Replace the per-stack click listener with **one delegated listener** on `visualDeckContainer` (match `e.target.closest('.card-stack')`, read `dataset.cardName`, look up count from `currentDeck`).

### P5 — Startup: cache the JSON payloads, parallelize the fetches
`initializeApp()` (~line 2823) currently awaits sequentially: fetch `allCards.json` (multi-MB from `raw.githubusercontent.com`, never cached) → `loadAbilitiesConfig()` (which **defeats** HTTP caching with `?v=Date.now()`, see `unified_win_probability_utilities.js:30`) → `loadAndRenderDecks()`.

**Fix:**
1. Add a small cached-fetch helper in `personal_deck_saver.js` using the **Cache API** (payload too large for localStorage), stale-while-revalidate:
   ```js
   async function cachedJson(url, cacheName = 'deck-saver-v1', maxAgeMs = 24*60*60*1000) {
       const cache = await caches.open(cacheName);
       const hit = await cache.match(url);
       const revalidate = () => fetch(url).then(r => { if (r.ok) cache.put(url, r.clone()); return r; });
       if (hit) {
           const age = Date.now() - new Date(hit.headers.get('date') || 0).getTime();
           if (age > maxAgeMs) revalidate().catch(() => {});   // background refresh
           return hit.json();
       }
       return (await revalidate()).json();
   }
   ```
   Wrap in `try/catch` falling back to plain `fetch` (Cache API can be unavailable in some contexts).
2. Use it for `CARD_DATA_URL`, and for the abilities config: add an **optional** parameter `loadAbilitiesConfig(fetchJson)` in `unified_win_probability_utilities.js` — when provided, use it instead of the internal cache-busted fetch; when absent, behavior is unchanged. (Grep confirms other utilities call `loadAbilitiesConfig()` with no args — they must keep working identically.) Alternatively pass the parsed config via the existing `setAbilitiesConfig(config)` export and skip `loadAbilitiesConfig` entirely in this page — **preferred, zero shared-module changes**.
3. Parallelize: `const [cardsJson, abilitiesJson, decksResult] = await Promise.all([...])`, then build `cardByName`, `cardFuse`, call `setAbilitiesConfig`, `CardStatAnalysisModule.initialize`, render decks.
4. Fuse index construction over the full card DB blocks for a noticeable beat — defer it: build `cardByName` immediately (enables deck rendering), then build `cardFuse` inside `requestIdleCallback(() => ...)` (fallback `setTimeout 0`). Card search UI shows "indexing…" state if used before ready.

### P6 — Cleanups (same pass, low risk)
- Delete the **dead first** `handleShuffleDeck` definition (~line 1233, with the spinner `setTimeout`) — it is shadowed by the second definition (~line 1368).
- `renderDeckTimeline()` (~line 1491): `innerHTML +=` inside a 53-iteration loop is O(n²) re-parsing. Build an array of HTML strings, assign `container.innerHTML = parts.join('')` once.
- `renderVisualDeck()`: assemble each type section's stacks as one HTML string per section (or a `DocumentFragment`), not per-stack `appendChild` with per-stack `innerHTML`.

### Acceptance criteria (perf)
| Check | How | Pass |
| --- | --- | --- |
| Deck re-click | DevTools Network + Performance, click an already-viewed deck | 0 network requests; scripting+rendering < 100 ms |
| First deck click (warm DB) | Same | < 400 ms to painted grid (excluding image decode) |
| Warm reload | Reload page with cache primed | `allCards.json` served from Cache API (no multi-MB download) |
| Scenario toggle | Click On the Draw | No grid rebuild (Elements panel: stacks not recreated), overlays update |
| Grid images | Network panel | thumbnail URLs, not full |

## 4. Phase plan (execution order)

**Phase 1 — Mechanical file split (zero behavior change).**
Move `<style>` contents → `personal_deck_saver.css`; move the giant inline `<script>` (the `DOMContentLoaded` block) → `personal_deck_saver.js`. HTML keeps: CDN scripts, Google Fonts link, `<link rel="stylesheet" href="personal_deck_saver.css">`, then the three module scripts, then `<script src="personal_deck_saver.js"></script>` (order matters: modules first). Verify the page works identically before proceeding. Commit.

**Phase 2 — P1–P4 + P6.** Commit.

**Phase 3 — P5 startup caching + parallelization.** Commit.

**Phase 4 — App-shell rebuild, desktop and mobile together (§5).** Commit.

**Phase 5 — Polish:** skeletons, toasts, save-state indicator, ink-identity theming, staggered card entry (§5.6). Commit.

**Phase 6 — Final verification (§6) + remove dead CSS/HTML left from the old layout.** Commit.

## 5. Visual redesign spec — "Ink & Lore"

Design thesis: Lorcana's world is made of **ink**. The app reads as a dark inkwell — near-black blue-toned surfaces, parchment-toned text — and the *selected deck's own ink colors* become the interface accent. The purple-everywhere identity is retired.

### 5.1 Design tokens (CSS custom properties, top of `personal_deck_saver.css`)

```css
:root {
  /* surfaces — ink-navy, not neutral gray */
  --surface-0: #0B0D14;   /* page */
  --surface-1: #12151F;   /* panels, sidebar */
  --surface-2: #1A1E2B;   /* cards, inputs */
  --surface-3: #232837;   /* hover, raised */
  --hairline:  #2C3242;   /* borders */
  /* text — parchment-tinted */
  --text-hi:   #ECE7DA;
  --text-mid:  #A9A594;
  --text-low:  #6B6A5F;
  /* ink identity — dynamic, set from selected deck (fallback: Amethyst pair) */
  --ink-a: #C084FC;
  --ink-b: #60A5FA;
  --ink-grad: linear-gradient(90deg, var(--ink-a), var(--ink-b));
  /* semantic */
  --ok: #34D399; --warn: #FBBF24; --danger: #F87171;
  --radius-s: 6px; --radius-m: 10px; --radius-l: 14px;
}
```
Keep Tailwind utilities for layout/spacing, but all **colors, fonts, radii, borders** come from these tokens via component classes — do not sprinkle raw `bg-gray-800` etc. in the new shell.

### 5.2 Typography
- **Display: Fraunces** (Google Fonts, weights 500/650, `"SOFT" 60` if variable axis available) — app title, active deck name, tab headings, big stat numbers (mulligan %, hand quality score). Used with restraint; it is the personality.
- **Body: Inter** (already loaded) — everything else.
- **Data: JetBrains Mono** (Google Fonts, 400/600) — decklist textarea, probability overlays, CTL/RDS/LVI/BCR stats, sim percentages, card counts.
- Scale: 12 / 13.5 / 15 (body base) / 18 / 24 / 34px. Fraunces gets tight letter-spacing (−0.01em); mono labels get uppercase 11px `letter-spacing: 0.08em` for eyebrows ("MY DECKS", "MULLIGAN HELPER").

### 5.3 Signature element — dynamic ink-identity theming
On deck select (and on ink checkbox change), read the deck's inks and set:
```js
function applyInkIdentity(inks) {
    const [a, b] = inks.length ? inks : ['Amethyst', 'Sapphire'];
    document.documentElement.style.setProperty('--ink-a', INK_COLORS[a].hex);
    document.documentElement.style.setProperty('--ink-b', INK_COLORS[b || a].hex);
}
```
`--ink-grad` / `--ink-a` drive: the 2px top-bar bottom border (gradient), active tab underline + icon color, selected deck card's left border, primary button background (gradient, `--text hi` on it — verify 4.5:1, else darken with an overlay), focus rings, chart accent color (ink-curve bars, quality histogram), selected card-stack glow (replaces hardcoded `#a855f7`). Transition `border-color/background 300ms ease` so switching decks visibly "re-inks" the app. Everything else stays quiet — this is the one bold move.

### 5.4 Layout — desktop (≥1024px)

```
┌──────────────────────────────────────────────────────────────┐
│ ◆ Deck Saver      Amber/Steel Songs      ●Saved  [Save][⋯]  │ top bar, sticky
│ ══════════════ ink gradient hairline ═══════════════════════ │
├────────────┬─────────────────────────────────────────────────┤
│ MY DECKS   │  Editor │ Visualizer │ Draw Sim │ Batch Sim     │
│ 🔍 search   │  ─────────────────────────────────────────────  │
│ [sort][ink]│                                                 │
│ ┌────────┐ │   (active tab content, scrolls independently)   │
│ │Deck A ●●│ │                                                 │
│ ├────────┤ │                                                 │
│ │Deck B ●●│ │                                                 │
│ └────────┘ │                                                 │
│ [+ New]    │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```
- Sidebar: 280px fixed, `--surface-1`, own scroll. Deck items: name (Inter 600), ink dots, card-count in mono; selected item gets `--ink-a` left border + `--surface-2` fill. Search + compact sort/ink-filter row (existing selects restyled). "+ New deck" pinned at bottom.
- Top bar: 56px sticky, `--surface-1`, gradient hairline underneath. Left: app mark + "Deck Saver" (Fraunces). Center: active deck name (Fraunces 24px) — doubles as the deck-name input on focus (or keep the input in Editor tab; simpler: name lives in Editor, top bar just displays it). Right: save-state dot + label (mono 11px: `SAVED` green / `UNSAVED` amber / `SAVING…` pulsing), Save button (ink gradient), overflow menu `⋯` (New, Delete, Copy decklist, Deck guide prompt).
- Workspace: 4 tabs — **Editor** (the current deck form: name, card search, decklist textarea in mono, ink checkboxes, URL, comments), **Visualizer** (card grid + right rail with mulligan helper and the 5 charts), **Draw Sim**, **Batch Sim**. The current "top section + bottom tabs" structure is dissolved; Editor becomes a peer tab. Tab strip: text + underline in `--ink-a`, no pill backgrounds.

### 5.5 Layout — mobile (base styles; this is the primary design)

```
┌──────────────────────┐
│ ☰  Amber/Steel  ●    │  top bar 52px (hamburger, deck name, save dot)
├──────────────────────┤
│                      │
│   active tab content │  full-bleed, 16px gutters
│   card grid 3-across │
│                      │
├──────────────────────┤
│ ✎     ▦     ⟳     Σ  │  bottom nav, fixed, 56px + safe-area
│Edit  Cards  Draw  Sim│
└──────────────────────┘
```
- **Bottom nav** replaces the tab strip below `lg`: 4 items, icon + 10px label, min touch target 48×48, `--surface-1` with hairline top border, `padding-bottom: env(safe-area-inset-bottom)`. Active item colored `--ink-a`.
- **Sidebar → drawer**: hamburger opens a left slide-in (85vw, max 320px) with scrim; closes on deck select, scrim tap, or Esc. Focus is trapped while open; `aria-modal`, `aria-expanded` on the trigger.
- Card grid: `grid-template-columns: repeat(3, 1fr)` at base (thumbnails ≈ 104px wide at 360px — readable), 4-across ≥480px, 5-across ≥768px inside the tab, desktop keeps the type-sectioned grid. Probability overlay and count badge scale down (mono 10px); the CTL/RDS/LVI/BCR strip is hidden below `md` (available in the inspector popup instead — it's unreadable at that size).
- Charts: single column, fixed 240px height each, container `overflow-x: auto` only if Chart.js needs min-width; legend font 10px.
- Mulligan helper: on mobile, selected-cards result renders as a **sticky bottom sheet** just above the bottom nav (surface-2, radius-l top corners) showing the big Fraunces % + "n cards seen" mono line; expands on tap to show scenario toggle.
- Editor: single column, decklist textarea `font-size: 16px` (prevents iOS zoom), inputs 44px min height.
- Breakpoints: base = mobile; `md` (768px) = 4/5-across grids, drawer still used; `lg` (1024px) = full shell (sidebar + top tabs, bottom nav hidden).
- **No horizontal body scroll at any width.** Wide content (timeline, hand grids) scrolls inside its own `overflow-x-auto` container (timeline already does).

### 5.6 States, motion, feedback
- **Skeletons:** while a deck is being parsed/rendered, show 8 pulsing `--surface-2` card-shaped placeholders in the grid (CSS-only shimmer). Replace the initial full-screen loading overlay with: shell renders immediately, sidebar shows 4 skeleton deck rows, grid area shows "Pick a deck or start a new one" empty state (empty states invite action, never apologize).
- **Toasts:** small component (bottom-center mobile / bottom-right desktop): `toast(message, kind)` with `--ok`/`--danger` left border, auto-dismiss 3.5s, `role="status"`. Replace **every** `alert()` (build-a-deck-first warnings, copy failures) and surface Supabase save/delete errors ("Couldn't save deck — check connection and retry.").
- **Save state:** dirty tracking on form inputs → `UNSAVED`; during upsert → `SAVING…`; success → `SAVED` + toast "Deck saved".
- **Card entry:** stacks fade/rise in with `animation-delay: calc(var(--i) * 12ms)` capped at ~400 ms total. Hover: `translateY(-3px)` + shadow (existing scale hover is fine to keep on desktop; disable hover transforms on touch via `@media (hover: hover)`).
- **Reduced motion:** wrap all transitions/animations in `@media (prefers-reduced-motion: no-preference)`.
- **Focus:** `:focus-visible { outline: 2px solid var(--ink-a); outline-offset: 2px; }` everywhere; never remove outlines.
- **Contrast floor:** all text ≥ 4.5:1 against its surface (check `--text-low` usage — decorative only, never for information).
- Delete confirmation stays a modal but restyled to tokens (danger button `--danger`, Fraunces heading).

## 6. Final verification checklist

Run the page (e.g. `python -m http.server` from repo root, open `utilities/personal_deck_saver.html`) — DevTools open.

**Functional (must all pass, desktop + 360px):**
1. Cold load: shell paints immediately; decks list and card DB arrive; second reload serves `allCards.json` from Cache API.
2. Click deck → grid renders per §3 acceptance table; ink identity re-tints the UI.
3. Edit decklist text → debounced re-render still works; card search dropdown adds cards; +1..+4 buttons work.
4. Mulligan helper: select known cards, verify % **exactly matches pre-refactor value** for the same deck/selection (spot-check before starting: record one deck's % for a 2-card selection).
5. All 5 charts render; clicking a chart segment highlights matching cards; clicking outside clears.
6. Play/Draw toggle updates overlays without grid rebuild.
7. Draw Sim: shuffle, hand analysis, timeline, quality analysis all render. Batch Sim: 1000 iterations completes, both charts render.
8. Save (new + edit), Delete (with confirm), LLM prompt modal — all work; errors produce toasts, not alerts.
8b. **Paste/copy round-trip:** paste a full 60-card list into an empty textarea → grid + charts render fast, all lines resolve; click "Copy Decklist" → clipboard contains the exact full text (verify by re-pasting elsewhere). Repeat both on mobile (360px) with the native clipboard.
9. Other pages using `unified_win_probability_utilities.js` still work unmodified (grep callers; preferred path in §3-P5 changes nothing in that file).

**Mobile @ 360×740 (DevTools device mode + at least one real phone if available):**
10. Drawer opens/closes (hamburger, scrim, Esc); deck select closes it.
11. Bottom nav reaches all 4 tabs; active state visible; safe-area respected.
12. No horizontal body scroll on any tab; card grid 3-across and readable; overlays legible.
13. All touch targets ≥ 44px; textarea doesn't trigger iOS zoom.
14. Lighthouse (mobile): Performance ≥ 85 on warm load, Accessibility ≥ 95.

**Visual sign-off:** screenshot desktop + 360px of Visualizer and Editor tabs; confirm the design reads as the §5 direction (ink-navy surfaces, Fraunces display, deck-colored accents) — not default Tailwind gray/purple.

---

## 7. As-built — deviations from the original plan

Everything in §§1–6 was implemented. This section records what differs from that spec after implementation + in-browser verification. **When §§1–6 and §7 disagree, §7 is correct.**

### 7.1 New work not in the original plan — P7: Inspector & "Stat Comparisons" performance

The original spec left the Card Threat Level Inspector out of scope. After the redesign shipped, clicking a card to open the inspector, and switching to its **Stat Comparisons** tab, were both extremely slow (multiple seconds).

**Root cause.** `CardStatAnalysisModule.renderCompleteAnalysis(card)` calls `findMatchingCards()` ~15 times over **~2455 character cards**, and the four "Similar CTL/RDS/LVI/BCR" criteria call `UnifiedWinProbabiliyCalculation.calculateCardMetrics()` (regex over the whole abilities config) for *every* card, *every* render — nothing was cached. Worse, `CardThreatLevelInspector.getInspectorHtml()` embedded the stats HTML in the (hidden) stats pane, so **just opening the popup** paid the full stats cost before showing anything.

**Fixes (all shipped):**
1. **Memoize `calculateCardMetrics`** in `unified_win_probability_utilities.js`. Added a module-level `metricsMemo = new Map()` keyed by `id:<card.id>` (fallback `fn:<fullName>`); only the default global-config path is cached (skip when an `externalConfig` arg is passed). The original function body was extracted into `computeCardMetrics(card, configToUse)`; `calculateCardMetrics` is now the memo wrapper. The cache is cleared in `setAbilitiesConfig()` and `loadAbilitiesConfig()` so a config change invalidates it. This supersedes the P4 note about a page-local `metricsCache` — memoizing in the shared module benefits the grid, inspector, and stat module at once.
2. **Lazy stats tab** in `CardThreatLevelInspector.js`. `getInspectorHtml()` no longer calls `getStatsAnalysisHtml(card)` — the stats pane ships empty, so the popup opens instantly (only the Threat tab, one card, is computed). The tab-switch handler renders stats on first open behind a "Calculating stat comparisons…" state via `setTimeout(…, 20)` (so the tab flips first), then sets `dataset.rendered = '1'` to avoid recomputing on subsequent switches.
3. **Hoist analyzed-card metrics** in `card_stat_analysis_module.js` `findMatchingCards()`: the `'similar'` branch recomputed `calculateCardMetrics(analyzedCard)` inside the per-card `.filter` callback (2455×/criteria). Now computed once before the loop (`analyzedMetricsForSimilar`). Behavior preserved, including the pre-existing quirk that `metric: 'ctl'` yields 0 matches because the metrics object has no `ctl` key (only `rds/lvi/bcr`).
4. **Warm the metrics cache at idle** in `personal_deck_saver.js` `initializeApp()`: after building Fuse, iterate `allCards` in 150-card chunks under `requestIdleCallback` calling `calculateCardMetrics`, so the memo is populated before the user opens any stats view.

Net effect: popup opens instantly; first Stat Comparisons open computes each unique card's metrics once (or hits the idle-warmed cache), and every subsequent open is a set of `Map.get`s.

### 7.2 Cache-busting on asset tags (important)

The shared module `<script>`s and the new css/js are referenced by **plain filenames with no cache-busting**, so browsers (and GitHub Pages) serve stale copies after an edit — this silently masked P7 during testing until spotted. All local asset references in `personal_deck_saver.html` now carry a version query: `personal_deck_saver.css?v=2`, and `?v=2` on all four script tags. **Bump `v=2` → `v=3` (etc.) whenever you edit any of these files** so users get the update. (The version only affects this page's cache entries; other pages referencing the shared modules are unaffected.)

### 7.3 Small deltas from §§3–5 discovered during verification

- **P-skeleton render path (`populateForm`)** uses `setTimeout(0)`, **not** `requestAnimationFrame`, to defer `parseAndRenderDeck()` after showing the grid skeleton. `rAF` callbacks are throttled/paused in a background or non-painting tab, which left the skeleton stuck and the grid unrendered. `setTimeout(0)` is robust in all tab states.
- **P5 abilities config** took the "preferred, zero-…-change" path only partway: the page hardcodes `ABILITIES_URL` and does `cachedJson(ABILITIES_URL)` → `setAbilitiesConfig(json)` (no cache-buster, no sequential await). It does **not** pass a fetcher into `loadAbilitiesConfig`. `loadAbilitiesConfig()` remains as a fallback if the cached fetch throws. (Startup fetches are `Promise.all([cachedJson(CARD_DATA_URL), supabase decks query])`; abilities are fetched right after.)
- **Re-skinning the ported Draw/Batch-sim markup:** rather than rewriting every `bg-gray-*`/`text-gray-*`/`border-gray-*` utility in that large block, `personal_deck_saver.css` **overrides the Tailwind gray/purple palette** (e.g. `.ink-body .bg-gray-800 { background: var(--surface-1) !important }`, purple → `--ink-a`) plus `.accent-text/.accent-bg/.accent-ico` helpers. Keeps those panes on-theme without touching their markup.
- **Drawer/hamburger show-hide** needs scoped selectors (`.sidebar-head .drawer-close`, `.topbar .drawer-toggle`), otherwise the later, equal-specificity `.icon-btn { display: inline-flex }` wins and the close "X" leaks onto desktop.
- **Mobile touch targets:** the Copy/Guide `.btn-xs` buttons are bumped to `min-height: 44px` under the phone breakpoint (they were 32px), satisfying the §2 paste/copy requirement.
- **Editor actions moved to the top bar:** Save is a top-bar `<button form="deckForm" type="submit">`; New/Delete live in the `⋯` overflow menu (`#newDeckBtn`, `#deleteDeckBtn`); Copy decklist + Deck-guide-prompt stay next to the textarea. The old in-form button row is gone. All original element IDs the JS depends on are preserved.

### 7.4 Verification limitation noted for future work

Browser automation could not shrink the real layout viewport below ~1900px, so mobile was verified by loading the page inside a **390px-wide iframe** (CSS media queries evaluate against the iframe width). CSS transitions are throttled while the automation tab isn't painting, so transient values (e.g. a mid-animation drawer transform) must be read with transitions disabled. Lighthouse mobile scores (§6 item 14) were **not** run — worth doing on a real device.
