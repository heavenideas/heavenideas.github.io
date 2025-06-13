# Planning for 
## Plan for "Auto Populate" Feature

Here is the step-by-step plan for creating the new feature:

1.  **Modify the User Interface (HTML):**
    *   A new button, labeled "Auto Populate", will be added in the "Decklist" section of the sidebar, right below the existing "Load Deck" button.

2.  **Implement the Core Logic (JavaScript):**
    *   A new `autoPopulateDeck()` function will be created to handle the auto-population logic.
    *   An event listener will be attached to the new "Auto Populate" button to trigger this function when clicked.

3.  **Detailed `autoPopulateDeck()` Function Workflow:**
    *   **Pre-check:** The function will first check if a deck has been loaded (i.e., if the `deckCards` array is not empty). If no deck is loaded, it will do nothing.
    *   **Clear Board:** It will call the existing `clearBoard()` function to provide a clean slate for the new layout.
    *   **Determine Required Turns:** The function will scan the loaded `deckCards` to find the highest ink cost. This determines the maximum number of turn lanes required.
    *   **Create Turn Lanes:** It will dynamically create turn columns using the existing `addTurnColumn()` function until there are enough lanes to accommodate the highest-cost card.
    *   **Populate Cards:** The function will iterate through each card in the `deckCards` array:
        *   It will identify the card's ink cost to determine the correct turn lane.
        *   It will check if the card is a "Song" type by inspecting its `subtypesText` property.
        *   Based on the type, it will place the card in either the "Songs" or "Board" section of the appropriate turn lane.
        *   Crucially, each card will be placed in its own new `lane-row` to satisfy the "OR" condition logic (vertical separation).
    *   **Final Adjustments:** After placing all cards, it will call `alignBoardTops()` to ensure the UI is correctly aligned and `saveSessionToLocalStorage()` to persist the newly populated board state.

### Visual Workflow

Here is a diagram illustrating the logic for the `autoPopulateDeck` function:

```mermaid
graph TD
    A[User clicks "Auto Populate"] --> B{Is deck loaded?};
    B -- No --> C[End];
    B -- Yes --> D[Clear existing board];
    D --> E[Find max ink cost in deck];
    E --> F[Create turn columns up to max cost];
    F --> G[Loop through each card in deck];
    G --> H{Is card a Song?};
    H -- Yes --> I[Find Song lane for card's ink cost];
    H -- No --> J[Find Board lane for card's ink cost];
    I --> K[Create new row in lane];
    J --> K;
    K --> L[Create card element];
    L --> M[Add card to the new row];
    M --> G;
    G -- All cards processed --> N[Align sections];
    N --> O[Save to local storage];
    O --> C;
```

