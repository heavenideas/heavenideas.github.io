// Turn Briefing — logic + plugin-hook tests with a fake host. Run: node practice_dojo/plugins/tests/turn_briefing.test.js
'use strict';
const assert = require('assert');
const path = require('path');

// ---- fake plugin host (just what the two plugins call outside of DOM rendering) ----
const defs = {};
const enabled = { raceClock: true, briefing: true };
const attentionCalls = [];
globalThis.DojoPlugins = {
    register(def) { defs[def.id] = def; },
    api(id) { return (defs[id] && enabled[id] && defs[id].api) || null; },
    plugins() { return Object.values(defs); },
    attention(id, on) { attentionCalls.push([id, !!on]); },
    refresh() {}, openDrawer() {}
};

require('../lab_lib.js');
const RaceClockCore = require('../race_clock.js');
const Brief = require('../turn_briefing.js');
assert.ok(defs.raceClock && defs.briefing, 'both plugins registered');
assert.strictEqual(defs.briefing.defaultEnabled, false);
assert.strictEqual(defs.raceClock.defaultEnabled, true);

const all = require(path.join(__dirname, '../../mastery_lab/allCards.json')).cards;
const db = {};
for (const c of all) db[c.id] = c;
const byName = (n) => { const c = all.find(x => x.fullName === n); if (!c) throw new Error('no card ' + n); return c; };
const MINNIE = byName('Minnie Mouse - Beloved Princess');
const MICKEY = byName('Mickey Mouse - True Friend');
const HANS = byName('Hans - Scheming Prince');

let n = 0;
const card = (c, o) => Object.assign({ instanceId: 'i' + (++n), cardId: c.id, exerted: false, damage: 0, drying: false }, o || {});
const state = (turn, active, p0, p1) => ({
    turn, activePlayer: active, inactivePlayer: 1 - active, ext: {},
    players: [Object.assign({ id: 0, name: 'Ann' }, p0), Object.assign({ id: 1, name: 'Bob' }, p1)]
});
// fake ctx, shaped like the host's makeCtx
function ctxFor(s, id) {
    let persisted = 0;
    const ctx = {
        app: { state: s, cardDB: db }, state: s, me: s.activePlayer, opp: s.inactivePlayer,
        store: () => { if (!s.ext[id]) s.ext[id] = {}; return s.ext[id]; },
        persist: () => { persisted++; }, refresh() {}, lib: globalThis.DojoLab,
        get persisted() { return persisted; }
    };
    return ctx;
}
function fakeStorage(initial) {
    const m = Object.assign({}, initial || {});
    return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, _m: m };
}

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

// Ann (P0) acting on turn 3: 10 lore, Hans + Mickey (5 a turn). Bob: 12 lore, 3 a turn.
// Clock: Ann wins on her turn 4 (2 turns), Bob would need his turn 5.
const raceState = () => state(3, 0, { lore: 10, field: [card(HANS), card(MICKEY)] }, { lore: 12, field: [card(MICKEY), card(MINNIE)] });

test('turnStart creates a pending briefing, flags attention, persists', () => {
    attentionCalls.length = 0;
    const s = raceState();
    const ctx = ctxFor(s, 'briefing');
    defs.briefing.on.turnStart({ player: 0, turn: 3 }, ctx);
    const e = s.ext.briefing['3-0'];
    assert.ok(e, 'entry stored under the turn key');
    assert.strictEqual(e.answers, null);
    assert.strictEqual(e.turn, 3); assert.strictEqual(e.active, 0); assert.strictEqual(e.key, '3-0');
    assert.strictEqual(e.clock.winner, 0);
    assert.deepStrictEqual(e.clock.turnsTo20, [2, 3]);
    assert.ok(!('lanes' in e.clock), 'snapshot is slim');
    assert.deepStrictEqual(e.clock, Brief.slim(RaceClockCore.compute(s, db, 0)));
    assert.deepStrictEqual(attentionCalls, [['briefing', true]]);
    assert.ok(ctx.persisted >= 1);
    // pending, seen from any plugin's ctx (Race Clock reads it with its own ctx)
    assert.strictEqual(defs.briefing.api.pending(ctxFor(s, 'raceClock')), true);
    assert.strictEqual(globalThis.DojoPlugins.api('briefing').pending({ state: s }), true);
});

test('turnStart never overwrites an existing entry', () => {
    const s = raceState();
    const ctx = ctxFor(s, 'briefing');
    defs.briefing.on.turnStart({}, ctx);
    const bid = s.ext.briefing['3-0'].bid;
    s.players[0].lore = 19;
    defs.briefing.on.turnStart({}, ctx);
    assert.strictEqual(s.ext.briefing['3-0'].bid, bid);
    assert.strictEqual(s.ext.briefing['3-0'].clock.lore[0], 10);
});

