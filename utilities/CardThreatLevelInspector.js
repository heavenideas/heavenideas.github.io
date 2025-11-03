/**
 * Card Threat Level Inspector Module
 * A reusable component for displaying detailed card analysis including CTL breakdowns,
 * threat analysis, and statistical comparisons.
 */
class CardThreatLevelInspector {
    constructor(options = {}) {
        this.options = {
            modalId: 'card-threat-inspector-modal',
            zIndex: 1000,
            enableStatAnalysis: true,
            enableMultiCardComparison: true,
            enableDrillDown: true,
            theme: 'dark',
            customCSS: null,
            onCardClick: null,
            onClose: null,
            cardStatAnalysisModule: null,
            unifiedWinProbabilityCalculation: null,
            ...options
        };
        
        this.modal = null;
        this.isInitialized = false;
        
        // Auto-detect dependencies if not provided
        if (!this.options.cardStatAnalysisModule && typeof CardStatAnalysisModule !== 'undefined') {
            this.options.cardStatAnalysisModule = CardStatAnalysisModule;
        }
        if (!this.options.unifiedWinProbabilityCalculation && typeof UnifiedWinProbabiliyCalculation !== 'undefined') {
            this.options.unifiedWinProbabilityCalculation = UnifiedWinProbabiliyCalculation;
        }
    }

    /**
     * Initialize the inspector by injecting CSS and setting up DOM elements
     * This method is called automatically by showCard() and compareCards(),
     * but can be called manually if needed for pre-initialization
     * @example
     * const inspector = new CardThreatLevelInspector();
     * inspector.initialize(); // Optional - will be called automatically when needed
     */
    initialize() {
        if (this.isInitialized) return;
        
        this.injectCSS();
        this.setupDrillDownContainer();
        this.isInitialized = true;
    }

    /**
     * Display inspector for a single card
     * @param {Object} card - Card object with fullName, images, fullText properties
     * @param {Object} options - Optional configuration (currently unused, reserved for future features)
     * @example
     * const inspector = new CardThreatLevelInspector();
     * inspector.showCard(cardObject);
     */
    showCard(card, options = {}) {
        this.initialize();
        
        if (!this.validateCard(card)) {
            console.error('Invalid card object provided to CardThreatLevelInspector');
            return;
        }

        const modalContent = this.getInspectorHtml(card, 'single');
        this.showModal(`Card Threat Level Inspector`, modalContent);
        this.setupInspectorEventListeners(this.modal.querySelector('.tab-container'), card);
    }

    /**
     * Display side-by-side comparison of multiple cards
     * @param {Array} cards - Array of card objects (minimum 2, maximum 6 recommended)
     * @param {Object} options - Optional configuration (currently unused, reserved for future features)
     * @example
     * const inspector = new CardThreatLevelInspector();
     * inspector.compareCards([card1, card2, card3]);
     */
    compareCards(cards, options = {}) {
        this.initialize();
        
        if (!Array.isArray(cards) || cards.length < 2) {
            console.error('compareCards requires an array of at least 2 cards');
            return;
        }

        if (cards.length > 6) {
            console.warn('Comparing more than 6 cards may result in poor layout. Consider limiting to 6 or fewer cards.');
            cards = cards.slice(0, 6); // Limit to first 6 cards
        }

        if (!cards.every(card => this.validateCard(card))) {
            console.error('One or more invalid card objects provided to compareCards');
            return;
        }

        const modalTitle = `Card Comparison (${cards.length} cards)`;
        const modalContent = this.getMultiCardComparisonHtml(cards);
        this.showModal(modalTitle, modalContent);
        this.setupMultiCardEventListeners(this.modal.querySelector('.tab-content'), cards);
    }

    /**
     * Clean up and destroy the inspector
     */
    destroy() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        
        // Remove drilldown container
        const drilldownContainer = document.getElementById('drilldown-modal-container');
        if (drilldownContainer) {
            drilldownContainer.remove();
        }
        
