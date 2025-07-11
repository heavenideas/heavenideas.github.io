# **Development Plan: Unified Win Probability Model (UWPM)**

## **Objective:**

Integrate the quantitative metrics from the UWPM research paper into the matchup\_analyzer.html tool to calculate and display a win probability percentage for any given deck matchup.

### **Guiding Principles:**

1. **Modularity:** Each core component of the UWPM will be implemented as a distinct, self-contained module or function. This improves testability, maintainability, and allows for parallel development.  
2. **Clarity:** Function and variable names will be descriptive and directly correspond to the terminology used in the research paper (e.g., calculateRDS, loreVelocityIndex).  
3. **Data-Driven:** The model will be driven by the parsed card data. All calculations will be based on extracted card attributes and abilities.

## **Phase 1: Foundation \- Data Enhancement and Feature Extraction**

**Goal:** Augment the existing card data parsing logic to extract all necessary quantitative and qualitative features required by the UWPM.

### **Module 1.1: Card Feature Extractor**

File: matchup\_analyzer.html (or a new uwpm.js module)  
Description: Create a function that processes a single card object from the allCards.json and enriches it with the attributes needed for scoring.  
```

/\*\*  
 \* @typedef {object} UWPCard \- An enriched card object with features for the UWPM.  
 \* @property {string} name \- The card's name.  
 \* @property {number} cost \- The ink cost.  
 \* @property {number} strength \- The strength value.  
 \* @property {number} willpower \- The willpower value.  
 \* @property {number} lore \- The lore value.  
 \* @property {boolean} isUninkable \- True if the card cannot be put in the inkwell.  
 \* @property {Set\<string\>} keywords \- A set of keywords (e.g., 'Rush', 'Ward', 'Evasive').  
 \* @property {Set\<string\>} abilityPatterns \- A set of identified ability patterns from lorcana\_patterns.txt.  
 \* @property {object} rawData \- The original card data.  
 \*/

/\*\*  
 \* Processes a raw card object and extracts features required for UWPM calculations.  
 \* @param {object} rawCard \- The card object from allCards.json.  
 \* @param {object} LORCANA\_PATTERNS \- The parsed regex patterns.  
 \* @returns {UWPCard} \- The enriched card object.  
 \*/  
function extractCardFeatures(rawCard, LORCANA\_PATTERNS) {  
    // 1\. Initialize the UWPCard object with basic stats.  
    const features \= {  
        name: rawCard.name,  
        cost: rawCard.cost,  
        strength: rawCard.strength || 0,  
        willpower: rawCard.willpower || 0,  
        lore: rawCard.lore || 0,  
        isUninkable: rawCard.inkable \=== false,  
        keywords: new Set(rawCard.keywords || \[\]),  
        abilityPatterns: new Set(),  
        rawData: rawCard,  
    };

    // 2\. Use the regex from LORCANA\_PATTERNS to identify all matching ability patterns  
    // in the card's \`fullText\` or \`abilities\` field.  
    // For each match, add the pattern's 'name' to the \`abilityPatterns\` set.  
    // Example: "Draw 2 cards" matches "Card Effect: Draw". Add "Card Effect: Draw" to the set.

    // 3\. Return the fully populated \`features\` object.  
    return features;  
}
```

## **Phase 2: Intrinsic Deck Scoring**

**Goal:** Implement functions to calculate the three core intrinsic deck scores: Resource Dominance Score (RDS), Lore Velocity Index (LVI), and Board Control Rating (BCR).

