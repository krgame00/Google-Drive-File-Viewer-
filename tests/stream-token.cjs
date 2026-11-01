const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {MessageChannel}=require('node:worker_threads');
function setup(){const ctx={MessageChannel,setTimeout,clearTimeout,self:{addEventListener(){}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('drive-stream-sw.js','utf8'),ctx);return ctx}
function client(token,delay=0){return {postMessage(data,ports){setTimeout(()=>{ports[0].postMessage(typeof token==='string'?{token}:token);ports[0].close()},delay)}}}
test('inactive tab cannot reject the active tab token handshake',async()=>{
 const ctx=setup();assert.equal((await ctx.requestToken([client(null),client('active-token',15)],'file')).token,'active-token');
});
test('empty token replies are ignored while another playing tab answers',async()=>{
 const ctx=setup();assert.equal((await ctx.requestToken([client(''),client('active-token',15)],'file')).token,'active-token');
});
test('all negative replies and unreachable tabs still return no token',async()=>{
 const ctx=setup();assert.equal(await ctx.requestToken([client(null),{postMessage(){throw Error('closed tab')}}],'file'),null);
 assert.equal(await ctx.requestToken([],'file'),null);
});
test('the token reply carries page-vouched stream metadata for the head cache',async()=>{
 const ctx=setup();
 const reply=await ctx.requestToken([client({token:'tok',scope:'account:a@b.c',size:123,modifiedTime:'2026-01-02T03:04:05Z',heads:true})],'file');
 assert.deepEqual(JSON.parse(JSON.stringify(reply)),{token:'tok',scope:'account:a@b.c',size:123,modifiedTime:'2026-01-02T03:04:05Z',heads:true});
});
test('a legacy plain token reply degrades to head caching off, not a failure',async()=>{
 const ctx=setup();const reply=await ctx.requestToken([client('plain-token')],'file');
 assert.equal(reply.token,'plain-token');assert.equal(reply.heads,false);assert.equal(reply.scope,null);
});
test('metadata without a token is still a negative reply',async()=>{
 const ctx=setup();assert.equal(await ctx.requestToken([client({scope:'s',size:5,heads:true})],'file'),null);
});
