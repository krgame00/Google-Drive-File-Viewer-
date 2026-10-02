const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {MessageChannel}=require('node:worker_threads');
function setup({token='test-token',status=206,type='video/mp4',client=true,fetchFails=false,contentRange='bytes 0-3/100'}={}) {
  const events={},calls=[],errors=[];
  const theClient={url:'https://example.com/app/index.html',postMessage(data,ports){if(ports){ports[0].postMessage({token});ports[0].close()}else{errors.push(data)}}};
  const ctx={URL,Headers,Response,MessageChannel,setTimeout,clearTimeout,
    self:{registration:{scope:'https://example.com/app/'},addEventListener(n,f){events[n]=f},
      clients:{get:async(id)=>client?theClient:null,matchAll:async()=>client?[theClient]:[]}},
    fetch:async(url,options)=>{calls.push({url,options});if(fetchFails)throw new Error('private diagnostic test-token');return new Response('data',{status,headers:{'Content-Type':type,'Content-Range':contentRange}})}};
  vm.runInNewContext(fs.readFileSync('drive-stream-sw.js','utf8'),ctx);
  const request=(path='__drive_stream?id=file1',method='GET',clientId='tab-1',range='bytes=0-3')=>{
    let result;
    events.fetch({clientId,request:new Request('https://example.com/app/'+path,{method,headers:{Range:range}}),respondWith(p){result=p}});
    return result;
  };
  return {request,calls,errors,ctx};
}
test('streams ranges with bearer header, without token in URL or cache',async()=>{
  const {request,calls}=setup();const res=await request();
  assert.equal(res.status,206);assert.equal(await res.text(),'data');
  assert.equal(res.headers.get('Content-Range'),'bytes 0-3/100');
  assert.equal(res.headers.get('Cache-Control'),'no-store');
  assert.equal(calls[0].options.headers.get('Authorization'),'Bearer test-token');
  assert.equal(calls[0].options.headers.get('Range'),'bytes=0-3');
  assert(!calls[0].url.includes('test-token'));
});
test('account streaming bounds open-ended ranges and preserves explicit ranges',async()=>{
 const {request,calls}=setup();const res=await request('__drive_stream?id=file1','GET','tab-1','bytes=0-');
 assert.equal(calls[0].options.headers.get('Range'),'bytes=0-8388607');assert.equal(res.status,206);assert.equal(res.headers.get('Content-Range'),'bytes 0-3/100');
 const next=setup();await next.request('__drive_stream?id=file1','GET','tab-1','bytes=4-7');assert.equal(next.calls[0].options.headers.get('Range'),'bytes=4-7');
});
test('account seeking keeps the requested offset and cancels wrong intervals',async()=>{
 const {request,calls}=setup({contentRange:'bytes 12345678-12345681/99999999'});
 const res=await request('__drive_stream?id=file1','GET','tab-1','bytes=12345678-');assert.equal(res.status,206);assert.equal(calls[0].options.headers.get('Range'),'bytes=12345678-20734285');
 for(const options of [{status:200},{contentRange:'bytes 5-8/100'}]){
  const bad=setup(options);assert.equal((await bad.request('__drive_stream?id=file1','GET','tab-1','bytes=0-')).status,502);assert.equal(bad.errors[0].reason,'streamRangeUnsupported');
 }
});
test('account open ranges retry download quota with smaller intervals but never retry permission errors',async()=>{
 for(const reason of ['downloadQuotaExceeded','insufficientFilePermissions']){
  const {request,ctx}=setup();const ranges=[];ctx.fetch=async(url,opts)=>{ranges.push(opts.headers.get('Range'));return ranges.length<3?new Response(JSON.stringify({error:{errors:[{reason}]}}),{status:403,headers:{'Content-Type':'application/json'}}):new Response('data',{status:206,headers:{'Content-Type':'video/mp4','Content-Range':'bytes 0-3/100'}})};
  const res=await request('__drive_stream?id=file1','GET','tab-1','bytes=0-');assert.equal(res.status,reason==='downloadQuotaExceeded'?206:403);
  assert.deepEqual(ranges,reason==='downloadQuotaExceeded'?['bytes=0-8388607','bytes=0-2097151','bytes=0-1048575']:['bytes=0-8388607']);
 }
});
test('missing login or client never fetches a private file',async()=>{
  for(const options of [{token:null},{client:false}]){const {request,calls}=setup(options);assert.equal((await request()).status,401);assert.equal(calls.length,0)}
});
test('does not disguise Google errors or HTML as video',async()=>{
  assert.equal((await setup({status:403,type:'application/json'}).request()).status,403);
  const res=await setup({status:200,type:'text/html'}).request();assert.equal(res.status,502);assert(!res.headers.get('Content-Type').includes('video'));
});
test('ignores unrelated assets and rejects invalid IDs and methods',async()=>{
  const {request,calls}=setup();assert.equal(request('index.html'),undefined);
  assert.equal((await request('__drive_stream?id=../secret')).status,400);
  assert.equal((await request('__drive_stream?id=file1','POST')).status,405);assert.equal(calls.length,0);
});
test('preserves actual media type and HEAD body semantics',async()=>{
  const {request}=setup({status:200,type:'video/quicktime'});const res=await request('__drive_stream?id=file1','HEAD');
  assert.equal(res.headers.get('Content-Type'),'video/quicktime');assert.equal(await res.text(),'');
});
test('fetch failure reports a safe connection diagnostic bound to attempt',async()=>{
  const {request,errors}=setup({fetchFails:true});
  assert.equal((await request('__drive_stream?id=file1&attempt=7')).status,502);
  assert.equal(errors.length,1);assert.equal(errors[0].reason,'streamFetchFailed');
  assert.equal(errors[0].attempt,'7');assert(!JSON.stringify(errors).includes('test-token'));
});

