/**
 * Deck Builder Gauntlet — offline catalog serializer (Phase 1)
 *
 * Emits gauntlet-cards.json + gauntlet-coverage.json from the LorcanaEngine card catalog,
 * cross-checked against the similcana allCards.json snapshot and the redux pattern library.
 *
 * Run with bun. The engine clone is read-only; nothing is written inside it.
 *
 *   bun run serialize.ts --engine "C:/Users/nessd/Documents/AI/lorcana-simulator"
 *
 * Fixture failures exit non-zero and emit nothing. A coverage number from an unvalidated
 * join is worse than no coverage number, because it is trusted.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";

const SERIALIZER_VERSION = "1.0.0";

// ---------------------------------------------------------------- args

const argOf = (name: string, fallback: string): string => {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
};

const HERE = import.meta.dir;
const ENGINE = resolve(argOf("engine", "C:/Users/nessd/Documents/AI/lorcana-simulator"));
const CARDS_JSON = resolve(argOf("cards", join(HERE, "allCards.json")));
const REDUX_JSON = resolve(
  argOf("redux", join(HERE, "..", "..", "lorcanaUtils_MatchUpAnalyzer", "lorcana_abilities_redux.json")),
);
const OUT_DIR = resolve(argOf("out", join(HERE, "..")));

// ---------------------------------------------------------------- types

type Fidelity = {
  silent_stub: boolean;
  partial_stub: boolean;
  partial_stub_reason: string | null;
  runtime_dependent: boolean;
  runtime_dependent_reason: string | null;
  vanilla: boolean;
  load_bearing: boolean;
};

type Lanes = {
  engine: "full" | "flagged";
  redux_patterns: string[];
  double_blind: boolean;
};

// ---------------------------------------------------------------- helpers

/**
 * The join key. Two silent failure modes live on this line:
 *   - dropping the card-number padding yields set1-1, missing every card under 100
 *   - passing `set` through verbatim yields set001-025, which matches nothing at all
 * Both produce a falsely LOW coverage number that reads as conservative.
 */
const joinKey = (setCode: string | number, cardNumber: number): string =>
  `set${parseInt(String(setCode), 10)}-${String(cardNumber).padStart(3, "0")}`;

const textOf = (c: any): string => {
  if (!c.text) return "";
  if (typeof c.text === "string") return c.text;
  if (Array.isArray(c.text)) {
    return c.text
      .map((e: any) => [e?.title, e?.description].filter(Boolean).join(" "))
      .join(" ")
      .trim();
  }
  return "";
};

/**
 * The name a player writes on a decklist: "Omnidroid - V.9", not "Omnidroid".
 *
 * The engine's own `fullName` field is unreliable for this — 2184 of 2754 records carry a
 * `version` and NONE of their `fullName` values include it, so every versioned card collapses
 * to its bare name. A parser indexed on that resolves "Omnidroid - V.9" to nothing and silently
 * loses most of a real decklist. Composed from `name` + `version` instead.
 */
const displayName = (c: any): string =>
  c.version ? `${c.name} - ${c.version}` : String(c.name);

const textEntryCount = (c: any): number => {
  if (Array.isArray(c.text)) return c.text.length;
  return typeof c.text === "string" && c.text.trim() ? 1 : 0;
};

/** Keywords the engine declares structurally, e.g. { type: "keyword", keyword: "Ward" }. */
const declaredKeywords = (c: any): { keyword: string; value?: number }[] =>
  (c.abilities ?? [])
    .filter((a: any) => a?.type === "keyword" && typeof a.keyword === "string")
    .map((a: any) => ({ keyword: a.keyword, ...(typeof a.value === "number" ? { value: a.value } : {}) }));

const KEYWORD_VOCAB = [
  "Rush", "Ward", "Evasive", "Challenger", "Resist", "Singer", "Shift", "Bodyguard",
  "Reckless", "Vanish", "Support", "Alert", "Boost", "SingTogether", "Sing Together",
];

