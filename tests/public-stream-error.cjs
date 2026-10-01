const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function setup(response){let opts;const ctx={apiKey:'test-key',URL,Uint8Array,AbortController,setTimeout,clearTimeout,fetch:async(url,options)=>{opts=options;return response}};vm.createContext(ctx);const s=fs.readFileSync('index.html','utf8'),a=s.indexOf('      function probePublicStreamError(');assert(a>=0,'public error probe exists');vm.runInContext(s.slice(a,s.indexOf('\n      }',a)+8),ctx);return {ctx,options:()=>opts}}
test('Google quota rejection is reported without exposing request credentials',async()=>{
 const {ctx,options}=setup(new Response(JSON.stringify({error:{errors:[{reason:'downloadQuotaExceeded'}]}}),{status:403,headers:{'Content-Type':'application/json'}}));
 const message=await ctx.probePublicStreamError('file');assert.match(message,/downloadQuotaExceeded/);assert(!message.includes('test-key'));assert(!options().headers.Authorization);
});
test('HTTP success never asserts successful playback',async()=>{
 let cancelled=false;const {ctx}=setup({ok:true,status:206,body:{cancel:async()=>cancelled=true}});
 assert.equal(await ctx.probePublicStreamError('file'),null);assert(cancelled);
});
test('large error bodies are read only to the bounded prefix',async()=>{
 let reads=0,cancelled=false;const {ctx}=setup({ok:false,status:403,headers:new Headers({'Content-Type':'application/json'}),body:{getReader(){return {read:async()=>{reads++;return {done:false,value:new Uint8Array(10000)}},cancel:async()=>cancelled=true}}}});
 assert.equal(await ctx.probePublicStreamError('file'),null);assert.equal(reads,1);assert(cancelled);
});
