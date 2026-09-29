const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {MessageChannel}=require('node:worker_threads');
function setup({token='test-token',status=206,type='video/mp4',client=true}={}) {
  const events={},calls=[];
  const ctx={URL,Headers,Response,MessageChannel,setTimeout,clearTimeout,
    self:{registration:{scope:'https://example.com/app/'},addEventListener(n,f){events[n]=f},
      clients:{get:async()=>client?{url:'https://example.com/app/index.html',postMessage(data,ports){ports[0].postMessage({token});ports[0].close()}}:null}},
    fetch:async(url,options)=>{calls.push({url,options});return new Response('data',{status,headers:{'Content-Type':type,'Content-Range':'bytes 0-3/100'}})}};
  vm.runInNewContext(fs.readFileSync('drive-stream-sw.js','utf8'),ctx);
  const request=(path='__drive_stream?id=file1',method='GET')=>{
    let result;
    events.fetch({clientId:'tab-1',request:new Request('https://example.com/app/'+path,{method,headers:{Range:'bytes=0-3'}}),respondWith(p){result=p}});
    return result;
  };
  return {request,calls};
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

function playerSetup() {
  const html=fs.readFileSync('index.html','utf8');
  const start=html.indexOf('      function tryStreamDirect(');
  const end=html.indexOf('\n      }',start);
  let ready;const sources=[],fallbacks=[];
  const ctx={accessToken:'test-token',tokenExpiry:Date.now()+60000,Date,URL,
    location:{href:'https://example.com/app/index.html#/f/folder'},mediaSession:1,vidCurrentId:'file1',
    videoModal:{classList:{contains:()=>true}},vidPlayer:{style:{}},revokeCurrentVideo(){},showToast(){},
    prepareStreamWorker:()=>new Promise(resolve=>{ready=resolve}),
    tryVideoSrc:(url,fail)=>sources.push({url,fail}),fallbackIframe:id=>fallbacks.push(id),tryPublicStream:id=>sources.push({public:id})};
  vm.createContext(ctx);vm.runInContext(html.slice(start,end+8),ctx);
  return {ctx,sources,fallbacks,ready:async(value)=>{ready(value);await Promise.resolve()}};
}
test('logged-in playback uses scoped local URL without exposing token',async()=>{
  const {ctx,sources,ready,fallbacks}=playerSetup();ctx.tryStreamDirect('file1');await ready(true);
  assert.equal(sources[0].url,'https://example.com/app/__drive_stream?id=file1');
  sources[0].fail();assert.deepEqual(fallbacks,['file1']);
});
test('close, file switch and logout cancel asynchronous setup',async()=>{
  for(const change of [ctx=>ctx.mediaSession++,ctx=>ctx.vidCurrentId='file2',ctx=>ctx.accessToken=null]){
    const {ctx,sources,ready,fallbacks}=playerSetup();ctx.tryStreamDirect('file1');change(ctx);await ready(true);
    assert.equal(sources.length,0);assert.equal(fallbacks.length,0);
  }
});
test('unsupported browser falls back and signed-out user keeps public playback',async()=>{
  const {ctx,sources,ready,fallbacks}=playerSetup();ctx.tryStreamDirect('file1');await ready(false);assert.deepEqual(fallbacks,['file1']);
  ctx.accessToken=null;ctx.tryStreamDirect('file1');assert.equal(sources[0].public,'file1');
});
