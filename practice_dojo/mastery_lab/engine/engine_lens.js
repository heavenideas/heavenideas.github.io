
// ===================================================================
// LENSES — pure functions of a game state. In the Dojo these would run
// inside render() against App.state; nothing here moves a card.
// ===================================================================
M[0] = Object.assign(model({ id: 0, name: 'Unknown card', fullName: 'Unknown card', cost: 0, inkwell: true, type: 'Unknown', color: '', abilities: [] }), { unknown: true });

function isChar(c) { return M[c.id] && M[c.id].type === 'Character'; }
function loreRate(P) { let r = 0; for (const c of P.field) if (isChar(c)) r += Math.max(M[c.id].lore, M[c.id].gain.act || 0); return r; }
function questableNow(g, P) { let r = 0; for (const c of P.field) if (isChar(c) && canQuest(g, c)) r += Math.max(M[c.id].lore, M[c.id].gain.act || 0); return r; }
function turnsTo20(lore, rate) { if (lore >= 20) return 0; if (rate <= 0) return Infinity; return Math.ceil((20 - lore) / rate); }

// ---------------- RACE CLOCK — "If nothing changes, who wins?" ----------------
// Both players quest with everything every turn; nobody challenges. Turn order matters:
// whoever is acting now gets the first quest.
function raceClock(g, me) {
  const P = g.players[me], O = g.players[me ^ 1];
  const myTurn = g.active === me;
  const rMe = loreRate(P), rOp = loreRate(O);
  const availMe = myTurn ? questableNow(g, P) : 0;
  const availOp = myTurn ? 0 : questableNow(g, O);
  // turns needed, counting the turn in progress as turn 1 for whoever is acting
  const kAct = (L, avail, r) => L >= 20 ? 0 : (L + avail >= 20 ? 1 : (r > 0 ? 1 + Math.ceil((20 - L - avail) / r) : Infinity));
  const kMe = myTurn ? kAct(P.lore, availMe, rMe) : turnsTo20(P.lore, rMe);
  const kOp = myTurn ? turnsTo20(O.lore, rOp) : kAct(O.lore, availOp, rOp);
  const finishTurn = (k, isActive) => k === Infinity ? null : (k === 0 ? g.turn : (isActive ? g.turn + 2 * (k - 1) : g.turn + 1 + 2 * (k - 1)));
  const fMe = finishTurn(kMe, myTurn), fOp = finishTurn(kOp, !myTurn);
  const winner = fMe == null && fOp == null ? null : (fOp == null || (fMe != null && fMe < fOp)) ? me : me ^ 1;
  // margin in game turns (half-rounds): +3 = a full round and a half ahead
  const margin = (fOp == null ? 99 : fOp) - (fMe == null ? 99 : fMe);
  // projected lore turn by turn (alternating, starting with the active player)
  const lanes = [];
  let lm = P.lore, lo = O.lore, who = g.active, first = true, t = g.turn;
  for (let i = 0; i < 14 && lm < 20 && lo < 20; i++) {
    if (who === me) { lm += first && myTurn ? availMe : rMe; } else { lo += first && !myTurn ? availOp : rOp; }
    lanes.push({ turn: t, who, me: Math.min(lm, 25), opp: Math.min(lo, 25), done: lm >= 20 || lo >= 20 });
    first = false; who ^= 1; t++;
  }
  return {
    me, myTurn, lore: [P.lore, O.lore], rate: [rMe, rOp], avail: myTurn ? availMe : availOp,
    k: [kMe, kOp], winner, margin, lanes,
    finish: [fMe, fOp],
    pressure: winner == null ? 'stalled' : winner === me ? (margin >= 3 ? 'ahead' : 'narrow') : (margin <= -3 ? 'behind' : 'close')
  };
}