test('no auto-briefing before any character is on the board', () => {
    const s = state(1, 1, { lore: 0, field: [] }, { lore: 0, field: [] });
    defs.briefing.on.turnStart({}, ctxFor(s, 'briefing'));
    assert.ok(!s.ext.briefing || !s.ext.briefing['1-1']);
    assert.strictEqual(defs.briefing.api.pending({ state: s }), false);
});

test('works with the Race Clock switched off', () => {
    enabled.raceClock = false;
    try {
        const s = raceState();
        defs.briefing.on.turnStart({}, ctxFor(s, 'briefing'));
        assert.ok(s.ext.briefing['3-0']);
    } finally { enabled.raceClock = true; }
});

test('render hook keeps the Lab dot in sync (undo / load)', () => {
    const s = raceState();
    const ctx = ctxFor(s, 'briefing');
    defs.briefing.on.enabled({}, ctx);               // resets the remembered dot state
    attentionCalls.length = 0;
    defs.briefing.on.render({}, ctx);
    assert.deepStrictEqual(attentionCalls, [['briefing', false]]);
    defs.briefing.on.render({}, ctx);
    assert.strictEqual(attentionCalls.length, 1, 'no repeat calls when nothing changed');
    s.ext.briefing = { '3-0': Brief.newEntry(s, RaceClockCore.compute(s, db, 0), 'turnStart') };
    defs.briefing.on.render({}, ctx);
    assert.deepStrictEqual(attentionCalls[1], ['briefing', true]);
    Brief.answer(s.ext.briefing['3-0'], { winner: 'me', turns: 2, plan: 'race' });
    defs.briefing.on.render({}, ctx);
    assert.deepStrictEqual(attentionCalls[2], ['briefing', false]);
});

test('grading: who wins', () => {
    const c = RaceClockCore.compute(raceState(), db, 0);
    assert.strictEqual(Brief.grade(c, { winner: 'me', turns: 2, plan: 'race' }).q1, 'right');
    assert.strictEqual(Brief.grade(c, { winner: 'opp', turns: 2, plan: 'race' }).q1, 'wrong');
    assert.strictEqual(Brief.grade(c, { winner: 'none', turns: 2, plan: 'race' }).q1, 'wrong');
    const behind = RaceClockCore.compute(raceState(), db, 1);   // Bob's point of view
    assert.strictEqual(Brief.grade(behind, { winner: 'opp', turns: 3, plan: 'slow' }).q1, 'right');
});

test('grading: turns to 20 (exact, off by one, wrong, can’t)', () => {
    const c = RaceClockCore.compute(raceState(), db, 0);       // 2 turns
    const q2 = (t) => Brief.grade(c, { winner: 'me', turns: t, plan: 'race' }).q2;
    assert.strictEqual(q2(2), 'right');
    assert.strictEqual(q2(1), 'close');
    assert.strictEqual(q2(3), 'close');
    assert.strictEqual(q2(5), 'wrong');
    assert.strictEqual(q2(null), 'wrong');
    const stalled = RaceClockCore.compute(state(2, 0, { lore: 0, field: [] }, { lore: 0, field: [card(MINNIE)] }), db, 0);
    assert.strictEqual(stalled.turnsTo20[0], null);
    assert.strictEqual(Brief.grade(stalled, { winner: 'opp', turns: null, plan: 'slow' }).q2, 'right');
    assert.strictEqual(Brief.grade(stalled, { winner: 'opp', turns: 9, plan: 'slow' }).q2, 'wrong');
});

test('grading: race or slow it down', () => {
    const win = RaceClockCore.compute(raceState(), db, 0);
    assert.strictEqual(Brief.grade(win, { winner: 'me', turns: 2, plan: 'race' }).q3, 'right');
    assert.strictEqual(Brief.grade(win, { winner: 'me', turns: 2, plan: 'slow' }).q3, 'wrong');
    const lose = RaceClockCore.compute(raceState(), db, 1);
    assert.strictEqual(Brief.grade(lose, { winner: 'opp', turns: 3, plan: 'slow' }).q3, 'right');
    assert.strictEqual(Brief.grade(lose, { winner: 'opp', turns: 3, plan: 'race' }).q3, 'wrong');
    const stalled = RaceClockCore.compute(state(1, 1, { lore: 0, field: [] }, { lore: 0, field: [] }), db, 1);
    assert.strictEqual(Brief.grade(stalled, { winner: 'none', turns: null, plan: 'race' }).q3, 'right');
    assert.strictEqual(Brief.grade(stalled, { winner: 'none', turns: null, plan: 'slow' }).q3, 'right');
    assert.strictEqual(Brief.expected(stalled).winner, 'none');
});

test('explanations are plain sentences for every case', () => {
    const cases = [
        RaceClockCore.compute(raceState(), db, 0),
        RaceClockCore.compute(raceState(), db, 1),
        RaceClockCore.compute(state(1, 1, { lore: 0, field: [] }, { lore: 0, field: [] }), db, 1),
        RaceClockCore.compute(state(6, 0, { lore: 20, field: [] }, { lore: 3, field: [] }), db, 0)
    ];
    for (const c of cases) {
        const x = Brief.explain(Brief.slim(c));
        for (const k of ['q1', 'q2', 'q3']) { assert.ok(typeof x[k] === 'string' && x[k].length > 10, k); assert.ok(!/undefined|null|NaN/.test(x[k]), x[k]); }
    }
    assert.ok(/turn 4/.test(Brief.explain(cases[0]).q1));
});

