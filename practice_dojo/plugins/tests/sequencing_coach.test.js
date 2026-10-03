// node practice_dojo/plugins/tests/sequencing_coach.test.js
'use strict';
const assert = require('assert');
require('../lab_lib.js');
const Coach = require('../sequencing_coach.js');
const F = require('./fixtures_journal.js');

const db = F.loadCardDB();
const C = F.CARD;
const names = F.PLAYERS.map(p => p.name);

let failed = 0, passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  ok   ' + name); }
    catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.stack || e)); }
}

// Synthetic one-turn journal: [ [kind, fields], … ] played by `active` on `turn`, ended by a turnEnd.
function oneTurn(active, steps, endSnap, turn) {
    turn = turn || 3;
    const ev = [];
    const push = (kind, f) => ev.push(Object.assign({ seq: ev.length + 1, turn, active, kind }, f));
    push('turnStart', { player: active, turn });
    for (const [kind, f] of steps) push(kind, Object.assign({ player: active }, f));
    push('turnEnd', Object.assign({ player: active, turn, inkReady: 0, inkTotal: 3, lore: [0, 0], hand: [3, 3], deck: [40, 40],
        board: [0, 0], fieldChars: [0, 0], handCards: [] }, endSnap || {}));
    return ev;
}
const rules = (flags) => flags.map(f => f.rule);
const flagsOf = (ev) => Coach.flags(Coach.turns(ev).pop(), db, names);

console.log('Sequencing Coach');

// --- segmentation ------------------------------------------------------------------

test('fixture: 8 finished player-turns, the in-progress turn 5 is left out', () => {
    const ts = Coach.turns(F.events());
    assert.deepStrictEqual(ts.map(t => t.key), ['1-0', '1-1', '2-0', '2-1', '3-0', '3-1', '4-0', '4-1']);
    assert.deepStrictEqual(ts.map(t => t.player), [0, 1, 0, 1, 0, 1, 0, 1]);
});

test('mulligans, turnStart and turnEnd are never steps', () => {
    for (const t of Coach.turns(F.events())) {
        assert.ok(t.steps.every(s => !['mulligan', 'turnStart', 'turnEnd'].includes(s.kind)), t.key);
        assert.strictEqual(t.end.kind, 'turnEnd');
    }
    assert.deepStrictEqual(Coach.turns(F.events())[0].steps.map(s => s.kind), ['ink', 'play']);
});

test('challenge + delayed banish of the non-active player\'s card folds into the challenge step', () => {
    const t = Coach.turns(F.events()).find(x => x.key === '3-1');
    assert.deepStrictEqual(t.steps.map(s => s.kind), ['ink', 'challenge', 'quest', 'play']);
    const ch = t.steps[1];
    assert.deepStrictEqual(t.outcomes[ch.seq], { defBanished: true, attBanished: false });
    const d = Coach.describe(t, db, names);
    assert.strictEqual(d.steps[1].text, 'Hamm challenged Tod — Tod banished');
    assert.strictEqual(d.steps[2].text, 'Quested with Rapunzel +1 lore');
});

test('a challenge banish that lands after turnEnd still belongs to the challenge (and is hidden next turn)', () => {
    const ev = F.events().slice(0, 0);
    let seq = 0;
    const push = (turn, active, kind, f) => ev.push(Object.assign({ seq: ++seq, turn, active, kind }, f));
    push(2, 0, 'challenge', { player: 0, attIid: 'm', attId: C.MULAN, defIid: 'h', defId: C.HAMM, toDef: 2, toAtt: 2, attDrying: false, defExerted: true, defType: 'Character' });
    push(2, 0, 'turnEnd', { player: 0, turn: 2, inkReady: 0, handCards: [] });
    push(2, 1, 'turnStart', { player: 1, turn: 2 });
    push(2, 1, 'banish', { player: 1, iid: 'h', cardId: C.HAMM, via: 'challenge' });
    push(2, 1, 'ink', { player: 1, iid: 'x', cardId: C.SIMBA_PC });
    push(2, 1, 'turnEnd', { player: 1, turn: 2, inkReady: 0, handCards: [] });
    const ts = Coach.turns(ev);
    assert.strictEqual(Coach.describe(ts[0], db, names).steps[0].text, 'Mulan challenged Hamm — Hamm banished');
    assert.deepStrictEqual(ts[1].steps.map(s => s.kind), ['ink']);
});

test('a manual banish (no via) stays a step of its own', () => {
    const ev = oneTurn(0, [['banish', { player: 1, iid: 'h', cardId: C.HAMM }]]);
    const d = Coach.describe(Coach.turns(ev)[0], db, names);
    assert.strictEqual(d.steps[0].text, "Hamm (Ben's) was banished");
});

test('step texts read like a player would say them', () => {
    const t = Coach.turns(F.events()).find(x => x.key === '2-0');
    const d = Coach.describe(t, db, names);
    assert.deepStrictEqual(d.steps.map(s => s.text), ['Quested with Tod +1 lore', 'Inked Stitch', 'Drew a card (Mickey Mouse)', 'Played Lantern (2 ink)']);
    assert.strictEqual(d.end.text, 'Ended the turn with 0 ink ready and 5 cards in hand');
});

