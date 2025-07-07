// UI Helpers Module
// Handles rendering of advanced UI components for the matchup analyzer

// Render the card selection grid (characters or songs)
export function renderCardGrid(cards, container, onSelect) {
  container.innerHTML = '';
  if (!cards || cards.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-400 italic col-span-full">No cards to display.</p>';
    return;
  }
  cards.forEach((card, index) => {
    const cardElement = document.createElement('div');
    cardElement.className = 'selectable-card cursor-pointer flex flex-col items-center p-1 rounded hover:bg-purple-700 transition-colors';
    cardElement.dataset.index = index;
    // Card image
    const img = document.createElement('img');
    img.src = card.images?.thumbnail || `https://placehold.co/100x140/2d3748/e2e8f0?text=${card.name.substring(0, 10)}`;
    img.alt = card.fullName;
    img.className = 'card-image mb-1 rounded';
    img.onerror = () => { img.src = `https://placehold.co/100x140/2d3748/e2e8f0?text=Error`; };
    // Card name
    const nameElement = document.createElement('div');
    nameElement.className = 'card-name text-xs text-center text-gray-200';
    nameElement.textContent = card.name;
    // Selection logic
    cardElement.addEventListener('click', () => {
      // Remove previous selection
      Array.from(container.children).forEach(child => child.classList.remove('selected', 'bg-purple-800'));
      cardElement.classList.add('selected', 'bg-purple-800');
      if (typeof onSelect === 'function') onSelect(card, index);
    });
    cardElement.appendChild(img);
    cardElement.appendChild(nameElement);
    container.appendChild(cardElement);
  });
}