// ---------------- HIDDEN INFORMATION ----------------
// Everything the opponent has not shown: their decklist minus field, discard and inkwell
// (inked cards are revealed on Duels.ink, which is what the Dojo imports).
function unseenPool(g, who) {
  const O = g.players[who];
  const counts = {}; for (const [id, n] of DECKS[O.key].list) counts[id] = (counts[id] || 0) + n;
  const seen = [...O.field, ...O.discard, ...O.inkwell];
  for (const c of seen) if (counts[c.id]) counts[c.id]--;
  let N = 0; for (const id in counts) N += counts[id];
  return { counts, N, hand: O.hand.length };
}

// What the opponent can do on their NEXT turn (they ready, draw, and ink once).
function oppCapabilities(g, me) {
  const O = g.players[me ^ 1];
  const ink = O.well + 1;
  const chars = O.field.filter(isChar);
  const singers = chars.map(c => Math.max(M[c.id].cost, M[c.id].kw.singer || 0));
  const singTotal = chars.reduce((s, c) => s + M[c.id].cost, 0);
  const upgrader = O.field.find(c => M[c.id].upgrade);
  const upgradeFrom = upgrader && ink >= M[upgrader.id].actInk ? chars.map(c => ({ iid: c.iid, id: c.id, upTo: M[c.id].cost + M[upgrader.id].upgrade.plus })) : [];
  return { ink, chars, singers, singTotal, upgrader, upgradeFrom };
}
// How could card `id` reach the table next turn? Returns a short label or null.
function castRoute(id, cap) {
  const m = M[id];
  if (m.song) {
    if (m.singTogether && cap.singTotal >= m.singTogether) return 'sung together';
    if (cap.singers.some(s => s >= m.cost)) return 'sung for free';
    if (cap.ink >= m.cost && !m.singTogether) return 'paid';
    return null;
  }
  if (m.type === 'Character' && cap.upgradeFrom.length) {
    const from = cap.upgradeFrom.filter(u => u.upTo >= m.cost && M[u.id].cost < m.cost).sort((a, b) => M[a.id].cost - M[b.id].cost)[0];
    if (from && m.cost > cap.ink - 1) return { via: 'upgrade', from: from.id };
  }
  if (cap.ink >= m.cost) return 'paid';
  if (m.kw.shift && cap.chars.some(c => m.shiftBase && m.shiftBase.includes(M[c.id].name)) && cap.ink >= m.kw.shift) return 'shifted';
  return null;
}
function answerHits(ans, c, assumeDamaged) {
  const m = M[c.id];
  if (ans.target !== 'character' || !isChar(c)) return false;
  if (ans.mode === 'exert') return false;
  if (ans.scope === 'chosen' && m.kw.ward) return false;
  const f = Object.assign({}, ans.filter || {});
  if (f.damaged && !(c.damage > 0) && !assumeDamaged) return false;
  delete f.damaged;
  if (!passesFilter(c, f)) return false;
  if (ans.subtypes && !ans.subtypes.some(s => m.subtypes.includes(s))) return false;
  if (ans.mode === 'damage') { const red = ans.ignoresResist ? 0 : (m.kw.resist || 0); return c.damage + (assumeDamaged ? 1 : 0) + Math.max(0, ans.n - red) >= m.wp; }
  return true; // banish / bounce / bottom
}
function playAnswers(id) { return M[id].answers.filter(a => (a.trigger === 'play' || a.trigger === 'trig') && a.target === 'character'); }

