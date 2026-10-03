// Practice Dojo — Turn Briefing (Lab plugin, v3.0.0). Spec: mastery_lab/V3_PLAN.md §7.2.
//
// "Every turn starts with questions." At the start of each turn the player answers three
// quick questions about the race, then sees how the Race Clock (frozen at the moment the
// turn started) would have answered them. Never a modal, never blocks a move.
//
// Pure logic lives in BriefingCore (node-testable). Entries live in App.state.ext.briefing,
// keyed by turnKey ("<turn>-<active>"), so they ride undo, bookmarks and saves.
(function (root) {
    'use strict';

    const ID = 'briefing';
    const LIFETIME_KEY = 'lorcana_dojo_briefing_stats';
    const SEEN_CAP = 600;
    const KEY_RE = /^\d+-[01]$/;

    function lib() {
        if (root.DojoLab) return root.DojoLab;
        if (typeof require === 'function') { try { return require('./lab_lib.js'); } catch (e) { /* browser */ } }
        throw new Error('Turn Briefing needs lab_lib.js');
    }
    const turnKey = (turn, active) => `${turn}-${active}`;

    const BriefingCore = {
        LIFETIME_KEY,

        keyOf(state) { return turnKey(state.turn || 1, state.activePlayer ? 1 : 0); },

        // The clock fields a briefing needs (no lanes: keeps saved states small).
        slim(clock) {
            const keep = ['me', 'opp', 'myTurn', 'active', 'turn', 'half', 'lore', 'rate', 'availNow',
                'turnsTo20', 'finishHalf', 'finishTurn', 'winner', 'margin', 'spare', 'verdict', 'done'];
            const out = {};
            for (const k of keep) out[k] = Array.isArray(clock[k]) ? clock[k].slice() : clock[k];
            return out;
        },

        newEntry(state, clock, how) {
            return {
                key: BriefingCore.keyOf(state),
                turn: state.turn || 1,
                active: state.activePlayer ? 1 : 0,
                how: how || 'turnStart',             // 'turnStart' | 'manual' (mid-turn)
                bid: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
                clock: BriefingCore.slim(clock),
                answers: null
            };
        },

        // Any character on either board? Before that the race hasn't started.
        anyCharacter(state, cardDB) {
            const L = lib();
            return state.players.some(p => (p.field || []).some(c => L.isChar(cardDB[c.cardId])));
        },

        entries(store) {
            return Object.keys(store || {}).filter(k => KEY_RE.test(k) && store[k] && typeof store[k] === 'object')
                .map(k => store[k]);
        },

        // True when this turn's briefing exists and hasn't been answered.
        pendingIn(state) {
            if (!state || !state.ext || !state.ext[ID]) return false;
            const e = state.ext[ID][BriefingCore.keyOf(state)];
            return !!e && e.answers === null;
        },

        // What the clock says each answer should be.
        expected(clock) {
            const winner = clock.winner == null ? 'none' : clock.winner === clock.me ? 'me' : 'opp';
            return {
                winner,
                turns: clock.turnsTo20[0],               // null = can't
                plan: winner === 'me' ? 'race' : winner === 'opp' ? 'slow' : 'either'
            };
        },

        // answers = { winner: 'me'|'opp'|'none', turns: number|null, plan: 'race'|'slow', threat: string }
        grade(clock, answers) {
            const x = BriefingCore.expected(clock);
            const q1 = answers.winner === x.winner ? 'right' : 'wrong';
            let q2;
            if (x.turns == null) q2 = answers.turns == null ? 'right' : 'wrong';
            else if (answers.turns == null) q2 = 'wrong';
            else { const d = Math.abs(Number(answers.turns) - x.turns); q2 = d === 0 ? 'right' : d === 1 ? 'close' : 'wrong'; }
            const q3 = x.plan === 'either' || answers.plan === x.plan ? 'right' : 'wrong';
            return { q1, q2, q3, expected: x };
        },

        // The clock's reasoning, one plain sentence per question.
        explain(clock) {
            const [Lm, Lo] = clock.lore, [rm, ro] = clock.rate;
            const [fm, fo] = clock.finishTurn;
            const [km, ko] = clock.turnsTo20;
            const turns = (k) => k === 1 ? '1 turn' : k + ' turns';
            let q1;
            if (clock.done) q1 = clock.winner === clock.me ? 'You already had 20 lore.' : 'They already had 20 lore.';
            else if (clock.winner == null) q1 = 'Nobody had lore coming in, so nobody gets to 20 without playing more.';
            else if (clock.winner === clock.me) q1 = `You reach 20 on your turn ${fm}` + (fo == null ? '; they had no lore coming in.' : `; they’d need until their turn ${fo}.`);
            else q1 = `They reach 20 on their turn ${fo}` + (fm == null ? '; you had no lore coming in.' : `; you’d need until your turn ${fm}.`);

            let q2;
            if (Lm >= 20) q2 = 'You were already at 20.';
            else if (km == null) q2 = `You had ${Lm} lore and nothing that can quest, so you can’t get there yet.`;
            else if (clock.myTurn) {
                q2 = `You had ${Lm} lore. This turn you can quest for ${clock.availNow}` +
                    (km === 1 ? ', which is enough.' : `, then ${rm} a turn: ${turns(km)} counting this one.`);
            } else q2 = `You had ${Lm} lore and ${rm} a turn: ${turns(km)}.`;
            q2 += ko == null ? ' They had no lore coming in.' : ` They had ${Lo} at ${ro} a turn (${turns(ko)}).`;

            const x = BriefingCore.expected(clock);
            const q3 = x.plan === 'race' ? 'The clock says you win if nothing changes, so race: quest, and only challenge when it buys more than a quest.'
                : x.plan === 'slow' ? 'The clock says they win if nothing changes, so slow them down: remove their questers, or make questing costly.'
                    : 'Nobody is scoring yet, so either is fine. Set up the board you want.';
            return { q1, q2, q3 };
        },

        // Record answers on an entry and grade them. Returns the grade.
        answer(entry, answers) {
            const a = {
                winner: answers.winner,
                turns: answers.turns == null || answers.turns === '' ? null : Number(answers.turns),
                plan: answers.plan,
                threat: String(answers.threat || '').slice(0, 200)
            };
            entry.answers = a;
            entry.grade = BriefingCore.grade(entry.clock, a);
            return entry.grade;
        },
        skip(entry) { entry.answers = { skipped: true }; entry.grade = null; },

        // Per-question tallies over graded entries.
        tally(entries) {
            const t = { n: 0, q1: [0, 0], q2: [0, 0, 0], q3: [0, 0] };   // [right, (close,) total]
            for (const e of entries) {
                const g = e && e.grade;
                if (!g) continue;
                t.n++;
                t.q1[0] += g.q1 === 'right' ? 1 : 0; t.q1[1]++;
                t.q2[0] += g.q2 === 'right' ? 1 : 0; t.q2[1] += g.q2 === 'close' ? 1 : 0; t.q2[2]++;
                t.q3[0] += g.q3 === 'right' ? 1 : 0; t.q3[1]++;
            }
            return t;
        },

        emptyLifetime() { return { v: 1, n: 0, q1: [0, 0], q2: [0, 0, 0], q3: [0, 0], seen: [] }; },
        loadLifetime(storage) {
            try {
                const raw = storage && storage.getItem(LIFETIME_KEY);
                const s = raw ? JSON.parse(raw) : null;
                if (s && s.v === 1 && Array.isArray(s.q1) && Array.isArray(s.seen)) return s;
            } catch (e) { /* private mode or bad JSON */ }
            return BriefingCore.emptyLifetime();
        },
        saveLifetime(storage, s) {
            try { if (storage) storage.setItem(LIFETIME_KEY, JSON.stringify(s)); } catch (e) { /* private mode */ }
        },
        // Add one graded entry to the lifetime stats, once. Undo can bring an entry back
        // unanswered with the same `bid`; `seen` stops it counting twice.
        count(storage, entry) {
            if (!entry || !entry.grade || entry.counted) return false;
            const s = BriefingCore.loadLifetime(storage);
            if (s.seen.includes(entry.bid)) { entry.counted = true; return false; }
            const g = entry.grade;
            s.n++;
            s.q1[0] += g.q1 === 'right' ? 1 : 0; s.q1[1]++;
            s.q2[0] += g.q2 === 'right' ? 1 : 0; s.q2[1] += g.q2 === 'close' ? 1 : 0; s.q2[2]++;
            s.q3[0] += g.q3 === 'right' ? 1 : 0; s.q3[1]++;
            s.seen.push(entry.bid);
            if (s.seen.length > SEEN_CAP) s.seen = s.seen.slice(-SEEN_CAP);
            BriefingCore.saveLifetime(storage, s);
            entry.counted = true;
            return true;
        }
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = BriefingCore;

    // ------------------------------------------------------------------ plugin ---------

    if (!root.DojoPlugins) return;
    const H = root.DojoPlugins;
    const L = lib();
    const esc = L.esc;
    const storage = () => { try { return root.localStorage; } catch (e) { return null; } };
    let lastAttention = null;

    L.css('briefing', `
.brief-q { margin: 0 0 12px; }
.brief-q > .brief-label { display: block; color: var(--text); font-weight: 600; font-size: 13px; margin-bottom: 6px; }
.brief-opts { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.brief-opt { position: relative; }
.brief-opt input { position: absolute; opacity: 0; pointer-events: none; }
.brief-opt span { display: inline-flex; align-items: center; min-height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--border); background: var(--surface-2); color: var(--text-2); font-size: 12px; cursor: pointer; }
.brief-opt input:checked + span { border-color: var(--accent); background: var(--accent-soft); color: var(--text); }
.brief-opt input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 1px; }
.brief-num { width: 72px; }
.brief-text { width: 100%; box-sizing: border-box; }
.brief-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.brief-res { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.brief-res li { padding: 8px 10px; border: 1px solid var(--border-soft); border-radius: var(--radius-sm); background: var(--surface-2); }
.brief-res .brief-rq { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; color: var(--text); font-weight: 600; font-size: 12px; }
.brief-res .brief-ans { font-size: 12px; color: var(--text-2); margin-top: 2px; }
.brief-res .brief-why { font-size: 12px; color: var(--text-dim); margin-top: 2px; }
.brief-cal { display: grid; grid-template-columns: 1fr auto auto; gap: 3px 12px; font-size: 12px; }
.brief-cal .brief-ch { font: 600 10px/1.2 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--text-faint); text-align: right; }
.brief-cal .brief-ch:first-child { text-align: left; }
.brief-cal .brief-cv { font-family: var(--font-mono); text-align: right; color: var(--text); }
.brief-cal .brief-ck { color: var(--text-dim); }
.brief-past { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; font-size: 12px; }
.brief-past li { display: flex; flex-wrap: wrap; gap: 4px 8px; align-items: center; }
.brief-past .brief-pt { font-family: var(--font-mono); color: var(--text-dim); min-width: 64px; }
.brief-mark { font-family: var(--font-mono); }
`);

    // Race Clock's compute, whether or not the Race Clock tool is switched on.
    function computeFn() {
        const on = H.api('raceClock');
        if (on && on.compute) return on.compute;
        const p = (H.plugins ? H.plugins() : []).find(x => x.id === 'raceClock');
        return p && p.api && p.api.compute ? p.api.compute : null;
    }

    function setAttention(on) {
        if (lastAttention === on) return;
        lastAttention = on;
        H.attention(ID, on);
    }

    // Create this turn's briefing (once). Returns the entry or null.
    function brief(ctx, how) {
        const s = ctx.state;
        if (!s || !Array.isArray(s.players)) return null;
        const compute = computeFn();
        if (!compute) return null;
        const store = ctx.store();
        const key = BriefingCore.keyOf(s);
        if (store[key]) return store[key];
        if (how === 'turnStart' && !BriefingCore.anyCharacter(s, ctx.app.cardDB)) return null;
        const entry = BriefingCore.newEntry(s, compute(s, ctx.app.cardDB, s.activePlayer), how);
        store[key] = entry;
        ctx.persist();
        setAttention(true);
        return entry;
    }

    const WINNER_TXT = { me: 'You', opp: 'Opponent', none: 'Nobody' };
    const PLAN_TXT = { race: 'Race', slow: 'Slow it down', either: 'Either' };
    const GRADE_PILL = { right: '<span class="lab-pill is-good">Right</span>', close: '<span class="lab-pill is-warn">Close</span>', wrong: '<span class="lab-pill is-bad">Wrong</span>' };
    const pctOf = (r, n) => n ? Math.round(r / n * 100) + '%' : '—';
    const turnsTxt = (n) => n == null ? 'Can’t' : String(n);

    function formHtml(entry) {
        const opt = (name, value, label, type) => `<label class="brief-opt"><input type="${type || 'radio'}" name="${name}" value="${value}"><span>${label}</span></label>`;
        return `<form class="brief-form" data-key="${esc(entry.key)}" autocomplete="off">
            <div class="lab-big">Before you play</div>
            <p class="lab-muted" style="margin:0 0 10px">Three quick calls about the race. Then see what the Race Clock says.${entry.how === 'manual' ? ' (Started mid-turn: the clock counts only what can still happen this turn.)' : ''}</p>
            <div class="brief-q"><span class="brief-label">1. If nothing changes, who wins?</span>
                <div class="brief-opts">${opt('winner', 'me', 'You')}${opt('winner', 'opp', 'Opponent')}${opt('winner', 'none', 'Nobody')}</div></div>
            <div class="brief-q"><span class="brief-label">2. How many of your turns to 20 lore? <span class="lab-faint">(count this one)</span></span>
                <div class="brief-opts"><input class="brief-num" type="number" name="turns" min="1" max="40" step="1" inputmode="numeric" placeholder="turns" aria-label="Turns to 20 lore">
                ${opt('cant', 'yes', 'Can’t', 'checkbox')}</div></div>
            <div class="brief-q"><span class="brief-label">3. This turn I should…</span>
                <div class="brief-opts">${opt('plan', 'race', 'Race')}${opt('plan', 'slow', 'Slow it down')}</div></div>
            <div class="brief-q"><span class="brief-label">Which threat matters most? <span class="lab-faint">(optional)</span></span>
                <input class="brief-text" type="text" name="threat" maxlength="200" placeholder="e.g. their 3-lore quester">
                <div class="lab-faint" style="margin-top:4px">Recorded, not graded yet: graded once the Threat Map exists.</div></div>
            <div class="brief-actions">
                <button type="submit" class="lab-btn-act is-primary" disabled>Check my answers</button>
                <button type="button" class="lab-btn-act" data-brief="skip">Skip this turn</button>
            </div></form>`;
    }

    function readForm(form) {
        const v = (n) => { const x = form.querySelector(`input[name="${n}"]:checked`); return x ? x.value : null; };
        const cant = !!v('cant');
        const raw = form.querySelector('input[name="turns"]').value.trim();
        const n = raw === '' ? NaN : Math.round(Number(raw));
        return {
            winner: v('winner'), plan: v('plan'),
            turns: cant ? null : (Number.isFinite(n) && n >= 0 ? n : undefined),
            threat: form.querySelector('input[name="threat"]').value
        };
    }
    const formReady = (a) => !!a.winner && !!a.plan && a.turns !== undefined;

    function resultHtml(entry) {
        if (entry.answers && entry.answers.skipped) {
            return `<div class="lab-big">Skipped</div><p class="lab-muted">No answers this turn. The Race Clock is showing again.</p>`;
        }
        const g = entry.grade, a = entry.answers, x = g.expected;
        const why = BriefingCore.explain(entry.clock);
        const n = [g.q1, g.q2, g.q3].filter(q => q === 'right').length;
        const item = (q, title, mine, clock, grade, reason) => `<li><div class="brief-rq"><span>${q}. ${title}</span>${GRADE_PILL[grade]}</div>
            <div class="brief-ans">You: <b>${esc(mine)}</b> · Clock: <b>${esc(clock)}</b></div>
            <div class="brief-why">${esc(reason)}</div></li>`;
        return `<div class="lab-big">${n} of 3 right</div>
            <p class="lab-muted" style="margin:0 0 8px">Checked against the Race Clock at the start of this turn. The clock assumes nothing changes.</p>
            <ul class="brief-res">
                ${item(1, 'Who wins?', WINNER_TXT[a.winner], WINNER_TXT[x.winner], g.q1, why.q1)}
                ${item(2, 'Your turns to 20', turnsTxt(a.turns), turnsTxt(x.turns), g.q2, why.q2 + (g.q2 === 'close' ? ' Off by one counts as close.' : ''))}
                ${item(3, 'This turn', PLAN_TXT[a.plan], PLAN_TXT[x.plan], g.q3, why.q3)}
                ${a.threat ? `<li><div class="brief-rq"><span>Threat</span><span class="lab-pill">Recorded</span></div>
                    <div class="brief-ans">“${esc(a.threat)}”</div><div class="brief-why">Graded once the Threat Map exists.</div></li>` : ''}
            </ul>`;
    }

    function noneHtml(ctx) {
        const hasChars = BriefingCore.anyCharacter(ctx.state, ctx.app.cardDB);
        const can = !!computeFn();
        return `<div class="lab-big">No briefing this turn</div>
            <p class="lab-muted">${hasChars
                ? 'Briefings start at the start of each turn. You can still brief this one: the clock will count only what can still happen this turn.'
                : 'Briefings start once a character is on the board. You can brief this turn anyway.'}</p>
            ${can ? '<button type="button" class="lab-btn-act is-primary" data-brief="now"><i class="fa-solid fa-clipboard-question"></i> Brief this turn</button>'
                : '<p class="lab-bad">The Race Clock file isn’t loaded, so there is nothing to check answers against.</p>'}`;
    }

    function calHtml(store) {
        const game = BriefingCore.tally(BriefingCore.entries(store));
        const life = BriefingCore.loadLifetime(storage());
        const row = (label, g, lf) => `<span class="brief-ck">${label}</span><span class="brief-cv">${g}</span><span class="brief-cv">${lf}</span>`;
        return `<div class="lab-section"><h4 class="lab-h">Calibration · % right</h4>
            <div class="brief-cal">
                <span class="brief-ch">Question</span><span class="brief-ch">This game</span><span class="brief-ch">Lifetime</span>
                ${row('Who wins', pctOf(game.q1[0], game.q1[1]), pctOf(life.q1[0], life.q1[1]))}
                ${row('Turns to 20', pctOf(game.q2[0], game.q2[2]), pctOf(life.q2[0], life.q2[2]))}
                ${row('… within one', pctOf(game.q2[0] + game.q2[1], game.q2[2]), pctOf(life.q2[0] + life.q2[1], life.q2[2]))}
                ${row('Race or slow', pctOf(game.q3[0], game.q3[1]), pctOf(life.q3[0], life.q3[1]))}
                ${row('Briefings', game.n, life.n)}
            </div></div>`;
    }

    function pastHtml(ctx, store, currentKey) {
        const list = BriefingCore.entries(store).filter(e => e.key !== currentKey && e.answers)
            .sort((a, b) => (b.turn - a.turn) || (b.active - a.active));
        if (!list.length) return '';
        const P = ctx.state.players;
        const mark = (g) => g === 'right' ? '<span class="brief-mark lab-good">✓</span>' : g === 'close' ? '<span class="brief-mark lab-warn">~</span>' : '<span class="brief-mark lab-bad">✗</span>';
        const rows = list.map(e => {
            const who = (P[e.active] && P[e.active].name) || ('P' + (e.active + 1));
            if (!e.grade) return `<li><span class="brief-pt">T${e.turn} · ${esc(who)}</span><span class="lab-faint">skipped</span></li>`;
            return `<li><span class="brief-pt">T${e.turn} · ${esc(who)}</span>
                <span>Who wins ${mark(e.grade.q1)}</span><span>Turns ${mark(e.grade.q2)}</span><span>Plan ${mark(e.grade.q3)}</span>
                <span class="lab-faint">clock: ${esc(WINNER_TXT[e.grade.expected.winner])}, ${esc(turnsTxt(e.grade.expected.turns))}</span></li>`;
        }).join('');
        return `<div class="lab-section"><h4 class="lab-h">Earlier this game</h4><ul class="brief-past">${rows}</ul></div>`;
    }

    // DOM: wrap > .brief-now (form or result; rebuilt only when its signature changes) + .brief-rest
    function render(el, ctx) {
        let wrap = el.querySelector(':scope > .brief-panel');
        if (!wrap) {
            el.innerHTML = '';
            wrap = document.createElement('div');
            wrap.className = 'brief-panel';
            wrap.innerHTML = '<div class="lab-section brief-now"></div><div class="brief-rest"></div>';
            wire(wrap);
            el.appendChild(wrap);
        }
        const store = ctx.store();
        const key = BriefingCore.keyOf(ctx.state);
        const entry = store[key];
        const status = !entry ? 'none' : entry.answers === null ? 'pending' : 'done';
        const sig = `${key}|${status}|${entry ? entry.bid : ''}`;
        const now = wrap.querySelector('.brief-now');
        // Keep the form stable while it's being filled in.
        // (While pending the signature doesn't change, so typing is never interrupted.)
        if (now.dataset.sig !== sig) {
            now.dataset.sig = sig;
            now.innerHTML = status === 'none' ? noneHtml(ctx) : status === 'pending' ? formHtml(entry) : resultHtml(entry);
        }
        const rest = calHtml(store) + pastHtml(ctx, store, key);
        const restEl = wrap.querySelector('.brief-rest');
        if (restEl._html !== rest) { restEl.innerHTML = rest; restEl._html = rest; }
    }

    // Live ctx for handlers (they outlive the render call that wired them).
    function liveCtx() {
        const p = H.plugins().find(x => x.id === ID);
        const a = root.App, s = a && a.state;
        if (!s) return null;
        return {
            app: a, state: s, me: s.activePlayer, opp: s.inactivePlayer, lib: L,
            store: () => { if (!s.ext || typeof s.ext !== 'object') s.ext = {}; if (!s.ext[ID] || typeof s.ext[ID] !== 'object') s.ext[ID] = {}; return s.ext[ID]; },
            persist: () => { try { a.saveToLocalStorage(); } catch (e) { /* ignore */ } },
            refresh: () => H.refresh(p ? p.id : ID)
        };
    }

    function wire(wrap) {
        wrap.addEventListener('input', (e) => syncSubmit(e.target.closest('form')));
        wrap.addEventListener('change', (e) => {
            const form = e.target.closest('form');
            if (!form) return;
            // a typed number and "Can't" are exclusive
            if (e.target.name === 'cant' && e.target.checked) form.querySelector('input[name="turns"]').value = '';
            syncSubmit(form);
        });
        wrap.addEventListener('click', (e) => {
            const b = e.target.closest('[data-brief]');
            if (!b) return;
            const ctx = liveCtx();
            if (!ctx) return;
            if (b.dataset.brief === 'now') { brief(ctx, 'manual'); H.refresh(); }
            else if (b.dataset.brief === 'skip') {
                const entry = ctx.store()[BriefingCore.keyOf(ctx.state)];
                if (entry && entry.answers === null) { BriefingCore.skip(entry); ctx.persist(); setAttention(false); H.refresh(); }
            }
        });
        wrap.addEventListener('submit', (e) => {
            e.preventDefault();
            const form = e.target;
            const ans = readForm(form);
            if (!formReady(ans)) return;
            const ctx = liveCtx();
            if (!ctx) return;
            const entry = ctx.store()[form.dataset.key];
            if (!entry || entry.answers !== null) return;
            BriefingCore.answer(entry, ans);
            BriefingCore.count(storage(), entry);
            ctx.persist();
            if (document.activeElement && form.contains(document.activeElement)) document.activeElement.blur();
            setAttention(false);
            H.refresh();
        });
    }
    function syncSubmit(form) {
        if (!form) return;
        const turns = form.querySelector('input[name="turns"]');
        const cant = form.querySelector('input[name="cant"]');
        if (turns.value.trim() !== '' && cant.checked && document.activeElement === turns) cant.checked = false;
        form.querySelector('button[type="submit"]').disabled = !formReady(readForm(form));
    }

    H.register({
        id: ID,
        name: 'Briefing',
        icon: 'fa-solid fa-clipboard-question',
        description: 'Three quick questions at the start of each turn, checked against the Race Clock.',
        defaultEnabled: false,
        order: 20,
        panel: { render },
        on: {
            turnStart(payload, ctx) { brief(ctx, 'turnStart'); },
            gameStart() { setAttention(false); },
            enabled() { lastAttention = null; },
            // Undo, bookmarks and loads can bring a pending briefing back (or take it away).
            render(payload, ctx) { setAttention(BriefingCore.pendingIn(ctx.state)); }
        },
        api: {
            pending(ctx) { return BriefingCore.pendingIn(ctx && ctx.state); },
            core: BriefingCore
        }
    });
})(typeof window !== 'undefined' ? window : globalThis);
