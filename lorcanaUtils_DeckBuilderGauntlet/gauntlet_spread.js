/**
 * Deck Builder Gauntlet — spread, scoring and coverage contract (Phase 4)
 *
 * Takes one decklist plus N opponent decklists and produces the readable artifact: a
 * favorability read per opponent, per-threat out-counting, weak spots by name, and the
 * coverage block without which no spread may render.
 *
 * Two hard invariants, both enforced here rather than left to the UI:
 *   - join_fixture_status FAIL renders NO spread. A coverage number from an unvalidated join
 *     is worse than none, because it is trusted.
 *   - 100% coverage with an empty exclusion list is a FAILURE STATE, not a clean bill of health.
 *
 * Depends on gauntlet_resolver.js and gauntlet_draw.js.
 */
(function (root) {
  "use strict";

  var R = typeof require !== "undefined" ? require("./gauntlet_resolver.js") : root.GauntletResolver;
  var D = typeof require !== "undefined" ? require("./gauntlet_draw.js") : root.GauntletDraw;

  // ------------------------------------------------------------------ weights
  //
  // Every constant the score uses lives here, each with the one sentence that justifies it.
  // The plan forbids any weighting constant that cannot be explained in one sentence, and
  // requires every contribution to be inspectable — so these are data, rendered on screen,
  // not literals buried in an expression.

  var PERMANENCE = {
    banish: { weight: 1.0, why: "The card leaves play permanently and cannot come back on its own." },
    "shuffle-into-deck": { weight: 1.0, why: "The card leaves play and is buried at random depth." },
    "put-into-inkwell": { weight: 1.0, why: "The card leaves play permanently, though it does give them ink." },
    "put-on-bottom": { weight: 0.5, why: "The card leaves play but they keep it and will redraw it eventually." },
    "return-to-hand": { weight: 0.4, why: "This buys a turn and their tempo, not the card — they can simply replay it." },
    "deal-damage": { weight: 1.0, why: "Lethal damage banishes the character outright." },
    challenge: { weight: 0.7, why: "It removes the threat permanently but exerts your character and risks losing it." },
  };

  var CLASS_TRUST = {
    existence: { weight: 1.0, why: "The catalog states this declaratively; the runtime modifier stack cannot change it." },
    magnitude: { weight: 0.6, why: "This reads the stat stack, which conditional modifiers can alter at runtime." },
  };

  var CONFIDENCE_TRUST = {
    engine: { weight: 1.0, why: "The engine record for this card is load-bearing — no fidelity flag fired." },
    redux: { weight: 0.7, why: "The engine record is flagged; the cross-check lane recognised the text but the two are not the same evidence." },
    blind: { weight: 0.3, why: "Both lanes failed on this card. It is named in the exclusion list and barely counted." },
  };

  function weightTable() {
    return { permanence: PERMANENCE, verdictClass: CLASS_TRUST, confidence: CONFIDENCE_TRUST };
  }

  // ------------------------------------------------------------------ decklist parsing

  /**
   * Parses "4 Elsa - Snow Queen" style lines.
   *
   * Unlike `matchup_analyzer.html`:1304, a line that does not resolve to a card is NOT dropped
   * silently — it is returned in `unresolved[]` and surfaced. A tool whose entire premise is
   * naming what it cannot vouch for must not begin by quietly discarding input.
   */
  function parseDecklist(text, index) {
    var lines = String(text || "").split("\n");
    var entries = [];
    var unresolved = [];
    var total = 0;

    lines.forEach(function (raw, i) {
      var line = raw.trim();
      if (!line || /^#/.test(line)) return;
      var m = line.match(/^(\d+)\s*[xX]?\s+(.+?)\s*(?:\([A-Z0-9]{1,4}\)\s*)?$/);
      if (!m) {
        unresolved.push({ line: i + 1, text: line, reason: "not in '<count> <card name>' form" });
        return;
      }
      var count = parseInt(m[1], 10);
      var name = m[2].trim();
      var card = index.byFullName.get(normaliseName(name)) || index.byName.get(normaliseName(name));
      if (!card) {
        unresolved.push({ line: i + 1, text: line, reason: "no card in the catalog matches \"" + name + "\"" });
        return;
      }
      entries.push({ card: card, count: count });
      total += count;
    });

    return { entries: entries, unresolved: unresolved, totalCards: total };
  }

  /**
   * Decklist text does not arrive clean. Exports use a curly apostrophe in "At Wits' End", an
   * en dash instead of a hyphen between name and version, and inconsistent spacing. Matching on
   * the raw string loses real cards and reports them as unknown, which is worse than useless —
   * it blames the user's list for the tool's parsing.
   */
  function normaliseName(s) {
    return String(s)
      .replace(/[‘’ʼ]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, "-")
      .replace(/\s*-\s*/g, " - ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  /** Index built once from gauntlet-cards.json. Mainline printings win over alternate art. */
  function buildIndex(cards) {
    var byFullName = new Map();
    var byName = new Map();
    var byKey = new Map();
    var byCanonical = new Map();
    cards.forEach(function (c) {
      byKey.set(c.key, c);
      var fn = normaliseName(c.fullName || c.name);
      if (!byFullName.has(fn) || rankPrinting(c) < rankPrinting(byFullName.get(fn))) byFullName.set(fn, c);
      var n = normaliseName(c.name);
      if (!byName.has(n)) byName.set(n, c);
      if (!byCanonical.has(c.canonicalId)) byCanonical.set(c.canonicalId, c);
    });
    return { byFullName: byFullName, byName: byName, byKey: byKey, byCanonical: byCanonical, all: cards };
  }

  function rankPrinting(c) {
    var r = String(c.rarity || "");
    if (r === "enchanted" || r === "epic" || r === "iconic" || r === "promo" || r === "special") return 2;
    return 1;
  }

  // ------------------------------------------------------------------ per-threat analysis

  /**
   * For one threat, how many copies in my deck answer it, by what mechanism, and when.
   * The out count is in COPIES, not distinct cards — four copies of one removal spell is four
   * outs to the draw model, and conflating the two silently quarters every probability.
   */
  function analyseThreat(myDeck, threat, opposingBoard, deckStats) {
    var outs = [];
    var inspected = 0;

    myDeck.entries.forEach(function (entry) {
      inspected++;
      var v = R.resolveInteraction(entry.card, threat, { opposingBoard: opposingBoard });
      if (!v.answers) return;
      var mech = mechanismKey(v);
      var perm = PERMANENCE[mech] || PERMANENCE.challenge;
      outs.push({
        card: entry.card,
        copies: entry.count,
        verdict: v,
        mechanismKey: mech,
        permanence: perm.weight,
        classTrust: CLASS_TRUST[v.verdictClass] ? CLASS_TRUST[v.verdictClass].weight : 0.5,
        confidenceTrust: CONFIDENCE_TRUST[v.confidence] ? CONFIDENCE_TRUST[v.confidence].weight : 0.3,
      });
    });

    var copies = outs.reduce(function (n, o) { return n + o.copies; }, 0);
    var cheapest = outs.length ? Math.min.apply(null, outs.map(function (o) { return o.card.cost; })) : 0;

    var draw = copies > 0
      ? D.analyzeOuts({
          deckSize: deckStats.totalCards,
          outs: copies,
          cost: cheapest,
          inkableCount: deckStats.inkableCount,
          onThePlay: deckStats.onThePlay !== false,
        })
      : null;

    // Weighted answer strength. Every factor is one of the named weights above, so a cell can
    // always be expanded into the sentence that produced it.
    var strength = 0;
    var contributions = [];
    outs.forEach(function (o) {
      var pAvailable = draw ? draw.pByEarliestTurn : 0;
      var share = (o.copies / Math.max(1, copies));
      var value = o.permanence * o.classTrust * o.confidenceTrust * share * pAvailable;
      strength += value;
      contributions.push({
        card: o.card.fullName,
        copies: o.copies,
        mechanism: o.verdict.mechanism,
        permanence: o.permanence,
        classTrust: o.classTrust,
        confidenceTrust: o.confidenceTrust,
        shareOfOuts: +share.toFixed(3),
        pAvailableByEarliestTurn: +pAvailable.toFixed(3),
        value: +value.toFixed(4),
      });
    });

    var existenceOuts = outs.filter(function (o) { return o.verdict.verdictClass === "existence"; });
    var resolvedExistence = existenceOuts.filter(function (o) { return !o.verdict.unresolved; });

    return {
      threat: threat,
      cardsInspected: inspected,
      outCopies: copies,
      outCards: outs.length,
      cheapestOutCost: cheapest,
      draw: draw,
      strength: +strength.toFixed(4),
      contributions: contributions,
      hasExistenceOut: existenceOuts.length > 0,
      hasResolvedExistenceOut: resolvedExistence.length > 0,
      magnitudeOnly: outs.length > 0 && existenceOuts.length === 0,
      zeroOuts: outs.length === 0,
      unresolvedOuts: outs.filter(function (o) { return o.verdict.unresolved; }).length,
      sentence: copies === 0
        ? "no outs — nothing in your deck answers this"
        : draw.sentence,
    };
  }

  /**
   * The reason a threat is a weak spot, DERIVED from its verdicts rather than asserted.
   *
   * The first version hardcoded "you can answer it by challenging" for every magnitude-only
   * threat, which is plainly false for a threat answered by 39 copies of a damage spell whose
   * amount happens to be runtime-computed. The highest-value output of this tool is its weak-spot
   * list; a wrong sentence there is worse than no sentence.
   */
  function weakSpotReason(t) {
    if (t.zeroOuts) return "zero outs — nothing in your deck answers this";

    var mechs = {};
    t.contributions.forEach(function (k) {
      var m = /^Challenge/.test(k.mechanism) ? "challenge"
        : /runtime-computed/.test(k.mechanism) ? "damage of an amount that depends on board state"
        : k.mechanism.split("(")[0].trim();
      mechs[m] = (mechs[m] || 0) + k.copies;
    });
    var parts = Object.keys(mechs).map(function (m) { return mechs[m] + "x " + m; });

    var onlyChallenge = Object.keys(mechs).length === 1 && mechs.challenge;
    if (onlyChallenge) {
      return "magnitude-only — your only answer is challenging it, and whether that trade works " +
        "depends on modifiers the catalog cannot see";
    }
    return "magnitude-only — you have answers (" + parts.join(", ") + ") but none of them is one " +
      "the catalog can state outright, so the tool cannot vouch for any of them";
  }

  function mechanismKey(v) {
    var m = String(v.mechanism);
    if (/^Challenge/.test(m)) return "challenge";
    var found = null;
    Object.keys(PERMANENCE).forEach(function (k) {
      if (k !== "challenge" && m.indexOf(k) !== -1) found = k;
    });
    if (found) return found;
    if (/damage/i.test(m)) return "deal-damage";
    return "challenge";
  }

  // ------------------------------------------------------------------ coverage contract

  var KEYWORD_PATTERNS = {
    "Keyword: Ward": "Ward", "Keyword: Evasive": "Evasive", "Keyword: Resist": "Resist",
    "Keyword: Challenger": "Challenger", "Keyword: Bodyguard": "Bodyguard", "Keyword: Rush": "Rush",
    "Keyword: Reckless": "Reckless", "Keyword: Support": "Support", "Keyword: Singer": "Singer",
    "Keyword: Vanish": "Vanish", "Keyword: Shift (Normal)": "Shift",
  };

  /**
   * The lanes disagree when the redux pattern lane recognises a keyword in a card's text that
   * the engine record does not carry structurally. This is the tool's own error detector and is
   * never suppressed: it is the only signal that fires when both sources are present and one of
   * them is wrong.
   */
  function lanesDisagree(card) {
    // A card with no engine record has no engine lane to disagree WITH. Its abilities array is
    // empty by construction, so every keyword the redux lane reads would register as a conflict
    // and the tool's own error detector would fill up with 31 non-errors. These cards are
    // reported under no_engine_record instead, which is what they actually are.
    if ((card.fidelity || {}).no_engine_record) return [];
    var hits = (card.lanes && card.lanes.redux_patterns) || [];
    var out = [];
    hits.forEach(function (name) {
      var kw = KEYWORD_PATTERNS[name];
      if (!kw) return;
      // Structural coverage, not declaration. A card that GRANTS or FILTERS ON a keyword names
      // it in its text without having it, and the engine models that correctly — testing
      // `hasKeyword` alone reported 40 disagreements on this catalog, all of them false.
      if (!R.keywordCoveredStructurally(card, kw)) {
        out.push({ card: card.fullName, key: card.key, keyword: kw, pattern: name });
      }
    });
    return out;
  }

  function buildCoverage(catalogCoverage, cardsInPlay, deckReports) {
    var prov = catalogCoverage.provenance || {};
    var joinStatus = prov.join_fixture_status || "UNKNOWN";

    var silent = [], keywordBearing = [], partial = [], runtime = [], blind = [], disagree = [];
    var noEngineRecord = [];
    var rarityAll = {}, rarityUnresolved = {};

    cardsInPlay.forEach(function (c) {
      var f = c.fidelity || {};
      var rarity = c.rarity || "unknown";
      rarityAll[rarity] = (rarityAll[rarity] || 0) + 1;
      if (f.silent_stub) {
        silent.push(c.fullName + " (" + c.key + ")");
        var kws = (c.text || "").match(/\b(Ward|Evasive|Resist|Challenger|Bodyguard|Rush|Reckless|Support|Singer|Shift|Vanish)\b/g);
        if (kws) keywordBearing.push({ card: c.fullName + " (" + c.key + ")", keywords: Array.from(new Set(kws)) });
      }
      if (f.partial_stub) partial.push({ card: c.fullName + " (" + c.key + ")", reason: f.partial_stub_reason });
      if (f.runtime_dependent) runtime.push(c.fullName + " (" + c.key + ")");
      if (f.no_engine_record) {
        noEngineRecord.push({
          card: c.fullName + " (" + c.key + ")",
          set: c.set,
          keywordsKnown: (c.keywords || []).map(function (k) { return k.keyword + (k.value ? " +" + k.value : ""); }),
          reduxPatterns: ((c.lanes || {}).redux_patterns || []).slice(0, 5),
        });
      }
      if (!f.load_bearing) {
        rarityUnresolved[rarity] = (rarityUnresolved[rarity] || 0) + 1;
        if (c.lanes && c.lanes.double_blind) blind.push(c.fullName + " (" + c.key + ")");
      }
      disagree = disagree.concat(lanesDisagree(c));
    });

    var rarityWeighted = Object.keys(rarityUnresolved).map(function (r) {
      return { rarity: r, unresolved: rarityUnresolved[r], ofRarity: rarityAll[r],
               shareOfRarity: +((rarityUnresolved[r] / rarityAll[r]) * 100).toFixed(1) };
    }).sort(function (a, b) { return b.shareOfRarity - a.shareOfRarity; });

    var flagged = cardsInPlay.filter(function (c) { return !(c.fidelity || {}).load_bearing; }).length;
    var unresolvedPct = cardsInPlay.length ? (flagged / cardsInPlay.length) * 100 : 0;
    var worst = rarityWeighted.filter(function (r) { return r.ofRarity >= 3; })[0];

    var magnitudeUnresolved = 0, cells = 0;
    deckReports.forEach(function (rep) {
      rep.threats.forEach(function (t) {
        cells++;
        if (t.magnitudeOnly || t.unresolvedOuts > 0) magnitudeUnresolved++;
      });
    });

    var exclusions = silent.length + partial.length + blind.length + disagree.length + noEngineRecord.length;

    return {
      provenance: {
        engine_commit: prov.engine_commit,
        engine_commit_date: prov.engine_commit_date,
        engine_max_set: prov.engine_max_set,
        similcana_generated_on: prov.similcana_generated_on,
        similcana_max_set: prov.similcana_max_set,
        redux_pattern_count: prov.redux_pattern_count,
        redux_entries_total: prov.redux_entries_total,
        redux_last_modified: prov.redux_last_modified,
        join_fixture_status: joinStatus,
        stub_fixture_status: prov.stub_fixture_status,
        serializer_version: prov.serializer_version,
        generated_at: prov.generated_at,
      },
      presence: {
        cards_in_spread: cardsInPlay.length,
        unresolved_decklist_lines: deckReports.reduce(function (n, r) { return n + r.unresolvedLines.length; }, 0),
        unresolved_decklist_detail: deckReports.reduce(function (a, r) {
          return a.concat(r.unresolvedLines.map(function (u) { return r.label + " line " + u.line + ": " + u.text + " — " + u.reason; }));
        }, []),
      },
      correctness: {
        silent_stubs: silent,
        stubs_keyword_bearing: keywordBearing,
        partial_stubs: partial,
        runtime_dependent_count: runtime.length,
        runtime_dependent: runtime,
        rarity_weighted_unresolved: rarityWeighted,
        no_engine_record: noEngineRecord,
        no_engine_record_note:
          "These cards are newer than the engine catalog. Their keywords are known from similcana " +
          "so Ward, Evasive, Resist, Challenger and Bodyguard resolve correctly; their effects are " +
          "not readable, so the tool cannot tell whether they answer anything. Absence of an out " +
          "here means UNKNOWN, not NONE.",
        rarity_weighted_sentence: worst
          ? Math.round(unresolvedPct) + "% of the cards in this spread are unresolved — and that " +
            Math.round(unresolvedPct) + "% is " + worst.shareOfRarity + "% of your " + worst.rarity + "s."
          : Math.round(unresolvedPct) + "% of the cards in this spread are unresolved.",
      },
      resolution_ledger: {
        resolved_engine_full: cardsInPlay.length - flagged,
        flagged_total: flagged,
        lanes_disagree: disagree,
        double_blind: blind,
        magnitude_verdicts_unresolved: magnitudeUnresolved,
        matrix_cells: cells,
      },
      // ---- the two hard invariants ----
      renderable: joinStatus === "PASS",
      blockedReason: joinStatus === "PASS" ? null
        : "join_fixture_status is " + joinStatus + " — no spread renders. A coverage number from " +
          "an unvalidated join is worse than none, because it is trusted.",
      suspiciouslyClean: exclusions === 0 && cardsInPlay.length > 0,
      suspiciousReason: exclusions === 0 && cardsInPlay.length > 0
        ? "Every card in this spread reported perfect fidelity and the exclusion list is empty. " +
          "Across the full catalog roughly a quarter of cards carry a fidelity flag, so a spread " +
          "with none is far more likely to mean the fidelity data failed to load than that this " +
          "deck is uniquely clean. Treat this as a FAILURE STATE, not a clean bill of health."
        : null,
      exclusionCount: exclusions,
    };
  }

  // ------------------------------------------------------------------ the spread

  /**
   * @param {object} q
   * @param {string}   q.myDecklist
   * @param {Array}    q.opponents   [{ label, decklist }]
   * @param {Array}    q.cards       gauntlet-cards.json
   * @param {object}   q.coverage    gauntlet-coverage.json
   * @param {boolean} [q.onThePlay]
   */
  function buildSpread(q) {
    var index = buildIndex(q.cards);
    var mine = parseDecklist(q.myDecklist, index);
    var myStats = deckStats(mine, q.onThePlay);

    var reports = [];
    var cardsInPlay = new Map();
    mine.entries.forEach(function (e) { cardsInPlay.set(e.card.key, e.card); });

    (q.opponents || []).forEach(function (opp) {
      var theirs = parseDecklist(opp.decklist, index);
      theirs.entries.forEach(function (e) { cardsInPlay.set(e.card.key, e.card); });

      var board = theirs.entries
        .map(function (e) { return e.card; })
        .filter(function (c) { return c.cardType === "character"; });

      var threats = theirs.entries
        .filter(function (e) { return e.card.cardType === "character"; })
        .map(function (e) { return analyseThreat(mine, e.card, board, myStats); });

      // Their pressure on me, computed with the same machinery in the other direction, so the
      // favorability read is symmetric rather than a one-sided count dressed up as a matchup.
      var theirStats = deckStats(theirs, !(q.onThePlay !== false));
      var myThreats = mine.entries
        .filter(function (e) { return e.card.cardType === "character"; })
        .map(function (e) {
          return analyseThreat(theirs, e.card, mine.entries.map(function (x) { return x.card; })
            .filter(function (c) { return c.cardType === "character"; }), theirStats);
        });

      var myAnswerRate = averageStrength(threats);
      var theirAnswerRate = averageStrength(myThreats);
      var favorability = myAnswerRate - theirAnswerRate;

      reports.push({
        label: opp.label,
        totalCards: theirs.totalCards,
        unresolvedLines: theirs.unresolved,
        threats: threats,
        myThreatsUnderTheirAnswers: myThreats,
        score: {
          favorability: +favorability.toFixed(4),
          verdict: favorabilityWord(favorability),
          decomposition: [
            { name: "Your answers to their threats", value: +myAnswerRate.toFixed(4),
              how: "Mean weighted answer strength across each of their " + threats.length + " distinct characters." },
            { name: "Their answers to your threats", value: +theirAnswerRate.toFixed(4),
              how: "The same calculation run in the other direction across your " + myThreats.length + " distinct characters." },
            { name: "Favorability", value: +favorability.toFixed(4),
              how: "Your answer strength minus theirs. Positive means you out-answer them." },
          ],
        },
        weakSpots: threats
          .filter(function (t) { return t.zeroOuts || t.magnitudeOnly; })
          .sort(function (a, b) { return a.strength - b.strength; })
          .map(function (t) {
            return {
              card: t.threat.fullName + " (" + t.threat.key + ")",
              reason: weakSpotReason(t),
              stats: (t.threat.strength || "?") + "/" + (t.threat.willpower || "?"),
              keywords: (t.threat.keywords || []).map(function (k) { return k.keyword + (k.value ? " +" + k.value : ""); }),
              sentence: t.sentence,
            };
          }),
      });
    });

    var coverage = buildCoverage(
      q.coverage,
      Array.from(cardsInPlay.values()),
      [{ label: "your deck", unresolvedLines: mine.unresolved, threats: [] }].concat(reports)
    );

    // Ranking is an ordering of the scores, so the spread answers both readings of the open
    // question: ranked field for a gauntlet, independent reads for a spread. Both are present.
    var ranked = reports.slice().sort(function (a, b) { return b.score.favorability - a.score.favorability; })
      .map(function (r, i) { return { rank: i + 1, label: r.label, favorability: r.score.favorability, verdict: r.score.verdict }; });

    return {
      myDeck: { totalCards: mine.totalCards, distinct: mine.entries.length, unresolvedLines: mine.unresolved, stats: myStats },
      opponents: reports,
      ranking: ranked,
      coverage: coverage,
      weights: weightTable(),
      renderable: coverage.renderable,
    };
  }

  function deckStats(deck, onThePlay) {
    var inkable = 0, total = 0;
    deck.entries.forEach(function (e) {
      total += e.count;
      if (e.card.inkable) inkable += e.count;
    });
    return { totalCards: total, inkableCount: inkable, onThePlay: onThePlay !== false };
  }

  function averageStrength(threats) {
    if (!threats.length) return 0;
    return threats.reduce(function (s, t) { return s + t.strength; }, 0) / threats.length;
  }

  function favorabilityWord(f) {
    if (f >= 0.25) return "strongly favoured";
    if (f >= 0.08) return "favoured";
    if (f > -0.08) return "even";
    if (f > -0.25) return "unfavoured";
    return "strongly unfavoured";
  }

  var GauntletSpread = {
    buildSpread: buildSpread,
    parseDecklist: parseDecklist,
    normaliseName: normaliseName,
    buildIndex: buildIndex,
    analyseThreat: analyseThreat,
    buildCoverage: buildCoverage,
    lanesDisagree: lanesDisagree,
    weakSpotReason: weakSpotReason,
    weightTable: weightTable,
    deckStats: deckStats,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = GauntletSpread;
  else root.GauntletSpread = GauntletSpread;
})(typeof globalThis !== "undefined" ? globalThis : this);
