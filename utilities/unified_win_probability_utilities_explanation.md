# Unified Win Probability Utilities Library Documentation

## 1\. Introduction

Welcome to the Unified Win Probability Utilities library! This JavaScript library is designed to analyze Disney Lorcana card data. Its primary function is to calculate three key performance metrics for any given card:

-   **RDS (Resource Dominance Score)**: Measures a card's impact on card advantage and ink resources.
    
-   **LVI (Lore Velocity Index)**: Measures a card's ability to gain or affect lore.
    
-   **BCR (Board Control Rating)**: Measures a card's effectiveness at controlling the game board.

The library achieves this by parsing a card's text, matching it against a predefined set of abilities, and applying scoring formulas. The entire logic is driven by an external JSON configuration file, making the scoring system flexible and easy to update.

## 2\. Core Dependency: 
```
lorcana_abilities_redux.json
```

The brain of this library is the 
```
lorcana_abilities_redux.json
```
 file. This configuration file contains an array of "ability" objects, each defining a specific game mechanic. The library is entirely dependent on the structure and content of this file to perform its calculations.

Each ability object in the JSON contains:

-   A **
    ```
    name
    ```
    ** and **
    ```
    category
    ```
    **.
    
-   A **
    ```
    regex
    ```
    ** string to match the ability text on a card.
    
-   A **
    ```
    calculation
    ```
    ** object that defines how to score the ability for each metric (RDS, LVI, BCR).

For a complete and detailed explanation of the JSON structure, please refer to the **
```
lorcana_abilities_JSON_structure_explanation.md
```
** document.

## 3\. Setup and Initialization

The library is exposed as a single global object: 
```
UnifiedWinProbabiliyCalculation
```
. To use it, you must first load the abilities configuration. You have two ways to do this:

### Option A: Load Configuration from URL (Recommended)

The library can fetch the latest configuration file directly from its hosted URL. This is an asynchronous operation, so you should use 
```
async/await
```
 or 
```
.then()
```
.

```
async function initializeLibrary() {
    try {
        await UnifiedWinProbabiliyCalculation.loadAbilitiesConfig();
        console.log("Abilities configuration loaded successfully!");
    } catch (error) {
        console.error("Failed to initialize library:", error);
    }
}

initializeLibrary();
  

```

### Option B: Set Configuration Manually

If you have the JSON data locally or want to use a custom configuration, you can provide it directly to the library.

```
// Assume 'myCustomAbilitiesConfig' is a JavaScript object
// that has been loaded from a local file or defined in your code.
const myCustomAbilitiesConfig = {
    "@constants": { /* ... */ },
    "abilities": [ /* ... */ ]
};

UnifiedWinProbabiliyCalculation.setAbilitiesConfig(myCustomAbilitiesConfig);
console.log("Custom abilities configuration has been set.");
  

```

## 4\. API Reference

The 
```
UnifiedWinProbabiliyCalculation
```
 object exposes the following public functions:

### 
```
async loadAbilitiesConfig()
```

-   **Description**: Fetches the 
    ```
    lorcana_abilities_redux.json
    ```
     file from its default URL and loads it into the library's internal configuration. It also processes all regex strings into usable RegExp objects.
    
-   **Parameters**: None.
    
-   **Returns**: A 
    ```
    Promise
    ```
     that resolves with the loaded configuration object.
    
-   **Throws**: An error if the network request fails or the JSON cannot be parsed.

### 
```
setAbilitiesConfig(config)
```

-   **Description**: Manually sets the abilities configuration from a provided JavaScript object. This is useful for offline use, testing, or using a custom set of ability definitions. It also processes all regex strings into usable RegExp objects.
    
-   **Parameters**:
    
      -   ```
          config
          ```
           (Object): A valid abilities configuration object, matching the structure of 
          ```
          lorcana_abilities_redux.json
          ```
          .
    
-   **Returns**: 
    ```
    undefined
    ```
    .

### 
```
getAbilitiesConfig()
```