function playerSetup() {
  const html=fs.readFileSync('index.html','utf8');
  const start=html.indexOf('      function tryStreamDirect(');
  const end=html.indexOf('\n      }',start);
  let ready;const sources=[],fallbacks=[],errors=[];
  const ctx={preferredPlaybackRoute:()=>null,apiKey:'test-key',accessToken:'test-token',tokenExpiry:Date.now()+60000,Date,URL,
    location:{href:'https://example.com/app/index.html#/f/folder'},mediaSession:1,vidCurrentId:'file1',
    videoModal:{classList:{contains:()=>true}},vidPlayer:{style:{},setAttribute(name,value){this[name]=value}},revokeCurrentVideo(){},showToast(){},
    prepareStreamWorker:()=>new Promise(resolve=>{ready=resolve}),
    streamBlocked:()=>false,rememberStreamBlocked(){},clearStreamBlocked(){},
    showStreamFailure:message=>errors.push(message),
    tryVideoSrc:(url,fail,timeout)=>sources.push({url,fail,timeout,cors:ctx.vidPlayer.crossorigin}),fallbackIframe:id=>fallbacks.push(id),tryPublicStream:id=>sources.push({public:id})};
  vm.createContext(ctx);vm.runInContext(html.slice(start,end+8),ctx);
  return {ctx,sources,fallbacks,errors,ready:async(value)=>{ready(value);await Promise.resolve()}};
}
test('logged-in playback uses scoped local URL without exposing token',async()=>{
  const {ctx,sources,ready,fallbacks,errors}=playerSetup();ctx.tryStreamDirect('file1');await ready(true);
  assert.equal(String(sources[0].url),'https://example.com/app/__drive_stream?id=file1');
  assert.equal(sources[0].cors,'anonymous','CORS is configured before assigning a service-worker media source');
  assert(sources[0].url instanceof URL,'pass URL object so tryVideoSrc can attach the attempt ID');
  assert.equal(sources[0].timeout,60000);
  sources[0].fail('timeout');assert.deepEqual(fallbacks,[]);assert.match(errors[0],/นาน/);
});
test('close, file switch and logout cancel asynchronous setup',async()=>{
  for(const change of [ctx=>ctx.mediaSession++,ctx=>ctx.vidCurrentId='file2',ctx=>ctx.accessToken=null]){
    const {ctx,sources,ready,fallbacks}=playerSetup();ctx.tryStreamDirect('file1');change(ctx);await ready(true);
    assert.equal(sources.length,0);assert.equal(fallbacks.length,0);
  }
});

