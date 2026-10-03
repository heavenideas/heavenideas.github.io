
// ===================================================================
// THE GAME — one scripted, rules-consistent game between the two
// decklists, Madrigals (player 0, on the play) vs Phillip (player 1).
// Every prototype reads it: the Mulligan Lab opens on its opening
// hand, the Race Clock / Threat Map / Coach sit on its turn 13, the
// Ledger replays all of it, the Briefing drills its positions.
// ===================================================================
function scriptDSL(g) {
  const me = () => g.active, op = () => g.active ^ 1;
  const F = (p, k, pred) => { const c = g.players[p].field.find(x => x.id === ID[k] && (!pred || pred(x))); if (!c) throw new Error(`T${g.turn}: no ${k} on field of p${p}`); return c.iid; };
  return {
    ink: (k) => ink(g, me(), ID[k]),
    play: (k, o) => { const c = g.players[me()].hand.find(x => x.id === ID[k]); if (!c) throw new Error(`T${g.turn}: ${k} not in hand`); if (!(o && o.free) && costFor(g, me(), ID[k]) > g.players[me()].ready) throw new Error(`T${g.turn}: can't afford ${k} (${g.players[me()].ready} ready)`); return play(g, me(), ID[k], o); },
    quest: (k, sup) => { const iid = F(me(), k, c => canQuest(g, c)); return quest(g, me(), iid, sup ? F(me(), sup) : null); },
    ch: (a, d) => { const ai = F(me(), a, c => !c.exerted); const di = F(op(), d); if (!canChallenge(g, find(g, ai).c, find(g, di).c)) throw new Error(`T${g.turn}: illegal challenge ${a}→${d}`); return challenge(g, me(), ai, di); },
    sing: (song, singer) => sing(g, me(), ID[song], [F(me(), singer, c => !c.exerted)]),
    act: (k, arg) => { const iid = F(me(), k, c => canActivate(g, c)); return activate(g, me(), iid, arg); },
    red: (banishK, playK) => activate(g, me(), F(me(), 'RED', c => canActivate(g, c)), { banish: F(me(), banishK), playId: ID[playK] }),
    dmgOpp: (k, n, src) => damage(g, F(op(), k), n, { how: 'effect', card: ID[src] }),
    dmgAllOpp: (n, src) => { for (const c of g.players[op()].field.slice()) if (M[c.id].type === 'Character') damage(g, c.iid, n, { how: 'effect', card: ID[src] }); },
    banishOpp: (k, src) => banish(g, F(op(), k), { how: 'effect', card: ID[src] }),
    bounceOpp: (k, src) => bounce(g, F(op(), k), { how: 'effect', card: ID[src] }),
    shift: (k, baseK) => { const base = F(me(), baseK); return play(g, me(), ID[k], { shiftOnto: base }); },
    exertOpp: (k, src) => exert(g, F(op(), k)),
    exertAllOpp: () => { for (const c of g.players[op()].field) if (M[c.id].type === 'Character') exert(g, c.iid); },
    draw: (...ks) => ks.map(k => draw(g, me(), ID[k], 'effect')),
    drawOpp: (...ks) => ks.map(k => draw(g, op(), ID[k], 'effect')),
    discard: (k, why) => discard(g, me(), ID[k], why),
    drain: (n, why) => loreDelta(g, op(), -n, why),
    note: (text) => say(g, text)
  };
}

function snapshot(g) { return JSON.parse(JSON.stringify({ turn: g.turn, active: g.active, players: g.players, nEvents: g.events.length })); }

