# Card Statistical Analysis Module

## Overview

The Card Statistical Analysis Module is a reusable JavaScript library that provides comprehensive statistical analysis for Disney Lorcana cards. It was extracted from `lorcana_card_explorer.html` to enable modular reuse across different applications.

## Features

- **Identical Stats Profile**: Find cards with identical cost, strength, willpower, and lore values
- **Combat & Stat Analysis**: Compare cards across various statistical dimensions including:
  - Higher/lower strength, willpower, lore (with cost considerations)
  - Favorable/unfavorable trade scenarios
  - Mutual banishment outcomes (favorable/neutral/unfavorable ink costs)
  - **Similar Threat Metrics**: Find cards with similar CTL, RDS, LVI, and BCR values within a configurable threshold
- **Threshold Control**: Interactive slider to adjust similarity threshold (0.1 to 5.0)
- **Color Distribution Analysis**: Breakdown of matching cards by ink color
- **Modular Architecture**: Clean API for easy integration

## Architecture

### Core Components

1. **Main Module** (`CardStatAnalysisModule`): IIFE-based module with public API
2. **Analysis Functions**: Individual functions for different types of analysis
3. **Helper Functions**: Utility functions for data processing and rendering
4. **Integration Layer**: Event handlers and UI integration helpers

### Dependencies

- `unified_win_probability_utilities.js` - For card metrics calculation
- Card database (array of card objects)
- Color mapping object (INK_COLORS)

## API Reference

### Initialization

```javascript
CardStatAnalysisModule.initialize(cardsData, inkColors, unifiedWinProbabilityCalculation);
```

**Parameters:**
- `cardsData`: Array of card objects from the Lorcana database
- `inkColors`: Object mapping color names to hex codes (e.g., `{Amber: '#fecb00', ...}`)
- `unifiedWinProbabilityCalculation`: (Optional) Instance of UnifiedWinProbabilityCalculation for CTL/RDS/LVI/BCR analysis

### Analysis Functions

#### `renderIdenticalStatsProfile(card, options)`

Generates HTML for identical stats analysis.

```javascript
const html = CardStatAnalysisModule.renderIdenticalStatsProfile(card);
```

**Parameters:**
- `card`: Card object to analyze
- `options`: Rendering options (optional)

**Returns:** HTML string with identical stats analysis

#### `renderCombatAnalysis(card, options)`

Generates HTML for combat and statistical analysis.

```javascript
const html = CardStatAnalysisModule.renderCombatAnalysis(card, { threshold: 0.5 });
```

**Parameters:**
- `card`: Card object to analyze
- `options`: Rendering options (optional)
  - `threshold`: Similarity threshold for CTL/RDS/LVI/BCR comparisons (default: 0.1)

**Returns:** HTML string with combat analysis including threshold slider and similar metrics sections

#### `renderCompleteAnalysis(card, options)`

Generates complete analysis HTML combining all analysis types.

```javascript
const html = CardStatAnalysisModule.renderCompleteAnalysis(card, { threshold: 0.5 });
```

**Parameters:**
- `card`: Card object to analyze
- `options`: Rendering options (optional)
  - `threshold`: Similarity threshold for CTL/RDS/LVI/BCR comparisons (default: 0.1)

**Returns:** Complete HTML analysis including identical stats, combat analysis, and similar metrics

### Event Handling

#### `handleStatItemClick(event, analyzedCard, drillDownCallback)`

Handles click events on statistical analysis items.

```javascript
CardStatAnalysisModule.handleStatItemClick(event, card, (criteria, title, analyzedCard, colorFilter) => {
    // Handle drill-down
    showDrillDownModal(criteria, title, analyzedCard, colorFilter);
});
```

**Parameters:**
- `event`: Click event object
- `analyzedCard`: The card being analyzed
- `drillDownCallback`: Function to handle drill-down requests

### Utility Functions

#### `findMatchingCards(criteria, analyzedCard)`

Find cards matching specific criteria, with automatic deduplication by `fullName`.

```javascript
const matchingCards = CardStatAnalysisModule.findMatchingCards(criteria, analyzedCard);
```

**Parameters:**
- `criteria`: Search criteria object
- `analyzedCard`: Card being analyzed

**Returns:** Array of unique matching cards (deduplicated by `fullName`)

**Note:** Multiple versions of the same card (different art, reprints, etc.) are automatically deduplicated to ensure accurate statistical analysis.

#### `countByColor(cards)`

Count cards by ink color.

```javascript
const colorCounts = CardStatAnalysisModule.countByColor(cards);
```

**Parameters:**
- `cards`: Array of card objects

**Returns:** Object with color counts

#### `getCardColors(card)`

Get card colors helper.

```javascript
const colors = CardStatAnalysisModule.getCardColors(card);
```

**Parameters:**
- `card`: Card object

**Returns:** Array of color names

#### `updateThreshold(newThreshold, card, container)`

Update the similarity threshold for threat metrics analysis and re-render the analysis.

```javascript
CardStatAnalysisModule.updateThreshold(0.5, card, containerElement);
```

**Parameters:**
- `newThreshold`: New threshold value (0.1 to 5.0)
- `card`: Card object being analyzed
- `container`: HTML container element to update

