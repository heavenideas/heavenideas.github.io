
// ===================================================================
// POSITIONS — any turn of the scripted game as a fresh, playable state.
// ===================================================================
let GAME = null;
function game() { return GAME || (GAME = buildGame()); }
function fromSnap(s) { return { turn: s.turn, active: s.active, seq: 9000, players: JSON.parse(JSON.stringify(s.players)), events: [], log: [], pending: null }; }
// The Madrigals' real future draws, so the sandbox's Dumbo / Demona draws match the game.
const MADR_FUTURE = ['Gaston', 'Luisa', 'Isis', 'Alma', 'Willow', 'Sven', 'Agustin', 'Tigger', 'Agustin', 'Hamm'];
function position(turn) {
  const s = game().snaps.find(x => x.turn === turn); if (!s) return null;
  const g = fromSnap(s.start);
  if (turn === 13) g.players[0].deck = MADR_FUTURE.map(k => inst(g, 0, ID[k]));
  return g;
}
function scenario() { return position(13); }
