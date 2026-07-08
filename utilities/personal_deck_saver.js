document.addEventListener('DOMContentLoaded', () => {
    // --- GLOBAL STATE & CONFIG ---
    const SUPABASE_URL = 'https://cjlhrfhximjldqrfblkj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbGhyZmh4aW1qbGRxcmZibGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MTcxNzQsImV4cCI6MjA2NTk5MzE3NH0.zLiQcPnKt2SnNfQIkUnOG7bOo6F7MPMh8MsasdFF6lw';
    const CARD_DATA_URL = 'https://raw.githubusercontent.com/heavenideas/similcana/refs/heads/main/database/allCards.json';
    const ABILITIES_URL = 'https://raw.githubusercontent.com/heavenideas/heavenideas.github.io/refs/heads/main/lorcanaUtils_MatchUpAnalyzer/lorcana_abilities_redux.json';

    const INK_COLORS = {
        Amber: { hex: '#FCD34D', name: 'Amber' }, Amethyst: { hex: '#C084FC', name: 'Amethyst' },
        Emerald: { hex: '#34D399', name: 'Emerald' }, Ruby: { hex: '#F87171', name: 'Ruby' },
        Sapphire: { hex: '#60A5FA', name: 'Sapphire' }, Steel: { hex: '#9CA3AF', name: 'Steel' }
    };
    const TYPE_COLORS = { Character: '#2563eb', Item: '#db2777', Location: '#d97706', Action: '#16a34a', Song: '#8b5cf6' };
    const SUBTYPE_COLORS = {
        Hero: '#3b82f6', Villain: '#ef4444', Ally: '#10b981', Mentor: '#f59e0b',
        Captain: '#8b5cf6', Prince: '#ec4899', King: '#f97316', Musician: '#06b6d4',
        Sorcerer: '#a855f7', Alien: '#64748b', Pirate: '#dc2626', Knight: '#ea580c',
        Dreamborn: '#fbbf24', Floodborn: '#3b82f6', Storyborn: '#10b981', Inventor: '#f59e0b',
        Deceiver: '#ef4444', SevenDwarfs: '#8b5cf6', Madrigal: '#ec4899', Queen: '#f97316',
        Hyena: '#64748b', Bystander: '#dc2626', Detective: '#ea580c', Tigger: '#06b6d4',
        Rabbit: '#fbbf24', Owl: '#3b82f6', Tiger: '#10b981', Bear: '#f59e0b',
        Piglet: '#ef4444', Roo: '#8b5cf6', Kanga: '#ec4899', Eeyore: '#f97316',
        Heffalump: '#64748b', Woozle: '#dc2626', Huntsman: '#ea580c', Huntswoman: '#06b6d4',
        Genie: '#fbbf24', Jafar: '#3b82f6', Jasmine: '#10b981', Aladdin: '#f59e0b',
        Ursula: '#ef4444', Ariel: '#8b5cf6', Flounder: '#ec4899', Sebastian: '#f97316',
        Beast: '#64748b', Belle: '#dc2626', Gaston: '#ea580c', Lumiere: '#06b6d4',
        Cogsworth: '#fbbf24', MrsPott: '#3b82f6', Chip: '#10b981', Wardrobe: '#f59e0b'
    };

    const RATING_CLASSES = {
        "S": "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
        "A": "bg-green-500/20 text-green-400 border-green-500/50",
        "B": "bg-blue-500/20 text-blue-400 border-blue-500/50",
        "C": "bg-gray-500/20 text-gray-400 border-gray-500/50",
        "D": "bg-orange-500/20 text-orange-400 border-orange-500/50",
        "F": "bg-red-500/20 text-red-400 border-red-500/50"
    };

    // --- SIMULATION GLOBALS ---
    let simDecklist = [];
    let shuffledDeck = [];
    let openingHand = [];
    let recentShuffles = [];
    let currentShuffleAnalysis = {};

    // --- CORE STATE ---
    let allCards = [];
    let cardFuse = null;
    let charts = {};
    let selectedForMulligan = [];
    let currentDeck = [];
    let allDecks = [];
    let deckFuse;
    let mulliganScenario = 'OnThePlay'; // 'OnThePlay' or 'OnTheDraw'
    let inspector;
    let suppressDirty = false;

    // --- FAST LOOKUP CACHES (perf) ---
    const normalize = s => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const cardByName = new Map();       // normalized name -> card
    const fuseResolveCache = new Map(); // normalized line -> card|null
    const metricsCache = new Map();     // card.fullName -> {rds,lvi,bcr}

    function resolveCard(rawName) {
        const key = normalize(rawName);
        if (!key) return null;
        const direct = cardByName.get(key);
        if (direct) return direct;
        if (fuseResolveCache.has(key)) return fuseResolveCache.get(key);
        let result = null;
        if (cardFuse) {
            const r = cardFuse.search(rawName);
            if (r.length > 0) result = r[0].item;
        }
        fuseResolveCache.set(key, result);
        return result;
    }

    function getMetrics(card) {
        const key = card.fullName;
        if (metricsCache.has(key)) return metricsCache.get(key);
        const m = UnifiedWinProbabiliyCalculation.calculateCardMetrics(card);
        const out = { rds: m.rds, lvi: m.lvi, bcr: m.bcr };
        metricsCache.set(key, out);
        return out;
    }

    // --- CACHED FETCH (Cache API, stale-while-revalidate) ---
    async function cachedJson(url, cacheName = 'deck-saver-v1', maxAgeMs = 24 * 60 * 60 * 1000) {
        try {
            if (!('caches' in window)) throw new Error('no cache api');
            const cache = await caches.open(cacheName);
            const hit = await cache.match(url);
            const revalidate = () => fetch(url).then(r => { if (r.ok) cache.put(url, r.clone()); return r; });
            if (hit) {
                const age = Date.now() - new Date(hit.headers.get('date') || 0).getTime();
                if (age > maxAgeMs) revalidate().catch(() => { });
                return hit.json();
            }
            const res = await revalidate();
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        } catch (e) {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        }
    }

    // --- TINY HELPERS ---
    const escapeHtml = s => (s || '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const escAttr = s => (s || '').replace(/"/g, '&quot;');
    const inkA = () => getComputedStyle(document.documentElement).getPropertyValue('--ink-a').trim() || '#a855f7';

    function toast(msg, kind = 'info') {
        const host = document.getElementById('toastHost');
        if (!host) return;
        const el = document.createElement('div');
        el.className = `toast is-${kind}`;
        el.setAttribute('role', 'status');
        el.textContent = msg;
        host.appendChild(el);
        setTimeout(() => {
            el.classList.add('leaving');
            setTimeout(() => el.remove(), 220);
        }, 3500);
    }

    const DOMElements = {
        // Shuffle Sim
        shuffleButton: document.getElementById('shuffle-button'),
        resetButton: document.getElementById('reset-button'),
        handQualityContainer: document.getElementById('hand-quality-container'),
        openingQualityScore: document.getElementById('opening-quality-score'),
        openingQualityRating: document.getElementById('opening-quality-rating'),
        openingQualityBar: document.getElementById('opening-quality-bar'),
        finalQualityScore: document.getElementById('final-quality-score'),
        finalQualityRating: document.getElementById('final-quality-rating'),
        finalQualityBar: document.getElementById('final-quality-bar'),
        recentShufflesList: document.getElementById('recent-shuffles-list'),

        // Hand Analysis
        handAnalysisContainer: document.getElementById('hand-analysis-container'),
        openingHandRating: document.getElementById('opening-hand-rating'),
        openingHandAnalysisPoints: document.getElementById('opening-hand-analysis-points'),
        handInkableStat: document.getElementById('hand-inkable-stat'),
        handCurveStat: document.getElementById('hand-curve-stat'),
        handTypesStat: document.getElementById('hand-types-stat'),
        handColorsStat: document.getElementById('hand-colors-stat'),
        openingHandContainer: document.getElementById('opening-hand-container'),
        finalHandContainer: document.getElementById('final-hand-container'),
        openingHandScoreDisplay: document.getElementById('opening-hand-score-display'),
        finalHandScoreDisplay: document.getElementById('final-hand-score-display'),
        handComparison: document.getElementById('hand-comparison'),

        // Early Game
        earlyInkableStat: document.getElementById('early-inkable-stat'),
        earlyCurveStat: document.getElementById('early-curve-stat'),
        earlyTypesStat: document.getElementById('early-types-stat'),
        earlyColorsStat: document.getElementById('early-colors-stat'),
        earlyTagsStat: document.getElementById('early-tags-stat'),

        // Timeline
        deckTimelineContainer: document.getElementById('deck-timeline-container'),
        deckTimelineHeader: document.getElementById('deck-timeline-header'),
        deckTimelineCards: document.getElementById('deck-timeline-cards'),

        // Shuffle Quality
        shuffleQualityContainer: document.getElementById('shuffle-quality-container'),
        shuffleQualityRating: document.getElementById('shuffle-quality-rating'),
        shuffleQualityIssues: document.getElementById('shuffle-quality-issues'),
        toggleStatsButton: document.getElementById('toggle-stats-button'),
        toggleStatsIcon: document.getElementById('toggle-stats-icon'),
        toggleStatsText: document.getElementById('toggle-stats-text'),
        detailedStatsContainer: document.getElementById('detailed-stats-container'),
        consecutiveCardsStat: document.getElementById('consecutive-cards-stat'),
        clusteringStat: document.getElementById('clustering-stat'),
        clusteringAlertBox: document.getElementById('clustering-alert-box'),
        clusteringAlertText: document.getElementById('clustering-alert-text'),
        distColorsStat: document.getElementById('dist-colors-stat'),
        distCostsStat: document.getElementById('dist-costs-stat'),
        distInkwellStat: document.getElementById('dist-inkwell-stat'),

        // Simulation
        simIterations: document.getElementById('sim-iterations'),
        runSimButton: document.getElementById('run-sim-button'),
        simStatus: document.getElementById('sim-status'),
        simResults: document.getElementById('sim-results'),
        simAvgQuality: document.getElementById('sim-avg-quality'),
        simAvgOpeningQuality: document.getElementById('sim-avg-opening-quality'),
        simMulliganRate: document.getElementById('sim-mulligan-rate'),
        simAvgReplaced: document.getElementById('sim-avg-replaced'),
        simBrickRate: document.getElementById('sim-brick-rate'),
        simCurveRate: document.getElementById('sim-curve-rate'),
        simFreqCards: document.getElementById('sim-freq-cards'),
        simQualityChart: document.getElementById('sim-quality-chart'),
        simIssuesChart: document.getElementById('sim-issues-chart'),
    };

    // --- UI ELEMENTS ---
    const deckForm = document.getElementById('deckForm');
    const deckListContainer = document.getElementById('deckListContainer');
    const newDeckBtn = document.getElementById('newDeckBtn');
    const sidebarNewDeckBtn = document.getElementById('sidebarNewDeckBtn');
    const deleteDeckBtn = document.getElementById('deleteDeckBtn');
    const editorTitle = document.getElementById('editorTitle');
    const topbarDeckName = document.getElementById('topbarDeckName');
    const deckIdInput = document.getElementById('deckId');
    const decklistTextarea = document.getElementById('decklist');
    const inkTypesContainer = document.getElementById('inkTypes');
    const visualDeckContainer = document.getElementById('visualDeckContainer');
    const totalCardsSpan = document.getElementById('total-cards');
    const confirmationModal = document.getElementById('confirmationModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const mulliganResultContainer = document.getElementById('mulliganResultContainer');
    const mulliganResultEl = document.getElementById('mulliganResult');
    const mulliganDetailsEl = document.getElementById('mulliganDetails');
    const mulliganInstructions = document.getElementById('mulliganInstructions');
    const deckSearchInput = document.getElementById('deckSearch');
    const onThePlayBtn = document.getElementById('onThePlayBtn');
    const onTheDrawBtn = document.getElementById('onTheDrawBtn');
    const cardSearchInput = document.getElementById('cardSearchInput');
    const cardSearchResults = document.getElementById('cardSearchResults');
    const copyDecklistBtn = document.getElementById('copyDecklistBtn');
    const llmPromptModal = document.getElementById('llmPromptModal');
    const closeLlmModalBtn = document.getElementById('closeLlmModalBtn');
    const llmPromptOutput = document.getElementById('llmPromptOutput');
    const copyLlmPromptBtn = document.getElementById('copyLlmPromptBtn');
    const generateLlmPromptBtn = document.getElementById('generateLlmPromptBtn');
    const hoverPopupToggle = document.getElementById('hoverPopupToggle');

    // Shell
    const app = document.getElementById('app');
    const drawerToggle = document.getElementById('drawerToggle');
    const drawerClose = document.getElementById('drawerClose');
    const drawerScrim = document.getElementById('drawerScrim');
    const overflowToggle = document.getElementById('overflowToggle');
    const overflowMenu = document.getElementById('overflowMenu');

    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // ============================================================
    // SHELL: tabs, drawer, overflow, save-state, ink identity
    // ============================================================
    function switchTab(tabId) {
        document.querySelectorAll('.tab-button').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
        document.querySelectorAll('.bottomnav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tabId));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === `tab-${tabId}`));
        const tc = document.querySelector('.tab-content');
        if (tc) tc.scrollTop = 0;
    }

    function openDrawer() {
        app.classList.add('drawer-open');
        drawerScrim.hidden = false;
        requestAnimationFrame(() => drawerScrim.classList.add('show'));
        drawerToggle.setAttribute('aria-expanded', 'true');
    }
    function closeDrawer() {
        app.classList.remove('drawer-open');
        drawerScrim.classList.remove('show');
        setTimeout(() => { drawerScrim.hidden = true; }, 250);
        drawerToggle.setAttribute('aria-expanded', 'false');
    }

    function toggleOverflow(force) {
        const show = force !== undefined ? force : overflowMenu.hidden;
        overflowMenu.hidden = !show;
        overflowToggle.setAttribute('aria-expanded', String(show));
    }

    function setSaveState(state) {
        const el = document.getElementById('saveState');
        const label = document.getElementById('saveStateLabel');
        el.classList.remove('is-clean', 'is-dirty', 'is-saving');
        if (state === 'clean') { el.classList.add('is-clean'); label.textContent = 'Saved'; }
        else if (state === 'saving') { el.classList.add('is-saving'); label.textContent = 'Saving…'; }
        else { el.classList.add('is-dirty'); label.textContent = 'Unsaved'; }
    }
    function markDirty() { if (!suppressDirty) setSaveState('dirty'); }

    function applyInkIdentity(inks) {
        const list = (inks && inks.length) ? inks : ['Amethyst', 'Sapphire'];
        const a = INK_COLORS[list[0]] ? INK_COLORS[list[0]].hex : '#C084FC';
        const b = INK_COLORS[list[1] || list[0]] ? INK_COLORS[list[1] || list[0]].hex : a;
        document.documentElement.style.setProperty('--ink-a', a);
        document.documentElement.style.setProperty('--ink-b', b);
    }

    function showGridSkeleton(n = 8) {
        let cells = '';
        for (let i = 0; i < n; i++) cells += '<div class="skeleton-card"></div>';
        visualDeckContainer.innerHTML = `<div class="skeleton-grid">${cells}</div>`;
    }

    function deckCardCount(decklist) {
        if (!decklist) return 0;
        let total = 0;
        decklist.split('\n').forEach(line => {
            const t = line.trim();
            if (!t) return;
            const m = t.match(/^(\d+)x?\s/);
            total += m ? parseInt(m[1], 10) : 1;
        });
        return total;
    }

    // ============================================================
    // LOGIC: PREP
    // ============================================================
    function prepareSimulationDeck() {
        simDecklist = [];
        currentDeck.forEach(item => {
            for (let i = 0; i < item.count; i++) {
                simDecklist.push({ ...item.card });
            }
        });
        return simDecklist;
    }

    function handleReset() {
        shuffledDeck = [];
        openingHand = [];
        recentShuffles = [];
        currentShuffleAnalysis = {};

        DOMElements.handQualityContainer.classList.add('hidden');
        DOMElements.handAnalysisContainer.classList.add('hidden');
        DOMElements.shuffleQualityContainer.classList.add('hidden');
        DOMElements.recentShufflesList.innerHTML = '<p class="text-xs text-gray-500 text-center py-4">Shuffle the deck to see results.</p>';

        ['hand-inkable-stat', 'hand-curve-stat', 'hand-types-stat', 'hand-colors-stat',
            'early-inkable-stat', 'early-curve-stat', 'early-types-stat', 'early-colors-stat', 'early-tags-stat',
            'opening-hand-container', 'final-hand-container', 'deck-timeline-cards',
            'shuffle-quality-issues', 'consecutive-cards-stat', 'clustering-stat',
            'dist-colors-stat', 'dist-costs-stat', 'dist-inkwell-stat'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = '';
            });

        document.getElementById('opening-hand-rating').className = '';
        document.getElementById('opening-hand-rating').textContent = '';
        document.getElementById('shuffle-quality-rating').className = '';
        document.getElementById('shuffle-quality-rating').textContent = '';
    }

    function fisherYatesShuffle(deck) {
        const newDeck = [...deck];
        for (let i = newDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }
        return newDeck;
    }

    function determineMulligan(hand) {
        const toKeep = [];
        const toMulligan = [];
        const uninkables = hand.filter(c => !c.inkwell);
        const inkables = hand.filter(c => c.inkwell);

        if (uninkables.length > 2) {
            uninkables.sort((a, b) => b.cost - a.cost);
            toKeep.push(...uninkables.slice(uninkables.length - 2));
            toMulligan.push(...uninkables.slice(0, uninkables.length - 2));
        } else {
            toKeep.push(...uninkables);
        }

        const sortedInkables = inkables.sort((a, b) => a.cost - b.cost);
        [1, 2, 3].forEach(cost => {
            const foundIndex = sortedInkables.findIndex(c => c.cost === cost);
            if (foundIndex !== -1) {
                toKeep.push(sortedInkables[foundIndex]);
                sortedInkables.splice(foundIndex, 1);
            }
        });

        toMulligan.push(...sortedInkables);

        const indicesToMulligan = [];
        hand.forEach((card, index) => {
            if (toMulligan.includes(card)) {
                indicesToMulligan.push(index);
                const idx = toMulligan.indexOf(card);
                if (idx > -1) toMulligan.splice(idx, 1);
            }
        });

        return indicesToMulligan;
    }

    function performSingleSimulation(deck) {
        const shuffledDeckLocal = fisherYatesShuffle([...deck]);
        const initialHand = shuffledDeckLocal.slice(0, 7);
        const deckAfterDraw = shuffledDeckLocal.slice(7);

        const mulliganIndices = determineMulligan(initialHand);
        const cardsToBottom = mulliganIndices.map(i => initialHand[i]);
        const keptHand = initialHand.filter((_, i) => !mulliganIndices.includes(i));

        const replacements = deckAfterDraw.slice(0, mulliganIndices.length);
        const finalHand = [...keptHand, ...replacements];

        const deckRest = deckAfterDraw.slice(mulliganIndices.length);
        const newDeck = fisherYatesShuffle([...deckRest, ...cardsToBottom]);

        const openingAnalysis = analyzeHand(initialHand);
        const finalAnalysis = analyzeHand(finalHand);

        return {
            id: Date.now(),
            timestamp: new Date(),
            initialHand,
            finalHand,
            mulliganIndices,
            deck: newDeck,
            openingAnalysis,
            finalAnalysis
        };
    }

    function handleShuffleDeck() {
        const deck = prepareSimulationDeck();
        if (deck.length === 0) { toast('Build a deck first.', 'info'); return; }

        const result = performSingleSimulation(deck);

        recentShuffles.unshift(result);
        if (recentShuffles.length > 10) recentShuffles.pop();

        currentShuffleAnalysis = result;
        renderShuffleSimulator();
    }

    function analyzeCardGroup(cards) {
        const group = {
            cards: cards,
            count: cards.length,
            inkable: 0,
            avgCost: 0,
            costs: { "1-3": 0, "4-5": 0, "6+": 0 },
            types: {},
            colors: {},
            hasLowCost: false,
            hasHighCost: false,
        };

        let totalCost = 0;
        for (const card of cards) {
            if (card.inkwell) group.inkable++;
            totalCost += card.cost;

            if (card.cost <= 3) group.costs["1-3"]++;
            else if (card.cost <= 5) group.costs["4-5"]++;
            else group.costs["6+"]++;

            if (card.cost <= 2) group.hasLowCost = true;
            if (card.cost >= 5) group.hasHighCost = true;

            group.types[card.type] = (group.types[card.type] || 0) + 1;

            const cardColor = card.color.split('-')[0];
            group.colors[cardColor] = (group.colors[cardColor] || 0) + 1;
            if (card.colors) {
                group.colors[card.colors[1]] = (group.colors[card.colors[1]] || 0) + 1;
            }
        }

        group.avgCost = group.count > 0 ? (totalCost / group.count) : 0;
        return group;
    }

    function calculateHandQuality(handStats) {
        let score = 0;
        const inkable = handStats.inkable;
        if (inkable === 3 || inkable === 4) score += 4;
        else if (inkable === 2 || inkable === 5) score += 3;
        else if (inkable === 1 || inkable === 6) score += 1;

        const earlyPlays = handStats.costs["1-3"];
        if (earlyPlays >= 3) score += 6;
        else if (earlyPlays === 2) score += 4;
        else if (earlyPlays === 1) score += 2;

        let rating = "Bad";
        if (score >= 9) rating = "Excellent";
        else if (score >= 7) rating = "Good";
        else if (score >= 5) rating = "Average";
        else if (score >= 3) rating = "Poor";

        return { score, rating };
    }

    function analyzeHand(hand) {
        const stats = analyzeCardGroup(hand);
        const quality = calculateHandQuality(stats);
        return {
            ...stats,
            handQualityScore: quality.score,
            handQualityRating: quality.rating
        };
    }

    // ============================================================
    // LOGIC: RENDERING (draw sim)
    // ============================================================
    function renderShuffleSimulator() {
        if (!currentShuffleAnalysis.id) return;

        DOMElements.handQualityContainer.classList.remove('hidden');
        DOMElements.handAnalysisContainer.classList.remove('hidden');
        DOMElements.shuffleQualityContainer.classList.remove('hidden');

        const openingScore = currentShuffleAnalysis.openingAnalysis.handQualityScore;
        const finalScore = currentShuffleAnalysis.finalAnalysis.handQualityScore;

        DOMElements.openingQualityScore.textContent = openingScore.toFixed(1);
        DOMElements.openingQualityBar.style.width = `${(openingScore / 10) * 100}%`;
        DOMElements.openingQualityRating.textContent = currentShuffleAnalysis.openingAnalysis.handQualityRating;
        DOMElements.openingQualityRating.className = `text-xs px-2 py-0.5 rounded border ${RATING_CLASSES[currentShuffleAnalysis.openingAnalysis.handQualityRating] || 'border-gray-500 text-gray-500'}`;

        DOMElements.finalQualityScore.textContent = finalScore.toFixed(1);
        DOMElements.finalQualityBar.style.width = `${(finalScore / 10) * 100}%`;
        DOMElements.finalQualityRating.textContent = currentShuffleAnalysis.finalAnalysis.handQualityRating;
        DOMElements.finalQualityRating.className = `text-sm px-2.5 py-0.5 rounded border font-semibold ${RATING_CLASSES[currentShuffleAnalysis.finalAnalysis.handQualityRating] || 'border-gray-500 text-gray-500'}`;

        renderRecentShuffles();
        renderHandAnalysis();
        renderDeckTimeline(currentShuffleAnalysis.deck.slice(7));

        const qualityStats = analyzeDeckRandomness(currentShuffleAnalysis.deck);
        renderShuffleQuality(qualityStats);
    }

    function renderDeckTimeline(deck) {
        DOMElements.deckTimelineHeader.textContent = `Deck Timeline (${deck.length} cards)`;
        const parts = [];
        deck.forEach((card, index) => {
            const turn = index + 1;
            let borderColor = 'border-blue-500';
            if (turn >= 8 && turn <= 14) borderColor = 'border-yellow-500';
            else if (turn >= 15) borderColor = 'border-purple-500';

            parts.push(`
            <div class="flex-shrink-0 space-y-2 ${turn === 8 || turn === 15 ? `border-l-4 pl-3 ${borderColor}` : ''}">
                <div class="text-center"><p class="text-xs font-semibold text-gray-500">Turn ${turn}</p></div>
                <div class="relative card-tooltip-trigger">
                    <div class="w-24 space-y-1">
                        <div class="aspect-[2/3] relative rounded border border-gray-700 overflow-hidden cursor-help transition-all hover:border-blue-500">
                            <img alt="${escAttr(card.fullName)}" class="w-full h-full object-cover" loading="lazy" decoding="async" src="${card.images.thumbnail}">
                        </div>
                        <p class="text-[0.65rem] text-center font-medium line-clamp-2 text-white">${escapeHtml(card.name)}</p>
                        <p class="text-[0.55rem] text-center text-gray-500">#${index + 8}</p>
                    </div>
                    <div class="card-tooltip w-64">
                        <img alt="${escAttr(card.fullName)}" class="w-full h-full rounded-lg" src="${card.images.full}">
                    </div>
                </div>
            </div>`);
        });
        DOMElements.deckTimelineCards.innerHTML = parts.join('');
    }

    function analyzeDeckRandomness(deck) {
        const quality = {};
        quality.consecutive = { 2: 0, 3: 0, 4: 0 };
        let consecutiveCount = 1;
        for (let i = 1; i < deck.length; i++) {
            if (deck[i].fullName === deck[i - 1].fullName) {
                consecutiveCount++;
            } else {
                if (consecutiveCount === 2) quality.consecutive[2]++;
                else if (consecutiveCount === 3) quality.consecutive[3]++;
                else if (consecutiveCount >= 4) quality.consecutive[4]++;
                consecutiveCount = 1;
            }
        }
        if (consecutiveCount === 2) quality.consecutive[2]++;
        else if (consecutiveCount === 3) quality.consecutive[3]++;
        else if (consecutiveCount >= 4) quality.consecutive[4]++;

        quality.clusters = {
            color: findClusters(deck, c => c.color),
            cost: findClusters(deck, c => c.cost),
            type: findClusters(deck, c => c.type),
            inkless: findClusters(deck, c => !c.inkwell),
        };

        quality.issues = [];
        if (quality.consecutive[3] > 0) quality.issues.push(`• ${quality.consecutive[3]} instance(s) of 3 same cards in a row.`);
        if (quality.consecutive[4] > 0) quality.issues.push(`• ${quality.consecutive[4]} instance(s) of 4+ same cards in a row.`);
        if (quality.clusters.color.max > 5) quality.issues.push(`• ${quality.clusters.color.max} cards of same color in a row.`);
        if (quality.clusters.inkless.max > 3) quality.issues.push(`• ${quality.clusters.inkless.max} inkless cards in a row.`);

        if (quality.issues.length === 0) {
            quality.rating = "Excellent";
            quality.issues.push("✓ No critical issues detected. Cards are well-distributed.");
        } else if (quality.issues.length <= 2) {
            quality.rating = "Good";
        } else {
            quality.rating = "Poor";
        }

        return quality;
    }

    function findClusters(deck, getProperty) {
        let maxCluster = 0;
        let currentCluster = 1;
        let clusterCount = 0;

        if (deck.length === 0) return { max: 0, count: 0 };

        let lastProp = getProperty(deck[0]);

        for (let i = 1; i < deck.length; i++) {
            const currentProp = getProperty(deck[i]);
            if (currentProp === lastProp) {
                currentCluster++;
            } else {
                if (currentCluster > 1) clusterCount++;
                maxCluster = Math.max(maxCluster, currentCluster);
                currentCluster = 1;
                lastProp = currentProp;
            }
        }
        if (currentCluster > 1) clusterCount++;
        maxCluster = Math.max(maxCluster, currentCluster);

        return { max: maxCluster, count: clusterCount };
    }

    function renderShuffleQuality(quality) {
        DOMElements.shuffleQualityRating.textContent = quality.rating;
        DOMElements.shuffleQualityRating.className = `inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold ${RATING_CLASSES[quality.rating] || 'bg-gray-500 text-white'}`;

        DOMElements.shuffleQualityIssues.innerHTML = quality.issues.map(issue =>
            `<p class="text-sm ${issue.startsWith('✓') ? 'text-green-400' : 'text-yellow-400'}">${issue}</p>`
        ).join('');

        DOMElements.consecutiveCardsStat.innerHTML = `
            <span class="text-gray-400">Pairs:</span> <span class="text-white">${quality.consecutive[2]}</span>
            <span class="text-gray-400 ml-2">Triples:</span> <span class="text-yellow-400">${quality.consecutive[3]}</span>
            <span class="text-gray-400 ml-2">Quads:</span> <span class="text-red-400">${quality.consecutive[4]}</span>
        `;

        DOMElements.clusteringStat.innerHTML = `
            <div class="grid grid-cols-2 gap-2 text-xs">
                <div><span class="text-gray-400">Max Color Run:</span> <span class="text-white">${quality.clusters.color.max}</span></div>
                <div><span class="text-gray-400">Max Cost Run:</span> <span class="text-white">${quality.clusters.cost.max}</span></div>
                <div><span class="text-gray-400">Max Type Run:</span> <span class="text-white">${quality.clusters.type.max}</span></div>
                <div><span class="text-gray-400">Max Inkless Run:</span> <span class="text-white">${quality.clusters.inkless.max}</span></div>
            </div>
        `;
    }

    function renderRecentShuffles() {
        DOMElements.recentShufflesList.innerHTML = '';
        recentShuffles.forEach(shuffle => {
            const div = document.createElement('div');
            div.className = 'flex items-center justify-between bg-gray-700 p-2 rounded text-xs';
            div.innerHTML = `
                <span class="text-gray-300">#${shuffle.id.toString().slice(-4)}</span>
                <span class="${RATING_CLASSES[shuffle.finalAnalysis.handQualityRating] || 'text-gray-400'} font-bold">${shuffle.finalAnalysis.handQualityScore.toFixed(1)}</span>
            `;
            DOMElements.recentShufflesList.appendChild(div);
        });
    }

    function renderHandAnalysis() {
        const opening = currentShuffleAnalysis.openingAnalysis;
        const final = currentShuffleAnalysis.finalAnalysis;

        DOMElements.openingHandRating.textContent = opening.handQualityRating;
        DOMElements.openingHandRating.className = `inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-semibold ${RATING_CLASSES[opening.handQualityRating] || 'border-gray-500 text-gray-500'}`;

        DOMElements.handInkableStat.textContent = `${opening.inkable} / 7`;

        const createBadge = (text, colorClass) => `<span class="inline-flex items-center rounded-md bg-gray-700 px-2 py-1 text-xs font-medium ${colorClass} ring-1 ring-inset ring-gray-600/20">${text}</span>`;

        DOMElements.handCurveStat.innerHTML = Object.entries(opening.costs).map(([cost, count]) => createBadge(`${cost}: ${count}`, 'text-gray-300')).join('');
        DOMElements.handTypesStat.innerHTML = Object.entries(opening.types).map(([type, count]) => createBadge(`${type}: ${count}`, 'text-blue-300')).join('');
        DOMElements.handColorsStat.innerHTML = Object.entries(opening.colors).map(([color, count]) => createBadge(`${color}: ${count}`, 'text-purple-300')).join('');

        DOMElements.finalHandScoreDisplay.textContent = `Score: ${final.handQualityScore.toFixed(1)}`;

        renderCardImages(DOMElements.openingHandContainer, currentShuffleAnalysis.initialHand);
        renderCardImages(DOMElements.finalHandContainer, currentShuffleAnalysis.finalHand);

        DOMElements.openingHandScoreDisplay.textContent = `Score: ${opening.handQualityScore.toFixed(1)}`;

        const diff = (final.handQualityScore - opening.handQualityScore).toFixed(1);
        const diffColor = diff > 0 ? 'text-green-400' : (diff < 0 ? 'text-red-400' : 'text-gray-400');
        const sign = diff > 0 ? '+' : '';
        DOMElements.handComparison.innerHTML = `Mulligan Impact: <span class="${diffColor} font-bold">${sign}${diff}</span> points. Replaced ${currentShuffleAnalysis.mulliganIndices.length} cards.`;

        renderEarlyGame(currentShuffleAnalysis.deck);
    }

    function renderCardImages(container, cards) {
        container.innerHTML = '';
        cards.forEach(card => {
            const img = document.createElement('img');
            img.src = card.images?.thumbnail || card.image || 'https://placehold.co/200x280?text=No+Image';
            img.alt = card.fullName;
            img.loading = 'lazy';
            img.decoding = 'async';
            img.className = 'w-full h-auto rounded shadow-sm hover:scale-110 transition-transform duration-200 cursor-pointer';
            img.title = `${card.fullName} (${card.cost} ${card.color})`;
            container.appendChild(img);
        });
    }

    function renderEarlyGame(deck) {
        const earlyCards = deck.slice(0, 15);
        const analysis = analyzeCardGroup(earlyCards);

        DOMElements.earlyInkableStat.textContent = `${analysis.inkable} / 15`;

        const createBadge = (text, colorClass) => `<span class="inline-flex items-center rounded-md bg-gray-700 px-2 py-1 text-xs font-medium ${colorClass} ring-1 ring-inset ring-gray-600/20">${text}</span>`;
        DOMElements.earlyCurveStat.innerHTML = Object.entries(analysis.costs).map(([cost, count]) => createBadge(`${cost}: ${count}`, 'text-gray-300')).join('');
        DOMElements.earlyTypesStat.innerHTML = Object.entries(analysis.types).map(([type, count]) => createBadge(`${type}: ${count}`, 'text-blue-300')).join('');
        DOMElements.earlyColorsStat.innerHTML = Object.entries(analysis.colors).map(([color, count]) => createBadge(`${color}: ${count}`, 'text-purple-300')).join('');

        DOMElements.earlyTagsStat.innerHTML = '';
    }

    // ============================================================
    // LOGIC: BATCH SIMULATION
    // ============================================================
    function runSimulation() {
        const iterations = parseInt(DOMElements.simIterations.value) || 1000;
        const deck = prepareSimulationDeck();

        if (deck.length === 0) { toast('Build a deck first.', 'info'); return; }

        DOMElements.runSimButton.disabled = true;
        DOMElements.simStatus.textContent = `Running ${iterations} simulations...`;
        DOMElements.simResults.classList.add('hidden');

        setTimeout(() => {
            const results = {
                totalOpeningQuality: 0,
                totalFinalQuality: 0,
                mulliganCount: 0,
                totalReplaced: 0,
                brickCount: 0,
                curveCount: 0,
                handQualities: Array(11).fill(0),
                issues: {},
                openingCards: {}
            };

            for (let i = 0; i < iterations; i++) {
                const shuffled = fisherYatesShuffle(deck);
                const initialHand = shuffled.slice(0, 7);

                const openingAnalysis = analyzeHand(initialHand);
                results.totalOpeningQuality += openingAnalysis.handQualityScore;

                initialHand.forEach(card => {
                    results.openingCards[card.fullName] = (results.openingCards[card.fullName] || 0) + 1;
                });

                const mulliganIndices = determineMulligan(initialHand);
                if (mulliganIndices.length > 0) results.mulliganCount++;
                results.totalReplaced += mulliganIndices.length;

                const deckAfterDraw = shuffled.slice(7);
                const keptHand = initialHand.filter((_, idx) => !mulliganIndices.includes(idx));
                const replacements = deckAfterDraw.slice(0, mulliganIndices.length);
                const finalHand = [...keptHand, ...replacements];

                const finalAnalysis = analyzeHand(finalHand);
                results.totalFinalQuality += finalAnalysis.handQualityScore;

                const scoreBucket = Math.round(finalAnalysis.handQualityScore);
                if (scoreBucket >= 0 && scoreBucket <= 10) results.handQualities[scoreBucket]++;

                if (finalAnalysis.inkable < 2) results.issues["Brick (<2 Ink)"] = (results.issues["Brick (<2 Ink)"] || 0) + 1;
                if (finalAnalysis.costs["1-3"] === 0) results.issues["No Turn 1"] = (results.issues["No Turn 1"] || 0) + 1;
                if (finalAnalysis.costs["6+"] > 2) results.issues["High Cost (>2 6+)"] = (results.issues["High Cost (>2 6+)"] || 0) + 1;

                if (finalAnalysis.inkable < 2) results.brickCount++;

                const costs = finalHand.map(c => c.cost);
                if (costs.includes(1) && costs.includes(2) && costs.includes(3)) results.curveCount++;
            }

            renderSimulationResults(results, iterations);

            DOMElements.runSimButton.disabled = false;
            DOMElements.simStatus.textContent = "Simulation complete.";
        }, 100);
    }

    function renderSimulationResults(results, iterations) {
        DOMElements.simResults.classList.remove('hidden');

        DOMElements.simAvgQuality.textContent = (results.totalFinalQuality / iterations).toFixed(2);
        DOMElements.simAvgOpeningQuality.textContent = (results.totalOpeningQuality / iterations).toFixed(2);

        DOMElements.simMulliganRate.textContent = `${((results.mulliganCount / iterations) * 100).toFixed(1)}%`;
        DOMElements.simAvgReplaced.textContent = (results.totalReplaced / iterations).toFixed(1);
        DOMElements.simBrickRate.textContent = `${((results.brickCount / iterations) * 100).toFixed(1)}%`;
        DOMElements.simCurveRate.textContent = `${((results.curveCount / iterations) * 100).toFixed(1)}%`;

        const sortedCards = Object.entries(results.openingCards)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        DOMElements.simFreqCards.innerHTML = sortedCards.map(([name, count]) => `
            <div class="flex justify-between text-sm">
                <span class="text-gray-300">${escapeHtml(name)}</span>
                <span class="font-mono text-gray-500">${((count / iterations) * 100).toFixed(1)}%</span>
            </div>
        `).join('');

        renderSimulationCharts(results, iterations);
    }

    function renderSimulationCharts(results, iterations) {
        const accent = inkA();
        const qualityCtx = DOMElements.simQualityChart.getContext('2d');
        if (window.simQualityChartInstance) window.simQualityChartInstance.destroy();

        window.simQualityChartInstance = new Chart(qualityCtx, {
            type: 'bar',
            data: {
                labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
                datasets: [{
                    label: 'Hand Quality Score',
                    data: results.handQualities,
                    backgroundColor: accent + '99',
                    borderColor: accent,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        const issuesCtx = DOMElements.simIssuesChart.getContext('2d');
        if (window.simIssuesChartInstance) window.simIssuesChartInstance.destroy();

        const issueLabels = Object.keys(results.issues);
        const issueData = Object.values(results.issues).map(v => (v / iterations) * 100);

        window.simIssuesChartInstance = new Chart(issuesCtx, {
            type: 'bar',
            indexAxis: 'y',
            data: {
                labels: issueLabels,
                datasets: [{
                    label: 'Frequency (%)',
                    data: issueData,
                    backgroundColor: 'rgba(239, 68, 68, 0.6)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.1)' } },
                    y: { grid: { display: false } }
                }
            }
        });
    }

    function getSubtypeColor(subtype) {
        if (SUBTYPE_COLORS[subtype]) return SUBTYPE_COLORS[subtype];
        let hash = 0;
        for (let i = 0; i < subtype.length; i++) {
            hash = subtype.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash) % 360;
        return `hsl(${hue}, 70%, 50%)`;
    }

    function getHighlightColor(criteria) {
        switch (criteria.type) {
            case 'subtype': return getSubtypeColor(criteria.value);
            case 'color': return INK_COLORS[criteria.value]?.hex || '#fff';
            case 'cost': return inkA();
            case 'type': return TYPE_COLORS[criteria.value] || '#fff';
            case 'inkable': return criteria.value === 'Inkable' ? '#10b981' : '#ef4444';
            default: return inkA();
        }
    }

    // ============================================================
    // PROBABILITY
    // ============================================================
    function probMiss(N, K, n) {
        if (K > N || n > N || K < 0 || n < 0 || N <= 0) return 1.0;
        if (N - K < n) return 0.0;
        let prob = 1.0;
        for (let i = 0; i < n; i++) {
            prob *= (N - K - i) / (N - i);
        }
        return prob;
    }

    function updateCombinedProbability() {
        mulliganInstructions.classList.toggle('hidden', selectedForMulligan.length > 0);
        mulliganResultContainer.classList.toggle('hidden', selectedForMulligan.length === 0);
        if (selectedForMulligan.length === 0) return;

        const N = currentDeck.reduce((sum, item) => sum + item.count, 0);
        const selection = selectedForMulligan;
        const numSelected = selection.length;

        const drawBonus = mulliganScenario === 'OnTheDraw' ? 1 : 0;
        const n = 7 + (7 - numSelected) + drawBonus;

        let probUnionOfMissing = 0;

        for (let i = 1; i < (1 << numSelected); i++) {
            let K_sum = 0, subsetSize = 0;
            for (let j = 0; j < numSelected; j++) {
                if ((i >> j) & 1) {
                    K_sum += selection[j].count;
                    subsetSize++;
                }
            }
            const termProb = probMiss(N, K_sum, n);
            if (subsetSize % 2 === 1) probUnionOfMissing += termProb;
            else probUnionOfMissing -= termProb;
        }

        const finalProb = 1 - probUnionOfMissing;
        mulliganResultEl.textContent = `${(finalProb * 100).toFixed(2)}%`;
        mulliganDetailsEl.textContent = `(Hand of 7 + Mulligan of ${7 - numSelected} + ${drawBonus} draw = ${n} cards seen)`;
    }

    function handleCardSelection(cardName, cardCount) {
        const existingIndex = selectedForMulligan.findIndex(item => item.name === cardName);
        if (existingIndex > -1) {
            selectedForMulligan.splice(existingIndex, 1);
            const el = document.querySelector(`.card-stack[data-card-name="${CSS.escape(cardName)}"]`);
            if (el) el.classList.remove('selected');
        } else {
            if (selectedForMulligan.length < 7) {
                selectedForMulligan.push({ name: cardName, count: cardCount });
                const el = document.querySelector(`.card-stack[data-card-name="${CSS.escape(cardName)}"]`);
                if (el) el.classList.add('selected');
            } else {
                return;
            }
        }
        updateCombinedProbability();
    }

    // ============================================================
    // CHARTS & VISUALIZATION
    // ============================================================
    function initializeCharts() {
        Chart.defaults.color = '#9ca3af';
        Chart.defaults.borderColor = '#374151';
        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 20, bottom: 20, left: 10, right: 10 } },
            plugins: { legend: { display: false } }
        };
        const pieOptions = {
            responsive: true,
            maintainAspectRatio: false,
            layout: { padding: { top: 20, bottom: 20, left: 10, right: 10 } },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, font: { size: 12 }, padding: 10 }
                }
            }
        };
        charts.inkCurve = new Chart(document.getElementById('inkCurveChart'), {
            type: 'bar',
            data: { labels: ['0', '1', '2', '3', '4', '5', '6', '7+'], datasets: [{ data: [], backgroundColor: inkA() }] },
            options: {
                ...commonOptions,
                scales: {
                    x: { ticks: { font: { size: 10 } } },
                    y: { beginAtZero: true, grid: { color: '#374151' }, ticks: { font: { size: 10 } } }
                }
            }
        });
        charts.colorSplit = new Chart(document.getElementById('colorSplitChart'), { type: 'pie', data: { labels: [], datasets: [{ data: [] }] }, options: pieOptions });
        charts.inkable = new Chart(document.getElementById('inkableChart'), { type: 'pie', data: { labels: ['Inkable', 'Uninkable'], datasets: [{ data: [], backgroundColor: ['#10b981', '#ef4444'] }] }, options: pieOptions });
        charts.cardType = new Chart(document.getElementById('cardTypeChart'), { type: 'pie', data: { labels: [], datasets: [{ data: [] }] }, options: pieOptions });
        charts.subtypes = new Chart(document.getElementById('subtypesChart'), { type: 'pie', data: { labels: [], datasets: [{ data: [] }] }, options: pieOptions });

        document.getElementById('inkCurveChart').addEventListener('click', (e) => handleChartClick(e, 'inkCurve'));
        document.getElementById('colorSplitChart').addEventListener('click', (e) => handleChartClick(e, 'colorSplit'));
        document.getElementById('inkableChart').addEventListener('click', (e) => handleChartClick(e, 'inkable'));
        document.getElementById('cardTypeChart').addEventListener('click', (e) => handleChartClick(e, 'cardType'));
        document.getElementById('subtypesChart').addEventListener('click', (e) => handleChartClick(e, 'subtypes'));

        document.addEventListener('click', (e) => {
            const chartsContainer = document.getElementById('chartsContainer');
            if (chartsContainer && !chartsContainer.contains(e.target)) {
                clearCardHighlights();
            }
        });
    }

    function parseAndRenderDeck() {
        const text = decklistTextarea.value;
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const deck = [];
        const lineRegex = /^(?:(\d+)x?\s)?(.*)/;
        for (const line of lines) {
            const match = line.trim().match(lineRegex);
            if (match) {
                const count = parseInt(match[1] || '1', 10);
                const cardName = match[2].trim();
                if (cardName) {
                    const card = resolveCard(cardName);
                    if (card) deck.push({ count, card });
                }
            }
        }
        currentDeck = deck;
        autoDetectInks(deck);
        renderVisualDeck(deck);
        updateCharts(deck);
        updateTotalCards(deck);
        selectedForMulligan = [];
        updateCombinedProbability();
    }

    function autoDetectInks(deck) {
        const detected = new Set();
        for (const { card } of deck) {
            for (const color of (card.colors || [card.color])) {
                if (color) detected.add(color);
            }
        }
        document.querySelectorAll('#inkTypes input[type="checkbox"]').forEach(cb => {
            cb.checked = detected.has(cb.value);
        });
    }

    function renderVisualDeck(deck) {
        if (deck.length === 0) {
            visualDeckContainer.innerHTML = `<div class="empty-state"><p class="empty-title">Pick a deck or start a new one</p><p class="empty-sub">Your cards appear here once a decklist is loaded.</p></div>`;
            return;
        }
        const totalDeckSize = deck.reduce((sum, item) => sum + item.count, 0);
        const drawBonus = mulliganScenario === 'OnTheDraw' ? 1 : 0;
        const cardsSeenForMulligan = 7 + 7 + drawBonus;

        const grouped = deck.reduce((acc, { count, card }) => {
            const type = card.type || 'Unknown';
            if (!acc[type]) acc[type] = [];
            acc[type].push({ count, card });
            return acc;
        }, {});
        const typeOrder = ['Character', 'Action', 'Item', 'Location', 'Song'];

        let idx = 0;
        let html = '';
        for (const type of typeOrder) {
            if (!grouped[type]) continue;
            html += `<div class="deck-type-section"><h2 class="deck-type-title">${type}s</h2><div class="card-grid">`;
            grouped[type]
                .sort((a, b) => a.card.cost - b.card.cost || a.card.name.localeCompare(b.card.name))
                .forEach(({ count, card }) => {
                    const probOfFinding = 1 - probMiss(totalDeckSize, count, cardsSeenForMulligan);
                    const probText = (probOfFinding * 100).toFixed(1) + '%';
                    const { rds, lvi, bcr } = getMetrics(card);
                    const ctl = rds + lvi + bcr;
                    const img = card.images.thumbnail || card.images.full;
                    html += `
                    <div class="card-stack" data-card-name="${escAttr(card.fullName)}" data-count="${count}" style="--i:${idx}">
                        <div class="card-count-badge">${count}</div>
                        <img src="${img}" alt="${escAttr(card.fullName)}" width="132" height="184" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='https://placehold.co/150x210/1f2937/9ca3af?text=${encodeURIComponent(card.name)}';">
                        <div class="card-prob-overlay" title="Prob. in open hand + mulligan">${probText}</div>
                        <div class="card-stats-overlay">
                            <span class="ctl" title="Card Threat Level">CTL: ${ctl.toFixed(2)}</span>
                            <span class="rds" title="Resource Dominance Score">RDS: ${rds.toFixed(2)}</span>
                            <span class="lvi" title="Lore Velocity Index">LVI: ${lvi.toFixed(2)}</span>
                            <span class="bcr" title="Board Control Rating">BCR: ${bcr.toFixed(2)}</span>
                        </div>
                    </div>`;
                    idx++;
                });
            html += `</div></div>`;
        }
        visualDeckContainer.innerHTML = html;

        // Re-apply chart highlight if a filter is active
        if (currentHighlightFilter) {
            highlightCardsByCriteria(currentHighlightFilter, getHighlightColor(currentHighlightFilter));
        }
        // Re-apply mulligan selection visuals
        selectedForMulligan.forEach(sel => {
            const el = document.querySelector(`.card-stack[data-card-name="${CSS.escape(sel.name)}"]`);
            if (el) el.classList.add('selected');
        });
    }

    // P4: update only the probability overlays on scenario toggle (no grid rebuild)
    function updateProbabilityOverlays() {
        const totalDeckSize = currentDeck.reduce((sum, item) => sum + item.count, 0);
        const drawBonus = mulliganScenario === 'OnTheDraw' ? 1 : 0;
        const cardsSeen = 7 + 7 + drawBonus;
        visualDeckContainer.querySelectorAll('.card-stack').forEach(stack => {
            const count = parseInt(stack.dataset.count, 10) || 0;
            const prob = 1 - probMiss(totalDeckSize, count, cardsSeen);
            const ov = stack.querySelector('.card-prob-overlay');
            if (ov) ov.textContent = (prob * 100).toFixed(1) + '%';
        });
    }

    function updateTotalCards(deck) {
        const total = deck.reduce((sum, item) => sum + item.count, 0);
        totalCardsSpan.textContent = total;
    }

    function updateCharts(deck) {
        const inkCurveData = Array(8).fill(0), colorSplitData = {}, inkableData = { inkable: 0, uninkable: 0 }, cardTypeData = {}, subtypesData = {};
        deck.forEach(({ count, card }) => {
            inkCurveData[Math.min(card.cost, 7)] += count;
            (card.colors || [card.color]).forEach(color => { if (color) colorSplitData[color] = (colorSplitData[color] || 0) + count; });
            if (card.inkwell) inkableData.inkable += count; else inkableData.uninkable += count;
            let mainType = card.type === 'Action' && (card.subtypes || []).includes('Song') ? 'Song' : card.type;
            cardTypeData[mainType] = (cardTypeData[mainType] || 0) + count;
            (card.subtypes || []).forEach(subtype => { subtypesData[subtype] = (subtypesData[subtype] || 0) + count; });
        });
        charts.inkCurve.data.datasets[0].data = inkCurveData;
        charts.inkCurve.data.datasets[0].backgroundColor = inkA();
        charts.colorSplit.data.labels = Object.keys(colorSplitData);
        charts.colorSplit.data.datasets[0].data = Object.values(colorSplitData);
        charts.colorSplit.data.datasets[0].backgroundColor = Object.keys(colorSplitData).map(c => INK_COLORS[c]?.hex || '#fff');
        charts.inkable.data.datasets[0].data = [inkableData.inkable, inkableData.uninkable];
        charts.cardType.data.labels = Object.keys(cardTypeData);
        charts.cardType.data.datasets[0].data = Object.values(cardTypeData);
        charts.cardType.data.datasets[0].backgroundColor = Object.keys(cardTypeData).map(t => TYPE_COLORS[t] || '#fff');
        charts.subtypes.data.labels = Object.keys(subtypesData);
        charts.subtypes.data.datasets[0].data = Object.values(subtypesData);
        charts.subtypes.data.datasets[0].backgroundColor = Object.keys(subtypesData).map(s => getSubtypeColor(s));
        Object.values(charts).forEach(chart => chart.update());
    }

    // --- CHART INTERACTIVITY ---
    let currentHighlightFilter = null;

    function clearCardHighlights() {
        document.querySelectorAll('.card-stack.highlighted').forEach(card => {
            card.classList.remove('highlighted');
            card.style.color = '';
        });
        currentHighlightFilter = null;
    }

    function highlightCardsByCriteria(criteria, color) {
        document.querySelectorAll('.card-stack.highlighted').forEach(card => {
            card.classList.remove('highlighted');
            card.style.color = '';
        });

        const matchingCards = currentDeck.filter(({ card }) => {
            switch (criteria.type) {
                case 'subtype': return (card.subtypes || []).includes(criteria.value);
                case 'color': return (card.colors || [card.color]).includes(criteria.value);
                case 'cost': return card.cost === criteria.value || (criteria.value === 7 && card.cost >= 7);
                case 'type': return card.type === criteria.value || (criteria.value === 'Song' && card.type === 'Action' && (card.subtypes || []).includes('Song'));
                case 'inkable': return card.inkwell === (criteria.value === 'Inkable');
                default: return false;
            }
        });

        matchingCards.forEach(({ card }) => {
            const cardElement = document.querySelector(`.card-stack[data-card-name="${CSS.escape(card.fullName)}"]`);
            if (cardElement) {
                cardElement.classList.add('highlighted');
                cardElement.style.color = color;
            }
        });

        currentHighlightFilter = criteria;
    }

    function handleChartClick(event, chartType) {
        const chart = charts[chartType];
        if (!chart) return;

        const elements = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, false);
        if (elements.length === 0) return;

        const element = elements[0];
        const index = element.index;

        let criteria = null;
        let color = null;

        switch (chartType) {
            case 'subtypes': {
                const subtype = chart.data.labels[index];
                color = getSubtypeColor(subtype);
                criteria = { type: 'subtype', value: subtype };
                break;
            }
            case 'colorSplit': {
                const colorName = chart.data.labels[index];
                color = INK_COLORS[colorName]?.hex || '#fff';
                criteria = { type: 'color', value: colorName };
                break;
            }
            case 'inkCurve': {
                const costLabel = chart.data.labels[index];
                const cost = costLabel === '7+' ? 7 : parseInt(costLabel);
                color = inkA();
                criteria = { type: 'cost', value: cost };
                break;
            }
            case 'cardType': {
                const cardType = chart.data.labels[index];
                color = TYPE_COLORS[cardType] || '#fff';
                criteria = { type: 'type', value: cardType };
                break;
            }
            case 'inkable': {
                const inkableLabel = chart.data.labels[index];
                color = inkableLabel === 'Inkable' ? '#10b981' : '#ef4444';
                criteria = { type: 'inkable', value: inkableLabel };
                break;
            }
        }

        if (criteria && color) {
            if (currentHighlightFilter &&
                currentHighlightFilter.type === criteria.type &&
                currentHighlightFilter.value === criteria.value) {
                clearCardHighlights();
            } else {
                highlightCardsByCriteria(criteria, color);
            }
        }
    }

    // ============================================================
    // DECK BUILDING & SEARCH
    // ============================================================
    function renderSearchResults(results) {
        cardSearchResults.innerHTML = '';
        if (results.length === 0) {
            cardSearchResults.classList.add('hidden');
            return;
        }

        results.forEach(result => {
            const card = result.item;
            const resultDiv = document.createElement('div');
            resultDiv.className = 'search-row';

            const thumbnailImg = document.createElement('img');
            thumbnailImg.src = card.images.thumbnail || card.images.full;
            thumbnailImg.alt = card.fullName;
            thumbnailImg.loading = 'lazy';
            thumbnailImg.decoding = 'async';

            const textContainer = document.createElement('div');
            textContainer.className = 'search-row-name';
            const cardColor = card.colors && card.colors.length > 0 ? card.colors[0] : 'Steel';
            textContainer.textContent = card.fullName;
            textContainer.style.color = INK_COLORS[cardColor]?.hex || '#9CA3AF';
            textContainer.title = card.fullName;

            const addControlsDiv = document.createElement('div');
            addControlsDiv.className = 'search-add';

            [1, 2, 3, 4].forEach(count => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.textContent = `+${count}`;
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    addCardToDecklist(card, count);
                });
                addControlsDiv.appendChild(btn);
            });

            resultDiv.addEventListener('click', () => addCardToDecklist(card, 1));

            resultDiv.appendChild(thumbnailImg);
            resultDiv.appendChild(textContainer);
            resultDiv.appendChild(addControlsDiv);
            cardSearchResults.appendChild(resultDiv);
        });

        cardSearchResults.classList.remove('hidden');
    }

    function addCardToDecklist(card, count) {
        const cardFullName = card.fullName;
        const lines = decklistTextarea.value.split('\n').filter(l => l.trim() !== '');
        let cardFound = false;
        const lineRegex = /^(?:(\d+)x?\s)?(.*)/;

        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].trim().match(lineRegex);
            if (match) {
                const nameFromLine = match[2].trim();
                if (nameFromLine.toLowerCase() === cardFullName.toLowerCase()) {
                    lines[i] = `${count} ${cardFullName}`;
                    cardFound = true;
                    break;
                }
            }
        }

        if (!cardFound) {
            for (let i = 0; i < lines.length; i++) {
                const match = lines[i].trim().match(lineRegex);
                if (match) {
                    const nameFromLine = match[2].trim();
                    const resolved = resolveCard(nameFromLine);
                    if (resolved && resolved.fullName === cardFullName) {
                        lines[i] = `${count} ${cardFullName}`;
                        cardFound = true;
                        break;
                    }
                }
            }
        }

        if (!cardFound) {
            lines.push(`${count} ${cardFullName}`);
        }

        decklistTextarea.value = lines.join('\n');
        decklistTextarea.dispatchEvent(new Event('input', { bubbles: true }));

        cardSearchInput.value = '';
        cardSearchResults.classList.add('hidden');
        cardSearchInput.focus();
    }

    // ============================================================
    // DATABASE & DECK LIST
    // ============================================================
    const saveDeck = async (deckData) => {
        const { data, error } = await supabaseClient.from('decks').upsert(deckData).select();
        if (error) { console.error('Error saving deck:', error); return null; }
        return data ? data[0] : null;
    };

    const deleteDeck = async (deckId) => {
        const { error } = await supabaseClient.from('decks').delete().eq('id', deckId);
        if (error) { console.error('Error deleting deck:', error); return false; }
        return true;
    };

    const renderInkTypes = () => {
        inkTypesContainer.innerHTML = '';
        for (const [name, { hex }] of Object.entries(INK_COLORS)) {
            const div = document.createElement('div');
            div.className = 'ink-check';
            div.innerHTML = `<input type="checkbox" id="ink-${name.toLowerCase()}" name="ink" value="${name}" class="checkbox" style="accent-color:${hex};"><label for="ink-${name.toLowerCase()}" style="color:${hex};">${name}</label>`;
            inkTypesContainer.appendChild(div);
        }
    };

    const filterAndSortDecks = (decks, searchTerm = '', sortBy = 'newest', inkFilter = '') => {
        let filteredDecks = [...decks];

        if (searchTerm) {
            const searchResults = deckFuse.search(searchTerm);
            filteredDecks = searchResults.map(result => result.item);
        }

        if (inkFilter) {
            filteredDecks = filteredDecks.filter(deck => (deck.inks || []).includes(inkFilter));
        }

        filteredDecks.sort((a, b) => {
            switch (sortBy) {
                case 'newest': return new Date(b.created_at) - new Date(a.created_at);
                case 'oldest': return new Date(a.created_at) - new Date(b.created_at);
                case 'name-asc': return a.name.localeCompare(b.name);
                case 'name-desc': return b.name.localeCompare(a.name);
                default: return new Date(b.created_at) - new Date(a.created_at);
            }
        });

        return filteredDecks;
    };

    const renderDeckList = (decksToRender) => {
        deckListContainer.innerHTML = !decksToRender.length ? `<p class="deck-list-empty">No decks found.</p>` : '';
        decksToRender.forEach(deck => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'deck-item';
            button.dataset.deckId = deck.id;
            const dots = (deck.inks || []).map(ink => `<span class="ink-dot" style="background-color:${INK_COLORS[ink]?.hex || '#fff'}" title="${escAttr(INK_COLORS[ink]?.name || 'Unknown')}"></span>`).join('');
            const count = deckCardCount(deck.decklist);
            button.innerHTML = `<span class="deck-item-name">${escapeHtml(deck.name)}</span><span class="deck-item-meta"><span class="deck-item-dots">${dots}</span><span class="deck-item-count">${count}</span></span>`;
            button.addEventListener('click', () => {
                populateForm(deck.id);
                document.querySelectorAll('.deck-item').forEach(b => b.classList.remove('is-active'));
                button.classList.add('is-active');
                closeDrawer();
            });
            deckListContainer.appendChild(button);
        });
    };

    const updateDeckList = () => {
        const searchTerm = deckSearchInput.value.trim();
        const sortBy = document.getElementById('deckSort').value;
        const inkFilter = document.getElementById('inkFilter').value;
        renderDeckList(filterAndSortDecks(allDecks, searchTerm, sortBy, inkFilter));
    };

    const loadAndRenderDecks = async () => {
        const { data, error } = await supabaseClient.from('decks').select('*').order('created_at', { ascending: false });
        if (error) {
            console.error('Error fetching decks:', error);
            allDecks = [];
            toast("Couldn't load decks — check connection.", 'error');
        } else {
            allDecks = data;
        }
        deckFuse = new Fuse(allDecks, { keys: ['name', 'comments'], includeScore: true, threshold: 0.4 });

        deckSearchInput.value = '';
        document.getElementById('deckSort').value = 'newest';
        document.getElementById('inkFilter').value = '';

        updateDeckList();
    };

    const populateForm = async (deckId) => {
        let deck = allDecks.find(d => d.id === deckId);
        if (!deck) {
            const { data, error } = await supabaseClient.from('decks').select('*').eq('id', deckId).single();
            if (error) { console.error('Error fetching single deck:', error); toast("Couldn't load deck.", 'error'); return; }
            deck = data;
        }
        if (!deck) return;

        suppressDirty = true;
        editorTitle.textContent = `Editing: ${deck.name}`;
        topbarDeckName.textContent = deck.name || 'Untitled deck';
        deckIdInput.value = deck.id;
        document.getElementById('deckName').value = deck.name;
        decklistTextarea.value = deck.decklist || '';
        document.getElementById('deckUrl').value = deck.url || '';
        document.getElementById('comments').value = deck.comments || '';
        document.querySelectorAll('#inkTypes input[type="checkbox"]').forEach(cb => { cb.checked = (deck.inks || []).includes(cb.value); });
        deleteDeckBtn.classList.remove('hidden');
        applyInkIdentity(deck.inks || []);
        setSaveState('clean');

        showGridSkeleton();
        setTimeout(() => {
            parseAndRenderDeck();
            suppressDirty = false;
        }, 0);
    };

    const resetForm = () => {
        suppressDirty = true;
        editorTitle.textContent = 'Create new deck';
        topbarDeckName.textContent = 'New deck';
        deckForm.reset();
        deckIdInput.value = '';
        deleteDeckBtn.classList.add('hidden');
        document.querySelectorAll('.deck-item').forEach(b => b.classList.remove('is-active'));
        applyInkIdentity([]);
        setSaveState('clean');
        parseAndRenderDeck();
        suppressDirty = false;
    };

    // ============================================================
    // LLM PROMPT
    // ============================================================
    function generateLlmPrompt() {
        if (currentDeck.length === 0) { toast('Build a deck first.', 'info'); return; }

        const totalCards = currentDeck.reduce((sum, item) => sum + item.count, 0);
        const colorDistribution = {};
        const cardTypes = {};
        const costCurve = {};

        currentDeck.forEach(({ count, card }) => {
            (card.colors || [card.color]).forEach(color => {
                if (color) colorDistribution[color] = (colorDistribution[color] || 0) + count;
            });
            const type = card.type || 'Unknown';
            cardTypes[type] = (cardTypes[type] || 0) + count;
            const cost = card.cost || 0;
            costCurve[cost] = (costCurve[cost] || 0) + count;
        });

        const inkColors = Object.keys(colorDistribution).join(', ');
        const colorDistText = Object.entries(colorDistribution).map(([k, v]) => `${k.toLowerCase()}: ${v}`).join(', ');
        const cardTypesText = Object.entries(cardTypes).map(([k, v]) => `${k.toLowerCase()}: ${v}`).join(', ');
        const costCurveText = Object.entries(costCurve).sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}: ${v}`).join(', ');

        let decklistText = '';
        currentDeck.sort((a, b) => a.card.cost - b.card.cost || a.card.fullName.localeCompare(b.card.fullName)).forEach(({ count, card }) => {
            const inkable = card.inkwell ? '(Inkable)' : '';
            const stats = card.strength !== undefined ? `${card.strength}/${card.willpower} - ${card.lore}L` : '';
            const cardText = (card.text || '').replace(/\n/g, '\n    ');
            decklistText += `${count}x ${card.fullName} (${card.cost} ink, ${card.colors ? card.colors.join('/') : card.color}) - ${stats} ${inkable}\n`;
            if (cardText) {
                decklistText += `    Text: "${cardText}"\n\n`;
            } else {
                decklistText += `\n`;
            }
        });

        const prompt = `You are an expert Disney Lorcana TCG coach focusing on optimizing gameplay and teaching strategic decision-making. I need a comprehensive strategy guide for playing my deck effectively.

