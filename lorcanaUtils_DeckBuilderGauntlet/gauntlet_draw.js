/**
 * Deck Builder Gauntlet — draw and sequencing model (Phase 3)
 *
 * Turns "6 outs" into "6 outs, first castable turn 4, 61% to have one by then".
 *
 * Two paths, deliberately:
 *   closed form  — exact and instant. Used whenever the question is "how many of these are in
 *                  the first N cards", which is every question that does not depend on mulligan
 *                  decisions. No sampling error, no seed, no sample count.
 *   Monte Carlo  — used only for the mulligan-dependent case, where the number of cards seen
 *                  depends on how many were bottomed. Seeded, so a spread reproduces exactly.
 *
 * Ported, not imported: the primitives this is built on live inside DOM-bound files
 * (`utilities/personal_deck_saver.js` runs inside a DOMContentLoaded closure,
 * `utilities/deck_shuffler.html` is inline script). Two deliberate changes were made in the port
 * and both are noted at their call sites — numeric stability, and a seeded RNG.
 */
(function (root) {
  "use strict";

  // ------------------------------------------------------------------ closed form

  /**
   * P(exactly zero successes when drawing n from N containing K successes).
   *
   * Computed as a running product of (N-K-i)/(N-i) rather than C(N-K,n)/C(N,n).
   *
   * The version in `deck_shuffler.html`:1856 builds each binomial coefficient directly. That is
   * correct for small hands but C(60,30) is ~1.18e17, past the 2^53 integer-exact limit of a
   * double, so the ratio silently loses precision on larger draw counts — exactly the deep-draw
   * turns this tool cares about. The product form never forms a large intermediate at all: every
   * factor is between 0 and 1.
   */
  function pZero(N, K, n) {
    if (K <= 0) return 1;
    if (n <= 0) return 1;
    if (n > N) n = N;
    if (K > N) return 0;
    if (n > N - K) return 0; // more cards drawn than there are non-successes
    var p = 1;
    for (var i = 0; i < n; i++) p *= (N - K - i) / (N - i);
    return p;
  }

  /** P(at least one of K outs among the first n cards). The common case. */
  function pAtLeastOne(N, K, n) {
    return 1 - pZero(N, K, n);
  }

  /** P(exactly x successes) — hypergeometric pmf, in log space to stay stable. */
  function pExactly(N, K, n, x) {
    if (x < 0 || x > K || x > n || n - x > N - K) return 0;
    return Math.exp(logChoose(K, x) + logChoose(N - K, n - x) - logChoose(N, n));
  }

  /** P(at least x successes among the first n cards). */
  function pAtLeast(N, K, n, x) {
    if (x <= 0) return 1;
    var total = 0;
    var top = Math.min(n, K);
    for (var i = x; i <= top; i++) total += pExactly(N, K, n, i);
    return Math.min(1, total);
  }

  var LOG_FACT = [0];
  function logFactorial(n) {
    for (var i = LOG_FACT.length; i <= n; i++) LOG_FACT[i] = LOG_FACT[i - 1] + Math.log(i);
    return LOG_FACT[n];
  }
  function logChoose(n, k) {
    if (k < 0 || k > n) return -Infinity;
    return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
  }

  // ------------------------------------------------------------------ turn structure

  /**
   * Cards seen by the START of your turn `turn`, before that turn's actions.
   *
   * Lorcana: both players open 7. The player going first SKIPS their first draw step
   * (Rule 4.2 / the standard first-turn draw rule), so on the play you are one card behind
   * on every turn. Getting this backwards inflates every probability by roughly one draw.
   */
  function cardsSeenByTurn(turn, onThePlay) {
    if (turn < 1) return 7;
    return onThePlay ? 7 + (turn - 1) : 7 + turn;
  }

  /**
   * Earliest turn a card of this cost can be played, ignoring draw luck.
   *
   * You may ink at most one card per turn, so `cost` ink is available on turn `cost` at the
   * earliest. This is a ceiling on optimism, not a prediction — whether you actually have that
   * many inkable cards is a separate question, answered by `pEnoughInkByTurn`.
   */
  function earliestCastableTurn(cost) {
    return Math.max(1, cost | 0);
  }

  /**
   * P(you have inked `cost` cards by turn `turn`) — you need at least `cost` inkable cards among
   * the cards seen by then, and one ink drop per turn means you also need turn >= cost.
   */
  function pEnoughInkByTurn(deckSize, inkableCount, cost, turn, onThePlay) {
    if (turn < cost) return 0;
    var seen = cardsSeenByTurn(turn, onThePlay);
    return pAtLeast(deckSize, inkableCount, seen, cost);
  }

  // ------------------------------------------------------------------ the headline call

  /**
   * The sentence the spread renders for one threat: how many outs, when the first one can
   * actually be cast, and how likely you are to hold one by then.
   *
   * @param {object} q
   * @param {number} q.deckSize        typically 60
   * @param {number} q.outs            copies in the deck that answer this threat
   * @param {number} q.cost            ink cost of the cheapest such out
   * @param {number} [q.inkableCount]  inkable cards in the deck, for the ink-availability read
   * @param {boolean} [q.onThePlay]    default true
   * @param {number} [q.horizon]       last turn to tabulate, default 10
   */
  function analyzeOuts(q) {
    var N = q.deckSize, K = q.outs, onThePlay = q.onThePlay !== false;
    var horizon = q.horizon || 10;
    var earliest = earliestCastableTurn(q.cost);

    var byTurn = [];
    for (var t = 1; t <= horizon; t++) {
      var seen = cardsSeenByTurn(t, onThePlay);
      var pHave = pAtLeastOne(N, K, seen);
      var pInk = q.inkableCount != null
        ? pEnoughInkByTurn(N, q.inkableCount, q.cost, t, onThePlay)
        : (t >= earliest ? 1 : 0);
      byTurn.push({
        turn: t,
        cardsSeen: seen,
        pHaveOut: pHave,
        pEnoughInk: pInk,
        // Held-and-castable treats the two as independent. They are not, strictly — both draw
        // from the same deck — but the correlation is weak at these densities and the alternative
        // is a joint distribution that cannot be explained in one sentence. Flagged, not hidden.
        pCastable: t < earliest ? 0 : pHave * pInk,
        approximation: t < earliest ? null : "pCastable assumes independence of out-drawn and ink-available",
      });
    }

    var atEarliest = byTurn[earliest - 1] || byTurn[byTurn.length - 1];
    return {
      outs: K,
      deckSize: N,
      onThePlay: onThePlay,
      earliestCastableTurn: earliest,
      pByEarliestTurn: atEarliest ? atEarliest.pHaveOut : 0,
      byTurn: byTurn,
      method: "closed-form-hypergeometric",
      sentence: K === 0
        ? "no outs"
        : K + (K === 1 ? " out" : " outs") + ", first castable turn " + earliest +
          ", " + Math.round((atEarliest ? atEarliest.pHaveOut : 0) * 100) + "% to have one by then" +
          (onThePlay ? " (on the play)" : " (on the draw)"),
    };
  }

  // ------------------------------------------------------------------ seeded RNG

  /**
   * mulberry32. The source shuffle (`personal_deck_saver.js`:349) calls Math.random(), which
   * cannot be reproduced. A spread that reports "61%" must produce 61% again from the same
   * inputs or the number is not checkable, so the port takes an explicit seed.
   */
  function makeRng(seed) {
    var a = (seed >>> 0) || 1;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Fisher-Yates, ported from `personal_deck_saver.js`:349 with the RNG made injectable. */
  function shuffle(deck, rng) {
    var out = deck.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var tmp = out[i]; out[i] = out[j]; out[j] = tmp;
    }
    return out;
  }

  /**
   * Mulligan heuristic, ported verbatim in behaviour from `personal_deck_saver.js`:358.
   *
   * Keeps at most the two CHEAPEST uninkable cards, then one inkable each at cost 1, 2 and 3,
   * and bottoms everything else. It is aggressive — a hand of five inkables costing 4 and up
   * keeps none of them — but it is the heuristic the rest of the toolset already models hands
   * with, and a second, different mulligan policy in a sibling tool would make the two disagree
   * for no stated reason. Accepts `inkable` (gauntlet records) or `inkwell` (similcana records).
   */
  function determineMulligan(hand) {
    var isInkable = function (c) { return c.inkable != null ? !!c.inkable : !!c.inkwell; };
    var toMulligan = [];
    var uninkables = hand.filter(function (c) { return !isInkable(c); });
    var inkables = hand.filter(isInkable);

    if (uninkables.length > 2) {
      uninkables.sort(function (a, b) { return b.cost - a.cost; });
      toMulligan = toMulligan.concat(uninkables.slice(0, uninkables.length - 2));
    }

    var sorted = inkables.slice().sort(function (a, b) { return a.cost - b.cost; });
    [1, 2, 3].forEach(function (cost) {
      var i = sorted.findIndex(function (c) { return c.cost === cost; });
      if (i !== -1) sorted.splice(i, 1);
    });
    toMulligan = toMulligan.concat(sorted);

    var indices = [];
    var pool = toMulligan.slice();
    hand.forEach(function (card, index) {
      var at = pool.indexOf(card);
      if (at > -1) { indices.push(index); pool.splice(at, 1); }
    });
    return indices;
  }

  /**
   * Monte Carlo path. Only needed when the mulligan matters — bottoming cards and redrawing
   * changes which cards are seen, which the closed form cannot express.
   *
   * @param {object} q
   * @param {Array}  q.deck        full deck list of card-like objects ({cost, inkable})
   * @param {Function} q.isOut     predicate marking a card as an answer
   * @param {number} q.turn        turn to evaluate at
   * @param {boolean} [q.onThePlay]
   * @param {number} [q.samples]   default 10000
   * @param {number} [q.seed]      default 20260821
   * @param {boolean} [q.mulligan] default true
   */
  function simulateOuts(q) {
    var samples = q.samples || 10000;
    var seed = q.seed != null ? q.seed : 20260821;
    var onThePlay = q.onThePlay !== false;
    var useMulligan = q.mulligan !== false;
    var rng = makeRng(seed);
    var drawsAfterOpener = cardsSeenByTurn(q.turn, onThePlay) - 7;
    var hits = 0;

    for (var s = 0; s < samples; s++) {
      var d = shuffle(q.deck, rng);
      var hand = d.slice(0, 7);
      var rest = d.slice(7);

      if (useMulligan) {
        var idx = determineMulligan(hand);
        var bottomed = idx.map(function (i) { return hand[i]; });
        var kept = hand.filter(function (_, i) { return idx.indexOf(i) === -1; });
        var replacements = rest.slice(0, idx.length);
        hand = kept.concat(replacements);
        // Bottomed cards go under the deck, so they are not seen again in any realistic horizon.
        rest = rest.slice(idx.length).concat(bottomed);
      }

      var seenCards = hand.concat(rest.slice(0, Math.max(0, drawsAfterOpener)));
      for (var c = 0; c < seenCards.length; c++) {
        if (q.isOut(seenCards[c])) { hits++; break; }
      }
    }

    var p = hits / samples;
    return {
      p: p,
      samples: samples,
      seed: seed,
      turn: q.turn,
      onThePlay: onThePlay,
      mulligan: useMulligan,
      method: "monte-carlo",
      // Standard error of a proportion, so a reader can tell signal from sampling noise.
      standardError: Math.sqrt((p * (1 - p)) / samples),
      reproducible: "same deck + seed + samples yields this number exactly",
    };
  }

  var GauntletDraw = {
    pZero: pZero,
    pAtLeastOne: pAtLeastOne,
    pAtLeast: pAtLeast,
    pExactly: pExactly,
    cardsSeenByTurn: cardsSeenByTurn,
    earliestCastableTurn: earliestCastableTurn,
    pEnoughInkByTurn: pEnoughInkByTurn,
    analyzeOuts: analyzeOuts,
    simulateOuts: simulateOuts,
    makeRng: makeRng,
    shuffle: shuffle,
    determineMulligan: determineMulligan,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = GauntletDraw;
  else root.GauntletDraw = GauntletDraw;
})(typeof globalThis !== "undefined" ? globalThis : this);
