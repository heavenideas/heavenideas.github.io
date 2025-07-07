// Card Data & Pattern Utilities Module
// Handles fetching, parsing, and mapping card data and patterns

export const CARD_DATA_URL = 'https://raw.githubusercontent.com/heavenideas/similcana/refs/heads/main/database/allCards.json';
export const PATTERNS_URL = 'https://raw.githubusercontent.com/heavenideas/heavenideas.github.io/refs/heads/main/lorcanaUtils_MatchUpAnalyzer/lorcana_patterns.txt';

export let ALL_CARDS_DATA = null;
export const ALL_CARDS_MAP = new Map();
export let LORCANA_PATTERNS = {};

export async function fetchCardData() {
    const cardsResponse = await fetch(CARD_DATA_URL);
    if (!cardsResponse.ok) throw new Error(`HTTP error! status: ${cardsResponse.status}`);
    ALL_CARDS_DATA = await cardsResponse.json();
    ALL_CARDS_DATA.cards.forEach(card => {
        ALL_CARDS_MAP.set(card.fullName, card);
        if (card.simpleName && card.simpleName !== card.fullName) {
            ALL_CARDS_MAP.set(card.simpleName, card);
        }
    });
    return ALL_CARDS_DATA;
}

export async function fetchPatterns() {
    const patternsResponse = await fetch(PATTERNS_URL);
    if (!patternsResponse.ok) throw new Error(`HTTP error! status: ${patternsResponse.status}`);
    const patternsText = await patternsResponse.text();
    parseAndStorePatterns(patternsText);
    return LORCANA_PATTERNS;
}

export function parseAndStorePatterns(text) {
    LORCANA_PATTERNS = {};
    const patternBlocks = text.split('----------------------------------------').map(s => s.trim()).filter(Boolean);
    patternBlocks.forEach(block => {
        const nameMatch = block.match(/Pattern Name: (.*)/);
        const regexMatch = block.match(/Regex: \/(.*)\/(.*)/);
        if (nameMatch && regexMatch) {
            const fullName = nameMatch[1].trim();
            const [category, name] = fullName.split(': ');
            const regexString = regexMatch[1];
            const flags = regexMatch[2];
            if (!LORCANA_PATTERNS[category]) {
                LORCANA_PATTERNS[category] = [];
            }
            LORCANA_PATTERNS[category].push({
                name: name,
                fullName: fullName,
                regex: new RegExp(regexString, flags)
            });
        }
    });
    return LORCANA_PATTERNS;
} 