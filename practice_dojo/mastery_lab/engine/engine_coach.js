
// ===================================================================
// SEQUENCING COACH — same actions, different order. Replays a turn's
// steps in any order on the turn-start state, marks what was illegal
// or wasteful, and finds the best order by trying all of them.
// ===================================================================
// A step: { key, kind: 'ink'|'activate'|'play'|'quest'|'challenge', who, card, att, def, support }
function coachRun(start, steps, inkChoice, me) {
  me = me || 0;
  const g = clone(start); g.events = []; g.log = [];
  const P = g.players[me], O = g.players[me ^ 1];
  const fieldIid = (p, k, pred) => { const c = g.players[p].field.find(x => x.id === ID[k] && (!pred || pred(x))); return c ? c.iid : null; };
  const out = []; let inkedAt = -1; let drawnBeforeInk = []; const readyBefore = [];
  steps.forEach((s, idx) => {
    const r = { key: s.key, ok: true, why: '', idx };
    readyBefore.push(P.ready);
    if (s.kind === 'ink') {
      const id = inkChoice; const c = P.hand.find(x => x.id === id);
      if (P.inked) { r.ok = false; r.why = 'already inked this turn'; }
      else if (!c) { r.ok = false; r.why = `${M[id].name} isn't in your hand yet`; }
      else if (!M[id].ink) { r.ok = false; r.why = `${M[id].name} is uninkable`; }
      else { ink(g, me, c.iid); inkedAt = idx; r.card = id; }
    } else if (s.kind === 'activate') {
      const iid = fieldIid(me, s.who, c => canActivate(g, c));
      if (!iid) { r.ok = false; r.why = P.ready < M[ID[s.who]].actInk ? 'no ink left for it' : `${M[ID[s.who]].name} can't activate now`; }
      else { const before = P.hand.length; activate(g, me, iid); r.drew = P.hand.slice(before).map(c => c.id); }
    } else if (s.kind === 'play') {
      const c = P.hand.find(x => x.id === ID[s.card]);
      if (!c) { r.ok = false; r.why = 'not in hand'; }
      else if (costFor(g, me, c.id) > P.ready) { r.ok = false; r.why = `needs ${costFor(g, me, c.id)} ink, you have ${P.ready}`; }
      else { const before = P.hand.length; const pc = play(g, me, c.iid); resolveAll(g, me, pc); r.drew = P.hand.slice(before - 1).filter(x => x.iid !== c.iid).map(x => x.id); }
    } else if (s.kind === 'quest') {
      const iid = fieldIid(me, s.who, c => canQuest(g, c));
      if (!iid) { r.ok = false; r.why = `${M[ID[s.who]].name} can't quest now`; }
      else {
        // Support goes to the next challenger in the sequence (the obvious target)
        let to = null;
        if (s.support) { const nextCh = steps.slice(idx + 1).find(x => x.kind === 'challenge'); if (nextCh) to = fieldIid(me, nextCh.att, c => !c.exerted); }
        quest(g, me, iid, to); r.supportTo = to ? M[find(g, to).c.id].name : null;
      }
    } else if (s.kind === 'challenge') {
      const ai = fieldIid(me, s.att, c => !c.exerted); const di = fieldIid(me ^ 1, s.def);
      if (!ai) { r.ok = false; r.why = `${M[ID[s.att]].name} isn't ready`; }
      else if (!di) { r.ok = false; r.why = `${M[ID[s.def]].name} is gone`; }
      else if (!canChallenge(g, find(g, ai).c, find(g, di).c)) { r.ok = false; r.why = find(g, di).c.exerted ? 'not allowed' : `${M[ID[s.def]].name} isn't exerted — only exerted characters can be challenged`; }
      else { const res = challenge(g, me, ai, di); r.res = res; }
    }
    out.push(r);
  });
  return { g, steps: out, inkedAt, readyBefore };
}
function resolveAll(g, me, c) { resolveOnPlay(g, me, c); while (g.pending) { const t = g.pending.targets[0]; doAction(g, me, { kind: 'target', target: t }); } }

