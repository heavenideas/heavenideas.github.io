// Matchup & Interaction Analysis Module
// Handles character matchups, ability effect classification, and location interaction

import { extractCharacterKeywords } from './cardFeatures.js';
import { LORCANA_PATTERNS } from './cardData.js';

// Single character vs character matchup
export function calculateSingleMatchup(playerCharData, opponentCharData, turnType) {
    const pKeywords = extractCharacterKeywords(playerCharData);
    const oKeywords = extractCharacterKeywords(opponentCharData);
    let pStrength = playerCharData.strength || 0;
    const pWillpower = playerCharData.willpower || 0;
    const pCost = playerCharData.cost || 0;
    let oStrength = opponentCharData.strength || 0;
    const oWillpower = opponentCharData.willpower || 0;
    const oCost = opponentCharData.cost || 0;
    if (turnType === 'player' && oKeywords.Evasive && !pKeywords.Evasive) return { outcomeName: "NoInteraction_OpponentEvasive", classification: "Neutral", details: "Opponent is Evasive" };
    if (turnType === 'opponent' && pKeywords.Evasive && !oKeywords.Evasive) return { outcomeName: "NoInteraction_PlayerEvasive", classification: "Neutral", details: "Your character is Evasive" };
    if (turnType === 'player' && pKeywords.Challenger > 0) pStrength += pKeywords.Challenger;
    if (turnType === 'opponent' && oKeywords.Challenger > 0) oStrength += oKeywords.Challenger;
    let damageToPlayer = Math.max(0, oStrength - pKeywords.Resist);
    let damageToOpponent = Math.max(0, pStrength - oKeywords.Resist);
    const playerBanished = damageToPlayer >= pWillpower;
    const opponentBanished = damageToOpponent >= oWillpower;
    let result;
    if (playerBanished && opponentBanished) {
        const inkDiff = oCost - pCost;
        let classification = "Neutral";
        if (inkDiff >= 2) classification = "Positive";
        else if (inkDiff <= -2) classification = "Negative";
        result = { outcomeName: "BothBanished", classification, details: `Ink Diff (Opp-Player): ${inkDiff}` };
    } else if (!opponentBanished && playerBanished) {
        result = { outcomeName: "OpponentSurvives_PlayerBanished", classification: "Negative", details: "Your character banished" };
    } else if (opponentBanished && !playerBanished) {
        result = { outcomeName: "PlayerSurvives_OpponentBanished", classification: "Positive", details: "Opponent character banished" };
    } else if (!opponentBanished && !playerBanished) {
        result = { outcomeName: "BothSurvive", classification: "Neutral", details: "Stalemate, both survive" };
    } else {
        result = { outcomeName: "Unknown", classification: "Neutral", details: "Error in logic" };
    }
    return result;
}

// Ability effect classification on a target character
export function classifyAbilityEffectOnTarget(sourceCardInfo, abilityText, targetCharacterCard, sourceIsPlayerPerspective) {
    const cleanedAbilityText = (abilityText || "").replace(/\n/g, ' ').trim();
    if (!cleanedAbilityText) {
        return { classification: "NoInteraction", details: "No ability text.", card: sourceCardInfo };
    }
    const targetCharKeywords = extractCharacterKeywords(targetCharacterCard);
    const targetCharWillpower = targetCharacterCard.willpower || 0;
    // Ward Check: Ward protects from being CHOSEN, except by effects that say "each" or "all".
    const isSingleTarget = cleanedAbilityText.toLowerCase().includes('chosen');
    if (targetCharKeywords.Ward && isSingleTarget) {
        return { classification: "NoInteractionDueToWard", details: "Target character has Ward, protected from 'chosen' effects.", card: sourceCardInfo };
    }
    for (const category in LORCANA_PATTERNS) {
        for (const pattern of LORCANA_PATTERNS[category]) {
            const match = cleanedAbilityText.match(pattern.regex);
            if (match) {
                switch (category) {
                    case 'Banish':
                        // Check specific banish conditions against target character
                        const banishResult = checkBanishConditions(pattern, match, targetCharacterCard, cleanedAbilityText);
                        if (banishResult.canBanish) {
                            return { classification: "DirectRemoval", details: banishResult.details, card: sourceCardInfo };
                        } else {
                            return { classification: "NoInteraction", details: banishResult.details, card: sourceCardInfo };
                        }
                    case 'Damage':
                        const damageAmount = 0; // Could parse from match
                        if (damageAmount > 0) {
                            if (damageAmount >= targetCharWillpower) {
                                return { classification: "DirectRemoval", details: `Deals ${damageAmount} damage (lethal).`, card: sourceCardInfo };
                            } else {
                                return { classification: "PotentialRemoval", details: `Deals ${damageAmount} damage.`, card: sourceCardInfo };
                            }
                        }
                        break;
                    case 'Bounce':
                        return { classification: "DirectRemoval", details: `Bounces ${pattern.name}.`, card: sourceCardInfo };
                    case 'Add to Inkwell':
                        return { classification: "DirectRemoval", details: `Adds to Inkwell ${pattern.name}.`, card: sourceCardInfo };
                    case 'State':
                        return { classification: "AffectsNoRemoval", details: `Matched '${pattern.fullName}'.`, card: sourceCardInfo };
                    case 'Static':
                        if (pattern.name.includes('Cannot Be Challenged')) {
                            return { classification: "AffectsNoRemoval", details: `Cannot be challenged.`, card: sourceCardInfo };
                        }
                        break;
                }
            }
        }
    }
    return { classification: "NoInteraction", details: "Effect does not appear to target characters.", card: sourceCardInfo };
}

// Banish condition checker (simplified)
export function checkBanishConditions(pattern, match, targetCharacterCard, abilityText) {
    if (pattern.name === 'This Character') {
        return {
            canBanish: false,
            details: `'${pattern.name}' only affects the source character, not opponent characters.`
        };
    }
    if (pattern.name === 'As a Cost/Choice') {
        return {
            canBanish: false,
            details: `'${pattern.name}' is a cost/choice effect, not targeting opponent characters.`
        };
    }
    if (pattern.name === "Opponent's Choice") {
        return {
            canBanish: true,
            details: `'${pattern.name}' lets opponent choose their own character to banish.`
        };
    }
    // For now, assume can banish if pattern matches
    return {
        canBanish: true,
        details: `Can banish via '${pattern.name}'.`
    };
}

// Location interaction classification
export function classifyLocationInteraction(sourceCardInfo, abilityText, sourceIsPlayerPerspective) {
    const cleanedAbilityText = (abilityText || "").replace(/\n/g, ' ').trim();
    if (!cleanedAbilityText) return null;
    const banishPatterns = LORCANA_PATTERNS['Banish'] || [];
    const damagePatterns = LORCANA_PATTERNS['Damage'] || [];
    for (const pattern of banishPatterns) {
        if (pattern.regex.test(cleanedAbilityText) && cleanedAbilityText.toLowerCase().includes('location')) {
            return { canInteract: true, interactionType: "Banish", details: `Can banish a location via '${pattern.name}'.`, card: sourceCardInfo };
        }
    }
    for (const pattern of damagePatterns) {
        if (pattern.regex.test(cleanedAbilityText) && cleanedAbilityText.toLowerCase().includes('location')) {
            return { canInteract: true, interactionType: "Damage", details: `Can damage a location via '${pattern.name}'.`, card: sourceCardInfo };
        }
    }
    if (cleanedAbilityText.toLowerCase().includes('chosen location')) {
        return { canInteract: true, interactionType: "Target", details: "Can target a location.", card: sourceCardInfo };
    }
    return null;
} 