'use strict';
const K=Klondike,$=s=>document.querySelector(s),symbols={S:'♠',H:'♥',C:'♣',D:'♦'},suitNames={S:'スペード',H:'ハート',C:'クラブ',D:'ダイヤ'};
const board=$('#board'),stateKey='atelier-klondike-v1';
let game=K.create(),history=[],seconds=0,started=false,selected=null,hinted=null,wonShown=false,art={},db=null,pointer=null,ghost=null,skipClickUntil=0,lastTimer=Date.now(),savingNotice=false,cheatAction=null,cheatFirst=null;
const clone=x=>JSON.parse(JSON.stringify(x));
const sessions={};
const modeName=mode=>mode==='cheat'?'イカサマモード':'通常モード';
const saveKey=mode=>mode==='cheat'?stateKey+'-cheat':stateKey;
function readSession(mode){
 let saved=sessions[mode];
 if(!saved){try{saved=JSON.parse(localStorage.getItem(saveKey(mode)));}catch{}}
 if(saved&&K.valid(saved.game)&&(saved.game.mode||'normal')===mode){
   return {game:saved.game,seconds:Number.isFinite(saved.seconds)?Math.max(0,Math.floor(saved.seconds)):0,started:!!saved.started,
     history:Array.isArray(saved.history)?saved.history.filter(g=>K.valid(g)&&(g.mode||'normal')===mode).slice(-100):[]};
 }
 return {game:K.create(1,Math.random,mode),seconds:0,started:false,history:[]};
}
function loadSession(mode){const s=readSession(mode);game=s.game;seconds=s.seconds;started=s.started;history=s.history;wonShown=K.win(game);lastTimer=Date.now();}
let initialMode='normal';try{if(localStorage.getItem(stateKey+'-mode')==='cheat')initialMode='cheat';}catch{}
loadSession(initialMode);
const label=c=>K.isJoker(c)?'ジョーカー '+c.rank:suitNames[c.suit]+' '+K.rankName(c.rank);
const src=c=>art[K.id(c)]||'assets/cards/'+K.id(c)+'.svg';
const backSrc=()=>art.back||'assets/back.png';
const formatTime=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
function say(message){$('#status').textContent=message;if(K.cheatMode(game))$('#cheat-guidance').textContent=message;}
function save(){const mode=game.mode||'normal',snapshot=clone({game,seconds,started,history});sessions[mode]=snapshot;
 try{localStorage.setItem(saveKey(mode),JSON.stringify(snapshot));localStorage.setItem(stateKey+'-mode',mode);}catch{if(!savingNotice){say('このブラウザでは進行を保存できません。ページを閉じるとリセットされます。');savingNotice=true;}}}
