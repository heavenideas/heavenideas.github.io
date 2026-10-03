require('./lab.js'); const L=globalThis.DojoLab; const M=L.M; const nm=id=>M[id].name;
const start=L.scenario();
const S={ ink:{key:'ink',kind:'ink'}, dumbo:{key:'dumbo',kind:'activate',who:'Dumbo'}, demona:{key:'demona',kind:'play',card:'Demona'}, agustin:{key:'agustin',kind:'quest',who:'Agustin',support:true}, hamm:{key:'hamm',kind:'challenge',att:'Hamm',def:'Milo'} };
function show(label, keys, inkId){ const steps=keys.map(k=>S[k]); const run=L.coachRun(start,steps,inkId,0); const sc=L.coachScore(start,run,0); const fl=L.coachFlags(start,steps,run,0);
 console.log('==',label, keys.join(' > '),'ink',nm(inkId)); for(const r of run.steps) console.log('   ',r.key,r.ok?'ok':'ILLEGAL: '+r.why, r.drew?'drew '+r.drew.map(nm):'', r.res?JSON.stringify(r.res):'', r.supportTo?'support→'+r.supportTo:'');
 console.log('   score',JSON.stringify(sc)); for(const f of fl) console.log('   FLAG',f.rule,'@'+f.at,f.title,'—',f.text); }
show('recorded', ['ink','demona','hamm','agustin','dumbo'], L.ID.JWG);
show('fixed support', ['ink','demona','agustin','hamm','dumbo'], L.ID.JWG);
show('draw first, ink jwg', ['dumbo','ink','demona','agustin','hamm'], L.ID.JWG);
show('ideal', ['dumbo','ink','demona','agustin','hamm'], L.ID.Gaston);
show('early ink gaston', ['ink','dumbo','demona','agustin','hamm'], L.ID.Gaston);
show('challenge first', ['hamm','ink','dumbo','demona','agustin'], L.ID.Hades);
let t=Date.now(); const b=L.coachBest(start,Object.values(S),0); console.log('BEST',JSON.stringify(b.best),'tried',b.tried,'ms',Date.now()-t);
