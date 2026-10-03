// Practice Dojo — Game Ledger (Lab plugin, v3.0.0). "Who has more useful resources remaining?"
//
// Reads the action journal (state.ext.journal.events) and keeps the books: per player-turn
// tempo (lore gained, ink developed), card advantage (cards drawn beyond the draw step,
// value removed / lost), the race lead after every turn and its turning points, and a
// receipt for every card that hit the board. Read-only: never touches game data.
//
// Card facts come from structured fields only (cost, lore, type, keywords). "Value" is the
// printed ink cost — a stand-in until the classifier can judge what a card actually does.
(function (root) {
    'use strict';

    function L() {
        if (root.DojoLab) return root.DojoLab;
        if (typeof require === 'function') { try { return require('./lab_lib.js'); } catch (e) { /* browser */ } }
        return {};
    }

    const BOARD_TYPES = { Character: 1, Item: 1, Location: 1 };
    const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;
    const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n);

    // ---------------------------------------------------------------------------------
    // Pure logic
    // ---------------------------------------------------------------------------------

    const LedgerCore = {
        // build(events, cardDB) → { turns, turningPoints, receipts, latest, startsAt }
        //   turns: one per finished player-turn (a `turnEnd` in the journal), oldest first.
        //   lead = (lore + 2 × lore-per-turn) of player 0 minus player 1 at the end of the turn.
        //   lore-per-turn = printed lore of that player's characters (not Reckless) and
        //   locations in play, as tracked from the journal (or turnEnd.boardLore if the host
        //   ever provides it).
        build(events, cardDB) {
            const lib = L();
            events = Array.isArray(events) ? events : [];
            const db = (id) => (cardDB && id != null && cardDB[id]) || null;
            const val = (id) => lib.cost ? lib.cost(db(id)) : ((db(id) || {}).cost || 0);
            const key = (t, a) => lib.turnKey ? lib.turnKey(t, a) : `${t}-${a}`;

            const turns = [];
            const newSeg = () => ({ lore: 0, drawn: 0, developed: 0, removed: 0, lost: 0, removedCards: [], lostCards: [] });
            let seg = newSeg();
            const segByChallenge = {};               // challenge seq -> segment it happened in

            // what's in play, per player: iid -> receipt
            const inPlay = [new Map(), new Map()];
            const receipts = [];
            const lastChallenge = {};                 // iid -> challenge event (still pending a banish)
            let curKey = null;

            const receiptFor = (iid, cardId, owner, e) => {
                const p = owner === 1 ? 1 : 0;
                let r = inPlay[p].get(iid);
                if (r) return r;
                for (const q of [0, 1]) { const x = inPlay[q].get(iid); if (x) return x; }
                // A card already in play before the journal began (imported game).
                r = mkReceipt(iid, cardId, p, null, null);
                inPlay[p].set(iid, r);
                receipts.push(r);
                return r;
            };
            const mkReceipt = (iid, cardId, owner, turnIn, keyIn) => ({
                iid, cardId, name: lib.shortName ? lib.shortName(db(cardId)) : String(cardId), owner,
                turnIn, keyIn, turnsSurvived: 0, quests: 0, lore: 0, challenges: 0, challenged: 0,
                kills: [], removedValue: 0, how: 'in play', keyOut: null, value: 0
            });
            const leave = (iid, how, k) => {
                for (const p of [0, 1]) {
                    const r = inPlay[p].get(iid);
                    if (r) { r.how = how; r.keyOut = k; inPlay[p].delete(iid); return r; }
                }
                return null;
            };

            let firstTurn = null;
            for (let i = 0; i < events.length; i++) {
                const e = events[i];
                if (firstTurn == null && e.turn != null) firstTurn = e.turn;
                const act = e.active;
                curKey = key(e.turn, act);
                switch (e.kind) {
                    case 'turnStart': break;
                    case 'play': case 'shift': {
                        const d = db(e.cardId);
                        if (e.player === act && d && BOARD_TYPES[d.type]) seg.developed += val(e.cardId);
                        if (!d || !BOARD_TYPES[d.type]) break;              // Actions / Songs don't stay
                        const p = e.player === 1 ? 1 : 0;
                        if (e.kind === 'shift') {
                            // The shifted card goes on top of a same-name character; that one's receipt ends.
                            for (const [iid, r] of inPlay[p]) {
                                const bd = db(r.cardId);
                                if (iid !== e.iid && bd && d && bd.name === d.name && bd.type === 'Character') { leave(iid, 'shifted over', curKey); break; }
                            }
                        }
                        leave(e.iid, 'left', curKey);                        // replayed from somewhere: new receipt
                        delete lastChallenge[e.iid];
                        const r = mkReceipt(e.iid, e.cardId, p, e.turn, curKey);
                        inPlay[p].set(e.iid, r);
                        receipts.push(r);
                        break;
                    }
                    case 'quest': {
                        const r = receiptFor(e.iid, e.cardId, e.player, e);
                        r.quests++; r.lore += e.lore || 0;
                        if (e.player === act) seg.lore += e.lore || 0;
                        break;
                    }
                    case 'lore':
                        if (e.player === act && (e.delta || 0) > 0) seg.lore += e.delta;
                        break;
                    case 'draw':
                        if (e.player === act) seg.drawn++;
                        break;
                    case 'challenge': {
                        const a = receiptFor(e.attIid, e.attId, act, e);
                        a.challenges++;
                        const dOwner = act === 1 ? 0 : 1;
                        const d = receiptFor(e.defIid, e.defId, dOwner, e);
                        d.challenged++;
                        lastChallenge[e.attIid] = e; lastChallenge[e.defIid] = e;
                        segByChallenge[e.seq] = seg;
                        break;
                    }
                    case 'banish': {
                        let target = seg;
                        const ch = e.via === 'challenge' ? lastChallenge[e.iid] : null;
                        if (ch) {
                            // Credit the kill to the other side of that challenge, and count the
                            // loss in the turn the challenge happened (the banish lands ~1s later).
                            target = segByChallenge[ch.seq] || seg;
                            const killerIid = ch.defIid === e.iid ? ch.attIid : ch.defIid;
                            const killer = [0, 1].map(p => inPlay[p].get(killerIid)).find(Boolean)
                                || receipts.slice().reverse().find(r => r.iid === killerIid);
                            if (killer) { killer.kills.push({ cardId: e.cardId, name: lib.shortName ? lib.shortName(db(e.cardId)) : '', value: val(e.cardId) }); killer.removedValue += val(e.cardId); }
                            delete lastChallenge[e.iid];
                        }
                        const segAct = ch ? ch.active : act;
                        if (e.player === segAct) { target.lost += val(e.cardId); target.lostCards.push(e.cardId); }
                        else { target.removed += val(e.cardId); target.removedCards.push(e.cardId); }
                        leave(e.iid, 'banished', ch ? key(ch.turn, ch.active) : curKey);
                        break;
                    }
                    case 'discard': leave(e.iid, 'discarded', curKey); break;
                    case 'leave': leave(e.iid, e.to === 'hand' ? 'returned to hand' : 'put into the deck', curKey); break;
                    case 'ink': leave(e.iid, 'inked', curKey); break;
                    case 'turnEnd': {
                        const player = e.player != null ? e.player : act;
                        for (const r of inPlay[player].values()) r.turnsSurvived++;
                        const rate = Array.isArray(e.boardLore) ? e.boardLore.slice()
                            : [0, 1].map(p => Array.from(inPlay[p].values()).reduce((s, r) => s + loreOf(lib, db(r.cardId)), 0));
                        const loreNow = Array.isArray(e.lore) ? e.lore.slice() : [0, 0];
                        // The segment object itself becomes the turn, so a challenge banish that
                        // lands after turnEnd still updates it.
                        const T = Object.assign(seg, {
                            key: key(e.turn, player), turn: e.turn, active: player,
                            end: {
                                lore: loreNow, hand: arr2(e.hand), board: arr2(e.board), deck: arr2(e.deck),
                                fieldChars: arr2(e.fieldChars), inkReady: e.inkReady, inkTotal: e.inkTotal
                            },
                            rate,
                            lead: (loreNow[0] + 2 * rate[0]) - (loreNow[1] + 2 * rate[1])
                        });
                        T.leadDelta = T.lead - (turns.length ? turns[turns.length - 1].lead : 0);
                        turns.push(T);
                        seg = newSeg();
                        break;
                    }
                    default: break;
                }
            }

            // Turning points: the 3 biggest race swings after turn 2 (ties → earlier turn).
            const turningPoints = turns.filter(T => T.turn > 2)
                .map((T, i) => ({ T, i }))
                .sort((a, b) => (Math.abs(b.T.leadDelta) - Math.abs(a.T.leadDelta)) || (a.i - b.i))
                .slice(0, 3)
                .filter(x => x.T.leadDelta !== 0)
                .map(x => x.T)
                .sort((a, b) => turns.indexOf(a) - turns.indexOf(b))
                .map(T => T.key);
            turns.forEach(T => { T.turningPoint = turningPoints.includes(T.key); });

            // Value created = lore quested + half the printed cost of what it banished.
            receipts.forEach(r => { r.value = r.lore + r.removedValue / 2; });
            const order = receipts.slice().sort((a, b) => (b.value - a.value) || (receipts.indexOf(a) - receipts.indexOf(b)));

            return {
                turns, turningPoints, receipts: order,
                latest: turns.length ? turns[turns.length - 1] : null,
                startsAt: firstTurn
            };
        },

        // Resources from the latest turnEnd: { hand, board, chars, lore, deck, verdict } —
        // verdict compares cards in hand and ink on the board, per side.
        resources(latest, names) {
            if (!latest) return null;
            const e = latest.end;
            const n = (p) => (names && names[p]) || `P${p + 1}`;
            const cmp = (a) => a[0] === a[1] ? -1 : (a[0] > a[1] ? 0 : 1);
            const h = cmp(e.hand), b = cmp(e.board);
            let verdict;
            if (h === -1 && b === -1) verdict = 'Even: same cards in hand, same ink on the board.';
            else if (h === b) verdict = `${n(h)} is ahead on both: more cards in hand and more ink on the board.`;
            else if (h === -1) verdict = `Same hand size; ${n(b)} has more ink on the board.`;
            else if (b === -1) verdict = `Same ink on the board; ${n(h)} has more cards in hand.`;
            else verdict = `Split: ${n(h)} has more cards in hand, ${n(b)} has more on the board.`;
            return { hand: e.hand, board: e.board, chars: e.fieldChars, lore: e.lore, deck: e.deck, verdict, key: latest.key, turn: latest.turn, active: latest.active };
        }
    };

    function arr2(a) { return Array.isArray(a) ? a.slice() : [0, 0]; }
    function loreOf(lib, d) {
        if (!d) return 0;
        if (d.type === 'Location') return d.lore || 0;
        if (d.type !== 'Character') return 0;
        if (lib.kw && lib.kw(d, 'Reckless')) return 0;
        return d.lore || 0;
    }

    // ---------------------------------------------------------------------------------
    // Panel
    // ---------------------------------------------------------------------------------

    let memo = { ref: null, len: -1, last: -1, db: null, out: null };
    const ui = { who: 'all', showAll: false, open: null };   // receipts filter, list length, expanded turn

    function ledgerOf(events, cardDB) {
        const last = events.length ? events[events.length - 1].seq : -1;
        if (memo.ref !== events || memo.len !== events.length || memo.last !== last || memo.db !== cardDB) {
            memo = { ref: events, len: events.length, last, db: cardDB, out: LedgerCore.build(events, cardDB) };
        }
        return memo.out;
    }

    const CSS = `
.ldg-table { table-layout: auto; }
.ldg-table th, .ldg-table td { white-space: nowrap; }
.ldg-table td.ldg-who { width: 1%; }
.ldg-table tr.ldg-row { cursor: pointer; }
.ldg-table tr.ldg-row:hover td { background: var(--surface-2); }
.ldg-table tr.is-tp td { background: color-mix(in oklch, var(--accent) 12%, transparent); }
.ldg-table tr.is-tp td:first-child { box-shadow: inset 3px 0 0 var(--accent); }
.ldg-table tr.ldg-detail td { white-space: normal; background: var(--surface-2); color: var(--text-2); font-size: 12px; }
.ldg-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
.ldg-dot.is-p1 { background: var(--p1); }
.ldg-dot.is-p2 { background: var(--p2); }
.ldg-scroll { overflow-x: auto; margin: 0 -2px; }
.ldg-res { display: grid; grid-template-columns: auto 1fr 1fr; gap: 4px 10px; font-size: 12px; align-items: baseline; }
.ldg-res .ldg-res-h { font: 600 11px/1.2 var(--font-sans); }
.ldg-res .num { font-family: var(--font-mono); color: var(--text); }
.ldg-res .is-more { font-weight: 700; }
.ldg-tps { margin: 6px 0 0; padding-left: 18px; font-size: 12px; }
.ldg-tps li { margin: 2px 0; }
.ldg-filter { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 6px; }
.ldg-filter .lab-btn-act.is-on { border-color: var(--accent); color: var(--accent-hi); }
.ldg-rcpts { list-style: none; margin: 0; padding: 0; }
.ldg-rcpt { display: grid; grid-template-columns: 28px 1fr auto; gap: 8px; align-items: center; padding: 6px 0; border-top: 1px solid var(--border-soft); }
.ldg-rcpt:first-child { border-top: 0; }
.ldg-rcpt-name { color: var(--text); font-size: 13px; overflow-wrap: anywhere; }
.ldg-rcpt-line { font-size: 11px; color: var(--text-dim); }
.ldg-rcpt-val { font: 700 14px/1 var(--font-mono); color: var(--text); text-align: right; }
.ldg-rcpt-val small { display: block; font: 400 10px/1.2 var(--font-sans); color: var(--text-faint); }
`;

    function render(el, ctx) {
        const lib = ctx.lib || L();
        lib.css && lib.css('ledger', CSS);
        const events = ctx.journal();
        const s = ctx.state || {};
        const names = (s.players || []).map((p, i) => (p && p.name) || `P${i + 1}`);
        const cardDB = (ctx.app && ctx.app.cardDB) || {};
        const nm = (p) => lib.esc(names[p] || `P${p + 1}`);
        const dot = (p) => `<span class="ldg-dot ${p === 0 ? 'is-p1' : 'is-p2'}" aria-hidden="true"></span>`;
        const R = ledgerOf(events, cardDB);
        let html;

        if (!R.turns.length) {
            const imported = (!events.length && (s.turn || 1) > 1) || (events.length && events[0].turn > 1);
            html = `<div class="ldg"><div class="lab-section">
                <p class="lab-h">Game Ledger</p>
                <p class="lab-big">Who has more useful resources?</p>
                <p class="lab-muted">${imported
                    ? "Imported logs don't carry the journal yet — the Ledger fills in from turns you play here."
                    : 'Play a turn in the Dojo. After each turn the Ledger adds a line: lore gained, cards drawn, ink put on the board, and what each side lost.'}</p>
            </div></div>`;
        } else {
            // --- per-turn table ---------------------------------------------------------
            const rows = R.turns.map(T => {
                const leadCls = T.lead > 0 ? 'lab-p1' : T.lead < 0 ? 'lab-p2' : '';
                const row = `<tr class="ldg-row${T.turningPoint ? ' is-tp' : ''}" data-ldg-turn="${lib.esc(T.key)}" title="${T.turningPoint ? 'Turning point — ' : ''}tap for details">
                    <td class="ldg-who">${dot(T.active)}${T.turn}</td>
                    <td class="num">${T.lore ? '+' + T.lore : '·'}</td>
                    <td class="num">${T.drawn ? '+' + T.drawn : '·'}</td>
                    <td class="num">${T.developed || '·'}</td>
                    <td class="num">${T.removed || T.lost ? `${T.removed}/${T.lost}` : '·'}</td>
                    <td class="num ${leadCls}">${signed(T.lead)}${T.turningPoint ? ' <i class="fa-solid fa-bolt" aria-label="turning point"></i>' : ''}</td></tr>`;
                if (ui.open !== T.key) return row;
                const e = T.end;
                const rem = T.removedCards.map(id => lib.shortName(cardDB[id])).join(', ');
                const lost = T.lostCards.map(id => lib.shortName(cardDB[id])).join(', ');
                return row + `<tr class="ldg-detail"><td colspan="6">
                    <b>Turn ${T.turn} · ${nm(T.active)}</b> — ${plural(T.lore, 'lore', 'lore')} gained, ${plural(T.drawn, 'extra card')}, ${T.developed} ink put on the board.
                    ${rem ? `Removed ${lib.esc(rem)} (${T.removed} ink). ` : ''}${lost ? `Lost ${lib.esc(lost)} (${T.lost} ink). ` : ''}<br>
                    End of turn: lore ${e.lore[0]}–${e.lore[1]}, hands ${e.hand[0]}–${e.hand[1]}, board ${e.board[0]}–${e.board[1]} ink, decks ${e.deck[0]}–${e.deck[1]}.
                    Lore per turn ${T.rate[0]}–${T.rate[1]}.</td></tr>`;
            }).join('');
            const tps = R.turningPoints.map(k => R.turns.find(T => T.key === k)).map(T => {
                const to = T.leadDelta > 0 ? 0 : 1;
                const bits = [];
                if (T.lore) bits.push(`${plural(T.lore, 'lore', 'lore')} gained`);
                if (T.removed) bits.push(`removed ${T.removed} ink`);
                if (T.lost) bits.push(`lost ${T.lost} ink`);
                if (T.developed) bits.push(`${T.developed} ink played`);
                return `<li>${dot(T.active)}Turn ${T.turn} · ${nm(T.active)}: race swung ${Math.abs(T.leadDelta)} toward ${nm(to)}${bits.length ? ` (${bits.join(', ')})` : ''}.</li>`;
            }).join('');
            const startNote = R.startsAt > 1
                ? `<p class="lab-faint">The journal starts at turn ${R.startsAt}; earlier turns were imported or played before it existed, so cards already in play then are missing from the lore-per-turn count.</p>` : '';

            // --- resources ------------------------------------------------------------------
            const res = LedgerCore.resources(R.latest, names);
            const more = (a, i) => a[i] > a[1 - i] ? ' is-more' : '';
            const resRow = (label, a, unit) => `<span class="lab-muted">${label}</span>
                <span class="num${more(a, 0)}">${a[0]}${unit || ''}</span><span class="num${more(a, 1)}">${a[1]}${unit || ''}</span>`;

            // --- receipts --------------------------------------------------------------------
            const pool = R.receipts.filter(r => ui.who === 'all' || String(r.owner) === ui.who);
            const shown = ui.showAll ? pool : pool.slice(0, 6);
            const rcpt = (r) => {
                const life = r.keyIn ? `in T${r.turnIn}` : 'in play before the journal';
                const how = r.how === 'in play' ? 'still in play' : `${r.how}${r.keyOut ? ' T' + r.keyOut.split('-')[0] : ''}`;
                const bits = [life, how, plural(r.turnsSurvived, 'turn') + ' survived'];
                if (r.quests) bits.push(`${plural(r.lore, 'lore', 'lore')} from ${plural(r.quests, 'quest')}`);
                if (r.challenges) bits.push(plural(r.challenges, 'challenge'));
                if (r.kills.length) bits.push(`banished ${r.kills.map(k => k.name).join(', ')} (${r.removedValue} ink)`);
                return `<li class="ldg-rcpt">${lib.thumb(r.cardId)}
                    <div><div class="ldg-rcpt-name">${dot(r.owner)}${lib.esc(r.name)}</div><div class="ldg-rcpt-line">${lib.esc(bits.join(' · '))}</div></div>
                    <div class="ldg-rcpt-val">${fmt(r.value)}<small>value</small></div></li>`;
            };
            const fbtn = (v, label) => `<button type="button" class="lab-btn-act${ui.who === v ? ' is-on' : ''}" data-ldg-who="${v}">${label}</button>`;

            html = `<div class="ldg">
                <div class="lab-section">
                    <p class="lab-h">Turn by turn</p>
                    <div class="ldg-scroll"><table class="lab-table ldg-table">
                        <thead><tr><th title="Turn and player">Turn</th><th class="num" title="Lore gained this turn">Lore</th>
                            <th class="num" title="Cards drawn beyond the draw step">+Cards</th><th class="num" title="Printed cost of characters, items and locations played">Ink in</th>
                            <th class="num" title="Opposing value removed / own value lost (printed ink cost)">Rem/Lost</th>
                            <th class="num" title="Race lead: lore now + 2 turns of questing, ${lib.esc(names[0] || 'P1')} minus ${lib.esc(names[1] || 'P2')}">Lead</th></tr></thead>
                        <tbody>${rows}</tbody></table></div>
                    <p class="lab-faint">Lead = race lead: lore now + 2 turns of questing (printed lore of characters and locations in play), ${dot(0)}${nm(0)} minus ${dot(1)}${nm(1)}. <i class="fa-solid fa-bolt"></i> marks the 3 biggest swings after turn 2. Tap a row for details.</p>
                    ${tps ? `<p class="lab-h" style="margin-top:8px">Turning points</p><ul class="ldg-tps">${tps}</ul>` : ''}
                    ${startNote}
                </div>
                <div class="lab-section">
                    <p class="lab-h">Who has more useful resources?</p>
                    <p class="lab-muted">At the end of turn ${res.turn} (${nm(res.active)}).</p>
                    <div class="ldg-res">
                        <span></span><span class="ldg-res-h lab-p1">${nm(0)}</span><span class="ldg-res-h lab-p2">${nm(1)}</span>
                        ${resRow('Cards in hand', res.hand)}
                        ${resRow('Ink on the board', res.board)}
                        ${resRow('Characters', res.chars)}
                        ${resRow('Lore', res.lore)}
                        ${resRow('Deck', res.deck)}
                    </div>
                    <p style="margin:8px 0 0">${lib.esc(res.verdict)}</p>
                    <p class="lab-faint">This counts cards, not how useful each one is — judging that needs card text, which comes later.</p>
                </div>
                <div class="lab-section">
                    <p class="lab-h">Receipts</p>
                    <div class="ldg-filter">${fbtn('all', 'Both')}${fbtn('0', nm(0))}${fbtn('1', nm(1))}</div>
                    ${shown.length ? `<ul class="ldg-rcpts">${shown.map(rcpt).join('')}</ul>` : '<p class="lab-muted">No cards on the board yet.</p>'}
                    ${pool.length > 6 ? `<button type="button" class="lab-btn-act" data-ldg-more style="margin-top:6px">${ui.showAll ? 'Show top 6' : `Show all ${pool.length}`}</button>` : ''}
                    <p class="lab-faint">Value = lore quested + half the printed cost of what it banished in challenges. "Turns survived" counts its owner's turns it ended in play.</p>
                </div>
            </div>`;
        }

        const cur = el.firstElementChild;
        if (cur && cur.__ldgHtml === html) return;   // nothing changed: keep the DOM (and scroll)
        el.innerHTML = html;
        const wrap = el.firstElementChild;
        if (!wrap) return;
        wrap.__ldgHtml = html;
        wrap.addEventListener('click', (ev) => {
            const t = ev.target.closest('[data-ldg-turn],[data-ldg-who],[data-ldg-more]');
            if (!t) return;
            if (t.hasAttribute('data-ldg-turn')) ui.open = ui.open === t.dataset.ldgTurn ? null : t.dataset.ldgTurn;
            else if (t.hasAttribute('data-ldg-who')) { ui.who = t.dataset.ldgWho; ui.showAll = false; }
            else ui.showAll = !ui.showAll;
            ctx.refresh();
        });
    }

    function fmt(n) { return Number.isInteger(n) ? String(n) : n.toFixed(1); }

    if (typeof module !== 'undefined' && module.exports) module.exports = LedgerCore;

    if (root.DojoPlugins && typeof root.DojoPlugins.register === 'function') {
        root.DojoPlugins.register({
            id: 'ledger',
            name: 'Ledger',
            icon: 'fa-solid fa-scale-balanced',
            description: 'Game Ledger: tempo, cards and value per turn, the race lead and its turning points, and a receipt for every card.',
            defaultEnabled: true,
            order: 40,
            panel: { render },
            api: { build: (events, cardDB) => LedgerCore.build(events, cardDB) }
        });
    }
})(typeof window !== 'undefined' ? window : globalThis);