// Render a per-card metric table (RDS/LVI/BCR breakdown)
export function renderMetricTable(metricData, container) {
  container.innerHTML = '';
  if (!metricData || metricData.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-400 italic">No per-card metrics to display.</p>';
    return;
  }
  const table = document.createElement('table');
  table.className = 'w-full text-xs border-collapse mt-4';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr class="border-b border-gray-700">
    <th class="py-1 px-2">Card</th>
    <th class="py-1 px-2">RDS</th>
    <th class="py-1 px-2">LVI</th>
    <th class="py-1 px-2">BCR</th>
    <th class="py-1 px-2">RDS Exp</th>
    <th class="py-1 px-2">LVI Exp</th>
    <th class="py-1 px-2">BCR Exp</th>
  </tr>`;
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  metricData.forEach(({ card, rds, lvi, bcr, rdsExp, lviExp, bcrExp }) => {
    const tr = document.createElement('tr');
    // Card cell
    const cardCell = document.createElement('td');
    cardCell.className = 'py-1 px-2 flex items-center gap-2';
    const img = document.createElement('img');
    img.src = card.images?.thumbnail || `https://placehold.co/40x56/2d3748/e2e8f0?text=${card.name.substring(0, 10)}`;
    img.alt = card.fullName;
    img.className = 'rounded w-8 h-auto';
    img.onerror = () => { img.src = `https://placehold.co/40x56/2d3748/e2e8f0?text=Error`; };
    cardCell.appendChild(img);
    const nameSpan = document.createElement('span');
    nameSpan.textContent = card.name;
    cardCell.appendChild(nameSpan);
    tr.appendChild(cardCell);
    // RDS, LVI, BCR
    [rds, lvi, bcr].forEach(val => {
      const td = document.createElement('td');
      td.className = 'py-1 px-2 text-center';
      td.textContent = val !== undefined ? val.toFixed(2) : '';
      tr.appendChild(td);
    });
    // Explanations
    [rdsExp, lviExp, bcrExp].forEach(exp => {
      const td = document.createElement('td');
      td.className = 'py-1 px-2';
      td.textContent = exp || '';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

// Render the matchup grid (character vs. character, song vs. character)
export function renderMatchupGrid(matchupData, container) {
  container.innerHTML = '';
  if (!matchupData || matchupData.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-400 italic">No matchups to display.</p>';
    return;
  }
  const table = document.createElement('table');
  table.className = 'w-full text-xs border-collapse';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr class="border-b border-gray-700">
    <th class="py-1 px-2">Opponent Character</th>
    <th class="py-1 px-2">Outcome</th>
    <th class="py-1 px-2">Details</th>
  </tr>`;
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  matchupData.forEach(({ opponentCard, result }) => {
    const tr = document.createElement('tr');
    // Color coding by classification
    let bg = '';
    if (result.classification === 'Positive') bg = 'bg-green-700';
    else if (result.classification === 'Negative') bg = 'bg-red-700';
    else if (result.classification === 'Neutral') bg = 'bg-gray-700';
    tr.className = bg + ' border-b border-gray-800';
    // Opponent card cell
    const cardCell = document.createElement('td');
    cardCell.className = 'py-1 px-2 flex items-center gap-2';
    const img = document.createElement('img');
    img.src = opponentCard.images?.thumbnail || `https://placehold.co/40x56/2d3748/e2e8f0?text=${opponentCard.name.substring(0, 10)}`;
    img.alt = opponentCard.fullName;
    img.className = 'rounded w-8 h-auto';
    img.onerror = () => { img.src = `https://placehold.co/40x56/2d3748/e2e8f0?text=Error`; };
    cardCell.appendChild(img);
    const nameSpan = document.createElement('span');
    nameSpan.textContent = opponentCard.name;
    cardCell.appendChild(nameSpan);
    tr.appendChild(cardCell);
    // Outcome cell
    const outcomeCell = document.createElement('td');
    outcomeCell.className = 'py-1 px-2 font-semibold';
    outcomeCell.textContent = result.outcomeName;
    tr.appendChild(outcomeCell);
    // Details cell
    const detailsCell = document.createElement('td');
    detailsCell.className = 'py-1 px-2';
    detailsCell.textContent = result.details;
    tr.appendChild(detailsCell);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

// Render ability impact breakdowns
export function renderAbilityImpact(impactData, container) {
  container.innerHTML = '';
  if (!impactData || impactData.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-400 italic">No ability impact to display.</p>';
    return;
  }
  const table = document.createElement('table');
  table.className = 'w-full text-xs border-collapse mt-4';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr class="border-b border-gray-700">
    <th class="py-1 px-2">Opponent Character</th>
    <th class="py-1 px-2">Classification</th>
    <th class="py-1 px-2">Details</th>
  </tr>`;
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  impactData.forEach(({ opponentCard, classification, details }) => {
    const tr = document.createElement('tr');
    // Color coding by classification
    let bg = '';
    if (classification === 'DirectRemoval') bg = 'bg-green-700';
    else if (classification === 'PotentialRemoval') bg = 'bg-yellow-600';
    else if (classification === 'AffectsNoRemoval') bg = 'bg-blue-700';
    else if (classification === 'NoInteraction' || classification === 'NoInteractionDueToWard') bg = 'bg-gray-700';
    tr.className = bg + ' border-b border-gray-800';
    // Opponent card cell
    const cardCell = document.createElement('td');
    cardCell.className = 'py-1 px-2 flex items-center gap-2';
    const img = document.createElement('img');
    img.src = opponentCard.images?.thumbnail || `https://placehold.co/40x56/2d3748/e2e8f0?text=${opponentCard.name.substring(0, 10)}`;
    img.alt = opponentCard.fullName;
    img.className = 'rounded w-8 h-auto';
    img.onerror = () => { img.src = `https://placehold.co/40x56/2d3748/e2e8f0?text=Error`; };
    cardCell.appendChild(img);
    const nameSpan = document.createElement('span');
    nameSpan.textContent = opponentCard.name;
    cardCell.appendChild(nameSpan);
    tr.appendChild(cardCell);
    // Classification cell
    const classCell = document.createElement('td');
    classCell.className = 'py-1 px-2 font-semibold';
    classCell.textContent = classification;
    tr.appendChild(classCell);
    // Details cell
    const detailsCell = document.createElement('td');
    detailsCell.className = 'py-1 px-2';
    detailsCell.textContent = details;
    tr.appendChild(detailsCell);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

// Render song synergy and eligible singers
export function renderSongSynergy(songData, container) {
  container.innerHTML = '';
  if (!songData || songData.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-400 italic">No song synergy to display.</p>';
    return;
  }
  songData.forEach(({ songCard, eligibleSingers }) => {
    const section = document.createElement('div');
    section.className = 'mb-4 p-2 bg-gray-800 rounded';
    const title = document.createElement('h4');
    title.className = 'font-semibold text-purple-300 mb-2';
    title.textContent = `Song: ${songCard.name} (Cost: ${songCard.cost})`;
    section.appendChild(title);
    if (!eligibleSingers || eligibleSingers.length === 0) {
      section.innerHTML += '<p class="text-sm text-gray-400 italic">No eligible singers in your deck.</p>';
    } else {
      const list = document.createElement('ul');
      eligibleSingers.forEach(char => {
        const li = document.createElement('li');
        li.className = 'flex items-center gap-2 mb-1';
        const img = document.createElement('img');
        img.src = char.images?.thumbnail || `https://placehold.co/40x56/2d3748/e2e8f0?text=${char.name.substring(0, 10)}`;
        img.alt = char.fullName;
        img.className = 'rounded w-8 h-auto';
        img.onerror = () => { img.src = `https://placehold.co/40x56/2d3748/e2e8f0?text=Error`; };
        li.appendChild(img);
        const nameSpan = document.createElement('span');
        nameSpan.textContent = char.name;
        li.appendChild(nameSpan);
        list.appendChild(li);
      });
      section.appendChild(list);
    }
    container.appendChild(section);
  });
}

// Render location interaction analysis
export function renderLocationAnalysis(locationData, container) {
  container.innerHTML = '';
  if (!locationData || locationData.length === 0) {
    container.innerHTML = '<p class="text-center text-gray-400 italic">No location interaction to display.</p>';
    return;
  }
  locationData.forEach(({ locationCard, playerInteractors, opponentInteractors }) => {
    const section = document.createElement('div');
    section.className = 'mb-4 p-2 bg-gray-800 rounded';
    const title = document.createElement('h4');
    title.className = 'font-semibold text-yellow-300 mb-2';
    title.textContent = `Location: ${locationCard.name} (Willpower: ${locationCard.willpower || '?'})`;
    section.appendChild(title);
    // Player interactors
    const playerTitle = document.createElement('div');
    playerTitle.className = 'text-sm text-green-300 mb-1';
    playerTitle.textContent = 'Your cards that can interact:';
    section.appendChild(playerTitle);
    if (!playerInteractors || playerInteractors.length === 0) {
      section.innerHTML += '<p class="text-xs text-gray-400 italic">None.</p>';
    } else {
      const list = document.createElement('ul');
      playerInteractors.forEach(card => {
        const li = document.createElement('li');
        li.className = 'flex items-center gap-2 mb-1';
        const img = document.createElement('img');
        img.src = card.images?.thumbnail || `https://placehold.co/40x56/2d3748/e2e8f0?text=${card.name.substring(0, 10)}`;
        img.alt = card.fullName;
        img.className = 'rounded w-8 h-auto';
        img.onerror = () => { img.src = `https://placehold.co/40x56/2d3748/e2e8f0?text=Error`; };
        li.appendChild(img);
        const nameSpan = document.createElement('span');
        nameSpan.textContent = card.name;
        li.appendChild(nameSpan);
        list.appendChild(li);
      });
      section.appendChild(list);
    }
    // Opponent interactors
    const oppTitle = document.createElement('div');
    oppTitle.className = 'text-sm text-red-300 mt-2 mb-1';
    oppTitle.textContent = 'Opponent cards that can interact:';
    section.appendChild(oppTitle);
    if (!opponentInteractors || opponentInteractors.length === 0) {
      section.innerHTML += '<p class="text-xs text-gray-400 italic">None.</p>';
    } else {
      const list = document.createElement('ul');
      opponentInteractors.forEach(card => {
        const li = document.createElement('li');
        li.className = 'flex items-center gap-2 mb-1';
        const img = document.createElement('img');
        img.src = card.images?.thumbnail || `https://placehold.co/40x56/2d3748/e2e8f0?text=${card.name.substring(0, 10)}`;
        img.alt = card.fullName;
        img.className = 'rounded w-8 h-auto';
        img.onerror = () => { img.src = `https://placehold.co/40x56/2d3748/e2e8f0?text=Error`; };
        li.appendChild(img);
        const nameSpan = document.createElement('span');
        nameSpan.textContent = card.name;
        li.appendChild(nameSpan);
        list.appendChild(li);
      });
      section.appendChild(list);
    }
    container.appendChild(section);
  });
}

// Render the deck load/search modal
export function renderModal(modalData, container) {
  const { decks, onSelect, onClose, searchTerm = '' } = modalData;
  container.innerHTML = '';
  container.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4';
  const modal = document.createElement('div');
  modal.className = 'bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md';
  // Title
  const title = document.createElement('h3');
  title.className = 'text-lg font-bold text-white mb-4';
  title.textContent = 'Select a Deck';
  modal.appendChild(title);
  // Search box
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search decks by name...';
  searchInput.value = searchTerm;
  searchInput.className = 'w-full mb-4 px-3 py-2 rounded bg-gray-700 border border-gray-600 text-gray-200 focus:ring-2 focus:ring-purple-500 focus:outline-none';
  modal.appendChild(searchInput);
  // Deck list
  const deckListContainer = document.createElement('div');
  deckListContainer.className = 'max-h-64 overflow-y-auto space-y-2';
  modal.appendChild(deckListContainer);
  // Cancel button
  const btnRow = document.createElement('div');
  btnRow.className = 'flex justify-end mt-6';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded font-semibold';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => onClose && onClose();
  btnRow.appendChild(cancelBtn);
  modal.appendChild(btnRow);
  container.appendChild(modal);
  // Filter and render decks
  function renderDeckList(filterTerm) {
    deckListContainer.innerHTML = '';
    const filtered = !filterTerm
      ? decks
      : decks.filter(deck => deck.name.toLowerCase().includes(filterTerm.toLowerCase()));
    if (!filtered.length) {
      deckListContainer.innerHTML = '<p class="text-gray-400 italic text-center">No decks found.</p>';
      return;
    }
    filtered.forEach(deck => {
      const btn = document.createElement('button');
      btn.className = 'w-full text-left p-3 rounded-md hover:bg-purple-700 focus:bg-purple-800 focus:outline-none transition-colors font-semibold text-gray-100';
      btn.textContent = deck.name;
      btn.onclick = () => onSelect && onSelect(deck);
      deckListContainer.appendChild(btn);
    });
  }
  renderDeckList(searchTerm);
  searchInput.addEventListener('input', () => {
    renderDeckList(searchInput.value);
  });
}

// Render TFA phase-by-phase breakdown
export function renderTFADetailTable(playerTFAObj, opponentTFAObj, phaseWeights, container) {
  container.innerHTML = '';
  if (!playerTFAObj || !opponentTFAObj) {
    container.innerHTML = '<p class="text-center text-gray-400 italic">No TFA breakdown to display.</p>';
    return;
  }
  const phases = ['early', 'mid', 'late'];
  const phaseNames = { early: 'Early (1-3)', mid: 'Mid (4-6)', late: 'Late (7+)' };
  const table = document.createElement('table');
  table.className = 'w-full text-xs border-collapse mt-4';
  const thead = document.createElement('thead');
  thead.innerHTML = `<tr class="border-b border-gray-700">
    <th class="py-1 px-2">Phase</th>
    <th class="py-1 px-2">Player Threat × Consistency</th>
    <th class="py-1 px-2">Opponent Threat × Consistency</th>
    <th class="py-1 px-2">Weight</th>
  </tr>`;
  table.appendChild(thead);
  const tbody = document.createElement('tbody');
  phases.forEach(phase => {
    const tr = document.createElement('tr');
    const phaseCell = document.createElement('td');
    phaseCell.className = 'py-1 px-2';
    phaseCell.textContent = phaseNames[phase];
    tr.appendChild(phaseCell);
    const playerCell = document.createElement('td');
    playerCell.className = 'py-1 px-2';
    playerCell.textContent = playerTFAObj.phaseScores[phase]?.toFixed(2) || '';
    tr.appendChild(playerCell);
    const oppCell = document.createElement('td');
    oppCell.className = 'py-1 px-2';
    oppCell.textContent = opponentTFAObj.phaseScores[phase]?.toFixed(2) || '';
    tr.appendChild(oppCell);
    const weightCell = document.createElement('td');
    weightCell.className = 'py-1 px-2';
    weightCell.textContent = phaseWeights[phase] || '';
    tr.appendChild(weightCell);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

const SUPABASE_URL = 'https://cjlhrfhximjldqrfblkj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbGhyZmh4aW1qbGRxcmZibGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MTcxNzQsImV4cCI6MjA2NTk5MzE3NH0.zLiQcPnKt2SnNfQIkUnOG7bOo6F7MPMh8MsasdFF6lw';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fetchDecksFromDatabase() {
  const { data, error } = await supabaseClient.from('decks').select('*').order('created_at', { ascending: true });
  if (error) {
    console.error('Error fetching decks:', error);
    return [];
  }
  return data;
} 