-   **Description**: A simple getter function that returns the currently loaded abilities configuration object.
    
-   **Parameters**: None.
    
-   **Returns**: The active abilities configuration 
    ```
    Object
    ```
    .

### 
```
calculateCardMetrics(card, [externalConfig])
```

-   **Description**: This is the core function of the library. It takes a card object, analyzes its text against the loaded abilities, and calculates the RDS, LVI, and BCR scores.
    
-   **Parameters**:
    
      -   ```
          card
          ```
           (Object): An object representing the card to be analyzed. It **must** have the following structure:
          
          ```
          {
              // The full, combined text from the card's ability sections.
              "fullTextSections": ["Text of ability 1.", "Text of ability 2."],
              // The ink cost of the card.
              "cost": 3,
              // Other card properties can be included, as they can be
              // referenced by formulas in the abilities JSON.
              "strength": 2,
              "willpower": 4
              // ... etc.
          }
            
          
          ```
          
      -   ```
          externalConfig
          ```
           (Object, Optional): An abilities configuration object to use for this specific calculation only, without overwriting the library's internal configuration.
    
-   **Returns**: An 
    ```
    Object
    ```
     containing the calculated scores and a detailed breakdown.
    
    ```
    {
        "rds": 1.33, // Resource Dominance Score
        "lvi": 0,    // Lore Velocity Index
        "bcr": 2.5,  // Board Control Rating
        "breakdown": [ // An array detailing each matched ability and its contribution
            {
                "abilityName": "Keyword: Challenger",
                "metric": "board_control",
                "value": 2.5,
                "explanation": "Challenger +3 (Raw: 7.50 / Cost: 3 = 2.50)"
            },
            {
                "abilityName": "Draw: Specific",
                "metric": "resource_dominance",
                "value": 1.33,
                "explanation": "Conditional Card Draw (Raw: 4.00 / Cost: 3 = 1.33)"
            }
        ]
    }
      
    
    ```

## 5\. In-Depth: The 
```
evaluateFormula
```
 Function

The 
```
evaluateFormula
```
 function is the mathematical engine of the library. Its purpose is to safely parse and compute the result of formula strings (e.g., 
```
"@card.strength * @constants.strengthModifier"
```
) provided in the 
```
lorcana_abilities_redux.json
```
 file.

### How It Works

The function takes two arguments: a 
```
formula
```
 string and a 
```
formulaContext
```
 object which contains all possible variables that can be used in the calculation. It processes the formula in three main steps:

#### Step 1: Variable Substitution

The function first searches the formula string for any variable placeholders, which are identified by a leading 
```
@
```
 symbol (e.g., 
```
@card.strength
```
). For each placeholder found, it traverses the 
```
formulaContext
```
 object to find the corresponding value. For example, 
```
@card.strength
```
 would look for 
```
formulaContext.card.strength
```
.

#### Step 2: Intelligent Defaulting for Missing Variables

This is the function's most complex feature. If a variable from the formula does not exist in the 
```
formulaContext
```
 object (it's 
```
undefined
```
), the function doesn't just fail. Instead, it intelligently substitutes a default value based on the surrounding mathematical operators:

-   If the missing variable is part of a multiplication (
    ```
    *
    ```
    ) or division (
    ```
    /
    ```
    ), it defaults to **
    ```
    1
    ```
    ** (the multiplicative identity).
    
-   If the missing variable is part of an addition (
    ```
    +
    ```
    ) or subtraction (
    ```
    -
    ```
    ), it defaults to **
    ```
    0
    ```
    ** (the additive identity).

This heuristic makes the formulas in the JSON configuration more robust and prevents errors if a card lacks a specific property that a generic formula expects.

#### Step 3: Safe Evaluation

After all variables have been replaced with their actual values (or intelligent defaults), the result is a clean mathematical string (e.g., 
```
"5 * 1.5 + 0"
```
). To safely compute the result without using the dangerous 
```
eval()
```
 function, the library uses the 
```
new Function()
```
 constructor. This executes the code in a controlled scope, calculates the final number, and returns it.

