// Unified Win Probability Model (UWPM) Module
// Handles win probability calculation and config

import { getRDS, getLVI, getBCR, normalizeScore } from './metrics.js';

// Default UWPM config
export const defaultUWPMConfig = {
    weights: {
        rds: 0.15,
        lvi: 0.15,
        bcr: 0.15,
        aim: 1.0,
        tfa: 0.0,
        taes: 1.0
    },
    rdsScale: 50,
    lviScale: 100,
    bcrScale: 75,
    k: 5,
    probabilityCompression: 0.05,
};

// Persistent config management
export function loadUWPMConfig() {
    let savedConfig = null;
    try {
        savedConfig = JSON.parse(localStorage.getItem('uwpmConfig'));
    } catch (e) { savedConfig = null; }
    if (savedConfig && typeof savedConfig === 'object') {
        return {
            ...defaultUWPMConfig,
            ...savedConfig,
            weights: { ...defaultUWPMConfig.weights, ...(savedConfig.weights || {}) }
        };
    }
    return { ...defaultUWPMConfig };
}

export function saveUWPMConfig(config) {
    localStorage.setItem('uwpmConfig', JSON.stringify(config));
}

/**
 * Calculates the final win probability for Deck A against Deck B.
 * @param {Array} deckA - The player's deck (enriched UWPCard objects).
 * @param {Array} deckB - The opponent's deck (enriched UWPCard objects).
 * @param {number} tfaA - Player's TFA score.
 * @param {number} tfaB - Opponent's TFA score.
 * @param {object} config - UWPM config object (optional).
 * @returns {number} - The win probability for Deck A (e.g., 0.55 for 55%).
 */
export function calculateWinProbability(deckA, deckB, tfaA = 0, tfaB = 0, config) {
    config = config || defaultUWPMConfig;
    // 1. Define Tuning Knobs
    const tuning = {
        rdsScale: config.rdsScale,
        lviScale: config.lviScale,
        bcrScale: config.bcrScale,
        kFactor: config.k,
        probabilityCompression: config.probabilityCompression
    };
    // 2. Calculate Intrinsic Scores for both decks
    const rdsA = getRDS(deckA, config.LORCANA_PATTERNS || {}).total;
    const lviA = getLVI(deckA).total;
    const bcrA = getBCR(deckA).total;
    const rdsB = getRDS(deckB, config.LORCANA_PATTERNS || {}).total;
    const lviB = getLVI(deckB).total;
    const bcrB = getBCR(deckB).total;
    // 3. Calculate Matchup-Specific Modifiers (now use provided TFA)
    const aim = 0; // Archetype Interaction Modifier
    const taes = 0; // Threat-Answer Efficiency Score
    // 4. Calculate NORMALIZED Score Differences
    const rdsDiff_norm = normalizeScore(rdsA - rdsB, tuning.rdsScale);
    const lviDiff_norm = normalizeScore(lviA - lviB, tuning.lviScale);
    const bcrDiff_norm = normalizeScore(bcrA - bcrB, tuning.bcrScale);
    // 4. Define weights (from config)
    const weights = config.weights;
    // 4. Calculate the final Matchup Score using the Master Equation
    let matchupScore =
        weights.rds * (rdsA - rdsB) +
        weights.lvi * (lviA - lviB) +
        weights.bcr * (bcrA - bcrB) +
        weights.aim * aim +
        weights.tfa * (tfaA - tfaB) +
        weights.taes * taes;
    // 4. Calculate the final Matchup Score using the Master Equation (normalized)
    const matchupScoreNormalized =
        weights.rds * rdsDiff_norm +
        weights.lvi * lviDiff_norm +
        weights.bcr * bcrDiff_norm +
        weights.aim * aim +
        weights.tfa * (tfaA - tfaB) +
        weights.taes * taes;
    // Use normalized by default
    let useNormalized = true;
    if (typeof config.useNormalized === 'boolean') useNormalized = config.useNormalized;
    if (useNormalized) {
        matchupScore = matchupScoreNormalized;
    }
    // 6. Convert the score to a probability using the Logistic Function with the k-factor
    const rawProbability = 1 / (1 + Math.exp(-tuning.kFactor * matchupScore));
    // 7. Apply Probability Compression
    const compressedProbability = rawProbability * (1 - 2 * tuning.probabilityCompression) + tuning.probabilityCompression;
    return compressedProbability;
} 