test('default turn = the latest finished turn of the player who is not active now', () => {
    const ts = Coach.turns(F.events());
    assert.strictEqual(Coach.defaultKey(ts, 0), '4-1');
    assert.strictEqual(Coach.defaultKey(ts, 1), '4-0');
    assert.strictEqual(Coach.defaultKey([], 0), null);
});

test('empty journal → no turns, no flags', () => {
    assert.deepStrictEqual(Coach.turns([]), []);
    assert.deepStrictEqual(Coach.turns(undefined), []);
    assert.deepStrictEqual(Coach.flags([], db), []);
});

// --- flags on the fixture ------------------------------------------------------------

test('fixture flags per turn', () => {
    const got = {};
    for (const t of Coach.turns(F.events())) got[t.key] = rules(Coach.flags(t, db, names));
    assert.deepStrictEqual(got, {
        '1-0': [], '1-1': ['notPossible'], '2-0': ['inkBeforeDraw'], '2-1': [],
        '3-0': [], '3-1': ['inkLeft'], '4-0': ['noInk'], '4-1': []
    });
});

test('summary line', () => {
    assert.strictEqual(Coach.summary(0), 'Clean turn');
    assert.strictEqual(Coach.summary(1), '1 thing to look at');
    assert.strictEqual(Coach.summary(2), '2 things to look at');
});

test('flags() also takes a plain array of one turn\'s events', () => {
    const ev = F.events();
    const t = Coach.turns(ev).find(x => x.key === '2-0');
    const slice = ev.filter(e => e.seq >= t.steps[0].seq && e.seq <= t.end.seq);
    assert.deepStrictEqual(rules(Coach.flags(slice, db)), ['inkBeforeDraw']);
});

// --- ink before draw -------------------------------------------------------------------

test('ink before draw: fires, names the drawn card, sits on the ink step', () => {
    const ev = oneTurn(0, [['ink', { iid: 's', cardId: C.STITCH }], ['quest', { iid: 't', cardId: C.TOD, lore: 1 }], ['draw', { iid: 'w', cardId: C.MICKEY_WS }]]);
    const f = flagsOf(ev);
    assert.deepStrictEqual(rules(f), ['inkBeforeDraw']);
    assert.strictEqual(f[0].at, 2);
    assert.match(f[0].text, /You inked Stitch before drawing\./);
    assert.match(f[0].text, /draw first, then choose: you'd have seen Mickey Mouse\./);
});

test('ink before draw: silent when the draw came first, or the draw was the opponent\'s', () => {
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [['draw', { iid: 'w', cardId: C.MICKEY_WS }], ['ink', { iid: 's', cardId: C.STITCH }]]))), []);
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [['ink', { iid: 's', cardId: C.STITCH }], ['draw', { player: 1, iid: 'w', cardId: C.HAMM }]]))), []);
});

// --- support after the challenge --------------------------------------------------------

const challenge = (f) => ['challenge', Object.assign({ attIid: 't', attId: C.TOD, defIid: 'h', defId: C.HAMM, toDef: 2, toAtt: 2, attDrying: false, defExerted: true, defType: 'Character' }, f || {})];

test('support after the challenge: fires and says the defender survived', () => {
    const f = flagsOf(oneTurn(0, [challenge(), ['quest', { iid: 'mu', cardId: C.MULAN, lore: 2 }]]));
    assert.deepStrictEqual(rules(f), ['supportAfterChallenge']);
    assert.match(f[0].text, /^Support adds its strength to a challenger — quest with it first\./);
    assert.match(f[0].text, /Mulan could have given Tod \+2 strength; Hamm survived that challenge\./);
});

test('support after the challenge: no "survived" when the defender was banished', () => {
    const ev = oneTurn(0, [challenge(), ['banish', { player: 1, iid: 'h', cardId: C.HAMM, via: 'challenge' }], ['quest', { iid: 'mu', cardId: C.MULAN, lore: 2 }]]);
    const f = flagsOf(ev);
    assert.deepStrictEqual(rules(f), ['supportAfterChallenge']);
    assert.doesNotMatch(f[0].text, /survived/);
});

test('support: silent when it quested first, when it isn\'t Support, or when it arrived after the challenge', () => {
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [['quest', { iid: 'mu', cardId: C.MULAN, lore: 2 }], challenge()]))), []);
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [challenge(), ['quest', { iid: 'r', cardId: C.RAPUNZEL, lore: 1 }]]))), []);
    // played after the challenge: it couldn't have quested before it (and questing while drying is its own flag)
    const f = rules(flagsOf(oneTurn(0, [challenge(), ['play', { iid: 'mu', cardId: C.MULAN, cost: 3, inkBefore: 3 }], ['quest', { iid: 'mu', cardId: C.MULAN, lore: 2, drying: true }]])));
    assert.deepStrictEqual(f, ['notPossible']);
});

// --- not possible here ---------------------------------------------------------------------

