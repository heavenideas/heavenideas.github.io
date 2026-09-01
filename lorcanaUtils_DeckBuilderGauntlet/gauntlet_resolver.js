/**
 * Deck Builder Gauntlet — interaction resolver (Phase 2)
 *
 * resolveInteraction(a, b, opts) answers one question: does card `a` provide a legal,
 * useful answer to threat `b` — and by what mechanism, with what confidence.
 *
 * Every verdict is tagged with a class, and the distinction is the whole architecture:
 *
 *   existence — "does a answer b at all", decided by the declarative effect type and target
 *               selector. Dragon Fire banishes any character without Ward and never reads
 *               strength. The engine's serialized data is AUTHORITATIVE here.
 *   magnitude — "does my 3/3 win this challenge", which depends on the layered modifier stack
 *               the engine computes at runtime and serialization cannot reach. These verdicts
 *               are plausible and possibly wrong whenever a runtime_dependent card is involved.
 *
 * Consumes gauntlet-cards.json records. No framework, no bundler, no dependencies.
 */
(function (root) {
  "use strict";

  // ------------------------------------------------------------------ keywords

  var REMOVAL_EFFECTS = ["banish", "return-to-hand", "put-into-inkwell", "shuffle-into-deck", "put-on-bottom"];

  function keywordEntry(card, name) {
    var kws = (card && card.keywords) || [];
    for (var i = 0; i < kws.length; i++) {
      if (String(kws[i].keyword).toLowerCase() === String(name).toLowerCase()) return kws[i];
    }
    return null;
  }

  function hasKeyword(card, name) {
    return keywordEntry(card, name) !== null;
  }

  /** Challenger +N / Resist +N carry a numeric `value`; bare keywords do not. */
  function keywordValue(card, name) {
    var e = keywordEntry(card, name);
    if (!e) return 0;
    return typeof e.value === "number" ? e.value : 0;
  }

  /**
   * Structure-only projection of an ability tree: every `text` and `name` field dropped.
   * Those fields echo the printed card text, so searching the raw tree for a keyword would
   * report every card as covered — the ability's own description satisfies the search.
   */
  function structuralOnly(node) {
    if (Array.isArray(node)) return node.map(structuralOnly);
    if (node && typeof node === "object") {
      var out = {};
      Object.keys(node).forEach(function (k) {
        if (k === "text" || k === "name") return;
        out[k] = structuralOnly(node[k]);
      });
      return out;
    }
    return node;
  }

  /**
   * Is this keyword modelled ANYWHERE structural in the card's abilities — as a declared
   * keyword, a `gain-keyword` effect, a trigger filter, a target filter?
   *
   * Checking `hasKeyword` alone is the wrong test and produces a specific, seductive class of
   * false positive: Noi "gains Resist +1 and Ward" while you have an item, Alice's "your other
   * characters gain Support", Little John granting Resist to Bodyguard characters. None of those
   * cards HAS the keyword, all of them name it, and the engine models every one correctly. On
   * this catalog the naive test reports 40 disagreements and every sampled one is wrong.
   */
  function keywordCoveredStructurally(card, keyword) {
    if (hasKeyword(card, keyword)) return true;
    var hay = JSON.stringify(structuralOnly(card.abilities || [])).toLowerCase().replace(/\s+/g, "");
    return hay.indexOf(String(keyword).toLowerCase().replace(/\s+/g, "")) !== -1;
  }

  // ------------------------------------------------------------------ targets

  /**
   * The catalog uses TWO target representations and a resolver that knows only one of them
   * silently answers "no interaction" for every card using the other.
   *
   *   string constants  — "CHOSEN_CHARACTER", "ALL_CHARACTERS", "CHOSEN_OPPOSING_CHARACTER"
   *   structured object — { selector, owner, cardTypes, zones, count, filter }
   *
   * Both normalise to the same shape here.
   */
  var STRING_TARGETS = {
    CHOSEN_CHARACTER: { scope: "chosen", owner: "any", cardTypes: ["character"] },
    ANOTHER_CHOSEN_CHARACTER: { scope: "chosen", owner: "any", cardTypes: ["character"] },
    CHOSEN_OPPOSING_CHARACTER: { scope: "chosen", owner: "opponent", cardTypes: ["character"] },
    CHOSEN_CHARACTER_OF_YOURS: { scope: "chosen", owner: "you", cardTypes: ["character"] },
    YOUR_CHOSEN_CHARACTER: { scope: "chosen", owner: "you", cardTypes: ["character"] },
    ANOTHER_CHOSEN_CHARACTER_OF_YOURS: { scope: "chosen", owner: "you", cardTypes: ["character"] },
    CHOSEN_DAMAGED_CHARACTER: { scope: "chosen", owner: "any", cardTypes: ["character"], filters: [{ type: "damaged" }] },
    CHOSEN_OPPOSING_DAMAGED_CHARACTER: { scope: "chosen", owner: "opponent", cardTypes: ["character"], filters: [{ type: "damaged" }] },
    CHOSEN_DAMAGED_OPPOSING_CHARACTER: { scope: "chosen", owner: "opponent", cardTypes: ["character"], filters: [{ type: "damaged" }] },
    YOUR_CHOSEN_DAMAGED_CHARACTER: { scope: "chosen", owner: "you", cardTypes: ["character"], filters: [{ type: "damaged" }] },
    CHOSEN_EXERTED_CHARACTER: { scope: "chosen", owner: "any", cardTypes: ["character"], filters: [{ type: "exerted" }] },
    CHOSEN_OPPOSING_CHARACTER_3_STRENGTH_OR_LESS: {
      scope: "chosen", owner: "opponent", cardTypes: ["character"],
      filters: [{ type: "strength-comparison", operator: "lte", value: 3 }],
    },
    UP_TO_2_CHOSEN_CHARACTERS: { scope: "chosen", owner: "any", cardTypes: ["character"] },
    CHOSEN_CHARACTER_OR_LOCATION: { scope: "chosen", owner: "any", cardTypes: ["character", "location"] },
    CHOSEN_CHARACTER_ITEM_OR_LOCATION: { scope: "chosen", owner: "any", cardTypes: ["character", "item", "location"] },
    CHOSEN_ITEM: { scope: "chosen", owner: "any", cardTypes: ["item"] },
    CHOSEN_ITEM_OR_LOCATION: { scope: "chosen", owner: "any", cardTypes: ["item", "location"] },
    ALL_CHARACTERS: { scope: "all", owner: "any", cardTypes: ["character"] },
    ALL_OPPOSING_CHARACTERS: { scope: "all", owner: "opponent", cardTypes: ["character"] },
    OPPOSING_CHARACTERS: { scope: "all", owner: "opponent", cardTypes: ["character"] },
    ALL_OPPOSING_ITEMS: { scope: "all", owner: "opponent", cardTypes: ["item"] },
    ALL_OPPOSING_LOCATIONS: { scope: "all", owner: "opponent", cardTypes: ["location"] },
    YOUR_CHARACTERS: { scope: "all", owner: "you", cardTypes: ["character"] },
    YOUR_OTHER_CHARACTERS: { scope: "all", owner: "you", cardTypes: ["character"] },
    YOUR_EXERTED_CHARACTERS: { scope: "all", owner: "you", cardTypes: ["character"], filters: [{ type: "exerted" }] },
    SELF: { scope: "self", owner: "you", cardTypes: ["character"] },
    THIS_ITEM: { scope: "self", owner: "you", cardTypes: ["item"] },
  };

  /** Targets that address players, zones or triggers rather than a card on the board. */
  var NON_BOARD_TARGETS = {
    CONTROLLER: 1, OPPONENT: 1, OPPONENTS: 1, EACH_OPPONENT: 1, EACH_PLAYER: 1, ALL_PLAYERS: 1,
    CHOSEN_PLAYER: 1, CARD_OWNER: 1, CHALLENGING_PLAYER: 1, TRIGGER_SOURCE_OWNER: 1,
    TRIGGERING_CHARACTER: 1, CHARACTERS_HERE: 1, "previous-target": 1,
  };

  function normalizeTarget(t) {
    if (t == null) return null;
    if (typeof t === "string") {
      if (NON_BOARD_TARGETS[t]) return { scope: "non-board", owner: null, cardTypes: [], filters: [], raw: t };
      var known = STRING_TARGETS[t];
      if (known) {
        return {
          scope: known.scope, owner: known.owner, cardTypes: known.cardTypes.slice(),
          filters: (known.filters || []).slice(), raw: t,
        };
      }
      // A named target this resolver has not been taught. Treated as reaching a character
      // under an unknown constraint — never silently as "no interaction".
      var typed = /CHARACTER/.test(t) ? ["character"] : /ITEM/.test(t) ? ["item"] : /LOCATION/.test(t) ? ["location"] : [];
      return {
        scope: /^ALL|^YOUR|^OPPOSING/.test(t) ? "all" : "chosen",
        owner: /OPPOSING/.test(t) ? "opponent" : /YOUR/.test(t) ? "you" : "any",
        cardTypes: typed, filters: [{ type: "__unrecognised__", raw: t }], raw: t, unrecognised: true,
      };
    }
    if (typeof t === "object") {
      return {
        scope: t.selector === "all" ? "all" : t.selector === "self" ? "self" : t.selector === "chosen" ? "chosen" : "other",
        owner: t.owner || "any",
        cardTypes: (t.cardTypes || []).slice(),
        filters: (t.filter || t.filters || []).slice(),
        excludeSelf: t.excludeSelf === true,
        raw: t,
      };
    }
    return null;
  }

  function targetsOpponent(target) {
    return target.owner === "any" || target.owner === "opponent";
  }

  function targetsCardType(target, cardType) {
    if (!target.cardTypes || target.cardTypes.length === 0) return true; // untyped reaches anything
    return target.cardTypes.indexOf(cardType) !== -1;
  }

  // ------------------------------------------------------------------ filters

  /**
   * Static filter evaluation. Returns true, false, or "unknown".
   *
   * "unknown" is not a failure and must never collapse to false: it means the filter depends on
   * board state (damage taken, exerted, location) that a static catalog cannot see. A verdict
   * carrying an unknown filter is reported as conditional rather than asserted either way.
   */
  function evaluateFilter(filter, card) {
    if (!filter || typeof filter !== "object") return "unknown";
    var v;
    switch (filter.type) {
      case "has-classification":
        v = (card.classifications || []).map(function (c) { return String(c).toLowerCase(); });
        return v.indexOf(String(filter.classification).toLowerCase()) !== -1;
      case "has-name":
      case "named-card":
        return String(card.name).toLowerCase() === String(filter.name || filter.cardName).toLowerCase();
      case "has-keyword":
        return hasKeyword(card, filter.keyword);
      case "ink-type":
        v = (card.inkType || []).map(function (c) { return String(c).toLowerCase(); });
        return v.indexOf(String(filter.inkType || filter.ink).toLowerCase()) !== -1;
      case "cost-comparison":
        return compare(card.cost, filter.operator, filter.value);
      case "strength-comparison":
        return card.strength == null ? "unknown" : compare(card.strength, filter.operator, filter.value);
      case "attribute":
        return compare(card[filter.attribute], filter.operator, filter.value);
      case "not":
        v = evaluateFilter(filter.filter || filter.value, card);
        return v === "unknown" ? "unknown" : !v;
      case "or":
        var sawUnknown = false;
        var subs = filter.filters || filter.value || [];
        for (var i = 0; i < subs.length; i++) {
          var r = evaluateFilter(subs[i], card);
          if (r === true) return true;
          if (r === "unknown") sawUnknown = true;
        }
        return sawUnknown ? "unknown" : false;
      default:
        // damaged, exerted, ready, status, at-location, same-location-as-source,
        // challenge-role, challenged-this-turn, cards-under, under-parent, __unrecognised__
        return "unknown";
    }
  }

  function compare(actual, operator, value) {
    if (actual == null || value == null) return "unknown";
    switch (operator) {
      case "lte": case "lessThanOrEqual": return actual <= value;
      case "lt": case "lessThan": return actual < value;
      case "gte": case "greaterThanOrEqual": return actual >= value;
      case "gt": case "greaterThan": return actual > value;
      case "eq": case "equal": return actual === value;
      case "neq": return actual !== value;
      default: return "unknown";
    }
  }

  function evaluateFilters(filters, card) {
    var conditional = false;
    for (var i = 0; i < (filters || []).length; i++) {
      var r = evaluateFilter(filters[i], card);
      if (r === false) return { reaches: false, conditional: false };
      if (r === "unknown") conditional = true;
    }
    return { reaches: true, conditional: conditional };
  }

  // ------------------------------------------------------------------ effect walking

  /**
   * Collects every effect node in a card's ability tree, carrying down whether it sits under a
   * condition, an optional wrapper, or a cost. Those flags decide verdict class later.
   */
  function collectEffects(card) {
    var out = [];
    (card.abilities || []).forEach(function (ability) {
      var base = {
        abilityType: ability.type,
        abilityName: ability.name || null,
        conditional: ability.condition != null,
        activated: ability.type === "activated",
        triggered: ability.type === "triggered",
      };
      walk(ability, base);
    });
    return out;

    function walk(node, ctx) {
      if (node == null || typeof node !== "object") return;
      if (Array.isArray(node)) { node.forEach(function (n) { walk(n, ctx); }); return; }
      var next = ctx;
      if (node.condition != null && node !== undefined) next = assign(ctx, { conditional: true });
      if (node.type === "optional") next = assign(next, { optional: true });
      if (typeof node.type === "string" && (node.target !== undefined || node.amount !== undefined || node.destinations !== undefined)) {
        out.push(assign(next, { type: node.type, amount: node.amount, target: node.target, node: node }));
      }
      Object.keys(node).forEach(function (k) { if (k !== "text" && k !== "name") walk(node[k], next); });
    }
  }

  function assign(a, b) {
    var o = {};
    Object.keys(a).forEach(function (k) { o[k] = a[k]; });
    Object.keys(b).forEach(function (k) { o[k] = b[k]; });
    return o;
  }

  // ------------------------------------------------------------------ confidence

  /**
   * Confidence is a property of the DATA behind a verdict, not of the verdict's logic.
   * Both lanes are always reported; neither ever silently substitutes for the other.
   */
  function confidenceOf(card) {
    var f = (card && card.fidelity) || {};
    if (f.load_bearing) return "engine";
    var lanes = (card && card.lanes) || {};
    if (lanes.redux_patterns && lanes.redux_patterns.length > 0) return "redux";
    return "blind";
  }

  function lowerConfidence(x, y) {
    var rank = { engine: 2, redux: 1, blind: 0 };
    return rank[x] <= rank[y] ? x : y;
  }

  // ------------------------------------------------------------------ rules

  function verdict(fields) {
    return assign(
      { answers: false, verdictClass: null, mechanism: "", confidence: "engine", unresolved: false, notes: [] },
      fields
    );
  }

  /** Rule 1 + 2: removal that names a target, and removal that does not. */
  function removalVerdicts(a, b, effects) {
    var results = [];
    effects.forEach(function (e) {
      var isRemoval = REMOVAL_EFFECTS.indexOf(e.type) !== -1;
      if (!isRemoval) return;
      var target = normalizeTarget(e.target);
      if (!target || target.scope === "non-board" || target.scope === "self") return;
      if (!targetsOpponent(target)) return;
      if (!targetsCardType(target, b.cardType)) return;

      var f = evaluateFilters(target.filters, b);
      if (!f.reaches) return;

      var mass = target.scope === "all";
      var warded = hasKeyword(b, "Ward");
      var notes = [];

      // Ward stops opponents CHOOSING this character. Mass removal chooses nothing, so Ward
      // does not apply to it — the single most-missed interaction in the stats-only tool.
      if (!mass && warded) {
        results.push(verdict({
          answers: false,
          verdictClass: "existence",
          mechanism: "Ward blocks targeted " + e.type + " (" + (e.abilityName || e.abilityType) + ")",
          confidence: confidenceOf(a),
          notes: ["Ward prevents opponents choosing this character except to challenge"],
        }));
        return;
      }

      if (mass && warded) notes.push("Ward does not apply — mass removal chooses no target");
      if (f.conditional) notes.push("target carries a board-state filter this static resolver cannot evaluate");
      if (e.conditional) notes.push("effect sits under a condition (" + (e.abilityName || e.abilityType) + ")");
      if (e.optional) notes.push("effect is optional (\"you may\")");
      if (e.activated) notes.push("activated ability — requires its cost to be payable");
      if (target.unrecognised) notes.push("target constant not recognised by this resolver: " + target.raw);

      results.push(verdict({
        answers: true,
        verdictClass: "existence",
        mechanism: (mass ? "Mass " : "Targeted ") + e.type + " (" + (e.abilityName || e.abilityType) + ")",
        confidence: confidenceOf(a),
        unresolved: f.conditional || !!target.unrecognised,
        notes: notes,
      }));
    });
    return results;
  }

  /** Rule 3: damage-based removal, which is lethal or not depending on Resist. */
  function damageVerdicts(a, b, effects) {
    var results = [];
    if (b.willpower == null) return results;
    effects.forEach(function (e) {
      if (e.type !== "deal-damage") return;
      var target = normalizeTarget(e.target);
      if (!target || target.scope === "non-board" || target.scope === "self") return;
      if (!targetsOpponent(target)) return;
      if (!targetsCardType(target, b.cardType)) return;
      var f = evaluateFilters(target.filters, b);
      if (!f.reaches) return;

      var mass = target.scope === "all";
      if (!mass && hasKeyword(b, "Ward")) {
        results.push(verdict({
          answers: false, verdictClass: "existence",
          mechanism: "Ward blocks targeted damage (" + (e.abilityName || e.abilityType) + ")",
          confidence: confidenceOf(a),
        }));
        return;
      }

      // A dynamic amount ({type:"trigger-amount"}, counts of things in play) cannot be resolved
      // statically. It is reported as unresolved rather than guessed at.
      if (typeof e.amount !== "number") {
        results.push(verdict({
          answers: true, verdictClass: "magnitude", unresolved: true,
          mechanism: "Damage of a runtime-computed amount (" + (e.abilityName || e.abilityType) + ")",
          confidence: confidenceOf(a),
          notes: ["damage amount depends on board state and cannot be resolved from the catalog"],
        }));
        return;
      }

      var resist = keywordValue(b, "Resist");
      var effective = Math.max(0, e.amount - resist);
      var lethal = effective >= b.willpower;
      var notes = [];
      if (resist > 0) notes.push("Resist +" + resist + " reduces " + e.amount + " to " + effective);
      if (f.conditional) notes.push("target carries a board-state filter this static resolver cannot evaluate");
      if (e.conditional) notes.push("effect sits under a condition");

      // Unconditionally lethal damage with no modifier in play is an existence question:
      // it does not depend on the layered stat stack at all.
      var cls = resist > 0 || e.conditional || f.conditional || !bIsStatStable(b) ? "magnitude" : "existence";

      results.push(verdict({
        answers: lethal,
        verdictClass: cls,
        mechanism: e.amount + " damage vs " + b.willpower + " willpower" + (resist ? " (Resist +" + resist + ")" : ""),
        confidence: confidenceOf(a),
        unresolved: cls === "magnitude" && !bIsStatStable(b),
        notes: notes,
      }));
    });
    return results;
  }

  /** A threat whose own record is runtime-dependent can carry modifiers we cannot see. */
  function bIsStatStable(b) {
    return !((b.fidelity || {}).runtime_dependent);
  }

  /** Rule 4: challenge. Always a magnitude verdict — it reads the stat stack by definition. */
  function challengeVerdict(a, b, opts) {
    if (a.cardType !== "character" || b.cardType !== "character") return null;
    if (a.strength == null || b.willpower == null) return null;

    var notes = [];

    // Evasive: only characters with Evasive can challenge characters with Evasive.
    if (hasKeyword(b, "Evasive") && !hasKeyword(a, "Evasive")) {
      return verdict({
        answers: false, verdictClass: "existence",
        mechanism: "Evasive — only Evasive characters can challenge this",
        confidence: lowerConfidence(confidenceOf(a), confidenceOf(b)),
      });
    }

    // Bodyguard: a character with Bodyguard must be chosen as the target of a challenge if able,
    // so an untargetable threat hides behind one. This needs their board, not just the card.
    var board = (opts && opts.opposingBoard) || [];
    var guards = board.filter(function (c) {
      return c && c.key !== b.key && hasKeyword(c, "Bodyguard");
    });
    if (guards.length > 0) {
      return verdict({
        answers: false, verdictClass: "magnitude", unresolved: true,
        mechanism: "Bodyguard redirects the challenge to " + guards.map(function (g) { return g.fullName; }).join(", "),
        confidence: lowerConfidence(confidenceOf(a), confidenceOf(b)),
        notes: ["a challenge must choose the Bodyguard character while it is able to be chosen"],
      });
    }

    var challenger = keywordValue(a, "Challenger");
    var dealt = Math.max(0, a.strength + challenger - keywordValue(b, "Resist"));
    var taken = Math.max(0, (b.strength || 0) - keywordValue(a, "Resist"));
    var kills = dealt >= b.willpower;
    var dies = a.willpower != null && taken >= a.willpower;

    if (challenger > 0) notes.push("Challenger +" + challenger + " raises " + a.strength + " to " + (a.strength + challenger) + " while challenging");
    if (keywordValue(b, "Resist") > 0) notes.push("their Resist +" + keywordValue(b, "Resist") + " reduces the damage dealt");
    if (keywordValue(a, "Resist") > 0) notes.push("your Resist +" + keywordValue(a, "Resist") + " reduces the damage taken");
    if (kills && dies) notes.push("trade — both are banished");
    if (!bIsStatStable(b)) notes.push("their record is runtime_dependent; conditional modifiers may change this result");
    if ((a.fidelity || {}).runtime_dependent) notes.push("your record is runtime_dependent; conditional modifiers may change this result");

    return verdict({
      answers: kills,
      verdictClass: "magnitude",
      mechanism: "Challenge: " + (a.strength + challenger) + " strength vs " + b.willpower + " willpower" +
        (dies ? ", and you lose the character" : ""),
      confidence: lowerConfidence(confidenceOf(a), confidenceOf(b)),
      unresolved: !bIsStatStable(b) || !!(a.fidelity || {}).runtime_dependent,
      notes: notes,
      detail: { damageDealt: dealt, damageTaken: taken, kills: kills, dies: dies },
    });
  }

  // ------------------------------------------------------------------ entry point

  /**
   * @param {object} a  my card, a gauntlet-cards.json record
   * @param {object} b  their threat, a gauntlet-cards.json record
   * @param {object} [opts]  { opposingBoard: [records] } for Bodyguard redirection
   */
  function resolveInteraction(a, b, opts) {
    var effects = collectEffects(a);
    var candidates = []
      .concat(removalVerdicts(a, b, effects))
      .concat(damageVerdicts(a, b, effects));

    var ch = challengeVerdict(a, b, opts);
    if (ch) candidates.push(ch);

    // Rule 5: no interaction is recorded explicitly, never as an absence. A threat with zero
    // outs is the single most valuable output of this tool and must be a first-class verdict.
    if (candidates.length === 0) {
      // Critical distinction. A card with a full engine record and no matching effect genuinely
      // does not answer this threat. A card with NO engine record — set 13, newer than the engine
      // catalog — has no structured effects to read at all, so "no interaction" would be a
      // statement about our data rather than about the card. Reporting the two identically is
      // how a tool ends up confidently telling a player they have no outs when they do.
      var noRecord = (a.fidelity || {}).no_engine_record === true;
      if (noRecord) {
        return verdict({
          answers: false,
          verdictClass: null,
          unresolved: true,
          mechanism: "UNKNOWN — no engine record for this card (set " + a.set + " is newer than " +
            "the engine catalog). Its keywords are known from similcana; its effects are not readable.",
          confidence: confidenceOf(a),
          notes: ((a.lanes || {}).redux_patterns || []).length
            ? ["the cross-check lane recognises: " + a.lanes.redux_patterns.slice(0, 4).join(", ")]
            : ["neither lane can read this card's effects"],
          alternatives: [],
        });
      }
      return verdict({
        answers: false, verdictClass: "existence",
        mechanism: "No interaction — this card has no effect that reaches that threat",
        confidence: confidenceOf(a),
        alternatives: [],
      });
    }

    // Prefer an answer over a non-answer; among answers prefer existence over magnitude,
    // and resolved over unresolved. An existence-class answer is the strongest thing the
    // catalog can say.
    var order = candidates.slice().sort(function (x, y) {
      if (x.answers !== y.answers) return x.answers ? -1 : 1;
      if (x.unresolved !== y.unresolved) return x.unresolved ? 1 : -1;
      var rank = { existence: 0, magnitude: 1 };
      return (rank[x.verdictClass] || 9) - (rank[y.verdictClass] || 9);
    });

    var best = order[0];
    best.alternatives = order.slice(1);
    return best;
  }

  var GauntletResolver = {
    resolveInteraction: resolveInteraction,
    // exported for tests and for the spread UI
    hasKeyword: hasKeyword,
    keywordCoveredStructurally: keywordCoveredStructurally,
    keywordValue: keywordValue,
    normalizeTarget: normalizeTarget,
    collectEffects: collectEffects,
    evaluateFilter: evaluateFilter,
    confidenceOf: confidenceOf,
  };

  if (typeof module !== "undefined" && module.exports) module.exports = GauntletResolver;
  else root.GauntletResolver = GauntletResolver;
})(typeof globalThis !== "undefined" ? globalThis : this);
