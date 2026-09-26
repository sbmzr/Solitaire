/* Deterministic, DOM-independent Klondike rules. */
(function(root) {
  'use strict';
  const suits = ['S','H','C','D'];
  const red = c => c.suit === 'H' || c.suit === 'D';
  const rankName = n => ({1:'A',11:'J',12:'Q',13:'K'}[n] || String(n));
  const id = c => c.suit + '_' + (c.rank === 1 || c.rank > 10 ? rankName(c.rank) : String(c.rank).padStart(2,'0'));
  function create(draw=1, random=Math.random) {
    const deck = suits.flatMap(suit=>Array.from({length:13},(_,i)=>({suit,rank:i+1,up:false})));
    for(let i=51;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    const tableau=Array.from({length:7},()=>[]);
    for(let col=0;col<7;col++) for(let row=0;row<=col;row++) tableau[col].push(deck.pop());
    tableau.forEach(p=>p[p.length-1].up=true);
    return {tableau,stock:deck,waste:[],foundations:[[],[],[],[]],draw,moves:0};
  }
  function pile(g,p){return p.type==='tableau'?g.tableau[p.index]:p.type==='foundation'?g.foundations[p.index]:p.type==='waste'?g.waste:[];}
  function movable(g,from){
    const p=pile(g,from),i=from.card;
    if(!Number.isInteger(i)||i<0||i>=p.length||!p[i].up) return [];
    if(from.type!=='tableau'&&i!==p.length-1) return [];
    const cards=p.slice(i);
    if(cards.some((c,j)=>!c.up||(j>0&&(cards[j-1].rank!==c.rank+1||red(cards[j-1])===red(c))))) return [];
    return cards;
  }
  function canMove(g,from,to){
    if(!to||!['tableau','foundation'].includes(to.type)||!Number.isInteger(to.index)||to.index<0||to.index>=(to.type==='tableau'?7:4))return false;
    if(from.type===to.type&&from.index===to.index)return false;
    const cards=movable(g,from);if(!cards.length)return false;
    const c=cards[0],target=pile(g,to),top=target[target.length-1];
    if(to.type==='foundation') return cards.length===1 && c.suit===suits[to.index] && c.rank===(top?top.rank+1:1);
    return top?top.up&&top.rank===c.rank+1&&red(top)!==red(c):c.rank===13;
  }
  function move(g,from,to){
    if(!canMove(g,from,to))return false;
    const src=pile(g,from);pile(g,to).push(...src.splice(from.card));
    if(from.type==='tableau'&&src.length)src[src.length-1].up=true;
    g.moves++;return true;
  }
  function draw(g){
    if(g.stock.length){for(let i=0;i<g.draw&&g.stock.length;i++){const c=g.stock.pop();c.up=true;g.waste.push(c);}}
    else if(g.waste.length){g.stock=g.waste.splice(0).reverse();g.stock.forEach(c=>c.up=false);}
    else return false;
    g.moves++;return true;
  }
  function options(g){
    const out=[],sources=[];
    g.tableau.forEach((p,index)=>p.forEach((c,card)=>{if(c.up)sources.push({type:'tableau',index,card});}));
    if(g.waste.length)sources.unshift({type:'waste',index:0,card:g.waste.length-1});
    g.foundations.forEach((p,index)=>{if(p.length)sources.push({type:'foundation',index,card:p.length-1});});
    for(const from of sources)for(const type of ['foundation','tableau'])for(let index=0;index<(type==='foundation'?4:7);index++){
      const to={type,index};if(canMove(g,from,to))out.push({from,to});
    }
    return out;
  }
  const win=g=>g.foundations.every(p=>p.length===13);
  function valid(g){
    if(!g||![1,3].includes(g.draw)||!Number.isInteger(g.moves)||g.moves<0||!Array.isArray(g.tableau)||g.tableau.length!==7||!Array.isArray(g.foundations)||g.foundations.length!==4)return false;
    const piles=[g.stock,g.waste,...g.tableau,...g.foundations];if(piles.some(p=>!Array.isArray(p)))return false;
    const cards=piles.flat();if(cards.length!==52||cards.some(c=>!c||!suits.includes(c.suit)||!Number.isInteger(c.rank)||c.rank<1||c.rank>13||typeof c.up!=='boolean')||new Set(cards.map(id)).size!==52)return false;
    if(g.stock.some(c=>c.up)||g.waste.some(c=>!c.up))return false;
    if(g.foundations.some((p,i)=>p.some((c,j)=>!c.up||c.suit!==suits[i]||c.rank!==j+1)))return false;
    return g.tableau.every(p=>{const first=p.findIndex(c=>c.up);return p.length===0||(first>=0&&p.slice(first).every((c,j,a)=>c.up&&(j===0||(a[j-1].rank===c.rank+1&&red(a[j-1])!==red(c)))));});
  }
  const api={suits,red,rankName,id,create,pile,movable,canMove,move,draw,options,win,valid};
  if(typeof module!=='undefined')module.exports=api;else root.Klondike=api;
})(typeof globalThis!=='undefined'?globalThis:this);
