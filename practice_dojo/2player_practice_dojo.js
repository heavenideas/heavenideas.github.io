// Supabase Client Setup
const SUPABASE_URL = 'https://cjlhrfhximjldqrfblkj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbGhyZmh4aW1qbGRxcmZibGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MTcxNzQsImV4cCI6MjA2NTk5MzE3NH0.zLiQcPnKt2SnNfQIkUnOG7bOo6F7MPMh8MsasdFF6lw';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allDecks = [];
let deckFuse = null;

const App = {
    cardDB: {},
    allCards: [],
    abilitiesConfigLoaded: false,
    mulliganSelection: [],

    bookmarks: [],
    autoSaves: [],
    history: [],

    // --- Multi-Player Sync State ---
    roomId: null,
    localPlayerRole: 1, // 1 for Player 1 (Bottom), 2 for Player 2 (Top)
    realtimeChannel: null,
    isReceivingSync: false, // flag to prevent echo loops


    // --- State Compression ---
    compressCard(c) {
        const compressed = { instanceId: c.instanceId, cardId: c.cardId };
        if (c.exerted) compressed.exerted = true;
        if (c.damage > 0) compressed.damage = c.damage;
        if (c.faceUp) compressed.faceUp = true;
        if (c.locationId) compressed.locationId = c.locationId;
        if (c.drying) compressed.drying = true;
        if (c.stackedCards && c.stackedCards.length > 0) compressed.stackedCards = c.stackedCards.map(sc => this.compressCard(sc));
        return compressed;
    },

    decompressCard(c) {
        return {
            instanceId: c.instanceId,
            cardId: c.cardId,
            exerted: c.exerted || false,
            damage: c.damage || 0,
            faceUp: c.faceUp || false,
            locationId: c.locationId || null,
            drying: c.drying || false,
            stackedCards: (c.stackedCards || []).map(sc => this.decompressCard(sc))
        };
    },

    compressState(stateObj, includeLog = true) {
        const compressed = {
            activeBookmarkId: stateObj.activeBookmarkId,
            turn: stateObj.turn,
            activePlayer: stateObj.activePlayer,
            inactivePlayer: stateObj.inactivePlayer,
            opponentHandRevealed: stateObj.opponentHandRevealed,
            activeTimelineColor: stateObj.activeTimelineColor,
            turnComments: stateObj.turnComments,
            players: stateObj.players.map(p => ({
                id: p.id,
                name: p.name,
                lore: p.lore,
                inkTotal: p.inkTotal,
                inkReady: p.inkReady,
                hasMulliganed: p.hasMulliganed,
                deck: p.deck.map(c => this.compressCard(c)),
                hand: p.hand.map(c => this.compressCard(c)),
                field: p.field.map(c => this.compressCard(c)),
                inkwell: p.inkwell.map(c => this.compressCard(c)),
                discard: p.discard.map(c => this.compressCard(c))
            }))
        };
        if (includeLog) {
            compressed.log = stateObj.log;
        } else {
            compressed.logLength = stateObj.log ? stateObj.log.length : 0;
        }
        return compressed;
    },

    decompressState(compressed, currentLog = []) {
        return {
            activeBookmarkId: compressed.activeBookmarkId || null,
            turn: compressed.turn,
            activePlayer: compressed.activePlayer,
            inactivePlayer: compressed.inactivePlayer,
            opponentHandRevealed: compressed.opponentHandRevealed || false,
            activeTimelineColor: compressed.activeTimelineColor || null,
            turnComments: compressed.turnComments || {},
            log: compressed.log !== undefined ? [...compressed.log] : currentLog.slice(0, compressed.logLength || 0),
            players: compressed.players.map(p => ({
                id: p.id,
                name: p.name,
                lore: p.lore || 0,
                inkTotal: p.inkTotal || 0,
                inkReady: p.inkReady || 0,
                hasMulliganed: p.hasMulliganed || false,
                deck: (p.deck || []).map(c => this.decompressCard(c)),
                hand: (p.hand || []).map(c => this.decompressCard(c)),
                field: (p.field || []).map(c => this.decompressCard(c)),
                inkwell: (p.inkwell || []).map(c => this.decompressCard(c)),
                discard: (p.discard || []).map(c => this.decompressCard(c))
            }))
        };
    },

    _inspectingPlayerIndex: null,
    _tempDeckOrder: null,

    // Tree Panning State
    treePan: {
        isDragging: false,
        startX: 0,
        startY: 0,
        translateX: 100,
        translateY: 100,
        zoom: 1
    },

    state: {
        activeBookmarkId: null, // Tracks where we are in the multiverse tree
        turn: 1,
        activePlayer: 0,
        inactivePlayer: 1,
        opponentHandRevealed: false,
        turnComments: {},
        players: [
            { id: 0, name: "Player 1", deck: [], hand: [], field: [], inkwell: [], discard: [], lore: 0, inkTotal: 0, inkReady: 0, hasMulliganed: false },
            { id: 1, name: "Player 2", deck: [], hand: [], field: [], inkwell: [], discard: [], lore: 0, inkTotal: 0, inkReady: 0, hasMulliganed: false }
        ],
        log: []
    },

    // --- Local Storage Persistence ---
    saveToLocalStorage() {
        const exportData = {
            version: 1,
            currentState: this.compressState(this.state, true),
            bookmarks: this.bookmarks,
            autoSaves: this.autoSaves,
            history: this.history,
            deck1: document.getElementById('deck1-input').value,
            deck2: document.getElementById('deck2-input').value
        };
        try {
            localStorage.setItem('lorcana_2p_dojo_session', JSON.stringify(exportData));
        } catch (e) {
            console.warn("Failed to save session to local storage:", e);
        }
    },

    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('lorcana_2p_dojo_session');
            if (!saved) return false;

            const importedData = JSON.parse(saved);
            if (importedData.currentState && importedData.bookmarks) {
                this.state = this.decompressState(importedData.currentState);
                this.bookmarks = importedData.bookmarks;
                this.autoSaves = importedData.autoSaves || [];
                this.history = importedData.history || importedData.currentState.history || [];

                if (importedData.deck1) document.getElementById('deck1-input').value = importedData.deck1;
                if (importedData.deck2) document.getElementById('deck2-input').value = importedData.deck2;

                // Ensure user is booted into the app
                document.getElementById('setup-modal').classList.add('hidden');
                document.getElementById('app').classList.remove('hidden');

                document.getElementById('timeline-drawer').classList.add('-translate-x-full');
                this.renderAutoSaves();
                this.renderTree();
                this.render();
                this.showToast("Restored previous session!");
                return true;
            }
        } catch (e) {
            console.warn("Failed to load session from local storage:", e);
        }
        return false;
    },

    updateTurnComment(turnNum, playerId, text) {
        // To avoid flooding the timeline stack on every keystroke, this should mainly be called onblur
        // but we also need to capture current state before mutating
        const key = `${turnNum}-${playerId}`;
        if (this.state.turnComments[key] === text) return;
        this.saveState();
        this.state.turnComments[key] = text;
        this.render();
    },

    changeLore(playerId, amount) {
        this.saveState();
        const p = this.state.players[playerId];
        const oldLore = p.lore;
        p.lore = Math.max(0, p.lore + amount); // Prevent negative lore

        if (p.lore !== oldLore) {
            const diff = p.lore - oldLore;
            const sign = diff > 0 ? '+' : '';
            this.logAction(`${p.id === this.state.activePlayer ? 'You' : 'Opponent'} manually adjusted lore by ${sign}${diff}.`);
            this.render();
        }
    },

    uuid() {
        return Math.random().toString(36).substr(2, 9);
    },

    async fetchDecksFromDatabase() {
        try {
            const { data, error } = await supabaseClient.from('decks').select('*').order('created_at', { ascending: false });
            if (error) {
                console.error('Error fetching decks:', error);
                allDecks = [];
            } else {
                allDecks = data;
            }
            deckFuse = new Fuse(allDecks, { keys: ['name'], includeScore: true, threshold: 0.4 });

            this.populateDeckDropdowns();
        } catch (err) {
            console.error("Failed to fetch decks from Supabase:", err);
        }
    },

    populateDeckDropdowns() {
        const s1 = document.getElementById('p1-deck-select');
        const s2 = document.getElementById('p2-deck-select');
        if (!s1 || !s2) return;

        let optionsHtml = '<option value="">-- Load from Database --</option>';
        allDecks.forEach((deck, index) => {
            optionsHtml += `<option value="${index}">${deck.name || 'Unnamed Deck'}</option>`;
        });

        s1.innerHTML = optionsHtml;
        s2.innerHTML = optionsHtml;

        // Pre-select the first and second decks automatically
        if (allDecks.length > 0) {
            s1.value = "0";
            this.onDeckSelect(1, "0");
        }
        if (allDecks.length > 1) {
            s2.value = "1";
            this.onDeckSelect(2, "1");
        } else if (allDecks.length === 1) {
            // Fallback to the first deck for Player 2 if only 1 deck exists total
            s2.value = "0";
            this.onDeckSelect(2, "0");
        }
    },

    onDeckSelect(playerNum, deckIndexStr) {
        if (deckIndexStr === "") return;
        const deck = allDecks[parseInt(deckIndexStr)];
        if (!deck) return;

        // Smartly extract the decklist from whatever column name is used
        let deckText = deck.decklist || deck.deck_list || deck.list || deck.cards || deck.export_string || deck.content || "";

        // Format array of objects if needed
        if (Array.isArray(deckText)) {
            deckText = deckText.map(c => `${c.amount || c.qty || 1} ${c.name || c.card_name}`).join('\n');
        } else if (typeof deckText === 'object') {
            deckText = JSON.stringify(deckText, null, 2);
        }

        const inputId = playerNum === 1 ? 'deck1-input' : 'deck2-input';
        document.getElementById(inputId).value = deckText;
    },

    async init() {
        try {
            // Check URL params for room and role
            const urlParams = new URLSearchParams(window.location.search);
            const paramRoom = urlParams.get('room');
            const paramRole = urlParams.get('p');

            if (paramRoom) {
                document.getElementById('room-name-input').value = paramRoom;
            }
            if (paramRole && (paramRole === '1' || paramRole === '2')) {
                this.selectRole(parseInt(paramRole));
            }

            // Fetch Supabase Decks asynchronously in the background
            this.fetchDecksFromDatabase();

            // 1. Fetch Cards
            const res = await fetch('https://cdn.jsdelivr.net/gh/heavenideas/similcana@main/database/allCards.json');
            const data = await res.json();

            // Filter out alternate/promo rarities to only use the default standard versions
            this.allCards = data.cards.filter(c => {
                if (!c.rarity) return true;
                const r = c.rarity.toLowerCase();
                return r !== 'enchanted' && r !== 'promo' && r !== 'special';
            });

            this.allCards.forEach(c => {
                this.cardDB[c.id] = c;
                // Only set if not already set, to prefer the first standard version encountered
                if (c.fullName && !this.cardDB[c.fullName.toLowerCase()]) this.cardDB[c.fullName.toLowerCase()] = c;
                if (c.name && !this.cardDB[c.name.toLowerCase()]) this.cardDB[c.name.toLowerCase()] = c;
                if (c.simpleName && !this.cardDB[c.simpleName]) this.cardDB[c.simpleName] = c;
            });

            // 2. Fetch Abilities Config (for Win Probability Library)
            try {
                await UnifiedWinProbabiliyCalculation.loadAbilitiesConfig();
                this.abilitiesConfigLoaded = true;
            } catch (err) {
                console.warn("Could not load win probability config:", err);
            }

            this.initTreePan();

            document.getElementById('loading-screen').classList.add('hidden');

            // Check local storage before showing setup
            const hasSavedSession = localStorage.getItem('lorcana_2p_dojo_session');
            if (hasSavedSession) {
                // We show the setup screen but add a distinct "Resume Last Auto-Save" option
                const resumeBtnHtml = `
                            <button id="btn-resume-storage" onclick="App.loadFromLocalStorage()" class="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-2.5 px-6 rounded transition-transform hover:scale-[1.02] active:scale-95 flex items-center text-sm shadow-[0_0_15px_rgba(16,185,129,0.4)]">
                                <i class="fa-solid fa-clock-rotate-left mr-2"></i> Restore Auto-Save
                            </button>
                        `;
                const setupActionsNode = document.getElementById('session-restore-container');
                if (setupActionsNode && !document.getElementById('btn-resume-storage')) {
                    setupActionsNode.insertAdjacentHTML('beforeend', resumeBtnHtml);
                }
            }

            this.showSetup();

        } catch (e) {
            document.getElementById('loading-text').innerText = "Error loading database. Please refresh.";
            console.error("Initialization error:", e);
        }
    },

    initTreePan() {
        const viewport = document.getElementById('tree-viewport');
        const canvas = document.getElementById('tree-canvas');

        viewport.addEventListener('mousedown', (e) => {
            if (e.target.closest('.tree-node')) return; // Do not pan if clicking a node card
            this.treePan.isDragging = true;
            this.treePan.startX = e.clientX - this.treePan.translateX;
            this.treePan.startY = e.clientY - this.treePan.translateY;
            viewport.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.treePan.isDragging) return;
            this.treePan.translateX = e.clientX - this.treePan.startX;
            this.treePan.translateY = e.clientY - this.treePan.startY;
            canvas.style.transform = `translate(${this.treePan.translateX}px, ${this.treePan.translateY}px) scale(${this.treePan.zoom})`;
        });

        window.addEventListener('mouseup', () => {
            this.treePan.isDragging = false;
            viewport.style.cursor = 'grab';
        });

        // Add scroll wheel zoom logic centered on pointer
        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();

            const zoomIntensity = 0.1;
            const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
            const newZoom = Math.min(Math.max(0.1, this.treePan.zoom + delta), 3.0);

            if (newZoom !== this.treePan.zoom) {
                // Pointer's relative coordinate inside the container
                const rect = viewport.getBoundingClientRect();
                const clientX = e.clientX - rect.left;
                const clientY = e.clientY - rect.top;

                // Calculate how far the mouse is from the current translate origin
                const offsetX = clientX - this.treePan.translateX;
                const offsetY = clientY - this.treePan.translateY;

                // Calculate translation shift necessary to keep the point under the mouse uniform
                const ratio = newZoom / this.treePan.zoom;
                this.treePan.translateX -= offsetX * (ratio - 1);
                this.treePan.translateY -= offsetY * (ratio - 1);

                this.treePan.zoom = newZoom;

                canvas.style.transform = `translate(${this.treePan.translateX}px, ${this.treePan.translateY}px) scale(${this.treePan.zoom})`;
            }
        }, { passive: false });
    },

    resetTreeZoom() {
        this.treePan.zoom = 1;
        this.treePan.translateX = 100;
        this.treePan.translateY = 100;
        document.getElementById('tree-canvas').style.transform = `translate(${this.treePan.translateX}px, ${this.treePan.translateY}px) scale(${this.treePan.zoom})`;
    },

    showSetup() {
        document.getElementById('setup-modal').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
    },

    selectRole(playerNum) {
        this.localPlayerRole = playerNum;
        // Update UI buttons
        const btn1 = document.getElementById('role-btn-p1');
        const btn2 = document.getElementById('role-btn-p2');

        if (playerNum === 1) {
            btn1.className = "role-btn px-4 py-1.5 rounded text-sm font-bold bg-purple-600 text-white transition";
            btn2.className = "role-btn px-4 py-1.5 rounded text-sm font-bold text-gray-500 hover:text-white transition";
        } else {
            btn1.className = "role-btn px-4 py-1.5 rounded text-sm font-bold text-gray-500 hover:text-white transition";
            btn2.className = "role-btn px-4 py-1.5 rounded text-sm font-bold bg-orange-600 text-white transition";
        }
    },

    parseDeck(text) {
        if (!text || text.trim() === '') return this.generateDummyDeck();

        const lines = text.split('\n');
        let deck = [];
        const regex = /^(\d+)\s+(.+)$/;

        for (let line of lines) {
            const match = line.trim().match(regex);
            if (match) {
                let qty = parseInt(match[1]);
                let name = match[2].toLowerCase().trim();
                let card = this.cardDB[name] || this.allCards.find(c => c.name.toLowerCase() === name || (c.fullName && c.fullName.toLowerCase() === name));

                if (card) {
                    for (let i = 0; i < qty; i++) deck.push(card.id);
                }
            }
        }

        if (deck.length === 0) return this.generateDummyDeck();
        return deck;
    },

    generateDummyDeck() {
        // Return ~60 random cards just so something is playable
        let deck = [];
        for (let i = 0; i < 60; i++) {
            const randomCard = this.allCards[Math.floor(Math.random() * this.allCards.length)];
            deck.push(randomCard.id);
        }
        return deck;
    },

    saveState() {
        this.history.push(JSON.stringify(this.compressState(this.state, false)));
        // Keep last 250 states
        if (this.history.length > 250) this.history.shift();

        // Sync to Cloud
        this.syncStateToCloud();

        // Debounce the local storage save slightly so we don't spam it on every single rapid millisecond click
        clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => {
            this.saveToLocalStorage();
        }, 500);
    },

    undo() {
        if (this.history.length === 0) return;
        const prevCompressed = JSON.parse(this.history.pop());
        this.state = this.decompressState(prevCompressed, this.state.log);
        this.render();
    },

    async syncStateToCloud() {
        if (!this.roomId) return;
        if (this.isReceivingSync) return; // Prevent echoing back what we just received

        try {
            const compressed = this.compressState(this.state, true);
            const { error } = await supabaseClient
                .from('sessions')
                .upsert({
                    room_id: this.roomId,
                    state: compressed
                }, { onConflict: 'room_id' });

            if (error) {
                console.error('Error syncing state to cloud:', error);
            }
        } catch (err) {
            console.error('Exception syncing state to cloud:', err);
        }
    },

    setupRealtimeSync() {
        if (!this.roomId) return;

        // Clean up existing channel if re-connecting
        if (this.realtimeChannel) {
            supabaseClient.removeChannel(this.realtimeChannel);
        }

        this.realtimeChannel = supabaseClient.channel(`room:${this.roomId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for all events (INSERT, UPDATE)
                    schema: 'public',
                    table: 'sessions',
                    filter: `room_id=eq.${this.roomId}`
                },
                (payload) => {
                    this.receiveStateFromCloud(payload.new.state);
                }
            )
            .subscribe();

        // Attempt to fetch initial state if we are joining late
        supabaseClient.from('sessions').select('state').eq('room_id', this.roomId).single().then(({ data, error }) => {
            if (data && data.state) {
                this.receiveStateFromCloud(data.state);
            }
        });
    },

    receiveStateFromCloud(compressedState) {
        if (!compressedState) return;

        // Prevent echoing the state back up when we apply what we just downloaded
        this.isReceivingSync = true;

        try {
            this.state = this.decompressState(compressedState, this.state.log);
            this.render();
            // Show a visual flash so the user knows state updated externally
            document.getElementById('time-flash').classList.remove('opacity-0');
            document.getElementById('time-flash').classList.add('opacity-50');
            setTimeout(() => {
                document.getElementById('time-flash').classList.remove('opacity-50');
                document.getElementById('time-flash').classList.add('opacity-0');
            }, 300);
        } catch (e) {
            console.error("Failed to parse incoming state", e);
        }

        setTimeout(() => {
            this.isReceivingSync = false;
        }, 50);
    },

    logAction(msg, isSystem = false) {
        this.state.log.push({ text: msg, isSystem, player: this.state.activePlayer });
    },

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    async startGame() {
        // --- 2-PLAYER ROOM LOGIC ---
        const roomNameInput = document.getElementById('room-name-input').value.trim();

        if (roomNameInput) {
            this.roomId = roomNameInput;

            // Update URL with params for easy sharing
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.set('room', this.roomId);
            newUrl.searchParams.set('p', this.localPlayerRole);
            window.history.replaceState({}, '', newUrl);

            // Attempt to fetch existing state first to see if we are joining instead of creating
            const { data, error } = await supabaseClient.from('sessions').select('state').eq('room_id', this.roomId).maybeSingle();

            if (data && data.state) {
                // Room already exists! Join as a spectator/player without wiping the board
                console.log("Joined existing room, state overwritten locally.");
                this.setupRealtimeSync();
                document.getElementById('setup-modal').classList.add('hidden');
                document.getElementById('app').classList.remove('hidden');
                // The sync itself triggers `receiveStateFromCloud` which handles the first draw
                return;
            }
        }

        // --- LOCAL OUTFITTING LOGIC (OR NEW ROOM CREATION) ---
        const deck1Str = document.getElementById('deck1-input').value;
        const deck2Str = document.getElementById('deck2-input').value;

        const d1Ids = this.parseDeck(deck1Str);
        const d2Ids = this.parseDeck(deck2Str);

        // Reset state
        this.history = [];
        this.state = {
            activeBookmarkId: null,
            turn: 1, activePlayer: 0, inactivePlayer: 1, opponentHandRevealed: false, log: [], turnComments: {},
            activeTimelineColor: null,
            players: [
                { id: 0, name: "Player 1", deck: [], hand: [], field: [], inkwell: [], discard: [], lore: 0, inkTotal: 0, inkReady: 0, hasMulliganed: false },
                { id: 1, name: "Player 2", deck: [], hand: [], field: [], inkwell: [], discard: [], lore: 0, inkTotal: 0, inkReady: 0, hasMulliganed: false }
            ]
        };

        // Populate decks
        const mapCard = (id) => ({ instanceId: this.uuid(), cardId: id, exerted: false, damage: 0, faceUp: false, locationId: null, drying: false, stackedCards: [] });
        this.state.players[0].deck = this.shuffle(d1Ids.map(mapCard));
        this.state.players[1].deck = this.shuffle(d2Ids.map(mapCard));

        this.bookmarks = [];
        this.autoSaves = [];
        this.renderAutoSaves();

        document.getElementById('setup-modal').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');

        if (this.roomId) {
            this.setupRealtimeSync();
        }

        // Initial Draw
        this.saveState();
        for (let i = 0; i < 7; i++) {
            this._internalDraw(0);
            this._internalDraw(1);
        }

        this.logAction(`--- Turn 1 Begins ---`, true);
        this.render();
        this.saveToLocalStorage();
    },

    _internalDraw(playerIndex) {
        const p = this.state.players[playerIndex];
        if (p.deck.length > 0) {
            p.hand.push(p.deck.shift());
        }
    },

    drawCard(playerIndex) {
        this.saveState();
        this._internalDraw(playerIndex);
        if (playerIndex === this.state.activePlayer) {
            this.logAction(`You drew a card.`);
        } else {
            this.logAction(`Opponent drew a card.`);
        }
        this.render();
    },

    endTurn() {
        this.saveState();

        this.state.activePlayer = this.state.inactivePlayer;
        this.state.inactivePlayer = 1 - this.state.activePlayer;
        this.state.opponentHandRevealed = false; // Hide hand again when perspectives flip

        if (this.state.activePlayer === 0) {
            this.state.turn++;
        }

        const p = this.state.players[this.state.activePlayer];

        this.logAction(`--- Turn ${this.state.turn} Begins ---`, true);
        this.logAction(`Ready step: characters and items readied`, true);

        // Ready Characters and Items (Not Locations)
        p.field.forEach(c => {
            const dbCard = this.cardDB[c.cardId];
            if (dbCard && dbCard.type !== 'Location') {
                c.exerted = false;
            }
            c.drying = false; // Remove drying state at the start of their turn
        });

        // Ready Inkwell and flip newly inked cards face down
        p.inkwell.forEach(c => {
            c.exerted = false;
            c.faceUp = false;
        });
        p.inkReady = p.inkTotal;

        this.logAction(`Draw step`, true);
        this._internalDraw(this.state.activePlayer);

        // Feature 8: Auto-save timeline on turn start
        const autoSaveCheckbox = document.getElementById('auto-save-turn');
        if (autoSaveCheckbox && autoSaveCheckbox.checked) {
            // Save AFTER the state has fully resolved to the start of the new turn
            // The save should be named in a way that indicates the turn number and the player that is playing.
            const name = `Turn ${this.state.turn} - ${p.name} Active`;

            const p1 = this.state.players[0];
            const p2 = this.state.players[1];
            const stats = `Turn ${this.state.turn} | P1: ${p1.lore} - P2: ${p2.lore}`;

            const timelineColors = ['#ef4444', '#f97316', '#eab308', '#22c54e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
            const bColor = timelineColors[this.bookmarks.length % timelineColors.length];

            const newId = this.uuid();

            // Check if the PREVIOUS player left a note for the turn that just ended
            let prevTurn = this.state.turn;
            let prevPlayerId = this.state.inactivePlayer;

            // If we just ticked over to player 1's turn (activePlayer === 0), the previous turn number is turn - 1
            if (this.state.activePlayer === 0 && this.state.turn > 1) {
                prevTurn = this.state.turn - 1;
            }

            const commentKey = `${prevTurn}-${prevPlayerId}`;
            const customComment = this.state.turnComments[commentKey];
            const finalComment = customComment && customComment.trim() !== "" ? customComment : "Auto-saved at start of turn.";

            this.bookmarks.push({
                id: newId,
                parentId: this.state.activeBookmarkId || null,
                name: name,
                stats: stats,
                comment: finalComment,
                color: bColor,
                state: JSON.stringify(this.compressState(this.state, true)),
                timestamp: Date.now(),
                isDeckEdit: false
            });

            this.state.activeBookmarkId = newId;
            this.showToast("Auto-Saved Timeline");
        }

        this.render();
    },

    exertInk() {
        const p = this.state.players[this.state.activePlayer];
        if (p.inkReady > 0) {
            this.saveState();
            p.inkReady--;
            // Visually exert one available ink card
            let unexertedInk = p.inkwell.find(c => !c.exerted);
            if (unexertedInk) unexertedInk.exerted = true;
            this.render();
        }
    },

    setHandReveal(isRevealed) {
        if (this.state.opponentHandRevealed === isRevealed) return;

        this.state.opponentHandRevealed = isRevealed;

        // Directly manipulate the DOM for smooth animation without a full React-style render
        const th = document.getElementById('top-hand');
        const icon = document.getElementById('reveal-icon');
        const text = document.getElementById('reveal-text');

        if (isRevealed) {
            // Slide down, scale up slightly, bring to absolute front
            th.classList.add('translate-y-[120px]', 'scale-[1.1]', 'z-50');
            th.classList.remove('scale-[0.85]');
            icon.className = 'fa-solid fa-eye-slash';
            text.innerText = 'Release to Hide';

            // Re-render just the cards inside to show faces
            th.innerHTML = '';
            this.state.players[1 - this.state.activePlayer].hand.forEach(c => th.appendChild(this.createCardElement(c, false)));

            if (!this._hasLoggedReveal) {
                this.logAction(`You peeked at the opponent's hand.`, true);
                this._hasLoggedReveal = true; // Prevent spamming log if they click rapidly
            }
        } else {
            // Return to normal
            th.classList.remove('translate-y-[120px]', 'scale-[1.1]', 'z-50');
            th.classList.add('scale-[0.85]');
            icon.className = 'fa-solid fa-eye';
            text.innerText = 'Hold to Reveal Hand';

            // Re-render to hide faces
            th.innerHTML = '';
            // Use localPlayerRole to determine which hand is "opponent's" from this client's perspective
            const opponentPlayerIndex = (this.localPlayerRole - 1 === 0) ? 1 : 0;
            this.state.players[opponentPlayerIndex].hand.forEach(c => th.appendChild(this.createCardElement(c, true)));
            this._hasLoggedReveal = false;
        }
    },


    // --- Timelines & Bookmarks System ---

    toggleTimelines() {
        document.getElementById('timeline-drawer').classList.toggle('-translate-x-full');
    },

    exportTimelines() {
        const exportData = {
            version: 1,
            currentState: this.compressState(this.state, true),
            bookmarks: this.bookmarks,
            autoSaves: this.autoSaves,
            history: this.history,
            deck1: document.getElementById('deck1-input').value,
            deck2: document.getElementById('deck2-input').value
        };

        const blob = new Blob([JSON.stringify(exportData)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lorcana-session-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast("Session Exported!");
    },

    importTimelines(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (importedData.currentState && importedData.bookmarks) {
                    this.state = this.decompressState(importedData.currentState);
                    this.bookmarks = importedData.bookmarks;
                    this.autoSaves = importedData.autoSaves || [];
                    this.history = importedData.history || importedData.currentState.history || [];

                    if (importedData.deck1) document.getElementById('deck1-input').value = importedData.deck1;
                    if (importedData.deck2) document.getElementById('deck2-input').value = importedData.deck2;

                    // Ensure user is booted into the app if they imported from setup modal
                    document.getElementById('setup-modal').classList.add('hidden');
                    document.getElementById('app').classList.remove('hidden');

                    // Close Drawer if open, render new state
                    document.getElementById('timeline-drawer').classList.add('-translate-x-full');
                    this.renderAutoSaves();
                    this.renderTree(); // Ensure tree is ready if they open it
                    this.render();
                    this.showToast("Session Imported Successfully!");
                } else {
                    alert("Invalid session file format.");
                }
            } catch (err) {
                console.error("Failed to parse timeline file", err);
                alert("Failed to read the file. Ensure it is a valid JSON exported from the Dojo.");
            }
            // Reset file input so the same file can be imported again if needed
            event.target.value = '';
        };
        reader.readAsText(file);
    },

    async loadExampleSession() {
        const selectElement = document.getElementById('example-session-select');
        const filename = selectElement.value;
        if (!filename) return;

        const btn = document.getElementById('btn-load-example');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Loading...';
        btn.disabled = true;

        try {
            const response = await fetch(`./multiverse_examples/${filename}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const importedData = await response.json();

            if (importedData.currentState && importedData.bookmarks) {
                this.state = this.decompressState(importedData.currentState);
                this.bookmarks = importedData.bookmarks;
                this.autoSaves = importedData.autoSaves || [];
                this.history = importedData.history || importedData.currentState.history || [];

                if (importedData.deck1) document.getElementById('deck1-input').value = importedData.deck1;
                if (importedData.deck2) document.getElementById('deck2-input').value = importedData.deck2;

                // Ensure user is booted into the app if they imported from setup modal
                document.getElementById('setup-modal').classList.add('hidden');
                document.getElementById('app').classList.remove('hidden');

                // Close Drawer if open, render new state
                document.getElementById('timeline-drawer').classList.add('-translate-x-full');
                this.renderAutoSaves();
                this.renderTree(); // Ensure tree is ready if they open it
                this.render();
                this.showToast(`Loaded ${filename} successfully!`);
            } else {
                alert("Invalid example session payload.");
            }
        } catch (err) {
            console.error("Failed to fetch example session", err);
            alert("Failed to fetch the example session. If running directly from file:// you may need to use a local web server.");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
            selectElement.value = '';
        }
    },

    saveTimeline() {
        const nameInput = document.getElementById('bookmark-name').value.trim();
        const commentInput = document.getElementById('bookmark-comment').value.trim();
        const ap = this.state.players[this.state.activePlayer];
        const defaultName = `Turn ${this.state.turn} - ${ap.name} Active`;
        const finalName = nameInput || defaultName;

        const p1 = this.state.players[0];
        const p2 = this.state.players[1];
        const stats = `Turn ${this.state.turn} | P1: ${p1.lore} - P2: ${p2.lore}`;

        const timelineColors = ['#ef4444', '#f97316', '#eab308', '#22c54e', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#f43f5e'];
        const bColor = timelineColors[this.bookmarks.length % timelineColors.length];

        const newId = this.uuid();

        this.bookmarks.push({
            id: newId,
            parentId: this.state.activeBookmarkId || null, // Create lineage
            name: finalName,
            stats: stats,
            comment: commentInput,
            color: bColor,
            state: JSON.stringify(this.compressState(this.state, true)),
            timestamp: Date.now(),
            isDeckEdit: false
        });

        // Update active pointer to the new node we just created
        this.state.activeBookmarkId = newId;

        document.getElementById('bookmark-name').value = '';
        document.getElementById('bookmark-comment').value = '';
        this.showToast("Timeline node created.");
        this.saveToLocalStorage();
    },

    autoSaveTimeline() {
        const p1 = this.state.players[0];
        const p2 = this.state.players[1];
        const now = new Date();
        const ap = this.state.players[this.state.activePlayer];
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const name = `Auto-Save: Left Turn ${this.state.turn} (${timeStr})`;
        const stats = `Turn ${this.state.turn} | ${ap.name} Active | P1: ${p1.lore} - P2: ${p2.lore}`;

        this.autoSaves.unshift({
            id: this.uuid(),
            name: name,
            stats: stats,
            state: JSON.stringify(this.compressState(this.state, true)),
            timestamp: now.getTime()
        });

        // Ensure newest is always strictly on top
        this.autoSaves.sort((a, b) => b.timestamp - a.timestamp);
        if (this.autoSaves.length > 5) this.autoSaves.length = 5;

        this.renderAutoSaves();
        this.saveToLocalStorage();
    },

    restoreTimeline(id, isAuto = false) {
        // Save safety net before jumping
        this.autoSaveTimeline();

        const list = isAuto ? this.autoSaves : this.bookmarks;
        const bookmark = list.find(b => b.id === id);
        if (!bookmark) return;

        // Restore State
        this.state = this.decompressState(JSON.parse(bookmark.state));
        this.history = []; // Reset micro-undo history on branch jump to prevent temporal anomalies

        // CRUCIAL: If it's a manual tree node, we must explicitly tell the state we are now physically located AT this node.
        if (!isAuto) {
            this.state.activeBookmarkId = id;
            this.state.activeTimelineColor = bookmark.color || '#3b82f6';
        }

        // Close Drawer and Modal, Render, and Flash
        document.getElementById('timeline-drawer').classList.add('-translate-x-full');
        this.closeTreeModal();
        this.render();
        this.showToast(`Timeline Restored: ${bookmark.name}`);
        this.triggerTimeFlash();
        this.saveToLocalStorage();
    },

    deleteTimeline(id, isAuto = false) {
        if (isAuto) {
            this.autoSaves = this.autoSaves.filter(b => b.id !== id);
            this.renderAutoSaves();
        } else {
            const nodeToDelete = this.bookmarks.find(b => b.id === id);
            if (nodeToDelete) {
                // Grandparenting algorithm: Find children and attach them to the deleted node's parent
                this.bookmarks.forEach(b => {
                    if (b.parentId === id) {
                        b.parentId = nodeToDelete.parentId;
                    }
                });
                this.bookmarks = this.bookmarks.filter(b => b.id !== id);
                this.renderTree(); // Re-draw the canvas
            }
        }
        this.saveToLocalStorage();
    },

    // --- Multiverse Canvas Drawing (Tree View) ---

    openTreeModal() {
        document.getElementById('timeline-drawer').classList.add('-translate-x-full');
        document.getElementById('tree-modal').classList.remove('hidden');
        document.getElementById('tree-modal').classList.add('flex');

        // Center the camera (maintain current zoom from treePan but recalculate matrix)
        this.treePan.translateX = 100;
        this.treePan.translateY = 100;
        document.getElementById('tree-canvas').style.transform = `translate(${this.treePan.translateX}px, ${this.treePan.translateY}px) scale(${this.treePan.zoom})`;

        this.renderTree();
    },

    closeTreeModal() {
        document.getElementById('tree-modal').classList.add('hidden');
        document.getElementById('tree-modal').classList.remove('flex');
        if (this.state) this.state.editingNodeId = null; // Clear edit state on close
    },

    renderTree() {
        const svgContainer = document.getElementById('tree-svg');
        const nodesContainer = document.getElementById('tree-nodes');

        if (this.bookmarks.length === 0) {
            svgContainer.innerHTML = '';
            nodesContainer.innerHTML = `<div class="absolute left-[100px] top-[100px] text-gray-500 italic">The Multiverse is empty. Save a state to begin a timeline.</div>`;
            return;
        }

        // Build Adjacency List & Roots
        const childrenMap = {};
        const roots = [];

        this.bookmarks.forEach(b => {
            // Check if parentId exists AND that the parent hasn't been completely wiped from memory
            if (b.parentId && this.bookmarks.find(p => p.id === b.parentId)) {
                if (!childrenMap[b.parentId]) childrenMap[b.parentId] = [];
                childrenMap[b.parentId].push(b);
            } else {
                roots.push(b);
            }
        });

        // Sort children chronologically to ensure predictable layout
        Object.keys(childrenMap).forEach(key => {
            childrenMap[key].sort((a, b) => a.timestamp - b.timestamp);
        });
        roots.sort((a, b) => a.timestamp - b.timestamp);

        // Tree Layout Calculation
        let currentY = 0;
        const nodePositions = {}; // id -> {x, y}
        const CARD_W = 220;
        const CARD_H = 150;
        const X_SPACING = 300; // 220 card + 80 gap
        const Y_SPACING = 190; // 150 card + 40 gap

        const assignCoords = (node, depth) => {
            const children = childrenMap[node.id] || [];
            const x = depth * X_SPACING;

            if (children.length === 0) {
                nodePositions[node.id] = { x, y: currentY };
                currentY += Y_SPACING;
            } else {
                let startY = currentY;
                children.forEach(child => assignCoords(child, depth + 1));
                let endY = currentY - Y_SPACING;
                nodePositions[node.id] = { x, y: (startY + endY) / 2 }; // Center parent vertically between children
            }
        };

        roots.forEach(root => assignCoords(root, 0));

        // 1. Render SVG Curved Paths
        let svgHtml = '';
        this.bookmarks.forEach(b => {
            if (b.parentId && nodePositions[b.parentId]) {
                const pPos = nodePositions[b.parentId];
                const cPos = nodePositions[b.id];

                const startX = pPos.x + CARD_W;
                const startY = pPos.y + (CARD_H / 2);
                const endX = cPos.x;
                const endY = cPos.y + (CARD_H / 2);

                svgHtml += `<path d="M ${startX} ${startY} C ${startX + 40} ${startY}, ${endX - 40} ${endY}, ${endX} ${endY}" fill="none" stroke="${b.color || '#4b5563'}" stroke-width="3" opacity="0.6" />`;
            }
        });
        svgContainer.innerHTML = svgHtml;

        // 2. Render HTML Nodes
        nodesContainer.innerHTML = '';
        this.bookmarks.forEach(b => {
            const pos = nodePositions[b.id];
            if (!pos) return;

            const isActive = this.state.activeBookmarkId === b.id;
            const d = new Date(b.timestamp);
            const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            const icon = b.isDeckEdit ? '<i class="fa-solid fa-layer-group text-blue-400"></i>' : '<i class="fa-solid fa-bookmark text-purple-400"></i>';

            const el = document.createElement('div');
            el.className = `tree-node absolute w-[220px] h-[150px] bg-[#1a1a1e] rounded-lg border-2 shadow-lg flex flex-col overflow-hidden transition-transform hover:scale-105 hover:z-20 ${isActive ? 'tree-node-active' : ''}`;
            el.style.left = `${pos.x}px`;
            el.style.top = `${pos.y}px`;
            el.style.borderColor = b.color || '#4b5563';

            const isEditing = this.state.editingNodeId === b.id;

            if (isEditing) {
                el.innerHTML = `
                            <div class="p-2.5 flex-1 flex flex-col relative h-full bg-[#2a2a2e]">
                                <input type="text" id="edit-node-name-${b.id}" class="w-full bg-black border border-gray-600 rounded px-1.5 py-0.5 text-[11px] text-white focus:border-purple-500 outline-none mb-1" value="${b.name.replace(/"/g, '&quot;')}">
                                <textarea id="edit-node-comment-${b.id}" class="w-full flex-1 bg-black border border-gray-600 rounded px-1.5 py-1 text-[10px] text-gray-300 focus:border-purple-500 outline-none resize-none custom-scrollbar mb-1">${b.comment || ''}</textarea>
                                <div class="flex justify-end gap-2 shrink-0">
                                    <button onclick="App.toggleEditNode(null)" class="px-2 py-0.5 bg-gray-600 hover:bg-gray-500 text-white text-[10px] rounded transition">Cancel</button>
                                    <button onclick="App.saveEditNode('${b.id}')" class="px-2 py-0.5 bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold rounded transition shadow-lg">Save</button>
                                </div>
                            </div>
                        `;
            } else {
                el.innerHTML = `
                             <div class="p-2.5 flex-1 flex flex-col relative h-full">
                                 <!-- Header Row -->
                                 <div class="flex items-center justify-between">
                                     <button onclick="App.restoreTimeline('${b.id}', false)"
                                         class="text-[12px] font-bold text-white truncate pr-6 flex items-center gap-1.5 hover:text-purple-300 transition"
                                         title="Click to Restore this Timeline Warp">
                                         ${icon} <span class="group-hover:underline underline-offset-2">${b.name}</span>
                                     </button>
                                 </div>
                                 
                                 <!-- Stats Row -->
                                 <div class="text-[9px] text-gray-400 font-mono tracking-wider mt-1 flex justify-between items-center shrink-0">
                                     <span>${b.stats}</span>
                                 </div>
                                 
                                 <!-- Scrollable Comment Area -->
                                 <div class="text-[11px] text-gray-300 mt-1.5 whitespace-pre-wrap break-words overflow-y-auto pr-1 flex-1 min-h-0 custom-scrollbar pb-1">${b.comment || ''}</div>
                             </div>
                             
                             <!-- Edit Button -->
                             <button onclick="App.toggleEditNode('${b.id}')" 
                                 class="absolute top-1.5 right-8 w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-blue-600 text-gray-400 hover:text-white rounded-md text-[10px] transition z-20" 
                                 title="Edit Node">
                                 <i class="fa-solid fa-pen"></i>
                             </button>
                             
                             <!-- Delete Button -->
                             <button onclick="App.deleteTimeline('${b.id}', false)" 
                                 class="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-gray-800 hover:bg-red-600 text-gray-400 hover:text-white rounded-md text-[10px] transition z-20" 
                                 title="Delete Node (Children will automatically attach to parent)">
                                 <i class="fa-solid fa-trash"></i>
                             </button>
                        `;
            }
            nodesContainer.appendChild(el);
        });
    },

    renderAutoSaves() {
        const buildHtml = (list) => {
            if (list.length === 0) return `<div class="text-xs text-gray-600 text-center py-4 italic">No auto-saves available.</div>`;
            return list.map(b => {
                const d = new Date(b.timestamp);
                const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                return `
                        <div class="shrink-0 bg-[#1a1a1e] rounded border border-gray-700 hover:border-gray-500 transition shadow-sm flex flex-col overflow-hidden mb-1">
                           <div class="group relative p-2 cursor-pointer" onclick="App.restoreTimeline('${b.id}', true)">
                               <div class="text-[11px] font-bold text-gray-300 mb-0.5 truncate">${b.name}</div>
                               <div class="text-[9px] text-gray-500 font-mono tracking-wider flex justify-between items-center">
                                   <span>${b.stats}</span>
                               </div>
                               <div class="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                                   <span class="text-xs font-bold text-white">Restore Auto-Save</span>
                               </div>
                           </div>
                        </div>
                        `;
            }).join('');
        };
        document.getElementById('autosave-list').innerHTML = buildHtml(this.autoSaves);
    },

    toggleEditNode(id) {
        this.state.editingNodeId = id;
        this.renderTree();
    },

    saveEditNode(id) {
        const node = this.bookmarks.find(b => b.id === id);
        if (!node) return;

        const newName = document.getElementById(`edit-node-name-${id}`).value.trim();
        const newComment = document.getElementById(`edit-node-comment-${id}`).value.trim();

        if (newName) node.name = newName;
        node.comment = newComment; // Allow clearing the comment

        this.state.editingNodeId = null;
        this.renderTree();
        this.showToast("Timeline node updated.");
    },

    triggerTimeFlash() {
        const flash = document.getElementById('time-flash');
        flash.classList.remove('opacity-0');
        flash.classList.add('opacity-100');
        setTimeout(() => {
            flash.classList.remove('opacity-100');
            flash.classList.add('opacity-0');
        }, 300);
    },

    showToast(msg) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'bg-purple-600/90 backdrop-blur-md border border-purple-400 text-white px-6 py-3 rounded-full shadow-[0_10px_30px_rgba(147,51,234,0.4)] font-bold text-sm transform transition-all duration-300 translate-y-[-20px] opacity-0 flex items-center gap-3';
        toast.innerHTML = `<i class="fa-solid fa-clock-rotate-left animate-spin-reverse" style="animation-duration: 3s;"></i> ${msg}`;
        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-[-20px]', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        });

        // Animate out and remove
        setTimeout(() => {
            toast.classList.remove('translate-y-0', 'opacity-100');
            toast.classList.add('translate-y-[-20px]', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    },

    // --- Mulligan Handlers ---

    openMulligan() {
        const p = this.state.players[this.state.activePlayer];
        document.getElementById('mulligan-title').innerText = `${p.name} Mulligan`;
        this.mulliganSelection = [];
        this.renderMulliganCards();
        document.getElementById('mulligan-modal').classList.remove('hidden');
    },

    closeMulligan() {
        document.getElementById('mulligan-modal').classList.add('hidden');
        this.mulliganSelection = [];
    },

    renderMulliganCards() {
        const container = document.getElementById('mulligan-hand');
        container.innerHTML = '';
        const p = this.state.players[this.state.activePlayer];

        p.hand.forEach(c => {
            const dbCard = this.cardDB[c.cardId];
            const el = document.createElement('div');
            el.className = `relative rounded-md bg-cover bg-center cursor-pointer transition-all duration-200 shadow-md border border-white/10`;
            el.style.width = '140px';
            el.style.height = '196px';
            el.style.backgroundImage = `url('${this.getCardImage(dbCard)}')`;

            if (this.mulliganSelection.includes(c.instanceId)) {
                el.classList.add('ring-4', 'ring-red-500', 'opacity-50', 'scale-95');
                el.innerHTML = '<div class="absolute inset-0 flex items-center justify-center"><i class="fa-solid fa-xmark text-6xl text-red-500 drop-shadow-lg"></i></div>';
            } else {
                el.classList.add('hover:-translate-y-2', 'hover:shadow-xl', 'hover:z-10');
            }

            el.onclick = () => {
                if (this.mulliganSelection.includes(c.instanceId)) {
                    this.mulliganSelection = this.mulliganSelection.filter(id => id !== c.instanceId);
                } else {
                    if (this.mulliganSelection.length < 7) {
                        this.mulliganSelection.push(c.instanceId);
                    }
                }
                this.renderMulliganCards();
            };

            container.appendChild(el);
        });
    },

    confirmMulligan() {
        if (this.mulliganSelection.length === 0) {
            this.closeMulligan();
            return;
        }

        this.saveState();
        const p = this.state.players[this.state.activePlayer];
        const cardsToReplace = [];

        // Extract selected cards from hand
        this.mulliganSelection.forEach(instanceId => {
            const idx = p.hand.findIndex(c => c.instanceId === instanceId);
            if (idx !== -1) {
                cardsToReplace.push(p.hand[idx]);
                p.hand.splice(idx, 1);
            }
        });

        // Draw new cards
        for (let i = 0; i < cardsToReplace.length; i++) {
            this._internalDraw(this.state.activePlayer);
        }

        // Put replaced cards back into deck
        p.deck.push(...cardsToReplace);

        // Shuffle deck
        this.shuffle(p.deck);

        p.hasMulliganed = true; // Mark as mulliganed
        this.logAction(`You mulliganed ${cardsToReplace.length} cards.`);

        this.closeMulligan();
        this.render();
    },

    // --- Drag and Drop Handlers ---

    allowDrop(ev) {
        ev.preventDefault();
    },

    dragEnter(ev) {
        ev.preventDefault();
        const zone = ev.target.closest('.drop-zone');
        if (zone) zone.classList.add('drop-target-active');
    },

    dragLeave(ev) {
        const zone = ev.target.closest('.drop-zone');
        if (zone && !zone.contains(ev.relatedTarget)) {
            zone.classList.remove('drop-target-active');
        }
    },

    drop(ev, targetZone, position) {
        ev.preventDefault();
        const zone = ev.target.closest('.drop-zone');
        if (zone) zone.classList.remove('drop-target-active');

        const instanceId = ev.dataTransfer.getData("text/plain");
        if (instanceId) {
            this.moveCard(instanceId, targetZone, position, 'top');
        }
    },

    dragStart(ev, instanceId) {
        ev.dataTransfer.setData("text/plain", instanceId);
        ev.dataTransfer.effectAllowed = "move";
    },

    dragStartTopCard(ev, position) {
        const playerIndex = position === 'bottom' ? this.state.activePlayer : this.state.inactivePlayer;
        const p = this.state.players[playerIndex];
        if (p.deck.length > 0) {
            const topCard = p.deck[0];
            ev.dataTransfer.setData("text/plain", topCard.instanceId);
            ev.dataTransfer.effectAllowed = "move";
        } else {
            ev.preventDefault();
        }
    },

    _unpackStack(cardObj) {
        const results = [cardObj];
        if (cardObj.stackedCards && cardObj.stackedCards.length > 0) {
            cardObj.stackedCards.forEach(sc => {
                results.push({
                    instanceId: sc.instanceId,
                    cardId: sc.cardId,
                    exerted: false, damage: 0, faceUp: false, locationId: null, drying: false, stackedCards: []
                });
            });
            cardObj.stackedCards = [];
        }
        return results;
    },

    moveCard(instanceId, targetZone, position, deckPlacement = 'top') {
        this.saveState();
        let found = this.findCard(instanceId);
        if (!found) return;

        const targetPlayerIndex = position === 'bottom' ? this.state.activePlayer : this.state.inactivePlayer;
        const targetPlayer = this.state.players[targetPlayerIndex];

        // Deduct ink automatically if dropping from hand to field
        const dbCard = this.cardDB[found.card.cardId];
        if (found.loc === 'hand' && targetZone === 'field' && targetPlayerIndex === this.state.activePlayer) {
            if (targetPlayer.inkReady >= dbCard.cost) {
                targetPlayer.inkReady -= dbCard.cost;
                // Exert inkwell cards visually
                let inkToExert = dbCard.cost;
                for (let i = 0; i < targetPlayer.inkwell.length && inkToExert > 0; i++) {
                    if (!targetPlayer.inkwell[i].exerted) {
                        targetPlayer.inkwell[i].exerted = true;
                        inkToExert--;
                    }
                }
            }
        }

        // Remove from old location
        found.player[found.loc].splice(found.idx, 1);

        // Add explicit tracking for discard recoveries
        if (found.loc === 'discard') {
            const destinationName = targetZone === 'deck'
                ? (deckPlacement === 'bottom' ? 'the bottom of the deck' : 'the top of the deck')
                : `the ${targetZone}`;
            this.logAction(`Moved ${dbCard.name} from the discard pile to ${destinationName}.`);
        }

        // Auto-refresh discard modal if moving a card out of it
        if (found.loc === 'discard' && !document.getElementById('inspect-discard-modal').classList.contains('hidden')) {
            if (this._inspectingDiscardPlayerIndex !== null) {
                this.renderInspectDiscardGrid(this._inspectingDiscardPlayerIndex);
            }
        }

        // Reset card status when moving zones
        if (found.loc !== targetZone || found.player.id !== targetPlayer.id) {
            found.card.exerted = false;
            found.card.damage = 0;
            found.card.locationId = null;
            found.card.faceUp = false;

            // Add drying state if playing a Character from hand to field
            if (found.loc === 'hand' && targetZone === 'field' && dbCard.type === 'Character') {
                found.card.drying = true;
            } else {
                found.card.drying = false;
            }
        } else if (targetZone === 'field') {
            found.card.locationId = null; // Moving within field (but not onto a location drop zone) un-locates it
        }

        // Adjust Ink Totals if involving inkwell
        if (found.loc === 'inkwell') {
            found.player.inkTotal--;
            if (found.player.inkReady > found.player.inkTotal) found.player.inkReady = found.player.inkTotal;
        }

        let cardsToMove = [found.card];
        if (targetZone !== 'field') {
            cardsToMove = this._unpackStack(found.card);
        }

        cardsToMove.forEach(c => {
            if (targetZone === 'inkwell') {
                targetPlayer.inkTotal++;
                targetPlayer.inkReady++;
                c.faceUp = true; // Inked this turn
            }

            // Add to new location
            if (targetZone === 'deck') {
                if (deckPlacement === 'bottom') {
                    targetPlayer.deck.push(c);
                } else {
                    targetPlayer.deck.unshift(c);
                }
            } else {
                targetPlayer[targetZone].push(c);
            }
        });

        this.logAction(`Moved ${dbCard.name}${cardsToMove.length > 1 ? ` and its stack (${cardsToMove.length} cards)` : ''} to ${targetZone}${targetZone === 'deck' ? ` (${deckPlacement})` : ''}.`);
        this.render();
    },

    findCard(instanceId) {
        for (let p of this.state.players) {
            let locs = ['hand', 'field', 'inkwell', 'discard', 'deck'];
            for (let loc of locs) {
                let idx = p[loc].findIndex(c => c.instanceId === instanceId);
                if (idx !== -1) return { player: p, loc: loc, idx: idx, card: p[loc][idx] };
            }
        }
        return null;
    },

    playToInkwell(instanceId) {
        this.saveState();
        let found = this.findCard(instanceId);
        if (!found) return;

        const dbCard = this.cardDB[found.card.cardId];
        found.player[found.loc].splice(found.idx, 1);

        const cardsToMove = this._unpackStack(found.card);
        cardsToMove.forEach(c => {
            c.exerted = false; // comes in ready
            c.drying = false;
            c.faceUp = true; // face up for the turn it is inked
            found.player.inkwell.push(c);
            found.player.inkTotal++;
            found.player.inkReady++;
        });

        this.logAction(`You added ${dbCard.name}${cardsToMove.length > 1 ? ` and its stack (${cardsToMove.length} cards)` : ''} to ink.`);
        this.render();
    },

    playCard(instanceId) {
        this.saveState();
        let found = this.findCard(instanceId);
        if (!found) return;

        const dbCard = this.cardDB[found.card.cardId];

        // Deduct ink if available (Dojo allows playing even if not enough, for testing)
        if (found.player.inkReady >= dbCard.cost) {
            found.player.inkReady -= dbCard.cost;
            // Exert inkwell cards visually
            let inkToExert = dbCard.cost;
            for (let i = 0; i < found.player.inkwell.length && inkToExert > 0; i++) {
                if (!found.player.inkwell[i].exerted) {
                    found.player.inkwell[i].exerted = true;
                    inkToExert--;
                }
            }
        }

        found.player[found.loc].splice(found.idx, 1);

        // Auto-refresh discard modal if playing a card out of it
        if (found.loc === 'discard' && !document.getElementById('inspect-discard-modal').classList.contains('hidden')) {
            if (this._inspectingDiscardPlayerIndex !== null) {
                this.renderInspectDiscardGrid(this._inspectingDiscardPlayerIndex);
            }
        }

        // Locations enter play automatically exerted
        found.card.exerted = (dbCard.type === 'Location');
        found.card.locationId = null;
        found.card.drying = (dbCard.type === 'Character'); // Characters enter drying

        found.player.field.push(found.card);

        if (found.loc === 'discard') {
            this.logAction(`You played ${dbCard.name} from the discard pile (cost ${dbCard.cost}).`);
        } else {
            this.logAction(`You played ${dbCard.name} (cost ${dbCard.cost}).`);
        }
        this.render();
    },

    toggleExert(instanceId) {
        this.saveState();
        let found = this.findCard(instanceId);
        if (!found) return;
        found.card.exerted = !found.card.exerted;

        // Adjust inkReady if toggling an inkwell card manually
        if (found.loc === 'inkwell') {
            if (found.card.exerted) {
                found.player.inkReady = Math.max(0, found.player.inkReady - 1);
            } else {
                found.player.inkReady = Math.min(found.player.inkTotal, found.player.inkReady + 1);
            }
        }
        this.render();
    },

    quest(instanceId) {
        this.saveState();
        let found = this.findCard(instanceId);
        if (!found) return;
        const dbCard = this.cardDB[found.card.cardId];

        found.card.exerted = true;
        const loreVal = dbCard.lore || 0;
        found.player.lore += loreVal;

        this.logAction(`You quested with ${dbCard.name} for ${loreVal} lore.`);
        this.render();
    },

    questWithAll() {
        this.saveState();
        const p = this.state.players[this.state.activePlayer];
        let totalLore = 0;
        let count = 0;
        p.field.forEach(c => {
            const dbCard = this.cardDB[c.cardId];
            // Only quest if the character is NOT exerted, NOT drying, and has lore
            if (!c.exerted && !c.drying && dbCard.lore > 0) {
                c.exerted = true;
                totalLore += dbCard.lore;
                count++;
            }
        });

        if (count > 0) {
            p.lore += totalLore;
            this.logAction(`You quested with ${count} characters for ${totalLore} lore.`);
            this.render();
        }
    },

    addDamage(instanceId, amount) {
        this.saveState();
        let found = this.findCard(instanceId);
        if (!found) return;
        found.card.damage = (found.card.damage || 0) + amount;
        if (found.card.damage < 0) found.card.damage = 0;
        this.render();
    },

    banish(instanceId) {
        this.saveState();
        let found = this.findCard(instanceId);
        if (!found) return;

        const dbCard = this.cardDB[found.card.cardId];

        // Eject characters if this is a location being banished
        if (dbCard.type === 'Location') {
            found.player.field.forEach(c => {
                if (c.locationId === instanceId) c.locationId = null;
            });
        }

        found.player[found.loc].splice(found.idx, 1);

        const cardsToMove = this._unpackStack(found.card);
        cardsToMove.forEach(c => {
            c.damage = 0;
            c.exerted = false;
            c.drying = false;
            c.locationId = null;
            found.player.discard.push(c);
        });

        this.logAction(`${dbCard.name}${cardsToMove.length > 1 ? ` and its stack (${cardsToMove.length} cards)` : ''} was banished.`);
        this.render();
    },

    returnToHand(instanceId) {
        this.saveState();
        let found = this.findCard(instanceId);
        if (!found) return;

        const dbCard = this.cardDB[found.card.cardId];

        // Eject characters if this is a location
        if (dbCard.type === 'Location') {
            found.player.field.forEach(c => {
                if (c.locationId === instanceId) c.locationId = null;
            });
        }

        found.player[found.loc].splice(found.idx, 1);

        // Auto-refresh discard modal if returning a card out of it
        if (found.loc === 'discard' && !document.getElementById('inspect-discard-modal').classList.contains('hidden')) {
            if (this._inspectingDiscardPlayerIndex !== null) {
                this.renderInspectDiscardGrid(this._inspectingDiscardPlayerIndex);
            }
        }

        const cardsToMove = this._unpackStack(found.card);
        cardsToMove.forEach(c => {
            c.damage = 0;
            c.exerted = false;
            c.drying = false;
            c.locationId = null;
            found.player.hand.push(c);
        });

        if (found.loc === 'discard') {
            this.logAction(`Returned ${dbCard.name} from the discard pile to the hand.`);
        }

        this.render();
    },

    // --- Handlers for Location Moving ---

    dropToLocation(ev, locInstanceId) {
        ev.preventDefault();
        ev.stopPropagation(); // Stop normal field drop logic
        const instanceId = ev.dataTransfer.getData("text/plain");
        if (instanceId) {
            this.moveToLocation(instanceId, locInstanceId);
        }
    },

    moveToLocation(charInstanceId, locInstanceId) {
        this.saveState();
        let charFound = this.findCard(charInstanceId);
        let locFound = this.findCard(locInstanceId);
        if (!charFound || !locFound) return;

        const dbCard = this.cardDB[charFound.card.cardId];
        const locDbCard = this.cardDB[locFound.card.cardId];

        // Support playing straight from hand to location
        if (charFound.loc === 'hand') {
            const targetPlayer = locFound.player;
            if (targetPlayer.inkReady >= dbCard.cost) {
                targetPlayer.inkReady -= dbCard.cost;
                // Exert inkwell cards visually
                let inkToExert = dbCard.cost;
                for (let i = 0; i < targetPlayer.inkwell.length && inkToExert > 0; i++) {
                    if (!targetPlayer.inkwell[i].exerted) {
                        targetPlayer.inkwell[i].exerted = true;
                        inkToExert--;
                    }
                }
            }
            charFound.player[charFound.loc].splice(charFound.idx, 1);
            charFound.card.exerted = false;
            charFound.card.drying = (dbCard.type === 'Character'); // Apply drying state
            targetPlayer.field.push(charFound.card);
            charFound.loc = 'field';
            charFound.player = targetPlayer;
        }

        if (charFound.loc === 'field') {
            charFound.card.locationId = locInstanceId;
            this.logAction(`Moved ${dbCard.name} to ${locDbCard.name}.`);
            this.render();
        }
    },

    // --- Handlers for Stacking (Shifting/Putting Under) ---

    dropToStack(ev, targetInstanceId) {
        ev.preventDefault();
        ev.stopPropagation(); // Stop normal field drop logic
        const draggedInstanceId = ev.dataTransfer.getData("text/plain");
        if (draggedInstanceId && draggedInstanceId !== targetInstanceId) {
            this.shiftOnto(draggedInstanceId, targetInstanceId);
        }
    },

    shiftOnto(draggedInstanceId, targetInstanceId) {
        this.saveState();
        let draggedFound = this.findCard(draggedInstanceId);
        let targetFound = this.findCard(targetInstanceId);
        if (!draggedFound || !targetFound) return;

        // Do not allow stacking onto a card that isn't on the field
        if (targetFound.loc !== 'field') return;

        // Both cards must belong to the active player
        if (draggedFound.player.id !== this.state.activePlayer || targetFound.player.id !== this.state.activePlayer) return;

        const dbCard = this.cardDB[draggedFound.card.cardId];

        // If coming from hand, handle ink cost automatically
        if (draggedFound.loc === 'hand') {
            const targetPlayer = draggedFound.player;
            if (targetPlayer.inkReady >= dbCard.cost) {
                targetPlayer.inkReady -= dbCard.cost;
                let inkToExert = dbCard.cost;
                for (let i = 0; i < targetPlayer.inkwell.length && inkToExert > 0; i++) {
                    if (!targetPlayer.inkwell[i].exerted) {
                        targetPlayer.inkwell[i].exerted = true;
                        inkToExert--;
                    }
                }
            }
        }

        // Inherit state from the target card
        draggedFound.card.exerted = targetFound.card.exerted;
        draggedFound.card.damage = targetFound.card.damage;
        draggedFound.card.drying = targetFound.card.drying;
        draggedFound.card.locationId = targetFound.card.locationId;
        draggedFound.card.faceUp = targetFound.card.faceUp;

        if (!draggedFound.card.stackedCards) {
            draggedFound.card.stackedCards = [];
        }

        // Convert target card to a nested object
        draggedFound.card.stackedCards.push({
            cardId: targetFound.card.cardId,
            instanceId: targetFound.card.instanceId,
            faceUp: true
        });

        // Absorb any existing stacked cards from the target
        if (targetFound.card.stackedCards && targetFound.card.stackedCards.length > 0) {
            draggedFound.card.stackedCards.push(...targetFound.card.stackedCards);
        }

        // Replace the target card in the field array with the new dragged card
        const fieldIdx = targetFound.player.field.findIndex(c => c.instanceId === targetInstanceId);
        if (fieldIdx !== -1) {
            targetFound.player.field[fieldIdx] = draggedFound.card;

            // Cleanup original location of dragged card if it wasn't already in the field matching the target index
            if (!(draggedFound.loc === 'field' && draggedFound.idx === fieldIdx)) {
                draggedFound.player[draggedFound.loc].splice(draggedFound.idx, 1);
            }

            draggedFound.loc = 'field';
        }

        this.logAction(`Assigned ${dbCard.name} to stack onto ${this.cardDB[targetFound.card.cardId].name}.`);
        this.render();
    },

    slideUnderFromDeck(targetInstanceId) {
        this.saveState();
        let targetFound = this.findCard(targetInstanceId);
        if (!targetFound || targetFound.loc !== 'field') return;

        const p = targetFound.player;
        if (p.deck.length === 0) return;

        const topCard = p.deck.shift();

        if (!targetFound.card.stackedCards) {
            targetFound.card.stackedCards = [];
        }

        // Add to the stack (facedown usually implied for this mechanic)
        targetFound.card.stackedCards.push({
            cardId: topCard.cardId,
            instanceId: topCard.instanceId,
            faceUp: false
        });

        this.logAction(`Slipped top card of deck underneath ${this.cardDB[targetFound.card.cardId].name}.`);
        this.render();
    },

    unstackCards(targetInstanceId) {
        this.saveState();
        let targetFound = this.findCard(targetInstanceId);
        if (!targetFound || targetFound.loc !== 'field' || !targetFound.card.stackedCards || targetFound.card.stackedCards.length === 0) return;

        const p = targetFound.player;
        const dbCard = this.cardDB[targetFound.card.cardId];

        // Extract copies to push back to field
        const cardsToExtract = targetFound.card.stackedCards.map(sc => {
            return {
                instanceId: sc.instanceId,
                cardId: sc.cardId,
                exerted: true, // enter exerted to be safe if separated
                damage: parseInt(targetFound.card.damage) || 0, // retain damage counters individually
                faceUp: sc.faceUp,
                locationId: targetFound.card.locationId,
                drying: true // enter drying when separated
            };
        });

        // Clear the stack
        targetFound.card.stackedCards = [];

        // Add them back to the field
        cardsToExtract.forEach(c => p.field.push(c));

        this.logAction(`Separated stacked cards beneath ${dbCard.name}.`);
        this.render();
    },

    // --- UI Rendering ---

    getCardImage(dbCard) {
        if (dbCard.images && dbCard.images.thumbnail) return dbCard.images.thumbnail;
        if (dbCard.images && dbCard.images.full) return dbCard.images.full;
        return 'https://deckbuilder.lorcanajson.org/images/card-back.png';
    },

    createCardElement(c, isOpponentHand = false, isInkwell = false) {
        const dbCard = this.cardDB[c.cardId];
        const el = document.createElement('div');
        el.className = `card ${c.exerted ? 'exerted' : ''} ${c.drying ? 'drying' : ''}`;

        // Make draggable
        el.draggable = true;
        el.ondragstart = (e) => this.dragStart(e, c.instanceId);

        if (isOpponentHand || (isInkwell && !c.faceUp)) {
            el.classList.add('card-back');
        } else {
            el.style.backgroundImage = `url('${this.getCardImage(dbCard)}')`;

            // Add Hover Preview Events
            el.addEventListener('mouseenter', () => this.showPreview(dbCard));
            // Mouseleave event removed so the last hovered card stays visible
        }

        // Add Drying Badge
        if (c.drying && !isOpponentHand && (!isInkwell || c.faceUp)) {
            const badge = document.createElement('div');
            badge.className = 'drying-badge';
            badge.innerHTML = '<i class="fa-solid fa-droplet"></i> Drying';
            el.appendChild(badge);
        }

        // Add Damage overlay
        if (c.damage > 0) {
            const dmg = document.createElement('div');
            dmg.className = 'damage-counter';
            dmg.innerText = c.damage;
            el.appendChild(dmg);
        }

        // Add Stack count badge
        if (c.stackedCards && c.stackedCards.length > 0 && !isOpponentHand && (!isInkwell || c.faceUp)) {
            const stackBadge = document.createElement('div');
            stackBadge.className = 'absolute -bottom-2 -right-2 bg-purple-600 border border-white text-white rounded w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg z-20';
            stackBadge.innerText = c.stackedCards.length;
            stackBadge.title = `${c.stackedCards.length} cards stacked underneath`;
            el.appendChild(stackBadge);
        }

        // Context menu trigger
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            this.showContextMenu(e, c.instanceId);
        });

        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, c.instanceId);
        });

        return el;
    },

    showPreview(dbCard) {
        document.getElementById('sidebar-preview-placeholder').classList.add('hidden');
        const preview = document.getElementById('sidebar-preview');
        const imgUrl = (dbCard.images && dbCard.images.full) ? dbCard.images.full : this.getCardImage(dbCard);
        preview.style.backgroundImage = `url('${imgUrl}')`;
        preview.classList.remove('opacity-0');
        preview.classList.add('opacity-100');

        const badge = document.getElementById('preview-ink-container');
        const cost = document.getElementById('preview-ink-cost');
        const hex = document.getElementById('preview-ink-hex');
        const circle = document.getElementById('preview-ink-circle');

        if (dbCard.cost !== undefined && dbCard.cost !== null) {
            badge.classList.remove('opacity-0');
            badge.classList.add('opacity-100');
            cost.innerText = dbCard.cost;

            if (dbCard.inkwell) {
                // Inkable: Golden Circle, Black text
                hex.classList.add('hidden');
                circle.classList.remove('hidden');
                cost.classList.remove('text-white', 'drop-shadow-md');
                cost.classList.add('text-black');
            } else {
                // Uninkable: Dark Hexagon, White text with shadow
                hex.classList.remove('hidden');
                circle.classList.add('hidden');
                cost.classList.remove('text-black');
                cost.classList.add('text-white', 'drop-shadow-md');
            }
        } else {
            badge.classList.remove('opacity-100');
            badge.classList.add('opacity-0');
        }

        // Show Metrics
        const metricsBar = document.getElementById('preview-metrics-bar');
        if (this.abilitiesConfigLoaded) {
            try {
                const m = UnifiedWinProbabiliyCalculation.calculateCardMetrics(dbCard);
                const bcr = m.bcr || 0;
                const rds = m.rds || 0;
                const lvi = m.lvi || 0;
                const ctl = m.ctl !== undefined ? m.ctl : (bcr + rds + lvi);

                document.getElementById('metric-ctl').innerText = ctl.toFixed(2);
                document.getElementById('metric-bcr').innerText = bcr.toFixed(2);
                document.getElementById('metric-rds').innerText = rds.toFixed(2);
                document.getElementById('metric-lvi').innerText = lvi.toFixed(2);

                metricsBar.classList.remove('opacity-0');
                metricsBar.classList.add('opacity-100');
            } catch (e) {
                metricsBar.classList.remove('opacity-100');
                metricsBar.classList.add('opacity-0');
            }
        }
    },

    showContextMenu(e, instanceId) {
        const menu = document.getElementById('context-menu');
        menu.innerHTML = '';

        let found = this.findCard(instanceId);
        if (!found) return;

        const dbCard = this.cardDB[found.card.cardId];
        const isActivePlayerOwned = found.player.id === this.state.activePlayer;

        const addOption = (text, onClick) => {
            const item = document.createElement('div');
            item.className = 'context-item';
            item.innerText = text;
            item.onclick = (evt) => {
                evt.stopPropagation();
                menu.style.display = 'none';
                onClick();
            };
            menu.appendChild(item);
        };

        const addDivider = () => {
            const d = document.createElement('div');
            d.className = 'context-divider';
            menu.appendChild(d);
        };

        // Build menu based on location
        if (found.loc === 'hand') {
            if (isActivePlayerOwned) {
                addOption(`Play Card (-${dbCard.cost} Ink)`, () => this.playCard(instanceId));
                if (dbCard.inkwell) addOption(`Add to Inkwell`, () => this.playToInkwell(instanceId));
                addDivider();
            }
            addOption('Discard Card', () => this.banish(instanceId));
            addOption('Put on Top of Deck', () => this.moveCard(instanceId, 'deck', isActivePlayerOwned ? 'bottom' : 'top', 'top'));
            addOption('Put on Bottom of Deck', () => this.moveCard(instanceId, 'deck', isActivePlayerOwned ? 'bottom' : 'top', 'bottom'));
        } else if (found.loc === 'field') {
            if (found.card.locationId) {
                addOption('Leave Location', () => {
                    this.saveState();
                    found.card.locationId = null;
                    this.render();
                });
                addDivider();
            }
            addOption(found.card.exerted ? 'Ready' : 'Exert', () => this.toggleExert(instanceId));
            // Prevent individual questing if the character is drying
            if (isActivePlayerOwned && !found.card.exerted && !found.card.drying && dbCard.lore > 0) {
                addOption(`Quest (+${dbCard.lore} Lore)`, () => this.quest(instanceId));
            }
            addDivider();
            addOption('Add 1 Damage', () => this.addDamage(instanceId, 1));
            if (found.card.damage > 0) addOption('Remove 1 Damage', () => this.addDamage(instanceId, -1));
            addDivider();
            addOption('Banish (To Discard)', () => this.banish(instanceId));
            addOption('Return to Hand', () => this.returnToHand(instanceId));
            addOption('Put on Top of Deck', () => this.moveCard(instanceId, 'deck', isActivePlayerOwned ? 'bottom' : 'top', 'top'));
            addOption('Put on Bottom of Deck', () => this.moveCard(instanceId, 'deck', isActivePlayerOwned ? 'bottom' : 'top', 'bottom'));
            addDivider();
            if (isActivePlayerOwned) {
                addOption('Put Top Card of Deck Under', () => this.slideUnderFromDeck(instanceId));
                if (found.card.stackedCards && found.card.stackedCards.length > 0) {
                    addOption('Separate Stacked Cards', () => this.unstackCards(instanceId));
                }
            }
        } else if (found.loc === 'inkwell') {
            addOption(found.card.exerted ? 'Ready Ink' : 'Exert Ink', () => this.toggleExert(instanceId));
            addDivider();
            addOption('Return to Hand', () => this.returnToHand(instanceId));
            addOption('Discard', () => this.banish(instanceId));
        } else if (found.loc === 'discard') {
            addOption('Play Card to Field', () => this.playCard(instanceId));
            addOption('Return to Hand', () => this.returnToHand(instanceId));
            addOption('Move to Top of Deck', () => this.moveCard(instanceId, 'deck', isActivePlayerOwned ? 'bottom' : 'top', 'top'));
            addOption('Move to Bottom of Deck', () => this.moveCard(instanceId, 'deck', isActivePlayerOwned ? 'bottom' : 'top', 'bottom'));
        }

        if (menu.children.length > 0) {
            menu.style.display = 'block';
            const rect = menu.getBoundingClientRect();
            let left = e.clientX;
            let top = e.clientY;
            if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 10;
            if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 10;
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
        }
    },

    showDeckContextMenu(e, playerIndex) {
        e.preventDefault();
        e.stopPropagation();

        const menu = document.getElementById('context-menu');
        menu.innerHTML = '';

        const p = this.state.players[playerIndex];

        const addOption = (text, onClick) => {
            const item = document.createElement('div');
            item.className = 'context-item flex items-center gap-2';
            item.innerHTML = text;
            item.onclick = (evt) => {
                evt.stopPropagation();
                menu.style.display = 'none';
                onClick();
            };
            menu.appendChild(item);
        };

        addOption('<i class="fa-solid fa-magnifying-glass text-blue-400"></i> Inspect Deck', () => this.inspectDeck(playerIndex));
        addOption('<i class="fa-solid fa-shuffle text-purple-400"></i> Shuffle Deck', () => this.shuffleDeck(playerIndex));

        if (menu.children.length > 0) {
            menu.style.display = 'block';
            const rect = menu.getBoundingClientRect();
            let left = e.clientX;
            let top = e.clientY;
            if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 10;
            if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 10;
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
        }
    },

    inspectDeck(playerIndex) {
        this._inspectingPlayerIndex = playerIndex;
        const p = this.state.players[playerIndex];
        this._tempDeckOrder = [...p.deck];

        document.getElementById('inspect-deck-title').innerText = `Inspecting ${p.name}'s Deck (${p.deck.length} Cards)`;
        this.renderInspectGrid();
        document.getElementById('inspect-deck-modal').classList.remove('hidden');
    },

    renderInspectGrid() {
        const container = document.getElementById('inspect-deck-grid');
        container.innerHTML = '';

        this._tempDeckOrder.forEach((c, index) => {
            const dbCard = this.cardDB[c.cardId];
            if (!dbCard) return;

            const el = document.createElement('div');
            el.className = `relative rounded-md bg-cover bg-center shadow-md border border-white/10 hover:scale-110 hover:z-10 transition-transform cursor-grab`;
            el.style.width = '100%';
            el.style.aspectRatio = '2.5 / 3.5';
            el.style.backgroundImage = `url('${this.getCardImage(dbCard)}')`;

            // Show sidebar preview when hovered
            el.addEventListener('mouseenter', () => this.showPreview(dbCard));

            // Drag and drop for reordering
            el.draggable = true;
            el.ondragstart = (e) => this.inspectDragStart(e, index);
            el.ondragover = (e) => this.allowDrop(e);
            el.ondrop = (e) => this.inspectDrop(e, index);

            container.appendChild(el);
        });
    },

    inspectDragStart(e, index) {
        e.dataTransfer.setData("text/plain", index.toString());
        e.dataTransfer.effectAllowed = "move";
    },

    inspectDrop(e, targetIndex) {
        e.preventDefault();
        const sourceIndexStr = e.dataTransfer.getData("text/plain");
        if (!sourceIndexStr) return;

        const sourceIndex = parseInt(sourceIndexStr, 10);
        if (sourceIndex === targetIndex) return;

        // Move the card in our temp array
        const [movedCard] = this._tempDeckOrder.splice(sourceIndex, 1);
        this._tempDeckOrder.splice(targetIndex, 0, movedCard);

        // Re-render the grid to show the new order
        this.renderInspectGrid();
    },

    closeInspectDeck() {
        document.getElementById('inspect-deck-modal').classList.add('hidden');
        this._tempDeckOrder = null;
        this._inspectingPlayerIndex = null;
    },

    showDiscardContextMenu(e, playerIndex) {
        e.preventDefault();
        e.stopPropagation();

        const menu = document.getElementById('context-menu');
        menu.innerHTML = '';

        const p = this.state.players[playerIndex];

        const addOption = (text, onClick) => {
            const item = document.createElement('div');
            item.className = 'context-item flex items-center gap-2';
            item.innerHTML = text;
            item.onclick = (evt) => {
                evt.stopPropagation();
                menu.style.display = 'none';
                onClick();
            };
            menu.appendChild(item);
        };

        addOption('<i class="fa-solid fa-magnifying-glass text-blue-400"></i> Inspect Discard Pile', () => this.inspectDiscard(playerIndex));

        if (menu.children.length > 0) {
            menu.style.display = 'block';
            const rect = menu.getBoundingClientRect();
            let left = e.clientX;
            let top = e.clientY;
            if (left + rect.width > window.innerWidth) left = window.innerWidth - rect.width - 10;
            if (top + rect.height > window.innerHeight) top = window.innerHeight - rect.height - 10;
            menu.style.left = left + 'px';
            menu.style.top = top + 'px';
        }
    },

    inspectDiscard(playerIndex) {
        this._inspectingDiscardPlayerIndex = playerIndex;
        const p = this.state.players[playerIndex];
        document.getElementById('inspect-discard-title').innerText = `Inspecting ${p.name}'s Discard Pile (${p.discard.length} Cards)`;
        this.renderInspectDiscardGrid(playerIndex);
        document.getElementById('inspect-discard-modal').classList.remove('hidden');
    },

    renderInspectDiscardGrid(playerIndex) {
        const container = document.getElementById('inspect-discard-grid');
        container.innerHTML = '';

        const p = this.state.players[playerIndex];

        p.discard.forEach(c => {
            const dbCard = this.cardDB[c.cardId];
            if (!dbCard) return;

            const el = document.createElement('div');
            el.className = `relative rounded-md bg-cover bg-center shadow-md border border-white/10 hover:scale-110 hover:z-10 transition-transform`;
            el.style.width = '100%';
            el.style.aspectRatio = '2.5 / 3.5';
            el.style.backgroundImage = `url('${this.getCardImage(dbCard)}')`;

            // Show sidebar preview when hovered
            el.addEventListener('mouseenter', () => this.showPreview(dbCard));

            // Context menu for pulling cards out of discard
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showContextMenu(e, c.instanceId);
            });

            container.appendChild(el);
        });
    },

    closeInspectDiscard() {
        document.getElementById('inspect-discard-modal').classList.add('hidden');
    },

    saveInspectDeck() {
        if (this._inspectingPlayerIndex === null || !this._tempDeckOrder) return;

        this.saveState();

        const p = this.state.players[this._inspectingPlayerIndex];
        p.deck = [...this._tempDeckOrder];

        const timeString = new Date().toLocaleTimeString();
        const name = `Custom deck ordering - ${timeString}`;

        this.logAction(`Saved a custom deck order for ${p.id === this.state.activePlayer ? 'your' : "the opponent's"} deck.`);

        // Keep the color of the current active timeline if there is one
        const bColor = this.state.activeTimelineColor || '#3b82f6';
        const p1 = this.state.players[0];
        const p2 = this.state.players[1];
        const ap = this.state.players[this.state.activePlayer];
        const stats = `Turn ${this.state.turn} | ${ap.name} Active | P1: ${p1.lore} Lore - P2: ${p2.lore} Lore`;
        const newId = this.uuid();

        this.bookmarks.push({
            id: newId,
            parentId: this.state.activeBookmarkId || null,
            name: name,
            stats: stats,
            comment: "Custom arrangement created from Inspect Deck.",
            color: bColor,
            state: JSON.stringify(this.state),
            timestamp: Date.now(),
            isDeckEdit: true
        });

        this.state.activeBookmarkId = newId;

        this.closeInspectDeck();
        this.render();
        this.showToast("Custom Deck Order Saved & Bookmarked!");
    },

    shuffleDeck(playerIndex) {
        this.saveState();
        const p = this.state.players[playerIndex];

        if (p.deck.length > 1) {
            this.shuffle(p.deck);
            this.logAction(`You shuffled ${p.id === this.state.activePlayer ? 'your' : "the opponent's"} deck.`);
        }

        this.render();
    },

    updateLog() {
        const logEl = document.getElementById('game-log');
        logEl.innerHTML = '';

        // Helper to render a comment block
        const renderCommentBlock = (turnNum, playerId) => {
            let comment = this.state.turnComments[`${turnNum}-${playerId}`];
            // Fallback to old format
            if (comment === undefined) {
                comment = this.state.turnComments[turnNum];
            }
            if (!comment || comment.trim() === '') return;

            const pName = this.state.players[playerId] ? this.state.players[playerId].name : 'Player';
            const cNode = document.createElement('div');
            cNode.className = 'text-xs mt-1 mb-2 p-2 bg-black/40 border border-gray-700/50 rounded-lg shadow-inner flex flex-col gap-1 w-11/12 ml-auto';
            cNode.innerHTML = `
                        <div class="flex items-center gap-1.5 text-white/40 text-[10px] uppercase font-bold tracking-wider">
                            <i class="fa-solid fa-book-open"></i> Turn ${turnNum} Notes (${pName})
                        </div>
                        <div class="text-white/80 whitespace-pre-wrap leading-relaxed">${comment}</div>
                    `;
            logEl.appendChild(cNode);
        };

        this.state.log.slice(-30).forEach(entry => {
            const d = document.createElement('div');
            d.className = `text-xs mb-1 ${entry.isSystem ? 'text-gray-500 font-bold' : (entry.player === 0 ? 'text-teal-400' : 'text-orange-400')}`;
            d.innerText = entry.text;
            logEl.appendChild(d);

            // If this is a Turn Begins marker, inject the comment for that turn right after it
            const turnMatch = entry.text.match(/^--- Turn (\d+) Begins ---$/);
            if (turnMatch && entry.isSystem) {
                const turnNum = parseInt(turnMatch[1]);
                renderCommentBlock(turnNum, entry.player);
            }
        });

        // Always ensure the *current* turn's comment is visible at the very bottom 
        // if it wasn't already drawn by the loop (e.g. if the Turn Begins log scrolled off the 30-item slice)
        // We do a quick check to see if the last 30 didn't already contain the marker for the current turn
        const sliceText = this.state.log.slice(-30).map(e => e.text).join('\n');
        if (!sliceText.includes(`--- Turn ${this.state.turn} Begins ---`)) {
            // Try to render it, since it wasn't rendered inline
            renderCommentBlock(this.state.turn, this.state.activePlayer);
        }

        logEl.scrollTop = logEl.scrollHeight;
    },

    updateMetrics() {
        if (!this.abilitiesConfigLoaded) return;

        let p1Bcr = 0, p1Lvi = 0;
        let p2Bcr = 0, p2Lvi = 0;

        // Calculate BCR and LVI for both players based on field
        this.state.players[0].field.forEach(c => {
            const dbCard = this.cardDB[c.cardId];
            if (dbCard && dbCard.fullTextSections) {
                try {
                    const m = UnifiedWinProbabiliyCalculation.calculateCardMetrics(dbCard);
                    p1Bcr += m.bcr || 0;
                    p1Lvi += m.lvi || 0;
                } catch (e) { }
            }
        });

        this.state.players[1].field.forEach(c => {
            const dbCard = this.cardDB[c.cardId];
            if (dbCard && dbCard.fullTextSections) {
                try {
                    const m = UnifiedWinProbabiliyCalculation.calculateCardMetrics(dbCard);
                    p2Bcr += m.bcr || 0;
                    p2Lvi += m.lvi || 0;
                } catch (e) { }
            }
        });

        document.getElementById('bcr-val-p1').innerText = p1Bcr.toFixed(1);
        document.getElementById('bcr-val-p2').innerText = p2Bcr.toFixed(1);
        document.getElementById('lvi-val-p1').innerText = p1Lvi.toFixed(1);
        document.getElementById('lvi-val-p2').innerText = p2Lvi.toFixed(1);

        const totalBcr = p1Bcr + p2Bcr;
        const p1BcrPct = totalBcr > 0 ? (p1Bcr / totalBcr) * 100 : 50;
        const p2BcrPct = 100 - p1BcrPct;

        const totalLvi = p1Lvi + p2Lvi;
        const p1LviPct = totalLvi > 0 ? (p1Lvi / totalLvi) * 100 : 50;
        const p2LviPct = 100 - p1LviPct;

        const bcrP0 = document.getElementById('bcr-p1'); // Technically maps to Player 1 (id=0)
        const bcrP1 = document.getElementById('bcr-p2'); // Technically maps to Player 2 (id=1)

        // If P2 is active (bottom), flip the order of the flex items so P2 is on the left
        const bcrContainer = bcrP0.parentElement;
        if (this.state.activePlayer === 1) {
            bcrContainer.style.flexDirection = 'row-reverse';
        } else {
            bcrContainer.style.flexDirection = 'row';
        }

        bcrP0.style.width = p1BcrPct + '%';
        bcrP1.style.width = p2BcrPct + '%';

        const lviP0 = document.getElementById('lvi-p1');
        const lviP1 = document.getElementById('lvi-p2');

        const lviContainer = lviP0.parentElement;
        if (this.state.activePlayer === 1) {
            lviContainer.style.flexDirection = 'row-reverse';
        } else {
            lviContainer.style.flexDirection = 'row';
        }

        lviP0.style.width = p1LviPct + '%';
        lviP1.style.width = p2LviPct + '%';

        // We also need to flip the text labels underneath
        const bcrValP1 = document.getElementById('bcr-val-p1');
        const bcrValP2 = document.getElementById('bcr-val-p2');
        const lviValP1 = document.getElementById('lvi-val-p1');
        const lviValP2 = document.getElementById('lvi-val-p2');

        if (this.state.activePlayer === 1) {
            bcrValP1.parentElement.style.flexDirection = 'row-reverse';
            lviValP1.parentElement.style.flexDirection = 'row-reverse';
        } else {
            bcrValP1.parentElement.style.flexDirection = 'row';
            lviValP1.parentElement.style.flexDirection = 'row';
        }

        // --- Calculate Hand Potential ---
        let p0Hand = { ctl: 0, bcr: 0, rds: 0, lvi: 0 };
        let p1Hand = { ctl: 0, bcr: 0, rds: 0, lvi: 0 };

        const calcHand = (hand, metricsObj) => {
            hand.forEach(c => {
                const dbCard = this.cardDB[c.cardId];
                if (dbCard && dbCard.fullTextSections) {
                    try {
                        const m = UnifiedWinProbabiliyCalculation.calculateCardMetrics(dbCard);
                        metricsObj.bcr += m.bcr || 0;
                        metricsObj.rds += m.rds || 0;
                        metricsObj.lvi += m.lvi || 0;
                        metricsObj.ctl += m.ctl !== undefined ? m.ctl : ((m.bcr || 0) + (m.rds || 0) + (m.lvi || 0));
                    } catch (e) { }
                }
            });
        };

        calcHand(this.state.players[0].hand, p0Hand);
        calcHand(this.state.players[1].hand, p1Hand);

        // Assign to Active (Bottom) and Inactive (Top)
        const apHand = this.state.activePlayer === 0 ? p0Hand : p1Hand;
        const ipHand = this.state.activePlayer === 0 ? p1Hand : p0Hand;

        document.getElementById('bottom-hand-ctl').innerText = apHand.ctl.toFixed(1);
        document.getElementById('bottom-hand-bcr').innerText = apHand.bcr.toFixed(1);
        document.getElementById('bottom-hand-rds').innerText = apHand.rds.toFixed(1);
        document.getElementById('bottom-hand-lvi').innerText = apHand.lvi.toFixed(1);

        document.getElementById('top-hand-ctl').innerText = ipHand.ctl.toFixed(1);
        document.getElementById('top-hand-bcr').innerText = ipHand.bcr.toFixed(1);
        document.getElementById('top-hand-rds').innerText = ipHand.rds.toFixed(1);
        document.getElementById('top-hand-lvi').innerText = ipHand.lvi.toFixed(1);
    },

    buildField(player, container) {
        container.innerHTML = '';
        const locations = player.field.filter(c => this.cardDB[c.cardId].type === 'Location');
        const charactersAtLocations = player.field.filter(c => c.locationId);
        const independentCards = player.field.filter(c => !c.locationId && this.cardDB[c.cardId].type !== 'Location');

        // Render independent cards
        independentCards.forEach(c => {
            const group = document.createElement('div');
            group.className = 'relative inline-block m-1 group transition-all drop-zone rounded';

            group.ondragover = (e) => { e.preventDefault(); e.stopPropagation(); group.classList.add('drop-target-active'); };
            group.ondragleave = (e) => { e.preventDefault(); e.stopPropagation(); group.classList.remove('drop-target-active'); };
            group.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                group.classList.remove('drop-target-active');
                this.dropToStack(e, c.instanceId);
            };

            // Render stacked cards behind first
            if (c.stackedCards && c.stackedCards.length > 0) {
                c.stackedCards.forEach((sc, idx) => {
                    const scEl = this.createCardElement(sc, !sc.faceUp);
                    scEl.style.position = 'absolute';
                    scEl.style.left = `-${(idx + 1) * 4}px`;
                    scEl.style.top = `-${(idx + 1) * 4}px`;
                    scEl.style.zIndex = -1 - idx;
                    scEl.style.pointerEvents = 'none';
                    group.appendChild(scEl);
                });
            }

            // Render main card on top
            const mainEl = this.createCardElement(c);
            group.appendChild(mainEl);

            container.appendChild(group);
        });

        // Render locations with their stacked characters
        locations.forEach(loc => {
            const group = document.createElement('div');
            group.className = 'relative flex flex-col items-center mx-2 group p-2 rounded border border-transparent transition-all';

            // Drop target logic for adding characters to this location
            group.ondragover = (e) => { e.preventDefault(); e.stopPropagation(); group.classList.add('bg-white/10', 'border-white/30'); };
            group.ondragleave = (e) => { e.preventDefault(); e.stopPropagation(); group.classList.remove('bg-white/10', 'border-white/30'); };
            group.ondrop = (e) => {
                e.preventDefault();
                e.stopPropagation();
                group.classList.remove('bg-white/10', 'border-white/30');
                this.dropToLocation(e, loc.instanceId);
            };

            const charsHere = charactersAtLocations.filter(c => c.locationId === loc.instanceId);

            if (charsHere.length > 0) {
                const charContainer = document.createElement('div');
                charContainer.className = 'flex flex-wrap justify-center gap-2 z-10 relative mb-[-40px] pointer-events-none';
                charsHere.forEach(c => {
                    const el = this.createCardElement(c);
                    el.style.pointerEvents = 'auto'; // Re-enable hover and drag for the characters
                    el.classList.add('scale-90', 'hover:scale-95', 'shadow-[0_10px_15px_rgba(0,0,0,0.8)]');
                    charContainer.appendChild(el);
                });
                group.appendChild(charContainer);
            }

            const locEl = this.createCardElement(loc);
            group.appendChild(locEl);

            container.appendChild(group);
        });
    },

    render() {
        const ap = this.state.players[this.state.activePlayer];
        const ip = this.state.players[this.state.inactivePlayer];

        // Update Sidebar Names
        document.getElementById('p0-name').innerText = this.localPlayerRole === 1 ? "Player 1 (You)" : "Player 1";
        document.getElementById('p1-name').innerText = this.localPlayerRole === 2 ? "Player 2 (You)" : "Player 2";

        // Update Sidebar
        document.getElementById('p0-cards').innerText = `${this.state.players[0].deck.length} deck | ${this.state.players[0].hand.length} hand`;
        document.getElementById('p1-cards').innerText = `${this.state.players[1].deck.length} deck | ${this.state.players[1].hand.length} hand`;

        // Highlight active player badge
        document.getElementById('p0-badge').className = `py-1 px-2 rounded bg-gray-800 text-sm mb-1 border-l-2 border-orange-500 flex justify-between ${this.state.activePlayer === 0 ? 'text-white shadow-inner bg-gray-700' : 'text-gray-400'}`;
        document.getElementById('p1-badge').className = `py-1 px-2 rounded bg-gray-800 text-sm border-l-2 border-purple-500 flex justify-between ${this.state.activePlayer === 1 ? 'text-white shadow-inner bg-gray-700' : 'text-gray-400'}`;

        // Quest Count & Mulligan Visibility
        let readyLoreChars = 0;
        // Update quest counter to exclude drying characters
        ap.field.forEach(c => { if (!c.exerted && !c.drying && this.cardDB[c.cardId].lore > 0) readyLoreChars++; });
        document.getElementById('quest-count').innerText = readyLoreChars;

        const mulliganBtn = document.getElementById('mulligan-btn');
        if (this.state.turn === 1 && !ap.hasMulliganed) {
            mulliganBtn.classList.remove('hidden');
        } else {
            mulliganBtn.classList.add('hidden');
        }

        this.updateLog();
        this.updateMetrics();

        // Update Timeline Board Divider Color
        const divider = document.getElementById('board-divider');
        if (divider) {
            if (this.state.activeTimelineColor) {
                divider.style.backgroundColor = this.state.activeTimelineColor;
                divider.style.boxShadow = `0 0 15px ${this.state.activeTimelineColor}`;
                divider.classList.remove('opacity-0');
                divider.classList.add('opacity-80');
            } else {
                divider.style.backgroundColor = 'transparent';
                divider.style.boxShadow = 'none';
                divider.classList.add('opacity-0');
                divider.classList.remove('opacity-80');
            }
        }

        // Apply Player Identity Colors dynamically to Top and Bottom Boards
        // P1 (id=0) is Orange (#a86b32), P2 (id=1) is Purple (#3f2e70)
        const topBoard = document.getElementById('top-board');
        const bottomBoard = document.getElementById('bottom-board');

        // Remove existing
        topBoard.classList.remove('bg-[#a86b32]', 'bg-[#3f2e70]');
        bottomBoard.classList.remove('bg-[#a86b32]', 'bg-[#3f2e70]');

        // Add based on who is playing
        topBoard.classList.add(ip.id === 0 ? 'bg-[#a86b32]' : 'bg-[#3f2e70]');
        bottomBoard.classList.add(ap.id === 0 ? 'bg-[#a86b32]' : 'bg-[#3f2e70]');

        // --- TOP BOARD (Inactive Player) ---
        document.getElementById('top-player-bg-text').innerText = `P${ip.id + 1}`;
        document.getElementById('top-lore').innerText = ip.lore;
        document.getElementById('top-ink').innerText = `${ip.inkReady}/${ip.inkTotal}`;
        document.getElementById('top-deck-count').innerText = ip.deck.length;

        // Note: Reveal button state is handled dynamically by setHandReveal to prevent animation stuttering
        // Top Hand (Hidden by default unless currently held down)
        const th = document.getElementById('top-hand');
        th.innerHTML = '';
        // Ensure base transition classes are on the container
        th.classList.add('transition-all', 'duration-300', 'ease-in-out');

        if (this.state.opponentHandRevealed) {
            th.classList.add('translate-y-[120px]', 'scale-[1.1]', 'z-50');
            th.classList.remove('scale-[0.85]');
        } else {
            th.classList.remove('translate-y-[120px]', 'scale-[1.1]', 'z-50');
            th.classList.add('scale-[0.85]');
        }
        // --- 2 PLAYER VISION SCRIPT ---
        const myPlayerIndex = this.localPlayerRole - 1; // 0 for P1, 1 for P2

        // Hide the "Hold to Reveal" button if standard perspective is locked and it's not our perspective to look at
        const revealBtn = document.getElementById('reveal-icon').parentElement;
        if (this.roomId && ip.id === myPlayerIndex) {
            revealBtn.style.display = 'none';
        } else {
            revealBtn.style.display = 'flex';
        }

        const isTopHandMine = (ip.id === myPlayerIndex);
        const hideTopHandFaces = (!isTopHandMine && !this.state.opponentHandRevealed);

        ip.hand.forEach(c => th.appendChild(this.createCardElement(c, hideTopHandFaces)));

        // Top Field
        const tf = document.getElementById('top-field');
        this.buildField(ip, tf);

        // Top Inkwell
        const ti = document.getElementById('top-inkwell-cards');
        ti.innerHTML = '';
        ip.inkwell.forEach((c, i) => {
            const el = this.createCardElement(c, false, true);
            el.style.position = 'absolute';
            el.style.left = (i * 20) + 'px';
            el.style.top = '0px';
            ti.appendChild(el);
        });

        // Top Discard
        const td = document.getElementById('top-discard');
        td.innerHTML = '<span class="absolute inset-0 flex items-center justify-center text-gray-400 text-xs font-bold pointer-events-none">DISCARD</span>';
        ip.discard.forEach((c, i) => {
            const el = this.createCardElement(c);
            el.style.position = 'absolute';
            el.style.left = Math.min(i * 3, 30) + 'px';
            el.style.top = Math.min(i * 3, 30) + 'px';
            el.style.zIndex = i;
            td.appendChild(el);
        });

        // --- BOTTOM BOARD (Active Player) ---
        document.getElementById('bottom-player-bg-text').innerText = `P${ap.id + 1}`;
        document.getElementById('bottom-lore').innerText = ap.lore;
        document.getElementById('bottom-ink').innerText = `${ap.inkReady}/${ap.inkTotal}`;
        document.getElementById('bottom-deck-count').innerText = ap.deck.length;

        // Turn Comment Box Update
        document.getElementById('turn-comment-header-num').innerText = this.state.turn;
        const commentBox = document.getElementById('active-turn-comment');
        // Only update value if it's not currently focused to prevent overriding what the user is typing 
        // if a render happens in the background (e.g. they typed something then dragged a card without blurring)
        if (document.activeElement !== commentBox) {
            let comment = this.state.turnComments[`${this.state.turn}-${ap.id}`];
            if (comment === undefined) {
                comment = this.state.turnComments[this.state.turn]; // fallback
            }
            commentBox.value = comment || '';
        }

        // Bottom Hand (Visible)
        const bh = document.getElementById('bottom-hand');
        bh.innerHTML = '';

        const isBottomHandMine = (ap.id === myPlayerIndex);
        const hideBottomHandFaces = !isBottomHandMine; // Always hide bottom hand faces if it's not our role

        ap.hand.forEach(c => bh.appendChild(this.createCardElement(c, hideBottomHandFaces)));

        // Bottom Field
        const bf = document.getElementById('bottom-field');
        this.buildField(ap, bf);

        // Bottom Inkwell
        const bi = document.getElementById('bottom-inkwell-cards');
        bi.innerHTML = '';
        ap.inkwell.forEach((c, i) => {
            const el = this.createCardElement(c, false, true);
            el.style.position = 'absolute';
            el.style.left = (i * 20) + 'px';
            el.style.top = '0px';
            bi.appendChild(el);
        });

        // Bottom Discard
        const bd = document.getElementById('bottom-discard');
        bd.innerHTML = '<span class="absolute inset-0 flex items-center justify-center text-gray-400 text-xs font-bold pointer-events-none">DISCARD</span>';
        ap.discard.forEach((c, i) => {
            const el = this.createCardElement(c);
            el.style.position = 'absolute';
            el.style.left = Math.min(i * 3, 30) + 'px';
            el.style.top = Math.min(i * 3, 30) + 'px';
            el.style.zIndex = i;
            bd.appendChild(el);
        });
    }
};

// Close context menu on external click
document.addEventListener('click', () => {
    document.getElementById('context-menu').style.display = 'none';
});

// Init App on load
window.onload = () => App.init();