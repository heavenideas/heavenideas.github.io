# Mastery Lab — handoff for the next session

Exploration of how the ideas in *Mastering Competitive Lorcana* (DarkWings | Chupa) could become practice tools in the Practice Dojo. **Nothing here is wired into `practice_dojo.html`.** This folder holds prototypes and their engine so a fresh session can pick up from here.

## Where things stand

- **Prototypes exist; a real spec does not.** Everything here was built to explore ideas, not as an implementation plan.
- **The card-text classifier needs rethinking.** The user considers the current approach (regex patterns over `abilities[]` / `effects[]`) naive and has material to show that will change the design. Start the next session by asking to see it. Do not treat `engine/classify.js` as the design.
- **Direction from the user:** implement the new functionality as a **plugin system**, so the Dojo's existing behaviour stays exactly as it is and the tools hook in from outside.
- CTL / unified win probability are out of scope (the user's explicit call).

## The six proposed tools

| # | Tool | Guide question | Notes |
|---|---|---|---|
| 1 | Race Clock | "Am I winning this race, or do I need to slow it down?" | "If nothing changes" turns-to-20 for both sides, with a preview of what each action does to it. Pure function of state. |
| 2 | Threat & Exposure Map | "What happens if I don't answer this?" | Two-turn cost and unlocks for their cards; removal odds next turn for yours (hypergeometric over the unseen pool); dead answers in their hand. Depends on the classifier. |
| 3 | Mulligan Lab | "Which hand gives me the highest chance of executing my game plan?" | All 128 mulligans of a hand, Monte Carlo through turn 4 with paired seeds; ranked by ink spent on curve, with a plan card. |
| 4 | Sequencing Coach | "Same plays, better order" | Replays a turn's steps in any order, flags info-before-ink, Support after the challenge, late reducers, illegal steps, floating ink; brute-forces the best order. Needs an ordered per-turn action log. |
| 5 | Game Ledger | "Who has more useful resources remaining?" / card value | Tempo, card advantage and card value per turn, swing turns, a receipt per card. Needs per-instance tracking. |
| 6 | Turn Briefing | "Every turn starts with questions" | Player answers first, lenses grade; calibration over time. Stored on turn nodes. |

Proposed build order: Race Clock → Mulligan Lab → Threat Map → Briefing → Coach → Ledger.

## Published artifacts (private to the user)

- Canvas with the six interactive prototypes: https://claude.ai/artifact/49EZoEWkpCky9himd1NKJo
- Playable pitch deck: https://claude.ai/artifact/QXdeGmQVRaa6d8tZ4gq7rm
- Empty Slides deck created by mistake (can be deleted on request): https://claude.ai/artifact/XZwubZWYoYYQK9Dx7zYrG6

## What's in this folder

- `engine/` — the prototype engine, split by concern, bundled by `build.sh` into `lab.js` (exposes `window.DojoLab`).
  - `classify.js` card-text classifier (prototype; see above). On the full DB it parsed 255 of the 264 standard cards with removal-style text.
  - `engine_core.js` card models, odds, RNG, Mulligan Lab sim.
  - `engine_rules.js` a small rules subset used only to replay turns in the prototypes (ink, play, quest, challenge with Challenger/Support/Resist, songs, activations, removal). Not meant for the Dojo, which stays a sandbox.
  - `engine_lens.js` race clock, unseen pool, exposure, threats, sandbox actions.
  - `engine_coach.js`, `engine_ledger.js`, `engine_brief.js`, `engine_view.js` the other tools.
  - `engine_game.js` + `engine_scen.js` one scripted, rules-checked 21-turn game: Amber-Amethyst Madrigals vs Emerald-Amethyst Phillip (the user's two lists, in `decks.txt`). Turn 13 is the showcase position.
  - `cards.json` the 35 unique cards of the two lists, extracted from allCards.json (formatVersion 2.3.5).
  - `tests/` node checks used during development. Paths inside are from the old scratchpad (they expect `lab/lab.js` and the uploaded allCards.json); adjust before running.
- `canvas/` the canvas artboards (`.dc.html`, Design-canvas format) and its `canvas.json`.
- `pitch/` the pitch deck: `pitch_src.html` (engine placeholder) and `dojo-pitch.html` (engine inlined).

## Source material to re-supply in the new session

These were uploads and are not in the repo:
- `Mastering.md` — the guide text.
- `allCards.json` — the same database the Dojo loads from the CDN.