/**
 * Keywords the printed text names, regardless of whether the engine modelled them.
 *
 * Matching is CASE-SENSITIVE and deliberately so. Lorcana prints keywords in Title Case
 * ("Evasive", "Rush", "Sing Together") while ability titles are set in full caps
 * ("STAY ALERT!", "TEMPEST"). A case-insensitive match reads the title of Donald Duck's
 * "STAY ALERT!" as the Alert keyword and reports the card as a stub.
 */
const keywordsInText = (text: string): string[] =>
  KEYWORD_VOCAB.filter((k) => new RegExp(`\\b${k.replace(/\s+/g, "\\s*")}\\b`).test(text));

/**
 * Structure-only projection of the ability tree: every `text` and `name` field is dropped.
 * Those fields echo the printed card text verbatim, so searching the raw tree for a keyword
 * would report every card as covered — the ability's own description would satisfy the check.
 * Only the mechanical fields count as evidence that the engine modelled something.
 */
const structuralOnly = (node: any): any => {
  if (Array.isArray(node)) return node.map(structuralOnly);
  if (node && typeof node === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(node)) {
      if (k === "text" || k === "name") continue;
      out[k] = structuralOnly(v);
    }
    return out;
  }
  return node;
};

/**
 * A keyword named in printed text is *covered* when it appears anywhere structural in the
 * ability tree — not only as a declared `type: "keyword"` ability. Cards that grant a keyword
 * (`gain-keyword`), trigger on one (`hasKeyword`), or filter targets by one (`has-keyword`)
 * name it in their text without ever having it, and the engine models all three correctly.
 * Checking declarations alone reports those as stubs: 332 false positives on this catalog.
 */
const keywordsUncovered = (c: any, text: string): string[] => {
  const named = keywordsInText(text);
  if (named.length === 0) return [];
  const hay = JSON.stringify(structuralOnly(c.abilities ?? [])).toLowerCase().replace(/\s+/g, "");
  return named.filter((k) => !hay.includes(k.toLowerCase().replace(/\s+/g, "")));
};

const fidelityOf = (c: any): Fidelity => {
  const abilities: any[] = Array.isArray(c.abilities) ? c.abilities : [];
  const text = textOf(c).trim();
  const vanilla = c.vanilla === true;

  const silent_stub = text.length > 0 && abilities.length === 0;

  // partial_stub has two independent halves. The entry-count half only works on the
  // structured array form; the keyword half is the one that catches string-form text.
  let partial_stub = false;
  let partial_stub_reason: string | null = null;
  if (!silent_stub && abilities.length > 0 && text) {
    const entries = textEntryCount(c);
    if (Array.isArray(c.text) && entries > abilities.length) {
      partial_stub = true;
      partial_stub_reason = `text entries (${entries}) outnumber abilities (${abilities.length})`;
    } else {
      const missing = keywordsUncovered(c, text);
      if (missing.length > 0) {
        partial_stub = true;
        partial_stub_reason = `keyword(s) named in text but absent from abilities: ${missing.join(", ")}`;
      }
    }
  }

  const flat = JSON.stringify(abilities);
  const modifyStatCount = (flat.match(/"type"\s*:\s*"modify-stat"/g) ?? []).length;
  const hasConditional = /"type"\s*:\s*"conditional"/.test(flat) || /"condition"\s*:/.test(flat);
  const hasReplacement = abilities.some((a: any) => a?.type === "replacement");
  const runtime_dependent = hasConditional || hasReplacement || modifyStatCount >= 2;
  const runtime_dependent_reason = runtime_dependent
    ? [
        hasConditional ? "conditional" : null,
        hasReplacement ? "replacement" : null,
        modifyStatCount >= 2 ? `${modifyStatCount}x modify-stat` : null,
      ]
        .filter(Boolean)
        .join(" + ")
    : null;

  // "Load-bearing" is the inverted trigger: not "does the engine have this card" but
  // "is this engine record trustworthy enough to answer interaction questions from".
  const load_bearing = vanilla || !(silent_stub || partial_stub || runtime_dependent);

  return {
    silent_stub,
    partial_stub,
    partial_stub_reason,
    runtime_dependent,
    runtime_dependent_reason,
    vanilla,
    load_bearing,
  };
};