function buildGame() {
  const g = newGame(0);
  const D = scriptDSL(g);
  const handOf = (p, ks) => { for (const k of ks) g.players[p].hand.push(inst(g, p, ID[k])); };
  // Opening hands and the Madrigals mulligan (Raging Storm + Demona to the bottom).
  const MADR_OPEN = ['Luisa', 'Hamm', 'Agustin', 'Gaston', 'Storm', 'Demona', 'Alma'];
  const PHIL_OPEN = ['Rafiki', 'Huntsman', 'Tod', 'RED', 'Phillip', 'MMS', 'Hades'];
  handOf(0, MADR_OPEN); handOf(1, PHIL_OPEN);
  for (const k of ['Storm', 'Demona']) { const i = pickHand(g, 0, ID[k]); g.players[0].hand.splice(i, 1); }
  handOf(0, ['Dumbo', 'JWG']);
  g.events.push({ t: 0, kind: 'mulligan', p: 0, thrown: [ID.Storm, ID.Demona], drew: [ID.Dumbo, ID.JWG] });
  const snaps = [];
  const turn = (drawK, body) => {
    startTurn(g, g.turn === 1 ? null : ID[drawK]);
    snaps.push({ turn: g.turn, active: g.active, start: snapshot(g) });
    try { body(D); } catch (e) { e.message += ' | hands: M[' + g.players[0].hand.map(c => M[c.id].name) + '] P[' + g.players[1].hand.map(c => M[c.id].name) + '] ready ' + g.players[g.active].ready; throw e; }
    snaps[snaps.length - 1].end = snapshot(g);
    endTurn(g);
  };

  // T1 Madrigals — 1-drop, ink the 5-drop with no early job.
  turn(null, d => { d.ink('Gaston'); d.play('Luisa'); });
  // T2 Phillip
  turn('Lyle', d => { d.ink('Phillip'); d.play('Rafiki'); });
  // T3 Madrigals — Hamm; Luisa quests into an untapped Rafiki (Challenger +3 kills her).
  turn('Besties', d => { d.ink('Besties'); d.play('Hamm'); d.quest('Luisa'); });
  // T4 Phillip — Rafiki punishes the exerted Luisa; Lyle loots.
  turn('Aladdin', d => { d.ink('Hades'); d.ch('Rafiki', 'Luisa'); d.play('Lyle'); d.draw('Milo'); d.discard('Aladdin', 'Lyle'); });
  // T5 Madrigals — Hamm discount → Agustin on 3. Hamm is now exerted.
  turn('Hades', d => { d.ink('Alma'); d.act('Hamm'); d.play('Agustin'); });
  // T6 Phillip — Rafiki trades with the exerted Hamm; Tod loots; Lyle drains (2 cards hit the discard).
  turn('Sven', d => {
    d.ink('Milo'); d.ch('Rafiki', 'Hamm'); d.play('Tod'); d.draw('Piercing', 'Aladdin'); d.discard('Aladdin', 'Tod'); d.quest('Lyle');
    d.drain(1, 'Lyle · Dirty Tricks');
  });
  // T7 Madrigals — Agustin removes the Lyle engine; Dumbo comes down and threatens to draw every turn.
  turn('Luisa', d => { d.ink('Luisa'); d.ch('Agustin', 'Lyle'); d.play('Dumbo'); });
  // T8 Phillip — has to answer Dumbo: Tod sings Malicious, Mean, and Scary, Piercing Attack finishes it.
  turn('Huntsman', d => { d.ink('Huntsman'); d.sing('MMS', 'Tod'); d.dmgAllOpp(1, 'MMS'); d.play('Piercing'); d.dmgOpp('Dumbo', 2, 'Piercing'); });
  // T9 Madrigals — Hades: Phillip keeps Tod, so Madrigals draw 2.
  turn('Cheshire', d => { d.ink('Cheshire'); d.play('Hades'); d.note('Hades: Phillip declined to bottom Tod'); d.draw('Hamm', 'Luisa'); d.quest('Agustin'); });
  // T10 Phillip — Retro Evolution Device goes down. Tod quests.
  turn('Hades', d => { d.ink('Huntsman'); d.play('RED'); d.quest('Tod'); });
  // T11 Madrigals — Dumbo again + Hamm; Agustin and Hades quest.
  turn('Dumbo', d => { d.ink('Luisa'); d.play('Dumbo'); d.play('Hamm'); d.quest('Agustin'); d.quest('Hades'); });
  // T12 Phillip — the tempo turn: Hades (Madrigals keep Dumbo, so Phillip draws 2), then the Device turns
  //   Hades into Milo for 1 ink. Milo discards Sven to send the Madrigal Hades back to hand; two cards hit
  //   the discard this turn, so Milo draws at end of turn.
  turn('Aladdin', d => {
    d.ink('Aladdin'); d.play('Hades'); d.note('Hades: Madrigals kept Dumbo, Phillip drew 2'); d.draw('Milo', 'Phillip');
    d.red('Hades', 'Milo'); d.discard('Sven', 'Milo · Scholar\'s Gambit'); d.bounceOpp('Hades', 'Milo');
    d.quest('Tod'); d.draw('MMS'); d.note('Milo · Practical Knowledge: drew a card');
  });
  // ---- T13: THE POSITION. Madrigals to act. (Every lens opens here.) ----
  // The line the Coach teaches: draw first (Dumbo), ink the dead card it finds, Demona exerts their whole
  // board (Ward can't stop an "all"), Agustin's Support turns Hamm into a 5-strength challenger for Milo.
  turn('Demona', d => {
    d.act('Dumbo', [ID.Gaston]); d.ink('Gaston'); d.play('Demona'); d.exertAllOpp();
    d.draw('Luisa'); d.drawOpp('Piercing'); d.note('Demona: both players refill to 3');
    d.quest('Agustin', 'Hamm'); d.ch('Hamm', 'Milo');
  });
  // T14 Phillip — out of big threats: Tod sings MMS, Piercing finishes Dumbo.
  turn('Lenny', d => { d.ink('Lenny'); d.sing('MMS', 'Tod'); d.dmgAllOpp(1, 'MMS'); d.play('Piercing'); d.dmgOpp('Dumbo', 2, 'Piercing'); });
  // T15 Madrigals — Hades (Phillip keeps Tod, Madrigals draw 2); Alma exerts Tod, Agustin removes it. Demona quests.
  turn('Isis', d => {
    d.ink('JWG'); d.play('Hades'); d.note('Hades: Phillip kept Tod, Madrigals drew 2'); d.draw('Alma', 'Willow');
    d.play('Alma'); d.exertOpp('Tod', 'Alma'); d.play('Luisa'); d.ch('Agustin', 'Tod'); d.quest('Demona');
  });
  // T16 Phillip — Milo hard-cast; discards Prince Phillip to bounce Demona.
  turn('Milo', d => { d.note('No ink: Prince Phillip is kept as the discard for Milo'); d.play('Milo'); d.discard('Phillip', 'Milo · Scholar\'s Gambit'); d.bounceOpp('Demona', 'Milo'); });
  // T17 Madrigals — Agustin's Support again: Luisa (Challenger +2) takes Milo. Everyone else quests.
  turn('Sven', d => {
    d.ink('Isis'); d.play('Demona'); d.exertAllOpp(); d.draw('Agustin'); d.drawOpp('Silver', 'AG', 'Tod'); d.note('Demona: Madrigals refill to 3, Phillip (empty-handed) draws 3');
    d.quest('Agustin', 'Luisa'); d.ch('Luisa', 'Milo'); d.quest('Hades'); d.quest('Alma'); d.play('Willow');
  });
  // T18 Phillip — rebuilds: John Silver + Aladdin.
  turn('Aladdin', d => { d.ink('Tod'); d.play('Silver'); d.note('John Silver: Hades gains Reckless'); d.play('Aladdin'); });
  // T19 Madrigals
  //   Hades is Reckless this turn (John Silver): it can't quest, and there is nothing exerted to challenge.
  turn('Tigger', d => { d.ink('Tigger'); d.play('Sven'); d.quest('Agustin'); d.quest('Alma'); d.quest('Demona'); });
  // T20 Phillip — behind on the clock, Phillip trades instead of questing: John Silver into Demona.
  //   But Milo's bounce on T16 had wiped Demona's damage — she survives on 5, Silver doesn't.
  turn('Tod', d => { d.ink('Tod'); d.shift('AG', 'Aladdin'); d.draw('Lenny'); d.note('Aladdin & Genie: empty hand, draws 1'); d.ch('Silver', 'Demona'); });
  // T21 Madrigals — 21 lore.
  turn('Agustin', d => {
    d.ink('Agustin'); d.quest('Agustin'); d.quest('Hades'); d.quest('Alma'); d.quest('Sven'); d.quest('Willow'); d.quest('Demona');
    ev(g, { kind: 'win', p: 0 }); d.note('Madrigals reach 20 lore');
  });
  return { g, snaps };
}