// ---------------- EXPOSURE — "what can they do to this next turn?" ----------------
function exposure(g, me, iid) {
  const P = g.players[me], O = g.players[me ^ 1];
  const X = P.field.find(c => c.iid === iid); if (!X || !isChar(X)) return null;
  const mx = M[X.id];
  const pool = unseenPool(g, me ^ 1); const n = Math.min(pool.N, pool.hand + 1);
  const cap = oppCapabilities(g, me);
  const out = { iid, id: X.id, exerted: X.exerted, certain: [], pool: [], combos: [] };
  // 1) challengers already on their board (they all ready next turn)
  if (X.exerted) for (const C of cap.chars) {
    const mc = M[C.id]; if (mx.kw.evasive && !mc.kw.evasive) continue;
    const r = challengeMath(g, C, X);
    if (r.dDies) out.certain.push({ kind: 'challenge', id: C.id, survives: !r.aDies });
  }
  // 2) single cards from the unseen pool
  const killers = {}; // id -> {route, why}
  for (const id in pool.counts) {
    const k = pool.counts[id]; if (!k) continue; const m = M[id];
    if (X.exerted && m.type === 'Character' && m.kw.rush && cap.ink >= m.cost && (!mx.kw.evasive || m.kw.evasive)) {
      const fake = { id: +id, damage: 0, bonus: 0 }; const r = challengeMath(g, fake, X);
      if (r.dDies) killers[id] = { route: 'Rush', why: `challenges for ${(m.str || 0) + (m.kw.challenger || 0)}` };
    }
    const route = castRoute(+id, cap); if (!route) continue;
    for (const a of playAnswers(+id)) if (answerHits(a, X, false)) { killers[id] = { route, why: a.mode }; break; }
  }
  let K = 0; for (const id in killers) K += pool.counts[id];
  for (const id in killers) out.pool.push({ id: +id, copies: pool.counts[id], p: pAtLeastOne(pool.counts[id], pool.N, n), route: killers[id].route, why: killers[id].why });
  out.pool.sort((a, b) => b.p - a.p);
  // 3) two-card combos: a sweeper that damages everything, then a "damaged" finisher
  if (!(X.damage > 0)) {
    const sweepers = [], finishers = [];
    for (const id in pool.counts) {
      if (!pool.counts[id]) continue; const route = castRoute(+id, cap); if (!route) continue;
      for (const a of playAnswers(+id)) {
        if (a.mode === 'damage' && a.scope !== 'chosen' && !(a.filter && a.filter.damaged)) sweepers.push({ id: +id, route });
        else if (!answerHits(a, X, false) && answerHits(a, X, true)) finishers.push({ id: +id, route });
      }
    }
    for (const s of sweepers) for (const f of finishers) if (s.id !== f.id && !killers[f.id] && !out.combos.some(c => c.a === s.id && c.b === f.id)) out.combos.push({ a: s.id, b: f.id, routeA: s.route, routeB: f.route, p: pBoth(pool.counts[s.id], pool.counts[f.id], pool.N, n) });
    out.combos.sort((a, b) => b.p - a.p);
  }
  // 4) ready now, but an "exert" card would expose it to a challenge from their board (Support counted)
  out.enabled = [];
  if (!X.exerted) {
    const supStr = cap.chars.filter(c => M[c.id].kw.support).reduce((s, c) => s + strOf(c), 0);
    const lethal = cap.chars.filter(C => !(mx.kw.evasive && !M[C.id].kw.evasive)).map(C => {
      const plain = challengeMath(g, C, X).dDies;
      const boosted = supStr && !M[C.id].kw.support ? challengeMath(g, Object.assign({}, C, { bonus: (C.bonus || 0) + supStr }), X).dDies : false;
      return plain || boosted ? { id: C.id, support: !plain } : null;
    }).filter(Boolean);
    if (lethal.length) {
      let KE = 0; const en = [];
      for (const id in pool.counts) {
        if (!pool.counts[id]) continue;
        const ok = playAnswers(+id).some(a => a.mode === 'exert' && (a.scope !== 'chosen' || !mx.kw.ward)) && castRoute(+id, cap);
        if (ok) { KE += pool.counts[id]; en.push(+id); }
      }
      if (KE) { const p = pAtLeastOne(KE, pool.N, n); out.enabled.push({ by: en, then: lethal, p }); }
    }
  }
  const pEnabled = out.enabled.length ? out.enabled[0].p : 0;
  const pSingle = K ? pAtLeastOne(K, pool.N, n) : 0;
  const pCombo = out.combos.length ? Math.max(...out.combos.map(c => c.p)) : 0;
  out.pAny = out.certain.length ? 1 : 1 - (1 - pSingle) * (1 - pCombo) * (1 - pEnabled);
  out.pool.n = n; out.N = pool.N; out.handNext = n;
  return out;
}

