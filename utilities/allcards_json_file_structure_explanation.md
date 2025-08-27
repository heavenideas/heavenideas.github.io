# Explanation for the JSON file allCards.json

## Where it can be accessed

- `https://raw.githubusercontent.com/heavenideas/similcana/refs/heads/main/database/allCards.json`

## Main Structure of the json file

- **allCards.json** contains data on all the cards that have been released for Disney Lorcana. It consists of these fields:
    - **metadata**: Contains the same metadata fields as in metadata.json, as described above
    - **sets**: A dictionary with set data. There is a key for each set code, and the values are the same set data as described above for the set-specific datafiles (except the `code` field isn't here, since it's already the key of the dictionary, and there's no `cards` field here since there's already a general card list)
    - **cards**: A list of card objects. The fields of each card object are described in the next section

# Card data fields explanation

The `allCards.json` file and all the set files have a `cards` field, which contains a list of card objects.

This section describes the v2 format version. For the old deprecated v1 format version fields, [click here](https://lorcanajson.org/cardExplanations_formatV1.html)

Each of those card objects consists of the following fields:

- **abilities**: A list of abilities of a Character, Location, or Item card. For cards without abilities, this field doesn't exist. Each ability entry is a dictionary containing (some of) the following fields:
    - **fullText** contains the entire ability text as printed on the card, including newline characters
    - **type** indicates what type of ability this is, one of 'activated' (pay cost to activate effect), 'keyword' (prenamed abilities), 'static' (always active), or 'triggered' (activated on certain events)
    - 'keyword'-type abilities are prenamed abilities, and ability entries with this type have the following extra fields:
        - **keyword** contains the name of the ability's keyword ('Ward', 'Resist', etc.)
        - **keywordValue** contains the 'value' part of a keyword, so for 'Resist +1', this field would contain the '+1' part. For abilities like 'Shift: Discard an Action card', this field contains the part after the colon
        - **keywordValueNumber** contains the numeric part of the `keywordValue`, if it is numeric. So for 'Resist +1', this would be 1
        - **reminderText** contains just the reminder text of a keyword ability, so the part between brackets. Most but not all cards with keyword abilities have reminder text for those keywords
    - Other types of abilities are named abilities, and they have the following extra fields:
        - **effect** is the text of what the ability actually does
        - **name** is the name of the ability, shown at the start of the ability in a distinct label
        - 'activated'-type abilities are abilities that require you to actively pay a cost (exerting, paying ink, etc.) before the effect fires. Ability entries with this type have the following extra fields:
            - **costs** is a list of each separate cost that needs to be paid to be able to activate this ability
            - **costsText** is the costs as a single string
- **allowedInFormats**: This dictionary has for each official Constructed format (Currently "Core" and "Infinity") data on whether this card is allowed in official tournaments, whether it's banned, and when it rotates out if it does. Available fields are:
    - **allowed**: A boolean indicating whether this card is allowed to be used in official tournaments in this format
    - **allowedUntilDate**: If a date is known when this card rotates out of this format, or if this card was banned, this field exists and is set to the date until when the card was or is allowed to be used. If no date is known, this field doesn't exist
    - **bannedSinceDate**: If this card has been banned in this format, this field is set to the date when the ban took or takes effect. If this card has not been banned in this format, this field doesn't exist
- **allowedInTournamentsFromDate**: A date string saying from when this card was or will be allowed to be used in official tournaments. If that date isn't known, or if the card isn't allowed in any official tournaments, this field is set to 'null'
- **artists**: A list of the name(s) of the artist(s) that drew the art for this card. This will usually contain just one entry, but some cards have multiple artists. See also the `artistsText` field
- **artistsText**: The artist(s) that drew the card as it's printed on the bottom left of the card. See also the `artists` field
- **~~bannedSince~~**: Very rarely, Ravensburger bans certain cards from Constructed tournaments. If this card has been banned, this field exists and is set to the date when the ban went or will go into effect. Note that this means they're banned specifically in official Constructed tournaments, and the card can still be used in Sealed and Draft events. For cards that haven't been banned, this field doesn't exist  
    **_Note_**: This field was removed in format version 2.2.0, see `allowedInFormats` for its replacement
- **baseId**: Special-, Epic-, Enchanted-, or Iconic-rarity cards are based on cards that fall within the normal 204-number scheme. Cards with one of these rarities have this `baseId` field set containing the ID of their normal base equivalent. Cards that don't have one of these rarities don't have this field set. See also the `epicId`, `enchantedId`, `iconicId`, and `promoIds` fields
- **clarifications**: Some cards have extra clarifications for how they work or interact with other cards. This field is a list of those clarifications. For cards without clarifications, this field doesn't exist. The text can contain newline characters
- **code**: This field is the two-character code for this card that the official app uses internally when saving a deck. It is the base-62 version of the card ID (digits higher than 9 use lowercase a-z and then uppercase A-Z). See also the `id` field
- **color**: The name of the color of the card. One of Amber, Amethyst, Emerald, Ruby, Sapphire, Steel. Cards from Quest-type sets don't have a color, so for those, this field is an empty string. For dual-ink cards, it lists both colors separated by a '-'; see also the `colors` field
- **colors**: Only dual-ink cards have this field. This is a list field with each color of the card as a separate string. For single-color cards or cards with no color, this field doesn't exist. See also the `color` field
- **cost**: How much Ink this card costs to play
- **effects**: A list of strings with an entry for each effect an Action card has. For cards without effects, this field doesn't exist
- **enchantedId**: For cards that have an Enchanted-rarity version, this field contains the ID of that Enchanted card. For other cards, this field doesn't exist. See also the `baseId` field
- **epicId**: For cards that have an Epic-rarity version, this field contains the ID of that Epic card. For other cards, this field doesn't exist. See also the `baseId` field
- **errata**: Some cards have errata, correcting mistakes on the card, and/or improving phrasing. This field is a list of those corrections. For cards without errata, this field doesn't exist. The text can contain newline characters
- **externalLinks**: This dictionary contains information to link this dataset to other Lorcana-related datasets. The dictionary itself always exists, but each field inside it only exists when it is known for the card. Available external link fields are:
    - **cardTraderId**: The ID used by the [CardTrader card marketplace](https://www.cardtrader.com/en/lorcana) for this card. You can use [their API](https://www.cardtrader.com/docs/api/full/reference) and this ID to look up pricing data of this card
    - **cardTraderUrl**: The page of this card on the [CardTrader card marketplace](https://www.cardtrader.com/en/lorcana). This is not a referral link, so LorcanaJSON doesn't earn any money when this link is used
    - **cardmarketId**: The ID used by the [Cardmarket card marketplace](https://www.cardmarket.com/en/Lorcana) for this card. On their website, you can [download a price guide](https://www.cardmarket.com/en/Lorcana/Data/Price-Guide), and use this ID to look up pricing data of this card
    - **cardmarketUrl**: The page of this card on the [Cardmarket card marketplace](https://www.cardmarket.com/en/Lorcana). This is not a referral link, so LorcanaJSON doesn't earn any money when this link is used
    - **tcgPlayerId**: The ID used by the [TCGplayer card marketplace](https://www.tcgplayer.com/categories/trading-and-collectible-card-games/disney-lorcana). You can use the data from [TCGCSV](https://tcgcsv.com/) and this ID to look up pricing data of this card
    - **tcgPlayerUrl**: The page of this card on the [TCGplayer card marketplace](https://www.tcgplayer.com/categories/trading-and-collectible-card-games/disney-lorcana). This is not a referral link, so LorcanaJSON doesn't earn any money when this link is used
- **flavorText**: The flavor text at the bottom of a card. This has no gameplay effect, but does improve the feel of the card. For cards without flavor text, this field doesn't exist. The text can contain newline characters
- **foilTypes**: A list of all the foil types the card can have. 'None' means no foiling. Since this is impossible to fully manually verify, this data may not be 100% accurate, especially for 'Special'-rarity cards. For cards where `isExternalReveal` exists and is set to `true`, and for some other special cards, this field does not exist
- **fullIdentifier**: The full identifier as displayed on the bottom-left of each card, for instance `9/204 • EN • 3`. The formatting may be different for promo cards. See also the `number` and `setNumber` fields
- **fullName**: The full name of the card. For characters and locations, this is the `name` plus the `version`, separated by a dash. For other card types this is the same as the `name` field. See also the `name`, `version` and `simpleName` fields
- **fullText**: The entire main gameplay text on the card as printed, not split up into abilities or effects. Does not include the flavor text. This field always exists, but can be an empty string on cards without rules text. The text can contain newline characters. See also the `fullTextSections` field
- **fullTextSections**: A list of all the sections of the main gameplay text, with each ability or effect as a separate entry. Does not include the flavor text. This field always exists, but can be an empty list on cards without rules text. Each entry can contain newline characters. See also the `fullText` field
- **historicData**: This field only exists on cards that have had errata or changes to text on the card. The most well-known example is "Bucky - Squirrel Squeak Tutor" (ID 289), which got changed a lot. But other smaller changes have been made too. If it exists, it is a list of dictionaries, with each entry containing the card fields that have been changed in the errata, plus a field called `usedUntil` that contains the date in yyyy-mm-dd format until when this historic data was used
- **iconicId**: For cards that have an Iconic-rarity version, this field contains the ID of that Iconic card. For other cards, this field doesn't exist. See also the `baseId` field
- **id**: A unique number identifying the card. For the first set, this id is identical to the `number` field; for subsequent sets, the id keeps counting up (so the first card of set 2 has an id one higher than the last card of set 1). The id is identical between different language versions of the same card
- **images**: A dictionary with several URLs of card images. These images are the same ones as used in the official Disney Lorcana app.  
    The fields in this dictionary are:
    
    - **full**: The URL of the card image at full size, usually 1468 by 2048 pixels
    - **fullFoil**: Some foil versions of cards have slightly different art than the non-foil version (for instance Louie, Dewey, and Huey from set 8 [IDs 1665, 1666, and 1667]). For these cards, this field exists and the URL points to the full art of the foil card. For cards that don't have different art for their foil version, this field doesn't exist
    - **thumbnail**: The URL of the card image at thumbnail size, usually 367 by 512 pixels
    - **foilMask**: A mask of the full card image that the official Disney Lorcana app uses to draw the foil effect, usually 1468 by 2048 pixels. Not all cards have this field
    - **varnishMask**: A mask of the full card image that the official Disney Lorcana app uses to draw the varnish effect, usually 1468 by 2048 pixels. Not all cards have this field. See also the `varnishType` field
    
    Note: If the `isExternalReveal` field exists and is set to `true`, this card isn't in the official app yet, so only the 'full' image field will be set
- **inkwell**: `true` if this card is allowed to be put into the inkwell as ink, so if it has the extra decoration around the cost in the top left of the card, and `false` otherwise
- **isExternalReveal**: If this field exists and is `true`, the data from this card didn't come from the official app, but the card image came from another official Ravensburger source. Practically, this means that the `images` field will probably only have the `full` URL set, and it will be in another format than usual. This field doesn't exist if the data for this card came from the official app
- **keywordAbilities**: A list of the keyword abilities of this character card, without the reminder text. For keyword abilities with a value, like `Shift X` or `Challenger +X`, the list entry doesn't include that value. For cards without keyword abilities, this field doesn't exist
- **lore**: For character cards, this is the amount of lore this character earns for a player when they quest with it. For characters that can't quest, this value is 0. For location cards, this is the amount of lore this location card earns at the start of each turn. For other card types, this field doesn't exist
- **maxCopiesInDeck**: When building a deck, you can usually add a maximum of 4 copies of a card to that deck. Some cards are exceptions to that rule. For those cards, this field exists and is set to the maximum amount that applies for this card. See for example the card `Dalmatian Puppy - Tail Wagger` (IDs 436-440): the card allows 99 copies of it in a deck, so the value of this field is set to '99'. If the card allows an unlimited amount of copies, like `Microbots` (ID 1366), this field is set to 'null'. If no special limit applies, this field doesn't exist
- **moveCost**: For location cards, this is the amount of ink it costs to move a character to this location. For other cards, this field doesn't exist
- **name**: The main name of the card. For characters and locations, this is the character or location name without the small version subtitle (So the "Minnie Mouse" part of "Minnie Mouse - Stylish Surfer"). For other card types, this is the same as the `fullName` field. See also the `fullName` and `version` fields
- **~~nonEnchantedId~~**: For Enchanted-rarity cards, this field contains the ID of the non-Enchanted version of the same card. For non-Enchanted-rarity cards, this field doesn't exist. See also the `enchantedId` field **_Note_**: This field will be removed in format version 2.3.0 on September 5th, see `baseId` for its replacement
- **~~nonPromoId~~**: Special versions of some cards are released at events or at other occasions, as promo versions. For these cards, this field points to the ID of the non-promo version of the same card. For other cards, this field doesn't exist. See also the `promoIds` field **_Note_**: This field will be removed in format version 2.3.0 on September 5th, see `baseId` for its replacement
- **number**: The number of the card inside its set, shown as `number/totalCards` in the bottom left of the card and in the `fullIdentifier` field. For 'Special'-rarity cards, this number is the promo number instead, so a set might have two cards with number 1, one Special and one non-Special. This doesn't necessarily mean the cards are related, for that see the `promoIds` and `nonSpecialId` fields. For a unique card identifier, see the `id` field
- **promoGrouping**: This field contains which grouping a promo card belongs to. A grouping is different from a setcode. For instance, the promo card `Minnie Mouse - Wide-Eyed Diver` (ID 674) has the full identifier '16/P1 • EN • 2'. The grouping here is 'P1'. Cards from different sets can belong to the same grouping. Available groupings are 'P1', 'P2', 'C1', 'C2', 'D23'; more will probably be added at a later time. This field doesn't exist for non-promo cards
- **promoIds**: Special versions of some cards are released at events or at other occasions, as promo versions. For cards that have such promo versions, this field has a list of IDs of those promo versions of this non-promo card. For cards without a promo version, this field doesn't exist. See also the `nonPromoId` field
- **rarity**: The rarity of this card. One of Common, Uncommon, Rare, Super Rare, Legendary, Enchanted, or Special (the latter is used for promos or other special releases)
- **reprintedAsIds**: Some cards from older sets are reprinted in newer sets, to make sure they stay available after set rotations. If this card got reprinted in one or more later sets, this field exists and is a list of card IDs that are reprints of this card. Some fields, like `rarity`, may differ between the original print and the reprint. If this card hasn't been reprinted, this field doesn't exist. Note that for cards with variants, only the first variant has this field. See also the `reprintOfId` field
- **reprintOfId**: Some cards from older sets are reprinted in newer sets, to make sure they stay available after set rotations. If this card is a reprint from a card in an older set, this field exists and is set to the ID of the card this is a reprint of. Some fields, like `rarity`, may differ between the original print and the reprint. If this card isn't a reprint, this field doesn't exist. Note that for cards with variants, this field points to the first variant. See also the `reprintedAsIds` field
- **setCode**: A string representation of the set code, which is the set number for 'normal' cards, and `Q1` for Illumineer's Quest cards. This is exactly how it's printed as the last part of the identifier at the bottom-left of each card.  
    This set code is also a key in the "sets" dictionary inside the "allCards.json" file, linking to the set name and other set data.  
    This field does not exist in the set-specific data files, since it doesn't make sense there. See also the `setNumber` field
- **simpleName**: The full name like in the `fullName` field, but simplified: without the dash between name and version subtitle (for character and location cards), without special characters like '!' and '.', and entirely in lower-case. Special versions of letters are simplified too (for instance: "Te Kā - The Burning One" has the simpleName "te ka the burning one"). Quotemarks in possessives ("captain colonel's lieutenant") and dashes between words ("minnie mouse wide-eyed diver") _are_ kept, since that's related to basic spelling. This field should make it easier to implement this data in a search engine, since most people won't use the dash or other special characters when searching for a card, so you can match their query against this field. See also the `fullName` field
- **story**: The name of the story (movie, TV show, etc.) that the card is from or that it references
- **strength**: The strength of a character card, so how much damage it does to another character during a challenge. For card types other than characters, this field doesn't exist
- **subtypes**: A list of the subtypes of this card. For characters, this can have entries like `Dreamborn` and `Princess`. For song actions, this contains 'Song'. The order of the list is the same as on the card. For cards without subtypes, this field doesn't exist. See also the `subtypesText` field
- **subtypesText**: If this card has one or more subtypes, this field contains those subtypes as one string, just like it's printed on the card. For cards without subtypes, this field doesn't exist. See also the `subtypes` field
- **type**: What kind of card this is. One of Action, Character, Item, Location
- **variant**: Some cards have multiple variants that only have different art (for instance `Dalmatian Puppy` has ID 436 to 440). These are differentiated by a letter after the card number (for `Dalmatian Puppy`, letters 'a' to 'e'). This field contains that letter. For cards without variants, this field doesn't exist. See also the `variantIds` field
- **variantIds**: Some cards have multiple variants that only have different art (for instance `Dalmatian Puppy` has ID 436 to 440). This field contains a list of the IDs of the other cards belonging to this variant. For cards without variants, this field doesn't exist. See also the `variant` field
- **varnishType**: A few cards have a special varnish effect. If this card is varnished, this field exists and is set to the exact varnish type. For cards that don't have a varnish effect, this field doesn't exist. See also the `varnishMask` subfield of the `images` dictionary
- **version**: The version subtitle of a character or location card, written below the `name` (So the "Stylish Surfer" part of "Minnie Mouse - Stylish Surfer"). For other card types, this field doesn't exist. See also the `fullName` and `name` fields
- **willpower**: The willpower of a character or location card, so how much damage it can take before it is banished. For other card types, this field doesn't exist

## Deck files

The deck files also have a `cards` field with card objects. The difference between the `deckdata.[deckCode].json` and the `deckdata.[deckCode].full.json` deckfiles is that the card objects in the former only contain the following fields, while the card objects in the latter, '.full', deck files contain these fields in addition to all the fields listed above. The fields specific to card objects in the deck files are:

- **amount**: How many copies of this card are in the deck
- **id**: The ID of the card, uniquely identifying it. See the explanation for the `id` field in the [Card data fields explanation](https://lorcanajson.org/#field-explanation) section for a more extensive explanation
- **isFoil**: Whether the card is foil in this deck. If 'true', the `id` of this card is then also in the `foilIds` field of the deck

## _Disney Lorcana_ symbols

Certain text fields (`abilities`, `clarifications`, `effects`, `errata`, `fullText`, `fullTextSections`, `historicData`) can have special Unicode characters in them that resemble the game-specific icons as closely as possible:

- `⟳` (Unicode character U+27F3): Exert
- `⬡` (Unicode character U+2B21): Ink (usually in activation costs)
- `◊` (Unicode character U+25CA): Lore (usually used to indicate the lore gain when questing)
- `¤` (Unicode character U+00A4): Strength
- `⛉` (Unicode character U+26C9): Willpower
- `◉` (Unicode character U+25C9): Inkwell (the decoration around the card cost), meant to symbolise whether the card is allowed to be put into your inkwell. The character isn't too similar to the actual card symbol, but it's the closest available
- `•` (Unicode character U+2022): Bullet point that separates different subtypes, and is also used in lists on cards (for instance `Maui's Fish Hook`, ID 568)