### Example Walkthrough

Let's trace an example to see it in action.

-   **Formula String**: 
    ```
    "@card.strength * @constants.challengerBonus + @card.bonusDamage"
    ```
    
-   **Context Object**:
    
    ```
    const formulaContext = {
        card: { strength: 3 },
        constants: { challengerBonus: 2.0 }
        // Note: card.bonusDamage is missing
    };
      
    
    ```
1.  **Substitution**:
    
      3.   ```
          @card.strength
          ```
           is found and replaced with 
          ```
          3
          ```
          .
          
      12.   ```
          @constants.challengerBonus
          ```
           is found and replaced with 
          ```
          2.0
          ```
          .
          
      21.   ```
          @card.bonusDamage
          ```
           is **not** found.
    
2.  **Intelligent Defaulting**:
    
      28.   The function inspects the character before the missing 
          ```
          @card.bonusDamage
          ```
          , which is 
          ```
          34.
          ```
          .
          
      38.   Because it's an addition, the missing variable is replaced with 
          ```
          0
          ```
          .
    
3.  **Final String & Evaluation**:
    
      46.   The processed string becomes: 
          ```
          "3 * 2.0 + 0"
          ```
          .
          
      52.   ```
          new Function('return 3 * 2.0 + 0')()
          ```
           is called, which safely calculates and returns the final result: 
          ```
          6
          ```
          .

## 6\. Full Usage Example

Here is a complete example of how to load the library, define a card, and calculate its metrics.

```
// 1. Define the card object we want to analyze.
const sampleCard = {
    "name": "Mickey Mouse, Brave Little Tailor",
    "cost": 8,
    "inkable": true,
    "strength": 5,
    "willpower": 5,
    "fullTextSections": [
        "Evasive (Only characters with Evasive can challenge this character.)",
        "Whenever this character quests, you may draw a card."
    ]
};

// 2. Create an async function to run the calculation process.
async function analyzeCard() {
    try {
        // 3. Load the abilities configuration from the remote URL.
        console.log("Loading abilities configuration...");
        await UnifiedWinProbabiliyCalculation.loadAbilitiesConfig();
        console.log("Configuration loaded.");

        // 4. Call the main function with our card object.
        console.log(`Analyzing card: ${sampleCard.name}...`);
        const metrics = UnifiedWinProbabiliyCalculation.calculateCardMetrics(sampleCard);

        // 5. Display the results.
        console.log("\n--- Analysis Complete ---");
        console.log(`Card: ${sampleCard.name}`);
        console.log(`Resource Dominance (RDS): ${metrics.rds.toFixed(2)}`);
        console.log(`Lore Velocity (LVI): ${metrics.lvi.toFixed(2)}`);
        console.log(`Board Control (BCR): ${metrics.bcr.toFixed(2)}`);

        console.log("\n--- Score Breakdown ---");
        metrics.breakdown.forEach(item => {
            console.log(`- ${item.abilityName} (${item.metric}):`);
            console.log(`  Value: ${item.value.toFixed(2)}`);
            console.log(`  Justification: ${item.explanation}`);
        });
        console.log("-----------------------\n");

    } catch (error) {
        console.error("An error occurred during card analysis:", error);
    }
}

// 6. Run the analysis.
analyzeCard();

/*
Expected Console Output:

Loading abilities configuration...
Configuration loaded.
Analyzing card: Mickey Mouse, Brave Little Tailor...

--- Analysis Complete ---
Card: Mickey Mouse, Brave Little Tailor
Resource Dominance (RDS): 0.63
Lore Velocity (LVI): 0.00
Board Control (BCR): 0.63

--- Score Breakdown ---
- Keyword: Evasive (board_control):
  Value: 0.63
  Justification: Evasive (Raw: 5.00 / Cost: 8 = 0.63)
- Draw: Unconditional (resource_dominance):
  Value: 0.63
  Justification: Unconditional Card Draw (Raw: 5.00 / Cost: 8 = 0.63)
-----------------------
*/

```