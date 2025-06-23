

# **The Unified Win Probability Model (UWPM): A Quantitative Framework for Predicting Disney Lorcana Matchups**

## **Section 1: Deconstructing the Engine: Quantifying a Deck's Intrinsic Capabilities**

To construct a predictive model for matchup outcomes in the Disney Lorcana Trading Card Game (TCG), it is first necessary to establish a robust, quantitative method for evaluating the intrinsic potential of a single 60-card deck. This initial analysis operates in a vacuum, abstracting away the opponent to measure the raw power and consistency of a deck's core strategy. This is achieved by deconstructing each card into its fundamental strategic functions and aggregating these into three core scores: Resource Dominance, Lore Velocity, and Board Control. This approach moves beyond subjective card evaluation to a holistic, data-driven assessment of a deck's engine.

### **1.1 Resource Dominance Score (RDS): Quantifying Ink and Card Advantage**

The Resource Dominance Score (RDS) measures a deck's capacity to control and leverage the two most critical non-lore resources in Lorcana: ink in the inkwell (the game's mana system) and cards in hand (strategic options).1 A superior RDS signifies a deck's ability to execute its game plan more consistently and powerfully than its opponent by playing more cards, higher-cost cards, or by depleting the opponent's options. The RDS is a composite of four key metrics.

* **Card Advantage Generation (CAG):** This component quantifies a deck's ability to increase its available options beyond the standard one-card-per-turn draw. Effects contributing to CAG include direct card draw (Card Effect: Draw), recursion of spent resources from the discard pile (Card Effect: Discard to Hand, Play: From Discard), and effects that improve card quality through filtering or tutoring (Card Effect: Look at Deck, Card Effect: Deck to Hand/Bottom).3 The value of each effect is weighted by its ink efficiency; for example, a 3-cost action that draws two cards is assigned a higher CAG value than a 5-cost action with the same effect, reflecting its superior tempo.4 Amethyst and Amber are inks noted for their strong card draw capabilities.5  
* **Card Advantage Denial (CAD):** Conversely, this metric scores a deck's ability to diminish an opponent's resources. The primary mechanism for this is forced hand discard (Card Effect: Opponent Discards).3 Decks with a high CAD score, typically featuring the Emerald ink, aim to win by exhausting the opponent's ability to respond to threats.7  
* **Ink Acceleration (IA):** This metric measures a deck's capacity to generate ink faster than the standard rate of one card per turn. A higher IA allows a deck to play its expensive, powerful cards ahead of the typical game curve. This includes direct "ramp" effects that place additional cards into the inkwell (Card Effect: Hand to Inkwell, Static: Extra Ink) and pseudo-ramp effects that achieve a similar outcome through cost reduction (Stat: Cost Reduction, Play: Cheaper, Keyword: Shift).3 The Sapphire ink is the preeminent color for this strategy.7  
* **Consistency & The "Uninkable Burden" (UB):** A deck's potential is meaningless if it cannot be consistently realized. A critical negative modifier, the Uninkable Burden, is applied to the RDS to quantify this risk. The fundamental action of the early game is to play a card into the inkwell each turn to stay "on curve".12 Cards that lack the inkwell symbol cannot be used for this purpose, making them a potential liability in the opening hand.15 A high concentration of these "uninkable" cards, particularly those with high ink costs, dramatically increases the probability of a "bricked" hand, where a player is unable to develop their resources and falls fatally behind on tempo.6 This risk is not uniform; an uninkable 7-cost card is a greater burden than an uninkable 1-cost card because it can remain unplayable in hand for many more turns. Therefore, the Uninkable Burden is calculated as a weighted sum for all cards in the deck,  
  UB \= Σ (Cost\_i \* IsUninkable\_i), which acts as a penalty to the deck's final RDS. This transforms a qualitative deck-building guideline into a quantifiable risk factor.

### **1.2 Lore Velocity Index (LVI): Measuring the "Time to Win"**

The primary win condition in Lorcana is to be the first player to accumulate 20 lore.18 The Lore Velocity Index (LVI) is a metric designed to calculate a deck's theoretical speed in achieving this goal. It serves as a proxy for the deck's "clock"—the number of turns it would need to win in a non-interactive scenario. A high LVI is the defining characteristic of aggressive (Aggro) archetypes.

