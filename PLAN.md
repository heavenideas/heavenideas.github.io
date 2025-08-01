### **Project Plan: Lorcana Card Explorer**

**Objective:** To create a single-page web application named `utilities/lorcana_card_explorer.html` that allows users to explore and filter Disney Lorcana cards from a JSON database. The tool will reuse the styling from `utilities/lorcana_abilities.html` and the calculation logic from `utilities/unified_win_probability_utilities.js`.

---

### **Phase 1: Setup and UI Scaffolding**

1.  **Create the HTML file:**
    *   Create a new file: `utilities/lorcana_card_explorer.html`.
    *   Copy the basic HTML structure, CSS styles, and Tailwind CSS setup from `utilities/lorcana_abilities.html`. This includes the `<head>` section and the overall page layout (`<body class="bg-slate-950 text-slate-300">`).

2.  **Design the UI Layout:**
    *   The UI will be divided into two main sections: a **Filter Panel** on the left and a **Card Display Area** on the right.
    *   The layout will be responsive, stacking vertically on smaller screens.

3.  **Build the Filter Panel:**
    *   **Card Attributes:** Create input fields for filtering by:
        *   Text search (for card name, ability text)
        *   Ink Color (checkboxes or multi-select)
        *   Card Type (checkboxes: Character, Action, Item, etc.)
        *   Cost, Strength, Willpower, Lore (sliders or min/max input fields)
    *   **Ability Matching:**
        *   A dropdown to select from the list of abilities defined in `lorcana_abilities_redux.json`.
    *   **BCR/LVI/RDS Filtering:**
        *   Sliders for `BCR` (Board Control Rating), `LVI` (Lore Velocity Index), and `RDS` (Resource Dominance Score) to filter cards based on their calculated metrics.
    *   A "Reset Filters" button.

4.  **Build the Card Display Area:**
    *   A grid to display the filtered card images.
    *   Each card will be a clickable element.
    *   When a card is clicked, a modal or a detail pane will show:
        *   Larger card image.
        *   Full card details (cost, strength, willpower, lore, text).
        *   The calculated `BCR`, `LVI`, and `RDS` scores and the breakdown from `calculateCardMetrics`.

---

### **Phase 2: Data and Logic Implementation**

1.  **Data Fetching:**
    *   On page load, fetch the card database from `https://raw.githubusercontent.com/heavenideas/similcana/refs/heads/main/database/allCards.json`.
    *   On page load, also fetch the abilities configuration from `lorcana_abilities_redux.json` using the `UnifiedWinProbabiliyCalculation.loadAbilitiesConfig()` function.

2.  **Card Metric Calculation:**
    *   After fetching the card data, iterate through all cards and use `UnifiedWinProbabiliyCalculation.calculateCardMetrics(card)` to pre-calculate the `BCR`, `LVI`, and `RDS` for each card.
    *   Store these calculated metrics along with the card data in a local array for fast filtering.

3.  **Filtering Logic:**
    *   Create a primary `filterAndDisplayCards()` function that will be triggered whenever any filter input changes.
    *   This function will:
        *   Start with the full list of cards (with pre-calculated metrics).
        *   Apply each active filter sequentially to narrow down the results.
        *   For text search, use Fuse.js (already included in `lorcana_abilities.html`).
        *   For attribute filters (ink, type, cost, etc.), apply simple array filtering.
        *   For ability filter, check if the card's abilities breakdown includes the selected ability.
        *   For `BCR`/`LVI`/`RDS` filters, check if the card's pre-calculated score falls within the selected range.
    *   Update the Card Display Area with the filtered results.

---

### **Phase 3: Finalization and Deployment**

1.  **Styling and Polish:**
    *   Ensure all new UI elements match the existing dark theme and styling from `lorcana_abilities.html`.
    *   Add loading indicators and empty states (e.g., "No cards match your filters").
    *   Ensure a smooth and responsive user experience.

2.  **Testing:**
    *   Test all filter combinations.
    *   Verify that the calculated metrics are displayed correctly.
    *   Test on different screen sizes.

---

### **Mermaid Diagram: Application Flow**

```mermaid
graph TD
    A[Page Load] --> B{Fetch Data};
    B --> B1[Fetch allCards.json];
    B --> B2[Fetch lorcana_abilities_redux.json];
    B1 & B2 --> C{Calculate Metrics};
    C --> D[Store Cards with Metrics];
    D --> E{Display All Cards};

    subgraph User Interaction
        F[User applies a filter] --> G{Filter Logic};
    end

    D --> G;
    G --> H[Update Card Display];
    H --> I{User clicks a card};
    I --> J[Show Card Details Modal];