### **Module 2.1: Resource Dominance Score (RDS) Calculator**
```
/\*\*  
 \* Calculates the Resource Dominance Score (RDS) for a given deck.  
 \* @param {UWPCard\[\]} deck \- An array of enriched card objects in the deck.  
 \* @returns {number} \- The calculated RDS for the deck.  
 \*/  
function calculateRDS(deck) {  
    let cardAdvantageGeneration \= 0;  
    let cardAdvantageDenial \= 0;  
    let inkAcceleration \= 0;  
    let uninkableBurden \= 0;

    deck.forEach(card \=\> {  
        // 1\. Calculate Card Advantage Generation (CAG)  
        // \- Check for patterns like 'Card Effect: Draw', 'Play: From Discard', etc.  
        // \- Add to CAG score, weighted by ink efficiency (e.g., \+ (drawn\_cards \* (2 / card.cost))).

        // 2\. Calculate Card Advantage Denial (CAD)  
        // \- Check for patterns like 'Card Effect: Opponent Discards'.  
        // \- Add to CAD score.

        // 3\. Calculate Ink Acceleration (IA)  
        // \- Check for patterns like 'Card Effect: Hand to Inkwell', 'Stat: Cost Reduction'.  
        // \- Add to IA score.

        // 4\. Calculate Uninkable Burden (UB)  
        // \- If card.isUninkable, add a penalty to uninkableBurden (e.g., card.cost \* 0.25).  
    });

    // 5\. Combine the sub-metrics into the final RDS.  
    const rds \= cardAdvantageGeneration \+ cardAdvantageDenial \+ inkAcceleration \- uninkableBurden;  
    return rds;  
}
```

### **Module 2.2: Lore Velocity Index (LVI) Calculator**
```
/\*\*  
 \* Calculates the Lore Velocity Index (LVI) for a given deck.  
 \* @param {UWPCard\[\]} deck \- An array of enriched card objects in the deck.  
 \* @returns {number} \- The calculated LVI for the deck.  
 \*/  
function calculateLVI(deck) {  
    let loreVelocityIndex \= 0;

    deck.forEach(card \=\> {  
        if (card.lore \> 0\) { // Only characters with lore contribute primarily  
            let baseLorePotential \= card.lore / (card.cost || 1); // Weight by cost  
            let loreSurvivabilityModifier \= 1.0;  
            let questSafetyModifier \= 1.0;

            // 1\. Apply Lore Survivability Modifier (LSM)  
            // \- Increase LSM for keywords like 'Ward', 'Resist'. (e.g., \* 1.4 for Ward).  
            // \- Consider willpower as part of survivability.

            // 2\. Apply Quest Safety Modifier (QSM)  
            // \- Increase QSM for 'Evasive' keyword (e.g., \* 1.5).

            // 3\. Combine to find this card's contribution.  
            loreVelocityIndex \+= baseLorePotential \* loreSurvivabilityModifier \* questSafetyModifier;  
        }

        // 4\. Add points for Direct Lore Manipulation (DLM)  
        // \- Check for ability patterns like 'Lore: Gain'.  
        // \- Add a flat value to the total LVI.  
    });

    return loreVelocityIndex;  
}
```

### **Module 2.3: Board Control Rating (BCR) Calculator**
```
/\*\*  
 \* Calculates the Board Control Rating (BCR) for a given deck.  
 \* @param {UWPCard\[\]} deck \- An array of enriched card objects in the deck.  
 \* @returns {number} \- The calculated BCR for the deck.  
 \*/  
function calculateBCR(deck) {  
    let boardControlRating \= 0;

    deck.forEach(card \=\> {  
        // 1\. Calculate Removal Efficiency (RE)  
        // \- Check for patterns like 'Banish: Chosen Target', 'Damage: Deal to One'.  
        // \- Score based on efficiency (e.g., (7 / card.cost) for hard removal).

        // 2\. Calculate Removal Versatility (RV)  
        // \- Give high scores for versatile removal like 'Banish: All Characters'.

        // 3\. Calculate Proactive Control (PC)  
        // \- Add score for 'Rush' keyword, weighted by the character's strength.  
        // \- (e.g., card.strength \* 0.5)

        // 4\. Sum up all control contributions for this card.  
        // boardControlRating \+= re \+ rv \+ pc;  
    });

    return boardControlRating;  
}
```

## **Phase 3: Matchup Dynamics and Final Calculation**

**Goal:** Implement the logic that compares the two decks and synthesizes the final win probability.

