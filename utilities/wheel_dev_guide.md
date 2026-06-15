# Wheel of Fates — Developer Handover

A Disney-Lorcana–themed giveaway spinner. **One self-contained file**, no build step, no dependencies except Google Fonts. Open `lorcana-wheel.html` in a browser and it runs.

---

## 1. File anatomy

`lorcana-wheel.html` (~1290 lines), three regions:

| Region | Lines (approx.) | Contents |
|---|---|---|
| `<style>` | 11–337 | All CSS, organized by `/* ---------- section ---------- */` comments |
| `<body>` HTML | 277–454 | Static markup (header, wheel stage, queue, tabs, two panels, reveal modal) |
| `<script>` | 482–1286 | All logic, top-to-bottom: constants → state → subsystems → event wiring → `boot()` |

There is **no framework**. State lives in module-scope variables; the DOM is updated by hand-written `render*()` functions. Everything is global within the single `<script>` IIFE-free scope.

### CSS section index
`ambient motes`, `header`, `wheel`, `spin cta`, `prize queue (coverflow)`, `tabs`, `name input`, `chips`, `winners`, `prizes`, `prize pool`, `reveal`, `3D win flight`, `toast`.

---

## 2. ⚠️ The one recurring gotcha — read this first

**`[hidden]` (the HTML attribute) is overridden by any CSS rule that sets `display`.** `[hidden]` only applies `display:none` at low specificity. If an element also matches a rule like `.foo{display:block}` or `display:grid`, setting `el.hidden=true` does **nothing** and the element stays visible.

Every "ghost element still showing" bug in this project's history was this. The fix is always to add an explicit override:

```css
.r-prize[hidden]{display:none}
.r-emoji[hidden]{display:none}
.r-hero img[hidden]{display:none}
```

**Rule: any element you toggle with `.hidden` AND give a `display` value must also have a `[hidden]{display:none}` rule.** Currently covered: `#revealPrize`, `#revealPrizeEmoji`, `.r-hero img`. If you add a new toggled element, add its `[hidden]` rule too.

---

## 3. Sandbox / network note

`DB_URL` points at jsDelivr: `https://cdn.jsdelivr.net/gh/heavenideas/similcana@main/database/allCards.json`.
The end-user's **browser** fetches this fine. A server-side/sandbox proxy may not be able to reach jsDelivr — that's expected and irrelevant to the shipped app. The raw GitHub mirror is `https://raw.githubusercontent.com/heavenideas/similcana/refs/heads/main/database/allCards.json` (use this for offline inspection; do **not** put it in `DB_URL` — wrong content-type/CORS in-browser).

The card image URLs (`api.lorcana.ravensburger.com`) render in `<img>`/canvas without CORS because pixels are **never read back** (no `getImageData`/`toDataURL`). Don't introduce pixel reads on card art — it would taint the canvas.

---

## 4. Global state (single source of truth)

Declared at script top (~485–511):

| Var | Meaning |
|---|---|
| `names` | `string[]` — entrants on the wheel |
| `winners` | `[{name, prize\|null, ink}]`, newest first |
| `rot` | wheel rotation in radians (mutated by every spin path) |
| `spinning` | `bool` lock; blocks all spin entrypoints + drag |
| `highlightIdx` | wedge index to glow at rest; `-1` = none |
| `muted` | sound toggle |
| `DB` | parsed card array after load, else `null` |
| `dbState` | `"idle"\|"loading"\|"ready"\|"error"` |
| `pool` | prize objects (see §6) |
| `featuredId` | `pool[].id` of the prize spun for next |
| `activeFilter` | search filter key; default `"promo"` |
| `ART`, `artReady` | `Image[]` for wheel-slice art + ready flag |
| `wheelCanvas`, `wheelDirty` | offscreen prerender cache + dirty flag |
| `pAng,pVel` | ratchet-pointer spring state |
| `reduceMotion` | `prefers-reduced-motion` snapshot |

**Constants:** `INKS` (6 `[name,hex]` pairs, the wedge palette), `INK_HEX` (color-name→hex map), `DB_URL`, `ART_TOP` (0.5; fraction of card height used as slice art), `EMOJI_MAP` (keyword→emoji table for custom prizes).

---

## 5. The wheel render pipeline (most performance-critical part)

The wheel face is **prerendered once** into an offscreen canvas, then only **rotated** each animation frame. This is why spins stay smooth even with card art.

