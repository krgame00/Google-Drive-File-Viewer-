const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const viewerJs=fs.readFileSync(path.join(__dirname,'..','collection-viewer.js'),'utf8');

// ===== markup + wiring =====
assert(html.includes('id="recoBtn"')&&html.includes('แนะนำให้ดู'),'header recommend button exists');
assert(html.includes('id="recoCard" hidden'),'recommend card is hidden by default');
assert(html.includes('id="recoBody" aria-live="polite"'),'card body announces changes');
assert(html.includes('id="recoPlay" class="btn-primary" hidden'),'play-now button starts hidden');
assert(html.includes('id="recoReroll"')&&html.includes('เปลี่ยนอื่น'),'reroll button exists');
assert(html.includes('id="recoClose"')&&html.includes('aria-label="ปิดการ์ดแนะนำ"'),'card is closable');
assert(viewerJs.indexOf('if(recoBtn) recoBtn.addEventListener("click", recoRoll)')>=0,'header button wired to recoRoll');
assert(viewerJs.indexOf('if(recoRerollBtn) recoRerollBtn.addEventListener("click", recoRoll)')>=0,'reroll wired to recoRoll');
assert(viewerJs.indexOf('if(recoPlayBtn) recoPlayBtn.addEventListener("click", recoPlayCurrent)')>=0,'play button wired');
assert(viewerJs.indexOf('if(recoCloseBtn) recoCloseBtn.addEventListener("click", recoHide)')>=0,'close button wired');
assert(viewerJs.indexOf('gdv_reco_seen')>=0&&viewerJs.indexOf('gdv_reco_recent')>=0,'anti-repeat state persists');
assert(viewerJs.indexOf('appApi.authParams()')>=0,'listing follows the shared auth route (token or key)');
assert(viewerJs.indexOf('window.GDVVideoApi&&window.GDVVideoApi.video')>=0,'play-now opens via the video player bridge');
assert(viewerJs.indexOf("mimeType contains 'video/'")>=0,'listing queries only video files');

// ===== pure helpers =====
function extractFn(name){
  const start=viewerJs.indexOf('function '+name+'(');
  assert(start>=0,name+' exists');
  const end=viewerJs.indexOf('\n  }',start);
  return viewerJs.slice(start,end+4);
}
const rpStart=viewerJs.indexOf('function randomPick(');
assert(rpStart>=0,'randomPick exists');
const rpEnd=viewerJs.indexOf('\n  }',rpStart);
const rpCtx={};vm.createContext(rpCtx);vm.runInContext(viewerJs.slice(rpStart,rpEnd+4),rpCtx);
const randomPick=rpCtx.randomPick;

const escCtx={};vm.createContext(escCtx);vm.runInContext(extractFn('recoEsc'),escCtx);
assert.equal(escCtx.recoEsc('<b>"x"&\'y\'</b>'),'&lt;b&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/b&gt;','recoEsc escapes html specials');

const pickCollCtx={randomPick};vm.createContext(pickCollCtx);vm.runInContext(extractFn('recoPickCollection'),pickCollCtx);
const recoPickCollection=pickCollCtx.recoPickCollection;
const pool=[{id:'a'},{id:'b'},{id:'c'},{id:'d'}];
for(let i=0;i<500;i++){
  const p=recoPickCollection(pool,new Set(['a','b']),['d']);
  assert(p&&p.id==='c','skipped and avoided folders are excluded when an alternative exists');
}
assert.equal(recoPickCollection([],new Set(),[]),null,'empty catalog returns null');
assert.equal(recoPickCollection(null),null,'missing catalog returns null');
for(let i=0;i<200;i++){
  const p=recoPickCollection(pool,new Set(['a','b','c','d']),[]);
  assert(p&&pool.some(x=>x.id===p.id),'fully skipped pool still falls back to something');
}
for(let i=0;i<200;i++){
  const p=recoPickCollection([{id:'x'}],new Set(['x']),['x']);
  assert.equal(p.id,'x','single exhausted folder is still returned');
}

