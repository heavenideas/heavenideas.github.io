// Race Clock — pure logic tests. Run: node practice_dojo/plugins/tests/race_clock.test.js
'use strict';
const assert = require('assert');
const path = require('path');

require('../lab_lib.js');                       // sets globalThis.DojoLab
const Core = require('../race_clock.js');
const lib = globalThis.DojoLab;

// ---- card DB from the real card list, indexed by id ----
const all = require(path.join(__dirname, '../../mastery_lab/allCards.json')).cards;
const db = {};
for (const c of all) db[c.id] = c;
const byName = (n) => { const c = all.find(x => x.fullName === n); if (!c) throw new Error('no card ' + n); return c; };

const MINNIE = byName('Minnie Mouse - Beloved Princess');   // lore 1
const MICKEY = byName('Mickey Mouse - True Friend');        // lore 2
const HANS = byName('Hans - Scheming Prince');              // lore 3
const GASTON = byName('Gaston - Arrogant Hunter');          // Reckless, lore 0
const ROCK = byName('Pride Lands - Pride Rock');            // Location, lore 1
const CASTLE = byName("The Queen's Castle - Mirror Chamber"); // Location, lore 2
const JETSAM = byName("Jetsam - Ursula's Spy");             // Evasive
const GOOFY = byName('Goofy - Musketeer');                  // Bodyguard
const RAFIKI = byName('Rafiki - Mysterious Sage');          // Rush
// No printed Reckless character has lore > 0, so make one to prove Reckless is excluded.
const RECKLESS2 = Object.assign({}, GASTON, { id: 900001, lore: 2 });
db[RECKLESS2.id] = RECKLESS2;

assert.strictEqual(MINNIE.lore, 1); assert.strictEqual(MICKEY.lore, 2); assert.strictEqual(HANS.lore, 3);
assert.ok(lib.kw(GASTON, 'Reckless')); assert.ok(lib.isLocation(ROCK)); assert.strictEqual(CASTLE.lore, 2);
assert.ok(lib.kw(JETSAM, 'Evasive')); assert.ok(lib.kw(GOOFY, 'Bodyguard')); assert.ok(lib.kw(RAFIKI, 'Rush'));

let n = 0;
const card = (c, o) => Object.assign({ instanceId: 'i' + (++n), cardId: c.id, exerted: false, damage: 0, drying: false, locationId: null }, o || {});
const state = (turn, active, p0, p1) => ({
    turn, activePlayer: active, inactivePlayer: 1 - active, history: ['big'],
    players: [Object.assign({ id: 0, name: 'Ann', hand: [], deck: [], inkwell: [], discard: [] }, p0),
        Object.assign({ id: 1, name: 'Bob', hand: [], deck: [], inkwell: [], discard: [] }, p1)]
});

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

test('rate, turns to 20 and finish turns', () => {
    const s = state(3, 0, { lore: 10, field: [card(HANS), card(MICKEY)] }, { lore: 12, field: [card(MICKEY), card(MINNIE)] });
    const c = Core.compute(s, db, 0);
    assert.deepStrictEqual(c.lore, [10, 12]);
    assert.deepStrictEqual(c.rate, [5, 3]);
    assert.strictEqual(c.availNow, 5);
    assert.deepStrictEqual(c.turnsTo20, [2, 3]);     // you: 15 now, 20 next turn; them: 15, 18, 21
    assert.deepStrictEqual(c.finishTurn, [4, 5]);
    assert.strictEqual(c.winner, 0);
    assert.strictEqual(c.margin, 3);
    assert.strictEqual(c.verdict, 'ahead');
    assert.strictEqual(c.spare, 2);
    assert.ok(c.myTurn);
    assert.deepStrictEqual(c.lanes.map(l => [l.turn, l.active, l.lore]), [[3, 0, [15, 12]], [3, 1, [15, 15]], [4, 0, [20, 15]]]);
});

