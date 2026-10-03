// ===================================================================
// DOJO LAB ENGINE — core: card models, odds, RNG, Mulligan Lab
// Pure functions over LorcanaJSON data. No DOM. The same functions
// would run inside practice_dojo.html against App.cardDB.
// ===================================================================

const M = {};               // id -> card model (classify.js)
for (const c of RAW.cards) M[c.id] = model(c);
const DECKS = {
  A: { key: 'A', name: 'Emerald-Amethyst Phillip', short: 'Phillip', inks: ['amethyst', 'emerald'], list: RAW.decks.A },
  B: { key: 'B', name: 'Amber-Amethyst Madrigals', short: 'Madrigals', inks: ['amber', 'amethyst'], list: RAW.decks.B }
};
const INK_OKLCH = { amber: 'oklch(0.79 0.145 78)', amethyst: 'oklch(0.70 0.155 305)', emerald: 'oklch(0.74 0.135 158)', ruby: 'oklch(0.68 0.175 22)', sapphire: 'oklch(0.72 0.125 245)', steel: 'oklch(0.78 0.028 250)' };

// Short names used by the scripted game and scenarios.
const SHORT = {
  Luisa: 'Luisa Madrigal - Pushing Through', Agustin: 'Agustin Madrigal - Exceptionally Kind', Alma: 'Alma Madrigal - Leading the Way',
  Hamm: 'Hamm - Piggy Bank', Dumbo: 'Dumbo - Ninth Wonder of the Universe', Demona: 'Demona - Scourge of the Wyvern Clan',
  Gaston: 'Gaston - Superior Archer', Isis: 'Isis Vanderchill - Ice Queen of St. Canard', Willow: 'Grandmother Willow - Ancient Advisor',
  Cheshire: 'Cheshire Cat - Inexplicable', Tigger: 'Tigger - Bouncing All the Way', Ursula: 'Ursula - Whisper of Vanessa',
  Horseman: 'The Horseman Strikes!', Storm: 'Raging Storm', Besties: 'Besties, Assemble!', Lantern: 'Lantern',
  Hades: 'Hades - Looking for a Deal', JWG: 'Junior Woodchuck Guidebook', Sven: 'Sven - Leaping Reindeer',
  Aladdin: 'Aladdin - Doing His Part', AG: 'Aladdin & Genie - Mischievous Pals', Silver: 'John Silver - Alien Pirate',
  Lenny: 'Lenny - Toy Binoculars', Lyle: 'Lyle Tiberius Rourke - Adventurer for Hire', MMS: 'Malicious, Mean, and Scary',
  Milo: 'Milo Thatch - Getting His Hands Dirty', Piercing: 'Piercing Attack', Phillip: 'Prince Phillip - Vanquisher of Foes',
  Rafiki: 'Rafiki - Mystical Fighter', RED: 'Retro Evolution Device', Star: 'Second Star to the Right',
  Huntsman: "The Huntsman - On the Queen's Orders", Wither: 'To Wither a Flower', Tod: 'Tod - Clever Fox', Sea: 'Under the Sea'
};
const ID = {};
for (const k in SHORT) { const c = RAW.cards.find(x => x.fullName === SHORT[k]); if (!c) throw new Error('missing ' + k); ID[k] = c.id; }

