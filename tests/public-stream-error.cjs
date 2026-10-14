const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadVideoPlayerApi}=require('./helpers/load-video-player-api.cjs');

function setup(response){
 let opts;
 const api=loadVideoPlayerApi({
  apiKey:'test-key',
  fetch:async(url,options)=>{opts=options;return response;}
 });
 return {api,options:()=>opts};
}

test('Google quota rejection is reported without exposing request credentials',async()=>{
 const {api,options}=setup(new Response(JSON.stringify({error:{errors:[{reason:'downloadQuotaExceeded'}]}}),{status:403,headers:{'Content-Type':'application/json'}}));
 const message=await api.probePublicStreamError('file');
 assert.match(message,/downloadQuotaExceeded/);
 assert(!message.includes('test-key'));
 assert(!options().headers.Authorization);
});

test('HTTP success never asserts successful playback',async()=>{
 let cancelled=false;
 const {api}=setup({ok:true,status:206,body:{cancel:async()=>{cancelled=true;}}});
 assert.equal(await api.probePublicStreamError('file'),null);
 assert(cancelled);
});

test('large error bodies are read only to the bounded prefix',async()=>{
 let reads=0,cancelled=false;
 const {api}=setup({ok:false,status:403,headers:new Headers({'Content-Type':'application/json'}),body:{getReader(){return {read:async()=>{reads++;return {done:false,value:new Uint8Array(10000)};},cancel:async()=>{cancelled=true;}};}}});
 assert.equal(await api.probePublicStreamError('file'),null);
 assert.equal(reads,1);
 assert(cancelled);
});
