// Mulligan Lab — node tests for the pure logic. Run: node practice_dojo/plugins/tests/mulligan_lab.test.js
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const lib = require('../lab_lib.js');
const Core = require('../mulligan_lab.js');

// --- card DB + decks from real cards ------------------------------------------------
const RAW = require('../../mastery_lab/allCards.json');
const DB = {};
const BY_NAME = {};
for (const c of RAW.cards) { DB[c.id] = c; if (!BY_NAME[c.fullName]) BY_NAME[c.fullName] = c.id; }
const id = (fullName) => { const x = BY_NAME[fullName]; if (x == null) throw new Error('no card ' + fullName); return x; };

function readDecks() {
    const txt = fs.readFileSync(path.join(__dirname, '../../mastery_lab/engine/decks.txt'), 'utf8');
    const decks = {}; let cur = null;
    for (const line of txt.split(/\r?\n/)) {
        const t = line.trim();
        if (!t) continue;
        const m = /^(\d+)\s+(.+)$/.exec(t);
        if (!m) { cur = decks[t] = []; continue; }
        for (let i = 0; i < +m[1]; i++) cur.push(id(m[2]));
    }
    return decks;
}
const DECKS = readDecks();

// Remove the hand's cards from a 60-card list (the library the player draws from).
function libraryFor(deck, hand) {
    const lib0 = deck.slice();
    for (const h of hand) { const i = lib0.indexOf(h); if (i >= 0) lib0.splice(i, 1); }
    return lib0;
}
const info = (cid, plan) => Core.cardInfo(cid, DB, plan);

let passed = 0, failed = 0;
function test(name, fn) {
    try { fn(); passed++; console.log('  ok   ' + name); }
    catch (e) { failed++; console.log('  FAIL ' + name + '\n       ' + (e && e.stack || e)); }
}

// --- cards used ------------------------------------------------------------------
const C2A = id('LeFou - Bumbler');                   // 2-cost inkable character
const C2B = id('Minnie Mouse - Beloved Princess');   // 2-cost inkable character
const C7 = id('Stitch - Carefree Surfer');           // 7-cost inkable character
const C7B = id('Triton - The Sea King');             // 7-cost inkable character
const SONG2 = id('Zero to Hero');                    // 2-cost uninkable Song
const HADES_BASE = id('Hades - Lord of the Underworld');   // 4, name Hades
const HADES_SHIFT = id('Hades - King of Olympus');         // 8, Shift 6 onto Hades
const AURORA_BASE = id('Aurora - Regal Princess');        // 2
const AURORA_SHIFT = id('Aurora - Dreaming Guardian');     // 5, Shift 3
const UNKNOWN = -999;

console.log('Mulligan Lab');

test('card facts from structured fields', () => {
    const h = info(HADES_SHIFT);
    assert.strictEqual(h.cost, 8); assert.strictEqual(h.shift, 6); assert.strictEqual(h.name, 'Hades'); assert.ok(h.isChar && h.perm);
    const s = info(SONG2);
    assert.ok(s.song); assert.strictEqual(s.ink, false);
    const u = info(UNKNOWN);
    assert.ok(u.unknown && u.ink); assert.strictEqual(u.cost, 99);
});

test('throw-set dedupe count', () => {
    const distinct = DECKS.DECK_B.filter((x, i, a) => a.indexOf(x) === i).slice(0, 7);
    assert.strictEqual(Core.throwSets(distinct).length, 128);
    // a,a,b,b,b,c,d → 3·4·2·2 = 48 multisets
    assert.strictEqual(Core.throwSets([C2A, C2A, C7, C7, C7, C2B, SONG2]).length, 48);
    assert.strictEqual(Core.throwSets([C7, C7, C7, C7, C7, C7, C7]).length, 8);
    assert.strictEqual(Core.throwSets([C7, C2A, C2B]).length, 8);           // short hand: 2^3
    assert.strictEqual(Core.throwSets([]).length, 1);                        // keep nothing
});

