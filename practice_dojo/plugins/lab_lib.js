// Practice Dojo — shared helpers for Lab plugins (v3.0.0).
// Pure functions over LorcanaJSON card entries. Reads structured fields only
// (cost, lore, keywords…); nothing here parses card text — that's the classifier's job.
// Works in the browser (attaches to window.DojoLab) and in node (module.exports) for tests.
(function (root) {
    'use strict';

    // --- card facts -------------------------------------------------------------

    // Keyword value: true for flag keywords (Evasive, Ward…), the number for valued
    // ones (Challenger +2 → 2, Shift 5 → 5), 0 when the card doesn't have it.
    function kw(db, keyword) {
        if (!db || !Array.isArray(db.abilities)) return 0;
        for (const a of db.abilities) {
            if (a && a.type === 'keyword' && a.keyword === keyword) {
                if (typeof a.keywordValueNumber === 'number') return a.keywordValueNumber;
                const n = parseInt(String(a.keywordValue || '').replace('+', ''), 10);
                return Number.isFinite(n) ? n : true;
            }
        }
        return 0;
    }
    const isChar = (db) => !!db && db.type === 'Character';
    const isLocation = (db) => !!db && db.type === 'Location';
    const isItem = (db) => !!db && db.type === 'Item';
    const isSong = (db) => !!db && Array.isArray(db.subtypes) && db.subtypes.includes('Song');
    const questLore = (db) => (db && db.lore) || 0;
    const cost = (db) => (db && typeof db.cost === 'number') ? db.cost : 0;
    const cardName = (db) => (db && (db.fullName || db.name)) || 'Unknown card';
    const shortName = (db) => (db && (db.name || db.fullName)) || 'Unknown';
    // A card with Shift can go on top of one of your characters with the same name.
    const shiftsOnto = (above, below) => !!above && !!below && !!kw(above, 'Shift') && isChar(below) && above.name === below.name;

    // --- odds -------------------------------------------------------------------

    // P(at least one of K successes in n draws from N) — same formula as App.hypergeoAtLeastOne.
    function hypergeoAtLeastOne(K, N, n) {
        n = Math.min(n, N);
        if (K <= 0 || N <= 0 || n <= 0) return 0;
        if (N - K < n) return 1;
        let pNone = 1;
        for (let i = 0; i < n; i++) pNone *= (N - K - i) / (N - i);
        return 1 - pNone;
    }
    // P(at least one of group A AND at least one of group B), inclusion–exclusion.
    function pBoth(KA, KB, N, n) {
        if (KA <= 0 || KB <= 0) return 0;
        const none = (K) => 1 - hypergeoAtLeastOne(K, N, n);
        return Math.max(0, 1 - none(KA) - none(KB) + none(KA + KB));
    }

    // --- rng --------------------------------------------------------------------

    // mulberry32: small, fast, seedable — paired simulations need repeatable shuffles.
    function rng(seed) {
        let a = seed >>> 0;
        return () => {
            a |= 0; a = a + 0x6D2B79F5 | 0;
            let t = Math.imul(a ^ a >>> 15, 1 | a);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
    function shuffle(arr, r) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = (r() * (i + 1)) | 0;
            const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        }
        return arr;
    }

    // --- misc -------------------------------------------------------------------

    const turnKey = (turn, active) => `${turn}-${active}`;
    const pct = (p) => p >= 0.995 ? '100%' : p < 0.005 ? '0%' : Math.round(p * 100) + '%';
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }
    // Card thumbnail HTML via the Dojo's own face builder (art or text, offline-safe).
    function thumb(cardId, cls) {
        const App = root.App;
        const db = App && App.cardDB ? App.cardDB[cardId] : null;
        if (!App || !App.cardThumbHtml || !db) return `<span class="lab-thumb-missing" title="Unknown card">?</span>`;
        return App.cardThumbHtml(db, 'tn-card-thumb lab-thumb' + (cls ? ' ' + cls : ''));
    }
    // Inject a <style> block once per id.
    function css(id, text) {
        if (typeof document === 'undefined') return;
        const key = 'lab-css-' + id;
        if (document.getElementById(key)) return;
        const s = document.createElement('style');
        s.id = key;
        s.textContent = text;
        document.head.appendChild(s);
    }

    const lib = {
        kw, isChar, isLocation, isItem, isSong, questLore, cost, cardName, shortName, shiftsOnto,
        hypergeoAtLeastOne, pBoth, rng, shuffle, turnKey, pct, esc, thumb, css
    };
    root.DojoLab = lib;
    if (typeof module !== 'undefined' && module.exports) module.exports = lib;
})(typeof window !== 'undefined' ? window : globalThis);