function coachScore(start, run, me) {
  me = me || 0;
  const g = run.g, P = g.players[me], O = g.players[me ^ 1], P0 = start.players[me], O0 = start.players[me ^ 1];
  const val = (arr) => arr.filter(c => M[c.id].type !== 'Unknown').reduce((s, c) => s + M[c.id].cost, 0);
  const rc = raceClock(Object.assign(clone(g), { active: me }), me);
  const removed = val(O0.field) - val(O.field);
  const lost = val(P0.field.filter(c => !P.field.some(x => x.iid === c.iid)));
  const up = O.field.find(c => M[c.id].upgrader || M[c.id].upgrade);
  const pool = unseenPool(g, me ^ 1);
  const comboOpen = !!up && O.field.some(c => isChar(c) && Object.keys(pool.counts).some(id => pool.counts[id] && M[id].type === 'Character' && M[id].cost > M[c.id].cost && M[id].cost <= M[c.id].cost + M[up.id].upgrade.plus && M[id].cost >= 8));
  const illegal = run.steps.filter(s => !s.ok).length;
  // a card with removal text but no legal target on this board isn't a resource right now
  const dead = (id) => { const as = playAnswers(id).filter(a => a.mode !== 'exert'); return as.length > 0 && !as.some(a => answerTargets(g, me, a, null).some(t => t.owner !== me)); };
  const liveHand = P.hand.filter(c => !dead(c.id)).length;
  return { lore: P.lore - P0.lore, removed, lost, readyLeft: P.ready, hand: P.hand.length, liveHand, finish: rc.finish, winner: rc.winner, margin: rc.margin, rate: rc.rate, comboOpen, illegal };
}

// Rules that turn a replay into feedback.
function coachFlags(start, steps, run, me) {
  me = me || 0;
  const flags = [];
  const P0 = start.players[me];
  const inkIdx = steps.findIndex(s => s.kind === 'ink');
  // R1 · Gather information before irreversible decisions: a draw you could already afford came after the ink.
  if (inkIdx >= 0 && run.steps[inkIdx].ok) {
    steps.forEach((s, j) => {
      if (j <= inkIdx || !run.steps[j].ok) return;
      const card = s.kind === 'activate' ? ID[s.who] : s.kind === 'play' ? ID[s.card] : null; if (!card) return;
      const m = M[card]; const draws = s.kind === 'activate' ? m.draw.act : m.draw.play;
      if (!draws) return;
      const cost = s.kind === 'activate' ? m.actInk : m.cost;
      if (run.readyBefore[inkIdx] < cost) return;
      // the sandbox knows the deck order: what would that draw have shown at the moment you inked?
      const peek = coachRun(start, steps.slice(0, inkIdx), null, me).g.players[me].deck.slice(0, draws).map(c => c.id);
      flags.push({ at: inkIdx, rule: 'info', seen: peek, title: `Ink after ${m.name} draws`, text: `${m.name}'s draw was affordable with ${run.readyBefore[inkIdx]} ink before you inked. Draw first, then choose: you'd have seen ${peek.map(id => M[id].name).join(', ') || 'a new card'}.` });
    });
  }
  // R1b · Ink quality: a card with no job on this board was available to ink instead.
  if (inkIdx >= 0 && run.steps[inkIdx].ok) {
    const inked = run.steps[inkIdx].card;
    const deadNow = (id) => { const as = playAnswers(id).filter(a => a.mode !== 'exert'); return as.length > 0 && !as.some(a => answerTargets(start, me, a, null).some(t => t.owner !== me)); };
    const handAtInk = new Set(coachRun(start, steps.slice(0, inkIdx), null, me).g.players[me].hand.map(c => c.id));
    if (!deadNow(inked)) { const alt = [...handAtInk].find(id => id !== inked && M[id].ink && deadNow(id)); if (alt) flags.push({ at: inkIdx, rule: 'ink', title: `Ink ${M[alt].name} instead`, text: `${M[alt].name} has no target on this board; ${M[inked].name} still has a job. Will you regret losing access to it?` }); }
  }
  // R2 · Support before the challenge it should power.
  steps.forEach((s, j) => {
    if (s.kind !== 'quest' || !s.support || !run.steps[j].ok) return;
    const earlier = steps.findIndex((x, i) => i < j && x.kind === 'challenge' && run.steps[i].ok);
    if (earlier >= 0) {
      const ch = run.steps[earlier];
      flags.push({ at: earlier, rule: 'support', title: `Quest with ${M[ID[s.who]].name} first`, text: `Support adds +${M[ID[s.who]].str} strength to the next challenger, but it came after this challenge${ch.res && !ch.res.dDies ? ` — ${M[ID[steps[earlier].def]].name} survived on ${ch.res.toD} damage` : ''}.` });
    }
  });
  // R3 · Discounts before the character they discount.
  steps.forEach((s, j) => {
    if (s.kind !== 'activate' || !M[ID[s.who]].reducer || !run.steps[j].ok) return;
    const before = steps.findIndex((x, i) => i < j && x.kind === 'play' && M[ID[x.card]].type === 'Character' && run.steps[i].ok);
    if (before >= 0) flags.push({ at: j, rule: 'reducer', title: `${M[ID[s.who]].name} came too late`, text: `Its discount only applies to the next character you play — ${M[ID[steps[before].card]].name} already paid full price.` });
  });
  // R4 · Illegal steps (usually: challenged before the target was exerted).
  run.steps.forEach((r, j) => { if (!r.ok) flags.push({ at: j, rule: 'illegal', title: 'Not possible here', text: r.why }); });
  // R5 · Ink left on the table.
  const P = run.g.players[me];
  if (P.ready > 0) {
    const usable = P.hand.some(c => M[c.id].type !== 'Unknown' && !M[c.id].song && costFor(run.g, me, c.id) <= P.ready) || P.field.some(c => canActivate(run.g, c) && M[c.id].actInk > 0);
    if (usable) flags.push({ at: steps.length - 1, rule: 'float', title: `${P.ready} ink unspent`, text: 'Something in hand or on board could still use it.' });
  }
  return flags;
}

