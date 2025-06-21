import DataManager from "./data-manager.js";
import DeckParser from "./deck-parser.js";
import StatisticalEngine from "./statistical-engine.js";
import InteractionAnalyzer from "./interaction-analyzer.js";
import VisualizationEngine from "./visualization-engine.js";
import BatchAnalyzer from "./batch-analyzer.js";

const dataManager = new DataManager();
const deckParser = new DeckParser(dataManager);
const interactionAnalyzer = new InteractionAnalyzer();
const visualizationEngine = new VisualizationEngine();
const batchAnalyzer = new BatchAnalyzer(dataManager, deckParser, StatisticalEngine, interactionAnalyzer);

const playerDeckInput = document.getElementById("playerDeckInput");
const opponentDeckInput = document.getElementById("opponentDeckInput");
const analyzeDeckBtn = document.getElementById("analyzeDeckBtn");
const playerDeckValidation = document.getElementById("playerDeckValidation");
const opponentDeckValidation = document.getElementById("opponentDeckValidation");

// Batch mode elements
const toggleBatchModeBtn = document.getElementById("toggleBatchMode");
const addMetaDeckBtn = document.getElementById("addMetaDeck");
const clearMetaDecksBtn = document.getElementById("clearMetaDecks");
const runBatchAnalysisBtn = document.getElementById("runBatchAnalysis");
const metaDeckInput = document.getElementById("metaDeckInput");
const metaDeckName = document.getElementById("metaDeckName");
const metaDeckList = document.getElementById("metaDeckList");
const saveMetaDeckBtn = document.getElementById("saveMetaDeck");
const cancelMetaDeckBtn = document.getElementById("cancelMetaDeck");
const metaDecksList = document.getElementById("metaDecksList");
const metaDecksListItems = document.getElementById("metaDecksListItems");
const batchResultsTab = document.querySelector(".tab-button[data-tab=\"batch-results\"]");
const exportBatchResultsBtn = document.getElementById("exportBatchResults");

const tabButtons = document.querySelectorAll(".tab-button");
const tabPanels = document.querySelectorAll(".tab-panel");

let playerDeck = null;
let opponentDeck = null;
let batchModeEnabled = false;
let lastBatchResults = null;

// Event Listeners
analyzeDeckBtn.addEventListener("click", analyzeDecks);
toggleBatchModeBtn.addEventListener("click", toggleBatchMode);
addMetaDeckBtn.addEventListener("click", showMetaDeckInput);
clearMetaDecksBtn.addEventListener("click", clearMetaDecks);
runBatchAnalysisBtn.addEventListener("click", runBatchAnalysis);
saveMetaDeckBtn.addEventListener("click", saveMetaDeck);
cancelMetaDeckBtn.addEventListener("click", hideMetaDeckInput);
exportBatchResultsBtn.addEventListener("click", exportBatchResults);

tabButtons.forEach(button => {
    button.addEventListener("click", () => {
        const targetTab = button.dataset.tab;
        showTab(targetTab);
    });
});

// Initialize application
async function init() {
    await dataManager.loadCardData();
    if (dataManager.isLoaded) {
        console.log("Card data loaded successfully!");
        analyzeDeckBtn.disabled = false;
        analyzeDeckBtn.textContent = "Analyze Matchup";
    } else {
        console.error("Failed to load card data. Analyzer will not function.");
        analyzeDeckBtn.disabled = true;
        analyzeDeckBtn.textContent = "Error loading data";
    }
}

async function analyzeDecks() {
    playerDeckValidation.innerHTML = "";
    opponentDeckValidation.innerHTML = "";

    const playerDeckText = playerDeckInput.value;
    const opponentDeckText = opponentDeckInput.value;

    playerDeck = deckParser.parseDeckList(playerDeckText);
    opponentDeck = deckParser.parseDeckList(opponentDeckText);

    const playerValidation = deckParser.validateDeck(playerDeck);
    const opponentValidation = deckParser.validateDeck(opponentDeck);

    if (!playerValidation.isValid) {
        playerValidation.errors.forEach(err => {
            playerDeckValidation.innerHTML += `<p class="error">${err}</p>`;
        });
        return;
    }
    if (!opponentValidation.isValid) {
        opponentValidation.errors.forEach(err => {
            opponentDeckValidation.innerHTML += `<p class="error">${err}</p>`;
        });
        return;
    }

    // Display warnings if any
    playerValidation.warnings.forEach(warn => {
        playerDeckValidation.innerHTML += `<p class="warning">${warn}</p>`;
    });
    opponentValidation.warnings.forEach(warn => {
        opponentDeckValidation.innerHTML += `<p class="warning">${warn}</p>`;
    });

    // Perform analysis
    renderStatisticalAnalysis(playerDeck, opponentDeck);
    renderInteractionAnalysis(playerDeck, opponentDeck);
    renderProbabilityAnalysis(playerDeck, opponentDeck);

    showTab("overview"); // Show overview or first tab after analysis
}

