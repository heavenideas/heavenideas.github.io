/**
 * Bot Arena engine adapter.
 *
 * Wraps TheCardGoat's open-source Lorcana engine (MIT, github.com/TheCardGoat/tcg-engines)
 * behind a small API the static page can use: start a game, read the board, list the
 * legal options with readable text, and apply the option a bot picked.
 *
 * This file is compiled into lorcana-engine.js by build_engine.sh; it is copied into the
 * engine's lorcana-simulator package at build time so its imports resolve there.
 */
import {
  AUTOMATED_ACTION_STRATEGIES,
  deckAwareLoreRaceAutomatedActionStrategy,
} from "@tcg/lorcana-engine";
import { LorcanaMultiplayerTestEngine } from "@tcg/lorcana-engine/testing";
import { resolveLorcanaDeckListTextFromPool } from "@tcg/lorcana-cards/deck-list-resolver";
import { DECK_FIXTURES } from "./src/lib/features/simulator-devtools/deck-fixtures/index.js";
import { createFixture } from "./src/lib/features/simulator-devtools/fixtures/fixture-factory.js";
import { all001Cards } from "@tcg/lorcana-cards/cards/001";
import { all002Cards } from "@tcg/lorcana-cards/cards/002";
import { all003Cards } from "@tcg/lorcana-cards/cards/003";
import { all004Cards } from "@tcg/lorcana-cards/cards/004";
import { all005Cards } from "@tcg/lorcana-cards/cards/005";
import { all006Cards } from "@tcg/lorcana-cards/cards/006";
import { all007Cards } from "@tcg/lorcana-cards/cards/007";
import { all008Cards } from "@tcg/lorcana-cards/cards/008";
import { all009Cards } from "@tcg/lorcana-cards/cards/009";
import { all010Cards } from "@tcg/lorcana-cards/cards/010";
import { all011Cards } from "@tcg/lorcana-cards/cards/011";
import { all012Cards } from "@tcg/lorcana-cards/cards/012";

const POOL: any[] = [
  ...all001Cards, ...all002Cards, ...all003Cards, ...all004Cards, ...all005Cards, ...all006Cards,
  ...all007Cards, ...all008Cards, ...all009Cards, ...all010Cards, ...all011Cards, ...all012Cards,
].filter((c: any) => c?.name != null);

const PLAYERS = ["player_one", "player_two"] as const;

// Same search budget the engine's own bot-vs-bot runner uses; the defaults are tight
// enough that some abilities end up with no options at all.
const SEARCH_CAPS = { choiceIndices: 16, singerCombinations: 32, targetCombinationsPerFamily: 48, targetPool: 16 };
type Pid = (typeof PLAYERS)[number];

// Ranks like a given engine strategy, but forces one chosen candidate to the front.
function pinnedStrategy(base: any, chosen: any) {
  const key = JSON.stringify(chosen);
  return {
    name: "arena-pinned",
    informationPolicy: base.informationPolicy,
    summarizeCandidates(ctx: any, cands: any) {
      const s = base.summarizeCandidates(ctx, cands);
      const i = s.findIndex((x: any) => JSON.stringify(x.candidate) === key);
      return i > 0 ? [s[i], ...s.slice(0, i), ...s.slice(i + 1)] : s;
    },
  };
}

function resolveDeck(text: string) {
  const res: any = resolveLorcanaDeckListTextFromPool(text, POOL);
  const problems: string[] = [
    ...(res.diagnostics?.unresolvedNames ?? []).map((n: string) => `Unknown card: ${n}`),
    ...(res.diagnostics?.malformedLines ?? []).map((l: any) => `Could not read line ${l?.lineNumber ?? "?"}: “${typeof l === "string" ? l : l?.text ?? ""}”`),
  ];
  return { cards: res.cards ?? [], problems };
}

class ArenaGame {
  engine: any;
  seed: string;
  history: { turn: number; actor: Pid; text: string; brain: string }[] = [];
  actionsThisTurn = 0;
  lastTurnSeen = -1;

