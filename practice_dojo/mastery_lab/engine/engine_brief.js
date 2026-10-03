
// ===================================================================
// TURN BRIEFING — the guide's "every turn starts with questions",
// answered by the player first, then checked against the lenses.
// ===================================================================
function questAll(g, me) {
  const h = clone(g);
  for (const c of h.players[me].field) if (canQuest(h, c)) quest(h, me, c.iid, null);
  return h;
}
function briefingFacts(g, me) {
  const rc = raceClock(g, me);
  const tm = threatMap(g, me);
  const qa = questAll(g, me);
  const ex = threatMap(qa, me).mine.filter(Boolean).sort((a, b) => b.pAny - a.pAny);
  return {
    turn: g.turn,
    race: { winner: rc.winner, finish: rc.finish, rate: rc.rate, lore: rc.lore, margin: rc.margin },
    role: rc.winner === me ? 'race' : 'slow',
    threat: tm.theirs.length ? { iid: tm.theirs[0].iid, id: tm.theirs[0].id, all: tm.theirs.map(t => ({ iid: t.iid, id: t.id, ignore2: t.ignore2, lore: t.lore, enables: t.enables.slice(0, 2).map(e => ({ kind: e.kind, id: e.id, p: e.p })) })) } : null,
    exposed: ex.length ? { iid: ex[0].iid, id: ex[0].id, p: ex[0].pAny, all: ex.map(x => ({ iid: x.iid, id: x.id, p: x.pAny, certain: x.certain.map(c => c.id), pool: x.pool.slice(0, 2).map(p => ({ id: p.id, p: p.p })) })) } : null
  };
}
// What the opponent actually did to my board on their next turn (from the scripted game).
function whatHappened(turn, me) {
  const { g } = game(); const out = [];
  for (const e of g.events) if (e.t === turn + 1 && e.kind === 'leave' && e.p === me) out.push({ id: e.id, how: e.how, by: e.src && (e.src.card || null) });
  return out;
}
const BRIEF_TURNS = [11, 13, 15, 17];
function briefingDrill() { return BRIEF_TURNS.map(t => { const g = position(t); return { turn: t, g, facts: briefingFacts(g, 0), happened: whatHappened(t, 0) }; }); }
