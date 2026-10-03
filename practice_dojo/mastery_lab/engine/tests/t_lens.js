require('./lab.js'); const L=globalThis.DojoLab; const M=L.M; const nm=id=>M[id].name;
const g=L.scenario();
const P=g.players;
console.log('T',g.turn,'active',g.active,'M lore',P[0].lore,'ready',P[0].ready,'hand',P[0].hand.map(c=>nm(c.id)),'field',P[0].field.map(c=>nm(c.id)+(c.exerted?'*':'')+(c.damage?'('+c.damage+')':'')));
console.log('P lore',P[1].lore,'well',P[1].well,'hand',P[1].hand.length,'field',P[1].field.map(c=>nm(c.id)+(c.exerted?'*':'')));
const rc=L.raceClock(g,0); console.log('clock',JSON.stringify({k:rc.k,finish:rc.finish,winner:rc.winner,margin:rc.margin,rate:rc.rate,avail:rc.avail,pressure:rc.pressure}));
const tm=L.threatMap(g,0);
console.log('POOL N',tm.pool.N,'hand',tm.pool.hand);
for(const t of tm.theirs){console.log('THREAT',nm(t.id),'lore',t.lore,'cards',t.cards,'cond',t.condCards,'ignore2',t.ignore2.toFixed(2));
 for(const e of t.enables)console.log('   enables',e.kind,nm(e.id),(e.p*100).toFixed(0)+'%',e.text);
 for(const a of t.answers)console.log('   answer',a.kind,nm(a.id),JSON.stringify(a));
 for(const b of t.blockers)console.log('   blocked',nm(b.id),b.why);}
for(const x of tm.mine){console.log('EXPOSE',nm(x.id),'exerted',x.exerted,'pAny',(x.pAny*100).toFixed(0)+'%'); for(const c of x.certain)console.log('   certain',c.kind,nm(c.id)); for(const p of x.pool)console.log('   pool',nm(p.id),p.copies,(p.p*100).toFixed(0)+'%',JSON.stringify(p.route),p.why); for(const c of x.combos.slice(0,3))console.log('   combo',nm(c.a),'+',nm(c.b),(c.p*100).toFixed(0)+'%',JSON.stringify(c.routeB));}
console.log('dead',tm.dead.map(d=>nm(d.id)+'×'+d.copies).join(', '));
console.log('live',tm.live.map(d=>nm(d.id)+'→'+d.targets.map(nm).join('/')).join(', '));
console.log('sweeps',tm.sweeps.map(s=>nm(s.id)+' '+s.value+'ink '+JSON.stringify(s.route)).join(' | '));
// simulate "quest with everything"
const g2=L.clone(g); for(const a of L.legalActions(g2,0).filter(a=>a.kind==='quest'&&!a.support)) {try{L.doAction(g2,0,a)}catch(e){}}
console.log('after quest-all clock',JSON.stringify(L.raceClock(g2,0).finish), 'exposure',L.threatMap(g2,0).mine.map(x=>nm(x.id)+' '+(x.pAny*100).toFixed(0)+'%').join(', '));
console.log(L.legalActions(g,0).map(a=>a.label).join('\n'));
