/* Dojo Lab engine — prototype bundle. Card data: LorcanaJSON allCards.json (formatVersion 2.3.5), the two decklists only. */
(function (root) {
'use strict';
const RAW = {"cards":[{"id":1968,"name":"Lantern","version":null,"fullName":"Lantern","cost":2,"inkwell":false,"type":"Item","color":"Amber","strength":null,"willpower":null,"lore":null,"moveCost":null,"subtypes":[],"abilities":[{"type":"activated","name":"BIRTHDAY LIGHTS","effect":"You pay 1 ⬡ less for the next character you play this turn.","costsText":"⟳","fullText":"BIRTHDAY LIGHTS ⟳ — You pay 1 ⬡ less for the next\ncharacter you play this turn."}],"fullText":"BIRTHDAY LIGHTS ⟳ — You pay 1 ⬡ less for the next\ncharacter you play this turn."},{"id":1972,"name":"Rafiki","version":"Mystical Fighter","fullName":"Rafiki - Mystical Fighter","cost":1,"inkwell":true,"type":"Character","color":"Amethyst","strength":0,"willpower":2,"lore":1,"moveCost":null,"subtypes":["Dreamborn","Mentor","Sorcerer"],"abilities":[{"type":"keyword","keyword":"Challenger","keywordValue":"+3","keywordValueNumber":3,"reminderText":"While challenging, this character gets +3 ¤.","fullText":"Challenger +3 (While challenging, this character gets\n+3 ¤.)"},{"type":"triggered","name":"ANCIENT SKILLS","effect":"Whenever he challenges a Hyena character, this character takes no damage from the challenge.","fullText":"ANCIENT SKILLS Whenever he challenges a Hyena\ncharacter, this character takes no damage from the\nchallenge."}],"fullText":"Challenger +3 (While challenging, this character gets\n+3 ¤.)\nANCIENT SKILLS Whenever he challenges a Hyena\ncharacter, this character takes no damage from the\nchallenge."},{"id":1981,"name":"Dumbo","version":"Ninth Wonder of the Universe","fullName":"Dumbo - Ninth Wonder of the Universe","cost":4,"inkwell":true,"type":"Character","color":"Amethyst","strength":3,"willpower":3,"lore":1,"moveCost":null,"subtypes":["Storyborn","Hero"],"abilities":[{"type":"keyword","keyword":"Evasive","reminderText":"Only characters with Evasive can challenge this character.","fullText":"Evasive (Only characters with Evasive can challenge this\ncharacter.)"},{"type":"activated","name":"BREAKING RECORDS","effect":"Draw a card and gain 1 lore.","costsText":"⟳, 1 ⬡","fullText":"BREAKING RECORDS ⟳, 1 ⬡ — Draw a card and gain 1 lore."},{"type":"static","name":"MAKING HISTORY","effect":"Your other characters with Evasive gain “⟳, 1 ⬡ — Draw a card and gain 1 lore.”","fullText":"MAKING HISTORY Your other characters with Evasive gain\n“⟳, 1 ⬡ — Draw a card and gain 1 lore.”"}],"fullText":"Evasive (Only characters with Evasive can challenge this\ncharacter.)\nBREAKING RECORDS ⟳, 1 ⬡ — Draw a card and gain 1 lore.\nMAKING HISTORY Your other characters with Evasive gain\n“⟳, 1 ⬡ — Draw a card and gain 1 lore.”"},{"id":1996,"name":"Second Star to the Right","version":null,"fullName":"Second Star to the Right","cost":10,"inkwell":false,"type":"Action","color":"Amethyst","strength":null,"willpower":null,"lore":null,"moveCost":null,"subtypes":["Song"],"abilities":[{"type":"keyword","keyword":"Sing Together","keywordValue":"10","keywordValueNumber":10,"reminderText":"Any number of your or your teammates' characters with total cost 10 or more may ⟳ to sing this song for free.","fullText":"Sing Together 10 (Any number of your or your\nteammates' characters with total cost 10 or more may\n⟳ to sing this song for free.)"}],"effects":["Chosen player draws 5 cards."],"fullText":"Sing Together 10 (Any number of your or your\nteammates' characters with total cost 10 or more may\n⟳ to sing this song for free.)\nChosen player draws 5 cards."},{"id":2009,"name":"Prince Phillip","version":"Vanquisher of Foes","fullName":"Prince Phillip - Vanquisher of Foes","cost":9,"inkwell":true,"type":"Character","color":"Emerald","strength":6,"willpower":6,"lore":3,"moveCost":null,"subtypes":["Floodborn","Hero","Prince"],"abilities":[{"type":"keyword","keyword":"Shift","keywordValue":"6","keywordValueNumber":6,"reminderText":"You may pay 6 ⬡ to play this on top of one of your characters named Prince Phillip.","fullText":"Shift 6 ⬡ (You may pay 6 ⬡ to play this on top of one of\nyour characters named Prince Phillip.)"},{"type":"keyword","keyword":"Evasive","reminderText":"Only characters with Evasive can challenge this character.","fullText":"Evasive (Only characters with Evasive can challenge this\ncharacter.)"},{"type":"triggered","name":"SWIFT AND SURE","effect":"When you play this character, banish all opposing damaged characters.","fullText":"SWIFT AND SURE When you play this character, banish all\nopposing damaged characters."}],"fullText":"Shift 6 ⬡ (You may pay 6 ⬡ to play this on top of one of\nyour characters named Prince Phillip.)\nEvasive (Only characters with Evasive can challenge this\ncharacter.)\nSWIFT AND SURE When you play this character, banish all\nopposing damaged characters."},{"id":2025,"name":"John Silver","version":"Alien Pirate","fullName":"John Silver - Alien Pirate","cost":6,"inkwell":true,"type":"Character","color":"Emerald","strength":5,"willpower":5,"lore":2,"moveCost":null,"subtypes":["Storyborn","Villain","Alien","Pirate","Captain"],"abilities":[{"type":"triggered","name":"PICK YOUR FIGHTS","effect":"When you play this character and whenever he quests, chosen opposing character gains Reckless during their next turn. (They can't quest and must challenge if able.)","fullText":"PICK YOUR FIGHTS When you play this character\nand whenever he quests, chosen opposing character\ngains Reckless during their next turn. (They can't\nquest and must challenge if able.)"}],"fullText":"PICK YOUR FIGHTS When you play this character\nand whenever he quests, chosen opposing character\ngains Reckless during their next turn. (They can't\nquest and must challenge if able.)"},{"id":2033,"name":"Under the Sea","version":null,"fullName":"Under the Sea","cost":8,"inkwell":false,"type":"Action","color":"Emerald","strength":null,"willpower":null,"lore":null,"moveCost":null,"subtypes":["Song"],"abilities":[{"type":"keyword","keyword":"Sing Together","keywordValue":"8","keywordValueNumber":8,"reminderText":"Any number of your or your teammates' characters with total cost 8 or more may ⟳ to sing this song for free.","fullText":"Sing Together 8 (Any number of your or your teammates'\ncharacters with total cost 8 or more may ⟳ to sing this song\nfor free.)"}],"effects":["Put all opposing characters with 2 ¤ or less on the bottom of\ntheir players' decks in any order."],"fullText":"Sing Together 8 (Any number of your or your teammates'\ncharacters with total cost 8 or more may ⟳ to sing this song\nfor free.)\nPut all opposing characters with 2 ¤ or less on the bottom of\ntheir players' decks in any order."},{"id":2244,"name":"Demona","version":"Scourge of the Wyvern Clan","fullName":"Demona - Scourge of the Wyvern Clan","cost":6,"inkwell":true,"type":"Character","color":"Amethyst","strength":5,"willpower":6,"lore":2,"moveCost":null,"subtypes":["Storyborn","Villain","Gargoyle","Sorcerer"],"abilities":[{"type":"triggered","name":"AD SAXUM COMMUTATE","effect":"When you play this character, exert all opposing characters. Then, each player with fewer than 3 cards in their hand draws until they have 3.","fullText":"AD SAXUM COMMUTATE When you play this\ncharacter, exert all opposing characters. Then,\neach player with fewer than 3 cards in their hand\ndraws until they have 3."},{"type":"static","name":"STONE BY DAY","effect":"If you have 3 or more cards in your hand, this character can't ready.","fullText":"STONE BY DAY If you have 3 or more cards in your\nhand, this character can't ready."}],"fullText":"AD SAXUM COMMUTATE When you play this\ncharacter, exert all opposing characters. Then,\neach player with fewer than 3 cards in their hand\ndraws until they have 3.\nSTONE BY DAY If you have 3 or more cards in your\nhand, this character can't ready."},{"id":2248,"name":"Ursula","version":"Whisper of Vanessa","fullName":"Ursula - Whisper of Vanessa","cost":5,"inkwell":true,"type":"Character","color":"Amethyst","strength":4,"willpower":5,"lore":2,"moveCost":null,"subtypes":["Storyborn","Villain","Sorcerer","Whisper"],"abilities":[{"type":"keyword","keyword":"Boost","keywordValue":"1","keywordValueNumber":1,"reminderText":"Once during your turn, you may pay 1 ⬡ to put the top card of your deck facedown under this character.","fullText":"Boost 1 ⬡ (Once during your turn, you may pay\n1 ⬡ to put the top card of your deck facedown\nunder this character.)"},{"type":"static","name":"SLIPPERY SPELL","effect":"While there's a card under this character, she gets +1 ◊ and gains Evasive. (Only characters with Evasive can challenge them.)","fullText":"SLIPPERY SPELL While there's a card under this\ncharacter, she gets +1 ◊ and gains Evasive. (Only\ncharacters with Evasive can challenge them.)"}],"fullText":"Boost 1 ⬡ (Once during your turn, you may pay\n1 ⬡ to put the top card of your deck facedown\nunder this character.)\nSLIPPERY SPELL While there's a card under this\ncharacter, she gets +1 ◊ and gains Evasive. (Only\ncharacters with Evasive can challenge them.)"},{"id":2249,"name":"Cheshire Cat","version":"Inexplicable","fullName":"Cheshire Cat - Inexplicable","cost":3,"inkwell":true,"type":"Character","color":"Amethyst","strength":3,"willpower":4,"lore":1,"moveCost":null,"subtypes":["Storyborn","Whisper"],"abilities":[{"type":"keyword","keyword":"Boost","keywordValue":"2","keywordValueNumber":2,"reminderText":"Once during your turn, you may pay 2 ⬡ to put the top card of your deck facedown under this character.","fullText":"Boost 2 ⬡ (Once during your turn, you may pay 2 ⬡\nto put the top card of your deck facedown under this\ncharacter.)"},{"type":"triggered","name":"IT'S LOADS OF FUN","effect":"Whenever you put a card under this character, you may move up to 2 damage counters from chosen character to chosen opposing character.","fullText":"IT'S LOADS OF FUN Whenever you put a card under this\ncharacter, you may move up to 2 damage counters from\nchosen character to chosen opposing character."}],"fullText":"Boost 2 ⬡ (Once during your turn, you may pay 2 ⬡\nto put the top card of your deck facedown under this\ncharacter.)\nIT'S LOADS OF FUN Whenever you put a card under this\ncharacter, you may move up to 2 damage counters from\nchosen character to chosen opposing character."},{"id":2255,"name":"Junior Woodchuck Guidebook","version":null,"fullName":"Junior Woodchuck Guidebook","cost":2,"inkwell":true,"type":"Item","color":"Amethyst","strength":null,"willpower":null,"lore":null,"moveCost":null,"subtypes":[],"abilities":[{"type":"activated","name":"THE BOOK KNOWS EVERYTHING","effect":"Draw 2 cards.","costsText":"⟳, 1 ⬡, Banish this item","fullText":"THE BOOK KNOWS EVERYTHING ⟳, 1 ⬡, Banish this\nitem — Draw 2 cards."}],"fullText":"THE BOOK KNOWS EVERYTHING ⟳, 1 ⬡, Banish this\nitem — Draw 2 cards."},{"id":2286,"name":"Malicious, Mean, and Scary","version":null,"fullName":"Malicious, Mean, and Scary","cost":3,"inkwell":true,"type":"Action","color":"Emerald","strength":null,"willpower":null,"lore":null,"moveCost":null,"subtypes":["Song"],"abilities":[{"type":"static","effect":"A character with cost 3 or more can ⟳ to sing this song for free.","fullText":"(A character with cost 3 or more can ⟳ to sing this\nsong for free.)"}],"effects":["Put 1 damage counter on each opposing character."],"fullText":"(A character with cost 3 or more can ⟳ to sing this\nsong for free.)\nPut 1 damage counter on each opposing character."},{"id":2396,"name":"The Horseman Strikes!","version":null,"fullName":"The Horseman Strikes!","cost":3,"inkwell":true,"type":"Action","color":"Amber","strength":null,"willpower":null,"lore":null,"moveCost":null,"subtypes":[],"abilities":[],"effects":["Draw a card. You may banish chosen character\nwith Evasive."],"fullText":"Draw a card. You may banish chosen character\nwith Evasive."},{"id":2431,"name":"Hades","version":"Looking for a Deal","fullName":"Hades - Looking for a Deal","cost":5,"inkwell":true,"type":"Character","color":"Amethyst","strength":3,"willpower":4,"lore":1,"moveCost":null,"subtypes":["Storyborn","Villain","Deity"],"abilities":[{"type":"triggered","name":"WHAT D'YA SAY?","effect":"When you play this character, you may choose an opposing character. If you do, draw 2 cards unless that character's player puts that card on the bottom of their deck.","fullText":"WHAT D'YA SAY? When you play this character,\nyou may choose an opposing character. If you do,\ndraw 2 cards unless that character's player puts\nthat card on the bottom of their deck."}],"fullText":"WHAT D'YA SAY? When you play this character,\nyou may choose an opposing character. If you do,\ndraw 2 cards unless that character's player puts\nthat card on the bottom of their deck."},{"id":2491,"name":"Raging Storm","version":null,"fullName":"Raging Storm","cost":8,"inkwell":false,"type":"Action","color":"Amber","strength":null,"willpower":null,"lore":null,"moveCost":null,"subtypes":[],"abilities":[],"effects":["Banish all characters."],"fullText":"Banish all characters."},{"id":2501,"name":"Isis Vanderchill","version":"Ice Queen of St. Canard","fullName":"Isis Vanderchill - Ice Queen of St. Canard","cost":4,"inkwell":false,"type":"Character","color":"Amethyst","strength":4,"willpower":4,"lore":1,"moveCost":null,"subtypes":["Storyborn","Super","Villain"],"abilities":[{"type":"triggered","name":"CHILL OUT","effect":"When you play this character, exert chosen opposing character.","fullText":"CHILL OUT When you play this character, exert\nchosen opposing character."}],"fullText":"CHILL OUT When you play this character, exert\nchosen opposing character."},{"id":2523,"name":"Sven","version":"Leaping Reindeer","fullName":"Sven - Leaping Reindeer","cost":4,"inkwell":false,"type":"Character","color":"Amethyst","strength":2,"willpower":3,"lore":1,"moveCost":null,"subtypes":["Dreamborn","Ally"],"abilities":[{"type":"keyword","keyword":"Rush","reminderText":"This character can challenge the turn they're played.","fullText":"Rush (This character can challenge the turn\nthey're played.)"},{"type":"keyword","keyword":"Challenger","keywordValue":"+3","keywordValueNumber":3,"reminderText":"While challenging, this character gets +3 ¤.","fullText":"Challenger +3 (While challenging, this character\ngets +3 ¤.)"},{"type":"keyword","keyword":"Evasive","reminderText":"Only characters with Evasive can challenge this character.","fullText":"Evasive (Only characters with Evasive can\nchallenge this character.)"}],"fullText":"Rush (This character can challenge the turn\nthey're played.)\nChallenger +3 (While challenging, this character\ngets +3 ¤.)\nEvasive (Only characters with Evasive can\nchallenge this character.)"},{"id":2563,"name":"Retro Evolution Device","version":null,"fullName":"Retro Evolution Device","cost":3,"inkwell":true,"type":"Item","color":"Emerald","strength":null,"willpower":null,"lore":null,"moveCost":null,"subtypes":[],"abilities":[{"type":"activated","name":"TURN INTO DINOSAUR","effect":"Play a character with cost up to 2 more than the banished character for free.","costsText":"⟳, 1 ⬡, Banish chosen character of yours","fullText":"TURN INTO DINOSAUR ⟳, 1 ⬡, Banish chosen character\nof yours — Play a character with cost up to 2 more than\nthe banished character for free."}],"fullText":"TURN INTO DINOSAUR ⟳, 1 ⬡, Banish chosen character\nof yours — Play a character with cost up to 2 more than\nthe banished character for free."},{"id":2669,"name":"Grandmother Willow","version":"Ancient Advisor","fullName":"Grandmother Willow - Ancient Advisor","cost":2,"inkwell":false,"type":"Character","color":"Amber","strength":1,"willpower":2,"lore":1,"moveCost":null,"subtypes":["Storyborn","Mentor"],"abilities":[{"type":"static","name":"SMOOTH THE WAY","effect":"Once during your turn, you pay 1 ⬡ less for the next character you play this turn.","fullText":"SMOOTH THE WAY Once during your turn, you pay\n1 ⬡ less for the next character you play this turn."}],"fullText":"SMOOTH THE WAY Once during your turn, you pay\n1 ⬡ less for the next character you play this turn."},{"id":2671,"name":"Tigger","version":"Bouncing All the Way","fullName":"Tigger - Bouncing All the Way","cost":4,"inkwell":true,"type":"Character","color":"Amethyst","strength":4,"willpower":3,"lore":1,"moveCost":null,"subtypes":["Storyborn","Tigger"],"abilities":[{"type":"triggered","name":"SPLENDERIFFIC BOUNCE","effect":"When you play this character, you may return chosen character, item, or location with cost 2 or less to their player's hand.","fullText":"SPLENDERIFFIC BOUNCE When you play this\ncharacter, you may return chosen character,\nitem, or location with cost 2 or less to their\nplayer's hand."}],"fullText":"SPLENDERIFFIC BOUNCE When you play this\ncharacter, you may return chosen character,\nitem, or location with cost 2 or less to their\nplayer's hand."},{"id":2721,"name":"Agustin Madrigal","version":"Exceptionally Kind","fullName":"Agustin Madrigal - Exceptionally Kind","cost":4,"inkwell":true,"type":"Character","color":"Amber","strength":3,"willpower":6,"lore":1,"moveCost":null,"subtypes":["Dreamborn","Mentor","Madrigal"],"abilities":[{"type":"keyword","keyword":"Support","reminderText":"Whenever this character quests, you may add their ¤ to another chosen character's ¤ this turn.","fullText":"Support (Whenever this character quests, you may\nadd their ¤ to another chosen character's ¤\nthis turn.)"}],"fullText":"Support (Whenever this character quests, you may\nadd their ¤ to another chosen character's ¤\nthis turn.)"},{"id":2726,"name":"Hamm","version":"Piggy Bank","fullName":"Hamm - Piggy Bank","cost":2,"inkwell":true,"type":"Character","color":"Amber","strength":2,"willpower":3,"lore":1,"moveCost":null,"subtypes":["Storyborn","Ally","Toy"],"abilities":[{"type":"activated","name":"LOOSE CHANGE","effect":"You pay 1 ⬡ less for the next character you play this turn.","costsText":"⟳","fullText":"LOOSE CHANGE ⟳ — You pay 1 ⬡ less for the\nnext character you play this turn."}],"fullText":"LOOSE CHANGE ⟳ — You pay 1 ⬡ less for the\nnext character you play this turn."},{"id":2751,"name":"Alma Madrigal","version":"Leading the Way","fullName":"Alma Madrigal - Leading the Way","cost":2,"inkwell":true,"type":"Character","color":"Amethyst","strength":1,"willpower":2,"lore":1,"moveCost":null,"subtypes":["Storyborn","Mentor","Madrigal"],"abilities":[{"type":"triggered","name":"PROTECTING THE FAMILY","effect":"When you play this character, if you have another Madrigal character in play, you may exert chosen opposing character.","fullText":"PROTECTING THE FAMILY When you play this\ncharacter, if you have another Madrigal character\nin play, you may exert chosen opposing character."}],"fullText":"PROTECTING THE FAMILY When you play this\ncharacter, if you have another Madrigal character\nin play, you may exert chosen opposing character."},{"id":2777,"name":"Luisa Madrigal","version":"Pushing Through","fullName":"Luisa Madrigal - Pushing Through","cost":1,"inkwell":true,"type":"Character","color":"Amethyst","strength":0,"willpower":3,"lore":1,"moveCost":null,"subtypes":["Storyborn","Ally","Madrigal"],"abilities":[{"type":"keyword","keyword":"Challenger","keywordValue":"+2","keywordValueNumber":2,"reminderText":"While challenging, this character gets +2 ¤.","fullText":"Challenger +2 (While challenging, this character\ngets +2 ¤.)"}],"fullText":"Challenger +2 (While challenging, this character\ngets +2 ¤.)"},{"id":2794,"name":"Lenny","version":"Toy Binoculars","fullName":"Lenny - Toy Binoculars","cost":3,"inkwell":true,"type":"Character","color":"Emerald","strength":0,"willpower":2,"lore":1,"moveCost":null,"subtypes":["Storyborn","Ally","Toy"],"abilities":[{"type":"triggered","name":"TAKE A GOOD LOOK","effect":"When you play this character, chosen opponent reveals their hand and discards an action card of your choice.","fullText":"TAKE A GOOD LOOK When you play this character,\nchosen opponent reveals their hand and discards\nan action card of your choice."},{"type":"triggered","name":"COMIN' UP FAST","effect":"Once during your turn, whenever you play an action, you may ready this character.","fullText":"COMIN' UP FAST Once during your turn, whenever\nyou play an action, you may ready this character."}],"fullText":"TAKE A GOOD LOOK When you play this character,\nchosen opponent reveals their hand and discards\nan action card of your choice.\nCOMIN' UP FAST Once during your turn, whenever\nyou play an action, you may ready this character."},{"id":2797,"name":"Milo Thatch","version":"Getting His Hands Dirty","fullName":"Milo Thatch - Getting His Hands Dirty","cost":7,"inkwell":true,"type":"Character","color":"Emerald","strength":5,"willpower":5,"lore":3,"moveCost":null,"subtypes":["Dreamborn","Hero"],"abilities":[{"type":"keyword","keyword":"Ward","fullText":"Ward"},{"type":"triggered","name":"SCHOLAR'S GAMBIT","effect":"When you play this character, you may choose and discard a card to return chosen character to their player's hand.","fullText":"SCHOLAR'S GAMBIT When you play this character,\nyou may choose and discard a card to return chosen\ncharacter to their player's hand."},{"type":"triggered","name":"PRACTICAL KNOWLEDGE","effect":"At the end of your turn, if 2 or more cards were put into your discard this turn, draw a card.","fullText":"PRACTICAL KNOWLEDGE At the end of your turn, if\n2 or more cards were put into your discard this turn,\ndraw a card."}],"fullText":"Ward\nSCHOLAR'S GAMBIT When you play this character,\nyou may choose and discard a card to return chosen\ncharacter to their player's hand.\nPRACTICAL KNOWLEDGE At the end of your turn, if\n2 or more cards were put into your discard this turn,\ndraw a card."},{"id":2802,"name":"Lyle Tiberius Rourke","version":"Adventurer for Hire","fullName":"Lyle Tiberius Rourke - Adventurer for Hire","cost":2,"inkwell":true,"type":"Character","color":"Emerald","strength":2,"willpower":2,"lore":1,"moveCost":null,"subtypes":["Storyborn","Villain"],"abilities":[{"type":"triggered","name":"EYE FOR VALUE","effect":"When you play this character, you may draw a card, then choose and discard a card.","fullText":"EYE FOR VALUE When you play this character, you\nmay draw a card, then choose and discard a card."},{"type":"triggered","name":"DIRTY TRICKS","effect":"At the end of your turn, if 2 or more cards were put into your discard this turn, each opponent loses 1 lore.","fullText":"DIRTY TRICKS At the end of your turn, if 2 or\nmore cards were put into your discard this turn,\neach opponent loses 1 lore."}],"fullText":"EYE FOR VALUE When you play this character, you\nmay draw a card, then choose and discard a card.\nDIRTY TRICKS At the end of your turn, if 2 or\nmore cards were put into your discard this turn,\neach opponent loses 1 lore."},{"id":2809,"name":"The Huntsman","version":"On the Queen's Orders","fullName":"The Huntsman - On the Queen's Orders","cost":3,"inkwell":true,"type":"Character","color":"Emerald","strength":4,"willpower":3,"lore":1,"moveCost":null,"subtypes":["Storyborn","Ally"],"abilities":[{"type":"keyword","keyword":"Ward","reminderText":"Opponents can't choose this character except to challenge.","fullText":"Ward (Opponents can't choose this character\nexcept to challenge.)"}],"fullText":"Ward (Opponents can't choose this character\nexcept to challenge.)"},{"id":2986,"name":"Gaston","version":"Superior Archer","fullName":"Gaston - Superior Archer","cost":5,"inkwell":true,"type":"Character","color":"Amber","strength":3,"willpower":4,"lore":1,"moveCost":null,"subtypes":["Storyborn","Villain"],"abilities":[{"type":"triggered","name":"WATCH THIS!","effect":"When you play this character, you may banish chosen character with 5 ¤ or more.","fullText":"WATCH THIS! When you play this character, you\nmay banish chosen character with 5 ¤ or more."}],"fullText":"WATCH THIS! When you play this character, you\nmay banish chosen character with 5 ¤ or more."},{"id":3005,"name":"Besties, Assemble!","version":null,"fullName":"Besties, Assemble!","cost":1,"inkwell":true,"type":"Action","color":"Amber","strength":null,"willpower":null,"lore":null,"moveCost":null,"subtypes":[],"abilities":[],"effects":["Look at the top 4 cards of your deck. You may reveal a\ncharacter card and put it into your hand. Put the rest\non the bottom of your deck in any order."],"fullText":"Look at the top 4 cards of your deck. You may reveal a\ncharacter card and put it into your hand. Put the rest\non the bottom of your deck in any order."},{"id":3030,"name":"Aladdin & Genie","version":"Mischievous Pals","fullName":"Aladdin & Genie - Mischievous Pals","cost":5,"inkwell":true,"type":"Character","color":"Amethyst-Emerald","strength":3,"willpower":3,"lore":2,"moveCost":null,"subtypes":["Storyborn","Team","Hero"],"abilities":[{"type":"keyword","keyword":"Shift","keywordValue":"3","keywordValueNumber":3,"reminderText":"You may pay 3 ⬡ to play this on top of one of your characters named Aladdin or Genie.","fullText":"Shift 3 ⬡ (You may pay 3 ⬡ to play this on top of\none of your characters named Aladdin or Genie.)"},{"type":"triggered","name":"SLEIGHT OF HAND","effect":"When you play this character, you may put any number of cards from your hand on the bottom of your deck in any order. If you do, draw that number of cards plus 1.","fullText":"SLEIGHT OF HAND When you play this character,\nyou may put any number of cards from your hand\non the bottom of your deck in any order. If you\ndo, draw that number of cards plus 1."}],"fullText":"Shift 3 ⬡ (You may pay 3 ⬡ to play this on top of\none of your characters named Aladdin or Genie.)\nSLEIGHT OF HAND When you play this character,\nyou may put any number of cards from your hand\non the bottom of your deck in any order. If you\ndo, draw that number of cards plus 1."},{"id":3052,"name":"Tod","version":"Clever Fox","fullName":"Tod - Clever Fox","cost":3,"inkwell":true,"type":"Character","color":"Emerald","strength":1,"willpower":2,"lore":1,"moveCost":null,"subtypes":["Storyborn","Hero"],"abilities":[{"type":"triggered","name":"PROBLEM SOLVING","effect":"When you play this character, draw 2 cards, then choose and discard a card.","fullText":"PROBLEM SOLVING When you play this character,\ndraw 2 cards, then choose and discard a card."}],"fullText":"PROBLEM SOLVING When you play this character,\ndraw 2 cards, then choose and discard a card."},{"id":3056,"name":"Aladdin","version":"Doing His Part","fullName":"Aladdin - Doing His Part","cost":2,"inkwell":true,"type":"Character","color":"Emerald","strength":3,"willpower":2,"lore":1,"moveCost":null,"subtypes":["Dreamborn","Hero"],"abilities":[{"type":"triggered","name":"CLEAR IT OUT","effect":"When you play this character, you may pay 1 ⬡ to banish chosen item.","fullText":"CLEAR IT OUT When you play this character, you\nmay pay 1 ⬡ to banish chosen item."}],"fullText":"CLEAR IT OUT When you play this character, you\nmay pay 1 ⬡ to banish chosen item."},{"id":3072,"name":"To Wither a Flower","version":null,"fullName":"To Wither a Flower","cost":4,"inkwell":false,"type":"Action","color":"Emerald","strength":null,"willpower":null,"lore":null,"moveCost":null,"subtypes":["Song"],"abilities":[{"type":"static","effect":"A character with cost 4 or more can ⟳ to sing this song for free.","fullText":"(A character with cost 4 or more can ⟳ to sing this\nsong for free.)"}],"effects":["Deal 2 damage to each opposing damaged character."],"fullText":"(A character with cost 4 or more can ⟳ to sing this\nsong for free.)\nDeal 2 damage to each opposing damaged character."},{"id":3073,"name":"Piercing Attack","version":null,"fullName":"Piercing Attack","cost":2,"inkwell":true,"type":"Action","color":"Emerald","strength":null,"willpower":null,"lore":null,"moveCost":null,"subtypes":[],"abilities":[],"effects":["Deal 2 damage to chosen character. This damage can't\nbe reduced by Resist."],"fullText":"Deal 2 damage to chosen character. This damage can't\nbe reduced by Resist."}],"decks":{"A":[[3030,4],[3056,4],[2431,4],[2025,2],[2255,4],[2794,2],[2802,3],[2286,4],[2797,4],[3073,3],[2009,4],[1972,3],[2563,4],[1996,1],[2523,3],[2809,4],[3072,2],[3052,4],[2033,1]],"B":[[3005,4],[2249,3],[2244,4],[1981,3],[2986,4],[2669,3],[2431,4],[2726,4],[2501,3],[2255,4],[2523,3],[2396,2],[2671,3],[2248,2],[2491,2],[2751,3],[2777,4],[2721,4],[1968,1]]}};
// Card-text classifier — turns a LorcanaJSON card into the facts the lenses need.
// Reads the structured `abilities[]` / `effects[]` fields (never regexes fullText
// when a structured field exists — same rule as the Dojo's text card, §15.1).

const KW_FLAGS = { Evasive: 'evasive', Ward: 'ward', Rush: 'rush', Bodyguard: 'bodyguard', Reckless: 'reckless', Support: 'support', Vanish: 'vanish' };
const KW_NUMS = { Challenger: 'challenger', Resist: 'resist', Singer: 'singer', Shift: 'shift', Boost: 'boost' };
const NUM_WORDS = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };

function num(s) { if (s == null) return 0; s = String(s).toLowerCase(); return NUM_WORDS[s] != null ? NUM_WORDS[s] : (parseInt(s, 10) || 0); }
function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim(); }