        this.isInitialized = false;
    }

    /**
     * Validate card object has required properties
     */
    validateCard(card) {
        return card && 
               typeof card === 'object' && 
               card.fullName && 
               card.images && 
               card.images.full;
    }

    /**
     * Show the modal with given title and content
     */
    showModal(title, content) {
        // Remove existing modal if present
        if (this.modal) {
            this.modal.remove();
        }

        // Determine modal width based on content type (single vs multi-card)
        const isMultiCard = title.includes('Comparison');
        const modalWidthClass = isMultiCard ? 'w-full max-w-[95vw] xl:max-w-[90vw] 2xl:max-w-[85vw]' : 'w-full max-w-5xl';

        const modalHtml = `
            <div id="${this.options.modalId}" class="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90 p-4">
                <div class="bg-gray-800 border border-gray-700 rounded-lg shadow-xl ${modalWidthClass} h-[90vh] flex flex-col">
                    <div class="flex justify-between items-center mb-4 flex-shrink-0 px-6 pt-6">
                        <h3 class="text-xl font-bold text-slate-100">${title}</h3>
                        <button class="close-modal-btn text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
                    </div>
                    <div class="modal-content flex-grow overflow-hidden px-6 pb-6">
                        ${content}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        this.modal = document.getElementById(this.options.modalId);
        
        // Setup close event
        this.modal.querySelector('.close-modal-btn').addEventListener('click', () => this.hideModal());
        
        // Close on background click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });
    }

    /**
     * Hide the modal
     */
    hideModal() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }
        
        if (this.options.onClose) {
            this.options.onClose();
        }
    }

    /**
     * Generate HTML for single card inspector
     */
    getInspectorHtml(card, contextId) {
        const threatTabId = `threat-tab-${contextId}`;
        const statsTabId = `stats-tab-${contextId}`;

        return `
            <div class="tab-container h-full flex flex-col">
                <div class="tab-buttons border-b border-gray-700 mb-4 flex-shrink-0">
                    <button class="tab-button active py-2 px-4 text-purple-400 border-b-2 border-purple-400" data-tab="${threatTabId}">Threat Analysis</button>
                    <button class="tab-button py-2 px-4 text-gray-400 border-b-2 border-transparent hover:text-white" data-tab="${statsTabId}">Stat Comparisons</button>
                </div>
                <div class="tab-content flex-grow overflow-y-auto pr-2" style="scrollbar-width: thin; scrollbar-color: #4a4a4a #2d2d2d;">
                    <div id="${threatTabId}" class="tab-pane active">
                        ${this.getThreatAnalysisHtml(card)}
                    </div>
                    <div id="${statsTabId}" class="tab-pane" style="display: none;">
                        <div class="stat-analysis-content h-full overflow-y-auto">${this.getStatsAnalysisHtml(card)}</div>
                    </div>
                </div>
            </div>`;
    }

    /**
     * Generate HTML for multi-card comparison
     */
    getMultiCardComparisonHtml(cards) {
        // For 2 cards, use horizontal flex layout for better side-by-side display
        if (cards.length === 2) {
            return `
                <div class="tab-container h-full flex flex-col">
                    <div class="tab-buttons border-b border-gray-700 mb-4 flex-shrink-0">
                        <button class="comparison-tab-button active py-2 px-4 text-purple-400 border-b-2 border-purple-400" data-tab="threat">Threat Analysis</button>
                        <button class="comparison-tab-button py-2 px-4 text-gray-400 border-b-2 border-transparent hover:text-white" data-tab="stats">Stat Comparisons</button>
                    </div>
                    <div class="tab-content flex flex-col lg:flex-row gap-4 flex-grow overflow-y-auto pr-2" style="scrollbar-width: thin; scrollbar-color: #4a4a4a #2d2d2d;">
                        ${cards.map((card, index) => `
                            <div id="comparison-card-${index}" class="comparison-card-content flex-1 flex flex-col min-h-0">
                                <div class="card-header bg-gray-900 rounded-t-lg p-3 flex-shrink-0">
                                    <h4 class="text-lg font-bold text-center text-white truncate" title="${card.fullName}">${card.fullName}</h4>
                                </div>
                                <div class="card-body bg-gray-700 rounded-b-lg p-4 flex-grow overflow-y-auto" style="scrollbar-width: thin; scrollbar-color: #4a4a4a #2d2d2d;">
                                    <div class="card-tab-content" data-card-index="${index}">
                                        ${this.getThreatAnalysisHtml(card)}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
        }

        // For 3+ cards, use grid layout
        const gridCols = this.getGridColumnsClass(cards.length);

        return `
            <div class="tab-container h-full flex flex-col">
                <div class="tab-buttons border-b border-gray-700 mb-4 flex-shrink-0">
                    <button class="comparison-tab-button active py-2 px-4 text-purple-400 border-b-2 border-purple-400" data-tab="threat">Threat Analysis</button>
                    <button class="comparison-tab-button py-2 px-4 text-gray-400 border-b-2 border-transparent hover:text-white" data-tab="stats">Stat Comparisons</button>
                </div>
                <div class="tab-content ${gridCols} gap-4 flex-grow overflow-y-auto pr-2" style="scrollbar-width: thin; scrollbar-color: #4a4a4a #2d2d2d;">
                    ${cards.map((card, index) => `
                        <div id="comparison-card-${index}" class="comparison-card-content flex flex-col">
                            <div class="card-header bg-gray-900 rounded-t-lg p-3 flex-shrink-0">
                                <h4 class="text-lg font-bold text-center text-white truncate" title="${card.fullName}">${card.fullName}</h4>
                            </div>
                            <div class="card-body bg-gray-700 rounded-b-lg p-4 flex-grow overflow-y-auto" style="scrollbar-width: thin; scrollbar-color: #4a4a4a #2d2d2d;">
                                <div class="card-tab-content" data-card-index="${index}">
                                    ${this.getThreatAnalysisHtml(card)}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    /**
     * Get appropriate grid columns class based on number of cards
     */
    getGridColumnsClass(cardCount) {
        if (cardCount === 2) {
            return 'grid grid-cols-1 lg:grid-cols-2';
        } else if (cardCount === 3) {
            return 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3';
        } else if (cardCount === 4) {
            return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
        } else if (cardCount === 5) {
            return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5';
        } else if (cardCount >= 6) {
            return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6';
        } else {
            return 'grid grid-cols-1';
        }
    }    /*
*
     * Generate threat analysis HTML for a card
     */
    getThreatAnalysisHtml(card) {
        if (!this.options.unifiedWinProbabilityCalculation) {
            return '<div class="text-center text-gray-400 py-8">UnifiedWinProbabilityCalculation module not available</div>';
        }

        const { rds, lvi, bcr } = this.options.unifiedWinProbabilityCalculation.calculateCardMetrics(card);
        const { highlightedHtml } = this.analyzeAndHighlightText(card.fullText || (card.fullTextSections || []).join('\n'));
        const ctl = rds + lvi + bcr;

        return `
            <h3 class="text-xl font-bold text-slate-100 mb-4">${card.fullName}</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <img src="${card.images.full}" alt="${card.fullName}" class="w-full rounded-lg mb-4" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                         onload="this.nextElementSibling.style.display='none';">
                    <div class="w-full h-64 bg-gray-600 rounded-lg mb-4 flex items-center justify-center text-gray-300" style="display: none;">
                        <div class="text-center">
                            <div class="text-lg font-bold">${card.fullName}</div>
                            <div class="text-sm mt-2">Image not available</div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-center">
                        <div class="bg-purple-900/40 rounded-xl p-3" title="Threat Level = RDS + LVI + BCR">
                            <div class="text-sm text-slate-400">CTL</div>
                            <div class="text-2xl font-bold text-purple-400">${ctl.toFixed(2)}</div>
                        </div>
                        <div class="bg-sky-900/40 rounded-xl p-3">
                            <div class="text-sm text-slate-400">RDS</div>
                            <div class="text-2xl font-bold text-sky-400">${rds.toFixed(2)}</div>
                        </div>
                        <div class="bg-amber-900/40 rounded-xl p-3">
                            <div class="text-sm text-slate-400">LVI</div>
                            <div class="text-2xl font-bold text-amber-400">${lvi.toFixed(2)}</div>
                        </div>
                        <div class="bg-rose-900/40 rounded-xl p-3">
                            <div class="text-sm text-slate-400">BCR</div>
                            <div class="text-2xl font-bold text-rose-400">${bcr.toFixed(2)}</div>
                        </div>
                    </div>
                    <div class="p-4 bg-gray-700 rounded-lg mt-4 text-sm" style="color: #e0e0e0;">${highlightedHtml}</div>
                </div>
                <div>
                    <h4 class="font-semibold text-slate-300 mb-2">Calculation Breakdown:</h4>
                    <div class="space-y-2">${this.getCtlBreakdownHtml(card)}</div>
                </div>
            </div>`;
    }

    /**
     * Generate stats analysis HTML for a card
     */
    getStatsAnalysisHtml(card) {
        if (!this.options.cardStatAnalysisModule) {
            return '<div class="text-center text-gray-400 py-8">CardStatAnalysisModule not available</div>';
        }

        return this.options.cardStatAnalysisModule.renderCompleteAnalysis(card);
    }

    /**
     * Generate CTL breakdown HTML
     */
    getCtlBreakdownHtml(card) {
        if (!this.options.unifiedWinProbabilityCalculation) {
            return '<p class="text-gray-400">Calculation module not available</p>';
        }

        const metrics = this.options.unifiedWinProbabilityCalculation.calculateCardMetrics(card);
        if (metrics.breakdown.length === 0) {
            return '<p class="text-gray-400">No specific abilities found. Scores based on stats.</p>';
        }

        return metrics.breakdown.map(item => {
            // Extract ability number from ability name if present
            let abilityNumber = null;
            const abilityMatch = item.abilityName.match(/\(Ability (\d+)\)/);
            if (abilityMatch) {
                abilityNumber = parseInt(abilityMatch[1]);
            }

            const colorClass = abilityNumber ? this.getAbilityColorClass(abilityNumber) : 'text-orange-400';

            return `
                <div class="bg-gray-700 p-3 rounded-lg">
                    <p class="font-bold ${colorClass}">${item.abilityName}</p>
                    <p class="text-sm">Contributes <span class="font-mono">${item.value.toFixed(2)}</span> to <span class="font-semibold">${item.metric.replace(/_/g, ' ')}</span></p>
                    <p class="text-xs text-gray-400 mt-1">${item.explanation}</p>
                </div>
            `;
        }).join('');
    }

    /**
     * Get color class for ability number
     */
    getAbilityColorClass(abilityNumber) {
        const colors = [
            'text-purple-400', // Ability 1
            'text-sky-400',    // Ability 2
            'text-amber-400',  // Ability 3
            'text-rose-400',   // Ability 4
            'text-emerald-400', // Ability 5
            'text-indigo-400',  // Ability 6
            'text-orange-400',  // Ability 7
            'text-pink-400'     // Ability 8
        ];
        return colors[(abilityNumber - 1) % colors.length];
    }

    /**
     * Analyze and highlight text with ability patterns
     */
    analyzeAndHighlightText(originalText) {
        if (!originalText || originalText.trim() === '') {
            return { highlightedHtml: '', foundPatterns: new Set() };
        }

        if (!this.options.unifiedWinProbabilityCalculation) {
            return { highlightedHtml: originalText.replace(/\n/g, '<br>'), foundPatterns: new Set() };
        }

        const sanitizedText = originalText.replace(/\n/g, ' ');
        let allMatches = [];
        const abilitiesConfig = this.options.unifiedWinProbabilityCalculation.getAbilitiesConfig();

        if (!abilitiesConfig || !abilitiesConfig.abilities) {
            return { highlightedHtml: originalText.replace(/\n/g, '<br>'), foundPatterns: new Set() };
        }

        // Create ability index map for consistent coloring
        const abilityIndexMap = new Map();
        abilitiesConfig.abilities.forEach((pattern, index) => {
            abilityIndexMap.set(pattern.name, index + 1);
        });

        abilitiesConfig.abilities.forEach(pattern => {
            if (!pattern.regex) return;

            try {
                const lastSlash = pattern.regex.lastIndexOf('/');
                if (lastSlash <= 0) return;

                const regexBody = pattern.regex.substring(1, lastSlash);
                const flags = pattern.regex.substring(lastSlash + 1);
                const regex = new RegExp(regexBody, flags);

                let match;
                while ((match = regex.exec(sanitizedText)) !== null) {
                    if (match[0].length === 0) continue;
                    allMatches.push({
                        name: pattern.name,
                        abilityNumber: abilityIndexMap.get(pattern.name),
                        text: match[0],
                        start: match.index,
                        end: match.index + match[0].length
                    });
                }
            } catch (e) {
                console.error(`Failed to process regex for pattern "${pattern.name}":`, pattern.regex, e);
            }
        });

        allMatches.sort((a, b) => a.start - b.start || b.end - a.end);
        const filteredMatches = allMatches.filter((match, i) => {
            if (i > 0 && match.start < allMatches[i-1].end) return false;
            return true;
        });

        let highlightedHtml = "";
        let lastIndex = 0;

        filteredMatches.forEach(match => {
            highlightedHtml += originalText.substring(lastIndex, match.start);
            const colorClass = this.getAbilityColorClass(match.abilityNumber);
            highlightedHtml += `<span class="${colorClass} font-bold" title="${match.name} (Ability ${match.abilityNumber})">${match.text}</span>`;
            lastIndex = match.end;
        });
        highlightedHtml += originalText.substring(lastIndex);

        return {
            highlightedHtml: highlightedHtml.replace(/\n/g, '<br>'),
            foundPatterns: new Set(filteredMatches.map(m => m.name))
        };
    }

    /**
     * Setup event listeners for single card inspector
     */
    setupInspectorEventListeners(container, card) {
        // Tab switching
        container.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const targetTabId = button.dataset.tab;
                
                // Update button states
                container.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('active', 'text-purple-400', 'border-purple-400');
                    btn.classList.add('text-gray-400', 'border-transparent');
                });
                button.classList.add('active', 'text-purple-400', 'border-purple-400');
                button.classList.remove('text-gray-400', 'border-transparent');
                
                // Update tab panes
                container.querySelectorAll('.tab-pane').forEach(pane => {
                    pane.classList.remove('active');
                    pane.style.display = 'none';
                });
                const targetPane = container.querySelector(`#${targetTabId}`);
                if (targetPane) {
                    targetPane.classList.add('active');
                    targetPane.style.display = 'block';
                    
                    // Regenerate and setup stats content when switching to stats tab
                    if (targetTabId.includes('stats-tab')) {
                        const statAnalysisContent = targetPane.querySelector('.stat-analysis-content');
                        if (statAnalysisContent) {
                            // Regenerate the stats content to ensure it's fresh
                            statAnalysisContent.innerHTML = this.getStatsAnalysisHtml(card);
                            
                            // Setup stat click handlers after content is regenerated
                            setTimeout(() => {
                                this.setupStatClickHandlers(targetPane, card);
                            }, 10);
                        }
                    }
                }
            });
        });

        // Setup initial stat click handlers for all stat content
        // Use setTimeout to ensure DOM is fully rendered
        setTimeout(() => {
            this.setupStatClickHandlers(container, card);
        }, 10);
    }

    /**
     * Setup event listeners for multi-card comparison
     */
    setupMultiCardEventListeners(container, cards) {
        // Tab switching for comparison
        container.parentElement.querySelectorAll('.comparison-tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const activeTab = button.dataset.tab;
                
                // Update button states
                container.parentElement.querySelectorAll('.comparison-tab-button').forEach(btn => {
                    btn.classList.remove('active', 'text-purple-400', 'border-purple-400');
                    btn.classList.add('text-gray-400', 'border-transparent');
                });
                button.classList.add('active', 'text-purple-400', 'border-purple-400');
                button.classList.remove('text-gray-400', 'border-transparent');
                
                // Update content for each card
                this.updateMultiCardTabContent(container, cards, activeTab);
            });
        });

        // Setup initial stat click handlers for threat analysis tab
        this.setupMultiCardStatHandlers(container, cards);
    }

    /**
     * Update content for all cards in multi-card comparison
     */
    updateMultiCardTabContent(container, cards, activeTab) {
        cards.forEach((card, index) => {
            const cardTabContent = container.querySelector(`[data-card-index="${index}"]`);
            if (cardTabContent) {
                if (activeTab === 'threat') {
                    cardTabContent.innerHTML = this.getThreatAnalysisHtml(card);
                } else if (activeTab === 'stats') {
                    cardTabContent.innerHTML = this.getStatsAnalysisHtml(card);
                    
                    // Setup stat click handlers for this specific card
                    this.setupStatClickHandlers(cardTabContent, card);
                }
            }
        });

        // Re-setup stat handlers after content update
        if (activeTab === 'stats') {
            this.setupMultiCardStatHandlers(container, cards);
        }
    }

    /**
     * Setup stat click handlers for multi-card comparison
     */
    setupMultiCardStatHandlers(container, cards) {
        cards.forEach((card, index) => {
            const cardTabContent = container.querySelector(`[data-card-index="${index}"]`);
            if (cardTabContent) {
                this.setupStatClickHandlers(cardTabContent, card);
            }
        });
    }

    /**
     * Setup stat click handlers for a specific card container
     */
    setupStatClickHandlers(cardContainer, card) {
        if (!this.options.cardStatAnalysisModule) return;

        // Find all stat content areas in the container
        const statContents = cardContainer.querySelectorAll('.stat-analysis-content');
        
        statContents.forEach(statContent => {
            // Remove existing event listeners by cloning the element
            const newStatContent = statContent.cloneNode(true);
            statContent.parentNode.replaceChild(newStatContent, statContent);
            
            // Add event listener using event delegation
            newStatContent.addEventListener('click', (event) => {
                // Check if the clicked element or its parent is a stat item
                const statItem = event.target.closest('.stat-item');
                if (statItem) {
                    this.options.cardStatAnalysisModule.handleStatItemClick(event, card, (criteria, title, analyzedCard, colorFilter) => {
                        this.showDrillDownModal(criteria, title, analyzedCard, colorFilter);
                    });
                }
            });
        });

        // Also handle direct stat items (fallback)
        const statItems = cardContainer.querySelectorAll('.stat-item');
        statItems.forEach(item => {
            // Skip if already handled by stat-analysis-content
            if (item.closest('.stat-analysis-content')) return;
            
            // Remove existing listeners to prevent duplicates
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            // Add new listener
            newItem.addEventListener('click', (event) => {
                this.options.cardStatAnalysisModule.handleStatItemClick(event, card, (criteria, title, analyzedCard, colorFilter) => {
                    this.showDrillDownModal(criteria, title, analyzedCard, colorFilter);
                });
            });
        });
    }

    /**
     * Show drill-down modal for stat analysis
     */
    showDrillDownModal(criteria, title, analyzedCard, colorFilter) {
        if (!this.options.cardStatAnalysisModule) return;

        const container = document.getElementById('drilldown-modal-container');
        if (!container) return;

        const modalHtml = `
            <div id="drilldown-modal" class="fixed inset-0 z-[80] flex items-center justify-center bg-black bg-opacity-90 p-4">
                <div class="bg-gray-800 border border-gray-700 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col">
                    <div class="flex justify-between items-center mb-4 flex-shrink-0 px-6 pt-6">
                        <h3 class="text-xl font-bold text-slate-100">${title}</h3>
                        <button id="close-drilldown-btn" class="text-gray-400 hover:text-white text-3xl">&times;</button>
                    </div>
                    <div id="drilldown-content" class="flex-grow overflow-y-auto px-6 pb-6" style="scrollbar-width: thin; scrollbar-color: #4a4a4a #2d2d2d;"></div>
                </div>
            </div>`;
        
        container.innerHTML = modalHtml;
        
        const matchingCards = this.options.cardStatAnalysisModule.findMatchingCards(criteria, analyzedCard);
        let cardsToShow = criteria.type === 'static' ? matchingCards.filter(c => c.id !== analyzedCard.id) : matchingCards;
        
        if (colorFilter) {
            cardsToShow = cardsToShow.filter(c => this.options.cardStatAnalysisModule.getCardColors(c).includes(colorFilter));
        }
        
        const contentEl = container.querySelector('#drilldown-content');
        contentEl.innerHTML = cardsToShow.length === 0 
            ? '<div class="text-center text-gray-400 py-8">No matching cards found.</div>'
            : `<div class="flex flex-wrap justify-center gap-2">${cardsToShow.map(card => `<img src="${card.images.thumbnail}" alt="${card.fullName}" class="w-24 rounded-md" title="${card.fullName}">`).join('')}</div>`;

        container.querySelector('#close-drilldown-btn').addEventListener('click', () => {
            container.innerHTML = '';
        });
    }

    /**
     * Setup drilldown modal container
     */
    setupDrillDownContainer() {
        if (!document.getElementById('drilldown-modal-container')) {
            const container = document.createElement('div');
            container.id = 'drilldown-modal-container';
            document.body.appendChild(container);
        }
    }

    /**
     * Inject CSS styles for the inspector
     */
    injectCSS() {
        if (document.getElementById('card-threat-inspector-styles')) return;

        const css = `
            /* Card Threat Level Inspector Styles */
            .tab-button.active, .comparison-tab-button.active { 
                color: #a78bfa !important; 
                border-bottom-color: #a78bfa !important; 
            }
            .tab-button, .comparison-tab-button {
                border-bottom: 2px solid transparent;
                transition: all 0.2s ease;
            }
            .tab-button:hover, .comparison-tab-button:hover {
                color: #ffffff !important;
            }
            .tab-pane { 
                display: none; 
            }
            .tab-pane.active { 
                display: block; 
            }
            
            /* Multi-card comparison styles */
            .comparison-card-content {
                min-height: 500px;
                border: 1px solid #4a5568;
                border-radius: 8px;
                overflow: hidden;
                transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .comparison-card-content:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(167, 139, 250, 0.2);
                border-color: #a78bfa;
            }
            .card-header {
                border-bottom: 1px solid #4a5568;
            }
            .card-body {
                min-height: 450px;
            }
            
            /* Responsive grid adjustments */
            @media (max-width: 768px) {
                .comparison-card-content {
                    min-height: 400px;
                }
                .card-body {
                    min-height: 350px;
                }
            }
            
            /* Large screen optimizations */
            @media (min-width: 1536px) {
                .comparison-card-content {
                    min-height: 600px;
                }
                .card-body {
                    min-height: 550px;
                }
            }
            
            /* Ultra-wide screen support */
            @media (min-width: 2560px) {
                .comparison-card-content {
                    min-height: 700px;
                }
                .card-body {
                    min-height: 650px;
                }
            }
            
            .stat-grid { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); 
                gap: 1rem; 
            }
            .stat-item { 
                background: #2d2d2d; 
                padding: 1rem; 
                border-radius: 8px; 
                border: 1px solid #5a5a5a; 
                cursor: pointer; 
                transition: transform 0.2s, box-shadow 0.2s; 
            }
            .stat-item:hover { 
                transform: translateY(-2px); 
                box-shadow: 0 4px 12px rgba(0,0,0,0.3); 
                border-color: #a78bfa; 
            }
            .stat-item-header { 
                font-weight: bold; 
                font-size: 0.9rem; 
                margin-bottom: 0.5rem; 
            }
            .stat-item-value-container { 
                display: flex; 
                align-items: baseline; 
                gap: 0.5rem; 
                margin-bottom: 0.5rem; 
            }
            .stat-item-value { 
                font-size: 1.5rem; 
                font-weight: bold; 
                color: #a78bfa; 
            }
            .stat-item-percentage { 
                font-size: 0.875rem; 
                color: #9ca3af; 
            }
            .stat-breakdown { 
                margin-top: auto; 
                padding-top: 0.5rem; 
                display: flex; 
                gap: 0.5rem; 
                flex-wrap: wrap; 
            }
            .color-chip { 
                font-size: 0.75rem; 
                padding: 0.25rem 0.5rem; 
                border-radius: 4px; 
                color: #fff; 
                text-shadow: 1px 1px 2px #000; 
                border: 1px solid rgba(255,255,255,0.2); 
            }
        `;

        const style = document.createElement('style');
        style.id = 'card-threat-inspector-styles';
        style.textContent = css;
        document.head.appendChild(style);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CardThreatLevelInspector;
} else if (typeof window !== 'undefined') {
    window.CardThreatLevelInspector = CardThreatLevelInspector;
}