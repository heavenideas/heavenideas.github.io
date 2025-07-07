// Card Feature Extraction Module
// Handles extracting features, keywords, and traits from card data

import { LORCANA_PATTERNS } from './cardData.js';

export function extractCardFeatures(rawCard, patterns = LORCANA_PATTERNS) {
    // 1. Initialize the UWPCard object with basic stats.
    const features = {
        name: rawCard.name,
        cost: rawCard.cost,
        strength: rawCard.strength || 0,
        willpower: rawCard.willpower || 0,
        lore: rawCard.lore || 0,
        isUninkable: rawCard.inkable === false,
        keywords: new Set(),
        abilityPatterns: new Set(),
        rawData: rawCard,
    };
    // 2. Extract keywords from both the keywords field and ability text
    if (Array.isArray(rawCard.keywords)) {
        rawCard.keywords.forEach(kw => features.keywords.add(kw));
    }
    if (Array.isArray(rawCard.abilities)) {
        rawCard.abilities.forEach(ability => {
            if (ability.type === 'keyword' && ability.keyword) {
                features.keywords.add(ability.keyword);
            }
            const text = (ability.fullText || '').toLowerCase();
            ['rush', 'ward', 'evasive', 'resist', 'challenger', 'support', 'bodyguard', 'reckless', 'singer'].forEach(kw => {
                if (text.includes(kw)) features.keywords.add(kw.charAt(0).toUpperCase() + kw.slice(1));
            });
        });
    }
    if (Array.isArray(rawCard.subtypes)) {
        rawCard.subtypes.forEach(subtype => features.keywords.add(subtype));
    }
    // 3. Use the regex from patterns to identify all matching ability patterns
    let allText = Array.from(rawCard.fullTextSections || []).join(' ').replace(/\s+/g, ' ').trim();
    for (const category in patterns) {
        for (const pattern of patterns[category]) {
            pattern.regex.lastIndex = 0;
            if (pattern.regex && pattern.name && pattern.regex.test(allText)) {
                features.abilityPatterns.add(pattern.fullName);
            }
        }
    }
    // Scry effect
    features.scryEffect = { lookCount: 0, canFilterToBottom: false, canTutorToHand: false };
    const lookAtDeckPattern = patterns['Card Effect']?.find(p => p.fullName === 'Card Effect: Look at Deck');
    const lookMatch = lookAtDeckPattern ? (allText || '').match(/Look at the top (\d+|one|two|three|four|five)?(?: )?card(?:s?) of your deck/i) : null;
    if (lookMatch) {
        features.scryEffect.lookCount = getNumberFromText(lookMatch[1]);
        const filterToBottomPattern = patterns['Card Effect']?.find(p => p.fullName === 'Card Effect: Filter to Bottom');
        if (filterToBottomPattern && filterToBottomPattern.regex.test(allText)) {
            features.scryEffect.canFilterToBottom = true;
        }
        const deckToHandBottomPattern = patterns['Card Effect']?.find(p => p.fullName === 'Card Effect: Deck to Hand/Bottom');
        if (deckToHandBottomPattern && deckToHandBottomPattern.regex.test(allText)) {
            features.scryEffect.canTutorToHand = true;
        }
    }
    // Free play effect
    features.freePlayEffect = { maxCost: 0, trigger: 'None' };
    const freePlayPattern = patterns['Play']?.find(p => p.fullName === 'Play: For Free');
    const freePlayMatch = freePlayPattern ? (allText || '').match(freePlayPattern.regex) : null;
    if (freePlayMatch) {
        const costMatch = freePlayMatch[0].match(/with cost (\d+)/i);
        features.freePlayEffect.maxCost = costMatch ? parseInt(costMatch[1], 10) : 1;
        if (/(When you play this character)/gi.test(allText)) {
            features.freePlayEffect.trigger = 'OnPlay';
        } else if (/(When this character quests)/gi.test(allText)) {
            features.freePlayEffect.trigger = 'OnQuest';
        } else {
            features.freePlayEffect.trigger = 'Other';
        }
    }
    return features;
}

export function extractCharacterKeywords(card) {
    const keywords = { Resist: 0, Challenger: 0, Evasive: false, Ward: false };
    const otherKeywords = ['support', 'bodyguard', 'reckless', 'singer'];
    if (card.abilities && Array.isArray(card.abilities)) {
        card.abilities.forEach(ability => {
            if (ability.type === 'keyword') {
                const lowerKeyword = ability.keyword.toLowerCase();
                if (lowerKeyword === 'resist') keywords.Resist = ability.keywordValueNumber || 0;
                else if (lowerKeyword === 'challenger') keywords.Challenger = ability.keywordValueNumber || 0;
                else if (lowerKeyword === 'evasive') keywords.Evasive = true;
                else if (lowerKeyword === 'ward') keywords.Ward = true;
                else if (otherKeywords.includes(lowerKeyword)) {
                    keywords[ability.keyword.toLowerCase()] = true;
                }
            }
        });
    }
    if (card.subtypes && Array.isArray(card.subtypes)) {
        card.subtypes.forEach(subtype => {
            keywords[subtype.toLowerCase()] = true;
        });
    }
    return keywords;
}

export function extractAllCharacterTraits(characterCard) {
    const traits = new Set();
    const abilitiesText = (characterCard.abilities || []).map(a => a.fullText).join(' ');
    const keywords = extractCharacterKeywords(characterCard);
    Object.entries(keywords).forEach(([key, value]) => {
        if (value === true) traits.add(key.charAt(0).toUpperCase() + key.slice(1));
        else if (typeof value === 'number' && value > 0) traits.add(`${key.charAt(0).toUpperCase() + key.slice(1)} +${value}`);
    });
    if (LORCANA_PATTERNS['Static']) {
        LORCANA_PATTERNS['Static'].forEach(pattern => {
            if (pattern.regex.test(abilitiesText)) {
                traits.add(pattern.name);
            }
        });
    }
    ['Vanish', 'Sing Together', 'Puppy Shift', 'Universal Shift'].forEach(kw => {
         if (abilitiesText.includes(kw)) {
             const match = abilitiesText.match(new RegExp(`(${kw}( \\d+)?)`));
             if (match) traits.add(match[1]);
         }
    });
    return traits.size > 0 ? Array.from(traits).join(', ') : 'No notable keywords/abilities.';
}

export function getSongSingCost(songCard) {
    if (!songCard) return 0;
    const songCostPattern = LORCANA_PATTERNS['Play']?.find(p => p.name === 'Song');
    if (songCostPattern) {
        const match = (songCard.fullText || '').match(songCostPattern.regex);
        if (match && match[1]) {
            return parseInt(match[1], 10);
        }
    }
    return songCard.cost || 0;
}

// Helper for text-to-number conversion
export function getNumberFromText(textNumber) {
    let number;
    if (/( a | one )/gi.test(textNumber)) {
        number = 1;
    } else if (/( two )/gi.test(textNumber)) {
        number = 2;
    } else if (/( three )/gi.test(textNumber)) {
        number = 3;
    } else {
        const [match] = textNumber.match(/(\d+)/) || [];
        number = parseInt(match, 10);
    }
    return number;
} 