class InteractionAnalyzer {
    analyzeCharacterVsCharacter(playerChar, opponentChar, options = {}) {
        const isChallenging = options.isChallenging || false;
        let playerStrength = playerChar.strength;
        let opponentStrength = opponentChar.strength;
        let playerWillpower = playerChar.willpower;
        let opponentWillpower = opponentChar.willpower;

        const abilityInteractions = [];
        let details = { reason: null, attackerDamageDealt: playerStrength, defenderDamageTaken: opponentStrength };

        // Helper to check for keyword ability
        const hasKeyword = (card, keyword) => card.abilities && card.abilities.some(a => a.name === keyword);

        // Handle Evasive
        const playerEvasive = hasKeyword(playerChar, "Evasive");
        const opponentEvasive = hasKeyword(opponentChar, "Evasive");

        if (isChallenging) {
            if (opponentEvasive && !playerEvasive) {
                details.reason = `${playerChar.name} cannot challenge ${opponentChar.name} because ${opponentChar.name} has Evasive and ${playerChar.name} does not.`;
                return { outcome: "CANNOT_CHALLENGE", details, abilityInteractions };
            }
        }

        // Handle Ward (for abilities, not combat)
        const playerWard = hasKeyword(playerChar, "Ward");
        const opponentWard = hasKeyword(opponentChar, "Ward");

        // Handle Challenger
        const playerChallengerAbility = playerChar.abilities && playerChar.abilities.find(a => a.name === "Challenger");
        if (isChallenging && playerChallengerAbility) {
            const bonus = parseInt(playerChallengerAbility.text.match(/\+(\d+)/)[1]);
            playerStrength += bonus;
            abilityInteractions.push({ description: `${playerChar.name} gains +${bonus} Strength from Challenger.`, probability: 1 });
        }

        // Handle Resist
        const playerResistAbility = playerChar.abilities && playerChar.abilities.find(a => a.name === "Resist");
        const opponentResistAbility = opponentChar.abilities && opponentChar.abilities.find(a => a.name === "Resist");

        let playerResist = 0;
        if (playerResistAbility) {
            playerResist = parseInt(playerResistAbility.text.match(/Resist (\d+)/)[1]);
        }
        let opponentResist = 0;
        if (opponentResistAbility) {
            opponentResist = parseInt(opponentResistAbility.text.match(/Resist (\d+)/)[1]);
        }

        // Combat Calculation
        let playerDamageDealt = playerStrength;
        let opponentDamageDealt = opponentStrength;

        // Apply Resist
        playerDamageDealt = Math.max(0, playerDamageDealt - opponentResist);
        opponentDamageDealt = Math.max(0, opponentDamageDealt - playerResist);

        details.attackerDamageDealt = playerDamageDealt;
        details.defenderDamageTaken = opponentDamageDealt;

        const playerBanish = playerDamageDealt >= opponentWillpower;
        const opponentBanish = opponentDamageDealt >= playerWillpower;

        let outcome = "EVEN";
        if (playerBanish && !opponentBanish) {
            outcome = "PLAYER_WINS";
            details.reason = `${playerChar.name} banishes ${opponentChar.name}.`;
        } else if (!playerBanish && opponentBanish) {
            outcome = "OPPONENT_WINS";
            details.reason = `${opponentChar.name} banishes ${playerChar.name}.`;
        } else if (playerBanish && opponentBanish) {
            outcome = "BOTH_BANISH";
            details.reason = `Both ${playerChar.name} and ${opponentChar.name} banish each other.`;
        } else {
            outcome = "NO_BANISH";
            details.reason = `Neither ${playerChar.name} nor ${opponentChar.name} banishes the other.`;
        }

        // Further ability parsing (simplified for now, can be expanded)
        // Example: Rush (already handled by isChallenging, but could be explicitly noted)
        if (hasKeyword(playerChar, "Rush")) {
            abilityInteractions.push({ description: `${playerChar.name} has Rush, allowing it to challenge the turn it's played.`, probability: 1 });
        }
        if (hasKeyword(opponentChar, "Rush")) {
            abilityInteractions.push({ description: `${opponentChar.name} has Rush, allowing it to challenge the turn it's played.`, probability: 1 });
        }

        // Example: Bodyguard (simplified, just notes presence)
        if (hasKeyword(playerChar, "Bodyguard")) {
            abilityInteractions.push({ description: `${playerChar.name} has Bodyguard, protecting other characters.`, probability: 1 });
        }
        if (hasKeyword(opponentChar, "Bodyguard")) {
            abilityInteractions.push({ description: `${opponentChar.name} has Bodyguard, protecting other characters.`, probability: 1 });
        }

        // Example: Support (simplified, just notes presence)
        if (hasKeyword(playerChar, "Support")) {
            abilityInteractions.push({ description: `${playerChar.name} has Support, adding its Strength to another chosen character's Strength when questing.`, probability: 1 });
        }
        if (hasKeyword(opponentChar, "Support")) {
            abilityInteractions.push({ description: `${opponentChar.name} has Support, adding its Strength to another chosen character's Strength when questing.`, probability: 1 });
        }

        // Example: Reckless (simplified, just notes presence)
        if (hasKeyword(playerChar, "Reckless")) {
            abilityInteractions.push({ description: `${playerChar.name} has Reckless, meaning it must challenge if able.`, probability: 1 });
        }
        if (hasKeyword(opponentChar, "Reckless")) {
            abilityInteractions.push({ description: `${opponentChar.name} has Reckless, meaning it must challenge if able.`, probability: 1 });
        }

        return { outcome, details, abilityInteractions };
    }
}

export default InteractionAnalyzer;