// ---------------------------------------------------------------- redux lane

type ReduxPattern = { name: string; category: string; sub_type: string; re: RegExp };

/**
 * The redux file holds 122 entries, but only 115 are usable text patterns. Six carry the
 * sentinel `WILL_NOT_MATCH_TEXT` because they score card properties (base stats, card type)
 * rather than oracle text, and one has a regex that will not compile. Quoting "122 patterns"
 * as the lane's reach overstates it by seven; the counts are reported separately so the
 * difference is visible instead of looking like a parsing mismatch.
 */
const loadRedux = (
  path: string,
): {
  patterns: ReduxPattern[];
  lastModified: string | null;
  entriesTotal: number;
  nonTextSentinels: string[];
  uncompilable: string[];
} => {
  const raw = JSON.parse(readFileSync(path, "utf-8"));
  const patterns: ReduxPattern[] = [];
  const nonTextSentinels: string[] = [];
  const uncompilable: string[] = [];
  let lastModified: string | null = null;
  const entries = raw.abilities ?? [];

  for (const a of entries) {
    if (a?.lastModified && (!lastModified || a.lastModified > lastModified)) lastModified = a.lastModified;
    const name = a?.name ?? "(unnamed)";
    const src = a?.regex ?? "";
    if (!src.startsWith("/")) {
      nonTextSentinels.push(`${name} [${src}]`);
      continue;
    }
    const m = /^\/(.*)\/([gimsuy]*)$/s.exec(src);
    if (!m) {
      uncompilable.push(`${name} [unparseable literal]`);
      continue;
    }
    try {
      patterns.push({
        name,
        category: a.category ?? "",
        sub_type: a.sub_type ?? "",
        re: new RegExp(m[1]!, m[2]!.replace(/g/g, "")),
      });
    } catch (e) {
      // A pattern that will not compile is a defect in the source file, not in this build.
      // It is named rather than silently treated as a non-match.
      uncompilable.push(`${name} [${(e as Error).message.slice(0, 80)}]`);
    }
  }
  return { patterns, lastModified, entriesTotal: entries.length, nonTextSentinels, uncompilable };
};

const runReduxLane = (text: string, patterns: ReduxPattern[]): string[] =>
  patterns.filter((p) => p.re.test(text)).map((p) => p.name);

// ---------------------------------------------------------------- fixtures

const fail = (label: string, detail: string): never => {
  console.error(`\n[FIXTURE FAIL] ${label}\n  ${detail}\n`);
  console.error("No artifacts written. A coverage number from an unvalidated join is trusted, and wrong.");
  process.exit(1);
};

/**
 * Join fixture. Every assertion here is a case the naive key construction ate silently:
 * two cards under 100, one under 10, plus the reprint pair the plan names.
 */
const runJoinFixture = (byKey: Map<string, any>): void => {
  const required = ["set1-025", "set9-031", "set1-026", "set1-001", "set1-009", "set4-070"];
  const missing = required.filter((k) => !byKey.has(k));
  if (missing.length) fail("join key", `expected keys absent from the engine index: ${missing.join(", ")}`);

  if (joinKey("001", 25) !== "set1-025") fail("join key", `joinKey("001",25) === ${joinKey("001", 25)}`);
  if (joinKey("001", 9) !== "set1-009") fail("join key", `joinKey("001",9) === ${joinKey("001", 9)}`);
  if (joinKey(9, 31) !== "set9-031") fail("join key", `joinKey(9,31) === ${joinKey(9, 31)}`);

  // Be Our Guest is printed in set 1 and reprinted in set 9; both keys must reach a record.
  const a = byKey.get("set1-025");
  const b = byKey.get("set9-031");
  if (!a || !b) fail("join key", "reprint pair set1-025 / set9-031 did not both resolve");
  if (a.name !== "Be Our Guest" || b.name !== "Be Our Guest") {
    fail("join key", `reprint pair resolved to wrong cards: ${a.name} / ${b.name}`);
  }
};

