const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const html=fs.readFileSync('index.html','utf8');
function fn(n){const a=html.indexOf('      function '+n+'(');assert(a>=0,n+' exists');return html.slice(a,html.indexOf('\n      }',a)+8)}
const data=new Map();const ctx={lsGet:k=>data.get(k),lsSet:(k,v)=>data.set(k,String(v)),lsRemove:k=>data.delete(k),vidPlayer:{currentTime:42,duration:100,ended:false,style:{display:'block'}},vidCurrentId:'test-id',vidTitle:{textContent:'Test video'},renderContinueWatching(){},pruneVpos(){},Date};vm.createContext(ctx);
for(const n of ['loadContinueWatching','saveVideoPos'])vm.runInContext(fn(n),ctx);
ctx.saveVideoPos();assert.equal(ctx.loadContinueWatching()[0].position,42);assert.equal(data.get('gdv_vpos_test-id'),'42');
ctx.vidPlayer.currentTime=50;ctx.saveVideoPos();assert.equal(ctx.loadContinueWatching().length,1);assert.equal(ctx.loadContinueWatching()[0].position,50);
ctx.vidPlayer.style.display='none';ctx.vidPlayer.currentTime=80;ctx.saveVideoPos();assert.equal(ctx.loadContinueWatching()[0].position,50);
ctx.vidPlayer.style.display='block';ctx.vidPlayer.ended=true;ctx.saveVideoPos();assert.equal(ctx.loadContinueWatching().length,0);assert.equal(data.has('gdv_vpos_test-id'),false);
data.set('gdv_continue','bad json');assert.equal(ctx.loadContinueWatching().length,0);
console.log('PASS resume time, deduplication, iframe exclusion, completion and corrupt storage');
