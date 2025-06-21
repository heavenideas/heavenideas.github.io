class StatisticalEngine {
    static calculateExpectedLore(deck) {
        let totalLore = 0;
        deck.cards.forEach(card => {
            if (card.lore) {
                totalLore += card.lore * card.quantity;
            }
        });
        return totalLore / deck.totalCards;
    }

    static analyzeOpeningHand(deck) {
        // Simplified for now: calculate probability of drawing at least one character, action, and item
        // In a real scenario, this would involve hypergeometric distribution for specific card counts
        const totalCards = deck.totalCards;
        const handSize = 7; // Assuming opening hand size

        const characterCount = deck.cardTypes.character;
        const actionCount = deck.cardTypes.action;
        const itemCount = deck.cardTypes.item;

        // Probability of drawing at least one character
        const probAtLeastOneCharacter = 1 - this.hypergeometricProbability(totalCards, characterCount, handSize, 0);
        // Probability of drawing at least one action
        const probAtLeastOneAction = 1 - this.hypergeometricProbability(totalCards, actionCount, handSize, 0);
        // Probability of drawing at least one item
        const probAtLeastOneItem = 1 - this.hypergeometricProbability(totalCards, itemCount, handSize, 0);

        return {
            characters: probAtLeastOneCharacter,
            actions: probAtLeastOneAction,
            items: probAtLeastOneItem
        };
    }

    static hypergeometricProbability(N, K, n, k) {
        // N: population size (total cards in deck)
        // K: number of success states in the population (e.g., total characters)
        // n: number of draws (hand size)
        // k: number of observed successes (e.g., characters in hand)

        if (k < 0 || k > n || k > K || n - k > N - K) {
            return 0; // Invalid parameters
        }

        const combinations = (total, choose) => {
            if (choose < 0 || choose > total) {
                return 0;
            }
            if (choose === 0 || choose === total) {
                return 1;
            }
            if (choose > total / 2) {
                choose = total - choose;
            }
            let res = 1;
            for (let i = 1; i <= choose; i++) {
                res = res * (total - i + 1) / i;
            }
            return res;
        };

        const prob = (combinations(K, k) * combinations(N - K, n - k)) / combinations(N, n);
        return prob;
    }
}

export default StatisticalEngine;