function triggerOf(ab) {
  const e = norm(ab.effect || ab.fullText);
  if (ab.type === 'activated') return 'act';
  if (ab.type === 'triggered') {
    if (/^When you play this/i.test(e)) return 'play';
    if (/^(When|Whenever) (he|she|they|this character) quests?|and whenever (he|she|they) quests?/i.test(e)) return 'quest';
    if (/^At the end of your turn/i.test(e)) return 'eot';
    if (/^At the start of your turn/i.test(e)) return 'sot';
    if (/^(When|Whenever) (he|she|they|this character) challenges?/i.test(e)) return 'challenge';
    return 'trig';
  }
  return 'static';
}

// One sentence → zero or more "answer" records (things that remove / neutralise characters).
function parseAnswers(sentence, trigger, out) {
  const s = sentence;
  const filt = {};
  let m;
  if ((m = /with (\d+) ¤ or more/i.exec(s))) filt.strGte = +m[1];
  if ((m = /with (\d+) ¤ or less/i.exec(s))) filt.strLte = +m[1];
  if ((m = /with cost (\d+) or less/i.exec(s))) filt.costLte = +m[1];
  if ((m = /with cost (\d+) or more/i.exec(s))) filt.costGte = +m[1];
  if ((m = /with (Evasive|Bodyguard|Rush|Ward|Reckless|Support|Challenger)\b/.exec(s))) filt.kw = m[1].toLowerCase();
  if (/\bdamaged character/i.test(s)) filt.damaged = true;
  if (/\bexerted character/i.test(s)) filt.exerted = true;
  const cond = (m = /if you have another ([A-Z][a-z]+) character in play/.exec(s)) ? { another: m[1] } : null;
  const opposing = /\bopposing\b/i.test(s);
  const ignoresResist = /can't be reduced by Resist/i.test(s);
  const push = (rec) => out.push(Object.assign({ trigger, opposing, filter: filt, cond, ignoresResist }, rec));

  // Every pattern is matched globally: "Banish chosen character of yours to banish
  // chosen character" holds two banishes, only the second one is an answer.
  const all = (re, f) => { for (const x of s.matchAll(re)) { if (/^[^.]{0,4}of yours/i.test(s.slice(x.index + x[0].length))) continue; f(x); } };
  const tgt = (w) => /item/i.test(w) ? 'item' : /location/i.test(w) ? 'location' : 'character';
  const sub = (w) => { const t = /\b([A-Z][a-z]+)(?: or ([A-Z][a-z]+))? $/.exec(w || ''); return t ? [t[1], t[2]].filter(Boolean) : null; };
  const scope = (w, opp) => w.toLowerCase() === 'chosen' ? 'chosen' : (opp ? 'all-opposing' : 'all');
  all(/\bbanish (chosen|all|each) ((?:opposing |other |damaged |exerted |ready |[A-Z][a-z]+ )*)(characters?|items?|locations?)\b/gi,
    x => push({ mode: 'banish', scope: scope(x[1], /opposing/i.test(x[2])), target: tgt(x[3]), subtypes: sub(x[2]) }));
  all(/\bdeal (\d+) damage to (chosen|each) ((?:opposing |other |damaged |exerted |ready |[A-Z][a-z]+ |or )*)characters?\b/gi,
    x => push({ mode: 'damage', n: +x[1], scope: scope(x[2], /opposing/i.test(x[3])), target: 'character', subtypes: sub(x[3]) }));
  all(/\bput (\d+|a|an|one|two|three) damage counters? on (chosen|each) ((?:opposing |damaged |[A-Z][a-z]+ )*)characters?\b/gi,
    x => push({ mode: 'damage', n: num(x[1]), counters: true, scope: scope(x[2], /opposing/i.test(x[3])), target: 'character', ignoresResist: true }));
  all(/\breturn (?:another )?chosen ((?:opposing |exerted |damaged |[A-Z][a-z]+ )*)(character|item)[^.]*? to their player's hand/gi,
    x => push({ mode: 'bounce', scope: 'chosen', target: tgt(x[2]), subtypes: sub(x[1]) }));
  all(/\bput (chosen|all) ((?:opposing |exerted |damaged )*)characters?[^.]*? on the bottom of their players?'? decks?/gi,
    x => push({ mode: 'bottom', scope: scope(x[1], /opposing/i.test(x[2])), target: 'character' }));
  all(/\bexert (chosen|all) ((?:opposing |[A-Z][a-z]+ )*)characters?\b/gi,
    x => push({ mode: 'exert', scope: scope(x[1], /opposing/i.test(x[2])), target: 'character' }));
}

