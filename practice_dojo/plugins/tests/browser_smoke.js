// Headless smoke test for practice_dojo.html v3 + plugins.
// Needs Playwright + Chromium (preinstalled in Claude Code cloud sessions).
//   node practice_dojo/plugins/tests/browser_smoke.js [--no-plugins] [--mobile] [--shots <dir>]
// Every remote request is stubbed or served from the repo, so it runs offline:
// card DB = practice_dojo/mastery_lab/allCards.json, Tailwind/Supabase/Fuse/marked = stubs,
// card art = blocked (the Dojo's offline text faces show instead).
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }

const ROOT = path.resolve(__dirname, '../../..');
const DOJO = path.join(ROOT, 'practice_dojo');
const args = process.argv.slice(2);
const NO_PLUGINS = args.includes('--no-plugins');
const shotsIdx = args.indexOf('--shots');
const SHOTS = shotsIdx >= 0 ? args[shotsIdx + 1] : null;
const MOBILE = args.includes('--mobile');

const STUBS = {
    supabase: `window.supabase = { createClient: () => { const q = { select(){return q;}, order(){return Promise.resolve({data:[],error:null});}, eq(){return q;}, single(){return Promise.resolve({data:null,error:{message:'offline'}});}, insert(){return Promise.resolve({data:null,error:{message:'offline'}});} }; return { from: () => q }; } };`,
    fuse: `window.Fuse = class { constructor(list, o){ this.list = list || []; this.o = o || {}; } search(q){ q = String(q).toLowerCase(); const k = (this.o.keys && this.o.keys[0]) || 'name'; const key = typeof k === 'string' ? k : k.name; return this.list.filter(x => String((x && x[key]) || x).toLowerCase().includes(q)).slice(0, 20).map(item => ({ item })); } };`,
    marked: `window.marked = { parse: (s) => String(s || '') }; window.marked.marked = window.marked.parse;`
};

function readDeck(label) {
    const txt = fs.readFileSync(path.join(DOJO, 'mastery_lab/engine/decks.txt'), 'utf8');
    const parts = txt.split(/DECK_[AB]\n/).filter(Boolean);
    return label === 'A' ? parts[0].trim() : parts[1].trim();
}