test('default perspective is the active player; opponent view mirrors it', () => {
    const s = state(3, 0, { lore: 10, field: [card(HANS), card(MICKEY)] }, { lore: 12, field: [card(MICKEY), card(MINNIE)] });
    const mine = Core.compute(s, db);
    assert.strictEqual(mine.me, 0);
    const theirs = Core.compute(s, db, 1);
    assert.strictEqual(theirs.myTurn, false);
    assert.deepStrictEqual(theirs.lore, [12, 10]);
    assert.deepStrictEqual(theirs.finishTurn, [5, 4]);
    assert.strictEqual(theirs.winner, 0);              // player 0 wins
    assert.strictEqual(theirs.verdict, 'behind');
    assert.strictEqual(theirs.margin, -3);
});

test('turn order: equal races go to whoever acts first', () => {
    // Player 1 acting on turn 4, both 16 lore at 2 a turn: player 1 gets there on their turn 5,
    // player 0 would need their turn 6.
    const s = state(4, 1, { lore: 16, field: [card(MICKEY)] }, { lore: 16, field: [card(MICKEY)] });
    const c = Core.compute(s, db, 1);
    assert.deepStrictEqual(c.turnsTo20, [2, 2]);
    assert.deepStrictEqual(c.finishTurn, [5, 6]);
    assert.strictEqual(c.winner, 1);
    assert.strictEqual(c.margin, 1);
    assert.strictEqual(c.verdict, 'narrow');
    const o = Core.compute(s, db, 0);
    assert.strictEqual(o.winner, 1);
    assert.strictEqual(o.verdict, 'close');
    assert.strictEqual(o.margin, -1);
});

test('turn order: player 0 acting but already exerted loses a same-length race', () => {
    // P0 on turn 4 has already quested (exerted): 16 → 18 (T5) → 20 (T6). P1: 16 → 18 (T4) → 20 (T5).
    const s = state(4, 0, { lore: 16, field: [card(MICKEY, { exerted: true })] }, { lore: 16, field: [card(MICKEY)] });
    const c = Core.compute(s, db, 0);
    assert.strictEqual(c.availNow, 0);
    assert.deepStrictEqual(c.turnsTo20, [3, 2]);
    assert.deepStrictEqual(c.finishTurn, [6, 5]);
    assert.strictEqual(c.winner, 1);
    assert.strictEqual(c.verdict, 'close');
});

test('stalled: no characters anywhere', () => {
    const s = state(1, 1, { lore: 0, field: [] }, { lore: 0, field: [] });
    const c = Core.compute(s, db, 1);
    assert.strictEqual(c.winner, null);
    assert.strictEqual(c.verdict, 'stalled');
    assert.deepStrictEqual(c.turnsTo20, [null, null]);
    assert.deepStrictEqual(c.finishTurn, [null, null]);
    assert.strictEqual(c.margin, null);
    assert.strictEqual(c.lanes.length, 4);
    assert.ok(c.lanes.every(l => l.lore[0] === 0 && l.lore[1] === 0));
});

test('one side stalled: the other is ahead / behind with no margin', () => {
    const s = state(5, 0, { lore: 4, field: [card(GASTON)] }, { lore: 3, field: [card(MINNIE)] });
    const c = Core.compute(s, db, 0);
    assert.strictEqual(c.rate[0], 0);
    assert.strictEqual(c.turnsTo20[0], null);
    assert.strictEqual(c.turnsTo20[1], 17);
    assert.strictEqual(c.winner, 1);
    assert.strictEqual(c.margin, null);
    assert.strictEqual(c.verdict, 'behind');
    assert.ok(c.lanes.length <= 24);
});

test('already at 20', () => {
    const s = state(7, 1, { lore: 21, field: [card(MICKEY)] }, { lore: 15, field: [card(HANS)] });
    const c = Core.compute(s, db, 1);
    assert.ok(c.done);
    assert.strictEqual(c.winner, 0);
    assert.strictEqual(c.verdict, 'behind');
    assert.deepStrictEqual(c.turnsTo20, [2, 0]);
    assert.strictEqual(c.finishTurn[1], 7);
    assert.deepStrictEqual(c.lanes, []);
});

test('reaching 20 this turn with what can still quest', () => {
    const s = state(6, 0, { lore: 17, field: [card(HANS)] }, { lore: 19, field: [card(MINNIE)] });
    const c = Core.compute(s, db, 0);
    assert.deepStrictEqual(c.turnsTo20, [1, 1]);
    assert.deepStrictEqual(c.finishTurn, [6, 6]);
    assert.strictEqual(c.winner, 0);
    assert.strictEqual(c.verdict, 'narrow');
    assert.strictEqual(c.lanes.length, 1);
});