// ---------------- THREATS — "what happens if I don't answer this?" ----------------
function threatOf(g, me, iid) {
  const P = g.players[me], O = g.players[me ^ 1];
  const Y = O.field.find(c => c.iid === iid); if (!Y || !isChar(Y)) return null;
  const my = M[Y.id];
  const pool = unseenPool(g, me ^ 1); const n = Math.min(pool.N, pool.hand + 1);
  const cap = oppCapabilities(g, me);
  const res = { iid, id: Y.id, lore: Math.max(my.lore, my.gain.act || 0), cards: my.draw.act && !my.actOneShot ? my.draw.act : 0, condCards: my.draw.eot, enables: [], answers: [], blockers: [] };
  // unlocks: the Retro Evolution Device upgrade, Shift onto it, songs it can sing
  if (cap.upgrader) {
    const top = Object.keys(pool.counts).map(Number).filter(id => pool.counts[id] && M[id].type === 'Character' && M[id].cost > my.cost && M[id].cost <= my.cost + M[cap.upgrader.id].upgrade.plus).sort((a, b) => M[b].cost - M[a].cost);
    for (const id of top.slice(0, 2)) res.enables.push({ kind: 'upgrade', id, p: pAtLeastOne(pool.counts[id], pool.N, n), text: playAnswers(id).length ? describeAnswer(playAnswers(id)[0]) : '' });
  }
  for (const id in pool.counts) if (pool.counts[id] && M[id].shiftBase && M[id].shiftBase.includes(my.name)) res.enables.push({ kind: 'shift', id: +id, p: pAtLeastOne(pool.counts[id], pool.N, n), text: `Shift ${M[id].kw.shift}` });
  const singCost = Math.max(my.cost, my.kw.singer || 0);
  for (const id in pool.counts) { const m = M[id]; if (pool.counts[id] && m.song && !m.singTogether && m.cost <= singCost && playAnswers(+id).length) res.enables.push({ kind: 'sing', id: +id, p: pAtLeastOne(pool.counts[id], pool.N, n), text: describeAnswer(playAnswers(+id)[0]) }); }
  res.enables.sort((a, b) => b.p - a.p);
  // my answers: cards in hand, and challenges (with Support) — Ward and Evasive respected
  const myInk = P.ready + (P.inked ? 0 : 1);
  for (const c of P.hand) {
    const m = M[c.id];
    for (const a of playAnswers(c.id)) {
      if (a.mode === 'exert') continue;
      if (answerHits(a, Y, false)) res.answers.push({ kind: 'card', id: c.id, mode: a.mode, affordable: m.cost <= myInk || (m.song && singersFor(g, me, c.id).length > 0) });
      else if (a.scope === 'chosen' && my.kw.ward && passesFilter(Y, a.filter)) res.blockers.push({ id: c.id, why: 'Ward' });
    }
  }
  const supports = P.field.filter(c => isChar(c) && M[c.id].kw.support && canQuest(g, c));
  const exertAll = P.hand.some(c => playAnswers(c.id).some(a => a.mode === 'exert' && a.scope !== 'chosen') && M[c.id].cost <= myInk);
  const exertChosen = P.hand.some(c => playAnswers(c.id).some(a => a.mode === 'exert' && a.scope === 'chosen') && M[c.id].cost <= myInk);
  for (const A of P.field) {
    if (!isChar(A) || A.exerted || !(isDry(g, A) || M[A.id].kw.rush)) continue;
    if (my.kw.evasive && !M[A.id].kw.evasive) continue;
    const plain = challengeMath(g, A, Y);
    const sup = supports.filter(s => s.iid !== A.iid).reduce((s, x) => s + strOf(x), 0);
    const boosted = sup ? challengeMath(g, Object.assign({}, A, { bonus: (A.bonus || 0) + sup }), Y) : plain;
    const kill = plain.dDies ? 'plain' : (boosted.dDies ? 'support' : null);
    if (!kill) continue;
    const needsExert = !Y.exerted;
    const can = !needsExert || exertAll || (exertChosen && !my.kw.ward);
    res.answers.push({ kind: 'challenge', id: A.id, iid: A.iid, support: kill === 'support', survives: !(kill === 'plain' ? plain.aDies : boosted.aDies), needsExert, possible: can, viaExert: needsExert ? (exertAll ? 'exert-all' : (exertChosen && !my.kw.ward ? 'exert-chosen' : null)) : null });
  }
  // a single number to sort by: two turns of ignoring it
  res.ignore2 = 2 * res.lore + 2 * res.cards + res.condCards + res.enables.reduce((s, e) => s + e.p * (e.kind === 'upgrade' ? M[e.id].cost - my.cost + 3 : 2), 0);
  return res;
}
function describeAnswer(a) {
  const f = a.filter || {}; const bits = [];
  if (f.damaged) bits.push('damaged'); if (f.strGte != null) bits.push(`${f.strGte}+ strength`); if (f.strLte != null) bits.push(`≤${f.strLte} strength`); if (f.costLte != null) bits.push(`cost ≤${f.costLte}`); if (f.kw) bits.push(cap(f.kw));
  const who = a.scope === 'chosen' ? 'chosen' : (a.scope === 'all' ? 'ALL' : 'all opposing');
  const verb = a.mode === 'damage' ? `${a.n} damage to` : a.mode === 'bounce' ? 'return to hand:' : a.mode === 'bottom' ? 'bottom of deck:' : a.mode;
  return `${verb} ${who}${bits.length ? ' ' + bits.join(', ') : ''}`.trim();
}

