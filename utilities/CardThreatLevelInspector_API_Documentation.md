# Card Threat Level Inspector API Documentation

## Overview

The Card Threat Level Inspector is a modular component that provides detailed analysis of Lorcana cards, including CTL (Card Threat Level) breakdowns, threat analysis, and statistical comparisons. This module can be easily integrated into any Lorcana utility application.

## Quick Start

### Basic Usage

```javascript
// 1. Include the required scripts
<script src="unified_win_probability_utilities.js"></script>
<script src="card_stat_analysis_module.js"></script>
<script src="CardThreatLevelInspector.js"></script>

// 2. Create an inspector instance
const inspector = new CardThreatLevelInspector();

// 3. Show a single card
inspector.showCard(cardObject);

// 4. Compare multiple cards
inspector.compareCards([card1, card2, card3]);
```

## API Reference

### Constructor

```javascript
new CardThreatLevelInspector(options)
```

**Parameters:**
- `options` (Object, optional): Configuration options

**Options:**
- `modalId` (string): ID for the modal element (default: 'card-threat-inspector-modal')
- `zIndex` (number): Z-index for the modal (default: 1000)
- `enableStatAnalysis` (boolean): Enable statistical analysis tab (default: true)
- `enableMultiCardComparison` (boolean): Enable multi-card comparison (default: true)
- `enableDrillDown` (boolean): Enable drill-down modals (default: true)
- `theme` (string): Theme ('dark' or 'light', default: 'dark')
- `customCSS` (string): Custom CSS to inject (default: null)
- `onCardClick` (function): Callback for card clicks (default: null)
- `onClose` (function): Callback when modal closes (default: null)
- `cardStatAnalysisModule` (object): CardStatAnalysisModule instance (auto-detected if available)
- `unifiedWinProbabilityCalculation` (object): UnifiedWinProbabilityCalculation instance (auto-detected if available)

### Methods

#### `showCard(card, options)`

Opens the inspector modal for a single card.

**Parameters:**
- `card` (Object): Card object with required properties
- `options` (Object, optional): Additional options (reserved for future use)

**Required Card Properties:**
- `fullName` (string): Full name of the card
- `images` (object): Image URLs
  - `full` (string): Full-size card image URL
  - `thumbnail` (string, optional): Thumbnail image URL
- `fullText` (string, optional): Card text for ability analysis

**Example:**
```javascript
const card = {
    fullName: "Elsa - Snow Queen",
    images: {
        full: "https://example.com/elsa-full.jpg",
        thumbnail: "https://example.com/elsa-thumb.jpg"
    },
    fullText: "Shift 4 (You may pay 4 ⬡ to play this on top of one of your characters named Elsa.)",
    cost: 8,
    inkwell: true,
    color: "Amethyst",
    type: "Character"
};

inspector.showCard(card);
```

#### `compareCards(cards, options)`

Opens a side-by-side comparison view for multiple cards.

**Parameters:**
- `cards` (Array): Array of card objects (minimum 2, maximum 6 recommended)
- `options` (Object, optional): Additional options (reserved for future use)

**Example:**
```javascript
inspector.compareCards([card1, card2, card3]);
```

#### `initialize()`

Manually initializes the inspector by injecting CSS and setting up DOM elements. This method is called automatically by `showCard()` and `compareCards()`, but can be called manually if needed.

**Example:**
```javascript
inspector.initialize();
```

#### `destroy()`

Cleans up and removes all DOM elements created by the inspector.

**Example:**
```javascript
inspector.destroy();
```

## Dependencies

The Card Threat Level Inspector requires the following modules to function properly:

1. **UnifiedWinProbabilityCalculation** - For CTL calculations and ability analysis
2. **CardStatAnalysisModule** - For statistical analysis and comparisons

These modules are auto-detected if available in the global scope. You can also pass them explicitly in the constructor options.

## Integration Examples

### Basic Integration

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Lorcana Tool</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
    <!-- Your application content -->
    
    <script src="unified_win_probability_utilities.js"></script>
    <script src="card_stat_analysis_module.js"></script>
    <script src="CardThreatLevelInspector.js"></script>
    <script>
        // Initialize your application
        async function initApp() {
            // Load card data
            const response = await fetch('path/to/allCards.json');
            const cardData = await response.json();
            
            // Initialize dependencies
            await UnifiedWinProbabilityCalculation.loadAbilitiesConfig();
            CardStatAnalysisModule.initialize(cardData.cards, INK_COLORS);
            
            // Create inspector
            const inspector = new CardThreatLevelInspector();
            
            // Use inspector when needed
            document.getElementById('analyze-button').addEventListener('click', () => {
                inspector.showCard(selectedCard);
            });
        }
        
        initApp();
    </script>
</body>
</html>
```

### Advanced Integration with Custom Options

```javascript
const inspector = new CardThreatLevelInspector({
    theme: 'dark',
    zIndex: 2000,
    onClose: () => {
        console.log('Inspector closed');
        // Custom cleanup logic
    },
    onCardClick: (card) => {
        console.log('Card clicked:', card.fullName);
        // Custom card click handling
    }
});
```

## Features

### Single Card Analysis
- **Threat Analysis Tab**: Shows CTL breakdown with RDS, LVI, and BCR scores
- **Statistical Analysis Tab**: Displays comprehensive card statistics and comparisons
- **Ability Highlighting**: Highlights recognized abilities in card text
- **Interactive Elements**: Click on stats to see drill-down details

### Multi-Card Comparison
- **Side-by-Side Layout**: Compare 2-6 cards simultaneously
- **Responsive Design**: Adapts layout based on number of cards and screen size
- **Synchronized Tabs**: Switch between threat analysis and stats for all cards
- **Individual Analysis**: Each card maintains its own analysis context

### Customization
- **Theming**: Dark and light theme support
- **Custom CSS**: Inject custom styles
- **Event Callbacks**: Handle card clicks and modal close events
- **Flexible Dependencies**: Auto-detect or manually provide calculation modules

## Error Handling

The inspector includes comprehensive error handling:

- **Card Validation**: Validates required card properties before display
- **Dependency Checks**: Gracefully handles missing calculation modules
- **Image Fallbacks**: Shows placeholder when card images fail to load
- **Calculation Errors**: Displays appropriate messages when calculations fail

## Browser Compatibility

- Modern browsers with ES6+ support
- Requires Tailwind CSS for styling
- Works with or without module bundlers

## Testing

Use the provided test files to validate integration:

- `test_card_threat_inspector_api.html` - Comprehensive API testing with real data
- `test_ctl_integration.html` - Focused CTL calculation validation

## Support

For issues or questions, refer to the test files for working examples or check the console for error messages with detailed information about any problems.