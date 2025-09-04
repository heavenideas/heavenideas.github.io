/**
 * Lorcana Game Module
 * A modular implementation of Disney Lorcana game logic
 * Designed to be easily extensible for future game mechanics
 */

// Global card database
let REAL_CARDS = [];

/**
 * Initialize the card database
 * @param {Array} cards - Array of card data
 */
export function setCardDatabase(cards) {
    REAL_CARDS = cards;
    console.log(`Loaded ${REAL_CARDS.length} cards into game module.`);
}

/**
 * Card class representing a Lorcana card
 */
export class Card {
    constructor(data) {
        this.id = data.id;
        this.fullName = data.fullName;
        this.cost = data.cost || 0;
        this.type = data.type;
        this.strength = data.strength;
        this.willpower = data.willpower;
        this.lore = data.lore;
        this.inkable = data.inkwell || false;
        this.image = (data.images && data.images.thumbnail) ? data.images.thumbnail : `https://placehold.co/100x140/2d3748/e2e8f0?text=${data.type}`;

        // Game state properties
        this.exhausted = false;
        this.summoningSickness = false;
        this.damage = 0;
    }
}

/**
 * Player class representing a game participant
 */
export class Player {
    constructor(playerNumber, deck, isHuman = false) {
        this.playerNumber = playerNumber;
        this.deck = [...deck];
        this.hand = [];
        this.discard = [];
        this.characters = [];
        this.items = [];
        this.locations = [];
        this.inkwell = [];
        this.lore = 0;
        this.turnInked = false;
        this.isHuman = isHuman;
    }

    /**
     * Shuffle the player's deck
     */
    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    /**
     * Draw initial hand (7 cards)
     */
    drawInitialHand() {
        this.draw(7);
    }

    /**
     * Draw a specified number of cards
     * @param {number} count - Number of cards to draw
     */
    draw(count) {
        for (let i = 0; i < count && this.deck.length > 0; i++) {
            this.hand.push(this.deck.pop());
        }
    }

    /**
     * Check if player can afford a card
     * @param {Card} card - Card to check cost for
     * @returns {boolean} Whether the card can be afforded
     */
    canAffordCard(card) {
        return this.getAvailableInk() >= card.cost;
    }

    /**
     * Get available ink (unexhausted cards in inkwell)
     * @returns {number} Available ink amount
     */
    getAvailableInk() {
        return this.inkwell.filter(card => !card.exhausted).length;
    }

    /**
     * Pay ink cost for a card
     * @param {number} cost - Cost to pay
     */
    payInkCost(cost) {
        let remaining = cost;
        for (let card of this.inkwell) {
            if (!card.exhausted && remaining > 0) {
                card.exhausted = true;
                remaining--;
            }
        }
    }

    /**
     * Ready all cards at the start of turn
     */
    readyAllCards() {
        this.turnInked = false;
        [...this.characters, ...this.items, ...this.inkwell].forEach(card => {
            card.exhausted = false;
            if (card.summoningSickness !== undefined) card.summoningSickness = false;
        });
    }

    /**
     * Get public state for game serialization
     * @returns {Object} Public player state
     */
    getPublicState() {
        return {
            playerNumber: this.playerNumber,
            handSize: this.hand.length,
            deckSize: this.deck.length,
            inkwellSize: this.inkwell.length,
            lore: this.lore,
            characters: this.characters.map(c => ({...c})),
            hand: this.hand.map(c => ({...c})),
        };
    }
}

/**
 * Main game class for Lorcana matches
 */
export class LorcanaSimGame {
    constructor() {
        this.players = [];
        this.currentPlayer = 0;
        this.turnNumber = 1;
        this.gameState = 'setup'; // setup, playing, ended
        this.winner = null;
        this.gameLog = [];
        this.boardStates = [];

        // Extensibility hooks
        this.onGameStart = null;
        this.onTurnStart = null;
        this.onTurnEnd = null;
        this.onGameEnd = null;
        this.onCardPlayed = null;
        this.onCardChallenged = null;
    }

