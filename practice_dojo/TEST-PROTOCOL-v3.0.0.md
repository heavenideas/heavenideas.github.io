# TEST PROTOCOL — Practice Dojo v3.0.0

Scope: **Feature 38 · Plugin system + Mastery Lab tools.** The core gained event hooks and three
empty slots; everything new lives in `practice_dojo/plugins/`. Part A checks that nothing old
changed; B–G check the new tools.

Files under test: `practice_dojo/practice_dojo.html` + `practice_dojo/plugins/*`.
Serve the folder (GitHub Pages, or `python3 -m http.server` from the repo root and open
`/practice_dojo/practice_dojo.html`) — plugins are separate files, so opening the HTML as a
`file://` URL may block them in some browsers.

Automated checks already run in the cloud session (no need to repeat unless something looks off):
`node practice_dojo/plugins/tests/run.js` (5/5) and
`node practice_dojo/plugins/tests/browser_smoke.js` (desktop, `--mobile`, `--no-plugins`).

---

## Setup

1. Desktop window ≥ 1200px; phone or DevTools at **390×844** with touch for the phone rows.
2. Load two decks, start a game. Sidebar / setup shows **v3.0.0**.
3. Tweaks → **Lab tools** lists five tools: Race Clock, Coach, Mulligan Lab, Ledger on; Briefing off.

## A — Nothing old changed

| # | Step | Expected |
|---|------|----------|
| A.1 | Tweaks → Lab tools: untick all five | Lab button and chip disappear; the game plays exactly like v2.18.0 |
| A.2 | Play a few turns: ink, play, quest, challenge (drag + challenge mode), banish, undo, end turn, auto-save | All as before |
| A.3 | Save a bookmark, restore it, open the Multiverse tree | Nodes and sections as before |
| A.4 | Export timelines (.json), reload, import it; also Resume match from the setup screen | Loads as before |
| A.5 | Import a Duels.ink `.md` log and a `.replay.gz` | Imports as before |
| A.6 | Temporarily rename the `plugins` folder and reload | Dojo boots and plays normally (no Lab button); rename it back |
| A.7 | Press `q`, `t`, `m`, `Space`, `c`, hover hotkeys | Unchanged |
| A.8 | Long game (15+ turns) with auto-save on, then reload and Resume | Resumes; no "Failed to save session" warning in the console |

## B — Lab drawer & plugin system

| # | Step | Expected |
|---|------|----------|
| B.1 | Click **Lab** in the top bar (or press `L`) | Drawer slides in from the right with tabs: Race Clock · Coach · Mulligan… (only tools with a tab) · Ledger |
| B.2 | `L` again / `Esc` / × | Closes. `L` does nothing while a modal or the context menu is open, or while typing |
| B.3 | Untick a tool in Tweaks with the drawer open | Its tab disappears; re-ticking brings it back; survives a reload |
| B.4 | Phone | Drawer is full screen width, no sideways scroll; topbar chip shortens |
| B.5 | Switch palettes (Competition / Modern / Classic / Mono) and Card display Art/Text | Lab follows the palette; nothing unreadable |

## C — Race Clock ("Am I winning this race, or do I need to slow it down?")

| # | Step | Expected |
|---|------|----------|
| C.1 | Put characters on both boards | A chip left of Lab: e.g. "◆ You win · T7 · +2 turns" (green ahead / amber narrow behind / red behind), "Stalled" with no characters |
| C.2 | Click the chip | Lab opens on Race Clock: headline + one sentence, stats grid (lore, lore a turn, can quest now, turns to 20, reaches 20), the "assumes nothing changes" line, turn-by-turn bars |
| C.3 | Quest with a character, or end the turn | Chip and panel update immediately |
| C.4 | Exert an opposing character | "What each action does to the clock" lists challenges ("You T5 · Opp T6→T8", Better/Worse), best first; quests say what holding that character back costs; challenges the rules forbid (ready target, Evasive…) sit in a collapsed "sandbox allows" list |
| C.5 | Check one number by hand | E.g. you 12 lore, 3 lore a turn on board → reaches 20 in 3 of your turns |

