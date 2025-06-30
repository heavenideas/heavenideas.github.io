class DataManager {
    constructor() {
        this.cardDatabase = null;
        this.cardIndex = new Map();
        this.isLoaded = false;
    }

    async loadCardData() {
        try {
            const response = await fetch("https://raw.githubusercontent.com/heavenideas/similcana/refs/heads/main/database/allCards.json");
            this.cardDatabase = await response.json();
            this.buildCardIndex();
            this.isLoaded = true;
            return true;
        } catch (error) {
            console.error("Failed to load card data:", error);
            return false;
        }
    }

    buildCardIndex() {
        this.cardDatabase.cards.forEach(card => {
            const normalizedName = card.name.toLowerCase().replace(/[^a-z0-9]/g, "");
            this.cardIndex.set(normalizedName, card);

            if (card.fullName) {
                const normalizedFullName = card.fullName.toLowerCase().replace(/[^a-z0-9]/g, "");
                this.cardIndex.set(normalizedFullName, card);
            }
            
            if (card.variants) {
                card.variants.forEach(variant => {
                    const normalizedVariant = variant.toLowerCase().replace(/[^a-z0-9]/g, "");
                    this.cardIndex.set(normalizedVariant, card);
                });
            }
        });
    }

    findCard(cardName) {
        const normalizedCardName = cardName.toLowerCase().replace(/[^a-z0-9]/g, "");
        return this.cardIndex.get(normalizedCardName);
    }

    getCardsByType(type) {
        return this.cardDatabase.cards.filter(card => card.type === type);
    }

    getCardsByColor(color) {
        return this.cardDatabase.cards.filter(card => card.color === color);
    }
}

export default DataManager;


