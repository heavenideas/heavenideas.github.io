// Practice Dojo — plugin host (v3.0.0).
//
// The Dojo core calls App.plugin(name, payload) at a handful of points (see
// mastery_lab/V3_PLAN.md §4). This file turns those calls into:
//   - an always-on action journal in App.state.ext.journal (ordered, per instance),
//   - events for registered plugins,
//   - three UI surfaces: the Lab drawer (one tab per tool), topbar chips, and a
//     block inside the mulligan modal,
//   - on/off toggles in Tweaks → Lab tools.
// Plugins read state and advise. They never change game data and never block a move.
// Every call into a plugin is isolated: a broken plugin logs a warning and the Dojo
// carries on exactly as before.
(function (root) {
    'use strict';

    const STORE_KEY = 'lorcana_dojo_plugins';
    const ACTION_KIND = { drawn: 'draw', inked: 'ink', played: 'play', shifted: 'shift', quested: 'quest', banished: 'banish', discarded: 'discard' };
    const scriptSrc = (typeof document !== 'undefined' && document.currentScript) ? document.currentScript.src : '';

    const plugins = [];            // registration order; sorted by `order` when shown
    const byId = {};
    let prefs = loadPrefs();
    let drawerOpen = false;
    let activeTab = null;
    let renderQueued = false;
    const attention = {};          // id -> true when a plugin wants the Lab button dot

    // The core declares `const App` and also sets window.App (v3); prefer the global binding.
    function App() { return (typeof root.App !== 'undefined' && root.App) || (typeof globalThis.App !== 'undefined' ? globalThis.App : undefined); }
    function hasGame() { const a = App(); return !!(a && a.state && Array.isArray(a.state.players)); }

    function loadPrefs() {
        try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}') || {}; } catch (e) { return {}; }
    }
    function savePrefs() {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(prefs)); } catch (e) { /* private mode */ }
    }

    function safe(label, fn) {
        try { return fn(); } catch (e) { console.warn(`[Lab] ${label} failed`, e); return undefined; }
    }

    // --- context handed to every plugin call -------------------------------------

    function ext() {
        const a = App();
        if (!hasGame()) return null;
        if (!a.state.ext || typeof a.state.ext !== 'object') a.state.ext = {};
        return a.state.ext;
    }
    let persistTimer = null;
    function makeCtx(p) {
        const a = App();
        const s = a && a.state;
        return {
            app: a,
            state: s,
            me: s ? s.activePlayer : 0,
            opp: s ? s.inactivePlayer : 1,
            card: (cardId) => (a && a.cardDB && a.cardDB[cardId]) || null,
            store: () => { const e = ext(); if (!e) return {}; if (!e[p.id] || typeof e[p.id] !== 'object') e[p.id] = {}; return e[p.id]; },
            journal: () => { const e = ext(); return (e && e.journal && Array.isArray(e.journal.events)) ? e.journal.events : []; },
            persist: () => {
                clearTimeout(persistTimer);
                persistTimer = setTimeout(() => safe('persist', () => a.saveToLocalStorage()), 400);
            },
            refresh: () => Host.refresh(p.id),
            lib: Host.lib
        };
    }

    // --- journal -------------------------------------------------------------------

    function journal() {
        const e = ext();
        if (!e) return null;
        if (!e.journal || !Array.isArray(e.journal.events)) e.journal = { v: 1, events: [] };
        return e.journal;
    }
    function ownerOf(iid) {
        const a = App();
        if (!iid || !a.findCard) return null;
        const f = a.findCard(iid);
        return f ? f.player.id : null;
    }
    function boardCost(p) {
        const db = App().cardDB;
        return p.field.reduce((s, c) => s + ((db[c.cardId] && db[c.cardId].cost) || 0), 0);
    }
    function record(kind, payload) {
        const j = journal();
        if (!j) return;
        const s = App().state;
        const last = j.events[j.events.length - 1];
        j.events.push(Object.assign({ seq: last ? last.seq + 1 : 1, turn: s.turn, active: s.activePlayer, kind }, payload));
    }
    function snapshot(player) {
        const a = App(), s = a.state, P = s.players;
        const db = a.cardDB;
        const me = P[player];
        return {
            inkReady: me.inkReady, inkTotal: me.inkTotal,
            lore: [P[0].lore, P[1].lore],
            hand: [P[0].hand.length, P[1].hand.length],
            deck: [P[0].deck.length, P[1].deck.length],
            board: [boardCost(P[0]), boardCost(P[1])],
            fieldChars: P.map(p => p.field.filter(c => db[c.cardId] && db[c.cardId].type === 'Character').length),
            handCards: me.hand.map(c => c.cardId)
        };
    }
    function journalEvent(name, payload) {
        if (!hasGame()) return;
        const s = App().state;
        payload = payload || {};
        switch (name) {
            case 'gameStart': ext().journal = { v: 1, events: [] }; break;
            case 'action': {
                const kind = ACTION_KIND[payload.type];
                if (!kind) return;
                const rest = Object.assign({}, payload); delete rest.type;
                const owner = ownerOf(payload.iid);
                record(kind, Object.assign({ player: owner == null ? s.activePlayer : owner }, rest));
                break;
            }
            case 'challenge': record('challenge', Object.assign({ player: s.activePlayer }, payload)); break;
            case 'lore': record('lore', Object.assign({}, payload)); break;
            case 'damage': {
                const owner = ownerOf(payload.iid);
                record('damage', Object.assign({ player: owner == null ? s.activePlayer : owner }, payload));
                break;
            }
            case 'mulligan': record('mulligan', Object.assign({}, payload)); break;
            case 'turnEnd': record('turnEnd', Object.assign({}, payload, snapshot(payload.player))); break;
            case 'turnStart': record('turnStart', Object.assign({}, payload)); break;
        }
    }

    // --- UI: Lab button, chips, drawer, tweaks ------------------------------------------

    function injectStyles() {
        if (typeof document === 'undefined' || document.getElementById('lab-plugins-css')) return;
        const link = document.createElement('link');
        link.id = 'lab-plugins-css';
        link.rel = 'stylesheet';
        link.href = scriptSrc ? new URL('plugins.css', scriptSrc).href : 'plugins/plugins.css';
        document.head.appendChild(link);
    }

    function enabledList() {
        return plugins.filter(p => Host.isEnabled(p.id)).sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    function withPanel() { return enabledList().filter(p => p.panel && p.panel.render); }

    function buildTopbar() {
        const slot = document.getElementById('plugin-topbar-slot');
        if (!slot) return;
        const panels = withPanel();
        const chips = enabledList().filter(p => p.topbar && p.topbar.render);
        if (!panels.length && !chips.length) { slot.innerHTML = ''; slot.hidden = true; return; }
        slot.hidden = false;
        if (!slot.querySelector('#btn-lab')) {
            slot.innerHTML = `<div class="lab-chips" id="lab-chips"></div>
                <button class="icon-btn lab-btn" id="btn-lab" type="button" title="Lab tools (L)" aria-expanded="false">
                    <i class="fa-solid fa-flask"></i> <span>Lab</span><i class="lab-dot" aria-hidden="true"></i></button>`;
            slot.querySelector('#btn-lab').addEventListener('click', () => Host.toggleDrawer());
        }
        const host = slot.querySelector('#lab-chips');
        // Keep one chip host per plugin, in order; drop chips of disabled plugins.
        const want = chips.map(p => p.id);
        Array.from(host.children).forEach(ch => { if (!want.includes(ch.dataset.plugin)) ch.remove(); });
        chips.forEach(p => {
            let el = host.querySelector(`[data-plugin="${p.id}"]`);
            if (!el) {
                el = document.createElement('span');
                el.className = 'lab-chip-host';
                el.dataset.plugin = p.id;
                host.appendChild(el);
            }
            host.appendChild(el); // re-append keeps order
            if (hasGame()) safe(p.id + '.topbar', () => p.topbar.render(el, makeCtx(p)));
            else el.innerHTML = '';
        });
        const btn = slot.querySelector('#btn-lab');
        btn.hidden = !panels.length;
        btn.classList.toggle('has-dot', panels.some(p => attention[p.id]));
        btn.setAttribute('aria-expanded', drawerOpen ? 'true' : 'false');
        btn.classList.toggle('is-active', drawerOpen);
    }

    function ensureDrawer() {
        let d = document.getElementById('lab-drawer');
        if (d) return d;
        d = document.createElement('aside');
        d.id = 'lab-drawer';
        d.className = 'lab-drawer';
        d.setAttribute('aria-label', 'Lab tools');
        d.innerHTML = `<div class="lab-drawer-head">
                <div class="lab-tabs" id="lab-tabs" role="tablist"></div>
                <button class="lab-close" type="button" title="Close (L)" aria-label="Close Lab">&times;</button>
            </div>
            <div class="lab-drawer-body custom-scrollbar" id="lab-body"></div>`;
        d.querySelector('.lab-close').addEventListener('click', () => Host.closeDrawer());
        document.body.appendChild(d);
        return d;
    }

    function renderDrawer() {
        if (!drawerOpen) return;
        const d = ensureDrawer();
        const panels = withPanel();
        if (!panels.length) { Host.closeDrawer(); return; }
        if (!activeTab || !panels.some(p => p.id === activeTab)) activeTab = panels[0].id;
        const tabs = d.querySelector('#lab-tabs');
        tabs.innerHTML = panels.map(p => `<button type="button" role="tab" data-tab="${p.id}"
                class="lab-tab${p.id === activeTab ? ' is-active' : ''}${attention[p.id] ? ' has-dot' : ''}"
                aria-selected="${p.id === activeTab}" title="${Host.lib.esc(p.description || p.name)}">
                <i class="${p.icon || 'fa-solid fa-flask'}"></i><span>${Host.lib.esc(p.name)}</span></button>`).join('');
        tabs.querySelectorAll('.lab-tab').forEach(b => b.addEventListener('click', () => { activeTab = b.dataset.tab; renderDrawer(); }));
        const body = d.querySelector('#lab-body');
        const p = byId[activeTab];
        if (body.dataset.plugin !== p.id) { body.innerHTML = ''; body.dataset.plugin = p.id; body.scrollTop = 0; }
        if (!hasGame()) { body.innerHTML = `<p class="lab-empty">Start or load a game to use the Lab.</p>`; return; }
        safe(p.id + '.panel', () => p.panel.render(body, makeCtx(p)));
    }

    function renderMulligan(info) {
        const slot = document.getElementById('plugin-mulligan-slot');
        if (!slot) return;
        const list = enabledList().filter(p => p.mulligan && p.mulligan.render);
        const want = list.map(p => p.id);
        Array.from(slot.children).forEach(ch => { if (!want.includes(ch.dataset.plugin)) ch.remove(); });
        list.forEach(p => {
            let el = slot.querySelector(`[data-plugin="${p.id}"]`);
            if (!el) { el = document.createElement('div'); el.className = 'lab-mull-host'; el.dataset.plugin = p.id; slot.appendChild(el); }
            safe(p.id + '.mulligan', () => p.mulligan.render(el, makeCtx(p), info || {}));
        });
    }

    function buildTweaks() {
        const slot = document.getElementById('plugin-tweaks-slot');
        if (!slot || !plugins.length) return;
        const list = plugins.slice().sort((a, b) => (a.order || 0) - (b.order || 0));
        slot.innerHTML = `<div class="tweak lab-tweak">
            <div class="tweak-label"><span>Lab tools</span></div>
            ${list.map(p => `<label class="lab-toggle" title="${Host.lib.esc(p.description || '')}">
                <input type="checkbox" data-plugin="${p.id}" ${Host.isEnabled(p.id) ? 'checked' : ''}>
                <i class="${p.icon || 'fa-solid fa-flask'}"></i><span>${Host.lib.esc(p.name)}</span></label>`).join('')}
            <div class="tweak-hint">Advisors from <em>Mastering Competitive Lorcana</em>. They read the board; they never move a card.</div>
        </div>`;
        slot.querySelectorAll('input[data-plugin]').forEach(inp => inp.addEventListener('change', () => Host.setEnabled(inp.dataset.plugin, inp.checked)));
    }

    function renderAll() {
        renderQueued = false;
        buildTopbar();
        renderDrawer();
    }
    function queueRender() {
        if (renderQueued) return;
        renderQueued = true;
        (root.requestAnimationFrame || setTimeout)(renderAll);
    }

    // --- public API --------------------------------------------------------------------

    const Host = {
        lib: root.DojoLab || {},

        register(def) {
            if (!def || !def.id || byId[def.id]) { console.warn('[Lab] bad or duplicate plugin', def && def.id); return; }
            plugins.push(def);
            byId[def.id] = def;
            if (typeof document !== 'undefined') { buildTweaks(); queueRender(); }
        },
        isEnabled(id) {
            const p = byId[id];
            if (!p) return false;
            return Object.prototype.hasOwnProperty.call(prefs, id) ? !!prefs[id] : p.defaultEnabled !== false;
        },
        setEnabled(id, on) {
            if (!byId[id]) return;
            prefs[id] = !!on;
            savePrefs();
            if (!on) attention[id] = false;
            buildTweaks();
            if (!on) renderMulligan();
            const cb = byId[id].on && byId[id].on.enabled;
            if (on && cb && hasGame()) safe(id + '.enabled', () => cb({}, makeCtx(byId[id])));
            renderAll();
        },
        api(id) { return (byId[id] && Host.isEnabled(id) && byId[id].api) || null; },
        plugins() { return plugins.slice(); },

        // Called by the core (App.plugin). Journal first, then plugin listeners, then UI.
        emit(name, payload) {
            safe('journal.' + name, () => journalEvent(name, payload));
            for (const p of enabledList()) {
                const fn = p.on && p.on[name];
                if (fn) safe(`${p.id}.on.${name}`, () => fn(payload || {}, makeCtx(p)));
            }
            if (name === 'render') queueRender();
            else if (name === 'mulliganRender') renderMulligan(payload);
        },

        refresh(id) {
            if (id && !Host.isEnabled(id)) return;
            renderAll();
            const m = document.getElementById('mulligan-modal');
            if (m && !m.classList.contains('hidden') && hasGame()) {
                const a = App();
                renderMulligan({ player: a.state.activePlayer, marked: (a.mulliganSelection || []).slice() });
            }
        },
        attention(id, on) {
            attention[id] = !!on;
            buildTopbar();
            if (drawerOpen) renderDrawer();
        },

        openDrawer(id) {
            if (id) activeTab = id;
            drawerOpen = true;
            ensureDrawer().classList.add('is-open');
            document.body.classList.add('lab-open');
            renderAll();
        },
        closeDrawer() {
            drawerOpen = false;
            const d = document.getElementById('lab-drawer');
            if (d) d.classList.remove('is-open');
            document.body.classList.remove('lab-open');
            buildTopbar();
        },
        toggleDrawer(id) { if (drawerOpen && (!id || id === activeTab)) Host.closeDrawer(); else Host.openDrawer(id); },
        isDrawerOpen() { return drawerOpen; }
    };

    root.DojoPlugins = Host;

    if (typeof document !== 'undefined') {
        injectStyles();
        const boot = () => { buildTweaks(); queueRender(); };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();
        // True while a dialog, modal or menu of the core is up — the Lab keys stay out of its way.
        const coreBusy = () => {
            if (document.querySelector('.dlg-backdrop')) return true;
            const menu = document.getElementById('context-menu');
            if (menu && menu.style.display === 'block') return true;
            return ['tree-modal', 'setup-modal', 'inspect-deck-modal', 'inspect-discard-modal', 'import-log-modal',
                'card-search-modal', 'mulligan-modal', 'craft-hand-modal']
                .some(id => { const m = document.getElementById(id); return m && !m.classList.contains('hidden'); });
        };
        // L toggles the Lab, like T / M for Timelines / Multiverse; Escape closes it.
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            const t = e.target;
            if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
            if (coreBusy()) return;
            if (e.key === 'Escape') { if (drawerOpen) Host.closeDrawer(); return; }
            if (e.key !== 'l' && e.key !== 'L') return;
            if (!hasGame() || !withPanel().length) return;
            Host.toggleDrawer();
        });
    }
})(typeof window !== 'undefined' ? window : globalThis);