function renderStatisticalAnalysis(playerDeck, opponentDeck) {
    // Ink Curve Charts
    visualizationEngine.renderInkCurveChart(playerDeck, "playerInkCurveChart");
    visualizationEngine.renderInkCurveChart(opponentDeck, "opponentInkCurveChart");

    // Expected Lore (simplified for now)
    const playerExpectedLore = StatisticalEngine.calculateExpectedLore(playerDeck);
    const opponentExpectedLore = StatisticalEngine.calculateExpectedLore(opponentDeck);
    
    const overviewTab = document.getElementById("overview-tab");
    overviewTab.innerHTML = `
        <h2>Overview</h2>
        <p>Your Deck Total Cards: ${playerDeck.totalCards} (${playerDeck.colors.join(", ")})</p>
        <p>Opponent Deck Total Cards: ${opponentDeck.totalCards} (${opponentDeck.colors.join(", ")})</p>
        <p>Your Deck Expected Lore per Turn: ${playerExpectedLore.toFixed(2)}</p>
        <p>Opponent Deck Expected Lore per Turn: ${opponentExpectedLore.toFixed(2)}</p>
        <h3>Validation Warnings:</h3>
        <div id="overviewPlayerWarnings"></div>
        <div id="overviewOpponentWarnings"></div>
    `;

    // Move warnings to overview tab
    const overviewPlayerWarnings = document.getElementById("overviewPlayerWarnings");
    const overviewOpponentWarnings = document.getElementById("overviewOpponentWarnings");
    playerDeckValidation.childNodes.forEach(node => overviewPlayerWarnings.appendChild(node.cloneNode(true)));
    opponentDeckValidation.childNodes.forEach(node => overviewOpponentWarnings.appendChild(node.cloneNode(true)));

    // Add explanations for statistical analysis
    renderExplanation("statistical-explanations", `
        <h3>Statistical Analysis Explanations</h3>
        <h4>Expected Lore per Turn:</h4>
        <p>This metric estimates the average amount of lore your deck can generate per turn. It\"s calculated by summing the lore values of all cards in your deck and dividing by the total number of cards. This provides a simplified measure of a deck\"s lore-generating potential, assuming an even distribution of cards drawn.</p>
        <h4>Ink Curve:</h4>
        <p>The ink curve chart visualizes the distribution of ink costs of cards in your deck. A balanced ink curve ensures you have playable cards at every stage of the game. A low curve (many cheap cards) indicates an aggressive deck, while a high curve (many expensive cards) suggests a control or ramp strategy.</p>
    `);
}