* **Base Lore Potential (BLP):** This is the foundational component of the LVI, calculated as the sum of the lore values (the diamond symbols on a character card) for all characters in the deck. This sum is weighted by each character's ink cost, such that low-cost characters with high lore values—the cornerstone of Aggro strategies—contribute most significantly to the score.21  
* **Lore Survivability Modifier (LSM):** A character's lore potential is only realized if it survives to quest, often multiple times. The LSM is a multiplier applied to a character's lore value based on its durability. This modifier is derived from its Willpower stat (the shield symbol) and any defensive keywords it possesses.12 Keywords such as  
  **Resist** (which reduces incoming damage), **Ward** (which prevents the character from being chosen by opponent's abilities), and **Bodyguard** (which forces opponents to challenge it before other characters) all increase a character's LSM, making it a more reliable source of lore over time.23  
* **Quest Safety Modifier (QSM):** This multiplier is applied to characters that can quest with a reduced risk of being removed via a challenge. The **Evasive** keyword is the most prominent contributor, as it restricts challenges to only other characters with Evasive, significantly shrinking the pool of potential threats.23 Cards with abilities that state they "cannot be challenged" receive the highest possible QSM.3  
* **Direct Lore Manipulation (DLM):** Some cards can affect the lore totals directly, bypassing the need for characters to quest. This component adds a score for effects that cause a player to gain lore (Lore: Gain) or an opponent to lose lore (Lore: Lose).3 This mechanic is a notable feature of the Ruby ink.5

### **1.3 Board Control Rating (BCR): Assessing Disruptive Power**

The Board Control Rating (BCR) quantifies a deck's ability to interact with and disrupt the opponent's board state. A high BCR indicates a deck designed to slow the opponent's LVI, protect its own threats, and ultimately control the flow of the game. This is the hallmark of Control archetypes.21

* **Removal Efficiency (RE):** This metric scores the cost-effectiveness of a deck's removal tools. An effect's RE score is based on its ink cost relative to the ink cost of the threats it can neutralize. For instance, a 3-cost action that can banish any character regardless of cost is more efficient than a 5-cost character that must challenge to achieve the same result.4 This score accounts for all forms of removal, including direct banishment (  
  Banish: Chosen Target), damage-based removal (Damage: Deal to One), and temporary removal like "bounce" effects that return a character to its owner's hand (Bounce: Opposing Character).3 The Ruby and Steel inks are recognized as the premier colors for efficient removal.28  
* **Removal Versatility (RV):** This component scores the flexibility of a deck's removal suite. "Board wipe" effects that banish all characters simultaneously (Banish: All Characters) are highly versatile and receive a substantial RV score.28 Similarly, effects that can target not only characters but also items and locations are rated higher than more restrictive options.  
* **Proactive Control (PC):** This metric scores cards that allow a player to exert control on the same turn they are played, generating a significant tempo advantage. The primary source of PC is characters with the **Rush** keyword, which allows them to challenge the turn they enter play, thereby developing one's own board while simultaneously removing an opponent's threat.4

#### **Table 1: Card Ability Functional Scoring Matrix**

To ensure the reproducibility and transparency of this model, the scoring of individual cards is based on a foundational data dictionary. This matrix maps the card ability patterns identified through textual analysis to their corresponding quantitative values within the UWPM's core metrics. The values presented are illustrative; final weights are determined through model validation.

| Ability Pattern / Keyword 3 | Metric Affected | Scoring Formula / Multiplier | Rationale |
| :---- | :---- | :---- | :---- |
| Gain (\\d+) ◊ | DLM | \+ (d \* 1.0) | Direct lore gain is a primary path to victory. |
| Draw (\\d+) card(s?) | CAG | \+ (d \* (2 / Cost)) | Card draw is vital; efficiency (value per ink cost) is paramount. |
| Opponent discards (\\d+) card(s?) | CAD | \+ (d \* 0.8) | Hand disruption is a powerful form of resource denial. |
| Put a card from your hand into your inkwell | IA | \+ 1.5 | Accelerates resource development beyond the standard rate. |
| Stat: Cost Reduction (\\d+) | IA | \+ (d \* 0.7) | Acts as pseudo-ramp by increasing ink efficiency for future plays. |
| Banish chosen character | RE, RV | RE: (7 / Cost), RV: \+0.5 | Efficiently removes a threat. Versatility score is moderate (character only). |
| Banish all characters | RE, RV | RE: (10 / Cost), RV: \+2.0 | Highest impact removal, resets the entire board. High versatility. |
| Keyword: Evasive | QSM | Multiplier: 1.5 | Significantly reduces the number of valid challengers, making questing safer. |
| Keyword: Ward | LSM | Multiplier: 1.4 | Protects from targeted abilities, increasing survivability and questing turns. |
| Keyword: Resist \+(\\d+) | LSM | Multiplier: 1 \+ (d \* 0.2) | Mitigates damage, making the character harder to remove via challenges. |
| Keyword: Rush | PC | \+ (Strength \* 0.5) | Enables immediate board interaction, providing proactive control and tempo. |
| Uninkable Card | RDS (UB) | Penalty: \- (Cost \* 0.25) | Quantifies the risk of inconsistency and inability to contribute to the inkwell. |

---

## **Section 2: The Duelist's Dance: Modeling Matchup-Specific Dynamics**

While a deck's intrinsic scores (RDS, LVI, BCR) provide a static measure of its potential, a TCG match is a dynamic interaction. A deck's performance is critically dependent on the specific strategy it faces. This section transitions from analyzing decks in isolation to modeling the direct, reciprocal dynamics between two opposing decks, accounting for the well-established "rock-paper-scissors" nature of competitive card games.30

### **2.1 The Archetype Interaction Modifier (AIM): Establishing a Strategic Baseline**

The Archetype Interaction Modifier (AIM) establishes a foundational advantage or disadvantage based on the high-level strategic matchup. Classic TCG theory posits a cyclical relationship where aggressive decks (Aggro) are favored against slow-starting decks, control decks (Control) are favored against aggressive decks they can stabilize against, and midrange decks (Midrange) leverage flexibility to prey on control while holding their own against aggression.22

Rather than relying on rigid, subjective labels, a deck's archetype can be quantified along a "Tempo-Value" spectrum. This concept stems from the fundamental TCG conflict between "Tempo"—proactive, mana-efficient plays that seize board initiative—and "Value"—actions that generate resource advantage (like card draw) for long-term dominance.4 In Lorcana, Aggro decks are pure Tempo, defined by high LVI and low average ink cost. Control decks are pure Value, defined by high BCR, high RDS, and a higher average ink cost. Midrange decks seek a balance between the two.21

A deck's position on this spectrum can be calculated as a Tempo-Value Score (TVS) using its intrinsic metrics: TVS \= (w\_lvi \* LVI) \+ (w\_curve \* (1 / Avg\_Ink\_Cost)) \- (w\_rds \* RDS). A deck with a high TVS is tempo-oriented, while a deck with a low (or negative) TVS is value-oriented. The AIM is then calculated not from a simple lookup table, but as a continuous function of the difference between the two decks' scores: AIM \= f(TVS\_A \- TVS\_B). This allows for more granular predictions, recognizing that a "hyper-aggro" deck has a greater inherent advantage against a slow control deck than a "tempo-midrange" deck would.

#### **Table 2: Archetype Interaction Modifier (AIM) Baseline Values**

This table illustrates the classic, high-level strategic relationships that inform the AIM calculation. These values represent the baseline interaction before more granular analyses are applied. Archetypes are determined by the primary intrinsic score (LVI for Aggro, BCR for Control, balanced for Midrange, IA for Ramp).21

| Deck A → | vs. Aggro | vs. Midrange | vs. Control | vs. Ramp |
| :---- | :---- | :---- | :---- | :---- |
| **Aggro** | 0.0 | \-0.1 | \-0.2 | \+0.2 |
| **Midrange** | \+0.1 | 0.0 | \-0.1 | \+0.1 |
| **Control** | \+0.2 | \+0.1 | 0.0 | \-0.1 |
| **Ramp** | \-0.2 | \-0.1 | \+0.1 | 0.0 |

### **2.2 Tempo Flow Analysis (TFA): The Battle of the Ink Curves**

This analysis moves beyond a static average cost to model the turn-by-turn flow of the game. It directly compares the two decks' ink curves to predict which player is more likely to be the "beatdown"—the proactive player dictating the pace of the game—at critical stages.27 The game is divided into three phases: Early Game (Turns 1-3), Mid Game (Turns 4-6), and Late Game (Turns 7+).

For each phase, the model compares the quantity and power of threats each deck can deploy, based on the number of cards it has at the corresponding ink costs.14 The deck that can more consistently "curve out" by playing impactful cards on each turn of a phase gains a positive TFA score for that phase. The overall TFA score is a weighted sum, recognizing that establishing control of the board in the mid-game is often the most critical turning point in Lorcana.

### **2.3 Threat-Answer Efficiency Score (TAES): The Decisive Interaction**

The Threat-Answer Efficiency Score (TAES) is the most granular and arguably most important matchup-specific metric. It moves beyond aggregate scores to model the specific, decisive interactions between one deck's core threats and the other's answers.

The model first identifies each deck's primary threats (characters with the highest LVI scores, or essential combo pieces like Ariel \- Whoseit Collector in an OTK shell 21) and its primary answers (the most efficient and versatile components of its BCR). It then calculates an efficiency score for each potential interaction. This codifies the principle of "trading up," where a player uses a lower-cost card to remove a higher-cost threat, gaining a significant tempo and resource advantage.27

This analysis reveals the intransitive nature of TCG matchups. A simple comparison of aggregate scores like BCR vs. LVI is a transitive relationship (if A \> B and B \> C, then A \> C), which fails to capture the "rock-paper-scissors" reality of the metagame.30 Intransitivity arises from specific keyword interactions. For example, the

**Ward** keyword is immensely powerful, protecting a character from being chosen by abilities.23 Against a Steel deck relying on targeted removal like

Fire the Cannons, a character with **Ward** may be nearly invincible. However, against a Ruby deck using the non-targeting board wipe Be Prepared, the **Ward** keyword is completely irrelevant.25

To model this, the TAES calculation uses an interaction sub-matrix. Instead of a simple subtraction, it computes InteractionValue(Threat\_Keyword, Answer\_Type). For instance, InteractionValue(Ward, Targeted\_Action) yields a high positive score for the threat's deck, while InteractionValue(Ward, Non-Targeted\_Action) yields a score of zero. Likewise, InteractionValue(Evasive, Non-Evasive\_Challenger) results in a high score for the Evasive character's deck. This granular, keyword-aware approach is essential for accurately modeling the non-linear dynamics of high-level Lorcana play.

---

## **Section 3: Synthesizing the Model: The UWPM Formula**

This section integrates the static intrinsic scores and dynamic matchup modifiers into a single, predictive equation. The final output is a clear, actionable win probability percentage for a given matchup.

### **3.1 Component Weighting and the Master Equation**

The Unified Win Probability Model combines the calculated scores into a weighted linear equation. The result, the Matchup Score, represents the predicted overall advantage of Deck A over Deck B in a head-to-head contest.

The proposed master equation is:

Matchup Score(A vs B)=wrds​⋅(RDSA​−RDSB​)+wlvi​⋅(LVIA​−LVIB​)+wbcr​⋅(BCRA​−BCRB​)+waim​⋅AIMAB​+wtfa​⋅TFAAB​+wtaes​⋅TAESAB​  
The weights (w) for each component are critical parameters. Initial values are proposed based on an expert synthesis of TCG principles and Lorcana's specific design. Given that Lorcana is fundamentally a "race to 20 lore" 20, the components that most directly influence this race—the Lore Velocity Index (LVI) and the Board Control Rating (BCR, which serves to inhibit the opponent's LVI)—are assigned higher initial weights. The Threat-Answer Efficiency Score (TAES) is also heavily weighted, as it represents the most direct and decisive interactions in the matchup. These weights are the primary parameters to be tuned and optimized during the model validation phase.31