function permutations(arr) { if (arr.length <= 1) return [arr.slice()]; const out = []; arr.forEach((x, i) => { for (const p of permutations(arr.slice(0, i).concat(arr.slice(i + 1)))) out.push([x].concat(p)); }); return out; }
// Better = wins the race (or by more), then removes more, then loses less, then keeps more cards.
function coachBetter(a, b) {
  const key = (s) => [s.illegal === 0 ? 1 : 0, s.winner === 0 ? 1 : 0, Math.min(s.margin, 30), s.comboOpen ? 0 : 1, s.removed - s.lost, s.lore, s.liveHand];
  const ka = key(a), kb = key(b); for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] > kb[i]; return false;
}
function coachBest(start, steps, me) {
  let best = null; let tried = 0; const all = [];
  const inkables = new Set();
  for (const c of start.players[me || 0].hand) if (M[c.id].ink) inkables.add(c.id);
  for (const c of start.players[me || 0].deck.slice(0, 3)) if (M[c.id].ink) inkables.add(c.id);
  for (const order of permutations(steps)) for (const ink of inkables) {
    const run = coachRun(start, order, ink, me); const sc = coachScore(start, run, me); tried++;
    if (sc.illegal) continue;
    const flags = coachFlags(start, order, run, me).filter(f => f.rule !== 'float');
    const cand = { order: order.map(s => s.key), ink, score: sc, flags: flags.length };
    if (!best || coachBetter(sc, best.score) || (!coachBetter(best.score, sc) && cand.flags < best.flags)) best = cand;
    all.push(cand);
  }
  const same = all.filter(c => !coachBetter(best.score, c.score) && !coachBetter(c.score, best.score)).length;
  const legal = all.length;
  return { best, tried, legal, same };
}
