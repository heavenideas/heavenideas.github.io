// Tempo Flow Analysis (TFA) Module
// Handles TFA calculation and breakdown rendering

import { getRDS, getLVI, getBCR } from './metrics.js';

/**
 * Calculates the Tempo Flow Analysis (TFA) score for a deck, using existing RDS/LVI/BCR breakdowns and card counts.
 * @param {Array<object>} deckEntries - Original deck entries with counts.
 * @param {Array<object>} uwpCards - Enriched UWPCard objects (same order as deckEntries).
 * @param {Array<{name: string, value: number}>} rdsBreakdown - getRDS(deck).breakdown
 * @param {Array<{name: string, value: number}>} lviBreakdown - getLVI(deck).breakdown
 * @param {Array<{name: string, value: number}>} bcrBreakdown - getBCR(deck).breakdown
 * @param {object} phaseWeights - { early: number, mid: number, late: number }
 * @returns {{ total: number, phaseScores: object, details: object }}
 */
export function calculateTFA(deckEntries, uwpCards, rdsBreakdown, lviBreakdown, bcrBreakdown, phaseWeights) {
    const rdsMap = Object.fromEntries(rdsBreakdown.map(row => [row.name, row.value]));
    const lviMap = Object.fromEntries(lviBreakdown.map(row => [row.name, row.value]));
    const bcrMap = Object.fromEntries(bcrBreakdown.map(row => [row.name, row.value]));
    const phases = {
        early: { turns: [1, 2, 3], threatPower: 0, consistency: 0, perTurn: {}, turnDetails: [] },
        mid: { turns: [4, 5, 6], threatPower: 0, consistency: 0, perTurn: {}, turnDetails: [] },
        late: { turns: [7, 8, 9, 10, 11, 12], threatPower: 0, consistency: 0, perTurn: {}, turnDetails: [] },
    };
    Object.entries(phases).forEach(([phase, obj]) => {
        obj.turns.forEach(cost => {
            obj.perTurn[cost] = { threatPower: 0, count: 0, cards: [] };
        });
    });
    deckEntries.forEach((entry, idx) => {
        const count = entry.count || 1;
        const cost = entry.cost;
        const name = entry.fullName;
        const threatPower = (rdsMap[name] || 0) + (lviMap[name] || 0) + (bcrMap[name] || 0);
        Object.entries(phases).forEach(([phase, obj]) => {
            if (obj.turns.includes(cost)) {
                obj.perTurn[cost].threatPower += threatPower / count;
                obj.perTurn[cost].count += count;
                obj.perTurn[cost].cards.push({ card: entry, count, threatPower });
            }
        });
    });
    Object.entries(phases).forEach(([phase, obj]) => {
        let totalThreat = 0;
        let turnsWithThreat = 0;
        obj.turnDetails = [];
        obj.turns.forEach(cost => {
            const turn = obj.perTurn[cost];
            let turnReason = '';
            let selectedCards = [];
            if (turn.count > 0) {
                turnsWithThreat++;
                let maxThreat = Math.max(...turn.cards.map(c => c.threatPower));
                selectedCards = turn.cards.filter(c => c.threatPower === maxThreat);
                if (selectedCards.length === 1) {
                    turnReason = `Highest threat power for cost ${cost}`;
                } else if (selectedCards.length > 1) {
                    turnReason = `Tie for highest threat power for cost ${cost}`;
                }
            } else {
                turnReason = 'No card available for this cost';
            }
            totalThreat += turn.threatPower;
            obj.turnDetails.push({
                cost,
                selectedCards,
                totalThreat: turn.threatPower,
                reason: turnReason
            });
        });
        obj.threatPower = totalThreat;
        obj.consistency = turnsWithThreat / obj.turns.length;
    });
    const total =
        (phases.early.threatPower * phases.early.consistency * (phaseWeights.early || 1)) +
        (phases.mid.threatPower * phases.mid.consistency * (phaseWeights.mid || 1)) +
        (phases.late.threatPower * phases.late.consistency * (phaseWeights.late || 1));
    return {
        total,
        phaseScores: {
            early: phases.early.threatPower * phases.early.consistency,
            mid: phases.mid.threatPower * phases.mid.consistency,
            late: phases.late.threatPower * phases.late.consistency,
        },
        details: phases,
    };
} 