```
names/size/art change → markWheelDirty()  (sets wheelDirty=true)
drawWheel()  → if wheelDirty: buildWheel()  → caches into wheelCanvas
             → clears #wheel, rotates(rot), drawImage(wheelCanvas)
             → draws live winner-highlight overlay + center hole
```

- **`buildWheel()`** (~582): draws the entire static face onto `wheelCanvas` at rotation 0 — wedges, slice art, ink tint, dividers, name label plates, gold rim, gem studs. Heavy; runs only on change.
  - Slice art: only when `artReady && ART.length && N<=40`. Each wedge is clipped, the card thumbnail is drawn via `coverInto(...,ART_TOP)` (samples only the **top `ART_TOP` fraction** = the illustration, rotated `mid+π/2` to stand radially), then an ink-tinted radial gradient overlays it. Otherwise a flat ink gradient.
  - Legibility: each name sits on a dark rounded **plate** (`rrect`) with a gold hairline — guaranteed readable over any art.
- **`drawWheel()`** (~641): cheap per-frame. Rotates the cached bitmap. The winner highlight is drawn live (not baked) so it can appear/disappear without a rebuild.
- **`buildArt(cards)`** (~657): shuffles the DB, takes 28 thumbnails, creates `Image`s; each `onload` sets `artReady`, marks dirty, redraws (art pops in progressively).

**If you change anything that alters the wheel face, you must call `markWheelDirty()` before `drawWheel()`.** `renderNames()` already does this.

`setCanvasSize()`/`sizeWheel()` handle DPR scaling (capped at 2) and element sizing on load/resize.

---

## 6. Prize model

`pool` entries are uniform:

```js
{ id, kind:'card'|'custom', name, emoji, thumb, full, color, qty }
```

- Card id = `"card:"+card.id`; custom id = `"cust:"+name.toLowerCase()`.
- Adding an existing id increments `qty` instead of duplicating.
- `featuredId` = the prize awarded on the next spin (`finishSpin` reads it; falls back to `pool[0]`).

**Mutators** (all call `renderPool()`, most also `runSearch()`):
`addCardPrize(c)`, `addCustomPrize(name,emoji)`, `changeQty(id,d)` (removes at 0), `removePrize(id)`, `restorePrize(pr)` (used by undo). `poolFind(id)`, `totalPrizes()` are helpers.

**Custom-prize emoji deduction** — `deduceEmoji(text)` (~941): scans `EMOJI_MAP` (`[[keywords], emoji]` rows). Alphanumeric keywords match on **word boundaries** (`\bkey\b`) so "spinner" ≠ "pin"; phrases with spaces use `includes`. Longest match wins; fallback `🎁`. To add mappings, push a row to `EMOJI_MAP`. The custom-prize input live-fills the emoji field unless the user has typed their own (`emojiTouched` flag).

**Rendering:**
- `renderPool()` (~1036): pool tiles in the Prizes panel (image or `.emoji-tile`, qty badge, ★ featured, −/qty/+/× footer). Tap a tile body → set `featuredId`. Each tile carries `dataset.id`. **Calls `renderQueue()` at the end** — this is the single sync point that keeps the coverflow in step with the pool.
- `updateFeaturedStar()`: lightweight — toggles `.featured` on existing `.pcard`s without a full rebuild (used by the queue on scroll to avoid render loops).

---

## 7. Card database / search

