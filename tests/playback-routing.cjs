const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function fn(name){const start=html.indexOf('      function '+name+'(');assert(start>=0);return html.slice(start,html.indexOf('\n      }',start)+8)}
function setup(){const sources=[],failures=[],previews=[];const ctx={preferredPlaybackRoute:()=>null,apiKey:'public-test-key',mediaSession:1,videoAttempt:1,vidCurrentId:'file1',videoModal:{classList:{contains:()=>true}},probePublicStreamError:async()=>null,vidPlayer:{style:{},removeAttribute(){}},revokeCurrentVideo(){},authParams:()=>({mode:'key'}),tryVideoSrc:(url,fail)=>sources.push({url,fail}),showStreamFailure:m=>failures.push(m),fallbackIframe:id=>previews.push(id)};vm.createContext(ctx);vm.runInContext(fn('tryPublicStream'),ctx);return {ctx,sources,failures,previews}}
test('failed public sources show an error instead of automatically switching players',async()=>{
 const {ctx,sources,failures,previews}=setup();ctx.tryPublicStream('file1');
 sources[0].fail();sources[1].fail();await Promise.resolve();sources[2].fail();assert.equal(failures.length,1);assert.equal(previews.length,0);
});
test('public playback reports confirmed quota failure and ignores stale checks',async()=>{
 for(const stale of [false,true]){
  const {ctx,sources,failures}=setup();let resolve;
  ctx.probePublicStreamError=()=>new Promise(r=>resolve=r);
  ctx.tryPublicStream('file1');sources[0].fail();sources[1].fail();
  if(stale)ctx.mediaSession++;
  ctx.setVideoStatus=(state,message)=>failures.push(message);
  resolve('Google ปฏิเสธคำขอ: downloadQuotaExceeded');await Promise.resolve();
  assert.equal(sources.length,2,'a confirmed quota response never creates an API media request');
  assert.equal(failures.length,stale?0:2);
  if(!stale)assert.match(failures[1],/downloadQuotaExceeded/);
 }
});
test('account backup only contacts Google and invokes its caller after exhaustion',async()=>{
 const {ctx,sources,previews}=setup();let failed=0;ctx.tryPublicStream('file1',()=>failed++,true);
 assert.match(sources[0].url,/^https:\/\/drive\.usercontent\.google\.com\//);
 sources[0].fail();await Promise.resolve();assert.match(sources[1].url,/^https:\/\/www\.googleapis\.com\//);
 sources[1].fail();assert.equal(failed,1);assert.equal(previews.length,0);
 assert(sources.every(x=>!x.url.includes('workers.dev')));
});
test('remembered public route starts first and each remaining route is tried once',async()=>{
 const {ctx,sources}=setup();ctx.preferredPlaybackRoute=()=> 'key';ctx.tryPublicStream('file1');await Promise.resolve();
 assert.match(sources[0].url,/googleapis/);sources[0].fail();assert.match(sources[1].url,/workers\.dev/);
 sources[1].fail();assert.match(sources[2].url,/usercontent/);sources[2].fail();assert.equal(sources.length,3);
});
test('a delayed preflight cannot create a source after closing or switching files',async()=>{
 const {ctx,sources}=setup();ctx.preferredPlaybackRoute=()=> 'key';let resolve;ctx.probePublicStreamError=()=>new Promise(r=>resolve=r);
 ctx.tryPublicStream('file1');ctx.mediaSession++;resolve(null);await Promise.resolve();assert.equal(sources.length,0);
});
test('switching to preview while a preflight is pending cannot reopen native playback',async()=>{
 const {ctx,sources}=setup();ctx.preferredPlaybackRoute=()=> 'key';let resolve;ctx.probePublicStreamError=()=>new Promise(r=>resolve=r);
 ctx.tryPublicStream('file1');ctx.videoAttempt++;resolve(null);await Promise.resolve();assert.equal(sources.length,0);
});