test('bestSpend: shift cost used only when the base is in play', () => {
    const hand = [info(HADES_SHIFT)];
    const withBase = Core.bestSpend(hand, 6, new Set(['Hades']), -1);
    assert.deepStrictEqual(withBase.played, [0]);
    assert.strictEqual(withBase.paid, 6);
    assert.strictEqual(withBase.value, 8);
    assert.strictEqual(Core.bestSpend(hand, 6, new Set(), -1).played.length, 0);
    assert.strictEqual(Core.bestSpend(hand, 6, new Set(['Stitch']), -1).played.length, 0);
    assert.strictEqual(Core.bestSpend(hand, 8, new Set(), -1).value, 8);       // hard-cast at full cost
});

test('bestSpend: songs are never paid with ink; unknown cards never played', () => {
    const r = Core.bestSpend([info(SONG2), info(UNKNOWN)], 10, new Set(), -1);
    assert.strictEqual(r.played.length, 0); assert.strictEqual(r.value, 0);
    const r2 = Core.bestSpend([info(C2A), info(C2B), info(C7), info(SONG2)], 4, new Set(), -1);
    assert.strictEqual(r2.value, 4); assert.strictEqual(r2.paid, 4);
    assert.deepStrictEqual(r2.played.slice().sort(), [0, 1]);
});

test('simulate: a dry character sings a song for free; Shift onto the base at Shift cost', () => {
    const U = info(UNKNOWN);
    const out = () => ({ value: 0, paid: 0, plan: 0, missAny: 0, missInk: [0, 0, 0, 0], played: [0, 0, 0, 0] });
    // On the play: T1 ink, T2 ink + LeFou, T3 ink, LeFou (dry) sings Zero to Hero, T4 ink.
    const o = out();
    const total = Core.simulate([info(C2A), info(SONG2), U, U, U, U, U], [U, U, U, U], { onPlay: true }, o);
    assert.strictEqual(total, 4, 'LeFou (2) + sung song (2)');
    assert.strictEqual(o.paid, 2, 'only LeFou was paid for');
    assert.strictEqual(o.missAny, 0);
    // Shift in a game: Aurora - Regal Princess (2) on T2, then Aurora - Dreaming Guardian (5, Shift 3) shifted on T3.
    const o2 = out();
    const t2 = Core.simulate([info(AURORA_BASE), info(AURORA_SHIFT), U, U, U, U, U], [U, U, U, U], { onPlay: true }, o2);
    assert.strictEqual(t2, 7, 'base (2) + shifted Dreaming Guardian at printed cost (5)');
    assert.strictEqual(o2.paid, 5, 'paid 2 + Shift 3');
    // Without the base, the 5-drop is hard-cast on... never (only 4 ink by T4)
    const o3 = out();
    assert.strictEqual(Core.simulate([info(AURORA_SHIFT), U, U, U, U, U, U], [U, U, U, U], { onPlay: true }, o3), 0);
});

test('determinism with the same seeds', () => {
    const hand = DECKS.DECK_B.slice(0, 7);
    const deck = libraryFor(DECKS.DECK_B, hand);
    const opts = { cardDB: DB, onPlay: true, plan: '', planTurn: 4, sims: 120, seed: 42 };
    const a = Core.options({ handIds: hand, extraIds: [], deckIds: deck }, opts);
    const b = Core.options({ handIds: hand, extraIds: [], deckIds: deck }, opts);
    assert.deepStrictEqual(a.map(r => [r.key, r.mean, r.missAny]), b.map(r => [r.key, r.mean, r.missAny]));
    const c = Core.options({ handIds: hand, extraIds: [], deckIds: deck }, Object.assign({}, opts, { seed: 43 }));
    assert.notDeepStrictEqual(a.map(r => r.mean), c.map(r => r.mean));
});

