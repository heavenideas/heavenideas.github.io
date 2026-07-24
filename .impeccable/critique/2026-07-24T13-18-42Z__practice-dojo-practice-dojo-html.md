---
target: practice_dojo/practice_dojo.html
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-07-24T13-18-42Z
slug: practice-dojo-practice-dojo-html
---
# Critique: practice_dojo/practice_dojo.html

Method: dual-agent (A: design review · B: detector). Browser visualization skipped per project policy (user does browser testing).

## Design Health Score — 24/40 (Acceptable)

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | localStorage save failures silent (`console.warn`, 4028–4030) |
| 2 | Match System / Real World | 3 | CTL/BCR/RDS/LVI acronyms never defined on-screen (title-attr only) |
| 3 | User Control and Freedom | 2 | Node delete: no confirm, no undo (6233, 5984); Start match wipes state unwarned (4542) |
| 4 | Consistency and Standards | 2 | Dual design language (tokens vs legacy Tailwind); native confirm/prompt/alert mixed with styled modals |
| 5 | Error Prevention | 2 | Great log-import validation (5668–5743), but click-deck-draws misclick risk + no delete guard |
| 6 | Recognition Rather Than Recall | 2 | `.ctx-key` shortcut chips styled (1944) but never populated; hotkeys pure recall |
| 7 | Flexibility and Efficiency | 4 | Hotkeys, Quest-all, hover chips + ctx menu + drag parallel paths, tweaks panel — excellent |
| 8 | Aesthetic and Minimalist Design | 3 | Redesign layer disciplined; metric quadruplets ×3 places; tree modal loud legacy |
| 9 | Error Recovery | 2 | Generic `alert("Failed to fetch the session from Supabase.")` (5842); no retry paths |
| 10 | Help and Documentation | 1 | Two hints total; no shortcut list, no onboarding, no help surface |
| **Total** | | **24/40** | **Acceptable** |

## Design Specificity Verdict

**Authored, with legacy seam.** Real Lorcana product identity: OKLCH player-identity tokens `--p1/--p2` (430–478), board halves tinted via `color-mix`, lore badge steppers, inkwell glyph, `drying "NEW"` badge, exert-as-rotation, inkable hex badge, hypergeometric Draw Odds, bespoke petal-bloom loader with reduced-motion fallback. Live Tweaks panel proves token system real.

Seam: Multiverse tree modal, toasts, autosave list, mulligan/craft grids still old Tailwind gray/purple (3420–3456, 6152–6240, 6311). Split lands on product's most distinctive feature. Hardcoded `#a86b32/#3f2e70` in JS (4651, 5897, 7872) bypass palette tweaks.

