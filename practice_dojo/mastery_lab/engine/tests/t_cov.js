const {model}=require('./classify.js');
const d=require('/root/.claude/uploads/49a29ff6-9909-5418-a567-31713bb76736/79c10b70-allCards.json');
const excl=new Set(['Enchanted','Promo','Special']);
const seen=new Set();let tot=0,hit=0,miss=[];let kwc={},modes={};
const REM=/(banish (chosen|all|each)( opposing)?( damaged| exerted)? (character|item)|deal \d+ damage to (chosen|each)|damage counters? on (chosen|each)|return chosen (opposing )?character[^.]*to their player's hand|on the bottom of their players?'? decks?|exert (chosen|all) (opposing )?character)/i;
for(const c of d.cards){ if(excl.has(c.rarity)||seen.has(c.fullName))continue; seen.add(c.fullName);
 const texts=[...(c.abilities||[]).filter(a=>a.type!=='keyword').map(a=>a.effect||''),...(c.effects||[])].join(' ').replace(/\s+/g,' ');
 const m=model(c);
 for(const k in m.kw)kwc[k]=(kwc[k]||0)+1;
 for(const a of m.answers)modes[a.mode]=(modes[a.mode]||0)+1;
 if(REM.test(texts)){tot++; if(m.answers.length)hit++; else miss.push(c.fullName+' :: '+texts.slice(0,160));}
}
console.log('unique cards',seen.size,'removal-text cards',tot,'parsed',hit,(100*hit/tot).toFixed(1)+'%');
console.log('kw',kwc);console.log('modes',modes);
console.log(miss.slice(0,25).join('\n'));
