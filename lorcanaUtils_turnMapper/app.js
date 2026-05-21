/* =============================================================
   Turn Mapper · app logic
   Vanilla JS. No framework. Organised by section:
   - Constants & state
   - Utilities (toasts, DOM helpers)
   - Data fetching (cards + supabase decks)
   - Drawer toggle
   - Canvas pan + zoom
   - Card library rendering + search + hover zoom
   - Turn columns + lanes + OR rows + drag&drop
   - Placed cards (note dot, popover, removal)
   - Arrows (shift+drag, SVG paths)
   - Decklist load + auto-populate
   - Import / export (encoded, human, PNG, save-to-deck)
   - LocalStorage session
   - Tutorial
   - Init
   ============================================================= */

(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────
    // STATE
    // ─────────────────────────────────────────────────────────
    const state = {
        allCards: [],
        fuse: null,
        deckCards: [],
        nextInstanceId: 0,
        arrows: [],            // {id, startId, endId, label}
        currentLoadedDeck: null,
        pan: { x: 80, y: 40 },
        cardScalePct: 100,
        spaceDown: false,
        // arrow drawing
        arrowDrag: null,       // {startEl, startId, startCx, startCy}
        pendingArrow: null,    // {startEl, endEl} awaiting label
    };

    // Card DB
    const CARDS_URL = 'https://raw.githubusercontent.com/heavenideas/similcana/main/database/allCards.json';
    const PROXY = (url) => `https://images.weserv.nl/?url=${encodeURIComponent(url)}`;

    // Supabase
    const SUPABASE_URL = 'https://cjlhrfhximjldqrfblkj.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbGhyZmh4aW1qbGRxcmZibGtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MTcxNzQsImV4cCI6MjA2NTk5MzE3NH0.zLiQcPnKt2SnNfQIkUnOG7bOo6F7MPMh8MsasdFF6lw';
    let supabaseClient = null;
    let popularDecks = [];

    // ─────────────────────────────────────────────────────────
    // DOM
    // ─────────────────────────────────────────────────────────
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
    const el = (tag, props = {}, children = []) => {
        const node = document.createElement(tag);
        Object.entries(props || {}).forEach(([k, v]) => {
            if (k === 'class') node.className = v;
            else if (k === 'dataset') Object.assign(node.dataset, v);
            else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
            else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
            else if (k === 'html') node.innerHTML = v;
            else if (v !== undefined && v !== null) node.setAttribute(k, v);
        });
        children.forEach(c => c && node.appendChild(c instanceof Node ? c : document.createTextNode(c)));
        return node;
    };

    // ─────────────────────────────────────────────────────────
    // TOAST
    // ─────────────────────────────────────────────────────────
    function toast(msg, kind = '') {
        const node = el('div', { class: `toast ${kind}` }, [msg]);
        $('#toasts').appendChild(node);
        setTimeout(() => { node.style.transition = 'opacity .2s'; node.style.opacity = '0'; }, 2400);
        setTimeout(() => node.remove(), 2700);
    }

    // ─────────────────────────────────────────────────────────
    // DATA FETCH
    // ─────────────────────────────────────────────────────────
    async function fetchCards() {
        const cardListEl = $('#card-list');
        cardListEl.innerHTML = '<p class="muted">Loading cards…</p>';
        try {
            const res = await fetch(CARDS_URL);
            const data = await res.json();
            const unique = new Map();
            data.cards.forEach(c => {
                if (!c.rarity?.includes('Enchanted') && !unique.has(c.fullName)) unique.set(c.fullName, c);
            });
            state.allCards = Array.from(unique.values());
            state.fuse = new Fuse(state.allCards, { keys: ['fullName', 'name', 'version', 'bodyText'], threshold: 0.4, includeScore: true });
            $('#card-count-hint').textContent = `${state.allCards.length.toLocaleString()} cards`;
            renderLibrary(state.allCards.slice(0, 60));
        } catch (e) {
            console.error(e);
            cardListEl.innerHTML = '<p class="muted">Could not load card data.</p>';
        }
    }

    async function fetchPopularDecks() {
        try {
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            const { data, error } = await supabaseClient.from('decks').select('*').order('created_at', { ascending: true });
            if (error) throw error;
            popularDecks = data;
            $('#popular-decks-select').innerHTML = popularDecks
                .map(d => `<option value="${d.id}">${escapeHtml(d.name)}</option>`).join('');
        } catch (e) {
            console.error(e);
            $('#popular-decks-select').innerHTML = '<option>Could not load</option>';
        }
    }

    function escapeHtml(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c])); }

    function findCardById(id) { return state.allCards.find(c => c.id === id); }
    function findCardByName(name) {
        const direct = state.allCards.find(c => c.fullName.toLowerCase() === name.toLowerCase());
        if (direct) return direct;
        const r = state.fuse.search(name);
        return r.length ? r[0].item : null;
    }

    // ─────────────────────────────────────────────────────────
    // DRAWER
    // ─────────────────────────────────────────────────────────
    function initDrawer() {
        $('#drawer-toggle').addEventListener('click', () => {
            document.body.classList.toggle('drawer-open');
        });
        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'd' && !isTypingTarget(e.target)) {
                document.body.classList.toggle('drawer-open');
            }
        });
    }

    function isTypingTarget(t) {
        if (!t) return false;
        const tag = t.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || t.isContentEditable;
    }

    // ─────────────────────────────────────────────────────────
    // CANVAS PAN + ZOOM
    // ─────────────────────────────────────────────────────────
    function initCanvas() {
        const host = $('#canvas-host');
        const stage = $('#stage');
        const bg = $('.canvas-bg');

        function applyTransform() {
            stage.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px)`;
            bg.style.backgroundPosition = `${state.pan.x}px ${state.pan.y}px`;
        }
        applyTransform();

        // ── Mouse pan: middle button OR space+left
        let panning = false;
        let startPan = null;
        let startMouse = null;

        host.addEventListener('mousedown', (e) => {
            const onCard = e.target.closest('.placed-card, .lib-card');
            const onUI = e.target.closest('.zoom-dock, .comments-popover, .float-btn, .turn-comment, .turn-num, .ink-num, .or-sep, .turn-actions');
            const wantPan = e.button === 1 || (e.button === 0 && state.spaceDown) || (e.button === 0 && !onCard && !onUI && e.target.closest('.canvas-host') && !e.target.closest('.placed-card'));
            // Only treat empty-canvas left-clicks as pan when on bg specifically, OR when we hit lanes-wrapper background.
            const onBackground = e.target === host || e.target.classList.contains('canvas-bg') || e.target === $('#lanes') || e.target === stage;

            if (e.button === 1 || (e.button === 0 && state.spaceDown) || (e.button === 0 && onBackground)) {
                e.preventDefault();
                panning = true;
                startPan = { ...state.pan };
                startMouse = { x: e.clientX, y: e.clientY };
                host.classList.add('panning');
            }
        });
        window.addEventListener('mousemove', (e) => {
            if (!panning) return;
            state.pan.x = startPan.x + (e.clientX - startMouse.x);
            state.pan.y = startPan.y + (e.clientY - startMouse.y);
            applyTransform();
            renderArrows();
        });
        window.addEventListener('mouseup', () => {
            if (panning) {
                panning = false;
                host.classList.remove('panning');
            }
        });

        // ── Wheel: horizontal scroll => pan horizontally, vertical => pan vertically
        host.addEventListener('wheel', (e) => {
            if (e.ctrlKey || e.metaKey) {
                // zoom via slider
                e.preventDefault();
                const next = clamp(state.cardScalePct + (e.deltaY < 0 ? 10 : -10), 40, 180);
                setCardScale(next);
            } else if (!e.target.closest('.drawer, .modal, textarea, .comments-popover, .card-list')) {
                e.preventDefault();
                state.pan.x -= e.deltaX;
                state.pan.y -= e.deltaY;
                applyTransform();
                renderArrows();
            }
        }, { passive: false });

        // ── Space key for hand tool
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !isTypingTarget(e.target)) {
                state.spaceDown = true;
                host.classList.add('pan-ready', 'show-pan-hint');
                e.preventDefault();
            }
        });
        document.addEventListener('keyup', (e) => {
            if (e.code === 'Space') {
                state.spaceDown = false;
                host.classList.remove('pan-ready', 'show-pan-hint');
            }
        });

        // ── Touch: 2-finger pan
        let touchStartPan = null;
        let touchStartMid = null;
        host.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                touchStartPan = { ...state.pan };
                touchStartMid = midpoint(e.touches[0], e.touches[1]);
            }
        }, { passive: true });
        host.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && touchStartPan) {
                e.preventDefault();
                const mid = midpoint(e.touches[0], e.touches[1]);
                state.pan.x = touchStartPan.x + (mid.x - touchStartMid.x);
                state.pan.y = touchStartPan.y + (mid.y - touchStartMid.y);
                applyTransform();
                renderArrows();
            }
        }, { passive: false });
        host.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) { touchStartPan = null; }
        });

        // ── Zoom slider (controls card scale CSS var)
        const slider = $('#zoom-slider');
        slider.addEventListener('input', () => setCardScale(parseInt(slider.value, 10)));
        $('#zoom-in-btn').addEventListener('click', () => setCardScale(clamp(state.cardScalePct + 10, 40, 180)));
        $('#zoom-out-btn').addEventListener('click', () => setCardScale(clamp(state.cardScalePct - 10, 40, 180)));
        $('#zoom-reset-btn').addEventListener('click', () => {
            setCardScale(100);
            state.pan = { x: 80, y: 40 };
            applyTransform();
            renderArrows();
        });
        $('#zoom-fit-btn').addEventListener('click', () => {
            // Center on first turn
            const stageRect = stage.getBoundingClientRect();
            const hostRect = host.getBoundingClientRect();
            // simplistic fit: compute scale so stage width fits and center
            const sw = stage.scrollWidth || stage.offsetWidth || stageRect.width;
            const sh = stage.scrollHeight || stage.offsetHeight || stageRect.height;
            // shift so stage centered in host (no fractional zoom—just pan)
            state.pan.x = Math.max(40, (hostRect.width - sw) / 2);
            state.pan.y = Math.max(40, (hostRect.height - sh) / 2);
            applyTransform();
            renderArrows();
        });

        // Show pan hint when hovering empty bg
        host.addEventListener('mouseenter', () => host.classList.add('show-pan-hint'));
        host.addEventListener('mouseleave', () => { if (!state.spaceDown) host.classList.remove('show-pan-hint'); });
        setTimeout(() => host.classList.remove('show-pan-hint'), 3000);
    }

    function setCardScale(pct) {
        state.cardScalePct = pct;
        document.documentElement.style.setProperty('--card-scale', pct / 100);
        $('#zoom-slider').value = pct;
        $('#zoom-value').textContent = pct + '%';
        renderArrows();
        saveSession();
    }

    function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
    function midpoint(a, b) { return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }; }

    // ─────────────────────────────────────────────────────────
    // CARD LIBRARY (drawer)
    // ─────────────────────────────────────────────────────────
    function renderLibrary(cards) {
        const list = $('#card-list');
        list.innerHTML = '';
        if (!cards.length) { list.innerHTML = '<p class="muted">No cards found.</p>'; return; }
        cards.forEach(card => {
            const node = el('div', { class: 'lib-card', title: card.fullName, 'data-card-id': card.id });
            const img = el('img', { src: PROXY(card.images.full), alt: card.fullName, crossorigin: 'anonymous' });
            img.onerror = () => { img.src = card.images.full; };
            node.appendChild(img);
            node.draggable = true;
            node.addEventListener('dragstart', (e) => {
                hideZoomPopup();
                e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'lib', cardId: card.id }));
                e.dataTransfer.effectAllowed = 'copy';
                // custom drag image
                const clone = node.cloneNode(true);
                clone.style.position = 'absolute'; clone.style.left = '-9999px'; clone.style.width = '100px';
                document.body.appendChild(clone);
                e.dataTransfer.setDragImage(clone, 50, 70);
                setTimeout(() => clone.remove(), 0);
            });
            attachHoverZoom(node, card);
            list.appendChild(node);
        });
    }

    function initLibrarySearch() {
        const input = $('#search-input');
        input.addEventListener('input', () => {
            const q = input.value.trim();
            if (q.length > 1 && state.fuse) {
                renderLibrary(state.fuse.search(q).slice(0, 80).map(r => r.item));
            } else if (q.length === 0) {
                renderLibrary(state.deckCards.length ? state.deckCards : state.allCards.slice(0, 60));
            }
        });
    }

    // hover zoom popup
    let zoomTimer = null;
    const zoomPopup = () => $('#card-zoom');
    function attachHoverZoom(node, cardData) {
        node.addEventListener('mouseenter', () => {
            clearTimeout(zoomTimer);
            zoomTimer = setTimeout(() => showZoomPopup(cardData, node), 600);
        });
        node.addEventListener('mouseleave', hideZoomPopup);
        node.addEventListener('mousedown', hideZoomPopup);
    }
    function showZoomPopup(cardData, anchorEl) {
        const popup = zoomPopup();
        $('#card-zoom-img').src = PROXY(cardData.images.full);
        popup.hidden = false;
        // position near anchor
        const r = anchorEl.getBoundingClientRect();
        const pw = 296, ph = 410;
        let x = r.right + 12;
        let y = r.top - 40;
        if (x + pw > window.innerWidth - 12) x = r.left - pw - 12;
        if (y + ph > window.innerHeight - 12) y = window.innerHeight - ph - 12;
        if (y < 12) y = 12;
        popup.style.left = x + 'px';
        popup.style.top = y + 'px';
    }
    function hideZoomPopup() {
        clearTimeout(zoomTimer);
        const popup = zoomPopup();
        if (popup) popup.hidden = true;
    }

    // ─────────────────────────────────────────────────────────
    // TURNS / LANES / BOARD
    // ─────────────────────────────────────────────────────────
    let turnCount = 0;

    function makeTurnColumn(turnNum) {
        turnCount++;
        const turnId = turnCount;
        const col = el('div', { class: 'turn-column', 'data-turn-id': turnId });

        const head = el('div', { class: 'turn-head' });
        const headLeft = el('div', { class: 'turn-head-left' }, [
            (() => { const e1 = el('span', { class: 'turn-pip' }, ['Turn']); return e1; })(),
            (() => {
                const n = el('span', { class: 'turn-num', contenteditable: 'true' }, [String(turnNum)]);
                n.addEventListener('input', saveSession);
                n.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); n.blur(); } });
                return n;
            })(),
            (() => {
                const pill = el('span', { class: 'ink-pill' });
                pill.appendChild(el('span', { class: 'dot' }));
                const n = el('span', { class: 'ink-num', contenteditable: 'true' }, [String(turnNum)]);
                n.addEventListener('input', saveSession);
                n.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); n.blur(); } });
                pill.appendChild(n);
                pill.appendChild(el('span', { class: 'mono dim' }, [' ink']));
                return pill;
            })()
        ]);
        const actions = el('div', { class: 'turn-actions' });
        const removeBtn = el('button', { class: 'icon-btn', title: 'Remove turn' });
        removeBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>`;
        removeBtn.addEventListener('click', () => {
            removeArrowsForColumn(col);
            col.remove();
            renderArrows();
            saveSession();
        });
        actions.appendChild(removeBtn);
        head.appendChild(headLeft);
        head.appendChild(actions);
        col.appendChild(head);

        const songSection = makeLaneSection('song', turnId);
        const boardSection = makeLaneSection('board', turnId);
        col.appendChild(songSection);
        col.appendChild(boardSection);

        // turn comment
        const foot = el('div', { class: 'turn-foot' });
        const tc = el('textarea', { class: 'turn-comment', placeholder: `Turn ${turnNum} notes…`, rows: 1 });
        autosize(tc);
        tc.addEventListener('input', saveSession);
        foot.appendChild(tc);
        col.appendChild(foot);

        return col;
    }

    function makeLaneSection(type, turnId) {
        const section = el('div', { class: `lane-section ${type}` });
        const label = el('div', { class: 'lane-label' });
        const left = el('div', { class: 'left' }, [el('span', { class: 'dot-i' }), el('span', null, [type === 'song' ? 'Songs' : 'Board'])]);
        label.appendChild(left);
        label.appendChild(el('span', { class: 'mono dim' }, [type === 'song' ? 'sung this turn' : 'inked plays']));
        section.appendChild(label);

        const grid = el('div', { class: 'lane-grid', dataset: { gridType: type } });
        grid.appendChild(makeLaneRow(type, turnId, 1));
        section.appendChild(grid);

        return section;
    }

    function makeLaneRow(type, turnId, rowId) {
        const row = el('div', { class: 'lane-row', dataset: { laneId: `${type}-turn-${turnId}-row-${rowId}` } });
        setupRowDropZone(row);
        return row;
    }

    function makeOrSeparator(type, turnId) {
        const sep = el('div', { class: 'or-sep', title: 'Drop a card here to add an OR option' });
        sep.appendChild(el('span', { class: 'or-mark' }, [
            el('span', { class: 'or-plus' }, ['+']),
            el('span', null, ['OR'])
        ]));
        // make it a drop zone
        sep.addEventListener('click', () => {
            // expand into row even on click (allows manual add)
            const newRow = makeLaneRow(type, turnId, Date.now() % 100000);
            sep.parentNode.insertBefore(newRow, sep.nextSibling);
            rebuildOrSeparators(sep.parentNode, type, turnId);
            renderArrows();
            saveSession();
        });
        sep.addEventListener('dragover', (e) => { e.preventDefault(); sep.classList.add('drag-over'); });
        sep.addEventListener('dragleave', () => sep.classList.remove('drag-over'));
        sep.addEventListener('drop', (e) => {
            e.preventDefault(); e.stopPropagation();
            sep.classList.remove('drag-over');
            const data = parseDragData(e);
            const newRow = makeLaneRow(type, turnId, Date.now() % 100000);
            sep.parentNode.insertBefore(newRow, sep.nextSibling);
            if (data?.kind === 'lib') {
                const c = findCardById(data.cardId);
                if (c) newRow.appendChild(makePlacedCard(c, ++state.nextInstanceId));
            } else if (data?.kind === 'instance') {
                const existing = document.getElementById(data.instanceDomId);
                if (existing) newRow.appendChild(existing);
            }
            rebuildOrSeparators(sep.parentNode, type, turnId);
            renderArrows();
            saveSession();
        });
        return sep;
    }

    function rebuildOrSeparators(grid, type, turnId) {
        // Remove existing seps
        Array.from(grid.querySelectorAll('.or-sep')).forEach(s => s.remove());
        const rows = Array.from(grid.querySelectorAll('.lane-row'));
        // Place sep AFTER each row (but only one row → none unless drop-on-bottom is wanted)
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (i < rows.length - 1) {
                const sep = makeOrSeparator(type, turnId);
                grid.insertBefore(sep, row.nextSibling);
            }
        }
        // also append a trailing add-row sep if there's at least one populated row
        const hasContent = rows.some(r => r.querySelector('.placed-card'));
        if (hasContent) {
            const trailing = makeOrSeparator(type, turnId);
            grid.appendChild(trailing);
        }
    }

    function setupRowDropZone(row) {
        row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drag-over'); });
        row.addEventListener('dragleave', (e) => { if (!row.contains(e.relatedTarget)) row.classList.remove('drag-over'); });
        row.addEventListener('drop', (e) => {
            e.preventDefault(); e.stopPropagation();
            row.classList.remove('drag-over');
            const data = parseDragData(e);
            if (data?.kind === 'lib') {
                const c = findCardById(data.cardId);
                if (c) row.appendChild(makePlacedCard(c, ++state.nextInstanceId));
            } else if (data?.kind === 'instance') {
                const existing = document.getElementById(data.instanceDomId);
                if (existing) row.appendChild(existing);
            }
            const grid = row.parentElement;
            if (grid?.classList.contains('lane-grid')) {
                const turnCol = grid.closest('.turn-column');
                const turnId = turnCol?.dataset.turnId;
                const type = grid.dataset.gridType;
                rebuildOrSeparators(grid, type, turnId);
            }
            renderArrows();
            saveSession();
        });
    }

    function parseDragData(e) {
        try {
            const raw = e.dataTransfer.getData('text/plain');
            return JSON.parse(raw);
        } catch { return null; }
    }

    // Also accept drops directly on the lane-grid (treats as a new row at end)
    function attachLaneGridDrop(grid) {
        grid.addEventListener('dragover', (e) => {
            if (e.target === grid) { e.preventDefault(); grid.classList.add('drag-over'); }
        });
        grid.addEventListener('dragleave', (e) => {
            if (e.target === grid) grid.classList.remove('drag-over');
        });
        grid.addEventListener('drop', (e) => {
            if (e.target !== grid) return;
            e.preventDefault();
            grid.classList.remove('drag-over');
            const data = parseDragData(e);
            const turnCol = grid.closest('.turn-column');
            const turnId = turnCol?.dataset.turnId;
            const type = grid.dataset.gridType;
            // If last row is empty, fill it; else create new
            const rows = Array.from(grid.querySelectorAll('.lane-row'));
            let target = rows[rows.length - 1];
            if (!target || target.querySelector('.placed-card')) {
                target = makeLaneRow(type, turnId, Date.now() % 100000);
                grid.appendChild(target);
            }
            if (data?.kind === 'lib') {
                const c = findCardById(data.cardId);
                if (c) target.appendChild(makePlacedCard(c, ++state.nextInstanceId));
            } else if (data?.kind === 'instance') {
                const existing = document.getElementById(data.instanceDomId);
                if (existing) target.appendChild(existing);
            }
            rebuildOrSeparators(grid, type, turnId);
            renderArrows();
            saveSession();
        });
    }

    // ─────────────────────────────────────────────────────────
    // PLACED CARD
    // ─────────────────────────────────────────────────────────
    function makePlacedCard(cardData, instanceId) {
        const node = el('div', { class: 'placed-card', id: `card-instance-${instanceId}`, dataset: { cardId: cardData.id, cardName: cardData.fullName, instanceId, comment: '' } });
        node.draggable = true;
        const img = el('img', { src: PROXY(cardData.images.full), alt: cardData.fullName, crossorigin: 'anonymous', draggable: 'false' });
        img.onerror = () => { img.src = cardData.images.full; };
        node.appendChild(img);

        // comment strip (below card, visible when has-comment class is set)
        const strip = el('div', { class: 'card-comment-strip' });
        node.appendChild(strip);

        // note dot
        const dot = el('div', { class: 'note-dot', title: 'Add note' });
        dot.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            openCardPopover(node);
        });
        node.appendChild(dot);

        // dragstart — move card between rows
        node.addEventListener('dragstart', (e) => {
            // suppress shift-drag normal-drag (we handle shift+drag for arrows)
            if (e.shiftKey) { e.preventDefault(); return; }
            hideZoomPopup();
            e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'instance', instanceDomId: node.id }));
            e.dataTransfer.effectAllowed = 'move';
        });

        // hover zoom
        attachHoverZoom(node, cardData);

        // shift+mousedown → start arrow drag
        node.addEventListener('mousedown', (e) => {
            if (e.shiftKey && e.button === 0) {
                e.preventDefault();
                e.stopPropagation();
                startArrowDrag(node, e);
            }
        });

        // legacy: right-click to start an arrow too
        node.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (!state.arrowDrag) {
                // start
                node.classList.add('shift-source');
                state.arrowDrag = { startEl: node, mode: 'click' };
            } else {
                // finish
                const start = state.arrowDrag.startEl;
                start.classList.remove('shift-source');
                state.arrowDrag = null;
                if (start !== node) promptArrowLabel(start, node);
            }
        });

        return node;
    }

    function openCardPopover(cardNode) {
        const pop = $('#card-popover');
        const ta = $('#card-popover-textarea');
        const delBtn = $('#card-popover-delete');
        const closeBtn = $('#card-popover-close');
        ta.value = cardNode.dataset.comment || '';

        // position next to card (right side, fallback to left)
        const r = cardNode.getBoundingClientRect();
        pop.hidden = false;
        const pw = 248, ph = 140;
        let x = r.right + 8;
        let y = r.top;
        if (x + pw > window.innerWidth - 8) x = r.left - pw - 8;
        if (y + ph > window.innerHeight - 8) y = window.innerHeight - ph - 8;
        if (y < 8) y = 8;
        pop.style.left = x + 'px';
        pop.style.top = y + 'px';

        const onInput = () => {
            const val = ta.value;
            cardNode.dataset.comment = val;
            const hasNote = !!val.trim();
            const note = cardNode.querySelector('.note-dot');
            note.classList.toggle('has-note', hasNote);
            note.title = hasNote ? val : 'Add note';
            note.innerHTML = hasNote
                ? `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>`
                : `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
            // update the inline comment strip below the card
            const strip = cardNode.querySelector('.card-comment-strip');
            if (strip) strip.textContent = val;
            cardNode.classList.toggle('has-comment', hasNote);
            renderArrows();
            saveSession();
        };
        ta.oninput = onInput;
        delBtn.onclick = () => {
            removePlacedCard(cardNode);
            closePop();
        };
        closeBtn.onclick = closePop;
        function closePop() {
            pop.hidden = true;
            ta.oninput = null;
            document.removeEventListener('mousedown', outside);
        }
        function outside(e) {
            if (!pop.contains(e.target) && e.target !== cardNode && !cardNode.contains(e.target)) closePop();
        }
        setTimeout(() => document.addEventListener('mousedown', outside), 0);
        setTimeout(() => ta.focus(), 50);
    }

    function removePlacedCard(node) {
        // remove arrows tied to this card
        state.arrows = state.arrows.filter(a => {
            if (a.startId === node.id || a.endId === node.id) return false;
            return true;
        });
        const row = node.parentElement;
        node.remove();
        if (row?.classList.contains('lane-row')) {
            const grid = row.parentElement;
            // collapse empty rows except the first
            const rows = Array.from(grid.querySelectorAll('.lane-row'));
            if (rows.length > 1 && !row.querySelector('.placed-card')) row.remove();
            const turnCol = grid.closest('.turn-column');
            rebuildOrSeparators(grid, grid.dataset.gridType, turnCol?.dataset.turnId);
        }
        renderArrows();
        saveSession();
    }

    function autosize(textarea) {
        const fit = () => {
            textarea.style.height = 'auto';
            textarea.style.height = (textarea.scrollHeight + 2) + 'px';
        };
        textarea.addEventListener('input', fit);
        setTimeout(fit, 0);
    }

    // ─────────────────────────────────────────────────────────
    // ARROWS
    // ─────────────────────────────────────────────────────────
    function startArrowDrag(startEl, mouseEvt) {
        startEl.classList.add('shift-source');
        state.arrowDrag = { startEl, mode: 'drag' };
        const stage = $('#stage');
        const preview = $('#arrows-preview');
        const startCenter = stageLocalCenter(startEl);

        function onMove(e) {
            const pt = clientToStage(e.clientX, e.clientY);
            preview.innerHTML = '';
            const path = makeArrowPathData(startCenter, pt);
            const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            p.setAttribute('d', path);
            p.setAttribute('marker-end', 'url(#arrowhead)');
            p.style.color = 'oklch(0.92 0.04 292)';
            preview.appendChild(p);

            // highlight potential target
            $$('.placed-card.arrow-target').forEach(n => n.classList.remove('arrow-target'));
            const target = elementUnderPoint(e.clientX, e.clientY, startEl);
            if (target) target.classList.add('arrow-target');
        }
        function onUp(e) {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            preview.innerHTML = '';
            $$('.placed-card.arrow-target').forEach(n => n.classList.remove('arrow-target'));
            const target = elementUnderPoint(e.clientX, e.clientY, startEl);
            const start = state.arrowDrag?.startEl;
            state.arrowDrag = null;
            if (start) start.classList.remove('shift-source');
            if (target && start && target !== start) {
                promptArrowLabel(start, target);
            }
        }
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }

    function elementUnderPoint(x, y, exclude) {
        const els = document.elementsFromPoint(x, y);
        for (const el of els) {
            const card = el.closest('.placed-card');
            if (card && card !== exclude) return card;
        }
        return null;
    }

    function stageLocalCenter(node) {
        const r = node.getBoundingClientRect();
        return clientToStage(r.left + r.width / 2, r.top + r.height / 2);
    }
    function clientToStage(cx, cy) {
        const stage = $('#stage');
        const sr = stage.getBoundingClientRect();
        return { x: cx - sr.left, y: cy - sr.top };
    }

    function makeArrowPathData(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const curve = Math.min(80, dist * 0.25);
        // perpendicular offset for slight arc
        const nx = -dy / (dist || 1);
        const ny = dx / (dist || 1);
        const mx = (p1.x + p2.x) / 2 + nx * curve;
        const my = (p1.y + p2.y) / 2 + ny * curve;
        return `M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`;
    }

    function renderArrows() {
        const svg = $('#arrows');
        if (!svg) return;
        // clear except defs
        Array.from(svg.querySelectorAll(':scope > g, :scope > path')).forEach(n => n.remove());

        // resize svg to cover stage extent
        const stage = $('#stage');
        const w = stage.scrollWidth + 800;
        const h = stage.scrollHeight + 800;
        svg.setAttribute('width', w);
        svg.setAttribute('height', h);

        state.arrows = state.arrows.filter(a => {
            const s = document.getElementById(a.startId);
            const e = document.getElementById(a.endId);
            return s && e;
        });

        state.arrows.forEach(a => {
            const s = document.getElementById(a.startId);
            const e = document.getElementById(a.endId);
            const p1 = stageLocalCenter(s);
            const p2 = stageLocalCenter(e);
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const d = makeArrowPathData(p1, p2);
            path.setAttribute('d', d);
            path.setAttribute('class', 'arrow-line');
            path.setAttribute('marker-end', 'url(#arrowhead)');
            path.dataset.arrowId = a.id;
            path.addEventListener('click', (ev) => {
                ev.stopPropagation();
                const startEl = document.getElementById(a.startId);
                const endEl = document.getElementById(a.endId);
                if (startEl && endEl) promptArrowLabel(startEl, endEl, { editId: a.id });
            });
            g.appendChild(path);

            if (a.label) {
                const tmpSvg = path; // measure
                const total = tmpSvg.getTotalLength();
                const mid = tmpSvg.getPointAtLength(total / 2);
                const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                labelGroup.setAttribute('class', 'arrow-label');
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', mid.x);
                text.setAttribute('y', mid.y);
                text.textContent = a.label;
                labelGroup.appendChild(text);
                // background sized to text on next tick
                const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                rect.setAttribute('rx', '4');
                labelGroup.insertBefore(rect, text);
                g.appendChild(labelGroup);

                requestAnimationFrame(() => {
                    try {
                        const bb = text.getBBox();
                        const pad = 5;
                        rect.setAttribute('x', bb.x - pad);
                        rect.setAttribute('y', bb.y - pad/2);
                        rect.setAttribute('width', bb.width + pad*2);
                        rect.setAttribute('height', bb.height + pad);
                    } catch {}
                });
            }
            svg.appendChild(g);
        });
    }

    function promptArrowLabel(startEl, endEl, opts = {}) {
        // opts: { editId?: string }  -- if editing, prefill and offer Delete.
        const editing = !!opts.editId;
        const existing = editing ? state.arrows.find(a => a.id === opts.editId) : null;
        state.pendingArrow = { startEl, endEl };
        const modal = $('#arrow-modal');
        const input = $('#arrow-annotation-input');
        const title = $('#arrow-modal-title');
        const saveBtn = $('#save-arrow-btn');
        const deleteBtn = $('#delete-arrow-btn');
        input.value = existing?.label || '';
        title.textContent = editing ? 'Edit arrow' : 'Arrow annotation';
        saveBtn.textContent = editing ? 'Save' : 'Create arrow';
        deleteBtn.hidden = !editing;
        modal.hidden = false;
        setTimeout(() => { input.focus(); input.select(); }, 50);

        const save = () => {
            if (editing) {
                existing.label = input.value.trim();
                renderArrows();
                saveSession();
            } else {
                createArrow(startEl, endEl, input.value.trim());
            }
            cleanup();
        };
        const del = () => {
            if (editing) {
                state.arrows = state.arrows.filter(a => a.id !== opts.editId);
                renderArrows();
                saveSession();
                toast('Arrow removed');
            }
            cleanup();
        };
        const cancel = () => cleanup();
        const onKey = (e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); };
        function cleanup() {
            modal.hidden = true;
            saveBtn.removeEventListener('click', save);
            deleteBtn.removeEventListener('click', del);
            $('#cancel-arrow-btn').removeEventListener('click', cancel);
            input.removeEventListener('keydown', onKey);
            state.pendingArrow = null;
        }
        saveBtn.addEventListener('click', save);
        deleteBtn.addEventListener('click', del);
        $('#cancel-arrow-btn').addEventListener('click', cancel);
        input.addEventListener('keydown', onKey);
    }

    function createArrow(startEl, endEl, label) {
        const id = 'a-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
        state.arrows.push({ id, startId: startEl.id, endId: endEl.id, label: label || '' });
        renderArrows();
        saveSession();
    }

    function removeArrowsForColumn(col) {
        const ids = new Set(Array.from(col.querySelectorAll('.placed-card')).map(c => c.id));
        state.arrows = state.arrows.filter(a => !ids.has(a.startId) && !ids.has(a.endId));
    }

    // ─────────────────────────────────────────────────────────
    // DECKLIST + AUTO-POPULATE
    // ─────────────────────────────────────────────────────────
    function parseDecklist(text) {
        return text.trim().split('\n').map(line => {
            const m = line.match(/^(\d+)\s+(.+)/);
            return m ? { count: parseInt(m[1], 10), name: m[2].trim() } : null;
        }).filter(Boolean);
    }
    function loadDeckFromInput() {
        const parsed = parseDecklist($('#decklist-input').value);
        const unique = new Map();
        parsed.forEach(({ name }) => {
            const c = findCardByName(name);
            if (c && !unique.has(c.fullName)) unique.set(c.fullName, c);
        });
        state.deckCards = Array.from(unique.values()).sort((a, b) => a.cost - b.cost);
        $('#card-count-hint').textContent = state.deckCards.length ? `${state.deckCards.length} in deck` : `${state.allCards.length} cards`;
        renderLibrary(state.deckCards.length ? state.deckCards : state.allCards.slice(0, 60));
    }

    function ensureTurns(n) {
        const existing = $$('#lanes .turn-column').length;
        for (let i = existing; i < n; i++) addTurnColumn(i + 1);
    }

    function autoPopulate() {
        if (!state.deckCards.length) { toast('Load a deck first', 'error'); return; }
        clearBoard(false);
        const maxCost = Math.max(...state.deckCards.map(c => c.cost || 0), 0);
        ensureTurns(Math.max(maxCost, 4));
        state.deckCards.forEach(card => {
            const turnNum = card.cost;
            if (!turnNum) return;
            const col = findColumnByTurnNumber(turnNum);
            if (!col) return;
            const isSong = (card.subtypesText || '').includes('Song');
            const grid = col.querySelector(`.lane-grid[data-grid-type="${isSong ? 'song' : 'board'}"]`);
            const rows = Array.from(grid.querySelectorAll('.lane-row'));
            // Prefer first empty row; otherwise always create a NEW row (OR option).
            let row = rows.find(r => !r.querySelector('.placed-card'));
            if (!row) {
                row = makeLaneRow(isSong ? 'song' : 'board', col.dataset.turnId, Date.now() % 100000 + Math.floor(Math.random()*1000));
                grid.appendChild(row);
            }
            row.appendChild(makePlacedCard(card, ++state.nextInstanceId));
        });
        // rebuild seps on every grid
        $$('#lanes .lane-grid').forEach(g => {
            const col = g.closest('.turn-column');
            rebuildOrSeparators(g, g.dataset.gridType, col.dataset.turnId);
        });
        renderArrows();
        saveSession();
    }

    function findColumnByTurnNumber(num) {
        return $$('#lanes .turn-column').find(col => parseInt(col.querySelector('.turn-num').textContent, 10) === num);
    }

    function addTurnColumn(turnNum) {
        const lanes = $('#lanes');
        const next = turnNum ?? ($$('#lanes .turn-column').length + 1);
        const col = makeTurnColumn(next);
        // attach lane-grid drop zones
        col.querySelectorAll('.lane-grid').forEach(attachLaneGridDrop);
        lanes.appendChild(col);
        attachAddTurnHandle();
        saveSession();
        renderArrows();
        return col;
    }

    function attachAddTurnHandle() {
        // ensure exactly one trailing add-turn button
        const lanes = $('#lanes');
        $$('#lanes .add-turn').forEach(n => n.remove());
        const handle = el('button', { class: 'add-turn', title: 'Add a turn' }, ['+   add turn']);
        handle.addEventListener('click', () => addTurnColumn());
        lanes.appendChild(handle);
    }

    function clearBoard(fullReset = true) {
        $('#lanes').innerHTML = '';
        state.arrows = [];
        renderArrows();
        turnCount = 0;
        state.nextInstanceId = 0;
        $('#overall-comments').value = '';
        updateCommentsBadge();
        if (fullReset) {
            $('#decklist-input').value = '';
            $('#decklist-url-input').value = '';
            state.currentLoadedDeck = null;
            $('#menu-save-to-deck').disabled = true;
        }
        attachAddTurnHandle();
    }

    // ─────────────────────────────────────────────────────────
    // STATE GATHER / LOAD
    // ─────────────────────────────────────────────────────────
    function gatherState() {
        const cards = [];
        $$('#lanes .placed-card').forEach(c => {
            const laneEl = c.closest('.lane-row');
            if (!laneEl) return;
            cards.push({
                cardId: parseInt(c.dataset.cardId, 10),
                instanceId: parseInt(c.dataset.instanceId, 10),
                laneId: laneEl.dataset.laneId,
                comment: c.dataset.comment || ''
            });
        });
        const turnData = [];
        const turnComments = [];
        $$('#lanes .turn-column').forEach(col => {
            const turn = col.querySelector('.turn-num').textContent.trim();
            const ink = col.querySelector('.ink-num').textContent.trim();
            const songRows = col.querySelectorAll('.lane-grid[data-grid-type=song] .lane-row').length;
            const boardRows = col.querySelectorAll('.lane-grid[data-grid-type=board] .lane-row').length;
            turnData.push({ id: col.dataset.turnId, turn, ink, songRowCount: songRows, boardRowCount: boardRows });
            turnComments.push(col.querySelector('.turn-comment')?.value || '');
        });
        const arrows = state.arrows.map(a => ({ start: a.startId, end: a.endId, label: a.label || '' }));
        return {
            turnCount,
            cards,
            arrows,
            nextCardInstanceId: state.nextInstanceId,
            decklist: $('#decklist-input').value,
            decklistUrl: $('#decklist-url-input').value,
            turnData,
            turnComments,
            overallComment: $('#overall-comments').value,
            cardScalePct: state.cardScalePct,
            pan: state.pan
        };
    }

    function loadState(s, fullClear = true) {
        clearBoard(fullClear);
        if (fullClear) {
            $('#decklist-input').value = s.decklist || '';
            $('#decklist-url-input').value = s.decklistUrl || '';
        }
        if ($('#decklist-input').value) loadDeckFromInput();
        state.nextInstanceId = s.nextCardInstanceId || 0;

        (s.turnData || []).forEach(td => {
            const col = addTurnColumn();
            col.querySelector('.turn-num').textContent = td.turn;
            col.querySelector('.ink-num').textContent = td.ink;
            const songGrid = col.querySelector('.lane-grid[data-grid-type=song]');
            const boardGrid = col.querySelector('.lane-grid[data-grid-type=board]');
            songGrid.innerHTML = '';
            for (let i = 1; i <= (td.songRowCount || 1); i++) songGrid.appendChild(makeLaneRow('song', td.id, i));
            boardGrid.innerHTML = '';
            for (let i = 1; i <= (td.boardRowCount || 1); i++) boardGrid.appendChild(makeLaneRow('board', td.id, i));
            attachLaneGridDrop(songGrid);
            attachLaneGridDrop(boardGrid);
        });

        (s.cards || []).forEach(cs => {
            const cardData = findCardById(cs.cardId);
            if (!cardData) return;
            const lane = document.querySelector(`[data-lane-id="${cs.laneId}"]`);
            if (!lane) return;
            const node = makePlacedCard(cardData, cs.instanceId);
            node.dataset.comment = cs.comment || '';
            if (cs.comment) {
                const dot = node.querySelector('.note-dot');
                dot.classList.add('has-note');
                dot.innerHTML = `<svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="6"/></svg>`;
                const strip = node.querySelector('.card-comment-strip');
                if (strip) strip.textContent = cs.comment;
                node.classList.add('has-comment');
            }
            lane.appendChild(node);
        });

        (s.turnComments || []).forEach((tc, idx) => {
            const col = $$('#lanes .turn-column')[idx];
            if (col) {
                const ta = col.querySelector('.turn-comment');
                ta.value = tc;
                ta.dispatchEvent(new Event('input'));
            }
        });

        if (s.overallComment !== undefined) $('#overall-comments').value = s.overallComment;
        updateCommentsBadge();

        // rebuild seps
        $$('#lanes .lane-grid').forEach(g => {
            const col = g.closest('.turn-column');
            rebuildOrSeparators(g, g.dataset.gridType, col?.dataset.turnId);
        });

        if (s.cardScalePct) setCardScale(s.cardScalePct);
        if (s.pan) { state.pan = s.pan; }

        attachAddTurnHandle();

        setTimeout(() => {
            (s.arrows || []).forEach(a => {
                const startEl = document.getElementById(a.start);
                const endEl = document.getElementById(a.end);
                if (startEl && endEl) createArrow(startEl, endEl, a.label);
            });
            renderArrows();
            // re-apply pan
            $('#stage').style.transform = `translate(${state.pan.x}px, ${state.pan.y}px)`;
            $('.canvas-bg').style.backgroundPosition = `${state.pan.x}px ${state.pan.y}px`;
        }, 80);
    }

    // ─────────────────────────────────────────────────────────
    // SESSION (localStorage)
    // ─────────────────────────────────────────────────────────
    const SESSION_KEY = 'turnMapperSession_v2';
    let saveDebounce = null;
    function saveSession() {
        clearTimeout(saveDebounce);
        saveDebounce = setTimeout(() => {
            try {
                const s = gatherState();
                localStorage.setItem(SESSION_KEY, btoa(unescape(encodeURIComponent(JSON.stringify(s)))));
            } catch (e) { console.warn('save fail', e); }
        }, 250);
    }
    function loadSession() {
        try {
            const raw = localStorage.getItem(SESSION_KEY);
            if (!raw) return false;
            const s = JSON.parse(decodeURIComponent(escape(atob(raw))));
            loadState(s);
            return true;
        } catch (e) {
            console.warn('load fail', e);
            return false;
        }
    }

    // ─────────────────────────────────────────────────────────
    // OVERALL COMMENTS
    // ─────────────────────────────────────────────────────────
    function initComments() {
        const btn = $('#comments-toggle');
        const pop = $('#comments-popover');
        const close = $('#close-comments');
        const ta = $('#overall-comments');
        btn.addEventListener('click', () => {
            pop.hidden = !pop.hidden;
        });
        close.addEventListener('click', () => pop.hidden = true);
        ta.addEventListener('input', () => { saveSession(); updateCommentsBadge(); });
    }
    function updateCommentsBadge() {
        const has = !!($('#overall-comments').value.trim());
        const btn = $('#comments-toggle');
        btn.classList.toggle('has-content', has);
        $('#comments-toggle-label').textContent = has ? 'Notes •' : 'Notes';
    }

    // ─────────────────────────────────────────────────────────
    // IMPORT / EXPORT
    // ─────────────────────────────────────────────────────────
    function initImportExport() {
        // dropdown
        const menu = $('#export-menu');
        const trigger = $('#export-btn');
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.hidden = !menu.hidden;
        });
        document.addEventListener('click', () => menu.hidden = true);
        menu.addEventListener('click', (e) => {
            const action = e.target.closest('button')?.dataset.action;
            if (!action) return;
            menu.hidden = true;
            switch (action) {
                case 'export-text': doExportText(); break;
                case 'export-human': doExportHuman(); break;
                case 'export-png': doExportPng(); break;
                case 'save-to-deck': doSaveToDeck(); break;
            }
        });

        // import
        $('#import-btn').addEventListener('click', () => { $('#import-modal').hidden = false; $('#import-text-input').focus(); });
        $('#confirm-import-btn').addEventListener('click', () => {
            try {
                const raw = $('#import-text-input').value.trim();
                const obj = JSON.parse(decodeURIComponent(escape(atob(raw))));
                loadState(obj);
                $('#import-modal').hidden = true;
                $('#import-text-input').value = '';
                toast('Map imported', 'success');
            } catch (e) {
                toast('Invalid map data', 'error');
            }
        });

        // clear
        $('#clear-session-btn').addEventListener('click', () => $('#confirm-clear-modal').hidden = false);
        $('#confirm-clear-btn').addEventListener('click', () => {
            clearBoard(true);
            ensureTurns(4);
            $('#confirm-clear-modal').hidden = true;
            saveSession();
            toast('Session cleared');
        });

        // generic close-modal
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-close-modal]')) {
                e.target.closest('.modal').hidden = true;
            }
            if (e.target.classList.contains('modal')) {
                e.target.hidden = true;
            }
        });

        // copy buttons
        $('#copy-export-btn').addEventListener('click', () => copyText($('#export-text-output').value, 'Copied'));
        $('#copy-human-btn').addEventListener('click', () => copyText($('#human-export-text-output').value, 'Copied'));
    }

    function copyText(t, msg) {
        navigator.clipboard.writeText(t).then(() => toast(msg, 'success'), () => toast('Copy failed', 'error'));
    }

    function doExportText() {
        const s = gatherState();
        const txt = btoa(unescape(encodeURIComponent(JSON.stringify(s))));
        $('#export-text-output').value = txt;
        $('#export-modal').hidden = false;
    }

    function doExportHuman() {
        $('#human-export-text-output').value = generateHumanReadableText();
        $('#human-export-modal').hidden = false;
    }

    async function doExportPng() {
        toast('Rendering PNG…');
        const lanes = $('#lanes');
        const stage = $('#stage');
        // temporarily un-translate stage to capture full content
        const tx = stage.style.transform;
        stage.style.transform = 'translate(0,0)';
        // wait a tick
        await new Promise(r => requestAnimationFrame(r));
        try {
            const canvas = await html2canvas(stage, {
                backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#111',
                useCORS: true,
                scale: 2,
                width: stage.scrollWidth,
                height: stage.scrollHeight,
                windowWidth: stage.scrollWidth + 64,
                windowHeight: stage.scrollHeight + 64
            });
            const link = document.createElement('a');
            link.download = 'turn-map.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast('PNG saved', 'success');
        } catch (e) {
            console.error(e);
            toast('PNG export failed', 'error');
        } finally {
            stage.style.transform = tx;
        }
    }

    // human-readable text generator
    function generateHumanReadableText() {
        if (!state.allCards.length) return 'Card data not loaded yet.';
        const cardMap = new Map(state.allCards.map(c => [c.id, c]));
        const data = gatherState();
        const lines = [];
        if (data.overallComment?.trim()) {
            lines.push('Overall Notes:');
            lines.push(data.overallComment.trim());
            lines.push('');
        }

        const interactionsByTurn = {};
        const cols = $$('#lanes .turn-column');
        cols.forEach(col => {
            const turn = col.querySelector('.turn-num').textContent;
            interactionsByTurn[turn] = { shifts: [], sings: [], others: [], excluded: new Set() };
        });

        data.arrows.forEach(arrow => {
            const sEl = document.getElementById(arrow.start);
            const eEl = document.getElementById(arrow.end);
            if (!sEl || !eEl) return;
            const sCard = cardMap.get(parseInt(sEl.dataset.cardId, 10));
            const eCard = cardMap.get(parseInt(eEl.dataset.cardId, 10));
            if (!sCard || !eCard) return;
            const sName = sCard.fullName, eName = eCard.fullName;
            const annot = (arrow.label || '').toLowerCase();
            const sTurn = sEl.closest('.turn-column')?.querySelector('.turn-num').textContent;
            const eTurn = eEl.closest('.turn-column')?.querySelector('.turn-num').textContent;
            const isShift = (sCard.type === 'Character' && eCard.type === 'Character') || annot.includes('shift');
            if (isShift) {
                let cost = '';
                if (sCard.Shift !== undefined) cost = `${sCard.Shift} Ink`;
                else {
                    const ab = sCard.Abilities?.find(a => /SHIFT/i.test(a));
                    const m = ab?.match(/SHIFT\s+(\d+)/i);
                    cost = m ? `${m[1]} Ink` : 'its cost';
                }
                interactionsByTurn[sTurn]?.shifts.push(`Shift: ${sName} onto ${eName} for ${cost}`);
                interactionsByTurn[sTurn]?.excluded.add(sEl.id);
                return;
            }
            if (sCard.type === 'Character' && eCard.subtypesText === 'Song') {
                interactionsByTurn[eTurn]?.sings.push(`Sing: ${eName} with ${sName}`);
                interactionsByTurn[eTurn]?.excluded.add(eEl.id);
                return;
            }
            if (sCard.subtypesText === 'Song' && eCard.type === 'Character') {
                interactionsByTurn[sTurn]?.sings.push(`Sing: ${sName} with ${eName}`);
                interactionsByTurn[sTurn]?.excluded.add(sEl.id);
                return;
            }
            if (arrow.label) interactionsByTurn[sTurn]?.others.push(`${sName} ${arrow.label} ${eName}`);
        });

        const sorted = cols.slice().sort((a, b) => (parseInt(a.querySelector('.turn-num').textContent, 10) || 0) - (parseInt(b.querySelector('.turn-num').textContent, 10) || 0));
        let first = lines.length === 0;
        sorted.forEach(col => {
            const turn = col.querySelector('.turn-num').textContent;
            const ink = col.querySelector('.ink-num').textContent;
            const comment = col.querySelector('.turn-comment')?.value.trim() || '';
            const inter = interactionsByTurn[turn];
            const excluded = inter ? inter.excluded : new Set();
            const playLines = [];
            $$('.lane-row', col).forEach(row => {
                const cards = $$('.placed-card', row).filter(c => !excluded.has(c.id)).map(c => c.dataset.cardName);
                if (cards.length) playLines.push('Play: ' + cards.join(' AND '));
            });
            const content = [];
            if (playLines.length) content.push(playLines.join('\nor\n'));
            if (inter) {
                content.push(...inter.shifts, ...inter.sings, ...inter.others);
            }
            if (!content.length && !comment) return;
            if (!first) lines.push('—'.repeat(30));
            first = false;
            lines.push(`Turn ${turn}, Ink ${ink}`);
            if (content.length) lines.push(content.join('\n'));
            if (comment) { lines.push(`Turn ${turn} notes:`); lines.push(comment); }
        });
        if (data.decklistUrl?.trim()) { lines.push('—'.repeat(30)); lines.push('Decklist URL:'); lines.push(data.decklistUrl.trim()); }
        if (data.decklist?.trim()) { lines.push('—'.repeat(30)); lines.push('Decklist:'); lines.push(data.decklist.trim()); }
        lines.push('—'.repeat(30));
        lines.push('Generated by Turn Mapper');
        return lines.join('\n').replace(/\n{3,}/g, '\n\n');
    }

    // ─────────────────────────────────────────────────────────
    // POPULAR DECKS (Supabase)
    // ─────────────────────────────────────────────────────────
    function initPopularDecks() {
        $('#load-popular-deck-btn').addEventListener('click', async () => {
            const id = $('#popular-decks-select').value;
            const deck = popularDecks.find(d => String(d.id) === String(id));
            if (!deck) return toast('Deck not found', 'error');
            state.currentLoadedDeck = deck;
            $('#menu-save-to-deck').disabled = false;
            $('#decklist-input').value = deck.decklist || '';
            loadDeckFromInput();
            const comments = deck.comments || '';
            const re = /--- Turn Mapping (\d+) ---\s*([\s\S]*?)\s*--- End Turn Mapping \1 ---/g;
            const existing = [...comments.matchAll(re)];
            if (existing.length) {
                const opts = $('#import-map-options');
                opts.innerHTML = '';
                existing.forEach(m => {
                    const num = m[1]; const data = m[2].trim();
                    opts.appendChild(el('label', null, [
                        el('input', { type: 'radio', name: 'import-option', value: data }),
                        ` Turn Mapping ${num}`
                    ]));
                });
                opts.appendChild(el('label', null, [
                    el('input', { type: 'radio', name: 'import-option', value: 'auto-populate', checked: 'checked' }),
                    ' Start fresh (auto-populate by ink cost)'
                ]));
                $('#import-from-comment-modal').hidden = false;
            } else {
                autoPopulate();
            }
            saveSession();
        });

        $('#confirm-import-map-btn').addEventListener('click', () => {
            const sel = document.querySelector('input[name="import-option"]:checked');
            if (!sel) return;
            if (sel.value === 'auto-populate') autoPopulate();
            else {
                try {
                    const obj = JSON.parse(decodeURIComponent(escape(atob(sel.value))));
                    loadState(obj, false);
                } catch { toast('Invalid map in comments', 'error'); }
            }
            $('#import-from-comment-modal').hidden = true;
        });
        $('#cancel-import-map-btn').addEventListener('click', () => $('#import-from-comment-modal').hidden = true);
    }

    async function doSaveToDeck() {
        if (!state.currentLoadedDeck) { toast('Load a popular deck first', 'error'); return; }
        const deck = state.currentLoadedDeck;
        const data = gatherState();
        const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
        const comments = deck.comments || '';
        const re = /--- Turn Mapping (\d+) ---\s*([\s\S]*?)\s*--- End Turn Mapping \1 ---/g;
        const existing = [...comments.matchAll(re)];

        $('#save-map-deck-name').textContent = `Deck: ${deck.name}`;
        const optsContainer = $('#map-save-options');
        optsContainer.innerHTML = '';
        let promptText = 'Save as:';
        if (!existing.length) {
            promptText = 'No saved maps yet — this will be saved as "Turn Mapping 1".';
        } else {
            existing.forEach(m => {
                const num = m[1];
                optsContainer.appendChild(el('label', null, [
                    el('input', { type: 'radio', name: 'save-option', value: 'overwrite:' + num }),
                    ` Overwrite Turn Mapping ${num}`
                ]));
            });
            optsContainer.appendChild(el('label', null, [
                el('input', { type: 'radio', name: 'save-option', value: 'new', checked: 'checked' }),
                ` Save as new (Turn Mapping ${existing.length + 1})`
            ]));
        }
        $('#save-map-prompt').textContent = promptText;
        $('#save-map-modal').hidden = false;

        const confirmBtn = $('#confirm-save-map-btn');
        const cancelBtn = $('#cancel-save-map-btn');
        const confirm = async () => {
            const sel = document.querySelector('input[name="save-option"]:checked');
            let newComments = comments;
            let label;
            if (!existing.length) {
                label = 'Turn Mapping 1';
                newComments = (newComments ? newComments + '\n\n' : '') + `--- Turn Mapping 1 ---\n${encoded}\n--- End Turn Mapping 1 ---`;
            } else if (sel?.value === 'new') {
                const n = existing.length + 1;
                label = 'Turn Mapping ' + n;
                newComments += `\n\n--- Turn Mapping ${n} ---\n${encoded}\n--- End Turn Mapping ${n} ---`;
            } else if (sel?.value.startsWith('overwrite:')) {
                const n = sel.value.split(':')[1];
                label = 'Turn Mapping ' + n;
                newComments = newComments.replace(new RegExp(`--- Turn Mapping ${n} ---[\\s\\S]*?--- End Turn Mapping ${n} ---`), `--- Turn Mapping ${n} ---\n${encoded}\n--- End Turn Mapping ${n} ---`);
            }
            try {
                const { error } = await supabaseClient.from('decks').update({ comments: newComments }).eq('id', deck.id);
                if (error) throw error;
                deck.comments = newComments;
                toast(`Saved to ${deck.name} (${label})`, 'success');
            } catch (e) {
                console.error(e); toast('Save failed: ' + e.message, 'error');
            }
            cleanup();
        };
        const cancel = () => cleanup();
        function cleanup() {
            $('#save-map-modal').hidden = true;
            confirmBtn.removeEventListener('click', confirm);
            cancelBtn.removeEventListener('click', cancel);
        }
        confirmBtn.addEventListener('click', confirm);
        cancelBtn.addEventListener('click', cancel);
    }

    // ─────────────────────────────────────────────────────────
    // TUTORIAL (intro.js)
    // ─────────────────────────────────────────────────────────
    function startTutorial() {
        if (!window.introJs) { toast('Tutorial unavailable', 'error'); return; }
        document.body.classList.add('drawer-open');
        const intro = introJs();
        intro.setOptions({
            showProgress: true,
            showBullets: false,
            steps: [
                { title: 'Welcome to Turn Mapper', intro: 'Plan your turns visually on an infinite canvas. Quick tour.' },
                { element: '#drawer', title: 'Card drawer', intro: 'Search any card, paste a decklist, or pick a popular deck. Drag any card onto the board.' },
                { element: '#lanes', title: 'The board', intro: 'Each column is a turn. Drag cards into the <b>Songs</b> or <b>Board</b> lane. Within a row, cards mean <b>AND</b>. Stack rows to express <b>OR</b> options.' },
                { element: '#canvas-host', title: 'Infinite canvas', intro: 'Hold <b>space</b> and drag — or use middle mouse, or two fingers on a touchpad — to pan. Use the bottom-right slider to scale cards.' },
                { element: '#arrows', title: 'Arrows for interactions', intro: 'Hold <b>Shift</b> and drag from one card to another to create an arrow. Use it to mark shifts, sings, or other interactions. Click an arrow any time to edit its label or delete it.' },
                { element: '#comments-toggle', title: 'Strategy notes', intro: 'Open this for overall match-up notes. Each card also has a small <b>+</b> dot to add per-card comments.' },
                { element: '#export-btn', title: 'Save & share', intro: 'Export your plan as text, an image, or back into a deck\'s comments.' },
                { title: 'You\'re set', intro: 'Have fun! Re-open this tour any time from the top bar.' }
            ]
        });
        intro.oncomplete(() => localStorage.setItem('turnMapperTutorialSeen', 'true'));
        intro.onexit(() => localStorage.setItem('turnMapperTutorialSeen', 'true'));
        intro.start();
    }

    // ─────────────────────────────────────────────────────────
    // INIT
    // ─────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async () => {
        initDrawer();
        initCanvas();
        initLibrarySearch();
        initComments();
        initImportExport();
        initPopularDecks();

        $('#tutorial-btn').addEventListener('click', startTutorial);
        $('#load-deck-btn').addEventListener('click', () => { loadDeckFromInput(); $('#menu-save-to-deck').disabled = true; state.currentLoadedDeck = null; saveSession(); });
        $('#auto-populate-btn').addEventListener('click', autoPopulate);
        $('#decklist-url-input').addEventListener('input', saveSession);
        $('#decklist-input').addEventListener('input', saveSession);

        // observe stage size for arrow re-render
        new ResizeObserver(() => renderArrows()).observe($('#lanes'));
        new MutationObserver(() => renderArrows()).observe($('#lanes'), { childList: true, subtree: true });
        window.addEventListener('resize', renderArrows);

        await fetchCards();
        fetchPopularDecks();

        if (!loadSession()) {
            ensureTurns(4);
            document.body.classList.add('drawer-open');
        }

        renderArrows();
        attachAddTurnHandle();

        if (!localStorage.getItem('turnMapperTutorialSeen')) {
            setTimeout(startTutorial, 600);
        }
    });

})();
