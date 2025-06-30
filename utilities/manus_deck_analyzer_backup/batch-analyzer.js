class BatchAnalyzer {
    constructor(dataManager, deckParser, statisticalEngine, interactionAnalyzer) {
        this.dataManager = dataManager;
        this.deckParser = deckParser;
        this.statisticalEngine = statisticalEngine;
        this.interactionAnalyzer = interactionAnalyzer;
        this.metaDecks = {}; // Stores {name: {deckObject, decklistText}}
    }

    addMetaDeck(name, decklistText) {
        const parsedDeck = this.deckParser.parseDeckList(decklistText);
        const validation = this.deckParser.validateDeck(parsedDeck);

        if (!validation.isValid) {
            return { success: false, message: `Validation failed for ${name}: ${validation.errors.join(", ")}` };
        }

        this.metaDecks[name] = { deck: parsedDeck, decklistText: decklistText };
        return { success: true, message: `Meta deck "${name}" added successfully.` };
    }

    removeMetaDeck(name) {
        if (this.metaDecks[name]) {
            delete this.metaDecks[name];
            return { success: true, message: `Meta deck "${name}" removed.` };
        } else {
            return { success: false, message: `Meta deck "${name}" not found.` };
        }
    }

    clearMetaDecks() {
        this.metaDecks = {};
        return { success: true, message: "All meta decks cleared." };
    }

    getMetaDeckNames() {
        return Object.keys(this.metaDecks);
    }

    analyzeBatchMatchups(playerDeck) {
        const matchups = [];
        let favorableMatchups = 0;
        let evenMatchups = 0;
        let unfavorableMatchups = 0;
        let totalScore = 0;

        for (const opponentName in this.metaDecks) {
            const opponentDeck = this.metaDecks[opponentName].deck;
            const matchupResult = this.analyzeSingleMatchup(playerDeck, opponentDeck);
            matchups.push({
                opponentName: opponentName,
                overallScore: matchupResult.overallScore,
                details: matchupResult.details
            });

            totalScore += matchupResult.overallScore;
            if (matchupResult.overallScore > 0.6) {
                favorableMatchups++;
            } else if (matchupResult.overallScore < 0.4) {
                unfavorableMatchups++;
            } else {
                evenMatchups++;
            }
        }

        return {
            summary: {
                totalAnalyzed: matchups.length,
                favorableMatchups: favorableMatchups,
                evenMatchups: evenMatchups,
                unfavorableMatchups: unfavorableMatchups,
                averageScore: matchups.length > 0 ? totalScore / matchups.length : 0
            },
            matchups: matchups
        };
    }

    analyzeSingleMatchup(playerDeck, opponentDeck) {
        // This is a simplified scoring model. Can be expanded significantly.
        // Factors:
        // 1. Character Interaction Score: How well player's characters trade with opponent's
        // 2. Speed Score: Based on ink curve/expected lore (who can play threats faster/more consistently)
        // 3. Consistency Score: Based on color count, card type distribution

        let interactionScore = 0;
        let totalInteractions = 0;
        let favorableInteractions = 0;

        const playerCharacters = playerDeck.cards.filter(card => card.type === "Character");
        const opponentCharacters = opponentDeck.cards.filter(card => card.type === "Character");

        playerCharacters.forEach(pChar => {
            opponentCharacters.forEach(oChar => {
                totalInteractions++;
                const result = this.interactionAnalyzer.analyzeCharacterVsCharacter(pChar, oChar, { isChallenging: true });
                if (result.outcome === "PLAYER_WINS") {
                    interactionScore += 1;
                    favorableInteractions++;
                } else if (result.outcome === "OPPONENT_WINS") {
                    interactionScore -= 1;
                }
                // Even/Both Banish are neutral for this score
            });
        });

        // Normalize interaction score to 0-1
        if (totalInteractions > 0) {
            interactionScore = (interactionScore + totalInteractions) / (2 * totalInteractions); // Scale from -1 to 1 to 0 to 1
        } else {
            interactionScore = 0.5; // Neutral if no characters
        }

        // Speed Score (simplified: based on average ink cost)
        const playerAvgCost = playerDeck.cards.reduce((sum, card) => sum + (card.cost * card.quantity), 0) / playerDeck.totalCards;
        const opponentAvgCost = opponentDeck.cards.reduce((sum, card) => sum + (card.cost * card.quantity), 0) / opponentDeck.totalCards;
        let speedScore = 0.5; // Default to even
        if (playerAvgCost < opponentAvgCost) {
            speedScore = 0.5 + (opponentAvgCost - playerAvgCost) * 0.05; // Player is faster
        } else if (playerAvgCost > opponentAvgCost) {
            speedScore = 0.5 - (playerAvgCost - opponentAvgCost) * 0.05; // Opponent is faster
        }
        speedScore = Math.max(0, Math.min(1, speedScore)); // Clamp between 0 and 1

        // Consistency Score (simplified: penalize more than 2 colors)
        let consistencyScore = 1;
        if (playerDeck.colors.length > 2) {
            consistencyScore -= 0.2; // Penalty for 3+ colors
        }
        consistencyScore = Math.max(0, consistencyScore); // Clamp at 0

        // Overall Score (weighted average)
        const overallScore = (interactionScore * 0.5) + (speedScore * 0.3) + (consistencyScore * 0.2);

        return {
            overallScore: overallScore,
            details: {
                interactionScore: interactionScore,
                speedScore: speedScore,
                consistencyScore: consistencyScore,
                favorableInteractions: favorableInteractions,
                totalInteractions: totalInteractions
            }
        };
    }

    exportResults(results, format) {
        if (format === 'csv') {
            let csv = "Opponent Deck,Overall Score,Interaction Score,Speed Score,Consistency Score,Favorable Interactions,Total Interactions\n";
            results.matchups.forEach(matchup => {
                csv += `"${matchup.opponentName}",` +
                       `${(matchup.overallScore * 100).toFixed(1)}%,` +
                       `${(matchup.details.interactionScore * 100).toFixed(1)}%,` +
                       `${(matchup.details.speedScore * 100).toFixed(1)}%,` +
                       `${(matchup.details.consistencyScore * 100).toFixed(1)}%,` +
                       `${matchup.details.favorableInteractions},` +
                       `${matchup.details.totalInteractions}\n`;
            });
            return csv;
        }
        return "";
    }
}

export default BatchAnalyzer;