### **3.2 From Score to Probability: The Logistic Conversion**

While the Matchup Score provides a measure of relative advantage, it is not an intuitive value for end-users. To convert this score into a win probability, the model employs a logistic function. This is a standard and academically supported method for transforming a continuous input into a probability value for a binary outcome (win/loss).38

The conversion formula is:

Win Probability (A)=1+e−k⋅Matchup Score1​  
The parameter k is a scaling factor that controls the steepness of the logistic curve. It determines how sensitive the win probability is to the Matchup Score. A higher k value implies a more deterministic game where a small advantage leads to a high win probability. A lower k value suggests a game with more variance, where upsets are more common. This parameter, like the component weights, is refined during the validation process using empirical data.

#### **Table 3: UWPM Walkthrough for a Tier 1 Matchup (Amber/Steel Steelsong vs. Ruby/Sapphire Pawpsicle)**

To demonstrate the model's application, this table provides a step-by-step calculation for a prominent metagame matchup documented in tournament reports.9 This serves as a concrete template for applying the UWPM to any pair of decks. (Note: Scores are illustrative examples for this walkthrough).

| Metric | Deck A (Steelsong) | Deck B (Pawpsicle) | Difference/Modifier | Weight (w) | Contribution |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **RDS** | 12.5 | 15.0 | \-2.5 | 0.15 | \-0.375 |
| **LVI** | 18.0 | 14.0 | \+4.0 | 0.25 | \+1.000 |
| **BCR** | 11.0 | 17.5 | \-6.5 | 0.25 | \-1.625 |
| **AIM** | N/A | N/A | \-0.1 (Midrange vs Control) | 1.0 | \-0.100 |
| **TFA** | N/A | N/A | \+0.5 (Steelsong stronger early) | 1.0 | \+0.500 |
| **TAES** | N/A | N/A | \-0.8 (Be Prepared answers board) | 1.0 | \-0.800 |
| **Total Matchup Score** |  |  |  |  | **\-1.400** |
| **Win Probability (A)** |  |  |  |  | **30%** |
| **Win Probability (B)** |  |  |  |  | **70%** |

