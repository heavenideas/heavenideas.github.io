---
target: "the initial deck-setup / entry screen (#setup-modal)"
total_score: 15
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
timestamp: 2026-07-29T22-41-49Z
slug: practice-dojo-practice-dojo-html
---
Method: dual-agent (A: aee29d841b6b4e117 · B: a57e45be664bedcd3)

**Target resolved:** `practice_dojo/practice_dojo.html:3867` — `#setup-modal`, the deck setup / entry screen. The user pointed at `practice_dojo/index.html`, which is the marketing landing page; the described surface (deck selects, Load demo, Upload .json, Import Duels.ink log, Restore Auto-Save, Start match) lives only in the app file.

**Mode:** Operate. All 10 heuristics apply.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 1 | Neither cloud `<select>` has a loading or error state; both sit enabled with one option and silently repopulate when Supabase resolves (`:4874`, `:6473`). Only `#btn-load-example` has a spinner. |
| 2 | Match System / Real World | 2 | "Player 1 · You / Player 2 · Opponent" is good. "Cloud sessions", "Upload .json", "Restore Auto-Save" are dev vocabulary, and the JS-generated placeholder says `-- Load from Database --` (`:4885`). |
| 3 | User Control and Freedom | 1 | No close button, excluded from the Escape whitelist (`:9788-9793`), no backdrop dismiss. The only forward exit is `startGame()`, which wipes `bookmarks` and `autoSaves`. |
| 4 | Consistency and Standards | 2 | All 7 sibling modals carry `role="dialog" aria-modal aria-labelledby` + a `.close`; `#setup-modal` is the only one with none. Two `.btn-primary` on screen. Two competing `.btn {}` blocks (`:667`, `:725`). |
| 5 | Error Prevention | 1 | `onDeckSelect` (`:4924`) assigns `input.value` with no emptiness check and is auto-fired at `:4896`/`:4900`. `parseDeck` silently substitutes 60 random cards for a malformed list (`:5141`, `:5160`). No 60-card / 4-copy / 2-ink validation. |
| 6 | Recognition Rather Than Recall | 2 | P1/P2 chips and per-button icons help. But "Restore Auto-Save" names no matchup, turn, or timestamp — you cannot recognize what you would be restoring. |
| 7 | Flexibility and Efficiency | 2 | Cloud auto-select accidentally yields a 1-click path. No `autofocus`, no Enter/Ctrl+Enter to start (global handler bails on `TEXTAREA`, `:9771`), no remembered last decklists. |
| 8 | Aesthetic and Minimalist Design | 1 | Six intents, ten controls, one flat plane, zero group headings. `.session-row` is a junk drawer. This score *is* the user's complaint. |
| 9 | Error Recovery | 2 | `dialogAlert` copy for bad .json / bad log is genuinely well written (`:5523`, `:6526`). The two *common* failures — cloud offline, unparseable decklist — produce nothing at all. |
| 10 | Help and Documentation | 1 | One 12px hint at 2.51:1 contrast is the entire documentation, and it is factually false once cloud decks auto-fill. Decklist format lives only in a placeholder that vanishes on first keystroke. |
| **Total** | | **15/40** | **Poor — major UX overhaul required** |

## Design Specificity Verdict

**LLM assessment: generic modal wearing a good design system.**

Exactly two pieces of Lorcana-specific authorship exist on this screen. `.deck-card` (`:856-898`) sets `color: var(--p1)`/`var(--p2)` on the container, and a 2px `linear-gradient(90deg, currentColor, transparent)` rule plus a `color-mix(in oklch, currentColor 14%/30%, transparent)` chip both derive from it — one declaration cascading into three visual facts, in the same tokens the board uses. And the decklist textareas are monospace, which is correct and non-obvious: quantity-prefixed line records scan as tabular data, so a wrong copy count is visible at a glance.

Delete those two and what remains would pass unremarked as a "New Pipeline" dialog in a CI tool: 22px title + version chip in a bordered header, a 2-col grid of bordered sub-panels, a grey utility strip, a footer with faint hint text and one accent CTA.

