// Practice Dojo — Race Clock (Lab plugin, v3.0.0). Spec: mastery_lab/V3_PLAN.md §7.1.
//
// "Am I winning this race, or do I need to slow it down?"
// If nothing changes — everyone quests with everything every turn, nobody challenges,
// nothing new is played — who reaches 20 lore first, and on which turn?
//
// Pure logic lives in RaceClockCore (node-testable). The plugin at the bottom only reads
// App.state and draws. It never changes game data.
(function (root) {
    'use strict';

    const GOAL = 20;
    const MAX_LANES = 24;          // half-turns drawn at most
    const FAR = 1000;              // "never" when ranking clocks

    function lib() {
        if (root.DojoLab) return root.DojoLab;
        if (typeof require === 'function') { try { return require('./lab_lib.js'); } catch (e) { /* browser */ } }
        throw new Error('Race Clock needs lab_lib.js');
    }

    // Dojo turn numbers count rounds (player 0 goes first, `turn` ticks when player 0 is
    // active again). A "half" is one player's turn: half = 2·turn + activePlayer.
    const halfOf = (turn, active) => 2 * (turn || 1) + (active ? 1 : 0);
    const turnOfHalf = (h) => Math.floor(h / 2);
    const activeOfHalf = (h) => h % 2;

    const RaceClockCore = {
        GOAL,
        halfOf, turnOfHalf, activeOfHalf,

        // Can this character quest right now? Ready, dry, not Reckless.
        canQuest(c, db) {
            const L = lib();
            return !!db && L.isChar(db) && !L.kw(db, 'Reckless') && !c.exerted && !c.drying;
        },

        // Lore a player gains on a full turn: characters (Reckless can't quest) + Locations
        // (collected at the start of their owner's turn).
        rateOf(player, cardDB) {
            const L = lib();
            let r = 0;
            for (const c of (player && player.field) || []) {
                const db = cardDB[c.cardId];
                if (!db) continue;
                if (L.isChar(db) && !L.kw(db, 'Reckless')) r += L.questLore(db);
                else if (L.isLocation(db)) r += L.questLore(db);
            }
            return r;
        },

        // Lore the acting player can still quest for this turn (locations already paid out).
        availOf(player, cardDB) {
            let r = 0;
            for (const c of (player && player.field) || []) {
                const db = cardDB[c.cardId];
                if (RaceClockCore.canQuest(c, db)) r += lib().questLore(db);
            }
            return r;
        },

        // Just what compute() reads, deep enough to edit safely (no undo history copied).
        lite(state) {
            return {
                turn: state.turn,
                activePlayer: state.activePlayer,
                players: state.players.map(p => ({
                    id: p.id,
                    lore: p.lore || 0,
                    field: (p.field || []).map(c => ({
                        instanceId: c.instanceId, cardId: c.cardId,
                        exerted: !!c.exerted, drying: !!c.drying, damage: c.damage || 0
                    }))
                }))
            };
        },

        compute(state, cardDB, me) {
            const P = state.players;
            const act = state.activePlayer ? 1 : 0;
            if (me == null) me = act;
            const opp = 1 - me;
            const myTurn = act === me;
            const lore = [P[me].lore || 0, P[opp].lore || 0];
            const rate = [RaceClockCore.rateOf(P[me], cardDB), RaceClockCore.rateOf(P[opp], cardDB)];
            const availNow = RaceClockCore.availOf(P[act], cardDB);
            const h0 = halfOf(state.turn, act);

            // turns needed, counting the turn in progress as 1 for whoever is acting
            const side = (i) => {
                const isAct = (i === 0) === myTurn;
                const L = lore[i], r = rate[i];
                let k;
                if (L >= GOAL) k = 0;
                else if (isAct) k = L + availNow >= GOAL ? 1 : (r > 0 ? 1 + Math.ceil((GOAL - L - availNow) / r) : null);
                else k = r > 0 ? Math.ceil((GOAL - L) / r) : null;
                const half = k == null ? null : k === 0 ? h0 : (isAct ? h0 + 2 * (k - 1) : h0 + 1 + 2 * (k - 1));
                return { k, half };
            };
            const s = [side(0), side(1)];
            const turnsTo20 = [s[0].k, s[1].k];
            const finishHalf = [s[0].half, s[1].half];
            const finishTurn = finishHalf.map(h => h == null ? null : turnOfHalf(h));
            const done = lore[0] >= GOAL || lore[1] >= GOAL;

            let winner = null;
            if (done) winner = lore[0] >= lore[1] ? me : opp;
            else if (finishHalf[0] != null || finishHalf[1] != null) {
                winner = finishHalf[1] == null || (finishHalf[0] != null && finishHalf[0] < finishHalf[1]) ? me : opp;
            }
            // margin in half-turns, + = good for me; null when the loser never gets there
            const margin = (done || winner == null || finishHalf[0] == null || finishHalf[1] == null) ? null : finishHalf[1] - finishHalf[0];
            // how many of the loser's turns short they fall
            const spare = margin == null ? null : Math.ceil(Math.abs(margin) / 2);
            let verdict;
            if (winner == null) verdict = 'stalled';
            else if (winner === me) verdict = margin == null || margin >= 3 ? 'ahead' : 'narrow';
            else verdict = margin == null || margin <= -3 ? 'behind' : 'close';

            // both lanes, turn by turn, until someone reaches 20
            const lanes = [];
            if (!done) {
                const cur = lore.slice();
                const limit = winner == null ? 4 : MAX_LANES;
                for (let i = 0; i < limit && cur[0] < GOAL && cur[1] < GOAL; i++) {
                    const h = h0 + i;
                    const who = activeOfHalf(h);
                    const idx = who === me ? 0 : 1;
                    const gain = i === 0 ? availNow : rate[idx];
                    cur[idx] += gain;
                    lanes.push({ turn: turnOfHalf(h), active: who, gain, lore: cur.slice() });
                }
            }

            return {
                me, opp, myTurn, active: act, turn: state.turn || 1, half: h0,
                lore, rate, availNow, turnsTo20, finishHalf, finishTurn,
                winner, margin, spare, verdict, done, lanes
            };
        },

        // How good a clock is for `me`, as a key compared left to right (bigger = better).
        // Winner first. When you win, finishing sooner matters most (race); when they win,
        // pushing their finish later matters most (slow them down).
        key(clock) {
            const [fm, fo] = clock.finishHalf;
            const far = clock.half + FAR;
            if (clock.winner == null) return [1, 0, 0];
            if (clock.winner === clock.me) return [2, -(fm == null ? far : fm), (fo == null ? far : fo)];
            return [0, (fo == null ? far : fo), -(fm == null ? far : fm)];
        },
        // > 0 when clock a is better for `me` than clock b, < 0 when worse, 0 when equal.
        compare(a, b) {
            const ka = RaceClockCore.key(a), kb = RaceClockCore.key(b);
            for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] > kb[i] ? 1 : -1;
            return 0;
        },
        // Tiebreak when the finish turns don't move: lore-per-turn difference.
        edge(clock) { return clock.rate[0] - clock.rate[1]; },

        // What each available action does to the clock (active player only).
        // outcome(aIid, dIid) → App.challengeOutcome-shaped object.
        actions(state, cardDB, outcome) {
            const L = lib();
            const act = state.activePlayer ? 1 : 0, other = 1 - act;
            const base = RaceClockCore.compute(state, cardDB, act);
            const bEdge = RaceClockCore.edge(base);
            const rowOf = (row, after) => Object.assign(row, {
                after, delta: RaceClockCore.compare(after, base), edgeDelta: RaceClockCore.edge(after) - bEdge
            });
            const find = (s, pi, iid) => s.players[pi].field.find(c => c.instanceId === iid);
            const drop = (s, pi, iid) => { const f = s.players[pi].field; const i = f.findIndex(c => c.instanceId === iid); if (i >= 0) f.splice(i, 1); };

            const mine = state.players[act].field || [];
            const theirs = state.players[other].field || [];

            const quests = [];
            for (const c of mine) {
                const db = cardDB[c.cardId];
                if (!RaceClockCore.canQuest(c, db)) continue;
                const lore = L.questLore(db);
                const s = RaceClockCore.lite(state);
                s.players[act].lore += lore;
                find(s, act, c.instanceId).exerted = true;
                // and the price of holding it back instead
                const h = RaceClockCore.lite(state);
                find(h, act, c.instanceId).exerted = true;
                const row = rowOf({ kind: 'quest', iid: c.instanceId, cardId: c.cardId, lore }, RaceClockCore.compute(s, cardDB, act));
                row.ifSkipped = RaceClockCore.compute(h, cardDB, act);
                quests.push(row);
            }

            const challenges = [];
            const attackers = mine.filter(c => {
                const db = cardDB[c.cardId];
                return L.isChar(db) && !c.exerted && (!c.drying || L.kw(db, 'Rush'));
            });
            const targets = theirs.filter(c => { const db = cardDB[c.cardId]; return L.isChar(db) || L.isLocation(db); });
            const guards = targets.filter(c => { const db = cardDB[c.cardId]; return L.isChar(db) && c.exerted && L.kw(db, 'Bodyguard'); });
            for (const a of attackers) {
                const aDb = cardDB[a.cardId];
                for (const d of targets) {
                    const dDb = cardDB[d.cardId];
                    const o = outcome(a.instanceId, d.instanceId);
                    if (!o) continue;
                    // Rules the sandbox doesn't enforce, from keywords only.
                    let why = null;
                    if (L.isChar(dDb) && !d.exerted) why = 'ready';
                    else if (L.isChar(dDb) && L.kw(dDb, 'Evasive') && !L.kw(aDb, 'Evasive')) why = 'evasive';
                    else if (L.isChar(dDb) && !L.kw(dDb, 'Bodyguard') && guards.some(g => !(L.kw(cardDB[g.cardId], 'Evasive') && !L.kw(aDb, 'Evasive')))) why = 'bodyguard';
                    const s = RaceClockCore.lite(state);
                    find(s, act, a.instanceId).exerted = true;
                    if (o.aDies) drop(s, act, a.instanceId);
                    if (o.dDies) drop(s, other, d.instanceId);
                    challenges.push(rowOf({
                        kind: 'challenge', aIid: a.instanceId, dIid: d.instanceId, aId: a.cardId, dId: d.cardId,
                        o, legal: !why, why,
                        loses: RaceClockCore.canQuest(a, aDb) ? L.questLore(aDb) : 0,   // the quest it gives up
                        removes: o.dDies ? L.questLore(dDb) : 0,
                        lost: o.aDies ? L.questLore(aDb) : 0
                    }, RaceClockCore.compute(s, cardDB, act)));
                }
            }
            const byBest = (x, y) => RaceClockCore.compare(y.after, x.after) || (y.edgeDelta - x.edgeDelta);
            quests.sort(byBest);
            challenges.sort(byBest);
            return { base, quests, challenges };
        }
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = RaceClockCore;

    // ------------------------------------------------------------------ plugin ---------

    if (!root.DojoPlugins) return;
    const H = root.DojoPlugins;
    const L = lib();
    const esc = L.esc;

    L.css('raceClock', `
.rc-chip .rc-dot { font-size: 10px; }
.rc-chip.rc-good { color: var(--ok); border-color: color-mix(in oklch, var(--ok) 45%, var(--border)); }
.rc-chip.rc-warn { color: var(--lvi); border-color: color-mix(in oklch, var(--lvi) 45%, var(--border)); }
.rc-chip.rc-bad { color: var(--danger); border-color: color-mix(in oklch, var(--danger) 45%, var(--border)); }
.rc-chip.rc-wait { color: var(--accent); border-style: dashed; }
.lab-big.rc-good-t { color: var(--ok); } .lab-big.rc-warn-t { color: var(--lvi); } .lab-big.rc-bad-t { color: var(--danger); }
.rc-sentence { margin: 0 0 8px; color: var(--text-2); }
.rc-c0 { --rc-col: var(--p1); } .rc-c1 { --rc-col: var(--p2); }
.rc-stats { display: grid; grid-template-columns: auto 1fr 1fr; gap: 2px 10px; font-size: 12px; align-items: baseline; }
.rc-stats .rc-hd { font: 600 10px/1.2 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--text-faint); }
.rc-stats .rc-k { color: var(--text-dim); }
.rc-stats .rc-v { font-family: var(--font-mono); color: var(--text); }
.rc-lanes { display: flex; flex-direction: column; gap: 3px; }
.rc-row { display: grid; grid-template-columns: 34px 40px 1fr 46px; gap: 6px; align-items: center; font-size: 11px; }
.rc-row .rc-t { font-family: var(--font-mono); color: var(--text-dim); }
.rc-row .rc-who { color: var(--text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rc-row.is-now .rc-t, .rc-row.is-now .rc-who { color: var(--text); font-weight: 600; }
.rc-row .rc-n { font-family: var(--font-mono); text-align: right; color: var(--text-2); white-space: nowrap; }
.rc-bars { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.rc-bar { position: relative; height: 5px; border-radius: 3px; background: var(--surface-3); overflow: hidden; }
.rc-bar > i { position: absolute; inset: 0 auto 0 0; background: var(--rc-col); opacity: .45; border-radius: 3px; }
.rc-bar.is-gain > i { opacity: 1; }
.rc-bar.is-goal { box-shadow: 0 0 0 1px var(--rc-col); }
.rc-legend { display: flex; gap: 12px; flex-wrap: wrap; font-size: 11px; color: var(--text-dim); margin: 0 0 6px; }
.rc-legend b { display: inline-block; width: 10px; height: 5px; border-radius: 3px; background: var(--rc-col); margin-right: 4px; vertical-align: middle; }
.rc-acts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.rc-act { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: center; padding: 6px 8px; border: 1px solid var(--border-soft); border-radius: var(--radius-sm); background: var(--surface-2); }
.rc-act-cards { display: flex; align-items: center; gap: 2px; color: var(--text-faint); font-size: 10px; }
.rc-act-title { color: var(--text); font-weight: 600; font-size: 12px; }
.rc-act-body { min-width: 0; }
.rc-act-body .lab-muted { font-size: 11px; }
.rc-act-clock { font-family: var(--font-mono); font-size: 11px; color: var(--text-2); }
.rc-more { margin-top: 6px; }
.rc-more > summary { cursor: pointer; color: var(--text-dim); font-size: 12px; padding: 4px 0; }
.rc-note { margin: 4px 0 0; }
.rc-wait-box { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
@media (max-width: 760px) { .rc-row { grid-template-columns: 30px 34px 1fr 42px; } .rc-act { grid-template-columns: auto 1fr; } .rc-act > .lab-pill { grid-column: 2; justify-self: start; } }
`);

    const TONE = { ahead: 'good', narrow: 'good', close: 'warn', behind: 'bad', stalled: '' };
    const nameOf = (id) => L.shortName(root.App && root.App.cardDB && root.App.cardDB[id]);
    const T = (n) => n == null ? 'never' : 'T' + n;
    const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

    function clockOf(ctx) { return RaceClockCore.compute(ctx.state, ctx.app.cardDB, ctx.me); }

    function briefingPending(ctx) {
        const b = H.api('briefing');
        return !!(b && typeof b.pending === 'function' && b.pending(ctx));
    }

    // Headline + one sentence, in plain words.
    function headline(c) {
        const [fm, fo] = c.finishTurn;
        if (c.done) return c.winner === c.me
            ? { big: 'You have 20 lore', line: 'You’ve reached 20. That’s the game.' }
            : { big: 'They have 20 lore', line: 'Your opponent has reached 20. That’s the game.' };
        switch (c.verdict) {
            case 'ahead': return { big: 'You’re ahead', line: fo == null
                ? `If nothing changes, you reach 20 on your turn ${fm}. They have no lore coming in.`
                : `If nothing changes, you reach 20 on your turn ${fm}. They’d need until their turn ${fo}. Keep racing.` };
            case 'narrow': return { big: 'You’re ahead, just', line: `You reach 20 on your turn ${fm}, one turn before they would (their turn ${fo}). One lost quest and it flips.` };
            case 'close': return { big: 'They’re ahead, just', line: `They reach 20 on their turn ${fo}; you’d get there on your turn ${fm}. Take away one quest of theirs, or add one of yours, and it flips.` };
            case 'behind': return { big: 'They’re ahead', line: fm == null
                ? `If nothing changes, they reach 20 on their turn ${fo} and you have no lore coming in. Slow them down.`
                : `If nothing changes, they reach 20 on their turn ${fo}. You’d need until your turn ${fm}. Slow them down.` };
            default: return { big: 'Nobody is racing yet', line: 'Neither side has lore coming in. The race starts when someone puts a character down.' };
        }
    }

    function chipHtml(c, pending) {
        if (pending) return `<button type="button" class="lab-chip rc-chip rc-wait" title="Race Clock is hidden until you answer this turn’s briefing">
            <span class="rc-dot">◆</span><span>Briefing first</span></button>`;
        const tone = TONE[c.verdict];
        let short, long = '';
        if (c.done) short = c.winner === c.me ? 'You reached 20' : 'Opp reached 20';
        else if (c.verdict === 'stalled') { short = 'Stalled'; long = '· no lore coming in'; }
        else {
            const meWins = c.winner === c.me;
            short = (meWins ? 'You win' : 'Opp wins') + ' · T' + c.finishTurn[meWins ? 0 : 1];
            long = c.spare == null ? '· they can’t finish' : (meWins ? '· +' : '· −') + plural(c.spare, 'turn');
            if (!meWins && c.spare == null) long = '· you can’t finish';
        }
        return `<button type="button" class="lab-chip rc-chip${tone ? ' rc-' + tone : ''}" title="Race Clock: if nothing changes. Click for details.">
            <span class="rc-dot">◆</span><span>${esc(short)}</span>${long ? `<span class="lab-chip-long">${esc(long)}</span>` : ''}</button>`;
    }

    function lanesHtml(c, names) {
        if (c.done) return '';
        if (!c.lanes.length) return '';
        const pi = [c.me, c.opp];
        const w = (n) => Math.min(100, Math.round(Math.max(0, n) / GOAL * 100));
        const rows = c.lanes.map((l, i) => {
            const whoIdx = l.active === c.me ? 0 : 1;
            const bar = (k) => `<div class="rc-bar rc-c${pi[k]}${k === whoIdx && l.gain ? ' is-gain' : ''}${l.lore[k] >= GOAL ? ' is-goal' : ''}"><i style="width:${w(l.lore[k])}%"></i></div>`;
            const cap = (n) => n >= GOAL ? '20' : String(n);
            return `<div class="rc-row${i === 0 ? ' is-now' : ''}">
                <span class="rc-t">T${l.turn}</span><span class="rc-who"${i === 0 ? ' title="This turn"' : ''}>${whoIdx === 0 ? 'You' : 'Opp'}</span>
                <div class="rc-bars">${bar(0)}${bar(1)}</div>
                <span class="rc-n">${cap(l.lore[0])}·${cap(l.lore[1])}</span></div>`;
        }).join('');
        const tail = c.verdict === 'stalled' ? '<p class="lab-faint rc-note">Nobody gains lore, so the lanes stay flat.</p>' : '';
        return `<div class="lab-section"><h4 class="lab-h">Turn by turn to 20</h4>
            <div class="rc-legend"><span class="rc-c${pi[0]}"><b></b>${esc(names[0])} (you)</span><span class="rc-c${pi[1]}"><b></b>${esc(names[1])}</span></div>
            <div class="rc-lanes">${rows}</div>${tail}</div>`;
    }

    function changeText(base, after) {
        const part = (who, k) => {
            const a = base.finishTurn[k], b = after.finishTurn[k];
            return a === b && base.finishHalf[k] === after.finishHalf[k] ? `${who} ${T(a)}` : `${who} ${T(a)}→${T(b)}`;
        };
        return `${part('You', 0)} · ${part('Opp', 1)}`;
    }
    function pill(row) {
        if (row.delta > 0) return '<span class="lab-pill is-good">Better</span>';
        if (row.delta < 0) return '<span class="lab-pill is-bad">Worse</span>';
        if (row.edgeDelta > 0) return '<span class="lab-pill is-good">Helps a bit</span>';
        if (row.edgeDelta < 0) return '<span class="lab-pill is-warn">Costs a bit</span>';
        return '<span class="lab-pill">No change</span>';
    }
    const WHY = {
        ready: 'they’re ready (you can only challenge exerted characters)',
        evasive: 'Evasive: only an Evasive character can challenge it',
        bodyguard: 'an exerted Bodyguard must be challenged first'
    };
    function questRow(r, base) {
        const n = nameOf(r.cardId);
        const skip = r.ifSkipped;
        const skipTxt = skip.finishHalf[0] === base.finishHalf[0] ? 'Holding it back doesn’t change your finish.' : `Holding it back: you’d finish ${T(skip.finishTurn[0])} instead of ${T(base.finishTurn[0])}.`;
        return `<li class="rc-act"><div class="rc-act-cards">${L.thumb(r.cardId)}</div>
            <div class="rc-act-body"><div class="rc-act-title">Quest with ${esc(n)} (+${r.lore})</div>
            <div class="lab-muted">Already counted: the clock assumes you quest. ${esc(skipTxt)}</div>
            <div class="rc-act-clock">${esc(changeText(base, r.after))}</div></div>${pill(r)}</li>`;
    }
    function challengeRow(r, base) {
        const o = r.o, a = nameOf(r.aId), d = nameOf(r.dId);
        const bits = [];
        if (o.dDies) bits.push(`Banishes ${d}` + (r.removes ? ` (−${r.removes} lore a turn for them)` : ''));
        else bits.push(`${d} takes ${o.toDef} (${o.dAfter}/${o.dW})`);
        if (o.aDies) bits.push(`you lose ${a}` + (r.lost ? ` (−${r.lost} a turn)` : ''));
        else if (o.toAtt) bits.push(`${a} takes ${o.toAtt} (${o.aAfter}/${o.aW})`);
        if (r.loses && !o.aDies) bits.push(`${a} can’t quest this turn (−${r.loses})`);
        if (r.why) bits.push('Not legal: ' + WHY[r.why]);
        return `<li class="rc-act"><div class="rc-act-cards">${L.thumb(r.aId)}<span>→</span>${L.thumb(r.dId)}</div>
            <div class="rc-act-body"><div class="rc-act-title">${esc(a)} challenges ${esc(d)}</div>
            <div class="lab-muted">${esc(bits.join(' · '))}</div>
            <div class="rc-act-clock">${esc(changeText(base, r.after))}</div></div>${pill(r)}</li>`;
    }

    function actionsHtml(ctx, c) {
        if (c.done) return '';
        const app = ctx.app;
        const outcome = (a, d) => (app && typeof app.challengeOutcome === 'function') ? app.challengeOutcome(a, d) : null;
        const res = RaceClockCore.actions(ctx.state, app.cardDB, outcome);
        const legal = res.challenges.filter(r => r.legal);
        const sandbox = res.challenges.filter(r => !r.legal);
        if (!res.quests.length && !res.challenges.length) {
            return `<div class="lab-section"><h4 class="lab-h">What each action does to the clock</h4>
                <p class="lab-muted">None of your characters can quest or challenge right now.</p></div>`;
        }
        const SHOW = 6;
        const list = (rows, fn) => {
            const head = rows.slice(0, SHOW).map(r => fn(r, res.base)).join('');
            const rest = rows.slice(SHOW);
            return `<ul class="rc-acts">${head}</ul>` + (rest.length ? `<details class="rc-more"><summary>${rest.length} more</summary><ul class="rc-acts">${rest.map(r => fn(r, res.base)).join('')}</ul></details>` : '');
        };
        let h = `<div class="lab-section"><h4 class="lab-h">What each action does to the clock</h4>`;
        h += `<p class="lab-faint rc-note" style="margin:0 0 6px">Best first. “You T7→T8” means the turn you’d reach 20 moves from 7 to 8.</p>`;
        if (legal.length) h += `<p class="lab-muted" style="margin:6px 0 4px">Challenges</p>` + list(legal, challengeRow);
        else if (res.challenges.length === 0) h += `<p class="lab-muted">No challenges available: you need a ready, dry character and a target.</p>`;
        else h += `<p class="lab-muted">No legal challenges right now: none of their characters is exerted.</p>`;
        if (res.quests.length) h += `<p class="lab-muted" style="margin:10px 0 4px">Quests</p>` + list(res.quests, questRow);
        if (sandbox.length) h += `<details class="rc-more"><summary>${sandbox.length} challenge${sandbox.length === 1 ? '' : 's'} the sandbox allows but the rules don’t</summary>
            <ul class="rc-acts">${sandbox.map(r => challengeRow(r, res.base)).join('')}</ul></details>`;
        h += `</div>`;
        return h;
    }

    function statsHtml(c) {
        const cell = (v) => `<span class="rc-v">${v == null ? '—' : v}</span>`;
        const turns = (k) => k == null ? 'can’t' : String(k);
        return `<div class="rc-stats">
            <span></span><span class="rc-hd">You</span><span class="rc-hd">Opponent</span>
            <span class="rc-k">Lore</span>${cell(c.lore[0])}${cell(c.lore[1])}
            <span class="rc-k">Lore a turn</span>${cell(c.rate[0])}${cell(c.rate[1])}
            <span class="rc-k">Can quest now</span>${cell(c.myTurn ? c.availNow : '—')}${cell(c.myTurn ? '—' : c.availNow)}
            <span class="rc-k">Turns to 20</span>${cell(turns(c.turnsTo20[0]))}${cell(turns(c.turnsTo20[1]))}
            <span class="rc-k">Reaches 20</span>${cell(T(c.finishTurn[0]))}${cell(T(c.finishTurn[1]))}
        </div>`;
    }

    function panelHtml(ctx) {
        if (briefingPending(ctx)) {
            return `<div class="lab-section rc-wait-box"><div class="lab-big">Answer the briefing first</div>
                <p class="lab-muted" style="margin:0">The Race Clock is hidden until you’ve made your own call on this turn.</p>
                <button type="button" class="lab-btn-act is-primary" data-rc="brief"><i class="fa-solid fa-clipboard-question"></i> Open the briefing</button></div>`;
        }
        const c = clockOf(ctx);
        const P = ctx.state.players;
        const names = [P[c.me] && P[c.me].name || 'You', P[c.opp] && P[c.opp].name || 'Opponent'];
        const hd = headline(c);
        const tone = TONE[c.verdict];
        return `<div class="lab-section">
                <div class="lab-big${tone ? ' rc-' + tone + '-t' : ''}">${esc(hd.big)}</div>
                <p class="rc-sentence">${esc(hd.line)}</p>
                ${statsHtml(c)}
                <p class="lab-faint rc-note">“You” is the player whose turn it is. This assumes nothing changes: everyone quests with every character every turn, nobody challenges, nothing new is played. It is a clock, not a prediction.</p>
            </div>
            ${lanesHtml(c, names)}
            ${actionsHtml(ctx, c)}
            <div class="lab-section"><p class="lab-faint" style="margin:0">Counts printed lore only. Reckless characters can’t quest. Locations pay out at the start of their owner’s turn (add it with the lore buttons). Abilities that gain lore aren’t counted yet.</p></div>`;
    }

    // Build a wrapper once, swap its HTML only when it changed (keeps <details> open).
    function paint(el, cls, html, onClick) {
        let wrap = el.querySelector(':scope > .' + cls);
        if (!wrap) {
            el.innerHTML = '';
            wrap = document.createElement('div');
            wrap.className = cls;
            wrap.addEventListener('click', onClick);
            el.appendChild(wrap);
        }
        if (wrap._html !== html) { wrap.innerHTML = html; wrap._html = html; }
    }

    H.register({
        id: 'raceClock',
        name: 'Race Clock',
        icon: 'fa-solid fa-stopwatch',
        description: 'If nothing changes, who reaches 20 lore first, and on which turn?',
        defaultEnabled: true,
        order: 10,
        topbar: {
            render(el, ctx) {
                const pending = briefingPending(ctx);
                paint(el, 'rc-chip-wrap', chipHtml(pending ? null : clockOf(ctx), pending), () => {
                    H.openDrawer(briefingPending({ state: root.App && root.App.state }) ? 'briefing' : 'raceClock');
                });
            }
        },
        panel: {
            render(el, ctx) {
                paint(el, 'rc-panel', panelHtml(ctx), (e) => {
                    const b = e.target.closest('[data-rc]');
                    if (b && b.dataset.rc === 'brief') H.openDrawer('briefing');
                });
            }
        },
        api: {
            // compute(state, me) or compute(state, cardDB, me)
            compute(state, a, b) {
                if (a && typeof a === 'object') return RaceClockCore.compute(state, a, b);
                return RaceClockCore.compute(state, root.App.cardDB, a);
            },
            core: RaceClockCore
        }
    });
})(typeof window !== 'undefined' ? window : globalThis);