function renderInteractionAnalysis(playerDeck, opponentDeck) {
    const interactions = {};
    const playerCharacters = playerDeck.cards.filter(card => card.type === "Character");
    const opponentCharacters = opponentDeck.cards.filter(card => card.type === "Character");

    let interactionExplanations = `<h3>Character Interaction Explanations</h3>`;

    playerCharacters.forEach(pChar => {
        opponentCharacters.forEach(oChar => {
            const result = interactionAnalyzer.analyzeCharacterVsCharacter(pChar, oChar, { isChallenging: true });
            interactions[`${pChar.name}_vs_${oChar.name}`] = result;

            // Add detailed explanation for each interaction
            interactionExplanations += `
                <h4>${pChar.name} vs. ${oChar.name}:</h4>
                <p><strong>Outcome:</strong> ${result.outcome.replace(/_/g, \" \")}</p>
                <p><strong>Details:</strong> ${result.details.reason || \"Standard combat rules apply.\"}</p>
                ${result.abilityInteractions.length > 0 ? `
                    <h5>Ability Interactions:</h5>
                    <ul>
                        ${result.abilityInteractions.map(ability => `<li>${ability.description} (Probability: ${(ability.probability * 100).toFixed(0)}%)</li>`).join(\"\")}
                    </ul>
                ` : \"\"}
                <p><em>(Combat calculations: Attacker Strength: ${result.details.attackerDamageDealt || pChar.strength}, Defender Willpower: ${oChar.willpower}, Attacker Willpower: ${pChar.willpower}, Defender Strength: ${result.details.defenderDamageTaken || oChar.strength})</em></p>
            `;
        });
    });

    visualizationEngine.renderMatchupMatrix(playerDeck, opponentDeck, interactions, "matchupMatrixContainer");

    // Add explanations for interaction analysis
    renderExplanation("interaction-explanations", interactionExplanations);
}

function renderProbabilityAnalysis(playerDeck, opponentDeck) {
    const playerProbabilities = StatisticalEngine.analyzeOpeningHand(playerDeck);
    const opponentProbabilities = StatisticalEngine.analyzeOpeningHand(opponentDeck);

    visualizationEngine.renderProbabilityChart(playerProbabilities, "playerOpeningHandProbabilitiesChart");
    visualizationEngine.renderProbabilityChart(opponentProbabilities, "opponentOpeningHandProbabilitiesChart");

    // Add explanations for probability analysis
    renderExplanation("probability-explanations", `
        <h3>Probability Analysis Explanations</h3>
        <h4>Opening Hand Probabilities:</h4>
        <p>This chart shows the probability of drawing a certain number of cards of a specific type (e.g., characters, actions) in your opening hand (7 cards, or 5 if going second). These probabilities are calculated using the <a href=\"https://en.wikipedia.org/wiki/Hypergeometric_distribution\" target=\"_blank\">Hypergeometric Distribution</a>, which is used to model the probability of drawing a certain number of successes (specific cards) in a sample (your opening hand) without replacement from a finite population (your deck).</p>
        <p>Understanding these probabilities helps you assess the consistency of your deck and how likely you are to have key cards in your starting hand.</p>
    `);
}

function renderExplanation(elementId, content) {
    const explanationElement = document.getElementById(elementId);
    if (explanationElement) {
        explanationElement.innerHTML = content;
    }
}

function showTab(tabId) {
    tabPanels.forEach(panel => {
        panel.classList.remove("active");
    });
    tabButtons.forEach(button => {
        button.classList.remove("active");
    });

    document.getElementById(`${tabId}-tab`).classList.add("active");
    document.querySelector(`.tab-button[data-tab=\"${tabId}\"]`).classList.add("active");
}

// Batch Mode Functions
function toggleBatchMode() {
    batchModeEnabled = !batchModeEnabled;
    
    if (batchModeEnabled) {
        toggleBatchModeBtn.textContent = "Disable Batch Mode";
        toggleBatchModeBtn.classList.add("active");
        addMetaDeckBtn.style.display = "inline-block";
        clearMetaDecksBtn.style.display = "inline-block";
        runBatchAnalysisBtn.style.display = "inline-block";
        batchResultsTab.style.display = "inline-block";
        
        // Hide opponent deck input in batch mode
        opponentDeckInput.parentElement.style.display = "none";
        analyzeDeckBtn.textContent = "Analyze Player Deck";
        
        updateMetaDecksList();
    } else {
        toggleBatchModeBtn.textContent = "Enable Batch Mode";
        toggleBatchModeBtn.classList.remove("active");
        addMetaDeckBtn.style.display = "none";
        clearMetaDecksBtn.style.display = "none";
        runBatchAnalysisBtn.style.display = "none";
        batchResultsTab.style.display = "none";
        metaDeckInput.style.display = "none";
        metaDecksList.style.display = "none";
        
        // Show opponent deck input in normal mode
        opponentDeckInput.parentElement.style.display = "block";
        analyzeDeckBtn.textContent = "Analyze Matchup";
        
        // Switch away from batch results tab if currently active
        if (document.getElementById("batch-results-tab").classList.contains("active")) {
            showTab("overview");
        }
    }
}

function showMetaDeckInput() {
    metaDeckInput.style.display = "block";
    metaDeckName.value = "";
    metaDeckList.value = "";
    metaDeckName.focus();
}

function hideMetaDeckInput() {
    metaDeckInput.style.display = "none";
}

function saveMetaDeck() {
    const name = metaDeckName.value.trim();
    const deckListText = metaDeckList.value.trim();
    
    if (!name) {
        alert("Please enter a deck name");
        return;
    }
    
    if (!deckListText) {
        alert("Please enter a decklist");
        return;
    }
    
    const result = batchAnalyzer.addMetaDeck(name, deckListText);
    
    if (result.success) {
        hideMetaDeckInput();
        updateMetaDecksList();
        alert(result.message);
    } else {
        alert(result.message);
    }
}

function clearMetaDecks() {
    if (confirm("Are you sure you want to clear all meta decks?")) {
        const result = batchAnalyzer.clearMetaDecks();
        updateMetaDecksList();
        alert(result.message);
    }
}

function removeMetaDeck(deckName) {
    if (confirm(`Are you sure you want to remove \"${deckName}\"?`)) {
        const result = batchAnalyzer.removeMetaDeck(deckName);
        updateMetaDecksList();
        alert(result.message);
    }
}

function updateMetaDecksList() {
    const metaDeckNames = batchAnalyzer.getMetaDeckNames();
    
    if (metaDeckNames.length === 0) {
        metaDecksList.style.display = "none";
        runBatchAnalysisBtn.disabled = true;
        return;
    }
    
    metaDecksList.style.display = "block";
    runBatchAnalysisBtn.disabled = false;
    
    metaDecksListItems.innerHTML = "";
    metaDeckNames.forEach(name => {
        const li = document.createElement("li");
        li.innerHTML = `
            <span class=\"meta-deck-name\">${name}</span>
            <button class=\"remove-meta-deck\" onclick=\"removeMetaDeck(\'${name}\')\">Remove</button>
        `;
        metaDecksListItems.appendChild(li);
    });
}

function runBatchAnalysis() {
    if (!playerDeck) {
        alert("Please enter and validate your player deck first");
        return;
    }
    
    const metaDeckNames = batchAnalyzer.getMetaDeckNames();
    if (metaDeckNames.length === 0) {
        alert("Please add at least one meta deck before running batch analysis");
        return;
    }
    
    try {
        lastBatchResults = batchAnalyzer.analyzeBatchMatchups(playerDeck);
        renderBatchResults(lastBatchResults);
        showTab("batch-results");
    } catch (error) {
        console.error("Batch analysis error:", error);
        alert("An error occurred during batch analysis. Please check the console for details.");
    }
}

function renderBatchResults(results) {
    const batchSummary = document.getElementById("batchSummary");
    const batchMatchupsTable = document.getElementById("batchMatchupsTable");
    
    // Render summary
    batchSummary.innerHTML = `
        <h3>Batch Analysis Summary</h3>
        <div class=\"summary-stats\">
            <div class=\"summary-stat\">
                <div class=\"stat-value\">${results.summary.totalAnalyzed}</div>
                <div class=\"stat-label\">Total Matchups</div>
            </div>
            <div class=\"summary-stat\">
                <div class=\"stat-value\">${results.summary.favorableMatchups}</div>
                <div class=\"stat-label\">Favorable</div>
            </div>
            <div class=\"summary-stat\">
                <div class=\"stat-value\">${results.summary.evenMatchups}</div>
                <div class=\"stat-label\">Even</div>
            </div>
            <div class=\"summary-stat\">
                <div class=\"stat-value\">${results.summary.unfavorableMatchups}</div>
                <div class=\"stat-label\">Unfavorable</div>
            </div>
            <div class=\"summary-stat\">
                <div class=\"stat-value\">${(results.summary.averageScore * 100).toFixed(1)}%</div>
                <div class=\"stat-label\">Average Score</div>
            </div>
        </div>
    `;
    
    // Render matchups table
    const tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Opponent Deck</th>
                    <th>Overall Score</th>
                    <th>Interaction Score</th>
                    <th>Speed Score</th>
                    <th>Consistency Score</th>
                    <th>Favorable Interactions</th>
                    <th>Total Interactions</th>
                </tr>
            </thead>
            <tbody>
                ${results.matchups.map(matchup => {
                    const scoreClass = matchup.overallScore > 0.6 ? \"favorable\" : 
                                     matchup.overallScore < 0.4 ? \"unfavorable\" : \"even\";
                    return `
                        <tr>
                            <td>${matchup.opponentName}</td>
                            <td><span class=\"matchup-score ${scoreClass}\">${(matchup.overallScore * 100).toFixed(1)}%</span></td>
                            <td>${(matchup.details.interactionScore * 100).toFixed(1)}%</td>
                            <td>${(matchup.details.speedScore * 100).toFixed(1)}%</td>
                            <td>${(matchup.details.consistencyScore * 100).toFixed(1)}%</td>
                            <td>${matchup.details.favorableInteractions}</td>
                            <td>${matchup.details.totalInteractions}</td>
                        </tr>
                    `;
                }).join(\"\")}
            </tbody>
        </table>
    `;
    
    batchMatchupsTable.innerHTML = tableHTML;
}

function exportBatchResults() {
    if (!lastBatchResults) {
        alert("No batch results to export. Please run a batch analysis first.");
        return;
    }
    
    const csvData = batchAnalyzer.exportResults(lastBatchResults, \"csv\");
    const blob = new Blob([csvData], { type: \"text/csv\" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement(\'a\');
    a.href = url;
    a.download = \'lorcana_batch_analysis_results.csv\';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
}

// Make removeMetaDeck available globally for onclick handlers
window.removeMetaDeck = removeMetaDeck;

init();


