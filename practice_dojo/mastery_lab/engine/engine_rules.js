
// ===================================================================
// RULES — a deliberately small, honest subset: enough to replay a turn,
// score it, and let a lens ask "what happens next". It is NOT a rules
// engine for the Dojo (the Dojo stays a sandbox); it exists so the
// prototypes can move cards the way the player would by hand.
// Every mutation appends to g.events, which the ledger reads.
// ===================================================================
function newPlayer(key, name) { return { key, name, lore: 0, well: 0, ready: 0, inked: false, hand: [], field: [], discard: [], inkwell: [], deck: [], disc: 0, hidden: 0 }; }
function newGame(first) {
  return { turn: 1, active: first || 0, seq: 0, players: [newPlayer('B', 'Madrigals'), newPlayer('A', 'Phillip')], events: [], log: [] };
}
function clone(g) { return JSON.parse(JSON.stringify(g)); }
function inst(g, p, id) { g.seq++; return { iid: (p === 0 ? 'm' : 'p') + g.seq, id, owner: p, exerted: false, played: -99, damage: 0, bonus: 0, used: false }; }
function nameOf(x) { return x && M[x.id] ? M[x.id].name : '?'; }
function find(g, iid) {
  for (let p = 0; p < 2; p++) for (const zone of ['field', 'hand', 'discard', 'inkwell']) {
    const arr = g.players[p][zone]; const i = arr.findIndex(c => c.iid === iid);
    if (i >= 0) return { p, zone, i, c: arr[i] };
  }
  return null;
}
function ev(g, e) { e.t = g.turn; e.a = g.active; g.events.push(e); return e; }
function say(g, text) { g.log.push({ t: g.turn, a: g.active, text }); }
function isDry(g, c) { return c.played < g.turn; }
function strOf(c) { const m = M[c.id]; return (m.str || 0) + (c.bonus || 0); }
function wpLeft(c) { return (M[c.id].wp || 0) - (c.damage || 0); }

// ---------- turn structure ----------
function startTurn(g, drawId) {
  const P = g.players[g.active];
  for (const c of P.field) { c.exerted = false; c.bonus = 0; c.used = false; }
  P.ready = P.well; P.inked = false; P.disc = 0;
  for (const c of P.field) { const m = M[c.id]; if (m.reducer && !m.reducer.exert && m.type === 'Character') P.disc += m.reducer.n; } // Willow
  if (drawId != null) draw(g, g.active, drawId, 'turn');
  ev(g, { kind: 'start', p: g.active });
}
function endTurn(g) { ev(g, { kind: 'end', p: g.active }); g.turn++; g.active ^= 1; }

