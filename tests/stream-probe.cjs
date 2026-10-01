const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function setup(fetch){const timers=[];const ctx={URL,Uint8Array,AbortController,location:{href:'https://example.test/app/'},fetch,setTimeout:cb=>{timers.push(cb);return timers.length},clearTimeout(){}};vm.createContext(ctx);for(const name of ['streamBlockVerdict','probeStreamEndpoint']){const a=html.indexOf('      function '+name+'(');vm.runInContext(html.slice(a,html.indexOf('\n      }',a)+8),ctx)}return {ctx,timers}}
test('probe stops reading an ignored range after the media signature',async()=>{
 let reads=0,cancelled=0,signal;
 const {ctx}=setup(async(url,opts)=>{signal=opts.signal;return {status:200,arrayBuffer(){throw Error('must not buffer a full video')},body:{getReader(){return {read:async()=>{reads++;return {value:new Uint8Array([0,0,0,32,102,116,121,112,105,115,111,109]),done:false}},cancel:async()=>cancelled++,releaseLock(){}}}}}});
 assert.equal(await ctx.probeStreamEndpoint('file','probe'),'works');assert.equal(reads,1);assert.equal(cancelled,1);assert.equal(signal.aborted,true);
});
test('probe timeout aborts its request instead of continuing a large download',async()=>{
 let signal;const {ctx,timers}=setup((url,opts)=>{signal=opts.signal;return new Promise(()=>{})});
 const pending=ctx.probeStreamEndpoint('file','probe');timers[0]();assert.equal(await pending,'browser');assert.equal(signal.aborted,true);
});
test('a body read failure is unknown, never successful media',async()=>{
 const {ctx}=setup(async()=>({status:206,body:{getReader(){return {read:async()=>{throw Error('lost connection')},cancel:async()=>{},releaseLock(){}}}}}));
 assert.equal(await ctx.probeStreamEndpoint('file','probe'),'unknown');
});
