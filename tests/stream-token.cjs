const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {MessageChannel}=require('node:worker_threads');
function setup(){const ctx={MessageChannel,setTimeout,clearTimeout,self:{addEventListener(){}}};vm.createContext(ctx);vm.runInContext(fs.readFileSync('drive-stream-sw.js','utf8'),ctx);return ctx}
function client(token,delay=0){return {postMessage(data,ports){setTimeout(()=>{ports[0].postMessage({token});ports[0].close()},delay)}}}
test('inactive tab cannot reject the active tab token handshake',async()=>{
 const ctx=setup();assert.equal(await ctx.requestToken([client(null),client('active-token',15)],'file'),'active-token');
});
test('empty token replies are ignored while another playing tab answers',async()=>{
 const ctx=setup();assert.equal(await ctx.requestToken([client(''),client('active-token',15)],'file'),'active-token');
});
test('all negative replies and unreachable tabs still return no token',async()=>{
 const ctx=setup();assert.equal(await ctx.requestToken([client(null),{postMessage(){throw Error('closed tab')}}],'file'),null);
 assert.equal(await ctx.requestToken([],'file'),null);
});
