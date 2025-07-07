// Main App Entrypoint for Lorcana Matchup Analyzer
// Import all logic modules
import * as cardData from './cardData.js';
import * as cardFeatures from './cardFeatures.js';
import * as deckUtils from './deckUtils.js';
import * as metrics from './metrics.js';
import * as uwpm from './uwpm.js';
import * as matchupAnalysis from './matchupAnalysis.js';
import * as tfa from './tfa.js';
import * as uiHelpers from './uiHelpers.js';

// --- Initialization & Data Loading ---
document.addEventListener('DOMContentLoaded', async () => {
  // DOM elements
  const loadingIndicator = document.getElementById('loadingIndicator');
  const appContent = document.getElementById('appContent');
  const playerDeckInput = document.getElementById('playerDeckInput');
  const opponentDeckInput = document.getElementById('opponentDeckInput');
  const analyzeButton = document.getElementById('analyzeButton');

  // Default decklists (from original script)
  const DEFAULT_PLAYER_DECK = `4 Be Prepared\n4 Vision of the Future\n4 How Far I'll Go\n4 Tipo - Growing Son\n4 Develop Your Brain\n4 Pawpsicle\n4 Sail The Azurite Sea\n4 Maui - Half-Shark\n4 A Pirate's Life\n4 McDuck Manor - Scrooge's Mansion\n4 Maui - Hero to All\n4 Gramma Tala - Keeper of Ancient Stories\n4 Tamatoa - Happy as a Clam\n2 Sisu - Empowered Sibling\n4 Goofy - Super Goof\n2 Hades - Infernal Schemer`;
  const DEFAULT_OPPONENT_DECK = `4 Calhoun - Marine Sergeant\n4 Cinderella - Ballroom Sensation\n3 Daisy Duck - Donald's Date\n4 Doc - Bold Knight\n3 Happy - Lively Knight\n4 Lady - Family Dog\n4 Let the Storm Rage On\n4 Mr. Smee - Bumbling Mate\n4 Pete - Games Referee\n4 Piglet - Pooh Pirate Captain\n4 Rapunzel - Gifted with Healing\n2 Rapunzel's Tower - Secluded Prison\n4 Rhino - One-Sixteenth Wolf\n4 Rhino - Power Hamster\n4 Seven Dwarfs' Mine - Secure Fortress\n4 Strength of a Raging Fire`;

  try {
    // Fetch card data and patterns
    await cardData.fetchCardData();
    await cardData.fetchPatterns();

    // Hide loading, show app
    loadingIndicator.classList.add('hidden');
    appContent.classList.remove('hidden');

    // Set default decklists if sessionStorage is empty
    if (sessionStorage.getItem('playerDeckInput') === null) {
      playerDeckInput.value = DEFAULT_PLAYER_DECK;
    }
    if (sessionStorage.getItem('opponentDeckInput') === null) {
      opponentDeckInput.value = DEFAULT_OPPONENT_DECK;
    }

    // Restore from sessionStorage if available
    const sessionPlayerDeck = deckUtils.loadDeckFromSession('playerDeckInput');
    const sessionOpponentDeck = deckUtils.loadDeckFromSession('opponentDeckInput');
    if (sessionPlayerDeck !== null) {
      playerDeckInput.value = sessionPlayerDeck;
    }
    if (sessionOpponentDeck !== null) {
      opponentDeckInput.value = sessionOpponentDeck;
    }

    // Save to sessionStorage on input
    playerDeckInput.addEventListener('input', () => {
      deckUtils.saveDeckToSession('playerDeckInput', playerDeckInput.value);
    });
    opponentDeckInput.addEventListener('input', () => {
      deckUtils.saveDeckToSession('opponentDeckInput', opponentDeckInput.value);
    });

    analyzeButton.addEventListener('click', () => {
      const playerDeck = deckUtils.parseDeckString(playerDeckInput.value);
      const opponentDeck = deckUtils.parseDeckString(opponentDeckInput.value);
      console.log('Parsed Player Deck:', playerDeck);
      console.log('Parsed Opponent Deck:', opponentDeck);

      // Feature extraction
      const allPlayerCards = [
        ...playerDeck.characters,
        ...playerDeck.songs,
        ...playerDeck.locations,
        ...playerDeck.items,
        ...playerDeck.actions
      ];
      const allOpponentCards = [
        ...opponentDeck.characters,
        ...opponentDeck.songs,
        ...opponentDeck.locations,
        ...opponentDeck.items,
        ...opponentDeck.actions
      ];
      const playerUWPCards = allPlayerCards.map(entry => ({
        ...cardFeatures.extractCardFeatures(entry, cardData.LORCANA_PATTERNS),
        count: entry.count
      }));
      const opponentUWPCards = allOpponentCards.map(entry => ({
        ...cardFeatures.extractCardFeatures(entry, cardData.LORCANA_PATTERNS),
        count: entry.count
      }));
      console.log('Player UWPCard objects:', playerUWPCards);
      console.log('Opponent UWPCard objects:', opponentUWPCards);

      // Metric calculations
      const playerRDS = metrics.getRDS(playerUWPCards, cardData.LORCANA_PATTERNS);
      const playerLVI = metrics.getLVI(playerUWPCards);
      const playerBCR = metrics.getBCR(playerUWPCards);
      const opponentRDS = metrics.getRDS(opponentUWPCards, cardData.LORCANA_PATTERNS);
      const opponentLVI = metrics.getLVI(opponentUWPCards);
      const opponentBCR = metrics.getBCR(opponentUWPCards);
      console.log('Player RDS:', playerRDS, 'LVI:', playerLVI, 'BCR:', playerBCR);
      console.log('Opponent RDS:', opponentRDS, 'LVI:', opponentLVI, 'BCR:', opponentBCR);

      // TFA calculation
      const tfaPhaseWeights = { early: 1, mid: 2, late: 1 };
      const playerTFA = tfa.calculateTFA(
        allPlayerCards,
        playerUWPCards,
        playerRDS.breakdown,
        playerLVI.breakdown,
        playerBCR.breakdown,
        tfaPhaseWeights
      );
      const opponentTFA = tfa.calculateTFA(
        allOpponentCards,
        opponentUWPCards,
        opponentRDS.breakdown,
        opponentLVI.breakdown,
        opponentBCR.breakdown,
        tfaPhaseWeights
      );
      console.log('Player TFA:', playerTFA);
      console.log('Opponent TFA:', opponentTFA);

      // Win probability calculation
      const winProb = uwpm.calculateWinProbability(
        playerUWPCards,
        opponentUWPCards,
        playerTFA.total,
        opponentTFA.total,
        uwpm.defaultUWPMConfig
      );
      console.log('Win Probability (Player Deck):', winProb, '(', (winProb * 100).toFixed(1) + '% )');

      // --- Basic UI Rendering ---
      const winProbDisplay = document.getElementById('win-probability-display');
      winProbDisplay.innerHTML = `
        <p class="text-xl">Your Deck's Estimated Win Chance:</p>
        <p class="text-5xl font-bold text-green-400 my-2">${(winProb * 100).toFixed(1)}%</p>
        <p class="text-lg text-gray-400">Opponent's Chance: ${(100 - winProb * 100).toFixed(1)}%</p>
        <div class="mt-6 text-left max-w-2xl mx-auto bg-gray-900 rounded-lg p-4 shadow-inner">
          <h3 class="text-lg font-semibold text-purple-300 mb-2">Key Metrics</h3>
          <table class="w-full text-sm text-left border-collapse">
            <thead>
              <tr class="border-b border-gray-700">
                <th class="py-1 px-2">Metric</th>
                <th class="py-1 px-2">Player</th>
                <th class="py-1 px-2">Opponent</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="py-1 px-2">RDS</td>
                <td class="py-1 px-2 text-blue-300">${playerRDS.total.toFixed(2)}</td>
                <td class="py-1 px-2 text-pink-300">${opponentRDS.total.toFixed(2)}</td>
              </tr>
              <tr>
                <td class="py-1 px-2">LVI</td>
                <td class="py-1 px-2 text-blue-300">${playerLVI.total.toFixed(2)}</td>
                <td class="py-1 px-2 text-pink-300">${opponentLVI.total.toFixed(2)}</td>
              </tr>
              <tr>
                <td class="py-1 px-2">BCR</td>
                <td class="py-1 px-2 text-blue-300">${playerBCR.total.toFixed(2)}</td>
                <td class="py-1 px-2 text-pink-300">${opponentBCR.total.toFixed(2)}</td>
              </tr>
              <tr>
                <td class="py-1 px-2">TFA</td>
                <td class="py-1 px-2 text-blue-300">${playerTFA.total.toFixed(2)}</td>
                <td class="py-1 px-2 text-pink-300">${opponentTFA.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      // --- Card Selection Grid UI ---
      const playerCardsGrid = document.getElementById('playerCardsGrid');
      uiHelpers.renderCardGrid(playerDeck.characters, playerCardsGrid, (selectedCard, selectedIndex) => {
        console.log('Selected player character:', selectedCard, selectedIndex);
        // Run matchup analysis against all opponent characters
        const matchupData = opponentDeck.characters.map(opponentCard => ({
          opponentCard,
          result: matchupAnalysis.calculateSingleMatchup(selectedCard, opponentCard, 'player')
        }));
        // Render the matchup grid
        const resultsDisplay = document.getElementById('resultsDisplay');
        resultsDisplay.innerHTML = '';
        uiHelpers.renderMatchupGrid(matchupData, resultsDisplay);

        // --- Ability Impact Breakdown ---
        // For each opponent character, analyze the impact of the selected character's abilities
        const impactData = opponentDeck.characters.map(opponentCard => {
          // For simplicity, use the first ability (or all abilities concatenated)
          // In a full implementation, you may want to analyze each ability separately
          const abilities = selectedCard.abilities || [];
          let bestImpact = { classification: 'NoInteraction', details: '', opponentCard };
          for (const ability of abilities) {
            const result = matchupAnalysis.classifyAbilityEffectOnTarget(selectedCard, ability.fullText, opponentCard, true);
            // Prioritize DirectRemoval > PotentialRemoval > AffectsNoRemoval > NoInteraction
            const rank = {
              'DirectRemoval': 3,
              'PotentialRemoval': 2,
              'AffectsNoRemoval': 1,
              'NoInteraction': 0,
              'NoInteractionDueToWard': 0
            };
            if (rank[result.classification] > rank[bestImpact.classification]) {
              bestImpact = { ...result, opponentCard };
            }
          }
          return bestImpact;
        });
        // Render the ability impact table below the matchup grid
        const abilityImpactDiv = document.createElement('div');
        resultsDisplay.appendChild(abilityImpactDiv);
        uiHelpers.renderAbilityImpact(impactData, abilityImpactDiv);

        // --- Song Synergy ---
        // For each song, find eligible singers
        const songSynergyData = playerDeck.songs.map(songCard => {
          // Singer value: if character has Singer keyword, use its value, else use cost
          const eligibleSingers = playerDeck.characters.filter(char => {
            const singerAbility = (char.abilities || []).find(a => a.keyword === 'Singer');
            const singValue = singerAbility ? singerAbility.keywordValueNumber : char.cost;
            return singValue >= songCard.cost;
          });
          return { songCard, eligibleSingers };
        });
        const songSynergyDiv = document.createElement('div');
        resultsDisplay.appendChild(songSynergyDiv);
        uiHelpers.renderSongSynergy(songSynergyData, songSynergyDiv);

        // --- Location Interaction Analysis ---
        // For each location, find interactors from both decks
        const locationData = [
          ...playerDeck.locations.map(locationCard => ({
            locationCard,
            playerInteractors: allPlayerCards.filter(card => matchupAnalysis.classifyLocationInteraction(card, card.fullText || '', true)),
            opponentInteractors: allOpponentCards.filter(card => matchupAnalysis.classifyLocationInteraction(card, card.fullText || '', false))
          })),
          ...opponentDeck.locations.map(locationCard => ({
            locationCard,
            playerInteractors: allPlayerCards.filter(card => matchupAnalysis.classifyLocationInteraction(card, card.fullText || '', true)),
            opponentInteractors: allOpponentCards.filter(card => matchupAnalysis.classifyLocationInteraction(card, card.fullText || '', false))
          }))
        ];
        const locationAnalysisDiv = document.createElement('div');
        resultsDisplay.appendChild(locationAnalysisDiv);
        uiHelpers.renderLocationAnalysis(locationData, locationAnalysisDiv);

        // --- Per-Card Metric Tables ---
        // Player deck
        const playerMetricData = allPlayerCards.map(card => {
          const rdsRow = playerRDS.breakdown.find(row => row.name === card.fullName) || {};
          const lviRow = playerLVI.breakdown.find(row => row.name === card.fullName) || {};
          const bcrRow = playerBCR.breakdown.find(row => row.name === card.fullName) || {};
          return {
            card,
            rds: rdsRow.value,
            lvi: lviRow.value,
            bcr: bcrRow.value,
            rdsExp: rdsRow.explanation,
            lviExp: lviRow.explanation,
            bcrExp: bcrRow.explanation
          };
        });
        const playerMetricDiv = document.createElement('div');
        playerMetricDiv.innerHTML = '<h3 class="text-lg font-semibold text-blue-300 mb-2">Player Deck: Per-Card Metrics</h3>';
        resultsDisplay.appendChild(playerMetricDiv);
        uiHelpers.renderMetricTable(playerMetricData, playerMetricDiv);
        // Opponent deck
        const opponentMetricData = allOpponentCards.map(card => {
          const rdsRow = opponentRDS.breakdown.find(row => row.name === card.fullName) || {};
          const lviRow = opponentLVI.breakdown.find(row => row.name === card.fullName) || {};
          const bcrRow = opponentBCR.breakdown.find(row => row.name === card.fullName) || {};
          return {
            card,
            rds: rdsRow.value,
            lvi: lviRow.value,
            bcr: bcrRow.value,
            rdsExp: rdsRow.explanation,
            lviExp: lviRow.explanation,
            bcrExp: bcrRow.explanation
          };
        });
        const opponentMetricDiv = document.createElement('div');
        opponentMetricDiv.innerHTML = '<h3 class="text-lg font-semibold text-pink-300 mb-2">Opponent Deck: Per-Card Metrics</h3>';
        resultsDisplay.appendChild(opponentMetricDiv);
        uiHelpers.renderMetricTable(opponentMetricData, opponentMetricDiv);

        // --- TFA Phase-by-Phase Breakdown ---
        const tfaDetailDiv = document.createElement('div');
        tfaDetailDiv.innerHTML = '<h3 class="text-lg font-semibold text-yellow-300 mb-2">TFA Phase-by-Phase Breakdown</h3>';
        resultsDisplay.appendChild(tfaDetailDiv);
        uiHelpers.renderTFADetailTable(playerTFA, opponentTFA, tfaPhaseWeights, tfaDetailDiv);
      });

      // TODO: Continue with win probability, TFA, and UI rendering
    });
  } catch (error) {
    console.error('Error during app initialization:', error);
    loadingIndicator.innerHTML = `<p class="text-red-500">Error loading data. Please try refreshing. Details: ${error.message}</p>`;
  }

  // --- Modular Modal Logic for Deck Database Loading/Search ---
  const deckLoadModal = document.getElementById('deckLoadModal');
  const loadPlayerDeckBtn = document.getElementById('loadPlayerDeckBtn');
  const loadOpponentDeckBtn = document.getElementById('loadOpponentDeckBtn');
  let allDecks = [];
  let deckLoadTarget = null; // 'player' or 'opponent'

  async function fetchDecksFromDatabase() {
    // Example: fetch from Supabase (replace with your actual fetch logic)
    // For now, just return a static array for demonstration
    // Replace this with your actual Supabase fetch if needed
    return allDecks.length ? allDecks : [
      { name: 'Sample Deck 1', decklist: '4 Card A\n4 Card B' },
      { name: 'Sample Deck 2', decklist: '4 Card X\n4 Card Y' }
    ];
  }

  function showDeckModal(target) {
    deckLoadTarget = target;
    deckLoadModal.classList.remove('opacity-0', 'pointer-events-none');
    uiHelpers.renderModal({
      decks: allDecks,
      onSelect: (deck) => {
        if (deckLoadTarget === 'player') {
          playerDeckInput.value = deck.decklist || '';
          deckUtils.saveDeckToSession('playerDeckInput', playerDeckInput.value);
        } else if (deckLoadTarget === 'opponent') {
          opponentDeckInput.value = deck.decklist || '';
          deckUtils.saveDeckToSession('opponentDeckInput', opponentDeckInput.value);
        }
        hideDeckModal();
      },
      onClose: hideDeckModal,
      searchTerm: ''
    }, deckLoadModal);
  }
  function hideDeckModal() {
    deckLoadModal.classList.add('opacity-0', 'pointer-events-none');
    deckLoadTarget = null;
    deckLoadModal.innerHTML = '';
  }

  loadPlayerDeckBtn.addEventListener('click', async () => {
    allDecks = await fetchDecksFromDatabase();
    showDeckModal('player');
  });
  loadOpponentDeckBtn.addEventListener('click', async () => {
    allDecks = await fetchDecksFromDatabase();
    showDeckModal('opponent');
  });

  // TODO: Continue migration: event listeners, analysis logic, etc.
}); 