Nothing here knows it is the doorway to a Lorcana theorycraft engine. No ink colors parsed from the pasted lists, no card count, no curve, no matchup framing, no reference to turns — and no reference to the multiverse the product is named around.

**Deterministic scan: 14 findings in the file, 0 inside this surface.** `overused-font` ×4 (`:15`, `:3426`, `:3438`, `:3503`), `broken-image` ×4, `layout-transition` ×3, `side-tab` ×2, `bounce-easing` ×1, `codex-grid-background` ×1. Only `:15` reaches the setup screen, and only by cascade (the Geist webfont link, inherited via `body`). The four `broken-image` hits are false positives — all four `<img>` get their `src` assigned at runtime from the card DB. The three `overused-font` mono hits are one decision reported three times.

That zero is the most useful number in this report: **the mechanical detector cannot see anything wrong with this screen.** Every real defect is compositional, informational, or stateful. No linter was going to find them.

**Visual overlays:** not attempted. Browser inspection was skipped by project convention (the user runs browser tests, agents do not). No overlay exists in any tab; every measurement below is derived from reading the source.

## Overall Impression

The loading screen spends **1800ms deliberately** — `MIN_LOADING_MS` with an explicit hold at `:4976` so eight staggered petals and a settling temple complete even when the DB returns instantly. Someone spent 1.8 seconds of the user's life on atmosphere, and it earns it.

Then the curtain lifts on two monospace paste buffers and a row of four grey utility buttons.

That fall-off is the single biggest opportunity here, larger than any individual heuristic. The temple door opens onto a filing cabinet. And the "all over the place" feeling the user reported has a precise cause, located below.

## What's Working

**1. The P1/P2 `currentColor` system (`:856-898`).** One property (`color: var(--p1)`) drives the gradient top rule, the label-chip fill, and the chip border via `color-mix` in OKLCH — perceptually even across both hues, single point of truth. And because `--p1`/`--p2` are the same tokens the board uses, this screen teaches the in-game color language before the game starts. Keep this and build the redesign on it.

**2. Loader → setup token continuity.** The loader's `rgb(255,168,0)` sits on the same hue as `--accent` (`oklch(0.78 0.14 70)`), reuses `--font-mono` and the same `--bg` radial. The setup card reads as the same product, not a different app's dialog. The `--surface` ramp with matched-chroma borders is a disciplined token set — the failure on this screen is composition, not palette.

**3. Monospace decklist inputs (`:922-928`).** 12px, `line-height: 1.5`, `resize: vertical` (not `both`, so it cannot break the grid). Lists pasted from Dreamborn/Inkdecks arrive column-aligned.

## Priority Issues

### [P0] Setup is a one-way destructive door with no exit

**What:** `#setup-modal` has no close button, is absent from the Escape whitelist (`:9788-9793`), and has no backdrop dismiss. `App.showSetup()` (`:5133`, wired to the topbar rotate-right icon at `:3861`) hides `#app` with no confirmation. Worse: `#btn-resume-storage` is injected **only inside `init()`**, and only if localStorage already held a session *at page load* (`:4983-4995`). `showSetup()` never re-checks. So a first-time user who plays a session and then hits reset sees a setup screen with **no restore button at all** — and the only clickable way forward runs `this.bookmarks = []; this.autoSaves = []` (`:5256-5257`).

**Why it matters:** a player 20 turns into a branched matchup study, six timeline nodes deep, fat-fingers a 26.5px icon and loses an hour of theorycraft silently. This is the exact work the product exists to protect.

**Fix:** move the resume injection out of `init()` into `showSetup()`, re-reading localStorage on every call; add a `btn-ghost` "Back to match" in `.setup-foot` and add `setup-modal` to the escapable list, both gated on live state; wrap the topbar reset icon in a `dialogAlert` confirm.

**Suggested command:** `/impeccable harden`

### [P0] Cloud auto-select silently destroys typed decklists

**What:** `fetchDecksFromDatabase()` is fired un-awaited at `:4935` and races the 1800ms loading floor. On resolve, `populateDeckDropdowns()` unconditionally calls `onDeckSelect(1,"0")` and `onDeckSelect(2,"1")` (`:4894-4905`), which does `document.getElementById(inputId).value = deckText` (`:4924`). On a slow connection that lands *after* the setup screen is visible and interactive.