  constructor(engine: any, seed: string) {
    this.engine = engine;
    this.seed = seed;
  }

  get server(): any {
    return this.engine.asServer();
  }

  // ---------- Board view ----------
  card(id: string, board?: any) {
    const b = board ?? this.server.getBoard();
    const c = b.cards[id];
    if (!c) return null;
    let def: any = null;
    try { def = this.server.getCardDefinitionByInstanceId(id); } catch { /* hidden or unknown */ }
    return {
      id,
      name: c.fullName ?? def?.name ?? "?",
      type: c.cardType,
      cost: c.playCost ?? def?.cost ?? 0,
      strength: c.strength,
      willpower: c.willpower,
      lore: c.lore,
      damage: c.damage ?? 0,
      exerted: !!c.exerted,
      drying: !!c.drying,
      keywords: c.keywords ?? [],
      inkable: def?.inkable ?? c.canBePutInInkwell,
      set: def?.set ?? null,
      number: def?.cardNumber ?? null,
      locationId: this.safe(() => this.server.getCardLocationId(id)) ?? null,
      underCount: this.safe(() => this.server.getCardsUnderCount(id)) ?? 0,
    };
  }

  safe<T>(fn: () => T): T | undefined {
    try { return fn(); } catch { return undefined; }
  }

  view() {
    const b = this.server.getBoard();
    const players: any = {};
    for (const p of PLAYERS) {
      const pl = b.players[p];
      const cards = (ids: string[]) => ids.map((id) => this.card(id, b)).filter(Boolean);
      const inkwell = cards(pl.inkwell);
      players[p] = {
        lore: pl.lore ?? b?.players?.[p]?.lore ?? 0,
        deckCount: pl.deckCount,
        handCount: pl.handCount,
        hand: cards(pl.hand),
        play: cards(pl.play),
        discard: cards(pl.discard),
        inkTotal: inkwell.length,
        inkReady: inkwell.filter((c: any) => !c.exerted).length,
      };
    }
    return {
      turn: b.turnNumber,
      turnPlayer: b.turnPlayer as Pid,
      actor: this.actor(),
      phase: b.phase,
      segment: b.gameSegment,
      winner: (this.server.getWinner() as Pid | null) ?? null,
      reason: b.reason ?? null,
      players,
    };
  }

  actor(): Pid | null {
    const cheap = this.safe(() => this.server.getCurrentActorId());
    if (cheap) return cheap as Pid;
    return (this.safe(() => this.server.enumerateAutomatedActionsForCurrentActor({ strategy: deckAwareLoreRaceAutomatedActionStrategy, searchCaps: SEARCH_CAPS }).actorId) ?? null) as Pid | null;
  }

  winner(): Pid | null {
    return (this.server.getWinner() as Pid | null) ?? null;
  }

  // ---------- Options ----------
  boardCache: any = null;

  name(id: any, actor?: Pid): string {
    if (id === "player_one" || id === "player_two") return id === actor ? "yourself" : "the opponent";
    const c = (this.boardCache ?? this.server.getBoard()).cards[id];
    return c?.fullName ?? "a card";
  }

  pendingItem(c: any) {
    const b = this.boardCache ?? this.server.getBoard();
    const list = c.family === "resolveBag" ? b.bagEffects : b.pendingEffects;
    return (list ?? []).find((x: any) => x.id === (c.bagId ?? c.effectId));
  }

