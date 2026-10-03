
// ===================================================================
// VIEW HELPERS — flat objects for the artboards' templates.
// ===================================================================
const pct = (p) => p >= 0.995 ? '100%' : p < 0.005 ? '0%' : Math.round(p * 100) + '%';
function cardView(id, extra) {
  const f = face(id);
  return Object.assign({
    id, name: f.name, version: f.version, cost: f.cost, inkCls: f.ink ? 'ink' : 'noink', strip: f.strip, tint: f.tint,
    str: f.str == null ? '' : f.str, wp: f.wp == null ? '' : f.wp, lore: f.lore || 0, hasStats: !!f.hasStats, kw: f.kw, type: f.type,
    isChar: f.type === 'Character', style: `--strip: ${f.strip}; --tint: ${f.tint}`
  }, extra || {});
}
function instView(g, c) {
  const m = M[c.id];
  return cardView(c.id, {
    iid: c.iid, exerted: !!c.exerted, damage: c.damage || 0, hasDamage: (c.damage || 0) > 0, drying: m.type === 'Character' && !isDry(g, c),
    slotCls: (c.exerted ? 'slot ex' : 'slot') + (m.type === 'Character' && !isDry(g, c) ? ' dry' : '')
  });
}
function boardView(g, me) {
  const P = g.players[me], O = g.players[me ^ 1];
  return {
    me: { name: DECKS[P.key].short, lore: P.lore, ready: P.ready, well: P.well, hand: P.hand.map(c => instView(g, c)), field: P.field.map(c => instView(g, c)), deck: DECKS[P.key].name },
    op: { name: DECKS[O.key].short, lore: O.lore, ready: O.ready, well: O.well, handCount: O.hand.length, field: O.field.map(c => instView(g, c)), deck: DECKS[O.key].name }
  };
}
function lineSummary(g, me) {
  const rc = raceClock(Object.assign(clone(g), { active: me }), me);
  const tm = threatMap(g, me);
  const P = g.players[me], O = g.players[me ^ 1];
  const v = (arr) => arr.filter(c => M[c.id] && M[c.id].type !== 'Unknown').reduce((s, c) => s + M[c.id].cost, 0);
  return { lore: P.lore, oppLore: O.lore, finish: rc.finish, winner: rc.winner, margin: rc.margin, rate: rc.rate, board: v(P.field), oppBoard: v(O.field), hand: P.hand.length, atRisk: tm.mine.filter(x => x && x.pAny >= 0.5).length, risk: tm.mine.map(x => x ? { id: x.id, p: x.pAny } : null).filter(Boolean) };
}