### **Module 3.1: Matchup Modifiers & Synthesizer**
```
/\*\*  
 \* Calculates the final win probability for Deck A against Deck B.  
 \* @param {UWPCard\[\]} deckA \- The player's deck.  
 \* @param {UWPCard\[\]} deckB \- The opponent's deck.  
 \* @returns {number} \- The win probability for Deck A (e.g., 0.55 for 55%).  
 \*/  
function calculateWinProbability(deckA, deckB) {  
    // 1\. Calculate Intrinsic Scores for both decks  
    const rdsA \= calculateRDS(deckA);  
    const lviA \= calculateLVI(deckA);  
    const bcrA \= calculateBCR(deckA);

    const rdsB \= calculateRDS(deckB);  
    const lviB \= calculateLVI(deckB);  
    const bcrB \= calculateBCR(deckB);

    // 2\. Calculate Matchup-Specific Modifiers (Implement as separate functions if complex)  
    // For now, these can be simplified placeholders.  
    const aim \= 0; // Archetype Interaction Modifier (placeholder)  
    const tfa \= 0; // Tempo Flow Analysis (placeholder)  
    const taes \= 0; // Threat-Answer Efficiency Score (placeholder)

    // 3\. Define weights from the research paper. These should be easily tunable.  
    const weights \= { rds: 0.15, lvi: 0.25, bcr: 0.25, aim: 1.0, tfa: 1.0, taes: 1.0 };

    // 4\. Calculate the final Matchup Score using the Master Equation  
    const matchupScore \=  
        weights.rds \* (rdsA \- rdsB) \+  
        weights.lvi \* (lviA \- lviB) \+  
        weights.bcr \* (bcrA \- bcrB) \+  
        weights.aim \* aim \+  
        weights.tfa \* tfa \+  
        weights.taes \* taes;

    // 5\. Convert the score to a probability using the Logistic Function  
    const k \= 1; // Scaling factor, tunable  
    const winProbability \= 1 / (1 \+ Math.exp(-k \* matchupScore));

    return winProbability;  
}
```

## **Phase 4: UI Integration**

**Goal:** Display the calculated win probability in the matchup\_analyzer.html interface.

### **Module 4.1: UI Display**

File: matchup\_analyzer.html  
Description: Modify the UI to add a section for the UWPM results and trigger the calculation.

1. **Add a new HTML element to display the result:**  
```
   \<\!-- Add this section below the main analysis area \--\>  
   \<div class="mt-8 p-6 bg-gray-800 rounded-lg shadow-xl"\>  
       \<h2 class="text-2xl font-bold text-center text-purple-400 mb-4"\>Unified Win Probability Model (UWPM)\</h2\>  
       \<div id="win-probability-display" class="text-center"\>  
           \<p class="text-lg text-gray-400"\>Load both decks to calculate win probability.\</p\>  
       \</div\>  
   \</div\>
```

2. **Modify the main analysis trigger function:**  
```   
    // Inside your existing 'Load Decks & Analyze' button's event listener...  
   async function handleAnalysis() {  
       // ... (existing code to load and parse decks)

       // After parsing both playerDeck and opponentDeck...

       // 1\. Create the enriched UWPCard arrays for both decks  
       const playerUWPCards \= playerDeck.map(card \=\> extractCardFeatures(card.data, LORCANA\_PATTERNS));  
       const opponentUWPCards \= opponentDeck.map(card \=\> extractCardFeatures(card.data, LORCANA\_PATTERNS));

       // 2\. Calculate the win probability  
       const winProb \= calculateWinProbability(playerUWPCards, opponentUWPCards);

       // 3\. Display the result in the UI  
       const displayElement \= document.getElementById('win-probability-display');  
       const winPercent \= (winProb \* 100).toFixed(1);  
       const lossPercent \= (100 \- winPercent).toFixed(1);

       displayElement.innerHTML \= \`  
           \<p class="text-xl"\>Your Deck's Estimated Win Chance:\</p\>  
           \<p class="text-5xl font-bold text-green-400 my-2"\>${winPercent}%\</p\>  
           \<p class="text-lg text-gray-400"\>(Opponent's Chance: ${lossPercent}%)\</p\>  
       \`;

       // ... (rest of the existing analysis logic)  
   }  

```