**Returns:** void - Updates the container with new analysis

## Integration Examples

### Basic Integration

```html
<!DOCTYPE html>
<html>
<head>
    <script src="unified_win_probability_utilities.js"></script>
    <script src="card_stat_analysis_module.js"></script>
</head>
<body>
    <div id="analysis-container"></div>

    <script>
        // Initialize with your card data
        const cardsData = [/* your card array */];
        const inkColors = {Amber: '#fecb00', /* ... */};
        const uwpc = UnifiedWinProbabilityCalculation; // Assuming it's loaded

        CardStatAnalysisModule.initialize(cardsData, inkColors, uwpc);

        // Use in your application
        const card = cardsData[0];
        const analysisHtml = CardStatAnalysisModule.renderCompleteAnalysis(card, { threshold: 0.1 });
        document.getElementById('analysis-container').innerHTML = analysisHtml;

        // Setup threshold slider event listener
        document.addEventListener('input', (e) => {
            if (e.target.id === 'similarity-threshold') {
                const newThreshold = parseFloat(e.target.value);
                CardStatAnalysisModule.updateThreshold(newThreshold, card, document.getElementById('analysis-container'));
            }
        });
    </script>
</body>
</html>
```

### Advanced Integration with Event Handling

```javascript
// Setup click handlers for drill-down functionality
function setupAnalysisHandlers(container, card) {
    container.addEventListener('click', (event) => {
        CardStatAnalysisModule.handleStatItemClick(event, card, (criteria, title, analyzedCard, colorFilter) => {
            // Implement your drill-down modal
            showDrillDownResults(criteria, title, analyzedCard, colorFilter);
        });
    });
}

// Usage
const container = document.getElementById('analysis-container');
setupAnalysisHandlers(container, selectedCard);
```

## Analysis Criteria Types

The module supports various analysis criteria:

### Static Analysis
```javascript
{
    type: 'static',
    stats: { cost: 3, strength: 3, willpower: 4, lore: 1 }
}
```

### Comparative Analysis
```javascript
{
    type: 'comparative',
    stat: 'strength',
    comparison: '>' // or '<'
}
```

### Trade Analysis
```javascript
{
    type: 'trade',
    comparison: 'favorable' // or 'unfavorable'
}
```

### Mutual Trade Analysis
```javascript
{
    type: 'mutual_trade',
    comparison: 'favorable_ink' // 'neutral_ink' or 'unfavorable_ink'
}
```

### Similar Metrics Analysis
```javascript
{
    type: 'similar',
    metric: 'ctl', // 'rds', 'lvi', or 'bcr'
    threshold: 0.5 // Optional, defaults to 0.1
}
```

## Styling

The module generates HTML with the following CSS classes that should be styled:

- `.analysis-section` - Main analysis container
- `.stat-grid` - Grid container for stat items
- `.stat-item` - Individual stat analysis item
- `.stat-item-header` - Header text for stat items
- `.stat-item-value-container` - Container for value and percentage
- `.stat-item-value` - Main statistical value
- `.stat-item-percentage` - Percentage display
- `.stat-breakdown` - Color breakdown container
- `.color-chip` - Individual color indicators

## Browser Compatibility

- Modern browsers with ES6+ support
- Requires `fetch` API for data loading
- Uses CSS Grid and Flexbox for layouts

## Performance Considerations

- Analysis is performed client-side for responsiveness
- Large card databases may benefit from pagination in drill-down views
- Consider lazy-loading card images in drill-down modals

## Future Enhancements

- Add ability-based analysis (currently limited by cardAbilityMap dependency)
- Implement caching for repeated analyses
- Add export functionality for analysis results
- Support for custom analysis criteria
- Add more threat metrics (e.g., synergy scores, matchup-specific ratings)

## Troubleshooting

### Color Chips Not Displaying Correct Colors

**Issue**: Color chips appear as the same color or wrong color.

**Solution**: Ensure the color mapping object passed to `initialize()` uses the correct structure:
```javascript
// Correct structure
const inkColors = {
    Amber: { hex: '#FCD34D', name: 'Amber' },
    Amethyst: { hex: '#C084FC', name: 'Amethyst' },
    // ...
};

// The module accesses colors like: INK_COLORS[color]?.hex
```

**Common Mistake**: Passing just hex strings instead of objects:
```javascript
// Incorrect - will cause color issues
const inkColors = {
    Amber: '#FCD34D',
    Amethyst: '#C084FC',
    // ...
};
```

## Troubleshooting

### Common Issues

1. **Module not found**: Ensure `card_stat_analysis_module.js` is loaded after `unified_win_probability_utilities.js`

2. **Analysis not working**: Verify that `initialize()` has been called with valid card data and color mappings

3. **Styling issues**: Ensure all required CSS classes are styled in your application

4. **Event handling not working**: Make sure click handlers are properly attached to the analysis container

5. **Duplicate card counting**: The module automatically deduplicates cards by `fullName` to prevent counting multiple versions of the same card. This is the intended behavior for accurate statistics.

### Debug Information

Enable debug logging by checking the browser console for any errors during initialization or analysis.

## License

This module is part of the Lorcana utilities suite and follows the same licensing terms as the parent project.