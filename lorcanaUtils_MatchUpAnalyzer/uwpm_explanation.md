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