test('drying, exerted and Reckless', () => {
    const s = state(2, 0, {
        lore: 0, field: [card(HANS, { drying: true }), card(MICKEY, { exerted: true }), card(MINNIE), card(RECKLESS2)]
    }, { lore: 0, field: [card(HANS, { exerted: true, drying: true })] });
    const c = Core.compute(s, db, 0);
    assert.strictEqual(c.rate[0], 6);                  // 3 + 2 + 1, Reckless excluded
    assert.strictEqual(c.availNow, 1);                 // only Minnie can quest now
    assert.strictEqual(c.rate[1], 3);                  // their exerted/drying Hans quests next turn
    assert.strictEqual(c.turnsTo20[0], 1 + Math.ceil(19 / 6));
    assert.ok(!Core.canQuest(s.players[0].field[3], RECKLESS2));
});

test('locations: count on the owner’s next turn, not in what can quest now', () => {
    const s = state(3, 0, { lore: 5, field: [card(CASTLE), card(MINNIE)] }, { lore: 5, field: [card(ROCK), card(MICKEY)] });
    const c = Core.compute(s, db, 0);
    assert.deepStrictEqual(c.rate, [3, 3]);
    assert.strictEqual(c.availNow, 1);
    // you: 6 (T3), 9, 12, 15, 18, 21 → 6 turns; them: 8, 11, 14, 17, 20 → 5 turns
    assert.deepStrictEqual(c.turnsTo20, [6, 5]);
    assert.deepStrictEqual(c.finishTurn, [8, 7]);
    assert.strictEqual(c.winner, 1);
});

test('compute is read-only and JSON-safe', () => {
    const s = state(3, 0, { lore: 2, field: [card(MINNIE)] }, { lore: 0, field: [] });
    const before = JSON.stringify(s);
    const c = Core.compute(s, db, 0);
    assert.strictEqual(JSON.stringify(s), before);
    assert.deepStrictEqual(JSON.parse(JSON.stringify(c)), c);
    const l = Core.lite(s);
    assert.ok(!('history' in l));
    l.players[0].field[0].exerted = true;
    assert.strictEqual(s.players[0].field[0].exerted, false);
});

// Same arithmetic as App.challengeOutcome, for the cards these tests use.
function outcomeFor(s) {
    const find = (iid) => { for (const p of s.players) { const c = p.field.find(x => x.instanceId === iid); if (c) return c; } return null; };
    return (a, d) => {
        const A = find(a), D = find(d); const aDb = db[A.cardId], dDb = db[D.cardId];
        const toDef = (aDb.strength || 0), toAtt = (dDb.strength || 0);
        return { aName: aDb.name, dName: dDb.name, toDef, toAtt, aW: aDb.willpower, dW: dDb.willpower, aDmg: A.damage, dDmg: D.damage,
            aAfter: A.damage + toAtt, dAfter: D.damage + toDef, aDies: A.damage + toAtt >= aDb.willpower, dDies: D.damage + toDef >= dDb.willpower, notes: [] };
    };
}

