// Practice Dojo — Sequencing Coach (Lab plugin, v3.0.0). "Same plays, better order."
//
// Reads the action journal (state.ext.journal.events), splits it into finished player-turns
// and walks one turn step by step, with rules-of-thumb flags from the guide's Sequencing
// chapter. Read-only: never touches game data.
//
// Card facts come from structured fields only (cost, inkwell, type, subtypes, strength,
// keywords). Anything that needs card text — which card made you draw, activated abilities,
// cost reducers, the best order — waits for the classifier / rules engine.
(function (root) {
    'use strict';

    function L() {
        if (root.DojoLab) return root.DojoLab;
        if (typeof require === 'function') { try { return require('./lab_lib.js'); } catch (e) { /* browser */ } }
        return {};
    }

    const SKIP = { turnStart: 1, turnEnd: 1, mulligan: 1 };
    const plural = (n, one, many) => `${n} ${n === 1 ? one : (many || one + 's')}`;

    // ---------------------------------------------------------------------------------
    // Pure logic
    // ---------------------------------------------------------------------------------

    const CoachCore = {
        // Challenge results. The core banishes ~1s after the challenge, so the `banish`
        // events (via:'challenge') may come after other steps — or even after turnEnd.
        // Returns { bySeq: { [challengeSeq]: { defBanished, attBanished } }, hidden: Set(banishSeq) }.
        outcomes(events) {
            const bySeq = {}, hidden = new Set(), last = {};
            for (const e of events) {
                if (e.kind === 'challenge') {
                    bySeq[e.seq] = { defBanished: false, attBanished: false };
                    if (e.attIid) last[e.attIid] = e;
                    if (e.defIid) last[e.defIid] = e;
                } else if (e.kind === 'play' || e.kind === 'shift') {
                    if (e.iid) delete last[e.iid];
                } else if (e.kind === 'banish' && e.via === 'challenge' && e.iid && last[e.iid]) {
                    const ch = last[e.iid];
                    if (ch.defIid === e.iid) bySeq[ch.seq].defBanished = true;
                    if (ch.attIid === e.iid) bySeq[ch.seq].attBanished = true;
                    hidden.add(e.seq);
                    delete last[e.iid];
                }
            }
            return { bySeq, hidden };
        },

        // Finished player-turns, oldest first. A turn ends with a `turnEnd`; its steps are the
        // events since the previous turnStart / turnEnd (or the start of the journal), minus
        // turnStart / turnEnd / mulligan and minus challenge banishes (folded into the challenge).
        turns(events) {
            events = Array.isArray(events) ? events : [];
            const lib = L();
            const oc = CoachCore.outcomes(events);
            const out = [];
            let from = 0;
            events.forEach((e, i) => {
                if (e.kind === 'turnStart') { from = i + 1; return; }
                if (e.kind !== 'turnEnd') return;
                const player = e.player != null ? e.player : e.active;
                const turn = e.turn;
                const steps = events.slice(from, i).filter(x => !SKIP[x.kind] && !oc.hidden.has(x.seq));
                out.push({
                    key: lib.turnKey ? lib.turnKey(turn, player) : `${turn}-${player}`,
                    turn, player, steps, end: e, outcomes: oc.bySeq
                });
                from = i + 1;
            });
            return out;
        },

        // Flags for one turn. Accepts a turn from turns(), or a plain array of that turn's
        // events (ending with its turnEnd). Each flag: { rule, level, at, title, text }
        // where `at` is the seq of the step it belongs to, or 'end'.
        //   level: 'tip' (order / waste), 'rules' (not possible here), 'info' (worth a thought)
        flags(turnOrEvents, cardDB, names) {
            const lib = L();
            const T = Array.isArray(turnOrEvents) ? CoachCore._asTurn(turnOrEvents) : turnOrEvents;
            if (!T) return [];
            const db = (id) => (cardDB && id != null && cardDB[id]) || null;
            const nm = (id) => lib.shortName ? lib.shortName(db(id)) : String(id);
            const me = T.player;
            const steps = T.steps || [];
            const outcomes = T.outcomes || {};
            const flags = [];
            const add = (f) => flags.push(f);

            // Ink before draw — "Gather information before irreversible decisions".
            steps.forEach((s, i) => {
                if (s.kind !== 'ink' || s.player !== me) return;
                const later = steps.slice(i + 1).filter(x => x.kind === 'draw' && x.player === me);
                if (!later.length) return;
                const seen = later.map(x => nm(x.cardId));
                add({
                    rule: 'inkBeforeDraw', level: 'tip', at: s.seq,
                    title: 'Ink before draw',
                    text: `You inked ${nm(s.cardId)} before drawing. If the draw didn't need that ink, draw first, then choose: you'd have seen ${listNames(seen)}.`
                });
            });

            // Support after the challenge it could have powered.
            steps.forEach((s, i) => {
                if (s.kind !== 'quest' || s.player !== me) return;
                const sd = db(s.cardId);
                if (!lib.kw || !lib.kw(sd, 'Support')) return;
                const ch = steps.slice(0, i).filter(x => x.kind === 'challenge' && x.attIid !== s.iid
                    && !playedBetween(steps, x, s, s.iid)).pop();
                if (!ch) return;
                const res = outcomes[ch.seq] || {};
                const str = (sd && sd.strength) || 0;
                const survived = !res.defBanished;
                add({
                    rule: 'supportAfterChallenge', level: 'tip', at: s.seq, ref: ch.seq,
                    title: 'Support after the challenge',
                    text: `Support adds its strength to a challenger — quest with it first. ${nm(s.cardId)} could have given ${nm(ch.attId)} +${str} strength` +
                        (survived ? `; ${nm(ch.defId)} survived that challenge.` : '.')
                });
            });

            // Not possible here (the sandbox let it through).
            steps.forEach((s) => {
                if (s.kind === 'challenge') {
                    const att = db(s.attId), def = db(s.defId);
                    if (s.attDrying && !(lib.kw && lib.kw(att, 'Rush'))) add({
                        rule: 'notPossible', level: 'rules', at: s.seq, title: 'Not possible here',
                        text: `${nm(s.attId)} came into play this turn, so it can't challenge yet. The sandbox allowed it; a real game won't.`
                    });
                    const isLoc = s.defType === 'Location' || (def && def.type === 'Location');
                    if (s.defExerted === false && !isLoc) add({
                        rule: 'notPossible', level: 'rules', at: s.seq, title: 'Not possible here',
                        text: `${nm(s.defId)} was ready. Only exerted characters can be challenged.`
                    });
                    if (lib.kw && lib.kw(def, 'Evasive') && !lib.kw(att, 'Evasive') && !isLoc) add({
                        rule: 'notPossible', level: 'rules', at: s.seq, title: 'Not possible here',
                        text: `${nm(s.defId)} has Evasive. Only a character with Evasive can challenge it.`
                    });
                } else if (s.kind === 'quest' && s.player === me) {
                    if (s.drying) add({
                        rule: 'notPossible', level: 'rules', at: s.seq, title: 'Not possible here',
                        text: `${nm(s.cardId)} came into play this turn. Characters need to dry for a turn before they quest.`
                    });
                    else if (s.wasExerted) add({
                        rule: 'notPossible', level: 'rules', at: s.seq, title: 'Not possible here',
                        text: `${nm(s.cardId)} was already exerted, so it couldn't quest.`
                    });
                    if (lib.kw && lib.kw(db(s.cardId), 'Reckless')) add({
                        rule: 'notPossible', level: 'rules', at: s.seq, title: 'Not possible here',
                        text: `${nm(s.cardId)} has Reckless, so it can't quest.`
                    });
                } else if ((s.kind === 'play' || s.kind === 'shift') && s.player === me) {
                    const cost = typeof s.cost === 'number' ? s.cost : ((db(s.cardId) || {}).cost || 0);
                    if (typeof s.inkBefore === 'number' && s.inkBefore < cost) add({
                        rule: 'notPossible', level: 'rules', at: s.seq, title: 'Not possible here',
                        text: `${nm(s.cardId)} costs ${cost} ink and you had ${s.inkBefore} ready.`
                    });
                }
            });

            // End of turn: ink left on the table, no ink this turn.
            const end = T.end || {};
            const hand = Array.isArray(end.handCards) ? end.handCards : [];
            const ready = typeof end.inkReady === 'number' ? end.inkReady : 0;
            if (ready > 0) {
                const fits = hand.filter(id => db(id) && !lib.isSong(db(id)) && (db(id).cost || 0) <= ready);
                if (fits.length) {
                    const cheapest = fits.slice().sort((a, b) => (db(a).cost || 0) - (db(b).cost || 0))[0];
                    add({
                        rule: 'inkLeft', level: 'tip', at: 'end',
                        title: `${ready} ink unspent`,
                        text: `You ended with ${ready} ink ready while ${nm(cheapest)} (${db(cheapest).cost || 0} ink) sat in hand. Unspent ink is tempo you don't get back.`
                    });
                }
            }
            const inked = steps.some(s => s.kind === 'ink' && s.player === me);
            if (!inked && T.end) {
                const inkable = hand.filter(id => db(id) && db(id).inkwell);
                if (inkable.length) add({
                    rule: 'noInk', level: 'info', at: 'end',
                    title: 'No ink this turn',
                    text: `Nothing went into your inkwell, and ${nm(inkable[0])} was inkable. Holding cards can be right — just make it a choice.`
                });
            }
            return flags;
        },

        // One line per step, for the panel: { seq, kind, icon, cardId, text, flags: [] },
        // plus the end-of-turn line. names = ['Ana', 'Ben'].
        describe(turn, cardDB, names) {
            const lib = L();
            const db = (id) => (cardDB && id != null && cardDB[id]) || null;
            const nm = (id) => lib.shortName ? lib.shortName(db(id)) : String(id);
            const who = (p) => (names && names[p]) || `P${p + 1}`;
            const me = turn.player;
            const flags = CoachCore.flags(turn, cardDB, names);
            const at = (seq) => flags.filter(f => f.at === seq);
            const steps = turn.steps.map((s) => {
                const r = { seq: s.seq, kind: s.kind, cardId: s.cardId != null ? s.cardId : null, icon: ICON[s.kind] || 'fa-solid fa-circle', text: '', flags: at(s.seq) };
                const theirs = s.player != null && s.player !== me ? ` (${who(s.player)}'s)` : '';
                const cost = typeof s.cost === 'number' ? s.cost : ((db(s.cardId) || {}).cost || 0);
                switch (s.kind) {
                    case 'ink': r.text = `Inked ${nm(s.cardId)}${theirs}`; break;
                    case 'play': r.text = `Played ${nm(s.cardId)}${theirs} (${cost} ink)`; break;
                    case 'shift': r.text = `Shifted ${nm(s.cardId)}${theirs} (${cost} ink)`; break;
                    case 'quest': r.text = `Quested with ${nm(s.cardId)}${theirs} +${s.lore || 0} lore`; break;
                    case 'draw': r.text = s.player === me ? `Drew a card (${nm(s.cardId)})` : `${who(s.player)} drew a card (${nm(s.cardId)})`; break;
                    case 'banish': r.text = `${nm(s.cardId)}${theirs} was banished`; break;
                    case 'discard': r.text = `Discarded ${nm(s.cardId)}${theirs}`; break;
                    case 'lore': r.text = `${s.delta > 0 ? '+' : '−'}${Math.abs(s.delta || 0)} lore for ${who(s.player)}, set by hand`; r.cardId = null; break;
                    case 'damage': r.text = (s.delta || 0) >= 0 ? `Put ${plural(s.delta || 0, 'damage', 'damage')} on ${nm(s.cardId)}${theirs}` : `Healed ${Math.abs(s.delta)} damage from ${nm(s.cardId)}${theirs}`; break;
                    case 'challenge': {
                        const o = (turn.outcomes && turn.outcomes[s.seq]) || {};
                        const a = nm(s.attId), d = nm(s.defId);
                        const res = o.defBanished && o.attBanished ? 'both banished'
                            : o.defBanished ? `${d} banished`
                            : o.attBanished ? `${a} banished`
                            : `no one banished (${s.toDef || 0} damage dealt, ${s.toAtt || 0} taken)`;
                        r.text = `${a} challenged ${d} — ${res}`;
                        r.cardId = s.attId;
                        break;
                    }
                    default: r.text = s.kind;
                }
                return r;
            });
            const e = turn.end || {};
            const endText = typeof e.inkReady === 'number'
                ? `Ended the turn with ${e.inkReady} ink ready and ${plural((e.handCards || []).length, 'card')} in hand`
                : 'Ended the turn';
            return { steps, end: { text: endText, icon: ICON.turnEnd, flags: at('end') }, flags };
        },

        // Which finished turn to show by default: the latest one of the player who is NOT
        // active now (the turn that just ended); else the latest finished turn.
        defaultKey(turns, activeNow) {
            for (let i = turns.length - 1; i >= 0; i--) if (turns[i].player !== activeNow) return turns[i].key;
            return turns.length ? turns[turns.length - 1].key : null;
        },

        summary(n) { return n === 0 ? 'Clean turn' : `${plural(n, 'thing')} to look at`; },

        _asTurn(events) {
            const ts = CoachCore.turns(events);
            if (ts.length) return ts[ts.length - 1];
            // No turnEnd: treat the array as an unfinished turn of its active player.
            const steps = events.filter(x => !SKIP[x.kind]);
            if (!steps.length) return null;
            const oc = CoachCore.outcomes(events);
            return { key: null, turn: steps[0].turn, player: steps[0].active, steps: steps.filter(x => !oc.hidden.has(x.seq)), end: null, outcomes: oc.bySeq };
        }
    };

    // Was `iid` played/shifted between step a and step b (so it couldn't have acted before a)?
    function playedBetween(steps, a, b, iid) {
        const ia = steps.indexOf(a), ib = steps.indexOf(b);
        return steps.slice(ia + 1, ib).some(x => (x.kind === 'play' || x.kind === 'shift') && x.iid === iid);
    }
    function listNames(arr) {
        if (arr.length <= 1) return arr[0] || 'a new card';
        return arr.slice(0, -1).join(', ') + ' and ' + arr[arr.length - 1];
    }

    const ICON = {
        ink: 'fa-solid fa-droplet', play: 'fa-solid fa-arrow-up-from-bracket', shift: 'fa-solid fa-layer-group',
        quest: 'fa-solid fa-gem', challenge: 'fa-solid fa-hand-fist', draw: 'fa-solid fa-plus',
        banish: 'fa-solid fa-skull', discard: 'fa-solid fa-trash-can', lore: 'fa-solid fa-pen',
        damage: 'fa-solid fa-heart-crack', turnEnd: 'fa-solid fa-flag-checkered'
    };

    // ---------------------------------------------------------------------------------
    // Panel
    // ---------------------------------------------------------------------------------

    let memo = { ref: null, len: -1, last: -1, turns: [] };
    let picked = null;   // { key, count } — the user's choice; resets when a new turn finishes

    function turnsOf(events) {
        const last = events.length ? events[events.length - 1].seq : -1;
        if (memo.ref !== events || memo.len !== events.length || memo.last !== last) {
            memo = { ref: events, len: events.length, last, turns: CoachCore.turns(events) };
        }
        return memo.turns;
    }

    const CSS = `
.coach-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.coach-head label { font-size: 12px; color: var(--text-dim); }
.coach-head select { flex: 1; min-width: 0; max-width: 100%; }
.coach-steps { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.coach-step { display: grid; grid-template-columns: 22px 28px 1fr; gap: 8px; align-items: start; padding: 6px 0; border-top: 1px solid var(--border-soft); }
.coach-step:first-child { border-top: 0; }
.coach-step > .coach-ico { color: var(--text-dim); text-align: center; padding-top: 3px; }
.coach-step.is-flagged > .coach-ico { color: var(--accent); }
.coach-step .lab-thumb, .coach-step .lab-thumb-missing { width: 28px; height: 39px; }
.coach-step-text { color: var(--text); font-size: 13px; line-height: 1.35; min-width: 0; overflow-wrap: anywhere; }
.coach-step-text .coach-other { color: var(--text-dim); }
.coach-flag { margin-top: 5px; padding: 6px 8px; border-radius: var(--radius-sm); border-left: 3px solid var(--border-strong); background: var(--surface-2); font-size: 12px; color: var(--text-2); }
.coach-flag b { display: block; color: var(--text); font-weight: 600; margin-bottom: 2px; }
.coach-flag.is-tip { border-left-color: var(--accent); }
.coach-flag.is-rules { border-left-color: var(--lvi); }
.coach-flag.is-info { border-left-color: var(--border-strong); }
.coach-sum { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.coach-note { margin-top: 12px; }
`;

    function render(el, ctx) {
        const lib = ctx.lib || L();
        lib.css && lib.css('coach', CSS);
        const events = ctx.journal();
        const s = ctx.state || {};
        const names = (s.players || []).map((p, i) => (p && p.name) || `P${i + 1}`);
        const turns = turnsOf(events);
        const cardDB = (ctx.app && ctx.app.cardDB) || {};
        let html;

        if (!turns.length) {
            const imported = (!events.length && (s.turn || 1) > 1) || (events.length && events[0].turn > 1);
            html = `<div class="coach"><div class="lab-section">
                <p class="lab-h">Sequencing Coach</p>
                <p class="lab-big">Same plays, better order</p>
                <p class="lab-muted">${imported
                    ? "Imported logs don't carry the journal yet — the Coach fills in from turns you play here. Finish a turn and it walks you through it."
                    : 'Play a turn in the Dojo. When it ends, the Coach walks through it step by step and points out what a different order would change.'}</p>
            </div></div>`;
        } else {
            if (picked && (picked.count !== turns.length || !turns.some(t => t.key === picked.key))) picked = null;
            const key = picked ? picked.key : CoachCore.defaultKey(turns, ctx.me);
            const T = turns.find(t => t.key === key) || turns[turns.length - 1];
            const d = CoachCore.describe(T, cardDB, names);
            const counts = {};
            const opts = turns.slice().reverse().map(t => {
                const n = counts[t.key] != null ? counts[t.key] : (counts[t.key] = CoachCore.flags(t, cardDB, names).length);
                return `<option value="${lib.esc(t.key)}"${t.key === T.key ? ' selected' : ''}>Turn ${t.turn} · ${lib.esc(names[t.player] || 'P' + (t.player + 1))} (P${t.player + 1})${n ? ` · ${n} to look at` : ''}</option>`;
            }).join('');
            const flagHtml = (f) => `<div class="coach-flag is-${f.level}"><b>${lib.esc(f.title)}</b>${lib.esc(f.text)}</div>`;
            const stepHtml = (st) => `<li class="coach-step${st.flags.length ? ' is-flagged' : ''}">
                <i class="coach-ico ${st.icon}" aria-hidden="true"></i>
                <span>${st.cardId != null ? lib.thumb(st.cardId) : ''}</span>
                <div class="coach-step-text">${lib.esc(st.text)}${st.flags.map(flagHtml).join('')}</div></li>`;
            const startNote = events.length && events[0].turn > 1
                ? `<p class="lab-faint">The journal starts at turn ${events[0].turn}; earlier turns were imported or played before it existed.</p>` : '';
            html = `<div class="coach">
                <div class="coach-head"><label for="coach-turn">Turn</label>
                    <select id="coach-turn" data-coach-turn aria-label="Pick a finished turn">${opts}</select></div>
                <div class="lab-section">
                    <div class="coach-sum"><p class="lab-big">${lib.esc(CoachCore.summary(d.flags.length))}</p>
                        <span class="lab-pill"><i class="fa-solid fa-circle ${T.player === 0 ? 'lab-p1' : 'lab-p2'}" style="font-size:7px" aria-hidden="true"></i>${lib.esc(names[T.player] || '')} · turn ${T.turn}</span></div>
                    <p class="lab-muted">The Coach only reorders what you did — it never adds plays you didn't make. Searching for the best order comes with the rules engine later.</p>
                </div>
                <div class="lab-section">
                    <p class="lab-h">Steps</p>
                    ${d.steps.length ? '' : '<p class="lab-muted">No moves recorded this turn.</p>'}
                    <ol class="coach-steps">${d.steps.map(stepHtml).join('')}
                        <li class="coach-step${d.end.flags.length ? ' is-flagged' : ''}"><i class="coach-ico ${d.end.icon}" aria-hidden="true"></i><span></span>
                        <div class="coach-step-text">${lib.esc(d.end.text)}${d.end.flags.map(flagHtml).join('')}</div></li>
                    </ol>
                    <p class="lab-faint coach-note">Follows the timeline you're on: restore a bookmark and the Coach shows that branch's turns. Card effects (what made you draw, abilities, discounts) aren't read yet.</p>
                    ${startNote}
                </div>
            </div>`;
        }

        const cur = el.firstElementChild;
        if (cur && cur.__coachHtml === html) return;   // nothing changed: keep the DOM (and scroll)
        el.innerHTML = html;
        const wrap = el.firstElementChild;
        if (wrap) wrap.__coachHtml = html;
        const sel = el.querySelector('[data-coach-turn]');
        if (sel) sel.addEventListener('change', () => {
            picked = { key: sel.value, count: turns.length };
            ctx.refresh();
        });
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = CoachCore;

    if (root.DojoPlugins && typeof root.DojoPlugins.register === 'function') {
        root.DojoPlugins.register({
            id: 'coach',
            name: 'Coach',
            icon: 'fa-solid fa-list-ol',
            description: 'Sequencing Coach: walks through a finished turn and flags steps a different order would improve.',
            defaultEnabled: true,
            order: 20,
            panel: { render },
            api: {
                turns: (events) => CoachCore.turns(events),
                flags: (turn, cardDB) => CoachCore.flags(turn, cardDB)
            }
        });
    }
})(typeof window !== 'undefined' ? window : globalThis);
