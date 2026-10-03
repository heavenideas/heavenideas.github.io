require('./lab.js'); const L=globalThis.DojoLab; const nm=id=>L.M[id].name;
const ha=['Phillip','Milo','MMS','Tod','Huntsman','Rafiki','Sea'].map(k=>L.ID[k]);
for (const onPlay of [true,false]) {
const r2=L.mulliganOptions('A',ha,{onPlay,planId:L.ID.MMS,planTurn:4,sims:600,seed:3});
console.log('onPlay',onPlay,'tied',r2.filter(x=>x.tied).length);
for(const r of r2.slice(0,6)) console.log(r.rank,r.mean.toFixed(2),r.tied?'TIE':'   ',r.gap.toFixed(2),'±',(2*r.se).toFixed(2),'throw:',r.thrown.map(nm).join('+')||'(keep 7)','played',r.played.map(x=>x.toFixed(2)).join('/'),'plan',r.plan.toFixed(2));
for (const want of [[],['Sea'],['Phillip','Sea'],['Phillip','Milo','Sea']]) { const ids=want.map(k=>L.ID[k]).sort((a,b)=>a-b).join(','); const x=r2.find(r=>r.thrown.slice().sort((a,b)=>a-b).join(',')===ids); console.log(' ',want.join('+')||'keep7','rank',x.rank,x.mean.toFixed(2),'played',x.played.map(v=>v.toFixed(2)).join('/'),'missAny',x.missAny.toFixed(2)); }
}