---------------- NEW FEATURES


UWPM Enhancement Plan: Card Selection & Deck Filtering
Objective:
Quantify the advantage gained from abilities that allow a player to look at, rearrange, and filter the top cards of their deck. This will be integrated as a new sub-metric within the Resource Dominance Score (RDS).

Core Concept: Deck Quality Improvement (DQI)
We will introduce a new sub-metric to the RDS called Deck Quality Improvement (DQI). The DQI score represents a card's ability to improve the quality of your future draws by ensuring you get the cards you need and avoid the ones you don't.

The value of a "Scry" effect is based on two primary actions:

Information: The number of cards you get to see.

Filtering/Cycling: The ability to remove unwanted cards from the top of your deck (by putting them on the bottom or in the discard).

Tutoring: The ability to take a specific, desired card from the selection and put it into your hand.

Phase 1: Enhanced Pattern Recognition
Goal: Update the feature extraction process to precisely identify and quantify the different aspects of a Scry effect.

Module 1.1: Update lorcana_patterns.txt
Add more granular regex patterns to distinguish between looking, filtering, and tutoring.

Existing Pattern: Card Effect: Look at Deck

Regex: /Look at the top (\\d+|one|two|three|four|five) cards of your deck/gi

This pattern is good for capturing the number of cards seen.

New Pattern: Card Effect: Filter to Bottom

Name: Card Effect: Filter to Bottom

Regex: /put the rest on the bottom of your deck/gi

Purpose: Identifies that the non-chosen cards are removed from future draws, which is the filtering action.

Existing Pattern: Card Effect: Deck to Hand/Bottom

Regex: /put (?:one of them|a (?:character|item|action|song) card) into your hand and(?: put)? the rest on the bottom of your deck/gi

Purpose: This is the most powerful version, combining looking, tutoring (to hand), and filtering (to bottom).

Module 1.2: Update extractCardFeatures Function
The UWPCard object should be augmented to store this new information.

/**
 * @typedef {object} UWPCard - An enriched card object for the UWPM.
 * ... (previous properties)
 * @property {object} scryEffect - Details about the card's deck filtering ability.
 * @property {number} scryEffect.lookCount - How many cards are looked at.
 * @property {boolean} scryEffect.canFilterToBottom - True if it can send cards to the bottom.
 * @property {boolean} scryEffect.canTutorToHand - True if it can put a card into hand.
 */

function extractCardFeatures(rawCard, LORCANA_PATTERNS) {
    // ... existing feature extraction ...
    
    // Add new logic here:
    features.scryEffect = { lookCount: 0, canFilterToBottom: false, canTutorToHand: false };

    const lookMatch = (rawCard.fullText || '').match(LORCANA_PATTERNS['Card Effect: Look at Deck'].regex);
    if (lookMatch) {
        // You'll need a helper to convert words like "two" to the number 2.
        features.scryEffect.lookCount = parseInt(lookMatch[1], 10) || convertWordToNumber(lookMatch[1]);

        if (LORCANA_PATTERNS['Card Effect: Filter to Bottom'].regex.test(rawCard.fullText)) {
            features.scryEffect.canFilterToBottom = true;
        }
        if (LORCANA_PATTERNS['Card Effect: Deck to Hand/Bottom'].regex.test(rawCard.fullText)) {
            features.scryEffect.canTutorToHand = true;
        }
    }
    
    return features;
}

Phase 2: Update RDS Calculation
Goal: Modify the calculateRDS function to include the new DQI score.

Module 2.1: calculateRDS Function Enhancement

