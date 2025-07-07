// Metric Calculations Module
// Handles RDS, LVI, BCR, and normalization

import { getNumberFromText } from './cardFeatures.js';

// RDS: Resource Dominance Score
export function getRDS(deck, LORCANA_PATTERNS) {
    let total = 0;
    let breakdown = [];
    deck.forEach(card => {
        let explanation = [];
        let value = 0;
        if (card.abilityPatterns && card.abilityPatterns.has('Card Effect: Draw')) {
            let drawCount = 1;
            value += drawCount * (2 / (card.cost || 1));
            explanation.push(`Draw (${drawCount})`);
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Card Effect: Hand to Inkwell')) {
            value += 2.0;
            explanation.push('Hand to Inkwell');
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Play: From Discard')) {
            value += 1.5;
            explanation.push('Play: From Discard');
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Card Effect: Discard to Hand')) {
            value += 1.5;
            explanation.push('Card Effect: Discard to Hand');
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Card Effect: Opponent Discards')) {
            value += 1.5;
            explanation.push('Opponent Discards');
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Stat: Cost Reduction')) {
            value += 1.0;
            explanation.push('Cost Reduction');
        }
        if (card.scryEffect && card.scryEffect.lookCount > 0) {
            let cardDQI = 0;
            cardDQI += card.scryEffect.lookCount * 1.0;
            let dqiParts = [`Scry: Look at ${card.scryEffect.lookCount}`];
            if (card.scryEffect.canFilterToBottom) {
                cardDQI += 1.0;
                dqiParts.push('Filter to Bottom');
            }
            if (card.scryEffect.canTutorToHand) {
                cardDQI += 2.5;
                dqiParts.push('Tutor to Hand');
                value += 0.8;
                explanation.push('Add to Hand (aka Tutor)');
            }
            let dqiValue = cardDQI / (card.cost || 1);
            value += dqiValue;
            explanation.push(`DQI: ${dqiParts.join(', ')} (+${dqiValue.toFixed(2)})`);
        }
        if (card.isUninkable) {
            value -= (card.cost || 1) * 0.25;
            explanation.push('Uninkable Burden');
        }
        if (card.freePlayEffect && card.freePlayEffect.maxCost > 0) {
            const reliabilityMod = { 'OnPlay': 1.0, 'OnQuest': 0.65, 'Other': 0.5 }[card.freePlayEffect.trigger] || 0.5;
            const cardCEV = card.freePlayEffect.maxCost * 1.0 * reliabilityMod;
            explanation.push(`Play this or other card for free: ${cardCEV.toFixed(2)}`);
            value += cardCEV;
        }
        let finalValue = value * (card.count || 1);
        breakdown.push({ name: card.rawData?.fullName || card.fullName, value: finalValue, explanation: explanation.join(', ') });
        total += finalValue;
    });
    return { total, breakdown };
}

// LVI: Lore Velocity Index
export function getLVI(deck) {
    let total = 0;
    let breakdown = [];
    deck.forEach(card => {
        let value = 0;
        let explanation = [];
        let baseLorePotential = (card.lore || 0) / (card.cost || 1);
        let allText = Array.from(card.rawData.fullTextSections || []).join(' ').replace(/\s+/g, ' ').trim();
        let loreSurvivabilityModifier = 1.0;
        if (card.lore > 0) {
            let questSafetyModifier = 1.0;
            if (card.keywords && card.keywords.has('Ward')) { loreSurvivabilityModifier *= 1.4; explanation.push('Ward'); }
            if (card.keywords && card.keywords.has('Resist')) { loreSurvivabilityModifier *= 1.2; explanation.push('Resist'); }
            if ((card.willpower || 0) >= 6) { loreSurvivabilityModifier *= 1.1; explanation.push('High Willpower'); }
            if (card.keywords && card.keywords.has('Evasive')) { questSafetyModifier *= 1.5; explanation.push('Evasive'); }
            value += baseLorePotential * loreSurvivabilityModifier * questSafetyModifier;
            explanation.unshift(`Lore: ${card.lore}`);
        } else {
            if (card.rawData.type && card.rawData.type.toLowerCase() === 'item') {loreSurvivabilityModifier = 3.0;}
        }
        if (card.abilityPatterns && card.abilityPatterns.has('State: Ready Character')) {
            value += 1.6 / (card.cost || 1);
            explanation.push('Ready Chose Character');
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Lore: Gain')) {
            const loreMatch = allText.match(/ain (\d+) (◊|lore)/gi);
            if (loreMatch) {
                const loreAmount = getNumberFromText(loreMatch[0])
                let loreBuff = 1.5 * loreAmount
                value += loreBuff / (card.cost || 1);
                explanation.push('Lore: Gain' ,loreAmount);
            } else {
                let loreBase = loreSurvivabilityModifier * 5.0 / (card.cost || 1) 
                value += loreBase;
                let explanationString = `Lore: Gain Special: ${loreSurvivabilityModifier} * 5 / card const (${(card.cost || 1)}) = ${loreBase.toFixed(2)}`;
                explanation.push(explanationString );
            }
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Lore: Lose')) {
            const loreMatch = allText.match(/loses (\d+) (◊|lore)/gi);
            if (loreMatch) {
                const loreAmount = getNumberFromText(loreMatch[0])
                let loreBuff = 1.5 * loreAmount
                value += loreBuff / (card.cost || 1);
                explanation.push('Lore: Opponent Loses' ,loreAmount);
            }
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Static: Stat Buff')) {
            const loreMatch = allText.match(/get(?:s)? \+(\d+) ◊/gi);
            if (loreMatch) {
                const loreAmount = getNumberFromText(loreMatch[0])
                let loreBuff = 1.5 * loreAmount
                value += loreBuff / (card.cost || 1);
                explanation.push('Static: Stat Buf: Lore:', loreAmount);
            }
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Damage: Heal')) {
            const healMatch = allText.match(/up to (\d+) damage/gi);
            if (healMatch){
                const healAmount = getNumberFromText(healMatch[0])
                value += healAmount / (card.cost || 1);
                explanation.push('Damage: Heal:',healAmount);
            }
        }
        let finalValue = value * (card.count || 1);
        breakdown.push({ name: card.rawData?.fullName || card.fullName, value: finalValue, explanation: explanation.join(', ') });
        total += finalValue;
    });
    return { total, breakdown };
}