  describe(c: any, actor: Pid): { text: string; detail: string } {
    const n = (id: any) => this.name(id, actor);
    const b = this.boardCache ?? this.server.getBoard();
    const targets = c.targets?.length ? ` targeting ${c.targets.map(n).join(", ")}` : "";
    switch (c.family) {
      case "chooseWhoGoesFirst":
        return { text: c.firstPlayerId === actor ? "Go first" : "Let the opponent go first", detail: "" };
      case "alterHand":
        return c.cardsToMulligan.length
          ? { text: `Mulligan ${c.cardsToMulligan.length} card(s)`, detail: `Put back: ${c.cardsToMulligan.map(n).join(", ")}` }
          : { text: "Keep the opening hand", detail: this.handSummary(actor) };
      case "putCardIntoInkwell": {
        const k = this.card(c.cardId, b);
        return { text: `Ink ${n(c.cardId)}`, detail: `Cost ${k?.cost} card leaves your hand to become ink.` };
      }
      case "playCard": {
        const k = this.card(c.cardId, b);
        const cost = c.cost;
        const mode = typeof cost === "string" ? cost : cost?.cost;
        let text = `Play ${n(c.cardId)}`;
        if (mode === "shift") text = `Shift ${n(c.cardId)} onto ${n(cost.shiftTarget)}`;
        else if (mode === "sing") text = `Sing ${n(c.cardId)} with ${n(cost.singer)}`;
        else if (mode === "singTogether") text = `Sing ${n(c.cardId)} together with ${cost.singers.map(n).join(", ")}`;
        else if (mode === "free") text += " for free";
        else text += ` (${k?.cost} ink)`;
        const stats = k?.type === "character" ? ` ${k.strength} str / ${k.willpower} will / ${k.lore} lore.` : "";
        return { text: text + targets, detail: `${k?.type ?? ""}.${stats}`.trim() };
      }
      case "activateAbility":
        return { text: `Use an ability of ${n(c.cardId)}${targets}`, detail: c.costs ? `Extra costs: ${Object.values(c.costs).flat().map(n).join(", ")}` : "" };
      case "quest": {
        const k = this.card(c.cardId, b);
        const lore = b.players[actor]?.lore ?? 0;
        const after = lore + (k?.lore ?? 0);
        return { text: `Quest with ${n(c.cardId)} (+${k?.lore} lore)`, detail: `Lore ${lore} → ${after}${after >= 20 ? " — WINS" : ""}.` };
      }
      case "challenge": {
        const p = c.preview;
        let detail = "";
        if (p) {
          detail = `Deals ${p.attackerDamageDealt ?? "?"} → ${n(c.defenderId)} ${p.defenderWouldBeBanished ? "BANISHED" : "survives"}`;
          if (p.defenderKind !== "location") detail += `; takes ${p.defenderDamageDealt ?? "?"} → ${p.attackerWouldBeBanished ? "YOUR CHARACTER IS BANISHED" : "survives"}`;
          detail += ".";
        }
        return { text: `Challenge ${n(c.defenderId)} with ${n(c.attackerId)}`, detail };
      }
      case "moveCharacterToLocation":
        return { text: `Move ${n(c.characterId)} to ${n(c.locationId)}`, detail: "" };
      case "resolveBag":
      case "resolveEffect": {
        const item = this.pendingItem(c);
        const payload = item?.payload ?? {};
        const source = payload.sourceCardId ?? payload.sourceId ?? item?.sourceId;
        const label = `${source ? n(source) : "Resolve effect"}${payload.abilityName ? ` — ${payload.abilityName}` : ""}`;
        let text = label + ":";
        if (c.resolveOptional === false) text += " decline";
        else if (c.choiceIndex !== undefined) {
          const labels = payload.effect?.optionLabels;
          text += ` choose “${labels?.[c.choiceIndex] ?? `option ${c.choiceIndex + 1}`}”`;
        } else if (c.destinations) {
          text += " " + c.destinations.filter((d: any) => d.cards.length).map((d: any) => `${d.cards.map(n).join(", ")} → ${d.zone}`).join("; ");
        } else if (c.namedCard) text += ` name “${c.namedCard}”`;
        else if (!c.targets?.length) text += c.resolveOptional ? " use it" : " resolve";
        return { text: c.resolveOptional === false ? text : text + targets, detail: "" };
      }
    }
    return { text: c.family, detail: "" };
  }

  // A player may pass whenever it is their main phase and nothing is waiting to resolve.
  canPass(actor: Pid | null) {
    const b = this.server.getBoard();
    return !!actor && b.gameSegment === "mainGame" && b.phase === "main" && b.turnPlayer === actor
      && !(b.bagEffects?.length) && !(b.pendingEffects?.length) && !b.pendingChoice;
  }

