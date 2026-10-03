// node practice_dojo/plugins/tests/game_ledger.test.js
'use strict';
const assert = require('assert');
require('../lab_lib.js');
const Ledger = require('../game_ledger.js');
const F = require('./fixtures_journal.js');

const db = F.loadCardDB();
const C = F.CARD;
const names = F.PLAYERS.map(p => p.name);

let failed = 0, passed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  ok   ' + name); }
    catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.stack || e)); }
}
const byKey = (R) => Object.fromEntries(R.turns.map(T => [T.key, T]));
const rcpt = (R, iid) => R.receipts.find(r => r.iid === iid);

console.log('Game Ledger');

test('empty journal → empty ledger', () => {
    const R = Ledger.build([], db);
    assert.deepStrictEqual(R.turns, []);
    assert.deepStrictEqual(R.turningPoints, []);
    assert.deepStrictEqual(R.receipts, []);
    assert.strictEqual(R.latest, null);
    assert.strictEqual(Ledger.resources(R.latest, names), null);
    assert.deepStrictEqual(Ledger.build(undefined, db).turns, []);
});

test('one row per finished player-turn, in order; the in-progress turn is left out', () => {
    const R = Ledger.build(F.events(), db);
    assert.deepStrictEqual(R.turns.map(T => T.key), ['1-0', '1-1', '2-0', '2-1', '3-0', '3-1', '4-0', '4-1']);
    assert.strictEqual(R.latest.key, '4-1');
    assert.strictEqual(R.startsAt, 1);
});

test('lore gained = quests + positive manual lore for the active player', () => {
    const T = byKey(Ledger.build(F.events(), db));
    assert.deepStrictEqual(Object.values(T).map(t => t.lore), [0, 0, 1, 1, 1, 1, 1, 4]);
});

test('cards drawn = mid-turn draws by the active player only', () => {
    const T = byKey(Ledger.build(F.events(), db));
    assert.deepStrictEqual(Object.values(T).map(t => t.drawn), [0, 0, 1, 0, 0, 0, 0, 0]);
});

test('ink developed = printed cost of characters/items/locations played (not Actions)', () => {
    const T = byKey(Ledger.build(F.events(), db));
    assert.deepStrictEqual(Object.values(T).map(t => t.developed), [1, 2, 2, 2, 3, 2, 3, 4]);
    const ev = F.events().slice(0, 2);
    ev.push({ seq: 3, turn: 1, active: 0, kind: 'play', player: 0, iid: 'song', cardId: C.FOTOS, cost: 3, inkBefore: 3 });
    ev.push({ seq: 4, turn: 1, active: 0, kind: 'turnEnd', player: 0, turn: 1, lore: [0, 0], hand: [5, 7], deck: [53, 53], board: [0, 0], fieldChars: [0, 0], handCards: [] });
    assert.strictEqual(Ledger.build(ev, db).turns[0].developed, 0);
});

test('removed / lost: a banish in my challenge is my "removed" and their "lost"-free turn', () => {
    const T = byKey(Ledger.build(F.events(), db));
    assert.strictEqual(T['3-1'].removed, 1);           // Ben removed Tod (1 ink) — Tod's banish arrived after the next quest
    assert.deepStrictEqual(T['3-1'].removedCards, [C.TOD]);
    assert.strictEqual(T['3-1'].lost, 0);
    assert.strictEqual(T['4-0'].removed, 2);           // Ana removed Hamm (2 ink)
    assert.strictEqual(T['4-0'].lost, 0);
    assert.strictEqual(Object.values(T).reduce((s, t) => s + t.lost, 0), 0);
});

test('own card lost in my own challenge counts as my loss', () => {
    const ev = [
        { seq: 1, turn: 3, active: 0, kind: 'challenge', player: 0, attIid: 't', attId: C.TOD, defIid: 'h', defId: C.HAMM, toDef: 2, toAtt: 2, attDrying: false, defExerted: true, defType: 'Character' },
        { seq: 2, turn: 3, active: 0, kind: 'banish', player: 0, iid: 't', cardId: C.TOD, via: 'challenge' },
        { seq: 3, turn: 3, active: 0, kind: 'turnEnd', player: 0, turn: 3, lore: [0, 0], hand: [1, 1], deck: [1, 1], board: [0, 0], fieldChars: [0, 0], handCards: [] }
    ];
    const R = Ledger.build(ev, db);
    assert.strictEqual(R.turns[0].lost, 1);
    assert.strictEqual(R.turns[0].removed, 0);
    // Hamm (in play before the journal) gets the kill
    const h = rcpt(R, 'h');
    assert.strictEqual(h.removedValue, 1);
    assert.strictEqual(h.keyIn, null);
});