**Why it matters:** a player pastes their tournament list and watches it get replaced by a stranger's cloud deck, with no undo — programmatic assignment leaves no textarea history. It also makes the footer hint ("leave both empty for random decks") false on the happy path, and it means "Start match" silently means "play two decks you never chose."

**Fix:** track a `_deckTouched` flag on `input` and gate the auto-select on both textareas being empty *and* untouched. Better: delete the auto-select entirely — it is a hidden default that lies about what the primary button will do.

**Suggested command:** `/impeccable harden`

### [P1] Six intents at one flat level, with no "new vs open" split

*This is the "all over the place" complaint, precisely located.*

Six distinct intents live on this screen and **none of them is named**:

| Intent | Controls | Current home |
|---|---|---|
| A · Start new match with my decks | 2 selects + 2 textareas | `.deck-pair` (`:3875`) |
| B · Start new match with random decks | *none — inferred from empty textareas* | footer hint text (`:3923`) |
| C · Resume my own in-progress work | `#btn-resume-storage` (injected) | `#session-restore-container`, 3rd in line |
| D · Open a session file I exported | `#setup-import-file` + button (`:3910`) | same container |
| E · Open someone else's cloud demo | `#example-session-select` + button (`:3902`) | `.session-group` #1 |
| F · Convert an external Duels.ink log | button → separate modal (`:3915`) | same container |

A and B *author* something. C, D, E and F all *open a pre-existing state object* — they converge on the same four lines of code (`:4718`, `:5504`, `:6507`). Four functions, one job. The user cannot see that, because the word "open" appears nowhere on the screen.

`.session-row` (`:3900-3919`) is a junk drawer. Its two `.session-group` children are divided by **`flex: 1 1 220px`** — a flexbox wrap threshold, not a semantic boundary. So the only visible grouping of the "open existing" family splits it 1/3 on a rule with no meaning, and the container `id="session-restore-container"` describes neither button actually written inside it; it is named for a control that only exists after JS runs.

**Primary-action collision, confirmed:** `#btn-resume-storage` is injected as `class="btn btn-primary"` (`:4987`) into the *body*, while Start match carries `class="btn btn-primary"` (`:3925`) in the *footer*. Two accent-filled buttons, two different regions, equal weight — and the two outcomes destroy each other (`:5256-5257` wipes, `:4723-4724` overwrites).

**Fix:** two labeled regions, and exactly one primary chosen by state. Full proposal below.

**Suggested command:** `/impeccable shape`

### [P1] The setup screen is the only modal in the file with no dialog semantics, no labels, and no focus ring

**What (all verified):**
- `#setup-modal` (`:3867`) has no `role`, no `aria-modal`, no `aria-labelledby`. Its `<h1>` has no `id` to point at. All 7 siblings (`:3933`, `:3975`, `:4004`, `:4022`, `:4039`, `:4085`, `:4104`) carry the full trio, as do the two dynamically built dialogs (`:7040`, `:7049`).
- **Zero `<label>` elements exist in the entire 10k-line file.** All four setup controls (`:3881`, `:3884`, `:3892`, `:3895`) have no `for`, no `aria-label`, no `aria-labelledby`. "Player 1 · You" is a `<span>` (`:3878`). The textareas' only accessible name is a `placeholder` containing `&#10;`.
- `outline: none` on `.input, .select, .dojo-textarea` (`:911`); the replacement `:focus-visible` rule (`:2729-2731`) is scoped to `.input` **only** — a class this screen never uses. All four controls have no focus ring, only a 1px border shift to `--accent-dim` (3.35:1 against `--surface-2`, clearing the 3:1 non-text floor by 0.35).
- `showSetup()` (`:5133-5138`) is four statements and moves focus nowhere. It also hides `#topbar`, so if focus was on the trigger button, focus drops to `<body>` — after a 1.8s animated loader, a screen-reader user lands in silence with no announcement.
- `.setup-foot .hint` and `.setup-head .version` use `--text-faint` on `--surface` = **2.51:1** at 12px/11px. Fails AA 4.5:1 and even the 3:1 large-text floor. The only documentation on the screen is the least legible text on it.
- `.deck-card-label .label-text` (`--text-dim` on `--surface-2`) = **4.57:1** — passes, by 0.07. One token step from failing.

