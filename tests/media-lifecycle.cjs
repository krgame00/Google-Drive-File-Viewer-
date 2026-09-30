const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
function fn(name){const start=html.indexOf('      function '+name+'(');assert(start>=0,name);const end=html.indexOf('\n      }',start);return html.slice(start,end+8);}
function setup(){let timers=new Map(),seq=0;const el=()=>({style:{},classList:{add(){},remove(){},contains(){return false}},setAttribute(){},removeAttribute(){},pause(){},load(){},play(){return Promise.resolve()},src:''});const ctx={document:{body:{style:{overflow:'hidden'}}},lightbox:el(),videoModal:el(),vidPlayer:el(),vidFrame:el(),vidLoading:el(),currentVideoUrl:null,currentDocUrl:null,vidCurrentId:'old',videoResumePos:0,URL:{revokeObjectURL(){}},setTimeout(cb){timers.set(++seq,cb);return seq},clearTimeout(id){timers.delete(id)},revokeCurrentDoc(){},revokeCurrentVideo(){},saveVideoPos(){},renderContinueWatching(){},videoAttempt:0,mediaSession:0,videoAttemptTimer:null,mediaPreviousOverflow:'',console};vm.createContext(ctx);for(const name of ['cancelVideoAttempt','resetMediaPlayback'])if(html.includes('function '+name+'('))vm.runInContext(fn(name),ctx);vm.runInContext(fn('tryVideoSrc'),ctx);vm.runInContext(fn('closeVideo'),ctx);return {ctx,timers};}
let failures=0;function test(name,run){try{run();console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}}
test('closing restores page scrolling',()=>{let {ctx}=setup();ctx.closeVideo();assert.equal(ctx.document.body.style.overflow,'')});
test('closed player cannot trigger delayed fallback',()=>{let {ctx,timers}=setup(),fallbacks=0;ctx.tryVideoSrc('old',()=>fallbacks++);ctx.closeVideo();for(const cb of [...timers.values()])cb();assert.equal(fallbacks,0)});
test('new source cancels previous source fallback',()=>{let {ctx,timers}=setup(),oldFallbacks=0;ctx.tryVideoSrc('old',()=>oldFallbacks++);ctx.tryVideoSrc('new',()=>{});for(const cb of [...timers.values()])cb();assert.equal(oldFallbacks,0)});
test('queued event from previous source cannot start playback',()=>{let {ctx}=setup(),plays=0;ctx.vidPlayer.play=()=>{plays++;return Promise.resolve()};ctx.tryVideoSrc('old',()=>{});const oldReady=ctx.vidPlayer.oncanplay;ctx.tryVideoSrc('new',()=>{});oldReady();assert.equal(plays,0)});
test('save position before clearing media source',()=>{const {ctx}=setup();let saved=false;ctx.saveVideoPos=()=>{saved=true};ctx.vidPlayer.removeAttribute=()=>assert.equal(saved,true);ctx.resetMediaPlayback();assert.equal(saved,true)});
test('Drive fallback unloads native player before showing iframe',()=>{
  const {ctx}=setup();const steps=[];
  ctx.videoModal.classList.contains=()=>true;
  ctx.vidPlayer.pause=()=>steps.push('pause');
  ctx.vidPlayer.removeAttribute=name=>steps.push('remove:'+name);
  ctx.vidPlayer.load=()=>steps.push('load');
  vm.runInContext(fn('fallbackIframe'),ctx);
  ctx.fallbackIframe('old');
  assert.deepEqual(steps,['pause','remove:src','load']);
  assert.equal(ctx.vidPlayer.style.display,'none');
  assert.equal(ctx.vidFrame.style.display,'block');
  assert.equal(ctx.vidFrame.src,'https://drive.google.com/file/d/old/preview');
});
process.exitCode=failures?1:0;