test('a challenge banish landing after turnEnd counts in the challenge\'s turn', () => {
    const ev = [
        { seq: 1, turn: 2, active: 0, kind: 'challenge', player: 0, attIid: 'm', attId: C.MULAN, defIid: 'h', defId: C.HAMM, toDef: 4, toAtt: 2, attDrying: false, defExerted: true, defType: 'Character' },
        { seq: 2, turn: 2, active: 0, kind: 'turnEnd', player: 0, turn: 2, lore: [0, 0], hand: [1, 1], deck: [1, 1], board: [0, 0], fieldChars: [0, 0], handCards: [] },
        { seq: 3, turn: 2, active: 1, kind: 'turnStart', player: 1, turn: 2 },
        { seq: 4, turn: 2, active: 1, kind: 'banish', player: 1, iid: 'h', cardId: C.HAMM, via: 'challenge' },
        { seq: 5, turn: 2, active: 1, kind: 'turnEnd', player: 1, turn: 2, lore: [0, 0], hand: [1, 1], deck: [1, 1], board: [0, 0], fieldChars: [0, 0], handCards: [] }
    ];
    const R = Ledger.build(ev, db);
    assert.strictEqual(R.turns[0].removed, 2);
    assert.strictEqual(R.turns[1].lost, 0);
    assert.strictEqual(rcpt(R, 'm').removedValue, 2);
    assert.strictEqual(rcpt(R, 'h').keyOut, '2-0');
});

test('end-of-turn snapshot is carried through', () => {
    const T = byKey(Ledger.build(F.events(), db));
    assert.deepStrictEqual(T['3-1'].end.lore, [2, 2]);
    assert.deepStrictEqual(T['3-1'].end.hand, [4, 4]);
    assert.deepStrictEqual(T['3-1'].end.board, [5, 6]);
    assert.deepStrictEqual(T['3-1'].end.deck, [50, 50]);
});

test('race lead = (lore + 2 × lore-per-turn) P1 − P2, with deltas', () => {
    const R = Ledger.build(F.events(), db);
    assert.deepStrictEqual(R.turns.map(T => T.rate), [[1, 0], [1, 1], [1, 1], [1, 2], [3, 2], [2, 5], [3, 4], [3, 6]]);
    assert.deepStrictEqual(R.turns.map(T => T.lead), [2, 0, 1, -2, 3, -6, -1, -9]);
    assert.deepStrictEqual(R.turns.map(T => T.leadDelta), [2, -2, 1, -3, 5, -9, 5, -8]);
});

test('turning points: 3 biggest |swings| after turn 2, ties to the earlier turn, in order', () => {
    const R = Ledger.build(F.events(), db);
    assert.deepStrictEqual(R.turningPoints, ['3-0', '3-1', '4-1']);
    assert.deepStrictEqual(R.turns.filter(T => T.turningPoint).map(T => T.key), ['3-0', '3-1', '4-1']);
});

test('turning points: none before turn 3', () => {
    const ev = F.events();
    const cut = ev.findIndex(e => e.kind === 'turnEnd' && e.turn === 2 && e.player === 1);
    assert.deepStrictEqual(Ledger.build(ev.slice(0, cut + 1), db).turningPoints, []);
});

test('turnEnd.boardLore, when the host provides it, wins over the journal estimate', () => {
    const ev = F.events().slice(0, 5).map(e => e.kind === 'turnEnd' ? Object.assign({}, e, { boardLore: [5, 0] }) : e);
    assert.strictEqual(Ledger.build(ev, db).turns[0].lead, 10);
});