**Why it matters:** a keyboard-only user who opens setup from the topbar cannot get back out except by destroying their session. A screen-reader user gets four unnamed form controls in an unannounced container.

**Suggested command:** `/impeccable audit`

### [P1] Both cloud dropdowns fail silently and invisibly

**What:** `fetchDecksFromDatabase` (`:4863-4878`) and `fetchSessionsFromDatabase` (`:6463-6477`) `console.error` and stop. In the thrown-error path `populateDeckDropdowns` is never called, so the select keeps its authored single option forever. `loadExampleSession` returns silently on an empty value (`:6493`) — clicking "Load demo" with nothing selected does literally nothing, with no feedback.

**Why it matters:** a player on venue wifi sees two dropdowns with one item and a button that does nothing, and concludes the tool is broken — when the paste path would have worked fine.

**Fix:** render the selects `disabled` with "Loading decks…" while pending; on failure, "Cloud unavailable — paste a decklist below" plus a retry; keep the load button disabled until a value is selected.

**Suggested command:** `/impeccable harden`

### [P2] A malformed decklist silently becomes 60 random cards

**What:** `parseDeck` (`:5140-5162`) requires `/^(\d+)\s+(.+)$/` per line and returns `generateDummyDeck()` when zero lines match or zero names resolve. Partial matches return a short deck with no length check. `startGame` reports neither. `generateDummyDeck` (`:5164`) draws 60 uniformly random cards across all six inks — it is not a deck.

**Why it matters:** `4x Tinker Bell - Giant Fairy` (the Dreamborn `x`-suffix format), a header line, or a `Total: 60` footer drops cards or the whole list. The player then runs a 15-turn ink-curve study against noise and has no way to know the study is worthless.

**Fix:** parse on `blur`; show "58 of 60 recognized · unmatched: *Tinker Bell - Giant Fairy*" under each textarea, with an ink/cost-curve micro-summary — which also finally makes this screen look like a Lorcana tool. Make the random-deck path an explicit affordance instead of inferring it from emptiness.

**Suggested command:** `/impeccable clarify`

## Cognitive Load: 7 of 8 items fail

First paint, desktop, Supabase resolved, autosave present: **10 interactive elements serving 6 intents, 0 group headings, 0 disabled states** — 12 affordances counting the two `resize` drag handles.

| Item | Verdict | Evidence |
|---|---|---|
| Single focus | FAIL | Six co-equal intents, no default path declared |
| Chunking ≤4/group | FAIL | `.deck-card` passes at 3 each; `.session-row` holds 5 controls once resume injects |
| Visual grouping | FAIL | `.session-row`'s internal split is a `flex: 1 1 220px` artifact; the footer hint sits beside Start match, implying it annotates Start match |
| Visual hierarchy | FAIL | Two `--accent`-filled primaries in two regions; the h1 is 22px while every actual decision label is 11px `--text-dim`. The loudest object is the product name |
| One thing at a time | FAIL | All six paths on one plane, no steps |
| ≤4 options per decision | FAIL | 6 paths / 10 controls simultaneously |
| Working memory | FAIL | Must hold the Restore/Upload/Demo/Import distinction with the family unlabeled; must recall decklist syntax after the placeholder vanishes |
| Progressive disclosure | FAIL | Zero here — yet `openImportLogModal()` (`:6385`) correctly defers one intent into its own validated modal. The pattern exists in this codebase and is used once |

## Emotional Journey

**Promise:** eight petals easing in on a 0.07s stagger with a `cubic-bezier(0.34, 1.4, 0.5, 1)` overshoot, a temple settling behind them, a 4.2s breath loop, amber matched to `--accent` hue 70, held for a deliberate 1800ms. That promise is: *this is a crafted, ceremonial place to study your deck.* A dojo.

**Payoff:** two paste buffers and four grey utility buttons.

