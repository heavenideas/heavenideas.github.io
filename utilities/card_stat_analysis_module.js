/**
 * Card Statistical Analysis Module
 *
 * A reusable module for analyzing Disney Lorcana cards with statistical comparisons
 * and combat analysis. Extracted from lorcana_card_explorer.html for modular reuse.
 *
 * Dependencies:
 * - unified_win_probability_utilities.js (for card metrics calculation)
 * - Card database with allCards array
 * - Color constants (INK_COLORS)
 */

const CardStatAnalysisModule = (function() {

    // Configuration - will be set by initialize function
    let allCards = [];
    let characterCards = [];
    let totalCardCount = 0;
    let totalCharacterCount = 0;
    let INK_COLORS = {};
    let unifiedWinProbabilityCalculation = null;

    /**
     * Initialize the module with required data
     * @param {Array} cardsData - Array of all card objects
     * @param {Object} inkColors - Color mapping object (e.g., {Amber: '#fecb00', ...})
     * @param {Object} uwpc - UnifiedWinProbabilityCalculation instance for CTL/RDS/LVI/BCR calculations
     */
    function initialize(cardsData, inkColors, uwpc = null) {
        allCards = cardsData;
        characterCards = allCards.filter(c => c.type === 'Character');
        totalCardCount = allCards.length;
        totalCharacterCount = characterCards.length;
        INK_COLORS = inkColors;
        unifiedWinProbabilityCalculation = uwpc;
    }

    /**
     * Get card colors helper function
     * @param {Object} card - Card object
     * @returns {Array} Array of color names
     */
    function getCardColors(card) {
        return card.colors || (card.color ? [card.color] : []);
    }

    /**
     * Count cards by color
     * @param {Array} cards - Array of card objects
     * @returns {Object} Object with color counts
     */
    function countByColor(cards) {
        const counts = {};
        // Initialize counts for all available colors
        Object.keys(INK_COLORS).forEach(c => counts[c] = 0);
        cards.forEach(card => {
            getCardColors(card).forEach(color => {
                if (counts[color] !== undefined) counts[color]++;
            });
        });
        return counts;
    }

    /**
     * Find cards matching specific criteria
     * @param {Object} criteria - Search criteria object
     * @param {Object} analyzedCard - The card being analyzed
     * @returns {Array} Array of unique matching cards (deduplicated by fullName)
     */
    function findMatchingCards(criteria, analyzedCard) {
        // Ability search needs to check all cards, not just characters
        const cardPool = criteria.type === 'ability' ? allCards : characterCards;

        // First filter by criteria
        const filteredCards = cardPool.filter(c => {
            if (c.id === analyzedCard.id && criteria.type !== 'ability') return false;

            const opponentWillpower = c.willpower || 0;
            const opponentStrength = c.strength || 0;
            const opponentCost = c.cost || 0;
            const yourWillpower = analyzedCard.willpower || 0;
            const yourStrength = analyzedCard.strength || 0;
            const yourCost = analyzedCard.cost || 0;

            switch (criteria.type) {
                case 'ability':
                    // This would need access to cardAbilityMap from the main application
                    // For now, return empty array - this functionality would need to be
                    // passed in from the main application
                    return false;
                case 'static':
                    return c.cost === criteria.stats.cost &&
                           c.strength === criteria.stats.strength &&
                           c.willpower === criteria.stats.willpower &&
                           (c.lore || 0) === (criteria.stats.lore || 0);
                case 'comparative':
                    if (criteria.stat === 'lore' && c.cost !== analyzedCard.cost) return false;
                    const cardStat = c[criteria.stat] || 0;
                    const analyzedStat = analyzedCard[criteria.stat] || 0;
                    if (criteria.comparison === '>') return cardStat > analyzedStat;
                    if (criteria.comparison === '<') return cardStat < analyzedStat;
                    return false;
                case 'trade':
                    if (criteria.comparison === 'favorable') {
                        return opponentWillpower <= yourStrength && yourWillpower > opponentStrength;
                    }
                    if (criteria.comparison === 'unfavorable') {
                        return opponentStrength >= yourWillpower && yourStrength < opponentWillpower;
                    }
                    return false;
                case 'mutual_trade':
                    const isMutualBanish = opponentWillpower > 0 && opponentWillpower <= yourStrength && yourWillpower <= opponentStrength;
                    if (!isMutualBanish) return false;

                    if (criteria.comparison === 'favorable_ink') return yourCost < opponentCost;
                    if (criteria.comparison === 'neutral_ink') return yourCost === opponentCost;
                    if (criteria.comparison === 'unfavorable_ink') return yourCost > opponentCost;
                    return false;
                case 'similar':
                    if (!unifiedWinProbabilityCalculation) return false;

                    const analyzedMetrics = unifiedWinProbabilityCalculation.calculateCardMetrics(analyzedCard);
                    const cardMetrics = unifiedWinProbabilityCalculation.calculateCardMetrics(c);

                    const analyzedValue = analyzedMetrics[criteria.metric];
                    const cardValue = cardMetrics[criteria.metric];
                    const threshold = criteria.threshold || 0.1;

                    return Math.abs(analyzedValue - cardValue) <= threshold;
                default:
                    return false;
            }
        });

        // Deduplicate by fullName to avoid counting multiple versions of the same card
        const uniqueCards = new Map();
        filteredCards.forEach(card => {
            if (!uniqueCards.has(card.fullName)) {
                uniqueCards.set(card.fullName, card);
            }
        });

        return Array.from(uniqueCards.values());
    }

    /**
     * Generate HTML for identical stats profile section
     * @param {Object} card - Card object to analyze
     * @param {Object} options - Rendering options
     * @returns {string} HTML string
     */
    function renderIdenticalStatsProfile(card, options = {}) {
        if (card.type !== 'Character') return '';

        const criteria = {
            type: 'static',
            stats: {
                cost: card.cost,
                strength: card.strength,
                willpower: card.willpower,
                lore: card.lore
            }
        };

        const matchingCards = findMatchingCards(criteria, card);
        const otherCards = matchingCards.filter(c => c.id !== card.id);
        const count = otherCards.length;
        const percentage = ((count / totalCharacterCount) * 100).toFixed(1);

        const breakdown = countByColor(otherCards);
        const breakdownChips = Object.entries(breakdown)
            .filter(([_, num]) => num > 0)
            .map(([color, num]) => `<div class="color-chip" data-color="${color}" style="background-color:${INK_COLORS[color] || '#9CA3AF'}">${num}</div>`)
            .join('');

        return `
            <div class="analysis-section">
                <h3>Identical Stats Profile</h3>
                <div class="stat-grid">
                    <div class="stat-item" data-criteria='${JSON.stringify(criteria)}'>
                       <div class="stat-item-header">Cost ${card.cost} | ¤ ${card.strength} | ⛉ ${card.willpower} | ◊ ${card.lore || 0}</div>
                       <div class="stat-item-value-container">
                            <div class="stat-item-value">${count}</div>
                            <div class="stat-item-percentage">(${percentage}%)</div>
                       </div>
                       <div class="stat-item-header" style="font-size:0.9rem; margin-top:5px; color:var(--text-muted)">Other cards with identical stats</div>
                       <div class="stat-breakdown">${breakdownChips}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Generate HTML for combat and stat analysis section
     * @param {Object} card - Card object to analyze
     * @param {Object} options - Rendering options
     * @returns {string} HTML string
     */
    function renderCombatAnalysis(card, options = {}) {
        if (card.type !== 'Character') return '';

        const statsToCompare = ['strength', 'willpower', 'lore'];
        let html = `<div class="analysis-section"><h3>Combat & Stat Analysis</h3><div class="stat-grid">`;

        statsToCompare.forEach(stat => {
            // MORE THAN
            const moreCriteria = { type: 'comparative', stat: stat, comparison: '>' };
            const moreCards = findMatchingCards(moreCriteria, card);
            const morePercentage = ((moreCards.length / totalCharacterCount) * 100).toFixed(1);
            const moreBreakdown = countByColor(moreCards);
            const moreChips = Object.entries(moreBreakdown)
               .filter(([_, num]) => num > 0).map(([color, num]) => `<div class="color-chip" data-color="${color}" style="background-color:${INK_COLORS[color] || '#9CA3AF'}">${num}</div>`).join('');

            html += `
               <div class="stat-item" data-criteria='${JSON.stringify(moreCriteria)}'>
                   <div class="stat-item-header">Higher ${stat.charAt(0).toUpperCase() + stat.slice(1)} ${stat === 'lore' ? '(at same cost)' : ''}</div>
                   <div class="stat-item-value-container">
                       <div class="stat-item-value">${moreCards.length}</div>
                       <div class="stat-item-percentage">(${morePercentage}%)</div>
                   </div>
                   <div class="stat-breakdown">${moreChips}</div>
               </div>
            `;

            // LESS THAN
            const lessCriteria = { type: 'comparative', stat: stat, comparison: '<' };
            const lessCards = findMatchingCards(lessCriteria, card);
            const lessPercentage = ((lessCards.length / totalCharacterCount) * 100).toFixed(1);
            const lessBreakdown = countByColor(lessCards);
            const lessChips = Object.entries(lessBreakdown)
               .filter(([_, num]) => num > 0).map(([color, num]) => `<div class="color-chip" data-color="${color}" style="background-color:${INK_COLORS[color] || '#9CA3AF'}">${num}</div>`).join('');

            html += `
               <div class="stat-item" data-criteria='${JSON.stringify(lessCriteria)}'>
                   <div class="stat-item-header">Lower ${stat.charAt(0).toUpperCase() + stat.slice(1)} ${stat === 'lore' ? '(at same cost)' : ''}</div>
                    <div class="stat-item-value-container">
                       <div class="stat-item-value">${lessCards.length}</div>
                       <div class="stat-item-percentage">(${lessPercentage}%)</div>
                   </div>
                   <div class="stat-breakdown">${lessChips}</div>
               </div>
            `;
        });

        // --- Favorable Trades ---
        const favorableCriteria = { type: 'trade', comparison: 'favorable' };
        const favorableCards = findMatchingCards(favorableCriteria, card);
        const favorablePercentage = ((favorableCards.length / totalCharacterCount) * 100).toFixed(1);
        const favorableBreakdown = countByColor(favorableCards);
        const favorableChips = Object.entries(favorableBreakdown)
            .filter(([_, num]) => num > 0).map(([color, num]) => `<div class="color-chip" data-color="${color}" style="background-color:${INK_COLORS[color] || '#9CA3AF'}">${num}</div>`).join('');

        html += `
            <div class="stat-item" data-criteria='${JSON.stringify(favorableCriteria)}'>
                <div class="stat-item-header">Favorable Trades (Banish & Survive)</div>
                <div class="stat-item-value-container">
                    <div class="stat-item-value">${favorableCards.length}</div>
                    <div class="stat-item-percentage">(${favorablePercentage}%)</div>
                </div>
                <div class="stat-breakdown">${favorableChips}</div>
            </div>
        `;

        // --- Unfavorable Trades ---
        const unfavorableCriteria = { type: 'trade', comparison: 'unfavorable' };
        const unfavorableCards = findMatchingCards(unfavorableCriteria, card);
        const unfavorablePercentage = ((unfavorableCards.length / totalCharacterCount) * 100).toFixed(1);
        const unfavorableBreakdown = countByColor(unfavorableCards);
        const unfavorableChips = Object.entries(unfavorableBreakdown)
            .filter(([_, num]) => num > 0).map(([color, num]) => `<div class="color-chip" data-color="${color}" style="background-color:${INK_COLORS[color] || '#9CA3AF'}">${num}</div>`).join('');

        html += `
            <div class="stat-item" data-criteria='${JSON.stringify(unfavorableCriteria)}'>
                <div class="stat-item-header">Unfavorable Trades (Get Banished & Opponent Survives)</div>
                <div class="stat-item-value-container">
                    <div class="stat-item-value">${unfavorableCards.length}</div>
                    <div class="stat-item-percentage">(${unfavorablePercentage}%)</div>
                </div>
                <div class="stat-breakdown">${unfavorableChips}</div>
            </div>
        `;

        // --- Mutual Banish Favorable Ink ---
        const mutualFavCriteria = { type: 'mutual_trade', comparison: 'favorable_ink' };
        const mutualFavCards = findMatchingCards(mutualFavCriteria, card);
        const mutualFavPercentage = ((mutualFavCards.length / totalCharacterCount) * 100).toFixed(1);
        const mutualFavBreakdown = countByColor(mutualFavCards);
        const mutualFavChips = Object.entries(mutualFavBreakdown)
            .filter(([_, num]) => num > 0).map(([color, num]) => `<div class="color-chip" data-color="${color}" style="background-color:${INK_COLORS[color] || '#9CA3AF'}">${num}</div>`).join('');

        html += `
            <div class="stat-item" data-criteria='${JSON.stringify(mutualFavCriteria)}'>
                <div class="stat-item-header">Mutual Banish (Favorable ⬡)</div>
                <div class="stat-item-value-container">
                    <div class="stat-item-value">${mutualFavCards.length}</div>
                    <div class="stat-item-percentage">(${mutualFavPercentage}%)</div>
                </div>
                <div class="stat-breakdown">${mutualFavChips}</div>
            </div>
        `;

        // --- Mutual Banish Neutral Ink ---
        const mutualNeuCriteria = { type: 'mutual_trade', comparison: 'neutral_ink' };
        const mutualNeuCards = findMatchingCards(mutualNeuCriteria, card);
        const mutualNeuPercentage = ((mutualNeuCards.length / totalCharacterCount) * 100).toFixed(1);
        const mutualNeuBreakdown = countByColor(mutualNeuCards);
        const mutualNeuChips = Object.entries(mutualNeuBreakdown)
            .filter(([_, num]) => num > 0).map(([color, num]) => `<div class="color-chip" data-color="${color}" style="background-color:${INK_COLORS[color] || '#9CA3AF'}">${num}</div>`).join('');

        html += `
            <div class="stat-item" data-criteria='${JSON.stringify(mutualNeuCriteria)}'>
                <div class="stat-item-header">Mutual Banish (Neutral ⬡)</div>
                <div class="stat-item-value-container">
                    <div class="stat-item-value">${mutualNeuCards.length}</div>
                    <div class="stat-item-percentage">(${mutualFavPercentage}%)</div>
                </div>
                <div class="stat-breakdown">${mutualNeuChips}</div>
            </div>
        `;

        // --- Mutual Banish Unfavorable Ink ---
        const mutualUnfavCriteria = { type: 'mutual_trade', comparison: 'unfavorable_ink' };
        const mutualUnfavCards = findMatchingCards(mutualUnfavCriteria, card);
        const mutualUnfavPercentage = ((mutualUnfavCards.length / totalCharacterCount) * 100).toFixed(1);
        const mutualUnfavBreakdown = countByColor(mutualUnfavCards);
        const mutualUnfavChips = Object.entries(mutualUnfavBreakdown)
            .filter(([_, num]) => num > 0).map(([color, num]) => `<div class="color-chip" data-color="${color}" style="background-color:${INK_COLORS[color] || '#9CA3AF'}">${num}</div>`).join('');

        html += `
            <div class="stat-item" data-criteria='${JSON.stringify(mutualUnfavCriteria)}'>
                <div class="stat-item-header">Mutual Banish (Unfavorable ⬡)</div>
                <div class="stat-item-value-container">
                    <div class="stat-item-value">${mutualUnfavCards.length}</div>
                    <div class="stat-item-percentage">(${mutualUnfavPercentage}%)</div>
                </div>
                <div class="stat-breakdown">${mutualUnfavChips}</div>
            </div>
        `;

        // --- Similar CTL ---
        if (unifiedWinProbabilityCalculation) {
            const metrics = unifiedWinProbabilityCalculation.calculateCardMetrics(card);
            const ctl = metrics.rds + metrics.lvi + metrics.bcr;
            const similarCtlCriteria = { type: 'similar', metric: 'ctl', threshold: 0.1 };
            const similarCtlCards = findMatchingCards(similarCtlCriteria, card);
            const similarCtlPercentage = ((similarCtlCards.length / totalCharacterCount) * 100).toFixed(1);
            const similarCtlBreakdown = countByColor(similarCtlCards);
            const similarCtlChips = Object.entries(similarCtlBreakdown)
                .filter(([_, num]) => num > 0).map(([color, num]) => `<div class="color-chip" data-color="${color}" style="background-color:${INK_COLORS[color] || '#9CA3AF'}">${num}</div>`).join('');

            html += `
                <div class="stat-item" data-criteria='${JSON.stringify(similarCtlCriteria)}'>
                    <div class="stat-item-header">Similar CTL</div>
                    <div class="stat-item-value-container">
                        <div class="stat-item-value">${similarCtlCards.length}</div>
                        <div class="stat-item-percentage">(${similarCtlPercentage}%)</div>
                    </div>
                    <div class="stat-item-header" style="font-size:0.9rem; margin-top:5px; color:var(--text-muted)">Cards with CTL ${ctl.toFixed(2)} ± 0.1</div>
                    <div class="stat-breakdown">${similarCtlChips}</div>
                </div>
            `;
        }

        // --- Similar RDS ---
        if (unifiedWinProbabilityCalculation) {
            const metrics = unifiedWinProbabilityCalculation.calculateCardMetrics(card);
            const rds = metrics.rds;
            const similarRdsCriteria = { type: 'similar', metric: 'rds', threshold: 0.1 };
            const similarRdsCards = findMatchingCards(similarRdsCriteria, card);
            const similarRdsPercentage = ((similarRdsCards.length / totalCharacterCount) * 100).toFixed(1);
            const similarRdsBreakdown = countByColor(similarRdsCards);
            const similarRdsChips = Object.entries(similarRdsBreakdown)
                .filter(([_, num]) => num > 0).map(([color, num]) => `<div class="color-chip" data-color="${color}" style="background-color:${INK_COLORS[color] || '#9CA3AF'}">${num}</div>`).join('');

            html += `
                <div class="stat-item" data-criteria='${JSON.stringify(similarRdsCriteria)}'>
                    <div class="stat-item-header">Similar RDS</div>
                    <div class="stat-item-value-container">
                        <div class="stat-item-value">${similarRdsCards.length}</div>
                        <div class="stat-item-percentage">(${similarRdsPercentage}%)</div>
                    </div>
                    <div class="stat-item-header" style="font-size:0.9rem; margin-top:5px; color:var(--text-muted)">Cards with RDS ${rds.toFixed(2)} ± 0.1</div>
                    <div class="stat-breakdown">${similarRdsChips}</div>
                </div>
            `;
        }

        // --- Similar LVI ---
        if (unifiedWinProbabilityCalculation) {
            const metrics = unifiedWinProbabilityCalculation.calculateCardMetrics(card);
            const lvi = metrics.lvi;
            const similarLviCriteria = { type: 'similar', metric: 'lvi', threshold: 0.1 };
            const similarLviCards = findMatchingCards(similarLviCriteria, card);
            const similarLviPercentage = ((similarLviCards.length / totalCharacterCount) * 100).toFixed(1);
            const similarLviBreakdown = countByColor(similarLviCards);
            const similarLviChips = Object.entries(similarLviBreakdown)
                .filter(([_, num]) => num > 0).map(([color, num]) => `<div class="color-chip" data-color="${color}" style="background-color:${INK_COLORS[color] || '#9CA3AF'}">${num}</div>`).join('');

            html += `
                <div class="stat-item" data-criteria='${JSON.stringify(similarLviCriteria)}'>
                    <div class="stat-item-header">Similar LVI</div>
                    <div class="stat-item-value-container">
                        <div class="stat-item-value">${similarLviCards.length}</div>
                        <div class="stat-item-percentage">(${similarLviPercentage}%)</div>
                    </div>
                    <div class="stat-item-header" style="font-size:0.9rem; margin-top:5px; color:var(--text-muted)">Cards with LVI ${lvi.toFixed(2)} ± 0.1</div>
                    <div class="stat-breakdown">${similarLviChips}</div>
                </div>
            `;
        }

        // --- Similar BCR ---
        if (unifiedWinProbabilityCalculation) {
            const metrics = unifiedWinProbabilityCalculation.calculateCardMetrics(card);
            const bcr = metrics.bcr;
            const similarBcrCriteria = { type: 'similar', metric: 'bcr', threshold: 0.1 };
            const similarBcrCards = findMatchingCards(similarBcrCriteria, card);
            const similarBcrPercentage = ((similarBcrCards.length / totalCharacterCount) * 100).toFixed(1);
            const similarBcrBreakdown = countByColor(similarBcrCards);
            const similarBcrChips = Object.entries(similarBcrBreakdown)
                .filter(([_, num]) => num > 0).map(([color, num]) => `<div class="color-chip" data-color="${color}" style="background-color:${INK_COLORS[color] || '#9CA3AF'}">${num}</div>`).join('');

            html += `
                <div class="stat-item" data-criteria='${JSON.stringify(similarBcrCriteria)}'>
                    <div class="stat-item-header">Similar BCR</div>
                    <div class="stat-item-value-container">
                        <div class="stat-item-value">${similarBcrCards.length}</div>
                        <div class="stat-item-percentage">(${similarBcrPercentage}%)</div>
                    </div>
                    <div class="stat-item-header" style="font-size:0.9rem; margin-top:5px; color:var(--text-muted)">Cards with BCR ${bcr.toFixed(2)} ± 0.1</div>
                    <div class="stat-breakdown">${similarBcrChips}</div>
                </div>
            `;
        }

        html += '</div></div>';
        return html;
    }

    /**
     * Generate complete analysis HTML for a card
     * @param {Object} card - Card object to analyze
     * @param {Object} options - Rendering options
     * @returns {string} Complete HTML analysis
     */
    function renderCompleteAnalysis(card, options = {}) {
        return `
            ${renderIdenticalStatsProfile(card, options)}
            ${renderCombatAnalysis(card, options)}
        `;
    }


    /**
     * Handle click events on stat items (for drill-down functionality)
     * @param {Event} event - Click event
     * @param {Object} analyzedCard - The card being analyzed
     * @param {Function} drillDownCallback - Callback function for drill-down
     */
    function handleStatItemClick(event, analyzedCard, drillDownCallback) {
        const colorChip = event.target.closest('.color-chip');
        const statItem = event.target.closest('.stat-item');

        if (!statItem) return;

        const criteria = JSON.parse(statItem.dataset.criteria);
        const title = statItem.querySelector('.stat-item-header').textContent;

        if (colorChip) {
            event.stopPropagation();
            const colorFilter = colorChip.dataset.color;
            drillDownCallback(criteria, title, analyzedCard, colorFilter, analyzedCard);
        } else {
            drillDownCallback(criteria, title, analyzedCard, null, analyzedCard);
        }
    }

    // Public API
    return {
        initialize,
        renderIdenticalStatsProfile,
        renderCombatAnalysis,
        renderCompleteAnalysis,
        handleStatItemClick,
        findMatchingCards,
        countByColor,
        getCardColors
    };

})();