    /**
     * Initialize a new game
     * @param {Array} player1DeckIds - Player 1's deck card IDs
     * @param {Array} player2DeckIds - Player 2's deck card IDs
     */
    initGame(player1DeckIds, player2DeckIds) {
        if (REAL_CARDS.length === 0) {
            throw new Error("Card database not loaded. Call setCardDatabase() first.");
        }

        const player1Deck = this.createDeckFromIds(player1DeckIds);
        const player2Deck = this.createDeckFromIds(player2DeckIds);

        if (player1Deck.length < 1 || player2Deck.length < 1) {
            throw new Error("Decks must not be empty.");
        }

        this.players = [
            new Player(1, player1Deck, false),
            new Player(2, player2Deck, false)
        ];

        this.players.forEach(player => {
            player.shuffleDeck();
            player.drawInitialHand();
        });

        this.gameState = 'playing';
        this.currentPlayer = 0;
        this.log({ message: 'Game started!' });

        // Trigger extensibility hook
        if (this.onGameStart) {
            this.onGameStart(this);
        }
    }

    /**
     * Create deck from card IDs
     * @param {Array} cardIds - Array of card IDs
     * @returns {Array} Array of Card objects
     */
    createDeckFromIds(cardIds) {
        const deck = [];
        cardIds.forEach(id => {
            const cardData = REAL_CARDS.find(card => card.id === id);
            if (cardData) {
                deck.push(new Card(JSON.parse(JSON.stringify(cardData))));
            }
        });
        return deck;
    }

    /**
     * Get current player
     * @returns {Player} Current player
     */
    getCurrentPlayer() {
        return this.players[this.currentPlayer];
    }

    /**
     * Get opponent player
     * @returns {Player} Opponent player
     */
    getOpponentPlayer() {
        return this.players[1 - this.currentPlayer];
    }

    /**
     * End current player's turn
     */
    endTurn() {
        const player = this.getCurrentPlayer();
        this.log({ message: `Player ${player.playerNumber} ends their turn.` });

        this.currentPlayer = 1 - this.currentPlayer;
        const newPlayer = this.getCurrentPlayer();

        if (this.currentPlayer === 0) {
            this.turnNumber++;
        }

        newPlayer.readyAllCards();
        newPlayer.draw(1);

        this.log({ message: `Turn ${this.turnNumber} - Player ${newPlayer.playerNumber}'s turn`});

        // Trigger extensibility hook
        if (this.onTurnStart) {
            this.onTurnStart(this, newPlayer);
        }

        this.checkWinCondition();
    }

