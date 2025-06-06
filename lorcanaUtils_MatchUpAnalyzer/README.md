# Lorcana Matchup Analyzer

## Overview

The Lorcana Matchup Analyzer is a powerful, single-page web application designed to give Disney Lorcana players deep strategic insights into deck matchups. By inputting your deck and an opponent's deck, you can instantly visualize critical interactions, identify threats, and discover opportunities. This tool moves beyond simple deck stats to provide a card-by-card breakdown of how specific matchups are likely to unfold, helping you make more informed decisions both during deckbuilding and in the heat of a game.

## How It Works

The application operates in a straightforward three-step process:

1. Load Decks: The user provides two decklists in a simple format ([number] [card name])—one for the player and one for the opponent. The application parses these lists, fetching detailed card information from an online JSON database.
    
2. Select Analysis Mode & Card: The user chooses what they want to analyze:
    

- My Character: Select one of your characters from a dropdown menu to see how it fares against the entire opposing board state.
    
- My Song: Select one of your songs to see its impact across all of the opponent's characters.
    

3. View Analysis: The application generates a detailed, color-coded breakdown of every potential interaction based on your selection, providing a clear visual guide to the matchup.
    

## Core Features

### 1. Character vs. Character Matchup Analysis

This is the core of the "Analyze My Character" mode. When you select one of your characters, the tool calculates the outcome of a direct challenge against every character in the opponent's deck.

- Turn Perspective: You can toggle the analysis between "My Turn" (you are the challenger) and "Opponent's Turn" (you are being challenged). This is crucial as it correctly applies abilities like the Challenger keyword.
    
- Trade Outcome Classification: Each matchup is categorized for quick assessment:
    

- Favorable Trade (Green): Your character survives, and the opponent's is banished.
    
- Unfavorable Trade (Red): Your character is banished, and the opponent's survives.
    
- Mutual Banish (Green/Yellow/Red): Both characters are banished. This is further sub-classified based on the ink cost difference to determine if it was a "trade up" (positive), "trade down" (negative), or neutral exchange.
    
- Stalemate (Blue): Neither character has enough strength to banish the other in a single challenge.
    
- No Interaction (Gray): A challenge is not possible, primarily due to the Evasive keyword.
    

- Keyword-Aware Logic: The calculations fully account for game-changing keywords like Challenger, Resist, and Evasive.
    

### 2. Character & Song Ability Analysis

The analyzer goes beyond simple stats by parsing the text of card abilities to determine their impact. This logic is centralized, allowing it to analyze effects from any source (Characters, Songs, etc.).

- Active Ability Identification: For character analysis on your turn, the tool identifies abilities that would trigger from actions like playing the character or challenging (e.g., "When you play this character...", "Whenever this character challenges...").
    
- Effect Classification Engine: Every relevant ability is classified based on its impact on a target:
    

- Direct Removal (Red/Green): The ability will unconditionally remove a character from the board. This includes effects that:
    

- Directly banish a character.
    
- Return a character to its player's hand.
    
- Deal lethal damage (damage amount ≥ target's Willpower).
    

- Potential Removal (Yellow/Lime): The ability could lead to removal but isn't guaranteed. This includes:
    

- Dealing non-lethal damage.
    
- Effects with conditions that are not met by the target (e.g., "Banish a character with cost 2 or less" used against a 4-cost character).
    
- Other conditional effects that are difficult to resolve automatically.
    

- Affects (No Direct Removal) (Blue/Teal): The ability interacts with the character without removing it, such as by exerting, preventing challenges/quests, or reducing stats.
    
- No Interaction / Warded (Gray): The ability either doesn't target the card or is blocked by the Ward keyword.
    

- Conditional Logic: The engine is robust enough to parse conditions based on a target's Cost, Willpower, Strength (¤), and specific keywords (e.g., "Banish chosen Evasive character").
    

### 3. Song Interaction Analysis

This feature provides a focused view on the power of songs.

- Threats to Your Character: In "Analyze My Character" mode, a dedicated section shows which of the opponent's songs can remove or affect your selected character, categorized by the effect classification engine.
    
- Your Song's Impact: In "Analyze My Song" mode, you can select one of your songs and see a full breakdown of its effect on every character in the opponent's deck, showing you exactly what it can remove, damage, or affect.
    

### 4. Location Interaction Analysis

A dedicated section of the UI provides a high-level overview of which cards in each deck can interact with locations, helping players assess location threats and removal options.

- Identifies Location Threats: It lists all characters and songs in the opponent's deck that have abilities to "banish" or "target" your locations.
    
- Identifies Your Location Removal: It lists all characters and songs in your deck that can "banish" or "target" the opponent's locations.
    

## How to Use

1. Open the HTML File: Launch the lorcana_matchup_analyzer.html file in any modern web browser.
    
2. Input Decklists: Paste your decklist and the opponent's decklist into the corresponding text boxes. The format is quantity card_name, with each card on a new line (e.g., 4 Madam Mim - Fox).
    
3. Analyze Decks: Click the "Load Decks & Analyze" button.
    
4. Choose Mode:
    

- To analyze a character, leave the "My Character" radio button selected, choose a character from the dropdown, and select the turn perspective.
    
- To analyze a song, select the "My Song" radio button and choose a song from its dropdown.
    

5. Review Results: The analysis will automatically generate below the controls. Hover over any card image to see a detailed tooltip about the specific interaction. The results for the Location Analysis will appear at the bottom.
    

## Technical Details

- Frontend: The application is a self-contained HTML file.
    
- Styling: Styled with Tailwind CSS for a responsive, modern, dark-mode interface.
    
- Logic: All logic is handled by client-side vanilla JavaScript. There is no backend server required.
    
- Data Source: Card data, including images and abilities, is fetched dynamically from the [Similcana Project's allCards.json file](https://raw.githubusercontent.com/heavenideas/similcana/refs/heads/main/database/allCards.json) on initialization.
    

This tool is designed for providing strategic guidance. While the text-parsing engine is built to be robust, extremely complex or uniquely worded card interactions may not be captured with 100% accuracy.