```
/**
 * Calculates the Resource Dominance Score (RDS) for a given deck.
 * @param {UWPCard[]} deck - An array of enriched card objects in the deck.
 * @returns {number} - The calculated RDS for the deck.
 */
function calculateRDS(deck) {
    let cardAdvantageGeneration = 0; // Existing
    let cardAdvantageDenial = 0;     // Existing
    let inkAcceleration = 0;         // Existing
    let deckQualityImprovement = 0;  // NEW
    let uninkableBurden = 0;         // Existing

    // Define weights for DQI calculation. These can be tuned for balance.
    const dqiWeights = {
        perCardLookedAt: 0.15, // Value of just seeing a card
        filterToBottom: 1.0,   // Flat bonus for the ability to remove bad cards
        tutorToHand: 2.5       // High value for getting a card to hand (almost as good as drawing)
    };

    deck.forEach(card => {
        // ... existing calculations for CAG, CAD, IA, UB ...

        // NEW: Calculate Deck Quality Improvement (DQI) score for the card
        if (card.scryEffect && card.scryEffect.lookCount > 0) {
            let cardDQI = 0;
            cardDQI += card.scryEffect.lookCount * dqiWeights.perCardLookedAt;

            if (card.scryEffect.canFilterToBottom) {
                cardDQI += dqiWeights.filterToBottom;
            }

            if (card.scryEffect.canTutorToHand) {
                cardDQI += dqiWeights.tutorToHand;
                // Important: If it tutors to hand, it's also card draw.
                // We should add to Card Advantage Generation as well, but perhaps a slightly
                // lower value than a simple "Draw a card" since it costs an action.
                cardAdvantageGeneration += 0.8; // Example value
            }
            
            // Add the card's total DQI score, weighted by its ink efficiency
            deckQualityImprovement += cardDQI / (card.cost || 1);
        }
    });

    // 5. Combine all sub-metrics into the final RDS.
    const rds = cardAdvantageGeneration + cardAdvantageDenial + inkAcceleration + deckQualityImprovement - uninkableBurden;
    return rds;
}
```


---- NEW FEATURES

Summary of Changes Made
I have successfully updated the UWPM (Unified Win Probability Model) to include all card types in the deck analysis. Here are the key changes made:
1. Added Support for Items and Actions
New Global Arrays: Added PLAYER_DECK_ITEMS, OPPONENT_DECK_ITEMS, PLAYER_DECK_ACTIONS, and OPPONENT_DECK_ACTIONS to store items and actions separately from songs.
2. Updated Deck Parsing Function
Enhanced parseDeckString(): Now processes all card types:
Character cards → characters array
Action cards with Song subtype → songs array
Action cards without Song subtype → actions array
Item cards → items array
Location cards → locations array
3. Updated UWPM Calculation
Modified UWPM Phase 1: Now combines ALL card types for the win probability calculation:
Apply to matchup_anal...
4. Updated Deck Loading
Enhanced handleAnalyzeButtonClick(): Now assigns all parsed card types to their respective arrays
Updated Console Logging: Shows counts for all card types including items and actions
5. Maintained Backward Compatibility
UI Analysis: The character and song matchup analysis remains unchanged and focused on those specific card types
UWPM Integration: The UWPM now uses all card types while the detailed analysis UI continues to work with characters and songs
What This Achieves
✅ Complete Deck Analysis: The UWPM now considers every card in the deck, not just characters
✅ Accurate Win Probability: Items, actions, and locations now contribute to the RDS, LVI, and BCR calculations
✅ Better Resource Assessment: Items and actions that provide card draw, removal, or other effects are now properly evaluated
✅ Comprehensive Scoring: All card types contribute to the final win probability calculation
The UWPM will now provide more accurate win probability estimates because it's considering the full deck composition, including:
Items that provide ongoing effects or card advantage
Actions that offer removal, card draw, or other strategic effects
Locations that provide board presence and effects
Songs (already included) for their strategic value
Characters (already included) for their combat and lore potential
This change ensures that the UWPM lives up to its name as a "Unified" model that considers all aspects of both decks in the matchup analysis.