/**
 * Stub-detector fixture, asserted against constructed records rather than live catalog
 * cards. The three cards the original plan named were all implemented upstream between
 * 2026-03 and 2026-05; a detector pinned to live data breaks every time upstream ships a fix.
 */
const runStubFixture = (): void => {
  const cases: [string, any, (f: Fidelity) => boolean][] = [
    [
      "text present + abilities [] is a silent stub",
      { text: "Evasive (Only characters with Evasive can challenge this character.)", abilities: [] },
      (f) => f.silent_stub && !f.load_bearing,
    ],
    [
      "populated abilities is not a stub",
      {
        text: [{ title: "Ward", description: "(Opponents can't choose this character except to challenge.)" }],
        abilities: [{ type: "keyword", keyword: "Ward", text: "Ward" }],
      },
      (f) => !f.silent_stub && !f.partial_stub,
    ],
    [
      "explicit vanilla with no text is not a stub",
      { vanilla: true, abilities: [] },
      (f) => !f.silent_stub && f.load_bearing,
    ],
    [
      "keyword in text but absent from abilities is a partial stub",
      {
        text: "Bodyguard. When you play this character, draw a card.",
        abilities: [{ type: "triggered", effect: { type: "draw", amount: 1 } }],
      },
      (f) => f.partial_stub && !f.load_bearing,
    ],
    [
      // Regression pin: the first build of this detector reported 332 false positives here,
      // because granting a keyword names it in text without declaring it as one.
      "granting a keyword is NOT a partial stub",
      {
        text: "Chosen character gains Rush this turn. (They can challenge the turn they're played.)",
        abilities: [
          { type: "action", effect: { type: "gain-keyword", keyword: "Rush", target: "CHOSEN_CHARACTER", duration: "this-turn" } },
        ],
      },
      (f) => !f.partial_stub,
    ],
    [
      "filtering targets by a keyword is NOT a partial stub",
      {
        text: "While this character is exerted, opposing characters with Evasive gain Reckless.",
        abilities: [
          {
            type: "static",
            condition: { type: "exerted" },
            effect: {
              type: "gain-keyword",
              keyword: "Reckless",
              target: { selector: "all", filter: [{ type: "has-keyword", keyword: "Evasive" }] },
            },
          },
        ],
      },
      (f) => !f.partial_stub,
    ],
    [
      // The ability's own `text` field echoes the printed line, so a naive substring search
      // over the raw tree would mark every keyword covered. Only structure counts.
      "keyword appearing ONLY in an ability's echoed text is still uncovered",
      {
        text: "Bodyguard. Draw a card.",
        abilities: [
          { type: "triggered", name: "SOMETHING", text: "Bodyguard. Draw a card.", effect: { type: "draw", amount: 1 } },
        ],
      },
      (f) => f.partial_stub,
    ],
    [
      // Regression pin: ability titles are printed in full caps, keywords in Title Case.
      // A case-insensitive scan read "STAY ALERT!" as the Alert keyword.
      "a keyword word appearing only inside an ALL-CAPS ability title is not a keyword reference",
      {
        text: "Bodyguard STAY ALERT! During your turn, your Musketeer characters gain Evasive.",
        abilities: [
          { type: "keyword", keyword: "Bodyguard" },
          { type: "static", effect: { type: "gain-keyword", keyword: "Evasive", target: { selector: "all" } } },
        ],
      },
      (f) => !f.partial_stub,
    ],
    [
      "more text entries than abilities is a partial stub",
      {
        text: [{ title: "Shift 5" }, { title: "Evasive" }, { title: "DARING EXPLOIT", description: "x" }],
        abilities: [{ type: "keyword", keyword: "Shift", value: 5 }],
      },
      (f) => f.partial_stub,
    ],
    [
      "replacement ability is runtime dependent",
      { text: "If this would be banished, put it into your inkwell instead.", abilities: [{ type: "replacement" }] },
      (f) => f.runtime_dependent && !f.load_bearing,
    ],
  ];

  for (const [label, record, predicate] of cases) {
    const f = fidelityOf(record);
    if (!predicate(f)) fail("stub detector", `${label} — got ${JSON.stringify(f)}`);
  }
};

