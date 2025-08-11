const UnifiedWinProbabiliyCalculation = (function() {
    
    // Default abilities configuration - will be loaded from URL or provided externally
    let ABILITIES_CONFIG = {
        '@constants': {},
        abilities: []
    };

    // URL for loading abilities JSON
    const ABILITIES_URL = 'https://raw.githubusercontent.com/heavenideas/heavenideas.github.io/refs/heads/main/lorcanaUtils_MatchUpAnalyzer/lorcana_abilities_redux.json';

    /**
     * Loads abilities configuration from the remote URL
     * @returns {Promise<object>} The loaded abilities configuration
     */
    async function loadAbilitiesConfig() {
        try {
            const response = await fetch(ABILITIES_URL);
            if (!response.ok) {
                throw new Error(`Network response was not ok: ${response.statusText}`);
            }
            const data = await response.json();
            ABILITIES_CONFIG = data;
            
            // Process regex objects for abilities
            if (ABILITIES_CONFIG.abilities) {
                ABILITIES_CONFIG.abilities.forEach(ability => {
                    if (ability.regex && ability.regex !== "WILL_NOT_MATCH_TEXT") {
                        try {
                            const match = ability.regex.match(/^\/(.*)\/([gimuy]*)$/);
                            ability.regexObject = match ? new RegExp(match[1], match[2]) : new RegExp(ability.regex, 'gi');
                        } catch (e) {
                            console.error(`Invalid regex for pattern "${ability.name}": ${ability.regex}`);
                            ability.regexObject = null;
                        }
                    }
                });
            }
            
            return ABILITIES_CONFIG;
        } catch (error) {
            console.error("Failed to load abilities from URL:", error);
            throw error;
        }
    }

    /**
     * Sets the abilities configuration manually (for external use)
     * @param {object} config - The abilities configuration object
     */
    function setAbilitiesConfig(config) {
        ABILITIES_CONFIG = config;
        
        // Process regex objects for abilities
        if (ABILITIES_CONFIG.abilities) {
            ABILITIES_CONFIG.abilities.forEach(ability => {
                if (ability.regex && ability.regex !== "WILL_NOT_MATCH_TEXT") {
                    try {
                        const match = ability.regex.match(/^\/(.*)\/([gimuy]*)$/);
                        ability.regexObject = match ? new RegExp(match[1], match[2]) : new RegExp(ability.regex, 'gi');
                    } catch (e) {
                        console.error(`Invalid regex for pattern "${ability.name}": ${ability.regex}`);
                        ability.regexObject = null;
                    }
                }
            });
        }
    }

    /**
     * Gets the current abilities configuration
     * @returns {object} The current abilities configuration
     */
    function getAbilitiesConfig() {
        return ABILITIES_CONFIG;
    }

    /**
     * Converts a string that might be a word ("one", "two") or a digit ("1", "2") into a number.
     * @param {string | number} text - The input string or number.
     * @returns {number} The parsed number, or 0 if invalid.
     */
    function getNumberFromText(text) {
        if (typeof text === 'number') return text;
        if (!text || typeof text !== 'string') return 0;
        const lowerText = text.toLowerCase().trim();
        const wordMap = { 'a': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10 };
        if (wordMap[lowerText] !== undefined) {
            return wordMap[lowerText];
        }
        const match = lowerText.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    }

    /**
     * Safely evaluates a mathematical formula string by replacing variable placeholders with values from a context object.
     * It intelligently defaults missing variables to 0 for addition/subtraction and 1 for multiplication/division.
     * @param {string} formula - The formula string (e.g., "baseLore * @context.lvi.survivability").
     * @param {object} formulaContext - The object containing all possible variables (@card, @constants, etc.).
     * @returns {number} The result of the calculation.
     */
    function evaluateFormula(formula, formulaContext) {
        if (typeof formula !== 'string') return formula;
        // console.log(`Evaluating formula: "${formula}" with context`, formulaContext);

        let processedFormula = formula.replace(/@([\w.\[\]]+)/g, (match, path, offset, originalFormula) => {
            const parts = path.split('.');
            let current = formulaContext;
            for (const part of parts) {
                if (current === undefined || current === null) {
                    current = undefined; // Ensure we fall through to the default logic
                    break;
                }
                const arrayMatch = part.match(/(\w+)\[(\w+)\]/);
                if (arrayMatch) {
                    const arrayName = arrayMatch[1];
                    const keyName = arrayMatch[2];
                    const key = formulaContext[keyName];
                    current = current[arrayName] ? current[arrayName][key] : undefined;
                } else {
                    current = current[part];
                }
            }

            // If the variable resolved to a valid, existing value, use it.
            if (typeof current === 'number') return current;
            if (typeof current === 'string') return `'${current}'`;
            if (typeof current === 'boolean') return String(current);

            // --- NEW LOGIC ---
            // If the variable is missing or not a number, default it to 0 or 1 based on the surrounding operators.
            // This is a heuristic that works for most simple arithmetic.

            // Find the last non-space character before the variable.
            let prevOp = '';
            for (let i = offset - 1; i >= 0; i--) {
                if (originalFormula[i].trim() !== '') {
                    prevOp = originalFormula[i];
                    break;
                }
            }

            // Find the first non-space character after the variable.
            let nextOp = '';
            for (let i = offset + match.length; i < originalFormula.length; i++) {
                if (originalFormula[i].trim() !== '') {
                    nextOp = originalFormula[i];
                    break;
                }
            }

            // If the variable is next to a multiplicative operator, its identity value is 1.
            // This implicitly handles operator precedence for simple cases (e.g., "5 + @var * 2").
            if (prevOp === '*' || prevOp === '/' || nextOp === '*' || nextOp === '/') {
                return 1;
            }

            // Otherwise, for addition, subtraction, or as a standalone term, its identity value is 0.
            return 0;
        });

        // Replace any remaining non-@ variables from the formulaContext
        processedFormula = processedFormula.replace(/[a-zA-Z_]\w*/g, (match) => {
            if (formulaContext[match] !== undefined && typeof formulaContext[match] === 'number') {
                return formulaContext[match];
            }
            return match;
        });

        console.log(`Processed Formula ${processedFormula}`)
        try {
            return new Function(`return ${processedFormula}`)();
        } catch (e) {
            console.error(`Error evaluating formula: "${formula}" -> "${processedFormula}"`, e);
            return 0;
        }
    }
    
    /**
     * Calculates the RDS, LVI, and BCR scores for a single card based on the loaded ABILITIES_CONFIG.
     * @param {object} card - The card object from the main database.
     * @param {object} [externalConfig] - Optional external configuration object with abilities and constants.
     * @returns {{rds: number, lvi: number, bcr: number, breakdown: Array<object>}}
     */
    function calculateCardMetrics(card, externalConfig = null) {
        // Use external config if provided, otherwise use internal config
        const configToUse = externalConfig || ABILITIES_CONFIG;
        
        if (!configToUse || !configToUse.abilities) {
            return { rds: 0, lvi: 0, bcr: 0, breakdown: [] };
        }

        const fullText = (card.fullTextSections || []).join(' ').replace(/\n/g, ' ');
        const cardContext = {
            card: card,
            ...configToUse['@constants'],
            context: {
                lvi: { survivability: 1.0, questSafety: 1.0 },
                bcr: {},
                rds: {}
            }
        };
        
        // --- PHASE 1: Find all matching abilities ---
        const matchedAbilities = [];
        configToUse.abilities.forEach(abilityDef => {
            if (abilityDef.regex === "WILL_NOT_MATCH_TEXT") {
                matchedAbilities.push({ def: abilityDef, match: null });
                return;
            }
            if (!abilityDef.regexObject) return;
            abilityDef.regexObject.lastIndex = 0;
            const match = abilityDef.regexObject.exec(fullText);
            if (match) {
                matchedAbilities.push({ def: abilityDef, match });
            }
        });

        // --- PHASE 2: Extract all variables for all matched abilities ---
        matchedAbilities.forEach(({ def, match }) => {
            (def.calculation.variables || []).forEach(variableDef => {
                let value;
                if (variableDef.source === 'regex' && match) {
                    value = match[variableDef.group];
                } else if (variableDef.source && variableDef.source.startsWith('card.')) {
                    const propName = variableDef.source.substring(5);
                    value = card[propName];
                }

                if (variableDef.type === 'textOrNumber') {
                    cardContext[variableDef.name] = getNumberFromText(value);
                } else if (variableDef.type === 'numeric') {
                    cardContext[variableDef.name] = parseInt(value, 10) || 0;
                } else {
                    cardContext[variableDef.name] = value;
                }
            });
        });

        // Initialize breakdown struct for both Context Modifiers and Scores
        const breakdown = [];

        // --- PHASE 3: Process context modifiers ---
        matchedAbilities.forEach(({ def }) => {
            (def.calculation.contextModifiers || []).forEach(modDef => {
                let shouldApply = modDef.condition ? evaluateFormula(modDef.condition, cardContext) : true;
                if (shouldApply) {
                    let value = evaluateFormula(modDef.value, cardContext);
                    const metricContext = cardContext.context[modDef.targetMetric];
                    if (metricContext) {
                        if (modDef.operation === 'multiply') {
                            if(value == 0.0) value = 1.0;
                            metricContext[modDef.name] = (metricContext[modDef.name] || 1.0) * value;
                        } else if (modDef.operation === 'add') {
                            metricContext[modDef.name] = (metricContext[modDef.name] || 0) + value;
                        } else if (modDef.operation === 'set') {
                            metricContext[modDef.name] = value;
                        }
                        breakdown.push({
                            abilityName: `Context Modifier: ${modDef.name}`,
                            metric: modDef.targetMetric,
                            value: value,
                            explanation: `${modDef.operation} ${def.justification}`
                        });
                    }
                }
            });
        });

        // --- PHASE 4: Process scores ---
        let rds = 0, lvi = 0, bcr = 0;
        
        matchedAbilities.forEach(({ def }) => {
            const scores = def.calculation.scores || {};
            for (const [metric, scoreDef] of Object.entries(scores)) {
                let shouldApply = scoreDef.condition ? evaluateFormula(scoreDef.condition, cardContext) : true;
                if (shouldApply) {
                    const rawValue = evaluateFormula(scoreDef.value, cardContext);
                    const inkCost = card.cost > 0 ? card.cost : 1;
                    const finalValue = rawValue / inkCost;

                    const explanation = scoreDef.explanation || def.name;
                    breakdown.push({
                        abilityName: def.name,
                        metric: metric,
                        value: finalValue,
                        explanation: `${explanation} (Raw: ${rawValue.toFixed(2)} / Cost: ${inkCost} = ${finalValue.toFixed(2)})`
                    });

                    if (metric === 'resource_dominance') rds += finalValue;
                    if (metric === 'lore_velocity') lvi += finalValue;
                    if (metric === 'board_control') bcr += finalValue;
                }
            }
        });

        return { rds, lvi, bcr, breakdown };
    }

    return {
        calculateCardMetrics,
        loadAbilitiesConfig,
        setAbilitiesConfig,
        getAbilitiesConfig
    };

})();