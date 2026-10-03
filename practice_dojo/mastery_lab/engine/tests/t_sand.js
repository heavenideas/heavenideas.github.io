require('./lab.js'); const L=globalThis.DojoLab; const M=L.M; const nm=id=>M[id].name;
function run(label, picks){ const g=L.scenario(); for(const p of picks){ const acts=L.legalActions(g,0); let a;
  if(g.pending){ a={kind:'target',target:g.pending.targets.find(t=>nm(L.find(g,t).c.id).startsWith(p))||null}; }
  else a=acts.find(x=>x.label.startsWith(p)); if(!a){console.log(label,'NO ACTION',p,'| avail:',acts.map(x=>x.label).join(' / ')); return;} L.doAction(g,0,a);}
  const rc=L.raceClock(g,0); const tm=L.threatMap(g,0);
  console.log(`${label}: lore ${g.players[0].lore}-${g.players[1].lore} finish ${rc.finish} winner ${rc.winner===0?'M':'P'} margin ${rc.margin} rates ${rc.rate} | M field ${g.players[0].field.map(c=>nm(c.id)+(c.exerted?'*':'')).join(',')} | P field ${g.players[1].field.map(c=>nm(c.id)+(c.exerted?'*':'')).join(',')} | hands ${g.players[0].hand.map(c=>nm(c.id)).join(',')} / ${g.players[1].hand.length} | ready ${g.players[0].ready}`);
  console.log('   exposure', tm.mine.map(x=>nm(x.id)+' '+(x.pAny*100).toFixed(0)+'%').join(', '), '| top threat', tm.theirs[0]&&nm(tm.theirs[0].id));
  return g; }
run('A quest-all', ['Agustin Madrigal quests','Dumbo quests','Hamm quests']);
run('B key line', ['Dumbo: 1','Ink Gaston','Play Demona','Agustin Madrigal quests · Support → Hamm','Hamm → Milo']);
run('B2 dumbo kills tod', ['Ink Junior','Play Demona','Agustin Madrigal quests · Support → Hamm','Hamm → Milo','Dumbo → Tod']);
run('C hades+jwg', ['Ink Demona','Play Hades','Play Junior','Agustin Madrigal quests','Dumbo quests','Hamm quests']);
run('D flawed', ['Ink Junior','Play Demona','Hamm → Milo','Agustin Madrigal quests · Support → Dumbo','Dumbo: 1']);