  options() {
    const en = this.server.enumerateAutomatedActionsForCurrentActor({ strategy: deckAwareLoreRaceAutomatedActionStrategy, searchCaps: SEARCH_CAPS });
    const actor = en.actorId as Pid | null;
    const b = (this.boardCache = this.server.getBoard());
    const list = (en.candidates ?? []).slice(0, 254).map((c: any, i: number) => ({
      key: "o" + (i + 1),
      family: c.family,
      candidate: c,
      ...this.describe(c, actor as Pid),
    }));
    if (actor && list.length === 0) list.push(...this.rescueOptions(actor, b));
    if (this.canPass(actor) || (actor && list.length === 0)) {
      list.push({ key: "pass", family: "pass", candidate: null, ...this.describePass(actor as Pid, b, list) } as any);
    }
    this.boardCache = null;
    return { actor, list };
  }

  handSummary(actor: Pid) {
    const b = this.boardCache ?? this.server.getBoard();
    const hand = (b.players[actor]?.hand ?? []).map((id: string) => b.cards[id]).filter(Boolean);
    if (!hand.length) return "";
    const inkable = hand.filter((c: any) => c.canBePutInInkwell).length;
    const costs = hand.map((c: any) => c.playCost).sort((x: number, y: number) => x - y).join(", ");
    return `Hand: ${hand.map((c: any) => c.fullName).join("; ")}. Costs ${costs}; ${inkable} inkable.`;
  }

  /**
   * "End turn" spelled out as what it gives up, worked out from the options still open.
   * A bare "End turn" reads as a safe default to zero-shot models, so they pick it far too often.
   */
  describePass(actor: Pid, b: any, list: any[]) {
    const inkReady = (b.players[actor]?.inkwell ?? []).filter((id: string) => !b.cards[id]?.exerted).length;
    const quests = list.filter((o) => o.family === "quest");
    const questLore = quests.reduce((sum, o) => sum + (b.cards[o.candidate.cardId]?.lore ?? 0), 0);
    const canInk = list.some((o) => o.family === "putCardIntoInkwell");
    const plays = list.filter((o) => o.family === "playCard").length;
    const wasted: string[] = [];
    if (quests.length) wasted.push(`${quests.length} character(s) that could quest for ${questLore} lore`);
    if (canInk) wasted.push("your ink drop for this turn");
    if (plays) wasted.push(`${plays} playable card option(s)`);
    if (inkReady) wasted.push(`${inkReady} ready ink`);
    if (!wasted.length) return { text: "End turn", detail: "Nothing useful is left to do this turn." };
    return { text: "End turn now, doing nothing else", detail: `Gives up: ${wasted.join(", ")}.` };
  }

  /**
   * When an ability is waiting to resolve but the planner produced no options for it
   * (an unsupported or oversized shape), offer to decline it or resolve it with the
   * first valid targets, so the game can continue.
   */
  rescueOptions(actor: Pid, b: any) {
    const out: any[] = [];
    const items = [...(b.bagEffects ?? []).map((x: any) => ({ x, family: "resolveBag", idKey: "bagId" })),
      ...(b.pendingEffects ?? []).map((x: any) => ({ x, family: "resolveEffect", idKey: "effectId" }))];
    const item = items.find(({ x }) => (x.chooserId ?? x.payload?.chooserId) === actor) ?? items[0];
    if (!item) return out;
    const { x, family, idKey } = item;
    const sel = x.selectionContext ?? x.payload?.selectionContext ?? {};
    const source = x.sourceId ?? x.payload?.sourceId;
    const label = `${source ? this.name(source, actor) : "Effect"}${x.payload?.abilityName ? ` — ${x.payload.abilityName}` : ""}`;
    if (sel.canDeclineSelection || x.payload?.effect?.type === "optional") {
      out.push({ key: "r1", family, rescue: true, candidate: { family, [idKey]: x.id, resolveOptional: false }, text: `${label}: decline`, detail: "The engine's planner has no options for this ability, so it can be declined." });
    }
    const ids = [...(sel.cardCandidateIds ?? []), ...(sel.playerCandidateIds ?? [])];
    const need = Math.max(1, sel.minSelections ?? 1);
    if (ids.length >= need) {
      const targets = ids.slice(0, need);
      out.push({ key: "r2", family, rescue: true, candidate: { family, [idKey]: x.id, resolveOptional: true, targets }, text: `${label}: resolve targeting ${targets.map((t: any) => this.name(t, actor)).join(", ")}`, detail: "Uses the first valid targets." });
    }
    return out;
  }