function deckIds(key) { const out = []; for (const [id, n] of DECKS[key].list) for (let i = 0; i < n; i++) out.push(id); return out; }
function face(id) {
  const m = M[id]; if (!m) return { name: 'Unknown card', version: '', cost: '?', ink: true, strip: 'var(--border)' };
  const inks = m.colors.map(c => INK_OKLCH[c]).filter(Boolean);
  return {
    id, name: m.name, version: m.version, full: m.full, cost: m.cost, ink: m.ink, type: m.type, song: m.song,
    str: m.str, wp: m.wp, lore: m.lore, hasStats: m.str != null || m.wp != null,
    strip: inks.length > 1 ? `linear-gradient(${inks[0]} 0 50%, ${inks[1]} 50% 100%)` : (inks[0] || 'var(--border)'),
    tint: inks[0] || 'var(--surface-3)', kw: Object.keys(m.kw).map(k => m.kw[k] === true ? cap(k) : `${cap(k)} ${m.kw[k]}`).join(' · ')
  };
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------- odds ----------
function lnC(n, k) { if (k < 0 || k > n) return -Infinity; let s = 0; for (let i = 1; i <= k; i++) s += Math.log((n - k + i) / i); return s; }
// P(at least one of K successes in n draws from N) — same formula as App.hypergeoAtLeastOne.
function pAtLeastOne(K, N, n) { if (K <= 0 || n <= 0 || N <= 0) return 0; if (n > N) n = N; if (N - K < n) return 1; return 1 - Math.exp(lnC(N - K, n) - lnC(N, n)); }
// P(at least one of A AND at least one of B) — two distinct card groups, inclusion–exclusion.
function pBoth(KA, KB, N, n) {
  if (KA <= 0 || KB <= 0) return 0; if (n > N) n = N;
  const none = (K) => (N - K < n) ? 0 : Math.exp(lnC(N - K, n) - lnC(N, n));
  return Math.max(0, 1 - none(KA) - none(KB) + none(KA + KB));
}

// ---------- RNG ----------
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffleInPlace(arr, r) { for (let i = arr.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }

// ===================================================================
// MULLIGAN LAB
// Every way to mulligan the 7 (2^7 = 128 throw sets, deduplicated by
// the multiset of cards thrown) is played forward from the same seeds
// through turns 1–4 with a fixed, simple policy, so the comparison is
// paired and fair. What is measured is what the chapter says matters:
// can you spend your ink on turns 1–4, and do you see your plan card.
// ===================================================================
const MULL_TURNS = 4;

function mullCardInfo(id) {
  const m = M[id];
  return {
    id, cost: m.cost, ink: m.ink, isChar: m.type === 'Character', isItem: m.type === 'Item', song: m.song,
    reducer: m.reducer ? (m.reducer.exert ? (m.type === 'Item' ? 'item' : 'exert') : 'static') : null,
    shift: m.kw.shift || 0, shiftBase: m.shiftBase, name: m.name,
    singCost: m.type === 'Character' ? Math.max(m.cost, m.kw.singer || 0) : 0
  };
}

// Best play set this turn: maximise printed cost deployed with `cap` ink,
// `disc` one-ink discounts that only apply to characters. Bitset subset-sum
// per "characters used" layer, with backtracking so we know what left hand.
function bestSpend(cards, cap, disc, board) {
  const n = cards.length; const D = Math.min(disc, 3);
  const layers = [];               // layers[i][k] = bitmask of reachable printed sums after i items with k discounted chars
  let cur = new Array(D + 1).fill(0); cur[0] = 1;
  const costs = new Array(n), vals = new Array(n), isC = new Array(n), ok = new Array(n);
  for (let i = 0; i < n; i++) {
    const c = cards[i];
    let cost = c.cost;
    if (c.shift && board.some(b => c.shiftBase && c.shiftBase.includes(b.name))) cost = Math.min(cost, c.shift);
    costs[i] = cost; vals[i] = c.cost; isC[i] = c.isChar ? 1 : 0;
    ok[i] = !c.song && cost - (c.isChar && D > 0 ? 1 : 0) <= cap; // songs are sung, not paid for
  }
  for (let i = 0; i < n; i++) {
    layers.push(cur.slice());
    if (!ok[i]) continue;
    const nxt = cur.slice();
    for (let k = 0; k <= D; k++) {
      if (!cur[k]) continue;
      const k2 = Math.min(D, k + isC[i]);
      nxt[k2] |= (cur[k] << costs[i]) & 0x7fffffff;
    }
    cur = nxt;
  }
  // pick best (sum, k) with sum - k <= cap, using the PAID cost (shift cost when shifting); value = printed cost
  let best = -1, bk = 0, bs = 0;
  for (let k = 0; k <= D; k++) for (let s = 0; s <= 30; s++) if ((cur[k] >> s) & 1) { const paid = s - k; if (paid <= cap && paid >= 0 && s > best) { best = s; bk = k; bs = s; } }
  if (best <= 0) return { paid: 0, value: 0, played: [] };
  // backtrack
  const played = []; let k = bk, s = bs;
  for (let i = n - 1; i >= 0; i--) {
    const prev = layers[i];
    if ((prev[k] >> s) & 1) continue;            // reachable without item i
    // item i was used: find predecessor k'
    let found = false;
    for (let kp = 0; kp <= D && !found; kp++) {
      if (Math.min(D, kp + isC[i]) !== k) continue;
      if (s - costs[i] >= 0 && ((prev[kp] >> (s - costs[i])) & 1)) { played.push(i); s -= costs[i]; k = kp; found = true; }
    }
    if (!found) break;
  }
  let value = 0; for (const i of played) value += vals[i];
  return { paid: bs - bk, value, played };
}

function simulateHand(hand, library, opts, r, out) {
  // hand, library: arrays of card info objects (library already shuffled)
  const board = []; let well = 0; let li = 0; let total = 0; let missed = false; const H = hand.slice();
  const plan = opts.planId; let sawPlan = plan != null && H.some(c => c.id === plan);
  for (let t = 1; t <= MULL_TURNS; t++) {
    if (!(opts.onPlay && t === 1)) { const d = library[li++]; if (d) { H.push(d); if (d.id === plan) sawPlan = true; } }
    if (plan != null && t === opts.planTurn) out.plan += sawPlan ? 1 : 0;
    const disc = board.filter(b => b.reducer === 'static' || b.reducer === 'item' || (b.reducer === 'exert' && b.turn < t)).length;
    // ink step: pick the ink card that leaves the best play
    // the plan card is never inked while anything else can be ("will I regret losing access to this card?")
    let inkables = []; for (let i = 0; i < H.length; i++) if (H[i].ink) inkables.push(i);
    if (plan != null && inkables.some(i => H[i].id !== plan)) inkables = inkables.filter(i => H[i].id !== plan);
    let inkIdx = -1;
    if (inkables.length) {
      const all = bestSpend(H, well + 1, disc, board);
      const inPlay = new Set(all.played);
      let cand = inkables.filter(i => !inPlay.has(i));
      if (cand.length) {
        // keep cards you can cast in the next two turns; ink the rest, priciest first
        const soon = (c) => c.cost <= well + 3;
        cand.sort((a, b) => (soon(H[a]) - soon(H[b])) || (H[b].cost - H[a].cost));
        inkIdx = cand[0];
      } else {
        let bestV = -1;
        for (const i of inkables) { const rest = H.filter((_, j) => j !== i); const v = bestSpend(rest, well + 1, disc, board).value; if (v > bestV || (v === bestV && H[i].cost > H[inkIdx].cost)) { bestV = v; inkIdx = i; } }
      }
    }
    if (inkIdx >= 0) { H.splice(inkIdx, 1); well++; } else out.missInk[t - 1]++;
    const res = bestSpend(H, well, disc, board);
    let turnValue = res.value;
    const playedSet = new Set(res.played);
    const kept = [];
    for (let i = 0; i < H.length; i++) { if (playedSet.has(i)) { if (H[i].isChar || H[i].isItem) board.push({ ...H[i], turn: t }); } else kept.push(H[i]); }
    // songs: a dry character (on board before this turn) with enough cost sings one song each
    const singers = board.filter(b => b.isChar && b.turn < t).map(b => b.singCost).sort((a, b) => b - a);
    const rem = [];
    for (const c of kept) { if (c.song) { const si = singers.findIndex(s => s >= c.cost); if (si >= 0) { singers.splice(si, 1); turnValue += c.cost; continue; } } rem.push(c); }
    H.length = 0; H.push(...rem);
    total += turnValue;
    if (turnValue > 0) out.played[t - 1]++;
    if (res.paid >= well) out.full[t - 1]++;
    if (inkIdx < 0) missed = true;
  }
  // plan card later than turn 4: keep drawing (no plays) until that turn
  for (let t = MULL_TURNS + 1; plan != null && t <= opts.planTurn; t++) { const d = library[li++]; if (d && d.id === plan) sawPlan = true; if (t === opts.planTurn) out.plan += sawPlan ? 1 : 0; }
  if (missed) out.missAny++;
  out.value += total; out.values.push(total); out.raw.push(total);
}

// Evaluate all mulligans of `handIds` for deck `deckKey`.
// opts: { onPlay, planId, planTurn, sims, seed }. Returns options sorted by mean value.
// mulliganJob runs it in slices (step(k) simulates k more options) so a page can show progress.
function mulliganJob(deckKey, handIds, opts) {
  const sims = opts.sims || 600; const seed = opts.seed || 1;
  const lib0 = deckIds(deckKey);
  for (const id of handIds) { const i = lib0.indexOf(id); if (i >= 0) lib0.splice(i, 1); }
  const infoCache = {}; const info = (id) => infoCache[id] || (infoCache[id] = mullCardInfo(id));
  const groups = new Map();
  for (let mask = 0; mask < 128; mask++) {
    const thrown = []; const kept = [];
    for (let i = 0; i < 7; i++) ((mask >> i) & 1 ? thrown : kept).push(handIds[i]);
    const key = thrown.slice().sort((a, b) => a - b).join(',');
    if (!groups.has(key)) groups.set(key, { mask, thrown, kept, key });
  }
  const list = [...groups.values()]; const results = []; let next = 0;
  const job = {
    total: list.length, done: 0, results: null,
    step(k) {
      for (let c = 0; c < k && next < list.length; c++, next++) {
        const g = list[next];
        const out = { value: 0, values: [], raw: [], plan: 0, missInk: [0, 0, 0, 0], missAny: 0, played: [0, 0, 0, 0], full: [0, 0, 0, 0] };
        const r = rng(seed); // same seed stream for every option → paired comparison
        for (let s = 0; s < sims; s++) {
          const lib = shuffleInPlace(lib0.slice(), r);
          // Lorcana mulligan: thrown cards go to the bottom, replacements come off the top,
          // then the deck is shuffled (so thrown copies CAN come back on later draws).
          const redraw = lib.slice(0, g.thrown.length);
          const rest = lib.slice(g.thrown.length).concat(g.thrown);
          shuffleInPlace(rest, r);
          simulateHand(g.kept.concat(redraw).map(info), rest.map(info), opts, r, out);
        }
        const sorted = out.values.slice().sort((a, b) => a - b);
        results.push({ mask: g.mask, key: g.key, thrown: g.thrown, kept: g.kept, mean: out.value / sims, raw: out.raw,
          p10: sorted[Math.floor(sims * 0.1)], p50: sorted[Math.floor(sims * 0.5)], plan: opts.planId != null ? out.plan / sims : null,
          played: out.played.map(x => x / sims), full: out.full.map(x => x / sims), missInkByTurn: out.missInk.map(x => x / sims), missAny: out.missAny / sims, sims });
      }
      job.done = next;
      if (next >= list.length && !job.results) job.results = finishMulligan(results);
      return job;
    }
  };
  return job;
}
function finishMulligan(results) {
  results.sort((a, b) => b.mean - a.mean);
  // Same seeds for every option, so compare per simulated game (paired):
  // an option is "tied with the best" when the gap is inside 2 standard errors.
  const best = results[0];
  results.forEach((x, i) => {
    x.rank = i + 1;
    let sd = 0, md = 0; const n = x.raw.length;
    for (let s = 0; s < n; s++) md += best.raw[s] - x.raw[s];
    md /= n;
    for (let s = 0; s < n; s++) { const d = best.raw[s] - x.raw[s] - md; sd += d * d; }
    const se = Math.sqrt(sd / Math.max(1, n - 1) / n);
    x.gap = md; x.se = se; x.tied = i === 0 || md <= 2 * se + 1e-9;
  });
  results.forEach(x => { delete x.raw; });
  return results;
}
function mulliganOptions(deckKey, handIds, opts) { const j = mulliganJob(deckKey, handIds, opts); while (!j.results) j.step(200); return j.results; }

function dealHand(deckKey, seed) { const r = rng(seed); return shuffleInPlace(deckIds(deckKey), r).slice(0, 7); }
