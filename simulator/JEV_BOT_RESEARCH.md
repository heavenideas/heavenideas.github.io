# Research: A Lorcana bot powered by Jev (or a free open-source equivalent)

_Researched 2026-09-28. Jev launched on 2026-09-15, so everything here is less than two weeks old. Most vendor pages were blocked from the research environment, so API field names below come from secondary sources and need checking against docs.typesafe.ai before building._

---

## 1. TL;DR

- **Jev is a picker, not a planner.** It reads a state and answers typed questions: _Choice_ (pick 1 of up to 255 options), _Noul_ (yes/no probability) and _Score_ (a rating on a 2–10 level scale). Each answer comes with a probability distribution and a confidence value. It can't produce a move that isn't in the list, which is exactly what a card-game bot needs.
- **It doesn't plan.** Write-ups on turn-based and card games all say the same thing: fast picks are not strong strategy, because a move's value depends on later turns. A pure "ask Jev every step" bot will play legally, run cheaply and look reasonable, but it will play weakly.
- **The setup that works** (the one used by JEV-Star, which beat StarCraft II's hardest built-in AI):
  **rules engine lists legal moves → (optional) an LLM planner sets the turn's plan → Jev picks the move → engine applies it.**
  For a turn-based game we can also add shallow lookahead: the engine simulates each candidate move and Jev _scores_ the resulting board.
- **Free route:** **Von** or **Laya** are Apache-2.0 models (ModernBERT, about 400M parameters) with the same Choice/Noul/Score interface. They run locally on CPU or GPU in 15–40 ms, and Laya already has ONNX, CoreML and MLX builds, so it may even run **in the browser** on GitHub Pages with no server. Because they're open, we can **fine-tune them on real Lorcana decisions** taken from the duels.ink replays the Dojo already imports. Long term, that's the biggest win.
- **Hardest part: the rules engine, not the AI.** `simulator/lorcana_game_module.js` has no card abilities, and the Practice Dojo is a sandbox with no rules on purpose. The strongest candidate is TheCardGoat's open-source TypeScript engine (`lorcana-simulator` / `tcg-engines`), which already has an `automation/` folder for bots.

---

## 2. What Jev is

| | |
|---|---|
| Vendor | TypeSafe AI (founded by Diego Almeida, who worked on ChatGPT/RLHF at OpenAI) |
| Released | 15 Sep 2026, early access; closed weights, hosted only |
| Architecture | "System One" model that doesn't generate token by token. One forward pass returns an answer plus probabilities plus confidence. No chain of thought and no free text. |
| Primitives | **Choice** (≤255 options), **Noul** (bool probability), **Score** (2–10 ordered levels). Several questions about the same state can go in one request. |
| Latency | 70–500 ms per request (JEV-Star measured a median of 0.42 s) |
| Price | About $0.042 per 1M input tokens; output is free. Reported at about $0.000126 per request. The Doom demo ran 10 decisions/s for about $7/hour. |
| Limits | Text only. Budget of about 32k tokens for state plus the longest question (64k total reported). Rate limits change dynamically. |
| SDKs | `pip install typesafe-sdk`, `npm install @typesafe-ai/sdk`. Both read `TYPESAFE_API_KEY` and default to `jev-latest`. Also on OpenRouter, Requesty (`typesafe/jev-1.13.0`) and Cloudflare Workers AI. |
| Game demos | Doom, working from **structured game state rather than pixels**; Subway Surfers; driving; Minecraft; StarCraft II (JEV-Star) |

**How this fits Lorcana:** a Lorcana turn is a series of discrete decisions, and each one has a legal-move list that fits well under 255 options: ink, play, quest, challenge, sing, move to location, activate, pass, plus targeting, mulligans and "may" effects. That is exactly the shape of a Choice question. Latency doesn't matter in a turn-based game, so speed isn't the reason to use Jev. The reasons are **cost, determinism, guaranteed-legal output and calibrated probabilities we can show on screen**.

### JEV-Star (the design to copy)
Paper [arXiv 2609.27331](https://arxiv.org/abs/2609.27331), code [sc2musa/Jev_Star](https://github.com/sc2musa/Jev_Star):
1. The engine turns structured state into a list of **candidate actions**.
2. A slow LLM planner (GPT-6 in the paper) keeps a **persistent strategic plan**. It can **filter** candidates or be added to the state.
3. Jev **picks** one candidate, and a local executor applies it.
4. Result: beat Lv7 SC2 AI. Cost per game was $3.71, of which **Jev was only $0.15**. The planner was the expensive part.

---

## 3. Open-source alternatives (free, local)

| Model | Base / size | License | Notes |
|---|---|---|---|
| **[Von](https://github.com/wfzyx/von)** | ModernBERT-Large, 395M, about 1.5 GB | Apache-2.0 | Claims to follow the same `/v1/systemone` protocol as Jev, so it should be a drop-in swap. About 18 ms on GPU; runs on CPU, CUDA, ROCm, MPS and OpenVINO. Reported ViZDoom results beat Jev (self-reported). v1.2 fixed option-order sensitivity (49.5% of answers flipped when options were reordered, now 0%). Python and TS SDKs: `von.decide / judge / rate / system_one`. |
| **[Laya](https://huggingface.co/convaiinnovations/laya-multilingual)** (Convai) | ModernBERT-large 421M (512-token context) / mmBERT 322M (1024 ctx) | Apache-2.0 | About 33–40 ms on a T4. Community ports exist for [ONNX](https://huggingface.co/receptron/laya-onnx), CoreML and MLX, plus a Dockerized Jev-compatible REST server (`wdonega/rest-laya`). **The short context is the main constraint**, so the board state has to be compact. |
| JevK5, Kev, Foq, NanoJev, … | various | mostly Apache-2.0 | See the GitHub topic [`jev-alternative`](https://github.com/topics/jev-alternative) |
| **notjev** (`9pings/notjev`) | wraps any OpenAI-compatible LLM | — | A Jev-style API in front of **any** LLM, for example a local Qwen through Ollama. It's slower but has a big context and can reason. Useful as the "planner" slot. |

**Why open weights matter here:** these models are BERT-sized classifiers, so **fine-tuning them on our own data is cheap** (one consumer GPU, hours rather than days). A Von or Laya model trained on thousands of human Lorcana decisions will almost certainly play better than a general-purpose Jev working zero-shot. Jev can't be fine-tuned.

---

## 4. What we already have in this repo

| Asset | Useful for | Gap |
|---|---|---|
| `simulator/lorcana_game_module.js` | Game loop, `generatePossibleMoves()`, `executeMove()`, `getGameState()`/`loadFromState()`. Already structured as engine → move list → pick, with a heuristic `makeAIMove()` as the baseline opponent. | Only vanilla stats, **no card abilities**, no singing, locations, shift or keywords. |
| `practice_dojo/` | Polished board renderer, full-state JSON snapshots (bookmarks and timelines), **duels.ink log and replay import** (Features 17/21/22). That gives real positions **and the move a human actually made next**. | A sandbox with no rules on purpose (dev guide §5: "the user is the referee"). Don't add a rules engine to it. |
| `utilities/unified_win_probability_utilities.js` | BCR/LVI/RDS card metrics that can add numbers to the state we feed the model, or act as a heuristic value function. | Heuristic only. |
| `allCards.json` / LorcanaJSON | Card text for the state serializer | — |

External engine: **TheCardGoat [`lorcana-simulator`](https://github.com/TheCardGoat/lorcana-simulator) / [`tcg-engines`](https://github.com/TheCardGoat/tcg-engines)** is TypeScript, implements the cards, has replay tooling, and keeps bot automations in `packages/lorcana/lorcana-engine/src/automation`. It is the obvious engine to evaluate first. InkStats (a HN "Show HN") and Inktable show that AI-vs-AI Lorcana is doable with "rules engine + heuristic eval + some lookahead".

---

## 5. Proposed architecture

```
┌────────────── Rules engine (headless, TS) ──────────────┐
│ state ──► legalMoves(state) ──► apply(state, move)      │
└───────┬───────────────────────────────▲─────────────────┘
        │ public state + own hand       │ chosen move
        ▼                               │
┌─ Serializer ─────────────────┐        │
│ compact text/JSON board       │        │
│ + each option annotated with  │        │
│   engine-computed results     │        │
│   ("banishes X, you survive,  │        │
│    +2 lore, 1 ink left")      │        │
└───────┬───────────────────────┘        │
        ▼                                │
┌─ Decision layer (pluggable) ──────────────────────────┐
│ L0 heuristic  (existing makeAIMove, baseline)         │
│ L1 Choice     (Jev / Von / Laya picks from ≤255)      │
│ L2 Lookahead  (simulate each option → Score board)    │
│ L3 + Planner  (LLM writes a turn plan, added to state)│
└───────┬────────────────────────────────────────────────┘
        ▼
┌─ Spectator UI (static page, reuse Dojo board look) ───┐
│ board, candidate list with probability bars,          │
│ confidence, chosen move, planner note, step/autoplay  │
└────────────────────────────────────────────────────────┘
```

### Key design rules
1. **The model never invents moves.** The engine lists them and the model picks one, so illegal plays are impossible.
2. **Do the arithmetic in the engine, not the model.** Classifier models are weak at counting damage, ink and lore. Write each option as its result: _"Challenge: your Mickey (4/3) → their Maleficent (3/4, 2◊, exerted). Maleficent banished, Mickey survives with 3 damage."_ This is the single biggest quality lever.
3. **Show only public information plus the bot's own hand.** Opponent hand and deck stay hidden. For lookahead, **determinize**: sample a plausible opponent hand from their decklist or remaining cards.
4. **Split decisions by type**, using the right primitive for each:
   - Mulligan → one **Noul** per card ("put this card back?")
   - Ink choice → **Choice** among inkable cards plus "don't ink"
   - Main action → **Choice** among all legal actions plus "pass"
   - Targets and "may" effects → **Choice** / **Noul**
   - Board evaluation → **Score** ("who is winning", 5–7 levels), used by L2
5. **Guard against option-order bias:** shuffle options and, for close calls, ask twice and average (Von 1.1 had heavy order sensitivity).
6. **Keep the state compact** (Laya only has 512–1024 tokens): card short IDs plus a few keywords, not full rules text. Put full text only on options that need it.

### Decision levels (build in this order)
- **L1: greedy Choice.** One call per action and about 15–40 calls per turn. With Jev that's under $0.01 per game, and free with Von. Plays legally and looks sensible, but has no lookahead.
- **L2: 1-ply lookahead.** For each candidate (usually 5–30), the engine applies it, then **Score** the resulting board. All boards go in one batched request, or as parallel local calls with Von. Still only cents per game. Candidates can be pruned with L1's probabilities first, which is a cheap version of AlphaZero's "policy prior + value", and can grow into a small MCTS later.
- **L3: planner.** Once per turn, an LLM (Claude, or a local model through notjev) reads the board and writes a two-line plan: _"Race: opponent is at 16, remove the 3-lore quester, don't overextend into a board wipe."_ The plan goes into the state for every Jev call that turn. This is JEV-Star's split, and the planner is where most of the cost goes.
- **L4: fine-tuned open model.** Train Von or Laya on _(state, legal options, move the human chose)_ taken from duels.ink replays and the Dojo's replay importer, plus self-play. This is where "a bot that plays like a good human" actually comes from.

---

## 6. Hosting on GitHub Pages (static site)

| Option | Cost | Notes |
|---|---|---|
| **Bring your own Jev key** (stored in localStorage, called from the browser) | about $0 | Simplest for a demo. The key is only exposed to its owner. Check that the API allows CORS. |
| Tiny proxy (Cloudflare Worker; Jev is also on Workers AI) | free tier | Hides the key, adds a rate limit, and makes the demo public. |
| **Von/Laya on localhost** (`von` server or `rest-laya` Docker) | free | Page calls `http://localhost:…`. Good for development and for fine-tuned models. |
| **Laya in the browser** (ONNX build + onnxruntime-web / transformers.js) | free | Needs no server at all, and is the most "GitHub Pages native" option. The trade-off is a 100–400 MB one-time model download (quantized). **Untested; needs a spike.** |

Every backend exposes the same `decide(state, questions)` call, so the UI can switch between them with a dropdown.

---

## 7. Phased plan

| Phase | Deliverable | Needs full engine? |
|---|---|---|
| **0. Engine spike** (1–2 days) | Run TheCardGoat's engine headless in Node. Confirm we can (a) load two decklists, (b) get `legalMoves` as data, (c) serialize and restore state. Decide between adopting that engine and extending `lorcana_game_module.js`. | — |
| **1. "What would the bot do?" puzzles** | Static page that loads a Dojo bookmark or duels.ink replay position, generates candidate moves (engine or a hand-written list), asks Jev/Von, and shows the probability bars. For replay positions it also shows **what the human actually did**. This is a great visual demo, and it's our evaluation set. | No |
| **2. Bot vs bot spectator** | Full games using the engine plus L1, with autoplay, step-through and move-by-move probabilities, rendered in the Dojo look. Baseline: L1 against the existing heuristic `makeAIMove()`. | Yes |
| **3. Stronger play** | L2 lookahead and L3 planner. Measure win rate over hundreds of self-play games per level. | Yes |
| **4. Train our own** | Export the replay dataset and fine-tune Von/Laya. Measure match rate with human moves plus win rate against L1/L2. Optionally run it in the browser. | Yes |

**Metrics:** move legality (should be 100% by construction), agreement with human moves on held-out replays (top-1 / top-3), win rate against the heuristic bot and between bot levels, cost per game, and latency per decision.

---

## 8. Risks and open questions

- **Rules engine coverage** is the long pole. Card-ability automation is thousands of cards' worth of work, so we should use an engine that has done it rather than write our own.
- **Jev is 2 weeks old:** early access, dynamic rate limits, and the API may change. Several claims above come from third-party blogs. Von's and Laya's benchmarks are self-reported.
- **Zero-shot strength will be modest.** Expect "reasonable-looking", not "competitive". Strength comes from lookahead (L2) and fine-tuning (L4).
- **Hidden information** makes lookahead approximate, since it needs determinization.
- **Licensing and IP:** card text and art are Disney/Ravensburger. Keep it unofficial and non-commercial like the rest of the site. Check the external engine's license before vendoring it.

---

## Sources
- TypeSafe: [Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev), [docs](https://docs.typesafe.ai/introduction), [Cloudflare model page](https://developers.cloudflare.com/ai/models/typesafe/jev/), [Pydantic AI docs](https://pydantic.dev/docs/ai/models/typesafe/)
- Coverage: [DigitalOcean: What is Jev](https://www.digitalocean.com/resources/articles/what-is-jev), [The Register: Doom demo](https://www.theregister.com/ai-and-ml/2026/09/16/typesafe-ai-debuts-model-for-machines-that-plays-doom/5296711), [MindStudio: game demos](https://www.mindstudio.ai/blog/jev-real-time-game-demos), [Jev limits](https://www.layer3labs.io/guides/jev-limits), [Jev pricing](https://www.layer3labs.io/guides/jev-pricing), [Failproof model card](https://befailproof.ai/jev/jev-model-card/)
- JEV-Star: [arXiv 2609.27331](https://arxiv.org/abs/2609.27331), [code](https://github.com/sc2musa/Jev_Star)
- Open alternatives: [Von](https://github.com/wfzyx/von), [Laya (HF)](https://huggingface.co/convaiinnovations/laya-multilingual), [Laya ONNX](https://huggingface.co/receptron/laya-onnx), [Laya benchmarked honestly](https://flowtivity.ai/blog/laya-open-source-jev-alternative/), [jev-alternative topic](https://github.com/topics/jev-alternative), [DataCamp: top open-source Jev alternatives](https://www.datacamp.com/blog/top-open-source-jev-alternatives)
- Lorcana engines: [TheCardGoat/lorcana-simulator](https://github.com/TheCardGoat/lorcana-simulator), [TheCardGoat/tcg-engines](https://github.com/TheCardGoat/tcg-engines), [ngroover/lorcana](https://github.com/ngroover/lorcana), [InkStats (HN)](https://news.ycombinator.com/item?id=46146334), [Inktable](https://www.wargamer.com/disney-lorcana/inktable), [LorcanaJSON](https://github.com/LorcanaJSON/LorcanaJSON)
