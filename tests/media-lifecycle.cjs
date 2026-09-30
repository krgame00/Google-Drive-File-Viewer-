const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
function fn(name){const start=html.indexOf('      function '+name+'(');assert(start>=0,name);const end=html.indexOf('\n      }',start);return html.slice(start,end+8);}
function setup(){let timers=new Map(),seq=0;const els={};const el=id=>els[id]||(els[id]={style:{},textContent:'',hidden:true,classList:{add(){},remove(){},contains(){return false}},setAttribute(){},removeAttribute(){},pause(){},load(){},play(){return Promise.resolve()},src:''});const ctx={document:{body:{style:{overflow:'hidden'}},getElementById:id=>el(id)},lightbox:el('lightbox'),videoModal:el('videoModal'),vidPlayer:el('vidPlayer'),vidFrame:el('vidFrame'),vidLoading:el('vidLoading'),vidLoadingText:el('vidLoadingText'),currentVideoUrl:null,currentDocUrl:null,vidCurrentId:'old',videoResumePos:0,URL,accessToken:null,setTimeout(cb){timers.set(++seq,cb);return seq},clearTimeout(id){timers.delete(id)},revokeCurrentDoc(){},revokeCurrentVideo(){},saveVideoPos(){},renderContinueWatching(){},videoAttempt:0,mediaSession:0,videoAttemptTimer:null,videoSlowTimer:null,mediaPreviousOverflow:'',console};vm.createContext(ctx);for(const name of ['classifyApiError','cancelVideoAttempt','setVideoStatus','resetMediaPlayback'])if(html.includes('function '+name+'('))vm.runInContext(fn(name),ctx);vm.runInContext(fn('tryVideoSrc'),ctx);vm.runInContext(fn('closeVideo'),ctx);vm.runInContext(fn('showStreamFailure'),ctx);vm.runInContext(fn('handleDriveStreamError'),ctx);return {ctx,timers,els};}
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
  vm.runInContext(fn('setVideoStatus'),ctx);
  vm.runInContext(fn('fallbackIframe'),ctx);
  ctx.fallbackIframe('old');
  assert.deepEqual(steps,['pause','remove:src','load']);
  assert.equal(ctx.vidPlayer.style.display,'none');
  assert.equal(ctx.vidFrame.style.display,'block');
  assert.equal(ctx.vidFrame.src,'https://drive.google.com/file/d/old/preview');
});
test('authenticated startup timeout is configurable and reports timeout once',()=>{
  const {ctx,timers}=setup();const delays=[];let reason,calls=0;
  const schedule=ctx.setTimeout;
  ctx.setTimeout=(cb,ms)=>{delays.push(ms);return schedule(cb)};
  ctx.tryVideoSrc('stream',value=>{reason=value;calls++},60000);
  assert.ok(delays.includes(60000),'60s ceiling is passed through');
  const timeout=[...timers.values()][0];timeout();timeout();
  assert.equal(reason,'timeout');assert.equal(calls,1);
});
test('stream failure unloads playback and preserves specific Google error',()=>{
  for(const hidden of [true,false]) {
    const {ctx}=setup();const steps=[];
    const status={hidden,textContent:'Google quota error'};
    ctx.document.getElementById=()=>status;
    ctx.vidPlayer.pause=()=>steps.push('pause');
    ctx.vidPlayer.removeAttribute=name=>steps.push('remove:'+name);
    ctx.vidPlayer.load=()=>steps.push('load');
    vm.runInContext(fn('showStreamFailure'),ctx);
    ctx.showStreamFailure('Startup timed out');
    assert.deepEqual(steps,['pause','remove:src','load']);
    assert.equal(ctx.vidPlayer.style.display,'none');
    assert.equal(status.hidden,false);
    assert.equal(status.textContent,hidden?'Startup timed out':'Google quota error');
  }
});
test('status machine flows connecting → loading → playing and closed clears error',()=>{
  const {ctx,els}=setup();
  ctx.setVideoStatus('connecting','กำลังเตรียมวิดีโอ…');
  assert.equal(ctx.videoStatus,'connecting');
  assert.equal(els.vidLoadingText.textContent,'กำลังเตรียมวิดีโอ…');
  assert.equal(els.vidErrorStatus.hidden,true);
  ctx.setVideoStatus('loading');
  ctx.setVideoStatus('playing');
  assert.equal(ctx.videoStatus,'playing');
  assert.equal(els.vidErrorStatus.hidden,true);
  ctx.setVideoStatus('error','เกิดข้อผิดพลาด');
  assert.equal(els.vidErrorStatus.hidden,false);
  assert.equal(els.vidErrorStatus.textContent,'เกิดข้อผิดพลาด');
  ctx.closeVideo();
  assert.equal(ctx.videoStatus,'closed');
  assert.equal(els.vidErrorStatus.hidden,true);
});
test('stale stream errors from an old attempt cannot override a retry',()=>{
  const {ctx,els}=setup();
  ctx.vidCurrentId='fileA';ctx.videoModal.classList.contains=()=>true;ctx.videoAttempt=2;ctx.accessToken='t';
  ctx.setVideoStatus('loading');
  assert.equal(ctx.handleDriveStreamError({type:'drive-stream-error',id:'fileA',attempt:1,status:403,reason:'insufficientFilePermissions'}),false);
  assert.equal(els.vidErrorStatus.hidden,true,'old attempt must not surface');
  assert.equal(ctx.handleDriveStreamError({type:'drive-stream-error',id:'fileA',attempt:2,status:403,reason:'insufficientFilePermissions'}),true);
  assert.equal(els.vidErrorStatus.hidden,false);
  assert.match(els.vidErrorStatus.textContent,/สิทธิ์/);
});
test('stream errors for another file are ignored',()=>{
  const {ctx,els}=setup();
  ctx.vidCurrentId='fileA';ctx.videoModal.classList.contains=()=>true;ctx.videoAttempt=0;ctx.accessToken='t';
  ctx.setVideoStatus('loading');
  assert.equal(ctx.handleDriveStreamError({type:'drive-stream-error',id:'fileB',attempt:0,status:403,reason:''}),false);
  assert.equal(els.vidErrorStatus.hidden,true);
});
test('worker error without attempt token still applies (older service worker)',()=>{
  const {ctx,els}=setup();
  ctx.vidCurrentId='fileA';ctx.videoModal.classList.contains=()=>true;ctx.videoAttempt=5;ctx.accessToken='t';
  assert.equal(ctx.handleDriveStreamError({type:'drive-stream-error',id:'fileA',status:429,reason:'rateLimitExceeded'}),true);
  assert.match(els.vidErrorStatus.textContent,/ชั่วคราว|ภายหลัง/);
});
test('slow-load hint uses a 15s timer while the ceiling stays configurable',()=>{
  const {ctx,timers,els}=setup();const delays=[];const schedule=ctx.setTimeout;
  ctx.setTimeout=(cb,ms)=>{delays.push(ms);return schedule(cb)};
  let failed=0;
  ctx.tryVideoSrc('stream',()=>failed++,60000);
  assert.ok(delays.includes(15000),'15s slow hint scheduled');
  assert.ok(delays.includes(60000),'60s ceiling respected');
  const scheduled=[...timers.values()];
  scheduled[1]();
  assert.match(els.vidLoadingText.textContent,/นาน/);
  assert.equal(failed,0,'hint alone must not fail the attempt');
  scheduled[0]();scheduled[0]();
  assert.equal(failed,1,'ceiling reports timeout exactly once');
});
test('stream request carries the attempt token for worker error matching',()=>{
  const {ctx}=setup();
  const url=new URL('https://example.com/app/__drive_stream?id=fileA');
  ctx.tryVideoSrc(url,()=>{});
  assert.equal(url.searchParams.get('attempt'),String(ctx.videoAttempt));
});
test('media error message stays hedged and never claims quota',()=>{
  const m=html.match(/showStreamFailure\(reason === 'timeout'\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\)/);
  assert(m,'media failure message found');
  assert(!/โควตา|quota/i.test(m[2]),'media error must not claim quota');
  assert(/อาจ|หรือ/.test(m[2]),'media error stays hedged');
});
process.exitCode=failures?1:0;
