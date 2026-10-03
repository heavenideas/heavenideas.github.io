# Practice Dojo v3.0.0 — plugin system + Mastery Lab tools

Status: in progress on `claude/jolly-knuth-o2pljo`. This file is the plan **and** the contract the
plugin files are built against. If code and this file disagree, fix one of them.

## 1. Scope

v3.0.0 = every v2.18.0 feature, unchanged, plus:

1. A **plugin system**: the Dojo emits a small set of events and exposes three empty UI slots;
   plugins live in `practice_dojo/plugins/*.js` and hook in from outside.
2. An **action journal**: an ordered, per-instance record of the game, kept in `state.ext.journal`.
3. Four tools from the Mastery Lab handoff that need **no card-text classifier**:
   Race Clock, Turn Briefing, Mulligan Lab, Sequencing Coach (rules-of-thumb flags), Game Ledger.

**Deferred to the classifier phase (last):** Threat & Exposure Map, the Coach's "best order"
search, and every fact that needs card text (activated "gain lore", cost reducers, "this card
draws"). The classifier will be built on the TheCardGoat engine in `simulator/bot_arena/`
(user's preference), with `utilities/unified_win_probability_utilities.js` +
`lorcanaUtils_MatchUpAnalyzer/lorcana_abilities_redux.json` as the reference for what exists today.

**Card facts plugins may use now** (structured fields only, no text parsing): `cost`, `inkwell`,
`type`, `subtypes` (incl. `Song`), `strength`, `willpower`, `lore`, `name`, and keyword abilities
via `abilities[].type === 'keyword'` → `keyword` + `keywordValueNumber` (Evasive, Rush, Reckless,
Bodyguard, Support, Challenger, Resist, Singer, Shift, Ward, Vanish, Sing Together, Boost, Alert).
Shift base = a character with the same `name`.

## 2. Decisions (defaults taken while the user is away; easy to change)

| Question | Decision |
|---|---|
| Single file? | Core stays one file. Plugins are separate files loaded with `<script src="plugins/…">`. The single-file rule is relaxed for plugins only. If a plugin file fails to load, the Dojo works exactly as v2. |
| Core changes | Explicit hooks (option B): one `App.plugin(name, payload)` helper, ~12 one-line calls, 3 empty slot `<div>`s, `state.ext` carried through compress/decompress. No behaviour change. |
| On/off | Each tool has a toggle in Tweaks → *Lab tools*. Stored in `localStorage['lorcana_dojo_plugins']`. Race Clock and Draw-odds-style passive tools default **on**; Briefing defaults **off** (it asks questions). |
| Point of view | "You" = the **active player** (bottom board), same as the Dojo log's "You"/"Opponent". |
| Hidden info | Not needed by any v3.0 tool (only Threat Map, deferred). Mulligan Lab uses the player's own deck. |
| Rules simulation | Tools may *compute* outcomes (e.g. `App.challengeOutcome`) to advise. They never mutate `App.state` game data and never block or undo a move. |
| Plugin data | Lives in `App.state.ext[pluginId]`, so it rides undo, bookmarks, JSON export/import, cloud saves and localStorage resume with no extra code. |
| Imported games | Journal starts empty for imported `.md`/replay sessions; journal tools say so. (Deriving a journal from replay `takenAction` frames is a later step.) |
| Placement | A **Lab drawer** (right side, full-width sheet on phones) with one tab per enabled tool, opened from a topbar *Lab* button. Race Clock also puts a compact chip in the topbar. Mulligan Lab renders inside the mulligan modal. |

## 3. Files

```
practice_dojo/
  practice_dojo.html          core (v3.0.0) — hooks + slots + <script src> tags
  plugins/
    dojo_plugins.js           host: registry, event bus, journal recorder, Lab drawer, toggles  (lead)
    lab_lib.js                shared pure helpers (card facts, odds, rng, html)                   (lead)
    race_clock.js             Race Clock                                                        (agent A)
    turn_briefing.js          Turn Briefing                                                     (agent A)
    mulligan_lab.js           Mulligan Lab                                                      (agent B)
    sequencing_coach.js       Sequencing Coach                                                  (agent C)
    game_ledger.js            Game Ledger                                                       (agent C)
    plugins.css               shared plugin styles (host) — tools add scoped rules from their own file via lib.css()
    tests/                    node tests for the pure logic: each `*.test.js` runs standalone with `node`;
                              `node plugins/tests/run.js` runs them all
```

Load order (end of `<body>`, after the core script): `lab_lib.js`, `dojo_plugins.js`, then the tools.

## 4. Core hooks (practice_dojo.html)

`App.plugin(name, payload)` forwards to `window.DojoPlugins.emit` inside try/catch; a no-op when
the host isn't loaded. Events:

| name | where | payload |
|---|---|---|
| `action` | inside `_trackAction(type, cardId, extra)` | `{ type, cardId, iid, ...extra }` — `type` ∈ `drawn inked played shifted quested banished discarded`. `quested` adds `lore`, `drying`, `wasExerted` (state before questing). `played`/`shifted` add `cost`, `inkBefore` (ready ink before paying). `banished` from a challenge adds `via: 'challenge'`. |
| `challenge` | `performChallenge`, after damage is applied | `{ attIid, attId, defIid, defId, toDef, toAtt, attDrying, defExerted, defType }` |
| `lore` | `changeLore` (manual ±) | `{ player, delta }` |
| `damage` | `addDamage` | `{ iid, cardId, delta }` |
| `turnEnd` | start of `endTurn`, after `saveState`, before anything changes | `{ player, turn }` (state still shows the ending turn) |
| `turnStart` | end of `endTurn`, before `render` | `{ player, turn }` (after ready + draw step) |
| `gameStart` | end of `startGame`, before `render` | `{}` |
| `mulligan` | `confirmMulligan`, after the redraw | `{ player, thrown: [cardId] }` |
| `mulliganRender` | end of `renderMulliganCards` | `{ player, marked: [iid] }` |
| `render` | end of `render()` | `{}` |

Opening hands, mulligan redraws and the turn's draw-step card are **not** `action: drawn` events
(they never were tracked). A `drawn` action is a draw the player chose to make mid-turn (a card
effect, in a sandbox).

Slots: `#plugin-topbar-slot` (topbar right), `#plugin-mulligan-slot` (mulligan modal body),
`#plugin-tweaks-slot` (end of Tweaks).

`compressState` deep-copies `state.ext`; `decompressState` restores it (`{}` when absent).

## 5. Host API (`window.DojoPlugins`, plugins/dojo_plugins.js)

```js
DojoPlugins.register({
  id: 'raceClock',                 // unique, camelCase; also the key in state.ext
  name: 'Race Clock',
  icon: 'fa-solid fa-stopwatch',   // FontAwesome 6.4 class
  description: 'One line for the Tweaks toggle.',
  defaultEnabled: true,
  order: 10,                       // tab order in the Lab drawer
  panel:    { render(el, ctx) {} },          // Lab drawer tab. Called when shown and after every App.render() while visible.
  topbar:   { render(el, ctx) {} },          // optional chip in #plugin-topbar-slot. Called after every App.render().
  mulligan: { render(el, ctx, info) {} },    // optional block in #plugin-mulligan-slot. info = { player, marked: [iid] }
  on: { turnStart(payload, ctx) {}, action(payload, ctx) {} /* any event in §4 */ },
  api: { /* optional functions other plugins may call via DojoPlugins.api(id) */ }
});

DojoPlugins.isEnabled(id) / setEnabled(id, bool)
DojoPlugins.api(id)            // the registered `api` object, or null when not registered/enabled
DojoPlugins.refresh(id?)       // re-render one plugin's surfaces (or all)
DojoPlugins.openDrawer(id?)    // open the Lab drawer, optionally on a tab
DojoPlugins.lib                // lab_lib.js helpers (below)
```

`ctx` (fresh per call):

```js
{
  app: App,                 // read it; never mutate game data
  state: App.state,         // may be undefined before a game starts
  me, opp,                  // activePlayer / inactivePlayer indices
  card(cardId),             // App.cardDB entry or null
  store(),                  // App.state.ext[id], created as {} on first use — the plugin's own data
  journal(),                // App.state.ext.journal.events (array, oldest first; [] when none)
  persist(),                // flush to localStorage (debounced) after writing to store()
  refresh(),                // re-render this plugin's surfaces
  lib                       // = DojoPlugins.lib
}
```

Rules for plugins: every surface renders from `ctx` each time (no long-lived DOM refs into core);
wrap nothing in try/catch yourself (the host isolates errors); keep `render` cheap — anything
heavy runs on a button press, chunked with `setTimeout`/`requestAnimationFrame`.

### Journal event shape (`state.ext.journal.events[]`)

Recorded by the host for every `action`, `challenge`, `lore`, `damage`, `mulligan`, `turnEnd`,
`turnStart` event, always (even with every tool off), so a tool switched on mid-game has history.

```js
{
  seq,            // 1, 2, 3… within this game
  turn, active,   // App.state.turn / activePlayer when it happened
  kind,           // 'draw' 'ink' 'play' 'shift' 'quest' 'banish' 'discard'   (from action types)
                  // 'challenge' 'lore' 'damage' 'mulligan' 'turnEnd' 'turnStart'
  player,         // owner of the card (actions) / the player concerned
  iid, cardId,    // when a card is involved
  ...payload      // the extra fields from §4
}
```

`turnEnd` events also carry a snapshot taken by the host: `inkReady`, `inkTotal`, and per player
`lore: [p0, p1]`, `hand: [p0, p1]`, `board: [p0, p1]` (sum of printed cost on field),
`fieldChars: [p0, p1]`, `deck: [p0, p1]`, plus `handCards: [cardId]` for the ending player.

A player-turn is identified by `turn` + `active` (key `"<turn>-<active>"`, same as `turnComments`).

## 6. lab_lib.js (shared helpers, `DojoPlugins.lib`)

`kw(db, 'Support')` → `true` / number / `0`; `isChar(db)`, `isSong(db)`, `isLocation(db)`, `isItem(db)`;
`questLore(db)` (printed lore); `hypergeoAtLeastOne(K, N, n)`; `pBoth(KA, KB, N, n)`;
`rng(seed)`, `shuffle(arr, r)`; `turnKey(turn, active)`; `esc(str)`; `cardName(db)`;
`thumb(cardId, cls)` (wraps `App.cardThumbHtml`); `pct(p)`; `css(id, text)` (inject a `<style>` once).

## 7. The tools

### 7.1 Race Clock (`raceClock`, default on) — "Am I winning this race, or do I need to slow it down?"
- Pure function of state, for the active player: lore, lore per turn (printed lore of characters,
  minus Reckless; plus Locations' lore at the start of their owner's turn), lore questable now
  (ready, not drying, not Reckless), turns to 20 for both sides, finish turn, winner if nothing
  changes, margin, verdict `ahead | narrow | close | behind | stalled`.
- Topbar chip: `You win T7 · +2` style, coloured by verdict.
- Panel: both lanes turn by turn to 20; then **what each action does to the clock**: quest with each
  ready character, and each challenge (your ready, dry characters × their characters) using
  `App.challengeOutcome` — clock after, and what it removes. Read-only.
- Says plainly that it assumes nobody changes anything (no win %).
- `api.compute(state, me)` returns the clock for Briefing.

### 7.2 Turn Briefing (`briefing`, default off) — "Every turn starts with questions"
- On `turnStart`, if unanswered: the Lab drawer tab shows 3 quick questions (never a blocking modal;
  a pulsing dot on the Lab button):
  1. If nothing changes, who wins? (You / Opponent / Nobody)
  2. How many of your turns to 20? (number, or "can't")
  3. This turn I should… (Race / Slow it down)
  plus an optional free-text "Which threat matters most?" (recorded, not graded until the Threat Map exists).
- On submit: graded against `raceClock.api.compute` at the moment the turn started (stored with the
  answers), shown with the clock's reasoning. Stored in `store()[turnKey]`.
- While a briefing is pending, Race Clock hides its verdict ("answer the briefing first").
- Calibration: per game (from `store()`) and lifetime (`localStorage['lorcana_dojo_briefing_stats']`):
  % right per question.

### 7.3 Mulligan Lab (`mulliganLab`, default on) — "Which hand gives me the highest chance of executing my game plan?"
- In the mulligan modal: *Grade mulligans* button. Every distinct throw set of the first 7
  (≤128, deduped by multiset) is played forward from the same seeds (paired, e.g. 400 games each)
  through turn 4 with a fixed simple policy: ink one card a turn (prefer cards you can't cast soon),
  then play the set of cards that spends the most ink (subset-sum); Shift onto a same-name character
  counts at Shift cost; Songs aren't paid for. On the play if `player === 0`, else on the draw.
- Score = mean ink spent on turns 1–4, with P(missed ink drop by T4) and, if the player picks a
  **plan card** (optional dropdown of the deck's unique cards), P(plan card in hand by turn N).
- Shows: top options, where the currently marked throw ranks, and a one-line "why".
  A *Mark this* button on an option sets `App.mulliganSelection` and calls `App.renderMulliganCards()`
  (the only write the tool makes — it's UI selection, not game state).
- Runs chunked so the modal stays responsive; results cached per (hand, deck, plan card).

### 7.4 Sequencing Coach (`coach`, default on) — "Same plays, better order"
- Reads the journal; pick a finished player-turn (default: the active player's last completed turn).
- Shows the turn's steps in order, with flags (all advisory):
  - **Ink before draw**: an `ink` followed later that turn by a `draw` by the same player → "you'd
    have seen <card> before choosing what to ink".
  - **Support after the challenge**: a `quest` by a Support character after a `challenge` that turn.
  - **Not possible here** (sandbox allowed it): challenge with a drying attacker, challenge into a
    ready character, quest with a drying character, played a card with `inkBefore < cost`.
  - **Ink left on the table**: at `turnEnd`, `inkReady > 0` and a non-Song card in hand costs ≤ that.
  - **No ink this turn** (info): no `ink` that turn while the hand had an inkable card.
- Replaying in another order / best-order search: deferred (needs the rules engine).

### 7.5 Game Ledger (`ledger`, default on) — "Who has more useful resources remaining?"
- From the journal: per player-turn — lore gained, cards drawn beyond the draw step, ink developed
  (printed cost of characters/items/locations played), opposing value removed, own value lost,
  end-of-turn hand / board / lore (from `turnEnd` snapshots).
- Race lead after every turn = (lore + 2 × lore-per-turn) you − them; the 3 biggest swings are
  the **turning points**.
- **Receipt per card instance**: turns in play, lore quested, challenges, kills (value removed),
  how it left — sorted by value created.
- Works on the current timeline branch (the journal rides the bookmark you're on).

## 8. Order of work

1. Plan + contract (this file). 2. Host + lib + core hooks (lead), tools in parallel (agents A–C).
3. Integrate, smoke-test in headless Chromium. 4. Docs: features.md (Feature 38), dev guide §20,
   `TEST-PROTOCOL-v3.0.0.md`. 5. Classifier phase (separate spec, with the user).
