// Deck Parsing & Management Module
// Handles parsing decklists and managing deck state

import { ALL_CARDS_MAP } from './cardData.js';

export function parseDeckString(deckString) {
    const lines = deckString.trim().split('\n');
    const characters = [];
    const songs = [];
    const locations = [];
    const items = [];
    const actions = [];
    const uniqueCharNames = new Set();
    const uniqueSongNames = new Set();
    const uniqueLocationNames = new Set();
    const uniqueItemNames = new Set();
    const uniqueActionNames = new Set();
    lines.forEach(line => {
        line = line.trim();
        if (!line) return;
        const match = line.match(/^(\d+)\s+(.+)/);
        if (match) {
            const count = parseInt(match[1], 10);
            const cardName = match[2].trim();
            const cardData = ALL_CARDS_MAP.get(cardName);
            if (cardData) {
                const cardWithCount = { ...cardData, count };
                if (cardData.type === 'Character') {
                    if (!uniqueCharNames.has(cardData.fullName)) {
                        characters.push(cardWithCount);
                        uniqueCharNames.add(cardData.fullName);
                    }
                } else if (cardData.type === 'Action' && cardData.subtypes?.includes('Song')) {
                    if (!uniqueSongNames.has(cardData.fullName)) {
                        songs.push(cardWithCount);
                        uniqueSongNames.add(cardData.fullName);
                    }
                } else if (cardData.type === 'Location') {
                    if (!uniqueLocationNames.has(cardData.fullName)) {
                        locations.push(cardWithCount);
                        uniqueLocationNames.add(cardData.fullName);
                    }
                } else if (cardData.type === 'Item') {
                    if (!uniqueItemNames.has(cardData.fullName)) {
                        items.push(cardWithCount);
                        uniqueItemNames.add(cardData.fullName);
                    }
                } else if (cardData.type === 'Action') {
                    if (!uniqueActionNames.has(cardData.fullName)) {
                        actions.push(cardWithCount);
                        uniqueActionNames.add(cardData.fullName);
                    }
                }
            } else {
                console.warn(`Card not found during parsing: ${cardName}`);
            }
        } else {
            console.warn(`Invalid deck line format during parsing: ${line}`);
        }
    });
    return {
        characters,
        songs,
        locations,
        items,
        actions
    };
}

// Session storage helpers
export function saveDeckToSession(key, value) {
    sessionStorage.setItem(key, value);
}

export function loadDeckFromSession(key) {
    return sessionStorage.getItem(key);
} 