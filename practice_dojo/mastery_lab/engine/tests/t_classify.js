const {model}=require('./classify.js');
const data=require('./cards.json');
for(const c of data.cards){const m=model(c);
 const bits=[];
 if(Object.keys(m.kw).length)bits.push('kw='+JSON.stringify(m.kw));
 if(m.shiftBase)bits.push('shiftBase='+m.shiftBase);
 if(m.answers.length)bits.push('ans='+m.answers.map(a=>`${a.mode}/${a.scope}/${a.target}${a.n?':'+a.n:''}${a.opposing?'/opp':''}${JSON.stringify(a.filter)!=='{}'?JSON.stringify(a.filter):''}${a.cond?'/cond:'+a.cond.another:''}@${a.trigger}`).join(' ; '));
 if(m.draw.play||m.draw.act||m.draw.eot)bits.push('draw='+JSON.stringify(m.draw));
 if(m.gain.act)bits.push('gainAct='+m.gain.act);
 if(m.reducer)bits.push('reducer='+JSON.stringify(m.reducer));
 if(m.upgrade)bits.push('upgrade='+JSON.stringify(m.upgrade));
 if(m.info)bits.push('info');if(m.tax)bits.push('tax');if(m.refill)bits.push('refill='+m.refill);
 if(m.singTogether)bits.push('singTogether='+m.singTogether);
 if(m.actInk||m.actExert)bits.push(`act(ink ${m.actInk}, exert ${m.actExert}, oneshot ${m.actOneShot})`);
 console.log(m.full.padEnd(48),m.song?'[song]':'',bits.join(' | '));
}