const pickVidCtx={randomPick};vm.createContext(pickVidCtx);vm.runInContext(extractFn('recoPickVideo'),pickVidCtx);
const recoPickVideo=pickVidCtx.recoPickVideo;
const vids=[{id:'v1'},{id:'v2'},{id:'v3'},{id:'v4'}];
for(let i=0;i<500;i++){
  const p=recoPickVideo(vids,new Set(['v1','v2']),['v3'],null);
  assert(p&&p.id==='v4','unseen-first avoids seen list and recent ids');
}
assert.equal(recoPickVideo([],new Set(),[],null),null,'empty folder returns null');
assert.equal(recoPickVideo(null),null,'missing folder returns null');
const seenSet=new Set(vids.map(v=>v.id));
const wrapped=recoPickVideo(vids,seenSet,[],null);
assert(wrapped,'all-seen pool wraps around instead of failing');
const wrapped2=recoPickVideo(vids,seenSet,['v1','v2','v3','v4'],null);
assert(wrapped2,'recent-covered pool still offers something');
assert(seenSet.size===0,'wrap-around clears the seen set so unseen-first restarts');
for(let i=0;i<200;i++){
  const p=recoPickVideo([{id:'only'}],new Set(['only']),['only'],'only');
  assert.equal(p.id,'only','single seen video is still offered');
}

// ===== end-to-end VM test of the reco block =====
const blockStart=viewerJs.indexOf('  var recoBtn=document.getElementById("recoBtn");');
const blockEnd=viewerJs.indexOf('  // ===== Reco end =====',blockStart);
assert(blockStart>=0&&blockEnd>blockStart,'reco block exists');

function el(props){
  const e=Object.assign({},props||{});
  e.addEventListener=function(ev,fn){ this['on'+ev]=fn; };
  return e;
}
function recoName(bodyHtml){
  const m=/class="reco-name">([^<]*)</.exec(bodyHtml);
  return m?m[1]:null;
}
function createRecoEnv(opts){
  opts=opts||{};
  const store=Object.assign({},opts.storage);
  const filesByFolder=opts.filesByFolder||{};
  const failStatus=opts.failStatus||null;
  const recoBtn=el(), reroll=el({disabled:false}), play=el({hidden:true,disabled:true}), close=el();
  const card=el({hidden:true}), body=el({innerHTML:''});
  const events=[];
  const urls=[];
  const env={
    document:{ getElementById(id){
      if(id==='recoBtn')return recoBtn;
      if(id==='recoCard')return card;
      if(id==='recoBody')return body;
      if(id==='recoPlay')return play;
      if(id==='recoReroll')return reroll;
      if(id==='recoClose')return close;
      return null;
    } },
    appApi:{
      lsGet:k=>(k in store?store[k]:null),
      lsSet:(k,v)=>{ store[k]=String(v); },
      showToast:m=>events.push({toast:m}),
      authParams:opts.authParams||(()=>({mode:'key'})),
      apiKey:'TESTKEY'
    },
    XBEP_COLLECTION:opts.catalog||[
      {id:'c1',title:'คลังหนึ่ง',dead:false},
      {id:'c2',title:'คลังสอง',dead:false},
      {id:'c3',title:'คลังตาย',dead:true}
    ],
    randomPick:opts.randomPick||randomPick,
    AbortController,
    fetch:async (url)=>{
      urls.push(url);
      if(failStatus) return {ok:false,status:failStatus,json:async()=>({error:{message:'boom'}})};
      const q=decodeURIComponent(url.split('q=')[1].split('&')[0]);
      const fid=q.slice(1,q.indexOf("'",1));
      return {ok:true,status:200,json:async()=>({files:filesByFolder[fid]||[]})};
    },
    window:{ GDVVideoApi:{ video:{ openVideo:(id,name)=>events.push({video:id,name}) } } }
  };
  env.window.GDVCollectionApi=env.appApi;
  vm.createContext(env);
  vm.runInContext('const appApi=window.GDVCollectionApi;\n'+viewerJs.slice(blockStart,blockEnd),env);
  return { env, store, urls, events,
    clickReco:()=>recoBtn.onclick(),
    reroll:()=>reroll.onclick(),
    clickPlay:()=>play.onclick(),
    clickClose:()=>close.onclick(),
    card, body, play, rerollBtn:reroll };
}