// Board-wide view for one side.
function threatMap(g, me) {
  const O = g.players[me ^ 1], P = g.players[me];
  const theirs = O.field.filter(isChar).map(c => threatOf(g, me, c.iid)).sort((a, b) => b.ignore2 - a.ignore2);
  const mine = P.field.filter(isChar).map(c => exposure(g, me, c.iid));
  // dead cards: answers in the opponent's unseen pool that currently have no target on my board (virtual card advantage)
  const pool = unseenPool(g, me ^ 1); const dead = []; const live = [];
  for (const id in pool.counts) {
    if (!pool.counts[id]) continue; const as = playAnswers(+id).filter(a => a.mode !== 'exert'); if (!as.length) continue;
    const targets = P.field.filter(c => isChar(c) && as.some(a => answerHits(a, c, false)));
    (targets.length ? live : dead).push({ id: +id, copies: pool.counts[id], targets: targets.map(c => c.id) });
  }
  // sweepers: how much of my board one card takes
  const sweeps = [];
  for (const id in pool.counts) {
    if (!pool.counts[id]) continue;
    for (const a of playAnswers(+id)) if (a.scope !== 'chosen' && a.mode !== 'exert') {
      const hit = P.field.filter(c => isChar(c) && answerHits(a, c, false));
      if (hit.length) sweeps.push({ id: +id, copies: pool.counts[id], value: hit.reduce((s, c) => s + M[c.id].cost, 0), count: hit.length, route: castRoute(+id, oppCapabilities(g, me)) });
    }
  }
  return { theirs, mine, dead, live, sweeps, pool };
}