test('not possible: challenge with a drying attacker (but Rush is fine)', () => {
    const f = flagsOf(oneTurn(0, [challenge({ attDrying: true })]));
    assert.deepStrictEqual(rules(f), ['notPossible']);
    assert.match(f[0].text, /Tod came into play this turn, so it can't challenge yet/);
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [challenge({ attIid: 'f', attId: 43, attDrying: true })]))), []);
});

test('not possible: challenge into a ready character (a Location is fine)', () => {
    const f = flagsOf(oneTurn(0, [challenge({ defExerted: false })]));
    assert.deepStrictEqual(rules(f), ['notPossible']);
    assert.match(f[0].text, /Hamm was ready\. Only exerted characters can be challenged\./);
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [challenge({ defIid: 'nl', defId: 468, defExerted: false, defType: 'Location' })]))), []);
});

test('not possible: challenging an Evasive character without Evasive', () => {
    const f = flagsOf(oneTurn(0, [challenge({ defIid: 'p', defId: C.PONGO })]));
    assert.deepStrictEqual(rules(f), ['notPossible']);
    assert.match(f[0].text, /Pongo has Evasive/);
});

test('not possible: quest while drying, or already exerted', () => {
    const a = flagsOf(oneTurn(0, [['quest', { iid: 't', cardId: C.TOD, lore: 1, drying: true, wasExerted: false }]]));
    assert.deepStrictEqual(rules(a), ['notPossible']);
    assert.match(a[0].text, /need to dry/);
    const b = flagsOf(oneTurn(0, [['quest', { iid: 't', cardId: C.TOD, lore: 1, drying: false, wasExerted: true }]]));
    assert.deepStrictEqual(rules(b), ['notPossible']);
    assert.match(b[0].text, /already exerted/);
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [['quest', { iid: 't', cardId: C.TOD, lore: 1, drying: false, wasExerted: false }]]))), []);
});

test('not possible: quest with a Reckless character', () => {
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [['quest', { iid: 'g', cardId: C.GASTON, lore: 0, drying: false, wasExerted: false }]]))), ['notPossible']);
});

test('not possible: play or shift with less ink than it costs', () => {
    const a = flagsOf(oneTurn(0, [['play', { iid: 'm', cardId: C.MULAN, cost: 3, inkBefore: 2 }]]));
    assert.deepStrictEqual(rules(a), ['notPossible']);
    assert.strictEqual(a[0].text, 'Mulan costs 3 ink and you had 2 ready.');
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [['shift', { iid: 'tk', cardId: 2555, cost: 5, inkBefore: 4 }]]))), ['notPossible']);
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [['play', { iid: 'm', cardId: C.MULAN, cost: 3, inkBefore: 3 }]]))), []);
});

// --- end-of-turn flags -----------------------------------------------------------------------

test('ink left on the table: fires for a non-Song card that fits', () => {
    const f = flagsOf(oneTurn(0, [['ink', { iid: 'x', cardId: C.STITCH }]], { inkReady: 2, handCards: [C.PONGO, C.HAMM] }));
    assert.deepStrictEqual(rules(f), ['inkLeft']);
    assert.strictEqual(f[0].at, 'end');
    assert.strictEqual(f[0].title, '2 ink unspent');
    assert.match(f[0].text, /Hamm \(2 ink\) sat in hand/);
});

test('ink left on the table: silent for Songs, for cards that don\'t fit, and at 0 ink', () => {
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [['ink', { iid: 'x', cardId: C.STITCH }]], { inkReady: 3, handCards: [C.FOTOS] }))), []);
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [['ink', { iid: 'x', cardId: C.STITCH }]], { inkReady: 1, handCards: [C.HAMM] }))), []);
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [['ink', { iid: 'x', cardId: C.STITCH }]], { inkReady: 0, handCards: [C.TOD] }))), []);
});

test('no ink this turn: info when an inkable card was in hand', () => {
    const f = flagsOf(oneTurn(0, [], { handCards: [C.HADES, C.MULAN] }));
    assert.deepStrictEqual(rules(f), ['noInk']);
    assert.strictEqual(f[0].level, 'info');
    assert.match(f[0].text, /Mulan was inkable/);
});

test('no ink this turn: silent when the hand was all uninkable, or when you inked', () => {
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [], { handCards: [C.HADES, C.LANTERN] }))), []);
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [['ink', { iid: 'x', cardId: C.STITCH }]], { handCards: [C.MULAN] }))), []);
    // the opponent inking during my turn doesn't count as mine
    assert.deepStrictEqual(rules(flagsOf(oneTurn(0, [['ink', { player: 1, iid: 'x', cardId: C.STITCH }]], { handCards: [C.MULAN] }))), ['noInk']);
});

test('flags are attached to the step they concern in describe()', () => {
    const t = Coach.turns(F.events()).find(x => x.key === '1-1');
    const d = Coach.describe(t, db, names);
    assert.deepStrictEqual(d.steps.map(s => s.flags.length), [0, 1]);
    assert.strictEqual(d.end.flags.length, 0);
    const t2 = Coach.turns(F.events()).find(x => x.key === '3-1');
    assert.strictEqual(Coach.describe(t2, db, names).end.flags[0].rule, 'inkLeft');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
