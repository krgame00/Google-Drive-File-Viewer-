const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const playerSource=fs.readFileSync(require('node:path').join(__dirname,'..','video-player.js'),'utf8');
const pageSource=fs.readFileSync(require('node:path').join(__dirname,'..','app-core.js'),'utf8');
const html=playerSource;
function fn(name){const source=playerSource.includes('      function '+name+'(')?playerSource:pageSource;const start=source.indexOf('      function '+name+'(');assert(start>=0,`missing ${name}`);return source.slice(start,source.indexOf('\n      }',start)+8);}
const {loadVideoPlayerApi}=require('./helpers/load-video-player-api.cjs');
function setup(){const store=new Map(),els={};let now=100000;
 const el=id=>els[id]||(els[id]={textContent:'',style:{}});
 const ctx={Date:{now:()=>now},accessToken:'token',apiKey:'key',mediaSession:1,vidCurrentId:'A',videoBlobTransfer:null,vidPlayer:{paused:false,style:{display:'block'},src:'source'},
 videoModal:{classList:{contains:()=>true}},lsGet:k=>store.get(k)||null,lsSet:(k,v)=>store.set(k,v),document:{getElementById:el},
 fileMetaOf:()=>({size:'1073741824'}),window:{confirm:()=>false},loadVideoAsBlob:()=>{ctx.loads++},loads:0};
 vm.createContext(ctx);return {ctx,store,el,tick:n=>now+=n,run:n=>vm.runInContext(fn(n),ctx)};}
function setupApi(){const store=new Map(),els={};let now=100000;
 const el=id=>els[id]||(els[id]={textContent:'',style:{}});
 const bridge={Date:{now:()=>now},accessToken:'token',apiKey:'key',mediaSession:1,vidCurrentId:'A',videoBlobTransfer:null,
 vidPlayer:{paused:false,style:{display:'block'},src:'source'},videoModal:{classList:{contains:()=>true}},
 lsGet:k=>store.get(k)||null,lsSet:(k,v)=>store.set(k,v),document:{getElementById:el},
 fileMetaOf:()=>({size:'1073741824'}),window:{confirm:()=>false},loadVideoAsBlob:()=>{bridge.loads++;},loads:0,
 formatSize:bytes=>{const n=Number(bytes);if(!n||!Number.isFinite(n))return '';if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(1)+' KB';if(n<1073741824)return (n/1048576).toFixed(1)+' MB';return (n/1073741824).toFixed(1)+' GB';}};
 const api=loadVideoPlayerApi(bridge);return {api,bridge,store,el,tick:n=>now+=n};
}
test('successful route is bounded, expires, and is separate for signed-out playback',()=>{
 const {api,bridge,tick,store}=setupApi();
 api.rememberPlaybackRoute('A','usercontent');assert.equal(api.preferredPlaybackRoute('A'),'usercontent');
 bridge.accessToken=null;assert.equal(api.preferredPlaybackRoute('A'),null);bridge.accessToken='token';
 tick(8*86400000);assert.equal(api.preferredPlaybackRoute('A'),null);
 for(let i=0;i<70;i++)api.rememberPlaybackRoute('file'+i,'bearer');assert.equal(JSON.parse(store.get('gdv_playback_routes')).length,50);
 api.rememberPlaybackRoute('secret','https://url?token=bad');assert(!store.get('gdv_playback_routes').includes('token='));
});
test('large or unknown downloads require a choice and cancellation never starts fetching',()=>{
 const {ctx,run}=setup();run('formatSize');run('requestVideoBlob');
 ctx.requestVideoBlob('A');assert.equal(ctx.loads,0);
 let message;ctx.window.confirm=text=>{message=text;return true};ctx.requestVideoBlob('A');assert.equal(ctx.loads,1);assert.match(message,/1(?:\.0)? GB/);
 ctx.fileMetaOf=()=>({});ctx.window.confirm=text=>{message=text;return false};ctx.requestVideoBlob('A');assert.equal(ctx.loads,1);assert.match(message,/ไม่ทราบ/);
});
test('progress reports measured speed and remaining time without making up an unknown total',()=>{
 const {api,bridge,el,tick}=setupApi();bridge.videoBlobTransfer={startedAt:100000};tick(2000);
 api.renderVideoBlobProgress(2097152,10485760);assert.match(el('vidLoadingText').textContent,/1(?:\.0)? MB\/s/);assert.match(el('vidLoadingText').textContent,/8 วินาที/);
 api.renderVideoBlobProgress(2097152,0);assert(!el('vidLoadingText').textContent.includes('เหลือประมาณ'));assert(!el('vidLoadingText').textContent.includes('%'));
});
test('stream failure does not silently download the whole file',()=>{
 assert(!fn('tryStreamDirect').includes('loadVideoAsBlob('),'whole-file downloads must be a user choice');
});
test('actual playback records its route but paused, stale and hidden sources do not',()=>{
 const {api,bridge,store}=setupApi();
 bridge.vidPlayer.playbackRoute={id:'A',session:1,mode:'signedin',url:'source',route:'bearer'};
 const routes=()=>JSON.parse(store.get('gdv_playback_routes')||'[]');
 bridge.vidPlayer.paused=true;api.recordActivePlaybackRoute();assert.equal(routes().length,0);
 bridge.vidPlayer.paused=false;api.recordActivePlaybackRoute();assert.deepEqual(routes().map(r=>[r.id,r.route]),[['A','bearer']]);
 bridge.mediaSession++;api.recordActivePlaybackRoute();bridge.mediaSession--;bridge.accessToken=null;api.recordActivePlaybackRoute();
 bridge.accessToken='token';bridge.vidPlayer.src='new';api.recordActivePlaybackRoute();assert.equal(routes().length,1);
});
test('corrupt route storage and invalid future timestamps are ignored',()=>{
 const {api,store}=setupApi();
 store.set('gdv_playback_routes','invalid');assert.equal(api.preferredPlaybackRoute('A'),null);
 store.set('gdv_playback_routes',JSON.stringify([{id:'A',mode:'signedin',route:'key',at:9999999}]));assert.equal(api.preferredPlaybackRoute('A'),null);
});
