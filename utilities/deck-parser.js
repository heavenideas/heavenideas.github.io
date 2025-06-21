class DeckParser {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    parseDeckList(deckListText) {
        const lines = deckListText.split("\n").filter(line => line.trim());
        const deck = {
            cards: [],
            totalCards: 0,
            colors: new Set(),
            inkCurve: new Array(11).fill(0), // 0-10+ cost
            cardTypes: {
                character: 0,
                action: 0,
                item: 0,
                location: 0
            }
        };

        lines.forEach(line => {
            const match = line.match(/^(\d+)\s+(.+)$/);
            if (match) {
                const quantity = parseInt(match[1]);
                const cardName = match[2].trim();
                const cardData = this.dataManager.findCard(cardName);

                if (cardData) {
                    const deckCard = {
                        ...cardData,
                        quantity: quantity
                    };
                    
                    deck.cards.push(deckCard);
                    deck.totalCards += quantity;
                    deck.colors.add(cardData.color);
                    
                    // Build ink curve
                    const cost = Math.min(cardData.cost || 0, 10);
                    deck.inkCurve[cost] += quantity;
                    
                    // Count card types
                    const type = cardData.type.toLowerCase();
                    if (deck.cardTypes.hasOwnProperty(type)) {
                        deck.cardTypes[type] += quantity;
                    }
                } else {
                    console.warn(`Card not found: ${cardName}`);
                }
            }
        });

        deck.colors = Array.from(deck.colors);
        return deck;
    }

    validateDeck(deck) {
        const errors = [];
        const warnings = [];

        // Check total card count
        if (deck.totalCards !== 60) {
            errors.push(`Deck must contain exactly 60 cards (current: ${deck.totalCards})`);
        }

        // Check card limits (max 4 copies)
        deck.cards.forEach(card => {
            if (card.quantity > 4) {
                errors.push(`${card.name} exceeds 4-copy limit (${card.quantity} copies)`);
            }
        });

        // Check color consistency
        if (deck.colors.length > 2) {
            warnings.push(`Deck contains ${deck.colors.length} colors, which may affect consistency`);
        }

        return { errors, warnings, isValid: errors.length === 0 };
    }
}

export default DeckParser;


class DeckParser {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }

    parseDeckList(deckListText) {
        const lines = deckListText.split("\n").filter(line => line.trim());
        const deck = {
            cards: [],
            totalCards: 0,
            colors: new Set(),
            inkCurve: new Array(11).fill(0), // 0-10+ cost
            cardTypes: {
                character: 0,
                action: 0,
                item: 0,
                location: 0
            }
        };

        lines.forEach(line => {
            const match = line.match(/^(\d+)\s+(.+)$/);
            if (match) {
                const quantity = parseInt(match[1]);
                const cardName = match[2].trim();
                const cardData = this.dataManager.findCard(cardName);

                if (cardData) {
                    const deckCard = {
                        ...cardData,
                        quantity: quantity
                    };
                    
                    deck.cards.push(deckCard);
                    deck.totalCards += quantity;
                    deck.colors.add(cardData.color);
                    
                    const cost = Math.min(cardData.cost || 0, 10);
                    deck.inkCurve[cost] += quantity;
                    
                    const type = cardData.type.toLowerCase();
                    if (deck.cardTypes.hasOwnProperty(type)) {
                        deck.cardTypes[type] += quantity;
                    }
                } else {
                    console.warn(`Card not found: ${cardName}`);
                }
            }
        });

        deck.colors = Array.from(deck.colors);
        return deck;
    }

    validateDeck(deck) {
        const errors = [];
        const warnings = [];

        if (deck.totalCards !== 60) {
            errors.push(`Deck must contain exactly 60 cards (current: ${deck.totalCards})`);
        }

        deck.cards.forEach(card => {
            if (card.quantity > 4) {
                errors.push(`${card.name} exceeds 4-copy limit (${card.quantity} copies)`);
            }
        });

        if (deck.colors.length > 2) {
            warnings.push(`Deck contains ${deck.colors.length} colors, which may affect consistency`);
        }

        return { errors, warnings, isValid: errors.length === 0 };
    }
}

export default DeckParser;