(async ()=>{

// 1. successful roll shows the pick; dead catalog entries are never listed
{
  const s=createRecoEnv({ filesByFolder:{ c1:[{id:'v1',name:'คลิปหนึ่ง'},{id:'v2',name:'คลิปสอง'}], c2:[{id:'v3',name:'คลิปสาม'}] } });
  await s.clickReco();
  assert.equal(s.card.hidden,false,'roll opens the card');
  assert(s.body.innerHTML.includes('จากคลัง'),'card names the source collection');
  assert(recoName(s.body.innerHTML),'card shows the picked video name');
  assert.equal(s.urls.length,1,'a successful roll lists exactly one collection');
  assert(s.urls[0].includes('c1')||s.urls[0].includes('c2'),'listing targets an alive collection');
  assert(decodeURIComponent(s.urls[0]).includes("mimeType contains 'video/'"),'listing filters to videos');
  assert(s.urls[0].includes('key=TESTKEY'),'key route appends the api key');
  assert.equal(s.play.hidden,false,'play-now is offered for the pick');
  const firstId=s.events.length;
  await s.clickPlay();
  assert.equal(s.events.length,firstId+1,'play-now opens exactly one video');
  assert(s.events.some(e=>e.video&&/v\d/.test(e.video)),'opened video is the picked one');
  assert.equal(s.card.hidden,true,'card closes after playing');
  assert(/"v\d"/.test(s.store.gdv_reco_seen),'played video is remembered in gdv_reco_seen');
  // reroll after playing lists a different collection (previous folder avoided on the first attempt)
  await s.clickReco();
  assert.equal(s.urls.length,2,'reroll lists another collection');
  assert.notEqual(recoName(s.body.innerHTML),null,'reroll offers a new suggestion');
}

// 2. reroll changes the suggestion to a different video
{
  const s=createRecoEnv({ filesByFolder:{ c1:[{id:'v1',name:'A'},{id:'v2',name:'B'}], c2:[{id:'v3',name:'C'}] } });
  await s.clickReco();
  const n1=recoName(s.body.innerHTML);
  await s.reroll();
  const n2=recoName(s.body.innerHTML);
  assert(n1&&n2,'both rolls produce suggestions');
  assert.notEqual(n1,n2,'reroll never shows the same video twice in a row');
}

// 3. empty folders are skipped within the same roll (deterministic first-pick)
{
  const s=createRecoEnv({ randomPick:(p)=>p[0], filesByFolder:{ c1:[], c2:[{id:'v3',name:'C'}] } });
  await s.clickReco();
  assert.equal(s.urls.length,2,'roll retries the next collection after an empty one');
  assert.equal(recoName(s.body.innerHTML),'C','eventually suggests from a folder that has videos');
}

// 4. repeated failures end in an error state with reroll re-enabled
{
  const s=createRecoEnv({ randomPick:(p)=>p[0], failStatus:500, filesByFolder:{} });
  await s.clickReco();
  assert(s.body.innerHTML.includes('สุ่มไม่สำเร็จ'),'failures render an error message');
  assert.equal(s.rerollBtn.disabled,false,'reroll stays available after failures');
  assert.equal(s.play.hidden,true,'no play button for a failed roll');
}

// 5. signed-out without key explains what is missing and never hits the network
{
  const s=createRecoEnv({ authParams:()=>({mode:'none'}) });
  await s.clickReco();
  assert.equal(s.urls.length,0,'need-auth rolls do not call the API');
  assert(s.body.innerHTML.includes('ลงชื่อเข้าใช้'),'need-auth message tells the user what to add');
}

// 6. a catalog with only dead entries reports it instead of fetching
{
  const s=createRecoEnv({ catalog:[{id:'d1',title:'ตาย',dead:true}] });
  await s.clickReco();
  assert.equal(s.urls.length,0,'dead-only catalog never fetches');
  assert(s.body.innerHTML.includes('ลองกดเปลี่ยนอื่น')||s.body.innerHTML.includes('ไม่มีคลัง'),'dead-only catalog reports no openable collection');
}

console.log('PASS recommend system');

})().catch((e)=>{ console.error(e); process.exit(1); });
