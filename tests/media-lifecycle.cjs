const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8');
function fn(name){const start=html.indexOf('      function '+name+'(');assert(start>=0,name);const end=html.indexOf('\n      }',start);return html.slice(start,end+8);}
function setup(){let timers=new Map(),seq=0;const els={};const el=id=>els[id]||(els[id]={style:{setProperty(k,v){this[k]=v}},textContent:'',hidden:true,classList:{add(){},remove(){},contains(){return false}},setAttribute(){},getAttribute(){return null},removeAttribute(){},pause(){},load(){},play(){return Promise.resolve()},src:''});const ctx={apiKey:"",preferredPlaybackRoute:()=>null,probePublicStreamError:async()=>null,AbortController,Blob,videoBlobTransfer:null,document:{body:{style:{overflow:'hidden'}},getElementById:id=>el(id)},lightbox:el('lightbox'),videoModal:el('videoModal'),vidPlayer:el('vidPlayer'),vidFrame:el('vidFrame'),vidLoading:el('vidLoading'),vidLoadingText:el('vidLoadingText'),currentVideoUrl:null,currentDocUrl:null,vidCurrentId:'old',videoResumePos:0,URL,accessToken:null,videoStatus:'closed',setTimeout(cb){timers.set(++seq,cb);return seq},clearTimeout(id){timers.delete(id)},revokeCurrentDoc(){},revokeCurrentVideo(){},saveVideoPos(){},renderContinueWatching(){},videoAttempt:0,mediaSession:0,videoAttemptTimer:null,videoSlowTimer:null,previewAspect:null,fitVideoPreview:()=>{},mediaPreviousOverflow:'',console};vm.createContext(ctx);for(const name of ['formatSize','readVideoBlobResponse','renderVideoBlobProgress','cancelVideoBlobTransfer','getPlayerAspect','releasePlayerOrientation','lockHorizontalPlayerOrientation','applyVideoAspect','applyNativeVideoAspect','classifyApiError','calculatePreviewLayout','cancelVideoAttempt','setVideoStatus','resetMediaPlayback','streamBlocked','rememberStreamBlocked','clearStreamBlocked','deviceCodecSupport','describeCodecSupport'])if(html.includes('function '+name+'('))vm.runInContext(fn(name),ctx);vm.runInContext(fn('tryVideoSrc'),ctx);vm.runInContext(fn('closeVideo'),ctx);vm.runInContext(fn('showStreamFailure'),ctx);vm.runInContext(fn('handleDriveStreamError'),ctx);return {ctx,timers,els};}
let failures=0,pending=[];function test(name,run){try{const r=run();if(r&&r.then){pending.push(r.then(()=>console.log('PASS',name)).catch(e=>{failures++;console.error('FAIL',name,e.message)}))}else console.log('PASS',name)}catch(e){failures++;console.error('FAIL',name,e.message)}}
test('range diagnostics show validated categories and reject injected diagnostic values',()=>{
 const {ctx,els}=setup();ctx.videoModal.classList.contains=()=>true;
 ctx.handleDriveStreamError({type:'drive-stream-error',id:'old',status:502,reason:'streamRangeUnsupported',rangeFailure:'status',upstreamStatus:200});
 assert.match(els.vidErrorStatus.textContent,/RANGE\/status\/HTTP200/);
 ctx.handleDriveStreamError({type:'drive-stream-error',id:'old',status:502,reason:'streamRangeUnsupported',rangeFailure:'private-token',upstreamStatus:'private-token'});
 assert(!els.vidErrorStatus.textContent.includes('private-token'));
});
test('closing restores page scrolling',()=>{let {ctx}=setup();ctx.closeVideo();assert.equal(ctx.document.body.style.overflow,'')});
test('closed player cannot trigger delayed fallback',()=>{let {ctx,timers}=setup(),fallbacks=0;ctx.tryVideoSrc('old',()=>fallbacks++);ctx.closeVideo();for(const cb of [...timers.values()])cb();assert.equal(fallbacks,0)});
test('new source cancels previous source fallback',()=>{let {ctx,timers}=setup(),oldFallbacks=0;ctx.tryVideoSrc('old',()=>oldFallbacks++);ctx.tryVideoSrc('new',()=>{});for(const cb of [...timers.values()])cb();assert.equal(oldFallbacks,0)});
test('queued event from previous source cannot start playback',()=>{let {ctx}=setup(),plays=0;ctx.vidPlayer.play=()=>{plays++;return Promise.resolve()};ctx.tryVideoSrc('old',()=>{});const oldReady=ctx.vidPlayer.oncanplay;ctx.tryVideoSrc('new',()=>{});oldReady();assert.equal(plays,0)});
test('native metadata changes aspect and stale metadata cannot change the next source',()=>{
  const {ctx}=setup();ctx.videoModal.classList.contains=()=>true;
  ctx.vidFrame.parentElement={style:{}};ctx.vidPlayer.style.display='block';
  ctx.tryVideoSrc('old',()=>{});const oldMetadata=ctx.vidPlayer.onloadedmetadata;
  ctx.tryVideoSrc('new',()=>{});ctx.vidPlayer.videoWidth=1080;ctx.vidPlayer.videoHeight=1920;
  oldMetadata();assert.equal(ctx.vidFrame.parentElement.style.aspectRatio,'');
  ctx.vidPlayer.onloadedmetadata();assert.equal(ctx.vidFrame.parentElement.style.aspectRatio,'0.5625');
  ctx.closeVideo();assert.equal(ctx.vidPlayer.playerAspect,null);assert.equal(ctx.vidPlayer.onloadedmetadata,null);
});
test('canplay sizes native video even if loadedmetadata was missed',()=>{
  const {ctx}=setup();ctx.videoModal.classList.contains=()=>true;ctx.vidFrame.parentElement={style:{}};ctx.vidPlayer.style.display='block';
  ctx.tryVideoSrc('new',()=>{});ctx.vidPlayer.videoWidth=1920;ctx.vidPlayer.videoHeight=1080;
  ctx.vidPlayer.oncanplay();assert.equal(Number(ctx.vidFrame.parentElement.style.aspectRatio),16/9);
});
test('resetting media releases an owned orientation lock while keeping fullscreen open',()=>{
  const {ctx}=setup();const box={playerOrientationLocked:true};let unlocks=0;
  ctx.videoModal.querySelector=()=>box;ctx.document.fullscreenElement=box;
  ctx.window={screen:{orientation:{unlock:()=>unlocks++}}};ctx.vidPlayer.playerAspect=16/9;
  ctx.resetMediaPlayback();assert.equal(unlocks,1);assert.equal(box.playerOrientationLocked,false);
  assert.equal(ctx.document.fullscreenElement,box);assert.equal(ctx.vidPlayer.playerAspect,null);
});
test('save position before clearing media source',()=>{const {ctx}=setup();let saved=false;ctx.saveVideoPos=()=>{saved=true};ctx.vidPlayer.removeAttribute=()=>assert.equal(saved,true);ctx.resetMediaPlayback();assert.equal(saved,true)});
test('Drive fallback unloads native player before showing iframe',()=>{
  const {ctx}=setup();const steps=[];
  ctx.window={matchMedia:()=>({matches:true})};
  ctx.fitVideoPreview=()=>{};
  ctx.vidFrame.parentElement={style:{},getBoundingClientRect:()=>({width:345,height:194})};
  ctx.authParams=()=>({mode:'none'});
  vm.runInContext(fn('configurePreviewFullscreen'),ctx);
  vm.runInContext(fn('applyPreviewAspect'),ctx);
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
    const status={hidden,textContent:'Google quota error',setAttribute(){}};
    const getElement=ctx.document.getElementById;
    ctx.document.getElementById=id=>id==='vidErrorStatus'?status:getElement(id);
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
  const m=html.match(/const MEDIA_STREAM_FAIL_MSG = '([^']*)'/);
  assert(m,'media failure message constant found');
  assert(!/โควตา|quota/i.test(m[1]),'media error must not claim quota');
  assert(/อาจ|หรือ/.test(m[1]),'media error stays hedged');
  assert(/showStreamFailure\(reason === 'timeout'[\s\S]{0,200}: MEDIA_STREAM_FAIL_MSG, diagnostic\)/.test(html),'media failure uses the shared message');
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
  ctx.vidCurrentId='file1';ctx.videoModal.classList.contains=()=>true;ctx.tryPublicStream('file1');
  assert.equal(steps[0],'remove:crossorigin');
  assert.match(steps[1],/^source:https:/);
});
test('reset clears preview scaling mode before another video or document',()=>{
  const {ctx}=setup();const removed=[];
  ctx.vidFrame.removeAttribute=name=>removed.push(name);
  ctx.resetMediaPlayback();
  assert(removed.includes('data-video-preview'));
});

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
test('closing cancels a whole-file download and ignores its late completion',async()=>{
  const {ctx,els}=setup();let finish,plays=0;ctx.vidCurrentId='fileA';ctx.videoModal.classList.contains=()=>true;
  ctx.authParams=()=>({mode:'bearer'});ctx.fetch=()=>new Promise(resolve=>finish=resolve);
  ctx.URL={createObjectURL(){plays++;return 'blob:late'},revokeObjectURL(){}};
  vm.runInContext(fn('loadVideoAsBlob'),ctx);const load=ctx.loadVideoAsBlob('fileA');
  const transfer=ctx.videoBlobTransfer;ctx.closeVideo();assert.equal(transfer.controller.signal.aborted,true);
  finish({ok:true,blob:async()=>new Blob(['video'])});await load;assert.equal(plays,0);assert.equal(els.vidCancelBlob.hidden,true);
});
test('compact mobile details retain the full title and preview note without hiding real errors',()=>{
  const {ctx,els}=setup();ctx.document.getElementById('vidTitle').textContent='ชื่อวิดีโอยาว.mp4';
  ctx.setVideoStatus('preview','ข้อมูลบัญชี Google');assert.equal(els.vidFullTitle.textContent,'ชื่อวิดีโอยาว.mp4');
  assert.equal(els.vidPreviewNote.hidden,false);assert.equal(els.vidPreviewNote.textContent,'ข้อมูลบัญชี Google');
  ctx.setVideoStatus('error','โหลดไม่ได้');assert.equal(els.vidErrorStatus.hidden,false);assert.equal(els.vidPreviewNote.hidden,true);
});

