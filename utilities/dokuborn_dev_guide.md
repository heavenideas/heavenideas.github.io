# **Dokuborn Puzzle Game \- Developer Guide**

## **1\. Introduction**

Dokuborn is a single-page web application designed to create a challenging and dynamic puzzle game for Disney Lorcana players. The game generates a grid (2x2, 3x3, or 4x4) where each row and column has a specific card condition. The user's goal is to find a unique Lorcana card that satisfies both the row and column conditions for each cell in the grid.

This document serves as a complete guide for developers looking to understand, maintain, or extend the functionality of this tool.

## **2\. Core Technologies**

The application is intentionally built with a minimal technology stack to ensure simplicity and portability.

* **HTML:** Provides the core structure and layout of the game.  
* **CSS:** Handles all styling, theming, and responsiveness within a single \<style\> block.  
* **JavaScript (ES6):** Contains all the game logic, from data fetching to puzzle generation and user interaction. No frameworks are used.  
* **Fuse.js:** A lightweight, powerful fuzzy-search library used to allow users to easily find Lorcana cards by name, even with typos.  
* **Lorcana Card Database:** The entire application is powered by the allCards.json file, a community-maintained JSON database of all Disney Lorcana cards.

## **3\. Project Structure**

The entire application is contained within a single index.html file. This design choice makes it easy to deploy and share. The file is organized into three main sections:

1. **HTML Structure (\<body\>)**: Defines all the user interface elements, including the main game container, modals for various functions (search, difficulty selection, etc.), and the tutorial overlay.  
2. **CSS Styling (\<style\>)**: Contains all the visual rules. It uses CSS variables for theming (colors, fonts) and is designed to be mobile-first and fully responsive.  
3. **JavaScript Logic (\<script\>)**: This is the engine of the application and is detailed further below.

## **4\. JavaScript Logic Deep Dive**

The core logic resides within a single DOMContentLoaded event listener.

### **4.1. Initialization (initializeGame)**

This is the entry point of the application. It performs the following critical steps in order:

1. **Fetch Card Data:** It fetches the allCards.json from its CDN URL.  
2. **Filter Card Pool:** It immediately filters the fetched data to **exclude** all cards from Quest sets (any card where setCode starts with 'Q'). This filtered list becomes the definitive card pool for the entire application.  
3. **Initialize Fuse.js:** It creates a new Fuse instance with the filtered card pool, configured to search by the fullName property.  
4. **Setup Conditions:** Calls setupConditions() to populate the master list of all possible puzzle conditions.  
5. **Setup Modals & Tutorial:** Initializes the UI and logic for all interactive modals and the first-time user tutorial.  
6. **Generate First Puzzle:** It calls generateNewPuzzle() to create the initial 3x3, medium-difficulty puzzle for the user.

### **4.2. Game State Management**

Several key variables track the state of the game:

* allCards: An array of card objects, pre-filtered to exclude Quest sets.  
* gridSize: An integer (2, 3, or 4\) that defines the current dimensions of the puzzle grid.  
* gridState: An array that holds the card object placed in each cell by the user. Its size is gridSize \* gridSize.  
* currentConditions: An object { rows: \[\], cols: \[\] } that stores the active condition objects for the current puzzle.  
* allConditions: A master array of all possible condition objects that can be used to generate puzzles.

### **4.3. The Condition Object**

The entire puzzle generation system is built on "condition objects." Each object is a small, self-contained rule with three properties:

* **id (String):** A short, unique identifier (e.g., c1, o5, k2). Used for generating puzzle codes.  
* **display (String):** The human-readable text that appears in the grid labels (e.g., "🟣 Amethyst", "Cost 5", "Evasive").  
* filter (Function): A function that takes a card object and returns true or false. This is the core logic of the condition.  
  Example: { id: 'p0', display: 'Uninkable', filter: card \=\> \!card.inkwell }