// ---------- primitives ----------
function draw(g, p, id, why) {
  const P = g.players[p];
  let c;
  if (id == null) { c = P.deck.shift(); if (!c) return null; } // sandbox: known deck order
  else { const i = P.deck.findIndex(x => x.id === id); c = i >= 0 ? P.deck.splice(i, 1)[0] : inst(g, p, id); }
  P.hand.push(c); ev(g, { kind: 'draw', p, id: c.id, iid: c.iid, why: why || 'effect' });
  return c;
}
function pickHand(g, p, idOrIid) {
  const P = g.players[p];
  const i = P.hand.findIndex(c => c.iid === idOrIid || c.id === idOrIid);
  return i >= 0 ? i : -1;
}
function ink(g, p, idOrIid) {
  const P = g.players[p]; const i = pickHand(g, p, idOrIid); if (i < 0) throw new Error('ink: not in hand ' + idOrIid);
  const c = P.hand.splice(i, 1)[0]; P.inkwell.push(c); P.well++; P.ready++; P.inked = true;
  ev(g, { kind: 'ink', p, id: c.id, iid: c.iid }); say(g, `inked ${nameOf(c)}`);
  return c;
}
function costFor(g, p, id) { const m = M[id]; const P = g.players[p]; return Math.max(0, m.cost - (m.type === 'Character' ? P.disc : 0)); }
function play(g, p, idOrIid, opts) {
  opts = opts || {};
  const P = g.players[p]; const i = pickHand(g, p, idOrIid); if (i < 0) throw new Error('play: not in hand ' + idOrIid);
  const c = P.hand.splice(i, 1)[0]; const m = M[c.id];
  let paid = opts.free ? 0 : (opts.paid != null ? opts.paid : costFor(g, p, c.id));
  if (opts.shiftOnto) { paid = opts.paid != null ? opts.paid : m.kw.shift; }
  if (!opts.free && m.type === 'Character') P.disc = 0;
  P.ready -= paid;
  if (m.type === 'Character' || m.type === 'Item' || m.type === 'Location') {
    c.played = g.turn; c.exerted = false; c.damage = 0; c.bonus = 0;
    if (opts.shiftOnto) { const base = find(g, opts.shiftOnto); if (base) { c.damage = base.c.damage; c.played = base.c.played; c.exerted = base.c.exerted; P.field.splice(base.i, 1); } }
    P.field.push(c);
  } else P.discard.push(c);
  ev(g, { kind: 'play', p, id: c.id, iid: c.iid, paid, value: m.cost, how: opts.how || (opts.free ? 'free' : opts.shiftOnto ? 'shift' : 'ink') });
  say(g, `played ${nameOf(c)}${paid !== m.cost ? ` (paid ${paid})` : ''}`);
  return c;
}
function sing(g, p, songIdOrIid, singerIids) {
  const P = g.players[p]; const i = pickHand(g, p, songIdOrIid); const c = P.hand.splice(i, 1)[0];
  for (const s of singerIids) { const f = find(g, s); if (f) f.c.exerted = true; }
  P.discard.push(c);
  ev(g, { kind: 'play', p, id: c.id, iid: c.iid, paid: 0, value: M[c.id].cost, how: 'sing', by: singerIids });
  say(g, `${singerIids.map(s => nameOf(find(g, s).c)).join(' + ')} sang ${nameOf(c)}`);
  return c;
}
function quest(g, p, iid, supportTo) {
  const f = find(g, iid); const c = f.c; const m = M[c.id];
  c.exerted = true; g.players[p].lore += m.lore;
  ev(g, { kind: 'quest', p, id: c.id, iid, lore: m.lore });
  if (m.kw.support && supportTo) { const t = find(g, supportTo); if (t) { t.c.bonus += strOf(c); ev(g, { kind: 'support', p, iid, to: supportTo, n: strOf(c) }); } }
  say(g, `${nameOf(c)} quested (+${m.lore})${m.kw.support && supportTo ? `, Support → ${nameOf(find(g, supportTo).c)} +${m.str} strength` : ''}`);
}
function challengeMath(g, a, d) {
  const ma = M[a.id], md = M[d.id];
  const toD = Math.max(0, strOf(a) + (ma.kw.challenger || 0) - (md.kw.resist || 0));
  const toA = Math.max(0, (md.str || 0) + (d.bonus || 0) - (ma.kw.resist || 0));
  return { toD, toA, dDies: d.damage + toD >= (md.wp || 0), aDies: a.damage + toA >= (ma.wp || 0) };
}
function challenge(g, p, aiid, diid) {
  const a = find(g, aiid).c, d = find(g, diid).c;
  const r = challengeMath(g, a, d);
  a.exerted = true; a.damage += r.toA; d.damage += r.toD;
  ev(g, { kind: 'challenge', p, iid: aiid, id: a.id, def: diid, defId: d.id, toD: r.toD, toA: r.toA, dDies: r.dDies, aDies: r.aDies });
  say(g, `${nameOf(a)} challenged ${nameOf(d)} (${r.toD} dmg${r.dDies ? ', banished' : ''}; took ${r.toA}${r.aDies ? ', banished' : ''})`);
  if (r.dDies) banish(g, diid, { by: aiid, how: 'challenge' });
  if (r.aDies) banish(g, aiid, { by: diid, how: 'challenge' });
  return r;
}
function damage(g, iid, n, src) {
  const f = find(g, iid); if (!f || f.zone !== 'field') return;
  f.c.damage += n; ev(g, { kind: 'damage', p: f.p, iid, id: f.c.id, n, src: src || null });
  if (f.c.damage >= (M[f.c.id].wp || 0)) banish(g, iid, src);
}
function banish(g, iid, src) {
  const f = find(g, iid); if (!f || f.zone !== 'field') return;
  const P = g.players[f.p]; P.field.splice(f.i, 1); const c = f.c; c.exerted = false; c.bonus = 0;
  P.discard.push(c);
  ev(g, { kind: 'leave', p: f.p, iid, id: c.id, value: M[c.id].cost, how: (src && src.how) || 'banish', src: src || null });
}
function bounce(g, iid, src) {
  const f = find(g, iid); if (!f || f.zone !== 'field') return;
  const P = g.players[f.p]; P.field.splice(f.i, 1); const c = f.c; c.exerted = false; c.damage = 0; c.bonus = 0; c.played = -99;
  P.hand.push(c);
  ev(g, { kind: 'leave', p: f.p, iid, id: c.id, value: M[c.id].cost, how: 'bounce', src: src || null });
}
function exert(g, iid) { const f = find(g, iid); if (f) f.c.exerted = true; ev(g, { kind: 'exert', p: f.p, iid }); }
function discard(g, p, idOrIid, why) {
  const P = g.players[p]; const i = pickHand(g, p, idOrIid); const c = P.hand.splice(i, 1)[0]; P.discard.push(c);
  ev(g, { kind: 'discard', p, id: c.id, iid: c.iid, why: why || '' }); say(g, `discarded ${nameOf(c)}`);
}
function loreDelta(g, p, n, why) { g.players[p].lore = Math.max(0, g.players[p].lore + n); ev(g, { kind: 'lore', p, n, why }); }

