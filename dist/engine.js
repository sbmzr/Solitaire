/* Deterministic, DOM-independent Klondike rules. */
(function(root) {
  'use strict';
  const suits = ['S','H','C','D'];
  const isJoker = c => c && c.suit === 'J';
  const cheatMode = g => g.mode === 'cheat';
  const linked = (a,b) => isJoker(a) || isJoker(b) || (a.rank === b.rank+1 && red(a)!==red(b));
  const red = c => c.suit === 'H' || c.suit === 'D';
  const rankName = n => ({1:'A',11:'J',12:'Q',13:'K'}[n] || String(n));
  const id = c => isJoker(c) ? 'J_'+c.rank : c.suit + '_' + (c.rank === 1 || c.rank > 10 ? rankName(c.rank) : String(c.rank).padStart(2,'0'));
  function create(draw=1, random=Math.random, mode='normal') {
    const deck = suits.flatMap(suit=>Array.from({length:13},(_,i)=>({suit,rank:i+1,up:false})));
    for(let i=51;i>0;i--){const j=Math.floor(random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    const tableau=Array.from({length:7},()=>[]);
    for(let col=0;col<7;col++) for(let row=0;row<=col;row++) tableau[col].push(deck.pop());
    tableau.forEach(p=>p[p.length-1].up=true);
    return {tableau,stock:deck,waste:[],foundations:[[],[],[],[]],draw,moves:0,mode,
      ...(mode==='cheat'?{removed:[],cheats:{destroy:3,swap:3,joker:2}}:{})};
  }
  function pile(g,p){return p.type==='tableau'?g.tableau[p.index]:p.type==='foundation'?g.foundations[p.index]:p.type==='waste'?g.waste:[];}
  function movable(g,from){
    const p=pile(g,from),i=from.card;
    if(!Number.isInteger(i)||i<0||i>=p.length||!p[i].up) return [];
    if(from.type!=='tableau'&&i!==p.length-1) return [];
    const cards=p.slice(i);
    if(cards.some((c,j)=>!c.up||(j>0&&!linked(cards[j-1],c)))) return [];
    return cards;
  }
  function canMove(g,from,to){
    if(!to||!['tableau','foundation'].includes(to.type)||!Number.isInteger(to.index)||to.index<0||to.index>=(to.type==='tableau'?7:4))return false;
    if(from.type===to.type&&from.index===to.index)return false;
    const cards=movable(g,from);if(!cards.length)return false;
    const c=cards[0],target=pile(g,to),top=target[target.length-1];
    if(to.type==='foundation') return cards.length===1 && !isJoker(c) && c.suit===suits[to.index] && c.rank===nextRank(g,to.index);
    return top?top.up&&linked(top,c):isJoker(c)||c.rank===13;
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
  function nextRank(g,index){
    const p=g.foundations[index];let rank=p.length?p[p.length-1].rank+1:1;
    while((g.removed||[]).some(c=>c.suit===suits[index]&&c.rank===rank))rank++;
    return rank;
  }
  function completed(g){return g.foundations.flat().length+(g.removed||[]).filter(c=>!isJoker(c)).length;}
  const win=g=>completed(g)===52;
  function cheatTarget(g,from){
    if(!from||!['tableau','waste'].includes(from.type)||!Number.isInteger(from.index)||from.index<0||from.index>=(from.type==='tableau'?7:1))return false;
    const p=pile(g,from);
    return Number.isInteger(from.card)&&from.card>=0&&from.card<p.length&&p[from.card].up&&(from.type==='tableau'||from.card===p.length-1);
  }
  function cheat(g,action,from,to){
    if(!cheatMode(g)||!g.cheats||!(g.cheats[action]>0)||!['destroy','swap','joker'].includes(action))return false;
    if(action==='joker'){
      if(!to||to.type!=='tableau'||!Number.isInteger(to.index)||to.index<0||to.index>=7)return false;
      g.tableau[to.index].push({suit:'J',rank:3-g.cheats.joker,up:true});
    }else{
      if(!cheatTarget(g,from))return false;
      const a=pile(g,from);
      if(action==='destroy'){
        g.removed.push(a.splice(from.card,1)[0]);
        if(from.type==='tableau'&&a.length)a[a.length-1].up=true;
      }else{
        if(!cheatTarget(g,to)||(from.type===to.type&&from.index===to.index&&from.card===to.card))return false;
        const b=pile(g,to);[a[from.card],b[to.card]]=[b[to.card],a[from.card]];
      }
    }
    g.cheats[action]--;g.moves++;return true;
  }
  function valid(g){
    if(!g||![undefined,'normal','cheat'].includes(g.mode)||![1,3].includes(g.draw)||!Number.isInteger(g.moves)||g.moves<0||!Array.isArray(g.tableau)||g.tableau.length!==7||!Array.isArray(g.foundations)||g.foundations.length!==4)return false;
    const cheating=cheatMode(g);
    if(cheating&&(!Array.isArray(g.removed)||!g.cheats||Object.entries({destroy:3,swap:3,joker:2}).some(([k,max])=>!Number.isInteger(g.cheats[k])||g.cheats[k]<0||g.cheats[k]>max)))return false;
    if(!cheating&&(g.removed!==undefined||g.cheats!==undefined))return false;
    const piles=[g.stock,g.waste,...g.tableau,...g.foundations,...(cheating?[g.removed]:[])];if(piles.some(p=>!Array.isArray(p)))return false;
    const cards=piles.flat();
    if(cards.some(c=>!c||typeof c.up!=='boolean'||!Number.isInteger(c.rank)||!(suits.includes(c.suit)?c.rank>=1&&c.rank<=13:cheating&&isJoker(c)&&c.rank>=1&&c.rank<=2)))return false;
    const normals=cards.filter(c=>!isJoker(c)),jokers=cards.filter(isJoker);
    if(normals.length!==52||new Set(cards.map(id)).size!==cards.length)return false;
    if(cheating&&(g.removed.length!==3-g.cheats.destroy||g.removed.some(c=>!c.up)||jokers.length!==2-g.cheats.joker||jokers.some(c=>c.rank>2-g.cheats.joker)))return false;
    if(g.stock.some(c=>c.up)||g.waste.some(c=>!c.up))return false;
    if(g.foundations.some((p,i)=>{
      const ranks=Array.from({length:13},(_,j)=>j+1).filter(rank=>!(g.removed||[]).some(c=>c.suit===suits[i]&&c.rank===rank));
      return p.some((c,j)=>!c.up||c.suit!==suits[i]||c.rank!==ranks[j]);
    }))return false;
    return g.tableau.every(p=>{const first=p.findIndex(c=>c.up);return p.length===0||(first>=0&&p.slice(first).every((c,j,a)=>c.up&&(cheating||j===0||linked(a[j-1],c))));});
  }
  const api={suits,red,rankName,id,isJoker,cheatMode,linked,create,pile,movable,canMove,move,draw,options,win,valid,nextRank,completed,cheatTarget,cheat};
  if(typeof module!=='undefined')module.exports=api;else root.Klondike=api;
})(typeof globalThis!=='undefined'?globalThis:this);