**Detector scan:** 16 findings, 7 rules. 10 true positive: side-tab accent borders ×2 (2197, 2224), overused font Geist/Geist Mono ×4 (15, 2761, 2773, 2838), bounce easing on petal intro (356), layout-property transitions ×3 (margin 1571, min-height 1734, max-height 3067). 6 false positive: gray-on-color ×2 (base text paired with hover-only background, 6227/6234), broken-image ×3 (comments containing literal `<img>`, not markup), grid background (3440 — pannable canvas viewport, rule's own exemption).

Detector caught what review missed: Geist = saturated default font; left-border accent cards = common AI-slop pattern (though used semantically for player identity here); layout-property transitions cause reflow jank on the hand fan — relevant at 360px.

## Overall Impression

Serious tool with real design system underneath, and it shows. Weakness concentrated in three places: everything modal/dialog-shaped (native browser dialogs at emotional peaks), everything legacy-Tailwind (the tree — the flagship feature), and everything keyboard/AT (board fully inert). Fix those three seams and this jumps a band.

## What's Working

1. **Live token architecture** (430–478, `applyTweaks` 8551–8598) — accent, card scale, layout, palette reroute through CSS custom properties at runtime. Styled vs designed: this is designed.
2. **Touch drag shim** (8649–8804) — full HTML5 drag lifecycle synthesized from pointer events with ghost clone, edge auto-scroll, synthetic-click suppression. Hardest mobile problem, solved properly.
3. **Statistical honesty** — mulligan model encodes actual bottoming rule (8195–8206); import validator gives graded specific feedback. Trust foundation for a training tool.

## Priority Issues

1. **[P1] Native confirm/prompt/alert at highest-stakes moments** — game over (4166), cloud save name (5851), all error paths (5771, 5842, 6835). Emotional peak + failure states both drop out of the design system. Fix: one reusable styled dialog component (modal-card pattern exists); celebratory game-over modal. → `/impeccable delight` + `/impeccable harden`
2. **[P1] Timeline node delete: no confirm, no undo** (5984–6002; trash chip 6233) on a pan/zoom canvas. Nodes = hours of practice history, destroyed by one mis-click while panning. Fix: two-tap confirm or delete + 10s "Undo" toast. → `/impeccable harden`
3. **[P1] Zero keyboard/AT access to board** — cards inert divs (7296+), ctx items are divs, modals unlabeled/untrapped. Fails accessibility completely; blocks power-user keyboard flow too. Fix: `tabindex=0` + `role=button` + Enter-opens-menu on `.card-wrap`; ctx items as `<button>`; Escape closes; `role=dialog aria-modal`. → `/impeccable audit`
4. **[P2] Dual design language** — tree modal, toasts, autosave list, mulligan/craft grids legacy Tailwind purple/gray. Differentiating feature looks like older, different product. Fix: port to tokens; bookmark colors through `--p1/--p2`. → `/impeccable polish`
5. **[P2] Sub-minimum touch targets** — `.pile-inspect` 22×22px (2664), lore steppers scaled 0.72 (3008), 30px topbar buttons (2935). 360px is hard requirement; these are highest-frequency mobile taps. Fix: ≥40px hit areas via padding/hit-expansion; unscale lore badge, shrink type instead. → `/impeccable adapt`

## Persona Red Flags

**Alex (power user):** unskippable 1.8s loader every refresh (`MIN_LOADING_MS`, 4244); hotkeys M/T/Q/Space undiscoverable (`.ctx-key` never rendered); no Ctrl+Z; `prompt()` breaks flow; Space=end-turn fires anywhere outside inputs — accidental turn-end risk.

**Sam (screen reader / keyboard):** entire board unreachable — no tabindex/role/keyboard on cards; ctx menus div-based, no focus trap, no Escape, no aria on modals; switch checkbox `opacity:0` with no focus state; single-letter hotkeys collide with SR quick-nav. Bright spot: tree keyboard nav (8838–8891) is real — only such surface.

**Casey (360px one-handed):** Quest + End-turn FABs 6px apart bottom-right (3035–3052) — mis-tap ends turn; Undo two taps away opposite corner. Draw Odds + mulligan odds + turn notes silently `display:none` on phones (2888–2891, 3029) — two headline features gone. Peek button copy says "Hold to Reveal" but touch is tap-toggle (4714, 4735–4751) — label lies.

## Minor Observations

- Dead legacy CSS block (27–311) ships; `gap: -50px` invalid (87).
- Drawer code toggles dead class `-translate-x-full` (4052, 5828, 5976, 6007) — drift signal.
- Card back hotlinked from `wiki.mushureport.com` (1810) — third-party outage makes every hidden card a gray box.
- Restore-Auto-Save button off-system emerald Tailwind gradient (4298–4302).
- Collapsed prob pane = 30px sliver, low re-discoverability.
- `title` attrs only tooltip mechanism — invisible on touch, exactly where acronym explanations already missing.
- Bounce easing on petal intro (356, detector): fits crafted loader, keep or flatten — taste call.
- Layout-property transitions (1571, 1734, 3067, detector): margin/min-height/max-height animate reflow — prefer transform/clip where possible for mobile perf.
- Geist/Geist Mono (detector): saturated default; deliberate choice or inherited habit?

## Questions to Consider

1. Multiverse tree is the one thing no other Lorcana tool has — why is it a legacy-skinned modal behind a drawer instead of the flagship surface?
2. Auto-save-every-turn makes the multiverse mostly one linear chain. At turn 25, what does the tree give that the log doesn't? Where's linear-run collapsing?
3. CTL/BCR/RDS/LVI appear in three places, defined nowhere. For the user or the developer? One placement + tap-to-explain beats three unexplained.
