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
  ctx.window={matchMedia:()=>({matches:true})};
  vm.runInContext(fn('configurePreviewFullscreen'),ctx);
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
test('closing an app fullscreen player exits fullscreen and restores scrolling',()=>{
  const {ctx}=setup();let exited=0;
  ctx.document.fullscreenElement={};ctx.videoModal.contains=()=>true;
  ctx.document.exitFullscreen=()=>{exited++;return Promise.resolve()};
  ctx.closeVideo();
  assert.equal(exited,1);assert.equal(ctx.document.body.style.overflow,'');
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
  const m=html.match(/showStreamFailure\(reason === 'timeout'\s*\?\s*'([^']*)'\s*:\s*'([^']*)'/);
  assert(m,'media failure message found');
  assert(!/โควตา|quota/i.test(m[2]),'media error must not claim quota');
  assert(/อาจ|หรือ/.test(m[2]),'media error stays hedged');
});
test('media failure captures numeric diagnostics before unloading video',()=>{
  const {ctx}=setup();let diagnostic;
  ctx.vidPlayer.error={code:4,message:'private url'};
  ctx.vidPlayer.networkState=3;ctx.vidPlayer.readyState=0;
  ctx.tryVideoSrc('stream',(reason,details)=>{assert.equal(reason,'media');diagnostic=details});
  ctx.vidPlayer.onerror();
  assert.equal(diagnostic,'M4/N3/R0');
});
test('fetch failure is distinguished from a Google server response',()=>{
  const {ctx,els}=setup();ctx.videoModal.classList.contains=()=>true;
  ctx.handleDriveStreamError({type:'drive-stream-error',id:'old',attempt:0,status:502,reason:'streamFetchFailed'});
  assert.match(els.vidErrorStatus.textContent,/FETCH/);
  assert(!els.vidErrorStatus.textContent.includes('Google Drive ขัดข้อง'));
});
test('late worker error for the failed source is retained but a retry invalidates it',()=>{
  const {ctx,els}=setup();ctx.videoModal.classList.contains=()=>true;ctx.accessToken='token';
  ctx.tryVideoSrc('stream',(reason,diagnostic)=>ctx.showStreamFailure('Media failure',diagnostic));
  const failedAttempt=ctx.videoAttempt;
  ctx.vidPlayer.onerror();
  assert.equal(ctx.handleDriveStreamError({type:'drive-stream-error',id:'old',attempt:failedAttempt,status:401}),true);
  assert.match(els.vidErrorStatus.textContent,/เซสชัน/);
  ctx.tryVideoSrc('retry',()=>{});
  assert.equal(ctx.handleDriveStreamError({type:'drive-stream-error',id:'old',attempt:failedAttempt,status:403}),false);
  assert.equal(els.vidErrorStatus.hidden,true);
});
test('public sources clear account-stream CORS mode before setting src',()=>{
  const {ctx}=setup();const steps=[];
  ctx.vidPlayer.removeAttribute=name=>steps.push('remove:'+name);
  ctx.tryVideoSrc=url=>steps.push('source:'+url);
  vm.runInContext(fn('tryPublicStream'),ctx);
  ctx.tryPublicStream('file1');
  assert.equal(steps[0],'remove:crossorigin');
  assert.match(steps[1],/^source:https:/);
});
process.exitCode=failures?1:0;
test('blob fallback plays the full file through the page fetch (Brave workaround)',async()=>{
  const {ctx,els}=setup();
  ctx.vidCurrentId='fileA';ctx.videoModal.classList.contains=()=>true;ctx.accessToken='t';
  ctx.authParams=()=>({mode:'bearer'});
  ctx.fetch=async()=>({ok:true,blob:async()=>'BLOB'});
  ctx.URL={createObjectURL:()=>'blob:loaded',revokeObjectURL(){}};
  vm.runInContext(fn('loadVideoAsBlob'),ctx);
  await ctx.loadVideoAsBlob('fileA');
  await new Promise(r=>setTimeout(r,20));
  assert.match(String(els.vidPlayer.src),/^blob:loaded/,'video plays from the page-fetched blob');
  assert.match(els.vidLoadingText.textContent,/ทั้งไฟล์/,'status explains full-file loading');
});
test('blob fallback button exists in the video help actions',()=>{
  assert(html.includes('id="vidBlob"'),'vidBlob button present');
  assert(html.includes("getElementById('vidBlob').addEventListener"),'vidBlob is wired');
});
process.exitCode=failures?1:0;
