require('./lab.js'); const L=globalThis.DojoLab; const M=L.M;
const {g,snaps}=L.buildGame();
const nm=c=>M[c.id].name+(c.damage?`(${c.damage}d)`:'')+(c.exerted?'*':'');
const show=(s,label)=>{const [a,b]=s.players;return `${label} T${s.turn} act=${s.active} | M lore ${a.lore} ink ${a.well} | hand[${a.hand.map(c=>M[c.id].name).join(', ')}] field[${a.field.map(nm).join(', ')}] disc ${a.discard.length}\n            | P lore ${b.lore} ink ${b.well} | hand[${b.hand.map(c=>M[c.id].name).join(', ')}] field[${b.field.map(nm).join(', ')}] disc ${b.discard.length}`;};
for(const s of snaps){console.log(show(s.end,'END'));}
console.log(g.log.map(l=>`T${l.t} ${l.a?'P':'M'}: ${l.text}`).join('\n'));
