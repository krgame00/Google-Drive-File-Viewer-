const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function fn(name){const start=html.indexOf('      function '+name+'(');assert(start>=0,`missing ${name}`);return html.slice(start,html.indexOf('\n      }',start)+8);}
function setup(){const store=new Map(),els={};let now=100000;
 const el=id=>els[id]||(els[id]={textContent:'',style:{}});
 const ctx={Date:{now:()=>now},accessToken:'token',apiKey:'key',mediaSession:1,vidCurrentId:'A',videoBlobTransfer:null,vidPlayer:{paused:false,style:{display:'block'},src:'source'},
 videoModal:{classList:{contains:()=>true}},lsGet:k=>store.get(k)||null,lsSet:(k,v)=>store.set(k,v),document:{getElementById:el},
 fileMetaOf:()=>({size:'1073741824'}),window:{confirm:()=>false},loadVideoAsBlob:()=>{ctx.loads++},loads:0};
 vm.createContext(ctx);return {ctx,store,el,tick:n=>now+=n,run:n=>vm.runInContext(fn(n),ctx)};}
test('successful route is bounded, expires, and is separate for signed-out playback',()=>{
 const {ctx,run,tick,store}=setup();for(const n of ['playbackRouteRecords','rememberPlaybackRoute','preferredPlaybackRoute'])run(n);
 ctx.rememberPlaybackRoute('A','usercontent');assert.equal(ctx.preferredPlaybackRoute('A'),'usercontent');
 ctx.accessToken=null;assert.equal(ctx.preferredPlaybackRoute('A'),null);ctx.accessToken='token';
 tick(8*86400000);assert.equal(ctx.preferredPlaybackRoute('A'),null);
 for(let i=0;i<70;i++)ctx.rememberPlaybackRoute('file'+i,'bearer');assert.equal(JSON.parse(store.get('gdv_playback_routes')).length,50);
 ctx.rememberPlaybackRoute('secret','https://url?token=bad');assert(!store.get('gdv_playback_routes').includes('token='));
});
test('large or unknown downloads require a choice and cancellation never starts fetching',()=>{
 const {ctx,run}=setup();run('formatSize');run('requestVideoBlob');
 ctx.requestVideoBlob('A');assert.equal(ctx.loads,0);
 let message;ctx.window.confirm=text=>{message=text;return true};ctx.requestVideoBlob('A');assert.equal(ctx.loads,1);assert.match(message,/1(?:\.0)? GB/);
 ctx.fileMetaOf=()=>({});ctx.window.confirm=text=>{message=text;return false};ctx.requestVideoBlob('A');assert.equal(ctx.loads,1);assert.match(message,/ไม่ทราบ/);
});
test('progress reports measured speed and remaining time without making up an unknown total',()=>{
 const {ctx,run,el,tick}=setup();run('formatSize');run('renderVideoBlobProgress');ctx.videoBlobTransfer={startedAt:100000};tick(2000);
 ctx.renderVideoBlobProgress(2097152,10485760);assert.match(el('vidLoadingText').textContent,/1(?:\.0)? MB\/s/);assert.match(el('vidLoadingText').textContent,/8 วินาที/);
 ctx.renderVideoBlobProgress(2097152,0);assert(!el('vidLoadingText').textContent.includes('เหลือประมาณ'));assert(!el('vidLoadingText').textContent.includes('%'));
});
test('stream failure does not silently download the whole file',()=>{
 assert(!fn('tryStreamDirect').includes('loadVideoAsBlob('),'whole-file downloads must be a user choice');
});
test('actual playback records its route but paused, stale and hidden sources do not',()=>{
 const {ctx,run}=setup();const recorded=[];ctx.rememberPlaybackRoute=(id,route)=>recorded.push([id,route]);run('recordActivePlaybackRoute');
 ctx.vidPlayer.playbackRoute={id:'A',session:1,mode:'signedin',url:'source',route:'bearer'};
 ctx.vidPlayer.paused=true;ctx.recordActivePlaybackRoute();assert.equal(recorded.length,0);
 ctx.vidPlayer.paused=false;ctx.recordActivePlaybackRoute();assert.deepEqual(recorded,[['A','bearer']]);
 ctx.mediaSession++;ctx.recordActivePlaybackRoute();ctx.mediaSession--;ctx.accessToken=null;ctx.recordActivePlaybackRoute();
 ctx.accessToken='token';ctx.vidPlayer.src='new';ctx.recordActivePlaybackRoute();assert.equal(recorded.length,1);
});
test('corrupt route storage and invalid future timestamps are ignored',()=>{
 const {ctx,run,store}=setup();run('playbackRouteRecords');run('preferredPlaybackRoute');
 store.set('gdv_playback_routes','invalid');assert.equal(ctx.preferredPlaybackRoute('A'),null);
 store.set('gdv_playback_routes',JSON.stringify([{id:'A',mode:'signedin',route:'key',at:9999999}]));assert.equal(ctx.preferredPlaybackRoute('A'),null);
});
