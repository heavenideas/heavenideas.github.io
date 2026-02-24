const fs = require('fs');

const API_TOKEN = 'eyJhbGciOiJSUzI1NiJ9.eyJpc3MiOiJjYXJkdHJhZGVyLXByb2R1Y3Rpb24iLCJzdWIiOiJhcHA6MTgzNzMiLCJhdWQiOiJhcHA6MTgzNzMiLCJleHAiOjQ5MTk5MTQwNjMsImp0aSI6IjNmYmViMDE5LTcyYmUtNDVjNC05OGM4LTQxYjliN2MwNGRlNCIsImlhdCI6MTc2NDI0MDQ2MywibmFtZSI6IlRyaWJvY3JhZnRzIEFwcCAyMDI1MTEyNzEwNDc0MyJ9.FhELwnCvgsTGx-RrT24ITgJvZhEXQMWD-OrtXppaeQhH1PlFxz8hg8zqyqCf1aow3DONHMdmXgUHJrU94eA1dyVrUSwXCyjJcD-AsmzCV5t2UZ1Ai_bbeTOHeEPSI6v6lcsJ9i-zA1XCA3rmAkz5bR5d3HSkO5i-PBT40YyjE3EQXtd1wu_pFYfT-reJa0sNLh3HaUtDzOQ0HTHVFzYtFKWO-6jvKeL-N3pslfvD6pDHHKHk1vSoIw4IJeb4zoHVWBJxhhujP8Z185_TS-UjSy1SJi_CzhOnybj9cX7m2Ar78ch73xyxhuirA_Ujyks3qNFZq7LgcE5ek1kGPu7w0g'; // Replace with your actual CardTrader API token
const BASE_URL = 'https://api.cardtrader.com/api/v2/marketplace/products';

// Helper function to delay execution (prevents 429 Rate Limit errors)
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchPrices(cardList) {
  const results = [];

  // Use a 'for...of' loop to process sequentially
  for (const card of cardList) {
    const ctId = card.externalLinks?.cardTraderId;

    if (!ctId) {
      console.log(`Skipping card ${card.fullName || card.id}: No cardTraderId`);
      continue;
    }

    try {
      // Construct URL with blueprint_id
      const url = `${BASE_URL}?blueprint_id=${ctId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        console.error(`Error fetching ${ctId}: ${response.statusText}`);
        continue;
      }

      const data = await response.json();

      // Parse response: API keys results by the string version of the ID
      const lookupId = String(ctId);

      if (data[lookupId] && data[lookupId].length > 0) {
        // Grab the first listing (usually sorted by price low-to-high)
        const cheapestListing = data[lookupId][0];
        const priceCents = cheapestListing.price.cents;
        const formattedPrice = (priceCents / 100).toFixed(2);

        console.log(`Card ${ctId} (${card.fullName || card.id}): ${formattedPrice} ${cheapestListing.price.currency}`);

        // Add price back to card object or results array
        results.push({
          ...card,
          marketPrice: formattedPrice,
          currency: cheapestListing.price.currency
        });
      } else {
        console.log(`No listings found for ${ctId}`);
      }

    } catch (error) {
      console.error(`Failed to fetch ${ctId}`, error);
    }

    // CRITICAL: Wait 200ms before next request
    await sleep(200);
  }

  return results;
}

// Example usage: Load your JSON file and run
// Replace 'path/to/your/allCards.json' with the actual path
const cardsPath = './path/to/your/allCards.json'; // Update this path

fs.readFile(cardsPath, 'utf8', async (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  try {
    const allCards = JSON.parse(data);
    const pricedCards = await fetchPrices(allCards);
    console.log('Fetched prices for', pricedCards.length, 'cards');

    // Optionally save the results
    fs.writeFileSync('./priced_cards.json', JSON.stringify(pricedCards, null, 2));
    console.log('Results saved to priced_cards.json');
  } catch (parseErr) {
    console.error('Error parsing JSON:', parseErr);
  }
});