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

if (typeof module !== 'undefined') module.exports = { model, parseAnswers };