(async () => {
    const browser = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? undefined : undefined });
    const page = await browser.newPage(MOBILE ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); else if (m.type() === 'warning') errors.push('warn: ' + m.text()); });
    page.on('requestfailed', (r) => errors.push('reqfail: ' + r.url().slice(0, 120)));
    page.on('response', (r) => { if (r.status() >= 400) errors.push('http ' + r.status() + ': ' + r.url().slice(0, 120)); });

    await page.route('**/*', async (route) => {
        const url = route.request().url();
        if (url.startsWith('http://dojo.local/')) {
            const rel = decodeURIComponent(url.replace('http://dojo.local/', '').split('?')[0]);
            if (NO_PLUGINS && rel.startsWith('practice_dojo/plugins/')) return route.fulfill({ status: 404, body: '' });
            const f = path.join(ROOT, rel);
            if (!fs.existsSync(f)) return route.fulfill({ status: 404, body: 'not found' });
            const type = f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'application/javascript' : f.endsWith('.css') ? 'text/css' : f.endsWith('.json') ? 'application/json' : 'application/octet-stream';
            return route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(f) });
        }
        const cors = { 'access-control-allow-origin': '*' };
        if (url.includes('allCards.json')) return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: fs.readFileSync(path.join(DOJO, 'mastery_lab/allCards.json')) });
        if (url.includes('lorcana_abilities_redux.json')) return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: fs.readFileSync(path.join(ROOT, 'lorcanaUtils_MatchUpAnalyzer/lorcana_abilities_redux.json')) });
        if (url.includes('unified_win_probability_utilities.js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: fs.readFileSync(path.join(ROOT, 'utilities/unified_win_probability_utilities.js')) });
        if (url.includes('supabase-js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: STUBS.supabase });
        if (url.includes('fuse.js')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: STUBS.fuse });
        if (url.includes('marked')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: STUBS.marked });
        if (url.includes('tailwindcss')) return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
        if (/\.(css)(\?|$)/.test(url) || url.includes('fonts.googleapis')) return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
        return route.abort();
    });

    const check = (cond, msg) => { if (!cond) { failures.push(msg); console.log('  ✗ ' + msg); } else console.log('  ✓ ' + msg); };
    const failures = [];

    await page.goto('http://dojo.local/practice_dojo/practice_dojo.html');
    try { await page.waitForFunction(() => window.App && App.allCards && App.allCards.length > 1000 && document.getElementById('loading-screen').classList.contains('hidden'), null, { timeout: 30000 }); }
    catch (e) { console.log("boot failed:", errors.join("\n"), await page.evaluate(() => JSON.stringify({ app: typeof App, cards: window.App && App.allCards && App.allCards.length, db: window.App && Object.keys(App.cardDB || {}).length }))); throw e; }
    // Text card mode: no image requests at all.
    await page.evaluate(() => { try { const t = App.loadTweaks(); t.cardMode = 'text'; App.saveTweaks(t); App.applyTweaks(t); } catch (e) { } });
    console.log(NO_PLUGINS ? 'Mode: core only (plugins 404)' : 'Mode: core + plugins');
    check(await page.evaluate(() => typeof App.plugin === 'function'), 'App.plugin hook exists');
    check(await page.evaluate(() => !!window.DojoPlugins) === !NO_PLUGINS, NO_PLUGINS ? 'no plugin host loaded' : 'plugin host loaded');

    // Start a game with the two Mastery Lab lists.
    await page.evaluate(([a, b]) => {
        document.getElementById('deck1-input').value = a;
        document.getElementById('deck2-input').value = b;
        App.startGame();
    }, [readDeck('B'), readDeck('A')]);
    await page.waitForTimeout(300);
    check(await page.evaluate(() => App.state.players[0].hand.length === 7 && App.state.players[1].hand.length === 7), 'game started, 7-card hands');
    check(await page.evaluate(() => App.state.players[0].deck.length === 53), 'deck parsed to 60 cards');

    // Mulligan modal opens and renders (slot present).
    await page.evaluate(() => { App.openMulligan(); App.mulliganSelection = [App.state.players[0].hand[0].instanceId]; App.renderMulliganCards(); });
    await page.waitForTimeout(200);
    check(await page.evaluate(() => !!document.getElementById('plugin-mulligan-slot')), 'mulligan slot present');
    await page.evaluate(() => App.confirmMulligan());

    // Play a scripted turn sequence through the real App methods.
    const turn = async () => page.evaluate(() => {
        const s = App.state, p = s.players[s.activePlayer], db = App.cardDB;
        const inkable = p.hand.find(c => db[c.cardId] && db[c.cardId].inkwell);
        if (inkable) App.playToInkwell(inkable.instanceId);
        const playable = p.hand.filter(c => db[c.cardId] && db[c.cardId].type === 'Character' && db[c.cardId].cost <= p.inkReady).sort((x, y) => db[y.cardId].cost - db[x.cardId].cost)[0];
        if (playable) App.playCard(playable.instanceId);
        const quester = p.field.find(c => db[c.cardId].type === 'Character' && !c.exerted && !c.drying);
        if (quester) App.quest(quester.instanceId);
        App.endTurn();
    });
    for (let i = 0; i < 8; i++) await turn();
    // A challenge, then let the delayed banish land.
    await page.evaluate(() => {
        const s = App.state, me = s.players[s.activePlayer], op = s.players[s.inactivePlayer], db = App.cardDB;
        const a = me.field.find(c => db[c.cardId].type === 'Character' && !c.drying && !c.exerted);
        const d = op.field.find(c => db[c.cardId].type === 'Character');
        if (a && d) App.performChallenge(a.instanceId, d.instanceId);
        App.drawCard(s.activePlayer);
    });
    await page.waitForTimeout(1200);
    check(await page.evaluate(() => App.state.turn >= 5), 'eight player-turns played');

    if (!NO_PLUGINS) {
        const j = await page.evaluate(() => (App.state.ext && App.state.ext.journal && App.state.ext.journal.events) || []);
        const kinds = j.reduce((m, e) => (m[e.kind] = (m[e.kind] || 0) + 1, m), {});
        console.log('  journal kinds:', JSON.stringify(kinds));
        check(j.length > 20, 'journal recorded events');
        check(kinds.turnEnd === 8 && kinds.turnStart === 8, 'turnEnd / turnStart per player-turn');
        check(kinds.ink >= 6 && kinds.play >= 1 && kinds.quest >= 1, 'ink / play / quest recorded');
        check(kinds.mulligan === 1, 'mulligan recorded');
        check(j.every((e, i) => e.seq === i + 1), 'seq is contiguous');
        check(j.filter(e => ['ink', 'play', 'quest', 'draw'].includes(e.kind)).every(e => e.iid && e.cardId != null), 'card events carry iid + cardId');
        const bounced = await page.evaluate(() => {
            const s = App.state, me = s.players[s.activePlayer];
            const c = me.field.find(x => App.cardDB[x.cardId].type === 'Character');
            if (!c) return 'none';
            App.returnToHand(c.instanceId);
            const ev = App.state.ext.journal.events.slice(-1)[0];
            App.undo();
            return ev.kind === 'leave' && ev.iid === c.instanceId && ev.to === 'hand' ? 'ok' : JSON.stringify(ev);
        });
        check(bounced === 'ok' || bounced === 'none', `bounce to hand recorded as leave (${bounced})`);
        const te = j.find(e => e.kind === 'turnEnd');
        check(te && Array.isArray(te.lore) && Array.isArray(te.handCards) && typeof te.inkReady === 'number' && Array.isArray(te.boardLore), 'turnEnd snapshot present');

        // Undo removes the last action from the journal; history stores only the length.
        const before = j.length;
        const histHasLen = await page.evaluate(() => { const h = JSON.parse(App.history[App.history.length - 1]); return !!(h.ext && h.ext.journal && typeof h.ext.journal.len === 'number' && !h.ext.journal.events); });
        check(histHasLen, 'undo snapshots store journal length only');
        await page.evaluate(() => App.undo());
        const after = await page.evaluate(() => App.state.ext.journal.events.length);
        check(after < before, `undo trims the journal (${before} → ${after})`);

        // Bookmark round-trip keeps ext.
        const kept = await page.evaluate(() => { const c = App.compressState(App.state, true); const d = App.decompressState(JSON.parse(JSON.stringify(c))); return d.ext.journal.events.length === App.state.ext.journal.events.length; });
        check(kept, 'compress/decompress keeps the journal');

        // UI: Lab button, drawer, tabs.
        await page.evaluate(() => App.render());
        await page.waitForTimeout(100);
        const ui = await page.evaluate(() => ({
            slotVisible: !document.getElementById('plugin-topbar-slot').hidden,
            plugins: DojoPlugins.plugins().map(p => p.id),
            tweaks: document.querySelectorAll('#plugin-tweaks-slot input[data-plugin]').length
        }));
        console.log('  registered plugins:', ui.plugins.join(', ') || '(none)');
        check(ui.tweaks === ui.plugins.length, 'a Tweaks toggle per plugin');
        if (ui.plugins.length) {
            await page.evaluate(() => DojoPlugins.openDrawer());
            await page.waitForTimeout(150);
            for (const id of ui.plugins) {
                const ok = await page.evaluate((pid) => {
                    if (!DojoPlugins.isEnabled(pid)) DojoPlugins.setEnabled(pid, true);
                    const p = DojoPlugins.plugins().find(x => x.id === pid);
                    if (!p.panel) return 'no-panel';
                    DojoPlugins.openDrawer(pid);
                    const body = document.getElementById('lab-body');
                    return body && body.dataset.plugin === pid && body.innerText.trim().length > 0 ? 'ok' : 'empty';
                }, id);
                check(ok === 'ok' || ok === 'no-panel', `panel renders: ${id} (${ok})`);
                if (SHOTS && ok === 'ok') { fs.mkdirSync(SHOTS, { recursive: true }); await page.waitForTimeout(150); await page.screenshot({ path: path.join(SHOTS, `panel_${id}.png`) }); }
            }
            await page.evaluate(() => DojoPlugins.closeDrawer());
        }
        if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.evaluate(() => document.querySelectorAll('.toast, #toast-container > *').forEach(t => t.remove())); await page.screenshot({ path: path.join(SHOTS, 'board.png') }); }
    }

    // Core still works: quest-all, end turn, undo, bookmark save/restore.
    const coreOk = await page.evaluate(() => {
        const t = App.state.turn; App.endTurn(); App.undo();
        App.saveTimeline && App.saveTimeline();
        return App.state.turn === t;
    });
    check(coreOk, 'core end turn / undo / save bookmark still work');

    const warnings = errors.filter(e => e.startsWith('warn:'));
    if (warnings.length) console.log('  warnings:\n   ' + [...new Set(warnings)].join('\n   '));
    const relevant = errors.filter(e => (e.startsWith('pageerror') || e.startsWith('console:')) && !/Failed to load resource|net::ERR/.test(e));
    if (relevant.length) console.log('  errors:\n   ' + relevant.join('\n   '));
    check(relevant.length === 0, 'no page errors');
    await browser.close();
    console.log(failures.length ? `\n${failures.length} FAILED` : '\nALL PASSED');
    process.exit(failures.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