  applyRescue(option: any, brain: string, actor: Pid, turn: number) {
    const tries = [option.candidate, { ...option.candidate, resolveOptional: false }, { ...option.candidate, targets: undefined }];
    for (const c of tries) {
      const r = this.safe(() => this.server.executeAutomatedActionCandidate(actor, c));
      if (r?.success) {
        this.history.push({ turn, actor, text: option.text, brain });
        return { ok: true, executed: option.text };
      }
    }
    this.safe(() => this.server.concede(actor));
    this.history.push({ turn, actor, text: `Conceded — the engine could not resolve “${option.text.split(":")[0]}”`, brain: "engine" });
    return { ok: false, executed: "Conceded (engine could not resolve an ability)" };
  }

  /** Order the engine's own strategy would try these options in (best first). */
  engineRanking(strategyId: string) {
    const strat = this.strategy(strategyId);
    const en = this.server.enumerateAutomatedActionsForCurrentActor({ strategy: strat, searchCaps: SEARCH_CAPS });
    return (en.candidates ?? []).map((c: any) => JSON.stringify(c));
  }

  strategy(id: string) {
    const found = (AUTOMATED_ACTION_STRATEGIES as any[]).find((s: any) => s.id === id);
    return found?.strategy ?? deckAwareLoreRaceAutomatedActionStrategy;
  }

  // ---------- Applying ----------
  apply(option: any, brain: string) {
    const actor = this.actor();
    const turn = this.server.getTurnNumber();
    if (turn !== this.lastTurnSeen) { this.lastTurnSeen = turn; this.actionsThisTurn = 0; }
    this.actionsThisTurn++;
    // Safety valve: a turn that goes on this long is stuck, so end it.
    const forcePass = this.actionsThisTurn > 80 && this.canPass(actor);
    if (!option || option.family === "pass" || forcePass) {
      const r = this.server.passTurn(actor);
      this.history.push({ turn, actor: actor as Pid, text: forcePass ? "End turn (turn ran too long)" : "End turn", brain });
      return { ok: r?.success !== false, executed: forcePass ? "End turn (turn ran too long)" : "End turn" };
    }
    if (option.rescue) return this.applyRescue(option, brain, actor as Pid, turn);
    const res = this.server.takeAutomatedActionForCurrentActor({
      strategy: pinnedStrategy(deckAwareLoreRaceAutomatedActionStrategy, option.candidate),
      searchCaps: SEARCH_CAPS,
    });
    const executed = res.executionAttempts?.find((a: any) => a.result?.success)?.candidate;
    const exact = executed && JSON.stringify(executed) === JSON.stringify(option.candidate);
    const text = exact ? option.text : executed ? `${this.describe(executed, actor as Pid).text} (engine substitute)` : "End turn (nothing else was legal)";
    this.history.push({ turn, actor: actor as Pid, text, brain: exact ? brain : "engine" });
    return { ok: !!exact, executed: text, fallback: res.fallbackTaken ?? null };
  }