## Migration to Using Card Count in the Lorcana Matchup Analyzer

### Background

Originally, the Lorcana Matchup Analyzer parsed decklists and stored each card as a reference to a global card object (from the card database), sometimes wrapped in an object like `{ cardInfo, count }`. However, in many places, only the card data was used, and the count (number of copies in the deck) was either ignored or inconsistently handled. This led to inaccurate analysis, especially for metrics that should be sensitive to the number of copies of each card.

### Goals of the Migration

- **Accurately reflect the number of copies of each card in all calculations and UI.**
- **Unify the data structure** so that every function and UI component can reliably access both card data and its count.
- **Eliminate bugs and confusion** caused by mixing `{ cardInfo, count }` wrappers and direct card object usage.

### Key Changes

#### 1. Deck Parsing and Data Structure

**Before:**  
Decks were parsed into arrays of `{ cardInfo, count }` or sometimes just card objects, leading to ambiguity.

**After:**  
- Every deck entry is now a **flat card object** with all card properties **plus a `count` property**.
- Example:  
  ```js
  {
    name: "Goofy - Super Goof",
    cost: 4,
    ... // other card properties
    count: 4
  }
  ```
- This structure is used for all deck sections: characters, songs, locations, items, actions.

#### 2. Downstream Usage

- **All analysis functions** (RDS, LVI, BCR, TFA, etc.) now expect and use the `count` property on each card object.
- **UI components** (tables, tooltips, breakdowns) can display the number of copies directly from the card object.

#### 3. Metric Calculations

- **Resource Dominance Score (RDS), Lore Velocity Index (LVI), Board Control Rating (BCR):**
  - Each card's contribution is **multiplied by its `count`**.
  - Example: If a card would contribute 2.5 to RDS and you have 3 copies, its total contribution is 7.5.

- **Tempo Flow Analysis (TFA):**
  - The calculation was updated to **avoid double-counting**. Since RDS/LVI/BCR already include the count, TFA now uses the per-card total, not multiplying by count again.

#### 4. Helper Functions and UI

- All helpers (e.g., `getSongSingCost`, `extractCharacterKeywords`) and UI rendering functions now expect a flat card object with a `count` property.
- Defensive checks were added to handle missing or undefined fields gracefully.

#### 5. Elimination of `.cardInfo`

- All code was refactored to **remove any usage of `.cardInfo`**.
- Now, every function, loop, and UI component works directly with the flat card object.

### Benefits of the Migration

- **Accuracy:** All metrics and analyses now correctly account for the number of copies of each card.
- **Consistency:** The data structure is unified and predictable throughout the codebase.
- **Maintainability:** Future features and bug fixes are easier, as there's no ambiguity about how to access card data or count.
- **UI Improvements:** The number of copies can be shown in tooltips, tables, and breakdowns, improving user understanding.

### Example: Before vs. After

**Before:**
```js
characters: [{ cardInfo: { ...cardData }, count: 4 }, ...]
someFunction(entry.cardInfo); // sometimes used, sometimes not
```

**After:**
```js
characters: [{ ...cardData, count: 4 }, ...]
someFunction(entry); // always use the flat object
```

### Summary Table

| Aspect                | Before Migration                | After Migration (Current)         |
|-----------------------|---------------------------------|-----------------------------------|
| Deck entry structure  | `{ cardInfo, count }` or card   | `{ ...card, count }` (flat)       |
| Metric calculations   | Sometimes ignored count         | Always use `count`                |
| UI/Breakdowns         | Inconsistent, sometimes missing | Always available, accurate        |
| Helper functions      | Mixed, sometimes ambiguous      | Always expect flat card object    |
| `.cardInfo` usage     | Frequent                        | **Eliminated**                    |

### Conclusion

This migration ensures that the Lorcana Matchup Analyzer is **accurate, robust, and maintainable**. All analyses, visualizations, and features now correctly reflect the true composition of each deck, providing users with reliable insights.

If you have any questions about the migration or want to know how to extend this pattern for new features, just ask!