test('throwing five 7-drops beats keeping them', () => {
    const hand = [C7, C7, C7B, C7B, C7, C2A, C2B];
    const deck = libraryFor(DECKS.DECK_A, []);
    const res = Core.options({ handIds: hand, extraIds: [], deckIds: deck }, { cardDB: DB, onPlay: true, sims: 400 });
    const keep = res.find(r => r.thrown.length === 0);
    const throw7 = res.find(r => r.key === Core.sortedKey([C7, C7, C7B, C7B, C7]));
    const throw2 = res.find(r => r.key === Core.sortedKey([C2A, C2B]));
    assert.ok(throw7.rank < keep.rank, `throw 7s rank ${throw7.rank} vs keep ${keep.rank}`);
    assert.ok(throw7.mean > keep.mean + 1, `throw 7s ${throw7.mean.toFixed(2)} vs keep ${keep.mean.toFixed(2)}`);
    assert.ok(keep.mean > throw2.mean, 'keeping beats throwing the only cheap cards');
    assert.strictEqual(res[res.length - 1].rank, res.length);
    assert.ok(res[0].thrown.length >= 3, 'the best option throws most of the 7-drops');
    const w = Core.why(throw7, DB);
    assert.ok(/throws five 7-drops/i.test(w), w);
    assert.ok(/keeps all 7/i.test(Core.why(keep, DB)));
    console.log(`       best: ${Core.why(res[0], DB)} (${res[0].mean.toFixed(2)}) · keep 7: ${keep.mean.toFixed(2)} rank ${keep.rank}/${res.length}`);
});

test('play vs draw: the draw sees one more card', () => {
    const hand = [C7, C7, C7B, C7B, C7, C2A, C2B];
    const deck = libraryFor(DECKS.DECK_A, []);
    const planName = DB[id('Tod - Clever Fox')].fullName;
    const run = (onPlay) => Core.options({ handIds: hand, extraIds: [], deckIds: deck }, { cardDB: DB, onPlay, plan: planName, planTurn: 4, sims: 800 })
        .find(r => r.thrown.length === 0);
    const play = run(true), draw = run(false);
    assert.ok(draw.plan > play.plan, `plan on draw ${draw.plan} > on play ${play.plan}`);
    assert.ok(draw.mean >= play.mean - 0.05, 'the extra card never hurts the curve much');
    assert.ok(draw.missAny <= play.missAny + 0.01);
});

test('plan-card probability vs hypergeometric', () => {
    // Core's own formula (practice_dojo.html mulliganHypergeo): redraws can't hit the thrown copies,
    // later draws can.
    function mullHyper(Kdeck, Kret, N, M, n) {
        let pNone = 1;
        for (let i = 0; i < Math.min(M, N); i++) pNone *= Math.max(0, N - Kdeck - i) / (N - i);
        const K2 = Kdeck + Kret;
        for (let i = 0; i < Math.min(n, N); i++) pNone *= Math.max(0, N - K2 - i) / (N - i);
        return 1 - pNone;
    }
    const tod = id('Tod - Clever Fox');
    const hand = [C7, C7, C7B, C7B, C7, C2A, tod];     // one Tod in hand
    const deck = libraryFor(DECKS.DECK_A, [tod]);      // 3 Tods left in 59
    const N = deck.length, K = deck.filter(x => x === tod).length;
    assert.strictEqual(K, 3); assert.strictEqual(N, 59);
    const res = Core.options({ handIds: hand, extraIds: [], deckIds: deck }, { cardDB: DB, onPlay: false, plan: DB[tod].fullName, planTurn: 3, sims: 3000, seed: 9 });
    const keep = res.find(r => r.thrown.length === 0);
    assert.strictEqual(keep.plan, 1, 'Tod is already in hand');
    // Throw Tod + 2 sevens: 3 redraws can't see the thrown Tod (bottom), 3 draw-step cards can.
    const thr = res.find(r => r.key === Core.sortedKey([tod, C7, C7]));
    const expect = mullHyper(K, 1, N, 3, 3);
    assert.ok(Math.abs(thr.plan - expect) < 0.035, `sim ${thr.plan.toFixed(3)} vs formula ${expect.toFixed(3)}`);
    // Throw two sevens, keep Tod
    assert.strictEqual(res.find(r => r.key === Core.sortedKey([C7, C7])).plan, 1);
    // No Tod in hand, keep all: plain hypergeometric over the draw steps (on the draw, T1..T3 = 3 draws)
    const hand2 = [C7, C7, C7B, C7B, C7, C2A, C2B];
    const deck2 = libraryFor(DECKS.DECK_A, []);
    const r2 = Core.options({ handIds: hand2, extraIds: [], deckIds: deck2 }, { cardDB: DB, onPlay: true, plan: DB[tod].fullName, planTurn: 5, sims: 3000, seed: 5 });
    const k2 = r2.find(r => r.thrown.length === 0);
    const e2 = lib.hypergeoAtLeastOne(4, deck2.length, 4);   // on the play, T2..T5 = 4 draws
    assert.ok(Math.abs(k2.plan - e2) < 0.035, `sim ${k2.plan.toFixed(3)} vs hypergeo ${e2.toFixed(3)}`);
});