function switchMode(mode){
 if(mode===(game.mode||'normal'))return;
 clearDrag();skipClickUntil=0;save();loadSession(mode);savingNotice=false;finishAction(modeName(mode)+'に切り替えました。各モードの続きから遊べます。');
}
function armCheat(action){
 if(!K.cheatMode(game)||K.win(game))return;
 skipClickUntil=0;selected=null;hinted=null;cheatFirst=null;cheatAction=cheatAction===action?null:action;render();
 say(cheatAction==='destroy'?'破壊する表向きのカードを1枚選んでください。':cheatAction==='swap'?'入れ替える表向きのカードを2枚、順番に選んでください。':cheatAction==='joker'?'ジョーカーを追加する場札の列を選んでください。':'特殊機能の選択を解除しました。');
}
function useCheat(from,to){
 const next=clone(game),action=cheatAction;
 if(!K.cheat(next,action,from,to)){say('対象は場札の表向きカード、またはめくり札の一番上です。ジョーカーは場札へ追加できます。');return false;}
 remember();game=next;finishAction(action==='destroy'?'カードを破壊しました。通常カードはクリア済みとして数えます。':action==='swap'?'2枚のカードを入れ替えました。並びが崩れた場所は1枚ずつ整えられます。':'ジョーカーを追加しました。色・数字を無視して場札に重ねられます。');return true;
}
function cheatClick(from){
 if(cheatAction==='joker'){useCheat(null,{type:from.type,index:from.index});return;}
 if(!K.cheatTarget(game,from)){say('場札の表向きカードか、めくり札の一番上を選んでください。組札は対象外です。');return;}
 if(cheatAction==='destroy'){useCheat(from);return;}
 if(!cheatFirst){cheatFirst=from;render();say('次に、入れ替える相手のカードを選んでください。');return;}
 if(same(cheatFirst,from)){cheatFirst=null;render();say('1枚目の選択を解除しました。');return;}
 useCheat(cheatFirst,from);
}
function remember(){history.push(clone(game));if(history.length>100)history.shift();started=true;}
function same(a,b){return a&&b&&a.type===b.type&&a.index===b.index&&a.card===b.card;}
function finishAction(message){selected=null;hinted=null;cheatAction=null;cheatFirst=null;save();render();if(message)say(message);if(K.win(game)&&!wonShown){wonShown=true;$('#win-stats').textContent=formatTime(seconds)+' ・ '+game.moves+'手';$('#win-dialog').showModal();}}
function performMove(from,to){if(!K.canMove(game,from,to))return false;const card=K.pile(game,from)[from.card];remember();K.move(game,from,to);finishAction(label(card)+'を'+(to.type==='foundation'?'組札':'場札の'+(to.index+1)+'列目')+'へ移動しました。');return true;}
function draw(){if(cheatAction){say('特殊機能を解除してから山札をめくってください。');return;}if(!game.stock.length&&!game.waste.length){say('山札とめくり札は空です。');return;}const recycle=!game.stock.length;remember();K.draw(game);finishAction(recycle?'めくり札を山札に戻しました。':'山札をめくりました。');}
function undo(){if(!history.length)return;game=history.pop();wonShown=false;finishAction('1手戻しました。');}
function toFoundation(from){const c=K.movable(game,from)[0];return c&&performMove(from,{type:'foundation',index:K.suits.indexOf(c.suit)});}
function choose(from){
 if(cheatAction){cheatClick(from);return;}
 if(selected&&performMove(selected,{type:from.type,index:from.index}))return;
 if(same(selected,from)){if(!toFoundation(from)){selected=null;render();say('選択を解除しました。');}return;}
 if(!K.movable(game,from).length){say('このカードはまだ動かせません。');return;}
 selected=from;hinted=null;render();say(label(K.pile(game,from)[from.card])+'を選択。移動先をタップしてください。');
}
function destination(type,index){if(cheatAction){if(cheatAction==='joker')useCheat(null,{type,index});else say('対象の表向きカードを選んでください。');return;}if(selected){if(!performMove(selected,{type,index}))say('そこには置けません。場札は赤黒交互の降順、組札は同じマークの昇順です。');}else if(type==='foundation'){const rank=K.nextRank(game,index);say(rank<=13?'次は'+suitNames[K.suits[index]]+' '+K.rankName(rank)+'を置けます。':'この組札は完成しています。');}else say(K.cheatMode(game)?'空いた列にはKかジョーカーを置けます。':'空いた列にはKから始まるカードを置けます。');}
function button(text,cls,aria){const b=document.createElement('button');b.type='button';b.className=cls;b.setAttribute('aria-label',aria);if(text)b.textContent=text;return b;}
function cardElement(c,from,hidden=false){
 const b=button('', 'card'+(hidden?' back':''),hidden?'裏向きのカード':label(c));
 b.dataset.card=String(from.card);b.dataset.type=from.type;b.dataset.index=String(from.index);
 if(hidden&&cheatAction!=='joker')b.tabIndex=-1;
 if(!hidden&&K.isJoker(c)){b.classList.add('joker-card');b.innerHTML='<span class="joker-index">J ★</span><span class="joker-star">✦</span><span class="joker-title">JOKER</span>'; }else{
 const img=new Image();img.src=hidden?backSrc():src(c);img.alt='';img.draggable=false;
 img.onerror=()=>{img.remove();const f=document.createElement('span');f.className='fallback-index';f.textContent=hidden?'♠':K.rankName(c.rank)+symbols[c.suit];b.append(f);};b.append(img);
 }
 if(!hidden&&art[K.id(c)]){const tag=document.createElement('span');tag.className='custom-index'+(K.red(c)?' red':'');tag.innerHTML='<span>'+K.rankName(c.rank)+'</span><span>'+symbols[c.suit]+'</span>';b.append(tag);}
 if(cheatFirst&&same(cheatFirst,from))b.classList.add('cheat-picked');
 if(cheatAction&&((cheatAction==='joker'&&from.type==='tableau')||K.cheatTarget(game,from)))b.classList.add('cheat-target');
 if(selected&&from.type===selected.type&&from.index===selected.index&&from.card>=selected.card)b.classList.add('selected');
 if(hinted&&same(from,hinted.from))b.classList.add('hinted');
 if(hidden)b.addEventListener('click',()=>{if(cheatAction==='joker')cheatClick(from);else say('上のカードを動かすと、裏向きのカードがめくれます。');});
 else b.addEventListener('click',()=>choose(from));
 return b;
}
function slot(type,index,title){const el=document.createElement('div');el.className='slot';el.dataset.dest=type;el.dataset.index=index;const empty=button(title,'empty-slot',type==='foundation'?suitNames[K.suits[index]]+'の組札':'場札 '+(index+1)+'列目');empty.addEventListener('click',()=>destination(type,index));if(hinted&&hinted.to.type===type&&hinted.to.index===index)empty.classList.add('hinted');el.append(empty);return el;}
function addLabel(el,text){const s=document.createElement('span');s.className='pile-label';s.textContent=text;el.append(s);}
function render(){
 const focused=document.activeElement;const focusKey=board.contains(focused)?{type:focused.dataset.type,index:focused.dataset.index,card:focused.dataset.card}:null;
 board.replaceChildren();const top=document.createElement('div');top.className='top-row';
 const stock=document.createElement('div');stock.className='slot';const stockButton=button('',game.stock.length?'card back':'empty-slot stock-empty',game.stock.length?'山札を'+game.draw+'枚めくる':'めくり札を山札へ戻す');stockButton.dataset.stock='true';
 if(game.stock.length){const img=new Image();img.src=backSrc();img.alt='';img.draggable=false;stockButton.append(img);const n=document.createElement('span');n.className='stock-count';n.textContent=game.stock.length;stockButton.append(n);}else stockButton.textContent='↻';stockButton.addEventListener('click',draw);stock.append(stockButton);addLabel(stock,'山札');top.append(stock);
 const waste=document.createElement('div');waste.className='slot';waste.dataset.dest='waste';waste.dataset.index=0;
 const wempty=document.createElement('span');wempty.className='empty-slot';waste.append(wempty);
 const show=game.draw===3?Math.min(3,game.waste.length):Math.min(1,game.waste.length);
 for(let i=game.waste.length-show;i<game.waste.length;i++){const c=cardElement(game.waste[i],{type:'waste',index:0,card:i});const offset=i-(game.waste.length-show);c.style.transform='translateX('+offset*10+'%)';if(i!==game.waste.length-1){c.style.pointerEvents='none';c.tabIndex=-1;c.setAttribute('aria-hidden','true');}waste.append(c);}addLabel(waste,'めくり札');top.append(waste);top.append(document.createElement('div'));
 for(let i=0;i<4;i++){const el=slot('foundation',i,symbols[K.suits[i]]),p=game.foundations[i];if(p.length)el.append(cardElement(p[p.length-1],{type:'foundation',index:i,card:p.length-1}));top.append(el);}board.append(top);
 const row=document.createElement('div');row.className='tableau-row';const width=Math.max(34,(board.clientWidth-(innerWidth<=650?6:Math.min(20,innerWidth*.0165))*6)/7),height=width*1.4,upStep=Math.max(23,Math.min(34,width*.31)),downStep=Math.max(11,Math.min(17,width*.16));
 game.tableau.forEach((p,index)=>{const el=slot('tableau',index,'');el.classList.add('pile');el.style.aspectRatio='auto';let y=0;p.forEach((c,card)=>{const b=cardElement(c,{type:'tableau',index,card},!c.up);b.style.top=y+'px';el.append(b);if(card<p.length-1)y+=c.up?upStep:downStep;});el.style.height=y+height+'px';el.firstChild.style.height=height+'px';el.firstChild.style.bottom='auto';row.append(el);});board.append(row);
 $('#moves').textContent=game.moves;$('#complete').textContent=K.completed(game);$('#complete-label').textContent=K.cheatMode(game)?'達成':'組札';$('#time').textContent=formatTime(seconds);$('#undo').disabled=!history.length;$('#mode-label').textContent=game.draw+'枚めくり';
 const cheating=K.cheatMode(game);document.body.classList.toggle('cheat-mode',cheating);
 document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===(game.mode||'normal'))));
 $('#cheat-panel').hidden=!cheating;
 if(cheating){for(const action of ['destroy','swap','joker']){const b=$('[data-cheat="'+action+'"]');b.disabled=game.cheats[action]===0||K.win(game);b.setAttribute('aria-pressed',String(cheatAction===action));b.querySelector('strong').textContent=game.cheats[action];}
 $('#cheat-guidance').textContent=cheatAction==='swap'?(cheatFirst?'入れ替える2枚目のカードを選択。':'入れ替える1枚目のカードを選択。'):cheatAction==='destroy'?'破壊する表向きのカードを選択。':cheatAction==='joker'?'ジョーカーを追加する場札の列を選択。':'特殊機能のボタンを選んでください。';
 $('#cheat-cancel').hidden=!cheatAction;$('#cheat-info').textContent='破壊済み '+game.removed.filter(c=>!K.isJoker(c)).length+'枚 ／ 破壊・入れ替えは表向きのカードが対象。組札は対象外。';
 }
 if(focusKey?.type){const f=board.querySelector('[data-type="'+focusKey.type+'"][data-index="'+focusKey.index+'"][data-card="'+focusKey.card+'"]');f?.focus({preventScroll:true});}
}
function hint(){
 selected=null;cheatAction=null;cheatFirst=null;
 const choices=K.options(game).filter(o=>o.from.type!=='foundation').filter(o=>!(o.from.type==='tableau'&&o.from.card===0&&o.to.type==='tableau'&&game.tableau[o.to.index].length===0));
 choices.sort((a,b)=>{const score=o=>(o.to.type==='foundation'?4:0)+(o.from.type==='tableau'&&o.from.card>0&&!game.tableau[o.from.index][o.from.card-1].up?8:0);return score(b)-score(a);});
 if(choices.length){hinted=choices[0];render();const c=K.pile(game,hinted.from)[hinted.from.card];say(label(c)+'を'+(hinted.to.type==='foundation'?'組札':'場札の'+(hinted.to.index+1)+'列目')+'へ動かせます。');}
 else{hinted=null;render();say(game.stock.length?'山札をめくってみましょう。':game.waste.length?'山札を巡回できます。進めない場合は「戻す」か新しいゲームをお試しください。':'場札から動かせるカードがありません。「戻す」か新しいゲームをお試しください。');}
}
board.addEventListener('click',e=>{if(Date.now()<skipClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
board.addEventListener('pointerdown',e=>{
 if(e.button!==0||cheatAction)return;const b=e.target.closest('.card:not(.back)');if(!b)return;
 const from={type:b.dataset.type,index:Number(b.dataset.index),card:Number(b.dataset.card)};if(!K.movable(game,from).length)return;
 const r=b.getBoundingClientRect();pointer={id:e.pointerId,from,x:e.clientX,y:e.clientY,ox:e.clientX-r.left,oy:e.clientY-r.top,width:r.width,dragging:false};board.setPointerCapture(e.pointerId);
});
board.addEventListener('pointermove',e=>{
 if(!pointer||e.pointerId!==pointer.id)return;
 if(!pointer.dragging&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>7){pointer.dragging=true;ghost=document.createElement('div');ghost.className='ghost';ghost.style.width=pointer.width+'px';const cards=K.movable(game,pointer.from);cards.forEach((c,i)=>{const el=cardElement(c,{...pointer.from,card:pointer.from.card+i});el.style.top=i*Math.max(23,Math.min(34,pointer.width*.31))+'px';ghost.append(el);});document.body.append(ghost);document.body.classList.add('dragging');}
 if(pointer.dragging){e.preventDefault();ghost.style.left=e.clientX-pointer.ox+'px';ghost.style.top=e.clientY-pointer.oy+'px';}
});
function clearDrag(){ghost?.remove();ghost=null;pointer=null;document.body.classList.remove('dragging');}
board.addEventListener('pointerup',e=>{
 if(!pointer||e.pointerId!==pointer.id)return;const p=pointer;
 if(p.dragging){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-dest]');clearDrag();skipClickUntil=Date.now()+350;if(!target||!performMove(p.from,{type:target.dataset.dest,index:Number(target.dataset.index)}))say('そこには置けません。カードは元の位置に戻りました。');}
 else {clearDrag();skipClickUntil=Date.now()+350;choose(p.from);}
 if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);
});
board.addEventListener('pointercancel',()=>{skipClickUntil=Date.now()+350;clearDrag();});
board.addEventListener('lostpointercapture',()=>{if(pointer)clearDrag();});
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>switchMode(b.dataset.mode));
document.querySelectorAll('[data-cheat]').forEach(b=>b.onclick=()=>armCheat(b.dataset.cheat));
$('#cheat-cancel').onclick=()=>{cheatAction=null;cheatFirst=null;render();say('特殊機能を解除しました。');};
$('#undo').onclick=undo;$('#hint').onclick=hint;$('#rules').onclick=()=>$('#rules-dialog').showModal();
$('#new').onclick=()=>{$('#new-mode-name').textContent=modeName(game.mode||'normal');document.querySelector('input[name="draw"][value="'+game.draw+'"]').checked=true;$('#new-dialog').showModal();};
$('#start').onclick=()=>{game=K.create(Number($('input[name="draw"]:checked').value),Math.random,game.mode||'normal');history=[];seconds=0;started=false;wonShown=false;$('#new-dialog').close();finishAction('カードを配りました。山札か場札をタップして始めましょう。');};
$('#play-again').onclick=()=>{$('#win-dialog').close();$('#new').click();};
document.querySelectorAll('dialog .close').forEach(b=>b.onclick=()=>b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.addEventListener('keydown',e=>{if(document.querySelector('dialog[open]'))return;if(e.key==='Escape'){selected=null;hinted=null;cheatAction=null;cheatFirst=null;render();say('選択を解除しました。');}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo();}});
let resizeFrame;addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(()=>{if(!pointer)render();});});
setInterval(()=>{const now=Date.now(),elapsed=Math.floor((now-lastTimer)/1000);if(elapsed>0){lastTimer+=elapsed*1000;if(started&&!K.win(game)&&!document.hidden&&!document.querySelector('dialog[open]')){seconds+=elapsed;$('#time').textContent=formatTime(seconds);if(seconds%5===0)save();}}},1000);
document.addEventListener('visibilitychange',()=>{lastTimer=Date.now();if(document.hidden)save();});addEventListener('pagehide',save);
// Image imports stay in the browser; IndexedDB is used for larger card collections.
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open('solitaire-atelier-art',1);r.onupgradeneeded=()=>r.result.createObjectStore('images');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
function transaction(mode,fn){return new Promise((resolve,reject)=>{if(!db)return reject(new Error('画像を保存できません。ブラウザの保存設定をご確認ください。'));const t=db.transaction('images',mode);fn(t.objectStore('images'));t.oncomplete=resolve;t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error);});}
function preview(){const id=$('#face-select').value;$('#back-preview').src=backSrc();$('#face-preview').src=art[id]||'assets/cards/'+id+'.svg';}
K.suits.forEach(suit=>{for(let rank=1;rank<=13;rank++){const c={suit,rank},o=document.createElement('option');o.value=K.id(c);o.textContent=label(c);$('#face-select').append(o);}});
$('#face-select').onchange=preview;$('#appearance').onclick=()=>{preview();$('#settings-dialog').showModal();};
function normalize(file){return new Promise((resolve,reject)=>{
 if(!['image/png','image/jpeg','image/webp'].includes(file.type))return reject(new Error('PNG・JPEG・WebP形式の画像を選んでください。'));
 if(file.size>5*1024*1024)return reject(new Error('画像は1枚5MBまでです。'));
 const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{try{const scale=Math.min(1,1000/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('画像を読み込めませんでした。')),'image/png');}catch{reject(new Error('画像を読み込めませんでした。'));}finally{URL.revokeObjectURL(url);}};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('画像を読み込めませんでした。'));};img.src=url;
});}
function changeObjectURL(id,blob){if(art[id])URL.revokeObjectURL(art[id]);art[id]=URL.createObjectURL(blob);}
let importing=false;
async function importFiles(files,single){
 if(importing)return;importing=true;document.querySelectorAll('#settings-dialog input,#reset-art').forEach(e=>e.disabled=true);$('#image-status').textContent='画像を読み込んでいます…';
 try{const entries=[],skipped=[];for(const file of files){let id=single;if(!id){const match=file.name.match(/^([SHCD])_(A|0[2-9]|10|J|Q|K)\.(png|jpe?g|webp)$/i);if(!match){skipped.push(file.name);continue;}id=match[1].toUpperCase()+'_'+match[2].toUpperCase();}entries.push([id,await normalize(file)]);}
 if(!entries.length)throw new Error('対応するファイル名がありません。例：S_A.png、H_02.png');
 await transaction('readwrite',store=>entries.forEach(([id,blob])=>store.put(blob,id)));entries.forEach(([id,blob])=>changeObjectURL(id,blob));preview();render();$('#image-status').textContent=entries.length+'枚の画像を保存しました。'+(skipped.length?' ファイル名が合わない'+skipped.length+'枚は変更していません。':'');
 }catch(e){$('#image-status').textContent=e.message||'画像を保存できませんでした。端末の空き容量をご確認ください。';}
 finally{importing=false;document.querySelectorAll('#settings-dialog input,#reset-art').forEach(e=>e.disabled=false);}}
$('#back-file').onchange=async e=>{if(e.target.files.length)await importFiles([...e.target.files],'back');e.target.value='';};
$('#face-file').onchange=async e=>{if(e.target.files.length)await importFiles([...e.target.files],$('#face-select').value);e.target.value='';};
$('#faces-files').onchange=async e=>{if(e.target.files.length)await importFiles([...e.target.files]);e.target.value='';};
$('#reset-art').onclick=async()=>{if(!confirm('変更したカード画像を削除して、初期デザインに戻しますか？'))return;try{await transaction('readwrite',s=>s.clear());Object.values(art).forEach(URL.revokeObjectURL);art={};preview();render();$('#image-status').textContent='初期デザインに戻しました。';}catch{$('#image-status').textContent='初期化できませんでした。';}};
render();
openDB().then(async d=>{db=d;await transaction('readonly',store=>{const r=store.openCursor();r.onsuccess=()=>{const c=r.result;if(c){if(c.key==='back'||/^[SHCD]_(A|0[2-9]|10|J|Q|K)$/.test(c.key))changeObjectURL(c.key,c.value);c.continue();}};});render();}).catch(()=>{$('#image-status').textContent='このブラウザでは画像を保存できません。ゲームは初期画像で遊べます。';});