test('account media failure tries Google backup and ignores its callback after close or logout',async()=>{
  for(const change of [ctx=>ctx.mediaSession++,ctx=>ctx.vidCurrentId='file2',ctx=>ctx.accessToken=null]){
    const {ctx,sources,ready,fallbacks,errors}=playerSetup();
    const status={textContent:''};let backup,probes=0;
    ctx.MEDIA_STREAM_FAIL_MSG='Media failed';
    ctx.document={getElementById:()=>status};
    ctx.showStreamFailure=message=>{errors.push(message);status.textContent=message};
    ctx.setVideoStatus=()=>{};
    ctx.tryPublicStream=(id,fail,googleOnly)=>{backup={id,fail,googleOnly}};
    ctx.probeStreamEndpoint=()=>{probes++;return Promise.resolve('works')};
    ctx.tryStreamDirect('file1');await ready(true);sources[0].fail('media');
    assert.equal(backup.id,'file1');assert.equal(backup.googleOnly,true);
    assert.equal(errors.length,1);assert.deepEqual(fallbacks,[]);
    change(ctx);backup.fail();assert.equal(errors.length,1);assert.equal(probes,0);
  }
});
test('unsupported browser explains failure and signed-out user keeps public playback',async()=>{
  const {ctx,sources,ready,fallbacks,errors}=playerSetup();ctx.tryStreamDirect('file1');await ready(false);assert.deepEqual(fallbacks,[]);assert.equal(errors.length,1);
  ctx.accessToken=null;ctx.tryStreamDirect('file1');assert.equal(sources[0].public,'file1');
});
test('remembered signed-in public route is tried before bearer without repeating public routes',async()=>{
 const {ctx,sources,ready}=playerSetup();ctx.preferredPlaybackRoute=()=> 'usercontent';let backup;
 ctx.tryPublicStream=(id,fail,googleOnly)=>{backup={id,fail,googleOnly}};
 ctx.tryStreamDirect('file1');assert.equal(sources.length,0);assert.equal(backup.googleOnly,true);
 backup.fail();await ready(true);assert.match(String(sources[0].url),/__drive_stream/);
 const status={textContent:'',hidden:false};ctx.document={getElementById:()=>status};ctx.MEDIA_STREAM_FAIL_MSG='failed';ctx.videoAttempt=1;
 ctx.showStreamFailure=text=>{status.textContent=text};ctx.setVideoStatus=(state)=>{ctx.videoStatus=state};ctx.probeStreamEndpoint=async()=> 'unknown';
 ctx.tryPublicStream=()=>assert.fail('public routes must not repeat');sources[0].fail('media');await Promise.resolve();
});
test('error reports echo the attempt token from the request',async()=>{
  const {request,errors}=setup({token:null});
  assert.equal((await request('__drive_stream?id=file1&attempt=7')).status,401);
  assert.equal(errors.length,1,'token failure reports once to the tab');
  assert.equal(errors[0].attempt,'7');assert.equal(errors[0].id,'file1');
  const s2=setup({status:403,type:'application/json'});
  assert.equal((await s2.request('__drive_stream?id=file1&attempt=9')).status,403);
  assert.equal(s2.errors.length,1);
  assert.equal(s2.errors[0].attempt,'9');assert.equal(s2.errors[0].status,403);
});
test('media request without clientId still reaches the playing tab (Brave)',async()=>{
  const {request,calls}=setup();
  const res=await request('__drive_stream?id=file1&attempt=1','GET','');
  assert.equal(res.status,206,'broadcast token handshake succeeds without clientId');
  assert.equal(calls.length,1,'upstream fetch happens');
});
test('no reachable client still returns 401 without upstream fetch',async()=>{
  const {request,calls}=setup({client:false});
  assert.equal((await request('__drive_stream?id=file1','GET','')).status,401);
  assert.equal(calls.length,0);
});
