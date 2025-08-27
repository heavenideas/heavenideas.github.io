## **Lorcana Abilities JSON Structure for LLM Agents**

This document outlines the structure of the lorcana\_abilities.json file, which is used to identify and score abilities found in Disney Lorcana card text.

**Direct Access URL:**

The JSON file can be loaded directly from the following URL:  
https://raw.githubusercontent.com/heavenideas/heavenideas.github.io/refs/heads/main/lorcanaUtils\_MatchUpAnalyzer/lorcana\_abilities.json

## **JSON Structure Overview**

The file is a JSON array \[\] containing multiple "ability" objects {}. Each object defines a specific game mechanic or keyword.

### **Primary Object Keys**

Each ability object has the following top-level keys:

* name (String): A unique, human-readable name for the ability (e.g., "Lore: Gain", "Keyword: Rush"). **This is the primary identifier.**  
* category (String): A broad classification of the ability's function (e.g., "Lore", "Resource", "Board Control", "Keyword").  
* sub\_type (String): A more specific classification (e.g., "Direct Gain", "Card Draw", "Offensive").  
* regex (String): The JavaScript-compatible regular expression used to match the ability's text on a card. It is stored as a string, including the leading and trailing slashes and flags (e.g., "/Gain (\\\\d+)?/gi").  
* explanation (String): A detailed description of what the ability does in the game.  
* justification (String): The reasoning behind the scoring values assigned to the ability.  
* quick\_description (String): A brief, one-sentence summary of the ability.  
* scores (Object): An object containing the quantitative scoring data for the ability.
* value_type (String): it can be either `raw` or `net_advantage`. Raw means that the calculations results will get divided by the cost of the card while net_advantage will NOT get divided by the cost

### **The** scores **Object**

The scores object contains the core analytical data, broken down into four main categories. Each category is an object with value and notes keys.

* board\_control: Measures the ability's impact on controlling the game board.  
  * value (String): A number or a formula (e.g., "7.0", "(1.5 \* Buff Amount)").  
  * notes (String): Context or justification for the value.  
* lore\_velocity: Measures the ability's impact on gaining or losing lore.  
  * value (String): A number or a formula.  
  * notes (String): Context or justification.  
* resource\_dominance: Measures the ability's impact on card advantage and ink resources.  
  * value (String): A number or a formula.  
  * notes (String): Context or justification.  
* miscellaneous\_multiplier: A flexible category for special modifiers.  
  * name (String): The name of the multiplier.  
  * value (String): The multiplier's value or formula.  
  * notes (String): Context or justification.

## **How to Utilize this JSON**

1. **Fetch Data:** Load the JSON array from the provided URL.  
2. **Iterate and Match:** For a given card's ability text, iterate through each ability object in the JSON array.  
3. **Apply Regex:** Use the regex string from each object to test for a match against the card's text. Remember to create a new RegExp() object from the string in your code.  
4. **Extract and Calculate:** If a regex matches:  
   * The card has the ability defined by that object.  
   * Use the formulas and values within the scores object to calculate the card's rating in each category. You will need to parse numbers and variables (e.g., "Lore Amount") from the card text using the regex capture groups.  
5. **Provide Context:** Use the explanation, justification, and notes fields to provide descriptive context for the matched abilities and their calculated scores.