test('preview frame matches the video aspect ratio from Drive metadata',async()=>{
  const {ctx,els}=setup();
  ctx.vidCurrentId='fileA';ctx.videoModal.classList.contains=()=>true;ctx.accessToken='t';
  ctx.authParams=()=>({mode:'bearer'});
  ctx.vidFrame.parentElement={style:{},getBoundingClientRect:()=>({width:345,height:194})};
  ctx.vidFrame.getAttribute=()=> 'true';
  ctx.vidFrame.parentElement.getBoundingClientRect=()=>({width:345,height:194});
  ctx.fetch=async()=>({ok:true,json:async()=>({videoMediaMetadata:{width:1080,height:1920}})});
  vm.runInContext(fn('clampPreviewAspect'),ctx);
  vm.runInContext(fn('fitVideoPreview'),ctx);
  vm.runInContext(fn('applyPreviewAspect'),ctx);
  await ctx.applyPreviewAspect('fileA');
  await new Promise(r=>setTimeout(r,10));
  assert.equal(els.vidFrame.parentElement.style.aspectRatio,'0.5625','portrait video gets a portrait frame');
});
test('preview aspect ratio clamped to sane bounds',()=>{
  const {ctx}=setup();
  vm.runInContext(fn('clampPreviewAspect'),ctx);
  assert.ok(Math.abs(ctx.clampPreviewAspect(1920,1080)-16/9)<1e-9,'landscape 16:9 unchanged');
  assert.equal(ctx.clampPreviewAspect(100,1000),0.45,'สูงมากเกิน → จำกัด');
  assert.equal(ctx.clampPreviewAspect(2000,500),2.2,'กว้างมากเกิน → จำกัด');
  assert.ok(Math.abs(ctx.clampPreviewAspect(0,0)-16/9)<1e-9,'ไม่มีข้อมูล → 16:9');
});
test('preview aspect wired in fallbackIframe and reset with the session',()=>{
  assert(/function fallbackIframe[\s\S]{0,700}applyPreviewAspect\(id\)/.test(html),'fallbackIframe applies preview aspect');
  assert(/function resetMediaPlayback\(\)\s*\{[\s\S]{0,600}previewAspect = null/.test(html),'resetMediaPlayback clears preview aspect');
});

function makeStore(){const map={};return {getItem(k){return k in map?map[k]:null},setItem(k,v){map[k]=String(v)},removeItem(k){delete map[k]}};}

test('error status auto-expands the help panel and playing collapses it',()=>{
  const {ctx,els}=setup();
  ctx.setVideoStatus('error','เล่นไม่สำเร็จ');
  assert.equal(els.vidHelp.open,true,'error must open the help panel');
  ctx.setVideoStatus('playing');
  assert.equal(els.vidHelp.open,false,'playback must collapse the help panel');
  ctx.setVideoStatus('error','ล้มอีกครั้ง');
  assert.equal(els.vidHelp.open,true,'a fresh error re-opens the panel');
  ctx.setVideoStatus('error','ซ้ำ');
  assert.equal(els.vidHelp.open,true,'repeated error keeps the user toggle untouched');
});
test('stream block verdict distinguishes a browser block from Google responses',()=>{
  const {ctx}=setup();
  vm.runInContext(fn('streamBlockVerdict'),ctx);
  assert.equal(ctx.streamBlockVerdict(206),'works');
  assert.equal(ctx.streamBlockVerdict(200),'works');
  assert.equal(ctx.streamBlockVerdict(401),'auth');
  assert.equal(ctx.streamBlockVerdict(403),'auth');
  assert.equal(ctx.streamBlockVerdict(404),'auth');
  assert.equal(ctx.streamBlockVerdict(429),'auth');
  assert.equal(ctx.streamBlockVerdict(502),'browser');
  assert.equal(ctx.streamBlockVerdict(500),'browser');
});
test('stream-block flag round-trips through sessionStorage',()=>{
  const {ctx}=setup();
  ctx.sessionStorage=makeStore();
  vm.runInContext(fn('streamBlocked'),ctx);
  vm.runInContext(fn('rememberStreamBlocked'),ctx);
  vm.runInContext(fn('clearStreamBlocked'),ctx);
  assert.equal(ctx.streamBlocked(),false);
  ctx.rememberStreamBlocked();
  assert.equal(ctx.streamBlocked(),true);
  ctx.clearStreamBlocked();
  assert.equal(ctx.streamBlocked(),false);
});
test('failed transport probe never disables playback for the session',async()=>{
  const {ctx}=setup();
  ctx.sessionStorage=makeStore();
  ctx.location={href:'https://x.test/app/'};
  ctx.fetch=async()=>({status:502});
  vm.runInContext(fn('streamBlockVerdict'),ctx);
  vm.runInContext(fn('shouldRememberStreamBlock'),ctx);
  vm.runInContext(fn('rememberStreamBlocked'),ctx);
  vm.runInContext(fn('streamBlocked'),ctx);
  vm.runInContext(fn('probeStreamEndpoint'),ctx);
  const verdict=await ctx.probeStreamEndpoint('fileA','probe');
  assert.equal(verdict,'browser');
  if (ctx.shouldRememberStreamBlock(verdict)) ctx.rememberStreamBlocked();
  assert.equal(ctx.streamBlocked(),false);
});
test('probe with a Google permission answer never blocks the session',async()=>{
  const {ctx}=setup();
  ctx.sessionStorage=makeStore();
  ctx.location={href:'https://x.test/app/'};
  ctx.fetch=async()=>({status:403});
  vm.runInContext(fn('streamBlockVerdict'),ctx);
  vm.runInContext(fn('shouldRememberStreamBlock'),ctx);
  vm.runInContext(fn('rememberStreamBlocked'),ctx);
  vm.runInContext(fn('streamBlocked'),ctx);
  vm.runInContext(fn('probeStreamEndpoint'),ctx);
  const verdict=await ctx.probeStreamEndpoint('fileA','probe');
  assert.equal(verdict,'auth');
  assert.equal(ctx.shouldRememberStreamBlock('auth'),false,'permission answers are per-file, not browser-wide');
  if (ctx.shouldRememberStreamBlock(verdict)) ctx.rememberStreamBlocked();
  assert.equal(ctx.streamBlocked(),false);
});
test('successful HTTP headers do not disable other files after playback failure',()=>{
  const {ctx}=setup();
  vm.runInContext(fn('shouldRememberStreamBlock'),ctx);
  assert.equal(ctx.shouldRememberStreamBlock('works'),false,'HTTP success does not prove the cause of playback failure');
});
test('a works verdict requires real MP4 bytes in the probe answer',async()=>{
  const {ctx}=setup();
  ctx.location={href:'https://x.test/app/'};
  vm.runInContext(fn('streamBlockVerdict'),ctx);
  vm.runInContext(fn('probeStreamEndpoint'),ctx);
  ctx.fetch=async()=>({status:206,body:new ReadableStream({start(c){c.enqueue(new Uint8Array([0,0,0,32,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d]));c.close()}})});
  assert.equal(await ctx.probeStreamEndpoint('fileA','probe'),'works','a real MP4 signature counts as works');
  ctx.fetch=async()=>({status:206,body:new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('<html>download warning</html>'));c.close()}})});
  assert.equal(await ctx.probeStreamEndpoint('fileA','probe'),'invalid','an HTML answer must not count as works');
  ctx.fetch=async()=>({status:206});
  assert.equal(await ctx.probeStreamEndpoint('fileA','probe'),'unknown','HTTP-only success cannot confirm media bytes');
});
test('after public sources fail, diagnostics leave whole-file loading as a user choice',()=>{
  const start=html.indexOf('      function tryStreamDirect(');
  const end=html.indexOf('\n      }',start);
  const body=html.slice(start,end);
  assert(!body.includes('loadVideoAsBlob('),'no automatic whole-file download');
  assert(body.includes("probeStreamEndpoint(id, 'probe')"),'bounded diagnostics remain');
});
test('public source failures record what was tried',async()=>{
  const {ctx}=setup();
  const sources=[];
  ctx.vidPlayer.removeAttribute=()=>{};
  ctx.tryVideoSrc=(url,onFail)=>{sources.push(String(url)); onFail('media','M4/N3/R0');};
  ctx.apiKey='KEY';ctx.vidCurrentId='file1';ctx.videoModal.classList.contains=()=>true;
  vm.runInContext(fn('tryPublicStream'),ctx);
  let received=null;
  ctx.tryPublicStream('file1',notes=>{received=notes;},true);
  await Promise.resolve();
  assert.equal(sources.length,2,'usercontent then API key are both attempted');
  assert.match(sources[0],/drive\.usercontent\.google\.com/);
  assert.match(sources[1],/alt=media&key=KEY/);
  assert.match(received[0],/ลิงก์ตรง: M4\/N3\/R0/);
  assert.match(received[1],/API key: M4\/N3\/R0/);
});
test('blob failure message carries the earlier fallback notes',async()=>{
  const {ctx,els}=setup();
  ctx.vidCurrentId='fileA';ctx.videoModal.classList.contains=()=>true;ctx.accessToken='t';
  ctx.authParams=()=>({mode:'bearer'});
  ctx.fetch=async()=>({ok:true,blob:async()=>'BLOB'});
  ctx.URL={createObjectURL:()=>'blob:loaded',revokeObjectURL(){}};
  vm.runInContext(fn('loadVideoAsBlob'),ctx);
  await ctx.loadVideoAsBlob('fileA',null,['ลิงก์ตรง: M4/N3/R0','API key: M4/N3/R0']);
  await new Promise(r=>setTimeout(r,20));
  ctx.vidPlayer.onerror();
  assert.match(els.vidErrorStatus.textContent,/โหลดทั้งไฟล์แล้วแต่ยังเล่นไม่ได้/);
  assert.match(els.vidErrorStatus.textContent,/การลองสำรองก่อนหน้า: ลิงก์ตรง: M4\/N3\/R0 · API key: M4\/N3\/R0/);
});
test('codec support summary formats a compact capability line',()=>{
  const {ctx}=setup();
  vm.runInContext(fn('describeCodecSupport'),ctx);
  assert.equal(ctx.describeCodecSupport(null),'');
  assert.equal(ctx.describeCodecSupport([]),'');
  assert.equal(ctx.describeCodecSupport([{label:'H.264',ok:true},{label:'HEVC',ok:false}]),' เบราว์เซอร์ระบุว่ารองรับ: H.264 ✓ HEVC ✗');
});
test('codec capability check is wired into the works verdict message',()=>{
  assert(/verdict === 'works'[\s\S]{0,300}describeCodecSupport\(deviceCodecSupport\(\)\)/.test(html),'works message carries device codec info');
});
test('probe refines the generic card without overriding specific errors',()=>{
  assert(/probeStreamEndpoint\(id, 'probe'\)/.test(html),'media failure triggers the probe');
  assert(/status\.textContent\.indexOf\(MEDIA_STREAM_FAIL_MSG\) !== 0/.test(html),'probe refines only the generic message');
});
test('probe treats a hanging stream endpoint as a browser block',async()=>{
  const {ctx,timers}=setup();
  ctx.location={href:'https://x.test/app/'};
  ctx.fetch=()=>new Promise(()=>{});
  vm.runInContext(fn('streamBlockVerdict'),ctx);
  vm.runInContext(fn('probeStreamEndpoint'),ctx);
  const p=ctx.probeStreamEndpoint('fileA','probe');
  for(const cb of [...timers.values()])cb();
  assert.equal(await p,'browser');
});
test('an old session block is cleared and the next file gets a fresh attempt',()=>{
  const {ctx}=setup();
  ctx.sessionStorage=makeStore();
  ctx.sessionStorage.setItem('gdfvStreamBlocked','1');
  ctx.accessToken='t';ctx.vidCurrentId='fileA';ctx.videoModal.classList.contains=()=>true;
  const previews=[];
  let prepared=0;
  ctx.prepareStreamWorker=()=>{prepared++;return new Promise(()=>{})};
  ctx.fallbackIframe=id=>previews.push(id);
  vm.runInContext(fn('streamBlocked'),ctx);
  vm.runInContext(fn('tryStreamDirect'),ctx);
  ctx.tryStreamDirect('fileA');
  assert.equal(prepared,1);
  assert.equal(ctx.streamBlocked(),false);
  assert.deepEqual(previews,[]);
});
test('retry and reconnect clear the remembered block before reopening',()=>{
  assert(/vidRetry'\)\.addEventListener\('click', function \(\) \{\s*if \(videoModal\.classList\.contains\('show'\) && vidCurrentId\) \{ clearStreamBlocked\(\); openVideo/.test(html),'retry clears the flag');
  assert(/vidReconnect'\)\.addEventListener\('click',[\s\S]{0,400}clearStreamBlocked\(\); openVideo/.test(html),'reconnect clears the flag');
});

test('a confirmed worker quota error advances immediately without waiting for timeout',()=>{
 const {ctx}=setup();ctx.vidCurrentId='fileA';ctx.videoModal.classList.contains=()=>true;ctx.accessToken='t';let failures=0;
 ctx.tryVideoSrc('source',()=>failures++);const attempt=ctx.videoAttempt;
 ctx.handleDriveStreamError({type:'drive-stream-error',id:'fileA',attempt,status:403,reason:'downloadQuotaExceeded'});
 assert.equal(failures,1);assert.equal(ctx.videoAttemptTimer,null);
});

test('failure after playback saves the exact resume position before trying another source',()=>{
 const {ctx}=setup();ctx.vidCurrentId='fileA';ctx.videoModal.classList.contains=()=>true;ctx.vidPlayer.style.display='block';let fallback=0,saved=0;
 ctx.saveVideoPos=()=>saved++;ctx.tryVideoSrc('first',()=>fallback++);ctx.vidPlayer.oncanplay();ctx.vidPlayer.currentTime=42.75;ctx.vidPlayer.error={code:2};
 assert.equal(typeof ctx.vidPlayer.onerror,'function','errors must remain handled after startup');ctx.vidPlayer.onerror();
 assert.equal(fallback,1);assert.equal(saved,1);assert.equal(ctx.videoResumePos,42.75);
 ctx.tryVideoSrc('backup',()=>{});ctx.vidPlayer.currentTime=0;ctx.vidPlayer.oncanplay();assert.equal(ctx.vidPlayer.currentTime,42.75);
});
test('a stale playback failure cannot change the next video or reopen a closed modal',()=>{
 const {ctx}=setup();ctx.videoModal.classList.contains=()=>true;ctx.vidPlayer.style.display='block';let fallback=0;
 ctx.tryVideoSrc('first',()=>fallback++);ctx.vidPlayer.oncanplay();const oldError=ctx.vidPlayer.onerror;
 ctx.tryVideoSrc('second',()=>{});if(oldError)oldError();assert.equal(fallback,0);
 ctx.vidPlayer.oncanplay();const latest=ctx.vidPlayer.onerror;ctx.closeVideo();if(latest)latest();assert.equal(fallback,0);
});

Promise.all(pending).then(function(){process.exitCode=failures?1:0;});