In this illustrative example, Steelsong's higher lore velocity is outweighed by Pawpsicle's superior resource engine (RDS) and board control (BCR), particularly the efficient answer of Be Prepared captured in the TAES. The final matchup score of \-1.400 for Deck A translates, via the logistic function, to a predicted 30% win probability for Amber/Steel Steelsong against this specific Ruby/Sapphire Pawpsicle build.

---

## **Section 4: Validation, Application, and Future Horizons**

A theoretical model, however well-reasoned, must be validated against empirical evidence to be considered a useful analytical tool. This final section discusses the methodology for validating and refining the UWPM, its practical applications for players and analysts, its inherent limitations, and its potential evolution into more advanced predictive systems.

### **4.1 Back-testing, Validation, and Refinement**

The credibility of the UWPM rests on its predictive accuracy. A rigorous validation process is essential to tune the model's parameters and confirm its utility.

* **Methodology:** The validation process involves several key steps:  
  1. **Data Collection:** A large dataset of competitive match results must be compiled. Sources for this data include online tournament platforms and community-driven databases like Lorcana.gg, TCGplayer, and InkDecks, which archive tournament decklists and final standings.9  
  2. **Prediction:** For each matchup in the dataset where both decklists are known, the UWPM is used to generate a predicted win probability.  
  3. **Comparison:** The model's predicted probabilities are compared against the actual binary match outcomes (Win/Loss).  
  4. **Refinement:** Statistical techniques, such as logistic regression or gradient descent, are employed to systematically adjust the component weights (wrds​, wlvi​, etc.) and the logistic scaling factor (k). The goal of this iterative process is to minimize the aggregate error (e.g., using a loss function like cross-entropy) between the model's predictions and the real-world results. This data-driven refinement elevates the UWPM from a heuristic framework to a statistically-grounded predictive tool.31