test('actions: quest rows, challenge rows, legality, sorting', () => {
    const mickey = card(MICKEY), minnieMine = card(MINNIE, { drying: true }), rafiki = card(RAFIKI, { drying: true });
    const hans = card(HANS, { exerted: true }), minnie = card(MINNIE), rock = card(ROCK);
    const s = state(5, 0, { lore: 10, field: [mickey, minnieMine, rafiki] }, { lore: 12, field: [hans, minnie, rock] });
    const res = Core.actions(s, db, outcomeFor(s));
    // quests: only Mickey (Minnie and Rafiki are drying)
    assert.strictEqual(res.quests.length, 1);
    assert.strictEqual(res.quests[0].iid, mickey.instanceId);
    assert.strictEqual(res.quests[0].delta, 0);                // already counted by the clock
    assert.ok(res.quests[0].ifSkipped.finishHalf[0] >= res.base.finishHalf[0]);
    // attackers: Mickey, plus drying Rafiki because of Rush; drying Minnie can't
    const attackers = new Set(res.challenges.map(r => r.aIid));
    assert.ok(attackers.has(mickey.instanceId) && attackers.has(rafiki.instanceId) && !attackers.has(minnieMine.instanceId));
    const mh = res.challenges.find(r => r.aIid === mickey.instanceId && r.dIid === hans.instanceId);
    assert.ok(mh.legal);
    assert.ok(mh.o.dDies && mh.o.aDies);                       // 3/3 vs 3/3: trade
    assert.strictEqual(mh.removes, 3);
    assert.strictEqual(mh.loses, 2);
    assert.strictEqual(mh.after.rate[1], res.base.rate[1] - 3);
    assert.strictEqual(mh.after.rate[0], res.base.rate[0] - 2);
    const mm = res.challenges.find(r => r.aIid === mickey.instanceId && r.dIid === minnie.instanceId);
    assert.strictEqual(mm.legal, false); assert.strictEqual(mm.why, 'ready');
    const mr = res.challenges.find(r => r.aIid === mickey.instanceId && r.dIid === rock.instanceId);
    assert.ok(mr.legal, 'locations can always be challenged');
    for (let i = 1; i < res.challenges.length; i++) {
        const a = res.challenges[i - 1], b = res.challenges[i];
        const c = Core.compare(a.after, b.after);
        assert.ok(c > 0 || (c === 0 && a.edgeDelta >= b.edgeDelta), 'sorted best first');
    }
    // nothing in the real state moved
    assert.strictEqual(mickey.exerted, false);
    assert.strictEqual(s.players[1].field.length, 3);
});

test('actions: Evasive and Bodyguard', () => {
    const mickey = card(MICKEY);
    const jetsam = card(JETSAM, { exerted: true }), goofy = card(GOOFY, { exerted: true }), hans = card(HANS, { exerted: true });
    const s = state(5, 0, { lore: 0, field: [mickey] }, { lore: 0, field: [jetsam, goofy, hans] });
    const res = Core.actions(s, db, outcomeFor(s));
    const why = (d) => res.challenges.find(r => r.dIid === d.instanceId).why;
    assert.strictEqual(why(jetsam), 'evasive');
    assert.strictEqual(why(goofy), null);
    assert.strictEqual(why(hans), 'bodyguard');
});

test('actions: a banish that flips the race sorts first', () => {
    // They win the race by one turn with Hans; banishing Hans flips it.
    const a = card(HANS), b = card(MINNIE);
    const theirHans = card(HANS, { exerted: true, damage: 1 }), theirMinnie = card(MINNIE, { exerted: true });
    const s = state(5, 0, { lore: 11, field: [a, b] }, { lore: 14, field: [theirHans, theirMinnie] });
    const base = Core.compute(s, db, 0);
    assert.strictEqual(base.winner, 1);
    const res = Core.actions(s, db, outcomeFor(s));
    const top = res.challenges[0];
    assert.strictEqual(top.dIid, theirHans.instanceId);
    assert.ok(top.delta > 0);
});

test('ranking: when ahead, finishing sooner beats widening the gap', () => {
    const mk = (fm, fo, winner) => ({ me: 0, half: 10, winner, finishHalf: [fm, fo], rate: [0, 0] });
    const base = mk(12, 15, 0);
    assert.ok(Core.compare(mk(12, 21, 0), base) > 0, 'same finish, they get slower: better');
    assert.ok(Core.compare(mk(14, 21, 0), base) < 0, 'you get slower while ahead: worse');
    assert.ok(Core.compare(mk(null, null, null), base) < 0, 'losing the win: worse');
    const behind = mk(16, 13, 1);
    assert.ok(Core.compare(mk(18, 15, 1), behind) > 0, 'when behind, pushing their finish later is better');
    assert.ok(Core.compare(mk(16, 17, 0), behind) > 0, 'flipping the race is best');
    assert.ok(Core.compare(mk(null, null, null), behind) > 0, 'stalling them beats losing');
});

let failed = 0;
for (const [name, fn] of tests) {
    try { fn(); console.log('  ok   ' + name); } catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.stack || e)); }
}
console.log(`race_clock: ${tests.length - failed}/${tests.length} passed`);
if (failed) process.exit(1);