**Returning user with an autosave: hunted, not recognized.** The branched multiverse they spent an hour building comes back as a 30.5px button, third in line, behind two file-import utilities, labeled with a filesystem noun that conveys no matchup, no turn, no timestamp. Their work is presented as a peer of "Upload .json." Meanwhile the screen's two largest, most colorful objects are pre-filled with someone else's cloud decks and invite them to start over. **The visual hierarchy is actively arguing for the destruction of the thing they came back for.**

**Peak-end:** the peak is fine — `startGame()` → mulligan is a clean handoff. But for the user who hits the reset icon mid-session, the *end* is a wiped `bookmarks` array with no undo. That is the memory that persists, and this screen authors it.

## Persona Red Flags

**Sam (accessibility) — worst served.** Only modal in the file with no `role="dialog"`. Zero `<label>` elements anywhere in the file; all four controls unnamed. No focus ring on any of them (`outline: none` at `:911`, replacement scoped to a class this screen doesn't use). No focus move on open, and the trigger button is `display:none`'d out from under focus. Escape does nothing; no close button — cannot exit without destroying the session. `.hint`/`.version` at 2.51:1. Two `.btn-primary` and no `autofocus`, so two equally-weighted buttons announce with no default.

**Casey (360px, one-handed) — the primary action is below the fold, then behind the keyboard.** `.setup-card` goes fullscreen (`:3751-3757`) and `.deck-pair` collapses to 1 column (`:3773`), but `.setup-body` keeps `padding: 20px 24px` → 312px of content, and both textareas keep inline `style="height:140px"`. Stacked height ≈ 730px against a ~640px viewport. **`.setup-foot` is not sticky** — it is a flex sibling and `.setup-body` is the only scroller, so Start match is off-screen on first paint, reachable only after scrolling past all six intents. Tapping a textarea raises the keyboard; `max-height: 100dvh` shrinks and the non-sticky footer leaves the visual viewport entirely. **Every touch target fails 44px:** `.btn`/`.btn-ghost`/`.btn-primary` = **30.5px**, `.select` ≈ **33.6px**, `.icon-btn` = **26.5×34.5px** (worse on mobile, `:3600`). The mobile block contains no touch-target enlargement at all. `.select` at 13px and `.dojo-textarea` at 12px are both below the 16px threshold that suppresses iOS Safari focus auto-zoom. And `.session-row`'s wrap behavior puts four ~30px buttons in one ~288px strip — which is exactly where the returning user's primary action lands.

**Riley (stress tester) — the ambiguous-state case is unhandled by design.** Autosave *and* cloud decks simultaneously (the common returning-user case) produces two accent primaries, both plausible, each silently discarding the other's outcome, with nothing on screen indicating the conflict. `4x Tinker Bell` → 60 random cards, no message. 30 good lines + 30 typos → a legal-looking 30-card deck that decks out mid-study. Supabase offline → two one-option selects forever and a no-op button. Truncated-but-parseable .json → `importTimelines` (`:5502-5507`) assigns `this.state = this.decompressState(...)` **before** validating; if decompression throws mid-way the catch alerts, but `this.state` is already partially replaced while the modal is still up. Separately: deck names (`:4887`) and session names (`:6485`) are interpolated into `innerHTML` unescaped — a cloud row named `<img src=x onerror=…>` executes on this screen.

## Proposed Redesign

One organizing principle: **the screen has two jobs, not six.** *Continue something that exists* and *start something new.* Every current control belongs to one of them. Name both, and give the screen exactly one primary button, chosen by state.

### Structure

```
┌──────────────────────────────────────────────────────────────────────┐
│ ◈ Practice Dojo                                          v1.15.0    │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌ CONTINUE ───────────────────────────────────────────────────────┐ │
│  │  Amber/Steel Songs   vs   Ruby/Amethyst Aggro                   │ │
│  │  Turn 8 · lore 17–0 · 6 nodes · 3 branches · 20 min ago         │ │
│  │  [thumb][thumb][thumb][thumb]              ▸ Resume match       │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│  ──────────────── or start a new match ─────────────────────────────  │
│                                                                      │
│  ┌ P1 · YOU ─────────────────┐      ┌ P2 · OPPONENT ──────────────┐ │
│  │ ◆◆ Amber · Steel   60/60  │  VS  │ ◆◆ Ruby · Amethyst  58/60 ⚠│ │
│  │ ▁▃▆█▅▂ curve              │      │ ▁▂▅█▆▃ curve                │ │
│  │ ┌───────────────────────┐ │      │ ┌─────────────────────────┐ │ │
│  │ │ 4 Tinker Bell - Gia…  │ │      │ │ 4 Maui - Hero to All    │ │ │
│  │ └───────────────────────┘ │      │ └─────────────────────────┘ │ │
│  │ ⌄ Pick from cloud         │      │ ⌄ Pick from cloud    ⇅ Swap │ │
│  └───────────────────────────┘      └─────────────────────────────┘ │
│                                                                      │
│  Open from…   [ Cloud demo ⌄ ]  [ .json file ]  [ Duels.ink log ]   │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│ Leave both empty for a starter matchup         [ Start match   → ]   │
└──────────────────────────────────────────────────────────────────────┘
```

### The seven decisions

**1. `CONTINUE` is a recognizable object, not a verb.** Replace "Restore Auto-Save" with a card that names what you would resume: matchup by ink pair, turn number, lore score, node and branch count, relative time, and four board thumbnails. The player recognizes their own work instead of recalling a filename. It renders only when an autosave exists, and it renders **first** — top of the desktop card, top of the mobile scroll, and in the thumb zone on mobile.

**2. Exactly one primary, chosen by state.** Autosave present → Resume is `.btn-primary`, Start match drops to `.btn-ghost`. No autosave → Continue block is absent and Start match is the only primary. The collision disappears because the two states are mutually exclusive by construction.

**3. Fix the injection bug in the same move.** The Continue block renders from `showSetup()` reading localStorage on every call, not once inside `init()`. Mid-session reset then shows the user their own session instead of an empty screen and a wipe button.

**4. "Open from…" collapses the other three import paths into one labeled family.** Cloud demo, .json, Duels.ink log are all *open a state object from elsewhere*. One row, one label, three quiet ghost buttons, secondary weight — below the deck pair, above the fold, out of the way. This is the junk drawer given a name and a rank. The container id gets renamed to match.

**5. The deck cards become a duel plate and finally look like Lorcana.** Keep the `currentColor` system exactly as it is — it is the best thing on the screen — and let it carry more: parse the decklist live and show ink pips, card count with a `60/60` state, and a six-column cost curve as a sparkline. `58/60 ⚠` replaces the silent random-deck substitution. A `VS` glyph between the two cards frames them as facing each other rather than as two form fieldsets. This costs one parse function you already have (`parseDeck`) and turns validation, error prevention, and product character into a single element.

**6. Every accessibility failure is a one-line fix, so do all of them.** `role="dialog" aria-modal="true" aria-labelledby="setup-title"` on the container and an `id` on the h1. Real `<label for>` on all four controls — the first `<label>` elements in the file. Delete `outline: none` or extend the `:focus-visible` rule to `.select, .dojo-textarea`. `showSetup()` focuses the Continue button when present, else `#deck1-input`. `--text-faint` → `--text-dim` for `.hint` and `.version` (2.51:1 → ~6.6:1 on `--surface`). Escape and a "Back to match" ghost button, both gated on live state.

**7. Mobile is a different composition, not the same one narrower.**

```
┌────────────────────────────┐
│ ◈ Practice Dojo    v1.15.0 │
├────────────────────────────┤
│ ┌ CONTINUE ──────────────┐ │
│ │ Amber/Steel            │ │
│ │   vs Ruby/Amethyst     │ │
│ │ T8 · 17–0 · 20 min ago │ │
│ │ ┌────────────────────┐ │ │
│ │ │  ▸ Resume match    │ │ │ 48px
│ │ └────────────────────┘ │ │
│ └────────────────────────┘ │
│ ─── or start new ────────── │
│ ┌ P1 · YOU  ◆◆ 60/60 ───┐ │
│ │ 4 Tinker Bell…      ⌄ │ │ collapsed
│ └────────────────────────┘ │
│ ┌ P2 · OPP  ◆◆ 58/60 ⚠─┐ │
│ │ 4 Maui - Hero…      ⌄ │ │ collapsed
│ └────────────────────────┘ │
│ Open from…              ⌄  │ collapsed
│                            │
├────────────────────────────┤ sticky
│ [   Start match      →   ] │ 48px, thumb zone
└────────────────────────────┘
```

`.setup-foot` becomes `position: sticky; bottom: 0` with a `--surface` background and a top border, so the primary action is always in the thumb zone and survives the software keyboard. Both deck cards collapse to a summary row that expands on tap — the 140px textareas are the reason the current screen is 730px tall against a 640px viewport. "Open from…" collapses too. `.btn` and `.select` get `min-height: 44px` inside the mobile block, and inputs go to 16px to stop iOS focus zoom. The footer hint moves above the button or out entirely; it cannot share a non-wrapping flex row with the CTA at 312px.

### What this changes, measured

- Controls on first paint at 360px: **10 → 3** (Resume, Start match, one expand target), with the rest one tap away.
- Named intent groups: **0 → 3** (Continue / New match / Open from…).
- `.btn-primary` on screen: **2 → 1**, always.
- Cognitive-load failures: **7/8 → an expected 1–2** (intrinsic complexity remains; the extraneous load is gone).
- Touch targets under 44px in this surface: **all → none**.
- Lorcana-specific design elements: **2 → 5** (currentColor system, mono lists, ink pips, cost curve, matchup framing).

## Minor Observations

- The dropdown placeholder changes voice after load: authored `— Pick a deck from cloud —` (`:3882`) vs generated `-- Load from Database --` (`:4885`). Different dash convention, different register, and it leaks "Database" at the user.
- Textarea heights are authored twice — inline `style="height:140px"` (`:3884`, `:3895`) overriding `min-height: 110px` (`:924`). These are the only two inline styles in the whole setup markup, which is otherwise cleanly class-driven.
- `#app-version-setup` (`:3871`) renders at 2.51:1 — effectively invisible. If it exists for bug reports it must be legible.
- Two `.btn {}` blocks (`:667`, `:725`); the second overrides only padding, so button height depends on cascade order and the first declaration is dead.
- `.overlay` blurs nothing on first paint — `backdrop-filter: blur(10px)` (`:776`) sits over `#app`, which is `display: none` at that moment. 10px of GPU blur over the page background.
- No `autofocus`, no Enter-to-start. Meanwhile `openImportLogModal` (`:6390`) *does* focus its textarea — the intent exists elsewhere in the file.
- The document has no `<h1>` until this modal opens; the only h1 in the file is inside hidden markup.
- Reduced motion is only partially honored: the single `@media (prefers-reduced-motion: reduce)` block (`:462-472`) covers 6 loader selectors and only `animation`, not one `transition`, not the `backdrop-filter`, not the `.btn:active` transform. No `prefers-contrast` or `forced-colors` block anywhere.

## Questions to Consider

1. **If the cloud already auto-picks two decks and empty textareas already generate a playable 60, why does this screen exist at all?** Both defaults make the modal a formality on the happy path. What is it buying you that dropping straight into a board with a "change decks" affordance in the topbar would not?
2. **Six intents share one screen because they all produce a state object — that is an implementation taxonomy, not a user one.** Is "import the Duels.ink log of the match I just lost" even the same job as "paste my Amber/Steel list"? One is a post-mortem, one is rehearsal. Those might want to be two entry points.
3. **The product's entire thesis is branching timelines — so why is the entry screen the only surface in the app with no notion of history?** A returning player's first screen could *be* their multiverse tree, one tap to resume a node.
4. **You spend 1800ms and eight staggered petals establishing a temple, then the temple asks for a paste buffer.** What would this screen look like if it were as authored as the loader?
5. **`generateDummyDeck` will misteach a new player about ink curves.** If "just let me try it" matters, why is that path 60 uniformly random cards instead of a curated starter matchup — which the `decks` table already contains?