// BCR: Board Control Rating
export function getBCR(deck) {
    let total = 0;
    let breakdown = [];
    deck.forEach(card => {
        let value = 0;
        let explanation = [];
        if (card.abilityPatterns && card.abilityPatterns.has('Banish: All Characters')) {
            value += 8.0;
            explanation.push('Banish All');
        }
        if (card.abilityPatterns && (card.abilityPatterns.has('Banish: Chosen Target') || card.abilityPatterns.has('Banish: Any') || card.abilityPatterns.has("Banish: Opponent's Choice"))) {
            value += 7 / (card.cost || 1);
            explanation.push('Banish Other Characters');
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Add to Inkwell: Opposing Character')) {
            value += 7 / (card.cost || 1);
            explanation.push('Add opposing character to their inkwell');
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Damage: Put Damage Counters')) {
            value += 4.5 / (card.cost || 1);
            explanation.push('Put Damage Counters');
        }
        if (card.abilityPatterns && (card.abilityPatterns.has('Damage: Deal to One') || card.abilityPatterns.has('Damage: Deal to Many'))) {
            value += 4 / (card.cost || 1);
            explanation.push('Deal Damage');
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Bounce: Opposing Character')) {
            value += 4 / (card.cost || 1);
            explanation.push('Bounce Opposing Character');
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Stat: Strength Buff')){
            const strengthMatch = (card.rawData.fullText.replace(/\n/g, ' ').trim() || '').match(/(?:all characters )?(?:get|gets|has|chosen character(?:s)?) \+(\d+) (¤|strength)/gi);
            if (strengthMatch) {
                const strengthAmount = getNumberFromText(strengthMatch[0])
                let strengthBuff = (1.5 * strengthAmount) / (card.cost || 1)
                value += strengthBuff;
                explanation.push('Static: Stat Buf: Strength:+', strengthAmount);
            }
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Stat: Strength Debuff')) {
            const strengthMatch = (card.rawData.fullText.replace(/\n/g, ' ').trim() || '').match(/(?:all characters )?(?:get|gets|has|chosen character(?:s)?) \-(\d+) (¤|strength)/gi);
            if (strengthMatch) {
                const strengthAmount = getNumberFromText(strengthMatch[0])
                let strengthBuff = (1.5 * strengthAmount) / (card.cost || 1)
                value += strengthBuff;
                explanation.push('Static: Stat Buf: Strength:+', strengthAmount);
            }
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Stat: Willpower Buff')) {
            const willpowerMatch = (card.rawData.fullText.replace(/\n/g, ' ').trim() || '').match(/(?:all characters )?(?:get|gets|has|chosen character(?:s)?) \+(\d+) (⛉|willpower)/gi);
            if (willpowerMatch) {
                const willpowerAmount = getNumberFromText(willpowerMatch[0])
                let willpowerBuff = (1.5 * willpowerAmount)  / (card.cost || 1)
                value += willpowerBuff;
                explanation.push('Static: Stat Buf: Willpower:+', willpowerAmount);
            }
        }
        if (card.abilityPatterns && card.abilityPatterns.has('Static: Grant Keyword (Aura)')) {
            const resistMatch = (card.rawData.fullText.replace(/\n/g, ' ').trim() || '').match(/(?:Your other characters|they|it) gain(?:s)? (Resist \+\d+)/gi);
            if (resistMatch) {
                const resistAmount = getNumberFromText(resistMatch[0])
                let resistBuff = (1.5 * resistAmount) / (card.cost || 1)
                value += resistBuff;
                explanation.push('Static: Grant Keyword(Resist):+', resistAmount);
            }
        }
        if (card.keywords && card.keywords.has('Rush')) {
            value += (card.strength || 0) * 0.5;
            explanation.push('Rush');
        }
        let finalValue = value * (card.count || 1);
        breakdown.push({ name: card.rawData?.fullName || card.fullName, value: finalValue, explanation: explanation.join(', ') });
        total += finalValue;
    });
    return { total, breakdown };
}

// Normalization
export function normalizeScore(score, scale = 50) {
    return Math.tanh(score / scale);
} 