test('answer → not pending; lifetime counted once, even after undo', () => {
    const s = raceState();
    const ctx = ctxFor(s, 'briefing');
    defs.briefing.on.turnStart({}, ctx);
    const entry = s.ext.briefing['3-0'];
    const undoCopy = JSON.parse(JSON.stringify(entry));   // what undo would restore
    const st = fakeStorage();
    const g = Brief.answer(entry, { winner: 'me', turns: '3', plan: 'race', threat: 'Bob’s Mickey' });
    assert.deepStrictEqual([g.q1, g.q2, g.q3], ['right', 'close', 'right']);
    assert.strictEqual(entry.answers.turns, 3);
    assert.strictEqual(defs.briefing.api.pending({ state: s }), false);
    assert.strictEqual(Brief.count(st, entry), true);
    assert.strictEqual(entry.counted, true);
    assert.strictEqual(Brief.count(st, entry), false, 'counted flag stops a re-render counting again');
    let life = Brief.loadLifetime(st);
    assert.deepStrictEqual([life.n, life.q1, life.q2, life.q3], [1, [1, 1], [0, 1, 1], [1, 1]]);
    // undo brings the entry back unanswered, same bid; answering again doesn't double count
    assert.strictEqual(undoCopy.answers, null);
    Brief.answer(undoCopy, { winner: 'opp', turns: 2, plan: 'slow' });
    assert.strictEqual(Brief.count(st, undoCopy), false);
    assert.strictEqual(undoCopy.counted, true);
    life = Brief.loadLifetime(st);
    assert.strictEqual(life.n, 1);
});

test('game tally, skipped entries ignored', () => {
    const s = raceState();
    const a = Brief.newEntry(s, RaceClockCore.compute(s, db, 0));
    Brief.answer(a, { winner: 'me', turns: 2, plan: 'race' });
    const b = Brief.newEntry(s, RaceClockCore.compute(s, db, 0)); b.key = '4-0';
    Brief.answer(b, { winner: 'opp', turns: 5, plan: 'race' });
    const c = Brief.newEntry(s, RaceClockCore.compute(s, db, 0)); c.key = '4-1';
    Brief.skip(c);
    const store = { '3-0': a, '4-0': b, '4-1': c, junk: { grade: { q1: 'right' } } };
    assert.strictEqual(Brief.entries(store).length, 3);
    const t = Brief.tally(Brief.entries(store));
    assert.strictEqual(t.n, 2);
    assert.deepStrictEqual(t.q1, [1, 2]);
    assert.deepStrictEqual(t.q2, [1, 0, 2]);
    assert.deepStrictEqual(t.q3, [2, 2]);
    assert.strictEqual(Brief.count(fakeStorage(), c), false, 'skipped entries never count');
    // skipped is no longer pending
    const s2 = raceState(); s2.ext.briefing = { '3-0': c };
    assert.strictEqual(Brief.pendingIn(s2), false);
});

test('lifetime storage: bad JSON, throwing storage, seen list capped', () => {
    assert.strictEqual(Brief.loadLifetime(fakeStorage({ [Brief.LIFETIME_KEY]: '{oops' })).n, 0);
    const boom = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    assert.strictEqual(Brief.loadLifetime(boom).n, 0);
    const s = raceState();
    const e = Brief.newEntry(s, RaceClockCore.compute(s, db, 0));
    Brief.answer(e, { winner: 'me', turns: 2, plan: 'race' });
    assert.doesNotThrow(() => Brief.count(boom, e));
    assert.strictEqual(Brief.loadLifetime(null).n, 0);
    const st = fakeStorage();
    for (let i = 0; i < 650; i++) {
        const x = Brief.newEntry(s, RaceClockCore.compute(s, db, 0)); x.bid = 'b' + i;
        Brief.answer(x, { winner: 'me', turns: 2, plan: 'race' });
        Brief.count(st, x);
    }
    const life = Brief.loadLifetime(st);
    assert.strictEqual(life.n, 650);
    assert.ok(life.seen.length <= 600);
});

test('Race Clock api.compute takes (state, me) or (state, cardDB, me)', () => {
    const s = raceState();
    globalThis.App = { cardDB: db, state: s };
    try {
        assert.deepStrictEqual(defs.raceClock.api.compute(s, 0), RaceClockCore.compute(s, db, 0));
        assert.deepStrictEqual(defs.raceClock.api.compute(s, db, 1), RaceClockCore.compute(s, db, 1));
    } finally { delete globalThis.App; }
});

let failed = 0;
for (const [name, fn] of tests) {
    try { fn(); console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.stack || e)); }
}
console.log(`turn_briefing: ${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);
