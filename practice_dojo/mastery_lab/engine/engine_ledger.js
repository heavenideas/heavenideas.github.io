
// ===================================================================
// LEDGER — Tempo, Card Advantage and Card Value, read straight off the
// event log. In the Dojo the same log comes from _trackAction plus a
// per-instance record; on a Duels.ink replay, from takenAction frames.
// ===================================================================
function buildLedger(G) {
  G = G || game();
  const { g, snaps } = G;
  const val = (id) => (M[id] ? M[id].cost : 0);
  const boardVal = (P) => P.field.filter(c => M[c.id].type !== 'Unknown').reduce((s, c) => s + val(c.id), 0);
  const resources = (P) => P.hand.length + P.field.length;
  const rec = {}; const all = []; // iid -> current receipt (a bounced card that comes back starts a new one)
  const fresh = (iid, id, owner) => { const r = { iid, id, owner, in: null, out: null, how: null, by: null, lore: 0, drew: 0, kills: [], hitBy: [], quests: 0, challenges: 0 }; rec[iid] = r; all.push(r); return r; };
  const R = (iid, id, owner) => rec[iid] || fresh(iid, id, owner);
  const lastPlayed = [null, null];
  const turns = snaps.map(s => ({ t: s.turn, p: s.active, built: 0, paid: 0, free: 0, removed: 0, lost: 0, sacrificed: 0, lore: 0, drew: 0, spent: 0, taken: 0, plays: [], removals: [], losses: [] }));
  for (const e of g.events) {
    if (!e.t) continue; const T = turns[e.t - 1]; if (!T) continue; const me = T.p;
    if (e.kind === 'play') {
      const m = M[e.id]; const r = (rec[e.iid] && rec[e.iid].in == null) ? rec[e.iid] : fresh(e.iid, e.id, e.p); r.in = e.t; lastPlayed[e.p] = e.iid;
      if (e.p === me) {
        T.paid += e.paid; T.plays.push({ id: e.id, paid: e.paid, how: e.how });
        if (m.type === 'Character' || m.type === 'Item') { T.built += m.cost; if (e.paid < m.cost) T.free += m.cost - e.paid; }
        else { T.spent += 1; if (e.how === 'sing') T.free += m.cost; }
      }
    } else if (e.kind === 'act' && e.p === me) { T.paid += e.paid || 0; }
    else if (e.kind === 'quest') { const r = R(e.iid, e.id, e.p); r.lore += e.lore; r.quests++; if (e.p === me) T.lore += e.lore; }
    else if (e.kind === 'lore') { if (e.iid) R(e.iid, null, e.p).lore += e.n; if (e.p === me) T.lore += e.n; else T.lore -= 0; }
    else if (e.kind === 'draw') {
      if (e.why === 'turn') continue;
      const src = e.src || lastPlayed[e.p]; if (src && rec[src]) rec[src].drew++;
      if (e.p === me) T.drew++;
    } else if (e.kind === 'challenge') {
      const a = R(e.iid, e.id, e.p); a.challenges++;
      if (e.dDies) a.kills.push({ id: e.defId, value: val(e.defId) });
      if (e.aDies) R(e.def, e.defId, e.p ^ 1).kills.push({ id: e.id, value: val(e.id) });
      R(e.def, e.defId, e.p ^ 1).hitBy.push(e.id);
    } else if (e.kind === 'damage') { if (e.src && e.src.card) R(e.iid, e.id, e.p).hitBy.push(e.src.card); }
    else if (e.kind === 'leave') {
      const r = R(e.iid, e.id, e.p); r.out = e.t; r.how = e.how;
      const by = e.src && (e.src.card || (e.src.by && rec[e.src.by] && rec[e.src.by].id));
      r.by = by || null; if (by && !r.hitBy.includes(by)) r.hitBy.push(by);
      if (e.how === 'sacrifice') { if (e.p === me) T.sacrificed += val(e.id); continue; }
      if (e.p === me) { T.lost += val(e.id); T.losses.push(e.id); } else { T.removed += val(e.id); T.taken += 1; T.removals.push({ id: e.id, how: e.how, by }); }
    }
  }
  // end-of-turn state lines
  for (const T of turns) {
    const s = snaps[T.t - 1].end; const P0 = s.players[0], P1 = s.players[1];
    T.loreAfter = [P0.lore, P1.lore]; T.board = [boardVal(P0), boardVal(P1)]; T.res = [resources(P0), resources(P1)]; T.hand = [P0.hand.length, P1.hand.length];
    T.rate = [loreRate(P0), loreRate(P1)];
    T.net = T.built + T.removed - T.lost;            // board ink this player added or took away
  }
  // The race after every turn, as a lore lead two rounds out if nothing changes:
  // (lore + 2 × lore-per-turn), Madrigals minus Phillip. Continuous, unlike a turns-to-20 clock,
  // which explodes early on when both boards quest for 1.
  let prev = 0;
  for (const T of turns) {
    T.lead = (T.loreAfter[0] + 2 * T.rate[0]) - (T.loreAfter[1] + 2 * T.rate[1]);
    T.leadDelta = T.lead - prev; prev = T.lead;
    T.boardDiff = T.board[0] - T.board[1];
  }
  const tp = turns.filter(T => T.t > 2).sort((a, b) => Math.abs(b.leadDelta) - Math.abs(a.leadDelta)).slice(0, 3).sort((a, b) => a.t - b.t);
  // each side's two biggest swings
  const swingsFor = (sign) => turns.filter(T => T.t > 2 && Math.sign(T.leadDelta) === sign).sort((a, b) => sign * (b.leadDelta - a.leadDelta)).slice(0, 2).map(T => T.t).sort((a, b) => a - b);
  // receipts
  const lastTurn = turns.length;
  const receipts = all.filter(r => r.id && M[r.id] && (M[r.id].type === 'Character' || M[r.id].type === 'Item') && r.in != null).map(r => {
    const life = r.out ? r.out - r.in : lastTurn - r.in;
    const ownTurns = Math.max(0, Math.floor((life) / 2));
    const removed = r.kills.reduce((s, k) => s + k.value, 0);
    const forced = r.hitBy.filter(id => id && M[id] && M[id].type !== 'Character').length;
    return Object.assign(r, { cost: val(r.id), ownTurns, removed, forced, score: r.lore + r.drew + removed / 2 + forced });
  });
  return { turns, turningPoints: tp.map(T => T.t), swings: [swingsFor(1), swingsFor(-1)], receipts };
}