### **4.4. Puzzle Generation (generateNewPuzzle)**

This is the most complex part of the application. It generates a new, solvable puzzle based on a target grid size and difficulty level.

1. **Targeting:** It receives a targetGridSize and targetLevel.  
2. **Random Selection:** It enters a loop, randomly shuffling the allConditions array and selecting the required number of conditions for the rows and columns (e.g., for a 4x4 grid, it picks 4 for rows and 4 for columns).  
3. **Solvability Check (isPuzzleSolvable):** For each random set of conditions, it runs a crucial check. This function ensures that there is at least one unique card solution for every single cell on the grid. This prevents the generation of impossible puzzles.  
4. **Difficulty Check (calculatePuzzleDifficulty):** If the puzzle is solvable, it then calculates its difficulty score (see below).  
5. **Validation:** If the calculated difficulty matches the targetLevel, the loop breaks, and the puzzle is presented to the user.  
6. **Timeout:** If a matching puzzle isn't found after 10,000 attempts, the process stops to prevent an infinite loop, and the user is notified.

### **4.5. Difficulty Calculation**

The difficulty is determined by the **scarcity of solutions**.

1. The calculatePuzzleDifficulty function iterates through each of the grid's cells (4, 9, or 16).  
2. For each cell, it counts how many cards in the allCards array satisfy *both* its row and column conditions. This is the "solution pool size."  
3. It calculates a score for the cell by taking the inverse of the pool size (1 / solutionPoolSize). This means cells with very few possible answers (high scarcity) contribute a much higher score.  
4. The total puzzle score is the sum of all cell scores, normalized by the grid size.  
5. This final score is mapped to a 1-5 star level based on predefined thresholds.

### **4.6. Puzzle Codes**

The puzzle codes allow any generated puzzle to be saved and shared.

* **Generation (generatePuzzleCode):** The code is created by taking the list of ids from the current puzzle's row and column conditions, joining them with a comma, and encoding the resulting string into Base64. The grid size is prepended to the code (e.g., 3:NDg1...).  
* **Loading (loadPuzzleFromCode):** This function reverses the process. It decodes the Base64 string, splits the IDs, finds the corresponding condition objects in the allConditions array, and rebuilds the puzzle. It re-runs the solvability and difficulty checks to ensure validity.

## **5\. How to Add New Features**

The system is designed to be easily extensible.

### **5.1. How to Add a New Puzzle Condition**

This is the most common update you might want to make. It's a simple one-step process:

1. Go to the setupConditions() function in the JavaScript.  
2. Add a new "condition object" to the allConditions array.

**Example:** Let's add a condition for cards that have a lore value of 3\.

```
// Inside the setupConditions function:  
allConditions.push({   
    id: 'l3', // A new, unique ID  
    display: 'Lore ◊3', // The text to show on the grid  
    filter: card \=\> card.lore \=== 3 // The logic to check the card  
});
```

That's it\! The new condition will now be automatically included in the pool for random puzzle generation, and the difficulty calculation will work with it seamlessly.

### **5.2. How to Adjust Difficulty Tiers**

If you find puzzles are too easy or too hard, you can tweak the scoring thresholds.

1. Go to the calculatePuzzleDifficulty function.  
2. Adjust the return values in the if statements. The normalizedScore is the value you are comparing against. A higher score means a harder puzzle.

```
// Example of tweaking the tiers  
function calculatePuzzleDifficulty(rows, cols, size) {  
    // ... scoring logic ...  
    const normalizedScore \= difficultyScore / (size \* size);

    // Adjust these thresholds to change the level distribution  
    if (normalizedScore \< 0.2) return 1; // Made "Very Easy" harder to get  
    if (normalizedScore \< 0.5) return 2; // Made "Easy" a bit harder  
    if (normalizedScore \< 1.0) return 3; // Expanded the "Medium" range  
    if (normalizedScore \< 1.8) return 4;  
    return 5;  
}  
```