// ---------------- SANDBOX: legal actions + on-play resolution ----------------
function legalActions(g, me) {
  const P = g.players[me], O = g.players[me ^ 1]; const acts = [];
  if (g.pending) return acts;
  for (const c of P.hand) {
    const m = M[c.id];
    if (!P.inked && m.ink) acts.push({ kind: 'ink', iid: c.iid, label: `Ink ${m.name}` });
    if (m.song) { for (const s of singersFor(g, me, c.id)) acts.push({ kind: 'sing', iid: c.iid, singer: s.iid, label: `${M[s.id].name} sings ${m.name}` }); if (m.cost <= P.ready && !m.singTogether) acts.push({ kind: 'play', iid: c.iid, label: `Play ${m.name} (${m.cost})` }); }
    else if (m.type !== 'Unknown' && costFor(g, me, c.id) <= P.ready) acts.push({ kind: 'play', iid: c.iid, label: `Play ${m.name} (${costFor(g, me, c.id)})` });
  }
  for (const c of P.field) {
    const m = M[c.id];
    if (canQuest(g, c)) {
      if (m.kw.support) { const others = P.field.filter(x => x.iid !== c.iid && isChar(x)); acts.push({ kind: 'quest', iid: c.iid, label: `${m.name} quests` }); for (const t of others) acts.push({ kind: 'quest', iid: c.iid, support: t.iid, label: `${m.name} quests · Support → ${M[t.id].name}` }); }
      else acts.push({ kind: 'quest', iid: c.iid, label: `${m.name} quests (+${m.lore})` });
    }
    if (canActivate(g, c)) acts.push({ kind: 'activate', iid: c.iid, label: m.gain.act || m.draw.act ? `${m.name}: pay ${m.actInk} — draw${m.gain.act ? ' + ' + m.gain.act + ' lore' : ''}` : `${m.name}: next character costs 1 less` });
    for (const d of O.field) if (canChallenge(g, c, d)) acts.push({ kind: 'challenge', iid: c.iid, def: d.iid, label: `${m.name} → ${M[d.id].name}` });
  }
  return acts;
}
function hasSubtypeOther(g, p, subtype, exceptIid) { return g.players[p].field.some(c => c.iid !== exceptIid && isChar(c) && M[c.id].subtypes.includes(subtype)); }
function doAction(g, me, a) {
  const P = g.players[me];
  if (a.kind === 'ink') ink(g, me, a.iid);
  else if (a.kind === 'quest') quest(g, me, a.iid, a.support || null);
  else if (a.kind === 'challenge') challenge(g, me, a.iid, a.def);
  else if (a.kind === 'activate') activate(g, me, a.iid);
  else if (a.kind === 'sing' || a.kind === 'play') {
    const c = a.kind === 'sing' ? sing(g, me, a.iid, [a.singer]) : play(g, me, a.iid);
    resolveOnPlay(g, me, c);
  } else if (a.kind === 'target') {
    const pend = g.pending; g.pending = null;
    if (a.target) applyAnswer(g, me, pend.ans, a.target, pend.src);
    continueOnPlay(g, me, pend.rest, pend.src);
  }
  return g;
}
function resolveOnPlay(g, me, c) {
  const m = M[c.id];
  const steps = [];
  if (m.draw.play) steps.push({ draw: m.draw.play });
  for (const a of playAnswers(c.id)) steps.push({ ans: a });
  if (m.refill) steps.push({ refill: m.refill });
  continueOnPlay(g, me, steps, c.iid);
}
function continueOnPlay(g, me, steps, src) {
  while (steps.length) {
    const s = steps.shift();
    if (s.draw) { for (let k = 0; k < s.draw; k++) draw(g, me, null, 'effect'); continue; }
    if (s.refill) {
      for (let p = 0; p < 2; p++) while (g.players[p].hand.length < s.refill) { if (p === me) { if (!draw(g, p, null, 'effect')) break; } else { const u = inst(g, p, 0); g.players[p].hand.push(u); ev(g, { kind: 'draw', p, id: 0, iid: u.iid, why: 'effect' }); } }
      continue;
    }
    const a = s.ans;
    if (a.cond && a.cond.another && !hasSubtypeOther(g, me, a.cond.another, src)) continue;
    if (a.scope === 'chosen') {
      const targets = answerTargets(g, me, a, src).filter(t => a.mode !== 'damage' || true);
      if (!targets.length) continue;
      g.pending = { src, ans: a, targets: targets.map(t => t.iid), rest: steps };
      return;
    }
    applyAnswer(g, me, a, null, src);
  }
}