### **4.2 Strategic Application for Players and Analysts**

Once validated, the UWPM becomes a powerful tool for strategic decision-making at all levels of play.

* **Deck Building and Tuning:** A player developing a new deck can run it through the model against established meta archetypes. A consistently low TAES against a top-tier deck might reveal a critical weakness, suggesting the need for different types of removal or more resilient threats. A low RDS could indicate a need for more card draw to avoid running out of resources in the late game.  
* **Metagame Analysis:** By running the UWPM on all major archetypes in the current metagame, an analyst can generate a predicted win-rate matrix. This matrix can identify dominant decks, favorable matchups ("good counters"), and potential shifts in the meta. For example, it could predict the rise of a new archetype that has a strong matchup against the current top deck, anticipating meta evolution before it becomes widely apparent.9  
* **In-Game Decision Making:** A player's understanding of the matchup-specific scores can inform crucial in-game choices. Knowing that their deck has a significantly higher LVI while the opponent has a higher BCR helps in correctly identifying their role as the "beatdown" or "control" player. This understanding is fundamental to making correct decisions about when to quest aggressively versus when to challenge and control the board.27

### **4.3 Acknowledging Chaos: The Unquantifiable Factors**

To maintain intellectual honesty, it is crucial to acknowledge the factors that lie beyond the scope of this deterministic model.

* **Player Skill:** The UWPM is a model of *decks*, not of *players*. It calculates the inherent potential of the 120 cards involved in a match. It does not account for the vast difference in player skill. A highly skilled player can overcome a disadvantageous matchup through superior sequencing, resource management, risk assessment, and bluffing, while a less experienced player can easily squander a favorable position.45  
* **Randomness of the Draw:** The model operates on the assumption that all cards in a deck are available. It cannot predict the specific outcome of the initial seven-card hand, the subsequent mulligan decisions 15, or the sequence of cards drawn throughout the game. A deck with a favorable matchup on paper can still lose due to "bricking"—failing to draw necessary inkable cards or key strategic pieces at the right time.

### **4.4 Advanced Frontiers: The Path to Machine Learning**

The UWPM, while powerful, represents a feature-engineered approach to prediction. It serves as an ideal foundation for more advanced machine learning models, aligning with directions explored in academic TCG research.

* **Integrating Player Skill:** With access to player-specific data, individual skill ratings (such as Elo) could be incorporated as a new variable in the master equation. The formula could be augmented to P(Win) \= Logistic(Matchup\_Score \+ w\_{elo} \* (Elo\_A \- Elo\_B)), allowing the model to adjust its baseline deck prediction based on the skill differential between the two players.38  
* **Neural Network Evolution:** The metrics developed for the UWPM (RDS, LVI, BCR, etc.) provide a perfectly structured input layer for a neural network. Given a massive dataset of games, such as those from an online client like Pixelborn, a neural network could learn the complex, non-linear relationships between card interactions and win outcomes. It could potentially discover optimal weightings and identify subtle synergies that are not intuitive to human analysts, pushing the boundaries of predictive accuracy in the TCG space.38 The UWPM provides the critical domain knowledge and feature engineering that make such a sophisticated model feasible.

#### **Works cited**

