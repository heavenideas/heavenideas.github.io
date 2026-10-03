// Practice Dojo — Mulligan Lab (v3.0.0 plugin, id `mulliganLab`).
//
// "Which hand gives me the highest chance of executing my game plan?"
//
// Inside the mulligan modal: a *Grade mulligans* button plays every distinct way to
// mulligan the opening seven (≤128 throw sets, deduped by the multiset of cards thrown)
// forward through turn 4 from the same seeded shuffles (paired comparison), with a fixed,
// simple policy:
//   - ink one card a turn (never the plan card while anything else can go; prefer cards
//     you can't cast in the next couple of turns, priciest first),
//   - then play the set of cards that puts the most cost onto the table (0/1 knapsack),
//     Shift onto a same-name character of yours at its Shift cost,
//   - Songs are never paid for with ink: a dry character whose cost (or Singer value)
//     covers the song sings it.
// Score = mean "ink used" on turns 1–4 (printed cost of what got onto the table, so a Shift
// or a sung Song counts at full cost — that is the tempo it bought), plus P(missed an ink
// drop by T4) and, when a plan card is picked, P(plan card seen by turn N).
//
// Card facts come from structured fields only (cost, inkwell, type, subtypes, name and the
// Shift / Singer keywords). Card text — cost reducers, draw effects — is ignored until the
// classifier phase. The real deck order is never read: the library is reshuffled per game.
//
// The only write to the app: "Mark this" sets App.mulliganSelection and calls
// App.renderMulliganCards() (UI selection, not game state).
(function (root) {
    'use strict';

    let lib = root.DojoLab;
    if (!lib && typeof require === 'function') { try { lib = require('./lab_lib.js'); } catch (e) { /* tests pass it in */ } }
    const L = () => lib || root.DojoLab;

    const TURNS = 4;
    const SIMS = 400;
    const SEED = 0x5eed1;
    const MAX_OPENER = 7;
    const NUM = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven'];

    // ======================================================================
    // Pure logic (node-testable)
    // ======================================================================

    const now = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const sortedKey = (ids) => ids.slice().sort((a, b) => a - b).join(',');
    const nameOf = (db) => (db && (db.fullName || db.name)) || 'Unknown card';

    // What the sim needs to know about a card. Unknown cards (imported placeholders,
    // cardId -999, or any id missing from the DB) are blank inkable cards that are never played.
    function cardInfo(cardId, cardDB, plan) {
        const db = cardDB ? cardDB[cardId] : null;
        if (!db) return { id: cardId, unknown: true, cost: 99, ink: true, isChar: false, perm: false, song: false, shift: 0, name: null, singCost: 0, isPlan: false };
        const l = L();
        const cost = typeof db.cost === 'number' ? db.cost : 99;
        const isChar = l.isChar(db);
        const shiftKw = l.kw(db, 'Shift');
        const singer = l.kw(db, 'Singer');
        return {
            id: cardId, unknown: false, cost,
            ink: !!db.inkwell,
            isChar,
            perm: isChar || l.isItem(db) || l.isLocation(db),
            song: l.isSong(db),
            shift: typeof shiftKw === 'number' ? shiftKw : 0,
            name: db.name || null,
            singCost: isChar ? Math.max(cost, typeof singer === 'number' ? singer : 0) : 0,
            isPlan: plan != null && plan !== '' && nameOf(db) === plan
        };
    }

    // Every distinct throw set of the opener (deduped by the multiset of thrown cardIds).
    function throwSets(handIds) {
        const n = Math.min(handIds.length, MAX_OPENER);
        const seen = new Map();
        for (let mask = 0; mask < (1 << n); mask++) {
            const thrown = [], kept = [], idx = [];
            for (let i = 0; i < n; i++) {
                if ((mask >> i) & 1) { thrown.push(handIds[i]); idx.push(i); } else kept.push(handIds[i]);
            }
            const key = sortedKey(thrown);
            if (!seen.has(key)) seen.set(key, { key, mask, thrown, kept, idx });
        }
        return Array.from(seen.values());
    }

    // Best play this turn with `cap` ink: maximise printed cost put onto the table,
    // paying Shift cost when a same-name character of yours is already in play (`names`).
    // Songs and unknown cards are never paid for. `skip` leaves one index out (ink choice).
    // Returns { paid, value, played: [index] }.
    function bestSpend(cards, cap, names, skip) {
        const n = cards.length, C = Math.max(0, cap) + 1;
        const dp = new Int16Array((n + 1) * C).fill(-1);
        const paid = new Int8Array(n);
        dp[0] = 0;
        for (let i = 0; i < n; i++) {
            const c = cards[i];
            let pc = -1;
            if (i !== skip && !c.song && !c.unknown) {
                pc = c.cost;
                if (c.isChar && c.shift > 0 && c.shift < pc && names && names.has(c.name)) pc = c.shift;
                if (pc > cap) pc = -1;
            }
            paid[i] = pc;
            const a = i * C, b = a + C;
            for (let p = 0; p < C; p++) dp[b + p] = dp[a + p];
            if (pc < 0) continue;
            for (let p = pc; p < C; p++) {
                const prev = dp[a + p - pc];
                if (prev >= 0 && prev + c.cost > dp[b + p]) dp[b + p] = prev + c.cost;
            }
        }
        const last = n * C;
        let bp = 0, bv = 0;
        for (let p = 0; p < C; p++) {
            const v = dp[last + p];
            if (v > bv || (v === bv && v > 0 && p > bp)) { bv = v; bp = p; }
        }
        const played = [];
        let p = bp;
        for (let i = n - 1; i >= 0 && p > 0; i--) {
            if (dp[i * C + p] === dp[(i + 1) * C + p]) continue;
            played.push(i);
            p -= paid[i];
        }
        return { paid: bp, value: bv, played };
    }

    // Play one game forward. hand/library: arrays of cardInfo (library already in draw order).
    // Adds to `out` and returns the game's ink used T1–4.
    function simulate(hand, library, opts, out) {
        const H = hand.slice();
        const usePlan = !!opts.plan;
        const planTurn = opts.planTurn || TURNS;
        const lastTurn = usePlan ? Math.max(TURNS, planTurn) : TURNS;
        const board = [];           // { isChar, singCost, turn }
        const names = new Set();    // names of your characters in play (Shift bases)
        let li = 0, well = 0, total = 0, paidTotal = 0, missed = false;
        let saw = usePlan && H.some(c => c.isPlan);
        for (let t = 1; t <= lastTurn; t++) {
            if (!(opts.onPlay && t === 1)) {
                const d = library[li++];
                if (d) { H.push(d); if (d.isPlan) saw = true; }
            }
            if (usePlan && t === planTurn && saw) out.plan++;
            if (t > TURNS) continue;

            // --- ink step
            let inkables = [];
            for (let i = 0; i < H.length; i++) if (H[i].ink) inkables.push(i);
            if (usePlan && inkables.some(i => !H[i].isPlan)) inkables = inkables.filter(i => !H[i].isPlan);
            let inkIdx = -1;
            if (inkables.length) {
                const all = bestSpend(H, well + 1, names, -1);
                const cand = inkables.filter(i => all.played.indexOf(i) < 0);
                if (cand.length) {
                    // keep what you can cast in the next couple of turns; ink the rest, priciest first
                    const soon = (c) => (c.cost <= well + 3 ? 1 : 0);
                    cand.sort((a, b) => (soon(H[a]) - soon(H[b])) || (H[b].cost - H[a].cost));
                    inkIdx = cand[0];
                } else {
                    let bestV = -1;
                    for (const i of inkables) {
                        const v = bestSpend(H, well + 1, names, i).value;
                        if (v > bestV || (v === bestV && H[i].cost > H[inkIdx].cost)) { bestV = v; inkIdx = i; }
                    }
                }
            }
            if (inkIdx >= 0) { H.splice(inkIdx, 1); well++; } else { missed = true; out.missInk[t - 1]++; }

            // --- main phase: best spend, then songs sung by dry characters
            const res = bestSpend(H, well, names, -1);
            let turnValue = res.value;
            const kept = [];
            for (let i = 0; i < H.length; i++) {
                if (res.played.indexOf(i) >= 0) {
                    const c = H[i];
                    if (c.perm) board.push({ isChar: c.isChar, singCost: c.singCost, turn: t });
                } else kept.push(H[i]);
            }
            for (let i = 0; i < H.length; i++) if (res.played.indexOf(i) >= 0 && H[i].isChar && H[i].name) names.add(H[i].name);
            let singers = null;
            const rest = [];
            for (const c of kept) {
                if (c.song) {
                    if (!singers) singers = board.filter(b => b.isChar && b.turn < t).map(b => b.singCost).sort((a, b) => a - b);
                    const si = singers.findIndex(s => s >= c.cost);   // cheapest singer that can
                    if (si >= 0) { singers.splice(si, 1); turnValue += c.cost; continue; }
                }
                rest.push(c);
            }
            H.length = 0;
            for (const c of rest) H.push(c);
            total += turnValue;
            paidTotal += res.paid;
            if (turnValue > 0) out.played[t - 1]++;
        }
        if (missed) out.missAny++;
        out.value += total;
        out.paid += paidTotal;
        return total;
    }

    // Grade every throw set. Runs in slices: job.step(k) simulates k more throw sets.
    // input: { handIds (opener, ≤7), extraIds (hand beyond 7, always kept), deckIds }
    // opts:  { cardDB, onPlay, plan (card fullName or ''), planTurn, sims, seed }
    function job(input, opts) {
        const sims = opts.sims || SIMS;
        const seed = opts.seed == null ? SEED : opts.seed;
        const l = L();
        const infoCache = new Map();
        const info = (id) => {
            let c = infoCache.get(id);
            if (!c) { c = cardInfo(id, opts.cardDB, opts.plan); infoCache.set(id, c); }
            return c;
        };
        const deck0 = input.deckIds.map(info);
        const extra = (input.extraIds || []).map(info);
        const sets = throwSets(input.handIds);
        const results = [];
        const lib = new Array(deck0.length);
        let next = 0;
        const j = {
            total: sets.length, done: 0, results: null, sims,
            step(k) {
                for (let c = 0; c < k && next < sets.length; c++, next++) {
                    const g = sets[next];
                    const thrown = g.thrown.map(info);
                    const kept = g.kept.map(info);
                    const m = thrown.length;
                    const out = { value: 0, paid: 0, plan: 0, missAny: 0, missInk: [0, 0, 0, 0], played: [0, 0, 0, 0], raw: new Float32Array(sims) };
                    const r = l.rng(seed);           // same stream for every option → paired comparison
                    for (let s = 0; s < sims; s++) {
                        for (let i = 0; i < deck0.length; i++) lib[i] = deck0[i];
                        l.shuffle(lib, r);
                        // Thrown cards go to the bottom, replacements come off the top,
                        // then the deck is shuffled (thrown cards can be drawn again later).
                        const hand = kept.concat(lib.slice(0, m), extra);
                        const rest = lib.slice(m).concat(thrown);
                        l.shuffle(rest, r);
                        out.raw[s] = simulate(hand, rest, opts, out);
                    }
                    results.push({
                        key: g.key, thrown: g.thrown, kept: g.kept, idx: g.idx, sims,
                        mean: out.value / sims, paid: out.paid / sims,
                        missAny: out.missAny / sims,
                        missInkByTurn: out.missInk.map(x => x / sims),
                        played: out.played.map(x => x / sims),
                        plan: opts.plan ? out.plan / sims : null,
                        raw: out.raw
                    });
                }
                j.done = next;
                if (next >= sets.length && !j.results) j.results = finish(results);
                return j;
            }
        };
        return j;
    }

    // Rank, and mark options statistically tied with the best (paired, within 2 standard errors).
    function finish(results) {
        results.sort((a, b) => (b.mean - a.mean) || (a.missAny - b.missAny) || (a.thrown.length - b.thrown.length));
        const best = results[0];
        results.forEach((x, i) => {
            x.rank = i + 1;
            const n = x.raw.length;
            let md = 0, sd = 0;
            for (let s = 0; s < n; s++) md += best.raw[s] - x.raw[s];
            md /= n;
            for (let s = 0; s < n; s++) { const d = best.raw[s] - x.raw[s] - md; sd += d * d; }
            x.gap = md;
            x.se = Math.sqrt(sd / Math.max(1, n - 1) / n);
            x.tied = i === 0 || md <= 2 * x.se + 1e-9;
        });
        results.forEach(x => { delete x.raw; });
        return results;
    }

    // Synchronous convenience (tests): every option, best first.
    function options(input, opts) {
        const j = job(input, opts);
        while (!j.results) j.step(1000);
        return j.results;
    }

    // What the grader needs from the Dojo state, for one player.
    function inputs(state, cardDB, player) {
        const P = state.players[player];
        const hand = P.hand || [], deck = P.deck || [];
        const opener = hand.slice(0, MAX_OPENER);
        const known = (id) => !!(cardDB && cardDB[id]);
        const handIds = opener.map(c => c.cardId);
        const extraIds = hand.slice(MAX_OPENER).map(c => c.cardId);
        const deckIds = deck.map(c => c.cardId);
        return {
            player, handIds, extraIds, deckIds,
            openerIids: opener.map(c => c.instanceId),
            onPlay: player === 0,
            handSize: hand.length,
            unknownHand: handIds.concat(extraIds).filter(id => !known(id)).length,
            unknownDeck: deckIds.filter(id => !known(id)).length,
            midGame: (state.turn || 1) > 1 || (P.field || []).length > 0 || (P.inkwell || []).length > 0
        };
    }

    function cacheKey(inp, plan, planTurn) {
        return [inp.onPlay ? 'P' : 'D', plan || '', plan ? planTurn : '', sortedKey(inp.handIds), sortedKey(inp.extraIds), sortedKey(inp.deckIds)].join('|');
    }

    // Instance ids to mark for a throw set (first unused copy of each thrown cardId in the opener).
    function iidsFor(thrown, openerIds, openerIids) {
        const used = new Set(), out = [];
        for (const id of thrown) {
            for (let i = 0; i < openerIds.length; i++) {
                if (!used.has(i) && openerIds[i] === id) { used.add(i); out.push(openerIids[i]); break; }
            }
        }
        return out;
    }

    // The current marked selection → throw key, or null when it marks cards beyond the opener.
    function markedKey(marked, openerIds, openerIids) {
        const ids = [];
        for (const iid of marked || []) {
            const i = openerIids.indexOf(iid);
            if (i < 0) return null;
            ids.push(openerIds[i]);
        }
        return sortedKey(ids);
    }

    // Unique cards of hand + deck (by full name) for the plan picker, cheapest first.
    function planChoices(inp, cardDB) {
        const seen = new Map();
        for (const id of inp.handIds.concat(inp.extraIds, inp.deckIds)) {
            const db = cardDB[id];
            if (!db) continue;
            const nm = nameOf(db);
            if (!seen.has(nm)) seen.set(nm, { name: nm, cost: typeof db.cost === 'number' ? db.cost : 99 });
        }
        return Array.from(seen.values()).sort((a, b) => a.cost - b.cost || a.name.localeCompare(b.name));
    }

    // One line, plain words: what the option throws, what it keeps, how it plays out.
    function why(r, cardDB) {
        const db = (id) => cardDB[id] || null;
        const cost = (id) => { const d = db(id); return d && typeof d.cost === 'number' ? d.cost : null; };
        const short = (id) => { const d = db(id); return d ? (d.name || d.fullName) : 'an unknown card'; };
        const parts = [];
        const th = r.thrown;
        if (!th.length) parts.push('keeps all 7');
        else {
            const costs = th.map(cost);
            const same = costs.every(c => c != null && c === costs[0]);
            const allUninkable = th.every(id => db(id) && !db(id).inkwell);
            const groups = new Map();                    // cost -> count, priciest first
            costs.slice().sort((a, b) => (b == null ? -1 : b) - (a == null ? -1 : a)).forEach(c => groups.set(c, (groups.get(c) || 0) + 1));
            const drops = (c, n) => n === 1 ? `a ${c}-drop` : `${NUM[n] || n} ${c}-drops`;
            if (th.length === 1) parts.push(`throws ${short(th[0])}${costs[0] != null ? ` (${costs[0]})` : ''}`);
            else if (same) parts.push(`throws ${NUM[th.length] || th.length} ${costs[0]}-drops`);
            else if (groups.size === 2 && !groups.has(null)) parts.push('throws ' + Array.from(groups).map(([c, n]) => drops(c, n)).join(' and '));
            else if (allUninkable) parts.push(`throws ${NUM[th.length] || th.length} uninkables`);
            else if (costs.every(c => c != null && c >= 5)) parts.push(`throws ${NUM[th.length] || th.length} cards costing 5+`);
            else if (th.length <= 3) parts.push('throws ' + th.map(short).join(', '));
            else parts.push(`throws ${NUM[th.length] || th.length} cards (${costs.map(c => c == null ? '?' : c).sort((a, b) => (b === '?' ? 99 : b) - (a === '?' ? 99 : a)).join(', ')})`);
        }
        // How it plays out (from the sim)
        const busy = [];
        for (let t = 1; t <= TURNS; t++) if (r.played[t - 1] >= 0.7) busy.push(t);
        const run = (a, b) => { for (let t = a; t <= b; t++) if (busy.indexOf(t) < 0) return false; return true; };
        if (run(1, 4)) parts.push('fills turns 1–4');
        else if (run(2, 4)) parts.push('fills turns 2–4');
        else if (run(3, 4)) parts.push('fills turns 3–4');
        else {
            const kept = r.kept.filter(id => { const d = db(id); return d && !L().isSong(d) && typeof d.cost === 'number' && d.cost <= TURNS; });
            const curve = Array.from(new Set(kept.map(cost))).sort((a, b) => a - b);
            parts.push(curve.length ? `keeps ${curve.join('-')} curve` : 'keeps nothing castable by T4');
        }
        if (r.missAny >= 0.25) parts.push(`misses an ink drop in ${Math.round(r.missAny * 100)}% of games`);
        const s = parts.join(' · ');
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    const ordinal = (n) => {
        const s = ['th', 'st', 'nd', 'rd'], v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const MulliganLabCore = {
        TURNS, SIMS, SEED, cardInfo, throwSets, bestSpend, simulate, job, finish, options,
        inputs, cacheKey, iidsFor, markedKey, planChoices, why, ordinal, sortedKey
    };

    // ======================================================================
    // Browser plugin
    // ======================================================================

    const cache = new Map();          // cacheKey -> { results, byKey, ms, ... }
    const CACHE_MAX = 24;
    let running = null;               // { key, job, cancelled }
    const ui = {};                    // per player: { plan, planTurn }
    const uiFor = (p) => ui[p] || (ui[p] = { plan: '', planTurn: 4 });

    const CSS = `
.ml-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
.ml-head .lab-h { margin: 0; }
.ml-sub { margin: 4px 0 8px; }
.ml-ctrl { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; margin: 6px 0; }
.ml-ctrl label { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-dim); min-width: 0; max-width: 100%; }
.ml-ctrl select.ml-plan { flex: 1 1 auto; min-width: 0; width: 320px; max-width: 100%; }
.ml-note { margin: 4px 0; }
.ml-prog { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
.ml-bar { flex: 1; height: 6px; border-radius: 999px; background: var(--surface-3); overflow: hidden; }
.ml-bar > i { display: block; height: 100%; width: 0; background: var(--accent); transition: width .1s linear; }
.ml-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.ml-opt { display: grid; grid-template-columns: 26px minmax(0, 1fr) auto; gap: 4px 10px; align-items: center;
    padding: 6px 8px; border: 1px solid var(--border-soft); border-radius: var(--radius-sm); background: var(--surface); }
.ml-opt.is-current { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent) inset; }
.ml-rank { font: 700 13px/1 var(--font-mono); color: var(--text-dim); text-align: center; }
.ml-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.ml-row { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
.ml-keep { font: 600 12px/1 var(--font-sans); color: var(--text); padding: 4px 0; }
.ml-why { font-size: 12px; color: var(--text-2); }
.ml-stats { display: flex; flex-wrap: wrap; gap: 4px; }
.ml-pick { margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-soft); font-size: 12px; }
.ml-pick b { color: var(--text); }
.ml-foot { margin-top: 8px; }
@media (max-width: 760px) {
    .ml-opt { grid-template-columns: 22px minmax(0, 1fr); }
    .ml-opt .ml-act { grid-column: 2; justify-self: start; }
}`;

    function thumbs(ids) {
        const l = L();
        if (!ids.length) return '<span class="ml-keep">Keep all 7</span>';
        return `<span class="lab-thumbs">${ids.map(id => l.thumb(id)).join('')}</span>`;
    }

    function statPills(r, pkg) {
        const l = L();
        const miss = r.missAny;
        const out = [
            `<span class="lab-pill" title="Average printed cost you got onto the table on turns 1–4 (Shift and sung Songs count at full cost). Ink actually paid: ${r.paid.toFixed(1)}.">Ink used <b class="lab-mono">${r.mean.toFixed(1)}</b></span>`,
            `<span class="lab-pill ${miss >= 0.25 ? 'is-bad' : miss >= 0.1 ? 'is-warn' : 'is-good'}" title="Chance to have no inkable card in hand on at least one of turns 1–4">Missed ink by T4 <b class="lab-mono">${l.pct(miss)}</b></span>`
        ];
        if (pkg.plan) {
            const p = r.plan;
            out.push(`<span class="lab-pill ${p >= 0.7 ? 'is-good' : p >= 0.45 ? 'is-warn' : 'is-bad'}" title="Chance to have seen ${l.esc(pkg.plan)} by turn ${pkg.planTurn} (opening hand, redraws and draw steps)">Plan by T${pkg.planTurn} <b class="lab-mono">${l.pct(p)}</b></span>`);
        }
        if (r.tied && r.rank > 1) out.push('<span class="lab-pill is-good" title="Within the noise of the best option (paired games, 2 standard errors)">≈ best</span>');
        return out.join('');
    }

    function optionRow(r, pkg, cardDB) {
        const l = L();
        return `<div class="ml-opt" data-key="${l.esc(r.key)}">
            <span class="ml-rank">${r.rank}</span>
            <div class="ml-main">
                <div class="ml-row">${thumbs(r.thrown)}<span class="ml-stats">${statPills(r, pkg)}</span></div>
                <div class="ml-why">${l.esc(why(r, cardDB))}</div>
            </div>
            <button type="button" class="lab-btn-act ml-act" data-mark="${l.esc(r.key)}" title="Mark these cards in the hand above (you still confirm the mulligan yourself)">Mark this</button>
        </div>`;
    }

    function notes(inp) {
        const out = [];
        if (inp.handSize < MAX_OPENER) out.push(`Your hand has ${inp.handSize} card${inp.handSize === 1 ? '' : 's'}, not 7 — graded with what you have.`);
        if (inp.handSize > MAX_OPENER) out.push(`Your hand has ${inp.handSize} cards. Only the first 7 can be mulliganed; the other ${inp.handSize - MAX_OPENER} stay in hand in every game.`);
        if (inp.unknownHand || inp.unknownDeck) {
            const where = [inp.unknownHand ? `${inp.unknownHand} in hand` : '', inp.unknownDeck ? `${inp.unknownDeck} in deck` : ''].filter(Boolean).join(', ');
            out.push(`Unknown cards (${where}) are treated as blank inkable cards whose cost is unknown: they can be inked but are never played, so ink numbers are rough.`);
        }
        if (inp.midGame) out.push('Graded as if the game were starting now.');
        return out;
    }

    function startGrade(el, ctx, inp, key, u) {
        if (running) running.cancelled = true;
        const app = ctx.app;
        const t0 = now();
        const j = job(inp, { cardDB: app.cardDB, onPlay: inp.onPlay, plan: u.plan, planTurn: u.planTurn, sims: SIMS, seed: SEED });
        const run = { key, job: j, cancelled: false };
        running = run;
        const refresh = ctx.refresh;
        const pump = () => {
            if (run.cancelled) return;
            const s = now();
            while (!j.results && now() - s < 15) j.step(1);
            const bar = el.querySelector('.ml-bar > i');
            const txt = el.querySelector('.ml-prog-txt');
            if (bar) bar.style.width = Math.round(100 * j.done / j.total) + '%';
            if (txt) txt.textContent = `${j.done} / ${j.total}`;
            if (j.results) {
                const byKey = new Map(j.results.map(r => [r.key, r]));
                cache.set(key, { results: j.results, byKey, ms: now() - t0, plan: u.plan, planTurn: u.planTurn, onPlay: inp.onPlay, sims: j.sims });
                while (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
                running = null;
                refresh();
            } else setTimeout(pump, 0);
        };
        setTimeout(pump, 0);
    }

    function renderTop(top, el, ctx, inp, key, u, pkg) {
        const l = L(), app = ctx.app;
        const choices = planChoices(inp, app.cardDB);
        const planOpts = ['<option value="">— none —</option>'].concat(choices.map(c =>
            `<option value="${l.esc(c.name)}"${c.name === u.plan ? ' selected' : ''}>${c.cost === 99 ? '?' : c.cost} · ${l.esc(c.name)}</option>`)).join('');
        const turnOpts = [2, 3, 4, 5].map(n => `<option value="${n}"${n === u.planTurn ? ' selected' : ''}>${n}</option>`).join('');
        const isRunning = running && running.key === key;
        const nNotes = notes(inp);
        let body = '';
        if (isRunning) {
            body = `<div class="ml-prog"><span class="lab-muted">Grading…</span><span class="ml-bar"><i style="width:${Math.round(100 * running.job.done / running.job.total)}%"></i></span><span class="ml-prog-txt lab-faint lab-mono">${running.job.done} / ${running.job.total}</span></div>`;
        } else if (pkg) {
            body = `<div class="ml-list">${pkg.results.slice(0, 5).map(r => optionRow(r, pkg, app.cardDB)).join('')}</div>
                <p class="lab-faint ml-foot">${pkg.results.length} ways to mulligan · ${pkg.sims} games each from the same shuffles · ${Math.round(pkg.ms)} ms.
                Ink used = total cost of what you got onto the table on turns 1–4 (Shift and sung Songs count at full cost).</p>`;
        }
        top.innerHTML = `
            <div class="ml-head"><h3 class="lab-h">Mulligan Lab</h3>
                <span class="lab-pill">${inp.onPlay ? 'On the play' : 'On the draw'}</span></div>
            <p class="lab-muted ml-sub">Which throw gives this hand the best curve on turns 1–4? Every way to mulligan these cards is played forward with a simple fixed policy (ink one card, then spend as much ink as possible). It ignores card text (abilities) for now — only Shift and Singer count.</p>
            <div class="ml-ctrl">
                <label>Plan card <select class="ml-plan" title="The card your game plan needs">${planOpts}</select></label>
                <label>by turn <select class="ml-turn" title="The turn your plan needs it by">${turnOpts}</select></label>
                <button type="button" class="lab-btn-act${pkg ? '' : ' is-primary'} ml-grade"${isRunning || pkg || !inp.handIds.length ? ' disabled' : ''}>
                    <i class="fa-solid ${pkg ? 'fa-check' : 'fa-flask'}"></i> ${pkg ? 'Graded' : 'Grade mulligans'}</button>
            </div>
            ${nNotes.map(n => `<p class="lab-faint ml-note">${l.esc(n)}</p>`).join('')}
            ${body}`;
        top.querySelector('.ml-plan').addEventListener('change', (e) => { u.plan = e.target.value; ctx.refresh(); });
        top.querySelector('.ml-turn').addEventListener('change', (e) => { u.planTurn = parseInt(e.target.value, 10) || 4; ctx.refresh(); });
        top.querySelector('.ml-grade').addEventListener('click', () => {
            if (pkg || (running && running.key === key)) return;
            startGrade(el, ctx, inp, key, u);
            ctx.refresh();
        });
        top.querySelectorAll('[data-mark]').forEach(btn => btn.addEventListener('click', () => {
            const r = pkg && pkg.byKey.get(btn.dataset.mark);
            if (!r) return;
            const a = ctx.app;
            // Read the hand fresh: the selection must name instances that are in it now.
            const cur = inputs(a.state, a.cardDB, inp.player);
            a.mulliganSelection = iidsFor(r.thrown, cur.handIds, cur.openerIids);
            a.renderMulliganCards();
        }));
    }

    function renderPick(pickEl, el, ctx, inp, info, pkg) {
        const l = L();
        const mk = markedKey(info.marked, inp.handIds, inp.openerIids);
        el.querySelectorAll('.ml-opt').forEach(row => row.classList.toggle('is-current', mk != null && row.dataset.key === mk));
        if (!pkg) { pickEl.innerHTML = ''; return; }
        if (mk == null) {
            pickEl.innerHTML = '<span class="lab-muted">Your pick marks cards beyond the opening seven, so it isn\'t graded.</span>';
            return;
        }
        const r = pkg.byKey.get(mk);
        if (!r) { pickEl.innerHTML = ''; return; }
        const best = pkg.results[0];
        const what = r.thrown.length ? `throw ${r.thrown.length}` : 'keep all 7';
        const verdict = r.rank === 1 ? '<span class="lab-good">the best option</span>'
            : r.tied ? '<span class="lab-good">as good as the best within the noise</span>'
            : `<span class="${best.mean - r.mean < 0.75 ? 'lab-warn' : 'lab-bad'}">${(best.mean - r.mean).toFixed(1)} ink behind the best</span>`;
        pickEl.innerHTML = `<div>Your current pick (${l.esc(what)}) ranks <b>${ordinal(r.rank)} of ${pkg.results.length}</b> — ${verdict}.</div>
            <div class="ml-stats" style="margin-top:4px">${statPills(r, pkg)}</div>
            <div class="ml-why" style="margin-top:4px">${l.esc(why(r, ctx.app.cardDB))}</div>`;
    }

    function render(el, ctx, info) {
        const l = L();
        l.css('mulliganLab', CSS);
        const s = ctx.state;
        if (!s || !Array.isArray(s.players)) { el.innerHTML = '<p class="lab-muted">Start a game to use the Mulligan Lab.</p>'; el.dataset.sig = ''; return; }
        const player = (info && typeof info.player === 'number') ? info.player : ctx.me;
        if (!s.players[player]) return;
        const inp = inputs(s, ctx.app.cardDB || {}, player);
        const u = uiFor(player);
        const key = cacheKey(inp, u.plan, u.planTurn);
        const pkg = cache.get(key) || null;
        const status = running && running.key === key ? 'run' : pkg ? 'done' : 'idle';
        const sig = `${key}#${status}#${u.plan}#${u.planTurn}`;
        let top = el.querySelector('.ml-top'), pick = el.querySelector('.ml-pick');
        if (!top || !pick || el.dataset.sig !== sig) {
            if (!top || !pick) {
                el.innerHTML = '<div class="ml-top"></div><div class="ml-pick"></div>';
                top = el.querySelector('.ml-top');
                pick = el.querySelector('.ml-pick');
            }
            renderTop(top, el, ctx, inp, key, u, pkg);
            el.dataset.sig = sig;
        }
        pick.hidden = !pkg;
        renderPick(pick, el, ctx, inp, info || {}, pkg);
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = MulliganLabCore;
    root.MulliganLabCore = MulliganLabCore;
    if (root.DojoPlugins && typeof root.DojoPlugins.register === 'function') {
        root.DojoPlugins.register({
            id: 'mulliganLab',
            name: 'Mulligan Lab',
            icon: 'fa-solid fa-shuffle',
            description: 'Grades every way to mulligan your opening seven: curve on turns 1–4, missed ink, and your plan card.',
            defaultEnabled: true,
            order: 30,
            mulligan: { render },
            api: { core: MulliganLabCore }
        });
    }
})(typeof window !== 'undefined' ? window : globalThis);
