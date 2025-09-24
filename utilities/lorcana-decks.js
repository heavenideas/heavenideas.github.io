/**
 * Enhanced Lorcana Decks Library
 * A JavaScript library for fetching and filtering Lorcana decklists from the Lorcana API
 * with full card name resolution
 * 
 * @author Manus AI
 * @version 2.0.0
 */

const LorcanaDecksEnhanced = (() => {
    const API_BASE_URL = 'https://api-lorcana.com';
    const ALL_CARDS_URL = 'https://cdn.jsdelivr.net/gh/heavenideas/similcana@main/database/allCards.json';
    
    // Cache for API responses and card data
    let cache = {
        trendingDecks: null,
        allDecks: null,
        allCards: null,
        lastFetch: null,
        cardsFetched: false
    };
    
    // Cache duration in milliseconds (5 minutes)
    const CACHE_DURATION = 5 * 60 * 1000;

    /**
     * Private helper function to make API requests
     * @param {string} endpoint - The API endpoint to fetch from
     * @returns {Promise<Object|null>} The response data or null if error
     */
    async function fetchData(endpoint) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error(`Error fetching data from ${endpoint}:`, error);
            throw error;
        }
    }

    /**
     * Fetch all cards data for name resolution
     * @returns {Promise<Object>} All cards data
     */
    async function fetchAllCards() {
        if (cache.allCards && cache.cardsFetched) {
            return cache.allCards;
        }

        try {
            console.log('Fetching all cards data for name resolution...');
            const response = await fetch(ALL_CARDS_URL);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            cache.allCards = data;
            cache.cardsFetched = true;
            console.log('All cards data loaded successfully');
            return cache.allCards;
        } catch (error) {
            console.error('Failed to fetch all cards data:', error);
            // Return empty structure if fetch fails
            return { cards: [] };
        }
    }

    /**
     * Create a lookup map for cards by set and number
     * @param {Object} allCardsData - The all cards data
     * @returns {Map} Map of "setCode-cardNumber" to card data
     */
    function createCardLookup(allCardsData) {
        const lookup = new Map();
        
        if (allCardsData && allCardsData.cards) {
            allCardsData.cards.forEach(card => {
                // Create lookup key from set code and card number
                if (card.setCode && card.number) {
                    const key = `${String(card.setCode).padStart(3, '0')}-${String(card.number).padStart(3, '0')}`;
                    lookup.set(key, card);
                }
                
                // Also create lookup by dreamborn ID if it exists
                if (card.dreamborn) {
                    lookup.set(card.dreamborn, card);
                }
            });
        }
        
        return lookup;
    }

    /**
     * Get card full name from dreamborn ID
     * @param {string} dreambornId - The dreamborn ID (e.g., "006-049")
     * @param {Map} cardLookup - The card lookup map
     * @returns {string} Full card name or dreamborn ID if not found
     */
    function getCardFullName(dreambornId, cardLookup) {
        const card = cardLookup.get(dreambornId);
        if (card && card.fullName) {
            return card.fullName;
        }
        return dreambornId; // Fallback to dreamborn ID if name not found
    }

    /**
     * Get card ink color from dreamborn ID or card data
     * @param {string} dreambornId - The dreamborn ID (e.g., "006-049")
     * @param {Map} cardLookup - The card lookup map
     * @returns {string|null} Ink color name or null if not found
     */
    function getCardInkColor(dreambornId, cardLookup) {
        const card = cardLookup.get(dreambornId);
        
        // First try to get ink color from card data
        if (card && card.color) {
            return card.color;
        }
        
        // Fallback to extracting from dreamborn ID
        if (dreambornId && dreambornId.includes('-')) {
            const setCode = dreambornId.split('-')[0];
            const inkColorMap = {
                '001': 'Amber',
                '002': 'Amethyst', 
                '003': 'Emerald',
                '004': 'Ruby',
                '005': 'Sapphire',
                '006': 'Steel'
            };
            return inkColorMap[setCode] || null;
        }
        
        return null;
    }

    /**
     * Check if cache is still valid
     * @returns {boolean} True if cache is valid, false otherwise
     */
    function isCacheValid() {
        return cache.lastFetch && (Date.now() - cache.lastFetch) < CACHE_DURATION;
    }

    /**
     * Get trending decks from the API
     * @param {boolean} forceRefresh - Force refresh cache
     * @param {boolean} useAllDecks - Use /decks endpoint instead of /decks/trending for more results
     * @returns {Promise<Array>} Array of trending deck objects
     */
    async function getTrendingDecks(forceRefresh = false, useAllDecks = false) {
        const cacheKey = useAllDecks ? 'allDecks' : 'trendingDecks';
        
        if (!forceRefresh && isCacheValid() && cache[cacheKey]) {
            return cache[cacheKey];
        }

        try {
            const endpoint = useAllDecks ? '/decks' : '/decks/trending';
            const data = await fetchData(endpoint);
            cache[cacheKey] = data || [];
            cache.lastFetch = Date.now();
            return cache[cacheKey];
        } catch (error) {
            console.error(`Failed to fetch ${useAllDecks ? 'all' : 'trending'} decks:`, error);
            return cache[cacheKey] || [];
        }
    }

    /**
     * Get all decks from the API
     * @param {boolean} forceRefresh - Force refresh cache
     * @returns {Promise<Array>} Array of all deck objects
     */
    async function getAllDecks(forceRefresh = false) {
        if (!forceRefresh && isCacheValid() && cache.allDecks) {
            return cache.allDecks;
        }

        try {
            const data = await fetchData('/decks');
            cache.allDecks = data || [];
            cache.lastFetch = Date.now();
            return cache.allDecks;
        } catch (error) {
            console.error('Failed to fetch all decks:', error);
            return cache.allDecks || [];
        }
    }

    /**
     * Get a specific deck by ID with full card details
     * @param {string} deckId - The deck ID to fetch
     * @returns {Promise<Object|null>} The deck object with enhanced card details or null if not found
     */
    async function getDeckById(deckId) {
        try {
            const [deckData, allCardsData] = await Promise.all([
                fetchData(`/deck/${deckId}`),
                fetchAllCards()
            ]);
            
            if (!deckData) {
                return null;
            }

            // Enhance deck with full card names
            const cardLookup = createCardLookup(allCardsData);
            const enhancedDeck = { ...deckData };
            
            if (enhancedDeck.cards && Array.isArray(enhancedDeck.cards)) {
                enhancedDeck.cardsWithNames = enhancedDeck.cards.map(card => ({
                    ...card,
                    fullName: getCardFullName(card.dreamborn, cardLookup),
                    displayText: `${card.count} ${getCardFullName(card.dreamborn, cardLookup)}`
                }));
            }
            
            return enhancedDeck;
        } catch (error) {
            console.error(`Failed to fetch deck ${deckId}:`, error);
            return null;
        }
    }

    /**
     * Get enhanced deck list with card names for trending decks
     * @param {boolean} forceRefresh - Force refresh cache
     * @param {boolean} useAllDecks - Use /decks endpoint instead of /decks/trending for more results
     * @returns {Promise<Array>} Array of enhanced deck objects
     */
    async function getTrendingDecksWithCardNames(forceRefresh = false, useAllDecks = false) {
        try {
            const [decks, allCardsData] = await Promise.all([
                getTrendingDecks(forceRefresh, useAllDecks),
                fetchAllCards()
            ]);
            
            const cardLookup = createCardLookup(allCardsData);
            
            return decks.map(deck => {
                const enhancedDeck = { ...deck };
                
                if (enhancedDeck.cards && Array.isArray(enhancedDeck.cards)) {
                    enhancedDeck.cardsWithNames = enhancedDeck.cards.map(card => ({
                        ...card,
                        fullName: getCardFullName(card.dreamborn, cardLookup),
                        displayText: `${card.count} ${getCardFullName(card.dreamborn, cardLookup)}`,
                        inkColor: getCardInkColor(card.dreamborn, cardLookup)
                    }));
                    
                    // Store card lookup for ink color extraction
                    enhancedDeck._cardLookup = cardLookup;
                }
                
                return enhancedDeck;
            });
        } catch (error) {
            console.error('Failed to fetch trending decks with card names:', error);
            return [];
        }
    }

    /**
     * Extract ink colors from a deck's cards using card lookup
     * @param {Object} deck - The deck object
     * @param {Map} cardLookup - The card lookup map (optional)
     * @returns {Set<string>} Set of ink colors used in the deck
     */
    function extractInkColors(deck, cardLookup = null) {
        const inkColors = new Set();
        
        if (deck.cards && Array.isArray(deck.cards)) {
            deck.cards.forEach(card => {
                if (card.dreamborn) {
                    let inkColor = null;
                    
                    // Try to get ink color from card lookup if available
                    if (cardLookup) {
                        inkColor = getCardInkColor(card.dreamborn, cardLookup);
                    }
                    
                    // Fallback to extracting from dreamborn ID
                    if (!inkColor) {
                        const inkCode = card.dreamborn.split('-')[0];
                        const inkColorMap = {
                            '001': 'Amber',
                            '002': 'Amethyst', 
                            '003': 'Emerald',
                            '004': 'Ruby',
                            '005': 'Sapphire',
                            '006': 'Steel'
                        };
                        inkColor = inkColorMap[inkCode];
                    }
                    
                    if (inkColor) {
                        inkColors.add(inkColor);
                    }
                }
            });
        }
        
        return inkColors;
    }

    /**
     * Filter decks based on various criteria
     * @param {Array} decks - Array of deck objects to filter
     * @param {Object} options - Filtering options
     * @param {number} options.daysAgo - Filter decks updated within the last X days
     * @param {Array<string>} options.inkColors - Filter by ink colors (must contain all specified colors)
     * @param {string} options.creator - Filter by creator name (partial match)
     * @param {string} options.name - Filter by deck name (partial match)
     * @param {number} options.minLikes - Minimum number of likes
     * @param {number} options.maxLikes - Maximum number of likes
     * @param {number} options.limit - Maximum number of results to return
     * @returns {Array} Filtered array of deck objects
     */
    function filterDecks(decks, options = {}) {
        if (!Array.isArray(decks)) {
            console.warn('filterDecks: decks parameter must be an array');
            return [];
        }

        let filtered = [...decks];

        // Filter by date (decks updated within the last X days)
        if (options.daysAgo && typeof options.daysAgo === 'number') {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - options.daysAgo);
            
            filtered = filtered.filter(deck => {
                if (!deck.updated_at) return false;
                const updatedDate = new Date(deck.updated_at);
                return updatedDate >= cutoffDate;
            });
        }

        // Filter by ink colors
        if (options.inkColors && Array.isArray(options.inkColors) && options.inkColors.length > 0) {
            filtered = filtered.filter(deck => {
                const cardLookup = deck._cardLookup || null;
                const deckInkColors = extractInkColors(deck, cardLookup);
                return options.inkColors.every(ink => deckInkColors.has(ink));
            });
        }

        // Filter by creator name (case-insensitive partial match)
        if (options.creator && typeof options.creator === 'string') {
            const creatorLower = options.creator.toLowerCase();
            filtered = filtered.filter(deck => 
                deck.creator_name && 
                deck.creator_name.toLowerCase().includes(creatorLower)
            );
        }

        // Filter by deck name (case-insensitive partial match)
        if (options.name && typeof options.name === 'string') {
            const nameLower = options.name.toLowerCase();
            filtered = filtered.filter(deck => 
                deck.name && 
                deck.name.toLowerCase().includes(nameLower)
            );
        }

        // Filter by minimum likes
        if (options.minLikes && typeof options.minLikes === 'number') {
            filtered = filtered.filter(deck => 
                deck.likes && parseInt(deck.likes) >= options.minLikes
            );
        }

        // Filter by maximum likes
        if (options.maxLikes && typeof options.maxLikes === 'number') {
            filtered = filtered.filter(deck => 
                deck.likes && parseInt(deck.likes) <= options.maxLikes
            );
        }

        // Limit results
        if (options.limit && typeof options.limit === 'number' && options.limit > 0) {
            filtered = filtered.slice(0, options.limit);
        }

        return filtered;
    }

    /**
     * Sort decks by various criteria
     * @param {Array} decks - Array of deck objects to sort
     * @param {string} sortBy - Sort criteria: 'likes', 'updated_at', 'name', 'creator_name'
     * @param {string} order - Sort order: 'asc' or 'desc'
     * @returns {Array} Sorted array of deck objects
     */
    function sortDecks(decks, sortBy = 'updated_at', order = 'desc') {
        if (!Array.isArray(decks)) {
            console.warn('sortDecks: decks parameter must be an array');
            return [];
        }

        const sorted = [...decks];
        
        sorted.sort((a, b) => {
            let valueA, valueB;
            
            switch (sortBy) {
                case 'likes':
                    valueA = parseInt(a.likes) || 0;
                    valueB = parseInt(b.likes) || 0;
                    break;
                case 'updated_at':
                    valueA = new Date(a.updated_at || 0);
                    valueB = new Date(b.updated_at || 0);
                    break;
                case 'name':
                    valueA = (a.name || '').toLowerCase();
                    valueB = (b.name || '').toLowerCase();
                    break;
                case 'creator_name':
                    valueA = (a.creator_name || '').toLowerCase();
                    valueB = (b.creator_name || '').toLowerCase();
                    break;
                default:
                    return 0;
            }
            
            if (valueA < valueB) return order === 'asc' ? -1 : 1;
            if (valueA > valueB) return order === 'asc' ? 1 : -1;
            return 0;
        });
        
        return sorted;
    }

    /**
     * Get deck statistics
     * @param {Array} decks - Array of deck objects
     * @returns {Object} Statistics object
     */
    function getDeckStats(decks) {
        if (!Array.isArray(decks) || decks.length === 0) {
            return {
                total: 0,
                totalLikes: 0,
                averageLikes: 0,
                inkColorDistribution: {},
                creatorCount: 0,
                mostPopularCreator: null
            };
        }

        const stats = {
            total: decks.length,
            totalLikes: 0,
            inkColorDistribution: {},
            creators: {}
        };

        decks.forEach(deck => {
            // Count likes
            const likes = parseInt(deck.likes) || 0;
            stats.totalLikes += likes;

            // Count ink colors
            const cardLookup = deck._cardLookup || null;
            const inkColors = extractInkColors(deck, cardLookup);
            inkColors.forEach(color => {
                stats.inkColorDistribution[color] = (stats.inkColorDistribution[color] || 0) + 1;
            });

            // Count creators
            if (deck.creator_name) {
                stats.creators[deck.creator_name] = (stats.creators[deck.creator_name] || 0) + 1;
            }
        });

        stats.averageLikes = stats.total > 0 ? Math.round(stats.totalLikes / stats.total) : 0;
        stats.creatorCount = Object.keys(stats.creators).length;
        
        // Find most popular creator
        let maxDecks = 0;
        let mostPopular = null;
        Object.entries(stats.creators).forEach(([creator, count]) => {
            if (count > maxDecks) {
                maxDecks = count;
                mostPopular = creator;
            }
        });
        stats.mostPopularCreator = mostPopular;

        return stats;
    }

    /**
     * Clear the cache
     */
    function clearCache() {
        cache = {
            trendingDecks: null,
            allDecks: null,
            allCards: null,
            lastFetch: null,
            cardsFetched: false
        };
    }

    // Public API
    return {
        // Data fetching methods
        getTrendingDecks,
        getAllDecks,
        getDeckById,
        getTrendingDecksWithCardNames,
        
        // Data manipulation methods
        filterDecks,
        sortDecks,
        getDeckStats,
        extractInkColors,
        
        // Utility methods
        clearCache,
        fetchAllCards,
        
        // Constants
        INK_COLORS: ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'],
        
        // Version info
        version: '2.0.0'
    };
})();

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LorcanaDecksEnhanced;
}