function model(c) {
  const m = {
    id: c.id, name: c.name, version: c.version || '', full: c.fullName, cost: c.cost, ink: !!c.inkwell, type: c.type,
    song: (c.subtypes || []).includes('Song'), str: c.strength == null ? null : c.strength, wp: c.willpower == null ? null : c.willpower,
    lore: c.lore || 0, colors: String(c.color || '').split('-').map(s => s.toLowerCase()).filter(Boolean), subtypes: c.subtypes || [],
    kw: {}, answers: [], draw: { play: 0, act: 0, eot: 0, cond: false }, gain: { act: 0 }, actInk: 0, actExert: false, actOneShot: false,
    reducer: null, upgrade: null, info: false, tax: false, refill: 0, singTogether: 0, shiftBase: null, lines: []
  };
  const abs = c.abilities || [];
  for (const ab of abs) {
    if (ab.type === 'keyword') {
      const k = ab.keyword;
      if (KW_FLAGS[k]) m.kw[KW_FLAGS[k]] = true;
      else if (KW_NUMS[k]) m.kw[KW_NUMS[k]] = ab.keywordValueNumber != null ? ab.keywordValueNumber : num(String(ab.keywordValue || '').replace('+', ''));
      else if (k === 'Sing Together') m.singTogether = ab.keywordValueNumber || num(ab.keywordValue);
      if (k === 'Shift') { const b = /named ([^.()]+?)\./.exec(ab.reminderText || ab.fullText || ''); if (b) m.shiftBase = b[1].split(/ or /).map(x => x.trim()); }
      m.lines.push({ kind: 'kw', label: ab.keywordValue ? `${k} ${ab.keywordValue}` : k });
      continue;
    }
    const trig = triggerOf(ab);
    const effect = norm(ab.effect || '');
    const full = norm(ab.fullText || effect);
    m.lines.push({ kind: trig, label: ab.name || '', text: effect, cost: ab.costsText || '' });
    analyse(m, effect, full, trig, ab);
  }
  for (const e of (c.effects || [])) { const t = norm(e); m.lines.push({ kind: 'play', label: '', text: t }); analyse(m, t, t, 'play', {}); }
  return m;
}