## D — Turn Briefing ("Every turn starts with questions") — turn it on first

| # | Step | Expected |
|---|------|----------|
| D.1 | Tweaks → Lab tools → Briefing on; with characters down, end the turn | Lab button gets a pulsing dot; the chip reads "◆ Briefing first"; Race Clock tab says "Answer the briefing first". Nothing pops up or blocks play |
| D.2 | Open Briefing | 3 questions + optional "Which threat matters most?"; "Check my answers" disabled until 1–3 are answered; typing survives while the board re-renders |
| D.3 | Check answers | Right / Close / Wrong next to the clock's reasoning; dot clears; Race Clock verdict visible again |
| D.4 | Several turns later | "Earlier this game" list and calibration (this game / lifetime) fill in |
| D.5 | Undo right after answering, answer again | Briefing comes back unanswered; lifetime "Briefings" count does not double |
| D.6 | "Skip this turn" | Not graded; Race Clock unhidden |
| D.7 | Turn Briefing on mid-turn | Tab offers "Brief this turn" |

## E — Mulligan Lab ("Which hand gives me the highest chance of executing my game plan?")

| # | Step | Expected |
|---|------|----------|
| E.1 | New game → Mulligan | "Mulligan Lab" block under the hand; P1 says "On the play", P2 "On the draw" |
| E.2 | **Grade mulligans** | Progress bar, ~1s; top 5 options with throw thumbs (or "Keep all 7"), Ink used, Missed ink by T4, a "why" line, **Mark this** |
| E.3 | Mark cards by hand | "Your current pick ranks Nth of M" updates instantly, no regrade |
| E.4 | **Mark this** on an option | Exactly those cards get marked; nothing else changes until you confirm |
| E.5 | Pick a plan card + turn, grade again | "Plan by TN" column/pill appears |
| E.6 | Sanity | A hand of expensive cards should rank "throw the expensive ones" above "keep all" |
| E.7 | Close and reopen with the same hand | Results come back instantly (cached) |
| E.8 | Turn Mulligan Lab off | Block disappears; mulligan works as v2 |

## F — Sequencing Coach ("Same plays, better order")

| # | Step | Expected |
|---|------|----------|
| F.1 | Play a turn, end it, open Coach | That turn's steps in order; "Clean turn" if nothing to flag; a selector for every finished turn |
| F.2 | Ink, then click your deck to draw, end turn | Flag **Ink before draw**, naming the card you drew |
| F.3 | Challenge, then quest with a Support character, end turn | Flag **Support after the challenge** (says if the target survived) |
| F.4 | Play a card you can't afford / challenge a ready character / quest a drying one | **Not possible here** (informational) |
| F.5 | End a turn with ink left and a cheap non-song card in hand | **N ink unspent** |
| F.6 | End a turn without inking while holding an inkable card | **No ink this turn** (info) |

## G — Game Ledger ("Who has more useful resources remaining?")

| # | Step | Expected |
|---|------|----------|
| G.1 | After a few turns, open Ledger | Turn-by-turn table for both players (lore, +cards, ink in, removed/lost, lead); turning points marked after turn 2 |
| G.2 | Lethal challenge | Removed/Lost show the banished card's cost; the attacker's receipt lists the kill |
| G.3 | Return a character to hand (context menu) | Its receipt says "returned to hand" (not still in play) |
| G.4 | "Who has more useful resources?" | Hand / ink on board / characters / lore / deck for both, one-line verdict |
| G.5 | Receipts: Both / P1 / P2, Show all | Sorted by value created |
| G.6 | Restore an earlier bookmark | Ledger and Coach show that branch's history only |
| G.7 | Imported Duels.ink game | Ledger/Coach explain imported logs don't carry the journal yet; they fill in from turns played after import |

---

## What to report back

For anything off: the row id (e.g. **C.4**), what you did, what you saw, a screenshot if visual,
and the browser console's red lines if any. Also tell me which numbers feel *wrong as a player* —
the Race Clock's verdicts and the Mulligan Lab's rankings are the ones I most want a human read on.