// ---------- activations ----------
function activate(g, p, iid, arg) {
  const f = find(g, iid); const c = f.c; const m = M[c.id]; const P = g.players[p];
  if (m.reducer && m.reducer.exert) { c.exerted = true; P.disc += m.reducer.n; ev(g, { kind: 'act', p, iid, id: c.id, what: 'reduce' }); say(g, `${nameOf(c)}: next character costs 1 less`); return; }
  if (m.gain.act || m.draw.act) {
    c.exerted = true; P.ready -= m.actInk;
    ev(g, { kind: 'act', p, iid, id: c.id, what: 'engine', paid: m.actInk });
    if (m.gain.act) { P.lore += m.gain.act; ev(g, { kind: 'lore', p, n: m.gain.act, why: 'ability', iid }); }
    const drawn = [];
    for (let k = 0; k < m.draw.act; k++) { const d = draw(g, p, Array.isArray(arg) ? arg[k] : null, 'ability'); if (d) { d.from = iid; drawn.push(d); } }
    for (const e of g.events.slice(-m.draw.act)) if (e.kind === 'draw') e.src = iid;
    if (m.actOneShot) banish(g, iid, { how: 'sacrifice' });
    say(g, `${nameOf(c)} activated${m.gain.act ? ` (+${m.gain.act} lore)` : ''}${drawn.length ? `, drew ${drawn.map(nameOf).join(', ')}` : ''}`);
    return drawn;
  }
  if (m.upgrade) { // Retro Evolution Device: arg = { banish: iid, playId }
    c.exerted = true; P.ready -= m.actInk;
    ev(g, { kind: 'act', p, iid, id: c.id, what: 'upgrade', paid: m.actInk });
    const gone = nameOf(find(g, arg.banish).c);
    banish(g, arg.banish, { how: 'sacrifice', by: iid });
    const hi = pickHand(g, p, arg.playId); if (hi < 0) P.hand.push(inst(g, p, arg.playId));
    const played = play(g, p, arg.playId, { free: true, how: 'upgrade' });
    say(g, `Retro Evolution Device: banished ${gone} → played ${nameOf(played)} for free`);
    return played;
  }
}

