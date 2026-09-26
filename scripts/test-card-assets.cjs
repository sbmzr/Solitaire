const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'../dist');
const context={window:{}};vm.runInNewContext(fs.readFileSync(path.join(root,'card-faces.js'),'utf8'),context);
const faces=context.window.CardFaces;
assert.equal(Object.keys(faces).length,52);
for(const suit of ['S','H','C','D'])for(let rank=1;rank<=13;rank++){
 const id=suit+'_'+({1:'A',11:'J',12:'Q',13:'K'}[rank]||String(rank).padStart(2,'0'));
 const svg=fs.readFileSync(path.join(root,'assets/cards',id+'.svg'),'utf8');assert.equal(faces[id],svg);
 assert.equal((svg.match(/<text x="207" y="55"/g)||[]).length,rank<=10?0:2);
 assert.equal((svg.match(/<text x="38" y="58"/g)||[]).length,2);
 if(rank<=10)assert.equal((svg.match(/dominant-baseline="central"/g)||[]).length,rank);
}
console.log('PASS all 52 SVG faces match bundle; A–10 corner suits removed; ranks, pips and J/Q/K corners retained');