function analyse(m, effect, full, trig, ab) {
  let r;
  if ((r = /draw (a|an|one|two|three|\d+) cards?/i.exec(effect))) {
    const n = num(r[1]);
    if (trig === 'play' || trig === 'trig') m.draw.play += n; else if (trig === 'act') m.draw.act += n; else if (trig === 'eot') { m.draw.eot += n; m.draw.cond = /if /i.test(effect); }
    else m.draw.play += 0;
    m.info = true;
    if (/unless that character's player puts that card on the bottom/i.test(effect)) m.tax = true;
  }
  if (/draw that number of cards plus 1|draws? until they have (\d+)|look at the top \d+ cards/i.test(effect)) m.info = true;
  if ((r = /draws? until they have (\d+)/i.exec(effect))) m.refill = +r[1];
  if ((r = /gain (\d+) lore/i.exec(effect)) && trig === 'act') m.gain.act += +r[1];
  if (trig === 'act') {
    const cost = ab.costsText || full.split('—')[0] || '';
    m.actExert = /⟳/.test(cost); const ink = /(\d+) ⬡/.exec(cost); m.actInk = ink ? +ink[1] : 0; m.actOneShot = /Banish this item/i.test(cost);
  }
  if ((r = /You pay (\d+) ⬡ less for the next character you play this turn/i.exec(effect))) m.reducer = { n: +r[1], exert: trig === 'act' && m.actExert };
  if ((r = /Play a character with cost up to (\d+) more than the banished character for free/i.exec(full))) m.upgrade = { plus: +r[1] };
  for (const sentence of effect.split(/(?<=\.)\s+/)) parseAnswers(sentence, trig, m.answers);
}

// ===================================================================
// DOJO LAB ENGINE — core: card models, odds, RNG, Mulligan Lab
// Pure functions over LorcanaJSON data. No DOM. The same functions
// would run inside practice_dojo.html against App.cardDB.
// ===================================================================

const M = {};               // id -> card model (classify.js)
for (const c of RAW.cards) M[c.id] = model(c);
const DECKS = {
  A: { key: 'A', name: 'Emerald-Amethyst Phillip', short: 'Phillip', inks: ['amethyst', 'emerald'], list: RAW.decks.A },
  B: { key: 'B', name: 'Amber-Amethyst Madrigals', short: 'Madrigals', inks: ['amber', 'amethyst'], list: RAW.decks.B }
};
const INK_OKLCH = { amber: 'oklch(0.79 0.145 78)', amethyst: 'oklch(0.70 0.155 305)', emerald: 'oklch(0.74 0.135 158)', ruby: 'oklch(0.68 0.175 22)', sapphire: 'oklch(0.72 0.125 245)', steel: 'oklch(0.78 0.028 250)' };

// Short names used by the scripted game and scenarios.
const SHORT = {
  Luisa: 'Luisa Madrigal - Pushing Through', Agustin: 'Agustin Madrigal - Exceptionally Kind', Alma: 'Alma Madrigal - Leading the Way',
  Hamm: 'Hamm - Piggy Bank', Dumbo: 'Dumbo - Ninth Wonder of the Universe', Demona: 'Demona - Scourge of the Wyvern Clan',
  Gaston: 'Gaston - Superior Archer', Isis: 'Isis Vanderchill - Ice Queen of St. Canard', Willow: 'Grandmother Willow - Ancient Advisor',
  Cheshire: 'Cheshire Cat - Inexplicable', Tigger: 'Tigger - Bouncing All the Way', Ursula: 'Ursula - Whisper of Vanessa',
  Horseman: 'The Horseman Strikes!', Storm: 'Raging Storm', Besties: 'Besties, Assemble!', Lantern: 'Lantern',
  Hades: 'Hades - Looking for a Deal', JWG: 'Junior Woodchuck Guidebook', Sven: 'Sven - Leaping Reindeer',
  Aladdin: 'Aladdin - Doing His Part', AG: 'Aladdin & Genie - Mischievous Pals', Silver: 'John Silver - Alien Pirate',
  Lenny: 'Lenny - Toy Binoculars', Lyle: 'Lyle Tiberius Rourke - Adventurer for Hire', MMS: 'Malicious, Mean, and Scary',
  Milo: 'Milo Thatch - Getting His Hands Dirty', Piercing: 'Piercing Attack', Phillip: 'Prince Phillip - Vanquisher of Foes',
  Rafiki: 'Rafiki - Mystical Fighter', RED: 'Retro Evolution Device', Star: 'Second Star to the Right',
  Huntsman: "The Huntsman - On the Queen's Orders", Wither: 'To Wither a Flower', Tod: 'Tod - Clever Fox', Sea: 'Under the Sea'
};
const ID = {};
for (const k in SHORT) { const c = RAW.cards.find(x => x.fullName === SHORT[k]); if (!c) throw new Error('missing ' + k); ID[k] = c.id; }

function deckIds(key) { const out = []; for (const [id, n] of DECKS[key].list) for (let i = 0; i < n; i++) out.push(id); return out; }
function face(id) {
  const m = M[id]; if (!m) return { name: 'Unknown card', version: '', cost: '?', ink: true, strip: 'var(--border)' };
  const inks = m.colors.map(c => INK_OKLCH[c]).filter(Boolean);
  return {
    id, name: m.name, version: m.version, full: m.full, cost: m.cost, ink: m.ink, type: m.type, song: m.song,
    str: m.str, wp: m.wp, lore: m.lore, hasStats: m.str != null || m.wp != null,
    strip: inks.length > 1 ? `linear-gradient(${inks[0]} 0 50%, ${inks[1]} 50% 100%)` : (inks[0] || 'var(--border)'),
    tint: inks[0] || 'var(--surface-3)', kw: Object.keys(m.kw).map(k => m.kw[k] === true ? cap(k) : `${cap(k)} ${m.kw[k]}`).join(' · ')
  };
}
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ---------- odds ----------
function lnC(n, k) { if (k < 0 || k > n) return -Infinity; let s = 0; for (let i = 1; i <= k; i++) s += Math.log((n - k + i) / i); return s; }
// P(at least one of K successes in n draws from N) — same formula as App.hypergeoAtLeastOne.
function pAtLeastOne(K, N, n) { if (K <= 0 || n <= 0 || N <= 0) return 0; if (n > N) n = N; if (N - K < n) return 1; return 1 - Math.exp(lnC(N - K, n) - lnC(N, n)); }
// P(at least one of A AND at least one of B) — two distinct card groups, inclusion–exclusion.
function pBoth(KA, KB, N, n) {
  if (KA <= 0 || KB <= 0) return 0; if (n > N) n = N;
  const none = (K) => (N - K < n) ? 0 : Math.exp(lnC(N - K, n) - lnC(N, n));
  return Math.max(0, 1 - none(KA) - none(KB) + none(KA + KB));
}

// ---------- RNG ----------
function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffleInPlace(arr, r) { for (let i = arr.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }

// ===================================================================
// MULLIGAN LAB
// Every way to mulligan the 7 (2^7 = 128 throw sets, deduplicated by
// the multiset of cards thrown) is played forward from the same seeds
// through turns 1–4 with a fixed, simple policy, so the comparison is
// paired and fair. What is measured is what the chapter says matters:
// can you spend your ink on turns 1–4, and do you see your plan card.
// ===================================================================
const MULL_TURNS = 4;

function mullCardInfo(id) {
  const m = M[id];
  return {
    id, cost: m.cost, ink: m.ink, isChar: m.type === 'Character', isItem: m.type === 'Item', song: m.song,
    reducer: m.reducer ? (m.reducer.exert ? (m.type === 'Item' ? 'item' : 'exert') : 'static') : null,
    shift: m.kw.shift || 0, shiftBase: m.shiftBase, name: m.name,
    singCost: m.type === 'Character' ? Math.max(m.cost, m.kw.singer || 0) : 0
  };
}

// Best play set this turn: maximise printed cost deployed with `cap` ink,
// `disc` one-ink discounts that only apply to characters. Bitset subset-sum
// per "characters used" layer, with backtracking so we know what left hand.
function bestSpend(cards, cap, disc, board) {
  const n = cards.length; const D = Math.min(disc, 3);
  const layers = [];               // layers[i][k] = bitmask of reachable printed sums after i items with k discounted chars
  let cur = new Array(D + 1).fill(0); cur[0] = 1;
  const costs = new Array(n), vals = new Array(n), isC = new Array(n), ok = new Array(n);
  for (let i = 0; i < n; i++) {
    const c = cards[i];
    let cost = c.cost;
    if (c.shift && board.some(b => c.shiftBase && c.shiftBase.includes(b.name))) cost = Math.min(cost, c.shift);
    costs[i] = cost; vals[i] = c.cost; isC[i] = c.isChar ? 1 : 0;
    ok[i] = !c.song && cost - (c.isChar && D > 0 ? 1 : 0) <= cap; // songs are sung, not paid for
  }
  for (let i = 0; i < n; i++) {
    layers.push(cur.slice());
    if (!ok[i]) continue;
    const nxt = cur.slice();
    for (let k = 0; k <= D; k++) {
      if (!cur[k]) continue;
      const k2 = Math.min(D, k + isC[i]);
      nxt[k2] |= (cur[k] << costs[i]) & 0x7fffffff;
    }
    cur = nxt;
  }
  // pick best (sum, k) with sum - k <= cap, using the PAID cost (shift cost when shifting); value = printed cost
  let best = -1, bk = 0, bs = 0;
  for (let k = 0; k <= D; k++) for (let s = 0; s <= 30; s++) if ((cur[k] >> s) & 1) { const paid = s - k; if (paid <= cap && paid >= 0 && s > best) { best = s; bk = k; bs = s; } }
  if (best <= 0) return { paid: 0, value: 0, played: [] };
  // backtrack
  const played = []; let k = bk, s = bs;
  for (let i = n - 1; i >= 0; i--) {
    const prev = layers[i];
    if ((prev[k] >> s) & 1) continue;            // reachable without item i
    // item i was used: find predecessor k'
    let found = false;
    for (let kp = 0; kp <= D && !found; kp++) {
      if (Math.min(D, kp + isC[i]) !== k) continue;
      if (s - costs[i] >= 0 && ((prev[kp] >> (s - costs[i])) & 1)) { played.push(i); s -= costs[i]; k = kp; found = true; }
    }
    if (!found) break;
  }
  let value = 0; for (const i of played) value += vals[i];
  return { paid: bs - bk, value, played };
}

function simulateHand(hand, library, opts, r, out) {
  // hand, library: arrays of card info objects (library already shuffled)
  const board = []; let well = 0; let li = 0; let total = 0; let missed = false; const H = hand.slice();
  const plan = opts.planId; let sawPlan = plan != null && H.some(c => c.id === plan);
  for (let t = 1; t <= MULL_TURNS; t++) {
    if (!(opts.onPlay && t === 1)) { const d = library[li++]; if (d) { H.push(d); if (d.id === plan) sawPlan = true; } }
    if (plan != null && t === opts.planTurn) out.plan += sawPlan ? 1 : 0;
    const disc = board.filter(b => b.reducer === 'static' || b.reducer === 'item' || (b.reducer === 'exert' && b.turn < t)).length;
    // ink step: pick the ink card that leaves the best play
    // the plan card is never inked while anything else can be ("will I regret losing access to this card?")
    let inkables = []; for (let i = 0; i < H.length; i++) if (H[i].ink) inkables.push(i);
    if (plan != null && inkables.some(i => H[i].id !== plan)) inkables = inkables.filter(i => H[i].id !== plan);
    let inkIdx = -1;
    if (inkables.length) {
      const all = bestSpend(H, well + 1, disc, board);
      const inPlay = new Set(all.played);
      let cand = inkables.filter(i => !inPlay.has(i));
      if (cand.length) {
        // keep cards you can cast in the next two turns; ink the rest, priciest first
        const soon = (c) => c.cost <= well + 3;
        cand.sort((a, b) => (soon(H[a]) - soon(H[b])) || (H[b].cost - H[a].cost));
        inkIdx = cand[0];
      } else {
        let bestV = -1;
        for (const i of inkables) { const rest = H.filter((_, j) => j !== i); const v = bestSpend(rest, well + 1, disc, board).value; if (v > bestV || (v === bestV && H[i].cost > H[inkIdx].cost)) { bestV = v; inkIdx = i; } }
      }
    }
    if (inkIdx >= 0) { H.splice(inkIdx, 1); well++; } else out.missInk[t - 1]++;
    const res = bestSpend(H, well, disc, board);
    let turnValue = res.value;
    const playedSet = new Set(res.played);
    const kept = [];
    for (let i = 0; i < H.length; i++) { if (playedSet.has(i)) { if (H[i].isChar || H[i].isItem) board.push({ ...H[i], turn: t }); } else kept.push(H[i]); }
    // songs: a dry character (on board before this turn) with enough cost sings one song each
    const singers = board.filter(b => b.isChar && b.turn < t).map(b => b.singCost).sort((a, b) => b - a);
    const rem = [];
    for (const c of kept) { if (c.song) { const si = singers.findIndex(s => s >= c.cost); if (si >= 0) { singers.splice(si, 1); turnValue += c.cost; continue; } } rem.push(c); }
    H.length = 0; H.push(...rem);
    total += turnValue;
    if (turnValue > 0) out.played[t - 1]++;
    if (res.paid >= well) out.full[t - 1]++;
    if (inkIdx < 0) missed = true;
  }
  // plan card later than turn 4: keep drawing (no plays) until that turn
  for (let t = MULL_TURNS + 1; plan != null && t <= opts.planTurn; t++) { const d = library[li++]; if (d && d.id === plan) sawPlan = true; if (t === opts.planTurn) out.plan += sawPlan ? 1 : 0; }
  if (missed) out.missAny++;
  out.value += total; out.values.push(total); out.raw.push(total);
}

// Evaluate all mulligans of `handIds` for deck `deckKey`.
// opts: { onPlay, planId, planTurn, sims, seed }. Returns options sorted by mean value.
// mulliganJob runs it in slices (step(k) simulates k more options) so a page can show progress.
function mulliganJob(deckKey, handIds, opts) {
  const sims = opts.sims || 600; const seed = opts.seed || 1;
  const lib0 = deckIds(deckKey);
  for (const id of handIds) { const i = lib0.indexOf(id); if (i >= 0) lib0.splice(i, 1); }
  const infoCache = {}; const info = (id) => infoCache[id] || (infoCache[id] = mullCardInfo(id));
  const groups = new Map();
  for (let mask = 0; mask < 128; mask++) {
    const thrown = []; const kept = [];
    for (let i = 0; i < 7; i++) ((mask >> i) & 1 ? thrown : kept).push(handIds[i]);
    const key = thrown.slice().sort((a, b) => a - b).join(',');
    if (!groups.has(key)) groups.set(key, { mask, thrown, kept, key });
  }
  const list = [...groups.values()]; const results = []; let next = 0;
  const job = {
    total: list.length, done: 0, results: null,
    step(k) {
      for (let c = 0; c < k && next < list.length; c++, next++) {
        const g = list[next];
        const out = { value: 0, values: [], raw: [], plan: 0, missInk: [0, 0, 0, 0], missAny: 0, played: [0, 0, 0, 0], full: [0, 0, 0, 0] };
        const r = rng(seed); // same seed stream for every option → paired comparison
        for (let s = 0; s < sims; s++) {
          const lib = shuffleInPlace(lib0.slice(), r);
          // Lorcana mulligan: thrown cards go to the bottom, replacements come off the top,
          // then the deck is shuffled (so thrown copies CAN come back on later draws).
          const redraw = lib.slice(0, g.thrown.length);
          const rest = lib.slice(g.thrown.length).concat(g.thrown);
          shuffleInPlace(rest, r);
          simulateHand(g.kept.concat(redraw).map(info), rest.map(info), opts, r, out);
        }
        const sorted = out.values.slice().sort((a, b) => a - b);
        results.push({ mask: g.mask, key: g.key, thrown: g.thrown, kept: g.kept, mean: out.value / sims, raw: out.raw,
          p10: sorted[Math.floor(sims * 0.1)], p50: sorted[Math.floor(sims * 0.5)], plan: opts.planId != null ? out.plan / sims : null,
          played: out.played.map(x => x / sims), full: out.full.map(x => x / sims), missInkByTurn: out.missInk.map(x => x / sims), missAny: out.missAny / sims, sims });
      }
      job.done = next;
      if (next >= list.length && !job.results) job.results = finishMulligan(results);
      return job;
    }
  };
  return job;
}
function finishMulligan(results) {
  results.sort((a, b) => b.mean - a.mean);
  // Same seeds for every option, so compare per simulated game (paired):
  // an option is "tied with the best" when the gap is inside 2 standard errors.
  const best = results[0];
  results.forEach((x, i) => {
    x.rank = i + 1;
    let sd = 0, md = 0; const n = x.raw.length;
    for (let s = 0; s < n; s++) md += best.raw[s] - x.raw[s];
    md /= n;
    for (let s = 0; s < n; s++) { const d = best.raw[s] - x.raw[s] - md; sd += d * d; }
    const se = Math.sqrt(sd / Math.max(1, n - 1) / n);
    x.gap = md; x.se = se; x.tied = i === 0 || md <= 2 * se + 1e-9;
  });
  results.forEach(x => { delete x.raw; });
  return results;
}
function mulliganOptions(deckKey, handIds, opts) { const j = mulliganJob(deckKey, handIds, opts); while (!j.results) j.step(200); return j.results; }

function dealHand(deckKey, seed) { const r = rng(seed); return shuffleInPlace(deckIds(deckKey), r).slice(0, 7); }

// ===================================================================
// RULES — a deliberately small, honest subset: enough to replay a turn,
// score it, and let a lens ask "what happens next". It is NOT a rules
// engine for the Dojo (the Dojo stays a sandbox); it exists so the
// prototypes can move cards the way the player would by hand.
// Every mutation appends to g.events, which the ledger reads.
// ===================================================================
function newPlayer(key, name) { return { key, name, lore: 0, well: 0, ready: 0, inked: false, hand: [], field: [], discard: [], inkwell: [], deck: [], disc: 0, hidden: 0 }; }
function newGame(first) {
  return { turn: 1, active: first || 0, seq: 0, players: [newPlayer('B', 'Madrigals'), newPlayer('A', 'Phillip')], events: [], log: [] };
}
function clone(g) { return JSON.parse(JSON.stringify(g)); }
function inst(g, p, id) { g.seq++; return { iid: (p === 0 ? 'm' : 'p') + g.seq, id, owner: p, exerted: false, played: -99, damage: 0, bonus: 0, used: false }; }
function nameOf(x) { return x && M[x.id] ? M[x.id].name : '?'; }
function find(g, iid) {
  for (let p = 0; p < 2; p++) for (const zone of ['field', 'hand', 'discard', 'inkwell']) {
    const arr = g.players[p][zone]; const i = arr.findIndex(c => c.iid === iid);
    if (i >= 0) return { p, zone, i, c: arr[i] };
  }
  return null;
}
function ev(g, e) { e.t = g.turn; e.a = g.active; g.events.push(e); return e; }
function say(g, text) { g.log.push({ t: g.turn, a: g.active, text }); }
function isDry(g, c) { return c.played < g.turn; }
function strOf(c) { const m = M[c.id]; return (m.str || 0) + (c.bonus || 0); }
function wpLeft(c) { return (M[c.id].wp || 0) - (c.damage || 0); }

// ---------- turn structure ----------
function startTurn(g, drawId) {
  const P = g.players[g.active];
  for (const c of P.field) { c.exerted = false; c.bonus = 0; c.used = false; }
  P.ready = P.well; P.inked = false; P.disc = 0;
  for (const c of P.field) { const m = M[c.id]; if (m.reducer && !m.reducer.exert && m.type === 'Character') P.disc += m.reducer.n; } // Willow
  if (drawId != null) draw(g, g.active, drawId, 'turn');
  ev(g, { kind: 'start', p: g.active });
}
function endTurn(g) { ev(g, { kind: 'end', p: g.active }); g.turn++; g.active ^= 1; }

// ---------- primitives ----------
function draw(g, p, id, why) {
  const P = g.players[p];
  let c;
  if (id == null) { c = P.deck.shift(); if (!c) return null; } // sandbox: known deck order
  else { const i = P.deck.findIndex(x => x.id === id); c = i >= 0 ? P.deck.splice(i, 1)[0] : inst(g, p, id); }
  P.hand.push(c); ev(g, { kind: 'draw', p, id: c.id, iid: c.iid, why: why || 'effect' });
  return c;
}
function pickHand(g, p, idOrIid) {
  const P = g.players[p];
  const i = P.hand.findIndex(c => c.iid === idOrIid || c.id === idOrIid);
  return i >= 0 ? i : -1;
}
function ink(g, p, idOrIid) {
  const P = g.players[p]; const i = pickHand(g, p, idOrIid); if (i < 0) throw new Error('ink: not in hand ' + idOrIid);
  const c = P.hand.splice(i, 1)[0]; P.inkwell.push(c); P.well++; P.ready++; P.inked = true;
  ev(g, { kind: 'ink', p, id: c.id, iid: c.iid }); say(g, `inked ${nameOf(c)}`);
  return c;
}
function costFor(g, p, id) { const m = M[id]; const P = g.players[p]; return Math.max(0, m.cost - (m.type === 'Character' ? P.disc : 0)); }
function play(g, p, idOrIid, opts) {
  opts = opts || {};
  const P = g.players[p]; const i = pickHand(g, p, idOrIid); if (i < 0) throw new Error('play: not in hand ' + idOrIid);
  const c = P.hand.splice(i, 1)[0]; const m = M[c.id];
  let paid = opts.free ? 0 : (opts.paid != null ? opts.paid : costFor(g, p, c.id));
  if (opts.shiftOnto) { paid = opts.paid != null ? opts.paid : m.kw.shift; }
  if (!opts.free && m.type === 'Character') P.disc = 0;
  P.ready -= paid;
  if (m.type === 'Character' || m.type === 'Item' || m.type === 'Location') {
    c.played = g.turn; c.exerted = false; c.damage = 0; c.bonus = 0;
    if (opts.shiftOnto) { const base = find(g, opts.shiftOnto); if (base) { c.damage = base.c.damage; c.played = base.c.played; c.exerted = base.c.exerted; P.field.splice(base.i, 1); } }
    P.field.push(c);
  } else P.discard.push(c);
  ev(g, { kind: 'play', p, id: c.id, iid: c.iid, paid, value: m.cost, how: opts.how || (opts.free ? 'free' : opts.shiftOnto ? 'shift' : 'ink') });
  say(g, `played ${nameOf(c)}${paid !== m.cost ? ` (paid ${paid})` : ''}`);
  return c;
}
function sing(g, p, songIdOrIid, singerIids) {
  const P = g.players[p]; const i = pickHand(g, p, songIdOrIid); const c = P.hand.splice(i, 1)[0];
  for (const s of singerIids) { const f = find(g, s); if (f) f.c.exerted = true; }
  P.discard.push(c);
  ev(g, { kind: 'play', p, id: c.id, iid: c.iid, paid: 0, value: M[c.id].cost, how: 'sing', by: singerIids });
  say(g, `${singerIids.map(s => nameOf(find(g, s).c)).join(' + ')} sang ${nameOf(c)}`);
  return c;
}
function quest(g, p, iid, supportTo) {
  const f = find(g, iid); const c = f.c; const m = M[c.id];
  c.exerted = true; g.players[p].lore += m.lore;
  ev(g, { kind: 'quest', p, id: c.id, iid, lore: m.lore });
  if (m.kw.support && supportTo) { const t = find(g, supportTo); if (t) { t.c.bonus += strOf(c); ev(g, { kind: 'support', p, iid, to: supportTo, n: strOf(c) }); } }
  say(g, `${nameOf(c)} quested (+${m.lore})${m.kw.support && supportTo ? `, Support → ${nameOf(find(g, supportTo).c)} +${m.str} strength` : ''}`);
}
function challengeMath(g, a, d) {
  const ma = M[a.id], md = M[d.id];
  const toD = Math.max(0, strOf(a) + (ma.kw.challenger || 0) - (md.kw.resist || 0));
  const toA = Math.max(0, (md.str || 0) + (d.bonus || 0) - (ma.kw.resist || 0));
  return { toD, toA, dDies: d.damage + toD >= (md.wp || 0), aDies: a.damage + toA >= (ma.wp || 0) };
}
function challenge(g, p, aiid, diid) {
  const a = find(g, aiid).c, d = find(g, diid).c;
  const r = challengeMath(g, a, d);
  a.exerted = true; a.damage += r.toA; d.damage += r.toD;
  ev(g, { kind: 'challenge', p, iid: aiid, id: a.id, def: diid, defId: d.id, toD: r.toD, toA: r.toA, dDies: r.dDies, aDies: r.aDies });
  say(g, `${nameOf(a)} challenged ${nameOf(d)} (${r.toD} dmg${r.dDies ? ', banished' : ''}; took ${r.toA}${r.aDies ? ', banished' : ''})`);
  if (r.dDies) banish(g, diid, { by: aiid, how: 'challenge' });
  if (r.aDies) banish(g, aiid, { by: diid, how: 'challenge' });
  return r;
}
function damage(g, iid, n, src) {
  const f = find(g, iid); if (!f || f.zone !== 'field') return;
  f.c.damage += n; ev(g, { kind: 'damage', p: f.p, iid, id: f.c.id, n, src: src || null });
  if (f.c.damage >= (M[f.c.id].wp || 0)) banish(g, iid, src);
}
function banish(g, iid, src) {
  const f = find(g, iid); if (!f || f.zone !== 'field') return;
  const P = g.players[f.p]; P.field.splice(f.i, 1); const c = f.c; c.exerted = false; c.bonus = 0;
  P.discard.push(c);
  ev(g, { kind: 'leave', p: f.p, iid, id: c.id, value: M[c.id].cost, how: (src && src.how) || 'banish', src: src || null });
}
function bounce(g, iid, src) {
  const f = find(g, iid); if (!f || f.zone !== 'field') return;
  const P = g.players[f.p]; P.field.splice(f.i, 1); const c = f.c; c.exerted = false; c.damage = 0; c.bonus = 0; c.played = -99;
  P.hand.push(c);
  ev(g, { kind: 'leave', p: f.p, iid, id: c.id, value: M[c.id].cost, how: 'bounce', src: src || null });
}
function exert(g, iid) { const f = find(g, iid); if (f) f.c.exerted = true; ev(g, { kind: 'exert', p: f.p, iid }); }
function discard(g, p, idOrIid, why) {
  const P = g.players[p]; const i = pickHand(g, p, idOrIid); const c = P.hand.splice(i, 1)[0]; P.discard.push(c);
  ev(g, { kind: 'discard', p, id: c.id, iid: c.iid, why: why || '' }); say(g, `discarded ${nameOf(c)}`);
}
function loreDelta(g, p, n, why) { g.players[p].lore = Math.max(0, g.players[p].lore + n); ev(g, { kind: 'lore', p, n, why }); }

// ---------- activations ----------
function activate(g, p, iid, arg) {
  const f = find(g, iid); const c = f.c; const m = M[c.id]; const P = g.players[p];
  if (m.reducer && m.reducer.exert) { c.exerted = true; P.disc += m.reducer.n; ev(g, { kind: 'act', p, iid, id: c.id, what: 'reduce' }); say(g, `${nameOf(c)}: next character costs 1 less`); return; }
  if (m.gain.act || m.draw.act) {
    c.exerted = true; P.ready -= m.actInk;
    ev(g, { kind: 'act', p, iid, id: c.id, what: 'engine', paid: m.actInk });
    if (m.gain.act) { P.lore += m.gain.act; ev(g, { kind: 'lore', p, n: m.gain.act, why: 'ability', iid }); }
    const drawn = [];
    for (let k = 0; k < m.draw.act; k++) { const d = draw(g, p, Array.isArray(arg) ? arg[k] : null, 'ability'); if (d) { d.from = iid; drawn.push(d); } }
    for (const e of g.events.slice(-m.draw.act)) if (e.kind === 'draw') e.src = iid;
    if (m.actOneShot) banish(g, iid, { how: 'sacrifice' });
    say(g, `${nameOf(c)} activated${m.gain.act ? ` (+${m.gain.act} lore)` : ''}${drawn.length ? `, drew ${drawn.map(nameOf).join(', ')}` : ''}`);
    return drawn;
  }
  if (m.upgrade) { // Retro Evolution Device: arg = { banish: iid, playId }
    c.exerted = true; P.ready -= m.actInk;
    ev(g, { kind: 'act', p, iid, id: c.id, what: 'upgrade', paid: m.actInk });
    const gone = nameOf(find(g, arg.banish).c);
    banish(g, arg.banish, { how: 'sacrifice', by: iid });
    const hi = pickHand(g, p, arg.playId); if (hi < 0) P.hand.push(inst(g, p, arg.playId));
    const played = play(g, p, arg.playId, { free: true, how: 'upgrade' });
    say(g, `Retro Evolution Device: banished ${gone} → played ${nameOf(played)} for free`);
    return played;
  }
}

// ---------- capability checks used by the sandbox ----------
function canQuest(g, c) { const m = M[c.id]; return m.type === 'Character' && !c.exerted && isDry(g, c) && !m.kw.reckless; }
function canChallenge(g, a, d) {
  const ma = M[a.id], md = M[d.id];
  if (ma.type !== 'Character' || md.type !== 'Character') return false;
  if (a.exerted || !(isDry(g, a) || ma.kw.rush)) return false;
  if (!d.exerted) return false;
  if (md.kw.evasive && !ma.kw.evasive) return false;
  return true;
}
function canActivate(g, c) {
  const m = M[c.id]; const P = g.players[c.owner];
  if (c.exerted) return false;
  if (m.type === 'Character' && !isDry(g, c)) return false;
  if (m.reducer && m.reducer.exert) return true;
  if (m.gain.act || m.draw.act || m.upgrade) return P.ready >= m.actInk;
  return false;
}
function canPlay(g, p, c) { const m = M[c.id]; if (m.song) return true; return costFor(g, p, c.id) <= g.players[p].ready; }
// singers available for a song (dry, ready characters whose cost — or Singer N — covers the song)
function singersFor(g, p, songId) {
  const s = M[songId]; return g.players[p].field.filter(c => { const m = M[c.id]; return m.type === 'Character' && !c.exerted && isDry(g, c) && Math.max(m.cost, m.kw.singer || 0) >= s.cost; });
}

// Valid targets for an "answer" record played by player p.
function answerTargets(g, p, ans, selfIid) {
  const out = [];
  for (let q = 0; q < 2; q++) {
    if (ans.opposing && q === p) continue;
    for (const c of g.players[q].field) {
      if (c.iid === selfIid) continue;
      const m = M[c.id];
      if (ans.target === 'character' && m.type !== 'Character') continue;
      if (ans.target === 'item' && m.type !== 'Item') continue;
      if (ans.scope === 'chosen' && q !== p && m.kw.ward) continue;       // Ward: opponents can't choose it
      if (!passesFilter(c, ans.filter)) continue;
      if (ans.subtypes && !ans.subtypes.some(s => m.subtypes.includes(s))) continue;
      out.push(c);
    }
  }
  return out;
}
function passesFilter(c, f) {
  const m = M[c.id]; if (!f) return true;
  if (f.strGte != null && (m.str || 0) + (c.bonus || 0) < f.strGte) return false;
  if (f.strLte != null && (m.str || 0) + (c.bonus || 0) > f.strLte) return false;
  if (f.costLte != null && m.cost > f.costLte) return false;
  if (f.costGte != null && m.cost < f.costGte) return false;
  if (f.kw && !m.kw[f.kw]) return false;
  if (f.damaged && !(c.damage > 0)) return false;
  if (f.exerted && !c.exerted) return false;
  return true;
}
// Resolve an answer against one target (or all, for sweepers).
function applyAnswer(g, p, ans, targetIid, srcIid) {
  const src = { by: srcIid, how: 'effect', card: srcIid ? (find(g, srcIid) || {}).c && find(g, srcIid).c.id : null };
  const hits = ans.scope === 'chosen' ? [find(g, targetIid) && find(g, targetIid).c].filter(Boolean) : answerTargets(g, p, Object.assign({}, ans, { scope: 'all' }), srcIid);
  for (const c of hits) {
    if (ans.mode === 'banish') banish(g, c.iid, src);
    else if (ans.mode === 'damage') damage(g, c.iid, ans.n, src);
    else if (ans.mode === 'bounce') bounce(g, c.iid, src);
    else if (ans.mode === 'bottom') { const f = find(g, c.iid); g.players[f.p].field.splice(f.i, 1); ev(g, { kind: 'leave', p: f.p, iid: c.iid, id: c.id, value: M[c.id].cost, how: 'bottom', src }); }
    else if (ans.mode === 'exert') exert(g, c.iid);
  }
  return hits.length;
}

// ===================================================================
// LENSES — pure functions of a game state. In the Dojo these would run
// inside render() against App.state; nothing here moves a card.
// ===================================================================
M[0] = Object.assign(model({ id: 0, name: 'Unknown card', fullName: 'Unknown card', cost: 0, inkwell: true, type: 'Unknown', color: '', abilities: [] }), { unknown: true });

function isChar(c) { return M[c.id] && M[c.id].type === 'Character'; }
function loreRate(P) { let r = 0; for (const c of P.field) if (isChar(c)) r += Math.max(M[c.id].lore, M[c.id].gain.act || 0); return r; }
function questableNow(g, P) { let r = 0; for (const c of P.field) if (isChar(c) && canQuest(g, c)) r += Math.max(M[c.id].lore, M[c.id].gain.act || 0); return r; }
function turnsTo20(lore, rate) { if (lore >= 20) return 0; if (rate <= 0) return Infinity; return Math.ceil((20 - lore) / rate); }

// ---------------- RACE CLOCK — "If nothing changes, who wins?" ----------------
// Both players quest with everything every turn; nobody challenges. Turn order matters:
// whoever is acting now gets the first quest.
function raceClock(g, me) {
  const P = g.players[me], O = g.players[me ^ 1];
  const myTurn = g.active === me;
  const rMe = loreRate(P), rOp = loreRate(O);
  const availMe = myTurn ? questableNow(g, P) : 0;
  const availOp = myTurn ? 0 : questableNow(g, O);
  // turns needed, counting the turn in progress as turn 1 for whoever is acting
  const kAct = (L, avail, r) => L >= 20 ? 0 : (L + avail >= 20 ? 1 : (r > 0 ? 1 + Math.ceil((20 - L - avail) / r) : Infinity));
  const kMe = myTurn ? kAct(P.lore, availMe, rMe) : turnsTo20(P.lore, rMe);
  const kOp = myTurn ? turnsTo20(O.lore, rOp) : kAct(O.lore, availOp, rOp);
  const finishTurn = (k, isActive) => k === Infinity ? null : (k === 0 ? g.turn : (isActive ? g.turn + 2 * (k - 1) : g.turn + 1 + 2 * (k - 1)));
  const fMe = finishTurn(kMe, myTurn), fOp = finishTurn(kOp, !myTurn);
  const winner = fMe == null && fOp == null ? null : (fOp == null || (fMe != null && fMe < fOp)) ? me : me ^ 1;
  // margin in game turns (half-rounds): +3 = a full round and a half ahead
  const margin = (fOp == null ? 99 : fOp) - (fMe == null ? 99 : fMe);
  // projected lore turn by turn (alternating, starting with the active player)
  const lanes = [];
  let lm = P.lore, lo = O.lore, who = g.active, first = true, t = g.turn;
  for (let i = 0; i < 14 && lm < 20 && lo < 20; i++) {
    if (who === me) { lm += first && myTurn ? availMe : rMe; } else { lo += first && !myTurn ? availOp : rOp; }
    lanes.push({ turn: t, who, me: Math.min(lm, 25), opp: Math.min(lo, 25), done: lm >= 20 || lo >= 20 });
    first = false; who ^= 1; t++;
  }
  return {
    me, myTurn, lore: [P.lore, O.lore], rate: [rMe, rOp], avail: myTurn ? availMe : availOp,
    k: [kMe, kOp], winner, margin, lanes,
    finish: [fMe, fOp],
    pressure: winner == null ? 'stalled' : winner === me ? (margin >= 3 ? 'ahead' : 'narrow') : (margin <= -3 ? 'behind' : 'close')
  };
}

// ---------------- HIDDEN INFORMATION ----------------
// Everything the opponent has not shown: their decklist minus field, discard and inkwell
// (inked cards are revealed on Duels.ink, which is what the Dojo imports).
function unseenPool(g, who) {
  const O = g.players[who];
  const counts = {}; for (const [id, n] of DECKS[O.key].list) counts[id] = (counts[id] || 0) + n;
  const seen = [...O.field, ...O.discard, ...O.inkwell];
  for (const c of seen) if (counts[c.id]) counts[c.id]--;
  let N = 0; for (const id in counts) N += counts[id];
  return { counts, N, hand: O.hand.length };
}

// What the opponent can do on their NEXT turn (they ready, draw, and ink once).
function oppCapabilities(g, me) {
  const O = g.players[me ^ 1];
  const ink = O.well + 1;
  const chars = O.field.filter(isChar);
  const singers = chars.map(c => Math.max(M[c.id].cost, M[c.id].kw.singer || 0));
  const singTotal = chars.reduce((s, c) => s + M[c.id].cost, 0);
  const upgrader = O.field.find(c => M[c.id].upgrade);
  const upgradeFrom = upgrader && ink >= M[upgrader.id].actInk ? chars.map(c => ({ iid: c.iid, id: c.id, upTo: M[c.id].cost + M[upgrader.id].upgrade.plus })) : [];
  return { ink, chars, singers, singTotal, upgrader, upgradeFrom };
}
// How could card `id` reach the table next turn? Returns a short label or null.
function castRoute(id, cap) {
  const m = M[id];
  if (m.song) {
    if (m.singTogether && cap.singTotal >= m.singTogether) return 'sung together';
    if (cap.singers.some(s => s >= m.cost)) return 'sung for free';
    if (cap.ink >= m.cost && !m.singTogether) return 'paid';
    return null;
  }
  if (m.type === 'Character' && cap.upgradeFrom.length) {
    const from = cap.upgradeFrom.filter(u => u.upTo >= m.cost && M[u.id].cost < m.cost).sort((a, b) => M[a.id].cost - M[b.id].cost)[0];
    if (from && m.cost > cap.ink - 1) return { via: 'upgrade', from: from.id };
  }
  if (cap.ink >= m.cost) return 'paid';
  if (m.kw.shift && cap.chars.some(c => m.shiftBase && m.shiftBase.includes(M[c.id].name)) && cap.ink >= m.kw.shift) return 'shifted';
  return null;
}
function answerHits(ans, c, assumeDamaged) {
  const m = M[c.id];
  if (ans.target !== 'character' || !isChar(c)) return false;
  if (ans.mode === 'exert') return false;
  if (ans.scope === 'chosen' && m.kw.ward) return false;
  const f = Object.assign({}, ans.filter || {});
  if (f.damaged && !(c.damage > 0) && !assumeDamaged) return false;
  delete f.damaged;
  if (!passesFilter(c, f)) return false;
  if (ans.subtypes && !ans.subtypes.some(s => m.subtypes.includes(s))) return false;
  if (ans.mode === 'damage') { const red = ans.ignoresResist ? 0 : (m.kw.resist || 0); return c.damage + (assumeDamaged ? 1 : 0) + Math.max(0, ans.n - red) >= m.wp; }
  return true; // banish / bounce / bottom
}
function playAnswers(id) { return M[id].answers.filter(a => (a.trigger === 'play' || a.trigger === 'trig') && a.target === 'character'); }

// ---------------- EXPOSURE — "what can they do to this next turn?" ----------------
function exposure(g, me, iid) {
  const P = g.players[me], O = g.players[me ^ 1];
  const X = P.field.find(c => c.iid === iid); if (!X || !isChar(X)) return null;
  const mx = M[X.id];
  const pool = unseenPool(g, me ^ 1); const n = Math.min(pool.N, pool.hand + 1);
  const cap = oppCapabilities(g, me);
  const out = { iid, id: X.id, exerted: X.exerted, certain: [], pool: [], combos: [] };
  // 1) challengers already on their board (they all ready next turn)
  if (X.exerted) for (const C of cap.chars) {
    const mc = M[C.id]; if (mx.kw.evasive && !mc.kw.evasive) continue;
    const r = challengeMath(g, C, X);
    if (r.dDies) out.certain.push({ kind: 'challenge', id: C.id, survives: !r.aDies });
  }
  // 2) single cards from the unseen pool
  const killers = {}; // id -> {route, why}
  for (const id in pool.counts) {
    const k = pool.counts[id]; if (!k) continue; const m = M[id];
    if (X.exerted && m.type === 'Character' && m.kw.rush && cap.ink >= m.cost && (!mx.kw.evasive || m.kw.evasive)) {
      const fake = { id: +id, damage: 0, bonus: 0 }; const r = challengeMath(g, fake, X);
      if (r.dDies) killers[id] = { route: 'Rush', why: `challenges for ${(m.str || 0) + (m.kw.challenger || 0)}` };
    }
    const route = castRoute(+id, cap); if (!route) continue;
    for (const a of playAnswers(+id)) if (answerHits(a, X, false)) { killers[id] = { route, why: a.mode }; break; }
  }
  let K = 0; for (const id in killers) K += pool.counts[id];
  for (const id in killers) out.pool.push({ id: +id, copies: pool.counts[id], p: pAtLeastOne(pool.counts[id], pool.N, n), route: killers[id].route, why: killers[id].why });
  out.pool.sort((a, b) => b.p - a.p);
  // 3) two-card combos: a sweeper that damages everything, then a "damaged" finisher
  if (!(X.damage > 0)) {
    const sweepers = [], finishers = [];
    for (const id in pool.counts) {
      if (!pool.counts[id]) continue; const route = castRoute(+id, cap); if (!route) continue;
      for (const a of playAnswers(+id)) {
        if (a.mode === 'damage' && a.scope !== 'chosen' && !(a.filter && a.filter.damaged)) sweepers.push({ id: +id, route });
        else if (!answerHits(a, X, false) && answerHits(a, X, true)) finishers.push({ id: +id, route });
      }
    }
    for (const s of sweepers) for (const f of finishers) if (s.id !== f.id && !killers[f.id] && !out.combos.some(c => c.a === s.id && c.b === f.id)) out.combos.push({ a: s.id, b: f.id, routeA: s.route, routeB: f.route, p: pBoth(pool.counts[s.id], pool.counts[f.id], pool.N, n) });
    out.combos.sort((a, b) => b.p - a.p);
  }
  // 4) ready now, but an "exert" card would expose it to a challenge from their board (Support counted)
  out.enabled = [];
  if (!X.exerted) {
    const supStr = cap.chars.filter(c => M[c.id].kw.support).reduce((s, c) => s + strOf(c), 0);
    const lethal = cap.chars.filter(C => !(mx.kw.evasive && !M[C.id].kw.evasive)).map(C => {
      const plain = challengeMath(g, C, X).dDies;
      const boosted = supStr && !M[C.id].kw.support ? challengeMath(g, Object.assign({}, C, { bonus: (C.bonus || 0) + supStr }), X).dDies : false;
      return plain || boosted ? { id: C.id, support: !plain } : null;
    }).filter(Boolean);
    if (lethal.length) {
      let KE = 0; const en = [];
      for (const id in pool.counts) {
        if (!pool.counts[id]) continue;
        const ok = playAnswers(+id).some(a => a.mode === 'exert' && (a.scope !== 'chosen' || !mx.kw.ward)) && castRoute(+id, cap);
        if (ok) { KE += pool.counts[id]; en.push(+id); }
      }
      if (KE) { const p = pAtLeastOne(KE, pool.N, n); out.enabled.push({ by: en, then: lethal, p }); }
    }
  }
  const pEnabled = out.enabled.length ? out.enabled[0].p : 0;
  const pSingle = K ? pAtLeastOne(K, pool.N, n) : 0;
  const pCombo = out.combos.length ? Math.max(...out.combos.map(c => c.p)) : 0;
  out.pAny = out.certain.length ? 1 : 1 - (1 - pSingle) * (1 - pCombo) * (1 - pEnabled);
  out.pool.n = n; out.N = pool.N; out.handNext = n;
  return out;
}

// ---------------- THREATS — "what happens if I don't answer this?" ----------------
function threatOf(g, me, iid) {
  const P = g.players[me], O = g.players[me ^ 1];
  const Y = O.field.find(c => c.iid === iid); if (!Y || !isChar(Y)) return null;
  const my = M[Y.id];
  const pool = unseenPool(g, me ^ 1); const n = Math.min(pool.N, pool.hand + 1);
  const cap = oppCapabilities(g, me);
  const res = { iid, id: Y.id, lore: Math.max(my.lore, my.gain.act || 0), cards: my.draw.act && !my.actOneShot ? my.draw.act : 0, condCards: my.draw.eot, enables: [], answers: [], blockers: [] };
  // unlocks: the Retro Evolution Device upgrade, Shift onto it, songs it can sing
  if (cap.upgrader) {
    const top = Object.keys(pool.counts).map(Number).filter(id => pool.counts[id] && M[id].type === 'Character' && M[id].cost > my.cost && M[id].cost <= my.cost + M[cap.upgrader.id].upgrade.plus).sort((a, b) => M[b].cost - M[a].cost);
    for (const id of top.slice(0, 2)) res.enables.push({ kind: 'upgrade', id, p: pAtLeastOne(pool.counts[id], pool.N, n), text: playAnswers(id).length ? describeAnswer(playAnswers(id)[0]) : '' });
  }
  for (const id in pool.counts) if (pool.counts[id] && M[id].shiftBase && M[id].shiftBase.includes(my.name)) res.enables.push({ kind: 'shift', id: +id, p: pAtLeastOne(pool.counts[id], pool.N, n), text: `Shift ${M[id].kw.shift}` });
  const singCost = Math.max(my.cost, my.kw.singer || 0);
  for (const id in pool.counts) { const m = M[id]; if (pool.counts[id] && m.song && !m.singTogether && m.cost <= singCost && playAnswers(+id).length) res.enables.push({ kind: 'sing', id: +id, p: pAtLeastOne(pool.counts[id], pool.N, n), text: describeAnswer(playAnswers(+id)[0]) }); }
  res.enables.sort((a, b) => b.p - a.p);
  // my answers: cards in hand, and challenges (with Support) — Ward and Evasive respected
  const myInk = P.ready + (P.inked ? 0 : 1);
  for (const c of P.hand) {
    const m = M[c.id];
    for (const a of playAnswers(c.id)) {
      if (a.mode === 'exert') continue;
      if (answerHits(a, Y, false)) res.answers.push({ kind: 'card', id: c.id, mode: a.mode, affordable: m.cost <= myInk || (m.song && singersFor(g, me, c.id).length > 0) });
      else if (a.scope === 'chosen' && my.kw.ward && passesFilter(Y, a.filter)) res.blockers.push({ id: c.id, why: 'Ward' });
    }
  }
  const supports = P.field.filter(c => isChar(c) && M[c.id].kw.support && canQuest(g, c));
  const exertAll = P.hand.some(c => playAnswers(c.id).some(a => a.mode === 'exert' && a.scope !== 'chosen') && M[c.id].cost <= myInk);
  const exertChosen = P.hand.some(c => playAnswers(c.id).some(a => a.mode === 'exert' && a.scope === 'chosen') && M[c.id].cost <= myInk);
  for (const A of P.field) {
    if (!isChar(A) || A.exerted || !(isDry(g, A) || M[A.id].kw.rush)) continue;
    if (my.kw.evasive && !M[A.id].kw.evasive) continue;
    const plain = challengeMath(g, A, Y);
    const sup = supports.filter(s => s.iid !== A.iid).reduce((s, x) => s + strOf(x), 0);
    const boosted = sup ? challengeMath(g, Object.assign({}, A, { bonus: (A.bonus || 0) + sup }), Y) : plain;
    const kill = plain.dDies ? 'plain' : (boosted.dDies ? 'support' : null);
    if (!kill) continue;
    const needsExert = !Y.exerted;
    const can = !needsExert || exertAll || (exertChosen && !my.kw.ward);
    res.answers.push({ kind: 'challenge', id: A.id, iid: A.iid, support: kill === 'support', survives: !(kill === 'plain' ? plain.aDies : boosted.aDies), needsExert, possible: can, viaExert: needsExert ? (exertAll ? 'exert-all' : (exertChosen && !my.kw.ward ? 'exert-chosen' : null)) : null });
  }
  // a single number to sort by: two turns of ignoring it
  res.ignore2 = 2 * res.lore + 2 * res.cards + res.condCards + res.enables.reduce((s, e) => s + e.p * (e.kind === 'upgrade' ? M[e.id].cost - my.cost + 3 : 2), 0);
  return res;
}
function describeAnswer(a) {
  const f = a.filter || {}; const bits = [];
  if (f.damaged) bits.push('damaged'); if (f.strGte != null) bits.push(`${f.strGte}+ strength`); if (f.strLte != null) bits.push(`≤${f.strLte} strength`); if (f.costLte != null) bits.push(`cost ≤${f.costLte}`); if (f.kw) bits.push(cap(f.kw));
  const who = a.scope === 'chosen' ? 'chosen' : (a.scope === 'all' ? 'ALL' : 'all opposing');
  const verb = a.mode === 'damage' ? `${a.n} damage to` : a.mode === 'bounce' ? 'return to hand:' : a.mode === 'bottom' ? 'bottom of deck:' : a.mode;
  return `${verb} ${who}${bits.length ? ' ' + bits.join(', ') : ''}`.trim();
}

// Board-wide view for one side.
function threatMap(g, me) {
  const O = g.players[me ^ 1], P = g.players[me];
  const theirs = O.field.filter(isChar).map(c => threatOf(g, me, c.iid)).sort((a, b) => b.ignore2 - a.ignore2);
  const mine = P.field.filter(isChar).map(c => exposure(g, me, c.iid));
  // dead cards: answers in the opponent's unseen pool that currently have no target on my board (virtual card advantage)
  const pool = unseenPool(g, me ^ 1); const dead = []; const live = [];
  for (const id in pool.counts) {
    if (!pool.counts[id]) continue; const as = playAnswers(+id).filter(a => a.mode !== 'exert'); if (!as.length) continue;
    const targets = P.field.filter(c => isChar(c) && as.some(a => answerHits(a, c, false)));
    (targets.length ? live : dead).push({ id: +id, copies: pool.counts[id], targets: targets.map(c => c.id) });
  }
  // sweepers: how much of my board one card takes
  const sweeps = [];
  for (const id in pool.counts) {
    if (!pool.counts[id]) continue;
    for (const a of playAnswers(+id)) if (a.scope !== 'chosen' && a.mode !== 'exert') {
      const hit = P.field.filter(c => isChar(c) && answerHits(a, c, false));
      if (hit.length) sweeps.push({ id: +id, copies: pool.counts[id], value: hit.reduce((s, c) => s + M[c.id].cost, 0), count: hit.length, route: castRoute(+id, oppCapabilities(g, me)) });
    }
  }
  return { theirs, mine, dead, live, sweeps, pool };
}

// ---------------- SANDBOX: legal actions + on-play resolution ----------------
function legalActions(g, me) {
  const P = g.players[me], O = g.players[me ^ 1]; const acts = [];
  if (g.pending) return acts;
  for (const c of P.hand) {
    const m = M[c.id];
    if (!P.inked && m.ink) acts.push({ kind: 'ink', iid: c.iid, label: `Ink ${m.name}` });
    if (m.song) { for (const s of singersFor(g, me, c.id)) acts.push({ kind: 'sing', iid: c.iid, singer: s.iid, label: `${M[s.id].name} sings ${m.name}` }); if (m.cost <= P.ready && !m.singTogether) acts.push({ kind: 'play', iid: c.iid, label: `Play ${m.name} (${m.cost})` }); }
    else if (m.type !== 'Unknown' && costFor(g, me, c.id) <= P.ready) acts.push({ kind: 'play', iid: c.iid, label: `Play ${m.name} (${costFor(g, me, c.id)})` });
  }
  for (const c of P.field) {
    const m = M[c.id];
    if (canQuest(g, c)) {
      if (m.kw.support) { const others = P.field.filter(x => x.iid !== c.iid && isChar(x)); acts.push({ kind: 'quest', iid: c.iid, label: `${m.name} quests` }); for (const t of others) acts.push({ kind: 'quest', iid: c.iid, support: t.iid, label: `${m.name} quests · Support → ${M[t.id].name}` }); }
      else acts.push({ kind: 'quest', iid: c.iid, label: `${m.name} quests (+${m.lore})` });
    }
    if (canActivate(g, c)) acts.push({ kind: 'activate', iid: c.iid, label: m.gain.act || m.draw.act ? `${m.name}: pay ${m.actInk} — draw${m.gain.act ? ' + ' + m.gain.act + ' lore' : ''}` : `${m.name}: next character costs 1 less` });
    for (const d of O.field) if (canChallenge(g, c, d)) acts.push({ kind: 'challenge', iid: c.iid, def: d.iid, label: `${m.name} → ${M[d.id].name}` });
  }
  return acts;
}
function hasSubtypeOther(g, p, subtype, exceptIid) { return g.players[p].field.some(c => c.iid !== exceptIid && isChar(c) && M[c.id].subtypes.includes(subtype)); }
function doAction(g, me, a) {
  const P = g.players[me];
  if (a.kind === 'ink') ink(g, me, a.iid);
  else if (a.kind === 'quest') quest(g, me, a.iid, a.support || null);
  else if (a.kind === 'challenge') challenge(g, me, a.iid, a.def);
  else if (a.kind === 'activate') activate(g, me, a.iid);
  else if (a.kind === 'sing' || a.kind === 'play') {
    const c = a.kind === 'sing' ? sing(g, me, a.iid, [a.singer]) : play(g, me, a.iid);
    resolveOnPlay(g, me, c);
  } else if (a.kind === 'target') {
    const pend = g.pending; g.pending = null;
    if (a.target) applyAnswer(g, me, pend.ans, a.target, pend.src);
    continueOnPlay(g, me, pend.rest, pend.src);
  }
  return g;
}
function resolveOnPlay(g, me, c) {
  const m = M[c.id];
  const steps = [];
  if (m.draw.play) steps.push({ draw: m.draw.play });
  for (const a of playAnswers(c.id)) steps.push({ ans: a });
  if (m.refill) steps.push({ refill: m.refill });
  continueOnPlay(g, me, steps, c.iid);
}
function continueOnPlay(g, me, steps, src) {
  while (steps.length) {
    const s = steps.shift();
    if (s.draw) { for (let k = 0; k < s.draw; k++) draw(g, me, null, 'effect'); continue; }
    if (s.refill) {
      for (let p = 0; p < 2; p++) while (g.players[p].hand.length < s.refill) { if (p === me) { if (!draw(g, p, null, 'effect')) break; } else { const u = inst(g, p, 0); g.players[p].hand.push(u); ev(g, { kind: 'draw', p, id: 0, iid: u.iid, why: 'effect' }); } }
      continue;
    }
    const a = s.ans;
    if (a.cond && a.cond.another && !hasSubtypeOther(g, me, a.cond.another, src)) continue;
    if (a.scope === 'chosen') {
      const targets = answerTargets(g, me, a, src).filter(t => a.mode !== 'damage' || true);
      if (!targets.length) continue;
      g.pending = { src, ans: a, targets: targets.map(t => t.iid), rest: steps };
      return;
    }
    applyAnswer(g, me, a, null, src);
  }
}

// ===================================================================
// SEQUENCING COACH — same actions, different order. Replays a turn's
// steps in any order on the turn-start state, marks what was illegal
// or wasteful, and finds the best order by trying all of them.
// ===================================================================
// A step: { key, kind: 'ink'|'activate'|'play'|'quest'|'challenge', who, card, att, def, support }
function coachRun(start, steps, inkChoice, me) {
  me = me || 0;
  const g = clone(start); g.events = []; g.log = [];
  const P = g.players[me], O = g.players[me ^ 1];
  const fieldIid = (p, k, pred) => { const c = g.players[p].field.find(x => x.id === ID[k] && (!pred || pred(x))); return c ? c.iid : null; };
  const out = []; let inkedAt = -1; let drawnBeforeInk = []; const readyBefore = [];
  steps.forEach((s, idx) => {
    const r = { key: s.key, ok: true, why: '', idx };
    readyBefore.push(P.ready);
    if (s.kind === 'ink') {
      const id = inkChoice; const c = P.hand.find(x => x.id === id);
      if (P.inked) { r.ok = false; r.why = 'already inked this turn'; }
      else if (!c) { r.ok = false; r.why = `${M[id].name} isn't in your hand yet`; }
      else if (!M[id].ink) { r.ok = false; r.why = `${M[id].name} is uninkable`; }
      else { ink(g, me, c.iid); inkedAt = idx; r.card = id; }
    } else if (s.kind === 'activate') {
      const iid = fieldIid(me, s.who, c => canActivate(g, c));
      if (!iid) { r.ok = false; r.why = P.ready < M[ID[s.who]].actInk ? 'no ink left for it' : `${M[ID[s.who]].name} can't activate now`; }
      else { const before = P.hand.length; activate(g, me, iid); r.drew = P.hand.slice(before).map(c => c.id); }
    } else if (s.kind === 'play') {
      const c = P.hand.find(x => x.id === ID[s.card]);
      if (!c) { r.ok = false; r.why = 'not in hand'; }
      else if (costFor(g, me, c.id) > P.ready) { r.ok = false; r.why = `needs ${costFor(g, me, c.id)} ink, you have ${P.ready}`; }
      else { const before = P.hand.length; const pc = play(g, me, c.iid); resolveAll(g, me, pc); r.drew = P.hand.slice(before - 1).filter(x => x.iid !== c.iid).map(x => x.id); }
    } else if (s.kind === 'quest') {
      const iid = fieldIid(me, s.who, c => canQuest(g, c));
      if (!iid) { r.ok = false; r.why = `${M[ID[s.who]].name} can't quest now`; }
      else {
        // Support goes to the next challenger in the sequence (the obvious target)
        let to = null;
        if (s.support) { const nextCh = steps.slice(idx + 1).find(x => x.kind === 'challenge'); if (nextCh) to = fieldIid(me, nextCh.att, c => !c.exerted); }
        quest(g, me, iid, to); r.supportTo = to ? M[find(g, to).c.id].name : null;
      }
    } else if (s.kind === 'challenge') {
      const ai = fieldIid(me, s.att, c => !c.exerted); const di = fieldIid(me ^ 1, s.def);
      if (!ai) { r.ok = false; r.why = `${M[ID[s.att]].name} isn't ready`; }
      else if (!di) { r.ok = false; r.why = `${M[ID[s.def]].name} is gone`; }
      else if (!canChallenge(g, find(g, ai).c, find(g, di).c)) { r.ok = false; r.why = find(g, di).c.exerted ? 'not allowed' : `${M[ID[s.def]].name} isn't exerted — only exerted characters can be challenged`; }
      else { const res = challenge(g, me, ai, di); r.res = res; }
    }
    out.push(r);
  });
  return { g, steps: out, inkedAt, readyBefore };
}
function resolveAll(g, me, c) { resolveOnPlay(g, me, c); while (g.pending) { const t = g.pending.targets[0]; doAction(g, me, { kind: 'target', target: t }); } }

function coachScore(start, run, me) {
  me = me || 0;
  const g = run.g, P = g.players[me], O = g.players[me ^ 1], P0 = start.players[me], O0 = start.players[me ^ 1];
  const val = (arr) => arr.filter(c => M[c.id].type !== 'Unknown').reduce((s, c) => s + M[c.id].cost, 0);
  const rc = raceClock(Object.assign(clone(g), { active: me }), me);
  const removed = val(O0.field) - val(O.field);
  const lost = val(P0.field.filter(c => !P.field.some(x => x.iid === c.iid)));
  const up = O.field.find(c => M[c.id].upgrader || M[c.id].upgrade);
  const pool = unseenPool(g, me ^ 1);
  const comboOpen = !!up && O.field.some(c => isChar(c) && Object.keys(pool.counts).some(id => pool.counts[id] && M[id].type === 'Character' && M[id].cost > M[c.id].cost && M[id].cost <= M[c.id].cost + M[up.id].upgrade.plus && M[id].cost >= 8));
  const illegal = run.steps.filter(s => !s.ok).length;
  // a card with removal text but no legal target on this board isn't a resource right now
  const dead = (id) => { const as = playAnswers(id).filter(a => a.mode !== 'exert'); return as.length > 0 && !as.some(a => answerTargets(g, me, a, null).some(t => t.owner !== me)); };
  const liveHand = P.hand.filter(c => !dead(c.id)).length;
  return { lore: P.lore - P0.lore, removed, lost, readyLeft: P.ready, hand: P.hand.length, liveHand, finish: rc.finish, winner: rc.winner, margin: rc.margin, rate: rc.rate, comboOpen, illegal };
}

// Rules that turn a replay into feedback.
function coachFlags(start, steps, run, me) {
  me = me || 0;
  const flags = [];
  const P0 = start.players[me];
  const inkIdx = steps.findIndex(s => s.kind === 'ink');
  // R1 · Gather information before irreversible decisions: a draw you could already afford came after the ink.
  if (inkIdx >= 0 && run.steps[inkIdx].ok) {
    steps.forEach((s, j) => {
      if (j <= inkIdx || !run.steps[j].ok) return;
      const card = s.kind === 'activate' ? ID[s.who] : s.kind === 'play' ? ID[s.card] : null; if (!card) return;
      const m = M[card]; const draws = s.kind === 'activate' ? m.draw.act : m.draw.play;
      if (!draws) return;
      const cost = s.kind === 'activate' ? m.actInk : m.cost;
      if (run.readyBefore[inkIdx] < cost) return;
      // the sandbox knows the deck order: what would that draw have shown at the moment you inked?
      const peek = coachRun(start, steps.slice(0, inkIdx), null, me).g.players[me].deck.slice(0, draws).map(c => c.id);
      flags.push({ at: inkIdx, rule: 'info', seen: peek, title: `Ink after ${m.name} draws`, text: `${m.name}'s draw was affordable with ${run.readyBefore[inkIdx]} ink before you inked. Draw first, then choose: you'd have seen ${peek.map(id => M[id].name).join(', ') || 'a new card'}.` });
    });
  }
  // R1b · Ink quality: a card with no job on this board was available to ink instead.
  if (inkIdx >= 0 && run.steps[inkIdx].ok) {
    const inked = run.steps[inkIdx].card;
    const deadNow = (id) => { const as = playAnswers(id).filter(a => a.mode !== 'exert'); return as.length > 0 && !as.some(a => answerTargets(start, me, a, null).some(t => t.owner !== me)); };
    const handAtInk = new Set(coachRun(start, steps.slice(0, inkIdx), null, me).g.players[me].hand.map(c => c.id));
    if (!deadNow(inked)) { const alt = [...handAtInk].find(id => id !== inked && M[id].ink && deadNow(id)); if (alt) flags.push({ at: inkIdx, rule: 'ink', title: `Ink ${M[alt].name} instead`, text: `${M[alt].name} has no target on this board; ${M[inked].name} still has a job. Will you regret losing access to it?` }); }
  }
  // R2 · Support before the challenge it should power.
  steps.forEach((s, j) => {
    if (s.kind !== 'quest' || !s.support || !run.steps[j].ok) return;
    const earlier = steps.findIndex((x, i) => i < j && x.kind === 'challenge' && run.steps[i].ok);
    if (earlier >= 0) {
      const ch = run.steps[earlier];
      flags.push({ at: earlier, rule: 'support', title: `Quest with ${M[ID[s.who]].name} first`, text: `Support adds +${M[ID[s.who]].str} strength to the next challenger, but it came after this challenge${ch.res && !ch.res.dDies ? ` — ${M[ID[steps[earlier].def]].name} survived on ${ch.res.toD} damage` : ''}.` });
    }
  });
  // R3 · Discounts before the character they discount.
  steps.forEach((s, j) => {
    if (s.kind !== 'activate' || !M[ID[s.who]].reducer || !run.steps[j].ok) return;
    const before = steps.findIndex((x, i) => i < j && x.kind === 'play' && M[ID[x.card]].type === 'Character' && run.steps[i].ok);
    if (before >= 0) flags.push({ at: j, rule: 'reducer', title: `${M[ID[s.who]].name} came too late`, text: `Its discount only applies to the next character you play — ${M[ID[steps[before].card]].name} already paid full price.` });
  });
  // R4 · Illegal steps (usually: challenged before the target was exerted).
  run.steps.forEach((r, j) => { if (!r.ok) flags.push({ at: j, rule: 'illegal', title: 'Not possible here', text: r.why }); });
  // R5 · Ink left on the table.
  const P = run.g.players[me];
  if (P.ready > 0) {
    const usable = P.hand.some(c => M[c.id].type !== 'Unknown' && !M[c.id].song && costFor(run.g, me, c.id) <= P.ready) || P.field.some(c => canActivate(run.g, c) && M[c.id].actInk > 0);
    if (usable) flags.push({ at: steps.length - 1, rule: 'float', title: `${P.ready} ink unspent`, text: 'Something in hand or on board could still use it.' });
  }
  return flags;
}

function permutations(arr) { if (arr.length <= 1) return [arr.slice()]; const out = []; arr.forEach((x, i) => { for (const p of permutations(arr.slice(0, i).concat(arr.slice(i + 1)))) out.push([x].concat(p)); }); return out; }
// Better = wins the race (or by more), then removes more, then loses less, then keeps more cards.
function coachBetter(a, b) {
  const key = (s) => [s.illegal === 0 ? 1 : 0, s.winner === 0 ? 1 : 0, Math.min(s.margin, 30), s.comboOpen ? 0 : 1, s.removed - s.lost, s.lore, s.liveHand];
  const ka = key(a), kb = key(b); for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] > kb[i]; return false;
}
function coachBest(start, steps, me) {
  let best = null; let tried = 0; const all = [];
  const inkables = new Set();
  for (const c of start.players[me || 0].hand) if (M[c.id].ink) inkables.add(c.id);
  for (const c of start.players[me || 0].deck.slice(0, 3)) if (M[c.id].ink) inkables.add(c.id);
  for (const order of permutations(steps)) for (const ink of inkables) {
    const run = coachRun(start, order, ink, me); const sc = coachScore(start, run, me); tried++;
    if (sc.illegal) continue;
    const flags = coachFlags(start, order, run, me).filter(f => f.rule !== 'float');
    const cand = { order: order.map(s => s.key), ink, score: sc, flags: flags.length };
    if (!best || coachBetter(sc, best.score) || (!coachBetter(best.score, sc) && cand.flags < best.flags)) best = cand;
    all.push(cand);
  }
  const same = all.filter(c => !coachBetter(best.score, c.score) && !coachBetter(c.score, best.score)).length;
  const legal = all.length;
  return { best, tried, legal, same };
}

// ===================================================================
// THE GAME — one scripted, rules-consistent game between the two
// decklists, Madrigals (player 0, on the play) vs Phillip (player 1).
// Every prototype reads it: the Mulligan Lab opens on its opening
// hand, the Race Clock / Threat Map / Coach sit on its turn 13, the
// Ledger replays all of it, the Briefing drills its positions.
// ===================================================================
function scriptDSL(g) {
  const me = () => g.active, op = () => g.active ^ 1;
  const F = (p, k, pred) => { const c = g.players[p].field.find(x => x.id === ID[k] && (!pred || pred(x))); if (!c) throw new Error(`T${g.turn}: no ${k} on field of p${p}`); return c.iid; };
  return {
    ink: (k) => ink(g, me(), ID[k]),
    play: (k, o) => { const c = g.players[me()].hand.find(x => x.id === ID[k]); if (!c) throw new Error(`T${g.turn}: ${k} not in hand`); if (!(o && o.free) && costFor(g, me(), ID[k]) > g.players[me()].ready) throw new Error(`T${g.turn}: can't afford ${k} (${g.players[me()].ready} ready)`); return play(g, me(), ID[k], o); },
    quest: (k, sup) => { const iid = F(me(), k, c => canQuest(g, c)); return quest(g, me(), iid, sup ? F(me(), sup) : null); },
    ch: (a, d) => { const ai = F(me(), a, c => !c.exerted); const di = F(op(), d); if (!canChallenge(g, find(g, ai).c, find(g, di).c)) throw new Error(`T${g.turn}: illegal challenge ${a}→${d}`); return challenge(g, me(), ai, di); },
    sing: (song, singer) => sing(g, me(), ID[song], [F(me(), singer, c => !c.exerted)]),
    act: (k, arg) => { const iid = F(me(), k, c => canActivate(g, c)); return activate(g, me(), iid, arg); },
    red: (banishK, playK) => activate(g, me(), F(me(), 'RED', c => canActivate(g, c)), { banish: F(me(), banishK), playId: ID[playK] }),
    dmgOpp: (k, n, src) => damage(g, F(op(), k), n, { how: 'effect', card: ID[src] }),
    dmgAllOpp: (n, src) => { for (const c of g.players[op()].field.slice()) if (M[c.id].type === 'Character') damage(g, c.iid, n, { how: 'effect', card: ID[src] }); },
    banishOpp: (k, src) => banish(g, F(op(), k), { how: 'effect', card: ID[src] }),
    bounceOpp: (k, src) => bounce(g, F(op(), k), { how: 'effect', card: ID[src] }),
    shift: (k, baseK) => { const base = F(me(), baseK); return play(g, me(), ID[k], { shiftOnto: base }); },
    exertOpp: (k, src) => exert(g, F(op(), k)),
    exertAllOpp: () => { for (const c of g.players[op()].field) if (M[c.id].type === 'Character') exert(g, c.iid); },
    draw: (...ks) => ks.map(k => draw(g, me(), ID[k], 'effect')),
    drawOpp: (...ks) => ks.map(k => draw(g, op(), ID[k], 'effect')),
    discard: (k, why) => discard(g, me(), ID[k], why),
    drain: (n, why) => loreDelta(g, op(), -n, why),
    note: (text) => say(g, text)
  };
}

function snapshot(g) { return JSON.parse(JSON.stringify({ turn: g.turn, active: g.active, players: g.players, nEvents: g.events.length })); }

function buildGame() {
  const g = newGame(0);
  const D = scriptDSL(g);
  const handOf = (p, ks) => { for (const k of ks) g.players[p].hand.push(inst(g, p, ID[k])); };
  // Opening hands and the Madrigals mulligan (Raging Storm + Demona to the bottom).
  const MADR_OPEN = ['Luisa', 'Hamm', 'Agustin', 'Gaston', 'Storm', 'Demona', 'Alma'];
  const PHIL_OPEN = ['Rafiki', 'Huntsman', 'Tod', 'RED', 'Phillip', 'MMS', 'Hades'];
  handOf(0, MADR_OPEN); handOf(1, PHIL_OPEN);
  for (const k of ['Storm', 'Demona']) { const i = pickHand(g, 0, ID[k]); g.players[0].hand.splice(i, 1); }
  handOf(0, ['Dumbo', 'JWG']);
  g.events.push({ t: 0, kind: 'mulligan', p: 0, thrown: [ID.Storm, ID.Demona], drew: [ID.Dumbo, ID.JWG] });
  const snaps = [];
  const turn = (drawK, body) => {
    startTurn(g, g.turn === 1 ? null : ID[drawK]);
    snaps.push({ turn: g.turn, active: g.active, start: snapshot(g) });
    try { body(D); } catch (e) { e.message += ' | hands: M[' + g.players[0].hand.map(c => M[c.id].name) + '] P[' + g.players[1].hand.map(c => M[c.id].name) + '] ready ' + g.players[g.active].ready; throw e; }
    snaps[snaps.length - 1].end = snapshot(g);
    endTurn(g);
  };

  // T1 Madrigals — 1-drop, ink the 5-drop with no early job.
  turn(null, d => { d.ink('Gaston'); d.play('Luisa'); });
  // T2 Phillip
  turn('Lyle', d => { d.ink('Phillip'); d.play('Rafiki'); });
  // T3 Madrigals — Hamm; Luisa quests into an untapped Rafiki (Challenger +3 kills her).
  turn('Besties', d => { d.ink('Besties'); d.play('Hamm'); d.quest('Luisa'); });
  // T4 Phillip — Rafiki punishes the exerted Luisa; Lyle loots.
  turn('Aladdin', d => { d.ink('Hades'); d.ch('Rafiki', 'Luisa'); d.play('Lyle'); d.draw('Milo'); d.discard('Aladdin', 'Lyle'); });
  // T5 Madrigals — Hamm discount → Agustin on 3. Hamm is now exerted.
  turn('Hades', d => { d.ink('Alma'); d.act('Hamm'); d.play('Agustin'); });
  // T6 Phillip — Rafiki trades with the exerted Hamm; Tod loots; Lyle drains (2 cards hit the discard).
  turn('Sven', d => {
    d.ink('Milo'); d.ch('Rafiki', 'Hamm'); d.play('Tod'); d.draw('Piercing', 'Aladdin'); d.discard('Aladdin', 'Tod'); d.quest('Lyle');
    d.drain(1, 'Lyle · Dirty Tricks');
  });
  // T7 Madrigals — Agustin removes the Lyle engine; Dumbo comes down and threatens to draw every turn.
  turn('Luisa', d => { d.ink('Luisa'); d.ch('Agustin', 'Lyle'); d.play('Dumbo'); });
  // T8 Phillip — has to answer Dumbo: Tod sings Malicious, Mean, and Scary, Piercing Attack finishes it.
  turn('Huntsman', d => { d.ink('Huntsman'); d.sing('MMS', 'Tod'); d.dmgAllOpp(1, 'MMS'); d.play('Piercing'); d.dmgOpp('Dumbo', 2, 'Piercing'); });
  // T9 Madrigals — Hades: Phillip keeps Tod, so Madrigals draw 2.
  turn('Cheshire', d => { d.ink('Cheshire'); d.play('Hades'); d.note('Hades: Phillip declined to bottom Tod'); d.draw('Hamm', 'Luisa'); d.quest('Agustin'); });
  // T10 Phillip — Retro Evolution Device goes down. Tod quests.
  turn('Hades', d => { d.ink('Huntsman'); d.play('RED'); d.quest('Tod'); });
  // T11 Madrigals — Dumbo again + Hamm; Agustin and Hades quest.
  turn('Dumbo', d => { d.ink('Luisa'); d.play('Dumbo'); d.play('Hamm'); d.quest('Agustin'); d.quest('Hades'); });
  // T12 Phillip — the tempo turn: Hades (Madrigals keep Dumbo, so Phillip draws 2), then the Device turns
  //   Hades into Milo for 1 ink. Milo discards Sven to send the Madrigal Hades back to hand; two cards hit
  //   the discard this turn, so Milo draws at end of turn.
  turn('Aladdin', d => {
    d.ink('Aladdin'); d.play('Hades'); d.note('Hades: Madrigals kept Dumbo, Phillip drew 2'); d.draw('Milo', 'Phillip');
    d.red('Hades', 'Milo'); d.discard('Sven', 'Milo · Scholar\'s Gambit'); d.bounceOpp('Hades', 'Milo');
    d.quest('Tod'); d.draw('MMS'); d.note('Milo · Practical Knowledge: drew a card');
  });
  // ---- T13: THE POSITION. Madrigals to act. (Every lens opens here.) ----
  // The line the Coach teaches: draw first (Dumbo), ink the dead card it finds, Demona exerts their whole
  // board (Ward can't stop an "all"), Agustin's Support turns Hamm into a 5-strength challenger for Milo.
  turn('Demona', d => {
    d.act('Dumbo', [ID.Gaston]); d.ink('Gaston'); d.play('Demona'); d.exertAllOpp();
    d.draw('Luisa'); d.drawOpp('Piercing'); d.note('Demona: both players refill to 3');
    d.quest('Agustin', 'Hamm'); d.ch('Hamm', 'Milo');
  });
  // T14 Phillip — out of big threats: Tod sings MMS, Piercing finishes Dumbo.
  turn('Lenny', d => { d.ink('Lenny'); d.sing('MMS', 'Tod'); d.dmgAllOpp(1, 'MMS'); d.play('Piercing'); d.dmgOpp('Dumbo', 2, 'Piercing'); });
  // T15 Madrigals — Hades (Phillip keeps Tod, Madrigals draw 2); Alma exerts Tod, Agustin removes it. Demona quests.
  turn('Isis', d => {
    d.ink('JWG'); d.play('Hades'); d.note('Hades: Phillip kept Tod, Madrigals drew 2'); d.draw('Alma', 'Willow');
    d.play('Alma'); d.exertOpp('Tod', 'Alma'); d.play('Luisa'); d.ch('Agustin', 'Tod'); d.quest('Demona');
  });
  // T16 Phillip — Milo hard-cast; discards Prince Phillip to bounce Demona.
  turn('Milo', d => { d.note('No ink: Prince Phillip is kept as the discard for Milo'); d.play('Milo'); d.discard('Phillip', 'Milo · Scholar\'s Gambit'); d.bounceOpp('Demona', 'Milo'); });
  // T17 Madrigals — Agustin's Support again: Luisa (Challenger +2) takes Milo. Everyone else quests.
  turn('Sven', d => {
    d.ink('Isis'); d.play('Demona'); d.exertAllOpp(); d.draw('Agustin'); d.drawOpp('Silver', 'AG', 'Tod'); d.note('Demona: Madrigals refill to 3, Phillip (empty-handed) draws 3');
    d.quest('Agustin', 'Luisa'); d.ch('Luisa', 'Milo'); d.quest('Hades'); d.quest('Alma'); d.play('Willow');
  });
  // T18 Phillip — rebuilds: John Silver + Aladdin.
  turn('Aladdin', d => { d.ink('Tod'); d.play('Silver'); d.note('John Silver: Hades gains Reckless'); d.play('Aladdin'); });
  // T19 Madrigals
  //   Hades is Reckless this turn (John Silver): it can't quest, and there is nothing exerted to challenge.
  turn('Tigger', d => { d.ink('Tigger'); d.play('Sven'); d.quest('Agustin'); d.quest('Alma'); d.quest('Demona'); });
  // T20 Phillip — behind on the clock, Phillip trades instead of questing: John Silver into Demona.
  //   But Milo's bounce on T16 had wiped Demona's damage — she survives on 5, Silver doesn't.
  turn('Tod', d => { d.ink('Tod'); d.shift('AG', 'Aladdin'); d.draw('Lenny'); d.note('Aladdin & Genie: empty hand, draws 1'); d.ch('Silver', 'Demona'); });
  // T21 Madrigals — 21 lore.
  turn('Agustin', d => {
    d.ink('Agustin'); d.quest('Agustin'); d.quest('Hades'); d.quest('Alma'); d.quest('Sven'); d.quest('Willow'); d.quest('Demona');
    ev(g, { kind: 'win', p: 0 }); d.note('Madrigals reach 20 lore');
  });
  return { g, snaps };
}

// ===================================================================
// POSITIONS — any turn of the scripted game as a fresh, playable state.
// ===================================================================
let GAME = null;
function game() { return GAME || (GAME = buildGame()); }
function fromSnap(s) { return { turn: s.turn, active: s.active, seq: 9000, players: JSON.parse(JSON.stringify(s.players)), events: [], log: [], pending: null }; }
// The Madrigals' real future draws, so the sandbox's Dumbo / Demona draws match the game.
const MADR_FUTURE = ['Gaston', 'Luisa', 'Isis', 'Alma', 'Willow', 'Sven', 'Agustin', 'Tigger', 'Agustin', 'Hamm'];
function position(turn) {
  const s = game().snaps.find(x => x.turn === turn); if (!s) return null;
  const g = fromSnap(s.start);
  if (turn === 13) g.players[0].deck = MADR_FUTURE.map(k => inst(g, 0, ID[k]));
  return g;
}
function scenario() { return position(13); }

// ===================================================================
// LEDGER — Tempo, Card Advantage and Card Value, read straight off the
// event log. In the Dojo the same log comes from _trackAction plus a
// per-instance record; on a Duels.ink replay, from takenAction frames.
// ===================================================================
function buildLedger(G) {
  G = G || game();
  const { g, snaps } = G;
  const val = (id) => (M[id] ? M[id].cost : 0);
  const boardVal = (P) => P.field.filter(c => M[c.id].type !== 'Unknown').reduce((s, c) => s + val(c.id), 0);
  const resources = (P) => P.hand.length + P.field.length;
  const rec = {}; const all = []; // iid -> current receipt (a bounced card that comes back starts a new one)
  const fresh = (iid, id, owner) => { const r = { iid, id, owner, in: null, out: null, how: null, by: null, lore: 0, drew: 0, kills: [], hitBy: [], quests: 0, challenges: 0 }; rec[iid] = r; all.push(r); return r; };
  const R = (iid, id, owner) => rec[iid] || fresh(iid, id, owner);
  const lastPlayed = [null, null];
  const turns = snaps.map(s => ({ t: s.turn, p: s.active, built: 0, paid: 0, free: 0, removed: 0, lost: 0, sacrificed: 0, lore: 0, drew: 0, spent: 0, taken: 0, plays: [], removals: [], losses: [] }));
  for (const e of g.events) {
    if (!e.t) continue; const T = turns[e.t - 1]; if (!T) continue; const me = T.p;
    if (e.kind === 'play') {
      const m = M[e.id]; const r = (rec[e.iid] && rec[e.iid].in == null) ? rec[e.iid] : fresh(e.iid, e.id, e.p); r.in = e.t; lastPlayed[e.p] = e.iid;
      if (e.p === me) {
        T.paid += e.paid; T.plays.push({ id: e.id, paid: e.paid, how: e.how });
        if (m.type === 'Character' || m.type === 'Item') { T.built += m.cost; if (e.paid < m.cost) T.free += m.cost - e.paid; }
        else { T.spent += 1; if (e.how === 'sing') T.free += m.cost; }
      }
    } else if (e.kind === 'act' && e.p === me) { T.paid += e.paid || 0; }
    else if (e.kind === 'quest') { const r = R(e.iid, e.id, e.p); r.lore += e.lore; r.quests++; if (e.p === me) T.lore += e.lore; }
    else if (e.kind === 'lore') { if (e.iid) R(e.iid, null, e.p).lore += e.n; if (e.p === me) T.lore += e.n; else T.lore -= 0; }
    else if (e.kind === 'draw') {
      if (e.why === 'turn') continue;
      const src = e.src || lastPlayed[e.p]; if (src && rec[src]) rec[src].drew++;
      if (e.p === me) T.drew++;
    } else if (e.kind === 'challenge') {
      const a = R(e.iid, e.id, e.p); a.challenges++;
      if (e.dDies) a.kills.push({ id: e.defId, value: val(e.defId) });
      if (e.aDies) R(e.def, e.defId, e.p ^ 1).kills.push({ id: e.id, value: val(e.id) });
      R(e.def, e.defId, e.p ^ 1).hitBy.push(e.id);
    } else if (e.kind === 'damage') { if (e.src && e.src.card) R(e.iid, e.id, e.p).hitBy.push(e.src.card); }
    else if (e.kind === 'leave') {
      const r = R(e.iid, e.id, e.p); r.out = e.t; r.how = e.how;
      const by = e.src && (e.src.card || (e.src.by && rec[e.src.by] && rec[e.src.by].id));
      r.by = by || null; if (by && !r.hitBy.includes(by)) r.hitBy.push(by);
      if (e.how === 'sacrifice') { if (e.p === me) T.sacrificed += val(e.id); continue; }
      if (e.p === me) { T.lost += val(e.id); T.losses.push(e.id); } else { T.removed += val(e.id); T.taken += 1; T.removals.push({ id: e.id, how: e.how, by }); }
    }
  }
  // end-of-turn state lines
  for (const T of turns) {
    const s = snaps[T.t - 1].end; const P0 = s.players[0], P1 = s.players[1];
    T.loreAfter = [P0.lore, P1.lore]; T.board = [boardVal(P0), boardVal(P1)]; T.res = [resources(P0), resources(P1)]; T.hand = [P0.hand.length, P1.hand.length];
    T.rate = [loreRate(P0), loreRate(P1)];
    T.net = T.built + T.removed - T.lost;            // board ink this player added or took away
  }
  // The race after every turn, as a lore lead two rounds out if nothing changes:
  // (lore + 2 × lore-per-turn), Madrigals minus Phillip. Continuous, unlike a turns-to-20 clock,
  // which explodes early on when both boards quest for 1.
  let prev = 0;
  for (const T of turns) {
    T.lead = (T.loreAfter[0] + 2 * T.rate[0]) - (T.loreAfter[1] + 2 * T.rate[1]);
    T.leadDelta = T.lead - prev; prev = T.lead;
    T.boardDiff = T.board[0] - T.board[1];
  }
  const tp = turns.filter(T => T.t > 2).sort((a, b) => Math.abs(b.leadDelta) - Math.abs(a.leadDelta)).slice(0, 3).sort((a, b) => a.t - b.t);
  // each side's two biggest swings
  const swingsFor = (sign) => turns.filter(T => T.t > 2 && Math.sign(T.leadDelta) === sign).sort((a, b) => sign * (b.leadDelta - a.leadDelta)).slice(0, 2).map(T => T.t).sort((a, b) => a - b);
  // receipts
  const lastTurn = turns.length;
  const receipts = all.filter(r => r.id && M[r.id] && (M[r.id].type === 'Character' || M[r.id].type === 'Item') && r.in != null).map(r => {
    const life = r.out ? r.out - r.in : lastTurn - r.in;
    const ownTurns = Math.max(0, Math.floor((life) / 2));
    const removed = r.kills.reduce((s, k) => s + k.value, 0);
    const forced = r.hitBy.filter(id => id && M[id] && M[id].type !== 'Character').length;
    return Object.assign(r, { cost: val(r.id), ownTurns, removed, forced, score: r.lore + r.drew + removed / 2 + forced });
  });
  return { turns, turningPoints: tp.map(T => T.t), swings: [swingsFor(1), swingsFor(-1)], receipts };
}

// ===================================================================
// TURN BRIEFING — the guide's "every turn starts with questions",
// answered by the player first, then checked against the lenses.
// ===================================================================
function questAll(g, me) {
  const h = clone(g);
  for (const c of h.players[me].field) if (canQuest(h, c)) quest(h, me, c.iid, null);
  return h;
}
function briefingFacts(g, me) {
  const rc = raceClock(g, me);
  const tm = threatMap(g, me);
  const qa = questAll(g, me);
  const ex = threatMap(qa, me).mine.filter(Boolean).sort((a, b) => b.pAny - a.pAny);
  return {
    turn: g.turn,
    race: { winner: rc.winner, finish: rc.finish, rate: rc.rate, lore: rc.lore, margin: rc.margin },
    role: rc.winner === me ? 'race' : 'slow',
    threat: tm.theirs.length ? { iid: tm.theirs[0].iid, id: tm.theirs[0].id, all: tm.theirs.map(t => ({ iid: t.iid, id: t.id, ignore2: t.ignore2, lore: t.lore, enables: t.enables.slice(0, 2).map(e => ({ kind: e.kind, id: e.id, p: e.p })) })) } : null,
    exposed: ex.length ? { iid: ex[0].iid, id: ex[0].id, p: ex[0].pAny, all: ex.map(x => ({ iid: x.iid, id: x.id, p: x.pAny, certain: x.certain.map(c => c.id), pool: x.pool.slice(0, 2).map(p => ({ id: p.id, p: p.p })) })) } : null
  };
}
// What the opponent actually did to my board on their next turn (from the scripted game).
function whatHappened(turn, me) {
  const { g } = game(); const out = [];
  for (const e of g.events) if (e.t === turn + 1 && e.kind === 'leave' && e.p === me) out.push({ id: e.id, how: e.how, by: e.src && (e.src.card || null) });
  return out;
}
const BRIEF_TURNS = [11, 13, 15, 17];
function briefingDrill() { return BRIEF_TURNS.map(t => { const g = position(t); return { turn: t, g, facts: briefingFacts(g, 0), happened: whatHappened(t, 0) }; }); }

// ===================================================================
// VIEW HELPERS — flat objects for the artboards' templates.
// ===================================================================
const pct = (p) => p >= 0.995 ? '100%' : p < 0.005 ? '0%' : Math.round(p * 100) + '%';
function cardView(id, extra) {
  const f = face(id);
  return Object.assign({
    id, name: f.name, version: f.version, cost: f.cost, inkCls: f.ink ? 'ink' : 'noink', strip: f.strip, tint: f.tint,
    str: f.str == null ? '' : f.str, wp: f.wp == null ? '' : f.wp, lore: f.lore || 0, hasStats: !!f.hasStats, kw: f.kw, type: f.type,
    isChar: f.type === 'Character', style: `--strip: ${f.strip}; --tint: ${f.tint}`
  }, extra || {});
}
function instView(g, c) {
  const m = M[c.id];
  return cardView(c.id, {
    iid: c.iid, exerted: !!c.exerted, damage: c.damage || 0, hasDamage: (c.damage || 0) > 0, drying: m.type === 'Character' && !isDry(g, c),
    slotCls: (c.exerted ? 'slot ex' : 'slot') + (m.type === 'Character' && !isDry(g, c) ? ' dry' : '')
  });
}
function boardView(g, me) {
  const P = g.players[me], O = g.players[me ^ 1];
  return {
    me: { name: DECKS[P.key].short, lore: P.lore, ready: P.ready, well: P.well, hand: P.hand.map(c => instView(g, c)), field: P.field.map(c => instView(g, c)), deck: DECKS[P.key].name },
    op: { name: DECKS[O.key].short, lore: O.lore, ready: O.ready, well: O.well, handCount: O.hand.length, field: O.field.map(c => instView(g, c)), deck: DECKS[O.key].name }
  };
}
function lineSummary(g, me) {
  const rc = raceClock(Object.assign(clone(g), { active: me }), me);
  const tm = threatMap(g, me);
  const P = g.players[me], O = g.players[me ^ 1];
  const v = (arr) => arr.filter(c => M[c.id] && M[c.id].type !== 'Unknown').reduce((s, c) => s + M[c.id].cost, 0);
  return { lore: P.lore, oppLore: O.lore, finish: rc.finish, winner: rc.winner, margin: rc.margin, rate: rc.rate, board: v(P.field), oppBoard: v(O.field), hand: P.hand.length, atRisk: tm.mine.filter(x => x && x.pAny >= 0.5).length, risk: tm.mine.map(x => x ? { id: x.id, p: x.pAny } : null).filter(Boolean) };
}
root.DojoLab = { M, ID, DECKS, face, deckIds, pAtLeastOne, pBoth, mulliganOptions, mulliganJob, dealHand, buildGame, game, position, scenario, clone, find, raceClock, exposure, threatOf, threatMap, unseenPool, legalActions, doAction, describeAnswer, isChar, canQuest, isDry, challengeMath };
Object.assign(root.DojoLab, { coachRun, coachScore, coachFlags, coachBest });
Object.assign(root.DojoLab, { buildLedger, briefingFacts, briefingDrill, whatHappened, BRIEF_TURNS });
Object.assign(root.DojoLab, { pct, cardView, instView, boardView, lineSummary, version: '1' });
})(typeof window !== 'undefined' ? window : globalThis);