test('state inputs, cache key, marking and rank lookup', () => {
    const hand = DECKS.DECK_B.slice(0, 8).map((cid, i) => ({ instanceId: 'h' + i, cardId: cid }));
    const deck = DECKS.DECK_B.slice(8).map((cid, i) => ({ instanceId: 'd' + i, cardId: i < 2 ? UNKNOWN : cid }));
    const state = { turn: 1, players: [{ hand, deck, field: [], inkwell: [] }, { hand: [], deck: [], field: [], inkwell: [] }] };
    const inp = Core.inputs(state, DB, 0);
    assert.strictEqual(inp.handIds.length, 7); assert.strictEqual(inp.extraIds.length, 1);
    assert.strictEqual(inp.unknownDeck, 2); assert.strictEqual(inp.onPlay, true); assert.strictEqual(inp.midGame, false);
    assert.strictEqual(Core.inputs(state, DB, 1).onPlay, false);
    // key ignores order; changes with plan / deck
    const k1 = Core.cacheKey(inp, '', 4);
    const shuffled = Object.assign({}, inp, { deckIds: inp.deckIds.slice().reverse(), handIds: inp.handIds.slice().reverse() });
    assert.strictEqual(Core.cacheKey(shuffled, '', 4), k1);
    assert.notStrictEqual(Core.cacheKey(inp, 'X', 4), k1);
    assert.notStrictEqual(Core.cacheKey(inp, 'X', 4), Core.cacheKey(inp, 'X', 3));
    // marking: throw the first two opener cards → instance ids, and back to the same key
    const thrown = [inp.handIds[0], inp.handIds[1]];
    const iids = Core.iidsFor(thrown, inp.handIds, inp.openerIids);
    assert.deepStrictEqual(iids, ['h0', 'h1']);
    assert.strictEqual(Core.markedKey(iids, inp.handIds, inp.openerIids), Core.sortedKey(thrown));
    assert.strictEqual(Core.markedKey([], inp.handIds, inp.openerIids), '');
    assert.strictEqual(Core.markedKey(['h7'], inp.handIds, inp.openerIids), null, 'beyond the opener');
    const res = Core.options(inp, { cardDB: DB, onPlay: true, sims: 60 });
    const byKey = new Map(res.map(r => [r.key, r]));
    assert.ok(byKey.has(''), 'keep all 7 is an option'); assert.ok(byKey.has(Core.sortedKey(thrown)));
    assert.strictEqual(Core.ordinal(1), '1st'); assert.strictEqual(Core.ordinal(12), '12th'); assert.strictEqual(Core.ordinal(22), '22nd');
    const choices = Core.planChoices(inp, DB);
    assert.ok(choices.length > 5);
    for (let i = 1; i < choices.length; i++) assert.ok(choices[i - 1].cost <= choices[i].cost);
});

test('performance: 128 throw sets x 400 games', () => {
    const distinct = DECKS.DECK_A.filter((x, i, a) => a.indexOf(x) === i);
    const hand = distinct.slice(0, 7);
    const deck = libraryFor(DECKS.DECK_A, hand);
    const t0 = Date.now();
    const j = Core.job({ handIds: hand, extraIds: [], deckIds: deck }, { cardDB: DB, onPlay: false, plan: DB[hand[3]].fullName, planTurn: 4 });
    let slices = 0;
    while (!j.results) { const s = Date.now(); while (!j.results && Date.now() - s < 15) j.step(1); slices++; }
    const ms = Date.now() - t0;
    console.log(`       ${j.total} throw sets x ${j.sims} games: ${ms} ms in ${slices} slices`);
    assert.strictEqual(j.total, 128);
    assert.strictEqual(j.results.length, 128);
    assert.ok(ms < 4000, 'well under a few seconds');
    console.log('       top 3: ' + j.results.slice(0, 3).map(r => `${r.mean.toFixed(2)} ${Core.why(r, DB)}`).join(' | '));
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
