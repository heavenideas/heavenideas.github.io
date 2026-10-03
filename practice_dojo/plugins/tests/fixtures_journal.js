// Hand-written journal of a short game (8 finished player-turns + the start of turn 5),
// in exactly the shape dojo_plugins.js records (state.ext.journal.events, oldest first).
// Card ids are real LorcanaJSON ids from mastery_lab/allCards.json.
//
//   Ana (player 0, on the play) vs Ben (player 1)
//   1·Ana  ink Mickey, play Tod                                  clean
//   1·Ben  ink Gaston, play Rapunzel with 1 ink (costs 2)        not possible here
//   2·Ana  Tod quests, ink Stitch, draw Mickey (effect), Lantern ink before draw
//   2·Ben  Rapunzel quests, ink Facilier, play Hamm              clean
//   3·Ana  ink Goofy, play Mulan, Tod quests (2nd time)          clean
//   3·Ben  ink Hercules, Hamm challenges Tod (Tod banished ~1s later, after the
//          Rapunzel quest), play Sebastian, end with 1 ink + Simba (1) in hand   ink left
//   4·Ana  play Mickey (Steamboat), Mulan challenges Hamm (banished), +1 lore by hand,
//          no ink while holding inkable cards                     no ink (info)
//   4·Ben  ink Simba, Sebastian +3, Rapunzel +1, play Pongo      clean
//   5·Ana  (in progress) ink Friends on the Other Side
'use strict';

const path = require('path');
const fs = require('fs');

const CARD = {
    MICKEY_TF: 12, TOD: 2550, MULAN: 231, HADES: 6, FOTOS: 64, GOOFY: 111, STITCH: 22,
    LANTERN: 33, MICKEY_WS: 51, MICKEY_SP: 89, TOD_PK: 2553,
    GASTON: 110, RAPUNZEL: 236, HAMM: 2726, SIMBA_PC: 20, PONGO: 120, SEBASTIAN: 2205,
    FACILIER: 38, HERCULES: 398, BE_PREPARED: 128, SIMBA_FK: 188, PONGO_DF: 455
};