    /**
     * Check if game has ended
     * @returns {boolean} Whether game ended
     */
    checkWinCondition() {
        for (let player of this.players) {
            if (player.lore >= 20) {
                this.gameState = 'ended';
                this.winner = player.playerNumber;
                this.log({ message: `Player ${player.playerNumber} wins with ${player.lore} lore!`});

                // Trigger extensibility hook
                if (this.onGameEnd) {
                    this.onGameEnd(this, player);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Play a card from hand
     * @param {number} cardIndex - Index of card in hand
     * @returns {boolean} Whether play was successful
     */
    playCard(cardIndex) {
        const player = this.getCurrentPlayer();
        const card = player.hand[cardIndex];
        if (!card || !player.canAffordCard(card)) return false;

        player.payInkCost(card.cost);
        player.hand.splice(cardIndex, 1);

        switch (card.type) {
            case 'Character':
                player.characters.push(card);
                card.summoningSickness = true;
                break;
            case 'Item':
                player.items.push(card);
                break;
            default:
                player.discard.push(card);
                break;
        }

        this.log({ message: `Player ${player.playerNumber} plays`, card: card });

        // Trigger extensibility hook
        if (this.onCardPlayed) {
            this.onCardPlayed(this, player, card);
        }

        return true;
    }

    /**
     * Quest with a character
     * @param {number} characterIndex - Index of character
     * @returns {boolean} Whether quest was successful
     */
    questWithCharacter(characterIndex) {
        const player = this.getCurrentPlayer();
        const character = player.characters[characterIndex];
        if (!character || character.exhausted || character.summoningSickness) return false;

        character.exhausted = true;
        const loreGained = character.lore || 0;
        player.lore += loreGained;
        this.log({ message: `Player ${player.playerNumber} quests for ${loreGained} lore with`, card: character});
        this.checkWinCondition();
        return true;
    }

    /**
     * Challenge one character with another
     * @param {number} attackerIndex - Attacking character index
     * @param {number} targetIndex - Target character index
     * @returns {boolean} Whether challenge was successful
     */
    challengeCharacter(attackerIndex, targetIndex) {
        const player = this.getCurrentPlayer();
        const opponent = this.getOpponentPlayer();
        const attacker = player.characters[attackerIndex];
        const target = opponent.characters[targetIndex];
        if (!attacker || !target || attacker.exhausted || attacker.summoningSickness) return false;

        attacker.exhausted = true;
        attacker.damage += target.strength || 0;
        target.damage += attacker.strength || 0;
        this.log({ message: `Player ${player.playerNumber} challenges`, card: attacker, targetCard: target });

        // Trigger extensibility hook
        if (this.onCardChallenged) {
            this.onCardChallenged(this, player, attacker, target);
        }

        this.checkBanishedCharacters();
        return true;
    }

    /**
     * Check for and remove banished characters
     */
    checkBanishedCharacters() {
        this.players.forEach(player => {
            for (let i = player.characters.length - 1; i >= 0; i--) {
                const character = player.characters[i];
                if (character.damage >= character.willpower) {
                    player.characters.splice(i, 1);
                    player.discard.push(character);
                    this.log({ message: `Player ${player.playerNumber}'s ${character.fullName} is banished` });
                }
            }
        });
    }

    /**
     * Ink a card from hand
     * @param {number} cardIndex - Index of card in hand
     * @returns {boolean} Whether inking was successful
     */
    inkCard(cardIndex) {
        const player = this.getCurrentPlayer();
        const card = player.hand[cardIndex];
        if (!card || !card.inkable) return false;

        player.hand.splice(cardIndex, 1);
        player.inkwell.push(card);
        this.log({ message: `Player ${player.playerNumber} inks`, card: card});
        return true;
    }

    /**
     * Generate possible moves for AI
     * @param {Player} player - Player to generate moves for
     * @param {Player} opponent - Opponent player
     * @returns {Array} Array of possible moves
     */
    generatePossibleMoves(player, opponent) {
        const moves = [];

        // Ink a card (high priority early game)
        if (player.turnInked === false) {
            for (let i = 0; i < player.hand.length; i++) {
                if (player.hand[i].inkable) {
                    moves.push({ type: 'ink', cardIndex: i, priority: 1000 - (player.inkwell.length * 100) });
                }
            }
        }

        // Play cards
        player.hand.forEach((card, i) => {
            if (player.canAffordCard(card)) {
                moves.push({ type: 'play', cardIndex: i, priority: 60 + (card.cost * 5) });
            }
        });

        // Challenge
        player.characters.forEach((attacker, attIdx) => {
            if (!attacker.exhausted && !attacker.summoningSickness && attacker.strength > 0) {
                opponent.characters.forEach((target, tarIdx) => {
                    if (target.exhausted) {
                        moves.push({ type: 'challenge', attackerIndex: attIdx, targetIndex: tarIdx, priority: 80 + (target.lore * 20) });
                    }
                });
            }
        });

        // Quest
        player.characters.forEach((char, i) => {
            if (!char.exhausted && !char.summoningSickness && char.lore > 0) {
                moves.push({ type: 'quest', characterIndex: i, priority: 70 + (char.lore * 10) });
            }
        });

        moves.push({ type: 'endTurn', priority: 1 });
        return moves.sort((a, b) => b.priority - a.priority);
    }

    /**
     * Make AI move
     */
    makeAIMove() {
        if (this.gameState !== 'playing') return;
        const player = this.getCurrentPlayer();
        const opponent = this.getOpponentPlayer();
        const moves = this.generatePossibleMoves(player, opponent);

        if (moves.length > 0) {
            this.executeMove(moves[0]);
        } else {
            this.endTurn();
        }
    }

    /**
     * Execute a move
     * @param {Object} move - Move to execute
     */
    executeMove(move) {
        switch (move.type) {
            case 'play': this.playCard(move.cardIndex); break;
            case 'quest': this.questWithCharacter(move.characterIndex); break;
            case 'challenge': this.challengeCharacter(move.attackerIndex, move.targetIndex); break;
            case 'ink':
                this.inkCard(move.cardIndex);
                this.getCurrentPlayer().turnInked = true;
                break;
            case 'endTurn': this.endTurn(); break;
        }
    }

    /**
     * Log a game event
     * @param {Object} logObject - Log entry
     */
    log(logObject) {
        this.gameLog.push(logObject);
        this.boardStates.push(this.getGameStateWithoutLog());
    }

    /**
     * Get game state without log (for board states)
     * @returns {Object} Game state snapshot
     */
    getGameStateWithoutLog() {
        return {
            players: this.players.map(p => p.getPublicState()),
            currentPlayer: this.currentPlayer,
            turnNumber: this.turnNumber,
            gameState: this.gameState,
            winner: this.winner
        };
    }

    /**
     * Get complete game state
     * @returns {Object} Full game state
     */
    getGameState() {
        return {
            players: this.players.map(p => p.getPublicState()),
            currentPlayer: this.currentPlayer,
            turnNumber: this.turnNumber,
            gameState: this.gameState,
            winner: this.winner,
            gameLog: [...this.gameLog]
        };
    }

    /**
     * Load game from saved state
     * @param {Object} savedState - Saved game state
     */
    loadFromState(savedState) {
        this.players = savedState.players.map(p => {
            const player = new Player(p.playerNumber, [], false);
            player.lore = p.lore;
            player.characters = p.characters.map(c => new Card(c));
            player.hand = p.hand.map(c => new Card(c));
            player.deck = []; // Empty deck for loaded games
            player.discard = [];
            player.inkwell = [];
            player.turnInked = false;
            return player;
        });
        this.currentPlayer = savedState.currentPlayer;
        this.turnNumber = savedState.turnNumber;
        this.gameState = savedState.gameState;
        this.winner = savedState.winner;
        this.gameLog = savedState.gameLog;
        this.boardStates = savedState.boardStates || [];
    }
}

// Export convenience functions for common operations
export const GameUtils = {
    /**
     * Create a deck from card name strings
     * @param {Array} cardNames - Array of card names
     * @param {Map} cardNameMap - Map of card names to IDs
     * @returns {Array} Array of card IDs
     */
    createDeckFromNames(cardNames, cardNameMap) {
        const ids = [];
        cardNames.forEach(name => {
            if (cardNameMap.has(name)) {
                ids.push(cardNameMap.get(name));
            }
        });
        return ids;
    },

    /**
     * Parse decklist text into card IDs
     * @param {string} decklistText - Decklist text
     * @param {Map} cardNameMap - Map of card names to IDs
     * @returns {Array|null} Array of card IDs or null if errors
     */
    parseDecklist(decklistText, cardNameMap) {
        const lines = decklistText.trim().split('\n');
        const ids = [];
        const errors = [];

        for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            const match = trimmedLine.match(/^(?:(\d+)\s*x?\s+)?(.+)/i);
            if (!match) continue;

            const count = match[1] ? parseInt(match[1], 10) : 1;
            const cardName = match[2].trim();

            if (cardNameMap.has(cardName)) {
                const cardId = cardNameMap.get(cardName);
                for (let i = 0; i < count; i++) {
                    ids.push(cardId);
                }
            } else {
                errors.push(cardName);
            }
        }

        if (errors.length > 0) {
            throw new Error(`Could not find the following cards: ${errors.join(', ')}`);
        }

        return ids;
    }
};