// ---------- capability checks used by the sandbox ----------
function canQuest(g, c) { const m = M[c.id]; return m.type === 'Character' && !c.exerted && isDry(g, c) && !m.kw.reckless; }
function canChallenge(g, a, d) {
  const ma = M[a.id], md = M[d.id];
  if (ma.type !== 'Character' || md.type !== 'Character') return false;
  if (a.exerted || !(isDry(g, a) || ma.kw.rush)) return false;
  if (!d.exerted) return false;
  if (md.kw.evasive && !ma.kw.evasive) return false;
  return true;
}
function canActivate(g, c) {
  const m = M[c.id]; const P = g.players[c.owner];
  if (c.exerted) return false;
  if (m.type === 'Character' && !isDry(g, c)) return false;
  if (m.reducer && m.reducer.exert) return true;
  if (m.gain.act || m.draw.act || m.upgrade) return P.ready >= m.actInk;
  return false;
}
function canPlay(g, p, c) { const m = M[c.id]; if (m.song) return true; return costFor(g, p, c.id) <= g.players[p].ready; }
// singers available for a song (dry, ready characters whose cost — or Singer N — covers the song)
function singersFor(g, p, songId) {
  const s = M[songId]; return g.players[p].field.filter(c => { const m = M[c.id]; return m.type === 'Character' && !c.exerted && isDry(g, c) && Math.max(m.cost, m.kw.singer || 0) >= s.cost; });
}

// Valid targets for an "answer" record played by player p.
function answerTargets(g, p, ans, selfIid) {
  const out = [];
  for (let q = 0; q < 2; q++) {
    if (ans.opposing && q === p) continue;
    for (const c of g.players[q].field) {
      if (c.iid === selfIid) continue;
      const m = M[c.id];
      if (ans.target === 'character' && m.type !== 'Character') continue;
      if (ans.target === 'item' && m.type !== 'Item') continue;
      if (ans.scope === 'chosen' && q !== p && m.kw.ward) continue;       // Ward: opponents can't choose it
      if (!passesFilter(c, ans.filter)) continue;
      if (ans.subtypes && !ans.subtypes.some(s => m.subtypes.includes(s))) continue;
      out.push(c);
    }
  }
  return out;
}
function passesFilter(c, f) {
  const m = M[c.id]; if (!f) return true;
  if (f.strGte != null && (m.str || 0) + (c.bonus || 0) < f.strGte) return false;
  if (f.strLte != null && (m.str || 0) + (c.bonus || 0) > f.strLte) return false;
  if (f.costLte != null && m.cost > f.costLte) return false;
  if (f.costGte != null && m.cost < f.costGte) return false;
  if (f.kw && !m.kw[f.kw]) return false;
  if (f.damaged && !(c.damage > 0)) return false;
  if (f.exerted && !c.exerted) return false;
  return true;
}
// Resolve an answer against one target (or all, for sweepers).
function applyAnswer(g, p, ans, targetIid, srcIid) {
  const src = { by: srcIid, how: 'effect', card: srcIid ? (find(g, srcIid) || {}).c && find(g, srcIid).c.id : null };
  const hits = ans.scope === 'chosen' ? [find(g, targetIid) && find(g, targetIid).c].filter(Boolean) : answerTargets(g, p, Object.assign({}, ans, { scope: 'all' }), srcIid);
  for (const c of hits) {
    if (ans.mode === 'banish') banish(g, c.iid, src);
    else if (ans.mode === 'damage') damage(g, c.iid, ans.n, src);
    else if (ans.mode === 'bounce') bounce(g, c.iid, src);
    else if (ans.mode === 'bottom') { const f = find(g, c.iid); g.players[f.p].field.splice(f.i, 1); ev(g, { kind: 'leave', p: f.p, iid: c.iid, id: c.id, value: M[c.id].cost, how: 'bottom', src }); }
    else if (ans.mode === 'exert') exert(g, c.iid);
  }
  return hits.length;
}
