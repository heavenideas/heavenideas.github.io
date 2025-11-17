/**
 * A full explanation of this library can be found here:
 * https://raw.githubusercontent.com/heavenideas/heavenideas.github.io/refs/heads/main/utilities/unified_win_probability_utilities_explanation.md
 * 
 * And A full explanation of how the lorcana_abilities JSON structure works can be found here:
 * https://raw.githubusercontent.com/heavenideas/heavenideas.github.io/refs/heads/main/lorcanaUtils_MatchUpAnalyzer/lorcana_abilities_JSON_structure_explanation.md
 */

const UnifiedWinProbabiliyCalculation = (function() {
    
    // Default abilities configuration - will be loaded from URL or provided externally
    let ABILITIES_CONFIG = {
        '@constants': {},
        abilities: []
    };

    // URL for loading abilities JSON
    const ABILITIES_URL = 'https://raw.githubusercontent.com/heavenideas/heavenideas.github.io/refs/heads/main/lorcanaUtils_MatchUpAnalyzer/lorcana_abilities_redux.json';

    // Debug mode flag - disabled by default
    let debug = false;

    /**
     * Loads abilities configuration from the remote URL
     * @returns {Promise<object>} The loaded abilities configuration
     */
    async function loadAbilitiesConfig() {
        try {
            // Append a cache-busting query string with current timestamp
            const urlNoCache = `${ABILITIES_URL}?v=${new Date().getTime()}`;   
            const response = await fetch(urlNoCache);
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
      * Sets the debug mode for console logging
      * @param {boolean} enabled - Whether to enable debug logging
      */
     function setDebugMode(enabled) {
         debug = enabled;
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
        const wordMap = { 'he':1, 'she':1, 'him':1, 'chosen':1, 'it': 1, 'another': 1, 'an': 1, 'a': 1, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10, 'all':10 };
        if (wordMap[lowerText] !== undefined) {
            return wordMap[lowerText];
        }
        let match = lowerText.match(/up to (\d+)/);
        if (match) {
            return parseInt(match[1], 10);
        }
        match = lowerText.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    }

    /**
     * Resolves variable placeholders in a formula string and returns the processed formula.
     * @param {string} formula - The formula string (e.g., "baseLore * @context.lvi.survivability").
     * @param {object} formulaContext - The object containing all possible variables (@card, @constants, etc.).
     * @param {boolean} forExplanation - If true, format variables as "name (value)" for explanations.
     * @returns {string} The processed formula string.
     */
    function resolveFormulaVariables(formula, formulaContext, forExplanation = false) {
        if (typeof formula !== 'string') return formula;

        let processedFormula = formula.replace(/@([\w.\[\]]+)/g, (match, path, offset, originalFormula) => {
            // Split the path by '.' to traverse the context object.
            const parts = path.split('.');
            let current = formulaContext;
            // Traverse the context object based on the path parts.
            for (const part of parts) {
                // If any part of the path is undefined or null, the variable doesn't exist.
                if (current === undefined || current === null) {
                    current = undefined; // Ensure we fall through to the default logic
                    break;
                }
                // Check if the part is an array access (e.g., 'abilities[someKey]')
                const arrayMatch = part.match(/(\w+)\[(\w+)\]/);
                if (arrayMatch) {
                    // Extract the array name and the key name.
                    const arrayName = arrayMatch[1];
                    const keyName = arrayMatch[2];
                    const key = formulaContext[keyName];
                    current = current[arrayName] ? current[arrayName][key] : undefined;
                } else {
                    current = current[part];
                }
                // If the variable has been found and is not null/undefined, continue traversal.
            }

            // If the variable resolved to a valid, existing value, use it.
            if (typeof current === 'number') {
                return forExplanation ? `${path} (${current.toFixed(2)})` : current;
            }
            // If it's a string or boolean, return a representation that can be evaluated.
            if (typeof current === 'string') {
                return forExplanation ? `${path} ('${current}')` : `'${current}'`;
            }
            if (typeof current === 'boolean') {
                return forExplanation ? `${path} (${String(current)})` : String(current);
            }

            // --- DEFAULT LOGIC FOR MISSING VARIABLES ---
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
            if (prevOp === '*' || prevOp === '/' || nextOp === '*' || nextOp === '/') {
                return forExplanation ? `${path} (1.00)` : 1;
            }

            // Otherwise, for addition, subtraction, or as a standalone term, its identity value is 0.
            return forExplanation ? `${path} (0.00)` : 0;
        });

        // Replace any remaining non-@ variables from the formulaContext
        processedFormula = processedFormula.replace(/[a-zA-Z_]\w*/g, (match) => {
            // If a word matches a numeric property in the context, use that value.
            if (formulaContext[match] !== undefined && typeof formulaContext[match] === 'number') {
                return forExplanation ? `${match} (${formulaContext[match].toFixed(2)})` : formulaContext[match];
            }
            return match;
        });

        return processedFormula;
    }

    /**
     * Safely evaluates a mathematical formula string by replacing variable placeholders with values from a context object.
     * It intelligently defaults missing variables to 0 for addition/subtraction and 1 for multiplication/division.
     * @param {string} formula - The formula string (e.g., "baseLore * @context.lvi.survivability").
     * @param {object} formulaContext - The object containing all possible variables (@card, @constants, etc.).
     * @returns {number} The result of the calculation.
     */
    function evaluateFormula(formula, formulaContext) {
        const processedFormula = resolveFormulaVariables(formula, formulaContext, false);

        if (debug) console.log(`Evaluating formula: ${formula}`);
        if (debug) console.log(`Processed Formula: ${processedFormula}`);
        // Use the Function constructor to safely evaluate the processed formula string.
        try {
            return new Function(`return ${processedFormula}`)();
        } catch (e) {
            console.error(`Error evaluating formula: "${formula}" -> "${processedFormula}"`, e);
            return 0;
        }
    }

    /**
     * Generates a detailed explanation string showing each component of a formula with its resolved value.
     * @param {string} formula - The formula string (e.g., "baseLore * @context.lvi.survivability").
     * @param {object} formulaContext - The object containing all possible variables (@card, @constants, etc.).
     * @returns {string} The explanation string showing each component with its value.
     */
    function generateFormulaExplanation(formula, formulaContext) {
        return resolveFormulaVariables(formula, formulaContext, true);
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

        // --- PHASE 0: Determine ability texts based on card type ---
        let abilityTexts = [];

        // For Song cards (Action with Song subtype), combine abilities and effects
        if (card.type === 'Action' && card.subtypes && card.subtypes.includes('Song')) {
            abilityTexts = [
                ...(card.abilities || []).map((ability, index) => ({
                    text: ability.type === 'keyword' ? ability.fullText : ability.effect,
                    type: ability.type,
                    index: index,
                    ability: ability
                })),
                ...(card.effects || []).map(effect => ({
                    text: effect,
                    type: 'effect',
                    index: 0 // Not used for effects
                }))
            ];
        } else if (card.type === 'Action' && (!card.subtypes || !card.subtypes.includes('Song'))) {

            // For other Action cards, use effects array
            abilityTexts = (card.effects || []).map(effect => ({
                text: effect,
                type: 'effect',
                index: 0 // Not used for effects
            }));
        } else {
            // For Character/Location/Item cards, use abilities array
            abilityTexts = (card.abilities || []).map((ability, index) => ({
                text: ability.type === 'keyword' ? ability.fullText : ability.effect,
                type: ability.type,
                index: index,
                ability: ability
            }));
        }

        // Initialize breakdown and totals
        const breakdown = [];
        let rds = 0, lvi = 0, bcr = 0;

        // --- PHASE 1: Process base abilities (WILL_NOT_MATCH_TEXT) once per card ---
        if (debug) console.log('Starting Phase 1: Processing base abilities');
        const baseAbilities = [];
        configToUse.abilities.forEach(abilityDef => {
            if (abilityDef.regex === "WILL_NOT_MATCH_TEXT") {
                baseAbilities.push({ def: abilityDef, match: null });
            }
        });

        // Create contexts for base abilities
        const baseAbilityContexts = [];
        baseAbilities.forEach(({ def, match }) => {
            const abilityContext = {
                card: card,
                ...configToUse['@constants'],
                context: {
                    lvi: { survivability: 1.0, questSafety: 1.0 },
                    bcr: {},
                    rds: {}
                }
            };

            // Extract base ability variables
            (def.calculation.variables || []).forEach(variableDef => {
                let value;
                if (variableDef.source === 'regex' && match) {
                    value = match[variableDef.group];
                } else if (variableDef.source && variableDef.source.startsWith('card.')) {
                    const propName = variableDef.source.substring(5);
                    value = card[propName];
                }

                if (variableDef.type === 'textOrNumber') {
                    abilityContext[variableDef.name] = getNumberFromText(value);
                } else if (variableDef.type === 'numeric') {
                    abilityContext[variableDef.name] = parseInt(value, 10) || 0;
                } else {
                    abilityContext[variableDef.name] = value;
                }
            });

            baseAbilityContexts.push({ def, match, context: abilityContext });
        });

        // Process base ability context modifiers and scores
        baseAbilityContexts.forEach(({ def, context: abilityContext }) => {
            if (debug) console.log(`Processing base ability: ${def.name}`);
            // Context modifiers
            (def.calculation.contextModifiers || []).forEach(modDef => {
                let shouldApply = modDef.condition ? evaluateFormula(modDef.condition, abilityContext) : true;
                if (shouldApply) {
                    let value = evaluateFormula(modDef.value, abilityContext);
                    if (modDef.targetMetric === 'all') {
                        // Apply to all contexts
                        ['rds', 'lvi', 'bcr'].forEach(metric => {
                            const metricContext = abilityContext.context[metric];
                            if (metricContext) {
                                if (modDef.operation === 'multiply') {
                                    if(value == 0.0) value = 1.0;
                                    metricContext[modDef.name] = (metricContext[modDef.name] || 1.0) * value;
                                } else if (modDef.operation === 'add') {
                                    metricContext[modDef.name] = (metricContext[modDef.name] || 0) + value;
                                } else if (modDef.operation === 'set') {
                                    metricContext[modDef.name] = value;
                                }
                            }
                        });
                        // Add single breakdown entry for 'all'
                        breakdown.push({
                            abilityName: `Context Modifier: ${modDef.name}`,
                            metric: 'all',
                            value: value,
                            textCaptured: 'Base card properties',
                            explanation: `${modDef.operation} ${def.justification}`
                        });
                    } else {
                        const metricContext = abilityContext.context[modDef.targetMetric];
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
                                textCaptured: 'Base card properties',
                                explanation: `${modDef.operation} ${def.justification}`
                            });
                        }
                    }
                }
            });

            // Scores
            const scores = def.calculation.scores || {};
            for (const [metric, scoreDef] of Object.entries(scores)) {
                let shouldApply = scoreDef.condition ? evaluateFormula(scoreDef.condition, abilityContext) : true;
                if (shouldApply) {
                    const rawValue = evaluateFormula(scoreDef.value, abilityContext);
                    const inkCost = card.cost > 0 ? card.cost : 1;
                    let finalValue;
                    let explanationText;

                    const formulaBreakdown = generateFormulaExplanation(scoreDef.value, abilityContext);

                    if (def.value_type === 'net_advantage') {
                        finalValue = rawValue;
                        explanationText = `${scoreDef.explanation || def.name} (${formulaBreakdown} = Net Advantage: ${rawValue.toFixed(2)})`;
                    } else { // Default to 'raw' calculation
                        finalValue = rawValue / inkCost;
                        explanationText = `${scoreDef.explanation || def.name} (${formulaBreakdown} = Raw (${rawValue.toFixed(2)}) / Cost (${inkCost}) = ${finalValue.toFixed(2)})`;
                    }

                    breakdown.push({
                        abilityName: def.name,
                        metric: metric,
                        value: finalValue,
                        textCaptured: 'Base card properties',
                        explanation: explanationText
                    });

                    if (metric === 'resource_dominance') rds += finalValue;
                    if (metric === 'lore_velocity') lvi += finalValue;
                    if (metric === 'board_control') bcr += finalValue;
                }
            }
        });

        // --- PHASE 2-5: Process each ability/effect individually (text-matching abilities only) ---
        abilityTexts.forEach((abilityText, abilityIndex) => {
            const currentText = abilityText.text;

            // Skip if no text to process
            if (!currentText || typeof currentText !== 'string') return;

            // --- PHASE 2: Find text-matching abilities for this specific text ---
            if (debug) console.log(`Starting Phase 2-5 for ability text ${abilityIndex + 1}: ${currentText}`);
            const textMatchingAbilities = [];
            configToUse.abilities.forEach(abilityDef => {
                // Skip base abilities (already processed above)
                if (abilityDef.regex === "WILL_NOT_MATCH_TEXT") return;

                if (!abilityDef.regexObject) return;
                abilityDef.regexObject.lastIndex = 0;
                const match = abilityDef.regexObject.exec(currentText);
                if (match) {
                    textMatchingAbilities.push({ def: abilityDef, match });
                }
            });

            // Sort text-matching abilities by their position in the text (earliest first)
            textMatchingAbilities.sort((a, b) => {
                return a.match.index - b.match.index;
            });

            // --- PHASE 3: Create per-ability contexts with shared context state ---
            const abilityContexts = [];
            // Create shared context for all abilities in this text
            const sharedContext = {
                lvi: { survivability: 1.0, questSafety: 1.0 },
                bcr: {},
                rds: {}
            };

            textMatchingAbilities.forEach(({ def, match }) => {
                // Create context for this ability that references the shared context
                const abilityContext = {
                    card: card,
                    ...configToUse['@constants'],
                    context: sharedContext
                };

                // Extract ONLY this ability's variables into its isolated context
                (def.calculation.variables || []).forEach(variableDef => {
                    let value;
                    if (variableDef.source === 'regex' && match) {
                        value = match[variableDef.group];
                    } else if (variableDef.source && variableDef.source.startsWith('card.')) {
                        const propName = variableDef.source.substring(5);
                        value = card[propName];
                    }

                    if (variableDef.type === 'textOrNumber') {
                        abilityContext[variableDef.name] = getNumberFromText(value);
                    } else if (variableDef.type === 'numeric') {
                        abilityContext[variableDef.name] = parseInt(value, 10) || 0;
                    } else {
                        abilityContext[variableDef.name] = value;
                    }
                });

                abilityContexts.push({ def, match, context: abilityContext });
            });

            // --- PHASE 4: Process context modifiers (isolated per ability) ---
            abilityContexts.forEach(({ def, match, context: abilityContext }) => {
                if (debug) console.log(`Processing text-matching ability: ${def.name}`);
                (def.calculation.contextModifiers || []).forEach(modDef => {
                    let shouldApply = modDef.condition ? evaluateFormula(modDef.condition, abilityContext) : true;
                    if (shouldApply) {
                        let value = evaluateFormula(modDef.value, abilityContext);
                        if (modDef.targetMetric === 'all') {
                            // Apply to all contexts
                            ['rds', 'lvi', 'bcr'].forEach(metric => {
                                const metricContext = abilityContext.context[metric];
                                if (metricContext) {
                                    if (modDef.operation === 'multiply') {
                                        if(value == 0.0) value = 1.0;
                                        metricContext[modDef.name] = (metricContext[modDef.name] || 1.0) * value;
                                    } else if (modDef.operation === 'add') {
                                        metricContext[modDef.name] = (metricContext[modDef.name] || 0) + value;
                                    } else if (modDef.operation === 'set') {
                                        metricContext[modDef.name] = value;
                                    }
                                }
                            });
                            // Add single breakdown entry for 'all'
                            breakdown.push({
                                abilityName: `Context Modifier: ${modDef.name} (Ability ${abilityIndex + 1})`,
                                metric: 'all',
                                value: value,
                                textCaptured: match ? match[0] : 'No text match',
                                explanation: `${modDef.operation} ${def.justification}`
                            });
                        } else {
                            const metricContext = abilityContext.context[modDef.targetMetric];
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
                                    abilityName: `Context Modifier: ${modDef.name} (Ability ${abilityIndex + 1})`,
                                    metric: modDef.targetMetric,
                                    value: value,
                                    textCaptured: match ? match[0] : 'No text match',
                                    explanation: `${modDef.operation} ${def.justification}`
                                });
                            }
                        }
                    }
                });
            });

            // --- PHASE 5: Process scores using per-ability contexts ---
            abilityContexts.forEach(({ def, match, context: abilityContext }) => {
                const scores = def.calculation.scores || {};
                for (const [metric, scoreDef] of Object.entries(scores)) {
                    let shouldApply = scoreDef.condition ? evaluateFormula(scoreDef.condition, abilityContext) : true;
                    if (shouldApply) {
                        const rawValue = evaluateFormula(scoreDef.value, abilityContext);
                        const inkCost = card.cost > 0 ? card.cost : 1;
                        let finalValue;
                        let explanationText;

                        const formulaBreakdown = generateFormulaExplanation(scoreDef.value, abilityContext);

                        if (def.value_type === 'net_advantage') {
                            finalValue = rawValue;
                            explanationText = `${scoreDef.explanation || def.name} (${formulaBreakdown} = Net Advantage: ${rawValue.toFixed(2)})`;
                        } else { // Default to 'raw' calculation
                            finalValue = rawValue / inkCost;
                            explanationText = `${scoreDef.explanation || def.name} (${formulaBreakdown} = Raw (${rawValue.toFixed(2)}) / Cost (${inkCost}) = ${finalValue.toFixed(2)})`;
                        }

                        breakdown.push({
                            abilityName: `${def.name} (Ability ${abilityIndex + 1})`,
                            metric: metric,
                            value: finalValue,
                            textCaptured: match ? match[0] : 'No text match',
                            explanation: explanationText
                        });

                        if (metric === 'resource_dominance') rds += finalValue;
                        if (metric === 'lore_velocity') lvi += finalValue;
                        if (metric === 'board_control') bcr += finalValue;
                    }
                }
            });
        });

        return { rds, lvi, bcr, breakdown };
    }

    return {
        calculateCardMetrics,
        loadAbilitiesConfig,
        setAbilitiesConfig,
        getAbilitiesConfig,
        setDebugMode
    };

})();