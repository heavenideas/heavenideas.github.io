import DataManager from "./data-manager.js";

async function testCardLoading() {
    const dataManager = new DataManager();
    console.log("Attempting to load card data...");
    const success = await dataManager.loadCardData();
    if (success) {
        console.log("Card data loaded successfully in Node.js environment.");
        const testCardName = "Be Prepared";
        const card = dataManager.findCard(testCardName);
        if (card) {
            console.log(`Found card '${testCardName}':`, card);
        } else {
            console.log(`Card '${testCardName}' not found.`);
        }

        const testDecklist = [
            "4 Be Prepared",
            "4 Vision of the Future",
            "4 How Far I'll Go",
            "4 Tipo - Growing Son",
            "4 Develop Your Brain",
            "4 Pawpsicle",
            "4 Sail The Azurite Sea",
            "4 Maui - Half-Shark",
            "4 A Pirate's Life",
            "4 McDuck Manor - Scrooge's Mansion",
            "4 Maui - Hero to All",
            "4 Gramma Tala - Keeper of Ancient Stories",
            "4 Tamatoa - Happy as a Clam",
            "2 Sisu - Empowered Sibling",
            "4 Goofy - Super Goof",
            "2 Hades - Infernal Schemer"
        ];

        console.log("Testing decklist parsing:");
        const DeckParser = (await import('./deck-parser.js')).default;
        const deckParser = new DeckParser(dataManager);
        const parsedDeck = deckParser.parseDeckList(testDecklist.join('\n'));
        console.log("Parsed Deck:", parsedDeck);
        const validationResult = deckParser.validateDeck(parsedDeck);
        console.log("Validation Result:", validationResult);

    } else {
        console.error("Failed to load card data in Node.js environment.");
    }
}

testCardLoading();