`loadDB()` (~983): fetches `DB_URL`, then:
1. Builds a setCode→release-date map from `data.sets`.
2. Filters out cards without images **and all `Q*` setCodes** (Illumineer's Quest "game-within-a-game" cards — not real promos).
3. Tags each card with `_t` (set release ms, for recency sort) and `_n` (card number).
4. Calls `buildArt(DB)` and `runSearch()`.

Loaded **lazily in the background** ~600ms after boot (see `boot()`), and on first Prizes-tab use. States drive the UI; `"error"` shows a Retry button.

`matchFilter(c)` (~1003): `all` / `promo` (`rarity==="Special"`) / `enchanted` / `legendary` (Legendary|Iconic|Epic) / else color-name substring.

`runSearch()` (~1012): filter → optional text match on `simpleName` → **sort newest-set-first** (`_t` desc, then `_n`) → slice 48 → render result cards. Result card tap = `addCardPrize` (increments; shows a qty badge). Search input is debounced 220ms.

---

## 8. Spinning — three entrypoints, one exit

All paths mutate `rot`, tick/ratchet as wedges pass, and funnel into **`finishSpin()`**.

| Path | Fn | Trigger |
|---|---|---|
| Button/hub tap | `spin()` (~697) | ~5.2s `easeOutQuart` auto-spin |
| Flick release | `momentumSpin(v)` (~1163) | exp-friction decay (τ≈660ms), stops <0.45 rad/s |
| Drag | `setupDrag()` IIFE (~1182) | finger follows wheel; tap→`spin()`, fling→`momentumSpin` |

- **`computeWinner(r,N)`** (~667): pointer fixed at top (`-π/2`). Returns the wedge index under the needle. Verified fair/unbiased for all N. Don't "fix" the sign without re-testing.
- **Ratchet pointer:** `passSegment(speed,dir)` plays a tick and calls `pointerKick()`, which feeds a spring-damper (`pStep` RAF, k=1150 c=27) that rotates `#pointer` (CSS `transform-origin:50% 0`). Impulse scales with wheel speed; clamped ±24°; skipped under `reduceMotion`. Each spin path computes its own instantaneous speed and calls `passSegment` on index change.
- **Lock:** all paths set `spinning=true` and add `.busy` to `#queue` (disables the coverflow mid-spin); `finishSpin()` clears both.

### `finishSpin()` (~721) — the climax sequence
1. Compute winner `name`/`ink` from `rot`.
2. If prizes exist: snapshot the featured prize, **capture its reel tile rect via `reelTileById(id)`** (before any DOM rebuild), decrement `qty`, remove at 0.
3. Set `highlightIdx`, redraw, remove the name, push to `winners`.
4. `revealWin(name, prize, ink, srcRect)` + `playFanfare()`.
5. `setTimeout(50ms)` → clear highlight, `renderNames()`, `renderPool()` (which rebuilds the now-decremented queue).

---

## 9. Reveal + 3D win flight

Markup: `#reveal` (full-screen backdrop) › `#revealCard` (the dialog) › name, flourish, `#revealPrize` (`#revealHero` with `#revealPrizeImg`/`#revealPrizeEmoji` + sheen, then label + `#revealPrizeName`), actions.

**`revealWin(name,prize,ink,srcRect)`** (~751):
- Populates name + hero (card image **or** big emoji). Remember the `[hidden]` rule (§2) governs which shows.
- `canFly = prize && srcRect && !reduceMotion`. Adds `.flying` to `#revealCard` (swaps the entrance from a transform-`rise` to a pure opacity fade, so the hero's final rect is stable for measuring).
- If can't fly: show normally, confetti, return.
- If flying: hide hero (`visibility:hidden`), wait 2 RAFs, measure hero rect, call `flyCard`.

**`flyCard(prize, s, t, ink, onLand)`** (~775): clones the card into a `.fly-layer` (`perspective:1200px`) at source rect `s`, runs a Web Animations API keyframe: translate along an arc with a −72px rise, **`rotateY 0→720°`** (two full turns → lands face-front; do not use 540 — it lands mirrored), `rotateZ` wobble, scale `1→t.width/s.width`. On finish (guarded against double-fire + a 1200ms safety timeout): remove layer, reveal hero, `confettiBurst`.

**`closeReveal()`** resets `.show`/`.flying`/hero visibility. Triggers: `#nextBtn` (close → if names remain, auto-spin in 260ms), `#undoBtn` (`undoLast`), backdrop click.

`confettiBurst(ink)` / `stepFx()` (~809): particle system on `#fx`; gated by `reduceMotion`.

---

## 10. Prize queue (coverflow) — "Spinning next for"

Markup under the wheel: `#queue` › label, `#queueName`, `.reel-wrap` (`.reel-focus` ring + `#reel`), hint. Shown only when `pool.length>0`.

- **`renderQueue()`** (~1069): builds `.qtile`s (card image or emoji, qty badge, `dataset.id`) into `#reel`, then centers `featuredId`.
  - **Scroll-jump fix:** when the queue transitions hidden→visible it inserts height above the panel. On that transition it reads its own height and `window.scrollBy(0, h)` so the card the user just tapped stays put. Keep this — removing it reintroduces the disorienting jump.
- **Coverflow visuals** — `updateReel()` (~1102): per-tile, by distance from reel center, sets `scale` (1.15→0.82) + `opacity` (1→0.38) + `z-index`. Updates `#queueName` to the centered prize. The centered tile sits inside `.reel-focus` (a glowing gold ring with a rotating conic shimmer).
  - **No vertical lift** on the focused tile — it would float out of the focus ring. Don't re-add a `translateY`.
- **Edges** blend into the page via a CSS **`mask-image`** on `.reel` (the tiles fade to transparent). There are no opaque fade bars — don't add them back; they caused the "dark misaligned rectangle" look.
- **Selection:** native CSS scroll-snap (`scroll-snap-align:center`) + `padding-inline:calc(50% - 45px)` so ends can center. `onReelScroll()` rAF-throttles `updateReel` and debounces (120ms) a "settle" that commits the nearest tile as `featuredId` (then `updateFeaturedStar()`, **not** `renderPool` — avoids a render loop). Touch uses native momentum; mouse uses the `reelDrag()` IIFE (writes `scrollLeft`, snaps on release). `reel._dragged` suppresses the click-to-center after a drag.

**Loop-safety contract:** `renderPool()` → `renderQueue()` (rebuild) is fine. The scroll-settle path must **never** call `renderPool`/`renderQueue` — only `updateFeaturedStar`. Preserve this split.

---

## 11. Names, winners, audio, ambient

- **Names:** `addName`/`addBulk` (split on `/[\n,]+/`), shuffle, clear (confirm). `renderNames()` (~845) rebuilds chips (ink dot + ✕), updates `#nameCount`, **`markWheelDirty()`+`drawWheel()`**, and `renderWinners()`.
- **Winners:** `renderWinners()` (~864) lists summoned entrants with prize thumb/emoji and a per-row "Put back" that restores the name **and** the prize (`restorePrize`).
- **Audio:** WebAudio, synthesized (no assets). `ensureAudio()` lazily creates the context (must be a user gesture). `playTick()` = wedge pass; `playFanfare()` = win arpeggio. Respect `muted`.
- **Ambient:** `buildAmbient()` IIFE spawns floating gold motes (CSS). `#fx` = confetti canvas.

---

## 12. Event wiring (bottom of script, ~1152–1284)

Direct `.onclick`/listeners for: add/bulk/shuffle/clear, spin button + hub, mute, reveal next/undo/backdrop, tab switch (`.tab` → toggles `.panel.active`), filter chips (`.filt` → set `activeFilter`, `runSearch`), search input (debounced), custom-prize input + emoji live-fill + add, three `resize` handlers (wheel, reel re-center, fx). `boot()` runs last: sizes everything, initial renders, schedules background `loadDB()`.

---

## 13. How to… (playbook)

- **Add a search filter:** add a `.filt` button (`data-f="x"`) in `#filters`; add a `case "x"` to `matchFilter`.
- **Add an emoji mapping:** push `[["keyword",...],"🧩"]` to `EMOJI_MAP`. Word-boundary matching; longest wins.
- **Change how much card art shows on slices:** edit `ART_TOP` (0–1; lower = just the top of the illustration).
- **Change spin feel:** `spin()` duration/easing; `momentumSpin` τ and stop threshold; ratchet `k`/`c`/clamp in `pStep`.
- **Change the win animation:** keyframes in `flyCard` (keep `rotateY` a multiple of 360 to land face-front). Hero size = `.r-hero` width.
- **New toggled element that has a `display` rule:** add its `[hidden]{display:none}` (§2).
- **Anything that alters the wheel face:** call `markWheelDirty()` then `drawWheel()`.
- **New prize-pool mutation:** go through the §6 mutators (they keep `featuredId`, the pool, and the queue consistent). End with `renderPool()`.

## 14. Verify before shipping

No tests exist. Minimum manual checks for any change:
1. Extract the `<script>` and `node --check` it (catches syntax errors).
2. Confirm HTML tag balance (`div`/`section`/`button` open==close).
3. Functional smoke: add names → spin (button, flick, drag); add a card prize + a custom emoji prize; slide the queue to re-pick next; win a card then win an emoji (no ghost behind emoji); empty the pool then win (name only, no phantom card); resize the window.
4. Watch for the two structural traps: the `[hidden]`/`display` override (§2) and the queue render-loop split (§10).