test('receipt: Tod quested twice, then died in a challenge', () => {
    const t = rcpt(Ledger.build(F.events(), db), 'a-tod');
    assert.strictEqual(t.owner, 0);
    assert.strictEqual(t.turnIn, 1);
    assert.strictEqual(t.keyIn, '1-0');
    assert.strictEqual(t.turnsSurvived, 3);
    assert.strictEqual(t.quests, 2);
    assert.strictEqual(t.lore, 2);
    assert.strictEqual(t.challenges, 0);
    assert.strictEqual(t.challenged, 1);
    assert.strictEqual(t.how, 'banished');
    assert.strictEqual(t.keyOut, '3-1');
    assert.strictEqual(t.value, 2);
});

test('receipts: kills with value, how each card left, sorted by value created', () => {
    const R = Ledger.build(F.events(), db);
    const hamm = rcpt(R, 'b-hamm');
    assert.deepStrictEqual(hamm.kills.map(k => [k.cardId, k.value]), [[C.TOD, 1]]);
    assert.strictEqual(hamm.value, 0.5);
    assert.strictEqual(hamm.how, 'banished');
    const mulan = rcpt(R, 'a-mulan');
    assert.deepStrictEqual(mulan.kills.map(k => [k.cardId, k.value]), [[C.HAMM, 2]]);
    assert.strictEqual(mulan.how, 'in play');
    assert.strictEqual(mulan.value, 1);
    assert.deepStrictEqual(R.receipts.map(r => r.iid),
        ['b-rapunzel', 'b-sebastian', 'a-tod', 'a-mulan', 'b-hamm', 'a-lantern', 'a-mickey-sp', 'b-pongo']);
    assert.ok(!R.receipts.some(r => r.iid === 'a-fotos'), 'inked cards have no receipt');
});

test('shift ends the receipt of the character underneath', () => {
    const end = (seq, p, t) => ({ seq, turn: t, active: p, kind: 'turnEnd', player: p, turn: t, lore: [0, 0], hand: [0, 0], deck: [0, 0], board: [0, 0], fieldChars: [0, 0], handCards: [] });
    const ev = [
        { seq: 1, turn: 1, active: 0, kind: 'play', player: 0, iid: 'tod1', cardId: C.TOD, cost: 1, inkBefore: 1 },
        end(2, 0, 1),
        { seq: 3, turn: 2, active: 0, kind: 'shift', player: 0, iid: 'tod7', cardId: 2555, cost: 5, inkBefore: 5 }
    ];
    const extraDb = Object.assign({}, db, { 2555: { id: 2555, name: 'Tod', fullName: 'Tod - Knows All the Tricks', type: 'Character', cost: 7, lore: 2, strength: 6, willpower: 6 } });
    ev.push(end(4, 0, 2));
    const R = Ledger.build(ev, extraDb);
    assert.strictEqual(rcpt(R, 'tod1').how, 'shifted over');
    assert.strictEqual(rcpt(R, 'tod7').how, 'in play');
    assert.strictEqual(R.turns[1].developed, 7);
    assert.deepStrictEqual(R.turns[1].rate, [2, 0]);
});

test('resources: from the latest turnEnd, with a plain verdict', () => {
    const r = Ledger.resources(Ledger.build(F.events(), db).latest, names);
    assert.deepStrictEqual(r.hand, [4, 2]);
    assert.deepStrictEqual(r.board, [8, 8]);
    assert.strictEqual(r.verdict, 'Same ink on the board; Ana has more cards in hand.');
    const mk = (hand, board) => Ledger.resources({ key: 'k', turn: 1, active: 0, end: { hand, board, fieldChars: [0, 0], lore: [0, 0], deck: [0, 0] } }, names).verdict;
    assert.strictEqual(mk([5, 3], [2, 6]), 'Split: Ana has more cards in hand, Ben has more on the board.');
    assert.strictEqual(mk([2, 3], [2, 6]), 'Ben is ahead on both: more cards in hand and more ink on the board.');
    assert.strictEqual(mk([3, 3], [6, 6]), 'Even: same cards in hand, same ink on the board.');
});

test('journal is not mutated', () => {
    const ev = F.events();
    const before = JSON.stringify(ev);
    Ledger.build(ev, db);
    assert.strictEqual(JSON.stringify(ev), before);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