  /** Let an engine strategy take the action itself (exactly how the engine's bots play). */
  applyEngine(strategyId: string, optionList?: any[]) {
    const actor = this.actor();
    const turn = this.server.getTurnNumber();
    const before = optionList ? { list: optionList } : this.options();
    // The engine's bots would concede here; resolve the stuck ability instead.
    const rescue = before.list.find((o: any) => o.rescue);
    if (rescue) {
      const r = this.applyRescue(rescue, strategyId, actor as Pid, turn);
      return { ...r, key: rescue.key };
    }
    const res = this.server.takeAutomatedActionForCurrentActor({ strategy: this.strategy(strategyId), searchCaps: SEARCH_CAPS });
    const executed = res.executionAttempts?.find((a: any) => a.result?.success)?.candidate;
    const text = executed ? this.describe(executed, actor as Pid).text : "End turn";
    const key = executed ? before.list.find((o: any) => o.candidate && JSON.stringify(o.candidate) === JSON.stringify(executed))?.key : "pass";
    this.history.push({ turn, actor: actor as Pid, text, brain: strategyId });
    return { ok: true, executed: text, key };
  }

  // ---------- Text the language/decision models read ----------
  stateText(me: Pid) {
    const v = this.view();
    const op: Pid = me === "player_one" ? "player_two" : "player_one";
    const line = (c: any, zone: string) => {
      let s = `- ${c.name} [${c.type}, cost ${c.cost}`;
      if (c.type === "character") s += `, ${c.strength} str / ${c.willpower} will / ${c.lore} lore`;
      if (c.type === "location") s += `, ${c.willpower} will / ${c.lore} lore`;
      s += "]";
      if (zone === "hand") s += c.inkable ? " inkable" : " not inkable";
      if (zone === "play") {
        const f = [];
        if (c.type === "character" || c.type === "item") f.push(c.exerted ? "exerted" : "ready");
        if (c.drying) f.push("just played");
        if (c.damage) f.push(`${c.damage} damage`);
        if (f.length) s += " " + f.join(", ");
      }
      if (c.keywords?.length) s += ` {${c.keywords.join(", ")}}`;
      return s;
    };
    const list = (arr: any[], zone: string) => (arr.length ? arr.map((c) => line(c, zone)).join("\n") : "- (none)");
    const P = v.players;
    return [
      `Disney Lorcana. You are ${me === "player_one" ? "Player 1" : "Player 2"}. First to 20 lore wins.`,
      `Turn ${v.turn}. ${v.turnPlayer === me ? "It is your turn." : "It is the opponent's turn."}`,
      `Lore: you ${P[me].lore}, opponent ${P[op].lore}.`,
      `Your ink: ${P[me].inkReady} ready of ${P[me].inkTotal}.`,
      `YOUR HAND (${P[me].hand.length}):`, list(P[me].hand, "hand"),
      `YOUR BOARD:`, list(P[me].play, "play"),
      `OPPONENT BOARD:`, list(P[op].play, "play"),
      `Opponent has ${P[op].handCount} cards in hand, ${P[op].inkTotal} ink, ${P[op].deckCount} in deck, ${P[op].discard.length} in discard. You have ${P[me].deckCount} in deck.`,
    ].join("\n");
  }
}

const LorcanaArena = {
  decks: () => DECK_FIXTURES.map((d: any) => ({ id: d.id, name: d.name, list: d.cards })),
  strategies: () => (AUTOMATED_ACTION_STRATEGIES as any[]).map((s: any) => ({ id: s.id, label: s.label ?? s.id })),
  checkDeck: (text: string) => {
    const r = resolveDeck(text);
    return { count: r.cards.length, problems: r.problems };
  },
  newGame(deckOne: string, deckTwo: string, seed = String(Date.now())) {
    const a = resolveDeck(deckOne), b = resolveDeck(deckTwo);
    if (!a.cards.length || !b.cards.length) throw new Error("Both decks need at least one recognised card.");
    const fixture: any = createFixture({
      description: "Bot Arena", id: "arena", name: "Bot Arena", seed, skipPreGame: false,
      playerOne: { deck: a.cards }, playerTwo: { deck: b.cards },
    } as any);
    const engine = LorcanaMultiplayerTestEngine.createWithFixture(fixture.playerOne, fixture.playerTwo, { seed, skipPreGame: false });
    return new ArenaGame(engine, seed);
  },
};

(globalThis as any).LorcanaArena = LorcanaArena;
export default LorcanaArena;