1. Lorcana Resource Theory: Card Advantage, Ink Advantage, And Lore Advantage | TCGplayer Infinite, accessed on June 23, 2025, [https://infinite.tcgplayer.com/article/Lorcana-Resource-Theory-Card-Advantage-Ink-Advantage-And-Lore-Advantage/81aec220-b938-4e8d-b0ea-f2d7b46c168b/](https://infinite.tcgplayer.com/article/Lorcana-Resource-Theory-Card-Advantage-Ink-Advantage-And-Lore-Advantage/81aec220-b938-4e8d-b0ea-f2d7b46c168b/)  
2. Disney Lorcana Cards \- Rarity, Types, Ink, Glimmers, & Lore \- Screen Rant, accessed on June 23, 2025, [https://screenrant.com/disney-lorcana-cards-rarity-types-ink-glimmers-lore/](https://screenrant.com/disney-lorcana-cards-rarity-types-ink-glimmers-lore/)  
3. lorcana\_patterns.txt  
4. TCG 101: Tempo and the Curve \- YouTube, accessed on June 23, 2025, [https://www.youtube.com/watch?v=h4rfc9K9GpY](https://www.youtube.com/watch?v=h4rfc9K9GpY)  
5. Lorcana Ink Profiles \- Lorcania, accessed on June 23, 2025, [https://lorcania.com/articles/lorcana-ink-profiles](https://lorcania.com/articles/lorcana-ink-profiles)  
6. Card advantage/draw options per ink color? : r/Lorcana \- Reddit, accessed on June 23, 2025, [https://www.reddit.com/r/Lorcana/comments/1le9ei7/card\_advantagedraw\_options\_per\_ink\_color/](https://www.reddit.com/r/Lorcana/comments/1le9ei7/card_advantagedraw_options_per_ink_color/)  
7. Every Disney Lorcana ink type explained \- Wargamer, accessed on June 23, 2025, [https://www.wargamer.com/disney-lorcana/colors](https://www.wargamer.com/disney-lorcana/colors)  
8. Aggro, Midrange, Control and Sub-Archetypes in Disney Lorcana \- YouTube, accessed on June 23, 2025, [https://www.youtube.com/watch?v=3mRAddzlNvs](https://www.youtube.com/watch?v=3mRAddzlNvs)  
9. Disney Lorcana Meta Tier List: Early Reign of Jafar Metagame Report, accessed on June 23, 2025, [https://lorcana.gg/disney-lorcana-meta-tier-list-early-reign-of-jafar-metagame-report/](https://lorcana.gg/disney-lorcana-meta-tier-list-early-reign-of-jafar-metagame-report/)  
10. How to Build a Competitive MTG Deck Part Two: Tempo \- Bolt the Bird, accessed on June 23, 2025, [https://boltthebirdmtg.com/how-to-build-a-competitive-mtg-deck-part-two-tempo/](https://boltthebirdmtg.com/how-to-build-a-competitive-mtg-deck-part-two-tempo/)  
11. Deckbuilding Guide \- Lorcana Grimoire, accessed on June 23, 2025, [https://lorcanagrimoire.com/pages/how-to-play/deckbuilding-guide/](https://lorcanagrimoire.com/pages/how-to-play/deckbuilding-guide/)  
12. How to Play Disney Lorcana: Rules, Mechanics, Winning, and More\! \- TCGplayer, accessed on June 23, 2025, [https://www.tcgplayer.com/content/article/How-to-Play-Disney-Lorcana-Rules-Mechanics-Winning-and-More/fe2cfafc-7d0c-4b73-973c-2d5c7340b0a1/](https://www.tcgplayer.com/content/article/How-to-Play-Disney-Lorcana-Rules-Mechanics-Winning-and-More/fe2cfafc-7d0c-4b73-973c-2d5c7340b0a1/)  
13. Quick Start Guide \- Lorcana Portal, accessed on June 23, 2025, [https://lorcanaportal.com/how-to-play/](https://lorcanaportal.com/how-to-play/)  
14. Mastering Ink and Curve in Lorcana | Article by Stefen Delgado \- CoolStuffInc.com, accessed on June 23, 2025, [https://www.coolstuffinc.com/a/stefendelgado-seo-06172025-mastering-ink-and-curve-in-lorcana](https://www.coolstuffinc.com/a/stefendelgado-seo-06172025-mastering-ink-and-curve-in-lorcana)  
15. The Complete Guide On How to Play Lorcana \- Like a Pro, accessed on June 23, 2025, [https://lorcanacollectors.com/how-to-play-lorcana/](https://lorcanacollectors.com/how-to-play-lorcana/)  
16. Disney Lorcana – How To Build A Deck \- Game Rant, accessed on June 23, 2025, [https://gamerant.com/disney-lorcana-how-build-deck-best/](https://gamerant.com/disney-lorcana-how-build-deck-best/)  
17. A short guide for beginners on deck building and gameplay : r/Lorcana \- Reddit, accessed on June 23, 2025, [https://www.reddit.com/r/Lorcana/comments/1kpi7pc/a\_short\_guide\_for\_beginners\_on\_deck\_building\_and/](https://www.reddit.com/r/Lorcana/comments/1kpi7pc/a_short_guide_for_beginners_on_deck_building_and/)  
18. lorcanacollectors.com, accessed on June 23, 2025, [https://lorcanacollectors.com/lorcana-tcg-deck-building-tips-and-limitations/\#:\~:text=There%20are%202%20ways%20to,to%20draw%20from%20their%20deck.](https://lorcanacollectors.com/lorcana-tcg-deck-building-tips-and-limitations/#:~:text=There%20are%202%20ways%20to,to%20draw%20from%20their%20deck.)  
19. Game \- Mushu Report (Lorcana Wiki), accessed on June 23, 2025, [https://wiki.mushureport.com/wiki/Game](https://wiki.mushureport.com/wiki/Game)  
20. Disney Lorcana's Ryan Miller Discusses Some of The Game's Highlights, accessed on June 23, 2025, [https://gamerant.com/disney-lorcana-ryan-miller-highlights-singing-win-condition/](https://gamerant.com/disney-lorcana-ryan-miller-highlights-singing-win-condition/)  
21. A Basic Overview of Archetypes in TCGs : r/Lorcana \- Reddit, accessed on June 23, 2025, [https://www.reddit.com/r/Lorcana/comments/16dfhcl/a\_basic\_overview\_of\_archetypes\_in\_tcgs/](https://www.reddit.com/r/Lorcana/comments/16dfhcl/a_basic_overview_of_archetypes_in_tcgs/)  
22. The Language Of Lorcana: Aggro, Midrange, And Control | TCGplayer, accessed on June 23, 2025, [https://www.tcgplayer.com/content/article/The-Language-Of-Lorcana-Aggro-Midrange-And-Control/b3d8b52f-ef1f-43e3-bbcc-ec4e48a84ba0/](https://www.tcgplayer.com/content/article/The-Language-Of-Lorcana-Aggro-Midrange-And-Control/b3d8b52f-ef1f-43e3-bbcc-ec4e48a84ba0/)  
23. Disney Lorcana Trading Card Game Keywords \- Beckett News, accessed on June 23, 2025, [https://www.beckett.com/news/disney-lorcana-trading-card-game-keywords/](https://www.beckett.com/news/disney-lorcana-trading-card-game-keywords/)  
24. Disney Lorcana keywords and what they mean \- Wargamer, accessed on June 23, 2025, [https://www.wargamer.com/disney-lorcana/keywords](https://www.wargamer.com/disney-lorcana/keywords)  
25. Deciphering Disney Lorcana Keywords for Strategic Play \- Magic Madhouse, accessed on June 23, 2025, [https://magicmadhouse.co.uk/deciphering-disney-lorcana-keywords-for-strategic-play](https://magicmadhouse.co.uk/deciphering-disney-lorcana-keywords-for-strategic-play)  
26. Limited Formats in Lorcana: How to play Booster Draft and Sealed Deck \- Ultimate Guard, accessed on June 23, 2025, [https://ultimateguard.com/en/blog/limited-formats-lorcana-how-to-play-booster-draft-sealed-deck](https://ultimateguard.com/en/blog/limited-formats-lorcana-how-to-play-booster-draft-sealed-deck)  
27. Intermediate Tips for Getting Good at Lorcana (How to Win Every Game), accessed on June 23, 2025, [https://cardboardchampions.co.uk/how-to-win-lorcana-intermediate-tips/](https://cardboardchampions.co.uk/how-to-win-lorcana-intermediate-tips/)  
28. Anyone else feel removal is a must? : r/Lorcana \- Reddit, accessed on June 23, 2025, [https://www.reddit.com/r/Lorcana/comments/15gcq5q/anyone\_else\_feel\_removal\_is\_a\_must/](https://www.reddit.com/r/Lorcana/comments/15gcq5q/anyone_else_feel_removal_is_a_must/)  
29. The Best Removal in each Ink Color. What are they? : r/Lorcana \- Reddit, accessed on June 23, 2025, [https://www.reddit.com/r/Lorcana/comments/1b6nlro/the\_best\_removal\_in\_each\_ink\_color\_what\_are\_they/](https://www.reddit.com/r/Lorcana/comments/1b6nlro/the_best_removal_in_each_ink_color_what_are_they/)  
30. Video Game Balance: A Definitive Guide \- Game Design Skills, accessed on June 23, 2025, [https://gamedesignskills.com/game-design/game-balance/](https://gamedesignskills.com/game-design/game-balance/)  
31. Balancing a card game : r/gamedesign \- Reddit, accessed on June 23, 2025, [https://www.reddit.com/r/gamedesign/comments/cmpc9a/balancing\_a\_card\_game/](https://www.reddit.com/r/gamedesign/comments/cmpc9a/balancing_a_card_game/)  
32. What is Tempo in MTG? \- TCGplayer, accessed on June 23, 2025, [https://www.tcgplayer.com/content/article/What-is-Tempo-in-MTG/02b5e3a5-33f2-408f-9771-c8895ee01b8e/](https://www.tcgplayer.com/content/article/What-is-Tempo-in-MTG/02b5e3a5-33f2-408f-9771-c8895ee01b8e/)  
33. Tempo \- Magic: The Gathering \- Wizards of the Coast, accessed on June 23, 2025, [https://magic.wizards.com/en/news/feature/tempo-2014-09-22](https://magic.wizards.com/en/news/feature/tempo-2014-09-22)  
34. Please define play styles : r/Lorcana \- Reddit, accessed on June 23, 2025, [https://www.reddit.com/r/Lorcana/comments/1fsxvu7/please\_define\_play\_styles/](https://www.reddit.com/r/Lorcana/comments/1fsxvu7/please_define_play_styles/)  
35. 10 Simple Guidelines To Improve Your Combat Decisions In Lorcana \- TCGplayer, accessed on June 23, 2025, [https://www.tcgplayer.com/content/article/10-Simple-Guidelines-To-Improve-Your-Combat-Decisions-In-Lorcana/b19aa7cf-8bbd-48b4-b098-c6d5c7ade85f/](https://www.tcgplayer.com/content/article/10-Simple-Guidelines-To-Improve-Your-Combat-Decisions-In-Lorcana/b19aa7cf-8bbd-48b4-b098-c6d5c7ade85f/)  
36. Please Explain the "Cost Curve" that is beside every deck list on Dreamborn : r/Lorcana, accessed on June 23, 2025, [https://www.reddit.com/r/Lorcana/comments/1akmsqi/please\_explain\_the\_cost\_curve\_that\_is\_beside/](https://www.reddit.com/r/Lorcana/comments/1akmsqi/please_explain_the_cost_curve_that_is_beside/)  
37. Disney Lorcana Meta Tier List: Archazia's Island Set Championships Week 3 Metagame Report, accessed on June 23, 2025, [https://lorcana.gg/disney-lorcana-meta-tier-list-archazias-island-set-championships-week-3-metagame-report/](https://lorcana.gg/disney-lorcana-meta-tier-list-archazias-island-set-championships-week-3-metagame-report/)  
38. predictive models \- Modeling a card game win percent as a function ..., accessed on June 23, 2025, [https://stats.stackexchange.com/questions/562454/modeling-a-card-game-win-percent-as-a-function-of-deck-matchup-and-player-skill](https://stats.stackexchange.com/questions/562454/modeling-a-card-game-win-percent-as-a-function-of-deck-matchup-and-player-skill)  
39. A Neural Network Approach to Hearthstone Win Rate Prediction \- ResearchGate, accessed on June 23, 2025, [https://www.researchgate.net/publication/327892890\_A\_Neural\_Network\_Approach\_to\_Hearthstone\_Win\_Rate\_Prediction](https://www.researchgate.net/publication/327892890_A_Neural_Network_Approach_to_Hearthstone_Win_Rate_Prediction)  
40. Disney Lorcana Meta Tier List: Archazia's Island Set Championships Metagame Report, accessed on June 23, 2025, [https://lorcana.gg/disney-lorcana-meta-tier-list-archazias-island-set-championships-metagame-report/](https://lorcana.gg/disney-lorcana-meta-tier-list-archazias-island-set-championships-metagame-report/)  
41. The Best Decks From Lorcana's Latest $10k Tournament \- TCGplayer, accessed on June 23, 2025, [https://www.tcgplayer.com/content/article/The-Best-Decks-From-Lorcana-s-Latest-10k-Tournament/7db3caf1-3702-488e-a371-2919ae52a3d5/](https://www.tcgplayer.com/content/article/The-Best-Decks-From-Lorcana-s-Latest-10k-Tournament/7db3caf1-3702-488e-a371-2919ae52a3d5/)  
42. Disney Lorcana NA Championship \- Day 1 Top 16 Decklists \- 121 players \- Reddit, accessed on June 23, 2025, [https://www.reddit.com/r/Lorcana/comments/1hzfa8r/disney\_lorcana\_na\_championship\_day\_1\_top\_16/](https://www.reddit.com/r/Lorcana/comments/1hzfa8r/disney_lorcana_na_championship_day_1_top_16/)  
43. Decks | Disney Lorcana, accessed on June 23, 2025, [https://lorcana.gg/decks/?](https://lorcana.gg/decks/)  
44. Level 8: Metrics and Statistics \- Game Balance Concepts \- WordPress.com, accessed on June 23, 2025, [https://gamebalanceconcepts.wordpress.com/2010/08/25/level-8-metrics-and-statistics/](https://gamebalanceconcepts.wordpress.com/2010/08/25/level-8-metrics-and-statistics/)  
45. What Kind of Matchups are Skill-Based and What Kind of Matchups are Luck-Based? : r/Lorcana \- Reddit, accessed on June 23, 2025, [https://www.reddit.com/r/Lorcana/comments/1ett7e9/what\_kind\_of\_matchups\_are\_skillbased\_and\_what/](https://www.reddit.com/r/Lorcana/comments/1ett7e9/what_kind_of_matchups_are_skillbased_and_what/)  
46. What would you consider a good winning percentage? : r/ptcgo \- Reddit, accessed on June 23, 2025, [https://www.reddit.com/r/ptcgo/comments/w2zjmf/what\_would\_you\_consider\_a\_good\_winning\_percentage/](https://www.reddit.com/r/ptcgo/comments/w2zjmf/what_would_you_consider_a_good_winning_percentage/)  
47. Comprehensive Rules \- Lorcana Grimoire, accessed on June 23, 2025, [https://lorcanagrimoire.com/pages/how-to-play/comprehensive-rules/](https://lorcanagrimoire.com/pages/how-to-play/comprehensive-rules/)  
48. Prediction of Player Moves in Collectible Card Games \- Chair of Computational Intelligence, accessed on June 23, 2025, [https://www.ci.ovgu.de/is\_media/Master+und+Bachelor\_Arbeiten/MasterThesis\_TonySchwensfeier\_pdf-p-5126.pdf](https://www.ci.ovgu.de/is_media/Master+und+Bachelor_Arbeiten/MasterThesis_TonySchwensfeier_pdf-p-5126.pdf)