// ---------------------------------------------------------------- main

const main = async (): Promise<void> => {
  // Engine provenance, read from the clone rather than assumed.
  const gitAt = (args: string[]): string =>
    execFileSync("git", ["-C", ENGINE, ...args], { encoding: "utf-8" }).trim();
  const engineCommit = gitAt(["rev-parse", "HEAD"]);
  const engineCommitDate = gitAt(["log", "-1", "--format=%cI"]);

  const catalogPath = join(ENGINE, "packages/lorcana/lorcana-cards/src/cards/catalog-data.ts");
  const { allCards } = (await import(pathToFileURL(catalogPath).href)) as { allCards: any[] };
  const defs: any[] = allCards;

  // --- similcana snapshot
  const similcanaRaw = readFileSync(CARDS_JSON);
  const similcana = JSON.parse(similcanaRaw.toString("utf-8"));
  const similcanaSha = createHash("sha256").update(similcanaRaw).digest("hex");
  const similcanaByKey = new Map<string, any>();
  for (const c of similcana.cards) similcanaByKey.set(joinKey(c.setCode, c.number), c);
  const similcanaSets = [...new Set(similcana.cards.map((c: any) => String(c.setCode)))];

  // --- redux lane
  const redux = loadRedux(REDUX_JSON);
  const reduxPatterns = redux.patterns;
  const reduxLastModified = redux.lastModified;

  // --- engine index
  const byKey = new Map<string, any>();
  for (const c of defs) {
    const own = joinKey(c.set, c.cardNumber);
    byKey.set(own, c);
    for (const r of c.reprints ?? []) if (!byKey.has(r)) byKey.set(r, c);
  }

  runJoinFixture(byKey);
  runStubFixture();

  // --- build records
  const records: any[] = [];
  const flaggedNoRedux: string[] = [];
  const silentStubs: string[] = [];
  const stubsKeywordBearing: { card: string; keywords: string[] }[] = [];
  const partialStubs: { card: string; reason: string }[] = [];
  const runtimeDependent: string[] = [];
  const rarityAll = new Map<string, number>();
  const rarityUnresolved = new Map<string, number>();

  for (const c of defs) {
    const key = joinKey(c.set, c.cardNumber);
    const text = textOf(c);
    const fidelity = fidelityOf(c);
    const label = `${displayName(c)} (${key})`;
    const rarity = c.rarity ?? "unknown";
    rarityAll.set(rarity, (rarityAll.get(rarity) ?? 0) + 1);

    let lanes: Lanes = { engine: "full", redux_patterns: [], double_blind: false };
    if (!fidelity.load_bearing) {
      const hits = runReduxLane(text, reduxPatterns);
      lanes = { engine: "flagged", redux_patterns: hits, double_blind: hits.length === 0 };
      if (hits.length === 0) flaggedNoRedux.push(label);
      rarityUnresolved.set(rarity, (rarityUnresolved.get(rarity) ?? 0) + 1);
    }

    if (fidelity.silent_stub) {
      silentStubs.push(label);
      const kws = keywordsInText(text);
      if (kws.length) stubsKeywordBearing.push({ card: label, keywords: kws });
    }
    if (fidelity.partial_stub) partialStubs.push({ card: label, reason: fidelity.partial_stub_reason! });
    if (fidelity.runtime_dependent) runtimeDependent.push(label);

    records.push({
      key,
      canonicalId: c.canonicalId,
      id: c.id,
      name: c.name,
      version: c.version ?? null,
      fullName: displayName(c),
      engineFullName: c.fullName ?? null,
      cardType: c.cardType,
      set: c.set,
      cardNumber: c.cardNumber,
      reprints: c.reprints ?? [],
      rarity,
      cost: c.cost,
      inkable: c.inkable,
      inkType: c.inkType ?? [],
      strength: c.strength ?? null,
      willpower: c.willpower ?? null,
      lore: c.lore ?? null,
      moveCost: c.moveCost ?? null,
      classifications: c.classifications ?? [],
      actionSubtype: c.actionSubtype ?? null,
      text,
      keywords: declaredKeywords(c),
      abilities: c.abilities ?? [],
      fidelity,
      lanes,
    });
  }

  // --- similcana-only records: cards newer than the engine catalog
  //
  // The engine stops at set 12 and similcana carries set 13, so a current constructed deck can
  // easily be a third set-13 cards with NO engine record at all. Emitting nothing for them means
  // the tool cannot read the decks Heaven actually plays, which is the only job it has.
  //
  // similcana is not a substitute for the engine — it has no structured effects, only free text.
  // But it DOES carry structured keyword abilities (`keyword`, `keywordValueNumber`), which is
  // exactly the data the five keyword rules need. So a set-13 card resolves Ward, Evasive,
  // Resist +N, Challenger +N and Bodyguard correctly, and resolves removal not at all.
  // That distinction is recorded per card rather than averaged away.
  const engineKeySet = new Set<string>();
  for (const r of records) {
    engineKeySet.add(r.key);
    for (const k of r.reprints) engineKeySet.add(k);
  }

  const CARD_TYPE_MAP: Record<string, string> = {
    Character: "character", Action: "action", Item: "item", Location: "location",
  };

  const fallbackRecords: any[] = [];
  const seenFallback = new Set<string>();
  for (const c of similcana.cards) {
    const key = joinKey(c.setCode, c.number);
    if (engineKeySet.has(key) || seenFallback.has(key)) continue;
    if (/^Q/i.test(String(c.setCode))) continue; // quest format, out of scope by design
    seenFallback.add(key);

    const text = String(c.fullText ?? "").replace(/\n/g, " ").trim();
    const keywords = (c.abilities ?? [])
      .filter((a: any) => a?.type === "keyword" && typeof a.keyword === "string")
      .map((a: any) => ({
        keyword: a.keyword,
        ...(typeof a.keywordValueNumber === "number" ? { value: a.keywordValueNumber } : {}),
      }));

    const reduxHits = runReduxLane(text, reduxPatterns);

    fallbackRecords.push({
      key,
      canonicalId: null,
      id: c.id ?? null,
      name: c.name,
      version: c.version ?? null,
      fullName: c.fullName ?? c.name,
      cardType: CARD_TYPE_MAP[String(c.type)] ?? String(c.type).toLowerCase(),
      set: String(c.setCode),
      cardNumber: c.number,
      reprints: [],
      rarity: String(c.rarity ?? "unknown").toLowerCase(),
      cost: c.cost,
      inkable: c.inkwell === true,
      inkType: c.color ? String(c.color).split(/[-,\s]+/).filter(Boolean).map((s: string) => s.toLowerCase()) : [],
      strength: c.strength ?? null,
      willpower: c.willpower ?? null,
      lore: c.lore ?? null,
      moveCost: c.moveCost ?? null,
      classifications: c.subtypes ?? [],
      actionSubtype: (c.subtypes ?? []).includes("Song") ? "song" : null,
      text,
      keywords,
      abilities: [],
      source: "similcana",
      fidelity: {
        silent_stub: false,
        partial_stub: false,
        partial_stub_reason: null,
        runtime_dependent: false,
        runtime_dependent_reason: null,
        vanilla: text.length === 0,
        no_engine_record: true,
        // Never load-bearing: keywords are known, removal effects are not. The resolver must
        // treat "this card answers nothing" as unknown here, not as a negative finding.
        load_bearing: false,
        reason: "no engine record — set " + c.setCode + " is newer than the engine catalog",
      },
      lanes: {
        engine: "absent",
        keywords_from: "similcana",
        redux_patterns: reduxHits,
        double_blind: reduxHits.length === 0 && text.length > 0,
      },
    });
  }
  records.push(...fallbackRecords);

  // --- round-trip check: the serialized tree must survive JSON with abilities intact
  const roundTripped = JSON.parse(JSON.stringify(records));
  if (JSON.stringify(roundTripped) !== JSON.stringify(records)) {
    fail("round-trip", "JSON.parse(JSON.stringify(records)) is not lossless");
  }
  const abilitiesBefore = records.reduce((n, r) => n + JSON.stringify(r.abilities).length, 0);
  const abilitiesAfter = roundTripped.reduce((n: number, r: any) => n + JSON.stringify(r.abilities).length, 0);
  if (abilitiesBefore !== abilitiesAfter) fail("round-trip", "ability payload changed size across JSON round-trip");

  // --- join accounting against the similcana snapshot
  const engineKeys = new Set<string>();
  for (const r of records) {
    engineKeys.add(r.key);
    for (const k of r.reprints) engineKeys.add(k);
  }
  const unmatchedSimilcana: string[] = [];
  const gapFormatAbsent: string[] = [];
  const gapSetNewerThanEngine: string[] = [];
  const engineMaxSet = Math.max(...defs.map((c: any) => parseInt(String(c.set), 10)).filter(Number.isFinite));

  // Gaps are reported per distinct card, not per printing. similcana lists art variants as
  // separate records sharing one card number (Dalmatian Puppy set3-004 has five), and five
  // identical lines in an exclusion list read as five problems instead of one.
  const seenGap = new Set<string>();
  for (const c of similcana.cards) {
    const k = joinKey(c.setCode, c.number);
    if (engineKeys.has(k) || seenGap.has(k)) continue;
    seenGap.add(k);
    const label = `${c.fullName ?? c.name} (${k})`;
    if (/^Q/i.test(String(c.setCode))) gapFormatAbsent.push(label);
    else if (parseInt(String(c.setCode), 10) > engineMaxSet) gapSetNewerThanEngine.push(label);
    else unmatchedSimilcana.push(label);
  }

  const uniqueGameCards = new Set(records.map((r) => r.canonicalId)).size;
  const flaggedTotal = records.filter((r) => !r.fidelity.load_bearing).length;

  const rarityWeighted = [...rarityUnresolved.entries()]
    .map(([rarity, n]) => ({
      rarity,
      unresolved: n,
      of_rarity: rarityAll.get(rarity) ?? 0,
      share_of_rarity: +((n / (rarityAll.get(rarity) ?? 1)) * 100).toFixed(1),
    }))
    .sort((a, b) => b.share_of_rarity - a.share_of_rarity);

  const coverage = {
    provenance: {
      serializer_version: SERIALIZER_VERSION,
      generated_at: new Date().toISOString(),
      engine_repo: "TheCardGoat/lorcana-simulator",
      engine_commit: engineCommit,
      engine_commit_date: engineCommitDate,
      engine_max_set: engineMaxSet,
      similcana_source: "heavenideas/similcana@main:database/allCards.json",
      similcana_generated_on: similcana.metadata?.generatedOn ?? null,
      similcana_format_version: similcana.metadata?.formatVersion ?? null,
      similcana_sha256: similcanaSha,
      similcana_max_set: Math.max(
        ...similcanaSets.map((s) => parseInt(s, 10)).filter(Number.isFinite),
      ),
      similcana_sets: similcanaSets,
      redux_entries_total: redux.entriesTotal,
      redux_pattern_count: reduxPatterns.length,
      redux_non_text_sentinels: redux.nonTextSentinels,
      redux_uncompilable: redux.uncompilable,
      redux_last_modified: reduxLastModified,
      join_fixture_status: "PASS",
      stub_fixture_status: "PASS",
    },
    catalog: {
      definitions_total: records.length,
      engine_definitions: records.length - fallbackRecords.length,
      similcana_fallback_definitions: fallbackRecords.length,
      similcana_fallback_note:
        "Cards newer than the engine catalog, emitted from similcana. Structured keywords only " +
        "(Ward/Evasive/Resist/Challenger/Bodyguard resolve); no structured effects, so removal " +
        "is unreadable for these and is reported as unknown, never as absent.",
      unique_game_cards: uniqueGameCards,
      vanilla: records.filter((r) => r.fidelity.vanilla).length,
      note:
        "definitions_total counts printings; each reprint is a separate definition object sharing a reprints[] array. " +
        "unique_game_cards collapses them by canonicalId. Any coverage percentage must say which denominator it used.",
    },
    presence: {
      engine_keys_indexed: engineKeys.size,
      similcana_cards: similcana.cards.length,
      gap_format_absent: gapFormatAbsent,
      gap_set_newer_than_engine: gapSetNewerThanEngine,
      gap_unexplained: unmatchedSimilcana,
      unmatched_total:
        gapFormatAbsent.length + gapSetNewerThanEngine.length + unmatchedSimilcana.length,
      invariant_unmatched_equals_gap_sum: true,
    },
    correctness: {
      silent_stubs: silentStubs,
      stubs_keyword_bearing: stubsKeywordBearing,
      partial_stubs: partialStubs,
      runtime_dependent_count: runtimeDependent.length,
      runtime_dependent: runtimeDependent,
      rarity_weighted_unresolved: rarityWeighted,
    },
    resolution_ledger: {
      resolved_engine_full: records.length - flaggedTotal,
      flagged_total: flaggedTotal,
      resolved_redux_crosscheck: flaggedTotal - flaggedNoRedux.length,
      double_blind: flaggedNoRedux,
      double_blind_count: flaggedNoRedux.length,
    },
  };

  writeFileSync(join(OUT_DIR, "gauntlet-cards.json"), JSON.stringify(records));
  writeFileSync(join(OUT_DIR, "gauntlet-coverage.json"), JSON.stringify(coverage, null, 2));

  const pct = (n: number) => `${((n / records.length) * 100).toFixed(2)}%`;
  console.log(`engine        ${engineCommit.slice(0, 10)} (${engineCommitDate.slice(0, 10)}), max set ${engineMaxSet}`);
  console.log(`similcana     ${coverage.provenance.similcana_generated_on}, max set ${coverage.provenance.similcana_max_set}`);
  console.log(`redux         ${reduxPatterns.length} patterns, last modified ${reduxLastModified}`);
  console.log(`definitions   ${records.length} (${uniqueGameCards} unique game cards)`);
  console.log(`silent_stub   ${silentStubs.length} ${pct(silentStubs.length)}`);
  console.log(`partial_stub  ${partialStubs.length} ${pct(partialStubs.length)}   <- Phase 1 stop-gate at ~10%`);
  console.log(`runtime_dep   ${runtimeDependent.length} ${pct(runtimeDependent.length)}`);
  console.log(`flagged       ${flaggedTotal} ${pct(flaggedTotal)}`);
  console.log(`double_blind  ${flaggedNoRedux.length} ${pct(flaggedNoRedux.length)}`);
  console.log(`fallback      ${fallbackRecords.length} similcana-only records (sets newer than the engine)`);
  console.log(`unmatched     ${coverage.presence.unmatched_total} (format ${gapFormatAbsent.length}, newer-set ${gapSetNewerThanEngine.length}, unexplained ${unmatchedSimilcana.length})`);
  console.log(`\nwrote ${join(OUT_DIR, "gauntlet-cards.json")}`);
  console.log(`wrote ${join(OUT_DIR, "gauntlet-coverage.json")}`);
};

await main();