DECK COMPOSITION:

Total cards: ${totalCards}

Ink colors: ${inkColors}

Color distribution: ${colorDistText}

Card types: ${cardTypesText}

Cost curve: ${costCurveText}

DECKLIST:

${decklistText.trim()}


FOCUS YOUR ANALYSIS ON:

1. DECK IDENTITY & CORE STRATEGY: What is my deck trying to accomplish? What's its primary win condition?

2. KEY SYNERGIES: Identify the 3-5 most important card combinations and explain how to set them up

3. MULLIGAN GUIDE: Which cards should I prioritize in my opening hand?

4. TURN-BY-TURN GAMEPLAY:

   - Early game (turns 1-2): What should be my priorities?

   - Mid game (turns 3-5): How should I develop my board?

   - Late game (turns 6+): How do I close out the game?

5. MATCHUP TACTICS: How should I adapt my strategy against aggressive, control, or midrange opponents?

6. COMMON PITFALLS: What mistakes should I avoid when playing this deck?

7. POWER PLAYS: What are the strongest sequences or plays this deck can make?

FORMAT YOUR RESPONSE as a structured, professional guide with clear headings. Include specific card references when explaining strategies.`;

        llmPromptOutput.value = prompt;
        llmPromptModal.classList.remove('opacity-0', 'pointer-events-none');
    }

    // ============================================================
    // EVENT WIRING
    // ============================================================
    function setupShell() {
        document.querySelectorAll('.tab-button, .bottomnav-item').forEach(btn => {
            btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        });

        drawerToggle.addEventListener('click', openDrawer);
        drawerClose.addEventListener('click', closeDrawer);
        drawerScrim.addEventListener('click', closeDrawer);

        overflowToggle.addEventListener('click', (e) => { e.stopPropagation(); toggleOverflow(); });
        document.addEventListener('click', (e) => {
            if (!overflowMenu.hidden && !overflowMenu.contains(e.target) && e.target !== overflowToggle) {
                toggleOverflow(false);
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                if (app.classList.contains('drawer-open')) closeDrawer();
                toggleOverflow(false);
            }
        });

        newDeckBtn.addEventListener('click', () => { resetForm(); toggleOverflow(false); switchTab('editor'); });
        sidebarNewDeckBtn.addEventListener('click', () => { resetForm(); closeDrawer(); switchTab('editor'); });
    }

    function setupSimListeners() {
        if (DOMElements.shuffleButton) DOMElements.shuffleButton.addEventListener('click', handleShuffleDeck);
        if (DOMElements.resetButton) DOMElements.resetButton.addEventListener('click', handleReset);
        if (DOMElements.runSimButton) DOMElements.runSimButton.addEventListener('click', runSimulation);

        if (DOMElements.toggleStatsButton) {
            DOMElements.toggleStatsButton.addEventListener('click', () => {
                const isHidden = DOMElements.detailedStatsContainer.classList.contains('hidden');
                if (isHidden) {
                    DOMElements.detailedStatsContainer.classList.remove('hidden');
                    DOMElements.toggleStatsIcon.style.transform = 'rotate(180deg)';
                    DOMElements.toggleStatsText.textContent = 'Hide Detailed Stats';
                } else {
                    DOMElements.detailedStatsContainer.classList.add('hidden');
                    DOMElements.toggleStatsIcon.style.transform = 'rotate(0deg)';
                    DOMElements.toggleStatsText.textContent = 'Show Detailed Stats';
                }
            });
        }
    }

    // Deck form submit
    deckForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const deckData = {
            id: deckIdInput.value || undefined,
            name: document.getElementById('deckName').value,
            decklist: decklistTextarea.value,
            inks: Array.from(document.querySelectorAll('#inkTypes input:checked')).map(cb => cb.value),
            url: document.getElementById('deckUrl').value,
            comments: document.getElementById('comments').value
        };
        setSaveState('saving');
        const savedDeck = await saveDeck(deckData);
        if (savedDeck) {
            toast('Deck saved.', 'ok');
            await loadAndRenderDecks();
            const savedDeckButton = document.querySelector(`.deck-item[data-deck-id="${savedDeck.id}"]`);
            if (savedDeckButton) { savedDeckButton.click(); savedDeckButton.focus(); }
            else { setSaveState('clean'); }
        } else {
            toast("Couldn't save deck — check connection and retry.", 'error');
            setSaveState('dirty');
        }
    });

    // Dirty tracking + live topbar name
    document.getElementById('deckName').addEventListener('input', (e) => {
        topbarDeckName.textContent = e.target.value.trim() || 'New deck';
        markDirty();
    });
    decklistTextarea.addEventListener('input', () => {
        markDirty();
        clearTimeout(window.deckRenderTimeout);
        window.deckRenderTimeout = setTimeout(parseAndRenderDeck, 250);
    });
    document.getElementById('deckUrl').addEventListener('input', markDirty);
    document.getElementById('comments').addEventListener('input', markDirty);
    inkTypesContainer.addEventListener('change', (e) => {
        markDirty();
        applyInkIdentity(Array.from(document.querySelectorAll('#inkTypes input:checked')).map(cb => cb.value));
    });

    // Deck library filters
    deckSearchInput.addEventListener('input', updateDeckList);
    document.getElementById('deckSort').addEventListener('change', updateDeckList);
    document.getElementById('inkFilter').addEventListener('change', updateDeckList);
    document.getElementById('clearFiltersBtn').addEventListener('click', () => {
        deckSearchInput.value = '';
        document.getElementById('deckSort').value = 'newest';
        document.getElementById('inkFilter').value = '';
        updateDeckList();
    });

    // Card search
    cardSearchInput.addEventListener('input', () => {
        const searchTerm = cardSearchInput.value.trim();
        if (searchTerm.length < 2) { cardSearchResults.classList.add('hidden'); return; }
        if (!cardFuse) return;
        const results = cardFuse.search(searchTerm);
        renderSearchResults(results.slice(0, 8));
    });
    cardSearchInput.addEventListener('focus', () => {
        const searchTerm = cardSearchInput.value.trim();
        if (searchTerm.length >= 2 && cardFuse) {
            renderSearchResults(cardFuse.search(searchTerm).slice(0, 8));
        }
    });
    document.addEventListener('click', (e) => {
        const searchContainer = cardSearchInput.parentElement;
        if (searchContainer && !searchContainer.contains(e.target)) {
            cardSearchResults.classList.add('hidden');
        }
    });

    // Delegated card-stack click (P4)
    visualDeckContainer.addEventListener('click', (e) => {
        const stack = e.target.closest('.card-stack');
        if (!stack) return;
        const name = stack.dataset.cardName;
        const item = currentDeck.find(d => d.card.fullName === name);
        if (!item) return;
        if (hoverPopupToggle.checked) {
            inspector.showCard(item.card);
        } else {
            handleCardSelection(item.card.fullName, item.count);
        }
    });

    // Scenario toggle — overlays only, no grid rebuild
    onThePlayBtn.addEventListener('click', () => {
        mulliganScenario = 'OnThePlay';
        onThePlayBtn.classList.add('active');
        onTheDrawBtn.classList.remove('active');
        updateProbabilityOverlays();
        updateCombinedProbability();
    });
    onTheDrawBtn.addEventListener('click', () => {
        mulliganScenario = 'OnTheDraw';
        onTheDrawBtn.classList.add('active');
        onThePlayBtn.classList.remove('active');
        updateProbabilityOverlays();
        updateCombinedProbability();
    });

    // Delete flow
    const showConfirmationModal = () => confirmationModal.classList.remove('opacity-0', 'pointer-events-none');
    const hideConfirmationModal = () => confirmationModal.classList.add('opacity-0', 'pointer-events-none');
    deleteDeckBtn.addEventListener('click', () => { toggleOverflow(false); if (deckIdInput.value) showConfirmationModal(); });
    cancelDeleteBtn.addEventListener('click', hideConfirmationModal);
    confirmDeleteBtn.addEventListener('click', async () => {
        const deckId = deckIdInput.value;
        if (deckId) {
            const ok = await deleteDeck(deckId);
            if (ok) { toast('Deck deleted.', 'ok'); } else { toast("Couldn't delete deck.", 'error'); }
            await loadAndRenderDecks();
            resetForm();
            hideConfirmationModal();
        }
    });

    // LLM modal
    generateLlmPromptBtn.addEventListener('click', generateLlmPrompt);
    closeLlmModalBtn.addEventListener('click', () => llmPromptModal.classList.add('opacity-0', 'pointer-events-none'));
    llmPromptModal.addEventListener('click', (e) => {
        if (e.target === llmPromptModal) llmPromptModal.classList.add('opacity-0', 'pointer-events-none');
    });
    copyLlmPromptBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(llmPromptOutput.value).then(() => {
            toast('Prompt copied.', 'ok');
        }).catch(() => toast('Failed to copy prompt.', 'error'));
    });

    // Copy decklist (with non-secure-context fallback) — first-class workflow
    if (copyDecklistBtn && decklistTextarea) {
        copyDecklistBtn.addEventListener('click', () => {
            const textToCopy = decklistTextarea.value;
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(textToCopy)
                    .then(() => toast('Decklist copied.', 'ok'))
                    .catch(() => toast('Failed to copy decklist.', 'error'));
            } else {
                try {
                    decklistTextarea.select();
                    document.execCommand('copy');
                    decklistTextarea.blur();
                    toast('Decklist copied.', 'ok');
                } catch (err) {
                    toast('Failed to copy decklist. Please copy manually.', 'error');
                }
            }
        });
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================
    const initializeApp = async () => {
        try {
            initializeCharts();
            renderInkTypes();
            applyInkIdentity([]);

            const [cardsJson, decksResult] = await Promise.all([
                cachedJson(CARD_DATA_URL),
                supabaseClient.from('decks').select('*').order('created_at', { ascending: false })
            ]);

            allCards = cardsJson.cards;
            for (const c of allCards) {
                cardByName.set(normalize(c.fullName), c);
                if (c.simpleName) cardByName.set(normalize(c.simpleName), c);
            }

            // Abilities config (cached) → setAbilitiesConfig (zero shared-module change)
            try {
                const abilities = await cachedJson(ABILITIES_URL);
                UnifiedWinProbabiliyCalculation.setAbilitiesConfig(abilities);
            } catch (e) {
                console.warn('Cached abilities load failed, falling back:', e);
                await UnifiedWinProbabiliyCalculation.loadAbilitiesConfig();
            }

            CardStatAnalysisModule.initialize(allCards, INK_COLORS, UnifiedWinProbabiliyCalculation);
            inspector = new CardThreatLevelInspector();

            if (decksResult.error) {
                console.error('Error fetching decks:', decksResult.error);
                allDecks = [];
                toast("Couldn't load decks — check connection.", 'error');
            } else {
                allDecks = decksResult.data;
            }
            deckFuse = new Fuse(allDecks, { keys: ['name', 'comments'], includeScore: true, threshold: 0.4 });
            deckSearchInput.value = '';
            document.getElementById('deckSort').value = 'newest';
            document.getElementById('inkFilter').value = '';
            updateDeckList();

            setupShell();
            setupSimListeners();
            resetForm();

            // Defer heavy Fuse index build (card search) so first render isn't blocked
            const buildFuse = () => {
                cardFuse = new Fuse(allCards, { keys: ['fullName', 'simpleName', 'name', 'title'], includeScore: true, threshold: 0.3 });
            };
            const idle = (fn) => ('requestIdleCallback' in window) ? requestIdleCallback(fn) : setTimeout(fn, 0);
            idle(buildFuse);

            // Warm the CTL metrics cache in idle chunks. The Stat Comparisons tab and
            // the inspector compute metrics for every character card; pre-populating the
            // memo (in UnifiedWinProbabiliyCalculation) keeps those views instant.
            let warmIdx = 0;
            const warmMetrics = () => {
                const end = Math.min(warmIdx + 150, allCards.length);
                for (; warmIdx < end; warmIdx++) UnifiedWinProbabiliyCalculation.calculateCardMetrics(allCards[warmIdx]);
                if (warmIdx < allCards.length) idle(warmMetrics);
            };
            idle(warmMetrics);

        } catch (error) {
            console.error("Failed to initialize app:", error);
            toast('Failed to load card database. Refresh to retry.', 'error');
        }
    };

    initializeApp();
});