function build() {
    const events = [];
    let turn = 1, active = 0;
    const at = (t, a) => { turn = t; active = a; };
    const ev = (kind, fields) => {
        events.push(Object.assign({ seq: events.length + 1, turn, active, kind }, fields));
    };
    const end = (snap) => ev('turnEnd', Object.assign({ player: active, turn }, snap));
    const start = (t, p) => { at(t, p); ev('turnStart', { player: p, turn: t }); };
    const C = CARD;

    // Mulligans (before turn 1 — never part of a player-turn)
    ev('mulligan', { player: 0, thrown: [] });
    ev('mulligan', { player: 1, thrown: [C.BE_PREPARED] });

    // ---- Turn 1 · Ana -----------------------------------------------------------
    ev('ink', { player: 0, iid: 'a-mickey', cardId: C.MICKEY_TF });
    ev('play', { player: 0, iid: 'a-tod', cardId: C.TOD, cost: 1, inkBefore: 1 });
    end({ inkReady: 0, inkTotal: 1, lore: [0, 0], hand: [5, 7], deck: [53, 53], board: [1, 0], fieldChars: [1, 0],
        handCards: [C.MULAN, C.HADES, C.FOTOS, C.GOOFY, C.STITCH] });

    // ---- Turn 1 · Ben -----------------------------------------------------------
    start(1, 1);
    ev('ink', { player: 1, iid: 'b-gaston', cardId: C.GASTON });
    ev('play', { player: 1, iid: 'b-rapunzel', cardId: C.RAPUNZEL, cost: 2, inkBefore: 1 });
    end({ inkReady: 1, inkTotal: 1, lore: [0, 0], hand: [5, 6], deck: [53, 52], board: [1, 2], fieldChars: [1, 1],
        handCards: [C.HAMM, C.SIMBA_PC, C.PONGO, C.SEBASTIAN, C.FACILIER, C.HERCULES] });

    // ---- Turn 2 · Ana -----------------------------------------------------------
    start(2, 0);
    ev('quest', { player: 0, iid: 'a-tod', cardId: C.TOD, lore: 1, drying: false, wasExerted: false });
    ev('ink', { player: 0, iid: 'a-stitch', cardId: C.STITCH });
    ev('draw', { player: 0, iid: 'a-mickey-ws', cardId: C.MICKEY_WS });
    ev('play', { player: 0, iid: 'a-lantern', cardId: C.LANTERN, cost: 2, inkBefore: 2 });
    end({ inkReady: 0, inkTotal: 2, lore: [1, 0], hand: [5, 6], deck: [51, 52], board: [3, 2], fieldChars: [1, 1],
        handCards: [C.MULAN, C.HADES, C.FOTOS, C.GOOFY, C.MICKEY_WS] });

    // ---- Turn 2 · Ben -----------------------------------------------------------
    start(2, 1);
    ev('quest', { player: 1, iid: 'b-rapunzel', cardId: C.RAPUNZEL, lore: 1, drying: false, wasExerted: false });
    ev('ink', { player: 1, iid: 'b-facilier', cardId: C.FACILIER });
    ev('play', { player: 1, iid: 'b-hamm', cardId: C.HAMM, cost: 2, inkBefore: 2 });
    end({ inkReady: 0, inkTotal: 2, lore: [1, 1], hand: [5, 5], deck: [51, 51], board: [3, 4], fieldChars: [1, 2],
        handCards: [C.SIMBA_PC, C.PONGO, C.SEBASTIAN, C.HERCULES, C.BE_PREPARED] });

    // ---- Turn 3 · Ana -----------------------------------------------------------
    start(3, 0);
    ev('ink', { player: 0, iid: 'a-goofy', cardId: C.GOOFY });
    ev('play', { player: 0, iid: 'a-mulan', cardId: C.MULAN, cost: 3, inkBefore: 3 });
    ev('quest', { player: 0, iid: 'a-tod', cardId: C.TOD, lore: 1, drying: false, wasExerted: false });
    end({ inkReady: 0, inkTotal: 3, lore: [2, 1], hand: [4, 5], deck: [50, 51], board: [6, 4], fieldChars: [2, 2],
        handCards: [C.HADES, C.FOTOS, C.MICKEY_WS, C.MICKEY_SP] });

    // ---- Turn 3 · Ben -----------------------------------------------------------
    start(3, 1);
    ev('ink', { player: 1, iid: 'b-hercules', cardId: C.HERCULES });
    ev('challenge', { player: 1, attIid: 'b-hamm', attId: C.HAMM, defIid: 'a-tod', defId: C.TOD,
        toDef: 2, toAtt: 2, attDrying: false, defExerted: true, defType: 'Character' });
    // Ben quests before the core's 1-second banish timer fires.
    ev('quest', { player: 1, iid: 'b-rapunzel', cardId: C.RAPUNZEL, lore: 1, drying: false, wasExerted: false });
    // Non-active player's card, banished in Ben's challenge: player = owner (Ana).
    ev('banish', { player: 0, iid: 'a-tod', cardId: C.TOD, via: 'challenge' });
    ev('play', { player: 1, iid: 'b-sebastian', cardId: C.SEBASTIAN, cost: 2, inkBefore: 3 });
    end({ inkReady: 1, inkTotal: 3, lore: [2, 2], hand: [4, 4], deck: [50, 50], board: [5, 6], fieldChars: [1, 3],
        handCards: [C.SIMBA_PC, C.PONGO, C.BE_PREPARED, C.SIMBA_FK] });

    // ---- Turn 4 · Ana -----------------------------------------------------------
    start(4, 0);
    ev('play', { player: 0, iid: 'a-mickey-sp', cardId: C.MICKEY_SP, cost: 3, inkBefore: 3 });
    ev('challenge', { player: 0, attIid: 'a-mulan', attId: C.MULAN, defIid: 'b-hamm', defId: C.HAMM,
        toDef: 2, toAtt: 2, attDrying: false, defExerted: true, defType: 'Character' });
    ev('banish', { player: 1, iid: 'b-hamm', cardId: C.HAMM, via: 'challenge' });
    ev('lore', { player: 0, delta: 1 });
    end({ inkReady: 0, inkTotal: 3, lore: [3, 2], hand: [4, 4], deck: [49, 50], board: [8, 4], fieldChars: [2, 2],
        handCards: [C.HADES, C.FOTOS, C.MICKEY_WS, C.TOD_PK] });

    // ---- Turn 4 · Ben -----------------------------------------------------------
    start(4, 1);
    ev('ink', { player: 1, iid: 'b-simba', cardId: C.SIMBA_PC });
    ev('quest', { player: 1, iid: 'b-sebastian', cardId: C.SEBASTIAN, lore: 3, drying: false, wasExerted: false });
    ev('quest', { player: 1, iid: 'b-rapunzel', cardId: C.RAPUNZEL, lore: 1, drying: false, wasExerted: false });
    ev('play', { player: 1, iid: 'b-pongo', cardId: C.PONGO, cost: 4, inkBefore: 4 });
    end({ inkReady: 0, inkTotal: 4, lore: [3, 6], hand: [4, 2], deck: [49, 49], board: [8, 8], fieldChars: [2, 3],
        handCards: [C.BE_PREPARED, C.SIMBA_FK, C.PONGO_DF] });

    // ---- Turn 5 · Ana (in progress) ---------------------------------------------
    start(5, 0);
    ev('ink', { player: 0, iid: 'a-fotos', cardId: C.FOTOS });

    return events;
}

let dbCache = null;
// A cardDB like App.cardDB ({ id: entry }) holding just the cards tests need.
function loadCardDB(extraIds) {
    if (!dbCache) {
        const file = path.join(__dirname, '..', '..', 'mastery_lab', 'allCards.json');
        const all = JSON.parse(fs.readFileSync(file, 'utf8')).cards;
        const want = new Set(Object.values(CARD).concat(extraIds || [], [468 /* Never Land location */, 43 /* Flotsam, Rush */]));
        dbCache = {};
        for (const c of all) if (want.has(c.id)) dbCache[c.id] = c;
        for (const id of want) if (!dbCache[id]) throw new Error('fixture card missing from allCards.json: ' + id);
    }
    return dbCache;
}

module.exports = {
    CARD,
    PLAYERS: [{ name: 'Ana' }, { name: 'Ben' }],
    events: build,          // a fresh copy each call
    loadCardDB
};
