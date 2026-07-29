---
target: practice_dojo/index.html
total_score: 22
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 3
timestamp: 2026-07-28T22-24-39Z
slug: practice-dojo-index-html
---
Method: dual-agent (A: ade2858a52c3febb7 · B: a346bc9e1674c922c) · browser skipped by project convention (user does browser testing) — no overlay available, static evidence only.

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | Mock UIs show fake "live" badges + pulsing dots on static page. Nav has no active-section state. |
| 2 | Match System / Real World | 3 | Strong Lorcana vocabulary, but BCR/LVI/RDS/CTL used ~12x from line 795, defined only at line 1632. |
| 3 | User Control and Freedom | 3 | No traps, no modals — but zero nav below 768px (`hidden md:flex`, no hamburger). |
| 4 | Consistency and Standards | 1 | `.glow-purple` renders amber, `.glow-orange` renders cyan, violet chips hold amber icons, Tailwind palette beside tokens, 3 CTA labels, 3 version numbers (all wrong). |
| 5 | Error Prevention | 2 | Overclaims "reshuffle" + "random dummy decks" (don't exist). 5 focusable inert `<button>`s. No warning destination is 431KB. |
| 6 | Recognition Rather Than Recall | 3 | Screenshots carry load — but both diagram legends cite swatch colors absent from their diagrams. |
| 7 | Flexibility and Efficiency | 2 | Scored, not n/a: page ships 6-item anchor nav, then withholds it on mobile, no active state, no `scroll-margin-top`. |
| 8 | Aesthetic and Minimalist Design | 1 | 9 sections, 3 near-identical tree diagrams, ~46 faint micro-labels, 8 infinite animations. |
| 9 | Error Recovery | 3 | "no silent failures" callout is honest, but only success state ever shown. |
| 10 | Help and Documentation | 2 | Scored, not n/a: this page IS the docs surface, then no FAQ, no changelog, no contact, no GitHub, no author. |
| **Total** | | **22/40** | **Acceptable — significant work needed** |

## Design Specificity Verdict

**Category-interchangeable. ~80% of CSS survives a swap to any unrelated SaaS.**

Structure is the 2021-24 dev-tool template beat for beat: sticky blurred nav w/ mono version tag -> gradient-glow hero w/ mono eyebrow pill + gradient-clipped headline word -> screenshot in fake macOS traffic-light chrome -> 3-up stat strip -> alternating features -> 3x2 icon grid -> 3-step how-it-works -> centered CTA -> thin footer. Geist + Geist Mono is Vercel's typeface, and `.font-display` aliases the same family as body (lines 73-80).

Six ink colors fully defined at lines 354-382; exactly one used (`.amber`, once, line 1704). `.card-ph` 64x90 and `.tree-node` 56x78 are card-proportioned — the tree node is the best object on the page because of it; the feature grid is six arbitrary rectangles. "Dojo" appears nowhere in the design. The multiverse is drawn three times as the same generic node-graph, never once as a comparison.

Real specificity earned: un-faked screenshot, vocabulary (lore/ink/quest/inkwell/exerted), and `// directive: do not hard-block actions. the user is the referee.` (line 1349).

**Deterministic scan** — `detect.mjs` exit 2, 15 findings, all `slop`: `overused-font` x10 (13, 69, 74, 79, 83, 137, 225, 235, 306, 445), `gradient-text` x2 (550, 1746), `dark-glow` x1 (147), `codex-grid-background` advisory x1 (90), `marquee` x1 (line 0, broken location).

False positives: `marquee` targets `.shine::after`, a 40%-wide highlight on a 6px meter bar — real finding, but as an ungated infinite animation. `overused-font` x10 encodes one decision. `codex-grid-background` fired on dead code (`.grain` never applied) and missed live inline instances at 957 and 1110. `dark-glow` under-reports: 8 more colored glow shadows at 153, 244, 252, 258, 271/275/279, 461, 492, 936.

**Visual overlays:** none. Browser injection not attempted — project convention is that the user does browser testing.

## Overall Impression

Copy is better than the design. Then the page buries it under a generic dark-SaaS chassis, three redundant tree diagrams, and a half-finished re-skin that visibly leaks — violet chips containing amber icons (1360, 1374), `.glow-purple` painting amber, `.glow-orange` painting cyan.

Biggest opportunity: the app computes live hypergeometric draw odds (features 23/24/25 in `features.md`) — hard, checkable, defensible, claimed by no competing sandbox. Not the headline. Not on the page at all.

## What's Working

1. **Token port is real.** `--bg`, `--surface`, `--p1`, `--p2`, `--bcr`, `--lvi`, `--rds` copied verbatim from `practice_dojo.html:500-525` — identical OKLCH values. Mocks are chromatically identical to the shipping app.
2. **Regret-shaped, verb-first copy.** "Try every line. Branch any turn." / "One match. A thousand lines you didn't get to play." / "A real sandbox, not a referee."
3. **Annotated real screenshot, placed early.** Proves the tool exists, teaches layout before a heavy load, pre-answers privacy.

## Priority Issues

### [P0] Both flagship tree diagrams destroyed below ~800px
`#import` (974-1027) and `#multiverse` (1113-1229) position nodes at hard pixel `left`/`top` (up to `left:700px`) inside `overflow-hidden` panels while SVG spines scale via `viewBox`. At 360px: 4 of 6 import nodes and 4 of 8 multiverse nodes invisible, including both pulsing "Active"/"You are here" nodes. Across 640-1024px nodes detach from their branch lines. Hero tree (168-174, 497-507) already does this right with % + aspect-ratio.
**Fix:** render both trees as pure SVG inside the same viewBox; minimum fix % positioning + a 3-node variant below `md`.
**Command:** /impeccable adapt

### [P0] Horizontal scroll at 360px
Line 1463 `w-[700px] left-1/2 -translate-x-1/2` glow inside `<section id="how">` (1461) — only glow-bearing section without `overflow-hidden`. ~170px overflow each side. Hero trust row (575) `flex gap-8` with no `flex-wrap`.
**Fix:** `overflow-hidden` on `#how`; `flex-wrap gap-x-6 gap-y-3` on trust row; `overflow-x:hidden` on html,body.
**Command:** /impeccable adapt

### [P1] Page describes a product two major versions old and overclaims a nonexistent feature
App is v2.9.0 (`practice_dojo.html:4544`). Page says v1.0 (519, 1759), v1.15.0 (750), v1.16 (863). Feature card "Reshuffle the unknown" (1407) describes a flow that does not exist — app has only right-click "Shuffle Deck" (`practice_dojo.html:8498`). "Start with random dummy decks" (1481) unimplemented. Draw Odds, Mulligan odds, Craft Ideal Starting Hand, Supabase cloud sessions all shipped per `features.md`, all absent. Import section demos the brittle `.md` parser that `features.md` says was replaced by `.json` / `.replay.gz`.
**Fix:** single-source version from APP_VERSION; delete Reshuffle card + dummy-decks line; replace it and the infinity stat strip with a Draw Odds mock; update import demo to `.replay.gz`.
**Command:** /impeccable clarify

### [P1] `--ink-faint` fails AA on ~40 text nodes; the fix token is dead code
`--ink-faint` -> `--text-faint` -> `oklch(0.46 0.014 60)` = 2.74:1 on --bg, 2.51:1 on --surface, 2.34:1 on --panel-2. 46 references incl. the 15px hero paragraph (558), footer legal notice (1771), all version strings, every 9-10px CTL/BCR/RDS/LVI label. SVG labels `#6a6459` at 8-10px = 3.33:1. Non-text: --line 1.04-1.25:1, --border 1.22-1.46:1, --border-strong 1.81-2.16:1 all fail 1.4.11.
**`--text-dim` (L 0.62, line 28) scores 4.57-5.36:1 and is referenced zero times.**
**Fix:** `--ink-faint: var(--text-dim)` — one line fixes ~40 elements. Separate `--ink-ghost` for decorative marks. Raise SVG fills to >= `#8a8479`.
**Command:** /impeccable audit

### [P1] Zero prefers-reduced-motion, zero focus styles, zero ARIA, no `<main>`, no mobile nav
Grep empty for `aria-`, `role=`, `<main`, `focus`, `prefers-reduced-motion` across 1798 lines. 493 lines of CSS, no focus rule. 8 infinite animations drive ~12 elements plus JS mousemove parallax (1782-1793), all ungated (WCAG 2.3.3). 49 Font Awesome `<i>` with no `aria-hidden`. Six anchors unreachable below 768px. Gradient text (549-551, 1745-1747) has no `-webkit-text-fill-color` fallback — h1 can render invisible in forced-colors mode.
**Command:** /impeccable harden

## Persona Red Flags

**Jordan (first-timer):** first words are two abstract nouns ("Multiverse Theorycraft"). Four undefined acronyms at line 795, defined at 1632. Line 559 cites duels.ink with no explanation and no link — the whole ~220-line #import section is addressed to someone else. "A companion to your favorite simulator" appears twice, never names one. Page never says free, never says no account. `.tree-node` has cursor:pointer + hover scale, no handler.

**Riley (stress tester):** tabs into 5 dead `<button>`s (921, 922, 1288, 1292, 1500); `grep -c onclick` = 0. At ~900px nodes detach from branch lines. Hero caption says "6 bookmarks", 7 drawn; import chrome says "8 turn nodes", 6 drawn, T5 -> T8 with no ellipsis. Three version numbers on the page, a fourth in the app. Typo "Hades – Infernal Scheamer" (1493). Both legends wrong: multiverse (1236) cites `#1f3b43` for paths that are `#2e2a25`; import (1034) cites amber for a diagram with no amber. `cdn.tailwindcss.com` on a page bragging "Single-file · client-side · no install" while loading from 5 origins.

**Casey (360px, one-handed):** page scrolls sideways. All navigation disappears, no hamburger, ~9000px linear scroll. All four screenshot annotation flags are `hidden lg:block` (760, 766, 772, 779) — the page's peak is deleted; she gets a 704KB screenshot of a dense desktop UI with no overlay. Both tree demos render as empty grids. Stat strip `grid-cols-3` with no responsive prefix (831) = ~56px content width per cell. Only persistent CTA is ~36px tall (530), under the 44px floor; hero CTA passes at ~48px but sits ~630px down. Nothing ever in the thumb zone. 704KB unsized, un-lazied hero PNG + 7 full-res card scans at 44x62px, before a 431KB destination. Dead on disk: `img/dojo_gui_old.png`, 1.19MB.

## Minor Observations

- One action, three names: "Launch the Dojo" / "Open the Dojo" / "Open Practice Dojo".
- App link has no `target` — landing page destroyed on click, no path back to the hotkey reference.
- No `scroll-margin-top` on six anchor targets; every jump buries the heading under the 64px sticky header. No skip link.
- `alt="Logo"` (517, 1768); orphan `<label>` at 888 with no `for` and no form control.
- Line 825 uses `<h3>` as a section heading; all 7 siblings use `<h2>`.
- Dead code: `.grain`, `.hairline-2`, `.scrubber-dot`, five `.card-ph` ink variants, `--ok`, `--danger`, `--purple-deep`, `--p2c`, `--p2c-soft`, `--text-dim`.
- Deuteranopia: #import encodes valid/imported/new in green (`#16a34a`) adjacent to amber; copy explicitly says "green / yellow / red badge".
- No author, no GitHub, no changelog, no contact. Footer's only content is a liability disclaimer in the lowest-contrast text on the page, as the last thing anyone reads.
- Conversion desert: hero CTA (~566) to final CTA (~1753) is seven sections with zero conversion opportunity.

## Questions to Consider

1. Delete all three tree diagrams; draw one — same turn played two ways, both outcomes side by side. Shorter and more persuasive at once?
2. Why does "Numbers on the board, not vibes in your head" lead its stat strip with infinity, infinity, instant?
3. Live hypergeometric draw odds is the hardest claim you own. Why is it not on the page at all?
4. Lorcana has six inks. Your stylesheet defines all six. Why does the page have one accent color?
5. If `--purple` renders amber and `.glow-orange` renders cyan — what is the alias layer for?
